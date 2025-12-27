// 40+ unique resume design templates with DIVERSE LAYOUTS and styles
// Now includes: single-column, timeline, skills-first, split-column, header-banner, and sidebar layouts
export const DESIGN_TEMPLATES = [
  // SINGLE-COLUMN CENTERED LAYOUTS (Classic Executive Style)
  {
    name: 'Executive Centered',
    style: 'classic',
    layout: 'single-column',
    sidebar: 'none',
    gradient: 'none',
    accentColor: '#1e40af',
    fonts: ['Crimson Text', 'Lato'],
    description: 'Traditional single-column centered layout with elegant serif headers'
  },
  {
    name: 'Minimalist Pure',
    style: 'minimal',
    layout: 'single-column',
    sidebar: 'none',
    gradient: 'none',
    accentColor: '#475569',
    fonts: ['Inter', 'Inter'],
    description: 'Clean single-column with maximum whitespace and monochrome palette'
  },
  {
    name: 'Modern Mono',
    style: 'modern',
    layout: 'single-column',
    sidebar: 'none',
    gradient: 'none',
    accentColor: '#0891b2',
    fonts: ['Space Grotesk', 'DM Sans'],
    description: 'Contemporary single-column with bold typography and cyan accents'
  },

  // TIMELINE LAYOUTS (Chronological with Visual Timeline)
  {
    name: 'Career Timeline Blue',
    style: 'modern',
    layout: 'timeline',
    sidebar: 'none',
    gradient: 'none',
    accentColor: '#2563eb',
    fonts: ['Outfit', 'Inter'],
    description: 'Vertical timeline with connecting lines and date markers'
  },
  {
    name: 'Journey Map',
    style: 'creative',
    layout: 'timeline',
    sidebar: 'none',
    gradient: 'none',
    accentColor: '#7c3aed',
    fonts: ['Sora', 'Plus Jakarta Sans'],
    description: 'Creative timeline with milestone dots and flowing design'
  },

  // SKILLS-FIRST LAYOUTS (Skills Prominently Featured)
  {
    name: 'Skills Spotlight',
    style: 'modern',
    layout: 'skills-first',
    sidebar: 'none',
    gradient: 'linear-gradient(to right, #f0f9ff 0%, #ffffff 100%)',
    accentColor: '#0284c7',
    fonts: ['Barlow', 'Rubik'],
    description: 'Skills section at top with visual proficiency bars'
  },
  {
    name: 'Tech Stack Focus',
    style: 'modern',
    layout: 'skills-first',
    sidebar: 'none',
    gradient: 'none',
    accentColor: '#059669',
    fonts: ['IBM Plex Sans', 'IBM Plex Sans'],
    description: 'Technical skills grid at top, clean experience below'
  },

  // SPLIT-COLUMN LAYOUTS (Balanced 50/50, Not Sidebar-Based)
  {
    name: 'Balanced Split',
    style: 'modern',
    layout: 'split-column',
    sidebar: 'none',
    gradient: 'none',
    accentColor: '#dc2626',
    fonts: ['Archivo', 'Hind'],
    description: 'Equal 50/50 column split with alternating content sections'
  },
  {
    name: 'Dual Track',
    style: 'creative',
    layout: 'split-column',
    sidebar: 'none',
    gradient: 'none',
    accentColor: '#c026d3',
    fonts: ['Epilogue', 'Albert Sans'],
    description: 'Symmetrical two-column design with mirrored layouts'
  },

  // HEADER-BANNER LAYOUTS (Full-Width Header + Columns Below)
  {
    name: 'Banner Professional',
    style: 'modern',
    layout: 'header-banner',
    sidebar: 'none',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
    accentColor: '#3b82f6',
    fonts: ['Playfair Display', 'Lato'],
    description: 'Full-width gradient header banner with multi-column content below'
  },
  {
    name: 'Crown Header',
    style: 'classic',
    layout: 'header-banner',
    sidebar: 'none',
    gradient: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
    accentColor: '#10b981',
    fonts: ['Merriweather', 'Open Sans'],
    description: 'Elegant banner header with traditional column layout beneath'
  },
  {
    name: 'Bold Statement',
    style: 'creative',
    layout: 'header-banner',
    sidebar: 'none',
    gradient: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)',
    accentColor: '#ef4444',
    fonts: ['Montserrat', 'Raleway'],
    description: 'Eye-catching banner with creative typography and asymmetric layout'
  },

  // SIDEBAR LAYOUTS (Original Style - Now Mixed with Other Layouts)
  {
    name: 'Midnight Professional',
    style: 'modern',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
    accentColor: '#3b82f6',
    fonts: ['Playfair Display', 'Lato'],
    description: 'Deep blue gradient sidebar with serif headers'
  },
  {
    name: 'Emerald Executive',
    style: 'modern',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
    accentColor: '#10b981',
    fonts: ['Merriweather', 'Open Sans'],
    description: 'Forest green gradient with classic typography'
  },
  {
    name: 'Crimson Creative',
    style: 'creative',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)',
    accentColor: '#ef4444',
    fonts: ['Montserrat', 'Raleway'],
    description: 'Bold red gradient for creative professionals'
  },
  {
    name: 'Ocean Breeze',
    style: 'modern',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    accentColor: '#38bdf8',
    fonts: ['Poppins', 'Inter'],
    description: 'Bright cyan gradient with modern fonts'
  },
  {
    name: 'Violet Vision',
    style: 'creative',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #6b21a8 0%, #581c87 100%)',
    accentColor: '#a78bfa',
    fonts: ['Nunito', 'Quicksand'],
    description: 'Purple gradient with rounded friendly fonts'
  },
  {
    name: 'Slate Minimalist',
    style: 'minimal',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    accentColor: '#64748b',
    fonts: ['Inter', 'Roboto'],
    description: 'Gray gradient for understated elegance'
  },
  {
    name: 'Sunset Professional',
    style: 'modern',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
    accentColor: '#fb923c',
    fonts: ['Ubuntu', 'Lato'],
    description: 'Orange-red gradient for bold presence'
  },
  {
    name: 'Teal Elegance',
    style: 'classic',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
    accentColor: '#14b8a6',
    fonts: ['Libre Baskerville', 'Source Sans Pro'],
    description: 'Teal gradient with classic serif'
  },
  {
    name: 'Rose Gold Luxury',
    style: 'creative',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #9f1239 0%, #881337 100%)',
    accentColor: '#fb7185',
    fonts: ['Cormorant Garamond', 'Josefin Sans'],
    description: 'Rose gradient for sophisticated look'
  },
  {
    name: 'Navy Commander',
    style: 'classic',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
    accentColor: '#60a5fa',
    fonts: ['Crimson Text', 'Karla'],
    description: 'Navy blue with traditional elegance'
  },
  {
    name: 'Amber Warmth',
    style: 'modern',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
    accentColor: '#fbbf24',
    fonts: ['Outfit', 'Manrope'],
    description: 'Warm amber gradient for approachable feel'
  },
  {
    name: 'Indigo Innovation',
    style: 'modern',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
    accentColor: '#818cf8',
    fonts: ['Space Grotesk', 'DM Sans'],
    description: 'Indigo gradient for tech professionals'
  },
  {
    name: 'Lime Fresh',
    style: 'creative',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #4d7c0f 0%, #3f6212 100%)',
    accentColor: '#84cc16',
    fonts: ['Sora', 'Plus Jakarta Sans'],
    description: 'Lime green for energetic vibe'
  },
  {
    name: 'Fuchsia Bold',
    style: 'creative',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #a21caf 0%, #86198f 100%)',
    accentColor: '#d946ef',
    fonts: ['Epilogue', 'Albert Sans'],
    description: 'Vibrant fuchsia for creative fields'
  },
  {
    name: 'Charcoal Modern',
    style: 'minimal',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
    accentColor: '#71717a',
    fonts: ['Work Sans', 'IBM Plex Sans'],
    description: 'Dark charcoal for modern minimalism'
  },
  {
    name: 'Sky Professional',
    style: 'modern',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
    accentColor: '#0ea5e9',
    fonts: ['Barlow', 'Rubik'],
    description: 'Sky blue gradient for corporate'
  },
  {
    name: 'Bronze Executive',
    style: 'classic',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #78350f 0%, #6b2e0c 100%)',
    accentColor: '#d97706',
    fonts: ['Spectral', 'Cabin'],
    description: 'Bronze gradient for executive presence'
  },
  {
    name: 'Cyan Digital',
    style: 'modern',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #155e75 100%)',
    accentColor: '#06b6d4',
    fonts: ['Archivo', 'Hind'],
    description: 'Bright cyan for digital professionals'
  },
  {
    name: 'Plum Sophisticated',
    style: 'classic',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)',
    accentColor: '#a855f7',
    fonts: ['Lora', 'PT Sans'],
    description: 'Plum purple for sophisticated look'
  },
  {
    name: 'Rust Industrial',
    style: 'modern',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
    accentColor: '#f87171',
    fonts: ['Oswald', 'Oxygen'],
    description: 'Rust red for industrial strength'
  },
  {
    name: 'Mint Clean',
    style: 'minimal',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    accentColor: '#34d399',
    fonts: ['Assistant', 'Mulish'],
    description: 'Mint green for clean modern look'
  },
  {
    name: 'Sapphire Premium',
    style: 'classic',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
    accentColor: '#3b82f6',
    fonts: ['Cardo', 'Fira Sans'],
    description: 'Sapphire blue for premium feel'
  },
  {
    name: 'Coral Vibrant',
    style: 'creative',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    accentColor: '#fca5a5',
    fonts: ['Lexend', 'Red Hat Display'],
    description: 'Coral gradient for vibrant energy'
  },
  {
    name: 'Steel Professional',
    style: 'minimal',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
    accentColor: '#94a3b8',
    fonts: ['Titillium Web', 'Noto Sans'],
    description: 'Steel gray for professional minimalism'
  },
  {
    name: 'Magenta Creative',
    style: 'creative',
    layout: '2-column',
    sidebar: 'left',
    gradient: 'linear-gradient(135deg, #be185d 0%, #9f1239 100%)',
    accentColor: '#ec4899',
    fonts: ['Chakra Petch', 'Archivo Narrow'],
    description: 'Magenta gradient for creative edge'
  }
];

