/*
 * RésuméCraft — PART 3: Login, Profiles & Admin Panel
 * Team member: ____________________
 *
 * Sign-in with hashed passwords, built-in admins, separate saved data per profile, the admin panel (all resumes, profiles, edit-as-user), password change, and backup/restore.
 */

// =====================================================================
// ======== ACCOUNTS, ADMIN & PER-PROFILE DATA ========
// =====================================================================
// Users and each profile's resume data are saved in this browser's
// localStorage. Passwords are stored as salted SHA-256 hashes, never as
// plain text.

const USERS_KEY   = 'rc_users_v1';
const SESSION_KEY = 'rc_session_v1';
const DATA_PREFIX = 'rc_profile_v1_';

// Built-in admin accounts (passwords: Abhinav → Motla@123, Abhishek → Kumar@123)
const SEED_ADMINS = [
  { username: 'Abhinav',  salt: 'rc7f3a91', hash: '276a66e70b1dda1b863cbfcc704e3e0460381125b3ab30911f95db8726625eab' },
  { username: 'Abhishek', salt: 'rc2c8e54', hash: 'e779aff752b05aa150acfe88d549d68b14fe1a156b05ab919a29b01a18920430' },
];

let currentUser = null;   // { username, key, admin }
let activeProfile = null; // whose resume is open: { key, username } (admins can open others)
let isLoadingProfile = false;
let saveTimer = null;
const memStore = {};      // fallback if storage is blocked

const store = {
  get(k)    { try { const v = localStorage.getItem(k); return v === null ? (memStore[k] ?? null) : v; } catch (e) { return memStore[k] ?? null; } },
  set(k, v) { memStore[k] = v; try { localStorage.setItem(k, v); } catch (e) {} },
  del(k)    { delete memStore[k]; try { localStorage.removeItem(k); } catch (e) {} },
};
const session = {
  get()  { try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; } },
  set(v) { try { sessionStorage.setItem(SESSION_KEY, v); } catch (e) {} },
  del()  { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} },
};

// ---- SHA-256 (pure JS, works from file:// too) ----
function sha256(str){str=unescape(encodeURIComponent(str));function rr(v,a){return(v>>>a)|(v<<(32-a));}var mp=Math.pow,mw=mp(2,32),i,j,result='',words=[],bl=str.length*8,hash=[],k=[],pc=0,isC={};for(var c=2;pc<64;c++){if(!isC[c]){for(i=0;i<313;i+=c)isC[i]=c;hash[pc]=(mp(c,.5)*mw)|0;k[pc++]=(mp(c,1/3)*mw)|0;}}str+='\x80';while(str.length%64-56)str+='\x00';for(i=0;i<str.length;i++){j=str.charCodeAt(i);words[i>>2]|=j<<((3-i)%4)*8;}words[words.length]=((bl/mw)|0);words[words.length]=bl;for(j=0;j<words.length;){var w=words.slice(j,j+=16),old=hash;hash=hash.slice(0,8);for(i=0;i<64;i++){var w15=w[i-15],w2=w[i-2],a=hash[0],e=hash[4];var t1=hash[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&hash[5])^((~e)&hash[6]))+k[i]+(w[i]=(i<16)?w[i]:(w[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+w[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);var t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));hash=[(t1+t2)|0].concat(hash);hash[4]=(hash[4]+t1)|0;}for(i=0;i<8;i++)hash[i]=(hash[i]+old[i])|0;}for(i=0;i<8;i++)for(j=3;j+1;j--){var b=(hash[i]>>(j*8))&255;result+=((b<16)?0:'')+b.toString(16);}return result;}
function hashPw(salt, pw) { return sha256(salt + ':' + pw); }
function newSalt() {
  let s = 'rc';
  try { const a = new Uint32Array(2); crypto.getRandomValues(a); s += a[0].toString(16) + a[1].toString(16); }
  catch (e) { s += Math.random().toString(16).slice(2) + Date.now().toString(16); }
  return s;
}

function esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ---- User store ----
function getUsers() {
  try { return JSON.parse(store.get(USERS_KEY)) || []; } catch (e) { return []; }
}
function saveUsers(list) { store.set(USERS_KEY, JSON.stringify(list)); }
function findUser(name) {
  const key = String(name || '').trim().toLowerCase();
  return getUsers().find(u => u.key === key) || null;
}
function ensureSeedAdmins() {
  const users = getUsers();
  let changed = false;
  SEED_ADMINS.forEach(s => {
    const key = s.username.toLowerCase();
    if (!users.some(u => u.key === key)) {
      users.push({ username: s.username, key, salt: s.salt, hash: s.hash, admin: true, builtIn: true, createdBy: 'system', createdAt: Date.now() });
      changed = true;
    }
  });
  if (changed) saveUsers(users);
}

// ---- Login / logout ----
function doLogin() {
  const uEl = document.getElementById('login-user');
  const pEl = document.getElementById('login-pass');
  const msg = document.getElementById('login-msg');
  const user = findUser(uEl.value);
  if (!uEl.value.trim() || !pEl.value) { showLoginError('Enter your username and password.'); return; }
  if (!user || hashPw(user.salt, pEl.value) !== user.hash) { showLoginError('Incorrect username or password.'); pEl.value = ''; pEl.focus(); return; }
  msg.textContent = '';
  pEl.value = '';
  startSession(user);
}
function showLoginError(t) {
  const msg = document.getElementById('login-msg');
  const card = document.getElementById('login-card');
  msg.className = 'form-msg err';
  msg.textContent = t;
  card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
}
function startSession(user) {
  currentUser = { username: user.username, key: user.key, admin: !!user.admin };
  session.set(user.key);
  document.body.classList.remove('auth-locked');
  document.getElementById('user-avatar').textContent = user.username.charAt(0).toUpperCase();
  document.getElementById('user-name').textContent = user.username;
  const role = document.getElementById('user-role');
  role.textContent = user.admin ? 'Admin' : 'User';
  role.className = 'role-badge' + (user.admin ? '' : ' user');
  document.getElementById('admin-btn').style.display = user.admin ? '' : 'none';
  updateAIStatus();
  activeProfile = { key: user.key, username: user.username };
  loadProfile(user.key);
  updateEditBanner();
  window.scrollTo(0, 0);
}
function logout() {
  flushSave();
  closeAdmin();
  currentUser = null;
  activeProfile = null;
  uploadResult = null;
  updateEditBanner();
  ['view-modal', 'upload-modal', 'account-modal'].forEach(closeModal);
  session.del();
  applyProfileState(null);
  document.body.classList.add('auth-locked');
  const msg = document.getElementById('login-msg');
  msg.className = 'form-msg'; msg.textContent = '';
  setTimeout(() => document.getElementById('login-user').focus(), 50);
}
function togglePw(id, btn) {
  const el = document.getElementById(id);
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  btn.textContent = show ? 'HIDE' : 'SHOW';
}

// ---- Per-profile resume data ----
const FIELD_IDS = ['f-fname','f-lname','f-role','f-email','f-phone','f-location','f-linkedin','f-summary'];

function collectProfileState() {
  const fields = {};
  FIELD_IDS.forEach(id => fields[id] = document.getElementById(id).value);
  const strip = arr => arr.map(({ id, ...rest }) => rest);
  return {
    template: currentTemplate,
    color: colorTheme,
    fields,
    skills: [...skills],
    experience: strip(expEntries),
    education: strip(eduEntries),
    projects: strip(projEntries),
    ai: aiCache,
    savedAt: Date.now(),
  };
}

function applyProfileState(s) {
  isLoadingProfile = true;
  FIELD_IDS.forEach(id => document.getElementById(id).value = (s && s.fields && s.fields[id]) || '');
  skills = s && Array.isArray(s.skills) ? [...s.skills] : [];
  expEntries = []; eduEntries = []; projEntries = [];
  expCount = 0; eduCount = 0; projCount = 0;
  if (s) {
    (s.experience || []).forEach(e => expEntries.push({ ...e, id: expCount++ }));
    (s.education  || []).forEach(e => eduEntries.push({ ...e, id: eduCount++ }));
    (s.projects   || []).forEach(e => projEntries.push({ ...e, id: projCount++ }));
    currentTemplate = TEMPLATE_IDS.includes(s.template) ? s.template : 'classic';
    colorTheme = colorMap[s.color] ? s.color : 'blue';
  } else {
    currentTemplate = 'classic';
    colorTheme = 'blue';
    addExperience();
    addEducation();
  }
  aiCache = Object.assign({ jobs: null, review: null, upload: null, tailor: null, prefs: { location: '', level: 'auto', mode: 'any' } }, (s && s.ai) || {});
  renderExpEntries(); renderEduEntries(); renderProjEntries(); renderSkills();
  renderSkillSuggestions([]); renderReview(); fillJobPrefs(); renderJobs(); renderTailor();
  syncTemplateUI(); syncColorUI();
  showFormSection('basics', document.querySelector('.section-tab'));
  goToStep(1);
  isLoadingProfile = false;
}

