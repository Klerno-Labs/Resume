// Quick script to create analytics_events table
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function createAnalyticsTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = `
      -- Create analytics_events table if it doesn't exist
      CREATE TABLE IF NOT EXISTS analytics_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        session_id TEXT NOT NULL,
        event TEXT NOT NULL,
        properties JSONB,
        page TEXT,
        referrer TEXT,
        user_agent TEXT,
        ip_address TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS analytics_user_id_idx ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS analytics_event_idx ON analytics_events(event);
      CREATE INDEX IF NOT EXISTS analytics_session_idx ON analytics_events(session_id);
      CREATE INDEX IF NOT EXISTS analytics_created_at_idx ON analytics_events(created_at);
      CREATE INDEX IF NOT EXISTS analytics_event_created_idx ON analytics_events(event, created_at DESC);

      -- Create funnel_steps table if it doesn't exist
      CREATE TABLE IF NOT EXISTS funnel_steps (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT NOT NULL,
        user_id VARCHAR REFERENCES users(id) ON DELETE NO ACTION,
        step TEXT NOT NULL,
        completed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Create indexes for funnel_steps
      CREATE INDEX IF NOT EXISTS funnel_session_idx ON funnel_steps(session_id);
      CREATE INDEX IF NOT EXISTS funnel_step_idx ON funnel_steps(step);
    `;

    console.log('Creating analytics tables...');
    await client.query(sql);

    console.log('✓ Analytics tables created successfully!');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('analytics_events', 'funnel_steps')
      ORDER BY table_name;
    `);

    console.log('\nCreated tables:');
    console.table(result.rows);

  } catch (error) {
    console.error('Failed to create tables:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAnalyticsTable();
