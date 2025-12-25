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
          content: 'You are an elite resume designer with expertise in modern web design, typography, and professional branding. Create stunning, magazine-quality resume designs that stand out while maintaining ATS compatibility. Use contemporary design trends: geometric shapes, gradients, whitespace mastery, and sophisticated color palettes. Think Behance, Dribbble quality. Always output valid JSON.'
        },
        {
          role: 'user',
          content: `Design a STUNNING professional resume in HTML/CSS that looks like it was created by a top design agency.

Resume content:
${sampleResume}

TARGET DESIGN:
- Style: ${style}
- Primary Color: ${color}
- Variant: ${variant}

DESIGN REQUIREMENTS:

1. LAYOUT & STRUCTURE (CRITICAL - MUST USE 2-COLUMN):
   - MUST use 2-column layout: colored sidebar (35%) + main content (65%)
   - CSS Grid: display: grid; grid-template-columns: 280px 1fr;
   - SIDEBAR (left): Colored background with gradient, contains contact, skills, education
   - MAIN (right): White background, contains summary and experience
   - Sidebar text: white or very light colors
   - Photo circle or icon at top of sidebar
   - Full-height sidebar with gradient background

2. TYPOGRAPHY (CRITICAL):
   - Google Fonts CDN: Poppins, Inter, Montserrat, or Roboto
   - Name: 28-36px, font-weight: 700, in sidebar (white text)
   - Job title: 14-16px, in sidebar below name
   - Section headers: 18-22px, uppercase, letter-spacing: 2px
   - Body text: 11px, line-height: 1.7
   - Sidebar section headers: smaller, white, uppercase

3. COLOR & VISUAL DESIGN (CRITICAL - SIDEBAR FOCUS):
   - Sidebar background: LINEAR GRADIENT of accent color
   - ${color === 'blue' ? 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' : color === 'teal' ? 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' : color === 'purple' ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' : color === 'green' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : color === 'orange' ? 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)' : color === 'coral' ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' : 'linear-gradient(135deg, [color1], [color2])'}
   - Sidebar ALL text: white (#ffffff)
   - Main area: white background, dark text (#2c3e50)
   - Headers in main area: accent color matching sidebar

4. VISUAL ELEMENTS (MAKE IT POP):
   - Circular photo placeholder: 120px circle, border: 4px solid white, in sidebar
   - Contact icons: 📧 ☎ 🌐 📍 (white, in sidebar)
   - Skill tags: white pills with semi-transparent background in sidebar
   - Divider lines in sidebar: 1px solid rgba(255,255,255,0.3)
   - Box-shadow on entire container: 0 10px 30px rgba(0,0,0,0.15)
   - Clean professional look like TopTierResumes or BeamJobs templates

5. SECTIONS:
   - Clear visual separation
   - ${style === 'modern' ? 'Alternating background colors' : 'Consistent styling with borders'}
   - Highlight achievements with accent color
   - Use padding/margin for breathing room

6. PRINT OPTIMIZATION:
   - Max-width: 800px, margins: 40px
   - @page { size: letter; margin: 0.5in; }
   - Print-friendly colors

Make it look EXPENSIVE and PROFESSIONAL like Apple, Nike, or Stripe designs.

Return ONLY valid JSON:
{
  "html": "<!DOCTYPE html><html>...complete HTML...</html>",
  "templateName": "${style.charAt(0).toUpperCase() + style.slice(1)} ${color.charAt(0).toUpperCase() + color.slice(1)} ${variant.charAt(0).toUpperCase() + variant.slice(1)}",
  "style": "${style}",
  "colorScheme": "${color}"
}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
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