function loadProfile(key) {
  let s = null;
  try { s = JSON.parse(store.get(DATA_PREFIX + key)); } catch (e) { s = null; }
  applyProfileState(s);
}

function scheduleSave() {
  if (isLoadingProfile || !currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 400);
}
function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (isLoadingProfile || !currentUser) return;
  if (!activeProfile) return;
  store.set(DATA_PREFIX + activeProfile.key, JSON.stringify(collectProfileState()));
  const st = document.getElementById('save-status');
  st.classList.add('show');
  clearTimeout(st._t);
  st._t = setTimeout(() => st.classList.remove('show'), 1400);
}
window.addEventListener('beforeunload', () => { if (saveTimer) flushSave(); });

function syncTemplateUI() {
  const names = { classic: 'Classic', modern: 'Modern Sidebar', creative: 'Creative Split', minimal: 'Minimal' };
  document.querySelectorAll('.template-card').forEach(c => c.classList.toggle('selected', c.dataset.tpl === currentTemplate));
  document.querySelectorAll('#tpl-switcher .font-opt').forEach(o => o.classList.toggle('active', o.dataset.tpl === currentTemplate));
}
function syncColorUI() {
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === colorTheme));
}

// ---- Admin: manage profiles ----
function requireAdmin() {
  const me = currentUser && findUser(currentUser.key);
  return !!(me && me.admin);
}
function openAdmin() {
  if (!requireAdmin()) return;
  document.getElementById('create-msg').textContent = '';
  showAdminTab('resumes');
  document.getElementById('admin-modal').classList.add('open');
  setTimeout(() => document.getElementById('new-user').focus(), 50);
}
function closeAdmin() { document.getElementById('admin-modal').classList.remove('open'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAdmin(); });

function setCreateMsg(text, ok) {
  const m = document.getElementById('create-msg');
  m.className = 'form-msg ' + (ok ? 'ok' : 'err');
  m.textContent = text;
}

function createUser() {
  if (!requireAdmin()) return;
  const uEl = document.getElementById('new-user');
  const pEl = document.getElementById('new-pass');
  const aEl = document.getElementById('new-admin');
  const username = uEl.value.trim();
  const pw = pEl.value;
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) { setCreateMsg('Username must be 3–30 characters: letters, numbers, . _ or -'); return; }
  if (pw.length < 6) { setCreateMsg('Password must be at least 6 characters.'); return; }
  if (findUser(username)) { setCreateMsg('A profile named “' + username + '” already exists.'); return; }
  const salt = newSalt();
  const users = getUsers();
  users.push({ username, key: username.toLowerCase(), salt, hash: hashPw(salt, pw), admin: aEl.checked, createdBy: currentUser.username, createdAt: Date.now() });
  saveUsers(users);
  uEl.value = ''; pEl.value = ''; aEl.checked = false;
  setCreateMsg('Profile “' + username + '” created' + (users[users.length-1].admin ? ' as an admin.' : '.'), true);
  renderUserList();
}

function adminCount(users) { return users.filter(u => u.admin).length; }

