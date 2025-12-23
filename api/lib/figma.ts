import { env } from './env.js';

const FIGMA_API_BASE = 'https://api.figma.com/v1';
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

interface FigmaDocumentNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaDocumentNode[];
}

export interface FigmaTemplate {
  id: string;
  name: string;
  page: string;
  type: string;
  documentPath: string;
  imageUrl?: string;
}

const templateCache = new Map<string, { data: FigmaTemplate[]; expiresAt: number }>();

function ensureFigmaConfigured() {
  if (!env.FIGMA_TOKEN) {
    throw new Error('FIGMA_TOKEN is not configured');
  }
}

async function fetchFromFigma<T>(url: string): Promise<T> {
  ensureFigmaConfigured();

  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': env.FIGMA_TOKEN as string,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Figma API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

function collectTemplates(
  node: FigmaDocumentNode,
  pageName: string,
  path: string[],
  templates: FigmaTemplate[],
  keywords: string[]
) {
  const nodeName = node.name || 'Untitled';
  const nodeType = node.type || 'NODE';
  const nextPath = [...path, nodeName];

  const isFrameLike = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'].includes(nodeType);
  if (isFrameLike) {
    const lowerName = nodeName.toLowerCase();
    const matchesKeyword = keywords.some((keyword) => lowerName.includes(keyword));
    const isTopLevelFrame = path.length <= 2;

    if (matchesKeyword || isTopLevelFrame) {
      templates.push({
        id: node.id,
        name: nodeName,
        page: pageName,
        type: nodeType,
        documentPath: nextPath.join(' › '),
      });
    }
  }

  if (node.children) {
    for (const child of node.children) {
      collectTemplates(child, pageName, nextPath, templates, keywords);
    }
  }
}

export async function getResumeTemplates(fileKey: string): Promise<FigmaTemplate[]> {
  const cacheKey = `templates:${fileKey}`;
  const cached = templateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const fileData = await fetchFromFigma<{ document: FigmaDocumentNode }>(
    `${FIGMA_API_BASE}/files/${fileKey}`
  );

  const pages = fileData.document?.children || [];
  const keywords = ['resume', 'cv', 'template'];
  const templates: FigmaTemplate[] = [];

  for (const page of pages) {
    collectTemplates(page, page.name || 'Page', [page.name || 'Page'], templates, keywords);
  }

  // Deduplicate by node id
  const uniqueTemplates = templates.filter(
    (template, index, self) => index === self.findIndex((t) => t.id === template.id)
  );

  if (uniqueTemplates.length === 0) {
    throw new Error('No resume templates found in the Figma file');
  }

  // Fetch preview images for the collected nodes
  const idsParam = uniqueTemplates.map((t) => t.id).join(',');
  const imageData = await fetchFromFigma<{ images: Record<string, string> }>(
    `${FIGMA_API_BASE}/images/${fileKey}?ids=${encodeURIComponent(idsParam)}&format=png&scale=2`
  );

  const templatesWithImages = uniqueTemplates.map((template) => ({
    ...template,
    imageUrl: imageData.images?.[template.id],
  }));

  templateCache.set(cacheKey, {
    data: templatesWithImages,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return templatesWithImages;
}

export function isFigmaConfigured() {
  return Boolean(env.FIGMA_TOKEN);
}
