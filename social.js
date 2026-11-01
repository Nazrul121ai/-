// কমিউনিটি, বেকার (চাকরিপ্রার্থী) আইডি, নোটিশ বোর্ড ও অ্যাডমিন প্যানেল।
// সবই Firebase (Firestore) এ চলে, তাই firebase-config.js ভরা না থাকলে এগুলো দেখা যায় না।
// নিয়ম (Rules) SETUP.md তে আছে। শুধু নিয়ম দিয়েই নিরাপত্তা চলে, অ্যাপের কোড বিশ্বাসযোগ্য নয়।
if (typeof CLOUD_ON === 'function' && CLOUD_ON()) {
  [['board', 'নোটিশ বোর্ড', '📢', '#b45309', 'নোটিশ, ভিডিও, অডিও, লেখা'],
   ['community', 'কমিউনিটি', '💬', '#0369a1', 'প্রশ্ন, আলোচনা, মন্তব্য'],
   ['seeker', 'চাকরিপ্রার্থী আইডি', '🪪', '#6d28d9', 'নিজের আইডি বানান']].forEach(a => {
    if (!CATS.some(c => c.id === a[0])) CATS.push({id: a[0], name: a[1], ic: a[2], color: a[3], sub: a[4]});
  });
}
const SOC_IDS = ['board', 'community', 'seeker', 'admin'];

// ---------- সাধারণ সহায়ক ----------
let _acache = {content: [], posts: [], reports: [], seekers: [], admins: []};
const sdate = ts => { try { const d = ts && ts.toDate ? ts.toDate() : new Date(ts); return isNaN(d) ? '' : d.toLocaleDateString('bn-BD'); } catch (e) { return ''; } };
const sbody = h => { const e = document.getElementById('sbody'); if (e) e.innerHTML = h; };
async function sme() {
  if (!CLOUD_ON() || !cloudInfo()) return null;
  const f = await fb(); const u = f.auth.currentUser; return u ? {f, u} : null;
}
function sNeedSetup() { return `<div class="warn">এই অংশ চালু করতে অ্যাপের নির্মাতাকে Firebase সেটআপ করতে হবে।</div>`; }
function sNeedLogin() { return `<div class="warn">এই অংশ ব্যবহারে আগে লগইন করতে হবে।</div><button class="btn" onclick="open_('account')">👤 লগইন / নতুন অ্যাকাউন্ট</button>`; }
function sShell(title, tabKey) { tab = tabKey || 'home'; render(pageHead(title) + '<div class="pad" id="sbody"><div class="empty">⏳ লোড হচ্ছে...</div></div>'); }
function sErr(e) { return `<div class="warn">⚠️ ${esc((e && e.code === 'permission-denied') ? 'অনুমতি নেই (লগইন বা Rules দেখুন)।' : 'লোড করা যায়নি। ইন্টারনেট সংযোগ দেখুন।')}</div>`; }
async function sList(f, path, ...cons) {
  const q = f.F.query(f.F.collection(f.db, ...path), ...cons);
  const s = await f.F.getDocs(q); const r = []; s.forEach(d => r.push(Object.assign({id: d.id}, d.data()))); return r;
}

// ---------- ইউজার প্রোফাইল (অ্যাডমিন যোগ করার সময় খোঁজার জন্য) ও লগআউটে ক্লিনআপ ----------
async function upsertProfile() {
  const m = await sme(); if (!m) return; const ci = cloudInfo() || {};
  await m.f.F.setDoc(m.f.F.doc(m.f.db, 'profiles', m.u.uid), {name: ci.name || '', idKey: loginEmail(ci.id || ''), at: Date.now()});
}
(function () {
  const L = cloudLogin, S = cloudSignup, O = cloudLogout;
  cloudLogin = async (...a) => { const r = await L(...a); upsertProfile().catch(() => {}); adminProbe(); return r; };
  cloudSignup = async (...a) => { const r = await S(...a); upsertProfile().catch(() => {}); return r; };
  cloudLogout = async (...a) => { const r = await O(...a); try { localStorage.removeItem('isAdmin'); } catch (e) {} return r; };
})();

