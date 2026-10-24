/*
 * RésuméCraft — PART 4: AI Assistant, Jobs & Resume Upload
 * Team member: ____________________
 *
 * AI provider connection (Claude / OpenAI / Gemini), AI writing help and resume review, job suggestions, job-post tailoring and cover letters, and uploading an old resume (PDF, Word, photo, OCR).
 */

// =====================================================================
// ======== AI ASSISTANT & JOB SUGGESTIONS ========
// =====================================================================
// The API key is entered by an admin (Admin → AI settings) and saved in
// this browser only. Requests go straight from the browser to the provider.

const AI_KEY_STORE = 'rc_ai_v1';
const AI_PROVIDERS = {
  anthropic: { label: 'Claude (Anthropic)', model: 'claude-sonnet-5-5', keyHint: 'sk-ant-…', keyUrl: 'https://console.anthropic.com/settings/keys' },
  openai:    { label: 'OpenAI',             model: 'gpt-5.4-mini',      keyHint: 'sk-…',     keyUrl: 'https://platform.openai.com/api-keys' },
  gemini:    { label: 'Google Gemini',      model: 'gemini-3.6-flash',  keyHint: 'AIza…',    keyUrl: 'https://aistudio.google.com/apikey' },
};

// Per-profile AI results (saved with the profile)
let aiCache = { jobs: null, review: null, upload: null, tailor: null, prefs: { location: '', level: 'auto', mode: 'any' } };

function getAIConfig() {
  try {
    const c = JSON.parse(store.get(AI_KEY_STORE));
    if (c && c.key && AI_PROVIDERS[c.provider]) return c;
  } catch (e) {}
  return null;
}
function aiReady() { return !!getAIConfig(); }

// ---- Provider calls ----
async function callAI(system, prompt, { maxTokens = 1500, attachment = null } = {}) {
  const att = attachment;
  const isPdfAtt = att && att.mime === 'application/pdf';
  const cfg = getAIConfig();
  if (!cfg) throw new Error('AI is not set up yet. ' + (currentUser && currentUser.admin ? 'Add an API key in Admin → AI settings.' : 'Ask an admin to add an API key.'));
  const model = (cfg.model || AI_PROVIDERS[cfg.provider].model).trim();
  let res, data;
  try {
    if (cfg.provider === 'anthropic') {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': cfg.key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: att
          ? [{ type: isPdfAtt ? 'document' : 'image', source: { type: 'base64', media_type: att.mime, data: att.data } }, { type: 'text', text: prompt }]
          : prompt }] }),
      });
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || ('HTTP ' + res.status));
      return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    }
    if (cfg.provider === 'openai') {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + cfg.key },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: att
          ? [isPdfAtt ? { type: 'file', file: { filename: att.name || 'resume.pdf', file_data: 'data:application/pdf;base64,' + att.data } }
                      : { type: 'image_url', image_url: { url: 'data:' + att.mime + ';base64,' + att.data } },
             { type: 'text', text: prompt }]
          : prompt }] }),
      });
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || ('HTTP ' + res.status));
      return (data.choices?.[0]?.message?.content || '').trim();
    }
    if (cfg.provider === 'gemini') {
      res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: att ? [{ inline_data: { mime_type: att.mime, data: att.data } }, { text: prompt }] : [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens * 2 },
        }),
      });
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || ('HTTP ' + res.status));
      return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    }
  } catch (e) {
    if (e instanceof TypeError) throw new Error('Could not reach ' + AI_PROVIDERS[cfg.provider].label + '. Check your internet connection.');
    throw new Error(AI_PROVIDERS[cfg.provider].label + ': ' + e.message);
  }
  throw new Error('Unknown AI provider.');
}

function parseAIJSON(text) {
  let t = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const start = t.search(/[\[{]/);
  if (start > 0) t = t.slice(start);
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (end >= 0) t = t.slice(0, end + 1);
  try { return JSON.parse(t); } catch (e) { throw new Error('The AI reply was not in the expected format. Please try again.'); }
}

const WRITER_SYSTEM = 'You are an expert resume writer and career coach. Write in clear, confident, ATS-friendly English. ' +
  'Never invent employers, degrees, dates, or numbers that are not in the data. When a metric would help but is unknown, use a placeholder like [X%] or [N] so the user can fill it in. ' +
  'Return only what is asked for, with no preamble.';

function profileForAI() {
  const d = getData();
  const clean = arr => arr.map(({ id, ...r }) => r).filter(r => Object.values(r).some(v => String(v || '').trim()));
  return JSON.stringify({
    name: d.name, role: d.role, location: d.location, summary: d.summary,
    skills: d.skills, experience: clean(d.experience), education: clean(d.education), projects: clean(d.projects),
  }, null, 1);
}

// ---- UI helpers ----
async function withBusy(btn, label, fn) {
  if (!aiReady()) { toast(callAINotReadyMsg(), 'err'); return; }
  const old = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spin"></span> ${label}`; }
  try { await fn(); }
  catch (e) { toast(e.message || String(e), 'err'); }
  finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = old; } }
}
function callAINotReadyMsg() {
  return 'AI is not set up yet. ' + (currentUser && currentUser.admin ? 'Add an API key in Admin → AI settings.' : 'Ask an admin to add an API key.');
}