function renderUserList() {
  const users = getUsers().slice().sort((a, b) => (b.admin - a.admin) || a.username.localeCompare(b.username));
  const admins = adminCount(users);
  document.getElementById('user-count').textContent = `All profiles · ${users.length}`;
  document.getElementById('user-list').innerHTML = users.map(u => {
    const isMe = currentUser && u.key === currentUser.key;
    const lastAdmin = u.admin && admins <= 1;
    let saved = null;
    try { saved = JSON.parse(store.get(DATA_PREFIX + u.key)); } catch (e) {}
    const savedTxt = saved && saved.savedAt ? 'Resume last edited ' + new Date(saved.savedAt).toLocaleDateString() : 'No resume yet';
    const created = u.createdBy === 'system' ? 'Built-in admin' : 'Created by ' + esc(u.createdBy || '—');
    return `
      <div class="user-row" data-key="${esc(u.key)}">
        <span class="avatar ${u.admin ? '' : 'plain'}">${esc(u.username.charAt(0).toUpperCase())}</span>
        <div>
          <div class="u-name">${esc(u.username)} <span class="role-badge ${u.admin ? '' : 'user'}">${u.admin ? 'Admin' : 'User'}</span>${isMe ? '<span class="you-tag">(you)</span>' : ''}</div>
          <div class="u-meta">${created} · ${savedTxt}</div>
        </div>
        <div class="u-actions">
          <button class="mini-btn" onclick="viewProfile('${esc(u.key)}')">View resume</button>
          <button class="mini-btn" onclick="showReset('${esc(u.key)}')">Reset password</button>
          <button class="mini-btn" onclick="toggleAdmin('${esc(u.key)}')" ${(isMe || lastAdmin) && u.admin ? 'disabled title="Can’t remove your own admin access or the last admin"' : ''}>${u.admin ? 'Remove admin' : 'Make admin'}</button>
          <button class="mini-btn danger" onclick="deleteUser('${esc(u.key)}', this)" ${isMe || lastAdmin ? 'disabled title="You can’t delete yourself or the last admin"' : ''}>Delete</button>
        </div>
      </div>`;
  }).join('');
}

function showReset(key) {
  const row = document.querySelector(`.user-row[data-key="${CSS.escape(key)}"]`);
  if (!row || row.querySelector('.reset-row')) return;
  const div = document.createElement('div');
  div.className = 'reset-row';
  div.innerHTML = `<input type="password" placeholder="New password (min. 6 characters)" autocomplete="new-password">
    <button class="mini-btn" type="button">Save</button><button class="mini-btn" type="button">Cancel</button>`;
  const [inp, save, cancel] = [div.querySelector('input'), ...div.querySelectorAll('button')];
  save.onclick = () => {
    if (inp.value.length < 6) { inp.style.borderColor = 'var(--danger)'; inp.focus(); return; }
    const users = getUsers();
    const u = users.find(x => x.key === key);
    if (!u || !requireAdmin()) return;
    u.salt = newSalt();
    u.hash = hashPw(u.salt, inp.value);
    saveUsers(users);
    setCreateMsg('Password updated for “' + u.username + '”.', true);
    renderUserList();
  };
  cancel.onclick = () => div.remove();
  inp.onkeydown = e => { if (e.key === 'Enter') save.click(); };
  row.appendChild(div);
  inp.focus();
}

function toggleAdmin(key) {
  if (!requireAdmin()) return;
  const users = getUsers();
  const u = users.find(x => x.key === key);
  if (!u) return;
  if (u.admin && (key === currentUser.key || adminCount(users) <= 1)) return;
  u.admin = !u.admin;
  saveUsers(users);
  renderUserList();
}

function deleteUser(key, btn) {
  if (!requireAdmin() || key === currentUser.key) return;
  if (!btn.classList.contains('confirm')) {
    btn.classList.add('confirm');
    btn.textContent = 'Click again to delete';
    setTimeout(() => { if (btn.isConnected) { btn.classList.remove('confirm'); btn.textContent = 'Delete'; } }, 3500);
    return;
  }
  let users = getUsers();
  const u = users.find(x => x.key === key);
  if (!u || (u.admin && adminCount(users) <= 1)) return;
  if (activeProfile && activeProfile.key === key) backToMine();
  users = users.filter(x => x.key !== key);
  saveUsers(users);
  store.del(DATA_PREFIX + key);
  setCreateMsg('Deleted “' + u.username + '” and their resume data.', true);
  renderUserList();
}