// ---------- অ্যাডমিন চেনা ----------
async function adminRole() {
  const m = await sme(); if (!m) return null;
  const d = await m.f.F.getDoc(m.f.F.doc(m.f.db, 'admins', m.u.uid));
  return d.exists() ? ((d.data() || {}).role || 'admin') : null;
}
async function adminProbe() {
  try { const r = await adminRole(); try { r ? localStorage.setItem('isAdmin', r) : localStorage.removeItem('isAdmin'); } catch (e) {} } catch (e) {}
}
const isAdminFlag = () => { try { return !!localStorage.getItem('isAdmin'); } catch (e) { return false; } };
setTimeout(() => { if (CLOUD_ON() && cloudInfo()) { adminProbe(); refreshContent(); } }, 2500);

// ---------- নোটিশ বোর্ড (অ্যাডমিনের প্রকাশ করা কনটেন্ট, লগইন ছাড়াই দেখা যায়) ----------
let ADMIN_CONTENT = []; try { ADMIN_CONTENT = JSON.parse(localStorage.getItem('adminContent') || '[]'); } catch (e) {}
const TYPE_LBL = {notice: '📢 নোটিশ', article: '📝 লেখা', video: '🎬 ভিডিও', audio: '🎧 অডিও', image: '🖼️ ছবি', job: '💼 চাকরি'};
async function refreshContent() {
  if (!CLOUD_ON() || !navigator.onLine) return;
  try {
    const f = await fb();
    const rows = await sList(f, ['content'], f.F.orderBy('createdAt', 'desc'), f.F.limit(100));
    ADMIN_CONTENT = rows.filter(r => r.pub !== false).map(r => ({id: r.id, type: r.type, title: r.title, body: r.body, url: r.url, at: r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : (+r.createdAt || 0), job: r.job || null}));
    try { localStorage.setItem('adminContent', JSON.stringify(ADMIN_CONTENT)); } catch (e) {}
  } catch (e) {}
}
// চাকরির তালিকায় মেশানোর জন্য (app.js এর activeJobs ডাকে)
function adminJobs() {
  return (Array.isArray(ADMIN_CONTENT) ? ADMIN_CONTENT : []).filter(c => c.type === 'job' && c.job).map(c => Object.assign({kind: 'local', t: c.title, d: c.body || ''}, c.job));
}
function mediaHtml(c) {
  const u = safeUrl(c.url); if (!u) return '';
  const yt = u.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/);
  if (c.type === 'video' && yt) return `<iframe style="width:100%;aspect-ratio:16/9;border:0;border-radius:10px" src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen></iframe>`;
  if (c.type === 'video') return `<video controls playsinline preload="none" src="${esc(u)}" style="width:100%;border-radius:10px"></video>`;
  if (c.type === 'audio') return `<audio controls preload="none" src="${esc(u)}" style="width:100%"></audio>`;
  if (c.type === 'image') return `<img loading="lazy" src="${esc(u)}" style="max-width:100%;border-radius:10px">`;
  return '';
}
function boardPage(flt = '') {
  tab = 'home';
  const list = ADMIN_CONTENT.filter(c => c.type !== 'job' && (!flt || c.type === flt));
  const chips = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${['', 'notice', 'article', 'video', 'audio', 'image'].map(t => `<button class="btn sm" style="${flt === t ? '' : 'background:#64748b'}" onclick="boardPage('${t}')">${t ? TYPE_LBL[t] : 'সব'}</button>`).join('')}</div>`;
  render(pageHead('নোটিশ বোর্ড') + '<div class="pad">' + chips + (list.length ? list.map(c => `<div class="sec" onclick="boardItem('${esc(c.id)}')" style="cursor:pointer"><span class="badge" style="background:#b45309">${TYPE_LBL[c.type] || ''}</span> <b>${esc(c.title || '')}</b><div style="font-size:12px;color:#777">${sdate(c.at)}</div></div>`).join('') : '<div class="empty">এখনো কিছু নেই। ইন্টারনেট থাকলে নতুন কনটেন্ট নিজে থেকে আসবে।</div>') + '<button class="btn sm" style="background:#475569" onclick="refreshContent().then(()=>boardPage(\'' + flt + '\'))">🔄 নতুন আছে কি দেখুন</button></div>');
  if (CLOUD_ON() && !ADMIN_CONTENT.length) refreshContent().then(() => { if (ADMIN_CONTENT.length) boardPage(flt); });
}
function boardItem(id) {
  const c = ADMIN_CONTENT.find(x => x.id === id); if (!c) return;
  showModal(`<span class="badge" style="background:#b45309">${TYPE_LBL[c.type] || ''}</span><h3>${esc(c.title || '')}</h3>${mediaHtml(c)}<div style="white-space:pre-line;margin-top:8px">${esc(c.body || '')}</div>` +
    (safeUrl(c.url) && !mediaHtml(c) || (c.type === 'video' && safeUrl(c.url)) ? `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:10px" href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener">🔗 খুলুন</a>` : '') +
    `<button class="btn sm" style="margin-top:8px" onclick="speak(${JSON.stringify(String(c.body || c.title || '')).replace(/"/g, '&quot;')})">🔊 শুনুন</button>`);
}