function toast(text, kind = 'ok', action) {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  const span = document.createElement('span'); span.textContent = text; t.appendChild(span);
  if (action) {
    const b = document.createElement('button'); b.className = 'mini-btn'; b.textContent = action.label;
    b.onclick = () => { action.fn(); t.remove(); };
    t.appendChild(b);
  }
  wrap.appendChild(t);
  setTimeout(() => t.remove(), kind === 'err' ? 7000 : (action ? 9000 : 3500));
}

function updateAIStatus() {
  const cfg = getAIConfig();
  document.querySelectorAll('[data-ai-status]').forEach(el => {
    el.innerHTML = cfg
      ? `<span class="ai-dot on"></span><span>AI assistant on · ${esc(AI_PROVIDERS[cfg.provider].label)}</span>`
      : `<span class="ai-dot"></span><span>AI assistant off · ${currentUser && currentUser.admin ? 'add a key in Admin → AI settings' : 'ask an admin to add an API key'}</span>`;
  });
}

// ---- Writing help ----
async function aiSummary(btn) {
  await withBusy(btn, 'Writing…', async () => {
    const el = document.getElementById('f-summary');
    const before = el.value;
    const ask = before.trim()
      ? 'Improve this professional summary. Keep it 3–4 sentences, first-person implied (no "I"), tailored to the target role.\n\nCurrent summary:\n' + before
      : 'Write a 3–4 sentence professional summary (first-person implied, no "I") for this person, tailored to their target role.';
    const out = await callAI(WRITER_SYSTEM, 'Resume data:\n' + profileForAI() + '\n\n' + ask + '\nReturn only the summary text.', { maxTokens: 500 });
    el.value = out.replace(/^["“]|["”]$/g, '');
    liveUpdate();
    toast('Summary updated by AI.', 'ok', { label: 'Undo', fn: () => { el.value = before; liveUpdate(); } });
  });
}

async function aiImproveEntry(kind, idx, btn) {
  const list = kind === 'exp' ? expEntries : projEntries;
  const entry = list[idx];
  if (!entry) return;
  await withBusy(btn, 'Improving…', async () => {
    const before = entry.desc || '';
    const label = kind === 'exp'
      ? `the job "${entry.title || 'this role'}" at "${entry.company || 'this company'}"`
      : `the project "${entry.name || 'this project'}"`;
    const ask = before.trim()
      ? `Rewrite the description for ${label} as 3–5 strong resume bullet points (action verb first, impact-focused). Keep every fact; do not invent new ones.\n\nCurrent text:\n${before}`
      : `Draft 3–4 resume bullet points for ${label}, based only on the role/title and the rest of the resume. Use [placeholders] for anything specific the user must fill in.`;
    const out = await callAI(WRITER_SYSTEM, 'Resume data:\n' + profileForAI() + '\n\n' + ask + '\nReturn one bullet per line, each starting with "• ". No headings.', { maxTokens: 700 });
    const bullets = out.split('\n').map(l => l.trim()).filter(Boolean).map(l => '• ' + l.replace(/^[•\-\*\d.)\s]+/, '')).join('\n');
    entry.desc = bullets;
    kind === 'exp' ? renderExpEntries() : renderProjEntries();
    liveUpdate();
    toast('Bullets rewritten by AI.', 'ok', { label: 'Undo', fn: () => { entry.desc = before; kind === 'exp' ? renderExpEntries() : renderProjEntries(); liveUpdate(); } });
  });
}

async function aiSuggestSkills(btn) {
  await withBusy(btn, 'Thinking…', async () => {
    const out = await callAI(WRITER_SYSTEM,
      'Resume data:\n' + profileForAI() + '\n\nSuggest 10 relevant skills (technical and soft) this person likely has or should list for their target role, that are NOT already in their skills list. ' +
      'Return JSON only: {"skills": ["Skill 1", "Skill 2"]}', { maxTokens: 400 });
    const data = parseAIJSON(out);
    const have = new Set(skills.map(s => s.toLowerCase()));
    const list = (Array.isArray(data) ? data : data.skills || []).map(s => String(s).trim()).filter(s => s && !have.has(s.toLowerCase())).slice(0, 12);
    renderSkillSuggestions(list);
    if (!list.length) toast('No new skills to suggest — your list already looks complete.');
  });
}
function renderSkillSuggestions(list) {
  const box = document.getElementById('skill-suggestions');
  box.innerHTML = list.length ? list.map(s => `<button type="button" class="suggest-chip" data-skill="${esc(s)}">+ ${esc(s)}</button>`).join('') : '';
  box.querySelectorAll('.suggest-chip').forEach(b => b.onclick = () => {
    const s = b.dataset.skill;
    if (!skills.some(x => x.toLowerCase() === s.toLowerCase())) skills.push(s);
    b.remove(); renderSkills(); liveUpdate();
  });
}