function loadState(key) {
  try { return JSON.parse(store.get(DATA_PREFIX + key)); } catch (e) { return null; }
}
function stateToData(s) {
  const f = (s && s.fields) || {};
  return {
    name: ((f['f-fname'] || '') + ' ' + (f['f-lname'] || '')).trim(),
    role: f['f-role'] || '', email: f['f-email'] || '', phone: f['f-phone'] || '',
    location: f['f-location'] || '', linkedin: f['f-linkedin'] || '', summary: f['f-summary'] || '',
    experience: (s && s.experience) || [], education: (s && s.education) || [],
    skills: (s && s.skills) || [], projects: (s && s.projects) || [],
  };
}
function hasContent(d) {
  return !!(d.name || d.role || d.summary || d.skills.length || d.experience.some(e => e.title || e.company) || d.projects.some(p => p.name));
}

// ---- Admin: edit someone else's resume ----
function updateEditBanner() {
  const b = document.getElementById('edit-banner');
  const other = currentUser && activeProfile && activeProfile.key !== currentUser.key;
  b.classList.toggle('show', !!other);
  if (other) document.getElementById('edit-banner-name').textContent = activeProfile.username;
}
function adminEditProfile(key) {
  if (!requireAdmin()) return;
  const u = findUser(key);
  if (!u) return;
  flushSave();
  activeProfile = { key: u.key, username: u.username };
  loadProfile(u.key);
  updateEditBanner();
  closeAdmin(); closeModal('view-modal');
  goToStep(2);
  toast('Now editing ' + u.username + '’s resume.');
}
function backToMine() {
  if (!currentUser) return;
  flushSave();
  activeProfile = { key: currentUser.key, username: currentUser.username };
  loadProfile(currentUser.key);
  updateEditBanner();
}