// ---------- কমিউনিটি ----------
let _lastPost = 0;
async function communityPage() {
  sShell('কমিউনিটি');
  if (!CLOUD_ON()) return sbody(sNeedSetup());
  const m = await sme(); if (!m) return sbody(sNeedLogin());
  try {
    const rows = await sList(m.f, ['posts'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(40)); _acache.posts = rows;
    const adm = isAdminFlag();
    sbody(`<div class="sec"><b>✍️ নতুন পোস্ট</b>
      <textarea class="inp" id="ptext" rows="3" maxlength="500" placeholder="প্রশ্ন বা অভিজ্ঞতা লিখুন (সর্বোচ্চ ৫০০ অক্ষর)"></textarea>
      <button class="btn sm" onclick="postNew()">পোস্ট করুন</button>
      <div style="font-size:12px;color:#777;margin-top:6px">নিয়ম: গালি, বিজ্ঞাপন, প্রতারণা, ধর্ম বা রাজনীতি নিয়ে উস্কানি, অন্যের ব্যক্তিগত তথ্য দেওয়া নিষেধ। নিয়ম ভাঙলে পোস্ট মুছে অ্যাকাউন্ট বন্ধ করা হতে পারে।</div></div>` +
      (rows.length ? rows.map((p, i) => `<div class="sec"><b>👤 ${esc(p.name || 'ব্যবহারকারী')}</b> <span style="font-size:12px;color:#777">${sdate(p.createdAt)}</span>
        <div style="white-space:pre-line;margin:6px 0">${esc(p.text || '')}</div>
        <button class="btn sm" style="background:#0369a1" onclick="openThread(${i})">💬 মন্তব্য</button>
        <button class="btn sm" style="background:#64748b" onclick="reportPost(${i})">🚩 রিপোর্ট</button>
        ${(p.uid === m.u.uid || adm) ? `<button class="btn sm" style="background:#dc2626" onclick="delPost(${i})">🗑️ মুছুন</button>` : ''}</div>`).join('') : '<div class="empty">এখনো কোনো পোস্ট নেই। প্রথম পোস্টটি আপনিই করুন।</div>'));
  } catch (e) { sbody(sErr(e)); }
}
async function postNew() {
  const t = (document.getElementById('ptext').value || '').trim(); if (!t) return;
  if (Date.now() - _lastPost < 30000) return alert('একটু অপেক্ষা করে আবার পোস্ট করুন।');
  const m = await sme(); if (!m) return;
  try { await m.f.F.addDoc(m.f.F.collection(m.f.db, 'posts'), {uid: m.u.uid, name: (cloudInfo() || {}).name || 'ব্যবহারকারী', text: t.slice(0, 500), createdAt: m.f.F.serverTimestamp()}); _lastPost = Date.now(); communityPage(); }
  catch (e) { alert('পোস্ট করা যায়নি। ' + (e.code === 'permission-denied' ? 'আপনার অ্যাকাউন্টে পোস্টের অনুমতি নেই।' : 'ইন্টারনেট দেখুন।')); }
}
async function delPost(i) {
  const p = _acache.posts[i]; if (!p || !confirm('পোস্টটি মুছবেন?')) return;
  const m = await sme(); try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'posts', p.id)); communityPage(); } catch (e) { alert('মোছা যায়নি।'); }
}
async function reportPost(i) {
  const p = _acache.posts[i]; if (!p) return; const why = prompt('রিপোর্টের কারণ লিখুন (যেমন: গালি, বিজ্ঞাপন, প্রতারণা)'); if (why === null) return;
  const m = await sme();
  try { await m.f.F.addDoc(m.f.F.collection(m.f.db, 'reports'), {postId: p.id, postText: String(p.text || '').slice(0, 300), postUid: p.uid, why: String(why).slice(0, 200), by: m.u.uid, createdAt: m.f.F.serverTimestamp()}); alert('রিপোর্ট জমা হয়েছে। ধন্যবাদ।'); }
  catch (e) { alert('রিপোর্ট পাঠানো যায়নি।'); }
}
async function openThread(i) {
  const p = _acache.posts[i]; if (!p) return; window._thr = p.id;
  showModal(`<b>${esc(p.name || '')}</b><div style="white-space:pre-line;margin:6px 0">${esc(p.text || '')}</div><hr><div id="thr"><div class="empty">⏳</div></div>
    <input class="inp" id="ctext" maxlength="300" placeholder="আপনার মন্তব্য"><button class="btn sm" onclick="addComment()">পাঠান</button>`);
  loadThread();
}
async function loadThread() {
  const m = await sme(); const el = document.getElementById('thr'); if (!m || !el) return;
  try {
    const rows = await sList(m.f, ['posts', window._thr, 'comments'], m.f.F.orderBy('createdAt', 'asc'), m.f.F.limit(100)); window._cm = rows; const adm = isAdminFlag();
    el.innerHTML = rows.length ? rows.map((c, j) => `<div style="margin:6px 0;font-size:14px"><b>${esc(c.name || '')}</b> <span style="font-size:11px;color:#777">${sdate(c.createdAt)}</span>${(c.uid === m.u.uid || adm) ? ` <a href="#" style="color:#dc2626;font-size:12px" onclick="delComment(${j});return false">মুছুন</a>` : ''}<div style="white-space:pre-line">${esc(c.text || '')}</div></div>`).join('') : '<div style="color:#777;font-size:13px">এখনো কোনো মন্তব্য নেই।</div>';
  } catch (e) { el.innerHTML = sErr(e); }
}
async function addComment() {
  const t = (document.getElementById('ctext').value || '').trim(); if (!t) return; const m = await sme(); if (!m) return;
  try { await m.f.F.addDoc(m.f.F.collection(m.f.db, 'posts', window._thr, 'comments'), {uid: m.u.uid, name: (cloudInfo() || {}).name || 'ব্যবহারকারী', text: t.slice(0, 300), createdAt: m.f.F.serverTimestamp()}); document.getElementById('ctext').value = ''; loadThread(); }
  catch (e) { alert('মন্তব্য পাঠানো যায়নি।'); }
}
async function delComment(j) {
  const c = (window._cm || [])[j]; if (!c) return; const m = await sme();
  try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'posts', window._thr, 'comments', c.id)); loadThread(); } catch (e) { alert('মোছা যায়নি।'); }
}

