const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  console.log('🎨 Checking AI-Generated HTML Design Status\n');

  const resumes = await sql`
    SELECT
      id,
      file_name,
      status,
      ats_score,
      improved_text IS NOT NULL as has_improved_text,
      improved_html IS NOT NULL as has_improved_html,
      LENGTH(improved_html) as html_length,
      created_at
    FROM resumes
    ORDER BY created_at DESC
    LIMIT 5
  `;

  console.log('Most Recent Resumes:\n');
  resumes.forEach((r, i) => {
    console.log(`${i + 1}. ${r.file_name}`);
    console.log(`   ID: ${r.id}`);
    console.log(`   Status: ${r.status}`);
    console.log(`   Has Improved Text: ${r.has_improved_text}`);
    console.log(`   Has HTML Design: ${r.has_improved_html}`);
    console.log(`   HTML Size: ${r.html_length || 0} chars`);
    console.log(`   Created: ${new Date(r.created_at).toLocaleString()}`);
    console.log('');
  });

  const templates = await sql`SELECT COUNT(*) as count FROM resume_templates`;
  console.log(`Total Templates in Library: ${templates[0].count}\n`);

  if (resumes[0].has_improved_html) {
    console.log('✅ Latest resume has AI-generated HTML design!');
    console.log(`View it at: https://rewriteme.app/editor?resumeId=${resumes[0].id}`);
  } else {
    console.log('⚠️  Latest resume does not have HTML design yet');
    console.log('Upload a new resume at https://rewriteme.app to test!');
  }
})();