// ---- Resume review ----
async function aiReview(btn) {
  await withBusy(btn, 'Reviewing…', async () => {
    const out = await callAI(WRITER_SYSTEM,
      'Resume data:\n' + profileForAI() + '\n\nReview this resume as a recruiter for the target role. ' +
      'Return JSON only: {"score": 0-100, "verdict": "one sentence", "strengths": ["…", "…"], "improvements": ["specific actionable fix", "…"]}. Give 2–4 strengths and 3–5 improvements.',
      { maxTokens: 900 });
    const r = parseAIJSON(out);
    aiCache.review = {
      score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
      verdict: String(r.verdict || ''),
      strengths: (r.strengths || []).map(String).slice(0, 5),
      improvements: (r.improvements || []).map(String).slice(0, 6),
      at: Date.now(),
    };
    renderReview();
    scheduleSave();
  });
}
function renderReview() {
  const box = document.getElementById('review-box');
  if (!box) return;
  const r = aiCache.review;
  if (!r) { box.innerHTML = ''; return; }
  box.innerHTML = `
    <div class="review-head">
      <div class="score-ring" style="--p:${r.score}"><span>${r.score}</span></div>
      <p>${esc(r.verdict)}</p>
    </div>
    ${r.strengths.length ? `<div class="mini-label">Strengths</div><ul class="review-list good">${r.strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${r.improvements.length ? `<div class="mini-label">Improve</div><ul class="review-list fix">${r.improvements.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}`;
}

// ---- Job suggestions ----
function readJobPrefs() {
  aiCache.prefs = {
    location: document.getElementById('job-location').value.trim(),
    level: document.getElementById('job-level').value,
    mode: document.getElementById('job-mode').value,
  };
  return aiCache.prefs;
}
function fillJobPrefs() {
  const p = aiCache.prefs || {};
  document.getElementById('job-location').value = p.location || '';
  document.getElementById('job-location').placeholder = document.getElementById('f-location').value || 'e.g. Bengaluru, India';
  document.getElementById('job-level').value = p.level || 'auto';
  document.getElementById('job-mode').value = p.mode || 'any';
}

function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function jobLinks(query, location, mode) {
  const q = encodeURIComponent(query);
  const loc = location || '';
  const l = encodeURIComponent(loc);
  const remote = mode === 'remote';
  const city = loc.split(',')[0].trim();
  const naukri = 'https://www.naukri.com/' + slug(query) + '-jobs' + (city && !remote ? '-in-' + slug(city) : '');
  return [
    ['LinkedIn', `https://www.linkedin.com/jobs/search/?keywords=${q}${loc ? '&location=' + l : ''}${remote ? '&f_WT=2' : ''}`],
    ['Naukri', naukri],
    ['Indeed', `https://www.indeed.com/jobs?q=${q}${remote ? '+remote' : ''}${loc && !remote ? '&l=' + l : ''}`],
    ['Google Jobs', `https://www.google.com/search?ibp=htl;jobs&q=${encodeURIComponent(query + ' jobs' + (remote ? ' remote' : loc ? ' in ' + loc : ''))}`],
  ];
}

async function aiFindJobs(btn) {
  const d = getData();
  if (!d.role && !d.skills.length && !d.experience.some(e => e.title)) {
    toast('Add at least your job title or a few skills first, so jobs can be matched to you.', 'err');
    return;
  }
  const p = readJobPrefs();
  const loc = p.location || d.location;
  await withBusy(btn, 'Finding matches…', async () => {
    const out = await callAI(
      'You are an expert career advisor and technical recruiter who knows current hiring markets well. Be realistic and specific. Return JSON only.',
      'Resume data:\n' + profileForAI() +
      `\n\nPreferences: location = ${loc || 'not specified'}; experience level = ${p.level === 'auto' ? 'infer from resume' : p.level}; work mode = ${p.mode}.` +
      '\n\nSuggest the 6 best-matching job roles for this person to apply to now, ordered best match first. Include a mix of their direct next role and 1–2 adjacent roles. ' +
      'For each, give a realistic match score, why it fits (referencing their actual experience/skills), up to 4 skills they are missing, a short job-board search query, and a typical salary range in the local currency for the location (or "" if unsure). ' +
      'Return JSON only in this shape: {"jobs":[{"title":"","level":"","match":0,"why":"","missing_skills":[""],"search_query":"","salary_range":""}],"career_tip":""}',
      { maxTokens: 1800 });
    const data = parseAIJSON(out);
    const jobs = (data.jobs || data || []).filter(j => j && j.title).slice(0, 8).map(j => ({
      title: String(j.title), level: String(j.level || ''),
      match: Math.max(0, Math.min(100, Math.round(Number(j.match) || 0))),
      why: String(j.why || ''), missing: (j.missing_skills || []).map(String).slice(0, 5),
      query: String(j.search_query || j.title), salary: String(j.salary_range || ''),
    }));
    if (!jobs.length) throw new Error('No job suggestions came back. Please try again.');
    aiCache.jobs = { list: jobs, tip: String(data.career_tip || ''), location: loc, mode: p.mode, at: Date.now(), ai: true };
    renderJobs();
    scheduleSave();
  });
}

function quickJobs() {
  // Works without AI: builds job searches from the resume itself.
  const d = getData();
  const p = readJobPrefs();
  const loc = p.location || d.location;
  const searches = [];
  const add = (title, query) => { if (query && !searches.some(x => x.query.toLowerCase() === query.toLowerCase())) searches.push({ title, query }); };
  if (d.role) add(d.role, d.role);
  d.experience.forEach(e => e.title && add(e.title, e.title));
  d.skills.slice(0, 3).forEach(s => add(d.role ? `${d.role} · ${s}` : s, d.role ? `${d.role} ${s}` : s));
  if (!searches.length) { toast('Add your job title or skills first.', 'err'); return; }
  aiCache.jobs = {
    list: searches.slice(0, 6).map(x => ({ title: x.title, level: '', match: null, why: '', missing: [], query: x.query, salary: '' })),
    tip: '', location: loc, mode: p.mode, at: Date.now(), ai: false,
  };
  renderJobs();
  scheduleSave();
}

function renderJobs() {
  const out = document.getElementById('jobs-output');
  if (!out) return;
  const j = aiCache.jobs;
  if (!j || !j.list || !j.list.length) {
    out.innerHTML = `<div class="empty-state">
      <div class="big-ico">🧭</div>
      <h4>Find jobs that fit your resume</h4>
      <p>${aiReady()
        ? 'Set your preferences on the left and press <b>Find matching jobs</b>. The AI reads this profile’s resume and suggests roles, how well you match, and what to learn next.'
        : 'AI matching needs an API key (' + (currentUser && currentUser.admin ? 'Admin → AI settings' : 'ask an admin') + '). Meanwhile, <b>Quick search</b> builds job searches from your title and skills.'}</p>
    </div>`;
    return;
  }
  out.innerHTML = `
    <div class="jobs-head">
      <div>
        <h3>${j.ai ? 'Your best-matching roles' : 'Quick job searches'}</h3>
        <p>${j.ai ? 'Matched by AI to this profile’s resume' : 'Built from your title and skills'}${j.location ? ' · ' + esc(j.location) : ''}${j.mode && j.mode !== 'any' ? ' · ' + esc(j.mode) : ''} · ${new Date(j.at).toLocaleDateString()}</p>
      </div>
    </div>
    <div class="jobs-grid">
      ${j.list.map((job, i) => `
        <div class="job-card" style="animation-delay:${i * 60}ms">
          <div class="job-top">
            ${job.match !== null && job.match !== undefined ? `<div class="score-ring" style="--p:${job.match}"><span>${job.match}%</span></div>` : ''}
            <div>
              <div class="job-title">${esc(job.title)}</div>
              ${job.level || job.salary ? `<div class="job-meta">${[job.level, job.salary].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
            </div>
          </div>
          ${job.why ? `<div class="job-why">${esc(job.why)}</div>` : ''}
          ${job.missing.length ? `<div><div class="mini-label">Skills to add</div><div class="job-skills">${job.missing.map(s => `<span class="job-skill">${esc(s)}</span>`).join('')}</div></div>` : ''}
          <div class="job-links">${jobLinks(job.query, j.location, j.mode).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${n} ↗</a>`).join('')}</div>
        </div>`).join('')}
    </div>
    ${j.tip ? `<div class="career-tip"><b>Career tip:</b> ${esc(j.tip)}</div>` : ''}`;
}

// ---- Admin: AI settings ----
function showAdminTab(name) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.admin-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + name));
  if (name === 'ai') loadAISettingsForm();
  if (name === 'resumes') renderResumeGallery();
  if (name === 'profiles') renderUserList();
}
function loadAISettingsForm() {
  const cfg = getAIConfig() || { provider: 'anthropic', key: '', model: '' };
  document.getElementById('ai-provider').value = cfg.provider;
  document.getElementById('ai-key').value = cfg.key || '';
  document.getElementById('ai-model').value = cfg.model || AI_PROVIDERS[cfg.provider].model;
  onProviderChange(false);
  setAIMsg(getAIConfig() ? 'AI is on for every profile in this browser.' : '', true);
}
function onProviderChange(resetModel = true) {
  const p = document.getElementById('ai-provider').value;
  const info = AI_PROVIDERS[p];
  document.getElementById('ai-key').placeholder = info.keyHint;
  if (resetModel) document.getElementById('ai-model').value = info.model;
  const link = document.getElementById('ai-key-link');
  link.href = info.keyUrl; link.textContent = 'Get a ' + info.label + ' key ↗';
}
function setAIMsg(t, ok) {
  const m = document.getElementById('ai-msg');
  m.className = 'form-msg ' + (ok ? 'ok' : 'err'); m.style.textAlign = 'left'; m.textContent = t;
}
function saveAISettings(silent) {
  if (!requireAdmin()) return false;
  const provider = document.getElementById('ai-provider').value;
  const key = document.getElementById('ai-key').value.trim();
  const model = document.getElementById('ai-model').value.trim() || AI_PROVIDERS[provider].model;
  if (!key) { setAIMsg('Paste an API key first.'); return false; }
  store.set(AI_KEY_STORE, JSON.stringify({ provider, key, model, by: currentUser.username, at: Date.now() }));
  updateAIStatus(); renderJobs();
  if (!silent) setAIMsg('Saved. AI is now on for every profile in this browser.', true);
  return true;
}
async function testAISettings(btn) {
  if (!saveAISettings(true)) return;
  const old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Testing…';
  try {
    const r = await callAI('Reply with exactly: OK', 'Connection test. Reply with OK.', { maxTokens: 10 });
    setAIMsg('Connected ✓ — ' + AI_PROVIDERS[getAIConfig().provider].label + ' replied “' + r.slice(0, 20) + '”. Key saved.', true);
  } catch (e) {
    setAIMsg(e.message + ' (Key saved — fix it and test again.)');
  } finally { btn.disabled = false; btn.innerHTML = old; }
}
function removeAIKey() {
  if (!requireAdmin()) return;
  store.del(AI_KEY_STORE);
  document.getElementById('ai-key').value = '';
  updateAIStatus(); renderJobs();
  setAIMsg('Key removed. AI features are off.', true);
}

