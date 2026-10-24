/*
 * RésuméCraft — PART 1: Core UI, Theme & Resume Form
 * Team member: ____________________
 *
 * Liquid-glass theme, page layout, step navigation, the resume form (personal info, summary, experience, education, skills, projects) and the resume-strength meter.
 */

// ======== STATE ========
let currentTemplate = 'classic';
let colorTheme = 'blue';
let skills = [];
let expEntries = [];
let eduEntries = [];
let projEntries = [];

// Color map for templates
const colorMap = {
  blue:    { sidebar: '#1e3a5f', accent: '#1e3a5f', light: '#a8c4e0', bg: '#e8f0ff' },
  orange:  { sidebar: '#c8502a', accent: '#c8502a', light: '#f5c4b0', bg: '#fff0e8' },
  green:   { sidebar: '#1a4a2e', accent: '#1a6a3a', light: '#a8d4b8', bg: '#e8f5ec' },
  purple:  { sidebar: '#5a1a6e', accent: '#7a2a9e', light: '#d4a8e0', bg: '#f0e8ff' },
  dark:    { sidebar: '#2a2a2a', accent: '#2a2a2a', light: '#b0b0b0', bg: '#f0f0f0' },
  crimson: { sidebar: '#8a1a2e', accent: '#aa2a3e', light: '#e4a8b4', bg: '#ffe8ec' },
};

// ======== NAVIGATION ========
function goToStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + n).classList.add('active');
  document.querySelectorAll('.step-pill').forEach((p, i) => {
    p.classList.remove('active', 'done');
    if (i + 1 < n) p.classList.add('done');
    if (i + 1 === n) p.classList.add('active');
  });
  if (n === 3) { renderResume(); renderReview(); }
  if (n === 4) { fillJobPrefs(); renderJobs(); renderTailor(); }
  if (n === 1) renderTemplatePicker();
  updateStrength();
  updateAIStatus();
}

// ======== TEMPLATE SELECTION ========
function selectTemplate(tpl, card) {
  document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  currentTemplate = tpl;
  syncTemplateUI();
  scheduleSave();
}

// ======== FORM SECTIONS ========
function showFormSection(id, btn) {
  document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
  document.getElementById('fs-' + id).classList.add('active');
  if (btn) {
    document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  }
}

// ======== DYNAMIC ENTRIES ========
let expCount = 0;
function addExperience() {
  const id = expCount++;
  expEntries.push({ id, title: '', company: '', from: '', to: '', desc: '' });
  renderExpEntries();
  scheduleSave();
}

function removeExp(id) {
  expEntries = expEntries.filter(e => e.id !== id);
  renderExpEntries();
  liveUpdate();
}

function renderExpEntries() {
  const container = document.getElementById('exp-entries');
  container.innerHTML = expEntries.map((e, idx) => `
    <div class="entry-card">
      <div class="entry-card-header">
        <span class="entry-card-title">Experience ${idx + 1}</span>
        <div class="entry-actions"><button class="ai-btn" onclick="aiImproveEntry('exp', ${idx}, this)">✨ Improve with AI</button><button class="remove-btn" onclick="removeExp(${e.id})">Remove</button></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Job Title</label><input type="text" value="${esc(e.title)}" placeholder="Software Engineer" oninput="expEntries[${idx}].title=this.value;liveUpdate()"></div>
        <div class="field"><label>Company</label><input type="text" value="${esc(e.company)}" placeholder="Google" oninput="expEntries[${idx}].company=this.value;liveUpdate()"></div>
      </div>
      <div class="form-row three">
        <div class="field"><label>Start Date</label><input type="text" value="${esc(e.from)}" placeholder="Jan 2021" oninput="expEntries[${idx}].from=this.value;liveUpdate()"></div>
        <div class="field"><label>End Date</label><input type="text" value="${esc(e.to)}" placeholder="Present" oninput="expEntries[${idx}].to=this.value;liveUpdate()"></div>
        <div class="field"><label>Location</label><input type="text" value="${esc(e.loc)}" placeholder="Remote" oninput="expEntries[${idx}].loc=this.value;liveUpdate()"></div>
      </div>
      <div class="form-row full">
        <div class="field"><label>Description (one bullet per line)</label><textarea rows="4" placeholder="• Built REST APIs serving 1M+ users&#10;• Reduced page load time by 40%" oninput="expEntries[${idx}].desc=this.value;liveUpdate()">${esc(e.desc)}</textarea></div>
      </div>
    </div>`).join('');
}

