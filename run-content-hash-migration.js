#!/usr/bin/env node
/**
 * Run content_hash migration on production database
 *
 * This migration adds:
 * - content_hash column for duplicate detection
 * - original_file_name column for file tracking
 * - Index for fast duplicate lookups
 *
 * IMPORTANT: This must be run to enable duplicate detection
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('   Please set DATABASE_URL in your .env file or environment');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  const sql = neon(DATABASE_URL);

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'server', 'db', 'migrations', '20251210_add_resume_content_hash.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('📝 Migration file loaded');
    console.log('');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60));
    console.log('');

    // Check if columns already exist
    console.log('🔍 Checking if migration is needed...');
    const existingColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'resumes'
      AND column_name IN ('content_hash', 'original_file_name')
    `;

    if (existingColumns.length === 2) {
      console.log('✅ Migration already applied - columns exist');
      console.log('   - content_hash: EXISTS');
      console.log('   - original_file_name: EXISTS');
      console.log('');
      console.log('🎉 No action needed - database is up to date');
      process.exit(0);
    }

    if (existingColumns.length > 0) {
      console.log('⚠️  WARNING: Partial migration detected');
      console.log(`   Found ${existingColumns.length} of 2 expected columns`);
      console.log('   This may indicate a previous failed migration');
      console.log('');
    }

    // Prompt for confirmation
    console.log('⚠️  IMPORTANT: This migration will:');
    console.log('   1. Add content_hash and original_file_name columns');
    console.log('   2. Create index on (user_id, content_hash)');
    console.log('   3. Backfill hashes for existing resumes');
    console.log('   4. Set NOT NULL constraints');
    console.log('');
    console.log('   This may take a few seconds depending on resume count');
    console.log('');

    // In production, we'll just run it (for automated deployment)
    // In development, you might want to add a prompt here

    console.log('🚀 Running migration...');
    console.log('');

    // Execute the migration
    // Note: Neon doesn't support multi-statement queries directly
    // So we need to split and execute individually
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

    for (const statement of statements) {
      if (!statement) continue;
      console.log(`   Executing: ${statement.substring(0, 60)}...`);
      // Use template literal with dynamic SQL (Neon requirement)
      await sql([statement]);
    }

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');

    // Verify the migration
    const verifyColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'resumes'
      AND column_name IN ('content_hash', 'original_file_name')
    `;
    console.log('🔍 Verification:');
    console.log(`   ✓ Columns added: ${verifyColumns.length}/2`);

    const verifyIndex = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'resumes'
      AND indexname = 'resumes_user_content_hash_idx'
    `;
    console.log(`   ✓ Index created: ${verifyIndex.length > 0 ? 'YES' : 'NO'}`);

    const resumeCount = await sql`SELECT COUNT(*) as count FROM resumes`;
    console.log(`   ✓ Resumes in database: ${resumeCount[0].count}`);

    const hashCount = await sql`SELECT COUNT(*) as count FROM resumes WHERE content_hash IS NOT NULL`;
    console.log(`   ✓ Resumes with hash: ${hashCount[0].count}`);

    console.log('');
    console.log('🎉 Migration successful! Duplicate detection is now enabled.');

  } catch (error) {
    console.error('');
    console.error('❌ MIGRATION FAILED');
    console.error('');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check DATABASE_URL is correct');
    console.error('   2. Verify database is accessible');
    console.error('   3. Ensure you have permission to ALTER tables');
    console.error('   4. Check if migration was partially applied');
    console.error('');
    process.exit(1);
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
