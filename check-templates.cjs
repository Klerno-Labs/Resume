const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

(async () => {
  console.log('📊 Checking templates in database...\n');

  const templates = await sql`
    SELECT id, name, style, color_scheme, is_ai_generated, usage_count, created_at
    FROM resume_templates
    ORDER BY created_at DESC
  `;

  console.log(`Found ${templates.length} templates:\n`);

  templates.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}`);
    console.log(`   Style: ${t.style} | Color: ${t.color_scheme} | AI: ${t.is_ai_generated} | Uses: ${t.usage_count}`);
    console.log(`   Created: ${t.created_at}`);
    console.log('');
  });
})();
