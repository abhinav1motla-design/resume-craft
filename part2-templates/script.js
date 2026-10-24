/*
 * RésuméCraft — PART 2: Resume Templates & PDF Export
 * Team member: ____________________
 *
 * All 10 resume designs, the template picker with filters and live thumbnails, accent colours, the preview step and PDF download.
 */

// ======== RENDER RESUME ========
function buildResumeHTML(raw, tpl, colorKey) {
  const d = escDeep(raw);
  const c = colorMap[colorKey] || colorMap.blue;
  let html = '';

  if (tpl === 'classic') {
    html = `<div class="tpl-classic">
      <div class="r-name">${d.name || 'Your Name'}</div>
      ${d.role ? `<div style="font-size:13px;color:#555;margin-bottom:4px;font-style:italic;">${d.role}</div>` : ''}
      <div class="r-contact">
        ${d.email ? `<span>${d.email}</span>` : ''}
        ${d.phone ? `<span>${d.phone}</span>` : ''}
        ${d.location ? `<span>${d.location}</span>` : ''}
        ${d.linkedin ? `<span>${d.linkedin}</span>` : ''}
      </div>
      ${d.summary ? `<div class="r-section-title">Professional Summary</div><div class="r-summary">${d.summary}</div>` : ''}
      ${d.experience.length ? `
        <div class="r-section-title">Work Experience</div>
        ${d.experience.map(e => `
          <div class="r-entry">
            <div class="r-entry-header">
              <span class="r-entry-title">${e.title || 'Position'}</span>
              <span class="r-entry-date">${[e.from, e.to].filter(Boolean).join(' – ')}</span>
            </div>
            ${e.company ? `<div class="r-entry-sub">${e.company}${e.loc ? ', ' + e.loc : ''}</div>` : ''}
            ${e.desc ? `<div class="r-entry-desc">${parseBullets(e.desc)}</div>` : ''}
          </div>`).join('')}` : ''}
      ${d.education.length ? `
        <div class="r-section-title">Education</div>
        ${d.education.map(e => `
          <div class="r-entry">
            <div class="r-entry-header">
              <span class="r-entry-title">${e.degree || 'Degree'}</span>
              <span class="r-entry-date">${[e.from, e.to].filter(Boolean).join(' – ')}</span>
            </div>
            ${e.school ? `<div class="r-entry-sub">${e.school}${e.gpa ? ' · GPA: ' + e.gpa : ''}</div>` : ''}
          </div>`).join('')}` : ''}
      ${d.projects.length ? `
        <div class="r-section-title">Projects</div>
        ${d.projects.map(p => `
          <div class="r-entry">
            <div class="r-entry-header">
              <span class="r-entry-title">${p.name || 'Project'}</span>
              <span class="r-entry-date">${p.date}</span>
            </div>
            ${p.role ? `<div class="r-entry-sub">${p.role}${p.link ? ' · ' + p.link : ''}</div>` : ''}
            ${p.desc ? `<div class="r-entry-desc">${parseBullets(p.desc)}</div>` : ''}
          </div>`).join('')}` : ''}
      ${d.skills.length ? `
        <div class="r-section-title">Skills</div>
        <div class="r-skills-list">${d.skills.map(s => `<span class="r-skill-item">${s}</span>`).join('')}</div>` : ''}
    </div>`;
  }

  else if (tpl === 'modern') {
    html = `<div class="tpl-modern">
      <div class="r-sidebar" style="background:${c.sidebar}">
        <div class="r-name">${d.name || 'Your Name'}</div>
        ${d.role ? `<div class="r-role" style="color:${c.light}">${d.role}</div>` : '<div style="margin-bottom:24px;"></div>'}
        <div class="r-sidebar-section">
          <div class="r-sidebar-title" style="color:${c.light};border-bottom-color:rgba(255,255,255,0.15)">Contact</div>
          ${d.email ? `<div class="r-contact-item">${d.email}</div>` : ''}
          ${d.phone ? `<div class="r-contact-item">${d.phone}</div>` : ''}
          ${d.location ? `<div class="r-contact-item">${d.location}</div>` : ''}
          ${d.linkedin ? `<div class="r-contact-item">${d.linkedin}</div>` : ''}
        </div>
        ${d.skills.length ? `
        <div class="r-sidebar-section">
          <div class="r-sidebar-title" style="color:${c.light};border-bottom-color:rgba(255,255,255,0.15)">Skills</div>
          ${d.skills.map(s => `
            <div class="r-skill-bar">
              <div class="r-skill-name" style="color:${c.light}">${s}</div>
              <div class="r-skill-track"><div class="r-skill-fill" style="width:${70+Math.random()*30}%;background:${c.light}"></div></div>
            </div>`).join('')}
        </div>` : ''}
      </div>
      <div class="r-main">
        ${d.summary ? `<div class="r-main-section">
          <div class="r-main-title" style="color:${c.sidebar};border-bottom-color:${c.sidebar}">Profile</div>
          <div class="r-summary">${d.summary}</div>
        </div>` : ''}
        ${d.experience.length ? `<div class="r-main-section">
          <div class="r-main-title" style="color:${c.sidebar};border-bottom-color:${c.sidebar}">Experience</div>
          ${d.experience.map(e => `
            <div class="r-entry">
              <div class="r-entry-header">
                <span class="r-entry-title">${e.title || 'Position'}</span>
                <span class="r-entry-date" style="background:${c.bg};color:${c.accent}">${[e.from, e.to].filter(Boolean).join(' – ')}</span>
              </div>
              ${e.company ? `<div class="r-entry-sub" style="color:${c.sidebar}">${e.company}${e.loc ? ', ' + e.loc : ''}</div>` : ''}
              ${e.desc ? `<div class="r-entry-desc">${parseBullets(e.desc)}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
        ${d.education.length ? `<div class="r-main-section">
          <div class="r-main-title" style="color:${c.sidebar};border-bottom-color:${c.sidebar}">Education</div>
          ${d.education.map(e => `
            <div class="r-entry">
              <div class="r-entry-header">
                <span class="r-entry-title">${e.degree || 'Degree'}</span>
                <span class="r-entry-date" style="background:${c.bg};color:${c.accent}">${[e.from, e.to].filter(Boolean).join(' – ')}</span>
              </div>
              ${e.school ? `<div class="r-entry-sub" style="color:${c.sidebar}">${e.school}${e.gpa ? ' · GPA: ' + e.gpa : ''}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
        ${d.projects.length ? `<div class="r-main-section">
          <div class="r-main-title" style="color:${c.sidebar};border-bottom-color:${c.sidebar}">Projects</div>
          ${d.projects.map(p => `
            <div class="r-entry">
              <div class="r-entry-header">
                <span class="r-entry-title">${p.name || 'Project'}</span>
                <span class="r-entry-date" style="background:${c.bg};color:${c.accent}">${p.date}</span>
              </div>
              ${p.role ? `<div class="r-entry-sub" style="color:${c.sidebar}">${p.role}${p.link ? ' · ' + p.link : ''}</div>` : ''}
              ${p.desc ? `<div class="r-entry-desc">${parseBullets(p.desc)}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
      </div>
    </div>`;
  }

  else if (tpl === 'creative') {
    const initials = d.name ? d.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '??';
    html = `<div class="tpl-creative">
      <div class="r-header" style="background:${c.sidebar}">
        <div class="r-avatar" style="background:${c.accent};opacity:0.85">${initials}</div>
        <div>
          <div class="r-name">${d.name || 'Your Name'}</div>
          ${d.role ? `<div class="r-role" style="color:${c.light}">${d.role}</div>` : ''}
          <div class="r-contact">
            ${d.email ? `<span>${d.email}</span>` : ''}
            ${d.phone ? `<span>${d.phone}</span>` : ''}
            ${d.location ? `<span>${d.location}</span>` : ''}
            ${d.linkedin ? `<span>${d.linkedin}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="r-body">
        <div class="r-col">
          ${d.summary ? `
            <div class="r-section-title" style="color:${c.accent}">About Me</div>
            <div class="r-summary">${d.summary}</div>` : ''}
          ${d.skills.length ? `
            <div class="r-section-title" style="color:${c.accent}">Skills</div>
            <div>${d.skills.map(s => `<span class="r-skill-tag" style="border-color:${c.bg};color:${c.accent}">${s}</span>`).join('')}</div>` : ''}
          ${d.education.length ? `
            <div class="r-section-title" style="color:${c.accent}">Education</div>
            ${d.education.map(e => `
              <div class="r-entry">
                <div class="r-entry-title">${e.degree || 'Degree'}</div>
                ${e.school ? `<div class="r-entry-sub">${e.school}</div>` : ''}
                <span class="r-entry-date" style="background:${c.bg};color:${c.accent}">${[e.from, e.to].filter(Boolean).join(' – ')}${e.gpa ? ' · ' + e.gpa : ''}</span>
              </div>`).join('')}` : ''}
        </div>
        <div class="r-col">
          ${d.experience.length ? `
            <div class="r-section-title" style="color:${c.accent}">Experience</div>
            ${d.experience.map(e => `
              <div class="r-entry">
                <div class="r-entry-title">${e.title || 'Position'}</div>
                ${e.company ? `<div class="r-entry-sub">${e.company}${e.loc ? ', ' + e.loc : ''}</div>` : ''}
                <span class="r-entry-date" style="background:${c.bg};color:${c.accent}">${[e.from, e.to].filter(Boolean).join(' – ')}</span>
                ${e.desc ? `<div class="r-entry-desc">${parseBullets(e.desc)}</div>` : ''}
              </div>`).join('')}` : ''}
          ${d.projects.length ? `
            <div class="r-section-title" style="color:${c.accent}">Projects</div>
            ${d.projects.map(p => `
              <div class="r-entry">
                <div class="r-entry-title">${p.name || 'Project'}</div>
                ${p.role ? `<div class="r-entry-sub">${p.role}${p.link ? ' · ' + p.link : ''}</div>` : ''}
                ${p.date ? `<span class="r-entry-date" style="background:${c.bg};color:${c.accent}">${p.date}</span>` : ''}
                ${p.desc ? `<div class="r-entry-desc">${parseBullets(p.desc)}</div>` : ''}
              </div>`).join('')}` : ''}
        </div>
      </div>
    </div>`;
  }

  else if (tpl === 'minimal') {
    html = `<div class="tpl-minimal">
      <div class="r-name">${d.name || 'Your Name'}</div>
      ${d.role ? `<div class="r-role-line">${d.role}</div>` : ''}
      <div class="r-contact">
        ${d.email ? `<span>${d.email}</span>` : ''}
        ${d.phone ? `<span>${d.phone}</span>` : ''}
        ${d.location ? `<span>${d.location}</span>` : ''}
        ${d.linkedin ? `<span>${d.linkedin}</span>` : ''}
      </div>
      ${d.summary ? `<hr class="r-divider"><div class="r-section-title">Profile</div>
        <div class="r-summary">${d.summary}</div>` : ''}
      ${d.experience.length ? `<hr class="r-divider"><div class="r-section-title">Experience</div>
        ${d.experience.map(e => `
          <div class="r-entry">
            <div class="r-entry-left">
              <div class="r-entry-date">${[e.from, e.to].filter(Boolean).join('–')}</div>
              ${e.company ? `<div class="r-entry-company">${e.company}</div>` : ''}
            </div>
            <div>
              <div class="r-entry-title">${e.title || 'Position'}</div>
              ${e.desc ? `<div class="r-entry-desc">${parseBullets(e.desc)}</div>` : ''}
            </div>
          </div>`).join('')}` : ''}
      ${d.education.length ? `<hr class="r-divider"><div class="r-section-title">Education</div>
        ${d.education.map(e => `
          <div class="r-entry">
            <div class="r-entry-left">
              <div class="r-entry-date">${[e.from, e.to].filter(Boolean).join('–')}</div>
              ${e.school ? `<div class="r-entry-company">${e.school}</div>` : ''}
            </div>
            <div>
              <div class="r-entry-title">${e.degree || 'Degree'}</div>
              ${e.gpa ? `<div class="r-entry-desc">GPA: ${e.gpa}</div>` : ''}
            </div>
          </div>`).join('')}` : ''}
      ${d.projects.length ? `<hr class="r-divider"><div class="r-section-title">Projects</div>
        ${d.projects.map(p => `
          <div class="r-entry">
            <div class="r-entry-left">
              <div class="r-entry-date">${p.date || ''}</div>
              ${p.role ? `<div class="r-entry-company">${p.role}</div>` : ''}
            </div>
            <div>
              <div class="r-entry-title">${p.name || 'Project'}</div>
              ${p.link ? `<div class="r-entry-desc" style="color:#888;font-size:10.5px;">${p.link}</div>` : ''}
              ${p.desc ? `<div class="r-entry-desc">${parseBullets(p.desc)}</div>` : ''}
            </div>
          </div>`).join('')}` : ''}
      ${d.skills.length ? `<hr class="r-divider"><div class="r-section-title">Skills</div>
        <div class="r-skills-inline">${d.skills.join('  ·  ')}</div>` : ''}
    </div>`;
  }

  if (!html && TPL_EXTRA[tpl]) html = TPL_EXTRA[tpl](d, c);
  return html;
}

function renderResume() {
  document.getElementById('resume-output').innerHTML = buildResumeHTML(getData(), currentTemplate, colorTheme);
}


// ======== COLOR / TEMPLATE SWITCHING ========
function setColorTheme(t, el) {
  colorTheme = t;
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  renderResume();
  scheduleSave();
}

function switchTpl(t, el) {
  currentTemplate = t;
  syncTemplateUI();
  renderResume();
  scheduleSave();
}

// ======== PDF DOWNLOAD ========
function downloadPDF() {
  renderResume();
  exportPDF(document.getElementById('resume-output'), getData().name, document.getElementById('dl-btn'));
}


// ======== TEMPLATE REGISTRY ========
const TEMPLATES = [
  { id: 'classic',   name: 'Classic',        desc: 'Clean, traditional format trusted by recruiters',              tag: 'Traditional',  cat: 'professional' },
  { id: 'modern',    name: 'Modern Sidebar', desc: 'Two-column layout with a bold accent sidebar',                 tag: 'Professional', cat: 'professional' },
  { id: 'creative',  name: 'Creative Split', desc: 'Bold header with a two-column body',                           tag: 'Creative',     cat: 'creative' },
  { id: 'minimal',   name: 'Minimal',        desc: 'Elegant, whitespace-driven typography',                        tag: 'Minimal',      cat: 'simple' },
  { id: 'executive', name: 'Executive',      desc: 'Centered serif header for senior and leadership roles',        tag: 'Executive',    cat: 'professional', isNew: true },
  { id: 'timeline',  name: 'Timeline',       desc: 'Your career laid out as a clean vertical timeline',            tag: 'Modern',       cat: 'modern',       isNew: true },
  { id: 'spotlight', name: 'Spotlight',      desc: 'Big color banner with a two-column body',                      tag: 'Creative',     cat: 'creative',     isNew: true },
  { id: 'ats',       name: 'ATS Compact',    desc: 'Plain single column that applicant-tracking systems read best', tag: 'ATS-friendly', cat: 'simple',       isNew: true },
  { id: 'developer', name: 'Developer',      desc: 'Code-inspired design for engineers and tech roles',            tag: 'Tech',         cat: 'modern',       isNew: true },
  { id: 'fresher',   name: 'Fresher',        desc: 'Education and projects first — ideal for students',            tag: 'Student',      cat: 'student',      isNew: true },
];
const TEMPLATE_IDS = TEMPLATES.map(t => t.id);
const TEMPLATE_CATS = [
  ['all', 'All'], ['professional', 'Professional'], ['modern', 'Modern'], ['creative', 'Creative'], ['simple', 'Simple & ATS'], ['student', 'Student'],
];
let templateFilter = 'all';

const SAMPLE_RESUME = {
  name: 'Ananya Rao', role: 'Product Designer',
  email: 'ananya.rao@email.com', phone: '+91 98765 43210',
  location: 'Bengaluru, India', linkedin: 'linkedin.com/in/ananyarao',
  summary: 'Product designer with 6 years of experience crafting intuitive digital products used by millions. Skilled at turning research into simple, beautiful interfaces.',
  experience: [
    { title: 'Senior Product Designer', company: 'Swiggy', from: '2021', to: 'Present', loc: 'Bengaluru', desc: '• Led redesign of checkout, lifting conversion by 12%\n• Built and maintained the design system\n• Mentored a team of 4 designers' },
    { title: 'UX Designer', company: 'Freshworks', from: '2018', to: '2021', loc: 'Chennai', desc: '• Redesigned onboarding for 50K+ businesses\n• Ran 30+ usability studies' },
  ],
  education: [{ degree: 'B.Des Interaction Design', school: 'NID Ahmedabad', from: '2014', to: '2018', gpa: '8.7 / 10' }],
  skills: ['Figma', 'Prototyping', 'User Research', 'Design Systems', 'HTML/CSS', 'Accessibility'],
  projects: [{ name: 'Open Design Kit', role: 'Creator', date: '2023', link: 'github.com/ananya/odk', desc: 'Free component library used by 2,000+ designers.' }],
};

function tplRange(e) { return [e.from, e.to].filter(Boolean).join(' – '); }
function tplContacts(d) { return [d.email, d.phone, d.location, d.linkedin].filter(Boolean); }
function tplHas(arr) { return arr && arr.length; }

// New templates. `d` is already HTML-escaped; `c` is the accent palette.
const TPL_EXTRA = {
  executive(d, c) {
    const sec = (t, body) => body ? `<div class="x-sec"><div class="x-h">${t}</div>${body}</div>` : '';
    return `<div class="tpl-executive" style="--ac:${c.accent};--ac2:${c.sidebar}">
      <div class="x-head">
        <div class="x-name">${d.name || 'Your Name'}</div>
        ${d.role ? `<div class="x-role">${d.role}</div>` : ''}
        <div class="x-contact">${tplContacts(d).map(x => `<span>${x}</span>`).join('<i>•</i>')}</div>
      </div>
      ${sec('Executive Profile', d.summary ? `<p class="x-sum">${d.summary}</p>` : '')}
      ${sec('Professional Experience', d.experience.map(e => `
        <div class="x-entry">
          <div class="x-row"><b>${e.title || 'Position'}</b><span>${tplRange(e)}</span></div>
          ${e.company ? `<div class="x-sub">${e.company}${e.loc ? ' · ' + e.loc : ''}</div>` : ''}
          ${e.desc ? `<div class="x-desc">${parseBullets(e.desc)}</div>` : ''}
        </div>`).join(''))}
      ${sec('Core Competencies', tplHas(d.skills) ? `<ul class="x-skills">${d.skills.map(s => `<li>${s}</li>`).join('')}</ul>` : '')}
      ${sec('Key Projects', d.projects.map(p => `
        <div class="x-entry">
          <div class="x-row"><b>${p.name || 'Project'}</b><span>${p.date || ''}</span></div>
          ${p.role || p.link ? `<div class="x-sub">${[p.role, p.link].filter(Boolean).join(' · ')}</div>` : ''}
          ${p.desc ? `<div class="x-desc">${parseBullets(p.desc)}</div>` : ''}
        </div>`).join(''))}
      ${sec('Education', d.education.map(e => `
        <div class="x-entry">
          <div class="x-row"><b>${e.degree || 'Degree'}</b><span>${tplRange(e)}</span></div>
          ${e.school ? `<div class="x-sub">${e.school}${e.gpa ? ' · ' + e.gpa : ''}</div>` : ''}
        </div>`).join(''))}
    </div>`;
  },

  timeline(d, c) {
    const item = (date, title, sub, desc) => `
      <div class="t-item">
        <div class="t-date">${date || ''}</div>
        <div class="t-title">${title}</div>
        ${sub ? `<div class="t-sub">${sub}</div>` : ''}
        ${desc ? `<div class="t-desc">${parseBullets(desc)}</div>` : ''}
      </div>`;
    const sec = (t, body) => body ? `<div class="t-sec"><div class="t-h">${t}</div><div class="t-line">${body}</div></div>` : '';
    return `<div class="tpl-timeline" style="--ac:${c.accent};--acb:${c.bg};--acl:${c.light}">
      <div class="t-head">
        <div>
          <div class="t-name">${d.name || 'Your Name'}</div>
          ${d.role ? `<div class="t-role">${d.role}</div>` : ''}
        </div>
        <div class="t-contact">${tplContacts(d).map(x => `<span>${x}</span>`).join('')}</div>
      </div>
      ${d.summary ? `<div class="t-summary">${d.summary}</div>` : ''}
      ${sec('Experience', d.experience.map(e => item(tplRange(e), e.title || 'Position', [e.company, e.loc].filter(Boolean).join(' · '), e.desc)).join(''))}
      ${sec('Projects', d.projects.map(p => item(p.date, p.name || 'Project', [p.role, p.link].filter(Boolean).join(' · '), p.desc)).join(''))}
      ${sec('Education', d.education.map(e => item(tplRange(e), e.degree || 'Degree', [e.school, e.gpa ? 'GPA ' + e.gpa : ''].filter(Boolean).join(' · '), '')).join(''))}
      ${tplHas(d.skills) ? `<div class="t-sec"><div class="t-h">Skills</div><div class="t-skills">${d.skills.map(s => `<span>${s}</span>`).join('')}</div></div>` : ''}
    </div>`;
  },

  spotlight(d, c) {
    const h = t => `<div class="s-h">${t}</div>`;
    return `<div class="tpl-spotlight" style="--ac:${c.accent};--ac2:${c.sidebar};--acb:${c.bg};--acl:${c.light}">
      <div class="s-banner">
        <div class="s-name">${d.name || 'Your Name'}</div>
        ${d.role ? `<div class="s-role">${d.role}</div>` : ''}
      </div>
      <div class="s-body">
        <div class="s-main">
          ${d.summary ? h('About') + `<p class="s-sum">${d.summary}</p>` : ''}
          ${tplHas(d.experience) ? h('Experience') + d.experience.map(e => `
            <div class="s-entry">
              <div class="s-row"><b>${e.title || 'Position'}</b><span>${tplRange(e)}</span></div>
              ${e.company ? `<div class="s-sub">${e.company}${e.loc ? ', ' + e.loc : ''}</div>` : ''}
              ${e.desc ? `<div class="s-desc">${parseBullets(e.desc)}</div>` : ''}
            </div>`).join('') : ''}
          ${tplHas(d.projects) ? h('Projects') + d.projects.map(p => `
            <div class="s-entry">
              <div class="s-row"><b>${p.name || 'Project'}</b><span>${p.date || ''}</span></div>
              ${p.role || p.link ? `<div class="s-sub">${[p.role, p.link].filter(Boolean).join(' · ')}</div>` : ''}
              ${p.desc ? `<div class="s-desc">${parseBullets(p.desc)}</div>` : ''}
            </div>`).join('') : ''}
        </div>
        <div class="s-side">
          ${tplContacts(d).length ? h('Contact') + `<div class="s-contact">${tplContacts(d).map(x => `<div>${x}</div>`).join('')}</div>` : ''}
          ${tplHas(d.skills) ? h('Skills') + `<div class="s-skills">${d.skills.map(s => `<span>${s}</span>`).join('')}</div>` : ''}
          ${tplHas(d.education) ? h('Education') + d.education.map(e => `
            <div class="s-edu"><b>${e.degree || 'Degree'}</b>${e.school ? `<div>${e.school}</div>` : ''}<div class="s-muted">${[tplRange(e), e.gpa].filter(Boolean).join(' · ')}</div></div>`).join('') : ''}
        </div>
      </div>
    </div>`;
  },

  ats(d) {
    const sec = (t, body) => body ? `<div class="a-h">${t}</div>${body}` : '';
    return `<div class="tpl-ats">
      <div class="a-name">${d.name || 'Your Name'}</div>
      ${d.role ? `<div class="a-role">${d.role}</div>` : ''}
      <div class="a-contact">${tplContacts(d).join(' | ')}</div>
      ${sec('Summary', d.summary ? `<p>${d.summary}</p>` : '')}
      ${sec('Skills', tplHas(d.skills) ? `<p>${d.skills.join(', ')}</p>` : '')}
      ${sec('Work Experience', d.experience.map(e => `
        <div class="a-entry">
          <div class="a-row"><b>${e.title || 'Position'}${e.company ? ', ' + e.company : ''}</b><span>${tplRange(e)}</span></div>
          ${e.loc ? `<div class="a-sub">${e.loc}</div>` : ''}
          ${e.desc ? parseBullets(e.desc) : ''}
        </div>`).join(''))}
      ${sec('Projects', d.projects.map(p => `
        <div class="a-entry">
          <div class="a-row"><b>${p.name || 'Project'}${p.role ? ', ' + p.role : ''}</b><span>${p.date || ''}</span></div>
          ${p.link ? `<div class="a-sub">${p.link}</div>` : ''}
          ${p.desc ? parseBullets(p.desc) : ''}
        </div>`).join(''))}
      ${sec('Education', d.education.map(e => `
        <div class="a-entry"><div class="a-row"><b>${e.degree || 'Degree'}${e.school ? ', ' + e.school : ''}</b><span>${tplRange(e)}</span></div>${e.gpa ? `<div class="a-sub">GPA: ${e.gpa}</div>` : ''}</div>`).join(''))}
    </div>`;
  },

  developer(d, c) {
    const sec = (t, body) => body ? `<div class="v-sec"><div class="v-h"><span>//</span> ${t}</div>${body}</div>` : '';
    const entry = (title, sub, date, desc) => `
      <div class="v-entry">
        <div class="v-row"><b>${title}</b><span>${date || ''}</span></div>
        ${sub ? `<div class="v-sub">${sub}</div>` : ''}
        ${desc ? `<div class="v-desc">${parseBullets(desc)}</div>` : ''}
      </div>`;
    return `<div class="tpl-developer" style="--ac:${c.accent};--acl:${c.light};--acb:${c.bg};--ac2:${c.sidebar}">
      <div class="v-head">
        <div class="v-prompt">~/resume $ whoami</div>
        <div class="v-name">${d.name || 'Your Name'}</div>
        ${d.role ? `<div class="v-role">${d.role}</div>` : ''}
        <div class="v-contact">${tplContacts(d).map(x => `<span>${x}</span>`).join('')}</div>
      </div>
      <div class="v-body">
        ${sec('about', d.summary ? `<p class="v-sum">${d.summary}</p>` : '')}
        ${sec('stack', tplHas(d.skills) ? `<div class="v-skills">${d.skills.map(s => `<code>${s}</code>`).join('')}</div>` : '')}
        ${sec('experience', d.experience.map(e => entry(e.title || 'Position', [e.company, e.loc].filter(Boolean).join(' · '), tplRange(e), e.desc)).join(''))}
        ${sec('projects', d.projects.map(p => entry(p.name || 'Project', [p.role, p.link].filter(Boolean).join(' · '), p.date, p.desc)).join(''))}
        ${sec('education', d.education.map(e => entry(e.degree || 'Degree', [e.school, e.gpa ? 'GPA ' + e.gpa : ''].filter(Boolean).join(' · '), tplRange(e), '')).join(''))}
      </div>
    </div>`;
  },

  fresher(d, c) {
    const initials = d.name ? d.name.replace(/&[a-z#0-9]+;/gi, '').split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'YN';
    const sec = (t, icon, body) => body ? `<div class="f-sec"><div class="f-h"><i>${icon}</i>${t}</div>${body}</div>` : '';
    return `<div class="tpl-fresher" style="--ac:${c.accent};--acb:${c.bg};--acl:${c.light}">
      <div class="f-head">
        <div class="f-avatar">${initials}</div>
        <div>
          <div class="f-name">${d.name || 'Your Name'}</div>
          ${d.role ? `<div class="f-role">${d.role}</div>` : ''}
          <div class="f-contact">${tplContacts(d).map(x => `<span>${x}</span>`).join('')}</div>
        </div>
      </div>
      <div class="f-body">
        ${sec('Career Objective', '◎', d.summary ? `<p class="f-sum">${d.summary}</p>` : '')}
        ${sec('Education', '✎', d.education.map(e => `
          <div class="f-edu">
            <div><b>${e.degree || 'Degree'}</b>${e.school ? `<div class="f-sub">${e.school}</div>` : ''}</div>
            <div class="f-right">${tplRange(e)}${e.gpa ? `<div class="f-gpa">${e.gpa}</div>` : ''}</div>
          </div>`).join(''))}
        ${sec('Skills', '★', tplHas(d.skills) ? `<div class="f-skills">${d.skills.map(s => `<span>${s}</span>`).join('')}</div>` : '')}
        ${sec('Projects', '◆', d.projects.map(p => `
          <div class="f-card">
            <div class="f-row"><b>${p.name || 'Project'}</b><span>${p.date || ''}</span></div>
            ${p.role || p.link ? `<div class="f-sub">${[p.role, p.link].filter(Boolean).join(' · ')}</div>` : ''}
            ${p.desc ? `<div class="f-desc">${parseBullets(p.desc)}</div>` : ''}
          </div>`).join(''))}
        ${sec('Experience & Internships', '▲', d.experience.map(e => `
          <div class="f-card">
            <div class="f-row"><b>${e.title || 'Position'}</b><span>${tplRange(e)}</span></div>
            ${e.company ? `<div class="f-sub">${e.company}${e.loc ? ', ' + e.loc : ''}</div>` : ''}
            ${e.desc ? `<div class="f-desc">${parseBullets(e.desc)}</div>` : ''}
          </div>`).join(''))}
      </div>
    </div>`;
  },
};

// ======== TEMPLATE PICKER UI ========
function renderTemplatePicker() {
  const filters = document.getElementById('tpl-filters');
  const grid = document.getElementById('templates-grid');
  if (!grid) return;
  filters.innerHTML = TEMPLATE_CATS.map(([id, label]) => {
    const n = id === 'all' ? TEMPLATES.length : TEMPLATES.filter(t => t.cat === id).length;
    return `<button class="tpl-filter ${templateFilter === id ? 'active' : ''}" onclick="setTemplateFilter('${id}')">${label} <span>${n}</span></button>`;
  }).join('');
  grid.innerHTML = TEMPLATES.filter(t => templateFilter === 'all' || t.cat === templateFilter).map(t => `
    <div class="template-card ${t.id === currentTemplate ? 'selected' : ''}" data-tpl="${t.id}" onclick="selectTemplate('${t.id}', this)" tabindex="0" onkeydown="if(event.key==='Enter')selectTemplate('${t.id}', this)">
      <div class="template-preview"><div class="tpl-thumb">${buildResumeHTML(SAMPLE_RESUME, t.id, colorTheme)}</div></div>
      <div class="template-info">
        <div class="template-name">${t.name}${t.isNew ? ' <span class="new-badge">New</span>' : ''}</div>
        <div class="template-desc">${t.desc}</div>
        <span class="template-tag tag-${t.cat}">${t.tag}</span>
      </div>
    </div>`).join('');
  fitTemplateThumbs();
  const sw = document.getElementById('tpl-switcher');
  if (sw) sw.innerHTML = TEMPLATES.map(t => `<div class="font-opt ${t.id === currentTemplate ? 'active' : ''}" data-tpl="${t.id}" onclick="switchTpl('${t.id}', this)">${t.name}</div>`).join('');
}
function fitTemplateThumbs() {
  document.querySelectorAll('.template-preview').forEach(box => {
    const thumb = box.querySelector('.tpl-thumb');
    if (thumb && box.clientWidth) thumb.style.transform = `scale(${box.clientWidth / 793})`;
  });
}
window.addEventListener('resize', () => { clearTimeout(fitTemplateThumbs._t); fitTemplateThumbs._t = setTimeout(fitTemplateThumbs, 120); });
function setTemplateFilter(id) { templateFilter = id; renderTemplatePicker(); }

function escDeep(v) {
  if (Array.isArray(v)) return v.map(escDeep);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = escDeep(v[k]); return o; }
  return typeof v === 'string' ? esc(v) : v;
}
// ---- PDF export (any element) ----
function exportPDF(element, name, btn) {
  if (typeof html2pdf === 'undefined') { toast('The PDF tool couldn’t load. Check your internet connection and reload.', 'err'); return; }
  const old = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF…'; }
  const filename = (name || 'Resume').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + '_Resume.pdf';
  Promise.resolve(html2pdf().set({
    margin: 0, filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'px', format: [793, 1122], orientation: 'portrait' },
  }).from(element).save())
    .catch(e => toast('PDF export failed: ' + (e.message || e), 'err'))
    .finally(() => { if (btn) { btn.disabled = false; btn.innerHTML = old; } });
}