let eduCount = 0;
function addEducation() {
  const id = eduCount++;
  eduEntries.push({ id, degree: '', school: '', from: '', to: '', gpa: '' });
  renderEduEntries();
  scheduleSave();
}

function removeEdu(id) {
  eduEntries = eduEntries.filter(e => e.id !== id);
  renderEduEntries();
  liveUpdate();
}

function renderEduEntries() {
  const container = document.getElementById('edu-entries');
  container.innerHTML = eduEntries.map((e, idx) => `
    <div class="entry-card">
      <div class="entry-card-header">
        <span class="entry-card-title">Education ${idx + 1}</span>
        <button class="remove-btn" onclick="removeEdu(${e.id})">Remove</button>
      </div>
      <div class="form-row">
        <div class="field"><label>Degree / Certification</label><input type="text" value="${esc(e.degree)}" placeholder="B.Tech Computer Science" oninput="eduEntries[${idx}].degree=this.value;liveUpdate()"></div>
        <div class="field"><label>School / University</label><input type="text" value="${esc(e.school)}" placeholder="IIT Bombay" oninput="eduEntries[${idx}].school=this.value;liveUpdate()"></div>
      </div>
      <div class="form-row three">
        <div class="field"><label>Start Year</label><input type="text" value="${esc(e.from)}" placeholder="2018" oninput="eduEntries[${idx}].from=this.value;liveUpdate()"></div>
        <div class="field"><label>End Year</label><input type="text" value="${esc(e.to)}" placeholder="2022" oninput="eduEntries[${idx}].to=this.value;liveUpdate()"></div>
        <div class="field"><label>GPA / Grade</label><input type="text" value="${esc(e.gpa)}" placeholder="8.9 / 10" oninput="eduEntries[${idx}].gpa=this.value;liveUpdate()"></div>
      </div>
    </div>`).join('');
}

let projCount = 0;
function addProject() {
  const id = projCount++;
  projEntries.push({ id, name: '', role: '', date: '', desc: '', link: '' });
  renderProjEntries();
  scheduleSave();
}

function removeProj(id) {
  projEntries = projEntries.filter(e => e.id !== id);
  renderProjEntries();
  liveUpdate();
}

function renderProjEntries() {
  const container = document.getElementById('proj-entries');
  container.innerHTML = projEntries.map((e, idx) => `
    <div class="entry-card">
      <div class="entry-card-header">
        <span class="entry-card-title">Project ${idx + 1}</span>
        <div class="entry-actions"><button class="ai-btn" onclick="aiImproveEntry('proj', ${idx}, this)">✨ Improve with AI</button><button class="remove-btn" onclick="removeProj(${e.id})">Remove</button></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Project Name</label><input type="text" value="${esc(e.name)}" placeholder="E-Commerce Platform" oninput="projEntries[${idx}].name=this.value;liveUpdate()"></div>
        <div class="field"><label>Your Role</label><input type="text" value="${esc(e.role)}" placeholder="Lead Developer" oninput="projEntries[${idx}].role=this.value;liveUpdate()"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Date / Duration</label><input type="text" value="${esc(e.date)}" placeholder="2023" oninput="projEntries[${idx}].date=this.value;liveUpdate()"></div>
        <div class="field"><label>Link (optional)</label><input type="text" value="${esc(e.link)}" placeholder="github.com/…" oninput="projEntries[${idx}].link=this.value;liveUpdate()"></div>
      </div>
      <div class="form-row full">
        <div class="field"><label>Description</label><textarea rows="3" placeholder="Built a full-stack platform with React and Node.js, handling 10K daily users." oninput="projEntries[${idx}].desc=this.value;liveUpdate()">${esc(e.desc)}</textarea></div>
      </div>
    </div>`).join('');
}