// ---- Admin: resume gallery ----
function renderResumeGallery() {
  const q = (document.getElementById('res-search')?.value || '').trim().toLowerCase();
  const rows = getUsers().map(u => {
    const s = loadState(u.key);
    const d = stateToData(s);
    return { u, s, d, at: (s && s.savedAt) || 0 };
  }).filter(({ u, d }) => !q || [u.username, d.name, d.role, d.location, ...d.skills].join(' ').toLowerCase().includes(q))
    .sort((a, b) => b.at - a.at);
  const withRes = rows.filter(r => hasContent(r.d)).length;
  document.getElementById('res-count').textContent = `${withRes} resume${withRes === 1 ? '' : 's'} · ${rows.length} profile${rows.length === 1 ? '' : 's'}${q ? ' matching' : ''}`;
  document.getElementById('res-grid').innerHTML = rows.length ? rows.map(({ u, s, d, at }) => {
    const has = hasContent(d);
    const st = resumeStrength(d).score;
    return `<div class="res-card">
      <div class="res-thumb" ${has ? `onclick="viewProfile('${esc(u.key)}')"` : ''}>
        ${has ? `<div class="res-thumb-inner">${buildResumeHTML(d, (s && s.template) || 'classic', (s && s.color) || 'blue')}</div>`
              : `<div class="res-empty">No resume yet</div>`}
      </div>
      <div class="res-info">
        <div class="res-name">${esc(d.name || u.username)}</div>
        <div class="res-meta">@${esc(u.username)}${d.role ? ' · ' + esc(d.role) : ''}</div>
        <div class="res-meta">${at ? 'Edited ' + new Date(at).toLocaleDateString() + ' · ' : ''}Strength ${st}%</div>
        <div class="res-actions">
          ${has ? `<button class="mini-btn" onclick="viewProfile('${esc(u.key)}')">View</button>` : ''}
          <button class="mini-btn" onclick="adminEditProfile('${esc(u.key)}')">${has ? 'Edit' : 'Start resume'}</button>
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="ai-hint" style="padding:1rem">No profiles match your search.</div>';
}

let viewingKey = null;
function viewProfile(key) {
  if (!requireAdmin()) return;
  const u = findUser(key);
  if (!u) return;
  const s = (activeProfile && activeProfile.key === key) ? collectProfileState() : loadState(key);
  const d = stateToData(s);
  viewingKey = key;
  document.getElementById('view-title').textContent = (d.name || u.username) + '’s resume';
  document.getElementById('view-sub').textContent = '@' + u.username + (s && s.savedAt ? ' · last edited ' + new Date(s.savedAt).toLocaleString() : '');
  document.getElementById('view-output').innerHTML = buildResumeHTML(d, (s && s.template) || 'classic', (s && s.color) || 'blue');
  openModal('view-modal');
}
function downloadViewed(btn) {
  const u = findUser(viewingKey);
  const d = stateToData(loadState(viewingKey));
  exportPDF(document.getElementById('view-output'), d.name || (u && u.username), btn);
}

// ---- Generic modals ----
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['view-modal', 'upload-modal', 'account-modal'].forEach(closeModal);
});

// ---- Account: change own password ----
function openAccount() {
  if (!currentUser) return;
  ['acc-current', 'acc-new', 'acc-confirm'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('acc-msg').textContent = '';
  document.getElementById('acc-user').textContent = currentUser.username + (currentUser.admin ? ' · Admin' : ' · User');
  openModal('account-modal');
  setTimeout(() => document.getElementById('acc-current').focus(), 50);
}
function changeOwnPassword() {
  const msg = document.getElementById('acc-msg');
  const cur = document.getElementById('acc-current').value;
  const nw = document.getElementById('acc-new').value;
  const cf = document.getElementById('acc-confirm').value;
  const users = getUsers();
  const me = users.find(u => u.key === currentUser.key);
  const fail = t => { msg.className = 'form-msg err'; msg.textContent = t; };
  if (!me || hashPw(me.salt, cur) !== me.hash) return fail('Your current password is incorrect.');
  if (nw.length < 6) return fail('New password must be at least 6 characters.');
  if (nw !== cf) return fail('The new passwords don’t match.');
  me.salt = newSalt(); me.hash = hashPw(me.salt, nw);
  saveUsers(users);
  msg.className = 'form-msg ok'; msg.textContent = 'Password changed.';
  ['acc-current', 'acc-new', 'acc-confirm'].forEach(id => document.getElementById(id).value = '');
}

// ---- Backup & restore (admin) ----
function downloadBackup() {
  if (!requireAdmin()) return;
  flushSave();
  const users = getUsers();
  const profiles = {};
  users.forEach(u => { const s = loadState(u.key); if (s) profiles[u.key] = s; });
  const data = { app: 'ResumeCraft', version: 1, exportedAt: new Date().toISOString(), exportedBy: currentUser.username, users, profiles };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'resumecraft-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  setBackupMsg(`Backup downloaded: ${users.length} profiles, ${Object.keys(profiles).length} resumes.`, true);
}
function setBackupMsg(t, ok) {
  const m = document.getElementById('backup-msg');
  m.className = 'form-msg ' + (ok ? 'ok' : 'err'); m.style.textAlign = 'left'; m.textContent = t;
}
async function restoreBackup(input) {
  if (!requireAdmin()) return;
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { return setBackupMsg('That file isn’t a valid backup (not JSON).'); }
  if (!data || data.app !== 'ResumeCraft' || !Array.isArray(data.users)) return setBackupMsg('That file isn’t a RésuméCraft backup.');
  const valid = data.users.filter(u => u && typeof u.username === 'string' && typeof u.key === 'string' && typeof u.salt === 'string' && /^[a-f0-9]{64}$/.test(u.hash || '') && /^[a-z0-9._-]{3,30}$/.test(u.key));
  flushSave();
  const users = getUsers();
  let added = 0, updated = 0, resumes = 0;
  valid.forEach(b => {
    const clean = { username: b.username, key: b.key, salt: b.salt, hash: b.hash, admin: !!b.admin, builtIn: !!b.builtIn, createdBy: String(b.createdBy || ''), createdAt: Number(b.createdAt) || Date.now() };
    const i = users.findIndex(u => u.key === b.key);
    if (i >= 0) { users[i] = clean; updated++; } else { users.push(clean); added++; }
    const s = data.profiles && data.profiles[b.key];
    if (s && typeof s === 'object') { store.set(DATA_PREFIX + b.key, JSON.stringify(s)); resumes++; }
  });
  // Never lock everyone out: keep at least one admin
  if (!users.some(u => u.admin)) { const me = users.find(u => u.key === currentUser.key); if (me) me.admin = true; }
  saveUsers(users);
  if (activeProfile) loadProfile(activeProfile.key);
  setBackupMsg(`Restored: ${added} new profiles, ${updated} updated, ${resumes} resumes.`, true);
}

function initAuth() {
  ensureSeedAdmins();
  const key = session.get();
  const user = key && findUser(key);
  if (user) startSession(user);
  else { document.body.classList.add('auth-locked'); document.getElementById('login-user').focus(); }
}
