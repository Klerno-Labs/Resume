import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const apiDir = join(__dirname, 'api');
const outDir = join(__dirname, 'dist/functions');

// Clean and create output directory
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

// Entry points to bundle
const entryPoints = [
  { in: join(apiDir, 'index.ts'), out: 'index' },
  { in: join(apiDir, 'health.ts'), out: 'health' },
];

console.log('📦 Building serverless functions with esbuild...');

for (const { in: inFile, out } of entryPoints) {
  console.log(`  Building ${out}...`);

  await esbuild.build({
    entryPoints: [inFile],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: join(outDir, `${out}.js`),
    external: [
      // External AWS SDK - provided by Vercel runtime
      '@aws-sdk/*',
      // External database drivers
      '@neondatabase/*',
      'pg',
      'postgres',
      // External heavy dependencies
      'formidable',
      'openai',
      'stripe',
      'bcryptjs',
      'jsonwebtoken',
      '@vercel/node'
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