// ---- Upload an old resume ----
const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const MAMMOTH_URL = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
let uploadResult = null; // { fileName, text, parsed, review, basic }

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing && existing.dataset.loaded) return resolve();
    const s = existing || document.createElement('script');
    s.dataset.src = src;
    s.onload = () => { s.dataset.loaded = '1'; resolve(); };
    s.onerror = () => { s.remove(); reject(new Error('Couldn’t load the file reader. Check your internet connection.')); };
    if (!existing) { s.src = src; document.head.appendChild(s); }
  });
}

const PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';
const TESS_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const TESS_OPTS = {
  workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
  corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
  langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int',
};

function imageMime(file) {
  const n = file.name.toLowerCase();
  if (/\.png$/.test(n) || file.type === 'image/png') return 'image/png';
  if (/\.jpe?g$/.test(n) || file.type === 'image/jpeg') return 'image/jpeg';
  if (/\.webp$/.test(n) || file.type === 'image/webp') return 'image/webp';
  return '';
}
function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function cleanText(t) { return String(t || '').replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); }
function hasEnoughText(t) { return t.replace(/\s/g, '').length >= 60; }

// Returns { text, mime?, bytes?, pdf? } — bytes/mime are kept so scans can go to AI or OCR.
async function readResumeFile(file) {
  const name = file.name.toLowerCase();
  if (file.size > 10 * 1024 * 1024) throw new Error('That file is larger than 10 MB.');
  if (name.endsWith('.txt') || name.endsWith('.md') || file.type === 'text/plain') return { text: await file.text() };
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    if (!window.pdfjsLib) await loadScriptOnce(PDFJS_URL);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({
        data: bytes.slice(),
        cMapUrl: PDFJS_BASE + 'cmaps/', cMapPacked: true,
        standardFontDataUrl: PDFJS_BASE + 'standard_fonts/',
      }).promise;
    } catch (e) {
      if (e && e.name === 'PasswordException') throw new Error('This PDF is password-protected. Remove the password and upload it again.');
      throw new Error('This PDF couldn’t be opened (' + (e.message || e) + ').');
    }
    const pages = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 8); i++) {
      try {
        const tc = await (await pdf.getPage(i)).getTextContent();
        pages.push(tc.items.map(it => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join(''));
      } catch (e) { /* skip unreadable page */ }
    }
    return { text: pages.join('\n\n'), mime: 'application/pdf', bytes, pdf };
  }
  const img = imageMime(file);
  if (img) return { text: '', mime: img, bytes: new Uint8Array(await file.arrayBuffer()) };
  if (name.endsWith('.docx')) {
    if (!window.mammoth) await loadScriptOnce(MAMMOTH_URL);
    return { text: (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value };
  }
  if (name.endsWith('.doc')) throw new Error('Old .doc files can’t be read in the browser. Save it as .docx or PDF and upload again.');
  throw new Error('Please upload a PDF, Word (.docx), image (PNG/JPG) or .txt file.');
}