// ---------- চাকরিপ্রার্থী (বেকার) আইডি ----------
const seekerId = uid => 'CB-' + String(uid).slice(0, 6).toUpperCase();
const LIC_OPTS = ['লার্নার / এখনো লাইসেন্স নেই', 'মোটরসাইকেল', 'হালকা (Light)', 'মধ্যম (Medium)', 'ভারী (Heavy)', 'ভারী + পিএসভি'];
async function seekerPage(dist = '') {
  sShell('চাকরিপ্রার্থী আইডি');
  if (!CLOUD_ON()) return sbody(sNeedSetup());
  const m = await sme(); if (!m) return sbody(sNeedLogin());
  try {
    const mine = await m.f.F.getDoc(m.f.F.doc(m.f.db, 'seekers', m.u.uid));
    const rows = await sList(m.f, ['seekers'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(60)); _acache.seekers = rows;
    const me_ = mine.exists() ? mine.data() : null; const adm = isAdminFlag();
    const shown = rows.filter(r => !dist || String(r.district || '').includes(dist));
    sbody(`<div class="sec"><b>🪪 ${me_ ? 'আপনার আইডি: ' + seekerId(m.u.uid) : 'নিজের চাকরিপ্রার্থী আইডি বানান'}</b>
      <div style="font-size:13px;color:#666;margin:4px 0">চাকরিদাতা বা মালিকরা এখানে দেখে ড্রাইভার খুঁজতে পারেন। শুধু লগইন করা ব্যবহারকারীরা দেখতে পারে।</div>
      <input class="inp" id="sk_n" placeholder="নাম" value="${esc((me_ && me_.name) || (cloudInfo() || {}).name || '')}">
      <input class="inp" id="sk_d" placeholder="জেলা / এলাকা" value="${esc((me_ && me_.district) || '')}">
      <select class="inp" id="sk_l">${LIC_OPTS.map(o => `<option ${me_ && me_.lic === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <input class="inp" id="sk_e" type="number" min="0" max="50" placeholder="অভিজ্ঞতা (বছর)" value="${me_ ? esc(me_.exp || '') : ''}">
      <textarea class="inp" id="sk_a" rows="2" maxlength="200" placeholder="নিজের সম্পর্কে সংক্ষেপে">${esc((me_ && me_.about) || '')}</textarea>
      <input class="inp" id="sk_p" placeholder="ফোন নম্বর (ঐচ্ছিক)" value="${esc((me_ && me_.phone) || '')}">
      <label style="display:block;font-size:13px;margin:4px 0"><input type="checkbox" id="sk_s" ${me_ && me_.showPhone ? 'checked' : ''}> ফোন নম্বর অন্যদের দেখান</label>
      <label style="display:block;font-size:13px;margin:4px 0"><input type="checkbox" id="sk_c" ${me_ ? 'checked' : ''}> আমি সম্মতি দিচ্ছি, আমার এই তথ্য লগইন করা অন্য ব্যবহারকারীরা দেখতে পারবে।</label>
      <button class="btn sm" onclick="seekerSave()">সেভ করুন</button> ${me_ ? '<button class="btn sm" style="background:#dc2626" onclick="seekerDel()">আইডি মুছুন</button>' : ''}</div>
      <input class="inp" id="sk_f" placeholder="🔍 জেলা দিয়ে খুঁজুন" value="${esc(dist)}" onchange="seekerPage(this.value)">` +
      (shown.length ? shown.map((r, i) => `<div class="sec"><b>${esc(seekerId(r.uid))} • ${esc(r.name || '')}</b><div style="font-size:14px">📍 ${esc(r.district || '—')} • 📜 ${esc(r.lic || '—')} • ⏱️ ${esc(r.exp || 0)} বছর</div>
        ${r.about ? `<div style="font-size:13px;color:#555">${esc(r.about)}</div>` : ''}${r.showPhone && r.phone ? `<a class="btn sm" style="text-decoration:none" href="tel:${esc(String(r.phone).replace(/[^\d+]/g, ''))}">📞 ${esc(r.phone)}</a>` : ''}
        ${adm ? `<button class="btn sm" style="background:#dc2626" onclick="seekerAdminDel(${i})">🗑️ মুছুন</button>` : ''}</div>`).join('') : '<div class="empty">কেউ নেই।</div>'));
  } catch (e) { sbody(sErr(e)); }
}
async function seekerSave() {
  const v = id => (document.getElementById(id).value || '').trim();
  if (!document.getElementById('sk_c').checked) return alert('সম্মতির ঘরে টিক দিন।');
  if (!v('sk_n') || !v('sk_d')) return alert('নাম ও জেলা দিন।');
  const m = await sme(); if (!m) return;
  try {
    await m.f.F.setDoc(m.f.F.doc(m.f.db, 'seekers', m.u.uid), {uid: m.u.uid, name: v('sk_n').slice(0, 60), district: v('sk_d').slice(0, 60), lic: v('sk_l'), exp: Math.max(0, Math.min(50, +v('sk_e') || 0)), about: v('sk_a').slice(0, 200), phone: v('sk_p').slice(0, 20), showPhone: document.getElementById('sk_s').checked, createdAt: m.f.F.serverTimestamp()});
    seekerPage();
  } catch (e) { alert('সেভ করা যায়নি।'); }
}
async function seekerDel() { if (!confirm('আপনার আইডি মুছে ফেলবেন?')) return; const m = await sme(); try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'seekers', m.u.uid)); seekerPage(); } catch (e) { alert('মোছা যায়নি।'); } }
async function seekerAdminDel(i) { const r = _acache.seekers[i]; if (!r || !confirm('মুছবেন?')) return; const m = await sme(); try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'seekers', r.uid)); seekerPage(); } catch (e) { alert('মোছা যায়নি।'); } }

// ---------- অ্যাডমিন প্যানেল ----------
const gv = id => { const e = document.getElementById(id); return e ? (e.value || '').trim() : ''; };
async function adminPage(sec = 'pub', editId = '') {
  sShell('অ্যাডমিন প্যানেল', 'profile');
  if (!CLOUD_ON()) return sbody(sNeedSetup());
  const m = await sme(); if (!m) return sbody(sNeedLogin());
  let role = null; try { role = await adminRole(); } catch (e) { return sbody(sErr(e)); }
  try { role ? localStorage.setItem('isAdmin', role) : localStorage.removeItem('isAdmin'); } catch (e) {}
  if (!role) return sbody(`<div class="warn">আপনি অ্যাডমিন নন। অ্যাডমিন হতে চাইলে নিচের কোডটি মালিককে পাঠান।</div><div class="cvcard"><b>আপনার UID:</b><div style="word-break:break-all;user-select:all">${esc(m.u.uid)}</div></div>`);
  const tabs = [['pub', '✍️ প্রকাশ'], ['list', '📚 কনটেন্ট'], ['rep', '🚩 রিপোর্ট'], ['adm', '👥 অ্যাডমিন']];
  const bar = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${tabs.map(t => `<button class="btn sm" style="${sec === t[0] ? '' : 'background:#64748b'}" onclick="adminPage('${t[0]}')">${t[1]}</button>`).join('')}</div>`;
  try {
    let h = '';
    if (sec === 'pub') {
      await refreshContent(); const e = ADMIN_CONTENT.find(x => x.id === editId) || null; const j = (e && e.job) || {};
      h = `<div class="sec"><b>${e ? '✏️ সম্পাদনা' : '✍️ নতুন কনটেন্ট প্রকাশ'}</b>
        <select class="inp" id="ad_t" onchange="adToggle()">${Object.keys(TYPE_LBL).map(k => `<option value="${k}" ${e && e.type === k ? 'selected' : ''}>${TYPE_LBL[k]}</option>`).join('')}</select>
        <input class="inp" id="ad_title" placeholder="শিরোনাম" value="${esc((e && e.title) || '')}">
        <textarea class="inp" id="ad_body" rows="5" placeholder="লেখা / বিবরণ">${esc((e && e.body) || '')}</textarea>
        <input class="inp" id="ad_url" placeholder="ভিডিও/অডিও/ছবির লিংক (YouTube বা সরাসরি ফাইলের লিংক)" value="${esc((e && e.url) || '')}">
        ${(typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.storageBucket) ? `<div style="font-size:13px;margin:4px 0">অথবা ফাইল আপলোড (সর্বোচ্চ ৫০ মেগাবাইট): <input type="file" id="ad_file" accept="video/*,audio/*,image/*"></div>` : '<div style="font-size:12px;color:#777;margin:4px 0">সরাসরি ফাইল আপলোড চালু করতে firebase-config.js এ storageBucket দিন। না দিলে লিংক বসান।</div>'}
        <div id="ad_job" style="display:${e && e.type === 'job' ? 'block' : 'none'}"><input class="inp" id="ad_c" placeholder="কোম্পানি" value="${esc(j.c || '')}"><input class="inp" id="ad_s" placeholder="বেতন" value="${esc(j.s || '')}"><input class="inp" id="ad_lic" placeholder="লাইসেন্স" value="${esc(j.lic || '')}"><input class="inp" id="ad_loc" placeholder="লোকেশন" value="${esc(j.loc || '')}"><input class="inp" id="ad_dl" type="date" value="${esc(j.deadline || '')}"><input class="inp" id="ad_ph" placeholder="ফোন" value="${esc(j.phone || '')}"><select class="inp" id="ad_kind"><option value="local" ${j.kind !== 'foreign' ? 'selected' : ''}>দেশি</option><option value="foreign" ${j.kind === 'foreign' ? 'selected' : ''}>বিদেশি</option></select></div>
        <div id="ad_msg" class="warn" style="display:none"></div>
        <button class="btn" onclick="adSave('${esc(editId)}')">${e ? 'আপডেট' : 'প্রকাশ করুন'}</button></div>`;
    } else if (sec === 'list') {
      await refreshContent();
      h = ADMIN_CONTENT.length ? ADMIN_CONTENT.map(c => `<div class="sec"><span class="badge" style="background:#b45309">${TYPE_LBL[c.type] || ''}</span> <b>${esc(c.title || '')}</b> <span style="font-size:12px;color:#777">${sdate(c.at)}</span><div><button class="btn sm" onclick="adminPage('pub','${esc(c.id)}')">✏️ সম্পাদনা</button> <button class="btn sm" style="background:#dc2626" onclick="adDel('${esc(c.id)}')">🗑️ মুছুন</button></div></div>`).join('') : '<div class="empty">কিছু প্রকাশ করা হয়নি।</div>';
    } else if (sec === 'rep') {
      const rows = await sList(m.f, ['reports'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(50)); _acache.reports = rows;
      h = rows.length ? rows.map((r, i) => `<div class="sec"><div style="white-space:pre-line">${esc(r.postText || '')}</div><div style="font-size:12px;color:#b45309">কারণ: ${esc(r.why || '')}</div>
        <button class="btn sm" style="background:#dc2626" onclick="repAct(${i},'post')">🗑️ পোস্ট মুছুন</button> <button class="btn sm" style="background:#7f1d1d" onclick="repAct(${i},'ban')">🚫 ব্যবহারকারী বন্ধ</button> <button class="btn sm" style="background:#64748b" onclick="repAct(${i},'dismiss')">বাতিল</button></div>`).join('') : '<div class="empty">কোনো রিপোর্ট নেই।</div>';
    } else if (sec === 'adm') {
      const rows = await sList(m.f, ['admins']); _acache.admins = rows;
      h = rows.map((a, i) => `<div class="sec"><b>👤 ${esc(a.name || a.id)}</b> <span class="badge" style="background:${a.role === 'owner' ? '#b45309' : '#0369a1'}">${a.role === 'owner' ? 'মালিক' : 'অ্যাডমিন'}</span>${(role === 'owner' && a.id !== m.u.uid) ? ` <button class="btn sm" style="background:#dc2626" onclick="admRemove(${i})">সরান</button>` : ''}</div>`).join('') +
        (role === 'owner' ? `<div class="sec"><b>নতুন অ্যাডমিন যোগ</b><div style="font-size:13px;color:#666">যাকে যোগ করবেন, তাকে আগে অ্যাপে অ্যাকাউন্ট খুলে লগইন করতে হবে। তার মোবাইল নম্বর বা ইমেইল দিন।</div>
          <input class="inp" id="adm_id" placeholder="মোবাইল নম্বর বা ইমেইল"><div id="ad_msg" class="warn" style="display:none"></div><button class="btn sm" onclick="admAdd()">যোগ করুন</button></div>` : '<div class="warn">নতুন অ্যাডমিন যোগ বা সরাতে পারেন শুধু মালিক।</div>');
    }
    sbody(bar + h);
  } catch (e) { sbody(bar + sErr(e)); }
}
function adToggle() { const t = gv('ad_t'); const j = document.getElementById('ad_job'); if (j) j.style.display = t === 'job' ? 'block' : 'none'; }
function adMsg(t) { const b = document.getElementById('ad_msg'); if (b) { b.style.display = 'block'; b.textContent = t; } }
async function adUpload(m) {
  const fi = document.getElementById('ad_file'); const file = fi && fi.files && fi.files[0]; if (!file) return '';
  if (file.size > 50 * 1024 * 1024) throw {message: 'ফাইল ৫০ মেগাবাইটের বেশি।'};
  const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
  const S = window.__ST_MOCK || await import(base + 'firebase-storage.js'); const st = S.getStorage(m.f.app); const safe = file.name.replace(/[^\w.\-]/g, '_');
  const ref = S.ref(st, 'content/' + Date.now() + '_' + safe); adMsg('⏳ আপলোড হচ্ছে...');
  await S.uploadBytes(ref, file); return await S.getDownloadURL(ref);
}
async function adSave(editId) {
  const m = await sme(); if (!m) return; const type = gv('ad_t'), title = gv('ad_title');
  if (!title) return adMsg('শিরোনাম দিন।');
  try {
    adMsg('⏳ সেভ হচ্ছে...'); let url = gv('ad_url'); const up = await adUpload(m); if (up) url = up;
    if (url && !safeUrl(url)) return adMsg('লিংক http:// বা https:// দিয়ে শুরু হতে হবে।');
    const d = {type, title: title.slice(0, 150), body: gv('ad_body').slice(0, 8000), url, pub: true, by: m.u.uid};
    if (type === 'job') d.job = {c: gv('ad_c'), s: gv('ad_s'), lic: gv('ad_lic'), loc: gv('ad_loc'), deadline: gv('ad_dl'), phone: gv('ad_ph'), kind: gv('ad_kind') || 'local', url};
    if (editId) await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', editId), d, {merge: true});
    else { d.createdAt = m.f.F.serverTimestamp(); await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), d); }
    await refreshContent(); adminPage('list');
  } catch (e) { adMsg('⚠️ ' + ((e && e.code === 'permission-denied') ? 'অনুমতি নেই।' : (e && e.message) || 'সেভ হয়নি।')); }
}
async function adDel(id) { if (!confirm('মুছে ফেলবেন?')) return; const m = await sme(); try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'content', id)); await refreshContent(); adminPage('list'); } catch (e) { alert('মোছা যায়নি।'); } }
async function repAct(i, act) {
  const r = _acache.reports[i]; if (!r) return; const m = await sme(); const D = m.f.F;
  try {
    if (act === 'post') await D.deleteDoc(D.doc(m.f.db, 'posts', r.postId));
    if (act === 'ban') { if (!confirm('এই ব্যবহারকারী আর পোস্ট বা মন্তব্য করতে পারবে না। নিশ্চিত?')) return; await D.setDoc(D.doc(m.f.db, 'banned', r.postUid), {at: Date.now(), by: m.u.uid}); }
    await D.deleteDoc(D.doc(m.f.db, 'reports', r.id)); adminPage('rep');
  } catch (e) { alert('কাজটি করা যায়নি।'); }
}
async function admAdd() {
  const key = loginEmail(gv('adm_id')); if (!key) return adMsg('সঠিক মোবাইল নম্বর বা ইমেইল দিন।');
  const m = await sme();
  try {
    const rows = await sList(m.f, ['profiles'], m.f.F.where('idKey', '==', key));
    if (!rows.length) return adMsg('এই আইডির কাউকে পাওয়া যায়নি। তাকে আগে অ্যাপে অ্যাকাউন্ট খুলে লগইন করতে বলুন।');
    await m.f.F.setDoc(m.f.F.doc(m.f.db, 'admins', rows[0].id), {role: 'admin', name: rows[0].name || '', by: m.u.uid, at: Date.now()}); adminPage('adm');
  } catch (e) { adMsg('⚠️ যোগ করা যায়নি।'); }
}
async function admRemove(i) {
  const a = _acache.admins[i]; if (!a || !confirm('এই অ্যাডমিনকে সরাবেন?')) return; const m = await sme();
  try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'admins', a.id)); adminPage('adm'); } catch (e) { alert('সরানো যায়নি।'); }
}