// ======== SKILLS ========
function addSkill() {
  const input = document.getElementById('skill-input');
  const val = input.value.trim();
  if (!val) return;
  val.split(',').forEach(s => {
    const t = s.trim();
    if (t && !skills.includes(t)) skills.push(t);
  });
  input.value = '';
  renderSkills();
  liveUpdate();
}

function removeSkillAt(i) {
  skills.splice(i, 1);
  renderSkills();
  liveUpdate();
}

function removeSkill(s) {
  skills = skills.filter(x => x !== s);
  renderSkills();
  liveUpdate();
}

function renderSkills() {
  document.getElementById('skills-container').innerHTML = skills.map((s, i) =>
    `<span class="skill-tag">${esc(s)} <button onclick="removeSkillAt(${i})" aria-label="Remove">×</button></span>`
  ).join('');
}

// ======== DATA GETTER ========
function getData() {
  return {
    name: ((document.getElementById('f-fname')?.value || '') + ' ' + (document.getElementById('f-lname')?.value || '')).trim(),
    role: document.getElementById('f-role')?.value || '',
    email: document.getElementById('f-email')?.value || '',
    phone: document.getElementById('f-phone')?.value || '',
    location: document.getElementById('f-location')?.value || '',
    linkedin: document.getElementById('f-linkedin')?.value || '',
    summary: document.getElementById('f-summary')?.value || '',
    experience: expEntries,
    education: eduEntries,
    skills: [...skills],
    projects: projEntries,
  };
}

// ======== BULLET PARSER ========
function parseBullets(text) {
  if (!text) return '';
  const lines = text.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(l => l);
  if (lines.length <= 1) return `<p>${lines[0] || ''}</p>`;
  return '<ul>' + lines.map(l => `<li>${l}</li>`).join('') + '</ul>';
}

// ---- Resume strength ----
function resumeStrength(d) {
  const checks = [
    [!!d.name, 'Add your full name', 8],
    [!!d.role, 'Add the job title you’re aiming for', 8],
    [!!d.email, 'Add your email', 8],
    [!!d.phone, 'Add a phone number', 6],
    [!!d.location, 'Add your city', 4],
    [!!d.linkedin, 'Add LinkedIn or a portfolio link', 4],
    [(d.summary || '').trim().length >= 120, 'Write a 2–4 sentence summary', 14],
    [d.experience.some(e => e.title && e.company), 'Add a job with title and company', 14],
    [d.experience.some(e => (e.desc || '').split('\n').filter(l => l.trim()).length >= 2), 'Add 2+ bullet points to a job', 10],
    [d.education.some(e => e.degree || e.school), 'Add your education', 8],
    [d.skills.length >= 5, 'List at least 5 skills', 10],
    [d.projects.some(p => p.name), 'Add a project', 6],
  ];
  const score = checks.reduce((a, [ok, , w]) => a + (ok ? w : 0), 0);
  const next = checks.find(([ok]) => !ok);
  return { score, next: next ? next[1] : '' };
}
function updateStrength() {
  const el = document.getElementById('strength');
  if (!el) return;
  const { score, next } = resumeStrength(getData());
  document.getElementById('strength-val').textContent = score + '%';
  const fill = document.getElementById('strength-fill');
  fill.style.width = score + '%';
  fill.style.background = score >= 80 ? 'linear-gradient(90deg,#1fa36a,#3fd18f)' : score >= 50 ? 'var(--accent-grad)' : 'linear-gradient(90deg,#ff9f43,#ff6b6b)';
  document.getElementById('strength-next').textContent = next ? 'Next: ' + next : 'Looking complete — nice work!';
}

// ======== LIVE UPDATE (called by every form input) ========
function liveUpdate() {
  scheduleSave();
  updateStrength();
  // only update if on step 3
  if (document.getElementById('step-3').classList.contains('active')) renderResume();
}

// ======== APP START (runs after all 4 parts have loaded) ========
window.addEventListener('load', () => {
  renderTemplatePicker();
  initAuth();
});