// OCR for scanned / image-only resumes (runs in the browser, no AI needed)
async function ocrResume(src, onStatus) {
  if (!window.Tesseract) await loadScriptOnce(TESS_URL);
  let pageLabel = '';
  const worker = await Tesseract.createWorker('eng', 1, {
    ...TESS_OPTS,
    logger: m => {
      if (m.status === 'recognizing text') onStatus('Reading text from the image' + pageLabel + '… ' + Math.round((m.progress || 0) * 100) + '%');
      else if (/load|initializ/i.test(m.status || '')) onStatus('Preparing text recognition (first time takes a little longer)…');
    },
  });
  try {
    const out = [];
    if (src.pdf) {
      const n = Math.min(src.pdf.numPages, 3);
      for (let i = 1; i <= n; i++) {
        pageLabel = n > 1 ? ` (page ${i} of ${n})` : '';
        const page = await src.pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        out.push((await worker.recognize(canvas)).data.text);
      }
    } else {
      out.push((await worker.recognize(new Blob([src.bytes], { type: src.mime }))).data.text);
    }
    return out.join('\n\n');
  } finally {
    try { await worker.terminate(); } catch (e) {}
  }
}

function basicParse(text) {
  const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0];
  const phone = ((text.match(/(\+?\d[\d\s().-]{8,}\d)/) || [''])[0]).trim();
  const link = (text.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com)\/[^\s,;|]+/i) || [''])[0];
  const first = text.split('\n').map(l => l.trim()).find(l => l && l.length < 50 && !/[@\d]/.test(l) && l.split(/\s+/).length <= 4) || '';
  const parts = first.split(/\s+/);
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' '), email, phone, linkedin: link };
}

