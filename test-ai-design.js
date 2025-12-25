const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const sql = neon(process.env.DATABASE_URL);

async function testAIDesign() {
  console.log('🎨 Testing AI-Generated HTML Design System\n');

  // Upload test resume
  console.log('1. Uploading test resume...');
  const form = new FormData();
  form.append('file', fs.createReadStream('./test-resume-ai-design.txt'));

  const uploadRes = await fetch('https://rewriteme.app/api/resumes/upload', {
    method: 'POST',
    body: form,
    headers: {
      ...form.getHeaders(),
      'Cookie': 'token=your-admin-token-here' // Will use from ENV if available
    }
  });

  const uploadData = await uploadRes.json();
  console.log('   Upload response:', uploadData);

  if (!uploadData.resumeId) {
    console.log('❌ Upload failed');
    return;
  }

  const resumeId = uploadData.resumeId;
  console.log(`   ✅ Resume uploaded: ${resumeId}\n`);

  // Wait for processing
  console.log('2. Waiting for AI processing (10 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Check database for resume and template
  console.log('\n3. Checking database...');

  const resumes = await sql`
    SELECT
      id,
      file_name,
      status,
      ats_score,
      improved_text IS NOT NULL as has_improved_text,
      improved_html IS NOT NULL as has_improved_html,
      LENGTH(improved_html) as html_length
    FROM resumes
    WHERE id = ${resumeId}
  `;

  const resume = resumes[0];
  console.log('\n   Resume Details:');
  console.log('   ├─ ID:', resume.id);
  console.log('   ├─ File:', resume.file_name);
  console.log('   ├─ Status:', resume.status);
  console.log('   ├─ ATS Score:', resume.ats_score);
  console.log('   ├─ Has Improved Text:', resume.has_improved_text);
  console.log('   ├─ Has HTML Design:', resume.has_improved_html);
  console.log('   └─ HTML Size:', resume.html_length ? `${resume.html_length} chars` : 'N/A');

  // Check if template was saved
  const templates = await sql`
    SELECT
      id,
      name,
      style,
      color_scheme,
      usage_count,
      created_from_resume_id
    FROM resume_templates
    WHERE created_from_resume_id = ${resumeId}
  `;

  console.log('\n   Template Library:');
  if (templates.length > 0) {
    const template = templates[0];
    console.log('   ├─ Template Name:', template.name);
    console.log('   ├─ Style:', template.style);
    console.log('   ├─ Color Scheme:', template.color_scheme);
    console.log('   ├─ Usage Count:', template.usage_count);
    console.log('   └─ Source Resume:', template.created_from_resume_id);
  } else {
    console.log('   └─ No template saved (may have duplicate name)');
  }

  // Get total template count
  const totalTemplates = await sql`SELECT COUNT(*) as count FROM resume_templates`;
  console.log('\n   Total Templates in Library:', totalTemplates[0].count);

  // Verification
  console.log('\n4. Verification:');
  const checks = [
    { name: 'Resume processing completed', pass: resume.status === 'completed' },
    { name: 'AI improved text generated', pass: resume.has_improved_text },
    { name: 'HTML design generated', pass: resume.has_improved_html },
    { name: 'HTML has content', pass: resume.html_length > 1000 },
  ];

  checks.forEach(check => {
    console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 SUCCESS! AI-Generated HTML Design System Working!');
    console.log('\nNext steps:');
    console.log('1. Go to https://rewriteme.app');
    console.log(`2. View resume: https://rewriteme.app/editor?resumeId=${resumeId}`);
    console.log('3. Click the "AI Design" tab to see the beautiful HTML design');
  } else {
    console.log('⚠️  Some checks failed. Review the output above.');
  }
  console.log('='.repeat(60));
}

testAIDesign().catch(console.error);
