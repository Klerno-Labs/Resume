/**
 * Professional HTML/CSS templates for resume designs.
 * These are pre-built, polished templates that the AI fills with content.
 * This ensures consistent, high-quality output instead of generating HTML from scratch.
 */

export const HTML_TEMPLATE_2_COLUMN = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{NAME}} - Resume</title>
  <link href="https://fonts.googleapis.com/css2?family={{HEADER_FONT}}:wght@300;400;600;700&family={{BODY_FONT}}:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      overflow: hidden !important;
      height: 842px !important;
      max-height: 842px !important;
      margin: 0;
    }
    body {
      font-family: '{{BODY_FONT}}', sans-serif;
      background: #fff;
      color: #2c3e50;
    }
    .container {
      display: grid;
      grid-template-columns: 280px 1fr;
      width: 595px;
      height: 842px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .sidebar {
      background: {{GRADIENT}};
      color: white;
      padding: 30px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .sidebar .monogram {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      font-family: '{{HEADER_FONT}}', serif;
      margin: 0 auto 10px;
    }
    .sidebar h1 {
      font-family: '{{HEADER_FONT}}', serif;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 1px;
      line-height: 1.2;
      text-align: center;
      margin: 0;
    }
    .sidebar .title {
      font-size: 13px;
      font-weight: 400;
      opacity: 0.95;
      text-align: center;
      margin-top: 8px;
    }
    .sidebar .section {
      margin-top: 24px;
    }
    .sidebar .section-title {
      font-family: '{{HEADER_FONT}}', serif;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      padding-bottom: 8px;
    }
    .sidebar .contact-item {
      font-size: 10px;
      margin-bottom: 10px;
      display: flex;
      align-items: start;
      gap: 8px;
    }
    .sidebar .contact-icon {
      opacity: 0.9;
    }
    .sidebar .skill-pill {
      display: inline-block;
      padding: 6px 12px;
      margin: 4px 4px 4px 0;
      background: rgba(255,255,255,0.25);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 20px;
      font-size: 9px;
      font-weight: 500;
    }
    .main {
      padding: 40px 45px 40px 40px;
      overflow-y: auto;
    }
    .main::-webkit-scrollbar { width: 0; }
    .main .section {
      margin-bottom: 28px;
    }
    .main .section-title {
      font-family: '{{HEADER_FONT}}', serif;
      font-size: 14px;
      font-weight: 600;
      color: {{ACCENT_COLOR}};
      text-transform: uppercase;
      letter-spacing: 2.5px;
      margin-bottom: 16px;
      border-bottom: 2px solid {{ACCENT_COLOR}};
      padding-bottom: 8px;
    }
    .main .job {
      margin-bottom: 20px;
    }
    .main .job-header {
      margin-bottom: 8px;
    }
    .main .company {
      font-size: 10px;
      font-weight: 500;
      color: {{ACCENT_COLOR}};
      margin-bottom: 2px;
    }
    .main .job-title {
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .main .dates {
      font-size: 9px;
      font-weight: 500;
      color: #64748b;
      font-style: italic;
    }
    .main .job-description {
      font-size: 10px;
      line-height: 1.6;
      color: #2c3e50;
      margin-top: 8px;
    }
    .main ul {
      margin: 8px 0 0 20px;
      padding: 0;
    }
    .main li {
      font-size: 10px;
      line-height: 1.6;
      margin-bottom: 6px;
      color: #2c3e50;
      position: relative;
    }
    .main li::marker {
      color: {{ACCENT_COLOR}};
      font-weight: 600;
    }
    .main .summary {
      font-size: 10px;
      line-height: 1.6;
      color: #2c3e50;
      margin-bottom: 12px;
    }
    @page {
      margin: 0;
      size: letter;
    }
    @media print {
      .container {
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <div class="monogram">{{INITIALS}}</div>
      <h1>{{NAME}}</h1>
      <div class="title">{{JOB_TITLE}}</div>

      <div class="section">
        <div class="section-title">Contact</div>
        {{CONTACT_ITEMS}}
      </div>

      {{SIDEBAR_SECTIONS}}
    </div>

    <div class="main">
      {{MAIN_SECTIONS}}
    </div>
  </div>
</body>
</html>`;

export const HTML_TEMPLATE_SINGLE_COLUMN = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{NAME}} - Resume</title>
  <link href="https://fonts.googleapis.com/css2?family={{HEADER_FONT}}:wght@300;400;600;700&family={{BODY_FONT}}:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      overflow: hidden !important;
      height: 842px !important;
      max-height: 842px !important;
      margin: 0;
    }
    body {
      font-family: '{{BODY_FONT}}', sans-serif;
      background: #f9fafb;
      color: #2c3e50;
      display: flex;
      justify-content: center;
      align-items: start;
    }
    .container {
      max-width: 500px;
      width: 100%;
      height: 842px;
      background: white;
      padding: 50px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      overflow-y: auto;
    }
    .container::-webkit-scrollbar { width: 0; }
    .header {
      text-align: center;
      margin-bottom: 32px;
      border-bottom: 2px solid {{ACCENT_COLOR}};
      padding-bottom: 24px;
    }
    .header h1 {
      font-family: '{{HEADER_FONT}}', serif;
      font-size: 36px;
      font-weight: 700;
      color: {{ACCENT_COLOR}};
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .header .title {
      font-size: 16px;
      color: #64748b;
      margin-bottom: 16px;
    }
    .header .contact {
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .header .contact-item {
      display: inline-block;
    }
    .header .contact-item::after {
      content: "•";
      margin-left: 12px;
      color: #cbd5e1;
    }
    .header .contact-item:last-child::after {
      content: "";
      margin: 0;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-title {
      font-family: '{{HEADER_FONT}}', serif;
      font-size: 16px;
      font-weight: 600;
      color: {{ACCENT_COLOR}};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 16px;
      border-bottom: 2px solid {{ACCENT_COLOR}};
      padding-bottom: 8px;
    }
    .job {
      margin-bottom: 20px;
    }
    .job-header {
      margin-bottom: 8px;
    }
    .company {
      font-size: 11px;
      font-weight: 600;
      color: {{ACCENT_COLOR}};
    }
    .job-title {
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
      margin-top: 4px;
    }
    .dates {
      font-size: 10px;
      color: #64748b;
      font-style: italic;
      margin-top: 2px;
    }
    .job-description {
      font-size: 10px;
      line-height: 1.6;
      color: #2c3e50;
      margin-top: 8px;
    }
    ul {
      margin: 8px 0 0 20px;
      padding: 0;
    }
    li {
      font-size: 10px;
      line-height: 1.6;
      margin-bottom: 6px;
    }
    li::marker {
      color: {{ACCENT_COLOR}};
    }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill {
      padding: 6px 14px;
      background: {{ACCENT_COLOR}}15;
      border: 1px solid {{ACCENT_COLOR}}50;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 500;
      color: {{ACCENT_COLOR}};
    }
    @page { margin: 0; size: letter; }
    @media print { .container { box-shadow: none !important; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{NAME}}</h1>
      <div class="title">{{JOB_TITLE}}</div>
      <div class="contact">
        {{CONTACT_ITEMS}}
      </div>
    </div>

    {{MAIN_SECTIONS}}
  </div>
</body>
</html>`;

/**
 * Helper function to get the appropriate template based on layout type
 */
export function getHTMLTemplate(layout: string): string {
  switch (layout) {
    case 'single-column':
    case 'timeline':
    case 'skills-first':
      return HTML_TEMPLATE_SINGLE_COLUMN;
    case '2-column':
    case 'split-column':
    case 'header-banner':
    default:
      return HTML_TEMPLATE_2_COLUMN;
  }
}
