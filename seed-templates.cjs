const { neon } = require('@neondatabase/serverless');
const OpenAI = require('openai');

const sql = neon(process.env.DATABASE_URL);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Sample resume content for template generation
const sampleResume = `JOHN DOE
Software Engineer
john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years developing scalable web applications. Proficient in JavaScript, React, Node.js, and cloud technologies.

EXPERIENCE

Senior Software Engineer | Tech Company Inc. | 2021 - Present
• Led development of customer-facing dashboard serving 50,000+ users
• Improved application performance by 40% through code optimization
• Mentored team of 4 junior developers
• Implemented CI/CD pipeline reducing deployment time by 60%

Software Engineer | StartupXYZ | 2019 - 2021
• Built RESTful APIs handling 1M+ requests daily
• Developed React components for e-commerce platform
• Reduced page load times by 35% through optimization

EDUCATION

Bachelor of Science in Computer Science
University of Technology | 2015 - 2019
GPA: 3.8/4.0

SKILLS

Programming Languages: JavaScript, TypeScript, Python, SQL
Frameworks: React, Node.js, Express, Next.js
Tools: Git, Docker, AWS, MongoDB, PostgreSQL`;

// Template combinations to generate
const templateSpecs = [
  { style: 'modern', color: 'blue', variant: 'minimal' },
  { style: 'modern', color: 'teal', variant: 'bold' },
  { style: 'modern', color: 'purple', variant: 'clean' },
  { style: 'modern', color: 'green', variant: 'professional' },
  { style: 'modern', color: 'navy', variant: 'elegant' },

  { style: 'classic', color: 'navy', variant: 'traditional' },
  { style: 'classic', color: 'gray', variant: 'formal' },
  { style: 'classic', color: 'brown', variant: 'serif' },
  { style: 'classic', color: 'charcoal', variant: 'conservative' },
  { style: 'classic', color: 'slate', variant: 'timeless' },

  { style: 'creative', color: 'orange', variant: 'vibrant' },
  { style: 'creative', color: 'teal', variant: 'sidebar' },
  { style: 'creative', color: 'purple', variant: 'asymmetric' },
  { style: 'creative', color: 'coral', variant: 'bold' },
  { style: 'creative', color: 'indigo', variant: 'unique' },

  { style: 'minimal', color: 'black', variant: 'monochrome' },
  { style: 'minimal', color: 'gray', variant: 'clean' },
  { style: 'minimal', color: 'blue', variant: 'simple' },
  { style: 'minimal', color: 'green', variant: 'spacious' },
  { style: 'minimal', color: 'purple', variant: 'elegant' },
];

async function generateTemplate(spec, index) {
  const { style, color, variant } = spec;

  console.log(`\n[${index + 1}/20] Generating ${style} ${color} ${variant} template...`);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert web designer specializing in professional resume layouts. Create beautiful, modern HTML/CSS templates that are ATS-friendly, print-optimized, and visually stunning. Always output valid JSON with complete HTML code.'
        },
        {
          role: 'user',
          content: `Create a professional HTML resume design with inline CSS. Use the following specifications:

Style: ${style}
Primary Color: ${color}
Design Variant: ${variant}

Resume content to design:
${sampleResume}

Requirements:
- Complete standalone HTML document with inline CSS
- ${style} design aesthetic
- Use ${color} as the primary accent color
- ${variant} layout approach
- Modern, professional typography
- Sections clearly separated with visual hierarchy
- Print-optimized (fits on standard paper)
- ATS-friendly structure (proper HTML tags)
- Responsive margins and spacing
- Include subtle design elements (borders, backgrounds, spacing)
- Make it UNIQUE and BEAUTIFUL - every design should be different!

Return ONLY valid JSON in this exact format:
{
  "html": "<!DOCTYPE html><html>...complete styled resume...</html>",
  "templateName": "descriptive name like '${style.charAt(0).toUpperCase() + style.slice(1)} ${color.charAt(0).toUpperCase() + color.slice(1)} ${variant.charAt(0).toUpperCase() + variant.slice(1)}'",
  "style": "${style}",
  "colorScheme": "${color}"
}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3500,
    });

    const design = JSON.parse(response.choices[0].message.content || '{}');

    if (!design.html || !design.templateName) {
      console.log(`   ❌ Invalid response from OpenAI`);
      return null;
    }

    // Save to database
    await sql`
      INSERT INTO resume_templates (
        name,
        style,
        color_scheme,
        html_template,
        preview_image_url,
        is_ai_generated,
        usage_count,
        created_from_resume_id
      ) VALUES (
        ${design.templateName},
        ${design.style || style},
        ${design.colorScheme || color},
        ${design.html},
        ${null},
        ${true},
        ${0},
        ${null}
      )
      ON CONFLICT (name) DO UPDATE SET
        html_template = EXCLUDED.html_template,
        updated_at = NOW()
    `;

    console.log(`   ✅ Saved: ${design.templateName}`);
    return design.templateName;

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function seedTemplates() {
  console.log('🎨 AI Template Library Seeder');
  console.log('Generating 20 diverse resume templates...\n');
  console.log('='.repeat(60));

  const results = [];

  for (let i = 0; i < templateSpecs.length; i++) {
    const templateName = await generateTemplate(templateSpecs[i], i);
    results.push(templateName);

    // Small delay to avoid rate limiting
    if (i < templateSpecs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Results:\n');

  const successful = results.filter(r => r !== null);
  console.log(`✅ Successfully generated: ${successful.length}/20 templates`);
  console.log(`❌ Failed: ${20 - successful.length}/20 templates`);

  if (successful.length > 0) {
    console.log('\n📋 Generated Templates:');
    successful.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
  }

  // Show final library stats
  const stats = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT style) as unique_styles,
      COUNT(DISTINCT color_scheme) as unique_colors
    FROM resume_templates
  `;

  console.log('\n📚 Template Library Status:');
  console.log(`   Total Templates: ${stats[0].total}`);
  console.log(`   Unique Styles: ${stats[0].unique_styles}`);
  console.log(`   Unique Colors: ${stats[0].unique_colors}`);

  // Show breakdown by style
  const byStyle = await sql`
    SELECT style, COUNT(*) as count
    FROM resume_templates
    GROUP BY style
    ORDER BY count DESC
  `;

  console.log('\n📊 Templates by Style:');
  byStyle.forEach(row => {
    console.log(`   ${row.style}: ${row.count} templates`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Template library seeding complete!');
  console.log('\nNext step: Upload a resume at https://rewriteme.app');
  console.log('The AI will add even more templates as users upload resumes!');
}

seedTemplates().catch(console.error);