function openUpload() {
  if (!currentUser) return;
  document.getElementById('upload-err').textContent = '';
  if (uploadResult) renderUploadResult(); else showUploadStage('pick');
  openModal('upload-modal');
}
function showUploadStage(stage, text) {
  ['pick', 'busy', 'result'].forEach(s => document.getElementById('up-' + s).style.display = s === stage ? '' : 'none');
  if (stage === 'busy') document.getElementById('up-busy-text').textContent = text || 'Working…';
}
function onUploadDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) handleResumeFile(f);
}
const UPLOAD_TASK =
  'Do two things.\n1) Extract it into structured data exactly as written (fix only spacing and obvious typos). Do not invent anything; use "" for missing fields.\n' +
  '2) Review it as an expert recruiter and suggest specific changes that would make it stronger.\n\n' +
  'Return JSON only in this shape:\n' +
  '{"parsed":{"first_name":"","last_name":"","role":"","email":"","phone":"","location":"","linkedin":"","summary":"",' +
  '"experience":[{"title":"","company":"","from":"","to":"","location":"","bullets":[""]}],' +
  '"education":[{"degree":"","school":"","from":"","to":"","grade":""}],"skills":[""],' +
  '"projects":[{"name":"","role":"","date":"","link":"","description":""}]},' +
  '"review":{"score":0,"verdict":"","suggestions":[{"section":"Summary|Experience|Skills|Education|Projects|Contact|Formatting","issue":"","change":"","example":""}]}}\n' +
  'Give 5–8 suggestions, most impactful first. "example" is a concrete rewritten line where helpful, otherwise "". "role" is the job title they are targeting or currently hold.';

async function handleResumeFile(file) {
  const err = document.getElementById('upload-err');
  err.textContent = '';
  if (!file) return;
  const status = t => showUploadStage('busy', t);
  try {
    status('Reading ' + file.name + '…');
    const src = await readResumeFile(file);
    let text = cleanText(src.text);
    let attachment = null;
    let method = 'text';

    if (!hasEnoughText(text)) {
      if (!src.bytes) throw new Error('No readable text found in this file.');
      if (aiReady()) {
        // Image-based PDF or photo: let the AI read the page itself.
        attachment = { mime: src.mime, data: bytesToBase64(src.bytes), name: file.name };
        method = 'ai-vision';
      } else {
        status('This file is a scan or image — reading it with text recognition…');
        text = cleanText(await ocrResume(src, status));
        method = 'ocr';
        if (!hasEnoughText(text)) throw new Error('Couldn’t read any text from this file, even with text recognition. Try a clearer scan, or a Word (.docx) version.');
      }
    }

    uploadResult = { fileName: file.name, text, parsed: null, review: null, basic: basicParse(text), method };

    if (aiReady()) {
      status(attachment ? 'AI is reading and reviewing your resume…' : 'AI is reviewing your resume…');
      const textIntro = t => 'Here is the text of the user’s existing resume (extracted from ' + file.name + '):\n"""\n' + t.slice(0, 15000) + '\n"""\n\n';
      let out;
      try {
        out = attachment
          ? await callAI(WRITER_SYSTEM + ' Return JSON only.', 'The user’s existing resume is attached (' + file.name + '). Read every part of it carefully, including text inside images, columns and graphics.\n\n' + UPLOAD_TASK, { maxTokens: 4000, attachment })
          : await callAI(WRITER_SYSTEM + ' Return JSON only.', textIntro(text) + UPLOAD_TASK, { maxTokens: 4000 });
      } catch (e) {
        if (!attachment) throw e;
        // The provider/model couldn't take the file — fall back to OCR text.
        status('Reading the file with text recognition instead…');
        text = cleanText(await ocrResume(src, status));
        if (!hasEnoughText(text)) throw new Error(e.message + ' — and text recognition found no readable text.');
        uploadResult.text = text; uploadResult.basic = basicParse(text); uploadResult.method = 'ocr';
        status('AI is reviewing your resume…');
        out = await callAI(WRITER_SYSTEM + ' Return JSON only.', textIntro(text) + UPLOAD_TASK, { maxTokens: 4000 });
      }
      const data = parseAIJSON(out);
      uploadResult.parsed = data.parsed || null;
      const r = data.review || {};
      uploadResult.review = {
        score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
        verdict: String(r.verdict || ''),
        suggestions: (r.suggestions || []).filter(x => x && (x.issue || x.change)).slice(0, 10).map(x => ({
          section: String(x.section || 'General').split('|')[0], issue: String(x.issue || ''), change: String(x.change || ''), example: String(x.example || ''),
        })),
      };
      aiCache.upload = { fileName: file.name, at: Date.now(), ...uploadResult.review };
      scheduleSave();
    }
    renderUploadResult();
  } catch (e) {
    showUploadStage('pick');
    err.textContent = e.message || String(e);
  }
}

