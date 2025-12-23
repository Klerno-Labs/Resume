import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const apiDir = join(__dirname, 'api');
const outDir = join(__dirname, 'api/bundled');

// Clean and create output directory
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

// Entry points to bundle - each route as a separate function
const entryPoints = [
  { in: join(apiDir, 'health.ts'), out: 'health' },
  { in: join(apiDir, 'auth/me.ts'), out: 'auth-me' },
  { in: join(apiDir, 'test-auth.ts'), out: 'test-auth' },
];

console.log('📦 Building serverless functions with esbuild...');

for (const { in: inFile, out } of entryPoints) {
  console.log(`  Building ${out}...`);

  await esbuild.build({
    entryPoints: [inFile],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: join(outDir, `${out}.js`),
    external: [
      // External database drivers - MUST be external for serverless
      '@neondatabase/serverless',
      // External Vercel-specific packages
      '@vercel/node',
    ],
    sourcemap: false,
    minify: false,
    banner: {
      js: '// Bundled by esbuild for Vercel deployment\n',
    },
  });
}

console.log('✅ Functions built successfully!');
console.log(`   Output: ${outDir}`);