// Database template cache
let _dbTemplates: typeof DESIGN_TEMPLATES | null = null;
let _lastFetch: number = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * Fetches user-created templates from database (with caching)
 */
export async function fetchDatabaseTemplates(): Promise<typeof DESIGN_TEMPLATES> {
  const now = Date.now();

  // Return cached if still valid
  if (_dbTemplates && now - _lastFetch < CACHE_TTL) {
    return _dbTemplates;
  }

  try {
    // Lazy import to avoid circular dependency
    const { neon } = await import('@neondatabase/serverless');

    if (!process.env.DATABASE_URL) {
      console.warn('[Templates] DATABASE_URL not set, using hardcoded templates only');
      return [];
    }

    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT
        name,
        style,
        layout,
        sidebar,
        gradient,
        accent_color as "accentColor",
        fonts,
        description
      FROM resume_templates
      WHERE is_public = true
      ORDER BY usage_count DESC, created_at DESC
      LIMIT 50
    `;

    _dbTemplates = rows as typeof DESIGN_TEMPLATES;
    _lastFetch = now;

    console.log(`[Templates] Fetched ${_dbTemplates.length} templates from database`);
    return _dbTemplates;
  } catch (error) {
    console.error('[Templates] Failed to fetch from database:', error);
    return [];
  }
}

/**
 * Gets all templates (database + hardcoded fallback)
 */
export async function getAllTemplates(): Promise<typeof DESIGN_TEMPLATES> {
  const dbTemplates = await fetchDatabaseTemplates();
  return [...dbTemplates, ...DESIGN_TEMPLATES];
}

/**
 * Gets a random template (includes database templates)
 */
export async function getRandomTemplate() {
  const allTemplates = await getAllTemplates();
  const randomIndex = Math.floor(Math.random() * allTemplates.length);
  return allTemplates[randomIndex];
}

/**
 * Gets a template by index (includes database templates)
 */
export async function getTemplateByIndex(index: number) {
  const allTemplates = await getAllTemplates();
  return allTemplates[index % allTemplates.length];
}
