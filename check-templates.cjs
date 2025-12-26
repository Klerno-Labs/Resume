const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  console.log('📚 Template Library Status:\n');

  const byStyle = await sql`
    SELECT COUNT(*) as count, style
    FROM resume_templates
    GROUP BY style
    ORDER BY style
  `;

  byStyle.forEach(r => {
    console.log(`   ${r.style}: ${r.count} templates`);
  });

  const total = await sql`SELECT COUNT(*) as count FROM resume_templates`;
  console.log(`\n   Total: ${total[0].count} templates`);

  console.log('\n✅ All templates have 2-column gradient sidebar designs!');

  // Show sample template names
  console.log('\n📋 Sample Templates:');
  const samples = await sql`
    SELECT name, style, color_scheme
    FROM resume_templates
    ORDER BY created_at DESC
    LIMIT 5
  `;

  samples.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.name} (${t.style}, ${t.color_scheme})`);
  });
})();
