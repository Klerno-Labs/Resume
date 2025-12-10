#!/usr/bin/env node
/**
 * Production Migration Runner
 * Adds duplicate detection columns to production database
 *
 * Usage: node run-production-migration.js
 */

import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔗 Connecting to production database...');
    await client.connect();
    console.log('✅ Connected!');

    console.log('\n📋 Checking if migration is needed...');

    // Check if columns already exist
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'resumes'
        AND column_name IN ('content_hash', 'original_file_name')
    `);

    if (checkResult.rows.length === 2) {
      console.log('✅ Migration already applied - columns exist');
      console.log('   - content_hash: ✅');
      console.log('   - original_file_name: ✅');
      process.exit(0);
    }

    if (checkResult.rows.length > 0) {
      console.warn('⚠️  Partial migration detected!');
      console.warn('   Existing columns:', checkResult.rows.map(r => r.column_name).join(', '));
      console.warn('   This should not happen. Manual intervention may be needed.');
      process.exit(1);
    }

    console.log('📝 Columns not found - migration needed');

    // Read migration SQL
    const migrationPath = join(__dirname, 'server/db/migrations/20251210_add_resume_content_hash.sql');
    console.log(`\n📄 Reading migration from: ${migrationPath}`);

    const sql = readFileSync(migrationPath, 'utf8');

    console.log('\n⚡ Running migration...');
    console.log('   This may take a few seconds for large databases');

    await client.query(sql);

    console.log('✅ Migration completed successfully!');

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyResult = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'resumes'
        AND column_name IN ('content_hash', 'original_file_name')
      ORDER BY column_name
    `);

    if (verifyResult.rows.length === 2) {
      console.log('✅ Verification passed!');
      console.table(verifyResult.rows);

      // Check index
      const indexResult = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'resumes'
          AND indexname = 'resumes_user_content_hash_idx'
      `);

      if (indexResult.rows.length > 0) {
        console.log('✅ Index created: resumes_user_content_hash_idx');
      } else {
        console.warn('⚠️  Index not found - may affect performance');
      }

      // Check backfill
      const backfillCheck = await client.query(`
        SELECT COUNT(*) as total,
               COUNT(content_hash) as with_hash
        FROM resumes
      `);

      const { total, with_hash } = backfillCheck.rows[0];
      console.log(`\n📊 Backfill status:`);
      console.log(`   Total resumes: ${total}`);
      console.log(`   With hash: ${with_hash}`);

      if (total === with_hash) {
        console.log('   ✅ 100% backfilled');
      } else {
        console.warn(`   ⚠️  ${total - with_hash} resumes missing hash`);
      }

    } else {
      console.error('❌ Verification failed - columns not found after migration');
      process.exit(1);
    }

    console.log('\n🎉 Migration complete! Duplicate detection is now active.');
    console.log('\n📝 Next steps:');
    console.log('   1. Test resume upload on production');
    console.log('   2. Upload same resume twice - should see "already analyzed" message');
    console.log('   3. Monitor server logs for [Duplicate] messages');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