function renderUploadResult() {
  const r = uploadResult;
  if (!r) return showUploadStage('pick');
  const p = r.parsed;
  const box = document.getElementById('up-result');
  const count = (a) => (a || []).filter(x => x && Object.values(x).some(v => String(v || '').trim())).length;
  box.innerHTML = `
    <div class="up-file">📄 ${esc(r.fileName)}${r.method === 'ai-vision' ? ' · read by AI from the page image' : r.method === 'ocr' ? ' · read with text recognition (check names and numbers)' : ''}</div>
    ${r.review ? `
      <div class="review-head">
        <div class="score-ring" style="--p:${r.review.score}"><span>${r.review.score}</span></div>
        <p><b>Overall:</b> ${esc(r.review.verdict)}</p>
      </div>
      <div class="mini-label">Suggested changes</div>
      <div class="sugg-list">${r.review.suggestions.map(s => `
        <div class="sugg">
          <span class="sugg-tag">${esc(s.section)}</span>
          ${s.issue ? `<div class="sugg-issue">${esc(s.issue)}</div>` : ''}
          ${s.change ? `<div class="sugg-change">→ ${esc(s.change)}</div>` : ''}
          ${s.example ? `<div class="sugg-example">${esc(s.example)}</div>` : ''}
        </div>`).join('')}
      </div>` : `
      <div class="ai-status"><span class="ai-dot"></span><span>Turn on the AI assistant to get suggested changes and a full import. ${currentUser && currentUser.admin ? 'Add a key in Admin → AI settings.' : 'Ask an admin to add an API key.'}</span></div>
      <div class="mini-label" style="margin-top:1rem">Contact details found</div>
      <div class="found">${['first_name', 'last_name', 'email', 'phone', 'linkedin'].filter(k => r.basic[k]).map(k => `<span><b>${k.replace('_', ' ')}:</b> ${esc(r.basic[k])}</span>`).join('') || 'None detected.'}</div>`}
    ${p ? `<div class="mini-label" style="margin-top:1rem">What we found</div>
      <div class="found">
        <span><b>${esc([p.first_name, p.last_name].filter(Boolean).join(' ') || 'No name')}</b>${p.role ? ' · ' + esc(p.role) : ''}</span>
        <span>${count(p.experience)} jobs · ${count(p.education)} education · ${(p.skills || []).length} skills · ${count(p.projects)} projects</span>
      </div>` : ''}
    <div class="btn-row">
      ${p ? `<button class="btn-primary" onclick="importUploaded()">Import into ${activeProfile && currentUser && activeProfile.key !== currentUser.key ? esc(activeProfile.username) + '’s' : 'my'} resume</button>`
          : `<button class="btn-primary" onclick="importBasic()">Import contact details</button>`}
      <button class="btn-secondary" onclick="uploadResult=null; showUploadStage('pick')">Upload a different file</button>
    </div>
    <p class="note">${p ? 'Importing replaces what’s in the form now — you can undo right after.' : ''} Your file is read in your browser${r.review ? ' and its text is sent to your AI provider for the review' : ' and is not uploaded anywhere'}.</p>`;
  showUploadStage('result');
}

function parsedToState(pd) {
  const s = v => String(v ?? '').trim();
  return {
    template: currentTemplate, color: colorTheme,
    fields: {
      'f-fname': s(pd.first_name), 'f-lname': s(pd.last_name), 'f-role': s(pd.role), 'f-email': s(pd.email),
      'f-phone': s(pd.phone), 'f-location': s(pd.location), 'f-linkedin': s(pd.linkedin), 'f-summary': s(pd.summary),
    },
    skills: [...new Set((pd.skills || []).map(s).filter(Boolean))],
    experience: (pd.experience || []).map(e => ({
      title: s(e.title), company: s(e.company), from: s(e.from), to: s(e.to), loc: s(e.location),
      desc: (e.bullets || []).map(s).filter(Boolean).map(b => '• ' + b.replace(/^[•\-\*]\s*/, '')).join('\n'),
    })).filter(e => e.title || e.company),
    education: (pd.education || []).map(e => ({ degree: s(e.degree), school: s(e.school), from: s(e.from), to: s(e.to), gpa: s(e.grade) })).filter(e => e.degree || e.school),
    projects: (pd.projects || []).map(p => ({ name: s(p.name), role: s(p.role), date: s(p.date), link: s(p.link), desc: s(p.description) })).filter(p => p.name),
    ai: { ...aiCache },
    savedAt: Date.now(),
  };
}

function importUploaded() {
  if (!uploadResult || !uploadResult.parsed) return;
  const prev = collectProfileState();
  applyProfileState(parsedToState(uploadResult.parsed));
  flushSave();
  closeModal('upload-modal');
  goToStep(2);
  toast('Resume imported. Review each section, then apply the suggestions.', 'ok', {
    label: 'Undo', fn: () => { applyProfileState(prev); flushSave(); goToStep(2); },
  });
}
function importBasic() {
  if (!uploadResult) return;
  const b = uploadResult.basic;
  const map = { 'f-fname': b.first_name, 'f-lname': b.last_name, 'f-email': b.email, 'f-phone': b.phone, 'f-linkedin': b.linkedin };
  Object.entries(map).forEach(([id, v]) => { if (v) document.getElementById(id).value = v; });
  liveUpdate();
  closeModal('upload-modal');
  goToStep(2);
  toast('Contact details imported.');
}

// ---- Tailor to a job post ----
function readJD() { return (document.getElementById('jd-text')?.value || '').trim(); }
function onJDInput() {
  aiCache.tailor = { ...(aiCache.tailor || {}), jd: readJD().slice(0, 8000) };
  scheduleSave();
}
async function aiTailor(btn) {
  const jd = readJD();
  if (jd.length < 80) { toast('Paste the full job description first (at least a few lines).', 'err'); return; }
  await withBusy(btn, 'Comparing…', async () => {
    const out = await callAI(WRITER_SYSTEM + ' Return JSON only.',
      'Resume data:\n' + profileForAI() + '\n\nJob description:\n"""\n' + jd.slice(0, 8000) + '\n"""\n\n' +
      'Compare the resume to this job like an ATS plus a recruiter would. Return JSON only: ' +
      '{"match":0,"verdict":"one sentence","matched_keywords":[""],"missing_keywords":[""],"changes":["specific edit to make to the resume for this job"],"tailored_summary":"a 3-4 sentence summary rewritten for this job using only true facts from the resume"}. ' +
      'Up to 12 keywords each, 4–6 changes.', { maxTokens: 1500 });
    const r = parseAIJSON(out);
    aiCache.tailor = { ...(aiCache.tailor || {}), jd: jd.slice(0, 8000), result: {
      match: Math.max(0, Math.min(100, Math.round(Number(r.match) || 0))), verdict: String(r.verdict || ''),
      matched: (r.matched_keywords || []).map(String).slice(0, 14), missing: (r.missing_keywords || []).map(String).slice(0, 14),
      changes: (r.changes || []).map(String).slice(0, 8), summary: String(r.tailored_summary || ''),
    } };
    renderTailor(); scheduleSave();
  });
}
async function aiCoverLetter(btn) {
  const jd = readJD();
  if (jd.length < 80) { toast('Paste the full job description first.', 'err'); return; }
  await withBusy(btn, 'Writing…', async () => {
    const out = await callAI(WRITER_SYSTEM,
      'Resume data:\n' + profileForAI() + '\n\nJob description:\n"""\n' + jd.slice(0, 8000) + '\n"""\n\n' +
      'Write a concise, warm, specific cover letter (220–300 words) for this job from this person. Use only facts from the resume; use [placeholders] for the company contact name if unknown. ' +
      'Plain text with paragraphs, starting with "Dear". Sign off with the person’s name.', { maxTokens: 1000 });
    aiCache.tailor = { ...(aiCache.tailor || {}), jd: jd.slice(0, 8000), letter: out.trim() };
    renderTailor(); scheduleSave();
  });
}
function renderTailor() {
  const box = document.getElementById('tailor-output');
  if (!box) return;
  const t = aiCache.tailor || {};
  const jdEl = document.getElementById('jd-text');
  if (jdEl && document.activeElement !== jdEl) jdEl.value = t.jd || '';
  const r = t.result;
  box.innerHTML = `
    ${r ? `<div class="tailor-res">
      <div class="review-head"><div class="score-ring" style="--p:${r.match}"><span>${r.match}%</span></div><p>${esc(r.verdict)}</p></div>
      ${r.matched.length ? `<div class="mini-label">Keywords you have</div><div class="job-skills">${r.matched.map(k => `<span class="job-skill have">${esc(k)}</span>`).join('')}</div>` : ''}
      ${r.missing.length ? `<div class="mini-label" style="margin-top:.6rem">Missing keywords</div><div class="job-skills">${r.missing.map(k => `<span class="job-skill">${esc(k)}</span>`).join('')}</div>` : ''}
      ${r.changes.length ? `<div class="mini-label" style="margin-top:.6rem">Change for this job</div><ul class="review-list fix">${r.changes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      ${r.summary ? `<div class="mini-label">Tailored summary</div><div class="letter">${esc(r.summary)}</div>
        <div class="btn-row" style="margin-top:.5rem"><button class="mini-btn" onclick="useTailoredSummary()">Use this summary</button></div>` : ''}
    </div>` : ''}
    ${t.letter ? `<div class="mini-label" style="margin-top:1rem">Cover letter</div><div class="letter" id="cover-letter">${esc(t.letter)}</div>
      <div class="btn-row" style="margin-top:.5rem"><button class="mini-btn" onclick="copyText(document.getElementById('cover-letter').innerText, this)">Copy</button></div>` : ''}`;
}
function useTailoredSummary() {
  const r = aiCache.tailor && aiCache.tailor.result;
  if (!r || !r.summary) return;
  const el = document.getElementById('f-summary');
  const before = el.value;
  el.value = r.summary; liveUpdate();
  toast('Summary replaced with the tailored version.', 'ok', { label: 'Undo', fn: () => { el.value = before; liveUpdate(); } });
}
function copyText(text, btn) {
  const done = () => { if (btn) { const o = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => btn.textContent = o, 1500); } };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed — select the text and copy it manually.', 'err'); }
  ta.remove();
}
