// কমিউনিটি, চাকরিপ্রার্থী আইডি, নোটিশ বোর্ড ও অ্যাডমিন প্যানেল।
// সবই Firebase (Firestore) এ চলে, তাই firebase-config.js ভরা না থাকলে এগুলো দেখা যায় না।
// নিরাপত্তা আসে Firestore Rules থেকে (SETUP.md)। অ্যাডমিন বাটন দেখা গেলেও অধিকার ছাড়া কিছু লেখা যায় না।
if (typeof CLOUD_ON === 'function' && CLOUD_ON()) {
  [['board', 'নোটিশ বোর্ড', '📢', '#b45309', 'নোটিশ, ভিডিও, অডিও, লেখা'],
   ['community', 'কমিউনিটি', '💬', '#0369a1', 'প্রশ্ন, আলোচনা, মন্তব্য'],
   ['seeker', 'চাকরিপ্রার্থী আইডি', '🪪', '#6d28d9', 'নিজের আইডি বানান']].forEach(a => {
    if (!CATS.some(c => c.id === a[0])) CATS.push({id: a[0], name: a[1], ic: a[2], color: a[3], sub: a[4]});
  });
}

if (!CATS.some(c => c.id === 'contact')) CATS.push({id: 'contact', name: 'যোগাযোগ', ic: '📞', color: '#0f766e', sub: 'ডেভেলপার ও অ্যাডমিন'});

// ---------- সাধারণ সহায়ক ----------
let _acache = {content: [], posts: [], reports: [], seekers: [], admins: []};
const sdate = ts => { try { const d = ts && ts.toDate ? ts.toDate() : new Date(ts); return isNaN(d) ? '' : d.toLocaleDateString('bn-BD'); } catch (e) { return ''; } };
const sbody = h => { const e = document.getElementById('sbody'); if (e) e.innerHTML = h; };
const initial = n => (Array.from(String(n || 'ব'))[0] || 'ব');
async function sme() {
  if (!CLOUD_ON() || !cloudInfo()) return null;
  const f = await fb(); const u = f.auth.currentUser; return u ? {f, u} : null;
}
const sEmpty = (ic, t) => `<div class="empty"><span class="e1">${ic}</span>${esc(t)}</div>`;
function sNeedSetup() { return `<div class="warn">এই অংশ চালু করতে অ্যাপের নির্মাতাকে Firebase সেটআপ করতে হবে।</div>`; }
function sNeedLogin() { return `<div class="cx"><b>🔒 লগইন দরকার</b><div class="hint">এই অংশ ব্যবহারে আগে লগইন করতে হবে। লগইন করলে আপনার সব তথ্য ফোন বদলালেও ফেরত পাবেন।</div><button class="btn" onclick="open_('account')">👤 লগইন / নতুন অ্যাকাউন্ট</button></div>`; }
function sShell(title, tabKey, ic, sub) { tab = tabKey || 'home'; render(pageHead(title) + (ic ? hero(ic, title, sub) : '') + '<div class="pad" id="sbody"><div class="empty"><span class="e1">⏳</span>লোড হচ্ছে...</div></div>'); }
function sErr(e) { return `<div class="warn">⚠️ ${esc((e && e.code === 'permission-denied') ? 'অনুমতি নেই। লগইন করে আবার চেষ্টা করুন।' : 'লোড করা যায়নি। ইন্টারনেট সংযোগ দেখুন।')}</div>`; }
async function sList(f, path, ...cons) {
  const q = f.F.query(f.F.collection(f.db, ...path), ...cons);
  const s = await f.F.getDocs(q); const r = []; s.forEach(d => r.push(Object.assign({id: d.id}, d.data()))); return r;
}

// ---------- ইউজার প্রোফাইল (অ্যাডমিন যোগ করার সময় খোঁজার জন্য) ও লগআউটে ক্লিনআপ ----------
async function upsertProfile(first) {
  const m = await sme(); if (!m) return; const ci = cloudInfo() || {};
  await m.f.F.setDoc(m.f.F.doc(m.f.db, 'profiles', m.u.uid), Object.assign({name: ci.name || '', idKey: loginEmail(ci.id || ''), at: Date.now()}, first ? {first: Date.now()} : {}), {merge: true});
}
(function () {
  const L = cloudLogin, S = cloudSignup, O = cloudLogout;
  cloudLogin = async (...a) => { const r = await L(...a); upsertProfile().catch(() => {}); adminProbe(); return r; };
  cloudSignup = async (...a) => { const r = await S(...a); upsertProfile(true).catch(() => {}); return r; };
  cloudLogout = async (...a) => { const r = await O(...a); try { localStorage.removeItem('isAdmin'); } catch (e) {} return r; };
})();

// ---------- অ্যাডমিন চেনা ----------
async function adminRole() {
  const m = await sme(); if (!m) return null;
  const d = await m.f.F.getDoc(m.f.F.doc(m.f.db, 'admins', m.u.uid));
  if (d.exists()) return (d.data() || {}).role || 'admin';
  // Rules এ নাম থাকা মালিকদের জন্য: শুধু অ্যাডমিন এই ডকুমেন্ট পড়তে পারে
  try { await m.f.F.getDoc(m.f.F.doc(m.f.db, 'meta', 'adm')); return 'owner'; } catch (e) { if (e && e.code === 'permission-denied') return null; throw e; }
}
async function adminProbe() {
  try { const r = await adminRole(); try { r ? localStorage.setItem('isAdmin', r) : localStorage.removeItem('isAdmin'); } catch (e) {} } catch (e) {}
}
const realAdmin = () => { try { return !!localStorage.getItem('isAdmin'); } catch (e) { return false; } };
const uvOn = () => { try { return sessionStorage.getItem('uv') === '1'; } catch (e) { return false; } };
const isAdminFlag = () => realAdmin() && !uvOn();   // «ইউজার ভিউ» চালু থাকলে অ্যাডমিন বাটন দেখা যায় না

// ---------- অ্যাডমিনের প্রকাশ করা কনটেন্ট (লগইন ছাড়াই সবাই দেখে, অফলাইনে শেষ কপি থাকে) ----------
let ADMIN_CONTENT = []; try { ADMIN_CONTENT = JSON.parse(localStorage.getItem('adminContent') || '[]'); } catch (e) {}
const TYPE_LBL = {qch: '📝 প্রশ্ন অধ্যায়', attach: '📎 সংযুক্তি', notice: '📢 নোটিশ', section: '🧩 নতুন সেকশন', tip: '💡 টিপস', article: '📝 লেখা', video: '🎬 ভিডিও', audio: '🎧 অডিও', image: '🖼️ ছবি', job: '💼 চাকরি', quiz: '❓ কুইজ প্রশ্ন', contact: '📞 যোগাযোগ', node: '🧱 পাতা / অধ্যায়', ad: '📣 বিজ্ঞাপন', ticker: '📰 খবর'};
const TYPE_SEL = Object.keys(TYPE_LBL).filter(k => !['contact', 'config', 'ad', 'ticker', 'qch', 'attach'].includes(k));
const TYPE_BG = {notice: '#fef3c7', section: '#dbeafe', tip: '#fef9c3', article: '#dcfce7', video: '#fee2e2', audio: '#ede9fe', image: '#fce7f3', job: '#e0f2fe', quiz: '#ffedd5'};
const TILE_COL = ['#0369a1', '#b45309', '#6d28d9', '#15803d', '#be123c', '#0f766e'];
const mapRow = r => ({id: r.id, type: r.type, title: r.title, body: r.body, url: r.url, sub: r.sub, ic: r.ic, mt: r.mt, pin: !!r.pin, pub: r.pub !== false, at: r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : (+r.createdAt || 0), job: r.job || null, contact: r.contact || null, cfg: r.cfg || null, quiz: r.quiz || null, img: r.img || '', parent: r.parent || '', titleEn: r.titleEn || '', bodyEn: r.bodyEn || '', lang: r.lang || 'auto', color: r.color || '', ord: +r.ord || 0, slot: r.slot || '', label: r.label || '', pd: r.pd || '', exp: r.exp || '', credit: r.credit || '', bank: r.bank || '', n: +r.n || 0, hid: !!r.hid, qz: Array.isArray(r.qz) ? r.qz : [], key: r.key || '', blocks: Array.isArray(r.blocks) ? r.blocks : [], fmt: r.fmt || ''});

function hidSafe() { try { const h = APPCFG().hidden || {}; return {d: h.d || [], q: h.q || [], t: h.t || []}; } catch (e) { return {d: [], q: [], t: []}; } }
let _tipBase = null;
function applyTips() {
  if (typeof TIPS === 'undefined') return;
  if (!_tipBase) _tipBase = TIPS.slice();
  const extra = ADMIN_CONTENT.filter(c => c.type === 'tip' && c.body).map(c => c.body);
  const hd = hidSafe().t; TIPS.length = 0; _tipBase.filter(t => !hd.includes(t)).concat(extra).forEach(t => TIPS.push(t)); if (!TIPS.length) TIPS.push('নিরাপদে গাড়ি চালান।');
}
applyTips();

let _quizBase = null;
function applyQuiz() {
  if (typeof QUIZ === 'undefined') return;
  if (!_quizBase) _quizBase = QUIZ.slice();
  const extra = ADMIN_CONTENT.filter(c => c.type === 'quiz' && c.quiz && Array.isArray(c.quiz.o) && c.title).map(c => { const right = c.quiz.o[+c.quiz.a || 0], o = c.quiz.o.filter(Boolean); return [c.title, o, Math.max(0, o.indexOf(right)), c.quiz.e || '']; }).filter(q => q[1].length >= 2);
  const hq = hidSafe().q; QUIZ.length = 0; _quizBase.filter(q => !hq.includes(q[0])).concat(extra).forEach(q => QUIZ.push(q)); if (!QUIZ.length) _quizBase.slice(0, 1).forEach(q => QUIZ.push(q));
}
applyQuiz();

async function refreshContent() {
  if (!CLOUD_ON() || !navigator.onLine) return;
  try {
    const f = await fb();
    const rows = await sList(f, ['content'], f.F.orderBy('createdAt', 'desc'), f.F.limit(500));
    const next = rows.map(mapRow).filter(r => r.pub);
    const changed = JSON.stringify(next) !== JSON.stringify(ADMIN_CONTENT);
    ADMIN_CONTENT = next; applyTips(); applyQuiz(); applyTheme(); renderBars();
    try { localStorage.setItem('adminContent', JSON.stringify(ADMIN_CONTENT)); } catch (e) {
      try { localStorage.setItem('adminContent', JSON.stringify(ADMIN_CONTENT.map(c => Object.assign({}, c, {img: ['config', 'ad'].includes(c.type) ? c.img : ''})))); } catch (e2) {}
    }
    // হোমে থাকলে ও কিছু বদলালে নতুন আইকন/নোটিশ দেখাতে হোম আবার আঁকা
    const q = document.getElementById('q');
    if (changed && tab === 'home' && !stack.length && q && !q.value && !document.getElementById('modal')) home();
  } catch (e) {}
}
setTimeout(() => { if (CLOUD_ON()) { if (cloudInfo()) adminProbe(); refreshContent(); } }, 2500);

// চাকরির তালিকায় মেশানোর জন্য (app.js এর activeJobs ডাকে)
function adminJobs() {
  return ADMIN_CONTENT.filter(c => c.type === 'job' && c.job).map(c => Object.assign({kind: 'local', t: c.title, d: c.body || ''}, c.job));
}
// হোমের নতুন আইকন (অ্যাডমিনের বানানো সেকশন)
function adminTiles() {
  return ADMIN_CONTENT.filter(c => c.type === 'section' && c.title).map((c, i) => ({id: 'sec_' + c.id, name: c.title, ic: c.ic || '📌', color: TILE_COL[i % TILE_COL.length], sub: c.sub || ''}));
}
// হোমে পিন করা নোটিশ
function homeNotice() {
  const n = ADMIN_CONTENT.find(c => c.type === 'notice' && c.pin && !isExp(c)); if (!n) return '';
  let d = []; try { d = JSON.parse(localStorage.getItem('noticeX') || '[]'); } catch (e) {}
  if (d.includes(n.id)) return '';
  return `<div class="pin" onclick="boardItem('${esc(n.id)}')"><button class="x" onclick="event.stopPropagation();noticeX('${esc(n.id)}')">✕</button><b>📢 ${esc(n.title || '')}</b>${esc((n.body || '').slice(0, 110))}</div>`;
}
function noticeX(id) { let d = []; try { d = JSON.parse(localStorage.getItem('noticeX') || '[]'); } catch (e) {} d.push(id); try { localStorage.setItem('noticeX', JSON.stringify(d.slice(-30))); } catch (e) {} home(); }

function mediaHtml(c) {
  const pic = okImg(c.img) ? `<img loading="lazy" src="${c.img}" style="max-width:100%;border-radius:14px;display:block;margin-bottom:8px">` : '';
  const u = safeUrl(c.url); if (!u) return pic;
  const t = c.mt && c.mt !== 'none' ? c.mt : c.type;
  const yt = u.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/);
  if (yt && t !== 'audio' && t !== 'image') return pic + `<iframe style="width:100%;aspect-ratio:16/9;border:0;border-radius:14px" src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen></iframe>`;
  if (t === 'video') return pic + `<video controls playsinline preload="none" src="${esc(u)}" style="width:100%;border-radius:14px"></video>`;
  if (t === 'audio') return pic + `<audio controls preload="none" src="${esc(u)}" style="width:100%"></audio>`;
  if (t === 'image') return pic + `<img loading="lazy" src="${esc(u)}" style="max-width:100%;border-radius:14px">`;
  if (t === 'pdf' || (t !== 'none' && isPdfUrl(u))) return pic + pdfInline(u);
  return pic;
}
const isPdfUrl = u => /\.pdf($|[?#])|drive\.google\.com\/file|docs\.google\.com\/(document|presentation)/i.test(u || '');
const isYtUrl = u => /(?:youtu\.be\/|youtube\.com\/)/i.test(u || '');
const linkBtn = u => safeUrl(u) ? `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:12px" href="${esc(safeUrl(u))}" target="_blank" rel="noopener" onclick="goUrl(this.getAttribute('href'));return false">${isPdfUrl(u) ? '📄 PDF খুলুন' : isYtUrl(u) ? '▶️ YouTube এ দেখুন' : '🔗 খুলুন'}</a>` : '';
const speakBtn = t => `<button class="btn sm" style="margin-top:10px" onclick="speak(${JSON.stringify(String(t || '')).replace(/"/g, '&quot;')})">🔊 শুনুন</button>`;

function boardPage(flt = '') {
  tab = 'home';
  const list = ADMIN_CONTENT.filter(c => ['notice', 'article', 'video', 'audio', 'image'].includes(c.type) && (!flt || c.type === flt));
  const chips = `<div class="seg">${['', 'notice', 'article', 'video', 'audio', 'image'].map(t => `<button class="${flt === t ? 'on' : ''}" onclick="boardPage('${t}')">${t ? TYPE_LBL[t] : 'সব'}</button>`).join('')}</div>`;
  render(pageHead('নোটিশ বোর্ড') + hero('📢', 'নোটিশ বোর্ড', 'নতুন নিয়ম, ভিডিও, অডিও ও দরকারি লেখা') + '<div class="pad">' + chips +
    (list.length ? list.map(c => `<div class="bi" onclick="boardItem('${esc(c.id)}')"><div class="bic" style="background:${TYPE_BG[c.type] || '#eee'}">${(TYPE_LBL[c.type] || '').split(' ')[0]}</div><div><b>${esc(c.title || '')}</b><small>${(TYPE_LBL[c.type] || '').split(' ').slice(1).join(' ')} • ${sdate(c.at)}</small></div></div>`).join('') : sEmpty('📭', 'এখনো কিছু নেই। ইন্টারনেট থাকলে নতুন কনটেন্ট নিজে থেকে আসবে।')) +
    `<button class="btn sm" style="background:#475569" onclick="refreshContent().then(()=>boardPage('${flt}'))">🔄 নতুন আছে কি দেখুন</button></div>`);
  if (CLOUD_ON() && !ADMIN_CONTENT.length) refreshContent().then(() => { if (ADMIN_CONTENT.length) boardPage(flt); });
}
function boardItem(id) {
  const c = ADMIN_CONTENT.find(x => x.id === id); if (!c) return;
  showModal(`<span class="tag" style="background:#b45309">${TYPE_LBL[c.type] || ''}</span><h3 style="margin:8px 0">${esc(c.title || '')}</h3>${mediaHtml(c)}<div class="rich" style="margin-top:8px">${rich(c.body)}</div>${linkBtn(c.url)}${c.qz && c.qz.length ? qzHtml(c.qz, 'm' + c.id) : ''}${speakBtn(c.body || c.title)}`);
}
function sectionPage(id) {
  const c = ADMIN_CONTENT.find(x => x.id === id); tab = 'home';
  if (!c) return render(pageHead('পাতা') + '<div class="pad">' + sEmpty('🔍', 'এই পাতাটি আর নেই।') + '</div>');
  render(pageHead(c.title || '') + hero(c.ic || '📌', c.title || '', c.sub || '') + `<div class="pad"><div class="cx">${mediaHtml(c)}<div class="rich" style="margin-top:${mediaHtml(c) ? 10 : 0}px">${rich(c.body)}</div>${linkBtn(c.url)}${speakBtn(c.body || c.title)}</div>${c.qz && c.qz.length ? qzHtml(c.qz, 's' + id) : ''}</div>`);
  injectKids('sec_' + id);
}

// ---------- কমিউনিটি ----------
let _lastPost = 0;
async function communityPage() {
  sShell('কমিউনিটি', 'home', '💬', 'প্রশ্ন করুন, অভিজ্ঞতা শেয়ার করুন, একে অপরকে সাহায্য করুন');
  if (!CLOUD_ON()) return sbody(sNeedSetup());
  const m = await sme(); if (!m) return sbody(sNeedLogin());
  try {
    const rows = await sList(m.f, ['posts'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(40)); _acache.posts = rows;
    const adm = isAdminFlag();
    sbody(`<div class="cx"><b>✍️ নতুন পোস্ট</b>
      <textarea class="inp" id="ptext" rows="3" maxlength="500" placeholder="প্রশ্ন বা অভিজ্ঞতা লিখুন (সর্বোচ্চ ৫০০ অক্ষর)"></textarea>
      <button class="btn sm" onclick="postNew()">পোস্ট করুন</button>
      <div class="hint" style="margin-top:8px">নিয়ম: গালি, বিজ্ঞাপন, প্রতারণা, ধর্ম বা রাজনীতি নিয়ে উস্কানি ও অন্যের ব্যক্তিগত তথ্য দেওয়া নিষেধ। নিয়ম ভাঙলে পোস্ট মুছে অ্যাকাউন্ট বন্ধ করা হতে পারে।</div></div>` +
      (rows.length ? rows.map((p, i) => `<div class="post"><div class="ph"><div class="av">${esc(initial(p.name))}</div><div><div class="pn">${esc(p.name || 'ব্যবহারকারী')}</div><div class="pd">${sdate(p.createdAt)}</div></div></div>
        <div class="pt">${esc(p.text || '')}</div>
        <div class="pa"><button onclick="openThread(${i})">💬 মন্তব্য</button><button onclick="reportPost(${i})">🚩 রিপোর্ট</button>${(p.uid === m.u.uid || adm) ? `<button class="del" onclick="delPost(${i})">🗑️ মুছুন</button>` : ''}</div></div>`).join('') : sEmpty('💭', 'এখনো কোনো পোস্ট নেই। প্রথম পোস্টটি আপনিই করুন।')));
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
  showModal(`<div class="ph" style="display:flex;gap:10px;align-items:center"><div class="av">${esc(initial(p.name))}</div><b>${esc(p.name || '')}</b></div><div style="white-space:pre-line;margin:8px 0;line-height:1.6">${esc(p.text || '')}</div><hr><div id="thr"><div class="empty">⏳</div></div>
    <input class="inp" id="ctext" maxlength="300" placeholder="আপনার মন্তব্য লিখুন"><button class="btn sm" onclick="addComment()">পাঠান</button>`);
  loadThread();
}
async function loadThread() {
  const m = await sme(); const el = document.getElementById('thr'); if (!m || !el) return;
  try {
    const rows = await sList(m.f, ['posts', window._thr, 'comments'], m.f.F.orderBy('createdAt', 'asc'), m.f.F.limit(100)); window._cm = rows; const adm = isAdminFlag();
    el.innerHTML = rows.length ? rows.map((c, j) => `<div style="margin:8px 0;font-size:14px;background:#f3f5f1;border-radius:12px;padding:8px 10px"><b>${esc(c.name || '')}</b> <span style="font-size:11px;color:#777">${sdate(c.createdAt)}</span>${(c.uid === m.u.uid || adm) ? ` <a href="#" style="color:#dc2626;font-size:12px" onclick="delComment(${j});return false">মুছুন</a>` : ''}<div style="white-space:pre-line">${esc(c.text || '')}</div></div>`).join('') : '<div style="color:#777;font-size:13px">এখনো কোনো মন্তব্য নেই।</div>';
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
  sShell('চাকরিপ্রার্থী আইডি', 'home', '🪪', 'আপনার পরিচয় তৈরি করুন, চাকরিদাতারা আপনাকে খুঁজে পাবেন');
  if (!CLOUD_ON()) return sbody(sNeedSetup());
  const m = await sme(); if (!m) return sbody(sNeedLogin());
  try {
    const mine = await m.f.F.getDoc(m.f.F.doc(m.f.db, 'seekers', m.u.uid));
    const rows = await sList(m.f, ['seekers'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(60)); _acache.seekers = rows;
    const me_ = mine.exists() ? mine.data() : null; const adm = isAdminFlag();
    const shown = rows.filter(r => !dist || String(r.district || '').includes(dist));
    sbody(`<div class="cx"><b>${me_ ? '✅ আপনার আইডি: <span class="sid">' + seekerId(m.u.uid) + '</span>' : '🪪 নিজের চাকরিপ্রার্থী আইডি বানান'}</b>
      <div class="hint">চাকরিদাতা বা মালিকরা এখানে দেখে ড্রাইভার খুঁজতে পারেন। শুধু লগইন করা ব্যবহারকারীরা দেখতে পারে।</div>
      <input class="inp" id="sk_n" placeholder="নাম" value="${esc((me_ && me_.name) || (cloudInfo() || {}).name || '')}">
      <input class="inp" id="sk_d" placeholder="জেলা / এলাকা" value="${esc((me_ && me_.district) || '')}">
      <select class="inp" id="sk_l">${LIC_OPTS.map(o => `<option ${me_ && me_.lic === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <input class="inp" id="sk_e" type="number" min="0" max="50" placeholder="অভিজ্ঞতা (বছর)" value="${me_ ? esc(me_.exp || '') : ''}">
      <textarea class="inp" id="sk_a" rows="2" maxlength="200" placeholder="নিজের সম্পর্কে সংক্ষেপে">${esc((me_ && me_.about) || '')}</textarea>
      <input class="inp" id="sk_p" placeholder="ফোন নম্বর (ঐচ্ছিক)" value="${esc((me_ && me_.phone) || '')}">
      <label style="display:block;font-size:14px;margin:6px 0"><input type="checkbox" id="sk_s" ${me_ && me_.showPhone ? 'checked' : ''}>ফোন নম্বর অন্যদের দেখান</label>
      <label style="display:block;font-size:14px;margin:6px 0;line-height:1.5"><input type="checkbox" id="sk_c" ${me_ ? 'checked' : ''}>আমি সম্মতি দিচ্ছি, আমার এই তথ্য লগইন করা অন্য ব্যবহারকারীরা দেখতে পারবে।</label>
      <button class="btn sm" onclick="seekerSave()">💾 সেভ করুন</button>${me_ ? '<button class="btn sm" style="background:#dc2626" onclick="seekerDel()">আইডি মুছুন</button>' : ''}</div>
      <div class="sec-h" style="margin:18px 2px 6px">চাকরিপ্রার্থীদের তালিকা</div>
      <input class="inp" id="sk_f" placeholder="🔍 জেলা দিয়ে খুঁজুন" value="${esc(dist)}" onchange="seekerPage(this.value)">` +
      (shown.length ? shown.map((r, i) => `<div class="cx sk"><div class="top"><span class="sid">${esc(seekerId(r.uid))}</span><b style="display:inline">${esc(r.name || '')}</b></div>
        <span class="pill">📍 ${esc(r.district || '—')}</span><span class="pill">📜 ${esc(r.lic || '—')}</span><span class="pill">⏱️ ${esc(r.exp || 0)} বছর</span>
        ${r.about ? `<div class="hint" style="margin-top:8px">${esc(r.about)}</div>` : ''}${r.showPhone && r.phone ? `<div><a class="btn sm" style="text-decoration:none;display:inline-block;margin-top:8px" href="tel:${esc(String(r.phone).replace(/[^\d+]/g, ''))}">📞 ${esc(r.phone)}</a></div>` : ''}
        ${adm ? `<button class="btn sm" style="background:#dc2626" onclick="seekerAdminDel(${i})">🗑️ মুছুন</button>` : ''}</div>`).join('') : sEmpty('🧑‍✈️', 'কেউ নেই।')));
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
let _picked = '', _logoPicked = null, _presetType = '', _presetParent = '';
const gv = id => { const e = document.getElementById(id); return e ? (e.value || '').trim() : ''; };
const chk = id => { const e = document.getElementById(id); return !!(e && e.checked); };
// কোন ধরনে কোন ঘর দেখাবে
const AD_VIS = {
  notice: ['title', 'body', 'url', 'img', 'pin', 'exp'], section: ['title', 'sub', 'ic', 'body', 'qb', 'img', 'url', 'mt'], tip: ['body'], article: ['title', 'body', 'qb', 'url', 'img'],
  video: ['title', 'body', 'url', 'img'], audio: ['title', 'body', 'url', 'img'], image: ['title', 'body', 'url', 'img'], job: ['title', 'body', 'job'], quiz: ['title', 'quiz'],
  node: ['parent', 'title', 'titleEn', 'ic', 'color', 'body', 'qb', 'bodyEn', 'lang', 'img', 'url', 'mt', 'ord', 'pd', 'credit', 'bk', 'h1', 'h2', 'h3', 'h4']
};
const AD_HELP = {
  notice: 'সবাই নোটিশ বোর্ডে দেখবে। "হোমে পিন" দিলে অ্যাপ খুললেই হোমে ভেসে থাকবে।',
  section: 'হোম পাতায় একটি নতুন আইকন যোগ হবে। চাপলে আপনার লেখা, ভিডিও, অডিও বা ছবি খুলবে।',
  tip: '"আজকের টিপস" এর তালিকায় যোগ হবে। শুধু টিপসের লেখাটি দিন।',
  node: 'যেকোনো আইকন বা পাতার ভিতরে নতুন অধ্যায় বা উপ-অধ্যায়। "কোথায় বসবে" ঘরে বেছে নিন। বাংলা ও ইংরেজি দুটোই লিখতে পারেন।',
  quiz: 'মডেল টেস্ট ও আজকের প্রশ্নে যোগ হবে। প্রশ্ন, চারটি উত্তর ও সঠিক উত্তরটি বেছে দিন।', article: 'নোটিশ বোর্ডে লেখা হিসেবে দেখাবে। বড় লেখা দিতে পারবেন।', video: 'YouTube লিংক বা সরাসরি ভিডিও ফাইলের লিংক দিন।',
  audio: 'অডিও ফাইলের (mp3 ইত্যাদি) লিংক দিন।', image: 'ছবির লিংক দিন।', job: 'অ্যাপের চাকরির তালিকায় মিশে যাবে, মেয়াদ শেষে নিজে সরে যাবে।'
};
function adToggle() {
  const t = gv('ad_t'), vis = AD_VIS[t] || [];
  ['parent', 'titleEn', 'bodyEn', 'lang', 'color', 'ord', 'title', 'sub', 'ic', 'body', 'url', 'img', 'mt', 'pin', 'job', 'quiz', 'qb', 'pd', 'credit', 'bk', 'exp', 'h1', 'h2', 'h3', 'h4'].forEach(k => { const e = document.getElementById('adg_' + k); if (e) e.style.display = vis.includes(k) ? 'block' : 'none'; });
  const h = document.getElementById('ad_help'); if (h) h.textContent = AD_HELP[t] || '';
}
async function adminPage(sec = 'pub', editId = '') {
  sShell('অ্যাডমিন প্যানেল', 'profile', '🛡️', 'অ্যাপের সব কনটেন্ট এখান থেকে বদলান');
  if (!CLOUD_ON()) return sbody(sNeedSetup());
  const m = await sme(); if (!m) return sbody(adminLoginView());
  let role = null; try { role = await adminRole(); } catch (e) { return sbody(sErr(e)); }
  try { role ? localStorage.setItem('isAdmin', role) : localStorage.removeItem('isAdmin'); } catch (e) {}
  if (!role) return sbody(`<div class="cx"><b>আপনি এখনো অ্যাডমিন নন</b><div class="hint">লগইন করা আইডি: <b>${esc((m.u && m.u.email) || '')}</b><br>এটি অ্যাডমিন তালিকার নম্বর বা Gmail না হলে অন্য আইডিতে লগইন করুন। তালিকার আইডি হলে Firebase এ Rules "Publish" হয়েছে কিনা দেখুন।</div><div class="hint">আপনার UID (চেপে ধরে কপি করুন):</div><div style="word-break:break-all;user-select:all;font-family:monospace;background:#f3f5f1;border-radius:10px;padding:8px">${esc(m.u.uid)}</div></div>
    <div class="cx"><b>আপনি অ্যাপের মালিক হলে (একবারের কাজ)</b><ol style="padding-left:20px;font-size:14px;line-height:1.7;margin:6px 0">
    <li>Firebase Console এ Firestore Database → Data খুলুন।</li><li><b>Start collection</b> চাপুন, Collection ID লিখুন: <b>admins</b></li>
    <li>Document ID তে উপরের UID বসান।</li><li>ফিল্ড নাম <b>role</b>, ধরন string, মান <b>owner</b> দিয়ে Save করুন।</li>
    <li>অ্যাপে ফিরে এই পাতা আবার খুলুন।</li></ol></div>
    <button class="btn" onclick="adminPage()">🔄 আবার দেখুন</button>
    <div class="warn">অন্য কেউ অ্যাডমিন হতে চাইলে তার UID মালিককে পাঠাবেন, অথবা মালিক "অ্যাডমিন" ট্যাব থেকে তার মোবাইল নম্বর দিয়ে যোগ করবেন।</div>`);
  const tabs = [['pub', '✍️ নতুন'], ['list', '📚 সব কনটেন্ট'], ['set', '🎨 রং ও পরিচয়'], ['lay', '🧩 সাজানো'], ['qg', '🤖 প্রশ্ন বানান'], ['hid', '🙈 লুকানো'], ['ads', '📣 বিজ্ঞাপন ও খবর'], ['contact', '📞 যোগাযোগ'], ['rep', '🚩 রিপোর্ট'], ['stat', '📊 পরিসংখ্যান'], ['ord', '📨 অর্ডার ও PDF'], ['jads', '💼 জব বিজ্ঞাপন'], ['circ', '📢 বিজ্ঞপ্তি'], ['inbox', '📥 ইনবক্স'], ['mkr', '🛠️ মেকার ভাই'], ['adm', '👥 অ্যাডমিন']];
  const bar = `<div class="seg">${tabs.map(t => `<button class="${sec === t[0] ? 'on' : ''}" onclick="adminPage('${t[0]}')">${t[1]}</button>`).join('')}</div>`;
  try {
    let h = '';
    if (sec === 'pub') {
      _picked = '';
      let e = null; _fbk = []; _fqz = [];
      if (editId) { const all = await sList(m.f, ['content'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(200)); _acache.content = all.map(mapRow); e = _acache.content.find(x => x.id === editId) || null; }
      if (e && e.blocks) _fbk = JSON.parse(JSON.stringify(e.blocks));
      if (e && e.qz) _fqz = JSON.parse(JSON.stringify(e.qz));
      const j = (e && e.job) || {}; const ty = (e && e.type) || _presetType || 'notice'; const pre = (e && e.parent) || _presetParent || ''; _presetType = ''; _presetParent = ''; window._grpFor = _presetGrp || ''; _presetGrp = '';
      h = `<div class="cx"><b>${e ? '✏️ সম্পাদনা' : '✍️ নতুন কনটেন্ট'}</b>
        <select class="inp" id="ad_t" onchange="adToggle()" ${e ? 'disabled' : ''}>${TYPE_SEL.map(k => `<option value="${k}" ${ty === k ? 'selected' : ''}>${TYPE_LBL[k]}</option>`).join('')}</select>
        <div class="hint" id="ad_help"></div>
        <div class="fsh" id="adg_h1">① কোথায় বসবে</div><div id="adg_parent"><div class="hint" style="margin:0 0 4px">কোথায় বসবে (কোন আইকন বা পাতার ভিতরে)</div><select class="inp" id="ad_parent">${parentOpts(pre, e && e.id)}</select>
          <div class="hint" style="margin:6px 0 4px">অথবা <b>নিজে নাম লিখুন</b> (তালিকায় না থাকলে — ওই নামে নতুন আইকন নিজে থেকে তৈরি হবে, যেমন: মেঘনা পরিবহন নিয়োগ)</div><input class="inp" id="ad_newparent" maxlength="60" placeholder="নতুন জায়গার নাম (ঐচ্ছিক)"></div>
        <div class="fsh" id="adg_h2">② শিরোনাম ও লেখা</div><div id="adg_title"><input class="inp" id="ad_title" placeholder="শিরোনাম" value="${esc((e && e.title) || '')}"></div>
        <div id="adg_titleEn"><input class="inp" id="ad_titleEn" placeholder="ইংরেজি শিরোনাম (ঐচ্ছিক)" value="${esc((e && e.titleEn) || '')}"></div>
        <div id="adg_sub"><input class="inp" id="ad_sub" placeholder="ছোট বর্ণনা (আইকনের নিচে বা পাতার উপরে দেখাবে)" value="${esc((e && e.sub) || '')}"></div>
        <div id="adg_body">${bodyTools()}<textarea class="inp" id="ad_body" rows="10" placeholder="লেখা / বিবরণ (বড় লেখাও দিতে পারেন)">${esc((e && e.body) || '')}</textarea><div class="hint">সাজানোর নিয়ম: <b># বড় শিরোনাম</b> • <b>## মাঝারি শিরোনাম</b> • <b>- তালিকার লেখা</b> • <b>**মোটা লেখা**</b></div></div>
        <div id="adg_qb">${qbBox()}</div>
        <div id="adg_exp"><div class="hint" style="margin:0 0 4px">⏳ মেয়াদ শেষের তারিখ (এরপর নিজে সরে যাবে, ঐচ্ছিক)</div><input class="inp" type="date" id="ad_exp" value="${esc((e && e.exp) || '')}"></div>
        <div id="adg_bodyEn"><textarea class="inp" id="ad_bodyEn" rows="6" placeholder="ইংরেজি লেখা (ঐচ্ছিক)">${esc((e && e.bodyEn) || '')}</textarea></div>
        <div id="adg_lang"><select class="inp" id="ad_lang">${[['auto', 'অ্যাপের ভাষা অনুযায়ী দেখাবে'], ['bn', 'শুধু বাংলা'], ['en', 'শুধু ইংরেজি'], ['both', 'বাংলা ও ইংরেজি দুটোই একসাথে']].map(x => `<option value="${x[0]}" ${((e && e.lang) || 'auto') === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
        <div class="fsh" id="adg_h3">③ রং, আইকন ও সাজ</div>
        <div id="adg_color"><div class="hint" style="margin:0 0 4px">পাতার রং</div><div class="rowline"><input type="color" id="ad_color" value="${esc((e && e.color) || '#0369a1')}" style="width:56px;height:40px;border:0;background:none;padding:0"><label><input type="checkbox" id="ad_nocolor" ${e && !e.color ? 'checked' : ''}>রং ছাড়া (সাধারণ)</label></div></div>
        <div id="adg_ic"><input class="inp" id="ad_ic" maxlength="4" placeholder="আইকন (একটি ইমোজি, যেমন 🚕)" value="${esc((e && e.ic) || '')}"></div>
        <div id="adg_ord"><input class="inp" id="ad_ord" type="number" placeholder="ক্রম নম্বর (ছোট নম্বর আগে, যেমন ১, ২, ৩)" value="${e && e.ord ? e.ord : ''}"></div>
        <div id="adg_pd"><div class="hint" style="margin:0 0 4px">📅 তারিখ (পুরনো পত্রিকা তারিখ দিয়ে খোঁজার জন্য, ঐচ্ছিক)</div><input class="inp" type="date" id="ad_pd" value="${esc((e && e.pd) || '')}"></div>
        <div id="adg_credit"><input class="inp" id="ad_credit" maxlength="80" placeholder="✍️ নাম / ক্রেডিট (ফাঁকা রাখলে পাতায় দেখাবে না)" value="${esc((e && e.credit) || '')}"></div>
        <div class="fsh" id="adg_h4">④ ছবি, ভিডিও ও ফাইল</div>
        <div id="adg_bk"><button type="button" class="btn sm" onclick="bkForm()">🧩 ছবি / ভিডিও / PDF / লিংক ব্লক (<span id="bk_n">${bn(((e && e.blocks) || []).length)}</span>টি)</button></div>
        <div id="adg_img"><div class="hint" style="margin:0 0 4px">ছবি (গ্যালারি থেকে বাছুন, নিজে ছোট হয়ে যাবে)</div>${e && okImg(e.img) ? `<img id="ad_imgprev" src="${e.img}" style="max-width:100%;border-radius:12px;margin-bottom:6px"><label style="display:block;margin:4px 0"><input type="checkbox" id="ad_imgdel">ছবিটি সরান</label>` : '<img id="ad_imgprev" style="display:none;max-width:100%;border-radius:12px;margin-bottom:6px">'}<input type="file" id="ad_img" accept="image/*" onchange="adPick(this)"></div>
        <div id="adg_quiz"><input class="inp" id="ad_q1" placeholder="উত্তর ১" value="${esc(((e && e.quiz && e.quiz.o) || [])[0] || '')}"><input class="inp" id="ad_q2" placeholder="উত্তর ২" value="${esc(((e && e.quiz && e.quiz.o) || [])[1] || '')}"><input class="inp" id="ad_q3" placeholder="উত্তর ৩" value="${esc(((e && e.quiz && e.quiz.o) || [])[2] || '')}"><input class="inp" id="ad_q4" placeholder="উত্তর ৪" value="${esc(((e && e.quiz && e.quiz.o) || [])[3] || '')}"><select class="inp" id="ad_qa">${[0, 1, 2, 3].map(i => `<option value="${i}" ${e && e.quiz && +e.quiz.a === i ? 'selected' : ''}>সঠিক উত্তর: ${i + 1} নম্বর</option>`).join('')}</select><input class="inp" id="ad_qe" placeholder="ব্যাখ্যা (ঐচ্ছিক, উত্তর দেওয়ার পর দেখাবে)" value="${esc((e && e.quiz && e.quiz.e) || '')}">
          ${e ? '' : `<div class="hint" style="margin-top:10px"><b>একসাথে অনেক প্রশ্ন দিতে</b> নিচের ঘরে প্রতি লাইনে একটি প্রশ্ন লিখুন (উপরের ঘরগুলো ফাঁকা রাখুন):<br>প্রশ্ন | উত্তর১ | উত্তর২ | উত্তর৩ | উত্তর৪ | সঠিক নম্বর | ব্যাখ্যা<br><span style="color:#6b7280">উদাহরণ: লাল বাতিতে কী করবেন? | থামবেন | যাবেন | হর্ন দেবেন | ধীরে যাবেন | ১ | লাল মানে থামা</span></div><textarea class="inp" id="ad_bulk" rows="6" placeholder="প্রশ্ন | উত্তর১ | উত্তর২ | উত্তর৩ | উত্তর৪ | সঠিক নম্বর | ব্যাখ্যা"></textarea><button type="button" class="btn sm" style="background:#475569" onclick="bulkCheck('ad_bulk')">👁️ আগে যাচাই করুন</button>`}</div>
        <div id="adg_url"><input class="inp" id="ad_url" placeholder="লিংক (YouTube, ভিডিও, অডিও, ছবি বা ওয়েবসাইট)" value="${esc((e && e.url) || '')}"></div>
        <div id="adg_mt"><select class="inp" id="ad_mt"><option value="none">লিংকটি বাটন হিসেবে দেখান</option>${['video', 'audio', 'image', 'pdf'].map(k => `<option value="${k}" ${e && e.mt === k ? 'selected' : ''}>লিংকটি ${{video: 'ভিডিও', audio: 'অডিও', image: 'ছবি', pdf: 'PDF (বাটন)'}[k]} হিসেবে চালান</option>`).join('')}</select></div>
        <div id="adg_pin"><label style="display:block;margin:6px 0"><input type="checkbox" id="ad_pin" ${e && e.pin ? 'checked' : ''}>হোম পাতায় পিন করুন</label></div>
        <div id="adg_job"><input class="inp" id="ad_c" placeholder="কোম্পানি" value="${esc(j.c || '')}"><input class="inp" id="ad_s" placeholder="বেতন" value="${esc(j.s || '')}"><input class="inp" id="ad_lic" placeholder="লাইসেন্স" value="${esc(j.lic || '')}"><input class="inp" id="ad_loc" placeholder="লোকেশন" value="${esc(j.loc || '')}"><input class="inp" id="ad_dl" type="date" value="${esc(j.deadline || '')}"><input class="inp" id="ad_ph" placeholder="ফোন" value="${esc(j.phone || '')}"><select class="inp" id="ad_kind"><option value="local" ${j.kind !== 'foreign' ? 'selected' : ''}>দেশি চাকরি</option><option value="foreign" ${j.kind === 'foreign' ? 'selected' : ''}>বিদেশি চাকরি</option></select></div>
        <label style="display:block;margin:8px 0"><input type="checkbox" id="ad_pub" ${!e || e.pub ? 'checked' : ''}>প্রকাশিত (টিক না থাকলে অ্যাপে লুকানো থাকবে)</label>
        <div id="ad_msg" class="warn" style="display:none"></div>
        <button class="btn" onclick="adSave('${esc(editId)}')">${e ? '💾 আপডেট করুন' : '🚀 প্রকাশ করুন'}</button></div>`;
    } else if (sec === 'list') {
      const all = await sList(m.f, ['content'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(200)); _acache.content = all.map(mapRow);
      h = _acache.content.filter(c => !['contact', 'config', 'ad', 'ticker'].includes(c.type)).length ? _acache.content.map((c, i) => ['contact', 'config', 'ad', 'ticker'].includes(c.type) ? '' : `<div class="cx"><div class="rowline"><span class="tag" style="background:#b45309">${TYPE_LBL[c.type] || c.type}</span>${c.pub ? '' : '<span class="tag">লুকানো</span>'}${c.pin ? '<span class="tag" style="background:#0369a1">📌 পিন</span>' : ''}</div>
        <b style="margin-top:6px">${esc(c.title || (c.body || '').slice(0, 50))}</b><div class="hint">${sdate(c.at)}</div>
        <button class="btn sm" onclick="adminPage('pub','${esc(c.id)}')">✏️ সম্পাদনা</button><button class="btn sm" style="background:#475569" onclick="adHide(${i})">${c.pub ? '🙈 লুকান' : '👁️ দেখান'}</button><button class="btn sm" style="background:#dc2626" onclick="adDel('${esc(c.id)}')">🗑️ মুছুন</button></div>`).join('') : sEmpty('📭', 'কিছু প্রকাশ করা হয়নি। "নতুন" ট্যাব থেকে শুরু করুন।');
    } else if (sec === 'ads') {
      const all = await sList(m.f, ['content'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(500)); _acache.content = all.map(mapRow); h = adsForm();
    } else if (sec === 'hid') {
      h = hidForm();
    } else if (sec === 'qg') {
      const all = await sList(m.f, ['content'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(500)); _acache.content = all.map(mapRow); h = qgForm();
    } else if (sec === 'lay') {
      layInit(); h = layForm();
    } else if (sec === 'set') {
      h = settingsForm();
    } else if (sec === 'contact') {
      const k = contactData();
      h = `<div class="cx"><b>📞 যোগাযোগ পাতার তথ্য</b><div class="hint">ব্যবহারকারীরা "যোগাযোগ" আইকনে চাপলে এগুলো দেখবে। লিংক বা নম্বর পেস্ট করুন, খালি রাখলে ওই বাটন দেখাবে না।</div>
        <input class="inp" id="ct_name" placeholder="নাম" value="${esc(k.name)}">
        <input class="inp" id="ct_role" placeholder="পদ ও প্রতিষ্ঠান" value="${esc(k.role)}">
        <textarea class="inp" id="ct_about" rows="2" placeholder="ছোট পরিচয় বা বার্তা (ঐচ্ছিক)">${esc(k.about)}</textarea>
        <input class="inp" id="ct_fb" placeholder="ফেসবুক লিংক (যেমন https://facebook.com/...)" value="${esc(k.fb)}">
        <input class="inp" id="ct_wa" placeholder="হোয়াটসঅ্যাপ নম্বর (যেমন 017XXXXXXXX) বা wa.me লিংক" value="${esc(k.wa)}">
        <input class="inp" id="ct_mail" placeholder="জিমেইল (যেমন name@gmail.com)" value="${esc(k.mail)}">
        <input class="inp" id="ct_phone" placeholder="ফোন নম্বর (ঐচ্ছিক)" value="${esc(k.phone)}">
        <input class="inp" id="ct_x1n" placeholder="অতিরিক্ত লিংকের নাম (যেমন ইউটিউব, ওয়েবসাইট)" value="${esc(k.x1n)}">
        <input class="inp" id="ct_x1" placeholder="অতিরিক্ত লিংক (https://...)" value="${esc(k.x1)}">
        <div id="ad_msg" class="warn" style="display:none"></div>
        <button class="btn" onclick="adContactSave()">💾 সেভ করুন</button> <button class="btn sm" style="background:#475569" onclick="open_('contact')">👁️ দেখে নিন</button></div>`;
    } else if (sec === 'rep') {
      const rows = await sList(m.f, ['reports'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(50)); _acache.reports = rows;
      h = rows.length ? rows.map((r, i) => `<div class="cx"><div style="white-space:pre-line">${esc(r.postText || '')}</div><div class="hint" style="color:#b45309">কারণ: ${esc(r.why || '')}</div>
        <button class="btn sm" style="background:#dc2626" onclick="repAct(${i},'post')">🗑️ পোস্ট মুছুন</button><button class="btn sm" style="background:#7f1d1d" onclick="repAct(${i},'ban')">🚫 ব্যবহারকারী বন্ধ</button><button class="btn sm" style="background:#64748b" onclick="repAct(${i},'dismiss')">বাতিল</button></div>`).join('') : sEmpty('✅', 'কোনো রিপোর্ট নেই।');
    } else if (sec === 'stat') {
      h = await statView(m);
    } else if (sec === 'ord') {
      h = await orderAdminView(m);
    } else if (sec === 'circ') {
      h = await circAdminView(m);
    } else if (sec === 'inbox') {
      h = await inboxHtml(m);
    } else if (sec === 'jads') {
      h = await jadAdminView(m);
    } else if (sec === 'mkr') {
      h = await mkAdminView(m);
    } else if (sec === 'adm') {
      const rows = await sList(m.f, ['admins']); _acache.admins = rows;
      h = rows.map((a, i) => `<div class="cx"><div class="rowline"><div class="av">${esc(initial(a.name || a.id))}</div><div><b style="display:inline">${esc(a.name || a.id)}</b><br><span class="tag" style="background:${a.role === 'owner' ? '#b45309' : '#0369a1'}">${a.role === 'owner' ? 'মালিক' : 'অ্যাডমিন'}</span></div></div>${(role === 'owner' && a.id !== m.u.uid) ? `<button class="btn sm" style="background:#dc2626;margin-top:8px" onclick="admRemove(${i})">সরান</button>` : ''}</div>`).join('') +
        (role === 'owner' ? `<div class="cx"><b>➕ নতুন অ্যাডমিন যোগ</b><div class="hint">যাকে যোগ করবেন, তাকে আগে অ্যাপে অ্যাকাউন্ট খুলে লগইন করতে হবে। তার মোবাইল নম্বর বা ইমেইল দিন।</div>
          <input class="inp" id="adm_id" placeholder="মোবাইল নম্বর বা ইমেইল"><div id="ad_msg" class="warn" style="display:none"></div><button class="btn sm" onclick="admAdd()">যোগ করুন</button></div>` : '<div class="warn">নতুন অ্যাডমিন যোগ বা সরাতে পারেন শুধু মালিক।</div>');
    }
    sbody(bar + h); if (sec === 'pub') adToggle();
  } catch (e) { sbody(bar + sErr(e)); }
}
function adMsg(t) { const b = document.getElementById('ad_msg'); if (b) { b.style.display = 'block'; b.textContent = t; } }
async function adUpload(m) {
  const fi = document.getElementById('ad_file'); const file = fi && fi.files && fi.files[0]; if (!file) return '';
  if (file.size > 50 * 1024 * 1024) throw {message: 'ফাইল ৫০ মেগাবাইটের বেশি।'};
  const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
  const S = window.__ST_MOCK || await import(base + 'firebase-storage.js');
  const st = S.getStorage(m.f.app); const safe = file.name.replace(/[^\w.\-]/g, '_');
  const ref = S.ref(st, 'content/' + Date.now() + '_' + safe); adMsg('⏳ আপলোড হচ্ছে...');
  await S.uploadBytes(ref, file); return await S.getDownloadURL(ref);
}
async function adSave(editId) {
  const m = await sme(); if (!m) return; const type = editId ? ((_acache.content.find(x => x.id === editId) || {}).type || gv('ad_t')) : gv('ad_t'); const vis = AD_VIS[type] || [];
  if (vis.includes('title') && !gv('ad_title') && !gv('ad_titleEn') && !(type === 'quiz' && gv('ad_bulk'))) return adMsg('শিরোনাম দিন।');
  if (type === 'tip' && !gv('ad_body')) return adMsg('টিপসের লেখা দিন।');
  try {
    adMsg('⏳ সেভ হচ্ছে...'); let url = vis.includes('url') ? gv('ad_url') : ''; const up = await adUpload(m); if (up) url = up;
    if (url && !safeUrl(url)) return adMsg('লিংকটি ঠিক নয়। যেমন: https://example.com বা www.example.com');
    const d = {type, title: vis.includes('title') ? gv('ad_title').slice(0, 150) : '', body: gv('ad_body').slice(0, 20000), url, pub: chk('ad_pub'), by: m.u.uid};
    if (vis.includes('qb')) { if (JSON.stringify(_fqz).length > 880000) return adMsg('প্রশ্ন বেশি হয়ে গেছে। কিছু কমান বা আলাদা অধ্যায়ে দিন।'); d.qz = _fqz; }
    if (vis.includes('img')) { const old = editId ? ((_acache.content.find(x => x.id === editId) || {}).img || '') : ''; d.img = _picked || (chk('ad_imgdel') ? '' : old); }
    if (type === 'quiz') {
      const bulk = gv('ad_bulk');
      if (!editId && bulk) {
        const rows = parseQuizBulk(bulk); if (!rows.length) return adMsg('কোনো প্রশ্ন বোঝা যায়নি। প্রতি লাইনে: প্রশ্ন | উত্তর১ | উত্তর২ | ... | সঠিক নম্বর');
        if (rows.length > 100) return adMsg('একবারে সর্বোচ্চ ১০০টি প্রশ্ন দিন।');
        for (const r of rows) await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), {type: 'quiz', title: r.q, body: '', url: '', pub: chk('ad_pub'), by: m.u.uid, quiz: {o: r.o, a: r.a, e: r.e}, createdAt: m.f.F.serverTimestamp()});
        await refreshContent(); return adminPage('list');
      }
      const o = [1, 2, 3, 4].map(n => gv('ad_q' + n)).filter(Boolean); const a = +gv('ad_qa') || 0; if (o.length < 2) return adMsg('কমপক্ষে দুটি উত্তর দিন।'); if (!gv('ad_q' + (a + 1))) return adMsg('সঠিক উত্তরের ঘরটি ফাঁকা।'); d.quiz = {o: [1, 2, 3, 4].map(n => gv('ad_q' + n)), a, e: gv('ad_qe').slice(0, 400)};
    }
    if (type === 'section') { d.sub = gv('ad_sub').slice(0, 120); d.ic = Array.from(gv('ad_ic') || '📌').slice(0, 2).join(''); d.mt = gv('ad_mt') || 'none'; }
    if (type === 'notice') { d.pin = chk('ad_pin'); d.exp = gv('ad_exp'); }
    if (type === 'node') {
      d.parent = gv('ad_parent'); const np = gv('ad_newparent');
      if (np && !editId) { const ex = (_acache.content || []).find(c => c.type === 'section' && (c.title || '').trim() === np); if (ex) d.parent = 'sec_' + ex.id; else { const rf = await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), {type: 'section', title: np, sub: '', body: '', ic: '📌', mt: 'none', url: '', pub: true, by: m.u.uid, createdAt: m.f.F.serverTimestamp()}); d.parent = 'sec_' + rf.id; } }
      else if (np && editId) { const rf = await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), {type: 'section', title: np, sub: '', body: '', ic: '📌', mt: 'none', url: '', pub: true, by: m.u.uid, createdAt: m.f.F.serverTimestamp()}); d.parent = 'sec_' + rf.id; }
      if (!d.parent) return adMsg('কোথায় বসবে তা বেছে নিন বা নাম লিখুন।');
      d.titleEn = gv('ad_titleEn').slice(0, 150); d.bodyEn = gv('ad_bodyEn').slice(0, 20000); d.lang = gv('ad_lang') || 'auto';
      if (JSON.stringify(_fqz).length > 880000) return adMsg('প্রশ্ন বেশি হয়ে গেছে। কিছু কমান বা আলাদা অধ্যায়ে দিন।'); d.qz = vis.includes('qb') ? _fqz : []; d.blocks = _fbk; d.pd = gv('ad_pd'); d.credit = gv('ad_credit').slice(0, 80); d.color = chk('ad_nocolor') ? '' : gv('ad_color'); d.ord = +gv('ad_ord') || 0; d.ic = Array.from(gv('ad_ic') || '').slice(0, 2).join(''); d.mt = gv('ad_mt') || 'none';
    }
    if (type === 'job') d.job = {c: gv('ad_c'), s: gv('ad_s'), lic: gv('ad_lic'), loc: gv('ad_loc'), deadline: gv('ad_dl'), phone: gv('ad_ph'), kind: gv('ad_kind') || 'local', url};
    if (editId) await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', editId), d, {merge: true});
    else { d.createdAt = m.f.F.serverTimestamp(); const ref = await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), d); if (type === 'section' && window._grpFor && ref && ref.id) { await grpPlace(ref.id, window._grpFor); } window._grpFor = ''; }
    await refreshContent();
    if (type === 'node' && d.parent) { rebuildStack(d.parent); return reopenKey(d.parent); }
    adminPage('list');
  } catch (e) { adMsg('⚠️ ' + ((e && e.code === 'permission-denied') ? 'অনুমতি নেই।' : (e && e.message) || 'সেভ হয়নি।')); }
}
async function adHide(i) {
  const c = _acache.content[i]; if (!c) return; const m = await sme();
  try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', c.id), {pub: !c.pub}, {merge: true}); await refreshContent(); adminPage('list'); } catch (e) { alert('বদলানো যায়নি।'); }
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


// ---------- যোগাযোগ পাতা ----------
const CONTACT_DEF = {name: 'নজরুল ইসলাম', role: 'জিএসসি অপারেটর, বিমান বাংলাদেশ এয়ারলাইন্স', about: 'এই অ্যাপের নির্মাতা। কোনো প্রশ্ন, পরামর্শ বা সমস্যা থাকলে জানাতে পারেন।', fb: '', wa: '', mail: '', phone: '', x1n: '', x1: ''};
function contactData() {
  const c = ADMIN_CONTENT.find(x => x.type === 'contact'); const k = (c && c.contact) || {};
  const o = Object.assign({}, CONTACT_DEF);
  Object.keys(CONTACT_DEF).forEach(f => { if (k[f] !== undefined && k[f] !== null) o[f] = k[f]; });
  if (c && c.title) o.name = c.title; if (c && c.body) o.role = c.body;
  return o;
}
function ctDigits(v) { let d = String(v || '').replace(/[০-৯]/g, ch => '০১২৩৪৫৬৭৮৯'.indexOf(ch)).replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = '88' + d; return d; }
const ctFb = v => { v = String(v || '').trim(); if (!v) return ''; if (/^https?:\/\//i.test(v)) return v; if (/^(www\.)?(facebook|fb)\.com/i.test(v)) return 'https://' + v; return /^[\w.\-]+$/.test(v.replace(/^@/, '')) ? 'https://facebook.com/' + v.replace(/^@/, '') : ''; };
const ctWa = v => { v = String(v || '').trim(); if (!v) return ''; if (/^https?:\/\//i.test(v)) return v; const d = ctDigits(v); return d.length >= 10 ? 'https://wa.me/' + d : ''; };
const ctMail = v => { v = String(v || '').trim().replace(/^mailto:/i, ''); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'mailto:' + v : ''; };
const ctTel = v => { const d = String(v || '').replace(/[০-৯]/g, ch => '০১২৩৪৫৬৭৮৯'.indexOf(ch)).replace(/[^\d+]/g, ''); return d.length >= 6 ? 'tel:' + d : ''; };
function contactPage() {
  tab = 'profile'; const k = contactData();
  const btn = (href, ic, label, col) => href ? `<a class="btn" style="display:flex;align-items:center;gap:10px;background:${col};text-decoration:none;margin:10px 0;padding:13px 18px" href="${esc(href)}" target="_blank" rel="noopener" onclick="goUrl(this.getAttribute('href'));return false"><span style="font-size:22px">${ic}</span>${esc(label)}</a>` : '';
  const links = btn(ctFb(k.fb), '📘', 'ফেসবুকে মেসেজ / প্রোফাইল', '#1877f2') + btn(ctWa(k.wa), '💬', 'হোয়াটসঅ্যাপে মেসেজ', '#128c4a') + btn(ctMail(k.mail), '✉️', 'জিমেইলে লিখুন', '#d93025') + btn(ctTel(k.phone), '📞', 'ফোনে কল করুন', '#0b6e4f') + btn(safeUrl(k.x1), '🔗', k.x1n || 'আরও লিংক', '#475569');
  render(pageHead('যোগাযোগ') + hero('📞', 'যোগাযোগ', 'প্রশ্ন, পরামর্শ বা সমস্যা জানান') + `<div class="pad"><div class="cx" style="text-align:center;border-left:0;border-top:5px solid #ffc20e">
    <div class="av" style="width:72px;height:72px;font-size:32px;margin:4px auto 10px">${esc(initial(k.name))}</div>
    <div style="font-size:12.5px;color:#6b726c">অ্যাপ নির্মাতা</div><div style="font-size:20px;font-weight:800;margin:2px 0">${esc(k.name)}</div>
    <div style="font-size:14.5px;font-weight:600;color:#006a4e;line-height:1.5">${esc(k.role)}</div>
    ${k.about ? `<div class="hint" style="margin-top:10px">${esc(k.about)}</div>` : ''}</div>` +
    (links ? `<div class="cx" style="border-left-color:#ffc20e">${links}</div>` : '<div class="warn">যোগাযোগের লিংক শীঘ্রই যোগ করা হবে।</div>') +
    (isAdminFlag() ? `<button class="btn sm" style="background:#b45309" onclick="push(()=>contactPage());adminPage('contact')">✏️ লিংক বদলান (অ্যাডমিন)</button>` : '') + '</div>');
}
async function adContactSave() {
  const m = await sme(); if (!m) return;
  const o = {}; ['name', 'role', 'about', 'fb', 'wa', 'mail', 'phone', 'x1n', 'x1'].forEach(f => { o[f] = gv('ct_' + f).slice(0, 300); });
  if (o.fb && !ctFb(o.fb)) return adMsg('ফেসবুক লিংকটি ঠিক নয়।');
  if (o.wa && !ctWa(o.wa)) return adMsg('হোয়াটসঅ্যাপ নম্বর ঠিক নয়।');
  if (o.mail && !ctMail(o.mail)) return adMsg('জিমেইল ঠিকানা ঠিক নয়।');
  if (o.x1 && !safeUrl(o.x1)) return adMsg('অতিরিক্ত লিংকটি ঠিক নয়।');
  try {
    adMsg('⏳ সেভ হচ্ছে...');
    await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'contact'), {type: 'contact', title: o.name, body: o.role, pub: true, by: m.u.uid, createdAt: m.f.F.serverTimestamp(), contact: o});
    await refreshContent(); adMsg('✅ সেভ হয়েছে।');
  } catch (e) { adMsg('⚠️ ' + ((e && e.code === 'permission-denied') ? 'অনুমতি নেই।' : 'সেভ হয়নি। ইন্টারনেট দেখুন।')); }
}

// ---------- ছবি ছোট করে ডেটাতে রাখা (Storage ছাড়াই, বিনামূল্যের প্ল্যানে চলে) ----------
const okImg = u => typeof u === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(u) && u.length < 1000000;
function imgToData(file, maxPx, png) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('ছবি পড়া যায়নি'));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error('এটি ছবি নয়'));
      im.onload = () => {
        let px = maxPx, q = png ? 0.9 : 0.78, out = '';
        for (let i = 0; i < 5; i++) {
          const k = Math.min(1, px / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
          const g = c.getContext('2d'); if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
          g.drawImage(im, 0, 0, c.width, c.height);
          out = c.toDataURL(png ? 'image/png' : 'image/jpeg', q);
          if (out.length < (png ? 150000 : 650000)) return res(out);
          px = Math.round(px * 0.75); q = Math.max(0.5, q - 0.08);
        }
        rej(new Error('ছবিটি অনেক বড়। ছোট ছবি বাছুন।'));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
async function adPick(inp) {
  const f = inp.files && inp.files[0]; if (!f) return; adMsg('⏳ ছবি ছোট করা হচ্ছে...');
  try {
    _picked = await imgToData(f, 1000, false);
    const p = document.getElementById('ad_imgprev'); if (p) { p.src = _picked; p.style.display = 'block'; }
    adMsg('✅ ছবি তৈরি। এবার নিচের বাটন চাপুন।');
  } catch (e) { _picked = ''; adMsg('⚠️ ' + (e.message || 'ছবি নেওয়া যায়নি')); }
}

// ---------- বড় লেখা সাজানো: # শিরোনাম, ## উপশিরোনাম, - তালিকা, **মোটা** ----------
function rich(t) {
  const COLS = {red: '#dc2626', green: '#15803d', blue: '#1d4ed8', orange: '#c2410c', purple: '#7e22ce', grey: '#6b7280'};
  const inl = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\{(red|green|blue|orange|purple|grey):(.+?)\}/g, (m, c, t) => `<span style="color:${COLS[c]};font-weight:700">${t}</span>`).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, t, u) => `<a href="${u}" target="_blank" rel="noopener" onclick="goUrl(this.getAttribute('href'));return false" style="color:var(--p2);font-weight:700;text-decoration:underline">${t}</a>`);
  let out = '', ul = false;
  String(t || '').split('\n').forEach(raw => {
    const l = raw.replace(/\s+$/, '');
    if (/^\s*[-•]\s+/.test(l)) { if (!ul) { out += '<ul style="margin:6px 0;padding-left:22px">'; ul = true; } out += '<li style="margin:3px 0">' + inl(l.replace(/^\s*[-•]\s+/, '')) + '</li>'; return; }
    if (ul) { out += '</ul>'; ul = false; }
    if (/^##\s+/.test(l)) out += '<h4 style="margin:12px 0 4px;font-size:16.5px;color:var(--p2)">' + inl(l.replace(/^##\s+/, '')) + '</h4>';
    else if (/^#\s+/.test(l)) out += '<h3 style="margin:14px 0 6px;font-size:19px">' + inl(l.replace(/^#\s+/, '')) + '</h3>';
    else if (!l.trim()) out += '<div style="height:9px"></div>';
    else out += '<div style="line-height:1.7">' + inl(l) + '</div>';
  });
  return out + (ul ? '</ul>' : '');
}

// ---------- অ্যাপের নাম, লোগো, রং ও আইকন (অ্যাডমিন বদলাতে পারে) ----------
const CFG_DEF = {name: 'আমার ভাই', sub: 'লাইসেন্স • চাকরি • খাতা • মেস', ic: '🛞', logo: '', c1: '#006a4e', pg: '#f4f5f1', cd: '#ffffff', tx: '#1a1a1a', bism: true, tiles: {}, layout: null, hidden: null, edits: null, pdfDef: true, pdfOff: null, pdfOn: null, daily: null, ntc: null, jobAuto: false, mkOn: true, mkReg: true, mkJobs: null, mkVil: null, hubs: null, seedHide: null};
function APPCFG() {
  const c = ADMIN_CONTENT.find(x => x.type === 'config'); const k = (c && c.cfg) || {};
  const o = Object.assign({}, CFG_DEF); Object.keys(CFG_DEF).forEach(f => { if (k[f] !== undefined && k[f] !== null && k[f] !== '') o[f] = k[f]; });
  if (c && okImg(c.img)) o.logo = c.img;
  if (o.name === 'চালক ভাই') o.name = 'আমার ভাই'; if (o.sub === 'শেখা • কাগজপত্র • চাকরি') o.sub = 'লাইসেন্স • চাকরি • খাতা • মেস';
  return o;
}
const appName = () => APPCFG().name;
const appSub = () => APPCFG().sub;
function appLogoHtml() { const c = APPCFG(); return `<span class="logo">${okImg(c.logo) ? `<img src="${c.logo}" alt="">` : esc(c.ic)}</span>`; }
const tileOv = id => { const t = APPCFG().tiles; return (t && t[id]) || {}; };
function hexMix(h, to, t) {
  const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const a = p(h), b = p(to);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function applyTheme() {
  try {
    const c = APPCFG(); const r = document.documentElement.style; let c1 = /^#[0-9a-fA-F]{6}$/.test(c.c1) ? c.c1 : CFG_DEF.c1; try { const uc = localStorage.getItem('ucolor'); if (uc && /^#[0-9a-fA-F]{6}$/.test(uc)) c1 = uc; } catch (e) {}
    const hx = (v, d) => /^#[0-9a-fA-F]{6}$/.test(v) ? v : d; r.setProperty('--pg', hx(c.pg, '#f4f5f1')); r.setProperty('--cd', hx(c.cd, '#ffffff')); r.setProperty('--tx', hx(c.tx, '#1a1a1a')); r.setProperty('--p2', c1); r.setProperty('--p1', hexMix(c1, '#000000', 0.22)); r.setProperty('--tint', hexMix(c1, '#ffffff', 0.88)); r.setProperty('--g2', c1); r.setProperty('--g1', hexMix(c1, '#000000', 0.22));
    document.title = c.name; const tm = document.querySelector('meta[name=theme-color]'); if (tm) tm.setAttribute('content', hexMix(c1, '#000000', 0.22));
  } catch (e) {}
}
applyTheme();

const THEMES = [['সবুজ', '#006a4e', '#f4f5f1', '#ffffff', '#fff', '#1a1a1a'], ['নীল', '#0b5ed7', '#eef3fb', '#ffffff', '#fff', '#16202e'], ['বেগুনি', '#6d28d9', '#f5f1fb', '#ffffff', '#fff', '#241a33'], ['লাল', '#b91c1c', '#fbf1f1', '#ffffff', '#fff', '#2b1a1a'], ['কমলা', '#c2410c', '#fbf3ec', '#ffffff', '#fff', '#2d1f14'], ['টিল', '#0f766e', '#eef7f6', '#ffffff', '#fff', '#13292a'], ['গোলাপি', '#be185d', '#fcf0f5', '#ffffff', '#fff', '#2e1823'], ['কালচে', '#1f2937', '#e5e7eb', '#f9fafb', '#fff', '#111827'], ['সোনালি', '#92400e', '#faf5e8', '#fffdf6', '#fff', '#2b2216'], ['আকাশি', '#0284c7', '#edf7fc', '#ffffff', '#fff', '#12283a']];
function cfPreset(i) { const t = THEMES[i]; [['cf_c1', t[1]], ['cf_pg', t[2]], ['cf_cd', t[3]], ['cf_tx', t[5]]].forEach(x => { const e = document.getElementById(x[0]); if (e) e.value = x[1]; }); cfLive(); }
function cfLive() { const g = id => (document.getElementById(id) || {}).value; const r = document.documentElement.style, c1 = g('cf_c1'); if (!c1) return; r.setProperty('--p2', c1); r.setProperty('--p1', hexMix(c1, '#000000', 0.22)); r.setProperty('--tint', hexMix(c1, '#ffffff', 0.88)); r.setProperty('--pg', g('cf_pg')); r.setProperty('--cd', g('cf_cd')); r.setProperty('--tx', g('cf_tx')); }
function settingsForm() {
  const c = APPCFG(); const tiles = typeof homeGroups === 'function' ? homeGroups(true).flatMap(g => g[1]).filter(t => String(t.id).indexOf('sec_') !== 0) : [];
  const quick = typeof QUICK !== 'undefined' ? QUICK.filter(q => !tiles.some(t => t.id === q[0])).map(q => ({id: q[0], name: q[2], ic: q[1]})) : [];
  const all = quick.concat(tiles); const seen = new Set();
  return `<div class="cx"><b>🎨 অ্যাপের পরিচয়</b><div class="hint">নাম, লোগো ও রং বদলালে হোম, মেনু ও শুরুর পর্দা সব জায়গায় বদলে যায়।</div>
    <input class="inp" id="cf_name" placeholder="অ্যাপের নাম" value="${esc(c.name)}">
    <input class="inp" id="cf_sub" placeholder="নামের নিচের ছোট লেখা" value="${esc(c.sub)}">
    <input class="inp" id="cf_ic" maxlength="4" placeholder="লোগো (একটি ইমোজি)" value="${esc(c.ic)}">
    <div class="hint" style="margin:0 0 4px">অথবা নিজের লোগো ছবি (ছবি থাকলে ইমোজির বদলে ওটা দেখাবে)</div>
    ${okImg(c.logo) ? `<img id="cf_prev" src="${c.logo}" style="width:64px;height:64px;border-radius:16px;object-fit:cover;display:block;margin:4px 0"><label style="display:block;margin:4px 0"><input type="checkbox" id="cf_logodel">লোগো ছবিটি সরান</label>` : '<img id="cf_prev" style="display:none;width:64px;height:64px;border-radius:16px;object-fit:cover;margin:4px 0">'}
    <input type="file" id="cf_logo" accept="image/*" onchange="cfPickLogo(this)">
    <div class="hint" style="margin-top:12px">তৈরি রঙের সাজ (একটা চাপলেই পুরো অ্যাপ বদলে যাবে, তারপর সেভ করুন)</div>
    <div class="presets">${THEMES.map((t, i) => `<button onclick="cfPreset(${i})" style="background:linear-gradient(135deg,${t[1]} 50%,${t[3]} 50%)"><span style="color:${t[4]}">${t[0]}</span></button>`).join('')}</div>
    <div class="hint" style="margin-top:12px">নিজের পছন্দের রং</div>
    ${[['cf_c1', 'হেডার, বাটন ও মূল রং', c.c1], ['cf_pg', 'পাতার পেছনের রং', c.pg], ['cf_cd', 'কার্ড ও বাক্সের রং', c.cd], ['cf_tx', 'লেখার রং', c.tx]].map(x => `<div class="rowline" style="margin:6px 0"><input type="color" id="${x[0]}" value="${esc(x[2])}" oninput="cfLive()" style="width:54px;height:40px;border:0;background:none;padding:0"><span>${x[1]}</span></div>`).join('')}
    <label style="display:block;margin:10px 0"><input type="checkbox" id="cf_bism" ${c.bism !== false ? 'checked' : ''}>অ্যাপ খোলার সময় "বিসমিল্লাহির রাহমানির রাহিম" দেখান</label></div></div>
    <div class="cx"><b>🔲 হোমের আইকন</b><div class="hint">যেকোনো আইকনের নাম ও ইমোজি বদলান, বা লুকিয়ে দিন। ফাঁকা রাখলে আগের নামই থাকবে।</div>
    ${all.filter(t => !seen.has(t.id) && seen.add(t.id)).map(t => { const o = (c.tiles || {})[t.id] || {}; return `<div style="display:flex;gap:6px;align-items:center;margin:6px 0" data-tid="${esc(t.id)}"><input class="inp tc_ic" style="width:58px;margin:0;text-align:center" maxlength="4" value="${esc(o.ic || '')}" placeholder="${esc(t.ic)}"><input class="inp tc_nm" style="margin:0;flex:1" value="${esc(o.name || '')}" placeholder="${esc(t.name)}"><label style="font-size:12px;white-space:nowrap"><input type="checkbox" class="tc_hd" ${o.hide ? 'checked' : ''}>লুকান</label></div>`; }).join('')}</div>
    <div id="ad_msg" class="warn" style="display:none"></div>
    <button class="btn" onclick="cfSave()">💾 সেভ করুন</button> <button class="btn sm" style="background:#475569" onclick="cfReset()">↩️ আগের অবস্থায় ফেরান</button>`;
}
async function cfPickLogo(inp) {
  const f = inp.files && inp.files[0]; if (!f) return; adMsg('⏳ লোগো ছোট করা হচ্ছে...');
  try { _logoPicked = await imgToData(f, 200, true); const p = document.getElementById('cf_prev'); if (p) { p.src = _logoPicked; p.style.display = 'block'; } adMsg('✅ লোগো তৈরি। এবার সেভ করুন।'); }
  catch (e) { _logoPicked = null; adMsg('⚠️ ' + (e.message || 'লোগো নেওয়া যায়নি')); }
}
async function cfSave() {
  const m = await sme(); if (!m) return;
  const tiles = {}; document.querySelectorAll('[data-tid]').forEach(r => {
    const o = {}; const ic = r.querySelector('.tc_ic').value.trim(), nm = r.querySelector('.tc_nm').value.trim(), hd = r.querySelector('.tc_hd').checked;
    if (ic) o.ic = Array.from(ic).slice(0, 2).join(''); if (nm) o.name = nm.slice(0, 40); if (hd) o.hide = true;
    if (Object.keys(o).length) tiles[r.getAttribute('data-tid')] = o;
  });
  const prev = ADMIN_CONTENT.find(x => x.type === 'config'); const old = prev && okImg(prev.img) ? prev.img : '';
  const img = _logoPicked || (chk('cf_logodel') ? '' : old);
  const cfg = {name: gv('cf_name').slice(0, 40) || CFG_DEF.name, sub: gv('cf_sub').slice(0, 60), ic: Array.from(gv('cf_ic') || CFG_DEF.ic).slice(0, 2).join(''), c1: gv('cf_c1') || CFG_DEF.c1, pg: gv('cf_pg') || CFG_DEF.pg, cd: gv('cf_cd') || CFG_DEF.cd, tx: gv('cf_tx') || CFG_DEF.tx, bism: chk('cf_bism'), tiles, layout: (prev && prev.cfg && prev.cfg.layout) || null, hidden: (prev && prev.cfg && prev.cfg.hidden) || null, edits: (prev && prev.cfg && prev.cfg.edits) || null, pdfDef: !(prev && prev.cfg && prev.cfg.pdfDef === false), pdfOff: (prev && prev.cfg && prev.cfg.pdfOff) || [], pdfOn: (prev && prev.cfg && prev.cfg.pdfOn) || [], daily: (prev && prev.cfg && prev.cfg.daily) || null, ntc: (prev && prev.cfg && prev.cfg.ntc) || null, jobAuto: !!(prev && prev.cfg && prev.cfg.jobAuto), mkOn: !(prev && prev.cfg && prev.cfg.mkOn === false), mkReg: !(prev && prev.cfg && prev.cfg.mkReg === false), mkJobs: (prev && prev.cfg && prev.cfg.mkJobs) || null, mkVil: (prev && prev.cfg && prev.cfg.mkVil) || null};
  try {
    adMsg('⏳ সেভ হচ্ছে...');
    await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'appconfig'), {type: 'config', title: 'config', pub: true, by: m.u.uid, createdAt: m.f.F.serverTimestamp(), cfg, img});
    _logoPicked = null; await refreshContent(); applyTheme(); adMsg('✅ সেভ হয়েছে। হোমে গিয়ে দেখুন।');
  } catch (e) { adMsg('⚠️ ' + ((e && e.code === 'permission-denied') ? 'অনুমতি নেই।' : 'সেভ হয়নি। ইন্টারনেট দেখুন।')); }
}
async function cfReset() {
  if (!confirm('অ্যাপের নাম, লোগো, রং ও আইকনের সব বদল আগের অবস্থায় ফিরবে। নিশ্চিত?')) return; const m = await sme(); if (!m) return;
  try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'content', 'appconfig')); _logoPicked = null; await refreshContent(); applyTheme(); adminPage('set'); } catch (e) { adMsg('⚠️ হয়নি।'); }
}

// =====================================================================
//  অ্যাডমিন বিল্ডার: যেকোনো আইকন/পাতার ভিতরে অধ্যায়, উপ-অধ্যায়, লিংক, রং, বাংলা-ইংরেজি
// =====================================================================
function pk(bn, en, mode) {
  bn = bn || ''; en = en || '';
  if (mode === 'both') return bn && en ? bn + '\n\n' + en : (bn || en);
  if (mode === 'en') return en || bn;
  if (mode === 'bn') return bn || en;
  return (typeof LANG !== 'undefined' && LANG === 'en' && en) ? en : (bn || en);
}
const nTitle = c => { if (c.lang === 'both' && c.title && c.titleEn) return c.title + ' / ' + c.titleEn; return pk(c.title, c.titleEn, c.lang); };
const nBody = c => pk(c.body, c.bodyEn, c.lang);
const nodeKids = key => ADMIN_CONTENT.filter(c => c.type === 'node' && c.parent === key).sort((a, b) => (a.ord || 0) - (b.ord || 0) || (a.at || 0) - (b.at || 0));
const colOk = c => /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '';
function keyName(k) {
  if (k.indexOf('n_') === 0) { const n = ADMIN_CONTENT.find(c => c.id === k.slice(2)) || _acache.content.find(c => c.id === k.slice(2)); return n ? nTitle(n) : k; }
  if (k.indexOf('sec_') === 0) { const n = ADMIN_CONTENT.find(c => c.id === k.slice(4)) || _acache.content.find(c => c.id === k.slice(4)); return n ? (n.title || k) : k; }
  const t = (typeof homeGroups === 'function' ? homeGroups(true).flatMap(g => g[1]) : []).find(c => c.id === k);
  return t ? ((tileOv(k).name) || (typeof SHORT !== 'undefined' && SHORT[k]) || t.name) : k;
}
function parentOpts(sel, selfId) {
  const rows = _acache.content.length ? _acache.content : ADMIN_CONTENT; const seen = new Set(); let h = '<optgroup label="অ্যাপের আইকন">';
  (typeof homeGroups === 'function' ? homeGroups(true).flatMap(g => g[1]) : []).forEach(t => { if (String(t.id).indexOf('sec_') === 0 || seen.has(t.id)) return; seen.add(t.id); h += `<option value="${esc(t.id)}" ${sel === t.id ? 'selected' : ''}>${esc(keyName(t.id))}</option>`; });
  h += '</optgroup><optgroup label="আপনার বানানো সেকশন">';
  rows.filter(c => c.type === 'section').forEach(c => { h += `<option value="sec_${esc(c.id)}" ${sel === 'sec_' + c.id ? 'selected' : ''}>${esc(c.title || '')}</option>`; });
  h += '</optgroup><optgroup label="আপনার বানানো পাতা (ভিতরে ঢুকবে)">';
  rows.filter(c => c.type === 'node' && c.id !== selfId).forEach(c => { h += `<option value="n_${esc(c.id)}" ${sel === 'n_' + c.id ? 'selected' : ''}>↳ ${esc(nTitle(c))}</option>`; });
  return h + '</optgroup>';
}
function reopenKey(k) {
  if (k.indexOf('n_') === 0) return nodePage(k.slice(2));
  if (k.indexOf('sec_') === 0) return sectionPage(k.slice(4));
  stack.pop(); open_(k);
}
function rebuildStack(key) {
  const anc = []; let k = key;
  while (k.indexOf('n_') === 0) { const n = ADMIN_CONTENT.find(c => c.id === k.slice(2)); if (!n) break; k = n.parent; anc.unshift(k); }
  stack = [() => home()].concat(anc.map(a => () => reopenKey(a)));
}
function nodeGo(id, from) { push(() => reopenKey(from)); nodePage(id); }
function adAddHere(key) { _presetType = 'node'; _presetParent = key; stack.push(() => reopenKey(key)); adminPage('pub'); }
function adEditNode(id) { stack.push(() => nodePage(id)); adminPage('pub', id); }
async function adDelNode(id, key) {
  if (!confirm('এই পাতা মুছবেন? এর ভিতরের পাতাগুলোও আর দেখা যাবে না।')) return; const m = await sme(); if (!m) return;
  try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'content', id)); await refreshContent(); rebuildStack(key); reopenKey(key); } catch (e) { alert('মোছা যায়নি।'); }
}
function nodeCard(c, from) {
  const col = colOk(c.color) || '#0369a1', n = nodeKids('n_' + c.id).length;
  return `<div class="nk" style="border-left-color:${col}" onclick="nodeGo('${esc(c.id)}','${esc(from)}')"><span class="nki" style="background:${col}22;color:${col};${okImg(c.img) ? 'overflow:hidden;padding:0;width:48px;height:60px;border-radius:6px' : ''}">${okImg(c.img) ? `<img src="${c.img}" style="width:100%;height:100%;object-fit:cover">` : ''}${okImg(c.img) ? '' : esc(c.ic || (c.url && !c.body && !c.bodyEn ? '🔗' : '📄'))}</span><div class="nkt"><b>${esc(nTitle(c))}</b>${n ? `<small>${bn(n)}টি বিষয়</small>` : (c.pd ? `<small>📅 ${bnDate(c.pd)}</small>` : '')}</div><span class="nka">›</span></div>` + ((typeof isAdminFlag === 'function' && isAdminFlag()) ? `<div style="margin:-4px 0 8px;text-align:right"><button class="nbtn" style="background:#1d4ed8" onclick="adEditNode('${esc(c.id)}')">✏️ বদলান</button> <button class="nbtn" style="background:#b91c1c" onclick="adDelNode('${esc(c.id)}','${esc(c.parent)}')">🗑️ মুছুন</button></div>` : '');
}
function adminBar(key, c) {
  if (!(typeof isAdminFlag === 'function' && isAdminFlag())) return '';
  return `<div class="adbar"><span>🛡️ অ্যাডমিন</span><button onclick="adAddHere('${esc(key)}')">➕ এখানে নতুন যোগ</button>${c ? `<button onclick="adEditNode('${esc(c.id)}')">✏️ বদলান</button><button style="background:#b91c1c" onclick="adDelNode('${esc(c.id)}','${esc(c.parent)}')">🗑️</button>` : ''}</div>`;
}
function injectKids(key) {
  try {
    if (['quiz', 'roadtest', 'signquiz', 'qorder', 'account', 'lang', 'share', 'cv', 'admin', 'contact', 'board', 'community', 'seeker', 'maker', 'courses'].includes(key)) return;
    const old = document.getElementById('kids'); if (old) old.remove();
    const k = nodeKids(key), adm = adminBar(key, key.indexOf('n_') === 0 ? ADMIN_CONTENT.find(c => c.id === key.slice(2)) : null);
    if (!k.length && !adm) return;
    const host = document.querySelector('#app .page-h') || document.querySelector('#app .hero'); if (!host) return;
    let anchor = host; const hero = host.nextElementSibling; if (hero && hero.classList.contains('hero')) anchor = hero;
    anchor.insertAdjacentHTML('afterend', `<div class="pad" id="kids">${adm}${k.map(c => nodeCard(c, key)).join('')}</div>`);
  } catch (e) {}
}
function nodePage(id) {
  tab = 'home'; const c = ADMIN_CONTENT.find(x => x.id === id);
  if (!c) return render(pageHead('পাতা') + '<div class="pad">' + sEmpty('🔍', 'এই পাতাটি আর নেই।') + '</div>');
  const col = colOk(c.color), key = 'n_' + id, body = nBody(c);
  render(pageHead(nTitle(c)) + `<div class="pad"><div class="cx" ${col ? `style="border-top:5px solid ${col}"` : ''}>${c.ic ? `<div style="font-size:34px">${esc(c.ic)}</div>` : ''}<h3 style="margin:4px 0 8px;${col ? 'color:' + col : ''}">${esc(nTitle(c))}</h3>${mediaHtml(c)}${body ? `<div class="rich" style="margin-top:8px">${rich(body)}</div>` : ''}${linkBtn(c.url)}${body ? speakBtn(body) : ''}</div></div>`);
  injectKids(key);
}
// ক্রমে সাজানো যায় এমন ছোট কার্ড CSS
(function () { const st = document.createElement('style'); st.textContent = `
.nk{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e5e7eb;border-left:6px solid #0369a1;border-radius:14px;padding:12px;margin:9px 0;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.nk:active{transform:scale(.99)}.nki{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex:none}
.nkt{flex:1}.nkt b{display:block;font-size:16px}.nkt small{color:#6b7280}.nka{font-size:22px;color:#9ca3af}
.adbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#fff7ed;border:1.5px dashed #fb923c;border-radius:12px;padding:8px;margin:8px 0;font-size:13px;font-weight:700;color:#9a3412}
.adbar button{border:0;background:#c2410c;color:#fff;border-radius:10px;padding:8px 10px;font:inherit;font-size:13px}
.adtop{margin:10px 12px 0;border-radius:16px;overflow:hidden;position:relative;background:#fff;border:1px solid #e5e7eb;box-shadow:0 4px 14px rgba(0,0,0,.1)}
.adtop img{width:100%;display:block;max-height:240px;object-fit:cover}.adtop .at{padding:12px 14px;font-weight:700;font-size:16px}
.adlbl{position:absolute;top:6px;left:6px;background:rgba(0,0,0,.55);color:#fff;border-radius:8px;font-size:10px;padding:2px 7px}
#bars{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;z-index:70}
.adbot{display:flex;align-items:center;gap:8px;background:#fff;border-top:1px solid #e5e7eb;padding:6px 8px;box-shadow:0 -3px 12px rgba(0,0,0,.08)}
.adbot img{height:42px;width:68px;object-fit:cover;border-radius:8px;flex:none}.adbot span{flex:1;font-size:13px;font-weight:600;line-height:1.3}
.adbot i{font-style:normal;color:#9ca3af;padding:4px 8px;font-size:16px}
.tkr{display:flex;align-items:stretch;background:#111827;color:#fff;overflow:hidden;height:34px}
.tkr b{background:#dc2626;padding:0 12px;display:flex;align-items:center;font-size:13px;flex:none;z-index:2}
.tkr div{flex:1;overflow:hidden;white-space:nowrap;display:flex;align-items:center}
.tkr span{display:inline-block;padding-left:100%;animation:tkm 30s linear infinite;font-size:14px}
@keyframes tkm{to{transform:translateX(-100%)}}
body.dark .nk,body.dark .adbot,body.dark .adtop{background:#1f2937;border-color:#374151}
`; document.head.appendChild(st); })();

// =====================================================================
//  বিজ্ঞাপন (উপরে বড়, নিচে ছোট) ও টিভির মতো খবরের লাইন
// =====================================================================
const adDoc = id => ADMIN_CONTENT.find(c => c.id === id);
let _adBotX = false;
function topAd() {
  const a = adDoc('ad_top'); if (!a || !(okImg(a.img) || a.body)) return '';
  const u = safeUrl(a.url);
  return `<${u ? 'a href="' + esc(u) + '" target="_blank" rel="noopener" onclick="goUrl(this.href);return false"' : 'div'} class="adtop" style="display:block;color:inherit;text-decoration:none"><span class="adlbl" ${okImg(a.img) ? '' : 'style="position:static;display:inline-block;margin:8px 0 0 12px;background:#6b7280"'}>বিজ্ঞাপন</span>${okImg(a.img) ? `<img src="${a.img}" alt="">` : ''}${a.body ? `<div class="at">${esc(a.body)}</div>` : ''}</${u ? 'a' : 'div'}>`;
}
function renderBars() {
  let b = document.getElementById('bars'); if (!b) { b = document.createElement('div'); b.id = 'bars'; document.body.appendChild(b); }
  const a = adDoc('ad_bot'), t = adDoc('ticker'); let h = '';
  if (a && !_adBotX && (okImg(a.img) || a.body)) { const u = safeUrl(a.url); h += `<div class="adbot" ${u ? `onclick="goUrl('${esc(u)}')"` : ''}>${okImg(a.img) ? `<img src="${a.img}" alt="">` : ''}<span>${esc(a.body || '')}<small style="display:block;color:#9ca3af;font-size:10px">বিজ্ঞাপন</small></span><i onclick="event.stopPropagation();_adBotX=true;renderBars()">✕</i></div>`; }
  const lines = t && t.body ? t.body.split('\n').map(x => x.trim()).filter(Boolean) : [];
  if (lines.length) { const txt = lines.join('   ●   '); h += `<div class="tkr"><b>${esc(t.label || 'খবর')}</b><div><span style="animation-duration:${Math.max(14, Math.round(txt.length * 0.32))}s">${esc(txt)}</span></div></div>`; }
  b.innerHTML = h; const ap = document.getElementById('app'); if (ap) ap.style.paddingBottom = ((h ? b.offsetHeight + 14 : 16) + (document.body.classList.contains('ndbar') ? 110 : 0)) + 'px';
}
function adsForm() {
  const g = id => _acache.content.find(c => c.id === id) || {};
  const t = g('ad_top'), bt = g('ad_bot'), tk = g('ticker');
  const blk = (k, title, hint, o) => `<div class="cx"><b>${title}</b><div class="hint">${hint}</div>
    <label style="display:block;margin:6px 0"><input type="checkbox" id="${k}_on" ${o.pub ? 'checked' : ''}>চালু আছে</label>
    <textarea class="inp" id="${k}_tx" rows="2" placeholder="বিজ্ঞাপনের লেখা">${esc(o.body || '')}</textarea>
    <input class="inp" id="${k}_url" placeholder="লিংক (ঐচ্ছিক, https://...)" value="${esc(o.url || '')}">
    ${okImg(o.img) ? `<img id="${k}_prev" src="${o.img}" style="max-width:100%;max-height:120px;border-radius:10px;display:block;margin:6px 0"><label style="display:block"><input type="checkbox" id="${k}_del">ছবি সরান</label>` : `<img id="${k}_prev" style="display:none;max-width:100%;max-height:120px;border-radius:10px;margin:6px 0">`}
    <input type="file" accept="image/*" onchange="adAdPick(this,'${k}')"><button class="btn sm" style="margin-top:8px" onclick="adAdSave('${k}')">💾 সেভ করুন</button></div>`;
  return blk('ad_top', '🖼️ উপরের বড় বিজ্ঞাপন', 'অ্যাপের হোম পাতার একদম উপরে বড় করে দেখাবে। ছবি, লেখা বা দুটোই দিতে পারেন।', t) +
    blk('ad_bot', '📌 নিচের ছোট বিজ্ঞাপন', 'সব পাতার নিচে ছোট্ট একটি লাইনে দেখাবে। ব্যবহারকারী ✕ চাপলে ওই বার বন্ধ হবে।', bt) +
    `<div class="cx"><b>📰 খবরের লাইন (টিভির মতো চলবে)</b><div class="hint">প্রতি লাইনে একটি করে খবর লিখুন। সব খবর নিচে একটানা চলতে থাকবে। যা মন চায় লিখতে পারেন।</div>
    <label style="display:block;margin:6px 0"><input type="checkbox" id="tk_on" ${tk.pub ? 'checked' : ''}>চালু আছে</label>
    <input class="inp" id="tk_label" placeholder="বাঁ পাশের লেবেল (যেমন: খবর, নোটিশ)" value="${esc(tk.label || 'খবর')}">
    <textarea class="inp" id="tk_tx" rows="6" placeholder="একটি লাইনে একটি খবর">${esc(tk.body || '')}</textarea>
    <button class="btn sm" onclick="adTickSave()">💾 সেভ করুন</button></div><div id="ad_msg" class="warn" style="display:none"></div>`;
}
const _adImgs = {};
async function adAdPick(inp, k) {
  const f = inp.files && inp.files[0]; if (!f) return; adMsg('⏳ ছবি ছোট করা হচ্ছে...');
  try { _adImgs[k] = await imgToData(f, 900, false); const p = document.getElementById(k + '_prev'); if (p) { p.src = _adImgs[k]; p.style.display = 'block'; } adMsg('✅ ছবি তৈরি। এবার সেভ করুন।'); } catch (e) { adMsg('⚠️ ' + (e.message || 'ছবি নেওয়া যায়নি')); }
}
async function adAdSave(k) {
  const m = await sme(); if (!m) return; const old = (_acache.content.find(c => c.id === k) || {}).img || '';
  const url = gv(k + '_url'); if (url && !safeUrl(url)) return adMsg('লিংকটি ঠিক নয়। যেমন: https://example.com বা www.example.com');
  const img = _adImgs[k] || (chk(k + '_del') ? '' : old);
  try { adMsg('⏳ সেভ হচ্ছে...'); await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', k), {type: 'ad', slot: k === 'ad_top' ? 'top' : 'bot', title: 'ad', body: gv(k + '_tx').slice(0, 300), url, img, pub: chk(k + '_on'), by: m.u.uid, createdAt: m.f.F.serverTimestamp()}); delete _adImgs[k]; await refreshContent(); renderBars(); adMsg('✅ সেভ হয়েছে।'); } catch (e) { adMsg('⚠️ সেভ হয়নি।'); }
}
async function adTickSave() {
  const m = await sme(); if (!m) return;
  try { adMsg('⏳ সেভ হচ্ছে...'); await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'ticker'), {type: 'ticker', title: 'ticker', body: gv('tk_tx').slice(0, 3000), label: gv('tk_label').slice(0, 12) || 'খবর', pub: chk('tk_on'), by: m.u.uid, createdAt: m.f.F.serverTimestamp()}); await refreshContent(); renderBars(); adMsg('✅ সেভ হয়েছে।'); } catch (e) { adMsg('⚠️ সেভ হয়নি।'); }
}

// =====================================================================
//  হোমের আইকন নিজের মতো সাজানো: ক্রম বদল, অন্য গ্রুপে নেওয়া, গ্রুপের নাম বদল
// =====================================================================
const layoutOv = () => { const l = APPCFG().layout; return Array.isArray(l) && l.length ? l : null; };
function applyLayout(groups) {
  const lay = layoutOv(); if (!lay) return groups;
  const all = {}; groups.forEach(g => g[1].forEach(t => { all[t.id] = t; })); const used = new Set();
  const out = lay.map(g => [String(g.name || ''), (g.ids || []).map(id => { used.add(id); return all[id]; }).filter(Boolean)]);
  const rest = Object.keys(all).filter(id => !used.has(id)).map(id => all[id]);
  if (rest.length) { const k = out.findIndex(g => g[0] === 'নতুন আইকন'); if (k >= 0) out[k][1] = out[k][1].concat(rest); else out.push(['নতুন আইকন', rest]); }
  return out;
}
let _lay = [];
function layInit() { const g = homeGroups(true); _lay = g.map(x => ({name: x[0], ids: x[1].map(t => t.id)})); }
function layCommit() { document.querySelectorAll('[data-gi]').forEach(e => { const i = +e.getAttribute('data-gi'); if (_lay[i]) _lay[i].name = e.value.trim().slice(0, 40); }); }
function layForm() {
  const tiles = {}; homeGroups(true).forEach(g => g[1].forEach(t => { tiles[t.id] = t; }));
  return `<div class="cx"><b>🧩 হোমের আইকন সাজান</b><div class="hint">⬆⬇ চাপলে আইকন ওঠানামা করে (গ্রুপের শেষে গেলে পরের গ্রুপে চলে যায়)। "কোথায়" থেকে সরাসরি অন্য গ্রুপে পাঠানো যায়। গ্রুপের নামও বদলানো যায়। শেষে সেভ করুন।</div></div><div id="layBox">${layHtml(tiles)}</div>
  <div id="ad_msg" class="warn" style="display:none"></div>
  <button class="btn" onclick="laySave()">💾 সেভ করুন</button> <button class="btn sm" onclick="layNewG()">➕ নতুন গ্রুপ</button> <button class="btn sm" style="background:#475569" onclick="layReset()">↩️ আগের সাজ</button>`;
}
function layHtml(tiles) {
  if (!tiles) { tiles = {}; homeGroups(true).forEach(g => g[1].forEach(t => { tiles[t.id] = t; })); }
  return _lay.map((g, gi) => `<div class="cx"><div class="rowline"><input class="inp" style="margin:0;font-weight:800" data-gi="${gi}" value="${esc(g.name)}"><button class="btn sm" style="margin:0" onclick="layMoveG(${gi},-1)">⬆</button><button class="btn sm" style="margin:0" onclick="layMoveG(${gi},1)">⬇</button><button class="btn sm" style="margin:0;background:#dc2626" onclick="layDelG(${gi})">🗑️</button></div>
    ${g.ids.map((id, ti) => { const t = tiles[id] || {}; return `<div class="layrow"><span class="lai">${esc(tileOv(id).ic || t.ic || '•')}</span><span class="lan">${esc(keyName(id))}</span><button onclick="layHide('${esc(id)}')" style="background:${tileOv(id).hide ? '#dc2626' : '#64748b'}">${tileOv(id).hide ? '🙈' : '👁️'}</button><button onclick="layMoveT(${gi},${ti},-1)">⬆</button><button onclick="layMoveT(${gi},${ti},1)">⬇</button><select onchange="layTo(${gi},${ti},this.value)"><option value="">কোথায় পাঠাবেন?</option>${_lay.map((x, k) => `<option value="${k}"${k === gi ? ' disabled' : ''}>${k === gi ? '✔ এখানেই — ' : '➡ '}${esc(x.name || 'গ্রুপ ' + (k + 1))}</option>`).join('')}<option value="new">➕ নতুন গ্রুপ বানিয়ে সেখানে</option><option value="first">⏫ সবার উপরে (প্রথম গ্রুপে)</option></select></div>`; }).join('') || '<div class="hint">এই গ্রুপে এখন কিছু নেই।</div>'}</div>`).join('');
}
function layRefresh() { const b = document.getElementById('layBox'); if (b) b.innerHTML = layHtml(); }
function layMoveG(i, d) { layCommit(); const j = i + d; if (j < 0 || j >= _lay.length) return; [_lay[i], _lay[j]] = [_lay[j], _lay[i]]; layRefresh(); }
function layMoveT(gi, ti, d) {
  layCommit(); const g = _lay[gi], id = g.ids[ti], nt = ti + d;
  if (nt >= 0 && nt < g.ids.length) { g.ids.splice(ti, 1); g.ids.splice(nt, 0, id); }
  else if (d < 0 && gi > 0) { g.ids.splice(ti, 1); _lay[gi - 1].ids.push(id); }
  else if (d > 0 && gi < _lay.length - 1) { g.ids.splice(ti, 1); _lay[gi + 1].ids.unshift(id); }
  layRefresh();
}
function layTo(gi, ti, v) { if (v === '') return; layCommit(); const id = _lay[gi].ids.splice(ti, 1)[0]; if (v === 'new') { _lay.push({name: 'নতুন গ্রুপ', ids: [id]}); } else if (v === 'first') { _lay[0].ids.unshift(id); } else if (_lay[+v]) _lay[+v].ids.push(id); else _lay[gi].ids.splice(ti, 0, id); layRefresh(); }
function layNewG() { layCommit(); _lay.push({name: 'নতুন গ্রুপ', ids: []}); layRefresh(); }
function layDelG(i) {
  layCommit(); const g = _lay[i]; if (g.ids.length) { if (!confirm('এই গ্রুপের আইকনগুলো আগের গ্রুপে চলে যাবে। ঠিক আছে?')) return; const to = i > 0 ? i - 1 : 1; if (_lay[to]) _lay[to].ids = _lay[to].ids.concat(g.ids); else return alert('অন্তত একটি গ্রুপ থাকতে হবে।'); }
  _lay.splice(i, 1); layRefresh();
}
async function laySave() {
  layCommit(); const m = await sme(); if (!m) return;
  const layout = _lay.filter(g => g.name || g.ids.length).map(g => ({name: g.name || 'গ্রুপ', ids: g.ids}));
  try { adMsg('⏳ সেভ হচ্ছে...'); await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'appconfig'), {type: 'config', title: 'config', pub: true, by: m.u.uid, cfg: {layout}, createdAt: m.f.F.serverTimestamp()}, {merge: true}); await refreshContent(); adMsg('✅ সেভ হয়েছে। হোমে গিয়ে দেখুন।'); } catch (e) { adMsg('⚠️ সেভ হয়নি।'); }
}
async function layReset() {
  if (!confirm('হোমের সাজ আগের অবস্থায় ফিরবে। নিশ্চিত?')) return; const m = await sme(); if (!m) return;
  try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'appconfig'), {type: 'config', title: 'config', pub: true, cfg: {layout: null}, createdAt: m.f.F.serverTimestamp()}, {merge: true}); await refreshContent(); layInit(); layRefresh(); adMsg('✅ আগের সাজে ফিরেছে।'); } catch (e) { adMsg('⚠️ হয়নি।'); }
}
(function () { const st = document.createElement('style'); st.textContent = `.layrow{display:flex;align-items:center;gap:6px;margin:6px 0;padding:6px;border-radius:10px;background:var(--tint)}.lai{font-size:20px;width:28px;text-align:center}.lan{flex:1;font-size:14px;font-weight:600}.layrow button{border:0;background:var(--p2);color:#fff;border-radius:8px;width:34px;height:32px}.layrow select{max-width:120px;font:inherit;font-size:12px;border-radius:8px;border:1px solid #cbd5e1;height:32px}`; document.head.appendChild(st); })();

const _bd = v => String(v).replace(/[০-৯]/g, ch => '০১২৩৪৫৬৭৮৯'.indexOf(ch));
function parseQuizBulk(t) {
  const out = [];
  String(t).split('\n').forEach(line => {
    const p = line.split(/[|｜]/).map(x => x.trim()); if (p.length < 4 || !p[0]) return;
    let opts, ans, ex = '';
    const numIdx = p.findIndex((x, i) => i >= 3 && /^[১-৪1-4]$/.test(x));
    if (numIdx > 0) { opts = p.slice(1, numIdx); ans = +_bd(p[numIdx]) - 1; ex = p.slice(numIdx + 1).join(' | '); } else { opts = p.slice(1, 5); ans = 0; }
    opts = opts.filter(Boolean); if (opts.length < 2 || !(ans >= 0 && ans < opts.length)) return;
    out.push({q: p[0].slice(0, 200), o: opts.slice(0, 4), a: ans, e: ex.slice(0, 400)});
  });
  return out;
}

// =====================================================================
//  ইউজারের নিজের পছন্দের রং (৭টি)
// =====================================================================
const UCOLORS = [['সবুজ', '#006a4e'], ['নীল', '#0b5ed7'], ['বেগুনি', '#6d28d9'], ['লাল', '#b91c1c'], ['কমলা', '#c2410c'], ['গোলাপি', '#be185d'], ['টিল', '#0f766e']];
function ucolorBox() {
  let cur = ''; try { cur = localStorage.getItem('ucolor') || ''; } catch (e) {}
  return `<div class="box" style="text-align:center"><b>🎨 আমার পছন্দের রং</b><div style="font-size:13px;color:#666;margin:4px 0 8px">অ্যাপের রং আপনার মতো বদলে নিন</div><div style="display:flex;justify-content:center;gap:9px;flex-wrap:wrap">${UCOLORS.map(c => `<button aria-label="${c[0]}" onclick="setUColor('${c[1]}')" style="width:40px;height:40px;border-radius:50%;border:${cur === c[1] ? '4px solid #111' : '2px solid #fff'};box-shadow:0 1px 5px rgba(0,0,0,.35);background:${c[1]}"></button>`).join('')}</div>${cur ? '<button class="btn sm" style="background:#64748b;margin-top:10px" onclick="setUColor(\'\')">↩️ অ্যাপের আসল রং</button>' : ''}</div>`;
}
function setUColor(c, stay) { try { c ? localStorage.setItem('ucolor', c) : localStorage.removeItem('ucolor'); } catch (e) {} applyTheme(); if (stay) return; if (document.getElementById('vs')) viewsetPage(); else profile(); }

// =====================================================================
//  🤖 প্রশ্ন বানান: AI (Claude/ChatGPT) দিয়ে বানিয়ে সরাসরি অ্যাপে বসানো
// =====================================================================
const QG_TOPICS = ['ট্রাফিক সাইন', 'রাস্তার নিয়ম ও ট্রাফিক আইন', 'ড্রাইভিং লাইসেন্স ও BRTA', 'গাড়ির যন্ত্রাংশ ও যত্ন', 'নিরাপদ ড্রাইভিং ও প্রাথমিক চিকিৎসা', 'বাংলা ভাষা ও সাহিত্য', 'ইংরেজি', 'গণিত', 'সাধারণ জ্ঞান', 'বাংলাদেশ বিষয়াবলি', 'সরকারি চাকরির প্রস্তুতি'];
function qgForm() {
  const secs = _acache.content.filter(c => c.type === 'section');
  return `<div class="cx"><b>১️⃣ AI এর জন্য নির্দেশ বানান</b><div class="hint">বিষয় ও সংখ্যা বেছে "কপি করুন" চাপুন। তারপর Claude বা ChatGPT-তে পেস্ট করুন। ওরা ঠিক অ্যাপের ধরনে প্রশ্ন বানিয়ে দেবে।</div>
    <select class="inp" id="qg_topic">${QG_TOPICS.map(t => `<option>${t}</option>`).join('')}</select>
    <input class="inp" id="qg_own" placeholder="অথবা নিজের বিষয় লিখুন (ঐচ্ছিক)">
    <div class="two"><select class="inp" id="qg_kind"><option value="mcq">MCQ (৪টি উত্তর)</option><option value="w">লিখিত প্রশ্ন-উত্তর</option></select><input class="inp" id="qg_n" type="number" min="1" max="50" value="20" placeholder="কয়টি"></div>
    <select class="inp" id="qg_lv"><option>সহজ</option><option selected>মাঝারি</option><option>কঠিন</option></select>
    <button class="btn" onclick="qgCopy()">📋 নির্দেশ কপি করুন</button><textarea class="inp" id="qg_prompt" rows="4" readonly style="display:none;font-size:12px"></textarea></div>
  <div class="cx"><b>২️⃣ MCQ বসান</b><div class="hint">AI যা বানিয়েছে তা এখানে পেস্ট করুন। প্রতি লাইনে একটি প্রশ্ন:<br>প্রশ্ন | উত্তর১ | উত্তর২ | উত্তর৩ | উত্তর৪ | সঠিক নম্বর | ব্যাখ্যা</div>
    <textarea class="inp" id="qg_mcq" rows="7" placeholder="এখানে পেস্ট করুন (একসাথে ১০০টাও চলবে)"></textarea><button class="btn sm" style="background:#475569" onclick="bulkCheck('qg_mcq')">👁️ আগে যাচাই করুন</button> <button class="btn" onclick="qgMcq()">✅ কুইজে যোগ করুন</button></div>
  <div class="cx"><b>৩️⃣ লিখিত প্রশ্ন-উত্তর বসান</b><div class="hint">প্রতি লাইনে: প্রশ্ন | উত্তর। এগুলো একটি সুন্দর পাতা হয়ে আপনার বেছে নেওয়া জায়গায় বসবে।</div>
    <input class="inp" id="qg_title" placeholder="পাতার নাম (যেমন: ট্রাফিক আইনের লিখিত প্রশ্ন)">
    <select class="inp" id="qg_parent">${parentOpts('')}</select>
    <textarea class="inp" id="qg_w" rows="7" placeholder="প্রশ্ন | উত্তর"></textarea><button class="btn" onclick="qgWritten()">✅ পাতা বানান</button></div>
  <div id="ad_msg" class="warn" style="display:none"></div>`;
}
function qgCopy() {
  const t = gv('qg_own') || gv('qg_topic'), n = Math.max(1, Math.min(50, +gv('qg_n') || 20)), lv = gv('qg_lv'), mcq = gv('qg_kind') === 'mcq';
  const p = mcq
    ? `বাংলাদেশের ড্রাইভার ও চাকরিপ্রার্থীদের জন্য "${t}" বিষয়ে ${n}টি ${lv} মানের MCQ প্রশ্ন বানাও। ভাষা সহজ বাংলা।\nনিয়ম: প্রতিটি প্রশ্ন আলাদা লাইনে, ঠিক এই ছকে, আর কিছু লিখবে না (কোনো নম্বর, তারা বা বাড়তি কথা নয়):\nপ্রশ্ন | উত্তর১ | উত্তর২ | উত্তর৩ | উত্তর৪ | সঠিক উত্তরের নম্বর (১ থেকে ৪) | এক লাইনে ব্যাখ্যা\nতথ্য অবশ্যই নির্ভুল ও বাংলাদেশের আইন অনুযায়ী হতে হবে। নিশ্চিত না হলে সেই প্রশ্ন বাদ দাও।`
    : `বাংলাদেশের ড্রাইভার ও চাকরিপ্রার্থীদের জন্য "${t}" বিষয়ে ${n}টি ${lv} মানের লিখিত প্রশ্ন ও সংক্ষিপ্ত উত্তর বানাও। ভাষা সহজ বাংলা।\nনিয়ম: প্রতিটি প্রশ্ন আলাদা লাইনে, ঠিক এই ছকে, আর কিছু লিখবে না:\nপ্রশ্ন | উত্তর\nতথ্য অবশ্যই নির্ভুল ও বাংলাদেশের আইন অনুযায়ী হতে হবে। নিশ্চিত না হলে সেই প্রশ্ন বাদ দাও।`;
  const ta = document.getElementById('qg_prompt'); ta.value = p; ta.style.display = 'block'; ta.select();
  let ok = false; try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(p); ok = true; } else ok = document.execCommand('copy'); } catch (e) { try { ok = document.execCommand('copy'); } catch (e2) {} }
  adMsg(ok ? '✅ কপি হয়েছে। এবার Claude বা ChatGPT-তে পেস্ট করুন।' : 'উপরের লেখাটি চেপে ধরে কপি করুন।');
}
async function qgMcq() {
  const m = await sme(); if (!m) return; const rows = parseQuizBulk(gv('qg_mcq'));
  if (!rows.length) return adMsg('কোনো প্রশ্ন বোঝা যায়নি। প্রতি লাইনে: প্রশ্ন | উত্তর১ | উত্তর২ | উত্তর৩ | উত্তর৪ | সঠিক নম্বর');
  if (rows.length > 100) return adMsg('একবারে সর্বোচ্চ ১০০টি।');
  try { adMsg('⏳ যোগ হচ্ছে...'); for (const r of rows) await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), {type: 'quiz', title: r.q, body: '', url: '', pub: true, by: m.u.uid, quiz: {o: r.o, a: r.a, e: r.e}, createdAt: m.f.F.serverTimestamp()}); await refreshContent(); document.getElementById('qg_mcq').value = ''; adMsg('✅ ' + rows.length + 'টি প্রশ্ন কুইজে যোগ হয়েছে। মডেল টেস্টে দেখুন।'); } catch (e) { adMsg('⚠️ যোগ হয়নি।'); }
}
async function qgWritten() {
  const m = await sme(); if (!m) return; const title = gv('qg_title'), parent = gv('qg_parent');
  if (!title) return adMsg('পাতার নাম দিন।');
  const rows = gv('qg_w').split('\n').map(l => l.split(/[|｜]/).map(x => x.trim())).filter(p => p.length >= 2 && p[0] && p[1]);
  if (!rows.length) return adMsg('কোনো প্রশ্ন বোঝা যায়নি। প্রতি লাইনে: প্রশ্ন | উত্তর');
  const body = rows.map((p, i) => `**${i + 1}. ${p[0]}**\n${p.slice(1).join(' | ')}\n`).join('\n');
  if (body.length > 19000) return adMsg('অনেক বড় হয়ে গেছে। দুই ভাগে দিন।');
  try { adMsg('⏳ বানানো হচ্ছে...'); await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), {type: 'node', parent, title: title.slice(0, 150), titleEn: '', body, bodyEn: '', lang: 'auto', color: '#0369a1', ic: '📝', ord: 0, mt: 'none', url: '', pub: true, by: m.u.uid, createdAt: m.f.F.serverTimestamp()}); await refreshContent(); document.getElementById('qg_w').value = ''; adMsg('✅ ' + rows.length + 'টি প্রশ্নের পাতা তৈরি। "' + keyName(parent) + '" এর ভিতরে দেখুন।'); } catch (e) { adMsg('⚠️ হয়নি।'); }
}

// =====================================================================
//  অ্যাডমিন লগইন (সাইড মেনুর 🛡️ অ্যাডমিন থেকে, বা ওয়েবে ঠিকানার শেষে #admin)
// =====================================================================
function adminLoginView() {
  const web = !(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  return `<div class="cx"><b>🛡️ অ্যাডমিন লগইন</b><div class="hint">শুধু অ্যাডমিনের আইডি দিয়ে ঢোকা যায়। মোবাইল নম্বর ও পাসওয়ার্ড দিন।</div>
    <input class="inp" id="al_id" placeholder="মোবাইল নম্বর (01XXXXXXXXX) বা ইমেইল" autocomplete="username"><input class="inp" id="al_pw" type="password" placeholder="পাসওয়ার্ড" autocomplete="current-password">
    <div id="ad_msg" class="warn" style="display:none"></div>
    <button class="btn" onclick="adLogin()">🔐 লগইন</button>
    ${web ? '<button class="btn" style="background:#4285f4;margin-top:8px" onclick="adGoogle()">🔵 Gmail (Google) দিয়ে লগইন</button>' : ''}</div>
    <div class="cx"><b>প্রথমবার?</b><div class="hint">আগে "লগইন ও ব্যাকআপ" পাতা থেকে অ্যাডমিনের মোবাইল নম্বর দিয়ে নতুন অ্যাকাউন্ট খুলুন। তারপর এখানে এসে লগইন করুন। নম্বরটি অ্যাডমিন তালিকায় থাকলে প্যানেল নিজে খুলে যাবে।</div>
    <button class="btn sm" onclick="open_('account')">নতুন অ্যাকাউন্ট খুলুন</button></div>`;
}
async function adLogin() {
  const id = gv('al_id'), pw = document.getElementById('al_pw').value; if (!id || !pw) return adMsg('আইডি ও পাসওয়ার্ড দিন।');
  try { adMsg('⏳ অপেক্ষা করুন...'); await cloudLogin(id, pw); try { await upsertProfile(); } catch (e) {} adminPage(); } catch (e) { adMsg('⚠️ ' + (typeof cloudErr === 'function' ? cloudErr(e) : 'লগইন হয়নি।')); }
}
async function adGoogle() {
  try {
    adMsg('⏳ Google খুলছে...'); const f = await fb(); const r = await f.A.signInWithPopup(f.auth, new f.A.GoogleAuthProvider()); const u = r.user;
    setCloudInfo({id: u.email || u.uid, name: u.displayName || '', uid: u.uid, last: 0}); try { await upsertProfile(); } catch (e) {} adminPage();
  } catch (e) {
    const c = e && e.code; adMsg('⚠️ ' + (c === 'auth/popup-closed-by-user' ? 'লগইন বাতিল হয়েছে।' : c === 'auth/unauthorized-domain' ? 'এই ওয়েবসাইটের ঠিকানা Firebase এর Authorized domains এ যোগ করা হয়নি।' : c === 'auth/operation-not-allowed' ? 'Firebase এ Google লগইন চালু করা হয়নি।' : 'Google লগইন হয়নি। আবার চেষ্টা করুন।'));
  }
}

// =====================================================================
//  যেকোনো কিছু লুকানো বা সরানো: অ্যাপের নিজের লেখা, কার্ড, কুইজের প্রশ্ন, টিপস
// =====================================================================
const hhash = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const hkey = el => { const t = document.querySelector('#app .page-h h2'); return (t ? t.textContent.trim() : '') + '|' + hhash((el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140)); };
const _hmap = {};
const editsSafe = () => { try { return APPCFG().edits || {}; } catch (e) { return {}; } };
function elText(el) {
  const c = el.cloneNode(true); c.querySelectorAll('.hbtn').forEach(b => b.remove());
  c.querySelectorAll('br').forEach(n => n.replaceWith('\n')); c.querySelectorAll('div,p,li,summary,h3,h4,b').forEach(n => n.insertAdjacentText('afterend', '\n'));
  return c.textContent.split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}
function applyEdit(el, text) {
  const L = String(text).split('\n'), first = L[0] || '', rest = L.slice(1).join('\n');
  el.innerHTML = el.tagName === 'DETAILS' ? `<summary style="font-weight:700">${esc(first)}</summary><div class="rich" style="padding-top:6px">${rich(rest)}</div>` : `<div style="font-weight:800;margin-bottom:4px">${esc(first)}</div><div class="rich">${rich(rest)}</div>`;
  el.dataset.edd = '1';
}
function hideScan() {
  try { pdfBar(); } catch (e) {}
  try {
    if (document.querySelector('#app .hrow') || document.getElementById('sbody') || document.querySelector('#app .lhero, #app .profile')) return;
    const adm = isAdminFlag(), h = hidSafe().d, ed = editsSafe();
    document.querySelectorAll('#app .hbtn, #app .atch').forEach(b => b.remove());
    document.querySelectorAll('#app .qa, #app .infoc, #app .acc, #app .card').forEach(el => {
      if (el.closest('#kids') || el.classList.contains('tile')) return;
      const k = el.dataset.hk || (el.dataset.hk = hkey(el)), hid = h.includes(k);
      if (hid && !adm) { el.remove(); return; }
      if (!_hmap[k] || !el.dataset.edd) _hmap[k] = {orig: elText(el), html: el.innerHTML};
      if (ed[k] && !el.dataset.edd) applyEdit(el, ed[k]);
      el.classList.toggle('xh', hid && adm);
      { const ad = attDoc(k), bh = ad ? bkHtml(ad.blocks, adm) : ''; if (bh) el.insertAdjacentHTML('afterend', `<div class="atch">${bh}</div>`); if (adm) { let at = el.nextElementSibling; if (!(at && at.classList.contains('atch'))) { el.insertAdjacentHTML('afterend', '<div class="atch"></div>'); at = el.nextElementSibling; } at.insertAdjacentHTML('beforeend', `<button class="btn sm atb" data-k="${esc(k)}" onclick="attachEdit(this.dataset.k)">📎 ছবি / ভিডিও / লিংক যোগ করুন${ad ? ' (বদলান)' : ''}</button>`); } }
      if (adm) {
        const host = el.tagName === 'DETAILS' ? (el.querySelector('summary') || el) : el; host.style.position = 'relative';
        const mk = (cls, label, fn) => { const b = document.createElement('button'); b.className = 'hbtn ' + cls; b.textContent = label; b.onclick = e => { e.stopPropagation(); e.preventDefault(); fn(); }; host.appendChild(b); return b; };
        mk(hid ? 'on' : '', hid ? '♻️' : '🗑️', () => hideToggle(k)).title = hid ? 'ফিরিয়ে আনুন' : 'মুছুন'; mk('ed', '✏️', () => hideEdit(k)).title = 'বদলান'; mk('at', '📎', () => attachEdit(k)).title = 'ছবি/ভিডিও/PDF যোগ'; host.classList.add('hadm');
      }
    });
  } catch (e) {}
}
let _heK = '';
function hideEdit(k) {
  const o = _hmap[k]; if (!o) return; _heK = k; const cur = editsSafe()[k] || o.orig;
  showModal(`<h3 style="margin:0 0 8px">✏️ লেখা বদলান</h3><div class="hint">প্রথম লাইন শিরোনাম হবে। নিচের লাইনগুলো বিবরণ। <b>**মোটা**</b>, <b>{red:লাল}</b> ও <b>- তালিকা</b> দেওয়া যায়।</div><textarea class="inp" id="he_t" rows="10">${esc(cur)}</textarea><div id="he_m" class="warn" style="display:none"></div>
    <button class="btn" onclick="hideEditSave()">💾 সেভ করুন</button> <button class="btn sm" style="background:#475569" onclick="hideEditReset()">↩️ আসল লেখা ফেরান</button>`);
}
async function hideEditSave() {
  const k = _heK;
  const t = (document.getElementById('he_t').value || '').trim().slice(0, 3000); if (!t) { const m = document.getElementById('he_m'); m.style.display = 'block'; m.textContent = 'লেখা ফাঁকা রাখা যাবে না।'; return; }
  const m = await sme(); if (!m) return;
  try {
    await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'appconfig'), {type: 'config', title: 'config', pub: true, by: m.u.uid, cfg: {edits: {[k]: t}}, createdAt: m.f.F.serverTimestamp()}, {merge: true});
    await refreshContent(); closeModal(); const el = [...document.querySelectorAll('#app [data-hk]')].find(e => e.dataset.hk === k); if (el) { if (!el.dataset.edd) _hmap[k] = {orig: _hmap[k].orig, html: el.innerHTML}; applyEdit(el, t); hideScan(); }
  } catch (e) { alert('সেভ হয়নি। ইন্টারনেট ও অ্যাডমিন লগইন দেখুন।'); }
}
async function hideEditReset() {
  const k = _heK;
  const m = await sme(); if (!m) return;
  try {
    await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'appconfig'), {type: 'config', title: 'config', pub: true, by: m.u.uid, cfg: {edits: {[k]: ''}}, createdAt: m.f.F.serverTimestamp()}, {merge: true});
    await refreshContent(); closeModal(); const el = [...document.querySelectorAll('#app [data-hk]')].find(e => e.dataset.hk === k); if (el && _hmap[k]) { el.innerHTML = _hmap[k].html; delete el.dataset.edd; hideScan(); }
  } catch (e) { alert('হয়নি।'); }
}
async function hideSave(patch) {
  const m = await sme(); if (!m) return false;
  try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'appconfig'), {type: 'config', title: 'config', pub: true, by: m.u.uid, cfg: {hidden: patch}, createdAt: m.f.F.serverTimestamp()}, {merge: true}); await refreshContent(); return true; } catch (e) { alert('সেভ হয়নি। ইন্টারনেট ও অ্যাডমিন লগইন দেখুন।'); return false; }
}
async function hideToggle(k) { const h = hidSafe(), i = h.d.indexOf(k); i >= 0 ? h.d.splice(i, 1) : h.d.push(k); if (await hideSave(h)) hideScan(); }
function hidForm() {
  const h = hidSafe(), qs = (_quizBase || QUIZ), ts = (_tipBase || TIPS);
  return `<div class="cx"><b>🙈 লুকানো ও সরানো</b><div class="hint">অ্যাপের নিজের কার্ড, লেখা, কুইজের প্রশ্ন বা টিপস যা চান লুকিয়ে ফেলুন। ভুল করলে আবার দেখানো যায়। অ্যাডমিন হিসেবে অ্যাপের যেকোনো পাতায় ঢুকলে প্রতিটি কার্ডে "🙈 লুকান" বাটন দেখবেন। তাতে চাপলেই ওই কার্ড সবার কাছ থেকে সরে যাবে।</div>
    <div class="hint">এখন লুকানো কার্ড: <b>${bn(h.d.length)}</b>টি ${h.d.length ? '<button class="btn sm" style="background:#475569" onclick="hidClear()">সব আবার দেখান</button>' : ''}</div></div>
    <div class="cx"><b>❓ কুইজের প্রশ্ন (${bn(qs.length)}টি)</b><input class="inp" placeholder="খুঁজুন..." oninput="hidFilter(this.value)">
    <div id="hidq">${qs.map((q, i) => `<label class="hrow" data-t="${esc(q[0])}"><input type="checkbox" ${h.q.includes(q[0]) ? 'checked' : ''} onchange="hidSet('q',${i},this.checked)"><span>${esc(q[0])}</span></label>`).join('')}</div><div class="hint">টিক দেওয়া প্রশ্ন আর কুইজে আসবে না।</div></div>
    <div class="cx"><b>💡 টিপস (${bn(ts.length)}টি)</b>${ts.map((t, i) => `<label class="hrow"><input type="checkbox" ${h.t.includes(t) ? 'checked' : ''} onchange="hidSet('t',${i},this.checked)"><span>${esc(t)}</span></label>`).join('')}</div>`;
}
function hidFilter(v) { document.querySelectorAll('#hidq .hrow').forEach(r => { r.style.display = !v || r.getAttribute('data-t').includes(v) ? '' : 'none'; }); }
async function hidSet(kind, i, on) {
  const h = hidSafe(), src = kind === 'q' ? (_quizBase || QUIZ).map(q => q[0]) : (_tipBase || TIPS), t = src[i], a = h[kind], j = a.indexOf(t);
  if (on && j < 0) a.push(t); if (!on && j >= 0) a.splice(j, 1);
  await hideSave(h); applyTips(); applyQuiz();
}
async function hidClear() { const h = hidSafe(); h.d = []; if (await hideSave(h)) adminPage('hid'); }
(function () { const st = document.createElement('style'); st.textContent = `.hrow{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #eee;font-size:14px}.hrow input{margin-top:3px;width:20px;height:20px;flex:none}`; document.head.appendChild(st); })();

async function layHide(id) {
  layCommit(); const m = await sme(); if (!m) return; const t = JSON.parse(JSON.stringify(APPCFG().tiles || {})); t[id] = t[id] || {}; t[id].hide = !t[id].hide; if (!t[id].hide) delete t[id].hide;
  try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'appconfig'), {type: 'config', title: 'config', pub: true, by: m.u.uid, cfg: {tiles: t}, createdAt: m.f.F.serverTimestamp()}, {merge: true}); await refreshContent(); layRefresh(); adMsg('✅ হয়েছে। 🙈 মানে হোমে লুকানো, 👁️ মানে দেখা যাচ্ছে।'); } catch (e) { adMsg('⚠️ হয়নি।'); }
}

// ================= PDF নেওয়া ও চাকরির প্রশ্ন অর্ডার =================
const pdfCfg = () => { try { const c = APPCFG(); return {def: c.pdfDef !== false, off: c.pdfOff || [], on: c.pdfOn || []}; } catch (e) { return {def: true, off: [], on: []}; } };
const pdfAllowed = t => { const p = pdfCfg(); return p.def ? !p.off.includes(t) : p.on.includes(t); };
const pdfTitle = () => { const h = document.querySelector('#app .page-h h2'); return h ? h.textContent.trim() : ''; };
function pdfPageEls() { const a = document.getElementById('app'); return a ? Array.from(a.children).filter(x => x.id !== 'drw' && x.id !== 'dbg' && x.id !== 'pdfbar') : []; }
function pdfBar() {
  try {
    const old = document.getElementById('pdfbar'); if (old) old.remove();
    const els = pdfPageEls(); if (!els.length || !els.some(e => e.classList.contains('page-h'))) return;
    if (document.getElementById('sbody') || els.some(e => e.matches('.lhero,.profile') || e.querySelector('.lhero,.profile,input,textarea,select,canvas,.hrow'))) return;
    const t = pdfTitle(); if (!t) return;
    const adm = typeof isAdminFlag === 'function' && isAdminFlag(), ok = pdfAllowed(t); if (!ok && !adm) return;
    if (els.map(e => e.textContent).join('').length < 150) return;
    const d = document.createElement('div'); d.id = 'pdfbar'; d.className = 'pad';
    d.innerHTML = (ok ? `<button class="btn" style="width:100%;background:#b91c1c" onclick="pdfPage()">📄 এই পাতা PDF হিসেবে নিন</button>` : '') +
      (adm ? `<div class="adbar" style="margin-top:8px"><span>🛡️ PDF</span><button onclick="pdfToggle()">${ok ? '🔒 শুধু অ্যাপে রাখুন (লোকাল)' : '📄 PDF চালু করুন'}</button></div>` : '');
    const drw = document.getElementById('drw'); drw ? drw.parentNode.insertBefore(d, drw) : document.getElementById('app').appendChild(d);
  } catch (e) {}
}
async function pdfSaveCfg(patch) {
  const m = await sme(); if (!m) { alert('অ্যাডমিন লগইন দরকার।'); return false; }
  try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', 'appconfig'), {type: 'config', title: 'config', pub: true, by: m.u.uid, cfg: patch, createdAt: m.f.F.serverTimestamp()}, {merge: true}); await refreshContent(); return true; } catch (e) { alert('সেভ হয়নি। ইন্টারনেট ও অ্যাডমিন লগইন দেখুন।'); return false; }
}
async function pdfToggle() {
  const t = pdfTitle(), p = pdfCfg(), ok = pdfAllowed(t); let off = p.off.slice(), on = p.on.slice();
  if (p.def) { ok ? off.push(t) : off = off.filter(x => x !== t); } else { ok ? on = on.filter(x => x !== t) : on.push(t); }
  if (await pdfSaveCfg({pdfOff: off, pdfOn: on})) pdfBar();
}
async function pdfDefSet(v) { if (await pdfSaveCfg({pdfDef: !!v})) { adMsg('✅ সেভ হয়েছে।'); } }
function pdfPageText() {
  const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:-9999px;top:0;width:380px;font:14px sans-serif';
  pdfPageEls().forEach(e => { if (e.classList.contains('page-h') || e.classList.contains('hero')) return; box.appendChild(e.cloneNode(true)); });
  box.querySelectorAll('button,.hbtn,.adbar,#pdfbar,#kids .adbar,script,style,input,select,textarea,.adtop,.adbot,.ticker,.nka').forEach(x => x.remove());
  box.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));
  document.body.appendChild(box); const tx = (box.innerText || '').replace(/\n{3,}/g, '\n\n').trim(); box.remove(); return tx;
}
function pdfMulti(jpgs, w, h, pw) {
  const enc = s => new TextEncoder().encode(s), W = pw || 595, H = Math.round(W * h / w), parts = [], off = []; let len = 0; const add = b => { parts.push(b); len += b.length; };
  const n = jpgs.length, tot = 2 + 3 * n; add(enc('%PDF-1.4\n'));
  const obj = (i, body) => { off[i] = len; add(enc(i + ' 0 obj\n' + body + '\nendobj\n')); };
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, `<< /Type /Pages /Kids [${jpgs.map((_, i) => (3 + 3 * i) + ' 0 R').join(' ')}] /Count ${n} >>`);
  jpgs.forEach((j, i) => {
    const p = 3 + 3 * i, cs = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${p + 1} 0 R /Resources << /XObject << /Im${i} ${p + 2} 0 R >> >> >>`);
    obj(p + 1, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    off[p + 2] = len; add(enc(`${p + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.length} >>\nstream\n`)); add(j); add(enc('\nendstream\nendobj\n'));
  });
  const xr = len; let x = `xref\n0 ${tot + 1}\n0000000000 65535 f \n`; for (let i = 1; i <= tot; i++) x += String(off[i]).padStart(10, '0') + ' 00000 n \n';
  add(enc(x + `trailer\n<< /Size ${tot + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`));
  const out = new Uint8Array(len); let q = 0; parts.forEach(b => { out.set(b, q); q += b.length; }); return out;
}
async function pdfBuild(title, text) {
  const fam = getComputedStyle(document.body).fontFamily || 'sans-serif', W = 1240, H = 1754, M = 100, FS = 34, LH = 56; const pages = [];
  try { await document.fonts.load('34px ' + fam); await document.fonts.load('bold 34px ' + fam); } catch (e) {}
  let cv, g, y;
  const col = () => { try { return getComputedStyle(document.documentElement).getPropertyValue('--p2').trim() || '#006a4e'; } catch (e) { return '#006a4e'; } };
  const newPage = () => {
    cv = document.createElement('canvas'); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.fillStyle = col(); g.fillRect(0, 0, W, 14); g.textBaseline = 'alphabetic'; g.font = `bold 26px ${fam}`; g.fillStyle = '#64748b'; g.fillText(appName(), M, 70); y = 150; pages.push(cv);
  };
  const wrap = (s, font) => {
    g.font = font; const out = []; let line = '';
    s.split(/(\s+)/).forEach(w => {
      if (!w) return; const t = line + w;
      if (g.measureText(t).width <= W - 2 * M) { line = t; return; }
      if (line.trim()) out.push(line.trim()); line = '';
      if (g.measureText(w).width <= W - 2 * M) { line = w.trimStart(); return; }
      Array.from(w).forEach(ch => { if (g.measureText(line + ch).width > W - 2 * M) { out.push(line); line = ''; } line += ch; });
    });
    if (line.trim()) out.push(line.trim()); return out;
  };
  newPage(); g.font = `bold 50px ${fam}`; g.fillStyle = '#0f172a';
  const tl = wrap(title, `bold 50px ${fam}`); tl.forEach(l => { g.font = `bold 50px ${fam}`; g.fillStyle = '#0f172a'; g.fillText(l, M, y); y += 72; });
  g.fillStyle = col(); g.fillRect(M, y - 28, 140, 6); y += 36;
  text.split('\n').forEach(raw => {
    const s = raw.trim(); if (!s) { y += LH * 0.5; return; }
    const font = `${FS}px ${fam}`, ls = wrap(s, font);
    ls.forEach(l => { if (y > H - 140) newPage(); g.font = font; g.fillStyle = '#1e293b'; g.fillText(l, M, y); y += LH; });
  });
  pages.forEach((c, i) => { const x = c.getContext('2d'); x.font = `24px ${fam}`; x.fillStyle = '#94a3b8'; x.fillText(appName() + ' • পাতা ' + bn(i + 1) + '/' + bn(pages.length), M, H - 60); });
  return {jpgs: pages.map(c => Uint8Array.from(atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), ch => ch.charCodeAt(0))), W, H};
}
async function pdfPage() {
  const t = pdfTitle(), btn = document.querySelector('#pdfbar .btn'); if (btn) { btn.disabled = true; btn.textContent = '⏳ PDF বানানো হচ্ছে...'; }
  try {
    const tx = pdfPageText(); if (tx.length < 20) throw {message: 'পাতায় লেখা নেই।'};
    const r = await pdfBuild(t, tx), bytes = pdfMulti(r.jpgs, r.W, r.H), fname = (t.replace(/[^\wঀ-৿]+/g, '-').slice(0, 30) || 'page') + '.pdf', C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform()) {
      const FS = capP('Filesystem'), SH = capP('Share'); const o = await FS.writeFile({path: fname, data: u8b64(bytes), directory: 'CACHE'});
      await SH.share({title: t, url: o.uri, dialogTitle: 'PDF কোথায় রাখবেন?'});
    } else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'})); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  } catch (e) { if (!(e && /cancel/i.test(String(e.message || e)))) alert('PDF হয়নি: ' + ((e && e.message) || '')); }
  if (btn) { btn.disabled = false; btn.textContent = '📄 এই পাতা PDF হিসেবে নিন'; }
}

// ---- চাকরির প্রশ্ন অর্ডার ----
async function orderPage() {
  tab = 'community'; render(pageHead('চাকরির প্রশ্ন নিন') + hero('📨', 'চাকরির প্রশ্ন নিন', 'কোম্পানি বা ব্যক্তি — নিজের নিয়োগ পরীক্ষার প্রশ্ন বানিয়ে নিন') + '<div class="pad" id="sbody"><div class="empty"><span class="e1">⏳</span>লোড হচ্ছে...</div></div>');
  const b = document.getElementById('sbody'); if (!CLOUD_ON()) return b.innerHTML = sNeedSetup();
  const m = await sme(); if (!m) return b.innerHTML = sNeedLogin();
  b.innerHTML = `<div class="cx"><b>📨 প্রশ্নের অনুরোধ পাঠান</b><div class="hint">আপনার কোম্পানি বা পদের জন্য MCQ / লিখিত প্রশ্ন দরকার? তথ্য দিন, অ্যাপের নির্মাতা আপনার সাথে যোগাযোগ করবেন এবং প্রশ্ন PDF আকারে দেবেন।</div>
    <input class="inp" id="od_co" maxlength="80" placeholder="কোম্পানি / প্রতিষ্ঠানের নাম (বা আপনার নাম)">
    <input class="inp" id="od_pn" maxlength="60" placeholder="যোগাযোগকারীর নাম">
    <input class="inp" id="od_ph" maxlength="20" inputmode="tel" placeholder="মোবাইল নম্বর (যেমন 017XXXXXXXX)">
    <input class="inp" id="od_post" maxlength="80" placeholder="কোন পদের জন্য প্রশ্ন? (যেমন ড্রাইভার, হেলপার)">
    <input class="inp" id="od_cnt" maxlength="6" inputmode="numeric" placeholder="কতটি প্রশ্ন দরকার? (যেমন 50)">
    <select class="inp" id="od_kind"><option>MCQ (বহুনির্বাচনি)</option><option>লিখিত প্রশ্ন</option><option>MCQ ও লিখিত দুটোই</option><option>ড্রাইভিং ব্যবহারিক টেস্টের তালিকা</option></select>
    <textarea class="inp" id="od_note" rows="3" maxlength="500" placeholder="অন্য কিছু জানাতে চাইলে (পরীক্ষার তারিখ, বিষয়, ইত্যাদি)"></textarea>
    <div id="od_msg" class="warn" style="display:none"></div><button class="btn" onclick="orderSend()">📨 অনুরোধ পাঠান</button></div>
    <div id="od_mine"></div>`;
  orderMine(m);
}
async function orderMine(m) {
  try {
    const rows = await sList(m.f, ['qorders'], m.f.F.where('by', '==', m.u.uid)), el = document.getElementById('od_mine'); if (!el || !rows.length) return;
    el.innerHTML = `<div class="cx"><b>আপনার আগের অনুরোধ</b>` + rows.map(r => `<div class="hint" style="border-top:1px solid #eee;padding-top:6px">${esc(r.post || '')} — ${esc(String(r.count || ''))}টি ${esc(r.kind || '')} <span class="tag" style="background:${r.done ? '#128c4a' : '#b45309'}">${r.done ? 'সম্পন্ন' : 'অপেক্ষায়'}</span></div>`).join('') + '</div>';
  } catch (e) {}
}
async function orderSend() {
  const msg = t => { const b = document.getElementById('od_msg'); if (b) { b.style.display = 'block'; b.textContent = t; } };
  const m = await sme(); if (!m) return msg('লগইন করুন।');
  const o = {company: gv('od_co'), person: gv('od_pn'), phone: gv('od_ph').replace(/[^\d+]/g, ''), post: gv('od_post'), count: gv('od_cnt').replace(/\D/g, ''), kind: gv('od_kind'), note: gv('od_note')};
  if (!o.company) return msg('কোম্পানি বা আপনার নাম লিখুন।'); if (o.phone.length < 8) return msg('সঠিক মোবাইল নম্বর দিন।'); if (!o.post) return msg('কোন পদের জন্য প্রশ্ন তা লিখুন।');
  try { msg('⏳ পাঠানো হচ্ছে...'); await m.f.F.addDoc(m.f.F.collection(m.f.db, 'qorders'), Object.assign(o, {by: m.u.uid, done: false, createdAt: m.f.F.serverTimestamp()})); msg('✅ অনুরোধ পাঠানো হয়েছে। শীঘ্রই যোগাযোগ করা হবে।'); orderMine(m); }
  catch (e) { msg('⚠️ পাঠানো যায়নি। ইন্টারনেট ও লগইন দেখুন।'); }
}
async function orderAdminView(m) {
  const rows = await sList(m.f, ['qorders'], m.f.F.orderBy('createdAt', 'desc'), m.f.F.limit(60)); _acache.qorders = rows; const p = pdfCfg();
  return `<div class="cx"><b>📄 PDF নেওয়ার সাধারণ নিয়ম</b><div class="hint">চালু থাকলে প্রতিটি পাতার নিচে "PDF নিন" বাটন আসবে। কোনো পাতা আলাদা করে লোকাল (শুধু অ্যাপে) রাখতে সেই পাতা খুলে নিচের "🔒 শুধু অ্যাপে রাখুন" চাপুন।</div>
    <label style="display:block;margin:8px 0"><input type="radio" name="pdfdef" ${p.def ? 'checked' : ''} onchange="pdfDefSet(true)"> সব পাতায় PDF চালু (যেটা বন্ধ করব সেটা বাদ)</label>
    <label style="display:block;margin:8px 0"><input type="radio" name="pdfdef" ${p.def ? '' : 'checked'} onchange="pdfDefSet(false)"> সব পাতা লোকাল (যেটায় চালু করব শুধু সেটায় PDF)</label>
    <div class="hint">আলাদা করে বন্ধ করা পাতা: ${p.off.length ? esc(p.off.join(', ')) : 'নেই'}${p.on.length ? '<br>আলাদা করে চালু করা পাতা: ' + esc(p.on.join(', ')) : ''}</div><div id="ad_msg" class="warn" style="display:none"></div></div>` +
    `<div class="cx"><b>📨 প্রশ্নের অনুরোধ (${bn(rows.length)}টি)</b></div>` + (rows.length ? rows.map((r, i) => `<div class="cx" style="border-left-color:${r.done ? '#128c4a' : '#b45309'}"><b>${esc(r.company)}</b> — ${esc(r.post || '')}<div class="hint">${esc(r.person || '')} • ${esc(String(r.count || ''))}টি • ${esc(r.kind || '')}</div>${r.note ? `<div class="hint" style="white-space:pre-line">${esc(r.note)}</div>` : ''}
    <a class="btn sm" style="text-decoration:none;display:inline-block" href="tel:${esc(r.phone)}">📞 ${esc(r.phone)}</a> <button class="btn sm" style="background:#128c4a" onclick="orderAct(${i},'done')">${r.done ? '↩️ অপেক্ষায় দিন' : '✅ সম্পন্ন'}</button> <button class="btn sm" style="background:#dc2626" onclick="orderAct(${i},'del')">🗑️</button></div>`).join('') : sEmpty('📭', 'এখনো কোনো অনুরোধ আসেনি।'));
}
async function orderAct(i, a) {
  const m = await sme(); const r = _acache.qorders && _acache.qorders[i]; if (!m || !r) return;
  try { const d = m.f.F.doc(m.f.db, 'qorders', r.id); if (a === 'del') { if (!confirm('মুছবেন?')) return; await m.f.F.deleteDoc(d); } else await m.f.F.updateDoc(d, {done: !r.done}); adminPage('ord'); } catch (e) { alert('হয়নি।'); }
}

// =====================================================================
//  নতুন আপডেট: নোটিশ বোর্ড, আজকের প্রশ্ন, গ্রুপে আইকন, নোটপ্যাড, টুলস, পরিসংখ্যান, জুম
// =====================================================================
[{id: 'notes', name: 'নোটপ্যাড ও নোট', ic: '🗒️', color: '#7c3aed', sub: 'নোট, ডক, শিট, তারিখে নোটিফিকেশন'}, {id: 'tools', name: 'দৈনন্দিন টুলস', ic: '🧰', color: '#0891b2', sub: 'ক্যালকুলেটর, তেল খরচ, ইউনিট, বয়স'}, {id: 'viewset', name: 'দেখার সেটিং', ic: '🔎', color: '#475569', sub: 'লেখা ছোট-বড় ও রং'}, {id: 'qorder', name: 'চাকরির প্রশ্ন নিন', ic: '📨', color: '#b45309', sub: 'কোম্পানির জন্য প্রশ্ন'}].forEach(x => { if (!CATS.find(c => c.id === x.id)) CATS.push(x); });
const todayS = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dTo = iso => { const a = String(iso).split('-').map(Number); if (a.length < 3 || !a[0]) return NaN; return Math.round((new Date(a[0], a[1] - 1, a[2]) - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 864e5); };
const bnDate = iso => { const a = String(iso || '').split('-'); return a.length === 3 ? bn(+a[2]) + '/' + bn(+a[1]) + '/' + bn(+a[0]) : ''; };
const ntcCfg = () => { try { const c = APPCFG().ntc || {}; return {nw: c.nw !== false, jb: c.jb !== false}; } catch (e) { return {nw: true, jb: true}; } };
const isExp = c => !!(c.exp && c.exp < todayS());

// ---- আজকের প্রশ্ন (লুকান / ঠিক করা) ----
function dailyCardNew() {
  const c = APPCFG().daily || {}, adm = isAdminFlag(); if (c.hide && !adm) return '';
  const q = QUIZ[(Number.isInteger(c.pick) && c.pick >= 0 ? c.pick : dayIdx()) % QUIZ.length], st = load('daily', {}), ans = st.d === todayISO() ? st.a : -1;
  return `<div class="daily" id="daily" ${c.hide ? 'style="opacity:.55"' : ''}>${adm ? `<div class="adbar" style="margin:0 0 8px"><span>🛡️ আজকের প্রশ্ন${c.hide ? ' (লুকানো)' : ''}</span><button onclick="dailyAdmin()">✏️ বদলান / লুকান</button></div>` : ''}<div class="dh2"><b>আজকের প্রশ্ন</b><span>${ans >= 0 ? (ans === q[2] ? '✅ সঠিক' : '❌ ভুল') : ''}</span></div><div class="dq">${esc(q[0])}</div>` +
    q[1].map((o, i) => `<div class="opt ${ans >= 0 ? (i === q[2] ? 'ok' : (i === ans ? 'no' : '')) : ''}" onclick="dailyPick(${i})">${esc(o)}</div>`).join('') + '</div>';
}
function dailyAdmin() {
  const c = APPCFG().daily || {}, fix = Number.isInteger(c.pick) && c.pick >= 0;
  showModal(`<h3 style="margin:0 0 8px">✏️ আজকের প্রশ্ন</h3><label style="display:block;margin:6px 0"><input type="radio" name="dq" value="auto" ${fix ? '' : 'checked'}> প্রতিদিন নিজে বদলাবে (একটার পর একটা)</label>
    <label style="display:block;margin:6px 0"><input type="radio" name="dq" value="fix" ${fix ? 'checked' : ''}> সবসময় এই প্রশ্নটি দেখাবে:</label>
    <select class="inp" id="dq_sel">${QUIZ.map((q, i) => `<option value="${i}" ${c.pick === i ? 'selected' : ''}>${esc(String(q[0]).slice(0, 70))}</option>`).join('')}</select>
    <label style="display:block;margin:8px 0"><input type="checkbox" id="dq_hide" ${c.hide ? 'checked' : ''}> ব্যবহারকারীদের থেকে পুরোটা লুকান</label>
    <div class="hint">নিজের নতুন প্রশ্ন যোগ করতে: অ্যাডমিন → নতুন → কুইজ প্রশ্ন।</div><button class="btn" onclick="dailySave()">💾 সেভ করুন</button>`);
}
async function dailySave() {
  const fix = (document.querySelector('input[name=dq]:checked') || {}).value === 'fix', pick = fix ? +document.getElementById('dq_sel').value : -1;
  if (await pdfSaveCfg({daily: {hide: document.getElementById('dq_hide').checked, pick}})) { closeModal(); home(); }
}

// ---- নোটিশ বোর্ড (হোমে) ----
function noticeItems() {
  const out = [], tdy = todayS(), cf = ntcCfg();
  if (cf.jb) ADMIN_CONTENT.filter(c => c.type === 'job' && c.pub !== false && c.job && c.job.deadline).forEach(c => { const d = dTo(c.job.deadline); if (d >= 0 && d <= 30) out.push({k: 0, d, ic: '💼', t: ((c.job.c ? c.job.c + ' — ' : '') + (c.title || '')), s: d === 0 ? 'আজই শেষ দিন!' : 'আর ' + bn(d) + ' দিন', hot: d <= 3, go: "open_('job')"}); });
  (() => { const pn = ADMIN_CONTENT.find(c => c.type === 'notice' && c.pin && !isExp(c)); let dx = []; try { dx = JSON.parse(localStorage.getItem('noticeX') || '[]'); } catch (e) {} return ADMIN_CONTENT.filter(c => c.type === 'notice' && c.pub !== false && !isExp(c) && !(pn && c.id === pn.id && !dx.includes(pn.id))); })().slice(0, 6).forEach(c => out.push({k: 1, d: 99, ic: c.pin ? '📌' : '📢', t: c.title || (c.body || '').slice(0, 50), s: c.exp ? 'শেষ: ' + bnDate(c.exp) : '', hot: false, go: `boardItem('${esc(c.id)}')`, id: c.id}));
  if (cf.nw) ADMIN_CONTENT.filter(c => ['node', 'article', 'video', 'audio', 'image', 'section'].includes(c.type) && c.pub !== false && c.at && Date.now() - c.at < 3 * 864e5).slice(0, 4).forEach(c => out.push({k: 2, d: 98, ic: '🆕', t: 'নতুন: ' + (c.title || ''), s: '', hot: false, go: c.type === 'node' ? `push(()=>home());nodePage('${esc(c.id)}')` : c.type === 'section' ? `open_('sec_${esc(c.id)}')` : `boardItem('${esc(c.id)}')`}));
  try { notesDue().forEach(n => out.push({k: -1, d: n.dd, ic: '🗒️', t: 'আমার নোট: ' + n.t, s: n.dd < 0 ? 'সময় পার হয়ে গেছে' : n.dd === 0 ? 'আজ' : 'আর ' + bn(n.dd) + ' দিন', hot: n.dd <= 0, go: "open_('notes')"})); } catch (e) {}
  return out.sort((a, b) => a.k - b.k || a.d - b.d);
}
function noticeBoard(adm) {
  const items = noticeItems(); if (!items.length && !adm) return '';
  return `<div class="nboard" id="nboard"><div class="nbh"><b>📌 নোটিশ বোর্ড</b>${adm ? `<span><button onclick="ntcNew()">➕ নোটিশ</button></span>` : ''}</div>` +
    (items.length ? items.map(x => `<div class="nbi ${x.hot ? 'hot' : ''}" onclick="${x.go}"><span class="nbic">${x.ic}</span><span class="nbt">${esc(x.t)}</span>${x.s ? `<span class="nbs">${esc(x.s)}</span>` : ''}${adm && x.id ? `<button class="nbx" onclick="event.stopPropagation();adDelNotice('${esc(x.id)}')">🗑️</button>` : ''}</div>`).join('') : '<div class="hint" style="padding:6px 2px">এখন কোনো নোটিশ নেই। "➕ নোটিশ" চেপে দিন।</div>') + '</div>';
}
function ntcNew() {
  showModal(`<h3 style="margin:0 0 8px">📣 নতুন নোটিশ</h3><input class="inp" id="nt_ti" maxlength="100" placeholder="শিরোনাম (যেমন: নতুন আপডেট হয়েছে)"><textarea class="inp" id="nt_bo" rows="4" maxlength="800" placeholder="বিস্তারিত (ঐচ্ছিক)"></textarea>
    <select class="inp" id="nt_ex"><option value="0">মেয়াদ নেই (নিজে মুছব)</option><option value="3">৩ দিন পর নিজে সরে যাবে</option><option value="7" selected>৭ দিন পর নিজে সরে যাবে</option><option value="15">১৫ দিন পর</option><option value="30">৩০ দিন পর</option></select>
    <label style="display:block;margin:8px 0"><input type="checkbox" id="nt_pin" checked> হোমের উপরে ভেসে থাকুক (পিন)</label><div id="nt_m" class="warn" style="display:none"></div><button class="btn" onclick="ntcSave()">📣 প্রকাশ করুন</button>`);
}
async function ntcSave() {
  const msg = t => { const b = document.getElementById('nt_m'); if (b) { b.style.display = 'block'; b.textContent = t; } };
  const ti = gv('nt_ti'); if (!ti) return msg('শিরোনাম লিখুন।'); const m = await sme(); if (!m) return msg('অ্যাডমিন লগইন দরকার।');
  const dd = +gv('nt_ex'); let exp = ''; if (dd) { const d = new Date(); d.setDate(d.getDate() + dd); exp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  try { await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), {type: 'notice', title: ti.slice(0, 100), body: gv('nt_bo').slice(0, 800), url: '', pub: true, pin: document.getElementById('nt_pin').checked, exp, by: m.u.uid, createdAt: m.f.F.serverTimestamp()}); await refreshContent(); closeModal(); home(); }
  catch (e) { msg('⚠️ হয়নি। ইন্টারনেট ও অ্যাডমিন লগইন দেখুন।'); }
}
async function adDelNotice(id) { if (!confirm('নোটিশটি মুছবেন?')) return; const m = await sme(); if (!m) return; try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'content', id)); await refreshContent(); home(); } catch (e) { alert('মোছা যায়নি।'); } }

// ---- হোমে অ্যাডমিনের বাড়তি বাটন (গ্রুপ ও আইকন) ----
function homeExtras() {
  try {
    const old = document.getElementById('nboard'); if (old) old.remove();
    document.querySelectorAll('#app .gh-b, #app .tl-b').forEach(e => e.remove());
    if (!document.querySelector('#app .qrow')) return;
    const adm = typeof isAdminFlag === 'function' && isAdminFlag(), html = noticeBoard(adm), anchor = document.getElementById('daily') || document.querySelector('#app .tip');
    if (html && anchor) anchor.insertAdjacentHTML('beforebegin', html);
    if (!adm) return;
    document.querySelectorAll('#app .sec-h').forEach(h => {
      const name = h.getAttribute('data-gn') || (h.dataset.gn = h.textContent.trim());
      const s = document.createElement('span'); s.className = 'gh-b';
      s.innerHTML = `<button title="এই গ্রুপে নতুন আইকন" onclick="grpAdd(this)">➕</button><button title="গ্রুপের নাম বদলান" onclick="grpRename(this)">✏️</button>`; s.dataset.gn = name; h.appendChild(s);
    });
    document.querySelectorAll('#app .tile').forEach(t => {
      const mm = (t.getAttribute('onclick') || '').match(/open_\('([^']+)'\)/); if (!mm) return; const id = mm[1]; t.style.position = 'relative';
      const s = document.createElement('span'); s.className = 'tl-b'; s.innerHTML = `<button onclick="event.stopPropagation();tileEdit('${id}')">✏️</button><button onclick="event.stopPropagation();tileDel('${id}')">🗑️</button>`; t.appendChild(s);
    });
  } catch (e) {}
}
let _presetGrp = '';
function grpAdd(b) { _presetGrp = b.parentNode.dataset.gn; _presetType = 'section'; adminPage('pub'); }
async function grpSaveLayout(mut) {
  await refreshContent(); layInit(); mut(_lay); const m = await sme(); if (!m) return false; const layout = _lay.filter(g => g.name || g.ids.length).map(g => ({name: g.name || 'গ্রুপ', ids: g.ids}));
  return pdfSaveCfg({layout});
}
async function grpPlace(id, name) { return grpSaveLayout(L => { L.forEach(g => { g.ids = g.ids.filter(x => x !== 'sec_' + id); }); const t = L.find(g => g.name === name); if (t) t.ids.push('sec_' + id); else L.push({name, ids: ['sec_' + id]}); }); }
async function grpRename(b) {
  const old = b.parentNode.dataset.gn, nn = (prompt('গ্রুপের নতুন নাম:', old) || '').trim().slice(0, 40); if (!nn || nn === old) return;
  if (await grpSaveLayout(L => { const g = L.find(x => x.name === old); if (g) g.name = nn; })) home();
}
function tileEdit(id) {
  const o = tileOv(id), c = CATS.find(x => x.id === id) || {}, nm = o.name || SHORT[id] || c.name || id, ic = o.ic || c.ic || '';
  showModal(`<h3 style="margin:0 0 8px">✏️ আইকন বদলান</h3><input class="inp" id="te_nm" maxlength="40" value="${esc(nm)}" placeholder="নাম"><input class="inp" id="te_ic" maxlength="4" value="${esc(ic)}" placeholder="ইমোজি"><div id="te_m" class="warn" style="display:none"></div><button class="btn" onclick="tileSave('${esc(id)}')">💾 সেভ করুন</button> <button class="btn sm" style="background:#475569" onclick="tileSave('${esc(id)}',1)">↩️ আসল নাম ফেরান</button>`);
}
async function tileSave(id, reset) {
  const o = Object.assign({}, tileOv(id)); if (reset) { delete o.name; delete o.ic; } else { const n = gv('te_nm'), i = Array.from(gv('te_ic')).slice(0, 2).join(''); if (n) o.name = n.slice(0, 40); if (i) o.ic = i; }
  if (await pdfSaveCfg({tiles: {[id]: o}})) { closeModal(); home(); }
}
async function tileDel(id) { if (!confirm('এই আইকনটি হোম থেকে সরাবেন? (অ্যাডমিন → রং ও পরিচয় থেকে ফেরানো যাবে)')) return; const o = Object.assign({}, tileOv(id), {hide: true}); if (await pdfSaveCfg({tiles: {[id]: o}})) home(); }

// ---- পুরনো তারিখের পত্রিকা খোঁজা ----
function paperDateBox() {
  try {
    const host = document.querySelector('#app .pad:not(#kids)'); if (!host) return;
    const nodes = ADMIN_CONTENT.filter(c => c.type === 'node' && c.parent === 'paper' && c.pd), ms = [...new Set(nodes.map(c => c.pd.slice(0, 7)))].sort().reverse();
    host.insertAdjacentHTML('afterbegin', `<div class="cx" style="border-left-color:#9333ea"><b>📅 পুরনো পত্রিকা তারিখ দিয়ে খুঁজুন</b><div class="hint">যে তারিখের পত্রিকা চান সেই তারিখ বেছে "খুঁজুন" চাপুন।</div><div class="two"><input class="inp" type="date" id="pp_d" max="${todayS()}"><button class="btn" onclick="ppFind()">🔍 খুঁজুন</button></div>
      ${ms.length ? `<div class="chips" style="margin-top:6px">${ms.map(x => `<button class="chip" onclick="ppMonth('${x}')">${bn(x.slice(5, 7))}/${bn(x.slice(0, 4))}</button>`).join('')}</div>` : ''}<div id="pp_res"></div></div>`);
  } catch (e) {}
}
function ppShow(list, note) { const r = document.getElementById('pp_res'); if (r) r.innerHTML = (note ? `<div class="hint" style="margin:8px 0">${note}</div>` : '') + list.map(c => nodeCard(c, 'paper')).join(''); }
function ppFind() {
  const d = gv('pp_d'); if (!d) return ppShow([], 'আগে একটি তারিখ বেছে নিন।');
  const all = ADMIN_CONTENT.filter(c => c.type === 'node' && c.parent === 'paper' && c.pd), hit = all.filter(c => c.pd === d);
  if (hit.length) return ppShow(hit, '✅ ' + bnDate(d) + ' এর পত্রিকা:');
  const near = all.slice().sort((a, b) => Math.abs(dTo(a.pd) - dTo(d)) - Math.abs(dTo(b.pd) - dTo(d))).slice(0, 3);
  ppShow(near, '⚠️ ' + bnDate(d) + ' তারিখের পত্রিকা এখনো যোগ হয়নি।' + (near.length ? ' কাছাকাছি তারিখের গুলো:' : ''));
}
function ppMonth(m) { ppShow(ADMIN_CONTENT.filter(c => c.type === 'node' && c.parent === 'paper' && c.pd && c.pd.slice(0, 7) === m).sort((a, b) => b.pd.localeCompare(a.pd)), '📅 ' + bn(m.slice(5, 7)) + '/' + bn(m.slice(0, 4)) + ' মাসের পত্রিকা:'); }

// ---- পাতার নিচে নাম/ক্রেডিট ও তারিখ; ভিতরেই PDF পড়া ----
function nodeExtra(id) {
  try {
    const c = ADMIN_CONTENT.find(x => x.id === id); if (!c) return; const h = document.querySelector('#app .cx h3'); if (!h) return;
    const adm = isAdminFlag(), bk = bkHtml(c.blocks, adm);
    if (c.pd || c.credit) h.parentNode.insertAdjacentHTML('beforeend', `<div class="hint" style="margin-top:10px">${c.pd ? '📅 ' + bnDate(c.pd) : ''}${c.pd && c.credit ? ' • ' : ''}${c.credit ? '✍️ ' + esc(c.credit) : ''}</div>`);
    if (c.qz && c.qz.length) h.parentNode.insertAdjacentHTML('beforeend', qzHtml(c.qz, 'n' + id));
    if (bk) h.parentNode.insertAdjacentHTML('beforeend', `<div class="bks">${bk}</div>`);
  } catch (e) {}
}
function pdfInline(u) { return `<button class="btn" style="width:100%;margin:6px 0;background:#b91c1c" data-u="${esc(u)}" onclick="pvToggle(this)">📖 অ্যাপের ভিতরে পড়ুন</button><div class="pvbox"></div>`; }
function pvToggle(b) {
  const el = b.nextElementSibling; if (el.innerHTML) { el.innerHTML = ''; b.textContent = '📖 অ্যাপের ভিতরে পড়ুন'; return; }
  const u = b.dataset.u, dm = u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/), src = dm ? 'https://drive.google.com/file/d/' + dm[1] + '/preview' : 'https://docs.google.com/gview?embedded=1&url=' + encodeURIComponent(u);
  el.innerHTML = `<iframe src="${esc(src)}" style="width:100%;height:70vh;border:1px solid #ddd;border-radius:10px"></iframe><div class="hint">না খুললে নিচের "PDF খুলুন" বাটন চাপুন।</div>`; b.textContent = '❌ বন্ধ করুন';
}

// ---- পরিসংখ্যান (অ্যাডমিন) ----
async function statView(m) {
  const rows = await sList(m.f, ['profiles'], m.f.F.limit(3000)), now = Date.now(), t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const a1 = rows.filter(r => r.at >= now - 864e5).length, a7 = rows.filter(r => r.at >= now - 7 * 864e5).length, nw = rows.filter(r => (r.first || 0) >= t0.getTime()).length, n7 = rows.filter(r => (r.first || 0) >= now - 7 * 864e5).length;
  const rec = rows.slice().sort((x, y) => (y.at || 0) - (x.at || 0)).slice(0, 15);
  const box = (n, l, c) => `<div style="flex:1;min-width:46%;background:${c}1a;border-radius:12px;padding:10px;margin:4px;text-align:center"><div style="font-size:28px;font-weight:800;color:${c}">${bn(n)}</div><div style="font-size:12.5px">${l}</div></div>`;
  return `<div class="cx"><b>👥 ব্যবহারকারীর পরিসংখ্যান</b><div style="display:flex;flex-wrap:wrap">${box(rows.length, 'মোট অ্যাকাউন্ট', '#0369a1')}${box(a1, 'গত ২৪ ঘণ্টায় সক্রিয়', '#b45309')}${box(a7, 'গত ৭ দিনে সক্রিয়', '#128c4a')}${box(nw, 'আজ নতুন', '#7c3aed')}${box(n7, 'গত ৭ দিনে নতুন', '#be185d')}</div>
    <div class="hint">যারা লগইন করে অ্যাপ খুলেছেন তাদের গোনা হয়। লগইন ছাড়া ব্যবহারকারী এখানে আসে না।</div></div>
    <div class="cx"><b>🕒 সবশেষ সক্রিয়</b>${rec.length ? rec.map(r => `<div class="hint" style="border-top:1px solid #eee;padding:5px 0">${esc(r.name || 'নামহীন')} <span style="float:right">${sdate(r.at)}</span></div>`).join('') : sEmpty('📭', 'এখনো কেউ নেই।')}</div>
    <div class="cx"><b>📢 নোটিশ বোর্ডের সেটিং</b><label style="display:block;margin:6px 0"><input type="checkbox" ${ntcCfg().jb ? 'checked' : ''} onchange="ntcSet('jb',this.checked)"> চাকরির মেয়াদ কত দিন বাকি — নিজে দেখাক</label>
    <label style="display:block;margin:6px 0"><input type="checkbox" ${ntcCfg().nw ? 'checked' : ''} onchange="ntcSet('nw',this.checked)"> নতুন কনটেন্ট দিলে "🆕 নতুন" নিজে দেখাক (৩ দিন)</label><button class="btn sm" onclick="ntcNew()">➕ নতুন নোটিশ দিন</button><div id="ad_msg" class="warn" style="display:none"></div></div>`;
}
async function ntcSet(k, v) { const c = Object.assign({}, ntcCfg(), {[k]: !!v}); if (await pdfSaveCfg({ntc: c})) adMsg('✅ সেভ হয়েছে।'); }

// ---- দেখার সেটিং: জুম, রং, শেষ পাতায় ফেরা ----
function uzoomApply() { try { const z = +localStorage.getItem('uzoom'); document.body.style.zoom = z >= 70 && z <= 160 ? z / 100 : ''; } catch (e) {} }
function uzoomSet(v) { try { v === 0 ? localStorage.removeItem('uzoom') : localStorage.setItem('uzoom', String(Math.max(70, Math.min(160, v)))); } catch (e) {} uzoomApply(); viewsetPage(); }
function viewsetPage() {
  tab = 'profile'; let z = 100, nr = false; try { z = +localStorage.getItem('uzoom') || 100; nr = localStorage.getItem('noresume') === '1'; } catch (e) {}
  render(pageHead('দেখার সেটিং') + hero('🔎', 'দেখার সেটিং', 'আপনার মতো করে সাজান') + `<div class="pad" id="vs"><div class="box" style="text-align:center"><b>🔎 পুরো অ্যাপ ছোট-বড় (জুম)</b>
    <div style="font-size:30px;font-weight:800;margin:8px 0">${bn(z)}%</div><div class="two"><button class="btn" onclick="uzoomSet(${z - 10})">➖ ছোট</button><button class="btn" onclick="uzoomSet(${z + 10})">➕ বড়</button></div><button class="btn sm" style="background:#475569;margin-top:8px" onclick="uzoomSet(0)">↩️ স্বাভাবিক (১০০%)</button></div>
    ${ucolorBox()}<div class="box"><b>🌙 রাতের মোড</b><div style="margin-top:6px"><button class="btn sm" onclick="toggleDark()">🌙 চালু / বন্ধ</button></div></div>
    <div class="box"><label><input type="checkbox" ${nr ? '' : 'checked'} onchange="try{localStorage.setItem('noresume',this.checked?'0':'1');if(!this.checked)localStorage.removeItem('lastPg')}catch(e){}"> অ্যাপ আবার খুললে শেষ দেখা পাতায় ফিরুন</label></div></div>`);
}

// ---- নোটপ্যাড, ডক, শিট (তারিখে নোটিফিকেশনসহ) ----
const notesLoad = () => { try { const a = JSON.parse(localStorage.getItem('notes') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const notesSaveAll = a => { try { localStorage.setItem('notes', JSON.stringify(a)); } catch (e) { alert('জায়গা শেষ, সেভ হয়নি।'); } };
function notesDue() {
  return notesLoad().filter(n => n.d && !n.done && n.r).map(n => ({t: n.t || 'নোট', dd: dTo(n.d), ah: +n.ah || 0})).filter(n => n.dd <= n.ah).sort((a, b) => a.dd - b.dd);
}
const LNP = () => { try { const C = window.Capacitor; if (C && C.isNativePlatform && C.isNativePlatform()) return capP('LocalNotifications'); } catch (e) {} return null; };
const notifId = id => (parseInt(String(id).slice(-7), 36) || 1) % 2000000000;
async function notifCancel(id) { const ln = LNP(); if (!ln) return; try { await ln.cancel({notifications: [{id: notifId(id)}]}); } catch (e) {} }
async function notifSchedule(n) {
  const ln = LNP(); if (!ln) return 'web'; await notifCancel(n.id); if (!n.r || !n.d || n.done) return 'off';
  try {
    const p = await ln.requestPermissions(); if (p.display !== 'granted') return 'denied';
    const a = n.d.split('-').map(Number), tm = (n.tm || '09:00').split(':').map(Number), at = new Date(a[0], a[1] - 1, a[2] - (+n.ah || 0), tm[0] || 9, tm[1] || 0, 0);
    if (at <= new Date()) return 'past';
    await ln.schedule({notifications: [{id: notifId(n.id), title: 'আমার ভাই: ' + (n.t || 'নোট'), body: (n.b || '').slice(0, 100) || 'আপনার নোটের সময় হয়েছে', schedule: {at, allowWhileIdle: true}}]}); return 'ok';
  } catch (e) { return 'err'; }
}
let _nk = 'note', _nid = '', _sh = null;
function notesPage(k) {
  if (k) _nk = k; tab = 'home'; const all = notesLoad(), list = all.filter(n => (n.k || 'note') === _nk).sort((a, b) => (a.d || '9').localeCompare(b.d || '9') || (b.u || 0) - (a.u || 0));
  const tabs = [['note', '🗒️ নোট'], ['doc', '📄 ডক'], ['sheet', '📊 শিট']];
  render(pageHead('নোটপ্যাড') + hero('🗒️', 'আমার নোট', 'নোট, ডক ও শিট — তারিখে নোটিফিকেশন') + `<div class="pad"><div class="seg">${tabs.map(t => `<button class="${_nk === t[0] ? 'on' : ''}" onclick="notesPage('${t[0]}')">${t[1]}</button>`).join('')}</div>
    <button class="btn" style="width:100%;margin:8px 0" onclick="notesEdit('')">➕ নতুন ${{note: 'নোট', doc: 'ডক', sheet: 'শিট'}[_nk]}</button>` +
    (list.length ? list.map(n => { const dd = n.d ? dTo(n.d) : NaN; return `<div class="nk" style="border-left-color:${n.done ? '#9ca3af' : '#7c3aed'}" onclick="notesEdit('${esc(n.id)}')"><span class="nki" style="background:#7c3aed22">${{note: '🗒️', doc: '📄', sheet: '📊'}[n.k || 'note']}</span><div class="nkt"><b style="${n.done ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(n.t || 'নামহীন')}</b><small>${n.d ? '📅 ' + bnDate(n.d) + (n.r ? ' 🔔' : '') + (!n.done && dd === 0 ? ' • আজ' : !n.done && dd < 0 ? ' • সময় পার' : '') : esc(((n.k === 'sheet' ? '' : n.b) || '').slice(0, 40))}</small></div><span class="nka">›</span></div>`; }).join('') : sEmpty('📭', 'এখনো কিছু নেই। ওপরের বাটনে চাপুন।')) + '</div>');
}
function notesEdit(id) {
  _nid = id; const n = notesLoad().find(x => x.id === id) || {k: _nk, t: '', b: '', d: '', tm: '09:00', r: false, ah: 0}, k = n.k || _nk; _nk = k;
  if (k === 'sheet') { try { _sh = JSON.parse(n.b || 'null'); } catch (e) { _sh = null; } if (!Array.isArray(_sh) || !_sh.length) _sh = [['তারিখ', 'বিষয়', 'টাকা'], ['', '', ''], ['', '', '']]; }
  const tools = k === 'doc' ? `<div class="tbar">${[['b', '<b>B</b> মোটা'], ['h1', 'বড় শিরোনাম'], ['h2', 'মাঝারি'], ['li', '• তালিকা'], ['red', '🔴 লাল']].map(x => `<button type="button" onclick="tbIns('nt_b','${x[0]}')">${x[1]}</button>`).join('')}</div>` : '';
  stack.push(() => notesPage(k));
  render(pageHead(n.id ? 'নোট সম্পাদনা' : 'নতুন ' + {note: 'নোট', doc: 'ডক', sheet: 'শিট'}[k]) + `<div class="pad"><div class="cx"><input class="inp" id="nt_t" maxlength="100" placeholder="শিরোনাম" value="${esc(n.t)}">
    ${k === 'sheet' ? `<div id="sh_w">${shHtml()}</div><div class="two"><button class="btn sm" onclick="shAdd('r')">➕ সারি</button><button class="btn sm" onclick="shAdd('c')">➕ কলাম</button></div>`
      : `${tools}<textarea class="inp" id="nt_b" rows="${k === 'doc' ? 14 : 7}" placeholder="${k === 'doc' ? 'এখানে লিখুন (# বড় শিরোনাম, - তালিকা, **মোটা**)' : 'নোট লিখুন (যেমন: রহিমের কাছে ১০০ টাকা ধার নিয়েছি)'}">${esc(n.b)}</textarea>`}
    <div class="hint" style="margin-top:8px"><b>🔔 তারিখে মনে করিয়ে দিন</b></div><div class="two"><input class="inp" type="date" id="nt_d" value="${esc(n.d || '')}"><input class="inp" type="time" id="nt_tm" value="${esc(n.tm || '09:00')}"></div>
    <select class="inp" id="nt_ah"><option value="0" ${!n.ah ? 'selected' : ''}>ওই দিনই জানান</option><option value="1" ${+n.ah === 1 ? 'selected' : ''}>১ দিন আগে জানান</option><option value="3" ${+n.ah === 3 ? 'selected' : ''}>৩ দিন আগে জানান</option></select>
    <label style="display:block;margin:8px 0"><input type="checkbox" id="nt_r" ${n.r ? 'checked' : ''}> মোবাইলে নোটিফিকেশন দিন</label>
    <div id="nt_msg" class="warn" style="display:none"></div><button class="btn" onclick="notesSave()">💾 সেভ করুন</button>
    ${n.id ? `<button class="btn sm" style="background:#128c4a" onclick="notesDone()">${n.done ? '↩️ আবার চালু' : '✅ হয়ে গেছে'}</button><button class="btn sm" style="background:#dc2626" onclick="notesDel()">🗑️ মুছুন</button>` : ''}
    ${k !== 'sheet' && n.id ? `<button class="btn sm" style="background:#b91c1c" onclick="notesPdf()">📄 PDF</button>` : ''}</div></div>`);
}
const shCols = () => Math.max(...(_sh || [[]]).map(r => r.length));
const shSums = () => { const nc = shCols(), out = []; for (let c = 0; c < nc; c++) { let s = 0, any = false; _sh.slice(1).forEach(r => { const v = parseFloat(_bd(String(r[c] || '').replace(/,/g, ''))); if (!isNaN(v)) { s += v; any = true; } }); out.push(c === 0 ? 'মোট' : any ? bn(Math.round(s * 100) / 100) : ''); } return out; };
function shHtml() {
  const nc = shCols();
  return `<div style="overflow-x:auto"><table class="sht">${_sh.map((r, i) => `<tr>${Array.from({length: nc}, (_, c) => `<${i ? 'td' : 'th'}><input value="${esc(r[c] || '')}" oninput="shSet(${i},${c},this.value)"></${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}<tr class="shs">${shSums().map(s => `<td>${s}</td>`).join('')}</tr></table></div>`;
}
function shSet(r, c, v) { while (_sh[r].length <= c) _sh[r].push(''); _sh[r][c] = v; const w = document.querySelector('.shs'); if (w) w.innerHTML = shSums().map(s => `<td>${s}</td>`).join(''); }
function shAdd(w) { if (w === 'r') _sh.push(Array(shCols()).fill('')); else { const n = shCols() + 1; _sh.forEach((r, i) => { while (r.length < n) r.push(i ? '' : 'কলাম'); }); } document.getElementById('sh_w').innerHTML = shHtml(); }
async function notesSave() {
  const msg = t => { const b = document.getElementById('nt_msg'); if (b) { b.style.display = 'block'; b.textContent = t; } };
  const k = _nk, t = gv('nt_t'); if (!t) return msg('শিরোনাম লিখুন।'); const all = notesLoad(); let n = all.find(x => x.id === _nid);
  if (!n) { n = {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), k}; all.push(n); }
  Object.assign(n, {k, t, b: k === 'sheet' ? JSON.stringify(_sh) : (document.getElementById('nt_b').value || '').slice(0, 20000), d: gv('nt_d'), tm: gv('nt_tm') || '09:00', ah: +gv('nt_ah') || 0, r: chk('nt_r'), u: Date.now(), done: false});
  if (n.r && !n.d) return msg('নোটিফিকেশনের জন্য তারিখ দিন।');
  notesSaveAll(all); const r = n.r ? await notifSchedule(n) : (await notifCancel(n.id), 'off');
  const info = {web: 'সেভ হয়েছে। (নোটিফিকেশন শুধু অ্যাপে আসে; এখানে অ্যাপ খুললে নোটিশ বোর্ডে দেখাবে।)', denied: 'সেভ হয়েছে, কিন্তু নোটিফিকেশনের অনুমতি দেওয়া হয়নি। ফোনের সেটিংসে অনুমতি দিন।', past: 'সেভ হয়েছে, কিন্তু সময়টি পার হয়ে গেছে।', err: 'সেভ হয়েছে, নোটিফিকেশন ঠিক করা যায়নি।'}[r];
  if (info) alert(info); stack.pop(); notesPage(k);
}
function notesDone() { const all = notesLoad(), n = all.find(x => x.id === _nid); if (!n) return; n.done = !n.done; notesSaveAll(all); n.done ? notifCancel(n.id) : notifSchedule(n); stack.pop(); notesPage(n.k); }
function notesDel() { if (!confirm('মুছে ফেলবেন?')) return; const all = notesLoad(), n = all.find(x => x.id === _nid); notifCancel(_nid); notesSaveAll(all.filter(x => x.id !== _nid)); stack.pop(); notesPage(n ? n.k : 'note'); }
function notesPdf() { const n = notesLoad().find(x => x.id === _nid); if (n) pdfShareText(n.t || 'নোট', (n.b || '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').replace(/\{red:([^}]*)\}/g, '$1')); }

// ---- দৈনন্দিন টুলস ----
let _calc = '';
function tlCalc(k) {
  if (k === 'C') _calc = ''; else if (k === '⌫') _calc = _calc.slice(0, -1);
  else if (k === '=') { try { const e = _bd(_calc).replace(/×/g, '*').replace(/÷/g, '/'); if (!/^[0-9+\-*/().% ]+$/.test(e)) throw 0; const v = Function('"use strict";return (' + e + ')')(); _calc = isFinite(v) ? String(Math.round(v * 1e8) / 1e8) : 'ভুল'; } catch (e) { _calc = 'ভুল'; } }
  else { if (_calc === 'ভুল') _calc = ''; _calc += k; }
  const d = document.getElementById('cl_d'); if (d) d.textContent = _calc ? bn(_calc) : '০';
}
const nv = id => parseFloat(_bd(gv(id))) || 0;
function tlFuel() { const km = nv('tf_k'), mi = nv('tf_m'), pr = nv('tf_p'), L = mi ? km / mi : 0; document.getElementById('tf_r').innerHTML = mi && km ? `⛽ তেল লাগবে: <b>${bn(Math.round(L * 100) / 100)} লিটার</b>${pr ? `<br>💰 খরচ: <b>${bn(Math.round(L * pr))} টাকা</b> • কিমি প্রতি ${bn(Math.round(L * pr / km * 100) / 100)} টাকা` : ''}` : ''; }
const UNITS = {km: ['কিমি ↔ মাইল', 'কিমি', 'মাইল', 0.621371], kg: ['কেজি ↔ পাউন্ড', 'কেজি', 'পাউন্ড', 2.20462], l: ['লিটার ↔ গ্যালন', 'লিটার', 'গ্যালন', 0.264172], m: ['মিটার ↔ ফুট', 'মিটার', 'ফুট', 3.28084], c: ['°C ↔ °F', '°C', '°F', 0]};
function tlUnit() { const t = gv('tu_t'), u = UNITS[t], v = parseFloat(_bd(gv('tu_v'))), r = document.getElementById('tu_r'); if (isNaN(v)) return r.innerHTML = ''; const a = t === 'c' ? v * 9 / 5 + 32 : v * u[3], b = t === 'c' ? (v - 32) * 5 / 9 : v / u[3]; r.innerHTML = `${bn(v)} ${u[1]} = <b>${bn(Math.round(a * 1000) / 1000)} ${u[2]}</b><br>${bn(v)} ${u[2]} = <b>${bn(Math.round(b * 1000) / 1000)} ${u[1]}</b>`; }
function tlAge() { const d = gv('ta_d'); if (!d) return; const a = d.split('-').map(Number), n = new Date(); let y = n.getFullYear() - a[0], m = n.getMonth() + 1 - a[1], dd = n.getDate() - a[2]; if (dd < 0) { m--; dd += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); } if (m < 0) { y--; m += 12; } document.getElementById('ta_r').innerHTML = `বয়স: <b>${bn(y)} বছর ${bn(m)} মাস ${bn(dd)} দিন</b>`; }
function tlDate() { const a = gv('td_a'), b = gv('td_b') || todayS(), n = parseInt(_bd(gv('td_n'))); let h = ''; if (a) { const df = Math.round((new Date(b) - new Date(a)) / 864e5); h += `দুই তারিখের ব্যবধান: <b>${bn(Math.abs(df))} দিন</b>`; } if (a && !isNaN(n)) { const x = new Date(a); x.setDate(x.getDate() + n); h += `<br>${bnDate(a)} + ${bn(n)} দিন = <b>${bnDate(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'))}</b>`; } document.getElementById('td_r').innerHTML = h; }
function tlSplit() { const t = nv('ts_t'), p = nv('ts_p'); document.getElementById('ts_r').innerHTML = t && p ? `জনপ্রতি: <b>${bn(Math.round(t / p * 100) / 100)} টাকা</b>` : ''; }
function tlPct() { const x = nv('tp_x'), y = nv('tp_y'); document.getElementById('tp_r').innerHTML = y ? `${bn(x)}% of ${bn(y)} = <b>${bn(Math.round(x * y) / 100)}</b><br>${bn(y)} থেকে ${bn(x)}% ছাড়ে = <b>${bn(Math.round(y * (100 - x)) / 100)}</b>` : ''; }
function tlCur() { const a = nv('tc_a'), r = nv('tc_r'); document.getElementById('tc_r2').innerHTML = a && r ? `= <b>${bn(Math.round(a * r * 100) / 100)} টাকা</b>` : ''; }
function toolsPage() {
  tab = 'home'; const key = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '%', '+', 'C', '⌫', '(', ')'];
  const T = (ic, t, inner, open) => `<details class="tl" ${open ? 'open' : ''}><summary><span>${ic}</span> ${t}</summary><div class="tlb">${inner}</div></details>`;
  render(pageHead('দৈনন্দিন টুলস') + hero('🧰', 'দৈনন্দিন টুলস', 'দরকারি হিসাব এক জায়গায়') + `<div class="pad">
    ${T('🧮', 'ক্যালকুলেটর', `<div id="cl_d" class="cld">${_calc ? bn(_calc) : '০'}</div><div class="ckeys">${key.map(k => `<button onclick="tlCalc('${k}')">${k}</button>`).join('')}<button class="eq" onclick="tlCalc('=')">=</button></div>`, 1)}
    ${T('⛽', 'তেল খরচ', `<input class="inp" id="tf_k" inputmode="decimal" placeholder="কত কিলোমিটার যাবেন" oninput="tlFuel()"><input class="inp" id="tf_m" inputmode="decimal" placeholder="গাড়ির মাইলেজ (কিমি প্রতি লিটার)" oninput="tlFuel()"><input class="inp" id="tf_p" inputmode="decimal" placeholder="তেলের দাম (টাকা প্রতি লিটার)" oninput="tlFuel()"><div id="tf_r" class="tlr"></div>`)}
    ${T('📏', 'ইউনিট বদল', `<select class="inp" id="tu_t" onchange="tlUnit()">${Object.keys(UNITS).map(k => `<option value="${k}">${UNITS[k][0]}</option>`).join('')}</select><input class="inp" id="tu_v" inputmode="decimal" placeholder="সংখ্যা" oninput="tlUnit()"><div id="tu_r" class="tlr"></div>`)}
    ${T('🎂', 'বয়স হিসাব', `<input class="inp" type="date" id="ta_d" onchange="tlAge()"><div id="ta_r" class="tlr"></div>`)}
    ${T('📅', 'তারিখ হিসাব', `<input class="inp" type="date" id="td_a" onchange="tlDate()"><input class="inp" type="date" id="td_b" onchange="tlDate()"><div class="hint">দ্বিতীয় তারিখ ফাঁকা থাকলে আজ ধরা হবে</div><input class="inp" id="td_n" inputmode="numeric" placeholder="কত দিন যোগ করবেন (যেমন 30)" oninput="tlDate()"><div id="td_r" class="tlr"></div>`)}
    ${T('🧾', 'ভাগাভাগি (বিল)', `<input class="inp" id="ts_t" inputmode="decimal" placeholder="মোট টাকা" oninput="tlSplit()"><input class="inp" id="ts_p" inputmode="numeric" placeholder="কতজন" oninput="tlSplit()"><div id="ts_r" class="tlr"></div>`)}
    ${T('％', 'শতাংশ ও ছাড়', `<input class="inp" id="tp_x" inputmode="decimal" placeholder="কত শতাংশ" oninput="tlPct()"><input class="inp" id="tp_y" inputmode="decimal" placeholder="মূল সংখ্যা / দাম" oninput="tlPct()"><div id="tp_r" class="tlr"></div>`)}
    ${T('💱', 'বিদেশি টাকা → টাকা', `<input class="inp" id="tc_a" inputmode="decimal" placeholder="বিদেশি টাকার পরিমাণ (ডলার/রিয়াল...)" oninput="tlCur()"><input class="inp" id="tc_r" inputmode="decimal" placeholder="আজকের রেট (১ এককের দাম টাকায়)" oninput="tlCur()"><div id="tc_r2" class="tlr"></div>`)}
    </div>`);
}

// ---- সাজানো ফর্মের সরঞ্জাম: টুলবার, প্রশ্ন-উত্তর/MCQ বিল্ডার, ব্লক সাজান, ১০০ MCQ যাচাই ----
function tbIns(id, kind) {
  const t = document.getElementById(id); if (!t) return; const s = t.selectionStart, e = t.selectionEnd, v = t.value, sel = v.slice(s, e), ls = v.lastIndexOf('\n', s - 1) + 1; let nvv, cs = s;
  if (kind === 'b') { nvv = v.slice(0, s) + '**' + (sel || 'মোটা লেখা') + '**' + v.slice(e); cs = s + 2; }
  else if (kind === 'red') { nvv = v.slice(0, s) + '{red:' + (sel || 'লাল লেখা') + '}' + v.slice(e); cs = s + 5; }
  else { const p = {h1: '# ', h2: '## ', li: '- '}[kind]; nvv = v.slice(0, ls) + p + v.slice(ls); cs = s + p.length; }
  t.value = nvv; t.focus(); try { t.setSelectionRange(cs, cs); } catch (x) {}
}
const bodyTools = () => `<div class="tbar">${[['b', '<b>B</b> মোটা'], ['h1', 'বড় শিরোনাম'], ['h2', 'মাঝারি'], ['li', '• তালিকা'], ['red', '🔴 লাল']].map(x => `<button type="button" onclick="tbIns('ad_body','${x[0]}')">${x[1]}</button>`).join('')}</div>`;
function qbBox() {
  return `<div class="cx" style="border-left-color:#1d4ed8;margin:8px 0"><b>❓ প্রশ্ন–উত্তর যোগ করুন</b><div class="hint">লিখে "যোগ" চাপলে উপরের লেখার ঘরে সুন্দর করে বসে যাবে।</div>
    <details style="margin:6px 0"><summary><b>✍️ লিখিত প্রশ্ন–উত্তর</b></summary><input class="inp" id="qb_q" placeholder="প্রশ্ন"><textarea class="inp" id="qb_a" rows="2" placeholder="উত্তর"></textarea><button type="button" class="btn sm" onclick="qbAdd('qa')">➕ যোগ করুন</button></details>
    <details style="margin:6px 0"><summary><b>🔘 MCQ (৪টি উত্তর)</b></summary><input class="inp" id="qb_mq" placeholder="প্রশ্ন"><input class="inp" id="qb_o1" placeholder="ক) উত্তর"><input class="inp" id="qb_o2" placeholder="খ) উত্তর"><input class="inp" id="qb_o3" placeholder="গ) উত্তর"><input class="inp" id="qb_o4" placeholder="ঘ) উত্তর">
    <select class="inp" id="qb_ok"><option value="0">সঠিক উত্তর: ক</option><option value="1">সঠিক উত্তর: খ</option><option value="2">সঠিক উত্তর: গ</option><option value="3">সঠিক উত্তর: ঘ</option></select><input class="inp" id="qb_ex" placeholder="ব্যাখ্যা (ঐচ্ছিক)"><button type="button" class="btn sm" onclick="qbAdd('mcq')">➕ MCQ যোগ করুন</button></details>
    <button type="button" class="btn sm" style="background:#b45309" onclick="blkOpen()">🔀 ব্লক সাজান (উপর-নিচ, বদল, মোছা)</button><button type="button" class="btn sm" style="background:#475569" onclick="qbPreview()">👁️ প্রিভিউ</button><div id="qb_m" class="warn" style="display:none"></div></div>`;
}
function qbAdd(kind) {
  const b = document.getElementById('ad_body'), m = document.getElementById('qb_m'), er = t => { m.style.display = 'block'; m.textContent = t; }; let add;
  const n = ((b.value.match(/^\*\*[০-৯\d]+[.।]/gm) || []).length) + 1, N = bn(n);
  if (kind === 'qa') { const q = gv('qb_q'), a = gv('qb_a'); if (!q || !a) return er('প্রশ্ন ও উত্তর দুটোই লিখুন।'); add = `**${N}. ${q}**\n${a}`; ['qb_q', 'qb_a'].forEach(i => document.getElementById(i).value = ''); }
  else { const q = gv('qb_mq'), o = [1, 2, 3, 4].map(i => gv('qb_o' + i)), k = +gv('qb_ok'); if (!q) return er('প্রশ্ন লিখুন।'); if (o.filter(Boolean).length < 2) return er('কমপক্ষে দুটি উত্তর দিন।'); if (!o[k]) return er('সঠিক উত্তরের ঘরটি ফাঁকা।'); const L = ['ক', 'খ', 'গ', 'ঘ']; add = `**${N}. ${q}**\n${o.map((x, i) => x ? L[i] + ') ' + x : '').filter(Boolean).join('\n')}\n✅ উত্তর: ${L[k]}) ${o[k]}${gv('qb_ex') ? '\nব্যাখ্যা: ' + gv('qb_ex') : ''}`; ['qb_mq', 'qb_o1', 'qb_o2', 'qb_o3', 'qb_o4', 'qb_ex'].forEach(i => document.getElementById(i).value = ''); }
  b.value = (b.value.trim() ? b.value.replace(/\s+$/, '') + '\n\n' : '') + add; m.style.display = 'block'; m.textContent = '✅ যোগ হয়েছে (প্রশ্ন নম্বর ' + N + ')।';
}
function qbPreview() { showModal('<h3 style="margin:0 0 8px">👁️ প্রিভিউ</h3><div class="rich">' + rich(document.getElementById('ad_body').value) + '</div>'); }
let _blk = [], _blkE = -1;
function blkOpen() { _blk = document.getElementById('ad_body').value.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean); _blkE = -1; blkDraw(); }
function blkDraw() {
  showModal(`<h3 style="margin:0 0 8px">🔀 ব্লক সাজান</h3><div class="hint">প্রতিটি অংশ (প্রশ্ন বা অনুচ্ছেদ) আলাদা ব্লক। ওঠান, নামান, বদলান বা মুছুন।</div>` + (_blk.length ? _blk.map((x, i) => `<div class="blk">${_blkE === i ? `<div style="flex:1"><textarea class="inp" id="blk_e" rows="5">${esc(x)}</textarea><button class="btn sm" onclick="blkOk(${i})">✔️ ঠিক</button></div>` : `<div class="blkt">${bn(i + 1)}. ${esc(x.replace(/[*#{}]/g, '').split('\n')[0].slice(0, 70))}</div><div class="blkb"><button onclick="blkMv(${i},-1)">⬆️</button><button onclick="blkMv(${i},1)">⬇️</button><button onclick="_blkE=${i};blkDraw()">✏️</button><button onclick="blkDel(${i})">🗑️</button></div>`}</div>`).join('') : sEmpty('📭', 'কোনো ব্লক নেই।')) + `<button class="btn" onclick="blkApply()">✔️ ঠিক আছে, লেখায় বসান</button>`);
}
function blkMv(i, d) { const j = i + d; if (j < 0 || j >= _blk.length) return; [_blk[i], _blk[j]] = [_blk[j], _blk[i]]; blkDraw(); }
function blkDel(i) { _blk.splice(i, 1); blkDraw(); }
function blkOk(i) { _blk[i] = (document.getElementById('blk_e').value || '').trim() || _blk[i]; _blkE = -1; blkDraw(); }
function blkApply() { if (_blkE >= 0) blkOk(_blkE); document.getElementById('ad_body').value = _blk.join('\n\n'); closeModal(); }
function bulkCheck(id) {
  const t = gv(id); if (!t) return alert('আগে প্রশ্নগুলো পেস্ট করুন।'); const lines = t.split('\n').map((l, i) => [i + 1, l]).filter(x => x[1].trim()); let ok = 0; const bad = [];
  lines.forEach(([n, l]) => { parseQuizBulk(l).length ? ok++ : bad.push(n); });
  showModal(`<h3 style="margin:0 0 8px">👁️ যাচাই</h3><div style="font-size:15px">✅ ঠিক আছে: <b>${bn(ok)}</b>টি প্রশ্ন<br>${bad.length ? `⚠️ বোঝা যায়নি: <b>${bn(bad.length)}</b>টি লাইন (লাইন নম্বর: ${bad.slice(0, 40).map(bn).join(', ')})<div class="hint">প্রতি লাইনে হবে: প্রশ্ন | উত্তর১ | উত্তর২ | উত্তর৩ | উত্তর৪ | সঠিক নম্বর | ব্যাখ্যা</div>` : '🎉 সব লাইন ঠিক আছে।'}</div>`);
}
async function pdfShareText(title, text) {
  try {
    const r = await pdfBuild(title, text), bytes = pdfMulti(r.jpgs, r.W, r.H), fname = (title.replace(/[^\wঀ-৿]+/g, '-').slice(0, 30) || 'note') + '.pdf', C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform()) { const FS = capP('Filesystem'), SH = capP('Share'); const o = await FS.writeFile({path: fname, data: u8b64(bytes), directory: 'CACHE'}); await SH.share({title, url: o.uri, dialogTitle: 'PDF কোথায় রাখবেন?'}); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'})); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  } catch (e) { if (!(e && /cancel/i.test(String(e.message || e)))) alert('PDF হয়নি।'); }
}

// ---- অ্যাপ চালুর সময় একবারের সেটআপ (app.js শেষে ডাকা হয়) ----
function lateInit() {
  uzoomApply();
  try { step2Init(); } catch (e) { console.error(e); }
  try { step3Init(); } catch (e) {}
  try { step4Init(); } catch (e) {}
  try { step5Init(); } catch (e) { console.error(e); }
  dailyCard = dailyCardNew;
  const pp0 = paperPage; paperPage = function () { pp0.apply(this, arguments); paperDateBox(); };
  const np0 = nodePage; nodePage = function (id) { np0.apply(this, arguments); nodeExtra(id); };
  try { ndInit(); } catch (e) { console.error(e); }
  try { p36Init(); } catch (e) { console.error(e); }
  try { p43Init(); } catch (e) { console.error(e); }
  try { p44Init(); } catch (e) { console.error(e); }
  try { p45Init(); } catch (e) { console.error(e); }
  try { p46Init(); } catch (e) { console.error(e); }
  try { p47Init(); } catch (e) { console.error(e); }
  try { p48Init(); } catch (e) { console.error(e); }
  try { p49Init(); } catch (e) { console.error(e); }
  try { p50Init(); } catch (e) { console.error(e); }
  try { p51Init(); } catch (e) { console.error(e); }
  try { p52Init(); } catch (e) { console.error(e); }
  try { p53Init(); } catch (e) { console.error(e); }
  try { p54Init(); } catch (e) { console.error(e); }
  setTimeout(async () => { try { const m = await sme(); if (m && localStorage.getItem('pfDay') !== todayS()) { await upsertProfile(); localStorage.setItem('pfDay', todayS()); } } catch (e) {} }, 4500);
}
(function () { const st = document.createElement('style'); st.textContent = `
.nboard{margin:12px 12px 0;background:#fff;border:1.5px solid #fecaca;border-left:6px solid #dc2626;border-radius:14px;padding:10px 12px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.nbh{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}.nbh button{border:0;background:#c2410c;color:#fff;border-radius:9px;padding:5px 10px;font:inherit;font-size:12.5px}
.nbi{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #f1f5f9;font-size:14px}.nbi.hot .nbs{color:#dc2626;font-weight:800}.nbt{flex:1;font-weight:600}.nbs{font-size:12px;color:#b45309;white-space:nowrap}.nbx{border:0;background:none;font-size:15px}
.gh-b{float:right}.gh-b button,.tl-b button{border:0;background:#c2410c;color:#fff;border-radius:8px;padding:2px 7px;font-size:13px;margin-left:4px}
.tl-b{position:absolute;top:2px;right:2px;display:flex}.tl-b button{padding:1px 5px;font-size:12px;margin:0 1px;opacity:.92}
.fsh{background:var(--tint,#e7f3ee);color:var(--p2,#006a4e);font-weight:800;font-size:13.5px;padding:7px 10px;border-radius:9px;margin:12px 0 6px}
.tbar{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}.tbar button{border:1px solid #cbd5e1;background:#eef2f7;border-radius:8px;padding:5px 9px;font:inherit;font-size:12.5px}
.blk{display:flex;align-items:center;gap:6px;border-bottom:1px solid #eee;padding:6px 0}.blkt{flex:1;font-size:13.5px}.blkb{display:flex}.blkb button{border:0;background:var(--p2,#006a4e);color:#fff;border-radius:8px;width:32px;height:30px;margin-left:3px}
.sht{border-collapse:collapse;width:100%;min-width:300px}.sht td,.sht th{border:1px solid #cbd5e1;padding:0}.sht th{background:#e7f3ee}.sht input{width:100%;border:0;background:transparent;padding:8px 6px;font:inherit;font-size:13.5px;min-width:70px}.shs td{background:#f1f5f9;font-weight:800;padding:6px;font-size:13px}
.tl{background:var(--cd,#fff);border-radius:14px;margin:9px 0;box-shadow:0 2px 8px rgba(0,0,0,.06)}.tl summary{padding:13px 14px;font-weight:700;font-size:15.5px;cursor:pointer;list-style:none}.tl summary span{font-size:22px;margin-right:6px}.tlb{padding:0 14px 14px}
.tlr{margin-top:8px;font-size:15px;line-height:1.6}.cld{background:#111827;color:#fff;border-radius:12px;padding:12px 14px;font-size:28px;text-align:right;min-height:30px;margin-bottom:8px;word-break:break-all}
.ckeys{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.ckeys button{border:0;background:#eef2f7;border-radius:12px;padding:13px 0;font:inherit;font-size:19px;font-weight:700}.ckeys .eq{grid-column:span 4;background:var(--p2,#006a4e);color:#fff}
body.dark .nboard,body.dark .tl{background:#1f2937}
`; document.head.appendChild(st); })();


// =====================================================================
//  ধাপ ১: উপরের জুম ও রং বাটন; ছবি-ভিডিও-PDF-লিংক ব্লক; কার্ডে সংযুক্তি
// =====================================================================
function hpClose() { ['hpop', 'hpbg'].forEach(i => { const e = document.getElementById(i); if (e) e.remove(); }); }
function hpOpen(html) {
  hpClose(); const bg = document.createElement('div'); bg.id = 'hpbg'; bg.onclick = hpClose; document.body.appendChild(bg);
  const d = document.createElement('div'); d.id = 'hpop'; d.innerHTML = html; document.body.appendChild(d);
}
function hzNow() { try { return +localStorage.getItem('uzoom') || 100; } catch (e) { return 100; } }
function hzOpen() { hpOpen(`<div class="hpz"><button onclick="hzSet(-10)">A−</button><b id="hz_v">${bn(hzNow())}%</b><button onclick="hzSet(10)">A+</button><button class="hz0" onclick="hzSet(0)" title="স্বাভাবিক">↺</button></div>`); }
function hzSet(d) {
  let z = d === 0 ? 100 : Math.max(70, Math.min(160, hzNow() + d)); try { z === 100 ? localStorage.removeItem('uzoom') : localStorage.setItem('uzoom', String(z)); } catch (e) {}
  uzoomApply(); const v = document.getElementById('hz_v'); if (v) v.textContent = bn(z) + '%';
}
function hcOpen() {
  let cur = ''; try { cur = localStorage.getItem('ucolor') || ''; } catch (e) {}
  hpOpen(`<div class="hpc">${UCOLORS.map(c => `<button style="background:${c[1]};${cur === c[1] ? 'outline:3px solid #111' : ''}" title="${c[0]}" onclick="setUColor('${c[1]}',1);hcOpen()"></button>`).join('')}<button class="hz0" onclick="setUColor('',1);hcOpen()" title="আসল রং">↺</button></div>`);
}

// ---- ব্লক: লেখা / ছবি / ভিডিও / PDF / অডিও / লিংক (ক্রমে সাজানো, লুকানো যায়) ----
const BK_L = {text: '📝 লেখা', img: '🖼️ ছবি', video: '▶ ভিডিও', pdf: '📄 PDF', audio: '🎧 অডিও', link: '🔗 লিংক'};
function bkOne(b) {
  const u = safeUrl(b.v || '');
  if (b.t === 'text') return `<div class="rich" style="margin:8px 0">${rich(b.v)}</div>`;
  if (b.t === 'img') { const s = okImg(b.v) ? b.v : u; return s ? `<img loading="lazy" src="${esc(s)}" onclick="bkZoom(this.src)" style="max-width:100%;border-radius:12px;display:block;margin:8px 0">${b.c ? `<div class="hint" style="margin:-4px 0 8px">${esc(b.c)}</div>` : ''}` : ''; }
  if (!u) return '';
  if (b.t === 'video') return mediaHtml({url: u, mt: 'video', type: 'video'}) + (isYtUrl(u) ? '' : linkBtn(u));
  if (b.t === 'audio') return mediaHtml({url: u, mt: 'audio', type: 'audio'});
  if (b.t === 'pdf') return pdfInline(u) + linkBtn(u);
  if (b.t === 'link') return `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin:8px 0" href="${esc(u)}" target="_blank" rel="noopener" onclick="goUrl(this.getAttribute('href'));return false">🔗 ${esc(b.l || 'খুলুন')}</a>`;
  return '';
}
function bkHtml(list, adm) {
  return (list || []).map(b => { if (b.h && !adm) return ''; const h = bkOne(b); return h ? `<div class="bkb ${b.h ? 'bkh' : ''}">${b.h ? '<span class="tag" style="background:#6b7280">লুকানো</span>' : ''}${h}</div>` : ''; }).join('');
}
function bkZoom(src) { showModal(`<img src="${esc(src)}" style="width:100%;border-radius:10px;display:block">`); }
let _bkL = [], _bkCb = null, _bkE = -1, _bkT = '';
function bkOpen(list, cb, title) { _bkL = JSON.parse(JSON.stringify(list || [])); _bkCb = cb; _bkE = -1; _bkT = title || 'ব্লক সম্পাদক'; bkDraw(); }
function bkSum(b) { return b.t === 'text' ? (b.v || '').replace(/[*#{}]/g, '').slice(0, 44) || '(ফাঁকা)' : b.t === 'img' ? (b.c || (okImg(b.v) ? 'ছবি' : b.v) || 'ছবি') : b.t === 'link' ? (b.l || b.v || '') : (b.v || '(লিংক নেই)'); }
function bkDraw() {
  const rows = _bkL.map((b, i) => {
    if (_bkE === i) {
      const f = b.t === 'text' ? `<textarea class="inp" id="bk_v" rows="6" placeholder="লেখা (# বড় শিরোনাম, - তালিকা, **মোটা**)">${esc(b.v || '')}</textarea>`
        : b.t === 'img' ? `<input type="file" accept="image/*" multiple id="bk_f"><div class="hint">একসাথে অনেকগুলো ছবি বাছতে পারেন (প্রতিটি আলাদা ব্লক হবে)।</div><input class="inp" id="bk_c" placeholder="ছবির নিচের লেখা (ঐচ্ছিক)" value="${esc(b.c || '')}"><div class="hint">অথবা ছবির লিংক:</div><input class="inp" id="bk_v" placeholder="https://..." value="${esc(okImg(b.v) ? '' : (b.v || ''))}">`
          : b.t === 'link' ? `<input class="inp" id="bk_l" placeholder="বাটনের নাম" value="${esc(b.l || '')}"><input class="inp" id="bk_v" placeholder="https://..." value="${esc(b.v || '')}">`
          : `<input class="inp" id="bk_v" placeholder="${b.t === 'video' ? 'YouTube বা ভিডিওর লিংক' : b.t === 'pdf' ? 'PDF লিংক (Google Drive লিংকও চলবে)' : 'অডিও লিংক'}" value="${esc(b.v || '')}">`;
      return `<div class="blk" style="display:block"><b>${BK_L[b.t]}</b>${f}<button class="btn sm" onclick="bkOk(${i})">✔️ ঠিক</button></div>`;
    }
    return `<div class="blk"><div class="blkt">${BK_L[b.t].split(' ')[0]} ${esc(bkSum(b))}${b.h ? ' <span class="tag" style="background:#6b7280">লুকানো</span>' : ''}</div><div class="blkb"><button onclick="bkMv(${i},-1)">⬆️</button><button onclick="bkMv(${i},1)">⬇️</button><button onclick="_bkE=${i};bkDraw()">✏️</button><button onclick="bkHide(${i})">${b.h ? '👁️' : '🙈'}</button><button onclick="bkDel(${i})">🗑️</button></div></div>`;
  }).join('');
  showModal(`<h3 style="margin:0 0 8px">🧩 ${esc(_bkT)}</h3><div class="hint">লেখা, ছবি, ভিডিও, PDF ইত্যাদি যত খুশি যোগ করুন। উপর-নিচ সাজানো ও লুকানো যায়।</div>${rows || sEmpty('📭', 'এখনো কিছু নেই।')}
    <div class="tbar">${Object.keys(BK_L).map(k => `<button type="button" onclick="bkAdd('${k}')">➕ ${BK_L[k]}</button>`).join('')}</div><div id="bk_m" class="warn" style="display:none"></div><button class="btn" onclick="bkSave()">💾 সেভ করুন</button>`);
}
function bkAdd(t) { _bkL.push({t, v: ''}); _bkE = _bkL.length - 1; bkDraw(); }
function bkMv(i, d) { const j = i + d; if (j < 0 || j >= _bkL.length) return; [_bkL[i], _bkL[j]] = [_bkL[j], _bkL[i]]; bkDraw(); }
function bkHide(i) { _bkL[i].h = !_bkL[i].h; if (!_bkL[i].h) delete _bkL[i].h; bkDraw(); }
function bkDel(i) { _bkL.splice(i, 1); bkDraw(); }
async function bkOk(i) {
  const b = _bkL[i], v = (document.getElementById('bk_v') || {}).value || '';
  try {
    if (b.t === 'img') { const f = document.getElementById('bk_f'); if (f && f.files && f.files[0]) { b.v = await imgToData(f.files[0], 1000); const extra = Array.from(f.files).slice(1, 10); if (extra.length) { const add = []; for (const x of extra) add.push({t: 'img', v: await imgToData(x, 1000)}); _bkL.splice(i + 1, 0, ...add); } } else if (v.trim()) { if (!safeUrl(v)) throw {message: 'ছবির লিংক ঠিক নয়।'}; b.v = v.trim(); } b.c = (document.getElementById('bk_c') || {}).value || ''; if (!b.v) throw {message: 'ছবি বাছুন বা লিংক দিন।'}; }
    else if (b.t === 'text') b.v = v.slice(0, 20000);
    else { if (v.trim() && !safeUrl(v)) throw {message: 'লিংকটি ঠিক নয়।'}; b.v = v.trim(); if (b.t === 'link') b.l = ((document.getElementById('bk_l') || {}).value || '').slice(0, 40); }
  } catch (e) { alert(e.message || 'হয়নি।'); return; }
  _bkE = -1; bkDraw();
}
async function bkSave() {
  if (_bkE >= 0) await bkOk(_bkE); if (_bkE >= 0) return;
  const j = JSON.stringify(_bkL); if (j.length > 900000) return alert('ছবি বেশি হয়ে গেছে (১ মেগাবাইটের কম রাখুন)। কিছু ছবি সরান বা কম ছবি দিন।');
  const cb = _bkCb; closeModal(); if (cb) await cb(_bkL);
}
// নতুন/সম্পাদনার ফর্মে ব্লক
let _fbk = [];
function bkForm() { bkOpen(_fbk, l => { _fbk = l; const n = document.getElementById('bk_n'); if (n) n.textContent = bn(l.length); }, 'ছবি / ভিডিও / PDF ব্লক'); }
// অ্যাপের নিজের কার্ডের নিচে সংযুক্তি (অ্যাডমিন বাটন 📎)
const attDoc = k => ADMIN_CONTENT.find(c => c.type === 'attach' && c.key === k);
function attachEdit(k) {
  const d = attDoc(k);
  bkOpen(d ? d.blocks : [], async l => {
    const m = await sme(); if (!m) return alert('অ্যাডমিন লগইন দরকার।');
    try {
      if (d) await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', d.id), {blocks: l}, {merge: true});
      else await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), {type: 'attach', key: k, title: '', body: '', blocks: l, pub: true, by: m.u.uid, createdAt: m.f.F.serverTimestamp()});
      await refreshContent(); hideScan();
    } catch (e) { alert('সেভ হয়নি। ইন্টারনেট ও অ্যাডমিন লগইন দেখুন।'); }
  }, 'এই কার্ডের নিচে ছবি / ভিডিও / PDF');
}
(function () { const st = document.createElement('style'); st.textContent = `
#hpbg{position:fixed;inset:0;z-index:9998}#hpop{position:fixed;top:56px;right:8px;z-index:9999;background:#fff;color:#111;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.3);padding:10px}
.hpz{display:flex;align-items:center;gap:8px}.hpz button,.hpc button{border:0;background:#eef2f7;border-radius:10px;min-width:42px;height:40px;font:inherit;font-size:16px;font-weight:800}.hpz b{min-width:56px;text-align:center}
.hpc{display:flex;gap:8px;flex-wrap:wrap;max-width:260px}.hpc button{width:34px;min-width:34px;height:34px;border-radius:50%}.hpc .hz0{background:#eef2f7;border-radius:10px;width:auto;min-width:34px}
.page-h .hz,.sign .iconbtn.hz{background:rgba(255,255,255,.2);border:0;color:#fff;border-radius:8px;width:30px;height:30px;font-size:13px;font-weight:800;padding:0;line-height:1}
.sign .iconbtn.hz{width:30px;height:30px;font-size:13px}.page-h h2{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bkb{margin:6px 0}.bkh{opacity:.55}.atch{margin:-4px 0 14px;padding:0 2px}
.hbtn.at{right:86px;background:#7c3aed}.hadm{padding-right:128px !important}
`; document.head.appendChild(st); })();


// =====================================================================
//  ধাপ ২: প্রশ্নের অধ্যায় (সীমাহীন), বাল্ক পেস্ট, লম্বা কুইজ, কাস্টম ট্রাফিক সাইন
// =====================================================================
const QB_T = {test: '🛞 ড্রাইভিং টেস্টের লিখিত প্রশ্ন', book: '📘 ড্রাইভিং বইয়ের প্রশ্ন', road: '🛣️ রাস্তার নিয়মের প্রশ্ন', st_bangla: '🇧🇩 বাংলা — প্রশ্ন', st_english: '🇬🇧 ইংরেজি — প্রশ্ন', st_gk: '🌍 সাধারণ জ্ঞান — প্রশ্ন', st_math: '📐 গণিত — প্রশ্ন', st_driver_special: '🚘 চালক স্পেশাল — প্রশ্ন', gk: '🌍 সাধারণ জ্ঞান', bangla: '🇧🇩 বাংলা', english: '🇬🇧 ইংরেজি', math: '📐 গণিত', mental: '🧠 মানসিক দক্ষতা', roadtest: '🛞 রোড টেস্ট (লিখিত প্রশ্ন)', signquiz: '🚦 সাইন কুইজ'};
const qbAdm = () => { try { return isAdminFlag(); } catch (e) { return false; } };
const qbNorm = x => ({q: String(x.q || ''), o: (x.o || []).map(String), a: +x.a || 0, e: x.e || '', m: x.m || '', h: !!x.h, mh: x.mh || '', w: x.w !== undefined ? String(x.w) : undefined});
function qbBuiltin(bank) {
  try {
    if (typeof GOV !== 'undefined' && GOV[bank]) return GOV[bank].map(q => qbNorm({q: q[0], o: q[1], a: q[2], e: q[3] || ''}));
    if (typeof QA !== 'undefined' && QA[bank]) return QA[bank].map(q => qbNorm({q: q[0], w: q[1]}));
    if (bank === 'roadtest' && typeof QUIZ !== 'undefined') return QUIZ.map(q => qbNorm({q: q[0], o: q[1], a: q[2], e: q[3] || ''}));
  } catch (e) {}
  return [];
}
const qbCh = bank => ADMIN_CONTENT.filter(c => c.type === 'qch' && c.bank === bank && (qbAdm() || !c.hid)).sort((a, b) => (a.ord - b.ord) || (a.at - b.at));
// ---- লোড ও ক্যাশ ----
let QBS = {bank: '', ch: '', items: [], docs: {}, page: 0, q: '', title: ''};
async function qbFetch(ch) {
  try {
    const f = await fb(); const rows = await sList(f, ['qsets'], f.F.where('ch', '==', ch));
    rows.sort((a, b) => (a.i || 0) - (b.i || 0)); const docs = {}, items = [];
    rows.forEach(r => { docs[r.id] = (r.qs || []).map(qbNorm); docs[r.id].forEach((x, k) => { x._d = r.id; x._k = k; items.push(x); }); });
    try { localStorage.setItem('qs_' + ch, JSON.stringify(rows.map(r => ({id: r.id, i: r.i, qs: r.qs})))); } catch (e) {}
    return {items, docs, rows};
  } catch (e) {
    try { const rows = JSON.parse(localStorage.getItem('qs_' + ch) || 'null'); if (rows) { const docs = {}, items = []; rows.forEach(r => { docs[r.id] = (r.qs || []).map(qbNorm); docs[r.id].forEach((x, k) => { x._d = r.id; x._k = k; items.push(x); }); }); return {items, docs, rows, cached: true}; } } catch (e2) {}
    throw e;
  }
}
// ---- অধ্যায়ের তালিকা ----
function qbHome(bank) {
  tab = 'home'; const adm = qbAdm(), t = QB_T[bank] || 'প্রশ্ন', bi = qbBuiltin(bank), chs = qbCh(bank);
  const card = (ic, name, sub, on, extra) => `<div class="nk" style="border-left-color:#0369a1" onclick="${on}"><span class="nki" style="background:#0369a122">${ic}</span><div class="nkt"><b>${esc(name)}</b><small>${sub}</small></div><span class="nka">›</span></div>${extra || ''}`;
  let h = `<div class="warn" style="margin:0 0 10px">অধ্যায় বেছে নিন। প্রতিটি অধ্যায়ে যত খুশি প্রশ্ন থাকতে পারে। সার্চ, র‍্যান্ডম টেস্ট ও লম্বা কুইজ আছে।</div>`;
  if (bank === 'signquiz') h += card('🚦', 'ছবি দেখে সাইন চেনা', bn(SIGNS.length) + 'টি সাইন', "push(()=>qbHome('signquiz'));startSignQuiz()") + card('♾️', 'সাইনের লম্বা কুইজ', 'ভুল করলে জীবন কমে, স্কোর জমে', "push(()=>qbHome('signquiz'));qbSignEndless()");
  else if (bi.length) h += card('📘', 'অ্যাপের নিজের প্রশ্ন', bn(bi.length) + 'টি', `qbOpen('${bank}','built')`);
  h += chs.map(c => card(c.hid ? '🙈' : '📝', c.title, bn(c.n || 0) + 'টি প্রশ্ন', `qbOpen('${bank}','${esc(c.id)}')`,
    adm ? `<div style="margin:-4px 0 8px;text-align:right"><button class="nbtn" style="background:#1d4ed8" onclick="qbChEdit('${esc(c.id)}')">✏️ নাম/ক্রম</button> <button class="nbtn" style="background:#64748b" onclick="qbChHide('${esc(c.id)}')">${c.hid ? '👁️ দেখান' : '🙈 লুকান'}</button> <button class="nbtn" style="background:#b91c1c" onclick="qbChDel('${esc(c.id)}')">🗑️ মুছুন</button></div>` : '')).join('');
  if (!bi.length && !chs.length && bank !== 'signquiz') h += sEmpty('📭', 'এখনো কোনো অধ্যায় নেই।');
  h += `<button class="btn" style="width:100%;background:#7c3aed" onclick="qbAllRandom('${bank}')">🎲 সব অধ্যায় মিলিয়ে র‍্যান্ডম টেস্ট</button>`;
  if (adm) h += `<div class="adbar" style="margin-top:12px">🛠️ অ্যাডমিন <button onclick="qbChEdit('')">➕ নতুন অধ্যায়</button></div>`;
  if (bank === 'gk' || QB_T[bank] && typeof GOV !== 'undefined' && GOV[bank]) h += `<div class="card" style="margin:10px 0;border-color:#1e40af" onclick="push(()=>qbHome('${bank}'));open_('govguide')"><div class="t">🏛️ <span style="flex:1;color:#1e40af">প্রস্তুতি গাইড</span><span style="color:#999">›</span></div></div>`;
  render(pageHead(t) + `<div class="pad">${h}</div>`);
}
function qbChEdit(id) {
  const c = id ? ADMIN_CONTENT.find(x => x.id === id) : null;
  showModal(`<h3 style="margin:0 0 8px">${c ? '✏️ অধ্যায় বদলান' : '➕ নতুন অধ্যায়'}</h3><input class="inp" id="qc_t" placeholder="অধ্যায়ের নাম (যেমন: অধ্যায় ১ — বাংলাদেশ)" value="${esc(c ? c.title : '')}"><input class="inp" id="qc_o" type="number" placeholder="ক্রম (১, ২, ৩...)" value="${c ? c.ord || '' : ''}"><div id="qc_m" class="warn" style="display:none"></div><button class="btn" onclick="qbChSave('${esc(id)}')">💾 সেভ</button>`);
}
async function qbChSave(id) {
  const t = gv('qc_t'); if (!t) return;
  const m = await sme(); if (!m) return alert('অ্যাডমিন লগইন দরকার।'); const F = m.f.F, bank = QBS.bank || window._qbBank;
  try {
    if (id) await F.setDoc(F.doc(m.f.db, 'content', id), {title: t.slice(0, 100), ord: +gv('qc_o') || 0}, {merge: true});
    else await F.addDoc(F.collection(m.f.db, 'content'), {type: 'qch', bank: window._qbBank, title: t.slice(0, 100), ord: +gv('qc_o') || 0, n: 0, pub: true, by: m.u.uid, createdAt: F.serverTimestamp()});
    closeModal(); await refreshContent(); qbHome(window._qbBank);
  } catch (e) { alert('সেভ হয়নি।'); }
}
async function qbChHide(id) { const c = ADMIN_CONTENT.find(x => x.id === id), m = await sme(); if (!c || !m) return; await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', id), {hid: !c.hid}, {merge: true}); await refreshContent(); qbHome(window._qbBank); }
async function qbChDel(id) {
  if (!confirm('অধ্যায় ও এর সব প্রশ্ন মুছে যাবে। নিশ্চিত?')) return; const m = await sme(); if (!m) return; const F = m.f.F;
  try { const r = await sList(m.f, ['qsets'], F.where('ch', '==', id)); for (const d of r) await F.deleteDoc(F.doc(m.f.db, 'qsets', d.id)); await F.deleteDoc(F.doc(m.f.db, 'content', id)); await refreshContent(); qbHome(window._qbBank); } catch (e) { alert('মোছা যায়নি।'); }
}
// ---- অধ্যায় খোলা ----
async function qbOpen(bank, ch) {
  window._qbBank = bank; QBS = {bank, ch, items: [], docs: {}, page: 0, q: '', title: ''};
  const c = ADMIN_CONTENT.find(x => x.id === ch); QBS.title = ch === 'built' ? 'অ্যাপের নিজের প্রশ্ন' : (c ? c.title : 'অধ্যায়');
  push(() => qbHome(bank));
  render(pageHead(QBS.title) + '<div class="pad"><div class="empty"><span class="e1">⏳</span>প্রশ্ন লোড হচ্ছে...</div></div>'); const rn0 = window.__rn;
  if (ch === 'built') { QBS.items = qbBuiltin(bank); return qbList(); }
  try { const r = await qbFetch(ch); if (window.__rn !== rn0) return; QBS.items = r.items; QBS.docs = r.docs; QBS.cached = r.cached; qbList(); }
  catch (e) { render(pageHead(QBS.title) + '<div class="pad">' + sErr(e) + '</div>'); }
}
const QB_PP = 20;
function qbVis() { const adm = qbAdm(), s = QBS.q.trim().toLowerCase(); return QBS.items.filter(x => (adm || !x.h) && (!s || (x.q + ' ' + x.o.join(' ') + ' ' + (x.w || '')).toLowerCase().includes(s))); }
function qbList() {
  const adm = qbAdm(), v = qbVis(), pages = Math.max(1, Math.ceil(v.length / QB_PP)); QBS.page = Math.min(QBS.page, pages - 1);
  const slice = v.slice(QBS.page * QB_PP, QBS.page * QB_PP + QB_PP), built = QBS.ch === 'built';
  const head = `<div class="cx"><b>${esc(QBS.title)}</b> <span class="hint">মোট ${bn(QBS.items.filter(x => !x.h).length)}টি প্রশ্ন${QBS.cached ? ' (অফলাইন কপি)' : ''}</span>
    <input class="inp" id="qb_s" placeholder="🔎 প্রশ্ন বা উত্তর খুঁজুন" value="${esc(QBS.q)}" oninput="qbSearch(this.value)">
    <div class="tbar"><button onclick="qbTest(10)">🎲 ১০টি</button><button onclick="qbTest(20)">🎲 ২০টি</button><button onclick="qbTest(50)">🎲 ৫০টি</button><button onclick="qbTest(0)">📋 সব</button><button onclick="qbEndless()">♾️ লম্বা কুইজ</button></div></div>
    ${adm && !built ? `<div class="adbar">🛠️ অ্যাডমিন <button onclick="qbBulk()">📥 বাল্ক পেস্ট</button><button onclick="qbForm(-1)">➕ একটি MCQ</button><button onclick="qbFormW(-1)">➕ একটি লিখিত</button></div>` : ''}`;
  const body = slice.length ? slice.map((x, i) => qbCard(x, QBS.page * QB_PP + i + 1, QBS.items.indexOf(x))).join('') : sEmpty('📭', QBS.q ? 'কিছু পাওয়া যায়নি।' : 'এখনো প্রশ্ন নেই।');
  const nav = pages > 1 ? `<div style="display:flex;gap:8px;align-items:center;justify-content:center;margin:12px 0"><button class="btn sm" ${QBS.page ? '' : 'disabled'} onclick="qbPg(-1)">← আগে</button><span>${bn(QBS.page + 1)} / ${bn(pages)}</span><button class="btn sm" ${QBS.page < pages - 1 ? '' : 'disabled'} onclick="qbPg(1)">পরে →</button></div>` : '';
  render(pageHead(QBS.title) + `<div class="pad">${head}<div id="qb_l">${body}</div>${nav}</div>`);
}
function qbCard(x, n, gi) {
  const adm = qbAdm();
  if (x.w !== undefined) return `<div class="qbq ${x.h ? 'xh' : ''}" id="qq${gi}"><div class="q">${bn(n)}. ${esc(x.q)}</div><button class="qzo" onclick="var e=document.getElementById('qqw${gi}');e.style.display=e.style.display==='none'?'block':'none'">👁️ উত্তর দেখুন</button><div class="qzf qzc" id="qqw${gi}" style="display:none">${esc(x.w).replace(/\n/g, '<br>')}</div>${adm && QBS.ch !== 'built' ? `<div style="text-align:right;margin-top:6px"><button class="nbtn" style="background:#1d4ed8" onclick="qbEdit(${gi})">✏️</button> <button class="nbtn" style="background:#64748b" onclick="qbQHide(${gi})">${x.h ? '👁️' : '🙈'}</button> <button class="nbtn" style="background:#b91c1c" onclick="qbQDel(${gi})">🗑️</button></div>` : ''}</div>`;
  const med = x.mh ? `<div style="text-align:center;font-size:70px">${x.mh}</div>` : /^https?:\/\//i.test(x.m) ? `<img loading="lazy" src="${esc(x.m)}" style="max-width:100%;border-radius:10px;display:block;margin:6px auto">` : x.m ? `<div style="text-align:center;font-size:56px">${esc(x.m)}</div>` : '';
  return `<div class="qbq ${x.h ? 'xh' : ''}" id="qq${gi}"><div class="q">${bn(n)}. ${esc(x.q)}</div>${med}` + x.o.map((o, j) => `<div class="opt" style="border:2px solid #dfe6ee;border-radius:12px;padding:10px;margin:6px 0" id="qq${gi}o${j}" onclick="qbPick(${gi},${j})">${esc(o)}</div>`).join('') +
    `<div class="a" id="qq${gi}s" style="display:none;margin-top:8px"></div>${adm && QBS.ch !== 'built' ? `<div style="text-align:right;margin-top:6px"><button class="nbtn" style="background:#1d4ed8" onclick="qbEdit(${gi})">✏️</button> <button class="nbtn" style="background:#64748b" onclick="qbQHide(${gi})">${x.h ? '👁️' : '🙈'}</button> <button class="nbtn" style="background:#b91c1c" onclick="qbQDel(${gi})">🗑️</button></div>` : ''}</div>`;
}
let _qbT = 0;
function qbSearch(v) { QBS.q = v; QBS.page = 0; clearTimeout(_qbT); _qbT = setTimeout(() => { const pos = v.length; qbList(); const e = document.getElementById('qb_s'); if (e) { e.focus(); e.setSelectionRange(pos, pos); } }, 350); }
function qbPg(d) { QBS.page += d; qbList(); window.scrollTo(0, 0); }
function qbPick(gi, j) {
  const x = QBS.items[gi], box = document.getElementById('qq' + gi + 's'); if (!x || box.style.display === 'block') return;
  if (j !== x.a) document.getElementById('qq' + gi + 'o' + j).classList.add('no'); const r = document.getElementById('qq' + gi + 'o' + x.a); if (r) r.classList.add('ok');
  box.style.display = 'block'; box.innerHTML = `<b>${j === x.a ? '✅ সঠিক!' : '❌ ভুল'}</b> সঠিক উত্তর: ${esc(x.o[x.a] || '')}${x.e ? `<div class="hint" style="margin-top:4px">💡 ${esc(x.e)}</div>` : ''}`;
}
// ---- প্রশ্ন সম্পাদনা / মোছা ----
function qbForm(gi) {
  const x = gi >= 0 ? QBS.items[gi] : {q: '', o: ['', '', '', ''], a: 0, e: '', m: ''};
  showModal(`<h3 style="margin:0 0 8px">${gi >= 0 ? '✏️ প্রশ্ন বদলান' : '➕ নতুন প্রশ্ন'}</h3><textarea class="inp" id="qf_q" rows="3" placeholder="প্রশ্ন">${esc(x.q)}</textarea>
    ${[0, 1, 2, 3].map(n => `<input class="inp" id="qf_o${n}" placeholder="উত্তর ${bn(n + 1)}" value="${esc(x.o[n] || '')}">`).join('')}
    <select class="inp" id="qf_a">${[0, 1, 2, 3].map(n => `<option value="${n}" ${x.a === n ? 'selected' : ''}>সঠিক উত্তর: ${bn(n + 1)} নম্বর</option>`).join('')}</select>
    <input class="inp" id="qf_e" placeholder="ব্যাখ্যা (ঐচ্ছিক)" value="${esc(x.e)}"><input class="inp" id="qf_m" placeholder="ছবির লিংক বা ইমোজি (ঐচ্ছিক)" value="${esc(x.m)}"><button class="btn" onclick="qbFormSave(${gi})">💾 সেভ</button>`);
}
async function qbFormSave(gi) {
  const o = [0, 1, 2, 3].map(n => gv('qf_o' + n)).filter(Boolean), a = +gv('qf_a'); if (!gv('qf_q') || o.length < 2) return alert('প্রশ্ন ও কমপক্ষে দুটি উত্তর দিন।');
  const right = gv('qf_o' + a); if (!right) return alert('সঠিক উত্তরের ঘরটি ফাঁকা।');
  const it = {q: gv('qf_q').slice(0, 300), o, a: o.indexOf(right), e: gv('qf_e').slice(0, 400), m: gv('qf_m').slice(0, 1000)};
  const m = await sme(); if (!m) return; const F = m.f.F;
  try {
    if (gi >= 0) { const x = QBS.items[gi]; const arr = QBS.docs[x._d]; arr[x._k] = Object.assign(arr[x._k], it); await qbSaveDoc(m, x._d); }
    else { const ids = Object.keys(QBS.docs); let did = ids.find(d => QBS.docs[d].length < 100);
      if (did) { QBS.docs[did].push(qbNorm(it)); await qbSaveDoc(m, did); } else { const r = await F.addDoc(F.collection(m.f.db, 'qsets'), {bank: QBS.bank, ch: QBS.ch, i: ids.length, qs: [it], at: Date.now()}); QBS.docs[r.id] = [qbNorm(it)]; } await qbCount(m); }
    closeModal(); qbReindex(); qbList();
  } catch (e) { alert('সেভ হয়নি।'); }
}
const qbClean = a => a.map(x => { const o = x.w !== undefined ? {q: x.q, w: x.w} : {q: x.q, o: x.o, a: x.a}; if (x.e) o.e = x.e; if (x.m) o.m = x.m; if (x.h) o.h = true; return o; });
async function qbSaveDoc(m, did) { const F = m.f.F; if (!QBS.docs[did].length) { await F.deleteDoc(F.doc(m.f.db, 'qsets', did)); delete QBS.docs[did]; } else await F.setDoc(F.doc(m.f.db, 'qsets', did), {qs: qbClean(QBS.docs[did])}, {merge: true}); }
function qbReindex() { QBS.items = []; Object.keys(QBS.docs).forEach(d => QBS.docs[d].forEach((x, k) => { x._d = d; x._k = k; QBS.items.push(x); })); try { localStorage.removeItem('qs_' + QBS.ch); } catch (e) {} }
async function qbCount(m) { const n = Object.keys(QBS.docs).reduce((s, d) => s + QBS.docs[d].length, 0); try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', QBS.ch), {n}, {merge: true}); const c = ADMIN_CONTENT.find(x => x.id === QBS.ch); if (c) c.n = n; } catch (e) {} }
async function qbQHide(gi) { const x = QBS.items[gi], m = await sme(); if (!m) return; QBS.docs[x._d][x._k].h = !x.h; try { await qbSaveDoc(m, x._d); qbList(); } catch (e) { alert('হয়নি।'); } }
async function qbQDel(gi) { if (!confirm('প্রশ্নটি মুছবেন?')) return; const x = QBS.items[gi], m = await sme(); if (!m) return; QBS.docs[x._d].splice(x._k, 1); try { await qbSaveDoc(m, x._d); await qbCount(m); qbReindex(); qbList(); } catch (e) { alert('হয়নি।'); } }
// ---- বাল্ক পেস্ট ----
function qbNormText(text) {
  const out = [];
  String(text).replace(/\r/g, '').replace(/[   　]/g, ' ').replace(/[​-‍⁠﻿]/g, '').split('\n').forEach(raw => {
    let l = raw.replace(/\*\*|__|`/g, '').replace(/^\s*#{1,6}\s*/, '').replace(/^\s*(?:[-•▪●◆►➤*]|[✅❌☑✔✓❎🟢🔴👉➡️📝🔹🔸]+)\s*/u, '').replace(/^\s*(?:💡|📌)\s*/u, '').trim();
    l = l.replace(/^(প্রশ্ন|প্র|সঠিক\s*উত্তর|উত্তর|ব্যাখ্যা|ans(?:wer)?|correct(?:\s*answer)?|explanation)\s*[ঃ]/i, '$1:');
    l = l.replace(/^(সঠিক\s*উত্তর|ans(?:wer)?|correct(?:\s*answer)?)\s*([:：\-–—=])/i, 'উত্তর$2');
    if (/\s\(?ক[\)\.\।]\s/.test(' ' + l) && /\s\(?খ[\)\.\।]\s/.test(l)) l = l.replace(/\s+(?=\(?[কখগঘঙ][\)\.\।]\s)/g, '\n');
    l.split('\n').forEach(x => out.push(x.trim()));
  });
  return out.join('\n');
}
function qbParse(text) {
  text = qbNormText(text);
  { const t0 = String(text).trim(); if (/^[\[{]/.test(t0)) { try { let j = JSON.parse(t0); if (!Array.isArray(j)) j = j.questions || j.data || [j]; const o = []; j.forEach(x => { const q = String(x.question || x.q || '').replace(/^\s*[\d১-৯০]+\s*[\.\)\।:]\s*/, '').trim(), opts = (x.options || x.o || []).map(String).filter(Boolean), a = x.correct !== undefined ? +x.correct : (x.a !== undefined ? +x.a : 0), e = String(x.explanation || x.e || '').replace(/^💡\s*/, ''); if (q && opts.length >= 2 && a >= 0 && a < opts.length) o.push({q: q.slice(0, 300), o: opts.slice(0, 5), a, e: e.slice(0, 400)}); }); return o; } catch (e) {} } }
  const out = [], lines = String(text).replace(/\r/g, '').split('\n'); let cur = null; const L = 'কখগঘঙ', LA = 'abcde';
  const flush = () => { if (cur && cur.q && cur.o.length >= 2) { if (!(cur.a >= 0 && cur.a < cur.o.length)) cur.a = 0; out.push({q: cur.q.slice(0, 300), o: cur.o.slice(0, 5), a: cur.a, e: (cur.e || '').slice(0, 400)}); } cur = null; };
  const pipe = [];
  lines.forEach(raw => {
    const line = raw.trim(); if (!line) { return; }
    if ((line.match(/[|｜]/g) || []).length >= 3) { flush(); pipe.push(line); return; }
    const am = line.match(/^(?:উত্তর|সঠিক উত্তর|ans|answer)\s*[:：\-]\s*(.+)$/i), em = line.match(/^(?:ব্যাখ্যা|explanation|exp)\s*[:：\-]\s*(.+)$/i), om = line.match(/^\(?([কখগঘঙa-eA-E])[\)\.\।:]\s*(.+)$/);
    if (am && cur) { const v = am[1].trim(); const bm = v.match(/^[\(\[]?([কখগঘঙa-eA-E])(?:[\)\]\.\।:,]|\s|$)/); let k = bm ? (L.indexOf(bm[1]) >= 0 ? L.indexOf(bm[1]) : LA.indexOf(bm[1].toLowerCase())) : -1; if (k < 0 && /^[১-৫1-5](?:[\)\.\।:]|\s|$)/.test(v)) k = +_bd(v[0]) - 1; if (k < 0) k = cur.o.findIndex(o => o === v); if (k < 0) { const vv = v.replace(/^[\(\[]?[কখগঘঙa-eA-E][\)\]\.\।:]\s*/, ''); k = cur.o.findIndex(o => o === vv || vv.startsWith(o) || o.startsWith(vv)); } cur.a = k; cur.done = true; return; }
    if (em && cur) { cur.e = em[1].trim(); return; }
    if (om && cur) { if (cur.done) { flush(); } else { cur.o.push(om[2].trim()); return; } }
    if (cur && (cur.done || cur.o.length >= 2) && !om) flush();
    if (!cur) cur = {q: '', o: [], a: -1, e: ''};
    if (om && cur && !cur.done) { cur.o.push(om[2].trim()); return; }
    cur.q += (cur.q ? ' ' : '') + line.replace(/^(?:প্রশ্ন\s*)?[\d১-৯০]+\s*[\.\)\।:]\s*/, '');
  }); flush();
  const pr = parseQuizBulk(pipe.join('\n')); pr.forEach(r => out.push(r));
  return out;
}
function qbBulk() {
  showModal(`<h3 style="margin:0 0 6px">📥 বাল্ক পেস্ট</h3><div class="hint">একবারে ১০০, ২০০, ৫০০ এমনকি ২০০০ প্রশ্নও দিতে পারেন। দুই রকম ফরম্যাট চলে:<br><b>১) এক লাইনে:</b> প্রশ্ন | উত্তর১ | উত্তর২ | উত্তর৩ | উত্তর৪ | সঠিক নম্বর | ব্যাখ্যা<br><b>২) লাইন ভেঙে:</b><br>প্রশ্ন?<br>ক) ... খ) ... গ) ... ঘ) ...<br>উত্তর: খ<br>ব্যাখ্যা: ...<br>(প্রশ্নের আগে ১। ২। নম্বর থাকলেও চলবে)</div>
    <textarea class="inp" id="qb_bulk" rows="12" placeholder="এখানে পেস্ট করুন" oninput="qbPrev()"></textarea><div id="qb_prev" class="hint"></div><div id="qb_prog" style="display:none;height:12px;background:#e5e7eb;border-radius:8px;overflow:hidden"><div id="qb_bar" style="height:100%;width:0;background:#16a34a"></div></div><button class="btn" id="qb_go" onclick="qbBulkSave()">✅ সব সেভ করুন</button>`);
}
function qbPrev() { const r = qbParse(gv('qb_bulk')); const e = document.getElementById('qb_prev'); if (e) e.textContent = r.length ? `✅ ${bn(r.length)}টি প্রশ্ন পাওয়া গেছে।` : 'এখনো কোনো প্রশ্ন বোঝা যায়নি।'; }
async function qbBulkSave() {
  let rows = qbParse(gv('qb_bulk')); if (!rows.length) return alert('কোনো প্রশ্ন বোঝা যায়নি।'); if (rows.length > 3000) return alert('একবারে সর্বোচ্চ ৩০০০টি দিন।');
  const have = new Set(QBS.items.map(x => x.q)); const before = rows.length; rows = rows.filter(r => !have.has(r.q)); const dup = before - rows.length; if (!rows.length) return alert('সবগুলোই আগে থেকে আছে।');
  const m = await sme(); if (!m) return alert('অ্যাডমিন লগইন দরকার।'); const F = m.f.F; const btn = document.getElementById('qb_go'); btn.disabled = true; document.getElementById('qb_prog').style.display = 'block';
  let idx = Object.keys(QBS.docs).length, done = 0;
  try {
    for (let s = 0; s < rows.length; s += 100) {
      const part = rows.slice(s, s + 100); const r = await F.addDoc(F.collection(m.f.db, 'qsets'), {bank: QBS.bank, ch: QBS.ch, i: idx++, qs: part, at: Date.now()});
      QBS.docs[r.id] = part.map(qbNorm); done += part.length; document.getElementById('qb_bar').style.width = Math.round(done / rows.length * 100) + '%'; btn.textContent = `⏳ ${bn(done)} / ${bn(rows.length)}`;
    }
    await qbCount(m); qbReindex(); closeModal(); qbList(); alert(`✅ ${bn(done)}টি প্রশ্ন যোগ হয়েছে।${dup ? ' ' + bn(dup) + 'টি আগে থেকেই ছিল, বাদ গেছে।' : ''}`);
  } catch (e) { qbReindex(); qbList(); alert(`⚠️ ${bn(done)}টি সেভ হয়েছে, বাকিগুলো হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন (আগেরগুলো বাদ যাবে)।`); }
}
// ---- টেস্ট ও লম্বা কুইজ ----
let QT = {list: [], i: 0, s: 0, mode: 'test', lives: 3, ans: false, wrong: [], bank: '', ch: '', best: 0};
const qbShuf = a => a.slice().sort(() => Math.random() - .5);
function qbTest(n) { const v = qbVis().filter(x => !x.h && x.w === undefined); if (!v.length) return alert('প্রশ্ন নেই।'); QT = Object.assign(QT, {list: n ? qbShuf(v).slice(0, n) : v.slice(), i: 0, s: 0, mode: 'test', wrong: [], bank: QBS.bank, ch: QBS.ch}); push(() => qbList()); qbQ(); }
function qbEndless() { const v = QBS.items.filter(x => !x.h && x.w === undefined); if (v.length < 4) return alert('লম্বা কুইজের জন্য কমপক্ষে ৪টি প্রশ্ন দরকার।'); QT = Object.assign(QT, {list: qbShuf(v), i: 0, s: 0, mode: 'endless', lives: 3, wrong: [], bank: QBS.bank, ch: QBS.ch, best: +(localStorage.getItem('qbb_' + QBS.ch) || 0)}); push(() => qbList()); qbQ(); }
async function qbAllRandom(bank) {
  const all = qbBuiltin(bank).slice(); render(pageHead('র‍্যান্ডম টেস্ট') + '<div class="pad"><div class="empty"><span class="e1">⏳</span>সব অধ্যায় লোড হচ্ছে...</div></div>');
  for (const c of qbCh(bank).filter(c => !c.hid)) { try { const r = await qbFetch(c.id); r.items.forEach(x => { if (!x.h && x.w === undefined) all.push(x); }); } catch (e) {} }
  if (!all.length) { alert('প্রশ্ন নেই।'); return qbHome(bank); }
  QT = Object.assign(QT, {list: qbShuf(all).slice(0, 30), i: 0, s: 0, mode: 'test', wrong: [], bank, ch: 'all'}); QBS.bank = bank; push(() => qbHome(bank)); qbQ();
}
function qbSignEndless() {
  const base = SIGNS.map((s, i) => ({i, s})).filter(o => !(SGX[o.i] && SGX[o.i].h));
  const list = qbShuf(base).map(o => { const others = qbShuf(base.filter(p => p.i !== o.i)).slice(0, 3).map(p => p.s[1]); const opts = qbShuf([o.s[1]].concat(others)); return {q: 'এই সাইনের নাম কী?', o: opts, a: opts.indexOf(o.s[1]), e: o.s[2] || '', m: '', mh: o.s[0]}; });
  QT = Object.assign(QT, {list, i: 0, s: 0, mode: 'endless', lives: 3, wrong: [], bank: 'signquiz', ch: 'signs', best: +(localStorage.getItem('qbb_signs') || 0)}); qbQ();
}
function qbQ() {
  const q = QT.list[QT.i]; if (!q) return qbRes(); QT.ans = false;
  const med = q.mh ? `<div style="text-align:center;font-size:90px;margin:8px 0">${q.mh}</div>` : /^https?:\/\//i.test(q.m || '') ? `<img src="${esc(q.m)}" style="max-width:100%;border-radius:10px;display:block;margin:6px auto">` : q.m ? `<div style="text-align:center;font-size:60px">${esc(q.m)}</div>` : '';
  const top = QT.mode === 'endless' ? `<span>⭐ ${bn(QT.s)} &nbsp; ${'❤️'.repeat(QT.lives)}${'🖤'.repeat(3 - QT.lives)}</span><span style="color:#666">সেরা: ${bn(Math.max(QT.best, QT.s))}</span>` : `<span>প্রশ্ন ${bn(QT.i + 1)} / ${bn(QT.list.length)}</span><span>✅ ${bn(QT.s)}</span>`;
  render(pageHead(QT.mode === 'endless' ? '♾️ লম্বা কুইজ' : 'টেস্ট', false) + `<div class="pad quiz"><div style="display:flex;justify-content:space-between">${top}</div><h3 style="color:var(--pink)">${esc(q.q)}</h3>${med}` +
    q.o.map((o, i) => `<div class="opt" id="qo${i}" onclick="qbAns(${i})">${esc(o)}</div>`).join('') + '<div id="qnx" style="text-align:right;margin-top:12px"></div><div style="text-align:center;margin-top:16px"><button class="btn sm" style="background:#64748b" onclick="qbRes()">⏹️ শেষ করুন</button></div></div>');
}
function qbAns(i) {
  if (QT.ans) return; QT.ans = true; const q = QT.list[QT.i], ok = i === q.a;
  if (ok) QT.s++; else { QT.wrong.push(q); if (QT.mode === 'endless') QT.lives--; document.getElementById('qo' + i).classList.add('no'); }
  document.getElementById('qo' + q.a).classList.add('ok');
  const over = QT.mode === 'endless' && QT.lives <= 0;
  document.getElementById('qnx').innerHTML = (q.e ? `<div class="warn" style="text-align:left;margin:10px 0">💡 ${esc(q.e)}</div>` : '') + `<button class="btn" onclick="${over ? 'qbRes()' : 'qbNext()'}">${over ? 'ফলাফল দেখুন' : 'পরের প্রশ্ন →'}</button>`;
}
function qbNext() { QT.i++; if (QT.i >= QT.list.length && QT.mode === 'endless') { QT.list = QT.list.concat(qbShuf(QT.list)); } QT.i < QT.list.length ? qbQ() : qbRes(); }
function qbRes() {
  const e = QT.mode === 'endless', n = e ? QT.i + (QT.ans ? 1 : 0) : QT.list.length, ans = QT.i + (QT.ans ? 1 : 0);
  let best = QT.best; if (e && QT.s > best) { best = QT.s; try { localStorage.setItem('qbb_' + QT.ch, String(best)); } catch (x) {} }
  const pass = !e && QT.list.length && QT.s / QT.list.length >= .7, tot = e ? ans : QT.list.length;
  const txt = e ? `আমি "আমার ভাই" অ্যাপের লম্বা কুইজে ${QT.s} পয়েন্ট পেয়েছি! তুমি কত পাবে?` : `আমি "আমার ভাই" অ্যাপে ${QT.s}/${QT.list.length} পেয়েছি!`;
  window._qbTxt = txt;
  render(pageHead('ফলাফল', false) + `<div class="pad" style="text-align:center"><div style="font-size:64px">${e ? '🏅' : pass ? '🏆' : '📚'}</div><h2>স্কোর: ${bn(QT.s)} / ${bn(tot)}</h2>${e ? `<p>🥇 আপনার সেরা: <b>${bn(best)}</b>${QT.s >= best && QT.s > 0 ? ' — নতুন রেকর্ড!' : ''}</p>` : `<p>${pass ? 'অভিনন্দন! আপনি পাস করেছেন।' : 'আরও অনুশীলন করুন।'}</p>`}
    <button class="btn" onclick="${e ? (QT.ch === 'signs' ? 'qbSignEndless()' : 'qbEndless()') : 'qbRetry()'}">🔁 আবার</button> <button class="btn sm" style="background:#0369a1" onclick="qbShare()">📤 স্কোর শেয়ার</button> <button class="btn sm" style="background:#64748b" onclick="back()">⬅️ ফিরে যান</button>
    ${QT.wrong.length ? `<div style="text-align:left;margin-top:14px"><b>❌ ভুল হওয়া প্রশ্ন (${bn(QT.wrong.length)})</b>${QT.wrong.slice(0, 40).map(q => `<div class="cx" style="margin:6px 0"><div>${esc(q.q)}</div><div class="hint" style="color:#16a34a">✔ ${esc(q.o[q.a] || '')}</div></div>`).join('')}</div>` : ''}</div>`);
}
function qbRetry() { QT.list = qbShuf(QT.list); QT.i = 0; QT.s = 0; QT.wrong = []; qbQ(); }
async function qbShare() { const t = window._qbTxt || ''; try { const P = capP('Share'); if (P && P.share) return await P.share({text: t, dialogTitle: 'স্কোর শেয়ার'}); } catch (e) {} try { if (navigator.share) return await navigator.share({text: t}); await navigator.clipboard.writeText(t); alert('কপি হয়েছে।'); } catch (e) {} }

// ---- কাস্টম ট্রাফিক সাইন (বাল্ক) ----
let SG0 = -1, SGX = {}, SGDOCS = {};
function sgIcon(ic, img) { return /^https?:\/\//i.test(img || '') ? `<img src="${esc(img)}" style="height:1em;width:auto;max-width:100%;vertical-align:middle">` : esc(ic || '🚸'); }
function sgApply(rows) {
  if (SG0 < 0) SG0 = SIGNS.length; SIGNS.length = SG0; SGX = {}; SGDOCS = {};
  rows.forEach(r => { SGDOCS[r.id] = (r.qs || []); (r.qs || []).forEach((s, k) => { const adm = qbAdm(); if (s.h && !adm) return; SIGNS.push([sgIcon(s.i, s.m), s.n || '', s.d || '', ['mandatory', 'warning', 'info'].includes(s.c) ? s.c : 'info']); SGX[SIGNS.length - 1] = {m: s.m, u: s.u, v: s.v, h: !!s.h, doc: r.id, k}; }); });
}
async function sgLoad() {
  try { const c = JSON.parse(localStorage.getItem('cb_signs') || 'null'); if (c) sgApply(c); } catch (e) {}
  if (!CLOUD_ON() || !navigator.onLine) return;
  try { const f = await fb(); const rows = await sList(f, ['qsets'], f.F.where('ch', '==', 'signs')); rows.sort((a, b) => (a.i || 0) - (b.i || 0)); sgApply(rows); try { localStorage.setItem('cb_signs', JSON.stringify(rows.map(r => ({id: r.id, i: r.i, qs: r.qs})))); } catch (e) {} } catch (e) {}
}
let SGQ = '';
function signsPage2() {
  tab = 'home'; const adm = qbAdm();
  const f = [['all', 'সব সাইন'], ['mandatory', 'অবশ্যই পালনীয়'], ['warning', 'সতর্কতামূলক'], ['info', 'তথ্যমূলক']], s = SGQ.trim().toLowerCase();
  render(pageHead('ট্রাফিক সাইন') + `<div class="pad"><input class="inp" id="sg_s" placeholder="🔎 সাইনের নাম খুঁজুন" value="${esc(SGQ)}" oninput="SGQ=this.value;clearTimeout(window._sgt);window._sgt=setTimeout(()=>{signsPage2();const e=document.getElementById('sg_s');e.focus();e.setSelectionRange(e.value.length,e.value.length)},350)">
    <div class="chips">${f.map(x => `<button class="chip ${sgF === x[0] ? 'on' : ''}" onclick="sgF='${x[0]}';signsPage2()">${x[1]}</button>`).join('')}</div>
    ${adm ? `<div class="adbar">🛠️ অ্যাডমিন <button onclick="sgBulk()">📥 অনেকগুলো সাইন যোগ</button><button onclick="sgManage()">⚙️ আমার যোগ করা সাইন</button></div>` : ''}</div>
    <div class="signs">${SIGNS.map((x, i) => ({x, i})).filter(o => (sgF === 'all' || o.x[3] === sgF) && (!s || (o.x[1] + o.x[2]).toLowerCase().includes(s))).map(o => `<div class="sgn ${SGX[o.i] && SGX[o.i].h ? 'xh' : ''}" onclick="showSign(${o.i})"><div class="e">${o.x[0]}</div><b>${esc(o.x[1])}</b></div>`).join('')}</div>`);
}
function showSign2(i) {
  const s = SIGNS[i], x = SGX[i] || {};
  const big = /^https?:\/\//i.test(x.m || '') ? `<img src="${esc(x.m)}" style="max-width:100%;max-height:60vh;border-radius:12px;display:block;margin:0 auto">` : `<div style="font-size:84px">${s[0]}</div>`;
  const ex = x.v ? mediaHtml({url: safeUrl(x.v), mt: 'video', type: 'video'}) : '';
  showModal(`<div style="text-align:center">${big}<h3>${esc(s[1])}</h3><p style="text-align:left">${esc(s[2])}</p>${ex}<button class="btn sm" onclick="speak('${esc(s[1]).replace(/'/g, '')}। ${esc(s[2]).replace(/'/g, '')}')">🔊 শুনুন</button> ${x.u ? (isPdfUrl(x.u) ? pdfInline(safeUrl(x.u)) : linkBtn(x.u)) : ''}</div>`);
}
function sgBulk() {
  showModal(`<h3 style="margin:0 0 6px">📥 অনেকগুলো সাইন যোগ</h3><div class="hint">প্রতি লাইনে একটি সাইন:<br><b>আইকন | নাম | বিবরণ | ধরন | ছবির লিংক | লিংক</b><br>ধরন: <b>পালনীয়</b> / <b>সতর্ক</b> / <b>তথ্য</b>। আইকন হিসেবে ইমোজি দিন (ছবির লিংক থাকলে ছবিই বড় দেখাবে)। ছবি-লিংক ও লিংক ঐচ্ছিক।<br>উদাহরণ: ⛔ | প্রবেশ নিষেধ | এই পথে ঢোকা যাবে না | পালনীয়</div>
    <textarea class="inp" id="sg_b" rows="12" placeholder="এখানে পেস্ট করুন (১০০-৩০০টি একসাথে চলবে)"></textarea><div id="ad_msg" class="warn" style="display:none"></div><button class="btn" onclick="sgBulkSave()">✅ সেভ করুন</button>`);
}
const sgCat = t => /পালন|mandat|১|1/i.test(t || '') ? 'mandatory' : /সতর্ক|warn|২|2/i.test(t || '') ? 'warning' : 'info';
async function sgBulkSave() {
  const rows = gv('sg_b').split('\n').map(l => l.split(/[|｜]/).map(x => x.trim())).filter(p => p.length >= 2 && p[1]).map(p => ({i: Array.from(p[0] || '🚸').slice(0, 2).join(''), n: p[1].slice(0, 80), d: (p[2] || '').slice(0, 400), c: sgCat(p[3]), m: safeUrl(p[4] || '') || '', u: safeUrl(p[5] || '') || ''}));
  if (!rows.length) return adMsg('কোনো সাইন বোঝা যায়নি।'); if (rows.length > 600) return adMsg('একবারে সর্বোচ্চ ৬০০টি।');
  const m = await sme(); if (!m) return adMsg('অ্যাডমিন লগইন দরকার।'); const F = m.f.F; let idx = Object.keys(SGDOCS).length;
  try { for (let s = 0; s < rows.length; s += 100) { adMsg(`⏳ ${bn(Math.min(s + 100, rows.length))} / ${bn(rows.length)}`); const part = rows.slice(s, s + 100).map(r => { const o = {i: r.i, n: r.n, c: r.c}; if (r.d) o.d = r.d; if (r.m) o.m = r.m; if (r.u) o.u = r.u; return o; }); await F.addDoc(F.collection(m.f.db, 'qsets'), {bank: 'signs', ch: 'signs', i: idx++, qs: part, at: Date.now()}); }
    await sgLoad(); closeModal(); signsPage2(); alert('✅ ' + bn(rows.length) + 'টি সাইন যোগ হয়েছে।'); } catch (e) { adMsg('⚠️ সেভ হয়নি। ইন্টারনেট ও অ্যাডমিন লগইন দেখুন।'); }
}
function sgManage() {
  const rows = []; Object.keys(SGDOCS).forEach(d => SGDOCS[d].forEach((s, k) => rows.push({d, k, s})));
  showModal(`<h3 style="margin:0 0 8px">⚙️ যোগ করা সাইন (${bn(rows.length)})</h3>${rows.length ? rows.map(r => `<div class="blk"><div class="blkt">${sgIcon(r.s.i, r.s.m)} ${esc(r.s.n)}${r.s.h ? ' <span class="tag" style="background:#6b7280">লুকানো</span>' : ''}</div><div class="blkb"><button onclick="sgEdit('${r.d}',${r.k})">✏️</button><button onclick="sgHide('${r.d}',${r.k})">${r.s.h ? '👁️' : '🙈'}</button><button onclick="sgDel('${r.d}',${r.k})">🗑️</button></div></div>`).join('') : sEmpty('📭', 'এখনো কোনো সাইন যোগ করা হয়নি।')}`);
}
async function sgSaveDoc(did) { const m = await sme(); if (!m) throw 0; const F = m.f.F; if (!SGDOCS[did].length) await F.deleteDoc(F.doc(m.f.db, 'qsets', did)); else await F.setDoc(F.doc(m.f.db, 'qsets', did), {qs: SGDOCS[did]}, {merge: true}); await sgLoad(); }
async function sgHide(d, k) { const s = SGDOCS[d][k]; if (s.h) delete s.h; else s.h = true; try { await sgSaveDoc(d); sgManage(); } catch (e) { alert('হয়নি।'); } }
async function sgDel(d, k) { if (!confirm('সাইনটি মুছবেন?')) return; SGDOCS[d].splice(k, 1); try { await sgSaveDoc(d); sgManage(); } catch (e) { alert('হয়নি।'); } }
function sgEdit(d, k) { const s = SGDOCS[d][k]; showModal(`<h3>✏️ সাইন বদলান</h3><input class="inp" id="se_i" placeholder="আইকন (ইমোজি)" value="${esc(s.i || '')}"><input class="inp" id="se_n" placeholder="নাম" value="${esc(s.n || '')}"><textarea class="inp" id="se_d" rows="3" placeholder="বিবরণ">${esc(s.d || '')}</textarea><select class="inp" id="se_c"><option value="mandatory" ${s.c === 'mandatory' ? 'selected' : ''}>পালনীয়</option><option value="warning" ${s.c === 'warning' ? 'selected' : ''}>সতর্ক</option><option value="info" ${s.c === 'info' ? 'selected' : ''}>তথ্য</option></select><input class="inp" id="se_m" placeholder="বড় ছবির লিংক" value="${esc(s.m || '')}"><input class="inp" id="se_v" placeholder="ভিডিও লিংক" value="${esc(s.v || '')}"><input class="inp" id="se_u" placeholder="লিংক / PDF" value="${esc(s.u || '')}"><button class="btn" onclick="sgEditSave('${d}',${k})">💾 সেভ</button>`); }
async function sgEditSave(d, k) { const s = SGDOCS[d][k]; s.i = Array.from(gv('se_i') || '🚸').slice(0, 2).join(''); s.n = gv('se_n').slice(0, 80); s.d = gv('se_d').slice(0, 400); s.c = gv('se_c'); ['m', 'v', 'u'].forEach(f => { const v = safeUrl(gv('se_' + f)); if (v) s[f] = v; else delete s[f]; }); try { await sgSaveDoc(d); closeModal(); signsPage2(); } catch (e) { alert('হয়নি।'); } }

// সরকারি চাকরির প্রশ্ন পাতা (অধ্যায়ের পথে)
function govHome2() {
  tab = 'home';
  render(pageHead('সরকারি চাকরির প্রশ্ন ও সমাধান') + '<div class="pad"><div class="warn" style="margin:0 0 10px">বিষয় বেছে অধ্যায়ে যান। প্রতিটি প্রশ্নে উত্তর বেছে নিলে সঠিক উত্তর ও সমাধান দেখাবে।</div>' +
    Object.keys(GOV).map(k => { const n = GOV[k].length + qbCh(k).reduce((s, c) => s + (c.n || 0), 0); return `<div class="card" style="margin-bottom:10px" onclick="push(()=>govHome());window._qbBank='${k}';qbHome('${k}')"><div class="t"><span style="flex:1">${GOV_LABELS[k]}</span><span style="color:#999">${bn(n)}টি ›</span></div></div>`; }).join('') +
    `<div class="card" style="margin-bottom:10px;border-color:#1e40af" onclick="push(()=>govHome());open_('govguide')"><div class="t">🏛️ <span style="flex:1;color:#1e40af">প্রস্তুতি গাইড</span><span style="color:#999">›</span></div></div></div>`);
}
function step2Init() {
  govHome = govHome2; signsPage = signsPage2; showSign = showSign2;
  const o0 = open_; open_ = function (id) {
    if (id === 'roadtest' || id === 'signquiz') { push(() => home()); window._qbBank = id; return qbHome(id); }
    return o0.apply(this, arguments);
  };
  const qh0 = qbHome; qbHome = function (b) { window._qbBank = b; return qh0(b); };
  sgLoad();
}
(function () { const st = document.createElement('style'); st.textContent = `.qbq{background:var(--cd,#fff);border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin:10px 0}.qbq.xh{opacity:.5}.sgn.xh{opacity:.45}.sgn .e img{height:1em}`; document.head.appendChild(st); })();


// =====================================================================
//  ধাপ ৩: ড্রাইভিং জব (সবার বিজ্ঞাপন) ও মেকার ভাই
// =====================================================================
if (typeof CLOUD_ON === 'function' && CLOUD_ON() && !CATS.some(c => c.id === 'maker')) CATS.push({id: 'maker', name: 'মেকার ভাই', ic: '🛠️', color: '#c2410c', sub: 'মিস্ত্রি ও কারিগর খুঁজুন'});
const qa_ = () => { try { return isAdminFlag(); } catch (e) { return false; } };
const cfgv = k => { try { return APPCFG()[k]; } catch (e) { return undefined; } };
// ---------- জব বিজ্ঞাপন ----------
let JOBADS = []; try { JOBADS = JSON.parse(localStorage.getItem('jobads') || '[]'); } catch (e) {}
async function jadRefresh() {
  if (!CLOUD_ON() || !navigator.onLine) return;
  try { const f = await fb(); JOBADS = await sList(f, ['jobads'], f.F.where('status', 'in', ['approved', 'illegal']), f.F.limit(200)); try { localStorage.setItem('jobads', JSON.stringify(JOBADS)); } catch (e) {} } catch (e) {}
}
const JAD_ST = {pending: ['⏳ অনুমোদনের অপেক্ষায়', '#b45309'], approved: ['✅ চালু', '#16a34a'], hidden: ['🙈 লুকানো', '#6b7280'], illegal: ['⚠️ অবৈধ/সন্দেহজনক ঘোষিত', '#dc2626']};
function jadBar() {
  if (!CLOUD_ON()) return; const p = document.querySelector('#app .pad'); if (!p) return;
  p.insertAdjacentHTML('afterbegin', `<div class="adbar" style="background:#ecfdf5;border-color:#34d399;color:#065f46">💼 আপনিও বিজ্ঞাপন দিন <button style="background:#059669" onclick="jadForm()">➕ বিজ্ঞাপন দিন</button><button style="background:#0f766e" onclick="jadMine()">📋 আমার বিজ্ঞাপন</button></div>`);
}
async function jadForm() {
  const m = await sme(); if (!m) { alert('বিজ্ঞাপন দিতে আগে লগইন করুন।'); return; }
  showModal(`<h3 style="margin:0 0 8px">➕ চাকরির বিজ্ঞাপন</h3><div class="hint">আপনার বিজ্ঞাপন অ্যাডমিন দেখে অনুমোদন দিলে সবার কাছে দেখাবে। ভুয়া বা টাকা চাওয়া বিজ্ঞাপন দিলে আইডি বন্ধ হবে।</div>
    <input class="inp" id="ja_t" maxlength="100" placeholder="পদের নাম * (যেমন: ট্রাক ড্রাইভার)"><input class="inp" id="ja_c" maxlength="100" placeholder="কোম্পানি / আপনার নাম *"><input class="inp" id="ja_s" maxlength="60" placeholder="বেতন (যেমন: ২০,০০০ টাকা)"><input class="inp" id="ja_lic" maxlength="60" placeholder="লাইসেন্স (যেমন: হেভি)"><input class="inp" id="ja_loc" maxlength="80" placeholder="কাজের জায়গা"><input class="inp" id="ja_ph" maxlength="20" placeholder="যোগাযোগের মোবাইল নম্বর *"><label class="hint">আবেদনের শেষ তারিখ (ঐচ্ছিক)</label><input class="inp" id="ja_dl" type="date"><select class="inp" id="ja_k"><option value="local">দেশি চাকরি</option><option value="foreign">বিদেশি চাকরি</option></select><textarea class="inp" id="ja_d" rows="4" maxlength="800" placeholder="বিস্তারিত"></textarea>${adxHtml('ja', {})}<div id="ja_m" class="warn" style="display:none"></div><button class="btn" onclick="jadSave()">📤 জমা দিন</button>`);
}
async function jadSave() {
  const m = await sme(); const msg = t => { const e = document.getElementById('ja_m'); e.style.display = 'block'; e.textContent = t; }; if (!m) return msg('লগইন দরকার।');
  const d = {t: gv('ja_t'), c: gv('ja_c'), s: gv('ja_s'), lic: gv('ja_lic'), loc: gv('ja_loc'), phone: gv('ja_ph'), d: gv('ja_d'), deadline: gv('ja_dl'), kind: gv('ja_k') === 'foreign' ? 'foreign' : 'local'};
  try { const x = adxRead('ja'); d.more = x.more; d.imgs = x.imgs; d.link = x.link; d.pdfLink = x.pdfLink; } catch (e) { return msg(e.message); }
  if (!d.t || !d.c) return msg('পদের নাম ও কোম্পানি/নাম দিন।'); if (!/^[\d০-৯+\-\s]{6,20}$/.test(d.phone)) return msg('সঠিক মোবাইল নম্বর দিন।');
  d.by = m.u.uid; d.byName = ((cloudInfo() || {}).name || '').slice(0, 40); d.at = Date.now(); const auto = cfgv('jobAuto') === true; d.status = auto ? 'approved' : 'pending';
  try {
    const mine = await sList(m.f, ['jobads'], m.f.F.where('by', '==', m.u.uid)); if (mine.length >= 20) return msg('আপনার অনেক বিজ্ঞাপন আছে। পুরোনো কিছু মুছে আবার দিন।');
    try { await m.f.F.addDoc(m.f.F.collection(m.f.db, 'jobads'), d); } catch (e) { if (auto) { d.status = 'pending'; await m.f.F.addDoc(m.f.F.collection(m.f.db, 'jobads'), d); } else throw e; }
    closeModal(); await jadRefresh(); alert(d.status === 'approved' ? '✅ বিজ্ঞাপন চালু হয়েছে।' : '✅ জমা হয়েছে। অ্যাডমিন অনুমোদন দিলে সবার কাছে দেখাবে।'); jobsPage(d.kind === 'foreign' ? 'foreign' : '');
  } catch (e) { msg('জমা হয়নি। ইন্টারনেট দেখুন, অথবা আপনার আইডি বন্ধ থাকতে পারে।'); }
}
async function jadMine() {
  const m = await sme(); if (!m) return alert('আগে লগইন করুন।');
  try {
    const rows = await sList(m.f, ['jobads'], m.f.F.where('by', '==', m.u.uid)); rows.sort((a, b) => b.at - a.at);
    showModal(`<h3 style="margin:0 0 8px">📋 আমার বিজ্ঞাপন</h3>${rows.length ? rows.map(r => `<div class="cx"><b>${esc(r.t)}</b><div class="hint">${esc(r.c)}</div><span class="tag" style="background:${(JAD_ST[r.status] || JAD_ST.pending)[1]}">${(JAD_ST[r.status] || JAD_ST.pending)[0]}</span> <button class="nbtn" style="background:#b91c1c" onclick="jadDelMine('${esc(r.id)}')">🗑️ মুছুন</button></div>`).join('') : sEmpty('📭', 'আপনি এখনো কোনো বিজ্ঞাপন দেননি।')}`);
  } catch (e) { alert('লোড হয়নি।'); }
}
async function jadDelMine(id) { if (!confirm('মুছবেন?')) return; const m = await sme(); if (!m) return; try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'jobads', id)); await jadRefresh(); jadMine(); } catch (e) { alert('মোছা যায়নি।'); } }
function jadReport(id) { showModal(`<h3 style="margin:0 0 8px">🚩 বিজ্ঞাপনটি রিপোর্ট করুন</h3><select class="inp" id="jr_w"><option>ভুয়া বা প্রতারণা মনে হচ্ছে</option><option>টাকা চাচ্ছে</option><option>অবৈধ কাজ</option><option>ভুল তথ্য</option><option>অন্য কারণ</option></select><button class="btn" onclick="jadReportSend('${esc(id)}')">রিপোর্ট পাঠান</button>`); }
async function jadReportSend(id) {
  const m = await sme(); if (!m) { closeModal(); return alert('রিপোর্ট করতে লগইন করুন।'); } const a = JOBADS.find(x => x.id === id) || {};
  try { await m.f.F.addDoc(m.f.F.collection(m.f.db, 'reports'), {postId: id, postText: '[জব বিজ্ঞাপন] ' + (a.t || '') + ' — ' + (a.c || ''), postUid: a.by || '', why: gv('jr_w'), by: m.u.uid, createdAt: m.f.F.serverTimestamp()}); closeModal(); alert('✅ রিপোর্ট পাঠানো হয়েছে।'); } catch (e) { alert('পাঠানো যায়নি।'); }
}
async function jadAdminView(m) {
  const rows = await sList(m.f, ['jobads'], m.f.F.orderBy('at', 'desc'), m.f.F.limit(200)); window._jadRows = rows; const fl = window._jadF || 'pending';
  const cnt = s => rows.filter(r => r.status === s).length, shown = rows.filter(r => fl === 'all' || r.status === fl);
  return `<div class="cx"><b>💼 ব্যবহারকারীদের চাকরির বিজ্ঞাপন</b><label style="display:block;margin:8px 0"><input type="checkbox" ${cfgv('jobAuto') === true ? 'checked' : ''} onchange="jadAuto(this.checked)"> অনুমোদন ছাড়াই সরাসরি প্রকাশ (পরে আপনি লুকাতে পারবেন)</label>
    <div class="chips">${[['pending', '⏳ অপেক্ষায়'], ['approved', '✅ চালু'], ['hidden', '🙈 লুকানো'], ['illegal', '⚠️ অবৈধ'], ['all', 'সব']].map(x => `<button class="chip ${fl === x[0] ? 'on' : ''}" onclick="window._jadF='${x[0]}';adminPage('jads')">${x[1]}${x[0] !== 'all' ? ' (' + bn(cnt(x[0])) + ')' : ''}</button>`).join('')}</div></div>` +
    (shown.length ? shown.map((r, i) => `<div class="cx"><span class="tag" style="background:${(JAD_ST[r.status] || JAD_ST.pending)[1]}">${(JAD_ST[r.status] || JAD_ST.pending)[0]}</span><div><b>${esc(r.t)}</b></div><div class="hint">🏢 ${esc(r.c)} • 💰 ${esc(r.s || '—')} • 📍 ${esc(r.loc || '—')}<br>📞 ${esc(r.phone || '')} • 👤 ${esc(r.byName || 'নামহীন')}<br>${esc(r.d || '')}</div>
      <button class="btn sm" style="background:#16a34a" onclick="jadSet('${esc(r.id)}','approved')">✅ অনুমোদন</button><button class="btn sm" style="background:#64748b" onclick="jadSet('${esc(r.id)}','hidden')">🙈 লুকান</button><button class="btn sm" style="background:#dc2626" onclick="jadSet('${esc(r.id)}','illegal')">⚠️ অবৈধ ঘোষণা</button><button class="btn sm" style="background:#7f1d1d" onclick="jadBan(${i})">🚫 আইডি ব্লক</button><button class="btn sm" style="background:#475569" onclick="jadDel('${esc(r.id)}')">🗑️ মুছুন</button></div>`).join('') : sEmpty('📭', 'এই তালিকায় কিছু নেই।'));
}
async function jadAuto(v) { await pdfSaveCfg({jobAuto: !!v}); }
async function jadSet(id, st) { const m = await sme(); if (!m) return; try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'jobads', id), {status: st}, {merge: true}); await jadRefresh(); adminPage('jads'); } catch (e) { alert('হয়নি।'); } }
async function jadDel(id) { if (!confirm('চিরতরে মুছবেন?')) return; const m = await sme(); if (!m) return; try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'jobads', id)); await jadRefresh(); adminPage('jads'); } catch (e) { alert('হয়নি।'); } }
async function jadBan(i) {
  const shown = (window._jadRows || []).filter(r => (window._jadF || 'pending') === 'all' || r.status === (window._jadF || 'pending')), r = shown[i]; if (!r || !r.by) return;
  if (!confirm('এই আইডি ব্লক হবে — আর পোস্ট, মন্তব্য, বিজ্ঞাপন দিতে পারবে না। নিশ্চিত?')) return; const m = await sme(); if (!m) return;
  try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'banned', r.by), {at: Date.now(), why: 'জব বিজ্ঞাপন', by: m.u.uid}); await m.f.F.setDoc(m.f.F.doc(m.f.db, 'jobads', r.id), {status: 'hidden'}, {merge: true}); alert('🚫 আইডি ব্লক হয়েছে।'); adminPage('jads'); } catch (e) { alert('হয়নি।'); }
}
// ---------- মেকার ভাই ----------
const MK_JOBS_DEF = ['মোটর মেকানিক', 'ইলেকট্রিশিয়ান', 'প্লাম্বার', 'রাজমিস্ত্রি', 'কাঠমিস্ত্রি', 'রংমিস্ত্রি', 'ওয়েল্ডিং মিস্ত্রি', 'এসি/ফ্রিজ মেকানিক', 'মোবাইল মেকানিক', 'ড্রাইভার', 'হেলপার', 'টায়ার / পাংচার', 'ডেন্টিং-পেইন্টিং', 'অন্যান্য'];
const mkJobs = () => { const j = cfgv('mkJobs'); return Array.isArray(j) && j.length ? j : MK_JOBS_DEF; };
const geoName = (k, id) => { const L = {dv: GEO.d, ds: GEO.z, up: GEO.u, un: GEO.n}[k], r = L.find(x => x[0] === +id); return r ? r[r.length - 1] : ''; };
const GEOV = {};
function geoList(l, v) { return l === 'dv' ? GEO.d.map(x => [x[0], x[1]]) : l === 'ds' ? GEO.z.filter(z => String(z[1]) === String(v.dv)).map(z => [z[0], z[2]]) : l === 'up' ? GEO.u.filter(u => String(u[1]) === String(v.ds)).map(u => [u[0], u[2]]) : GEO.n.filter(n => String(n[1]) === String(v.up)).map(n => [n[0], n[2]]); }
function geoFill(p, l) {
  const g = GEOV[p], sel = document.getElementById(p + l); if (!sel) return; const q = ((document.getElementById(p + l + '_q') || {}).value || '').trim();
  const items = geoList(l, g).filter(x => !q || x[1].includes(q) || String(x[0]) === String(g[l])); const lab = {dv: 'বিভাগ', ds: 'জেলা', up: 'উপজেলা/থানা', un: 'ইউনিয়ন'}[l];
  sel.innerHTML = `<option value="">— ${lab} বাছুন —</option>` + items.map(x => `<option value="${x[0]}" ${String(g[l]) === String(x[0]) ? 'selected' : ''}>${esc(x[1])}</option>`).join('');
}
function geoCh(p, l) {
  const g = GEOV[p], o = ['dv', 'ds', 'up', 'un']; g[l] = document.getElementById(p + l).value; for (let i = o.indexOf(l) + 1; i < 4; i++) { g[o[i]] = ''; const q = document.getElementById(p + o[i] + '_q'); if (q) q.value = ''; geoFill(p, o[i]); }
  if (g.cb) g.cb(l);
}
function geoHtml(p, v, cb) {
  GEOV[p] = Object.assign({dv: '', ds: '', up: '', un: ''}, v || {}, {cb}); setTimeout(() => ['dv', 'ds', 'up', 'un'].forEach(l => geoFill(p, l)), 0);
  return [['dv', 'বিভাগ'], ['ds', 'জেলা'], ['up', 'উপজেলা / থানা'], ['un', 'ইউনিয়ন']].map(x => `<div class="hint" style="margin:6px 0 2px">${x[1]}</div>${x[0] !== 'dv' ? `<input class="inp gsr" id="${p}${x[0]}_q" placeholder="🔎 ${x[1]} খুঁজুন" oninput="geoFill('${p}','${x[0]}')">` : ''}<select class="inp" id="${p}${x[0]}" onchange="geoCh('${p}','${x[0]}')"></select>`).join('');
}
let MKF = {vil: '', ward: '', job: '', q: ''}, MKROWS = [];
async function makerPage() {
  sShell('মেকার ভাই', 'home', '🛠️', 'মিস্ত্রি, কারিগর ও মেকার খুঁজুন — গ্রাম ধরে');
  if (!CLOUD_ON()) return sbody(sNeedSetup());
  if (cfgv('mkOn') === false && !qa_()) return sbody(`<div class="cx">🛠️ এই ফিচারটি এখন বন্ধ আছে।</div>`);
  const jobs = mkJobs();
  sbody(`<div class="cx"><b>🔎 মেকার খুঁজুন</b>
    <div style="display:flex;gap:6px;margin:8px 0 0;flex-wrap:wrap"><button class="btn sm" onclick="mkMine()">🧑‍🔧 আমার প্রোফাইল / নিবন্ধন</button></div>
    <input class="inp" id="mk_q" placeholder="নাম বা মোবাইল নম্বর" value="${esc(MKF.q)}">${geoHtml('mf', {}, () => {})}
    <input class="inp" id="mk_vil" placeholder="গ্রাম (যেমন: মোয়াজ্জেমপুর)" value="${esc(MKF.vil)}"><input class="inp" id="mk_ward" inputmode="numeric" placeholder="ওয়ার্ড নম্বর" value="${esc(MKF.ward)}">
    <select class="inp" id="mk_job"><option value="">সব পেশা</option>${jobs.map(j => `<option ${MKF.job === j ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select><button class="btn" onclick="mkSearch()">🔎 খুঁজুন</button></div><div id="mk_res"></div>`);
  mkSearch(true);
}
async function mkSearch(quiet) {
  MKF = {vil: gv('mk_vil'), ward: gv('mk_ward'), job: gv('mk_job'), q: gv('mk_q')}; const g = GEOV.mf || {}, res = document.getElementById('mk_res'); if (!res) return;
  res.innerHTML = '<div class="empty"><span class="e1">⏳</span>খোঁজা হচ্ছে...</div>';
  try {
    const f = await fb(), F = f.F, w = [F.where('status', '==', 'approved'), F.where('selfHide', '==', false)]; [['dv', 'dv'], ['ds', 'ds'], ['up', 'up'], ['un', 'un']].forEach(x => { if (g[x[0]]) w.push(F.where(x[1], '==', +g[x[0]])); });
    let rows = await sList(f, ['makers'], ...w, F.limit(300)); MKROWS = rows;
    const q = MKF.q.toLowerCase(), bd = s => String(s).replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c));
    rows = rows.filter(r => (!MKF.vil || (r.vil || '').includes(MKF.vil)) && (!MKF.ward || bd(r.ward || '') === bd(MKF.ward)) && (!MKF.job || r.job === MKF.job) && (!q || (r.name || '').toLowerCase().includes(q) || (r.showPhone && bd(r.phone || '').includes(bd(q)))));
    if (!rows.length) { res.innerHTML = sEmpty('🔍', 'কোনো মেকার পাওয়া যায়নি।'); return; }
    const grp = {}; rows.forEach(r => { const k = r.vil || '(গ্রামের নাম নেই)'; (grp[k] = grp[k] || []).push(r); });
    res.innerHTML = `<div class="hint" style="margin:8px 0">মোট ${bn(rows.length)} জন মেকার</div>` + Object.keys(grp).sort().map(k => `<div class="gh-t" style="font-weight:800;margin:12px 0 4px;color:#9a3412">🏘️ ${esc(k)} (${bn(grp[k].length)} জন)</div>` + grp[k].map(r => mkCard(r, false)).join('')).join('');
  } catch (e) { res.innerHTML = sErr(e); }
}
function mkAddr(r) { return [r.vil, r.ward ? 'ওয়ার্ড ' + bn(r.ward) : '', r.unN, r.upN, r.dsN, r.dvN].filter(Boolean).join(', ') + (r.addr ? ' — ' + r.addr : ''); }
function mkCard(r, adm, priv) {
  const ph = r.showPhone && r.phone ? r.phone : (adm && priv ? priv.phone : ''), em = r.showEmail && r.email ? r.email : (adm && priv ? priv.email : '');
  return `<div class="cx mkc"><div style="display:flex;gap:10px;align-items:center"><div class="cvph" style="width:54px;height:54px;border-radius:50%;overflow:hidden;background:#fed7aa;display:flex;align-items:center;justify-content:center;font-size:24px;flex:none">${okImg(r.photo) ? `<img src="${r.photo}" style="width:100%;height:100%;object-fit:cover">` : esc(initial(r.name))}</div><div><b style="display:block">${esc(r.name || '')}</b><span class="tag" style="background:#c2410c">${esc(r.job || '')}</span></div></div>
    <div class="hint" style="margin-top:6px">📍 ${esc(mkAddr(r))}</div>${r.exp ? `<div class="hint">🧰 অভিজ্ঞতা: ${esc(r.exp)}</div>` : ''}
    <div style="margin-top:6px">${ph ? `<a class="btn sm" style="text-decoration:none" href="tel:${esc(ph)}">📞 ${esc(ph)}</a>` : '<span class="hint">🔒 মোবাইল নম্বর গোপন</span>'} ${em ? `<span class="hint">✉️ ${esc(em)}</span>` : ''}</div></div>`;
}
async function mkMine() {
  const m = await sme(); if (!m) { alert('নিবন্ধন করতে আগে লগইন করুন।'); return; }
  if (cfgv('mkReg') === false) return alert('নতুন নিবন্ধন এখন বন্ধ আছে।');
  try {
    const d = await m.f.F.getDoc(m.f.F.doc(m.f.db, 'makers', m.u.uid)); if (!d.exists()) return mkForm('');
    const r = Object.assign({id: m.u.uid}, d.data()), pv = await mkPriv(m, m.u.uid); const st = {pending: '⏳ অ্যাডমিনের অনুমোদনের অপেক্ষায়', approved: '✅ চালু আছে', hidden: '🙈 অ্যাডমিন লুকিয়েছেন', rejected: '❌ বাতিল করা হয়েছে'}[r.status] || r.status;
    showModal(`<h3 style="margin:0 0 6px">🧑‍🔧 আমার প্রোফাইল</h3><div class="hint">অবস্থা: <b>${st}</b>${r.selfHide ? ' • আপনি নিজে লুকিয়েছেন' : ''}${r.delReq ? ' • 🗑️ মুছে ফেলার আবেদন দেওয়া আছে' : ''}</div>${mkCard(r, true, pv)}
      <button class="btn sm" onclick="mkForm('')">✏️ তথ্য বদলান</button> <button class="btn sm" style="background:#64748b" onclick="mkSelf('selfHide',${!r.selfHide})">${r.selfHide ? '👁️ আবার দেখান' : '🙈 নিজের প্রোফাইল লুকান'}</button> <button class="btn sm" style="background:#b91c1c" onclick="mkSelf('delReq',${!r.delReq})">${r.delReq ? '↩️ মুছার আবেদন ফেরত নিন' : '🗑️ মুছে ফেলার আবেদন'}</button>`);
  } catch (e) { alert('লোড হয়নি।'); }
}
async function mkPriv(m, id) { try { const d = await m.f.F.getDoc(m.f.F.doc(m.f.db, 'makers', id, 'priv', 'c')); return d.exists() ? d.data() : null; } catch (e) { return null; } }
async function mkSelf(k, v) { const m = await sme(); if (!m) return; try { const p = {[k]: v}; if (k === 'delReq' && v) p.selfHide = true; await m.f.F.setDoc(m.f.F.doc(m.f.db, 'makers', m.u.uid), p, {merge: true}); closeModal(); alert(k === 'delReq' && v ? '✅ আবেদন জমা হয়েছে। প্রোফাইল এখন লুকানো, অ্যাডমিন মুছে দেবেন।' : '✅ হয়েছে।'); } catch (e) { alert('হয়নি।'); } }
let _mkPhoto = '', _mkId = '', _mkOld = null;
async function mkForm(id) {
  const m = await sme(); if (!m) return alert('লগইন দরকার।'); _mkPhoto = ''; let r = {}, pv = null; const adm = qa_(), docId = id === 'new' ? '' : (id || m.u.uid); _mkId = id;
  if (docId) { try { const d = await m.f.F.getDoc(m.f.F.doc(m.f.db, 'makers', docId)); if (d.exists()) { r = d.data(); pv = await mkPriv(m, docId); } } catch (e) {} } _mkOld = r;
  const vil = (cfgv('mkVil') || {}), jobs = mkJobs(), phone = r.phone || (pv && pv.phone) || '', email = r.email || (pv && pv.email) || (id === '' ? ((m.u.email || '').includes('@chalokbhai.app') ? '' : m.u.email || '') : '');
  showModal(`<h3 style="margin:0 0 6px">${r.name ? '✏️ তথ্য বদলান' : '🧑‍🔧 মেকার নিবন্ধন'}</h3>${r.status === 'approved' && !adm ? '<div class="hint" style="color:#b45309">তথ্য বদলালে অ্যাডমিন আবার দেখে অনুমোদন দেবেন।</div>' : ''}
    <input class="inp" id="mf_n" maxlength="60" placeholder="মেকারের নাম *" value="${esc(r.name || '')}"><input class="inp" id="mf_p" inputmode="tel" maxlength="20" placeholder="মোবাইল নম্বর *" value="${esc(phone)}"><input class="inp" id="mf_e" maxlength="80" placeholder="ইমেইল / জিমেইল (ঐচ্ছিক)" value="${esc(email)}">
    ${geoHtml('mr', {dv: r.dv || '', ds: r.ds || '', up: r.up || '', un: r.un || ''}, l => { if (l === 'un') mkVilSug(); })}
    <input class="inp" id="mf_v" list="mf_vl" maxlength="60" placeholder="গ্রাম (লিখুন)" value="${esc(r.vil || '')}"><datalist id="mf_vl"></datalist><input class="inp" id="mf_w" inputmode="numeric" maxlength="3" placeholder="ওয়ার্ড নম্বর" value="${esc(r.ward || '')}"><textarea class="inp" id="mf_a" rows="2" maxlength="200" placeholder="সম্পূর্ণ ঠিকানা (বাড়ি/রাস্তা ইত্যাদি)">${esc(r.addr || '')}</textarea>
    <select class="inp" id="mf_j"><option value="">— পেশা / কাজের ধরন * —</option>${jobs.map(j => `<option ${r.job === j ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select><input class="inp" id="mf_x" maxlength="80" placeholder="কাজের অভিজ্ঞতা (যেমন: ৫ বছর)" value="${esc(r.exp || '')}">
    <div class="hint">প্রোফাইল ছবি (ঐচ্ছিক)</div>${okImg(r.photo) ? `<img src="${r.photo}" style="width:64px;height:64px;border-radius:50%;object-fit:cover">` : ''}<input type="file" accept="image/*" onchange="mkPhoto(this)">
    <label style="display:block;margin:8px 0"><input type="checkbox" id="mf_sp" ${r.showPhone ? 'checked' : ''}> আমার মোবাইল নম্বর সবাইকে দেখানোর অনুমতি দিচ্ছি</label><label style="display:block;margin:4px 0"><input type="checkbox" id="mf_se" ${r.showEmail ? 'checked' : ''}> আমার ইমেইল সবাইকে দেখানোর অনুমতি দিচ্ছি</label><div class="hint">অনুমতি না দিলে নম্বর/ইমেইল শুধু অ্যাডমিন দেখবেন।</div>
    <div id="mf_m" class="warn" style="display:none"></div><button class="btn" onclick="mkSave()">💾 জমা দিন</button>`);
  setTimeout(mkVilSug, 50);
}
function mkVilSug() {
  const g = GEOV.mr || {}, dl = document.getElementById('mf_vl'); if (!dl) return; const a = ((cfgv('mkVil') || {})[g.un] || []).concat(MKROWS.filter(r => String(r.un) === String(g.un)).map(r => r.vil));
  dl.innerHTML = Array.from(new Set(a.filter(Boolean))).map(v => `<option value="${esc(v)}">`).join('');
}
async function mkPhoto(inp) { try { if (inp.files[0]) _mkPhoto = await imgToData(inp.files[0], 160); } catch (e) { alert('ছবি নেওয়া যায়নি।'); } }
async function mkSave() {
  const msg = t => { const e = document.getElementById('mf_m'); e.style.display = 'block'; e.textContent = t; }, m = await sme(); if (!m) return msg('লগইন দরকার।'); const g = GEOV.mr, adm = qa_(), isNew = _mkId === 'new', docId = isNew ? '' : (_mkId || m.u.uid);
  const phone = gv('mf_p'), email = gv('mf_e'); if (!gv('mf_n')) return msg('নাম দিন।'); if (!/^[\d০-৯+\-\s]{6,20}$/.test(phone)) return msg('সঠিক মোবাইল নম্বর দিন।'); if (!g.dv || !g.ds || !g.up) return msg('বিভাগ, জেলা ও উপজেলা বাছুন।'); if (!gv('mf_j')) return msg('পেশা বাছুন।'); if (email && !/^\S+@\S+\.\S+$/.test(email)) return msg('ইমেইল ঠিক নয়।');
  const sp = chk('mf_sp'), se = chk('mf_se'), old = _mkOld || {}, F = m.f.F;
  const d = {uid: isNew ? 'admin' : docId, name: gv('mf_n').slice(0, 60), dv: +g.dv, ds: +g.ds, up: +g.up, un: +g.un || 0, dvN: geoName('dv', g.dv), dsN: geoName('ds', g.ds), upN: geoName('up', g.up), unN: g.un ? geoName('un', g.un) : '', vil: gv('mf_v').slice(0, 60), ward: gv('mf_w').slice(0, 3), addr: gv('mf_a').slice(0, 200), job: gv('mf_j'), exp: gv('mf_x').slice(0, 80), photo: _mkPhoto || old.photo || '', showPhone: sp, showEmail: se && !!email, phone: sp ? phone : '', email: se && email ? email : '', selfHide: !!old.selfHide, delReq: !!old.delReq, at: old.at || Date.now()};
  d.status = isNew ? 'approved' : (adm ? (old.status || 'approved') : (old.status === 'rejected' || old.status === 'approved' || !old.status ? 'pending' : old.status));
  if (!d.status) d.status = 'pending';
  try {
    let id = docId; if (isNew) { const r = await F.addDoc(F.collection(m.f.db, 'makers'), d); id = r.id; } else await F.setDoc(F.doc(m.f.db, 'makers', id), d);
    await F.setDoc(F.doc(m.f.db, 'makers', id, 'priv', 'c'), {phone, email});
    closeModal(); alert(d.status === 'approved' ? '✅ সেভ হয়েছে।' : '✅ জমা হয়েছে। অ্যাডমিন অনুমোদন দিলে সবার কাছে দেখাবে।'); if (isNew || (adm && _mkId && _mkId !== m.u.uid)) adminPage('mkr'); else makerPage();
  } catch (e) { msg('সেভ হয়নি। ইন্টারনেট দেখুন বা আপনার আইডি বন্ধ থাকতে পারে।'); }
}
// ---- অ্যাডমিন ----
async function mkAdminView(m) {
  window._mkAdm = true; const rows = await sList(m.f, ['makers'], m.f.F.orderBy('at', 'desc'), m.f.F.limit(300)); window._mkRows = rows; const fl = window._mkF || 'pending', st = {pending: '⏳ অপেক্ষায়', approved: '✅ চালু', hidden: '🙈 লুকানো', rejected: '❌ বাতিল'};
  const test = r => fl === 'all' ? true : fl === 'del' ? !!r.delReq : r.status === fl; const cnt = f => rows.filter(r => f === 'del' ? r.delReq : r.status === f).length, shown = rows.filter(test);
  return `<div class="cx"><b>🛠️ মেকার ভাই — নিয়ন্ত্রণ</b>
    <label style="display:block;margin:8px 0"><input type="checkbox" ${cfgv('mkOn') !== false ? 'checked' : ''} onchange="mkCfgSet('mkOn',this.checked)"> পুরো ফিচার চালু (বন্ধ করলে ব্যবহারকারীরা দেখবে না)</label>
    <label style="display:block;margin:8px 0"><input type="checkbox" ${cfgv('mkReg') !== false ? 'checked' : ''} onchange="mkCfgSet('mkReg',this.checked)"> নতুন নিবন্ধন নেওয়া চালু</label>
    <button class="btn sm" onclick="mkForm('new')">➕ নতুন মেকার যোগ</button> <button class="btn sm" style="background:#0369a1" onclick="mkListEdit()">📝 পেশার তালিকা বদলান</button> <button class="btn sm" style="background:#7c3aed" onclick="mkVilEdit()">🏘️ গ্রামের নাম যোগ</button></div>
    <div class="chips">${[['pending', '⏳ অপেক্ষায়'], ['approved', '✅ চালু'], ['hidden', '🙈 লুকানো'], ['rejected', '❌ বাতিল'], ['del', '🗑️ মুছার আবেদন'], ['all', 'সব']].map(x => `<button class="chip ${fl === x[0] ? 'on' : ''}" onclick="window._mkF='${x[0]}';adminPage('mkr')">${x[1]}${x[0] !== 'all' ? ' (' + bn(cnt(x[0])) + ')' : ''}</button>`).join('')}</div>` +
    (shown.length ? shown.map((r, i) => `<div class="cx">${mkCard(r, true)}<span class="tag" style="background:#475569">${st[r.status] || r.status}</span>${r.selfHide ? ' <span class="tag" style="background:#6b7280">নিজে লুকিয়েছে</span>' : ''}${r.delReq ? ' <span class="tag" style="background:#dc2626">মুছার আবেদন</span>' : ''}<div id="mkp${i}"></div>
      <button class="btn sm" style="background:#16a34a" onclick="mkSet(${i},'approved')">✅ অনুমোদন</button><button class="btn sm" style="background:#64748b" onclick="mkSet(${i},'${r.status === 'hidden' ? 'approved' : 'hidden'}')">${r.status === 'hidden' ? '👁️ দেখান' : '🙈 লুকান'}</button><button class="btn sm" style="background:#b45309" onclick="mkSet(${i},'rejected')">❌ ভুয়া/বাতিল</button><button class="btn sm" style="background:#0369a1" onclick="_mkId='${esc(r.id)}';mkForm('${esc(r.id)}')">✏️ সম্পাদনা</button><button class="btn sm" style="background:#475569" onclick="mkPv(${i})">📞 গোপন তথ্য</button><button class="btn sm" style="background:#b91c1c" onclick="mkDel(${i})">🗑️ মুছুন</button></div>`).join('') : sEmpty('📭', 'এই তালিকায় কেউ নেই।'));
}
function mkShown() { const fl = window._mkF || 'pending'; return (window._mkRows || []).filter(r => fl === 'all' ? true : fl === 'del' ? !!r.delReq : r.status === fl); }
async function mkCfgSet(k, v) { await pdfSaveCfg({[k]: !!v}); }
async function mkSet(i, st) { const r = mkShown()[i], m = await sme(); if (!r || !m) return; try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'makers', r.id), {status: st}, {merge: true}); adminPage('mkr'); } catch (e) { alert('হয়নি।'); } }
async function mkDel(i) { const r = mkShown()[i], m = await sme(); if (!r || !m || !confirm('চিরতরে মুছবেন?')) return; try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'makers', r.id, 'priv', 'c')).catch(() => {}); await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'makers', r.id)); adminPage('mkr'); } catch (e) { alert('হয়নি।'); } }
async function mkPv(i) { const r = mkShown()[i], m = await sme(); if (!r || !m) return; const p = await mkPriv(m, r.id), e = document.getElementById('mkp' + i); if (e) e.innerHTML = `<div class="warn" style="margin:6px 0">📞 ${esc((p && p.phone) || '—')}<br>✉️ ${esc((p && p.email) || '—')}</div>`; }
function mkListEdit() { showModal(`<h3 style="margin:0 0 8px">📝 পেশার তালিকা</h3><div class="hint">প্রতি লাইনে একটি পেশা। যোগ, বদল, মোছা — সব এখান থেকে।</div><textarea class="inp" id="mk_jl" rows="12">${esc(mkJobs().join('\n'))}</textarea><button class="btn" onclick="mkListSave()">💾 সেভ</button> <button class="btn sm" style="background:#64748b" onclick="mkListReset()">↩️ আসল তালিকা</button>`); }
async function mkListSave() { const l = gv('mk_jl').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 80); if (l.length < 1) return; if (await pdfSaveCfg({mkJobs: l})) { closeModal(); alert('✅ সেভ হয়েছে।'); } }
async function mkListReset() { if (await pdfSaveCfg({mkJobs: MK_JOBS_DEF})) { closeModal(); alert('✅ আসল তালিকা ফেরানো হয়েছে।'); } }
function mkVilEdit() { showModal(`<h3 style="margin:0 0 8px">🏘️ গ্রামের নাম যোগ</h3><div class="hint">ইউনিয়ন বেছে গ্রামের নাম লিখুন (একাধিক হলে কমা দিয়ে)। নিবন্ধনের সময় এগুলো সাজেশনে আসবে।</div>${geoHtml('mv', {}, () => {})}<input class="inp" id="mv_n" placeholder="গ্রামের নাম (কমা দিয়ে আলাদা)"><div id="mv_m" class="warn" style="display:none"></div><button class="btn" onclick="mkVilSave()">➕ যোগ করুন</button>`); }
async function mkVilSave() { const g = GEOV.mv; if (!g.un) { const e = document.getElementById('mv_m'); e.style.display = 'block'; e.textContent = 'ইউনিয়ন বাছুন।'; return; } const cur = cfgv('mkVil') || {}, add = gv('mv_n').split(/[,،]/).map(x => x.trim()).filter(Boolean), l = Array.from(new Set((cur[g.un] || []).concat(add))).slice(0, 500); if (!add.length) return; const nv = Object.assign({}, cur, {[g.un]: l}); if (await pdfSaveCfg({mkVil: nv})) { closeModal(); alert('✅ যোগ হয়েছে।'); } }

function step3Init() {
  const aj0 = adminJobs; adminJobs = function () { return aj0().concat(JOBADS.map(a => ({kind: a.kind === 'foreign' ? 'foreign' : 'local', t: a.t, c: a.c, s: a.s, lic: a.lic, loc: a.loc, deadline: a.deadline, phone: a.phone, d: a.d, _ad: a.id, _st: a.status, _by: a.by, url: a.link || '', more: a.more || '', imgs: a.imgs || [], pdfLink: a.pdfLink || ''}))); };
  const jp0 = jobsPage; jobsPage = function () { jp0.apply(this, arguments); jadBar(); };
  const sj0 = showJob; showJob = function (i) {
    sj0.apply(this, arguments); const j = activeJobs()[i]; if (!j || !j._ad) return; const b = document.querySelector('#modal .mbox'); if (!b) return;
    b.insertAdjacentHTML('beforeend', `${adxView(j, j._ad, true)}${j._st === 'illegal' ? '<div class="warn" style="background:#fee2e2;color:#991b1b;border-color:#dc2626">⚠️ অ্যাডমিন এই বিজ্ঞাপনটিকে সন্দেহজনক/অবৈধ হিসেবে চিহ্নিত করেছেন। আবেদন করবেন না, কোনো টাকা দেবেন না।</div>' : '<div class="hint" style="margin-top:8px">👤 ব্যবহারকারীর দেওয়া বিজ্ঞাপন — আবেদনের আগে নিজে যাচাই করুন।</div>'}<button class="btn sm" style="background:#64748b;margin-top:8px" onclick="jadReport('${esc(j._ad)}')">🚩 রিপোর্ট করুন</button>`);
  };
  const o1 = open_; open_ = function (id) { if (id === 'maker') { push(() => home()); return makerPage(); } return o1.apply(this, arguments); };
  setTimeout(jadRefresh, 1500);
}

const PRIVACY=[["সারসংক্ষেপ", "\"আমার ভাই\" অ্যাপটি বাংলাদেশের চালক ও চালক হতে ইচ্ছুকদের জন্য তৈরি। এই নীতিতে বলা আছে আমরা কোন তথ্য নিই, কেন নিই এবং আপনি কীভাবে সেটি নিয়ন্ত্রণ করবেন। আমরা কোনো তথ্য বিক্রি করি না এবং অ্যাপে কোনো বিজ্ঞাপন-ট্র্যাকিং নেই।"], ["কোন তথ্য আমরা নিই", "• অ্যাকাউন্ট: নাম এবং মোবাইল নম্বর বা ইমেইল (লগইনের জন্য)। পাসওয়ার্ড সরাসরি আমাদের কাছে থাকে না, Firebase Authentication সেটি সুরক্ষিতভাবে রাখে।\n• আপনি ইচ্ছা করে যা দেন: কমিউনিটির পোস্ট ও মন্তব্য, চাকরিপ্রার্থী আইডি, চাকরির বিজ্ঞাপন, মেকার ভাইয়ের নিবন্ধন (নাম, ঠিকানা, পেশা, অভিজ্ঞতা, ঐচ্ছিক ছবি), অর্ডার ফর্ম।\n• ক্লাউড ব্যাকআপ: আপনি চালু করলে খাতা, নোট, আয়-খরচ, রিমাইন্ডার ইত্যাদি আপনার অ্যাকাউন্টে সংরক্ষিত হয়।\n• শেষ কখন অ্যাপ খুলেছেন (ব্যবহারকারী গণনার জন্য)।\n• অ্যাপের বাকি তথ্য (সেটিং, নোট, খাতা) আপনার ফোনেই থাকে।"], ["মোবাইল নম্বর ও ইমেইল", "মেকার ভাই ও চাকরিপ্রার্থী আইডিতে আপনার মোবাইল নম্বর বা ইমেইল অন্যদের দেখানো হয় শুধু আপনি অনুমতি দিলে। অনুমতি না দিলে সেগুলো শুধু অ্যাপের অ্যাডমিন দেখতে পারেন। চাকরির বিজ্ঞাপনে আপনি যে যোগাযোগ নম্বর দেন সেটি বিজ্ঞাপনের অংশ হিসেবে সবাই দেখে।"], ["তথ্য কেন ব্যবহার করি", "অ্যাকাউন্ট চালু রাখা, ক্লাউড ব্যাকআপ, কমিউনিটি ও চাকরি/মেকার সেবা চালানো, অপব্যবহার ঠেকানো এবং অ্যাপ উন্নত করা।"], ["তৃতীয় পক্ষ", "অ্যাপ Google Firebase (Authentication ও Firestore) ব্যবহার করে। তথ্য Google-এর সার্ভারে সংরক্ষিত থাকে। ইউটিউব বা অন্য লিংক খুললে সেই সাইটের নীতি প্রযোজ্য। আমরা তথ্য কোনো বিজ্ঞাপনদাতার কাছে বিক্রি বা ভাগ করি না।"], ["অনুমতি (পারমিশন)", "ইন্টারনেট: ক্লাউড ও কনটেন্ট আনতে। নোটিফিকেশন: আপনার সেট করা নোট/রিমাইন্ডারের স্মরণ করিয়ে দিতে। ফাইল সংরক্ষণ/শেয়ার: PDF ও ব্যাকআপ ফাইল তৈরি ও পাঠাতে।"], ["আপনার নিয়ন্ত্রণ ও তথ্য মোছা", "• অ্যাপের ভিতরে «অ্যাকাউন্ট» পাতা থেকে «অ্যাকাউন্ট মুছে ফেলুন» চাপলে আপনার অ্যাকাউন্ট, প্রোফাইল, চাকরিপ্রার্থী আইডি, মেকার প্রোফাইল ও ক্লাউড ব্যাকআপ মুছে যায়।\n• আপনার আগে করা কমিউনিটি পোস্ট/মন্তব্য নিজে মুছতে পারবেন।\n• মেকার প্রোফাইল নিজে লুকাতে বা মুছে ফেলার আবেদন করতে পারবেন।\n• অ্যাপের অ্যাডমিনকে লিখেও তথ্য মোছার অনুরোধ করা যায়।"], ["শিশুদের তথ্য", "অ্যাপটি ১৩ বছরের কম বয়সীদের জন্য নয় এবং আমরা জেনেশুনে তাদের তথ্য নিই না।"], ["নিরাপত্তা ও মডারেশন", "ডেটা ইন্টারনেটে এনক্রিপ্টেড সংযোগে যায়। ভুয়া বা ক্ষতিকর কনটেন্ট রিপোর্ট করা যায় এবং অ্যাডমিন তা সরাতে বা অপব্যবহারকারীর আইডি বন্ধ করতে পারেন।"], ["দাবিত্যাগ", "এটি কোনো সরকারি অ্যাপ নয়। অ্যাপের তথ্য শেখার সহায়তা হিসেবে দেওয়া; সরকারি নিয়ম ও চাকরির বিজ্ঞাপনের সত্যতা আপনি নিজে যাচাই করুন।"], ["নীতি বদল ও যোগাযোগ", "নীতি বদলালে এখানে নতুন তারিখসহ জানানো হবে। প্রশ্ন বা তথ্য মোছার অনুরোধ: [আপনার ইমেইল এখানে লিখুন]। সর্বশেষ হালনাগাদ: ৪ নভেম্বর ২০২৬।"]];
function privacyHtml() { return PRIVACY.map(p => `<div class="cx"><b>${esc(p[0])}</b><div style="white-space:pre-line;margin-top:6px;font-size:14.5px;line-height:1.6">${esc(p[1])}</div></div>`).join(''); }
function privacyPage() { tab = 'profile'; render(pageHead('গোপনীয়তা নীতি') + '<div class="pad">' + privacyHtml() + '</div>'); }
(function () { const v0 = typeof viewsetPage === 'function' ? viewsetPage : null; if (v0) viewsetPage = function () { v0.apply(this, arguments); const e = document.getElementById('vs'); if (e) e.insertAdjacentHTML('beforeend', '<div class="box"><button class="btn sm" style="background:#475569" onclick="push(()=>viewsetPage());privacyPage()">🔒 গোপনীয়তা নীতি</button></div>'); }; })();


// =====================================================================
//  প্রশ্ন–উত্তর: এক চাপে ১–৫০০ (লিখিত ও MCQ), সুন্দর কার্ড হয়ে দেখায়
// =====================================================================
let _fqz = [];
const qzClean = s => String(s || '').replace(/^\s*[\d১-৯০]+\s*[\.\)\।:]\s*/, '').trim();
function qzParseW(text) {
  const t = qbNormText(text).trim(); if (!t) return [];
  if (/^[\[{]/.test(t)) { try { let j = JSON.parse(t); if (!Array.isArray(j)) j = j.questions || j.data || [j]; const o = []; j.forEach(x => { const q = qzClean(x.question || x.q), w = String(x.answer || x.w || x.a || '').trim(); if (q && w) o.push({q: q.slice(0, 300), w: w.slice(0, 2000)}); }); return o; } catch (e) {} }
  let s = t.replace(/\r/g, ''); const nums = (s.match(/^[\d১-৯০]+\s*[\.\)\।]/gm) || []).length;
  if (!/\n\s*\n/.test(s) && nums >= 2 && !/\|/.test(s)) s = s.replace(/\n(?=[\d১-৯০]+\s*[\.\)\।])/g, '\n\n');
  const out = [];
  s.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).forEach(b => {
    const L = b.split('\n').map(x => x.trim()).filter(Boolean);
    if (L.every(l => /[|｜]/.test(l))) { L.forEach(l => { const p = l.split(/[|｜]/).map(x => x.trim()); if (p[0] && p[1]) out.push({q: qzClean(p[0]).slice(0, 300), w: p.slice(1).join(' | ').slice(0, 2000)}); }); return; }
    const ai = L.findIndex((l, i) => i > 0 && /^(?:উত্তর|ans|answer)\s*[:：\-]/i.test(l));
    if (ai > 0) { out.push({q: qzClean(L.slice(0, ai).join(' ')).slice(0, 300), w: (L[ai].replace(/^[^:：\-]+[:：\-]\s*/, '') + (L.length > ai + 1 ? '\n' + L.slice(ai + 1).join('\n') : '')).slice(0, 2000)}); return; }
    if (L.length >= 2) out.push({q: qzClean(L[0]).slice(0, 300), w: L.slice(1).join('\n').slice(0, 2000)});
  });
  return out.filter(x => x.q && x.w);
}
function qzBox() {
  return `<div class="cx qzb"><b>❓ প্রশ্ন–উত্তর যোগ করুন</b><div class="hint">একসাথে ১, ২, ৫০ বা ৫০০ — যত খুশি পেস্ট করুন। অ্যাপে সুন্দর কার্ড হয়ে দেখাবে, উত্তরে চাপলে সঠিক/ভুল ও ব্যাখ্যা আসবে।</div>
    <div class="qzt"><button type="button" id="qzt_m" class="on" onclick="qzTab('m')">🔘 MCQ</button><button type="button" id="qzt_w" onclick="qzTab('w')">✍️ লিখিত</button></div>
    <div id="qz_m"><div class="hint"><b>এক লাইনে একটি:</b> প্রশ্ন | উত্তর১ | উত্তর২ | উত্তর৩ | উত্তর৪ | সঠিক নম্বর | ব্যাখ্যা<br><b>অথবা লাইন ভেঙে:</b> প্রশ্ন, ক) খ) গ) ঘ), "উত্তর: খ", "ব্যাখ্যা: ..."<br><b>অথবা JSON</b> (question, options, correct, explanation)।</div>
      <textarea class="inp" id="qz_mb" rows="9" placeholder="এখানে পেস্ট করুন — ১ থেকে ৫০০টি প্রশ্ন" oninput="qzCnt('m')"></textarea><div class="hint" id="qz_mc"></div><button type="button" class="btn" onclick="qzBulk('m')">➕ সবগুলো যোগ করুন</button>
      <details style="margin:8px 0"><summary><b>একটা একটা করে লিখতে চাইলে</b></summary><input class="inp" id="qb_mq" placeholder="প্রশ্ন"><input class="inp" id="qb_o1" placeholder="ক) উত্তর"><input class="inp" id="qb_o2" placeholder="খ) উত্তর"><input class="inp" id="qb_o3" placeholder="গ) উত্তর"><input class="inp" id="qb_o4" placeholder="ঘ) উত্তর"><select class="inp" id="qb_ok"><option value="0">সঠিক উত্তর: ক</option><option value="1">সঠিক উত্তর: খ</option><option value="2">সঠিক উত্তর: গ</option><option value="3">সঠিক উত্তর: ঘ</option></select><input class="inp" id="qb_ex" placeholder="ব্যাখ্যা (ঐচ্ছিক)"><button type="button" class="btn sm" onclick="qzAdd('mcq')">➕ একটি MCQ যোগ</button></details></div>
    <div id="qz_w" style="display:none"><div class="hint"><b>এক লাইনে একটি:</b> প্রশ্ন | উত্তর<br><b>অথবা:</b> প্রশ্ন (এক লাইন), তার নিচে উত্তর — প্রতিটির মাঝে ফাঁকা লাইন, বা "উত্তর: ..."</div>
      <textarea class="inp" id="qz_wb" rows="9" placeholder="এখানে পেস্ট করুন — ১ থেকে ৫০০টি প্রশ্ন–উত্তর" oninput="qzCnt('w')"></textarea><div class="hint" id="qz_wc"></div><button type="button" class="btn" onclick="qzBulk('w')">➕ সবগুলো যোগ করুন</button>
      <details style="margin:8px 0"><summary><b>একটা একটা করে লিখতে চাইলে</b></summary><input class="inp" id="qb_q" placeholder="প্রশ্ন"><textarea class="inp" id="qb_a" rows="2" placeholder="উত্তর"></textarea><button type="button" class="btn sm" onclick="qzAdd('qa')">➕ একটি যোগ</button></details></div>
    <div class="qzs"><span id="qz_n"></span><button type="button" class="btn sm" style="background:#475569" onclick="qzPreview()">👁️ কার্ড দেখুন</button><button type="button" class="btn sm" style="background:#b45309" onclick="qzManage()">🧩 সাজান / বদলান / মোছা</button><button type="button" class="btn sm" style="background:#b91c1c" onclick="qzClear()">🗑️ সব মুছুন</button></div><div id="qb_m" class="warn" style="display:none"></div></div>`;
}
function qbBox() { setTimeout(qzUpd, 0); return qzBox(); }
const qzMsg = t => { const m = document.getElementById('qb_m'); if (m) { m.style.display = 'block'; m.textContent = t; } };
function qzUpd() { const e = document.getElementById('qz_n'); if (e) e.textContent = _fqz.length ? `✅ এখন ${bn(_fqz.length)}টি প্রশ্ন আছে` : 'এখনো কোনো প্রশ্ন নেই'; }
function qzTab(k) { ['m', 'w'].forEach(x => { document.getElementById('qz_' + x).style.display = x === k ? 'block' : 'none'; document.getElementById('qzt_' + x).classList.toggle('on', x === k); }); }
function qzCnt(k) { const v = document.getElementById(k === 'm' ? 'qz_mb' : 'qz_wb').value, r = k === 'm' ? qbParse(v) : qzParseW(v), e = document.getElementById('qz_' + k + 'c'); if (e) e.textContent = v.trim() ? (r.length ? `✅ ${bn(r.length)}টি পাওয়া গেছে` : '⚠️ এখনো কিছু বোঝা যায়নি') : ''; }
const qzSize = () => JSON.stringify(_fqz).length;
function qzBulk(k) {
  const el = document.getElementById(k === 'm' ? 'qz_mb' : 'qz_wb'), r = k === 'm' ? qbParse(el.value) : qzParseW(el.value);
  if (!r.length) { const f = qbNormText(el.value).split('\n').filter(Boolean).slice(0, 3).join(' ⏎ ').slice(0, 140); return qzMsg('কোনো প্রশ্ন বোঝা যায়নি। প্রতিটি প্রশ্নের নিচে ক) খ) গ) ঘ) লাইন আর «উত্তর: খ» থাকতে হবে।' + (f ? ' অ্যাপ যা দেখেছে: ' + f : '')); } if (r.length > 500) return qzMsg('একবারে সর্বোচ্চ ৫০০টি দিন। বেশি হলে আবার পেস্ট করুন।');
  const keep = _fqz; _fqz = _fqz.concat(r); if (qzSize() > 850000) { _fqz = keep; return qzMsg('এই পাতায় আর জায়গা নেই। বাকিগুলো আলাদা অধ্যায়ে (প্রশ্নের পাতার «অধ্যায়» থেকে) দিন।'); }
  el.value = ''; qzCnt(k); qzUpd(); qzMsg(`✅ ${bn(r.length)}টি যোগ হয়েছে। মোট ${bn(_fqz.length)}টি।`);
}
function qzAdd(kind) {
  if (kind === 'qa') { const q = gv('qb_q'), a = gv('qb_a'); if (!q || !a) return qzMsg('প্রশ্ন ও উত্তর দুটোই লিখুন।'); _fqz.push({q: q.slice(0, 300), w: a.slice(0, 2000)}); ['qb_q', 'qb_a'].forEach(i => document.getElementById(i).value = ''); }
  else { const q = gv('qb_mq'), raw = [1, 2, 3, 4].map(i => gv('qb_o' + i)), k = +gv('qb_ok'); if (!q) return qzMsg('প্রশ্ন লিখুন।'); if (raw.filter(Boolean).length < 2) return qzMsg('কমপক্ষে দুটি উত্তর দিন।'); if (!raw[k]) return qzMsg('সঠিক উত্তরের ঘরটি ফাঁকা।'); const o = raw.filter(Boolean); _fqz.push({q: q.slice(0, 300), o, a: o.indexOf(raw[k]), e: gv('qb_ex').slice(0, 400)}); ['qb_mq', 'qb_o1', 'qb_o2', 'qb_o3', 'qb_o4', 'qb_ex'].forEach(i => document.getElementById(i).value = ''); }
  qzUpd(); qzMsg('✅ যোগ হয়েছে। মোট ' + bn(_fqz.length) + 'টি।');
}
function qzClear() { if (_fqz.length && confirm('সবগুলো প্রশ্ন মুছে যাবে। নিশ্চিত?')) { _fqz = []; qzUpd(); qzMsg('মুছে ফেলা হয়েছে।'); } }
function qzPreview() { showModal('<h3 style="margin:0 0 8px">👁️ অ্যাপে যেমন দেখাবে</h3>' + (_fqz.length ? qzHtml(_fqz, 'pv') : sEmpty('📭', 'এখনো কিছু নেই।'))); }
// ---- সাজান / বদলান / মোছা ----
let _qzE = -1, _qzP = 0;
function qzManage() {
  const per = 30, pages = Math.max(1, Math.ceil(_fqz.length / per)); _qzP = Math.min(_qzP, pages - 1);
  const rows = _fqz.slice(_qzP * per, _qzP * per + per).map((q, k) => { const i = _qzP * per + k;
    if (_qzE === i) return `<div class="blk" style="display:block"><b>${bn(i + 1)}. বদলান</b><textarea class="inp" id="qe_q" rows="2">${esc(q.q)}</textarea>${q.w !== undefined ? `<textarea class="inp" id="qe_w" rows="3">${esc(q.w)}</textarea>` : [0, 1, 2, 3].map(n => `<input class="inp" id="qe_o${n}" placeholder="উত্তর ${bn(n + 1)}" value="${esc(q.o[n] || '')}">`).join('') + `<select class="inp" id="qe_a">${[0, 1, 2, 3].map(n => `<option value="${n}" ${q.a === n ? 'selected' : ''}>সঠিক: ${bn(n + 1)} নম্বর</option>`).join('')}</select><input class="inp" id="qe_e" placeholder="ব্যাখ্যা" value="${esc(q.e || '')}">`}<button class="btn sm" onclick="qzEditOk(${i})">✔️ ঠিক</button></div>`;
    return `<div class="blk"><div class="blkt">${q.w !== undefined ? '✍️' : '🔘'} ${bn(i + 1)}. ${esc(q.q.slice(0, 50))}</div><div class="blkb"><button onclick="qzMv(${i},-1)">⬆️</button><button onclick="qzMv(${i},1)">⬇️</button><button onclick="_qzE=${i};qzManage()">✏️</button><button onclick="qzDel(${i})">🗑️</button></div></div>`; }).join('');
  showModal(`<h3 style="margin:0 0 8px">🧩 প্রশ্ন সাজান (${bn(_fqz.length)}টি)</h3>${rows || sEmpty('📭', 'এখনো কিছু নেই।')}${pages > 1 ? `<div style="display:flex;gap:8px;justify-content:center;margin:10px 0"><button class="btn sm" ${_qzP ? '' : 'disabled'} onclick="_qzP--;qzManage()">← আগে</button><span>${bn(_qzP + 1)}/${bn(pages)}</span><button class="btn sm" ${_qzP < pages - 1 ? '' : 'disabled'} onclick="_qzP++;qzManage()">পরে →</button></div>` : ''}<button class="btn" onclick="closeModal();qzUpd()">✔️ হয়েছে</button>`);
}
function qzMv(i, d) { const j = i + d; if (j < 0 || j >= _fqz.length) return; [_fqz[i], _fqz[j]] = [_fqz[j], _fqz[i]]; qzManage(); }
function qzDel(i) { _fqz.splice(i, 1); _qzE = -1; qzManage(); }
function qzEditOk(i) {
  const q = _fqz[i], t = gv('qe_q'); if (!t) return;
  if (q.w !== undefined) { const w = gv('qe_w'); if (!w) return alert('উত্তর লিখুন।'); q.q = t.slice(0, 300); q.w = w.slice(0, 2000); }
  else { const raw = [0, 1, 2, 3].map(n => gv('qe_o' + n)), a = +gv('qe_a'); if (!raw[a] || raw.filter(Boolean).length < 2) return alert('কমপক্ষে দুটি উত্তর দিন ও সঠিকটি ফাঁকা রাখবেন না।'); const o = raw.filter(Boolean); q.q = t.slice(0, 300); q.o = o; q.a = o.indexOf(raw[a]); q.e = gv('qe_e').slice(0, 400); }
  _qzE = -1; qzManage();
}
// ---- অ্যাপে দেখানো: সুন্দর কার্ড, উত্তরে চাপলে সঠিক/ভুল ----
const QZR = {};
function qzHtml(list, id) { QZR[id] = {list, p: 0}; return `<div class="qzwrap" id="qzw_${id}">${qzPageHtml(id)}</div>`; }
function qzPageHtml(id) {
  const R = QZR[id], per = 25, pages = Math.max(1, Math.ceil(R.list.length / per)); R.p = Math.min(R.p, pages - 1);
  const cards = R.list.slice(R.p * per, R.p * per + per).map((q, k) => { const i = R.p * per + k, t = `<div class="qzq">${bn(i + 1)}. ${esc(q.q)}</div>`;
    if (q.w !== undefined) return `<div class="qzk">${t}<button class="qzo" onclick="qzW('${id}',${i})">👁️ উত্তর দেখুন</button><div class="qzf qzc" id="qzf_${id}_${i}" style="display:none">${esc(q.w).replace(/\n/g, '<br>')}</div></div>`;
    return `<div class="qzk">${t}<div id="qzO_${id}_${i}">${q.o.map((o, j) => `<button class="qzo" onclick="qzPick('${id}',${i},${j})">${esc(o)}</button>`).join('')}</div><div class="qzf" id="qzf_${id}_${i}"></div></div>`; }).join('');
  const nav = pages > 1 ? `<div style="display:flex;gap:8px;align-items:center;justify-content:center;margin:12px 0"><button class="btn sm" ${R.p ? '' : 'disabled'} onclick="qzPg('${id}',-1)">← আগে</button><span>${bn(R.p + 1)} / ${bn(pages)}</span><button class="btn sm" ${R.p < pages - 1 ? '' : 'disabled'} onclick="qzPg('${id}',1)">পরে →</button></div>` : '';
  return `<div class="hint" style="margin:6px 0">মোট ${bn(R.list.length)}টি প্রশ্ন</div>${cards}${nav}`;
}
function qzPg(id, d) { QZR[id].p += d; const w = document.getElementById('qzw_' + id); w.innerHTML = qzPageHtml(id); w.scrollIntoView(); }
function qzW(id, i) { const e = document.getElementById('qzf_' + id + '_' + i); e.style.display = e.style.display === 'none' ? 'block' : 'none'; }
function qzPick(id, i, j) {
  const q = QZR[id].list[i], btns = document.querySelectorAll('#qzO_' + id + '_' + i + ' .qzo'), f = document.getElementById('qzf_' + id + '_' + i); if (f.className.includes('qzc') || f.className.includes('qzw')) return;
  btns.forEach(b => b.disabled = true); btns[q.a].classList.add('ok'); const ex = q.e ? `<div class="qze">💡 ${esc(q.e)}</div>` : '';
  if (j === q.a) f.className = 'qzf qzc', f.innerHTML = '✅ সঠিক উত্তর!' + ex; else { btns[j].classList.add('no'); f.className = 'qzf qzw'; f.innerHTML = '❌ ভুল। সঠিক উত্তর: ' + esc(q.o[q.a]) + ex; }
}
(function () { const st = document.createElement('style'); st.textContent = `
.qzt{display:flex;gap:8px;margin:8px 0}.qzt button{flex:1;border:2px solid #cbd5e1;background:#fff;border-radius:12px;padding:12px;font:inherit;font-weight:800}.qzt button.on{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
.qzs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}.qzs span{font-weight:700;flex:1 1 100%}
.qzk{background:var(--cd,#fff);border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 2px 6px rgba(0,0,0,.06)}.qzq{font-weight:800;font-size:17px;margin-bottom:12px;line-height:1.5}
.qzo{display:block;width:100%;background:#fff;color:#111;border:1px solid #e0e0e0;padding:12px 14px;text-align:left;border-radius:8px;margin-bottom:10px;font:inherit;font-size:15px}.qzo:active{background:#f8f9fa}
.qzo.ok{background:#d4edda!important;border-color:#c3e6cb!important}.qzo.no{background:#f8d7da!important;border-color:#f5c6cb!important}
.qzf{margin-top:10px;padding:12px;border-radius:8px;font-size:14.5px;line-height:1.6}.qzf:empty{display:none}.qzf.qzc{background:#f2f9f4;color:#1e7e34;border:1px solid #c3e6cb}.qzf.qzw{background:#fdf2f2;color:#c0392b;border:1px solid #f5c6cb}.qze{margin-top:6px;color:#444;font-size:13.5px}
`; document.head.appendChild(st); })();


// ---- অধ্যায়ে MCQ ও লিখিত দুটোই (বাল্ক ও একক) ----
function qbBulk() {
  showModal(`<h3 style="margin:0 0 6px">📥 বাল্ক পেস্ট</h3><div class="qzt"><button type="button" id="qbk_m" class="on" onclick="qbKind('m')">🔘 MCQ</button><button type="button" id="qbk_w" onclick="qbKind('w')">✍️ লিখিত</button></div>
    <div class="hint" id="qb_fmt"></div><textarea class="inp" id="qb_bulk" rows="12" placeholder="এখানে পেস্ট করুন — ১ থেকে ২০০০টি" oninput="qbPrev()"></textarea><div id="qb_prev" class="hint"></div><div id="qb_prog" style="display:none;height:12px;background:#e5e7eb;border-radius:8px;overflow:hidden"><div id="qb_bar" style="height:100%;width:0;background:#16a34a"></div></div><button class="btn" id="qb_go" onclick="qbBulkSave()">✅ সব সেভ করুন</button>`);
  window._qbK = 'm'; qbKind('m');
}
function qbKind(k) {
  window._qbK = k; ['m', 'w'].forEach(x => { const b = document.getElementById('qbk_' + x); if (b) b.classList.toggle('on', x === k); });
  const f = document.getElementById('qb_fmt'); if (f) f.innerHTML = k === 'm' ? '<b>এক লাইনে:</b> প্রশ্ন | উত্তর১ | উত্তর২ | উত্তর৩ | উত্তর৪ | সঠিক নম্বর | ব্যাখ্যা<br><b>লাইন ভেঙে:</b> প্রশ্ন, ক) খ) গ) ঘ), "উত্তর: খ", "ব্যাখ্যা: ..."<br><b>JSON:</b> question, options, correct, explanation' : '<b>এক লাইনে:</b> প্রশ্ন | উত্তর<br><b>অথবা:</b> প্রশ্ন, তার নিচে উত্তর — প্রতিটির মাঝে ফাঁকা লাইন বা "উত্তর: ..."';
  qbPrev();
}
const qbRows = () => (window._qbK === 'w' ? qzParseW : qbParse)(gv('qb_bulk'));
function qbPrev() { const r = qbRows(); const e = document.getElementById('qb_prev'); if (e) e.textContent = r.length ? `✅ ${bn(r.length)}টি প্রশ্ন পাওয়া গেছে।` : (gv('qb_bulk') ? 'এখনো কোনো প্রশ্ন বোঝা যায়নি।' : ''); }
async function qbBulkSave() {
  let rows = qbRows(); if (!rows.length) return alert('কোনো প্রশ্ন বোঝা যায়নি।'); if (rows.length > 3000) return alert('একবারে সর্বোচ্চ ৩০০০টি দিন।');
  const have = new Set(QBS.items.map(x => x.q)); const before = rows.length; rows = rows.filter(r => !have.has(r.q)); const dup = before - rows.length; if (!rows.length) return alert('সবগুলোই আগে থেকে আছে।');
  const m = await sme(); if (!m) return alert('অ্যাডমিন লগইন দরকার।'); const F = m.f.F; const btn = document.getElementById('qb_go'); btn.disabled = true; document.getElementById('qb_prog').style.display = 'block';
  let idx = Object.keys(QBS.docs).length, done = 0;
  try {
    for (let s = 0; s < rows.length; s += 100) {
      const part = rows.slice(s, s + 100); const r = await F.addDoc(F.collection(m.f.db, 'qsets'), {bank: QBS.bank, ch: QBS.ch, i: idx++, qs: part, at: Date.now()});
      QBS.docs[r.id] = part.map(qbNorm); done += part.length; document.getElementById('qb_bar').style.width = Math.round(done / rows.length * 100) + '%'; btn.textContent = `⏳ ${bn(done)} / ${bn(rows.length)}`;
    }
    await qbCount(m); qbReindex(); closeModal(); qbList(); alert(`✅ ${bn(done)}টি প্রশ্ন যোগ হয়েছে।${dup ? ' ' + bn(dup) + 'টি আগে থেকেই ছিল, বাদ গেছে।' : ''}`);
  } catch (e) { qbReindex(); qbList(); alert(`⚠️ ${bn(done)}টি সেভ হয়েছে, বাকিগুলো হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।`); }
}
function qbEdit(gi) { const x = QBS.items[gi]; return x && x.w !== undefined ? qbFormW(gi) : qbForm(gi); }
function qbFormW(gi) {
  const x = gi >= 0 ? QBS.items[gi] : {q: '', w: ''};
  showModal(`<h3 style="margin:0 0 8px">${gi >= 0 ? '✏️ লিখিত প্রশ্ন বদলান' : '➕ নতুন লিখিত প্রশ্ন'}</h3><textarea class="inp" id="qf_q" rows="3" placeholder="প্রশ্ন">${esc(x.q)}</textarea><textarea class="inp" id="qf_w" rows="6" placeholder="উত্তর">${esc(x.w || '')}</textarea><button class="btn" onclick="qbFormWSave(${gi})">💾 সেভ</button>`);
}
async function qbFormWSave(gi) {
  const q = gv('qf_q'), w = gv('qf_w'); if (!q || !w) return alert('প্রশ্ন ও উত্তর দুটোই লিখুন।'); const it = {q: q.slice(0, 300), w: w.slice(0, 2000)};
  const m = await sme(); if (!m) return; const F = m.f.F;
  try {
    if (gi >= 0) { const x = QBS.items[gi], arr = QBS.docs[x._d]; arr[x._k] = Object.assign(arr[x._k], it); await qbSaveDoc(m, x._d); }
    else { const ids = Object.keys(QBS.docs); let did = ids.find(d => QBS.docs[d].length < 100);
      if (did) { QBS.docs[did].push(qbNorm(it)); await qbSaveDoc(m, did); } else { const r = await F.addDoc(F.collection(m.f.db, 'qsets'), {bank: QBS.bank, ch: QBS.ch, i: ids.length, qs: [it], at: Date.now()}); QBS.docs[r.id] = [qbNorm(it)]; } await qbCount(m); }
    closeModal(); qbReindex(); qbList();
  } catch (e) { alert('সেভ হয়নি।'); }
}
// পুরোনো পাতাগুলোকে অধ্যায়-ব্যবস্থায় যুক্ত করা
function step4Init() {
  const qa0 = qaPage; qaPage = function (id) { qa0.apply(this, arguments); if (QB_T[id]) { const l = document.querySelector('#app .list'); if (l) l.insertAdjacentHTML('afterbegin', `<div class="nk" style="border-left-color:#7c3aed" onclick="push(()=>qaPage('${id}'));qbHome('${id}')"><span class="nki" style="background:#7c3aed22">📝</span><div class="nkt"><b>অধ্যায় ধরে আরও প্রশ্ন (MCQ ও লিখিত)</b><small>সার্চ, টেস্ট, লম্বা কুইজ</small></div><span class="nka">›</span></div>`); } };
  const st0 = studyPage; studyPage = function () { st0.apply(this, arguments); const c = document.querySelector('#app .chips'); if (c && QB_T['st_' + sSub]) c.insertAdjacentHTML('afterend', `<div class="nk" style="border-left-color:#7c3aed" onclick="push(()=>studyPage('${sSub}'));qbHome('st_${sSub}')"><span class="nki" style="background:#7c3aed22">📝</span><div class="nkt"><b>অধ্যায় ধরে প্রশ্ন (MCQ ও লিখিত)</b><small>${(STUDY_LABELS[sSub] || '')} — প্রশ্ন, টেস্ট ও লম্বা কুইজ</small></div><span class="nka">›</span></div>`); };
}

// =====================================================================
//  ধাপ ৫: চাকরির প্রস্তুতি — বিষয়ের ভিতরে ইন্টারফেস (বাংলা, ইংরেজি, অঙ্ক, সাধারণ জ্ঞান)
//  প্রতিটি ইন্টারফেসে: অধ্যায় ধরে MCQ ও লিখিত (এক চাপে পেস্ট) + পড়ার লেখা/পাতা। «বইঘর»-এ PDF লিংক, রচনা, ভিডিও/অডিও।
// =====================================================================
const HUB_SUBS = ['bangla', 'english', 'math', 'gk', 'drvjob'];
const HUB_DEF = {
  bangla: [['byakoron', 'ব্যাকরণ', '📘'], ['sondhi', 'সন্ধি', '🔗'], ['ekkothay', 'এক কথায় প্রকাশ', '💬'], ['bagdhara', 'বাগধারা', '🗣️'], ['banan', 'বানান শুদ্ধি', '✅'], ['biporit', 'বিপরীত শব্দ', '↔️'], ['somarth', 'সমার্থক শব্দ', '🟰'], ['boighor', 'বইঘর', '📚', 'books'], ['old', 'পুরোনো নোট', '🗂️', 'old', 1]],
  english: [['grammar', 'গ্রামার (Grammar)', '📘'], ['vocab', 'ভোকাবুলারি', '🔤'], ['synonym', 'Synonyms', '🟰'], ['antonym', 'Antonyms', '↔️'], ['verbs', 'Right Form of Verbs', '✅'], ['idioms', 'Idioms & Phrases', '🗣️'], ['translation', 'অনুবাদ', '🔁'], ['boighor', 'বইঘর', '📚', 'books'], ['old', 'পুরোনো নোট', '🗂️', 'old', 1]],
  math: [['arith', 'পাটিগণিত', '➕'], ['algebra', 'বীজগণিত', '🔣'], ['geometry', 'জ্যামিতি', '📐'], ['ratio', 'অনুপাত ও শতকরা', '📊'], ['area', 'ক্ষেত্রফল ও আয়তন', '📏'], ['mental', 'মানসিক দক্ষতা', '🧠'], ['boighor', 'বইঘর', '📚', 'books'], ['old', 'পুরোনো নোট', '🗂️', 'old', 1]],
  drvjob: [['wr_bn', 'লিখিত — বাংলা', '📝'], ['wr_en', 'লিখিত — ইংরেজি', '🔤'], ['wr_math', 'লিখিত — গণিত', '🧮'], ['tech', 'টেকনিক্যাল (গাড়ির যন্ত্র ও কাজ)', '🔧'], ['traffic', 'ট্রাফিক আইন ও সাইন', '🚦'], ['gk', 'সাধারণ জ্ঞান', '🌍'], ['mcq', 'মডেল MCQ টেস্ট', '🔘'], ['past', 'পুরোনো প্রশ্ন (সাল ধরে)', '📜'], ['guide', 'ব্যবহারিক ও মৌখিক গাইড', '🏁', 'guide']],
  gk: [['bd', 'বাংলাদেশ বিষয়াবলি', '🇧🇩'], ['intl', 'আন্তর্জাতিক বিষয়াবলি', '🌍'], ['sci', 'বিজ্ঞান ও প্রযুক্তি', '🔬'], ['geo', 'ভূগোল ও পরিবেশ', '🗺️'], ['hist', 'ইতিহাস ও ঐতিহ্য', '🏛️'], ['current', 'চলতি ঘটনা', '📰'], ['boighor', 'বইঘর', '📚', 'books'], ['old', 'পুরোনো নোট', '🗂️', 'old', 1]]
};
function hubList(sub) {
  const c = APPCFG().hubs;
  if (c && Array.isArray(c[sub]) && c[sub].length) return c[sub].map(x => Object.assign({}, x));
  return (HUB_DEF[sub] || []).map(a => ({id: a[0], n: a[1], ic: a[2], k: a[3] || '', h: !!a[4]}));
}
const hubItem = (sub, id) => hubList(sub).find(x => x.id === id);
async function hubSave(sub, list) {
  const cur = APPCFG().hubs || {}; const o = {}; Object.keys(cur).forEach(k => { if (Array.isArray(cur[k])) o[k] = cur[k]; }); o[sub] = list;
  if (await pdfSaveCfg({hubs: o})) { closeModal(); hubBack(sub); }
}
const hubBack = sub => sub === 'drvjob' ? govHome() : studyPage(sub);
function hubGo(sub, id) { push(() => hubBack(sub)); hubIf(sub, id); }
function hubIf(sub, id) {
  tab = 'study'; const it = hubItem(sub, id); if (!it) return hubBack(sub);
  const key = 'hub_' + sub + '_' + id, bank = 'hf_' + sub + '_' + id, adm = qbAdm();
  if (it.k === 'old') { sSub = sub; sQ = ''; return render(pageHead((STUDY_LABELS[sub] || '') + ' — ' + it.n) + '<div class="pad"><div id="sbody">' + studyBody() + '</div></div>'); }
  QB_T[bank] = it.ic + ' ' + it.n + ' — প্রশ্ন';
  const gd = it.k === 'guide' ? DRV_GUIDE.map(g => `<div class="cx"><b>${esc(g[0])}</b><div style="margin-top:6px;line-height:1.7">${esc(g[1])}</div></div>`).join('') : '';
  const qcard = it.k === 'guide' ? gd : it.k === 'books' ? `<div class="hint" style="margin:6px 0 10px">📚 এখানে বই, PDF লিংক, রচনা, পত্রিকার লেখা, ভিডিও ও অডিও থাকবে।</div>` :
    `<div class="nk" style="border-left-color:#7c3aed" onclick="push(()=>hubIf('${sub}','${id}'));qbHome('${bank}')"><span class="nki" style="background:#7c3aed22">📝</span><div class="nkt"><b>প্রশ্ন ও টেস্ট (MCQ ও লিখিত)</b><small>অধ্যায় ধরে • সার্চ • র‍্যান্ডম টেস্ট • লম্বা কুইজ</small></div><span class="nka">›</span></div><div class="hint" style="margin:6px 0">📖 পড়ার লেখা ও অধ্যায়</div>`;
  render(pageHead(it.n) + `<div class="pad" id="hubif">${qcard}</div>`);
  injectKids(key);
  const k = document.getElementById('kids'), p = document.getElementById('hubif'); if (k && p) { k.style.padding = '0'; p.appendChild(k); }
  if (p && !nodeKids(key).length && !adm) p.insertAdjacentHTML('beforeend', sEmpty('📭', 'এখনো কিছু যোগ হয়নি।'));
}
function hubTiles(sub) {
  const adm = qbAdm(), list = hubList(sub).filter(x => adm || !x.h);
  return `<div class="hubg">${list.map(it => `<div class="hubt ${it.h ? 'hubh' : ''}" onclick="hubGo('${sub}','${esc(it.id)}')"><i>${esc(it.ic)}</i>${esc(it.n)}${it.h ? '<small style="display:block;font-weight:400;font-size:11px">🙈 লুকানো</small>' : ''}${adm ? `<span class="hube" onclick="event.stopPropagation();hubEdit('${sub}','${esc(it.id)}')">✏️</span>` : ''}</div>`).join('')}${list.length ? '' : sEmpty('📭', 'কিছু নেই।')}</div>` +
    (adm ? `<div class="adbar"><span>🛡️ অ্যাডমিন</span><button onclick="hubEdit('${sub}','')">➕ নতুন ইন্টারফেস</button><button style="background:#64748b" onclick="hubReset('${sub}')">↩️ আগের তালিকা</button>${sub === 'drvjob' ? `<button style="background:#7c3aed" onclick="seedImportAll()">📥 নমুনা প্রশ্ন এডিটযোগ্য করুন</button>` : ''}</div>` : '');
}
function hubRender() {
  const s = document.getElementById('sbody'); if (!s) return;
  const q = document.getElementById('sq'); if (q) q.remove();
  document.querySelectorAll('#app .chips + .nk').forEach(e => e.remove());
  s.innerHTML = hubTiles(sSub);
}
function hubEdit(sub, id) {
  const it = id ? hubItem(sub, id) : null;
  showModal(`<h3 style="margin:0 0 8px">${it ? '✏️ ইন্টারফেস বদলান' : '➕ নতুন ইন্টারফেস'}</h3>
    <input class="inp" id="hb_n" placeholder="নাম (যেমন: কারক)" value="${esc(it ? it.n : '')}"><input class="inp" id="hb_i" placeholder="আইকন (একটি ইমোজি, যেমন 📘)" value="${esc(it ? it.ic : '📘')}">
    <button class="btn" style="width:100%" onclick="hubDo('${sub}','${esc(id)}','save')">💾 সেভ করুন</button>
    ${it ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button class="nbtn" style="background:#0369a1" onclick="hubDo('${sub}','${esc(id)}','up')">⬆️ আগে</button><button class="nbtn" style="background:#0369a1" onclick="hubDo('${sub}','${esc(id)}','dn')">⬇️ পরে</button><button class="nbtn" style="background:#64748b" onclick="hubDo('${sub}','${esc(id)}','hide')">${it.h ? '👁️ দেখান' : '🙈 লুকান'}</button><button class="nbtn" style="background:#b91c1c" onclick="hubDo('${sub}','${esc(id)}','del')">🗑️ মুছুন</button></div>` : ''}
    <button class="btn sm" style="margin-top:10px;background:#94a3b8" onclick="closeModal()">বন্ধ</button>`);
}
function hubDo(sub, id, act) {
  const list = hubList(sub), i = list.findIndex(x => x.id === id);
  if (act === 'save') {
    const n = gv('hb_n'); if (!n) return alert('নাম লিখুন।'); const ic = gv('hb_i') || '📘';
    if (i >= 0) { list[i].n = n.slice(0, 40); list[i].ic = ic.slice(0, 4); } else { const nid = 'x' + Date.now().toString(36); const bi = list.findIndex(x => x.k === 'books'); const row = {id: nid, n: n.slice(0, 40), ic: ic.slice(0, 4), k: '', h: false}; if (bi >= 0) list.splice(bi, 0, row); else list.push(row); }
  } else if (i < 0) return;
  else if (act === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
  else if (act === 'dn' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
  else if (act === 'hide') list[i].h = !list[i].h;
  else if (act === 'del') { if (!confirm('এই ইন্টারফেস তালিকা থেকে সরবে। ভিতরের প্রশ্ন ও লেখা ডেটাবেসে থেকে যাবে। নিশ্চিত?')) return; list.splice(i, 1); }
  hubSave(sub, list);
}
async function hubReset(sub) {
  if (!confirm('এই বিষয়ের তালিকা আগের ডিফল্ট অবস্থায় ফিরবে। নিশ্চিত?')) return;
  const cur = APPCFG().hubs || {}; const o = {}; Object.keys(cur).forEach(k => { if (k !== sub && Array.isArray(cur[k])) o[k] = cur[k]; });
  if (await pdfSaveCfg({hubs: Object.keys(o).length ? o : null})) hubBack(sub);
}
(function () { const st = document.createElement('style'); st.textContent = `.hubg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}.hubt{position:relative;background:var(--cd,#fff);border:1px solid rgba(0,0,0,.07);border-radius:16px;padding:12px 4px 10px;text-align:center;font-size:13.5px;font-weight:700;line-height:1.3;box-shadow:0 2px 8px rgba(0,0,0,.07);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:98px}.hubt:active{transform:scale(.97)}.hubt i{font-style:normal;font-size:26px;width:48px;height:48px;border-radius:15px;background:var(--tint);display:flex;align-items:center;justify-content:center;margin-bottom:6px}.hubh{opacity:.55;border-style:dashed}.hube{position:absolute;top:2px;right:4px;font-size:13px;padding:2px}body.dark .hubt{background:#1f2937;border-color:#374151}`; document.head.appendChild(st); })();
function step5Init() {
  const st1 = studyPage; studyPage = function () { st1.apply(this, arguments); if (HUB_SUBS.includes(sSub) && sSub !== 'drvjob') hubRender(); };
  const rk0 = reopenKey; reopenKey = function (k) { if (String(k).indexOf('hub_') === 0) { const m = String(k).match(/^hub_([a-z]+)_(.+)$/); if (m) return hubIf(m[1], m[2]); } return rk0.apply(this, arguments); };
  const kn0 = keyName; keyName = function (k) { if (String(k).indexOf('hub_') === 0) { const m = String(k).match(/^hub_([a-z]+)_(.+)$/); if (m) { const it = hubItem(m[1], m[2]); return (STUDY_LABELS[m[1]] || (m[1] === 'drvjob' ? '🚘 ড্রাইভার নিয়োগ' : m[1])) + ' › ' + (it ? it.n : m[2]); } } return kn0.apply(this, arguments); };
  const po0 = parentOpts; parentOpts = function (sel, selfId) {
    let h = po0.apply(this, arguments); let g = '<optgroup label="চাকরির প্রস্তুতি — বিষয়ের ইন্টারফেস">';
    HUB_SUBS.forEach(sub => hubList(sub).forEach(it => { const k = 'hub_' + sub + '_' + it.id; g += `<option value="${esc(k)}" ${sel === k ? 'selected' : ''}>${esc(keyName(k))}</option>`; }));
    return h + g + '</optgroup>';
  };
  const rb0 = rebuildStack; rebuildStack = function (key) {
    rb0.apply(this, arguments); const root = stack.length > 1 ? null : null; let k = key; while (String(k).indexOf('n_') === 0) { const n = ADMIN_CONTENT.find(c => c.id === k.slice(2)); if (!n) break; k = n.parent; }
    const m = String(k).match(/^hub_([a-z]+)_/); if (m) stack.splice(1, 0, () => hubBack(m[1]));
  };
  // ড্রাইভার নিয়োগ পরীক্ষার নমুনা প্রশ্ন (অ্যাপের নিজের) — অ্যাডমিন চাইলে এডিটযোগ্য কপি করে নিতে পারেন
  const qb0 = qbBuiltin; qbBuiltin = function (bank) {
    const m = /^hf_drvjob_(.+)$/.exec(bank);
    if (m) { if ((APPCFG().seedHide || []).includes(bank)) return []; return (DRV_SEED[m[1]] || []).map(qbNorm); }
    return qb0.apply(this, arguments);
  };
  const ql0 = qbList; qbList = function () {
    ql0.apply(this, arguments);
    if (qbAdm() && QBS.ch === 'built' && /^hf_drvjob_/.test(QBS.bank)) { const c = document.querySelector('#app .pad .cx'); if (c) c.insertAdjacentHTML('afterend', `<div class="adbar">🛠️ অ্যাডমিন <button onclick="seedImportOne('${QBS.bank}')">📥 এগুলো এডিটযোগ্য করে নিন</button></div><div class="hint" style="margin:0 0 8px">এডিটযোগ্য করলে প্রশ্নগুলো আপনার অধ্যায়ে কপি হবে। তারপর বদলানো, মোছা ও নতুন যোগ করা যাবে।</div>`); }
  };
  const gh0 = govHome; govHome = function () {
    gh0.apply(this, arguments); const p = document.querySelector('#app .pad'); if (!p) return;
    p.insertAdjacentHTML('afterbegin', `<div class="cx" style="margin-bottom:12px"><b>🚘 ড্রাইভার নিয়োগ পরীক্ষা</b><div class="hint">সরকারি ড্রাইভার পদের লিখিত ও MCQ প্রস্তুতি। প্রতিটিতে নমুনা প্রশ্ন, সার্চ ও টেস্ট আছে।</div>${hubTiles('drvjob')}</div><div class="hint" style="margin:4px 0 8px"><b>🏛️ অন্যান্য সরকারি চাকরির বিষয়</b></div>`);
  };
}
async function seedImportOne(bank, silent) {
  const m = await sme(); if (!m) return false; const F = m.f.F, id = bank.replace(/^hf_drvjob_/, ''), items = (DRV_SEED[id] || []).map(qbNorm);
  if (!items.length) return true; const it = hubItem('drvjob', id), title = (it ? it.n : id) + ' (নমুনা)';
  if (!silent && !confirm('এই ' + bn(items.length) + 'টি প্রশ্ন আপনার অধ্যায়ে কপি হবে। চালিয়ে যাবেন?')) return false;
  try {
    const r = await F.addDoc(F.collection(m.f.db, 'content'), {type: 'qch', bank, title, ord: 0, n: items.length, pub: true, by: m.u.uid, createdAt: F.serverTimestamp()});
    for (let s = 0, i = 0; s < items.length; s += 100, i++) await F.addDoc(F.collection(m.f.db, 'qsets'), {bank, ch: r.id, i, qs: qbClean(items.slice(s, s + 100)), at: Date.now()});
    if (!silent) { const hide = (APPCFG().seedHide || []).concat([bank]); if (await pdfSaveCfg({seedHide: hide})) { await refreshContent(); alert('✅ হয়েছে। এখন অধ্যায়ের তালিকায় «' + title + '» পাবেন।'); qbHome(bank); } }
    return true;
  } catch (e) { alert('সেভ হয়নি। ইন্টারনেট ও অ্যাডমিন লগইন দেখুন।'); return false; }
}
async function seedImportAll() {
  const banks = hubList('drvjob').filter(x => (DRV_SEED[x.id] || []).length && !(APPCFG().seedHide || []).includes('hf_drvjob_' + x.id));
  if (!banks.length) return alert('সব নমুনা আগেই এডিটযোগ্য করা হয়েছে।');
  if (!confirm(bn(banks.length) + 'টি ইন্টারফেসের নমুনা প্রশ্ন আপনার অধ্যায়ে কপি হবে। চালিয়ে যাবেন?')) return;
  const done = [];
  for (const x of banks) { const b = 'hf_drvjob_' + x.id; if (await seedImportOne(b, true)) done.push(b); else break; }
  if (done.length) { await pdfSaveCfg({seedHide: (APPCFG().seedHide || []).concat(done)}); await refreshContent(); }
  alert('✅ ' + bn(done.length) + 'টি ইন্টারফেসের প্রশ্ন এডিটযোগ্য হয়েছে।'); govHome();
}

// ---------- ইউজার ভিউ (অ্যাডমিন সাধারণ ইউজারের চোখে দেখতে পারেন) ----------
function uvToggle() { try { uvOn() ? sessionStorage.removeItem('uv') : sessionStorage.setItem('uv', '1'); } catch (e) {} location.reload(); }
function uvBar() {
  let b = document.getElementById('uvbar');
  if (!realAdmin()) { if (b) b.remove(); document.body.classList.remove('uvon'); return; }
  if (!b) { b = document.createElement('div'); b.id = 'uvbar'; document.body.appendChild(b); }
  const on = uvOn(); document.body.classList.toggle('uvon', on);
  const cn = on ? 'uv-top' : 'uv-pill'; if (b.className === cn && b.firstChild) return;
  b.className = cn;
  b.innerHTML = on ? `<span>👁️ ইউজার ভিউ: সাধারণ ইউজার যেভাবে দেখে</span><button onclick="uvToggle()">🛡️ অ্যাডমিনে ফিরুন</button>` : `<button onclick="uvToggle()">👁️ ইউজার ভিউ</button>`;
}
(function () {
  const st = document.createElement('style');
  st.textContent = `#uvbar.uv-pill{position:fixed;left:10px;bottom:12px;z-index:9990}#uvbar.uv-pill button{background:#334155;color:#fff;border:0;border-radius:20px;padding:8px 14px;font:700 13px inherit;font-family:inherit;box-shadow:0 2px 10px rgba(0,0,0,.35);opacity:.92}#uvbar.uv-top{position:fixed;top:0;left:0;right:0;z-index:9990;background:#0f766e;color:#fff;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:6px 10px;font-size:12.5px;font-weight:700}#uvbar.uv-top button{background:#fff;color:#0f766e;border:0;border-radius:14px;padding:5px 10px;font:700 12px inherit;font-family:inherit}body.uvon{padding-top:34px}`;
  document.head.appendChild(st); setInterval(uvBar, 1500); setTimeout(uvBar, 300);
})();

// =====================================================================
//  ড্রাইভার লগ বুক — যাত্রার খাতা, লেটারহেড, A4 শিট, PDF / Excel / প্রিন্ট
//  তথ্য ফোনেই থাকে (অফলাইনে চলে), লগইন করলে ব্যাকআপে ক্লাউডেও যায় (চাবি: lbook)।
// =====================================================================
const LB_MN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const LB_MS = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const LB_PUR = ['অফিস', 'এয়ারপোর্ট', 'ব্যক্তিগত', 'অন্যান্য'], LB_CON = ['ভালো', 'সমস্যা', 'মেরামত দরকার'];
const LB_PAL = {
  blue: {p: '#12307A', a: '#FFD21F', oa: '#2A2200', ln: '#cdd5e8', tint: '#f4f7fd', mut: '#55607a', tx: '#1b2540', c1: '#C62828', c2: '#6A2C9A', c3: '#1E7B2E'},
  green: {p: '#005F49', a: '#FFD21F', oa: '#2A2200', ln: '#cfe0d8', tint: '#f1f7f4', mut: '#4f6a60', tx: '#12231c', c1: '#C2410C', c2: '#0E7490', c3: '#4D7C0F'},
  mono: {p: '#1a1a1a', a: '#c8c8c8', oa: '#111111', ln: '#b5b5b5', tint: '#f2f2f2', mut: '#555555', tx: '#111111', c1: '#444444', c2: '#666666', c3: '#555555'}
};
const lbBn = s => String(s).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const lbNum = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/,/g, '')); return isNaN(n) ? 0 : n; };
const lbM = n => lbBn((Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', {maximumFractionDigits: 2}));
const lbIso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const lbDt = iso => { const a = String(iso || '').split('-'); return a.length === 3 ? lbBn(+a[2]) + ' ' + LB_MS[+a[1] - 1] : ''; };
const lbDtL = iso => { const a = String(iso || '').split('-'); return a.length === 3 ? lbBn(+a[2]) + ' ' + LB_MN[+a[1] - 1] + ' ' + lbBn(a[0]) : ''; };
const lbTm = t => t ? lbBn(t) : '';
function lbLoad() {
  let d = null; try { d = JSON.parse(localStorage.getItem('lbook') || 'null'); } catch (e) {} d = d || {}; const n = new Date();
  d.co = Object.assign({name: '', tag: '', addr: '', phone: '', email: '', web: '', lic: '', logo: ''}, d.co || {});
  d.info = Object.assign({driver: '', mobile: '', car: '', plate: ''}, d.info || {}); d.rows = d.rows || []; d.cond = d.cond || 'good'; d.note = d.note || '';
  d.sig = Object.assign({d: '', o: '', dd: '', od: ''}, d.sig || {}); d.style = d.style || 'blue';
  d.xl = Object.assign({mode: 'width', scale: 100, zoom: 100, orient: 'l'}, d.xl || {});
  d.per = Object.assign({t: 'month', y: n.getFullYear(), m: n.getMonth(), d: lbIso(n), from: n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-01', to: lbIso(n)}, d.per || {});
  return d;
}
let LB = lbLoad(), LBF = null, LBE = false;
function lbSave() { try { localStorage.setItem('lbook', JSON.stringify(LB)); } catch (e) { alert('ফোনে জায়গা কম। লোগো সরিয়ে আবার চেষ্টা করুন।'); } }
function lbSet(path, v) { const a = path.split('.'); let o = LB; for (let i = 0; i < a.length - 1; i++) o = o[a[i]]; o[a[a.length - 1]] = v; lbSave(); }
function lbForm0() { return {id: '', date: lbIso(new Date()), st: '', en: '', from: '', to: '', km: '', odo: '', fuel: '', toll: '', oth: '', pur: 'অফিস', cond: 'ভালো', note: ''}; }
function lbRange() {
  const p = LB.per; if (p.t === 'day') return [p.d, p.d]; if (p.t === 'year') return [p.y + '-01-01', p.y + '-12-31'];
  if (p.t === 'range') return p.from <= p.to ? [p.from, p.to] : [p.to, p.from];
  const m = String(p.m + 1).padStart(2, '0'); return [`${p.y}-${m}-01`, `${p.y}-${m}-${String(new Date(p.y, p.m + 1, 0).getDate()).padStart(2, '0')}`];
}
function lbRows() { const r = lbRange(); return LB.rows.filter(x => x.date && x.date >= r[0] && x.date <= r[1]).sort((a, b) => (a.date + (a.st || '') + a.id).localeCompare(b.date + (b.st || '') + b.id)); }
function lbLabel() {
  const p = LB.per; if (p.t === 'day') return lbDtL(p.d); if (p.t === 'year') return lbBn(p.y) + ' সাল';
  if (p.t === 'range') { const r = lbRange(); return lbDtL(r[0]) + ' থেকে ' + lbDtL(r[1]); } return LB_MN[p.m] + ' ' + lbBn(p.y);
}
function lbFile() { const r = lbRange(); return 'log-book-' + (LB.per.t === 'month' ? r[0].slice(0, 7) : LB.per.t === 'year' ? String(LB.per.y) : r[0] + '_' + r[1]); }
function lbTot(rows) { const s = k => rows.reduce((a, x) => a + lbNum(x[k]), 0), t = {n: rows.length, km: s('km'), fuel: s('fuel'), toll: s('toll'), oth: s('oth')}; t.all = t.fuel + t.toll + t.oth; return t; }

// ---------- পাতা ----------
function logbookPage() { tab = 'home'; LB = lbLoad(); if (!LBF) LBF = lbForm0(); lbRender(); }
function lbRender() { render(lbHtml()); lbPrev(); }
function lbRefresh() { const y = window.scrollY; render(lbHtml()); window.scrollTo(0, y); lbPrev(); }
const lbOpt = (list, v) => list.map(x => `<option value="${esc(x[0])}" ${String(x[0]) === String(v) ? 'selected' : ''}>${esc(x[1])}</option>`).join('');
const lbIn = (lab, id, v, ph, type, ev) => `<div class="lb-f"><label>${lab}</label><input type="${type || 'text'}" ${type === 'number' ? 'inputmode="decimal"' : ''} value="${esc(v)}" placeholder="${esc(ph || '')}" oninput="${ev}"></div>`;
function lbHtml() {
  const c = LB.co, i = LB.info, rows = lbRows(), t = lbTot(rows), F = LBF, p = LB.per, yr = new Date().getFullYear();
  const years = []; for (let y = yr - 3; y <= yr + 1; y++) years.push([y, lbBn(y)]);
  const meta = [c.addr && '📍 ' + c.addr, c.phone && '📞 ' + c.phone, c.email && '✉️ ' + c.email, c.web && '🌐 ' + c.web, c.lic && '🪪 ট্রেড লাইসেন্স: ' + c.lic].filter(Boolean);
  const hasCo = c.name || c.addr || c.phone || c.logo;
  const lh = `<div class="lb-lh"><div class="lb-bar"></div><div class="lb-lhin"><div class="lb-top"><div class="lb-logo">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : '🏢'}</div><div style="flex:1;min-width:0"><div class="lb-cn">${esc(c.name) || '<span class="hint">কোম্পানির নাম লিখুন</span>'}</div>${c.tag ? `<div class="hint">${esc(c.tag)}</div>` : ''}</div></div>
    ${meta.length ? `<div class="lb-meta">${meta.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
    <div style="text-align:right;margin-top:6px"><button class="btn sm" style="background:#475569" onclick="LBE=!LBE;lbRefresh()">${LBE ? '✔️ সম্পন্ন' : '✏️ কোম্পানির তথ্য ' + (hasCo ? 'বদলান' : 'দিন (ঐচ্ছিক)')}</button></div></div></div>` +
    (LBE ? `<div class="cx"><b>কোম্পানির তথ্য</b><div class="hint">ফাঁকা রাখলে শিটে ওই অংশ আসবে না।</div>${lbIn('কোম্পানির নাম', '', c.name, 'যেমন: ঢাকা রাইড সার্ভিস লি.', 'text', "lbSet('co.name',this.value)")}${lbIn('স্লোগান', '', c.tag, 'ঐচ্ছিক', 'text', "lbSet('co.tag',this.value)")}${lbIn('ঠিকানা', '', c.addr, 'বাড়ি, রোড, এলাকা', 'text', "lbSet('co.addr',this.value)")}
      <div class="lb-g2">${lbIn('ফোন', '', c.phone, '০১৭XXXXXXXX', 'tel', "lbSet('co.phone',this.value)")}${lbIn('ইমেইল', '', c.email, 'name@mail.com', 'text', "lbSet('co.email',this.value)")}${lbIn('ওয়েবসাইট', '', c.web, 'www...', 'text', "lbSet('co.web',this.value)")}${lbIn('ট্রেড লাইসেন্স নং', '', c.lic, 'ঐচ্ছিক', 'text', "lbSet('co.lic',this.value)")}</div>
      <div class="lb-f"><label>কোম্পানির লোগো</label><input type="file" accept="image/*" onchange="lbLogo(this)"></div>${c.logo ? `<button class="btn sm" style="background:#b91c1c" onclick="lbSet('co.logo','');lbRefresh()">লোগো সরান</button>` : ''}</div>` : '');
  const per = `<div class="cx"><b>🗓️ কোন সময়ের শিট?</b><div class="lb-seg">${[['day', 'আজ/দিন'], ['month', 'মাস'], ['range', 'তারিখ থেকে-পর্যন্ত'], ['year', 'বছর']].map(x => `<button class="${p.t === x[0] ? 'on' : ''}" onclick="lbSet('per.t','${x[0]}');lbRefresh()">${x[1]}</button>`).join('')}</div>
    ${p.t === 'day' ? lbIn('তারিখ', '', p.d, '', 'date', "lbSet('per.d',this.value);lbRefresh()") : ''}
    ${p.t === 'month' ? `<div class="lb-g2"><div class="lb-f"><label>মাস</label><select onchange="lbSet('per.m',+this.value);lbRefresh()">${lbOpt(LB_MN.map((m, k) => [k, m]), p.m)}</select></div><div class="lb-f"><label>বছর</label><select onchange="lbSet('per.y',+this.value);lbRefresh()">${lbOpt(years, p.y)}</select></div></div>` : ''}
    ${p.t === 'range' ? `<div class="lb-g2">${lbIn('শুরু', '', p.from, '', 'date', "lbSet('per.from',this.value);lbRefresh()")}${lbIn('শেষ', '', p.to, '', 'date', "lbSet('per.to',this.value);lbRefresh()")}</div>` : ''}
    ${p.t === 'year' ? `<div class="lb-f"><label>বছর</label><select onchange="lbSet('per.y',+this.value);lbRefresh()">${lbOpt(years, p.y)}</select></div>` : ''}
    <div class="lb-pi">${esc(lbLabel())} • মোট যাত্রা ${lbBn(t.n)}টি</div></div>`;
  const info = `<div class="cx"><b>ড্রাইভার ও গাড়ির তথ্য</b><div class="lb-g2">${lbIn('ড্রাইভারের নাম', '', i.driver, 'যেমন: মোঃ রহিম', 'text', "lbSet('info.driver',this.value)")}${lbIn('মোবাইল নং', '', i.mobile, '০১৭XXXXXXXX', 'tel', "lbSet('info.mobile',this.value)")}${lbIn('গাড়ির নাম', '', i.car, 'যেমন: Toyota Axio', 'text', "lbSet('info.car',this.value)")}${lbIn('গাড়ির নম্বর', '', i.plate, 'ঢাকা মেট্রো-গ', 'text', "lbSet('info.plate',this.value)")}</div></div>`;
  const ff = (k, lab, ph, type) => lbIn(lab, '', F[k], ph, type, `LBF.${k}=this.value`);
  const add = `<div class="cx" id="lbform"><b>${F.id ? '✏️ যাত্রা বদলান' : '➕ নতুন যাত্রা যোগ করুন'}</b><div class="lb-g2">${ff('date', 'তারিখ', '', 'date')}<div></div>${ff('st', 'শুরুর সময়', '', 'time')}${ff('en', 'শেষের সময়', '', 'time')}${ff('from', 'কোথা থেকে', 'যেমন: উত্তরা')}${ff('to', 'কোথায়', 'যেমন: বিমানবন্দর')}${ff('km', 'চালিত কিমি', '', 'number')}${ff('odo', 'মিটার রিডিং (কিমি)', 'ঐচ্ছিক', 'number')}${ff('fuel', 'জ্বালানি (৳)', '', 'number')}${ff('toll', 'টোল/পার্কিং (৳)', '', 'number')}${ff('oth', 'অন্যান্য খরচ (৳)', '', 'number')}
    <div class="lb-f"><label>যাত্রার উদ্দেশ্য</label><select onchange="LBF.pur=this.value">${lbOpt(LB_PUR.map(x => [x, x]), F.pur)}</select></div><div class="lb-f"><label>গাড়ির অবস্থা</label><select onchange="LBF.cond=this.value">${lbOpt(LB_CON.map(x => [x, x]), F.cond)}</select></div></div>${lbIn('মন্তব্য', '', F.note, 'ঐচ্ছিক', 'text', 'LBF.note=this.value')}
    <div style="display:flex;gap:8px"><button class="btn" style="flex:1" onclick="lbAdd()">${F.id ? '💾 আপডেট' : '➕ যাত্রা যোগ করুন'}</button>${F.id ? `<button class="btn" style="background:#64748b" onclick="LBF=lbForm0();lbRefresh()">বাতিল</button>` : ''}</div></div>`;
  const tbl = rows.length ? `<div class="lb-tw"><table class="lb-t"><thead><tr><th>ক্রম</th><th>তারিখ</th><th>শুরু</th><th>শেষ</th><th>কোথা থেকে</th><th>কোথায়</th><th>কিমি</th><th class="r">জ্বালানি</th><th class="p">টোল</th><th class="g">অন্যান্য</th><th>উদ্দেশ্য</th><th>অবস্থা</th><th>মন্তব্য</th><th></th></tr></thead><tbody>${rows.map((r, k) => `<tr><td>${lbBn(k + 1)}</td><td>${lbDt(r.date)}</td><td>${lbTm(r.st)}</td><td>${lbTm(r.en)}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td class="n">${lbM(lbNum(r.km))}</td><td class="n">${lbM(lbNum(r.fuel))}</td><td class="n">${lbM(lbNum(r.toll))}</td><td class="n">${lbM(lbNum(r.oth))}</td><td>${esc(r.pur)}</td><td>${esc(r.cond)}</td><td>${esc(r.note)}</td><td style="white-space:nowrap"><button class="lb-ib" onclick="lbEdit('${r.id}')">✏️</button><button class="lb-ib" onclick="lbDel('${r.id}')">🗑️</button></td></tr>`).join('')}</tbody></table></div>` : sEmpty('📭', 'এই সময়ে কোনো যাত্রা নেই। উপরের ফর্ম থেকে যোগ করুন।');
  const sum = `<div class="cx"><b>মাসিক সারাংশ</b><div class="lb-dl"><div><span>মোট যাত্রা</span><b>${lbBn(t.n)} বার</b></div><div><span>মোট চালিত কিমি</span><b>${lbM(t.km)} কিমি</b></div><div><span>জ্বালানি খরচ</span><b>৳${lbM(t.fuel)}</b></div><div><span>টোল/পার্কিং</span><b>৳${lbM(t.toll)}</b></div><div><span>অন্যান্য খরচ</span><b>৳${lbM(t.oth)}</b></div><div class="tt"><span>মোট খরচ</span><b>৳${lbM(t.all)}</b></div></div></div>`;
  const cond = `<div class="cx"><b>গাড়ির অবস্থা (মাসিক)</b>${[['good', 'সর্বদা ভালো'], ['problem', 'কখনো সমস্যা ছিল'], ['repair', 'মেরামত প্রয়োজন']].map(x => `<label class="lb-rd"><input type="radio" name="lbc" ${LB.cond === x[0] ? 'checked' : ''} onchange="lbSet('cond','${x[0]}');lbPrev()"> ${x[1]}</label>`).join('')}${lbIn('বিশেষ মন্তব্য', '', LB.note, 'ঐচ্ছিক', 'text', "lbSet('note',this.value);lbPrevSoon()")}</div>
    <div class="cx"><b>স্বাক্ষর</b><div class="lb-g2">${lbIn('ড্রাইভারের নাম', '', LB.sig.d, '', 'text', "lbSet('sig.d',this.value);lbPrevSoon()")}${lbIn('তারিখ', '', LB.sig.dd, '', 'date', "lbSet('sig.dd',this.value);lbPrevSoon()")}${lbIn('কর্মকর্তার নাম', '', LB.sig.o, '', 'text', "lbSet('sig.o',this.value);lbPrevSoon()")}${lbIn('তারিখ', '', LB.sig.od, '', 'date', "lbSet('sig.od',this.value);lbPrevSoon()")}</div></div>`;
  const x = LB.xl;
  const sheet = `<div class="cx"><b>🖨️ A4 শিট</b><div class="lb-seg" style="margin-top:6px">${[['blue', '🔵 নীল'], ['green', '🟢 সবুজ'], ['mono', '⚫ সাদাকালো']].map(s => `<button class="${LB.style === s[0] ? 'on' : ''}" onclick="lbSet('style','${s[0]}');lbRefresh()">${s[1]}</button>`).join('')}</div>
    <div id="lbprev" class="lb-prev"><div class="hint" style="padding:20px;text-align:center">⏳ শিট তৈরি হচ্ছে...</div></div>
    <div class="lb-ex"><button class="btn" style="background:#b91c1c" onclick="lbPdf()">📄 PDF</button><button class="btn" style="background:#15803d" onclick="lbXlsx()">📊 Excel</button><button class="btn" style="background:#12307A" onclick="lbPrint()">🖨️ প্রিন্ট</button></div>
    <details class="lb-dt"><summary>⚙️ Excel ছাপা ও জুমের সেটিং</summary>
      <div class="hint" style="margin:6px 0">Excel ফাইল খুলে প্রিন্ট দিলে এই সেটিং মতো পাতায় ধরবে। পরে Excel-এ নিজেও বদলানো যাবে।</div>
      <div class="lb-f"><label>ছাপার মাপ</label><select onchange="lbSet('xl.mode',this.value);lbRefresh()">${lbOpt([['one', 'সব এক পাতায় ধরান (ছোট হবে)'], ['width', 'প্রস্থ এক পাতায়, লম্বায় যত পাতা লাগে (প্রস্তাবিত)'], ['scale', 'নিজের মাপ (%)']], x.mode)}</select></div>
      ${x.mode === 'scale' ? `<div class="lb-f"><label>ছাপার মাপ: <b id="lbsv">${lbBn(x.scale)}%</b></label><input type="range" min="30" max="200" step="5" value="${x.scale}" oninput="lbSet('xl.scale',+this.value);document.getElementById('lbsv').textContent=lbBn(this.value)+'%'"></div>` : ''}
      <div class="lb-f"><label>কাগজ</label><select onchange="lbSet('xl.orient',this.value)">${lbOpt([['l', 'A4 আড়াআড়ি (প্রস্তাবিত)'], ['p', 'A4 লম্বালম্বি']], x.orient)}</select></div>
      <div class="lb-f"><label>ফাইল খুললে জুম: <b id="lbzv">${lbBn(x.zoom)}%</b></label><input type="range" min="50" max="150" step="5" value="${x.zoom}" oninput="lbSet('xl.zoom',+this.value);document.getElementById('lbzv').textContent=lbBn(this.value)+'%'"></div></details></div>`;
  return pageHead('ড্রাইভার লগ বুক') + `<div class="pad lb">${lh}<div class="lb-hero"><b>Driver Log Book</b><span>ড্রাইভারের যাত্রা ও হিসাব খাতা</span><i>Safe Drive • Smart Record • Better Service</i></div>${per}${info}${add}<div class="sec-t">যাত্রার তালিকা • ${esc(lbLabel())}</div>${tbl}${sum}${cond}${sheet}<div class="hint" style="margin:10px 0">তথ্য আপনার ফোনেই থাকে, ইন্টারনেট ছাড়াও চলে। লগইন করা থাকলে ব্যাকআপে ক্লাউডেও সেভ হয়।</div></div>`;
}
function lbAdd() {
  const F = LBF; if (!F.date) return alert('তারিখ দিন।'); if (!F.from && !F.to && !lbNum(F.km)) return alert('কোথা থেকে, কোথায় বা কিমি দিন।');
  const r = {id: F.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 5), date: F.date, st: F.st, en: F.en, from: F.from.trim(), to: F.to.trim(), km: lbNum(F.km), odo: F.odo === '' ? '' : lbNum(F.odo), fuel: lbNum(F.fuel), toll: lbNum(F.toll), oth: lbNum(F.oth), pur: F.pur, cond: F.cond, note: F.note.trim()};
  const k = LB.rows.findIndex(x => x.id === r.id); if (k >= 0) LB.rows[k] = r; else LB.rows.push(r); lbSave();
  const d = F.date; LBF = lbForm0(); LBF.date = d; lbRefresh();
}
function lbEdit(id) { const r = LB.rows.find(x => x.id === id); if (!r) return; LBF = {id: r.id, date: r.date, st: r.st || '', en: r.en || '', from: r.from || '', to: r.to || '', km: r.km || '', odo: r.odo === '' ? '' : (r.odo || ''), fuel: r.fuel || '', toll: r.toll || '', oth: r.oth || '', pur: r.pur || 'অফিস', cond: r.cond || 'ভালো', note: r.note || ''}; lbRefresh(); const f = document.getElementById('lbform'); if (f) f.scrollIntoView({block: 'start'}); }
function lbDel(id) { if (!confirm('এই যাত্রা মুছবেন?')) return; LB.rows = LB.rows.filter(x => x.id !== id); lbSave(); if (LBF.id === id) LBF = lbForm0(); lbRefresh(); }
function lbLogo(inp) {
  const f = inp.files && inp.files[0]; if (!f) return; const rd = new FileReader();
  rd.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 200 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s)); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); LB.co.logo = c.toDataURL('image/jpeg', 0.85); lbSave(); lbRefresh(); }; im.onerror = () => alert('ছবিটি পড়া যায়নি।'); im.src = rd.result; };
  rd.readAsDataURL(f);
}

// ---------- শিট আঁকা (ক্যানভাসে; প্রিভিউ, PDF, প্রিন্ট একই ছবি) ----------
const LB_COLS = [['ক্রম', 36, 'c', 0], ['তারিখ', 62, 'c', 0], ['শুরু', 56, 'c', 0], ['শেষ', 56, 'c', 0], ['কোথা থেকে', 122, 'l', 0], ['কোথায়', 122, 'l', 0], ['কিমি', 52, 'r', 0], ['মিটার', 68, 'r', 0], ['জ্বালানি (৳)', 72, 'r', 1], ['টোল/পার্কিং', 66, 'r', 2], ['অন্যান্য (৳)', 66, 'r', 3], ['উদ্দেশ্য', 76, 'l', 0], ['অবস্থা', 62, 'l', 0], ['মন্তব্য', 151, 'l', 0]];
function lbPages(rows) {
  const out = [], n = rows.length; let i = 0, first = true; if (!n) return [{first: true, rows: [], start: 0, sum: true}];
  while (i < n) { const cap = first ? 19 : 27, rem = n - i; if (rem <= cap - 9) { out.push({first, rows: rows.slice(i), start: i, sum: true}); i = n; } else if (rem <= cap) { out.push({first, rows: rows.slice(i), start: i}); out.push({first: false, rows: [], start: n, sum: true, only: true}); i = n; } else { out.push({first, rows: rows.slice(i, i + cap), start: i}); i += cap; } first = false; }
  return out;
}
const lbImg = src => new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
async function lbDrawAll(sc) {
  const fam = getComputedStyle(document.body).fontFamily || 'sans-serif'; try { await document.fonts.load('26px ' + fam); await document.fonts.load('bold 26px ' + fam); } catch (e) {}
  const rows = lbRows(), pages = lbPages(rows), logo = await lbImg(LB.co.logo), t = lbTot(rows), cvs = [];
  pages.forEach((pg, k) => { const cv = document.createElement('canvas'); lbDraw(cv, pg, k, pages.length, sc, fam, logo, t, rows); cvs.push(cv); });
  return cvs;
}
function lbDraw(cv, pg, pi, np, sc, fam, logo, t, allRows) {
  const P = LB_PAL[LB.style] || LB_PAL.blue, W = 1123, H = 794; cv.width = Math.round(W * sc); cv.height = Math.round(H * sc); const g = cv.getContext('2d'); g.scale(sc, sc); g.textBaseline = 'alphabetic';
  const F = (sz, b) => `${b ? 'bold ' : ''}${sz}px ${fam}`;
  const T = (s, x, y, o) => { o = o || {}; s = String(s == null ? '' : s); g.font = F(o.sz || 12, o.b); g.fillStyle = o.col || P.tx; g.textAlign = o.al || 'left'; if (o.max) { while (s.length > 1 && g.measureText(s).width > o.max) s = s.slice(0, -1); if (s !== String(o.s0 || s) && false) s += '…'; } g.fillText(s, x, y); };
  const Tm = (s, x, y, o) => { s = String(s == null ? '' : s); g.font = F(o.sz || 12, o.b); let cut = false; while (s.length > 1 && g.measureText(s + (cut ? '…' : '')).width > o.max) { s = s.slice(0, -1); cut = true; } T(s + (cut ? '…' : ''), x, y, o); };
  const R = (x, y, w, h, r, fill, stroke) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); } };
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = P.p; g.fillRect(0, 0, 786, 9); g.fillStyle = P.a; g.fillRect(786, 0, W - 786, 9);
  const c = LB.co, inf = LB.info; let y;
  if (pg.first) {
    R(28, 20, 62, 62, 10, P.tint, P.ln); if (logo) { const s = Math.min(54 / logo.width, 54 / logo.height); g.drawImage(logo, 28 + (62 - logo.width * s) / 2, 20 + (62 - logo.height * s) / 2, logo.width * s, logo.height * s); } else T((c.name || 'লগ').trim().slice(0, 1), 59, 63, {sz: 28, b: 1, col: P.p, al: 'center'});
    Tm(c.name || 'ড্রাইভার লগ বুক', 104, 48, {sz: 26, b: 1, col: P.p, max: 560}); if (c.tag) Tm(c.tag, 104, 70, {sz: 12.5, col: P.mut, max: 560});
    const ct = [c.addr, [c.phone, c.email].filter(Boolean).join('  •  '), c.web, c.lic ? 'ট্রেড লাইসেন্স: ' + c.lic : ''].filter(Boolean); ct.slice(0, 4).forEach((s, k) => Tm(s, 1095, 34 + k * 16, {sz: 12, al: 'right', max: 400}));
    g.fillStyle = P.p; g.fillRect(28, 88, 1067, 2);
    R(28, 98, 1067, 64, 12, P.p); T('Driver Log Book', 561, 128, {sz: 26, b: 1, col: '#fff', al: 'center'}); T('ড্রাইভারের যাত্রা ও হিসাব খাতা — ' + lbLabel(), 561, 152, {sz: 16, b: 1, col: P.a === '#c8c8c8' ? '#e5e5e5' : P.a, al: 'center'});
    const bw = 349, by = 172, items = [[['ড্রাইভার', inf.driver], ['মোবাইল', inf.mobile]], [['গাড়ি', inf.car], ['নম্বর', inf.plate]], [['সময়কাল', lbLabel()], ['মোট যাত্রা', lbBn(t.n) + ' বার']]];
    items.forEach((it, k) => { const x = 28 + k * (bw + 10); R(x, by, bw, 46, 8, P.tint, P.ln); it.forEach((f, j) => { T(f[0] + ':', x + 10, by + 19 + j * 19, {sz: 11.5, col: P.mut}); Tm(f[1] || '–', x + 78, by + 19 + j * 19, {sz: 13, b: 1, max: bw - 88}); }); });
    y = 228;
  } else { T('ড্রাইভার লগ বুক — ' + lbLabel() + (pg.only ? ' (সারাংশ)' : ' (চলমান)'), 28, 34, {sz: 14, b: 1, col: P.p}); y = 44; }
  const colsX = []; let cx = 28; LB_COLS.forEach(k => { colsX.push(cx); cx += k[1]; });
  if (pg.rows.length || (pg.first && !pg.only)) {
    const hc = [P.p, P.c1, P.c2, P.c3];
    LB_COLS.forEach((k, j) => { g.fillStyle = hc[k[3]]; g.fillRect(colsX[j], y, k[1], 36); g.strokeStyle = 'rgba(255,255,255,.35)'; g.strokeRect(colsX[j], y, k[1], 36); const words = k[0].split(' '); if (k[0].length > 8 && words.length > 1) { T(words[0], colsX[j] + k[1] / 2, y + 15, {sz: 10.5, b: 1, col: '#fff', al: 'center'}); T(words.slice(1).join(' '), colsX[j] + k[1] / 2, y + 28, {sz: 10.5, b: 1, col: '#fff', al: 'center'}); } else T(k[0], colsX[j] + k[1] / 2, y + 22, {sz: 11, b: 1, col: '#fff', al: 'center'}); });
    y += 36; const RH = 25;
    pg.rows.forEach((r, k) => {
      if (k % 2 === 1) { g.fillStyle = P.tint; g.fillRect(28, y, 1067, RH); }
      const vals = [lbBn(pg.start + k + 1), lbDt(r.date), lbTm(r.st), lbTm(r.en), r.from, r.to, lbNum(r.km) ? lbM(r.km) : '–', r.odo === '' || r.odo == null ? '–' : lbM(r.odo), lbNum(r.fuel) ? lbM(r.fuel) : '–', lbNum(r.toll) ? lbM(r.toll) : '–', lbNum(r.oth) ? lbM(r.oth) : '–', r.pur, r.cond, r.note];
      LB_COLS.forEach((cc, j) => { const x = colsX[j], w = cc[1]; g.strokeStyle = P.ln; g.strokeRect(x, y, w, RH); const al = cc[2] === 'c' ? 'center' : cc[2] === 'r' ? 'right' : 'left', tx = al === 'center' ? x + w / 2 : al === 'right' ? x + w - 6 : x + 6; Tm(vals[j], tx, y + 17, {sz: 12, al, max: w - 10}); });
      y += RH;
    });
    if (pg.first && !pg.rows.length) { T('এই সময়ে কোনো যাত্রা যোগ করা হয়নি।', 561, y + 22, {sz: 13, col: P.mut, al: 'center'}); y += 40; }
  }
  if (pg.sum) {
    y = pg.only ? 60 : y + 14; const bw = 349, bh = 138;
    const box = (x, title, col) => { R(x, y, bw, bh, 8, '#fff', P.ln); g.fillStyle = col; g.save(); R(x, y, bw, 24, 8, col); g.fillRect(x, y + 12, bw, 12); g.restore(); T(title, x + 12, y + 17, {sz: 13, b: 1, col: '#fff'}); };
    box(28, 'মাসিক সারাংশ', P.p); const L = [['মোট যাত্রা', lbBn(t.n) + ' বার'], ['মোট চালিত কিমি', lbM(t.km) + ' কিমি'], ['জ্বালানি খরচ', '৳' + lbM(t.fuel)], ['টোল/পার্কিং', '৳' + lbM(t.toll)], ['অন্যান্য খরচ', '৳' + lbM(t.oth)], ['মোট খরচ', '৳' + lbM(t.all)]];
    L.forEach((l, k) => { const yy = y + 42 + k * 16.5, last = k === 5; T(l[0], 40, yy, {sz: 12.5, b: last, col: last ? P.p : P.tx}); T(l[1], 28 + bw - 12, yy, {sz: 12.5, b: 1, col: last ? P.p : P.tx, al: 'right'}); });
    box(387, 'গাড়ির অবস্থা (মাসিক)', P.c3); [['good', 'সর্বদা ভালো'], ['problem', 'কখনো সমস্যা ছিল'], ['repair', 'মেরামত প্রয়োজন']].forEach((o, k) => { const yy = y + 44 + k * 20; g.strokeStyle = P.p; g.lineWidth = 1.5; g.strokeRect(399, yy - 11, 13, 13); if (LB.cond === o[0]) { g.fillStyle = P.p; g.fillRect(401, yy - 9, 9, 9); } g.lineWidth = 1; T(o[1], 420, yy, {sz: 12.5}); });
    T('মন্তব্য: ' + (LB.note || ''), 399, y + 116, {sz: 11.5, col: P.mut}); g.font = F(11.5); 
    box(746, 'উদ্দেশ্য অনুযায়ী যাত্রা', P.p); const cnt = {}; allRows.forEach(r => { cnt[r.pur || 'অন্যান্য'] = (cnt[r.pur || 'অন্যান্য'] || 0) + 1; }); Object.keys(cnt).slice(0, 6).forEach((k, j) => { const yy = y + 42 + j * 16.5; T(k, 758, yy, {sz: 12.5}); T(lbBn(cnt[k]) + ' বার', 746 + bw - 12, yy, {sz: 12.5, b: 1, al: 'right'}); });
    const sy = y + bh + 10, sg = (x, w, title, nm, dt, seal) => { R(x, sy, w, 70, 8, '#fff', P.ln); if (seal) { g.setLineDash([4, 3]); g.strokeStyle = P.mut; g.strokeRect(x + 1, sy + 1, w - 2, 68); g.setLineDash([]); T('সিল / মোহর', x + w / 2, sy + 40, {sz: 12, col: P.mut, al: 'center'}); return; } T(title, x + 12, sy + 18, {sz: 12.5, b: 1, col: P.p}); g.fillStyle = P.mut; g.fillRect(x + 12, sy + 52, w - 24, 1); T('নাম: ' + (nm || ''), x + 12, sy + 65, {sz: 11, col: P.tx}); T('তারিখ: ' + (dt ? lbDtL(dt) : ''), x + w - 12, sy + 65, {sz: 11, col: P.tx, al: 'right'}); };
    sg(28, 349, 'ড্রাইভারের স্বাক্ষর', LB.sig.d, LB.sig.dd); sg(387, 349, 'দায়িত্বশীল কর্মকর্তার স্বাক্ষর', LB.sig.o, LB.sig.od); sg(746, 349, '', '', '', 1);
  }
  g.fillStyle = P.p; g.fillRect(0, H - 28, W, 28); T('Safe Drive • Smart Record • Better Service', 28, H - 9, {sz: 13, b: 1, col: P.a === '#c8c8c8' ? '#e5e5e5' : P.a}); T((typeof appName === 'function' ? appName() : 'আমার ভাই') + ' • পাতা ' + lbBn(pi + 1) + '/' + lbBn(np), W - 28, H - 9, {sz: 12, col: '#fff', al: 'right'});
}
let _lbT = null, _lbSeq = 0;
function lbPrevSoon() { clearTimeout(_lbT); _lbT = setTimeout(lbPrev, 500); }
async function lbPrev() {
  const box = document.getElementById('lbprev'); if (!box) return; const my = ++_lbSeq;
  try { const cvs = await lbDrawAll(Math.min(2, Math.max(1.2, (window.devicePixelRatio || 1)))); if (my !== _lbSeq || !document.getElementById('lbprev')) return; box.innerHTML = ''; cvs.forEach(cv => { cv.style.cssText = 'width:100%;height:auto;display:block;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:8px;background:#fff'; box.appendChild(cv); }); }
  catch (e) { box.innerHTML = '<div class="hint">শিট দেখানো যায়নি।</div>'; }
}
async function lbSaveFile(name, bytes, mime, title) {
  try {
    const C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform()) { const FS = capP('Filesystem'), SH = capP('Share'); const o = await FS.writeFile({path: name, data: u8b64(bytes), directory: 'CACHE'}); await SH.share({title, url: o.uri, dialogTitle: 'ফাইল কোথায় রাখবেন বা পাঠাবেন?'}); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], {type: mime})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  } catch (e) { if (!(e && /cancel/i.test(String(e.message || e)))) alert('ফাইল তৈরি হয়নি।'); }
}
async function lbPdf() {
  try { const cvs = await lbDrawAll(2), jp = cvs.map(cv => Uint8Array.from(atob(cv.toDataURL('image/jpeg', 0.92).split(',')[1]), ch => ch.charCodeAt(0))); const bytes = pdfMulti(jp, cvs[0].width, cvs[0].height, 842); await lbSaveFile(lbFile() + '.pdf', bytes, 'application/pdf', 'ড্রাইভার লগ বুক'); }
  catch (e) { alert('PDF হয়নি।'); }
}
async function lbPrint() {
  const C = window.Capacitor; if (C && C.isNativePlatform && C.isNativePlatform()) { alert('ফোনে সরাসরি প্রিন্ট হয় না। PDF তৈরি হবে, সেটা খুলে প্রিন্ট বা শেয়ার করুন।'); return lbPdf(); }
  const cvs = await lbDrawAll(2), box = document.createElement('div'); box.id = 'lbprint'; cvs.forEach(cv => { const im = new Image(); im.src = cv.toDataURL('image/jpeg', 0.92); box.appendChild(im); }); document.body.appendChild(box);
  const st = document.createElement('style'); st.id = 'lbprintcss'; st.textContent = '@media print{@page{size:297mm 210mm;margin:0}body>*:not(#lbprint){display:none!important}#lbprint img{display:block;width:297mm;height:210mm;page-break-after:always;break-after:page}}#lbprint{display:none}@media print{#lbprint{display:block}}'; document.head.appendChild(st);
  setTimeout(() => { window.print(); setTimeout(() => { box.remove(); st.remove(); }, 1500); }, 300);
}

// ---------- Excel (.xlsx) — নিজে বানানো, প্রিন্ট সেটিংসহ ----------
function lbZip(files) {
  const enc = new TextEncoder(), tb = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = tb[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const parts = [], cen = []; let off = 0; const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  files.forEach(f => { const nm = enc.encode(f.name), d = typeof f.data === 'string' ? enc.encode(f.data) : f.data, cr = crc(d);
    const lh = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x5821), ...u32(cr), ...u32(d.length), ...u32(d.length), ...u16(nm.length), ...u16(0)]); parts.push(lh, nm, d);
    cen.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x5821), ...u32(cr), ...u32(d.length), ...u32(d.length), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nm); off += lh.length + nm.length + d.length; });
  let cl = 0; cen.forEach(b => { cl += b.length; }); const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cl), ...u32(off), 0, 0]);
  const all = parts.concat(cen, [end]); let len = 0; all.forEach(b => { len += b.length; }); const out = new Uint8Array(len); let q = 0; all.forEach(b => { out.set(b, q); q += b.length; }); return out;
}
function lbXlsxBytes() {
  const P = LB_PAL[LB.style] || LB_PAL.blue, x = LB.xl, rows = lbRows(), t = lbTot(rows), c = LB.co, inf = LB.info, hx = s => 'FF' + s.slice(1).toUpperCase();
  const X = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const NC = 14, col = i => String.fromCharCode(65 + i), ser = iso => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000), tfrac = tt => { const a = String(tt || '').split(':'); return a.length >= 2 ? (+a[0] * 60 + +a[1]) / 1440 : null; };
  // স্টাইল: 0 সাধারণ,1 শিরোনাম,2 উপশিরোনাম,3 ব্যান্ড,4-7 হেডার(নেভি,লাল,বেগুনি,সবুজ),8 লেখা,9 মাঝে,10 সংখ্যা,11 তারিখ,12 সময়,13 মোট-লেবেল,14 মোট-সংখ্যা,15 লেবেল-বোল্ড,16 র‍্যাপ,17 সারাংশ-লেবেল,18 সারাংশ-সংখ্যা
  const fills = ['', '<fill><patternFill patternType="gray125"/></fill>', ...[P.p, P.c1, P.c2, P.c3, P.a, P.tint].map(cc => `<fill><patternFill patternType="solid"><fgColor rgb="${hx(cc)}"/><bgColor indexed="64"/></patternFill></fill>`)];
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="dd\\-mmm\\-yyyy"/><numFmt numFmtId="165" formatCode="hh:mm"/><numFmt numFmtId="166" formatCode="#,##0.##"/></numFmts>
<fonts count="6"><font><sz val="11"/><name val="Nirmala UI"/></font><font><b/><sz val="11"/><name val="Nirmala UI"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Nirmala UI"/></font><font><b/><sz val="18"/><color rgb="${hx(P.p)}"/><name val="Nirmala UI"/></font><font><sz val="10"/><color rgb="${hx(P.mut)}"/><name val="Nirmala UI"/></font><font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Nirmala UI"/></font></fonts>
<fills count="${fills.length}"><fill><patternFill patternType="none"/></fill>${fills.slice(1).join('')}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="${hx(P.ln)}"/></left><right style="thin"><color rgb="${hx(P.ln)}"/></right><top style="thin"><color rgb="${hx(P.ln)}"/></top><bottom style="thin"><color rgb="${hx(P.ln)}"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="19"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="166" fontId="1" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="166" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf></cellXfs></styleSheet>`;
  const R = []; let rn = 0; const merges = [], heights = {};
  const cell = (ci, v, s, kind, f) => { const ref = col(ci) + (rn + 1); if (kind === 'n') return `<c r="${ref}" s="${s}"><v>${v}</v></c>`; if (kind === 'f') return `<c r="${ref}" s="${s}"><f>${X(f)}</f><v>${v}</v></c>`; if (v === '' || v == null) return `<c r="${ref}" s="${s}"/>`; return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`; };
  const row = (cells, h) => { rn++; if (h) heights[rn] = h; R.push({n: rn, cells}); return rn; };
  const mrg = (a, b, r) => merges.push(`${col(a)}${r}:${col(b)}${r}`);
  const fill = (from, to, s) => { const o = []; for (let i = from; i <= to; i++) o.push(cell(i, '', s)); return o; };
  let r1 = row([cell(0, c.name || 'ড্রাইভার লগ বুক', 1), ...fill(1, NC - 1, 1)], 32); mrg(0, NC - 1, r1);
  const sub = [c.tag, c.addr, c.phone, c.email, c.web].filter(Boolean).join('  •  '); if (sub) { let r = row([cell(0, sub, 2), ...fill(1, NC - 1, 2)], 20); mrg(0, NC - 1, r); }
  let r3 = row([cell(0, 'Driver Log Book — ড্রাইভারের যাত্রা ও হিসাব খাতা', 3), ...fill(1, NC - 1, 3)], 26); mrg(0, NC - 1, r3);
  let r4 = row([cell(0, 'ড্রাইভার: ' + (inf.driver || ''), 15), ...fill(1, 3, 15), cell(4, 'মোবাইল: ' + (inf.mobile || ''), 15), ...fill(5, 6, 15), cell(7, 'গাড়ি: ' + (inf.car || '') + (inf.plate ? ' (' + inf.plate + ')' : ''), 15), ...fill(8, 10, 15), cell(11, 'সময়কাল: ' + lbLabel(), 15), ...fill(12, 13, 15)], 22); merges.push(`A${r4}:D${r4}`, `E${r4}:G${r4}`, `H${r4}:K${r4}`, `L${r4}:N${r4}`);
  row([], 8);
  const heads = [['ক্রম', 4], ['তারিখ', 4], ['শুরুর সময়', 4], ['শেষের সময়', 4], ['কোথা থেকে', 4], ['কোথায়', 4], ['চালিত কিমি', 4], ['মিটার রিডিং', 4], ['জ্বালানি/রিচার্জ (৳)', 5], ['টোল/পার্কিং (৳)', 6], ['অন্যান্য খরচ (৳)', 7], ['যাত্রার উদ্দেশ্য', 4], ['গাড়ির অবস্থা', 4], ['মন্তব্য', 4]];
  const hr = row(heads.map((h, i) => cell(i, h[0], h[1])), 34), first = rn + 1;
  rows.forEach((r, k) => { const d = r.date ? ser(r.date) : '', ts = tfrac(r.st), te = tfrac(r.en); row([cell(0, k + 1, 9, 'n'), d === '' ? cell(1, '', 11) : cell(1, d, 11, 'n'), ts == null ? cell(2, '', 12) : cell(2, ts, 12, 'n'), te == null ? cell(3, '', 12) : cell(3, te, 12, 'n'), cell(4, r.from, 8), cell(5, r.to, 8), cell(6, lbNum(r.km), 10, 'n'), r.odo === '' || r.odo == null ? cell(7, '', 10) : cell(7, lbNum(r.odo), 10, 'n'), cell(8, lbNum(r.fuel), 10, 'n'), cell(9, lbNum(r.toll), 10, 'n'), cell(10, lbNum(r.oth), 10, 'n'), cell(11, r.pur, 8), cell(12, r.cond, 8), cell(13, r.note, 8)], 22); });
  const last = rn, rng = ci => `${col(ci)}${first}:${col(ci)}${last}`;
  const tr = row([cell(0, 'মোট', 13), ...fill(1, 5, 13), cell(6, t.km, 14, 'f', rows.length ? `SUM(${rng(6)})` : '0'), cell(7, '', 14), cell(8, t.fuel, 14, 'f', rows.length ? `SUM(${rng(8)})` : '0'), cell(9, t.toll, 14, 'f', rows.length ? `SUM(${rng(9)})` : '0'), cell(10, t.oth, 14, 'f', rows.length ? `SUM(${rng(10)})` : '0'), ...fill(11, 13, 13)], 24); mrg(0, 5, tr);
  row([], 10);
  const sm = (lab, val, f) => { const r = row([cell(0, lab, 17), ...fill(1, 3, 17), cell(4, val, 18, 'f', f), ...fill(5, 5, 18)], 22); merges.push(`A${r}:D${r}`); return r; };
  const sTitle = row([cell(0, 'মাসিক সারাংশ', 3), ...fill(1, 4, 3)], 24); mrg(0, 4, sTitle);
  sm('মোট যাত্রা সংখ্যা', t.n, rows.length ? `COUNT(${rng(0)})` : '0');
  sm('মোট চালিত কিলোমিটার', t.km, `G${tr}`); sm('মোট জ্বালানি খরচ (৳)', t.fuel, `I${tr}`); sm('মোট টোল/পার্কিং (৳)', t.toll, `J${tr}`); sm('মোট অন্যান্য খরচ (৳)', t.oth, `K${tr}`); const allr = sm('মোট খরচ (৳)', t.all, `I${tr}+J${tr}+K${tr}`);
  row([], 10);
  const cl = {good: 'সর্বদা ভালো', problem: 'কখনো সমস্যা ছিল', repair: 'মেরামত প্রয়োজন'}[LB.cond]; const rc = row([cell(0, 'গাড়ির অবস্থা (মাসিক): ' + cl, 15)], 22); mrg(0, 8, rc); if (LB.note) { const rn2 = row([cell(0, 'মন্তব্য: ' + LB.note, 16)], 22); mrg(0, 8, rn2); }
  row([], 24); const rs = row([cell(0, 'ড্রাইভারের স্বাক্ষর: ' + (LB.sig.d || '') + (LB.sig.dd ? '   তারিখ: ' + lbDtL(LB.sig.dd) : ''), 15), ...fill(1, 5, 15), cell(7, 'কর্মকর্তার স্বাক্ষর: ' + (LB.sig.o || '') + (LB.sig.od ? '   তারিখ: ' + lbDtL(LB.sig.od) : ''), 15)], 24); mrg(0, 5, rs); mrg(7, 13, rs);
  const lastRow = rn, widths = [6, 13, 10, 10, 20, 20, 11, 12, 14, 14, 14, 15, 15, 24];
  const fit = x.mode === 'scale' ? '' : '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>';
  const ps = x.mode === 'one' ? 'fitToWidth="1" fitToHeight="1"' : x.mode === 'width' ? 'fitToWidth="1" fitToHeight="0"' : `scale="${Math.max(10, Math.min(400, Math.round(x.scale)))}"`;
  const z = Math.max(10, Math.min(400, Math.round(x.zoom)));
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${fit}<dimension ref="A1:${col(NC - 1)}${lastRow}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0" zoomScale="${z}" zoomScaleNormal="${z}"><pane ySplit="${hr}" topLeftCell="A${hr + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${R.map(r => `<row r="${r.n}"${heights[r.n] ? ` ht="${heights[r.n]}" customHeight="1"` : ''}>${r.cells.join('')}</row>`).join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${x.orient === 'p' ? 'portrait' : 'landscape'}" ${ps}/><headerFooter><oddFooter>&amp;L${X(c.name || 'ড্রাইভার লগ বুক')}&amp;Rপাতা &amp;P / &amp;N</oddFooter></headerFooter></worksheet>`;
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Log Book" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">'Log Book'!$A$1:$${col(NC - 1)}$${lastRow}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">'Log Book'!$${hr}:$${hr}</definedName></definedNames></workbook>`;
  return lbZip([
    {name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
    {name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name: 'xl/workbook.xml', data: wb},
    {name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name: 'xl/styles.xml', data: styles}, {name: 'xl/worksheets/sheet1.xml', data: sheet}]);
}
async function lbXlsx() { try { await lbSaveFile(lbFile() + '.xlsx', lbXlsxBytes(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'ড্রাইভার লগ বুক'); } catch (e) { alert('Excel হয়নি।'); } }
(function () { const st = document.createElement('style'); st.textContent = `
.lb .cx{margin:10px 0}.lb-lh{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);margin-top:6px}.lb-bar{height:6px;background:linear-gradient(90deg,#12307A 62%,#FFD21F 62%)}.lb-lhin{padding:12px}
.lb-top{display:flex;gap:10px;align-items:center}.lb-logo{width:56px;height:56px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;display:flex;align-items:center;justify-content:center;font-size:26px;overflow:hidden;flex:none}.lb-logo img{width:100%;height:100%;object-fit:contain}
.lb-cn{font-weight:800;font-size:19px;color:#12307A;line-height:1.25;overflow-wrap:anywhere}.lb-meta{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0;font-size:13px}
.lb-hero{background:#12307A;color:#fff;border-radius:16px;padding:14px 16px;margin:10px 0}.lb-hero b{display:block;font-size:27px;line-height:1.1}.lb-hero span{display:block;color:#FFD21F;font-weight:700;font-size:17px;margin-top:2px}.lb-hero i{display:inline-block;margin-top:8px;background:#FFD21F;color:#2A2200;font-size:12px;border-radius:12px;padding:1px 12px}
.lb-f{display:flex;flex-direction:column;gap:3px;margin:8px 0;min-width:0}.lb-f label{font-size:12.5px;font-weight:700;color:#64748b}.lb-f input,.lb-f select{width:100%;min-width:0;height:44px;border:1.5px solid #d5dbe8;border-radius:10px;padding:0 10px;font:inherit;font-size:16px;background:#fff;color:inherit}.lb-f input[type=range]{height:30px;padding:0}.lb-f input[type=file]{height:auto;padding:8px}
.lb-g2{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}.lb-seg{display:flex;gap:4px;background:#eef1f6;border-radius:12px;padding:3px;margin:8px 0}.lb-seg button{flex:1;border:0;background:transparent;border-radius:9px;padding:8px 2px;font:inherit;font-weight:700;font-size:13px;color:#334155}.lb-seg button.on{background:#b0185a;background:var(--p2,#b0185a);color:#fff}
.lb-pi{margin-top:8px;padding:8px 12px;border-radius:10px;background:#e8f0fe;font-weight:700;font-size:14px}.sec-t{font-weight:800;margin:14px 2px 6px;font-size:14px;color:#475569}
.lb-tw{overflow-x:auto;border:1px solid #d5dbe8;border-radius:12px;background:#fff}.lb-t{border-collapse:collapse;min-width:900px;width:100%;font-size:13px}.lb-t th{background:#12307A;color:#fff;padding:7px 5px;font-size:12px}.lb-t th.r{background:#C62828}.lb-t th.p{background:#6A2C9A}.lb-t th.g{background:#1E7B2E}.lb-t td{border-top:1px solid #e2e8f0;border-right:1px solid #eef1f6;padding:6px;text-align:center;vertical-align:middle}.lb-t td.n{text-align:right}.lb-t tr:nth-child(even) td{background:#f6f8fd}
.lb-ib{border:0;background:#eef1f6;border-radius:8px;width:32px;height:32px;margin:0 2px;font-size:15px}.lb-dl>div{display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #eef1f6;font-size:14px}.lb-dl>div:first-child{border-top:0}.lb-dl .tt{font-size:16px;font-weight:800;color:#12307A}.lb-rd{display:flex;align-items:center;gap:10px;padding:8px 0;font-weight:600}.lb-rd input{width:20px;height:20px}
.lb-prev{margin-top:8px}.lb-ex{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}.lb-ex .btn{margin:0;padding:12px 4px}.lb-dt{margin-top:8px}.lb-dt summary{font-weight:700;padding:8px 0;cursor:pointer}
body.dark .lb-lh,body.dark .lb-f input,body.dark .lb-f select,body.dark .lb-tw{background:#1f2937;border-color:#374151}body.dark .lb-t td{border-color:#374151}body.dark .lb-t tr:nth-child(even) td{background:#243244}`; document.head.appendChild(st); })();

// =====================================================================
//  আয়-খরচ খাতা (নতুন ধাঁচ): সারাংশ, আয়/খরচ বাটন, পরিসংখ্যান, ইতিহাস, «আরও দেখুন»
//  দেনা-পাওনা, টাকা গণনা, বয়স/বেতন/মূল্য ক্যালকুলেটর, ক্যালকুলেটর বাটন
// =====================================================================
let LG_Y = 0, LG_V = 'home', LG_ST = 'd', LG_F = 'all', LG_BACK = 'home';
function lgGo(v) { if (v === 'budget' && LG_V !== 'budget') { LG_B = ''; LG_BN = false; } LG_V = v; ledgerPage(); window.scrollTo(0, 0); }
function lgDebts(l) { l.debts = l.debts || []; return l.debts; }
function lgDebtSum(l, ty) { return lgDebts(l).filter(d => d.type === ty).reduce((a, d) => a + Math.max(0, d.amt - (d.paid || 0)), 0); }
function ledgerPage() {
  tab = 'home'; const l = ledgerData(), t = todayISO();
  if (!lm) lm = t.slice(0, 7); if (!ld || ld.slice(0, 7) !== lm) ld = lm === t.slice(0, 7) ? t : lm + '-01'; if (!ly) ly = +t.slice(0, 4);
  const V = LG_V, back = (to, lab) => `<button class="lg-bk" onclick="lgGo('${to}')">‹ ${lab}</button>`;
  let body;
  if (V === 'home') body = lgHome(l);
  else if (V === 'add') body = lgAddForm();
  else if (V === 'more') body = back('home', 'খাতায় ফিরুন') + lgMore();
  else {
    const hero = `<div class="lhero"><div class="lm"><button onclick="lgMonth(-1)">‹</button><b>${lmName(lm)}</b><button onclick="lgMonth(1)">›</button></div></div>`;
    const sub = {cal: () => hero + lCal(l), sum: () => hero + lSum(l), loan: () => lLoan(l), save: () => lSave(l), budget: lgBudgetV, debt: () => lgDebtV(l), count: lgCountV, age: lgAgeV, salary: lgSalaryV, price: lgPriceV};
    body = back('more', 'আরও দেখুন') + (sub[V] ? sub[V]() : '');
  }
  render(pageHead('আয়-খরচ খাতা') + `<div class="pad lg">${body}</div><div class="lg-fab" onclick="lgCalc()">🧮</div>`);
}
function lgHome(l) {
  const t = todayISO(), inc = lsum(l.entries, 'in'), out = lsum(l.entries, 'out'), cur = lmstat(l, t.slice(0, 7)), prev = lmstat(l, lshift(t.slice(0, 7), -1));
  const sv = l.goals.reduce((a, g) => a + g.saved, 0), cell = (lab, v, col) => `<div><span>${lab}</span><b style="color:${col}">${tk(v)}</b></div>`;
  const stT = [['d', '📅 দৈনিক'], ['m', '🗓️ মাসিক'], ['y', '📆 বার্ষিক']];
  let es = l.entries.slice().sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  if (LG_F === 'in') es = es.filter(e => e.type === 'in'); else if (LG_F === 'out') es = es.filter(e => e.type === 'out'); else if (LG_F === 'month') es = es.filter(e => e.date.slice(0, 7) === t.slice(0, 7)); else if (LG_F === 'today') es = es.filter(e => e.date === t);
  const more = es.length > 40; es = es.slice(0, 40);
  return `<div class="lg-sum"><div class="lg3">${cell('মোট আয়', inc, '#15803d')}${cell('মোট খরচ', out, '#dc2626')}${cell('মোট ব্যালেন্স', inc - out, inc - out < 0 ? '#dc2626' : 'inherit')}</div>
    <div class="lg2">${cell('এই মাসের ব্যালেন্স', cur.net, '#b45309')}${cell('গত মাসের ব্যালেন্স', prev.net, '#0e7490')}</div>
    <div class="lg3">${cell('সঞ্চয়', sv, '#be185d')}${cell('দেনা', lgDebtSum(l, 'owe'), '#7e22ce')}${cell('পাওনা', lgDebtSum(l, 'due'), '#7e22ce')}</div></div>
    <div class="lg-bt"><button class="o" onclick="lgNew('out')">👛 খরচ লিখুন ➖</button><button class="i" onclick="lgNew('in')">💰 আয় লিখুন ➕</button></div>
    <div class="lg-h"><span>আয়-খরচের পরিসংখ্যান</span></div>
    <div class="lg-st">${stT.map(x => `<button class="${LG_ST === x[0] ? 'on' : ''}" onclick="LG_ST='${x[0]}';ledgerPage()">${x[1]}</button>`).join('')}</div>
    ${lgStat(l)}
    <button class="lg-more" onclick="lgGo('more')">⋮⋮⋮ আরও দেখুন</button>
    <div class="lg-hh"><b>আয়-খরচের ইতিহাস</b><select onchange="LG_F=this.value;ledgerPage()">${[['all', 'সব'], ['today', 'আজ'], ['month', 'এই মাস'], ['in', 'শুধু আয়'], ['out', 'শুধু খরচ']].map(o => `<option value="${o[0]}" ${LG_F === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
    ${es.map(e => `<div class="lg-r"><div class="ic" style="background:${e.type === 'in' ? '#dcfce7' : '#fee2e2'}">${e.type === 'in' ? '💰' : '💸'}</div><div style="min-width:0;flex:1"><b>${esc(e.cat || (e.type === 'in' ? 'আয়' : 'খরচ'))}</b><small>${lgDate(e.date)}${e.note ? ' • ' + esc(e.note) : ''}</small></div><span class="am" style="color:${e.type === 'in' ? '#15803d' : '#dc2626'}">${e.type === 'in' ? '+' : '−'}${tk(e.amt)}</span><a href="#" class="x" onclick="lgDel2('${e.id}');return false">✕</a></div>`).join('') || '<div class="hint" style="text-align:center;padding:18px">এখনো কোনো হিসাব নেই। উপরের বাটন দিয়ে শুরু করুন।</div>'}
    ${more ? '<div class="hint" style="text-align:center">সর্বশেষ ৪০টি দেখানো হচ্ছে। পুরোনো দেখতে «আরও দেখুন» → ক্যালেন্ডার।</div>' : ''}`;
}
const lgDate = iso => bn(+iso.slice(8, 10)) + ' ' + L_MON[+iso.slice(5, 7) - 1] + (iso.slice(0, 4) !== todayISO().slice(0, 4) ? ' ' + bn(iso.slice(0, 4)) : '');
function lgStat(l) {
  const t = todayISO();
  if (LG_ST === 'd') { const es = l.entries.filter(e => e.date === t), i = lsum(es, 'in'), o = lsum(es, 'out'); return `<div class="lg-card"><b>আজ, ${lgDate(t)}</b><div class="lg3"><div><span>আয়</span><b style="color:#15803d">${tk(i)}</b></div><div><span>খরচ</span><b style="color:#dc2626">${tk(o)}</b></div><div><span>বাকি</span><b>${tk(i - o)}</b></div></div></div>`; }
  if (LG_ST === 'm') { const s = lmstat(l, t.slice(0, 7)), cat = {}; s.es.filter(e => e.type === 'out').forEach(e => { const k = e.cat || 'অন্যান্য'; cat[k] = (cat[k] || 0) + e.amt; }); if (s.fx) cat['নির্দিষ্ট মাসিক খরচ'] = s.fx; const rows = Object.keys(cat).sort((a, b) => cat[b] - cat[a]).slice(0, 6), mx = Math.max(1, ...rows.map(k => cat[k]));
    return `<div class="lg-card"><b>${lmName(t.slice(0, 7))}</b><div class="lg3"><div><span>আয়</span><b style="color:#15803d">${tk(s.inc)}</b></div><div><span>খরচ</span><b style="color:#dc2626">${tk(s.exp)}</b></div><div><span>${s.net >= 0 ? 'বাঁচল' : 'ঘাটতি'}</span><b>${tk(Math.abs(s.net))}</b></div></div>${rows.map(k => `<div class="crow"><span>${esc(k)}</span><div class="cb"><i style="width:${Math.round(cat[k] / mx * 100)}%"></i></div><b>${tk(cat[k])}</b></div>`).join('')}</div>`; }
  const y = LG_Y || +t.slice(0, 4), mons = Array.from({length: 12}, (_, i) => Object.assign({ym: y + '-' + String(i + 1).padStart(2, '0')}, lmstat(l, y + '-' + String(i + 1).padStart(2, '0')))), mm = Math.max(1, ...mons.map(m => Math.max(m.inc, m.exp))), ti = mons.reduce((a, m) => a + m.inc, 0), te = mons.reduce((a, m) => a + m.exp, 0);
  return `<div class="lg-card"><div class="lg-yn"><button onclick="lgYear(-1)">‹</button><b>${bn(y)} সাল</b><button onclick="lgYear(1)">›</button></div><div class="lg3"><div><span>আয়</span><b style="color:#15803d">${tk(ti)}</b></div><div><span>খরচ</span><b style="color:#dc2626">${tk(te)}</b></div><div><span>সঞ্চয়</span><b>${tk(ti - te)}</b></div></div>${mons.map((m, i) => `<div class="yrow"><span>${L_MSH[i]}</span><div class="yb"><i class="gi2" style="width:${Math.round(m.inc / mm * 100)}%"></i><i class="ro2" style="width:${Math.round(m.exp / mm * 100)}%"></i></div><b style="color:${m.net >= 0 ? '#15803d' : '#b91c1c'}">${m.inc || m.exp ? (m.net < 0 ? '−' : '') + kf(Math.abs(m.net)) : '–'}</b></div>`).join('')}</div>`;
}
function lgNew(ty) { _lt = ty; ld = todayISO(); lm = ld.slice(0, 7); LG_V = 'add'; ledgerPage(); window.scrollTo(0, 0); }
function lgAddForm() {
  const ty = _lt, cats = ty === 'in' ? L_IN : L_OUT;
  return `<button class="lg-bk" onclick="lgGo('home')">‹ ফিরুন</button><div class="lg-card"><b style="font-size:18px">${ty === 'in' ? '💰 আয় লিখুন' : '👛 খরচ লিখুন'}</b>
    <div class="seg" style="margin:10px 0"><button class="${ty === 'out' ? 'on' : ''}" onclick="_lt='out';ledgerPage()">🔴 খরচ</button><button class="${ty === 'in' ? 'on' : ''}" onclick="_lt='in';ledgerPage()">🟢 আয়</button></div>
    <input class="inp" id="ldt" type="date" value="${ld}" onchange="ld=this.value||ld"><input class="inp" id="lc" list="lcl" autocomplete="off" placeholder="কোন খাত — নিজে লিখুন (যেমন: ${ty === 'in' ? 'ট্রিপের আয়' : 'জ্বালানি'})"><datalist id="lcl">${lgCats(ty).map(c => `<option value="${esc(c)}">`).join('')}</datalist><div class="lg-chips">${lgCats(ty).slice(0, 8).map(c => `<button type="button" onclick="document.getElementById('lc').value=this.textContent">${esc(c)}</button>`).join('')}</div>
    <input class="inp" id="la" type="number" inputmode="decimal" min="0" placeholder="টাকা" autofocus><input class="inp" id="ln" placeholder="বিবরণ (ঐচ্ছিক)"><button class="btn" onclick="lgSave2()">💾 সংরক্ষণ</button></div>`;
}
function lgSave2() {
  const amt = parseFloat(document.getElementById('la').value); if (!(amt > 0)) return alert('সঠিক টাকার পরিমাণ দিন।');
  const d = document.getElementById('ldt').value || todayISO(), l = ledgerData(); l.entries.push({id: String(Date.now()), date: d, type: _lt, amt, cat: (document.getElementById('lc').value || '').trim() || (_lt === 'in' ? 'আয়' : 'খরচ'), note: document.getElementById('ln').value.trim()}); saveLedger(l); _lt = 'out'; LG_V = 'home'; ledgerPage();
}
function lgDel2(id) { if (!confirm('এই হিসাবটি মুছবেন?')) return; const l = ledgerData(); l.entries = l.entries.filter(e => e.id !== id); saveLedger(l); ledgerPage(); }
function lgMore() {
  const T = [['debt', '🤝', 'দেনা-পাওনা'], ['save', '🐷', 'সঞ্চয়'], ['budget', '📋', 'বাজেট'], ['count', '💵', 'টাকা গণনা'], ['notes', '📝', 'নোট'], ['age', '⏳', 'বয়স ক্যালকুলেটর'], ['salary', '🧮', 'বেতন ক্যালকুলেটর'], ['price', '🏷️', 'মূল্য ক্যালকুলেটর'], ['cal', '📅', 'ক্যালেন্ডার'], ['sum', '📊', 'মাস-বছরের হিসাব'], ['loan', '💳', 'কিস্তি ও নির্দিষ্ট খরচ'], ['logbook', '🚖', 'ড্রাইভার লগ বুক']];
  return `<div class="lg-grid">${T.map(x => `<div onclick="${x[0] === 'notes' ? "open_('notes')" : x[0] === 'logbook' ? "open_('logbook')" : `lgGo('${x[0]}')`}"><span>${x[1]}</span>${x[2]}</div>`).join('')}</div>`;
}
function lgDebtV(l) {
  const ds = lgDebts(l);
  const item = (d, i) => { const rem = Math.max(0, d.amt - (d.paid || 0)); return `<div class="lg-card" style="margin:8px 0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${d.type === 'owe' ? '🔻 দেব' : '🔺 পাব'}: ${esc(d.who)}</b><a href="#" onclick="lgDebtDel(${i});return false">🗑️</a></div>
    <small>মোট ${tk(d.amt)} • ${d.type === 'owe' ? 'দিয়েছি' : 'পেয়েছি'} ${tk(d.paid || 0)} • <b>বাকি ${tk(rem)}</b>${d.note ? ' • ' + esc(d.note) : ''}</small>
    ${rem > 0 ? `<div style="display:flex;gap:6px;margin-top:6px"><input class="inp" style="margin:0" id="dp${i}" type="number" min="0" placeholder="${d.type === 'owe' ? 'কত দিলেন' : 'কত পেলেন'}"><button class="btn sm" style="margin:0" onclick="lgDebtPay(${i})">যোগ</button></div>` : '<div style="color:#15803d;font-weight:700">✅ মিটে গেছে</div>'}</div>`; };
  return `<div class="lg-card"><b>🤝 দেনা-পাওনা</b><div class="lg2"><div><span>আমি দেব (দেনা)</span><b style="color:#7e22ce">${tk(lgDebtSum(l, 'owe'))}</b></div><div><span>আমি পাব (পাওনা)</span><b style="color:#7e22ce">${tk(lgDebtSum(l, 'due'))}</b></div></div></div>
    ${ds.map(item).join('') || '<div class="hint" style="text-align:center;padding:12px">এখনো কিছু লেখা নেই।</div>'}
    <div class="lg-card"><b>➕ নতুন যোগ করুন</b><div class="seg" style="margin:8px 0"><button id="dt_o" class="on" onclick="LGDT='owe';this.className='on';document.getElementById('dt_d').className=''">🔻 আমি দেব</button><button id="dt_d" onclick="LGDT='due';this.className='on';document.getElementById('dt_o').className=''">🔺 আমি পাব</button></div>
    <input class="inp" id="dw" placeholder="কার সাথে (নাম)"><input class="inp" id="da" type="number" inputmode="decimal" min="0" placeholder="টাকা"><input class="inp" id="dn" placeholder="বিবরণ (ঐচ্ছিক)"><button class="btn" onclick="lgDebtAdd()">💾 সংরক্ষণ</button></div>`;
}
let LGDT = 'owe';
function lgDebtAdd() { const w = gv2('dw'), a = +gv2('da'); if (!w || !(a > 0)) return alert('নাম ও টাকা দিন।'); const l = ledgerData(); lgDebts(l).push({id: String(Date.now()), who: w, amt: a, paid: 0, type: LGDT, note: gv2('dn'), date: todayISO()}); LGDT = 'owe'; saveLedger(l); ledgerPage(); }
function lgDebtPay(i) { const v = +gv2('dp' + i); if (!(v > 0)) return; const l = ledgerData(), d = lgDebts(l)[i]; d.paid = Math.min(d.amt, (d.paid || 0) + v); saveLedger(l); ledgerPage(); }
function lgDebtDel(i) { if (!confirm('এটি মুছবেন?')) return; const l = ledgerData(); lgDebts(l).splice(i, 1); saveLedger(l); ledgerPage(); }
function lgCountV() {
  const D = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
  return `<div class="lg-card"><b>💵 টাকা গণনা</b><div class="hint">কোন নোট কয়টি আছে লিখুন, মোট নিজে হিসাব হবে।</div>${D.map(d => `<div class="lg-dn"><span>৳${bn(d)} ×</span><input type="number" inputmode="numeric" min="0" id="dn${d}" oninput="lgCountCalc()" placeholder="০"><b id="ds${d}">০</b></div>`).join('')}
    <div class="lg-tot"><span>মোট টাকা</span><b id="dtot">৳০</b></div><div class="lg-tot" style="background:#eef2ff"><span>নোট/কয়েন মোট</span><b id="dcnt">০টি</b></div><button class="btn sm" style="background:#64748b" onclick="lgCountReset()">আবার শুরু</button></div>`;
}
function lgCountCalc() { const D = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]; let s = 0, c = 0; D.forEach(d => { const n = Math.max(0, Math.floor(+document.getElementById('dn' + d).value || 0)); s += n * d; c += n; document.getElementById('ds' + d).textContent = bn(n * d); }); document.getElementById('dtot').textContent = '৳' + bn(s.toLocaleString('en-US')); document.getElementById('dcnt').textContent = bn(c) + 'টি'; }
function lgCountReset() { lgGo('count'); }
function lgAgeV() {
  return `<div class="lg-card"><b>⏳ বয়স ক্যালকুলেটর</b><label class="lg-l">জন্ম তারিখ</label><input class="inp" id="ab" type="date" oninput="lgAgeCalc()"><label class="lg-l">কোন তারিখ পর্যন্ত (ফাঁকা = আজ)</label><input class="inp" id="ae" type="date" oninput="lgAgeCalc()"><div id="aout" class="lg-res">জন্ম তারিখ দিন</div></div>`;
}
function lgAgeCalc() {
  const b = document.getElementById('ab').value, e = document.getElementById('ae').value || todayISO(), o = document.getElementById('aout'); if (!b) { o.textContent = 'জন্ম তারিখ দিন'; return; }
  const B = new Date(b + 'T00:00:00'), E = new Date(e + 'T00:00:00'); if (E < B) { o.textContent = 'শেষ তারিখ জন্মের আগে হতে পারে না।'; return; }
  let y = E.getFullYear() - B.getFullYear(), m = E.getMonth() - B.getMonth(), d = E.getDate() - B.getDate();
  if (d < 0) { m--; d += new Date(E.getFullYear(), E.getMonth(), 0).getDate(); } if (m < 0) { y--; m += 12; }
  let nb = new Date(E.getFullYear(), B.getMonth(), B.getDate()); if (nb < E) nb = new Date(E.getFullYear() + 1, B.getMonth(), B.getDate());
  o.innerHTML = `<b style="font-size:22px">${bn(y)} বছর ${bn(m)} মাস ${bn(d)} দিন</b><br>মোট ${bn(Math.round((E - B) / 864e5))} দিন<br>পরের জন্মদিন ${bn(Math.round((nb - E) / 864e5))} দিন পরে`;
}
function lgSalaryV() {
  const f = (id, lab, ph, v) => `<label class="lg-l">${lab}</label><input class="inp" id="${id}" type="number" inputmode="decimal" min="0" value="${v || ''}" placeholder="${ph}" oninput="lgSalCalc()">`;
  return `<div class="lg-card"><b>🧮 বেতন ক্যালকুলেটর</b><div class="hint">মূল বেতন, ভাতা, ওভারটাইম ও কর্তন দিয়ে হাতে পাওয়া বেতন।</div>${f('sb', 'মূল বেতন (৳)', '১৫০০০')}${f('sa', 'মোট ভাতা (বাড়ি, যাতায়াত ইত্যাদি) (৳)', '০')}${f('sd', 'অনুপস্থিত দিন', '০')}${f('so', 'ওভারটাইম ঘণ্টা', '০')}${f('sx', 'অন্যান্য কর্তন (অগ্রিম, ট্যাক্স) (৳)', '০')}<div id="sout" class="lg-res">মূল বেতন দিন</div>
  <div class="hint">হিসাব: অনুপস্থিতির কর্তন = (মূল বেতন ÷ ৩০) × দিন। ওভারটাইম = (মূল বেতন ÷ ২০৮) × ২ × ঘণ্টা (শ্রম আইনের সাধারণ নিয়ম)। আপনার অফিসের নিয়ম ভিন্ন হলে সংখ্যা মিলিয়ে নিন।</div></div>`;
}
function lgSalCalc() {
  const g = id => +document.getElementById(id).value || 0, b = g('sb'), a = g('sa'), d = g('sd'), h = g('so'), x = g('sx'), o = document.getElementById('sout'); if (!b) { o.textContent = 'মূল বেতন দিন'; return; }
  const ab = b / 30 * d, ot = b / 208 * 2 * h, net = b + a - ab + ot - x, r = n => tk(Math.round(n * 100) / 100);
  o.innerHTML = `মূল বেতন + ভাতা: ${r(b + a)}<br>অনুপস্থিতির কর্তন: −${r(ab)}<br>ওভারটাইম: +${r(ot)}<br>অন্যান্য কর্তন: −${r(x)}<hr><b style="font-size:22px">হাতে পাবেন: ${r(net)}</b>`;
}
function lgPriceV() {
  const f = (id, lab, ph, v) => `<label class="lg-l">${lab}</label><input class="inp" id="${id}" type="number" inputmode="decimal" min="0" value="${v || ''}" placeholder="${ph}" oninput="lgPriCalc()">`;
  return `<div class="lg-card"><b>🏷️ মূল্য ক্যালকুলেটর</b>${f('pp', 'একটির দাম (৳)', '১০০০')}${f('pq', 'পরিমাণ', '১', 1)}${f('pd', 'ছাড় (%)', '০')}${f('pv', 'ভ্যাট/ট্যাক্স (%)', '০')}<div id="pout" class="lg-res">দাম দিন</div></div>`;
}
function lgPriCalc() {
  const g = id => +document.getElementById(id).value || 0, p = g('pp'), q = g('pq') || 1, d = g('pd'), v = g('pv'), o = document.getElementById('pout'); if (!p) { o.textContent = 'দাম দিন'; return; }
  const sub = p * q, dis = sub * d / 100, af = sub - dis, vat = af * v / 100, tot = af + vat, r = n => tk(Math.round(n * 100) / 100);
  o.innerHTML = `মোট দাম: ${r(sub)}<br>ছাড়: −${r(dis)}<br>ছাড়ের পরে: ${r(af)}<br>ভ্যাট/ট্যাক্স: +${r(vat)}<hr><b style="font-size:22px">দিতে হবে: ${r(tot)}</b>${q > 1 ? `<br>প্রতিটির দাম: ${r(tot / q)}` : ''}`;
}
// সাধারণ ক্যালকুলেটর (ভাসমান বাটন)
let LGC = '';
function lgCalc() {
  if (document.getElementById('lgcalc')) return lgCalcClose(); LGC = '';
  const k = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '(', ')'], el = document.createElement('div'); el.id = 'lgcalc';
  el.innerHTML = `<div class="lgc-b" onclick="lgCalcClose()"></div><div class="lgc"><div class="lgc-x" onclick="lgCalcClose()">✕</div><div id="lgcd" class="lgc-d">০</div><div class="lgc-g">${k.map(x => `<button class="${/[÷×−+%]/.test(x) ? 'op' : x === 'C' || x === '⌫' ? 'cl' : ''}" onclick="lgKey('${x}')">${/\d/.test(x) ? bn(x) : x}</button>`).join('')}<button class="eq" onclick="lgKey('=')">=</button></div></div>`; document.body.appendChild(el);
}
function lgCalcClose() { const e = document.getElementById('lgcalc'); if (e) e.remove(); }
function lgKey(k) {
  if (k === 'C') LGC = ''; else if (k === '⌫') LGC = LGC.slice(0, -1);
  else if (k === '=') { try { const e = LGC.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/(\d+(?:\.\d+)?)%/g, '($1/100)'); if (/^[0-9+\-*/.()\s]+$/.test(e) && e) { const v = Function('"use strict";return (' + e + ')')(); LGC = isFinite(v) ? String(Math.round(v * 1e8) / 1e8) : ''; } } catch (x) { LGC = ''; } }
  else LGC += k;
  const d = document.getElementById('lgcd'); if (d) d.textContent = LGC ? bn(LGC) : '০';
}
(function () { const st = document.createElement('style'); st.textContent = `
.lg .lg3{display:grid;grid-template-columns:repeat(3,1fr);text-align:center}.lg .lg2{display:grid;grid-template-columns:1fr 1fr;text-align:center}.lg .lg3>div,.lg .lg2>div{padding:10px 2px;border-bottom:2px dashed #cbd5e1;font-size:13.5px}.lg .lg3 span,.lg .lg2 span{display:block;color:#475569}.lg .lg3 b,.lg .lg2 b{display:block;font-size:17px;margin-top:3px}
.lg-sum{background:#fff;border-radius:14px;padding:4px 6px;box-shadow:0 1px 6px #0001}.lg-bt{display:flex;gap:10px;margin:12px 0}.lg-bt button{flex:1;border:0;border-radius:12px;padding:15px 6px;color:#fff;font:inherit;font-weight:800;font-size:16px}.lg-bt .o{background:#f97316}.lg-bt .i{background:#0b7ac9}
.lg-h{display:flex;align-items:center;gap:8px;font-weight:700;color:#475569;margin:6px 0}.lg-h:before,.lg-h:after{content:'';flex:1;border-top:1px solid #cbd5e1}.lg-st{display:flex;gap:6px;background:#eef1f6;border-radius:12px;padding:3px}.lg-st button{flex:1;border:0;background:transparent;border-radius:9px;padding:9px 2px;font:inherit;font-weight:700;color:#334155}.lg-st button.on{background:#0b7ac9;color:#fff}
.lg-card{background:#fff;border-radius:14px;padding:12px;margin:10px 0;box-shadow:0 1px 6px #0001}.lg-more{display:block;margin:14px auto;border:1.5px solid #64748b;background:transparent;border-radius:30px;padding:12px 30px;color:#0b7ac9;font:inherit;font-weight:800}
.lg-hh{display:flex;justify-content:space-between;align-items:center;margin-top:8px}.lg-hh select{border:1px solid #cbd5e1;border-radius:8px;padding:6px;font:inherit;background:#fff}.lg-r{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid #e5e7eb}.lg-r .ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}.lg-r small{display:block;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lg-r .am{font-weight:800;white-space:nowrap}.lg-r .x{color:#94a3b8;text-decoration:none;padding:4px 6px}
.lg-bk{border:0;background:#e2e8f0;border-radius:10px;padding:8px 14px;font:inherit;font-weight:700;margin:2px 0 6px}.lg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px 6px;text-align:center;font-size:13.5px;padding:10px 0}.lg-grid>div{padding:6px 2px}.lg-grid span{display:block;font-size:40px;margin-bottom:4px}
.lg-l{display:block;font-size:12.5px;font-weight:700;color:#64748b;margin-top:8px}.lg-res{background:#f1f5f9;border-radius:12px;padding:12px;margin-top:12px;line-height:1.7}.lg-dn{display:flex;align-items:center;gap:8px;margin:6px 0}.lg-dn span{width:84px;font-weight:700}.lg-dn input{flex:1;height:40px;border:1.5px solid #d5dbe8;border-radius:10px;padding:0 10px;font:inherit;font-size:16px;min-width:0}.lg-dn b{width:90px;text-align:right}.lg-tot{display:flex;justify-content:space-between;background:#dcfce7;border-radius:12px;padding:12px;margin:8px 0;font-weight:800;font-size:17px}
.lg-fab{position:fixed;right:18px;bottom:22px;width:58px;height:58px;border-radius:18px;background:#9fd0f5;display:flex;align-items:center;justify-content:center;font-size:27px;box-shadow:0 3px 10px #0004;z-index:50}
#lgcalc{position:fixed;inset:0;z-index:300}.lgc-b{position:absolute;inset:0;background:#0006}.lgc{position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:22px 22px 0 0;padding:14px 14px 20px;max-width:520px;margin:0 auto}.lgc-x{text-align:right;font-size:20px;padding:0 6px}.lgc-d{background:#f1f5f9;border-radius:12px;padding:16px;text-align:right;font-size:30px;font-weight:700;min-height:68px;overflow-x:auto;word-break:break-all}
.lgc-g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.lgc-g button{height:54px;border:0;border-radius:14px;background:#e8edf5;font:inherit;font-size:22px;font-weight:700;color:#111}.lgc-g .op{background:#dbeafe;color:#1d4ed8}.lgc-g .cl{background:#fee2e2;color:#b91c1c}.lgc-g .eq{grid-column:span 4;background:#0b7ac9;color:#fff}
body.dark .lg-sum,body.dark .lg-card,body.dark .lg-hh select{background:#1f2937}body.dark .lg .lg3 span,body.dark .lg .lg2 span{color:#cbd5e1}body.dark .lg-res,body.dark .lg-st{background:#243244}body.dark .lgc{background:#1f2937}body.dark .lgc-d{background:#243244}body.dark .lgc-g button{background:#334155;color:#fff}`; document.head.appendChild(st); })();

// ---------- খাত (ক্যাটাগরি): নিজে লেখা + আগে লেখাগুলো মনে রাখে ----------
function lgCats(ty) { const l = ledgerData(), cnt = {}; l.entries.filter(e => e.type === ty && e.cat).forEach(e => { cnt[e.cat] = (cnt[e.cat] || 0) + 1; }); const used = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]); return used.concat((ty === 'in' ? L_IN : L_OUT).filter(c => !used.includes(c))); }
// ---------- বাজেট (খাত ধরে ভাগ করা) ----------
let LG_B = '', LG_BN = false, LG_BE = false, LG_BI = -1;
const lgBs = l => (l.budgets = l.budgets || []);
const lgIS = x => x.spent != null ? x.spent : (x.done ? x.amt : 0);
const lgBSpent = b => (b.items || []).reduce((a, x) => a + lgIS(x), 0), lgBPlan = b => (b.items || []).reduce((a, x) => a + x.amt, 0);
const LG_BSUG = ['বাড়ি ভাড়া', 'দোকান বাকি', 'বাজার', 'বিদ্যুৎ বিল', 'গ্যাস/পানি', 'মোবাইল/নেট', 'চিকিৎসা', 'পড়াশোনা', 'যাতায়াত', 'কিস্তি', 'দান/উপহার', 'জ্বালানি'];
const lgBar = (sp, base) => `<div class="lbar d"><i style="width:${base ? Math.min(100, Math.round(sp / base * 100)) : 0}%;background:${sp > base ? '#ef4444' : '#22c55e'}"></i></div>`;
function lgBudgetV() {
  const l = ledgerData(), bs = lgBs(l);
  if (LG_B) { const b = bs.find(x => x.id === LG_B); if (b) return lgBudgetDetail(b); LG_B = ''; }
  const s = lmstat(l, lm);
  const lim = `<div class="lg-card"><b>🎯 মাসিক মোট খরচের সীমা (ঐচ্ছিক)</b><div class="hint">মাসে সব মিলিয়ে সর্বোচ্চ কত খরচ। ছাড়ালে হোমে সতর্ক করবে।</div><div style="display:flex;gap:6px"><input class="inp" style="margin:0" id="lb" type="number" min="0" value="${l.budget || ''}" placeholder="যেমন: ২০০০০"><button class="btn sm" style="margin:0" onclick="setBudget()">সেট</button></div>
    ${l.budget ? lgBar(s.exp, l.budget) + `<small>${lmName(lm)}: ${tk(s.exp)} / ${tk(l.budget)}</small>` : ''}</div>`;
  const form = LG_BN ? `<div class="lg-card"><b>➕ নতুন বাজেট</b><input class="inp" id="bnm" placeholder="নাম (যেমন: সাংসারিক বাজেট, ঈদের বাজেট)"><div class="hint">তৈরির পর ভেতরে খাত ধরে টাকা ভাগ করবেন।</div><div style="display:flex;gap:8px"><button class="btn" style="flex:1" onclick="lgBNew()">তৈরি করুন</button><button class="btn" style="background:#64748b" onclick="LG_BN=false;ledgerPage()">বাতিল</button></div></div>` : '';
  return `<div class="lg-card" style="margin-top:0"><b style="font-size:18px">📋 বাজেট তালিকা</b><div class="hint">যেমন «সাংসারিক বাজেট» বানিয়ে তাতে খাত ধরে লিখুন: বাড়ি ভাড়া কত, দোকান বাকি কত, বাজার কত।</div></div>${form}
    ${bs.map(b => { const sp = lgBSpent(b), pl = lgBPlan(b); return `<div class="lg-card lg-bc" onclick="LG_B='${b.id}';LG_BE=false;LG_BI=-1;ledgerPage()"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:17px">${esc(b.name)}</b><a href="#" class="x" onclick="event.stopPropagation();lgBDel('${b.id}');return false">🗑️</a></div>
      <small>বাজেট ${tk(pl)} • খরচ ${tk(sp)} • ${pl - sp >= 0 ? 'বাকি ' + tk(pl - sp) : '<b style="color:#dc2626">বেশি ' + tk(sp - pl) + '</b>'}</small><div style="margin-top:6px">${lgBar(sp, pl)}</div><small style="color:#94a3b8">${bn((b.items || []).length)}টি খাত • ${lgDate(b.date || todayISO())}</small></div>`; }).join('') || (LG_BN ? '' : '<div class="hint" style="text-align:center;padding:14px">এখনো কোনো বাজেট নেই।</div>')}
    ${LG_BN ? '' : '<button class="btn" onclick="LG_BN=true;ledgerPage()">➕ নতুন বাজেট তৈরি করুন</button>'}${lim}`;
}
function lgBNew() { const n = gv2('bnm'); if (!n) return alert('বাজেটের নাম দিন।'); const l = ledgerData(), id = String(Date.now()); lgBs(l).unshift({id, name: n, date: todayISO(), items: []}); saveLedger(l); LG_BN = false; LG_B = id; ledgerPage(); }
function lgBDel(id) { if (!confirm('এই বাজেটটি পুরো মুছবেন?')) return; const l = ledgerData(); l.budgets = lgBs(l).filter(b => b.id !== id); saveLedger(l); if (LG_B === id) LG_B = ''; ledgerPage(); }
function lgBudgetDetail(b) {
  const sp = lgBSpent(b), pl = lgBPlan(b), left = pl - sp, its = b.items || [];
  const edit = LG_BE ? `<div class="lg-card"><b>✏️ বাজেটের নাম</b><input class="inp" id="ben" value="${esc(b.name)}"><div style="display:flex;gap:8px"><button class="btn" style="flex:1" onclick="lgBEdit()">সংরক্ষণ</button><button class="btn" style="background:#64748b" onclick="LG_BE=false;ledgerPage()">বাতিল</button></div></div>` : '';
  const item = (x, i) => { const s = lgIS(x), r = x.amt - s; return LG_BI === i ? `<div class="lg-card" style="margin:8px 0"><b>✏️ খাত বদলান</b><input class="inp" id="xn" value="${esc(x.n)}"><input class="inp" id="xa" type="number" inputmode="decimal" min="0" value="${x.amt || ''}" placeholder="বাজেট (৳)"><div style="display:flex;gap:8px"><button class="btn" style="flex:1" onclick="lgBItemEdit(${i})">সংরক্ষণ</button><button class="btn" style="background:#64748b" onclick="LG_BI=-1;ledgerPage()">বাতিল</button></div></div>` :
    `<div class="lg-card" style="margin:8px 0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${esc(x.n)}</b><span><a href="#" class="x" style="text-decoration:none" onclick="LG_BI=${i};ledgerPage();return false">✏️</a> <a href="#" class="x" style="text-decoration:none" onclick="lgBItemDel(${i});return false">🗑️</a></span></div>
      <div class="lg3"><div><span>বাজেট</span><b>${tk(x.amt)}</b></div><div><span>খরচ</span><b style="color:#dc2626">${tk(s)}</b></div><div><span>${r >= 0 ? 'বাকি' : 'বেশি'}</span><b style="color:${r >= 0 ? '#15803d' : '#dc2626'}">${tk(Math.abs(r))}</b></div></div>${lgBar(s, x.amt)}
      <div style="display:flex;gap:6px;margin-top:8px"><input class="inp" style="margin:0" id="sp${i}" type="number" inputmode="decimal" min="0" placeholder="কত খরচ করলেন"><button class="btn sm" style="margin:0" onclick="lgBSpend(${i})">+ খরচ</button></div></div>`; };
  return `<button class="lg-bk" onclick="LG_B='';ledgerPage()">‹ সব বাজেট</button>
    <div class="lg-card"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:19px">${esc(b.name)}</b><a href="#" class="x" style="font-size:20px;text-decoration:none" onclick="LG_BE=true;ledgerPage();return false">✏️</a></div>
      <div class="lg3"><div><span>মোট বাজেট</span><b>${tk(pl)}</b></div><div><span>মোট খরচ</span><b style="color:#dc2626">${tk(sp)}</b></div><div><span>${left >= 0 ? 'বাকি' : 'বেশি'}</span><b style="color:${left >= 0 ? '#15803d' : '#dc2626'}">${tk(Math.abs(left))}</b></div></div>${lgBar(sp, pl)}</div>${edit}
    ${its.map(item).join('') || '<div class="hint" style="text-align:center;padding:10px">নিচে খাত যোগ করুন। যেমন: বাড়ি ভাড়া, দোকান বাকি।</div>'}
    <div class="lg-card"><b>➕ নতুন খাত</b><input class="inp" id="bin" placeholder="খাতের নাম (নিজে লিখুন)"><div class="lg-chips">${LG_BSUG.map(c => `<button type="button" onclick="document.getElementById('bin').value=this.textContent">${c}</button>`).join('')}</div><input class="inp" id="bia" type="number" inputmode="decimal" min="0" placeholder="এই খাতে কত টাকা বাজেট"><button class="btn" onclick="lgBItemAdd()">+ খাত যোগ করুন</button></div>
    <button class="btn" style="background:#0b7ac9" onclick="lgBToLedger()">📒 খরচগুলো আয়-খরচ খাতায় লিখুন</button><div class="hint">যতবার চাপুন, শুধু নতুন খরচটুকু যোগ হবে। আগেরটা দুবার যোগ হবে না।</div>`;
}
function lgBCur(f) { const l = ledgerData(), b = lgBs(l).find(x => x.id === LG_B); if (!b) return; f(b, l); saveLedger(l); ledgerPage(); }
function lgBEdit() { const n = gv2('ben'); if (!n) return alert('নাম দিন।'); lgBCur(b => { b.name = n; LG_BE = false; }); }
function lgBItemAdd() { const n = gv2('bin'), a = +gv2('bia') || 0; if (!n) return alert('খাতের নাম দিন।'); lgBCur(b => { (b.items = b.items || []).push({id: String(Date.now()), n, amt: a, spent: 0, synced: 0}); }); }
function lgBItemEdit(i) { const n = gv2('xn'); if (!n) return alert('নাম দিন।'); lgBCur(b => { b.items[i].n = n; b.items[i].amt = +gv2('xa') || 0; LG_BI = -1; }); }
function lgBSpend(i) { const v = +gv2('sp' + i); if (!(v > 0)) return; lgBCur(b => { const x = b.items[i]; x.spent = lgIS(x) + v; }); }
function lgBItemDel(i) { if (!confirm('এই খাতটি মুছবেন?')) return; lgBCur(b => { b.items.splice(i, 1); }); }
function lgBToLedger() { let n = 0; lgBCur((b, l) => { (b.items || []).forEach(x => { const d = lgIS(x) - (x.synced || 0); if (d > 0) { l.entries.push({id: String(Date.now()) + n++, date: todayISO(), type: 'out', amt: d, cat: x.n, note: b.name}); x.synced = lgIS(x); x.spent = lgIS(x); } }); }); alert(n ? 'খরচ খাতায় লেখা হয়েছে।' : 'নতুন কোনো খরচ নেই।'); }
// ---------- ব্যাক চাপলে খাতার ভেতরেই এক ধাপ পিছনে ----------
let LG_RN = -1;
{ const lp = ledgerPage; ledgerPage = function () { lp(); LG_RN = window.__rn; }; }
window.__lgBack = function () {
  if (document.getElementById('lgcalc')) { lgCalcClose(); return true; }
  if (LG_RN !== window.__rn) return false;
  if (LG_V === 'home') return false;
  if (LG_V === 'budget' && (LG_B || LG_BN)) { LG_B = ''; LG_BN = false; LG_BE = false; LG_BI = -1; }
  else LG_V = 'home';
  ledgerPage(); window.scrollTo(0, 0); return true;
};
(function () { const st = document.createElement('style'); st.textContent = '.lg-bc{cursor:pointer}.lg-chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}.lg-chips button{border:1px solid #cbd5e1;background:#f1f5f9;border-radius:16px;padding:6px 12px;font:inherit;font-size:13px;color:#334155}body.dark .lg-chips button{background:#243244;color:#e2e8f0;border-color:#475569}'; document.head.appendChild(st); })();

// =====================================================================
//  নতুন প্রিমিয়াম ডিজাইন (ND): নতুন হোম, নিচের বার, «+» দ্রুত লেখা, সাইড তালিকা, সব মেনু
//  ড্রয়ারের «ডিজাইন ও মেনুর ধরন» থেকে আগের ডিজাইনে ফেরা যায়।
// =====================================================================
const ndOn = () => { try { return localStorage.getItem('nd') !== '0'; } catch (e) { return true; } };
const ndLay = () => { try { return localStorage.getItem('ndlay') || 'bar'; } catch (e) { return 'bar'; } };
const ndLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
let _home0 = null;
function ndInit() {
  if (!_home0) {
    _home0 = home; home = function (q) { return ndOn() ? ndHome(q || '') : _home0(q); };
    const r1 = render; render = function (h) { r1(h); document.body.classList.remove('dopen'); try { ndHi(); } catch (e) {} };
    const td = toggleDrawer; toggleDrawer = function () { td(); document.body.classList.toggle('dopen', !!document.querySelector('#drw.open')); };
    const lb0 = window.__lgBack; window.__lgBack = function () { if (ndSheetClose()) return true; return lb0 ? lb0() : false; };
    window.addEventListener('resize', () => { try { ndApply(); } catch (e) {} });
    document.addEventListener('focusin', e => { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'checkbox' && e.target.type !== 'radio' && e.target.type !== 'range') document.body.classList.add('kb'); });
    document.addEventListener('focusout', () => setTimeout(() => { const a = document.activeElement; if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) document.body.classList.remove('kb'); }, 150));
    setInterval(() => { try { ndApply(true); } catch (e) {} }, 2500);
  }
  ndApply();
  if (ndOn() && document.querySelector('.hrow')) home();
}
function ndApply(soft) {
  const b = document.body, on = ndOn(), lay = ndLay(), want = [on && 'nd', on && lay !== 'rail' && 'ndbar', on && lay !== 'bar' && 'ndrail'].filter(Boolean).join(' ');
  if (soft && b.dataset.ndc === want && (!!document.getElementById('ndnav') === (on && lay !== 'rail')) && (!!document.getElementById('ndrail') === (on && lay !== 'bar'))) return;
  b.dataset.ndc = want; ['nd', 'ndbar', 'ndrail'].forEach(c => b.classList.toggle(c, want.split(' ').includes(c)));
  let n = document.getElementById('ndnav'); if (on && lay !== 'rail') { if (!n) { n = document.createElement('div'); n.id = 'ndnav'; document.body.appendChild(n); } n.innerHTML = [['home', '🏠', 'হোম'], ['prep', '📚', 'প্রস্তুতি'], ['plus'], ['led', '📒', 'খাতা'], ['me', '👤', 'আমি']].map(x => x[0] === 'plus' ? `<div class="plus" onclick="ndSheet()">+</div>` : `<div data-k="${x[0]}" onclick="ndGo('${x[0]}')"><span>${x[1]}</span>${x[2]}</div>`).join(''); } else if (n) n.remove();
  let r = document.getElementById('ndrail'); if (on && lay !== 'bar') { if (!r) { r = document.createElement('div'); r.id = 'ndrail'; document.body.appendChild(r); } r.innerHTML = `<div class="rl">${appLogoHtml()}</div>` + [['home', '🏠', 'হোম'], ['job', '💼', 'জব'], ['prep', '📚', 'প্রস্তুতি'], ['lic', '🪪', 'লাইসেন্স'], ['log', '🚖', 'লগ'], ['led', '💰', 'খাতা'], ['rem', '⏰', 'রিমাই.'], ['all', '☰', 'সব']].map(x => `<div data-k="${x[0]}" onclick="ndGo('${x[0]}')">${x[1]}<small>${x[2]}</small></div>`).join(''); } else if (r) r.remove();
  ndHi();
}
function ndHi() {
  const a = window.__ndRn === window.__rn ? window.__ndA : ''; document.querySelectorAll('#ndnav [data-k],#ndrail [data-k]').forEach(e => e.classList.toggle('on', e.dataset.k === a));
}
function ndGo(k) {
  ndSheetClose(); closeModal();
  const M = {job: 'job', prep: 'jobprep', lic: 'licguide', log: 'logbook', led: 'ledger', rem: 'remind', me: 'account'};
  if (k === 'home') home(); else if (k === 'all') ndAll(); else { stack = []; open_(M[k]); }
  window.__ndA = k; window.__ndRn = window.__rn; ndHi();
}
// ---------- «+» দ্রুত লেখা ----------
function ndSheetClose() { const s = document.getElementById('ndsheet'); if (s) { s.remove(); return true; } return false; }
const NDQ_DEF = ['in', 'out', 'trip', 'debt', 'budget', 'note', 'rem', 'calc', 'all'];
const NDQ_B = {in: ['💰', 'আয়', '#dcfce7'], out: ['💸', 'খরচ', '#fee2e2'], trip: ['🚖', 'নতুন যাত্রা', '#dbeafe'], debt: ['🤝', 'দেনা-পাওনা', '#fef3c7'], budget: ['📋', 'বাজেট', '#ede9fe'], note: ['📝', 'নোট', '#e2e8f0'], rem: ['⏰', 'রিমাইন্ডার', '#ffe4e6'], calc: ['🧮', 'ক্যালকুলেটর', '#cffafe'], all: ['⋯', 'সব মেনু', '#f1f5f9']};
let NDQE = false;
function ndqList() { try { const v = JSON.parse(localStorage.getItem('ndq') || 'null'); if (Array.isArray(v) && v.length) return v; } catch (e) {} return NDQ_DEF.slice(); }
function ndqInfo(k) { if (NDQ_B[k]) return NDQ_B[k]; const id = String(k).slice(2), c = CATS.find(x => x.id === id); if (!c) return null; const o = tileOv(id); return [o.ic || c.ic, o.name || SHORT[id] || c.name, (c.color || '#64748b') + '30']; }
function ndSheet() { if (ndSheetClose()) return; NDQE = false; ndSheetDraw(); }
function ndSheetDrag(s) {
  let y0 = 0, dy = 0, ok = false; const sh = () => s.querySelector('.sh');
  s.addEventListener('touchstart', e => { const h = sh(); if (!h || !e.target.closest('.sh')) { ok = false; return; } const q = e.target.closest('.q.ed'); ok = h.scrollTop <= 0 && (!q || q.scrollTop <= 0); y0 = e.touches[0].clientY; dy = 0; h.style.transition = 'none'; }, {passive: true});
  s.addEventListener('touchmove', e => { if (!ok) return; dy = e.touches[0].clientY - y0; const h = sh(); if (!h) return; if (dy > 0) { h.style.transform = 'translateY(' + dy + 'px)'; if (e.cancelable) e.preventDefault(); } else h.style.transform = ''; }, {passive: false});
  s.addEventListener('touchend', () => { if (!ok) return; const h = sh(); if (!h) return; h.style.transition = 'transform .2s'; if (dy > 90) { h.style.transform = 'translateY(100%)'; setTimeout(() => { if (s.parentNode) s.remove(); }, 180); } else h.style.transform = ''; ok = false; dy = 0; });
}
function ndSheetDraw() {
  let s = document.getElementById('ndsheet'); const fresh = !s; if (!s) { s = document.createElement('div'); s.id = 'ndsheet'; document.body.appendChild(s); ndSheetDrag(s); }
  const sel = ndqList();
  if (!NDQE) {
    const it = sel.map(k => [k, ndqInfo(k)]).filter(x => x[1]);
    s.innerHTML = `<div class="bg" onclick="ndSheetClose()"></div><div class="sh"${fresh ? '' : ' style="animation:none"'}><div class="gb" onclick="ndSheetClose()"></div><button class="nx" onclick="ndSheetClose()" aria-label="বন্ধ করুন"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#12408f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,9 12,16 19,9"/></svg></button><h4>কী করবেন?</h4><div class="q">${it.map(x => `<div onclick="ndQ('${x[0]}')"><span style="background:${x[1][2]}">${x[1][0]}</span>${esc(x[1][1])}</div>`).join('')}</div><button class="ned" onclick="NDQE=true;ndSheetDraw()">✏️ নিজের মতো সাজান</button><div class="hint" style="text-align:center;margin-top:8px;font-size:11px">সংস্করণ ${BUILD_V}</div></div>`;
  } else {
    const all = Object.keys(NDQ_B).concat(CATS.filter(c => !tileOv(c.id).hide).map(c => 'c:' + c.id)).filter((k, i, a) => a.indexOf(k) === i);
    s.innerHTML = `<div class="bg" onclick="ndSheetClose()"></div><div class="sh" style="animation:none"><div class="gb" onclick="ndSheetClose()"></div><button class="nx" onclick="ndSheetClose()" aria-label="বন্ধ করুন"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#12408f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,9 12,16 19,9"/></svg></button><h4>যেগুলো চান বেছে নিন</h4><div class="hint" style="text-align:center;margin:-8px 0 8px">চাপ দিলে যোগ হয়, আবার চাপলে বাদ যায়। ${bn(sel.length)}টি বাছা আছে।</div><div class="q ed">${all.map(k => { const f = ndqInfo(k); if (!f) return ''; const on = sel.includes(k); return `<div class="${on ? 'sel' : ''}" onclick="ndqTog('${k}')"><span style="background:${f[2]}">${f[0]}</span>${esc(f[1])}</div>`; }).join('')}</div><div style="display:flex;gap:8px;margin-top:12px"><button class="ned" style="margin:0;flex:1;background:#0c6247;color:#fff" onclick="NDQE=false;ndSheetDraw()">✔️ সম্পন্ন</button><button class="ned" style="margin:0" onclick="ndqReset()">↺ আগের মতো</button></div></div>`;
    const q = s.querySelector('.q.ed'); if (q && window.__ndqY) q.scrollTop = window.__ndqY;
  }
}
function ndqTog(k) {
  const q = document.querySelector('#ndsheet .q.ed'); window.__ndqY = q ? q.scrollTop : 0;
  let l = ndqList(); l = l.includes(k) ? l.filter(x => x !== k) : l.concat(k); if (!l.length) l = ['all']; ndLS('ndq', JSON.stringify(l)); ndSheetDraw();
}
function ndqReset() { try { localStorage.removeItem('ndq'); } catch (e) {} window.__ndqY = 0; ndSheetDraw(); }
function ndQ(k) {
  ndSheetClose(); stack = [];
  if (k === 'in' || k === 'out') { open_('ledger'); lgNew(k); } else if (k === 'trip') { open_('logbook'); setTimeout(() => { const f = document.getElementById('lbform'); if (f) f.scrollIntoView(); }, 50); } else if (k === 'debt' || k === 'budget') { open_('ledger'); lgGo(k); }
  else if (k === 'note') open_('notes'); else if (k === 'rem') open_('remind'); else if (k === 'calc') { open_('ledger'); lgCalc(); } else if (k === 'all') ndAll(); else if (String(k).indexOf('c:') === 0) open_(k.slice(2));
  window.__ndA = '';
}
// ---------- সব মেনু ----------
function ndAll() {
  push(() => home()); const gs = homeGroups(), adm = typeof realAdmin === 'function' && realAdmin();
  render(pageHead('সব মেনু') + `<div class="pad ndw">${gs.map(g => `<div class="sec-h">${esc(g[0])}</div><div class="tgrid" style="padding:0">${g[1].map(tile).join('')}</div>`).join('')}
    <div class="nd-ut"><button onclick="toggleLang()">🌐 ${LANG === 'bn' ? 'English' : 'বাংলা'}</button><button onclick="toggleDark()">🌙 ডার্ক</button>${adm ? `<button onclick="open_('admin')">🛡️ অ্যাডমিন</button>` : ''}<button onclick="ndLayout()">🎨 ডিজাইন</button></div></div>`);
  window.__ndA = 'all'; window.__ndRn = window.__rn; ndHi();
}
function ndLayout() {
  const o = (cur, k, t) => `<button class="${cur === k ? 'on' : ''}" onclick="%s">${t}</button>`;
  showModal(`<h3 style="margin:0 0 8px">🎨 ডিজাইন ও মেনু</h3><div class="hint">ডিজাইন</div><div class="seg" style="margin:6px 0 12px"><button class="${ndOn() ? 'on' : ''}" onclick="ndSetD(1)">✨ নতুন</button><button class="${ndOn() ? '' : 'on'}" onclick="ndSetD(0)">↩️ আগের</button></div>
    <div class="hint">মেনু কোথায় থাকবে (নতুন ডিজাইনে)</div><div class="seg" style="margin:6px 0"><button class="${ndLay() === 'bar' ? 'on' : ''}" onclick="ndSetL('bar')">⬇️ নিচে</button><button class="${ndLay() === 'rail' ? 'on' : ''}" onclick="ndSetL('rail')">⬅️ বাঁ পাশে</button><button class="${ndLay() === 'both' ? 'on' : ''}" onclick="ndSetL('both')">দুটোই</button></div><div class="hint" style="margin-top:8px">কম্পিউটারের বড় স্ক্রিনে বাঁ পাশে সব মেনু নিজে থেকেই সবসময় খোলা থাকে।</div>`);
}
function ndSetD(v) { ndLS('nd', v ? '1' : '0'); closeModal(); ndApply(); home(); }
function ndSetL(v) { ndLS('ndlay', v); closeModal(); ndApply(); ndLayout(); }
// ---------- নতুন হোম ----------
function ndHome(q) {
  tab = 'home'; stack = [];
  const list = CATS.filter(c => !q || c.name.includes(q) || (SHORT[c.id] || '').includes(q) || c.sub.includes(q));
  const ci = typeof cloudInfo === 'function' ? cloudInfo() : null, nm = ci && (ci.name || '').trim();
  const l = ledgerData(), t = todayISO(), es = l.entries.filter(e => e.date === t), ti = lsum(es, 'in'), to = lsum(es, 'out'), ms = lmstat(l, t.slice(0, 7)), alerts = ndAlerts(l);
  const lbm = (() => { try { const d = JSON.parse(localStorage.getItem('lbook') || '{}'), r = (d.rows || []).filter(x => (x.date || '').slice(0, 7) === t.slice(0, 7)); return {n: r.length, km: r.reduce((a, x) => a + (+x.km || 0), 0)}; } catch (e) { return {n: 0, km: 0}; } })();
  const G = [['job', '💼', '#e0f2fe', 'ড্রাইভিং জব', (CATS.find(c => c.id === 'job') || {}).sub || 'চাকরির খবর'], ['mess', '🍛', '#ffedd5', 'মেসের মিল', 'মিল ও বাজারের হিসাব'], ['logbook', '🚖', '#dbeafe', 'লগ বুক', lbm.n ? bn(lbm.n) + ' ট্রিপ • ' + bn(Math.round(lbm.km)) + ' কিমি' : 'যাত্রার খাতা'], ['ledger', '💰', '#dcfce7', 'আয়-খরচ খাতা', 'এ মাসে ' + (ms.net >= 0 ? 'বাঁচল ' : 'ঘাটতি ') + tk(Math.abs(ms.net))]].filter(x => !tileOv(x[0]).hide);
  let body;
  if (q) body = `<div class="tgrid" style="margin-top:14px">${list.map(tile).join('') || '<div class="empty" style="grid-column:span 3">কিছু পাওয়া যায়নি</div>'}</div>`;
  else {
    body = `<div class="nd-hero" onclick="open_('ledger')"><small>আজকের ব্যালেন্স • ${lgDate(t)}</small><div class="big">${(ti - to < 0 ? '−' : '') + tk(Math.abs(ti - to))}</div><div class="row"><div>⬆ আয়<b>${tk(ti)}</b></div><div>⬇ খরচ<b>${tk(to)}</b></div><div>🏦 এ মাসে ${ms.net >= 0 ? 'বাঁচল' : 'ঘাটতি'}<b>${tk(Math.abs(ms.net))}</b></div></div>
      <div class="hb"><button onclick="event.stopPropagation();open_('ledger');lgNew('in')">➕ আয় লিখুন</button><button onclick="event.stopPropagation();open_('ledger');lgNew('out')">➖ খরচ লিখুন</button></div></div>` +
      (alerts.length ? `<div class="nd-sec"><em>জরুরি</em></div><div class="nd-al">${alerts.map(a => `<div onclick="open_('${a.id}')"><i style="background:${a.bg}">${a.ic}</i><div><b>${esc(a.t)}</b><small>${esc(a.s)}</small></div></div>`).join('')}</div>` : '') +
      (typeof homeNotice === 'function' ? homeNotice() : '') +
      `<div class="nd-sec"><em>এক নজরে</em><a onclick="ndAll()">সব মেনু ›</a></div><div class="nd-g">${G.map(g => { const o = tileOv(g[0]); return `<div onclick="open_('${g[0]}')"><div class="e" style="background:${g[2]}">${esc(o.ic || g[1])}</div><b>${esc(o.name || g[3])}</b><small>${esc(g[4])}</small></div>`; }).join('')}</div>` +
      dailyCard() +
      `<div class="tip"><div><b>💡 আজকের টিপস</b><div id="tip-t">${esc(TIPS[tipIdx])}</div></div><button class="btn sm" onclick="speak(document.getElementById('tip-t').innerText)">🔊</button></div>` +
      (typeof hgCards === 'function' ? hgCards() : homeGroups().map(g => `<div class="nd-sec"><em>${esc(g[0])}</em></div><div class="tgrid">${g[1].map(tile).join('')}</div>`).join('')) + '<div style="height:50px"></div>';
  }
  render((q || typeof topAd !== 'function' ? '' : topAd()) + `<div class="ndw"><div class="ndh">${!q && bismOn() ? '<div class="bis">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>' : ''}<div class="hrow"><div class="nbr">${appLogoHtml()}<div><b>${esc(appName())}</b><small>${esc(appSub())}</small></div></div>
    <div class="nic"><button onclick="open_('remind')">🔔${alerts.length ? '<i></i>' : ''}</button><button onclick="toggleDark()">🌙</button><button onclick="toggleLang()" style="font-size:12px;font-weight:800">${LANG === 'bn' ? 'EN' : 'বাং'}</button><button class="ndmenu" onclick="toggleDrawer()">☰</button></div></div>
    ${nm ? `<div class="gr">আসসালামু আলাইকুম, ${esc(nm)}</div>` : ''}<div class="srch"><span>🔍</span><input id="q" value="${esc(q)}" placeholder="কী শিখতে চান? যেমন: ব্রেক, লাইসেন্স" oninput="home(this.value)"></div></div>${body}</div>`);
  if (q) { const i = document.getElementById('q'); i.focus(); i.setSelectionRange(q.length, q.length); }
  window.__ndA = 'home'; window.__ndRn = window.__rn; ndHi();
}
function ndAlerts(l) {
  const out = []; try { remAlerts().slice(0, 3).forEach(a => out.push({id: 'remind', ic: a.lvl === 2 ? '🚨' : '⏰', bg: a.lvl === 2 ? '#fde8e6' : '#fff3cf', t: a.t.split(':')[0], s: (a.t.split(':')[1] || '').trim() || a.t})); } catch (e) {}
  const t = todayISO(), ym = t.slice(0, 7), d = +t.slice(8, 10); (l.loans || []).forEach(x => { if (x.paid >= x.count || x.last === ym) return; const left = x.day - d; if (left <= 3 && out.length < 4) out.push({id: 'ledger', ic: '💳', bg: '#fff3cf', t: x.n, s: left < 0 ? bn(-left) + ' দিন দেরি • ' + tk(x.amt) : left === 0 ? 'আজ কিস্তির দিন • ' + tk(x.amt) : bn(left) + ' দিন পরে • ' + tk(x.amt)}); });
  return out.slice(0, 4);
}
(function () { const st = document.createElement('style'); st.textContent = `
body.nd #app{background:#f7f4ec}body.ndbar #app{padding-bottom:130px!important}body.nd:not(.ndbar) #app{padding-bottom:24px!important}body.nd.dark #app{background:#0b1310}
.ndw{--cd:#fff;--tx:#14231c;--mu:#6b7a72;--ln:#ebe5d6;--au:#ffc83d}body.dark .ndw{--cd:#15211b;--tx:#eef5f0;--mu:#8aa498;--ln:#223329}
.ndh{background:radial-gradient(120% 90% at 85% 0%,#0f7a57 0%,#05301f 62%);padding:12px 16px 74px;color:#fff;border-radius:0 0 30px 30px}.ndh .bis{text-align:center;font-size:15px;color:#ffc83d;opacity:.92;margin-bottom:8px}
.nbr{display:flex;align-items:center;gap:11px;min-width:0}.nbr .logo{width:54px;height:54px;border-radius:17px;box-shadow:0 0 0 2px #ffc83d77,0 6px 16px #0006;font-size:28px}.nbr .logo img{width:100%;height:100%;border-radius:17px;object-fit:cover}.nbr b{display:block;font-size:25px;line-height:1.1;font-weight:800}.nbr small{color:#ffc83d;font-size:11.5px;font-weight:600;display:block;margin-top:2px}
.nic{display:flex;gap:6px;flex:none}.nic button{width:34px;height:34px;border-radius:11px;border:1px solid #ffffff2a;background:#ffffff1f;color:#fff;font-size:15px;position:relative;padding:0}.nic i{position:absolute;top:4px;right:5px;width:8px;height:8px;border-radius:50%;background:#ffc83d}
.ndh .gr{margin:10px 2px 0;font-size:13px;opacity:.9}.ndh .srch{margin-top:12px;background:#fff;border-radius:16px;padding:0 13px;display:flex;align-items:center;gap:8px;box-shadow:0 6px 14px #0004}.ndh .srch input{flex:1;border:0;outline:0;background:transparent;height:44px;font:inherit;font-size:14.5px;color:#1f2329;min-width:0}
.nd-hero{margin:-54px 16px 0;border-radius:24px;padding:16px 18px;color:#fff;position:relative;background:linear-gradient(135deg,#0a4a35,#05301f 60%,#031f15);box-shadow:0 14px 30px #05301f55;overflow:hidden;border:1px solid #ffc83d66;cursor:pointer}.nd-hero:before{content:'';position:absolute;right:-40px;top:-40px;width:150px;height:150px;border-radius:50%;border:26px solid #ffc83d1c}
.nd-hero small{color:#bfe3d2;font-size:12px}.nd-hero .big{font-size:34px;font-weight:800;color:#ffc83d;letter-spacing:-.5px}.nd-hero .row{display:flex;gap:8px;margin-top:10px}.nd-hero .row div{flex:1;border-radius:13px;padding:8px 9px;font-size:11px;background:#ffffff14;color:#bfe3d2}.nd-hero .row b{display:block;font-size:14.5px;color:#fff}
.nd-hero .hb{display:flex;gap:8px;margin-top:10px;position:relative}.nd-hero .hb button{flex:1;border:0;border-radius:13px;padding:10px 4px;font:inherit;font-weight:800;font-size:13.5px;background:linear-gradient(145deg,#ffd964,#f0a800);color:#3a2800}.nd-hero .hb button:last-child{background:#ffffff22;color:#fff}
.nd-sec{display:flex;align-items:center;margin:16px 18px 8px;font-weight:800;font-size:16px;color:var(--tx)}.nd-sec:before{content:'';width:4px;height:17px;background:#ffc83d;border-radius:2px;margin-right:8px}.nd-sec em{flex:1;font-style:normal}.nd-sec a{font-weight:700;font-size:12.5px;color:#0c6247;cursor:pointer}body.dark .nd-sec a{color:#ffc83d}
.nd-al{display:flex;gap:9px;padding:0 16px;overflow-x:auto}.nd-al>div{flex:none;min-width:190px;border-radius:17px;padding:10px 12px;display:flex;gap:9px;align-items:center;background:var(--cd);border:1px solid var(--ln);box-shadow:0 4px 10px #0001;color:var(--tx)}.nd-al i{font-style:normal;font-size:21px;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none}.nd-al b{display:block;font-size:13px}.nd-al small{color:var(--mu);font-size:11.5px}
.nd-g{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px}.nd-g>div{border-radius:20px;padding:13px;background:var(--cd);border:1px solid var(--ln);box-shadow:0 5px 12px #0001;position:relative;color:var(--tx);cursor:pointer}.nd-g>div:after{content:'›';position:absolute;right:13px;top:12px;color:#e0a800;font-weight:800;font-size:19px}.nd-g .e{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:7px}.nd-g b{display:block;font-size:14.5px}.nd-g small{font-size:11.5px;color:var(--mu)}
.ndw .tile{border:1px solid var(--ln);box-shadow:0 4px 10px #0001}.ndw .sec-h{border-left:4px solid #ffc83d;padding-left:8px}body.dark .ndw .tile{background:#15211b}body.dark .ndw .tile span{color:#eef5f0}
.nd-ut{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 8px}.nd-ut button{flex:1;min-width:46%;border:1px solid var(--ln,#ddd);background:#fff;border-radius:14px;padding:12px;font:inherit;font-weight:700}
#ndnav{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;width:calc(100% - 28px);max-width:452px;height:64px;background:linear-gradient(180deg,#0a3a28,#05261a);border-radius:26px;display:flex;align-items:center;justify-content:space-around;color:#8fb8a5;font-size:10.5px;text-align:center;box-shadow:0 12px 26px #0007;border:1px solid #ffc83d44;z-index:40}#ndnav div{cursor:pointer;padding:4px 8px}#ndnav span{display:block;font-size:20px}#ndnav .on{color:#ffc83d;font-weight:800}
#ndnav .plus{width:54px;height:54px;border-radius:19px;background:linear-gradient(145deg,#ffd964,#f0a800);color:#3a2800;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;margin-top:-28px;box-shadow:0 10px 20px #f0a80077;padding:0}
#ndrail{position:fixed;left:0;top:0;bottom:0;width:62px;background:linear-gradient(180deg,#0a3a28,#05261a);color:#bfe3d2;text-align:center;padding:8px 0 90px;z-index:39;border-right:1px solid #ffc83d44;overflow-y:auto}#ndrail .rl{margin:0 0 6px;display:flex;justify-content:center}#ndrail .rl .logo{width:42px;height:42px;font-size:22px;border-radius:13px}#ndrail div[data-k]{padding:7px 0;font-size:20px;cursor:pointer}#ndrail small{display:block;font-size:9.5px}#ndrail .on{background:#ffc83d26;border-radius:14px;margin:0 5px;color:#ffc83d}
body.ndrail .nbr .logo,body.ndrail .nbr small{display:none}body.ndrail .nbr b{font-size:21px;white-space:nowrap}body.ndrail .nic{gap:4px}body.ndrail .nic button{width:31px;height:31px}body.ndrail .nd-hero .row div{padding:7px 6px;font-size:10px}body.ndrail .nd-hero .row b{font-size:12.5px}body.ndrail .nd-hero .big{font-size:29px}body.ndrail #app{margin-left:62px;max-width:none;width:calc(100% - 62px)}body.ndrail.ndbar #ndnav{left:calc(50% + 31px);width:calc(100% - 90px)}
body.nd .lg-fab{bottom:96px}body.nd #uvbar.uv-pill{bottom:86px}body.nd #bars{bottom:84px}
#ndsheet{position:fixed;inset:0;z-index:60}#ndsheet .bg{position:absolute;inset:0;background:#0009}#ndsheet .sh{position:absolute;left:0;right:0;bottom:0;max-width:480px;margin:0 auto;background:#fff;color:#14231c;border-radius:28px 28px 0 0;padding:12px 18px 28px;animation:ndup .22s}.gb{width:44px;height:5px;background:#cbd5d0;border-radius:3px;margin:0 auto 10px}#ndsheet h4{text-align:center;font-size:16px;margin-bottom:14px}#ndsheet .q{display:grid;grid-template-columns:repeat(3,1fr);gap:16px 4px}#ndsheet .q div{text-align:center;font-size:12.5px;font-weight:700;cursor:pointer}#ndsheet .q span{width:58px;height:58px;border-radius:20px;margin:0 auto 5px;display:flex;align-items:center;justify-content:center;font-size:27px}
#ndsheet .q.ed{max-height:52vh;overflow-y:auto;padding:4px 0}#ndsheet .q.ed div{opacity:.5}#ndsheet .q.ed div.sel{opacity:1}#ndsheet .q.ed div.sel span{box-shadow:0 0 0 3px #0c6247;position:relative}#ndsheet .q.ed div.sel span:after{content:'✓';position:absolute;right:-4px;top:-4px;width:20px;height:20px;border-radius:50%;background:#0c6247;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center}#ndsheet .sh{max-height:86vh;overflow-y:auto;padding-bottom:calc(28px + env(safe-area-inset-bottom,0px))}#ndsheet .ned{display:block;width:100%;margin-top:14px;border:1.5px dashed #94a3b8;background:transparent;border-radius:14px;padding:11px;font:inherit;font-weight:700;color:#475569}@keyframes ndup{from{transform:translateY(100%)}to{transform:none}}body.dark #ndsheet .sh{background:#15211b;color:#eef5f0}
body.nd .drawer{z-index:80;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}body.nd .drawer-bg{z-index:79}body.kb #ndnav,body.kb .lg-fab,body.dopen #ndnav,body.dopen #ndrail{display:none!important}#ndsheet .nx{display:block;margin:0 auto 2px;width:64px;height:40px;border:0;background:transparent;padding:0;cursor:pointer}#ndsheet .gb{padding:0;height:5px;box-sizing:content-box;border-top:12px solid transparent;border-bottom:12px solid transparent;background-clip:content-box;width:44px}#ndsheet .sh{touch-action:pan-y}
@media(min-width:900px){body.nd .drawer{transform:none!important;width:262px;box-shadow:2px 0 14px #0002;z-index:15}body.nd .drawer-bg{display:none!important}body.nd #app{margin:0 auto 0 262px;max-width:760px}body.nd .ndmenu,body.nd #ndnav,body.nd #ndrail{display:none!important}body.nd.ndrail #app{margin-left:262px;width:auto}}`; document.head.appendChild(st); })();

// =====================================================================
//  P36: আমার পড়া • চাকরির বিজ্ঞপ্তি (ছবি/PDF) • যোগাযোগ ইনবক্স • আয়-খরচ রিপোর্ট • ছোট "+" মেনু
// =====================================================================
if (!CATS.some(c => c.id === 'circ')) CATS.push({id: 'circ', name: 'চাকরির বিজ্ঞপ্তি', ic: '📢', color: '#0c6247', sub: 'নিয়োগ বিজ্ঞপ্তি — ছবি ও PDF সহ'});
if (!CATS.some(c => c.id === 'hist')) CATS.push({id: 'hist', name: 'আমার পড়া', ic: '📖', color: '#b45309', sub: 'যা পড়েছেন, আবার শুরু করুন'});
const p36n = v => String(v == null ? '' : v);
const p36day = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function p36hm(ts) { const d = new Date(ts); let h = d.getHours(), m = d.getMinutes(); const ap = h >= 12 ? 'রাত' : 'সকাল'; const ap2 = h < 5 ? 'রাত' : h < 12 ? 'সকাল' : h < 16 ? 'দুপুর' : h < 18 ? 'বিকাল' : 'সন্ধ্যা'; h = h % 12 || 12; return ap2 + ' ' + bn(h) + ':' + bn(String(m).padStart(2, '0')); }
function p36dayLabel(k) { const t = todayISO(); if (k === t) return 'আজ — ' + lgDate(k); const y = new Date(); y.setDate(y.getDate() - 1); if (k === p36day(y.getTime())) return 'গতকাল — ' + lgDate(k); return lgDate(k); }
function p36Img(file, maxPx, q, maxLen) {
  return new Promise((res, rej) => {
    const fr = new FileReader(); fr.onerror = () => rej(new Error('read'));
    fr.onload = () => { const im = new Image(); im.onerror = () => rej(new Error('img'));
      im.onload = () => { let px = maxPx, qq = q, out = ''; for (let i = 0; i < 8; i++) { const k = Math.min(1, px / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); out = c.toDataURL('image/jpeg', qq); if (out.length <= maxLen) break; px *= 0.85; qq = Math.max(0.5, qq - 0.06); } res(out); };
      im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}

// ---------- আমার পড়া (ইতিহাস) ----------
const hsLoad = () => { try { const v = JSON.parse(localStorage.getItem('hist') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const hsSave = a => { try { localStorage.setItem('hist', JSON.stringify(a.slice(0, 200))); } catch (e) {} };
let HS_CUR = null, HS_F = 'all';
const HS_SKIP = ['home', 'lang', 'admin', 'account', 'viewset', 'share', 'hist', 'links'];
function hsKind(k) { if (/^circ|^job|^intjob|^jobprep|^govguide|^govqa|^cv$|^paper|^fprep|^seeker/.test(k)) return 'job'; if (/quiz|^test$|^roadtest|^signquiz/.test(k)) return 'quiz'; if (/^(ledger|logbook|remind|notes|tools|sos)$/.test(k)) return 'khata'; return 'read'; }
function hsInfo(e) {
  if (e.t) return [e.ic || '📄', e.t];
  const c = CATS.find(x => x.id === e.k); if (c) return [(tileOv(e.k).ic) || c.ic, (tileOv(e.k).name) || (typeof SHORT !== 'undefined' && SHORT[e.k]) || c.name];
  try { return ['📄', keyName(e.k)]; } catch (x) { return ['📄', e.k]; }
}
function hsLog(k, extra) {
  if (!k || HS_SKIP.includes(k)) return; const a = hsLoad(), now = Date.now(), d = p36day(now);
  let i = a.findIndex(x => x.k === k && p36day(x.ts) === d), e; if (i >= 0) { e = a.splice(i, 1)[0]; e.ts = now; } else e = {k, ts: now, p: 0, sy: 0};
  if (extra) Object.assign(e, extra); a.unshift(e); hsSave(a); HS_CUR = k;
  try { if (window.cloudMarkDirty) window.cloudMarkDirty(); } catch (x) {}
}
let _hsT = 0;
function hsScroll() {
  if (!HS_CUR || Date.now() - _hsT < 700) return; _hsT = Date.now();
  const se = document.scrollingElement || document.documentElement, sy = se.scrollTop, mx = Math.max(1, se.scrollHeight - se.clientHeight); if (sy < 40) return;
  const a = hsLoad(), d = p36day(Date.now()), e = a.find(x => x.k === HS_CUR && p36day(x.ts) === d); if (!e) return;
  e.sy = Math.round(sy); e.p = Math.max(e.p || 0, Math.min(100, Math.round(sy / mx * 100))); e.ts = Date.now(); hsSave(a);
}
function hsOpen(i) {
  const e = hsLoad()[i]; if (!e) return; const sy = e.sy || 0;
  if (e.k.indexOf('circ:') === 0) circView(e.k.slice(5)); else if (e.k.indexOf('paper:') === 0) p39View(e.k.slice(6)); else if (e.k.indexOf('fprep:') === 0) fpView(e.k.slice(6)); else if (e.k === 'fprep') { push(() => home()); fpPage(); } else open_(e.k);
  if (sy > 80) { [450, 1100, 2000].forEach(t => setTimeout(() => { if (HS_CUR === e.k) window.scrollTo(0, sy); }, t)); }
}
function hsFilter(f) { HS_F = f; hsPage(); }
function hsClear() { if (!confirm('সব ইতিহাস মুছে যাবে। ঠিক আছে?')) return; hsSave([]); hsPage(); }
function hsPage() {
  tab = 'profile'; HS_CUR = null; const all = hsLoad(), t = todayISO();
  const rows = all.map((e, i) => ({e, i})).filter(o => HS_F === 'all' || hsKind(o.e.k) === HS_F);
  const last = all.find(e => (e.p || 0) < 100) || all[0];
  const li = all.indexOf(last);
  const chips = [['all', 'সব'], ['read', '📚 পড়া'], ['quiz', '✅ কুইজ'], ['job', '💼 চাকরি'], ['khata', '📒 খাতা']];
  let days = [], seen = {}; rows.forEach(o => { const d = p36day(o.e.ts); if (!seen[d]) { seen[d] = []; days.push(d); } seen[d].push(o); });
  const streak = (() => { let n = 0; const set = new Set(all.map(e => p36day(e.ts))); const d = new Date(); if (!set.has(p36day(d.getTime()))) d.setDate(d.getDate() - 1); while (set.has(p36day(d.getTime()))) { n++; d.setDate(d.getDate() - 1); } return n; })();
  render(pageHead('আমার পড়া') + `<div class="pad hs">
    ${last ? (() => { const f = hsInfo(last); return `<div class="hs-res"><small>▶ যেখানে থেমেছিলেন${streak > 1 ? ' • 🔥 ' + bn(streak) + ' দিনের ধারা' : ''}</small><b>${f[0]} ${esc(f[1])}</b><small>${last.p ? bn(last.p) + '% পর্যন্ত পড়া • ' : ''}${p36dayLabel(p36day(last.ts))}, ${p36hm(last.ts)}</small><div class="hs-bar"><i style="width:${last.p || 0}%"></i></div><button class="btn" onclick="hsOpen(${li})">আবার শুরু করুন ▶</button></div>` })() : `<div class="empty"><span class="e1">📖</span>এখনো কিছু পড়া হয়নি। যেকোনো পাতা খুললেই এখানে জমা হবে।</div>`}
    <div class="chips" style="margin:8px 0">${chips.map(c => `<button class="chip ${HS_F === c[0] ? 'on' : ''}" onclick="hsFilter('${c[0]}')">${c[1]}</button>`).join('')}</div>
    ${days.map(d => `<div class="hs-d">${p36dayLabel(d)}</div>${seen[d].map(o => { const f = hsInfo(o.e); return `<div class="hs-r" onclick="hsOpen(${o.i})"><span class="ic">${esc(f[0])}</span><div style="flex:1;min-width:0"><b>${esc(f[1])}</b><small>${p36hm(o.e.ts)}${o.e.p ? ' • ' + bn(o.e.p) + '% পর্যন্ত' : ''}</small>${o.e.p ? `<div class="hs-bar s"><i style="width:${o.e.p}%"></i></div>` : ''}</div><span style="color:#94a3b8">›</span></div>`; }).join('')}`).join('')}
    ${all.length ? `<div class="hint" style="text-align:center;margin-top:12px">☁ লগইন করা থাকলে ইতিহাস নিজে থেকে ব্যাকআপ হয়।</div><button class="btn sm" style="background:#64748b" onclick="hsClear()">🗑 ইতিহাস মুছুন</button>` : ''}</div>`);
}
function hsCard() {
  if (document.getElementById('hs_card')) return; const app = document.getElementById('app'), p = app && app.querySelector('.pad'); if (!p || (app.innerText || '').slice(0, 160).indexOf('লগইন ও ব্যাকআপ') < 0) return;
  const all = hsLoad(), last = all.find(e => (e.p || 0) < 100) || all[0], f = last ? hsInfo(last) : null;
  p.insertAdjacentHTML('afterbegin', `<div id="hs_card" class="hs-res" onclick="open_('hist')" style="cursor:pointer"><small>📖 আমার পড়া</small><b>${f ? esc(f[0] + ' ' + f[1]) : 'যা পড়বেন সব এখানে জমা থাকবে'}</b><small>${last ? 'সর্বশেষ: ' + p36dayLabel(p36day(last.ts)) + ', ' + p36hm(last.ts) + ' • সব দেখুন ›' : 'চাপ দিয়ে খুলুন ›'}</small></div>`);
}

// ---------- চাকরির বিজ্ঞপ্তি ----------
const CIRC_CATS = ['সরকারি', 'বেসরকারি', 'ড্রাইভার', 'ব্যাংক/NGO', 'অন্যান্য'];
let CIRC = []; try { CIRC = JSON.parse(localStorage.getItem('circs') || '[]'); } catch (e) {}
let CIRC_F = 'all', CIRC_Q = '', CF = null; const CIRC_IMG = {};
const circFav = () => { try { return JSON.parse(localStorage.getItem('circfav') || '[]'); } catch (e) { return []; } };
const circColor = s => { let h = 0; String(s || '').split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) % 360; }); return `hsl(${h},38%,32%)`; };
const circLogo = c => c.logo && /^data:image\//.test(c.logo) ? `<div class="cc-logo"><img src="${c.logo}" alt=""></div>` : `<div class="cc-logo" style="background:${circColor(c.org || c.title)}">${esc(String(c.org || c.title || '•').trim().split(/\s+/)[0].slice(0, 9))}</div>`;
function circDays(c) { if (!c.deadline) return null; const d = Math.ceil((new Date(c.deadline + 'T23:59:59') - new Date()) / 864e5); return d; }
function circChip(c) { const d = circDays(c); if (d == null) return ''; if (d < 0) return '<span class="cc-chip" style="background:#e5e7eb;color:#6b7280">মেয়াদ শেষ</span>'; return `<span class="cc-chip" style="background:${d <= 3 ? '#fde2e2;color:#b02a2a' : '#fff3cf;color:#8a5e00'}">শেষ: ${lgDate(c.deadline)}</span><span class="cc-chip" style="background:${d <= 3 ? '#fde2e2;color:#b02a2a' : '#e6f4ec;color:#0a5a3f'}">${bn(d)} দিন বাকি</span>`; }
async function circLoad() {
  if (!CLOUD_ON() || !navigator.onLine) return false;
  try { const f = await fb(); const rows = isAdminFlag() ? await sList(f, ['circulars'], f.F.limit(300)) : await sList(f, ['circulars'], f.F.where('pub', '==', true), f.F.limit(300)); rows.sort((a, b) => (p36n(b.pubDate) + p36n(b.at)).localeCompare(p36n(a.pubDate) + p36n(a.at)) || (b.at || 0) - (a.at || 0)); CIRC = rows; try { localStorage.setItem('circs', JSON.stringify(rows.filter(r => r.pub !== false))); } catch (e) { try { localStorage.setItem('circs', JSON.stringify(rows.filter(r => r.pub !== false).map(r => Object.assign({}, r, {logo: ''})))); } catch (e2) {} } return true; } catch (e) { return false; }
}
function circPage() {
  tab = 'job'; HS_CUR = null;
  render(pageHead('চাকরির বিজ্ঞপ্তি') + `<div class="pad circ">${isAdminFlag() ? `<button class="btn" style="width:100%;background:#0c6247" onclick="push(()=>circPage());circForm('')">➕ নতুন বিজ্ঞপ্তি দিন (অ্যাডমিন)</button>` : ''}
    <input class="inp" id="cq" placeholder="🔍 খুঁজুন (প্রতিষ্ঠান বা পদ)" value="${esc(CIRC_Q)}" oninput="CIRC_Q=this.value;circList()"><div class="chips" id="cchips"></div><div id="clist"></div><div class="hint" style="text-align:center;margin-top:10px">⚠️ আবেদন করার সময় কোনো প্রকার আর্থিক লেনদেন করবেন না।</div></div>`);
  circList(); circLoad().then(ok => { if (ok && document.getElementById('clist')) circList(); });
}
function circFilt(f) { CIRC_F = f; circList(); }
function circList() {
  const cl = document.getElementById('clist'); if (!cl) return; const fav = circFav(), q = CIRC_Q.trim().toLowerCase();
  const cats = CIRC_CATS.concat(CIRC.map(c => c.cat).filter(x => x && !CIRC_CATS.includes(x))).filter((x, i, a) => a.indexOf(x) === i);
  document.getElementById('cchips').innerHTML = [['all', 'সব'], ...cats.map(c => [c, c]), ['fav', '♥ সেভ']].map(x => `<button class="chip ${CIRC_F === x[0] ? 'on' : ''}" onclick="circFilt(this.dataset.f)" data-f="${esc(x[0])}">${esc(x[1])}</button>`).join('');
  const rows = CIRC.filter(c => c.kind !== 'paper' && (CIRC_F === 'all' || (CIRC_F === 'fav' ? fav.includes(c.id) : c.cat === CIRC_F)) && (!q || (p36n(c.title) + ' ' + p36n(c.org)).toLowerCase().includes(q)));
  cl.innerHTML = rows.map(c => `<div class="cc" onclick="circView('${esc(c.id)}')">${circLogo(c)}<div style="flex:1;min-width:0"><b>${esc(c.title)}</b><small>${c.org ? esc(c.org) + ' • ' : ''}প্রকাশ: ${c.pubDate ? lgDate(c.pubDate) : '—'}</small><div>${c.pub === false ? '<span class="cc-chip" style="background:#e5e7eb;color:#475569">খসড়া</span>' : ''}${circChip(c)}</div></div><span class="cc-h" style="color:${fav.includes(c.id) ? '#c0392b' : '#b6bdb9'}">${fav.includes(c.id) ? '♥' : '♡'}</span></div>`).join('') || `<div class="empty"><span class="e1">📭</span>${CLOUD_ON() ? 'এখন কোনো বিজ্ঞপ্তি নেই।' : 'বিজ্ঞপ্তি দেখতে ইন্টারনেট ও ক্লাউড চালু থাকতে হবে।'}</div>`;
}
async function circImgs(id) {
  if (CIRC_IMG[id]) return CIRC_IMG[id]; const f = await fb(); const r = await sList(f, ['circimgs'], f.F.where('cid', '==', id)); r.sort((a, b) => a.n - b.n); CIRC_IMG[id] = r.map(x => x.img); return CIRC_IMG[id];
}
function circFavTog(id) { let a = circFav(); a = a.includes(id) ? a.filter(x => x !== id) : a.concat(id); try { localStorage.setItem('circfav', JSON.stringify(a)); } catch (e) {} const b = document.getElementById('cfav'); if (b) { b.textContent = a.includes(id) ? '♥' : '♡'; b.style.color = a.includes(id) ? '#c0392b' : '#94a3b8'; } }
function circView(id) {
  const c = CIRC.find(x => x.id === id); if (!c) return alert('বিজ্ঞপ্তিটি পাওয়া যায়নি।'); tab = 'job'; if (c.pub !== false) hsLog('circ:' + id, {t: c.title, ic: '💼'}); else HS_CUR = null;
  const admin = isAdminFlag(), fav = circFav().includes(id), row = (a, b) => b ? `<div class="cv-r"><b>${a}</b> ${b}</div>` : '';
  const lk = safeUrl(c.link), pl = safeUrl(c.pdfLink);
  render(pageHead('বিজ্ঞপ্তির বিবরণ') + `<div class="pad circ"><div class="cx" style="display:flex;gap:10px;align-items:center">${circLogo(c)}<b style="flex:1;line-height:1.35">${esc(c.title)}</b><span id="cfav" style="font-size:26px;cursor:pointer;color:${fav ? '#c0392b' : '#94a3b8'}" onclick="circFavTog('${esc(id)}')">${fav ? '♥' : '♡'}</span></div>
    <div class="cx">${row('প্রতিষ্ঠান:', esc(c.org || ''))}${row('প্রকাশের তারিখ:', c.pubDate ? lgDate(c.pubDate) : '')}${row('সূত্র:', esc(c.src || ''))}${row('শেষ তারিখ:', c.deadline ? lgDate(c.deadline) : '')}${row('পদ সংখ্যা:', esc(c.posts || ''))}${row('ক্যাটাগরি:', esc(c.cat || ''))}${c.deadline ? `<div style="margin-top:6px">${circChip(c)}</div>` : ''}${c.body ? `<div class="hint" style="margin-top:8px;white-space:pre-wrap">${esc(c.body)}</div>` : ''}</div>
    <div id="cvpages" class="cx" style="padding:8px"><div class="empty" style="padding:14px"><span class="e1">⏳</span>পেজ লোড হচ্ছে...</div></div>
    <div class="cv-btns"><button class="btn" id="cvpdf" onclick="circPdf('${esc(id)}',false)" style="flex:2">⬇ PDF ডাউনলোড</button><button class="btn" style="background:#0c6247;flex:1" onclick="circPdf('${esc(id)}',true)">↗ শেয়ার</button></div>
    ${lk ? `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:8px;background:#2563eb" href="${esc(lk)}" onclick="goUrl(this.getAttribute('href'));return false">🔗 আবেদন করুন</a>` : ''}${pl ? `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:8px;background:#7c3aed" href="${esc(pl)}" onclick="goUrl(this.getAttribute('href'));return false">📄 মূল PDF খুলুন</a>` : ''}
    <div class="warn" style="margin-top:10px">⚠️ আবেদন করার সময় কোনো প্রকার আর্থিক লেনদেন করবেন না।</div>
    ${admin ? `<div class="cx"><b>🛡️ অ্যাডমিন</b><div class="rowline"><button class="btn sm" onclick="push(()=>circView('${esc(id)}'));circForm('${esc(id)}')">✏️ সম্পাদনা</button><button class="btn sm" style="background:#64748b" onclick="circPub('${esc(id)}')">${c.pub === false ? '✅ প্রকাশ করুন' : '🙈 খসড়ায় নিন'}</button><button class="btn sm" style="background:#dc2626" onclick="circDel('${esc(id)}')">🗑 মুছুন</button></div></div>` : ''}</div>`);
  circImgs(id).then(im => { const b = document.getElementById('cvpages'); if (!b) return; b.innerHTML = im.length ? im.map((s, i) => `<img src="${s}" style="width:100%;border:1px solid #cfd6d2;border-radius:6px;margin:4px 0;box-shadow:0 2px 6px #0002" onclick="circZoom('${esc(id)}',${i})"><div class="hint" style="text-align:center">পেজ ${bn(i + 1)}/${bn(im.length)} • চাপ দিয়ে বড় করুন</div>`).join('') : '<div class="hint" style="text-align:center">এই বিজ্ঞপ্তির সাথে ছবি/PDF পেজ নেই।</div>'; }).catch(() => { const b = document.getElementById('cvpages'); if (b) b.innerHTML = '<div class="warn">পেজ লোড হয়নি। ইন্টারনেট দেখুন।</div>'; });
}
function circZoom(id, i) {
  const im = (CIRC_IMG[id] || [])[i]; if (!im) return; const o = document.createElement('div'); o.id = 'czoom'; o.style.cssText = 'position:fixed;inset:0;z-index:200;background:#000d;overflow:auto;-webkit-overflow-scrolling:touch';
  o.innerHTML = `<button onclick="document.getElementById('czoom').remove()" style="position:fixed;top:12px;right:12px;z-index:2;border:0;border-radius:50%;width:44px;height:44px;font-size:22px;background:#fff">✕</button><img src="${im}" style="width:230%;max-width:none;display:block;margin:50px 0 30px">`; document.body.appendChild(o);
}
async function circPdf(id, share) {
  const c = CIRC.find(x => x.id === id); const btn = document.getElementById('cvpdf'); if (btn) btn.textContent = '⏳ তৈরি হচ্ছে...';
  try {
    const ims = await circImgs(id); if (!ims.length) { if (btn) btn.textContent = '⬇ PDF ডাউনলোড'; return alert('এই বিজ্ঞপ্তিতে পেজ নেই। "মূল PDF" বাটন দেখুন।'); }
    const W = 1240, H = 1754, jp = [];
    for (const s of ims) { const im = await new Promise((ok, no) => { const x = new Image(); x.onload = () => ok(x); x.onerror = no; x.src = s; }), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); const k = Math.min(W / im.width, H / im.height), w = im.width * k, h = im.height * k; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); jp.push(Uint8Array.from(atob(cv.toDataURL('image/jpeg', 0.85).split(',')[1]), ch => ch.charCodeAt(0))); }
    const bytes = pdfMulti(jp, W, H, 595); await lbSaveFile(String((c && c.title) || 'bijnopti').replace(/[^ঀ-৿A-Za-z0-9 ]/g, '').trim().slice(0, 40).replace(/\s+/g, '_') + '.pdf', bytes, 'application/pdf', (c && c.title) || 'বিজ্ঞপ্তি');
  } catch (e) { alert('PDF তৈরি হয়নি।'); }
  if (btn) btn.textContent = '⬇ PDF ডাউনলোড';
}
async function circPub(id) { const m = await sme(); if (!m) return; const c = CIRC.find(x => x.id === id); try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'circulars', id), {pub: c.pub === false}, {merge: true}); await circLoad(); circView(id); } catch (e) { alert('হয়নি।'); } }
async function circDel(id) {
  if (!confirm('বিজ্ঞপ্তিটি মুছে যাবে। নিশ্চিত?')) return; const m = await sme(); if (!m) return;
  try { const old = await sList(m.f, ['circimgs'], m.f.F.where('cid', '==', id)); for (const o of old) await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'circimgs', o.id)); await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'circulars', id)); delete CIRC_IMG[id]; await circLoad(); back(); } catch (e) { alert('মোছা যায়নি।'); }
}
async function circAdminView(m) { await circLoad(); return `<div class="cx"><b>📢 চাকরির বিজ্ঞপ্তি</b><div class="hint">মোট ${bn(CIRC.length)}টি। নতুন দিতে বা দেখতে নিচের বাটন।</div><button class="btn" onclick="push(()=>adminPage('circ'));circForm('')">➕ নতুন বিজ্ঞপ্তি</button><button class="btn sm" onclick="push(()=>adminPage('circ'));circPage()">📋 তালিকা দেখুন ও সম্পাদনা</button></div>`; }
async function circForm(id) {
  tab = 'job'; const c = CIRC.find(x => x.id === id) || {};
  CF = {id: id || '', logo: c.logo || '', imgs: [], imgsChanged: false}; render(pageHead(id ? 'বিজ্ঞপ্তি সম্পাদনা' : 'নতুন বিজ্ঞপ্তি') + '<div class="pad"><div class="empty"><span class="e1">⏳</span>লোড হচ্ছে...</div></div>');
  if (id) { try { CF.imgs = (await circImgs(id)).slice(); } catch (e) {} }
  const cats = CIRC_CATS.concat(CIRC.map(x => x.cat).filter(x => x && !CIRC_CATS.includes(x))).filter((x, i, a) => a.indexOf(x) === i), cur = c.cat || 'সরকারি';
  render(pageHead(id ? 'বিজ্ঞপ্তি সম্পাদনা' : 'নতুন বিজ্ঞপ্তি') + `<div class="pad circ"><div class="cx"><b>প্রতিষ্ঠানের লোগো</b><div style="display:flex;gap:10px;align-items:center;margin:6px 0"><div id="cf_logo">${circLogo({logo: CF.logo, org: c.org, title: c.title})}</div><label class="btn sm" style="margin:0">ছবি বাছুন<input type="file" accept="image/*" style="display:none" onchange="circLogoPick(this)"></label><button class="btn sm" style="background:#64748b;margin:0" onclick="CF.logo='';document.getElementById('cf_logo').innerHTML=circLogo({org:gv('cf_org'),title:gv('cf_t')})">মুছুন</button></div><div class="hint">না দিলে নামের প্রথম শব্দে রঙিন লোগো হবে।</div>
    <input class="inp" id="cf_t" maxlength="160" placeholder="শিরোনাম * (যেমন: নাটোর সিভিল সার্জন কার্যালয় নিয়োগ বিজ্ঞপ্তি)" value="${esc(c.title || '')}"><input class="inp" id="cf_org" maxlength="80" placeholder="প্রতিষ্ঠানের নাম" value="${esc(c.org || '')}">
    <div class="lb-g2"><div><div class="hint">প্রকাশের তারিখ</div><input class="inp" id="cf_pd" type="date" value="${esc(c.pubDate || todayISO())}"></div><div><div class="hint">আবেদনের শেষ তারিখ</div><input class="inp" id="cf_dl" type="date" value="${esc(c.deadline || '')}"></div></div>
    <div class="lb-g2"><input class="inp" id="cf_src" maxlength="60" placeholder="সূত্র (যেমন: দৈনিক ইত্তেফাক)" value="${esc(c.src || '')}"><input class="inp" id="cf_posts" maxlength="30" placeholder="পদ সংখ্যা" value="${esc(c.posts || '')}"></div>
    <div class="hint">ক্যাটাগরি (বেছে নিন বা নিচে নতুন লিখুন)</div><select class="inp" id="cf_cat">${cats.map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select><input class="inp" id="cf_cat2" maxlength="30" placeholder="অথবা নতুন ক্যাটাগরির নাম">
    <input class="inp" id="cf_link" maxlength="300" placeholder="আবেদনের লিংক (ঐচ্ছিক)" value="${esc(c.link || '')}"><input class="inp" id="cf_pl" maxlength="300" placeholder="মূল PDF-এর লিংক (ঐচ্ছিক, যেমন Google Drive)" value="${esc(c.pdfLink || '')}"><textarea class="inp" id="cf_body" maxlength="1500" rows="3" placeholder="বিবরণ / নোট (ঐচ্ছিক)">${esc(c.body || '')}</textarea></div>
    <div class="cx"><b>বিজ্ঞপ্তির ফাইল</b><div class="hint">PDF দিলে প্রতিটি পেজ ছবি হয়ে যাবে (সর্বোচ্চ ৮ পেজ)। ছবিও দিতে পারেন। ব্যবহারকারী পেজগুলো ছবির মতো দেখবে ও PDF ডাউনলোড করতে পারবে।</div>
      <div style="display:flex;gap:8px;margin:8px 0"><label class="btn" style="flex:1;text-align:center;margin:0">📄 PDF আপলোড<input type="file" accept="application/pdf" style="display:none" onchange="circPdfPick(this)"></label><label class="btn" style="flex:1;text-align:center;margin:0">🖼 ছবি আপলোড<input type="file" accept="image/*" multiple style="display:none" onchange="circImgPick(this)"></label></div><div id="cf_pages"></div></div>
    <div id="ad_msg" class="warn" style="display:none"></div><div style="display:flex;gap:8px"><button class="btn" style="flex:1;background:#64748b" onclick="circSave(false)">খসড়া</button><button class="btn" style="flex:2" onclick="circSave(true)">✅ প্রকাশ করুন</button></div></div>`);
  circPagesDraw();
}
function circPagesDraw() { const b = document.getElementById('cf_pages'); if (!b) return; b.innerHTML = CF.imgs.map((s, i) => `<div class="doc-p"><img src="${s}"><span>পেজ ${bn(i + 1)}</span><button onclick="circImgDel(${i})">✕</button></div>`).join('') || '<div class="hint">এখনো কোনো পেজ নেই।</div>'; }
function circImgDel(i) { CF.imgs.splice(i, 1); CF.imgsChanged = true; circPagesDraw(); }
async function circLogoPick(inp) { const f = inp.files && inp.files[0]; if (!f) return; try { CF.logo = await p36Img(f, 170, 0.85, 30000); document.getElementById('cf_logo').innerHTML = circLogo({logo: CF.logo}); } catch (e) { alert('ছবিটি পড়া যায়নি।'); } inp.value = ''; }
async function circImgPick(inp) {
  const fs = Array.from(inp.files || []); inp.value = ''; for (const f of fs) { if (CF.imgs.length >= 8) { alert('সর্বোচ্চ ৮ পেজ।'); break; } try { CF.imgs.push(await p36Img(f, 1500, 0.78, 720000)); CF.imgsChanged = true; circPagesDraw(); } catch (e) { alert('একটি ছবি পড়া যায়নি।'); } }
}
async function p36PdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib; const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  await new Promise((ok, no) => { const s = document.createElement('script'); s.src = base + 'pdf.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const w = await (await fetch(base + 'pdf.worker.min.js')).text(); window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([w], {type: 'text/javascript'})); return window.pdfjsLib;
}
async function circPdfPick(inp) {
  const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return; const b = document.getElementById('cf_pages'); const old = b.innerHTML; b.innerHTML = '<div class="hint">⏳ PDF পড়া হচ্ছে... (প্রথমবার কিছুক্ষণ লাগতে পারে)</div>';
  try {
    const lib = await p36PdfJs(), doc = await lib.getDocument({data: await f.arrayBuffer()}).promise, n = Math.min(doc.numPages, 8);
    for (let i = 1; i <= n; i++) { if (CF.imgs.length >= 8) break; const pg = await doc.getPage(i), v0 = pg.getViewport({scale: 1}), k = 1400 / v0.width, v = pg.getViewport({scale: k}), cv = document.createElement('canvas'); cv.width = Math.round(v.width); cv.height = Math.round(v.height); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); await pg.render({canvasContext: g, viewport: v}).promise; let q = 0.78, out = cv.toDataURL('image/jpeg', q); while (out.length > 720000 && q > 0.45) { q -= 0.08; out = cv.toDataURL('image/jpeg', q); } CF.imgs.push(out); CF.imgsChanged = true; circPagesDraw(); }
    if (doc.numPages > 8) alert('PDF-এ ' + bn(doc.numPages) + ' পেজ আছে। প্রথম ৮ পেজ নেওয়া হয়েছে। বাকিটা "মূল PDF-এর লিংক" দিয়ে দিন।');
  } catch (e) { b.innerHTML = old; alert('PDF পড়া যায়নি। ইন্টারনেট দেখুন, অথবা PDF-এর পেজগুলোর স্ক্রিনশট/ছবি আপলোড করুন।'); circPagesDraw(); }
}
async function circSave(pub) {
  const msg = t => { const e = document.getElementById('ad_msg'); if (e) { e.style.display = 'block'; e.textContent = t; } };
  const m = await sme(); if (!m) return msg('লগইন দরকার।'); const t = gv('cf_t'); if (!t) return msg('শিরোনাম দিন।');
  const link = gv('cf_link'), pl = gv('cf_pl'); if (link && !safeUrl(link)) return msg('আবেদনের লিংকটি ঠিক নয় (https:// দিয়ে শুরু হতে হবে)।'); if (pl && !safeUrl(pl)) return msg('PDF-এর লিংকটি ঠিক নয়।');
  const F = m.f.F, ref = CF.id ? F.doc(m.f.db, 'circulars', CF.id) : F.doc(F.collection(m.f.db, 'circulars')), id = ref.id;
  const d = {title: t, org: gv('cf_org'), logo: CF.logo || '', pubDate: gv('cf_pd'), deadline: gv('cf_dl'), src: gv('cf_src'), posts: gv('cf_posts'), cat: gv('cf_cat2') || gv('cf_cat'), link, pdfLink: pl, body: gv('cf_body'), pub: !!pub, np: CF.imgs.length, at: Date.now(), by: m.u.uid};
  try {
    msg('⏳ সেভ হচ্ছে...'); await F.setDoc(ref, d);
    if (CF.imgsChanged || !CF.id) { const old = await sList(m.f, ['circimgs'], F.where('cid', '==', id)); for (const o of old) await F.deleteDoc(F.doc(m.f.db, 'circimgs', o.id)); for (let i = 0; i < CF.imgs.length; i++) await F.setDoc(F.doc(m.f.db, 'circimgs', id + '_' + i), {cid: id, n: i, img: CF.imgs[i]}); delete CIRC_IMG[id]; }
    await circLoad(); alert(pub ? '✅ বিজ্ঞপ্তি প্রকাশ হয়েছে।' : '✅ খসড়া সেভ হয়েছে।'); circPage();
  } catch (e) { msg('⚠️ ' + ((e && e.code === 'permission-denied') ? 'অনুমতি নেই (Firestore নিয়ম আপডেট করেছেন কি?)।' : 'সেভ হয়নি। ইন্টারনেট দেখুন বা ছবি কমান।')); }
}

// ---------- যোগাযোগ: বার্তা পাঠানো ও অ্যাডমিন ইনবক্স ----------
let MSG_IM = [];
function msgFormHtml() {
  const nm = ((typeof cloudInfo === 'function' && cloudInfo()) || {}).name || '';
  return `<div class="cx" id="msgbox" style="border-left-color:#0c6247"><b>✉️ আমাকে বার্তা পাঠান</b><div class="hint">প্রশ্ন, পরামর্শ বা সমস্যা এখানে লিখুন। বার্তা সরাসরি অ্যাডমিনের কাছে পৌঁছাবে। লগইন করা থাকতে হবে।</div>
    <input class="inp" id="mg_n" maxlength="60" placeholder="আপনার নাম" value="${esc(nm)}"><input class="inp" id="mg_p" maxlength="20" inputmode="tel" placeholder="মোবাইল নম্বর (ঐচ্ছিক)">
    <select class="inp" id="mg_s"><option>প্রশ্ন</option><option>পরামর্শ</option><option>সমস্যা / ভুল</option><option>চাকরির তথ্য</option><option>অন্যান্য</option></select>
    <textarea class="inp" id="mg_b" maxlength="1000" rows="4" placeholder="আপনার বার্তা লিখুন *"></textarea>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label class="btn sm" style="margin:0;background:#475569">📷 ছবি জুড়ুন<input type="file" accept="image/*" multiple style="display:none" onchange="msgPick(this)"></label><span class="hint" id="mg_c" style="margin:0">ছবি নেই</span></div><div id="mg_im" style="display:flex;gap:6px;margin:6px 0"></div>
    <div id="mg_m" class="warn" style="display:none"></div><button class="btn" onclick="msgSend()">📨 বার্তা পাঠান</button></div>`;
}
async function msgPick(inp) {
  const fs = Array.from(inp.files || []); inp.value = ''; for (const f of fs) { if (MSG_IM.length >= 3) { alert('সর্বোচ্চ ৩টি ছবি।'); break; } try { MSG_IM.push(await p36Img(f, 1000, 0.72, 260000)); } catch (e) {} }
  document.getElementById('mg_c').textContent = MSG_IM.length ? bn(MSG_IM.length) + 'টি ছবি জোড়া হয়েছে' : 'ছবি নেই';
  document.getElementById('mg_im').innerHTML = MSG_IM.map((s, i) => `<div class="doc-p" style="width:64px;height:64px"><img src="${s}"><button onclick="MSG_IM.splice(${i},1);msgPick({files:[]})">✕</button></div>`).join('');
}
async function msgSend() {
  const mm = t => { const e = document.getElementById('mg_m'); if (e) { e.style.display = 'block'; e.textContent = t; } };
  const body = gv('mg_b'); if (body.length < 3) return mm('বার্তা লিখুন।'); const ph = gv('mg_p'); if (ph && !/^[\d০-৯+\-\s]{6,20}$/.test(ph)) return mm('মোবাইল নম্বর ঠিক নয়।');
  if (Date.now() - (+localStorage.getItem('msgT') || 0) < 30000) return mm('একটু পরে আবার পাঠান।');
  const m = await sme(); if (!m) return mm('বার্তা পাঠাতে আগে লগইন করুন (নিচের ⭐ আমি → লগইন)।');
  try { mm('⏳ পাঠানো হচ্ছে...'); await m.f.F.addDoc(m.f.F.collection(m.f.db, 'msgs'), {by: m.u.uid, name: gv('mg_n').slice(0, 60), phone: ph, subj: gv('mg_s'), body: body.slice(0, 1000), imgs: MSG_IM.slice(0, 3), at: Date.now(), read: false}); MSG_IM = []; try { localStorage.setItem('msgT', String(Date.now())); } catch (e) {} const b = document.getElementById('msgbox'); if (b) b.innerHTML = '<div class="empty"><span class="e1">✅</span>বার্তা পাঠানো হয়েছে। ধন্যবাদ!</div>'; } catch (e) { mm('⚠️ পাঠানো যায়নি। ইন্টারনেট দেখুন।'); }
}
async function inboxHtml(m) {
  const rows = await sList(m.f, ['msgs'], m.f.F.orderBy('at', 'desc'), m.f.F.limit(200)); window._inbox = rows; const nu = rows.filter(r => !r.read).length;
  return `<div class="cx"><b>📥 ইনবক্স</b><div class="hint">মোট ${bn(rows.length)}টি • নতুন ${bn(nu)}টি</div></div>` + (rows.map((r, i) => `<div class="cx" style="${r.read ? '' : 'border-left:5px solid #f59e0b;background:#fffbeb'}"><div style="display:flex;justify-content:space-between;gap:8px"><b>${r.read ? '' : '🟡 '}${esc(r.name || 'নামহীন')}</b><small style="color:#64748b">${lgDate(p36day(r.at))}, ${p36hm(r.at)}</small></div><div class="hint" style="margin:2px 0"><span class="tag" style="background:#0c6247">${esc(r.subj || '')}</span>${r.phone ? ' 📞 ' + esc(r.phone) : ''}</div><div style="white-space:pre-wrap;margin:6px 0">${esc(r.body || '')}</div>${(r.imgs || []).map((s, k) => `<img src="${s}" style="height:90px;border-radius:8px;margin:2px;border:1px solid #cbd5e1" onclick="inboxZoom(${i},${k})">`).join('')}
    <div class="rowline" style="margin-top:6px"><button class="btn sm" style="background:#16a34a;margin:0" onclick="inboxRead(${i})">${r.read ? '↩ নতুন চিহ্ন' : '✔ পড়া হয়েছে'}</button>${r.phone ? `<a class="btn sm" style="background:#0b6e4f;margin:0;text-decoration:none" href="tel:${esc(String(r.phone).replace(/[^\d+]/g, ''))}">📞 কল</a>` : ''}<button class="btn sm" style="background:#475569;margin:0" onclick="inboxCopy(${i})">📋 কপি</button><button class="btn sm" style="background:#dc2626;margin:0" onclick="inboxDel(${i})">🗑</button></div></div>`).join('') || sEmpty('📭', 'এখনো কোনো বার্তা আসেনি।'));
}
function inboxZoom(i, k) { const s = (window._inbox[i].imgs || [])[k]; if (!s) return; CIRC_IMG['_ib'] = [s]; circZoom('_ib', 0); }
async function inboxRead(i) { const r = window._inbox[i], m = await sme(); if (!m) return; try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'msgs', r.id), {read: !r.read}, {merge: true}); adminPage('inbox'); } catch (e) { alert('হয়নি।'); } }
async function inboxDel(i) { if (!confirm('বার্তাটি মুছবেন?')) return; const r = window._inbox[i], m = await sme(); if (!m) return; try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'msgs', r.id)); adminPage('inbox'); } catch (e) { alert('মোছা যায়নি।'); } }
function inboxCopy(i) { const r = window._inbox[i], t = `${r.name || ''} ${r.phone || ''}\n[${r.subj || ''}] ${r.body || ''}`; try { navigator.clipboard.writeText(t); alert('কপি হয়েছে।'); } catch (e) { prompt('কপি করুন:', t); } }
async function inboxCount() { try { const m = await sme(); if (!m || !isAdminFlag()) return 0; const r = await sList(m.f, ['msgs'], m.f.F.where('read', '==', false), m.f.F.limit(50)); return r.length; } catch (e) { return 0; } }
function p36ContactAdd() {
  const app = document.getElementById('app'), p = app && app.querySelector('.pad'); if (!p || document.getElementById('msgbox') || (app.innerText || '').slice(0, 200).indexOf('যোগাযোগ') < 0) return;
  const adm = document.getElementById('ibtn'); p.insertAdjacentHTML('beforeend', (isAdminFlag() ? `<button id="ibtn" class="btn" style="background:#b45309;width:100%" onclick="push(()=>contactPage());adminPage('inbox')">📥 ইনবক্স দেখুন (অ্যাডমিন)</button>` : '') + msgFormHtml());
  if (isAdminFlag()) inboxCount().then(n => { const b = document.getElementById('ibtn'); if (b && n) b.textContent = '📥 ইনবক্স — ' + bn(n) + 'টি নতুন বার্তা'; });
}

// ---------- আয়-খরচ রিপোর্ট (PDF / Excel) ও আনলিমিটেড বছর ----------
function lgYear(d) { const t = +todayISO().slice(0, 4); LG_Y = (LG_Y || t) + d; if (LG_Y < 1990) LG_Y = 1990; if (LG_Y > 2200) LG_Y = 2200; ledgerPage(); }
let RP = {kind: 'm', ym: '', y: 0, from: '', to: ''};
function lgReport() {
  const t = todayISO(); RP = {kind: 'm', ym: t.slice(0, 7), y: +t.slice(0, 4), from: t.slice(0, 8) + '01', to: t};
  showModal(`<h3 style="margin:0 0 8px">📤 হিসাবের রিপোর্ট</h3><div class="hint">কোন সময়ের হিসাব চান বেছে নিন। তারপর PDF বা Excel নিন।</div>
    <div class="seg" style="margin:8px 0"><button id="rk_m" class="on" onclick="rpKind('m')">মাস</button><button id="rk_y" onclick="rpKind('y')">বছর</button><button id="rk_r" onclick="rpKind('r')">সময়</button><button id="rk_a" onclick="rpKind('a')">সব</button></div>
    <div id="rp_in"></div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn" style="flex:1" onclick="rpGo('pdf')">📄 PDF</button><button class="btn" style="flex:1;background:#15803d" onclick="rpGo('xlsx')">📊 Excel</button></div><div id="rp_m" class="hint" style="margin-top:6px"></div>`); rpKind('m');
}
function rpKind(k) {
  RP.kind = k; ['m', 'y', 'r', 'a'].forEach(x => { const b = document.getElementById('rk_' + x); if (b) b.className = x === k ? 'on' : ''; });
  const h = {m: `<input class="inp" type="month" value="${RP.ym}" onchange="RP.ym=this.value">`, y: `<div class="lg-yn" style="justify-content:center"><button onclick="RP.y--;rpKind('y')">‹</button><b>${bn(RP.y)} সাল</b><button onclick="RP.y++;rpKind('y')">›</button></div>`, r: `<div class="lb-g2"><div><div class="hint">শুরু</div><input class="inp" type="date" value="${RP.from}" onchange="RP.from=this.value"></div><div><div class="hint">শেষ</div><input class="inp" type="date" value="${RP.to}" onchange="RP.to=this.value"></div></div>`, a: '<div class="hint">এখন পর্যন্ত লেখা সব হিসাব।</div>'}[k];
  document.getElementById('rp_in').innerHTML = h;
}
function rpData() {
  const l = ledgerData(); let es = l.entries.slice(), title = '';
  if (RP.kind === 'm') { es = es.filter(e => e.date.slice(0, 7) === RP.ym); title = lmName(RP.ym); }
  else if (RP.kind === 'y') { es = es.filter(e => e.date.slice(0, 4) === String(RP.y)); title = bn(RP.y) + ' সাল'; }
  else if (RP.kind === 'r') { es = es.filter(e => e.date >= RP.from && e.date <= RP.to); title = lgDate(RP.from) + ' থেকে ' + lgDate(RP.to); }
  else title = 'সব হিসাব';
  es.sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id)); const inc = lsum(es, 'in'), out = lsum(es, 'out'), cat = {};
  es.filter(e => e.type === 'out').forEach(e => { const k = e.cat || 'খরচ'; cat[k] = (cat[k] || 0) + e.amt; });
  const mon = {}; es.forEach(e => { const k = e.date.slice(0, 7); mon[k] = mon[k] || {i: 0, o: 0}; mon[k][e.type === 'in' ? 'i' : 'o'] += e.amt; });
  return {es, title, inc, out, cat, mon};
}
const rpN = v => String(Math.round(v * 100) / 100);
async function rpGo(fmt) {
  const d = rpData(), m = document.getElementById('rp_m'); if (!d.es.length) { if (m) m.textContent = 'এই সময়ে কোনো হিসাব নেই।'; return; } if (m) m.textContent = '⏳ তৈরি হচ্ছে...';
  const nm = 'hisab_' + (RP.kind === 'm' ? RP.ym : RP.kind === 'y' ? RP.y : RP.kind === 'r' ? RP.from + '_' + RP.to : 'sob');
  try { if (fmt === 'pdf') { await lbSaveFile(nm + '.pdf', await rpPdf(d), 'application/pdf', 'আয়-খরচের রিপোর্ট'); } else { await lbSaveFile(nm + '.xlsx', rpXlsx(d), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'আয়-খরচের রিপোর্ট'); } if (m) m.textContent = '✅ হয়েছে।'; } catch (e) { if (m) m.textContent = '⚠️ ফাইল তৈরি হয়নি।'; }
}
async function rpPdf(d) {
  const W = 1240, H = 1754, P = 70, rowH = 54, pages = []; let cv, g, y;
  const np = () => { cv = document.createElement('canvas'); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); pages.push(cv); y = P; };
  const F = (w, s) => `${w} ${s}px "Noto Sans Bengali","Hind Siliguri",sans-serif`;
  try { await document.fonts.load(F(700, 30), 'আয়'); } catch (e) {}
  const txt = (s, x, yy, font, col, al) => { g.font = font; g.fillStyle = col; g.textAlign = al || 'left'; g.fillText(String(s), x, yy); };
  np(); const PI = padOn() ? await padImgs() : null; if (PI) { y = padDraw(g, W, P, PI) + 14; txt('আয়-খরচের রিপোর্ট • ' + d.title, P, y + 28, F(800, 30), '#0b3d2e'); y += 64; } else { g.fillStyle = '#05301f'; g.fillRect(0, 0, W, 150); txt('আমার ভাই — আয়-খরচের রিপোর্ট', P, 72, F(800, 44), '#ffc83d'); txt(d.title, P, 120, F(600, 30), '#fff'); y = 190; }
  const box = (lab, v, col, x) => { g.fillStyle = '#f4f6f4'; g.fillRect(x, y, 350, 110); txt(lab, x + 24, y + 42, F(600, 26), '#475569'); txt('৳ ' + bn(rpN(v)), x + 24, y + 88, F(800, 38), col); };
  box('মোট আয়', d.inc, '#15803d', P); box('মোট খরচ', d.out, '#dc2626', P + 380); box(d.inc - d.out >= 0 ? 'ব্যালেন্স' : 'ঘাটতি', Math.abs(d.inc - d.out), '#0b3d2e', P + 760); y += 150;
  const cats = Object.keys(d.cat).sort((a, b) => d.cat[b] - d.cat[a]).slice(0, 8);
  if (cats.length) { txt('খরচ — খাত অনুযায়ী', P, y + 30, F(800, 30), '#0b3d2e'); y += 48; const mx = Math.max(...cats.map(k => d.cat[k])); cats.forEach(k => { txt(k, P, y + 30, F(600, 26), '#14231c'); g.fillStyle = '#e5eae7'; g.fillRect(P + 300, y + 8, 560, 28); g.fillStyle = '#dc2626'; g.fillRect(P + 300, y + 8, 560 * d.cat[k] / mx, 28); txt('৳ ' + bn(rpN(d.cat[k])), W - P, y + 32, F(700, 26), '#14231c', 'right'); y += 46; }); y += 20; }
  const ms = Object.keys(d.mon).sort(); if (ms.length > 1) { txt('মাস অনুযায়ী', P, y + 30, F(800, 30), '#0b3d2e'); y += 48; ms.forEach(k => { if (y > H - 200) np(); txt(lmName(k), P, y + 30, F(600, 26), '#14231c'); txt('আয় ' + bn(rpN(d.mon[k].i)), P + 420, y + 30, F(600, 26), '#15803d'); txt('খরচ ' + bn(rpN(d.mon[k].o)), P + 700, y + 30, F(600, 26), '#dc2626'); txt('= ' + bn(rpN(d.mon[k].i - d.mon[k].o)), W - P, y + 30, F(700, 26), '#14231c', 'right'); y += 44; }); y += 20; }
  if (y > H - 260) np(); txt('সব হিসাব', P, y + 30, F(800, 30), '#0b3d2e'); y += 50;
  const head = () => { g.fillStyle = '#0b3d2e'; g.fillRect(P, y, W - 2 * P, rowH); txt('তারিখ', P + 16, y + 36, F(700, 24), '#fff'); txt('খাত / বিবরণ', P + 250, y + 36, F(700, 24), '#fff'); txt('আয়', W - P - 300, y + 36, F(700, 24), '#fff', 'right'); txt('খরচ', W - P - 16, y + 36, F(700, 24), '#fff', 'right'); y += rowH; }; head();
  d.es.forEach((e, i) => { if (y > H - 110) { np(); head(); } if (i % 2) { g.fillStyle = '#f6f8f6'; g.fillRect(P, y, W - 2 * P, rowH); } txt(lgDate(e.date), P + 16, y + 26, F(500, 21), '#14231c'); if (lgTmOf(e)) txt(lgTmPlain(lgTmOf(e)), P + 16, y + 47, F(500, 16), '#64748b'); const s = (e.cat || '') + (e.note ? ' — ' + e.note : ''); txt(s.length > 34 ? s.slice(0, 33) + '…' : s, P + 250, y + 36, F(500, 23), '#14231c'); if (e.type === 'in') txt(bn(rpN(e.amt)), W - P - 300, y + 36, F(700, 23), '#15803d', 'right'); else txt(bn(rpN(e.amt)), W - P - 16, y + 36, F(700, 23), '#dc2626', 'right'); y += rowH; });
  if (y > H - 110) np(); g.fillStyle = '#ffc83d'; g.fillRect(P, y, W - 2 * P, rowH + 6); txt('মোট', P + 16, y + 40, F(800, 26), '#05301f'); txt(bn(rpN(d.inc)), W - P - 300, y + 40, F(800, 26), '#05301f', 'right'); txt(bn(rpN(d.out)), W - P - 16, y + 40, F(800, 26), '#05301f', 'right');
  pages.forEach((c, i) => { const g2 = c.getContext('2d'); g2.font = F(500, 20); g2.fillStyle = '#6b7a72'; g2.textAlign = 'center'; g2.fillText('আমার ভাই অ্যাপ • পেজ ' + bn(i + 1) + '/' + bn(pages.length), W / 2, H - 28); });
  const jp = pages.map(c => Uint8Array.from(atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), ch => ch.charCodeAt(0))); return pdfMulti(jp, W, H, 595);
}
function rpXlsx(d) {
  const X = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), col = i => String.fromCharCode(65 + i);
  const rows = []; let r = 0; const merges = [];
  const add = (cells, h) => { r++; rows.push(`<row r="${r}"${h ? ` ht="${h}" customHeight="1"` : ''}>${cells.map((c, i) => { if (c == null) return ''; const ref = col(i) + r; if (c.f) return `<c r="${ref}" s="${c.s || 0}"><f>${X(c.f)}</f><v>${c.v}</v></c>`; if (typeof c.v === 'number') return `<c r="${ref}" s="${c.s || 0}"><v>${c.v}</v></c>`; return `<c r="${ref}" s="${c.s || 0}" t="inlineStr"><is><t xml:space="preserve">${X(c.v)}</t></is></c>`; }).join('')}</row>`); return r; };
  const S = (v, s) => ({v, s});
  merges.push('A1:E1'); add([S(padOn() ? (padGet().name || padGet().owner) : (d.head || 'আমার ভাই — আয়-খরচের রিপোর্ট'), 1), S('', 1), S('', 1), S('', 1), S('', 1)], 30); merges.push('A2:E2'); add([S((padOn() ? (d.head || '') + ' • ' : '') + d.title, 2), S('', 2), S('', 2), S('', 2), S('', 2)], 22); if (padOn() && padLines().length) { merges.push('A3:E3'); add([S(padLines().join('   •   '), 2), S('', 2), S('', 2), S('', 2), S('', 2)], 20); } add([]);
  add([S('তারিখ', 3), S('ধরন', 3), S(d.catL || 'খাত', 3), S('বিবরণ', 3), S('টাকা', 3)], 24); const first = r + 1;
  d.es.forEach(e => add([S(e.date + (lgTmOf(e) ? ' ' + lgTmOf(e) : ''), 4), S(e.type === 'in' ? (d.inL || 'আয়') : (d.outL || 'খরচ'), e.type === 'in' ? 5 : 6), S(e.cat || '', 4), S(e.note || '', 4), S(e.type === 'in' ? e.amt : -e.amt, 7)])); const last = r;
  add([]); const a = add([S(d.totIn || 'মোট আয়', 8), null, null, null, {f: `SUMIF(B${first}:B${last},"${d.inL || 'আয়'}",E${first}:E${last})`, v: d.inc, s: 9}]), b = add([S(d.totOut || 'মোট খরচ', 8), null, null, null, {f: `-SUMIF(B${first}:B${last},"${d.outL || 'খরচ'}",E${first}:E${last})`, v: d.out, s: 9}]); add([S(d.balL || 'ব্যালেন্স', 8), null, null, null, {f: `E${a}-E${b}`, v: d.inc - d.out, s: 9}]);
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="166" formatCode="#,##0.00"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FFFFC83D"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF05301F"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B3D2E"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFC83D"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCCCCCC"/></left><right style="thin"><color rgb="FFCCCCCC"/></right><top style="thin"><color rgb="FFCCCCCC"/></top><bottom style="thin"><color rgb="FFCCCCCC"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="166" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs></styleSheet>`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:E${r}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="9" customWidth="1"/><col min="3" max="3" width="24" customWidth="1"/><col min="4" max="4" width="34" customWidth="1"/><col min="5" max="5" width="16" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(x => `<mergeCell ref="${x}"/>`).join('')}</mergeCells><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Hisab" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  return lbZip([
    {name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
    {name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name: 'xl/workbook.xml', data: wb}, {name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name: 'xl/styles.xml', data: styles}, {name: 'xl/worksheets/sheet1.xml', data: sheet}]);
}

// ---------- ইনস্টল ও স্টাইল ----------
function p36Init() {
  if (window.__p36) return; window.__p36 = 1;
  const o = window.open_; window.open_ = function (id) { if (id === 'hist') { push(() => home()); return hsPage(); } if (id === 'circ') { push(() => home()); return circPage(); } try { hsLog(id); } catch (e) {} return o.apply(this, arguments); };
  const h0 = window.home; window.home = function () { HS_CUR = null; return h0.apply(this, arguments); };
  const a0 = window.accountPage; window.accountPage = function () { const r = a0.apply(this, arguments); setTimeout(hsCard, 80); setTimeout(hsCard, 800); setTimeout(hsCard, 2200); return r; };
  const c0 = window.contactPage; window.contactPage = function () { const r = c0.apply(this, arguments); setTimeout(p36ContactAdd, 60); setTimeout(p36ContactAdd, 700); return r; };
  const l0 = window.ledgerPage; window.ledgerPage = function () { const r = l0.apply(this, arguments); setTimeout(() => { const b = document.querySelector('#app .lg-more'); if (b && !document.getElementById('lg_rp')) b.insertAdjacentHTML('beforebegin', '<button id="lg_rp" class="lg-more" style="margin-bottom:8px" onclick="lgReport()">📤 রিপোর্ট নিন (PDF / Excel)</button>'); }, 30); return r; };
  window.addEventListener('scroll', hsScroll, {passive: true});
}
(function () { const st = document.createElement('style'); st.textContent = `
body #ndsheet .sh{padding:6px 14px 16px}body #ndsheet h4{font-size:15px;margin:0 0 8px}body #ndsheet .nx{height:26px;margin-bottom:0}
body #ndsheet .q{grid-template-columns:repeat(4,1fr);gap:9px 2px}body #ndsheet .q div{font-size:11px;line-height:1.25}body #ndsheet .q span{width:48px;height:48px;border-radius:15px;font-size:23px;margin-bottom:3px}
body #ndsheet .q.ed{max-height:46vh}body #ndsheet .ned{padding:8px;font-size:13px;margin-top:8px}
.lg-yn{display:flex;align-items:center;gap:14px}.lg-yn button{border:0;background:#eef2ee;border-radius:10px;width:38px;height:34px;font-size:20px;font-weight:800}.lg-yn b{font-size:17px}
.hs-res{background:linear-gradient(135deg,#0a4a35,#05301f);color:#fff;border:1px solid #ffc83d66;border-radius:18px;padding:14px 16px;margin:8px 0}.hs-res small{display:block;color:#bfe3d2;font-size:12.5px}.hs-res small:first-child{color:#ffc83d;font-weight:700}.hs-res b{display:block;font-size:17px;margin:3px 0;line-height:1.35}.hs-res .btn{margin:10px 0 0;width:100%}
.hs-bar{height:6px;border-radius:6px;background:#ffffff33;margin:6px 0 0;overflow:hidden}.hs-bar i{display:block;height:100%;background:linear-gradient(90deg,#0c6247,#ffc83d)}.hs-bar.s{background:#e5eae7}
.hs-d{font-weight:800;color:#0a5a3f;font-size:13.5px;margin:12px 2px 2px}.hs-r{display:flex;gap:10px;align-items:center;padding:10px 4px;border-bottom:1px solid #ebe5d6;cursor:pointer}.hs-r .ic{width:42px;height:42px;border-radius:12px;background:#eef2ee;display:flex;align-items:center;justify-content:center;font-size:21px;flex:none}.hs-r b{display:block;font-size:14.5px;line-height:1.3}.hs-r small{color:#6b7a72;font-size:12px}
.cc{display:flex;gap:10px;align-items:center;background:#fff;border:1px solid #ebe5d6;border-radius:16px;padding:10px 12px;margin:8px 0;box-shadow:0 2px 8px #0001;cursor:pointer}.cc b{display:block;font-size:14.5px;line-height:1.35}.cc small{display:block;color:#0a7a6a;font-size:12px;margin:1px 0 3px}.cc-h{font-size:22px}
.cc-logo{width:54px;height:54px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px;text-align:center;line-height:1.1;overflow:hidden;padding:2px;word-break:break-all}.cc-logo img{width:100%;height:100%;object-fit:contain;background:#fff}
.cc-chip{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin:0 4px 2px 0}.cv-r{font-size:13.5px;line-height:1.9}.cv-btns{display:flex;gap:8px;margin-top:8px}.cv-btns .btn{margin:0}
.doc-p{position:relative;display:inline-block;width:92px;height:116px;margin:4px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;vertical-align:top}.doc-p img{width:100%;height:100%;object-fit:cover}.doc-p span{position:absolute;left:0;right:0;bottom:0;background:#000a;color:#fff;font-size:11px;text-align:center}.doc-p button{position:absolute;top:2px;right:2px;border:0;border-radius:50%;width:22px;height:22px;background:#fff;font-size:12px}
`; document.head.appendChild(st); })();

// =====================================================================
//  P43: বিজ্ঞাপন ফর্মের বিবরণ/ছবি/লিংক/PDF • সাপ্তাহিক পত্রিকা • ড্রাইভিং জব ও বিদেশে চাকরি আলাদা
//       বিদেশে চাকরির প্রস্তুতি • আমার কার্ড • আইকনের ভিতরে আইকন
// =====================================================================
const p43Date = iso => iso && iso.length >= 10 ? bn(+iso.slice(8, 10)) + ' ' + L_MON[+iso.slice(5, 7) - 1] + ' ' + bn(iso.slice(0, 4)) : '';
const P43_WD = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const p43Wd = iso => { try { return P43_WD[new Date(iso + 'T12:00:00').getDay()]; } catch (e) { return ''; } };
const p43Fri = () => { const d = lastFriday(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const p43Btn = (u, t, bg) => `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:8px;background:${bg}" href="${esc(u)}" onclick="goUrl(this.getAttribute('href'));return false">${t}</a>`;

// ---------- ১. বিবরণ + ছবি + লিংক + PDF (সব ফর্মে একই) ----------
const ADX = {}, ADX_MAX = 4, ADX_LEN = 110000;
function adxHtml(p, o, opt) {
  o = o || {}; opt = opt || {}; ADX[p] = {imgs: Array.isArray(o.imgs) ? o.imgs.filter(s => /^data:image\//.test(s)).slice(0, ADX_MAX) : []};
  setTimeout(() => adxDraw(p), 0);
  return `<div class="adx"><div class="adx-h">📝 ${esc(opt.label || 'বিস্তারিত বিবরণ')} (বড় ঘর)</div><textarea class="inp" id="${p}_more" maxlength="3000" rows="${opt.rows || 7}" oninput="adxCnt('${p}')" placeholder="${esc(opt.ph || 'কাজের ধরন, শর্ত, কাগজপত্র, আবেদনের নিয়ম… যত খুশি বিস্তারিত লিখুন।')}">${esc(o.more || '')}</textarea><div class="hint" style="text-align:right"><span id="${p}_cnt">০</span> / ৩০০০ অক্ষর</div>
    <div class="adx-h">🖼 ছবি (সর্বোচ্চ ${bn(ADX_MAX)}টি)</div><div id="${p}_imgs" class="adx-im"></div>
    <div style="display:flex;gap:8px;margin-top:6px"><label class="btn sm adx-b">🖼 ছবি বাছুন<input type="file" accept="image/*" multiple style="display:none" onchange="adxPick('${p}',this)"></label><label class="btn sm adx-b" style="background:#7c3aed">📄 PDF বাছুন<input type="file" accept="application/pdf" style="display:none" onchange="adxPdf('${p}',this)"></label></div><div class="hint">PDF বাছলে পেজগুলো ছবি হয়ে যাবে (ছবি মিলিয়ে সর্বোচ্চ ${bn(ADX_MAX)}টি)।</div>
    <input class="inp" id="${p}_lk" maxlength="300" placeholder="🔗 লিংক (ঐচ্ছিক) — ফেসবুক পোস্ট, ওয়েবসাইট, আবেদনের ফর্ম" value="${esc(o.link || '')}"><input class="inp" id="${p}_pl" maxlength="300" placeholder="📄 PDF ডাউনলোডের লিংক (ঐচ্ছিক, যেমন Google Drive)" value="${esc(o.pdfLink || '')}"></div>`;
}
function adxCnt(p) { const t = document.getElementById(p + '_more'), c = document.getElementById(p + '_cnt'); if (t && c) c.textContent = bn(t.value.length); }
function adxDraw(p) {
  adxCnt(p); const b = document.getElementById(p + '_imgs'); if (!b || !ADX[p]) return;
  b.innerHTML = ADX[p].imgs.map((s, i) => `<div class="doc-p" style="width:74px;height:74px"><img src="${s}"><button onclick="adxDel('${p}',${i})">✕</button></div>`).join('') || '<div class="hint">এখনো কোনো ছবি নেই।</div>';
}
function adxDel(p, i) { ADX[p].imgs.splice(i, 1); adxDraw(p); }
async function adxPick(p, inp) {
  const fs = Array.from(inp.files || []); inp.value = '';
  for (const f of fs) { if (ADX[p].imgs.length >= ADX_MAX) { alert('সর্বোচ্চ ' + bn(ADX_MAX) + 'টি ছবি।'); break; } try { ADX[p].imgs.push(await p36Img(f, 900, 0.72, ADX_LEN)); adxDraw(p); } catch (e) { alert('একটি ছবি পড়া যায়নি।'); } }
}
async function adxPdf(p, inp) {
  const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return; const b = document.getElementById(p + '_imgs'); if (b) b.innerHTML = '<div class="hint">⏳ PDF পড়া হচ্ছে... (প্রথমবার কিছুক্ষণ লাগতে পারে)</div>';
  try {
    const lib = await p36PdfJs(), doc = await lib.getDocument({data: await f.arrayBuffer()}).promise;
    for (let i = 1; i <= doc.numPages && ADX[p].imgs.length < ADX_MAX; i++) {
      const pg = await doc.getPage(i), v0 = pg.getViewport({scale: 1}), v = pg.getViewport({scale: 900 / v0.width}), cv = document.createElement('canvas'); cv.width = Math.round(v.width); cv.height = Math.round(v.height);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); await pg.render({canvasContext: g, viewport: v}).promise; let q = 0.72, out = cv.toDataURL('image/jpeg', q); while (out.length > ADX_LEN && q > 0.4) { q -= 0.07; out = cv.toDataURL('image/jpeg', q); } ADX[p].imgs.push(out);
    }
    if (doc.numPages > ADX_MAX) alert('PDF-এর প্রথম পেজগুলো নেওয়া হয়েছে (সর্বোচ্চ ' + bn(ADX_MAX) + 'টি ছবি)। পুরোটা দিতে "PDF ডাউনলোডের লিংক" ঘরে লিংক দিন।');
  } catch (e) { alert('PDF পড়া যায়নি। ইন্টারনেট দেখুন, অথবা পেজের ছবি দিন।'); }
  adxDraw(p);
}
function adxRead(p) {
  const o = {more: gv(p + '_more').slice(0, 3000), imgs: (ADX[p] || {imgs: []}).imgs.slice(), link: gv(p + '_lk'), pdfLink: gv(p + '_pl')};
  if (o.link && !safeUrl(o.link)) throw new Error('লিংকটি ঠিক নয় (https:// দিয়ে শুরু হতে হবে)।'); if (o.pdfLink && !safeUrl(o.pdfLink)) throw new Error('PDF-এর লিংকটি ঠিক নয়।');
  if (JSON.stringify(o.imgs).length > 520000) throw new Error('ছবি বেশি বড় হয়ে গেছে। কিছু ছবি সরান।');
  return o;
}
function adxView(o, key, skipLink) {
  if (!o) return ''; const lk = skipLink ? '' : safeUrl(o.link), pl = safeUrl(o.pdfLink), im = Array.isArray(o.imgs) ? o.imgs.filter(s => /^data:image\//.test(s)) : []; CIRC_IMG['_ax' + key] = im;
  return (o.more ? `<div class="adx-more">${esc(o.more)}</div>` : '') + (im.length ? `<div class="adx-vi">${im.map((s, i) => `<img src="${s}" alt="" onclick="circZoom('_ax${esc(key)}',${i})">`).join('')}</div><div class="hint">ছবিতে চাপলে বড় হবে</div>` : '') + (lk ? p43Btn(lk, '🔗 লিংক খুলুন', '#2563eb') : '') + (pl ? p43Btn(pl, '⬇ PDF ডাউনলোড করুন', '#7c3aed') : '');
}
// বড় করে দেখা: চিমটি/+ − বাটনে জুম, আগের-পরের পেজ
function p43Zoom(id, i) {
  const arr = CIRC_IMG[id] || []; if (!arr[i]) return; let k = i, z = 100; const old = document.getElementById('czoom'); if (old) old.remove();
  const o = document.createElement('div'); o.id = 'czoom'; o.style.cssText = 'position:fixed;inset:0;z-index:300;background:#000';
  o.innerHTML = `<div id="cz_s" style="position:absolute;inset:0;overflow:auto;-webkit-overflow-scrolling:touch"><img id="cz_i" style="display:block;width:100%;margin:56px 0 70px"></div><button id="cz_x" style="position:fixed;top:10px;right:10px;border:0;border-radius:50%;width:42px;height:42px;font-size:20px;background:#fff">✕</button><div id="cz_l" style="position:fixed;top:14px;left:12px;color:#fff;font-size:12px;background:#0009;padding:6px 10px;border-radius:14px"></div><div style="position:fixed;left:0;right:0;bottom:14px;display:flex;justify-content:center;gap:8px"><button id="cz_p" class="czb">← আগে</button><button id="cz_m" class="czb">−</button><button id="cz_a" class="czb">＋</button><button id="cz_n" class="czb">পরে →</button></div>`;
  document.body.appendChild(o); const img = o.querySelector('#cz_i'), lab = o.querySelector('#cz_l'), sc = o.querySelector('#cz_s');
  const draw = () => { img.src = arr[k]; img.style.width = z + '%'; lab.textContent = (arr.length > 1 ? 'পেজ ' + bn(k + 1) + '/' + bn(arr.length) + ' • ' : '') + 'জুম ' + bn(Math.round(z)) + '%'; o.querySelector('#cz_p').style.display = o.querySelector('#cz_n').style.display = arr.length > 1 ? '' : 'none'; };
  const setZ = v => { z = Math.max(100, Math.min(500, v)); img.style.width = z + '%'; lab.textContent = lab.textContent.replace(/জুম .*$/, 'জুম ' + bn(Math.round(z)) + '%'); };
  o.querySelector('#cz_x').onclick = () => o.remove(); o.querySelector('#cz_a').onclick = () => setZ(z + 50); o.querySelector('#cz_m').onclick = () => setZ(z - 50);
  o.querySelector('#cz_p').onclick = () => { k = (k + arr.length - 1) % arr.length; z = 100; draw(); sc.scrollTop = 0; }; o.querySelector('#cz_n').onclick = () => { k = (k + 1) % arr.length; z = 100; draw(); sc.scrollTop = 0; };
  let d0 = 0, z0 = 100; sc.addEventListener('touchstart', e => { if (e.touches.length === 2) { d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); z0 = z; } }, {passive: true});
  sc.addEventListener('touchmove', e => { if (e.touches.length === 2 && d0) { setZ(z0 * Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) / d0); if (e.cancelable) e.preventDefault(); } }, {passive: false});
  sc.addEventListener('touchend', e => { if (e.touches.length < 2) d0 = 0; }, {passive: true}); draw();
}

// ---------- ২. সাপ্তাহিক চাকরির পত্রিকা (তারিখ ধরে) ----------
let PP = {m: '', y: ''};
const p39Rows = () => CIRC.filter(c => c.kind === 'paper' && (c.pub !== false || isAdminFlag())).sort((a, b) => p36n(b.pubDate).localeCompare(p36n(a.pubDate)) || (b.at || 0) - (a.at || 0));
function p39Page() {
  tab = 'job'; HS_CUR = null; try { hsLog('paper', {t: 'সাপ্তাহিক চাকরির পত্রিকা', ic: '📰'}); } catch (e) {}
  render(pageHead('সাপ্তাহিক চাকরির পত্রিকা') + `<div class="pad pp39">${isAdminFlag() ? `<button class="btn" style="width:100%;background:#7c3aed" onclick="push(()=>paperPage());p39Form('')">➕ নতুন পত্রিকা (অ্যাডমিন)</button>` : ''}<div id="pp_top"></div><div id="pp_flt"></div><div id="pp_ls"></div><div id="pp_old"></div></div>`);
  p39Draw(); circLoad().then(ok => { if (ok && document.getElementById('pp_ls')) p39Draw(); });
}
function p39Mini() { return `<div class="pp-mini"><div>চাকরির খবর</div><u></u><u></u><u></u></div>`; }
function p39Draw() {
  const rows = p39Rows(), pubd = rows.filter(r => r.pub !== false), hero = pubd[0], top = document.getElementById('pp_top'); if (!top) return;
  top.innerHTML = hero ? `<div class="pp-hero"><small>🆕 সর্বশেষ সংখ্যা</small><div class="pp-hr">${p39Mini()}<div style="flex:1"><b>${p43Wd(hero.pubDate)}, ${p43Date(hero.pubDate)}</b><div class="pp-s">${bn(hero.np || 0)} পেজ</div><button class="btn" style="background:linear-gradient(#ffd54f,#f0a400);color:#05301f" onclick="p39View('${esc(hero.id)}')">👁 দেখুন</button></div></div></div>` : (CLOUD_ON() ? '<div class="empty"><span class="e1">📭</span>এখনো কোনো পত্রিকা যোগ হয়নি।</div>' : '<div class="empty"><span class="e1">📭</span>পত্রিকা দেখতে ইন্টারনেট ও ক্লাউড চালু থাকতে হবে।</div>');
  const yrs = [...new Set(rows.map(r => p36n(r.pubDate).slice(0, 4)).filter(Boolean))].sort().reverse();
  document.getElementById('pp_flt').innerHTML = rows.length > 1 ? `<div class="lb-g2"><select class="inp" onchange="PP.m=this.value;p39Draw()"><option value="">সব মাস</option>${L_MON.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}" ${PP.m === String(i + 1).padStart(2, '0') ? 'selected' : ''}>${m}</option>`).join('')}</select><select class="inp" onchange="PP.y=this.value;p39Draw()"><option value="">সব বছর</option>${yrs.map(y => `<option value="${y}" ${PP.y === y ? 'selected' : ''}>${bn(y)}</option>`).join('')}</select></div>` : '';
  const flt = PP.m || PP.y, list = rows.filter(r => (flt || r !== hero) && (!PP.m || p36n(r.pubDate).slice(5, 7) === PP.m) && (!PP.y || p36n(r.pubDate).slice(0, 4) === PP.y));
  document.getElementById('pp_ls').innerHTML = (list.length ? `<div class="pp-t">${flt ? 'খুঁজে পাওয়া সংখ্যা' : 'পুরনো সংখ্যা'}</div>` : '') + list.map(r => `<div class="pp-r" onclick="p39View('${esc(r.id)}')">${p39Mini()}<div style="flex:1"><b>${p43Date(r.pubDate)}</b><small>${p43Wd(r.pubDate)} • ${bn(r.np || 0)} পেজ${r.pub === false ? ' • <span style="color:#b45309">খসড়া</span>' : ''}</small></div><span style="color:#94a3b8;font-size:20px">›</span></div>`).join('') + (flt && !list.length ? '<div class="empty"><span class="e1">🔍</span>এই সময়ের কোনো পত্রিকা নেই।</div>' : '');
  let old = []; try { old = ADMIN_CONTENT.filter(c => c.type === 'node' && c.parent === 'paper' && c.pd).sort((a, b) => b.pd.localeCompare(a.pd)); } catch (e) {}
  let ol = []; try { ol = paperList(); } catch (e) {}
  document.getElementById('pp_old').innerHTML = (old.length ? `<div class="pp-t">আগে যোগ করা সংখ্যা</div>${old.map(c => nodeCard(c, 'paper')).join('')}` : '') + (ol.length ? `<details class="pp-d"><summary>🔗 অনলাইনে পত্রিকা খুঁজুন</summary>${ol.map((x, i) => `<div class="job" style="border-color:#9333ea"><b>${esc(x.t)}</b><div style="font-size:13px;color:#666;margin:2px 0 8px">${esc(x.d)}</div><button class="btn sm" style="background:#9333ea" onclick="openLink(${i})">🔗 খুলুন</button></div>`).join('')}</details>` : '') + `<div class="warn" style="margin-top:10px">⚠️ চাকরির নামে কেউ টাকা চাইলে বিশ্বাস করবেন না।</div>`;
}
function p39View(id) {
  const c = CIRC.find(x => x.id === id); if (!c) return alert('পত্রিকাটি পাওয়া যায়নি।'); tab = 'job'; if (c.pub !== false) hsLog('paper:' + id, {t: 'পত্রিকা — ' + p43Date(c.pubDate), ic: '📰'}); else HS_CUR = null;
  const admin = isAdminFlag(), pl = safeUrl(c.pdfLink);
  render(pageHead(p43Date(c.pubDate)) + `<div class="pad circ"><div class="cx"><b style="font-size:16px">📰 ${esc(c.title)}</b><div class="hint">${p43Wd(c.pubDate)}, ${p43Date(c.pubDate)}</div></div>
    <div id="cvpages" class="cx" style="padding:8px"><div class="empty" style="padding:14px"><span class="e1">⏳</span>পেজ লোড হচ্ছে...</div></div>
    ${pl ? p43Btn(pl, '🔗 পুরো PDF ডাউনলোড করুন', '#7c3aed') : ''}<div class="cv-btns"><button class="btn" id="cvpdf" onclick="circPdf('${esc(id)}',false)" style="flex:1;background:#0c6247">⬇ ছবি থেকে PDF</button><button class="btn" style="background:#0c6247;flex:1" onclick="circPdf('${esc(id)}',true)">↗ শেয়ার</button></div>
    <div class="warn" style="margin-top:10px">⚠️ আবেদন করার সময় কোনো প্রকার আর্থিক লেনদেন করবেন না।</div>
    ${admin ? `<div class="cx"><b>🛡️ অ্যাডমিন</b><div class="rowline"><button class="btn sm" onclick="push(()=>p39View('${esc(id)}'));p39Form('${esc(id)}')">✏️ সম্পাদনা</button><button class="btn sm" style="background:#64748b" onclick="p39Pub('${esc(id)}')">${c.pub === false ? '✅ প্রকাশ করুন' : '🙈 খসড়ায় নিন'}</button><button class="btn sm" style="background:#dc2626" onclick="circDel('${esc(id)}')">🗑 মুছুন</button></div></div>` : ''}</div>`);
  circImgs(id).then(im => { const b = document.getElementById('cvpages'); if (!b) return; b.innerHTML = im.length ? im.map((s, i) => `<img src="${s}" style="width:100%;border:1px solid #cfd6d2;border-radius:6px;margin:4px 0;box-shadow:0 2px 6px #0002" onclick="circZoom('${esc(id)}',${i})"><div class="hint" style="text-align:center">পেজ ${bn(i + 1)}/${bn(im.length)} • ছবিতে চাপলে বড় ও জুম</div>`).join('') : '<div class="hint" style="text-align:center">এই সংখ্যায় ছবি নেই। উপরের PDF বাটন দেখুন।</div>'; }).catch(() => { const b = document.getElementById('cvpages'); if (b) b.innerHTML = '<div class="warn">পেজ লোড হয়নি। ইন্টারনেট দেখুন।</div>'; });
}
async function p39Pub(id) { const m = await sme(); if (!m) return; const c = CIRC.find(x => x.id === id); try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'circulars', id), {pub: c.pub === false}, {merge: true}); await circLoad(); p39View(id); } catch (e) { alert('হয়নি।'); } }
async function p39Form(id) {
  tab = 'job'; const c = CIRC.find(x => x.id === id) || {}; CF = {id: id || '', logo: '', imgs: [], imgsChanged: false};
  render(pageHead(id ? 'পত্রিকা সম্পাদনা' : 'নতুন পত্রিকা') + '<div class="pad"><div class="empty"><span class="e1">⏳</span>লোড হচ্ছে...</div></div>');
  if (id) { try { CF.imgs = (await circImgs(id)).slice(); } catch (e) {} }
  render(pageHead(id ? 'পত্রিকা সম্পাদনা' : 'নতুন পত্রিকা') + `<div class="pad circ"><div class="cx"><b>📅 পত্রিকার তারিখ *</b><input class="inp" id="pf_d" type="date" value="${esc(c.pubDate || p43Fri())}" oninput="p39T()"><div class="hint" id="pf_t"></div>
    <b style="display:block;margin-top:12px">📰 পত্রিকার পেজ (ছবি বা PDF)</b><div style="display:flex;gap:8px;margin:8px 0"><label class="btn" style="flex:1;text-align:center;margin:0">📄 PDF বাছুন<input type="file" accept="application/pdf" style="display:none" onchange="circPdfPick(this)"></label><label class="btn" style="flex:1;text-align:center;margin:0">🖼 ছবি বাছুন<input type="file" accept="image/*" multiple style="display:none" onchange="circImgPick(this)"></label></div><div class="hint">PDF দিলে প্রতিটি পেজ ছবি হয়ে যাবে (সর্বোচ্চ ৮ পেজ)।</div><div id="cf_pages"></div>
    <b style="display:block;margin-top:12px">🔗 PDF ডাউনলোডের লিংক (Google Drive ইত্যাদি)</b><input class="inp" id="pf_pl" maxlength="300" placeholder="https://drive.google.com/file/d/…" value="${esc(c.pdfLink || '')}"><div class="hint">এই লিংকে চাপলে ব্যবহারকারী পুরো PDF ডাউনলোড করবে।</div></div>
    <div id="ad_msg" class="warn" style="display:none"></div><div style="display:flex;gap:8px"><button class="btn" style="flex:1;background:#64748b" onclick="p39Save(false)">খসড়া</button><button class="btn" style="flex:2" onclick="p39Save(true)">🚀 প্রকাশ করুন</button></div></div>`);
  circPagesDraw(); p39T();
}
function p39T() { const d = gv('pf_d'), e = document.getElementById('pf_t'); if (e) e.textContent = d ? 'শিরোনাম নিজে হবে: «সাপ্তাহিক চাকরির খবর — ' + p43Date(d) + '»' : ''; }
async function p39Save(pub) {
  const msg = t => { const e = document.getElementById('ad_msg'); if (e) { e.style.display = 'block'; e.textContent = t; } }; const m = await sme(); if (!m) return msg('লগইন দরকার।');
  const dt = gv('pf_d'); if (!dt) return msg('তারিখ দিন।'); const pl = gv('pf_pl'); if (pl && !safeUrl(pl)) return msg('PDF-এর লিংকটি ঠিক নয়।'); if (!CF.imgs.length && !pl) return msg('অন্তত একটি পেজ (ছবি/PDF) বা PDF-এর লিংক দিন।');
  const F = m.f.F, ref = CF.id ? F.doc(m.f.db, 'circulars', CF.id) : F.doc(F.collection(m.f.db, 'circulars')), id = ref.id;
  const d = {kind: 'paper', title: 'সাপ্তাহিক চাকরির খবর — ' + p43Date(dt), org: 'সাপ্তাহিক চাকরির পত্রিকা', logo: '', pubDate: dt, deadline: '', src: '', posts: '', cat: 'পত্রিকা', link: '', pdfLink: pl, body: '', pub: !!pub, np: CF.imgs.length, at: Date.now(), by: m.u.uid};
  try {
    msg('⏳ সেভ হচ্ছে...'); await F.setDoc(ref, d);
    if (CF.imgsChanged || !CF.id) { const old = await sList(m.f, ['circimgs'], F.where('cid', '==', id)); for (const o of old) await F.deleteDoc(F.doc(m.f.db, 'circimgs', o.id)); for (let i = 0; i < CF.imgs.length; i++) await F.setDoc(F.doc(m.f.db, 'circimgs', id + '_' + i), {cid: id, n: i, img: CF.imgs[i]}); delete CIRC_IMG[id]; }
    await circLoad(); alert(pub ? '✅ পত্রিকা প্রকাশ হয়েছে।' : '✅ খসড়া সেভ হয়েছে।'); paperPage();
  } catch (e) { msg('⚠️ ' + ((e && e.code === 'permission-denied') ? 'অনুমতি নেই (Firestore নিয়ম আপডেট করেছেন কি?)।' : 'সেভ হয়নি। ইন্টারনেট দেখুন বা ছবি কমান।')); }
}

// ---------- ৩. ড্রাইভিং জব (দেশের ড্রাইভার) ----------
const DV = {veh: '', lic: '', q: ''};
const DV_VEH = [['🚛', 'ট্রাক', /ট্রাক|লরি|কাভার্ড|ট্রেইলার|ডাম্প/], ['🚌', 'বাস', /বাস|কোচ/], ['🚗', 'প্রাইভেট', /কার|প্রাইভেট|মাইক্রো|জিপ|পিকআপ|হালকা|লাইট|মাইক্রোবাস|এম্বুলেন্স|অ্যাম্বুলেন্স/], ['🏍', 'বাইক', /বাইক|মোটরসাইকেল|রাইডার|ডেলিভারি/]];
function drvPage(f) {
  tab = 'job'; try { hsLog('job'); } catch (e) {}
  render(pageHead('ড্রাইভিং জব') + `<div class="pad drv"><button class="btn" style="width:100%;margin-bottom:8px;background:#9333ea" onclick="push(()=>jobsPage());paperPage()">📰 সাপ্তাহিক চাকরির পত্রিকা দেখুন</button>
    <div class="dv-g">${DV_VEH.map((v, i) => `<div id="dvv${i}" onclick="DV.veh=DV.veh==='${i}'?'':'${i}';drvList()"><b>${v[0]}</b>${v[1]}</div>`).join('')}</div>
    <div class="chips" id="dv_lic">${[['', 'সব লাইসেন্স'], ['হেভি', 'হেভি'], ['মিডিয়াম', 'মিডিয়াম'], ['লাইট', 'লাইট']].map(x => `<button class="chip" data-v="${x[0]}" onclick="DV.lic=this.dataset.v;drvList()">${x[1]}</button>`).join('')}</div>
    <input class="inp" id="dv_q" placeholder="🔍 জায়গা বা পদ লিখে খুঁজুন (যেমন: ঢাকা)" value="${esc(DV.q)}" oninput="DV.q=this.value;drvList()"><div id="dv_ls"></div><div style="font-size:13px;color:#a33;margin-top:10px">${esc(typeof JOB_NOTE === 'string' ? JOB_NOTE : '')}</div></div>`);
  drvList(); try { jadBar(); } catch (e) {} try { jadRefresh().then(() => { if (document.getElementById('dv_ls')) drvList(); }); } catch (e) {}
}
function p41Tags(j) { return (j.s ? `<span class="p41t" style="background:#e6f4ec;color:#0a5a3f">💰 ${esc(j.s)}</span>` : '') + (j.lic ? `<span class="p41t" style="background:#fff3cd;color:#7a5a00">🪪 ${esc(j.lic)}</span>` : '') + (j.loc ? `<span class="p41t" style="background:#e8eefb;color:#1e3a8a">📍 ${esc(j.loc)}</span>` : '') + (j.deadline ? `<span class="p41t" style="background:#fde8e6;color:#9a2a10">⏰ শেষ ${esc(lgDate(j.deadline))}</span>` : ''); }
function drvList() {
  const ls = document.getElementById('dv_ls'); if (!ls) return; const all = activeJobs(), q = DV.q.trim().toLowerCase();
  DV_VEH.forEach((v, i) => { const e = document.getElementById('dvv' + i); if (e) e.classList.toggle('on', DV.veh === String(i)); }); document.querySelectorAll('#dv_lic .chip').forEach(b => b.classList.toggle('on', b.dataset.v === DV.lic));
  const rows = all.map((j, i) => ({j, i})).filter(o => o.j.kind !== 'foreign').filter(o => { const tx = p36n(o.j.t) + ' ' + p36n(o.j.d); return (!DV.veh || DV_VEH[+DV.veh][2].test(tx)) && (!DV.lic || p36n(o.j.lic).includes(DV.lic)) && (!q || (tx + ' ' + p36n(o.j.loc) + ' ' + p36n(o.j.c)).toLowerCase().includes(q)); });
  ls.innerHTML = rows.map(o => `<div class="p41c" onclick="showJob(${o.i})"><div style="display:flex;justify-content:space-between;gap:6px"><b>${esc(o.j.t)}</b>${o.j.urgent ? '<span class="badge">জরুরি</span>' : ''}</div><div class="p41m">🏢 ${esc(o.j.c || '')}</div><div>${p41Tags(o.j)}</div>${o.j._ad && o.j.imgs && o.j.imgs.length ? '<div class="p41m">🖼 ছবি আছে</div>' : ''}</div>`).join('') || `<div class="empty">এই ফিল্টারে এখন কোনো চাকরি নেই।<br><br><button class="btn sm" onclick="window.open('https://alljobs.teletalk.com.bd','_blank')">সরকারি সার্কুলার দেখুন</button></div>`;
}

// ---------- ৪. বিদেশে চাকরি ----------
const FG = {c: ''};
const FG_C = [['🇸🇦', 'সৌদি', /সৌদি|সউদী|Saudi/i], ['🇦🇪', 'আমিরাত', /আমিরাত|দুবাই|আবুধাবি|UAE/i], ['🇶🇦', 'কাতার', /কাতার|Qatar/i], ['🇰🇼', 'কুয়েত', /কুয়েত/], ['🇴🇲', 'ওমান', /ওমান/], ['🇲🇾', 'মালয়েশিয়া', /মালয়েশিয়া/], ['🇸🇬', 'সিঙ্গাপুর', /সিঙ্গাপুর/]];
const FG_DOCS = ['পাসপোর্ট (মেয়াদ ঠিক আছে কি না দেখুন)', 'মেডিক্যাল রিপোর্ট', 'ড্রাইভিং লাইসেন্স (আসল ও কপি)', 'BMET রেজিস্ট্রেশন / স্মার্ট কার্ড', 'ভিসা ও চাকরির চুক্তিপত্র (লিখিত)', 'পুলিশ ক্লিয়ারেন্স', 'পাসপোর্ট সাইজ ছবি', 'শিক্ষাগত ও অভিজ্ঞতার সনদ'];
function fgPage() {
  tab = 'job'; try { hsLog('intjob'); } catch (e) {}
  render(pageHead('বিদেশে চাকরি') + `<div class="pad fgp"><div class="fg-prep" onclick="push(()=>jobsPage('foreign'));fpPage()"><div style="font-size:34px">🎓</div><div style="flex:1"><b>বিদেশে চাকরির প্রস্তুতি</b><small>পাসপোর্ট থেকে ইন্টারভিউ — ধাপে ধাপে গাইড</small></div><span style="font-size:22px">›</span></div>
    <div class="fg-w">⚠️ আবেদনের নামে অগ্রিম টাকা দেবেন না। আগে এজেন্সির বৈধতা যাচাই করুন, লিখিত চুক্তি ছাড়া কিছু করবেন না।</div>
    <div class="chips"><button class="chip" data-c="" onclick="FG.c='';fgList()">🌐 সব দেশ</button>${FG_C.map((c, i) => `<button class="chip" data-c="${i}" onclick="FG.c='${i}';fgList()">${c[0]} ${c[1]}</button>`).join('')}</div><div id="fg_ls"></div>
    <div class="cx" style="border-left-color:#1d4ed8"><b>📋 যাওয়ার আগে যা লাগে</b><div class="hint">টিক দিয়ে মিলিয়ে নিন (আপনার ফোনেই সেভ থাকবে)।</div>${FG_DOCS.map((d, i) => `<label class="fg-ck"><input type="checkbox" ${fgChk().includes(i) ? 'checked' : ''} onchange="fgChkTog(${i})"> ${esc(d)}</label>`).join('')}</div>
    <div class="cx" style="border-left-color:#1d4ed8"><b>🔍 এজেন্সি যাচাই করুন</b><div class="hint" style="line-height:1.7">• এজেন্সির রিক্রুটিং লাইসেন্স (RL) নম্বর চেয়ে নিন এবং BMET-এর (bmet.gov.bd) তালিকার সাথে মিলিয়ে নিন।<br>• ভিসা, বেতন ও কাজের শর্ত লিখিত চুক্তিতে দেখে নিন।<br>• সরকার নির্ধারিত ফি ছাড়া বাড়তি টাকা চাইলে বা রসিদ না দিলে সাবধান হন।<br>• "ভিসা রেডি, আজই টাকা দিন" ধরনের তাড়া দিলে এড়িয়ে চলুন।</div></div><div style="font-size:13px;color:#a33;margin-top:10px">${esc(typeof JOB_NOTE === 'string' ? JOB_NOTE : '')}</div></div>`);
  fgList(); try { jadBar(); } catch (e) {} try { jadRefresh().then(() => { if (document.getElementById('fg_ls')) fgList(); }); } catch (e) {}
}
const fgChk = () => { try { const v = JSON.parse(localStorage.getItem('fgchk') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
function fgChkTog(i) { let a = fgChk(); a = a.includes(i) ? a.filter(x => x !== i) : a.concat(i); try { localStorage.setItem('fgchk', JSON.stringify(a)); } catch (e) {} }
function fgList() {
  const ls = document.getElementById('fg_ls'); if (!ls) return; document.querySelectorAll('.fgp .chips .chip').forEach(b => b.classList.toggle('on', b.dataset.c === FG.c));
  const rows = activeJobs().map((j, i) => ({j, i})).filter(o => o.j.kind === 'foreign').filter(o => FG.c === '' || FG_C[+FG.c][2].test(p36n(o.j.c) + ' ' + p36n(o.j.t) + ' ' + p36n(o.j.loc) + ' ' + p36n(o.j.d)));
  ls.innerHTML = rows.map(o => `<div class="p41c fg" onclick="showJob(${o.i})"><b>${esc(o.j.t)}</b><div class="p41m">🏢 ${esc(o.j.c || '')}${o.j.loc ? ' • 📍 ' + esc(o.j.loc) : ''}</div><div>${p41Tags(Object.assign({}, o.j, {loc: ''}))}${/থাকা|খাওয়া/.test(p36n(o.j.d)) ? '<span class="p41t" style="background:#e6f4ec;color:#0a5a3f">🍚 থাকা-খাওয়া</span>' : ''}</div></div>`).join('') || '<div class="empty">এই দেশের কোনো বিজ্ঞাপন এখন নেই।</div>';
}

// ---------- ৫. বিদেশে চাকরির প্রস্তুতি (অ্যাডমিনের লেখা বিষয়) ----------
let FPR = []; try { FPR = JSON.parse(localStorage.getItem('fprep') || '[]'); } catch (e) {}
const fpDone = () => { try { const v = JSON.parse(localStorage.getItem('fpdone') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
async function fpLoad() {
  if (!CLOUD_ON() || !navigator.onLine) return false;
  try { const f = await fb(), rows = isAdminFlag() ? await sList(f, ['fprep'], f.F.limit(200)) : await sList(f, ['fprep'], f.F.where('pub', '==', true), f.F.limit(200)); rows.sort((a, b) => (a.ord || 0) - (b.ord || 0) || (a.at || 0) - (b.at || 0)); FPR = rows; const keep = rows.filter(r => r.pub !== false); try { localStorage.setItem('fprep', JSON.stringify(keep)); } catch (e) { try { localStorage.setItem('fprep', JSON.stringify(keep.map(r => Object.assign({}, r, {imgs: []})))); } catch (e2) {} } return true; } catch (e) { return false; }
}
function fpPage() {
  tab = 'job'; HS_CUR = null; try { hsLog('fprep', {t: 'বিদেশে চাকরির প্রস্তুতি', ic: '🎓'}); } catch (e) {}
  render(pageHead('বিদেশে চাকরির প্রস্তুতি') + `<div class="pad fgp"><div id="fp_pr"></div>${isAdminFlag() ? `<div class="adm-b">🛡 অ্যাডমিন <button onclick="push(()=>fpPage());fpForm('')">➕ নতুন বিষয় লিখুন</button></div>` : ''}<div id="fp_ls"></div></div>`);
  fpDraw(); fpLoad().then(ok => { if (ok && document.getElementById('fp_ls')) fpDraw(); });
}
function fpDraw() {
  const rows = FPR.filter(r => r.pub !== false || isAdminFlag()), dn = fpDone(), n = rows.filter(r => dn.includes(r.id)).length, pr = document.getElementById('fp_pr'); if (!pr) return;
  pr.innerHTML = rows.length ? `<div class="cx" style="border-left-color:#1d4ed8"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700"><span>আপনার অগ্রগতি</span><span style="color:#1d4ed8">${bn(n)} / ${bn(rows.length)} পড়া হয়েছে</span></div><div class="hs-bar s" style="margin-top:6px"><i style="width:${Math.round(100 * n / rows.length)}%;background:#1d4ed8"></i></div></div>` : '';
  document.getElementById('fp_ls').innerHTML = rows.length ? `<div class="cx" style="padding:2px 12px">${rows.map(r => `<div class="fp-r" onclick="fpView('${esc(r.id)}')"><div class="fp-i">${esc(r.ic || '📘')}</div><div style="flex:1;min-width:0"><b>${esc(r.title)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}${r.pub === false ? '<small style="color:#b45309">খসড়া</small>' : ''}</div>${dn.includes(r.id) ? '<span style="color:#16a34a;font-weight:800">✓</span>' : '<span style="color:#cbd5e1;font-size:20px">›</span>'}</div>`).join('')}</div>` : `<div class="empty"><span class="e1">📭</span>${CLOUD_ON() ? 'প্রস্তুতির বিষয় শীঘ্রই যোগ হবে।' : 'দেখতে ইন্টারনেট ও ক্লাউড চালু থাকতে হবে।'}</div>`;
}
async function fpView(id) {
  let c = FPR.find(x => x.id === id); if (!c) { await fpLoad(); c = FPR.find(x => x.id === id); } if (!c) return alert('বিষয়টি পাওয়া যায়নি।'); tab = 'job'; if (c.pub !== false) hsLog('fprep:' + id, {t: c.title, ic: c.ic || '🎓'}); else HS_CUR = null;
  const dn = fpDone().includes(id), admin = isAdminFlag();
  render(pageHead(c.title) + `<div class="pad fgp"><div class="cx" style="border-left-color:#1d4ed8"><div style="font-size:20px;font-weight:800;line-height:1.35">${esc(c.ic || '📘')} ${esc(c.title)}</div>${c.sub ? `<div class="hint">${esc(c.sub)}</div>` : ''}${adxView(c, 'fp' + id)}<button class="btn" id="fp_dn" style="width:100%;margin-top:12px;background:${dn ? '#64748b' : '#16a34a'}" onclick="fpDoneTog('${esc(id)}')">${dn ? '↩ পড়া হয়নি চিহ্ন দিন' : '✓ পড়া হয়েছে'}</button></div>
    ${admin ? `<div class="cx"><b>🛡️ অ্যাডমিন</b><div class="rowline"><button class="btn sm" onclick="push(()=>fpView('${esc(id)}'));fpForm('${esc(id)}')">✏️ সম্পাদনা</button><button class="btn sm" style="background:#64748b" onclick="fpPub('${esc(id)}')">${c.pub === false ? '✅ প্রকাশ করুন' : '🙈 খসড়ায় নিন'}</button><button class="btn sm" style="background:#dc2626" onclick="fpDel('${esc(id)}')">🗑 মুছুন</button></div></div>` : ''}</div>`);
}
function fpDoneTog(id) { let a = fpDone(); a = a.includes(id) ? a.filter(x => x !== id) : a.concat(id); try { localStorage.setItem('fpdone', JSON.stringify(a)); } catch (e) {} const b = document.getElementById('fp_dn'), on = a.includes(id); if (b) { b.textContent = on ? '↩ পড়া হয়নি চিহ্ন দিন' : '✓ পড়া হয়েছে'; b.style.background = on ? '#64748b' : '#16a34a'; } }
function fpForm(id) {
  tab = 'job'; const c = FPR.find(x => x.id === id) || {};
  render(pageHead(id ? 'বিষয় সম্পাদনা' : 'নতুন বিষয়') + `<div class="pad fgp"><div class="cx"><b>আইকন ও শিরোনাম *</b><div style="display:flex;gap:8px"><input class="inp" id="fp_ic" maxlength="4" style="width:70px;text-align:center" value="${esc(c.ic || '📘')}"><input class="inp" id="fp_t" maxlength="120" style="flex:1" placeholder="যেমন: মেডিক্যাল টেস্ট" value="${esc(c.title || '')}"></div>
    <b>ছোট বর্ণনা (তালিকায় দেখাবে)</b><input class="inp" id="fp_s" maxlength="100" placeholder="যেমন: কোথায় করাবেন, কত খরচ" value="${esc(c.sub || '')}">${adxHtml('fp', c)}<b>ক্রম নম্বর</b><input class="inp" id="fp_o" type="number" style="width:110px" placeholder="১, ২, ৩…" value="${esc(c.ord != null ? c.ord : '')}"><div class="hint">ছোট নম্বর আগে দেখাবে।</div></div>
    <div id="ad_msg" class="warn" style="display:none"></div><div style="display:flex;gap:8px"><button class="btn" style="flex:1;background:#64748b" onclick="fpSave('${esc(id || '')}',false)">খসড়া</button><button class="btn" style="flex:2" onclick="fpSave('${esc(id || '')}',true)">🚀 প্রকাশ করুন</button></div></div>`);
}
async function fpSave(id, pub) {
  const msg = t => { const e = document.getElementById('ad_msg'); if (e) { e.style.display = 'block'; e.textContent = t; } }; const m = await sme(); if (!m) return msg('লগইন দরকার।'); const t = gv('fp_t'); if (!t) return msg('শিরোনাম দিন।');
  let x; try { x = adxRead('fp'); } catch (e) { return msg(e.message); }
  const d = {ic: Array.from(gv('fp_ic') || '📘').slice(0, 2).join(''), title: t, sub: gv('fp_s'), more: x.more, imgs: x.imgs, link: x.link, pdfLink: x.pdfLink, ord: +gv('fp_o') || 0, pub: !!pub, at: Date.now(), by: m.u.uid};
  try { msg('⏳ সেভ হচ্ছে...'); const F = m.f.F; if (id) await F.setDoc(F.doc(m.f.db, 'fprep', id), d); else await F.addDoc(F.collection(m.f.db, 'fprep'), d); await fpLoad(); alert(pub ? '✅ প্রকাশ হয়েছে।' : '✅ খসড়া সেভ হয়েছে।'); fpPage(); } catch (e) { msg('⚠️ ' + ((e && e.code === 'permission-denied') ? 'অনুমতি নেই (Firestore নিয়ম আপডেট করেছেন কি?)।' : 'সেভ হয়নি। ইন্টারনেট দেখুন বা ছবি কমান।')); }
}
async function fpPub(id) { const m = await sme(); if (!m) return; const c = FPR.find(x => x.id === id); try { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'fprep', id), {pub: c.pub === false}, {merge: true}); await fpLoad(); fpView(id); } catch (e) { alert('হয়নি।'); } }
async function fpDel(id) { if (!confirm('বিষয়টি মুছে যাবে। নিশ্চিত?')) return; const m = await sme(); if (!m) return; try { await m.f.F.deleteDoc(m.f.F.doc(m.f.db, 'fprep', id)); await fpLoad(); back(); } catch (e) { alert('মোছা যায়নি।'); } }

// ---------- ৬. আমার কার্ড (হোমের ব্যালেন্স কার্ড) ----------
const HC_BG = [['সবুজ', 'linear-gradient(135deg,#0a4a35,#05301f 60%,#031f15)'], ['নীল', 'linear-gradient(135deg,#1e40af,#1e3a8a 60%,#172554)'], ['বেগুনি', 'linear-gradient(135deg,#6d28d9,#4c1d95 60%,#2e1065)'], ['কমলা', 'linear-gradient(135deg,#c2410c,#9a3412 60%,#7c2d12)'], ['টিল', 'linear-gradient(135deg,#0f766e,#115e59 60%,#134e4a)'], ['কালো', 'linear-gradient(135deg,#334155,#1e293b 60%,#0f172a)']];
const HC_BT = [['সোনালি', 'linear-gradient(145deg,#ffd964,#f0a800)', '#3a2800'], ['সাদা', '#ffffff', '#14231c'], ['স্বচ্ছ', '#ffffff22', '#ffffff'], ['সবুজ', '#16a34a', '#ffffff'], ['লাল', '#dc2626', '#ffffff'], ['নীল', '#2563eb', '#ffffff']];
const hcOpt = () => { try { const v = JSON.parse(localStorage.getItem('hcard') || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
function hcAll() { return Object.keys(NDQ_B).filter(k => k !== 'all').concat(CATS.filter(c => !tileOv(c.id).hide).map(c => 'c:' + c.id)).filter((k, i, a) => a.indexOf(k) === i); }
function p38Card() {
  const h = document.querySelector('.nd-hero'); if (!h || h.dataset.p38) return; h.dataset.p38 = 1; const o = hcOpt(), t = todayISO();
  if (o.bg != null && HC_BG[o.bg]) h.style.background = HC_BG[o.bg][1];
  h.insertAdjacentHTML('afterbegin', `<button class="hcg" onclick="event.stopPropagation();hcEdit()" aria-label="কার্ড সাজান">⚙</button>`);
  const sm = h.querySelector('small'), big = h.querySelector('.big'), row = h.querySelector('.row');
  if (o.k === 'logbook') {
    let r = []; try { r = (JSON.parse(localStorage.getItem('lbook') || '{}').rows || []); } catch (e) {} const mo = r.filter(x => (x.date || '').slice(0, 7) === t.slice(0, 7)), td = r.filter(x => x.date === t), km = a => bn(Math.round(a.reduce((s, x) => s + (+x.km || 0), 0)));
    sm.textContent = 'এ মাসের লগ বুক • ' + lgDate(t); big.textContent = bn(mo.length) + ' ট্রিপ'; row.innerHTML = `<div>🛣 এ মাসে<b>${km(mo)} কিমি</b></div><div>🚖 আজ<b>${bn(td.length)} ট্রিপ</b></div><div>📍 আজ<b>${km(td)} কিমি</b></div>`; h.onclick = () => open_('logbook');
  } else if (o.k === 'study') {
    let td = 0; try { td = hsLoad().filter(e => p36day(e.ts) === t).length; } catch (e) {} sm.textContent = 'আমার পড়াশোনা • ' + lgDate(t); big.textContent = '🔥 ' + bn(updateStreak().n) + ' দিন'; row.innerHTML = `<div>🏆 সেরা স্কোর<b>${bn(load('best', 0))}/${bn(QUIZ.length)}</b></div><div>📖 আজ পড়া<b>${bn(td)}টি</b></div><div>📚 মোট ইতিহাস<b>${bn(hsLoad().length)}টি</b></div>`; h.onclick = () => open_('quiz');
  }
  const hb = h.querySelector('.hb'), bt = HC_BT[o.bt != null ? o.bt : 0] || HC_BT[0], bk = [o.b1 || 'in', o.b2 || 'out'], bt2 = HC_BT[o.bt2 != null ? o.bt2 : 2] || HC_BT[2];
  if (hb) hb.innerHTML = bk.map((k, i) => { const f = ndqInfo(k); if (!f) return ''; const c = i ? bt2 : bt; return `<button style="background:${c[1]};color:${c[2]}" onclick="event.stopPropagation();ndQ('${k}')">${f[0]} ${esc(f[1])}</button>`; }).join('');
}
let HCE = null;
function hcEdit() { HCE = Object.assign({k: 'ledger', bg: 0, b1: 'in', b2: 'out', bt: 0, bt2: 2}, hcOpt()); hcDraw(); }
function hcDraw() {
  const o = HCE, all = hcAll(), opt = v => all.map(k => { const f = ndqInfo(k); return f ? `<option value="${esc(k)}" ${v === k ? 'selected' : ''}>${f[0]} ${esc(f[1])}</option>` : ''; }).join('');
  showModal(`<h3 style="margin:0 0 8px">⚙ আমার কার্ড</h3><div class="hint">কার্ডে কী দেখাবেন</div><div class="seg" style="margin:6px 0 10px">${[['ledger', '💰 আয়-খরচ'], ['logbook', '🚖 লগ বুক'], ['study', '📚 পড়াশোনা']].map(x => `<button class="${o.k === x[0] ? 'on' : ''}" onclick="HCE.k='${x[0]}';HCE.b1=HCE.k==='ledger'?'in':HCE.k==='logbook'?'trip':'quiz';HCE.b2=HCE.k==='ledger'?'out':HCE.k==='logbook'?'out':'note';hcDraw()">${x[1]}</button>`).join('')}</div>
    <div class="hint">নিচের দুটি বাটন</div><select class="inp" onchange="HCE.b1=this.value">${opt(o.b1)}</select><select class="inp" onchange="HCE.b2=this.value">${opt(o.b2)}</select>
    <div class="hint" style="margin-top:8px">কার্ডের রং</div><div class="hc-sw">${HC_BG.map((c, i) => `<i style="background:${c[1]}" class="${o.bg === i ? 'on' : ''}" onclick="HCE.bg=${i};hcDraw()" title="${c[0]}"></i>`).join('')}</div>
    <div class="hint">১ম বাটনের রং</div><div class="hc-sw">${HC_BT.map((c, i) => `<i style="background:${c[1]};box-shadow:inset 0 0 0 1px #0002" class="${o.bt === i ? 'on' : ''}" onclick="HCE.bt=${i};hcDraw()" title="${c[0]}"></i>`).join('')}</div>
    <div class="hint">২য় বাটনের রং</div><div class="hc-sw">${HC_BT.map((c, i) => `<i style="background:${c[1]};box-shadow:inset 0 0 0 1px #0002" class="${o.bt2 === i ? 'on' : ''}" onclick="HCE.bt2=${i};hcDraw()" title="${c[0]}"></i>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" style="flex:2" onclick="ndLS('hcard',JSON.stringify(HCE));closeModal();home()">💾 সেভ করুন</button><button class="btn" style="flex:1;background:#64748b" onclick="try{localStorage.removeItem('hcard')}catch(e){};closeModal();home()">↺ আগের মতো</button></div>`);
}
// «+» শিটে ছোট ✏️
function p38Sheet() {
  const s = document.getElementById('ndsheet'); if (!s || NDQE) return; const b = s.querySelector('button.ned'), h = s.querySelector('h4'); if (!b || !h || h.querySelector('.hed')) return;
  b.remove(); h.insertAdjacentHTML('beforeend', `<button class="hed" onclick="NDQE=true;ndSheetDraw()" aria-label="নিজের মতো সাজান" title="নিজের মতো সাজান">✏️</button>`);
}

// ---------- ৭. আইকনের ভিতরে আইকন (ফোল্ডার) ----------
const p38In = id => { const v = tileOv(id).inside; return v && v !== id && CATS.some(c => c.id === v) ? v : ''; };
const p38Kids = id => CATS.filter(c => p38In(c.id) === id && !tileOv(c.id).hide);
function p38Folder(id) {
  const c = CATS.find(x => x.id === id); if (!c) return; const o = tileOv(id), kids = p38Kids(id), cell = (k, ic, nm, bg) => `<div class="tile" onclick="closeModal();open_('${k}')"><div class="ti" style="background:${bg}">${esc(ic)}</div><span>${esc(nm)}</span></div>`;
  showModal(`<h3 style="margin:0 0 10px">📂 ${esc(o.name || SHORT[id] || c.name)}</h3><div class="tgrid" style="padding:0">${cell(id, o.ic || c.ic, 'খুলুন: ' + (o.name || SHORT[id] || c.name), c.color + '26')}${kids.map(k => { const ko = tileOv(k.id); return cell(k.id, ko.ic || k.ic, ko.name || SHORT[k.id] || k.name, k.color + '26'); }).join('')}</div>`);
}
async function layInside(id) {
  const cand = CATS.filter(c => c.id !== id && !p38In(c.id) && !p38Kids(id).length && !CATS.some(x => p38In(x.id) === id && x.id === c.id)), cur = p38In(id);
  showModal(`<h3 style="margin:0 0 6px">📁 "${esc(keyName(id))}" কার ভিতরে থাকবে?</h3><div class="hint">বেছে নিলে এই আইকন হোম থেকে সরে ওই আইকনের ভিতরে ঢুকবে। ওই আইকনে চাপলে ভিতরের সবগুলো দেখা যাবে।</div><div style="max-height:52vh;overflow:auto"><label class="fg-ck"><input type="radio" name="li" value="" ${cur ? '' : 'checked'}> কোনোটির ভিতরে নয় (হোমেই থাকবে)</label>${cand.map(c => `<label class="fg-ck"><input type="radio" name="li" value="${esc(c.id)}" ${cur === c.id ? 'checked' : ''}> ${esc(tileOv(c.id).ic || c.ic)} ${esc(keyName(c.id))}</label>`).join('')}</div><button class="btn" style="margin-top:10px" onclick="laySaveIn('${esc(id)}')">💾 ঠিক আছে</button>`);
}
async function laySaveIn(id) { const r = document.querySelector('input[name=li]:checked'), v = r ? r.value : ''; const o = Object.assign({}, tileOv(id)); if (v) o.inside = v; else o.inside = null; if (await pdfSaveCfg({tiles: {[id]: o}})) { closeModal(); layRefresh(); } }

// ---------- সংযোজন ----------
function p43Init() {
  if (window.__p43) return; window.__p43 = 1;
  window.circZoom = p43Zoom; window.paperPage = p39Page;
  window.jobsPage = function (f) { return f === 'foreign' ? fgPage() : drvPage(f); };
  const hg0 = window.homeGroups; window.homeGroups = function (inc) { const g = hg0.apply(this, arguments); return inc ? g : g.map(x => [x[0], x[1].filter(c => !p38In(c.id))]).filter(x => x[1].length); };
  const t0 = window.tile; window.tile = function (c) { const o = tileOv(c.id); if (o.hide) return ''; const k = p38Kids(c.id); if (!k.length) return t0(c); return `<div class="tile" onclick="p38Folder('${c.id}')" style="position:relative"><div class="ti" style="background:${c.color}26">${esc(o.ic || c.ic)}</div><span>${esc(o.name || SHORT[c.id] || c.name)}</span><i class="fbadge">${bn(k.length + 1)}</i></div>`; };
  const nh0 = window.ndHome; window.ndHome = function () { const r = nh0.apply(this, arguments); try { p38Card(); } catch (e) { console.error(e); } return r; };
  const sd0 = window.ndSheetDraw; window.ndSheetDraw = function () { const r = sd0.apply(this, arguments); try { p38Sheet(); } catch (e) {} return r; };
  const lh0 = window.layHtml; window.layHtml = function () { return lh0.apply(this, arguments).replace(/<div class="layrow">([\s\S]*?)<button onclick="layHide\('([^']*)'\)"/g, (m, a, id) => `<div class="layrow">${a}<button onclick="layInside('${id}')" style="background:${p38In(id) ? '#7c3aed' : '#94a3b8'}" title="ভিতরে রাখুন">📁</button><button onclick="layHide('${id}')"`).replace(/<span class="lan">([^<]*)<\/span>/g, (m, n) => m); };
}
(function () { const st = document.createElement('style'); st.textContent = `
.atb{width:100%;margin:6px 0 2px;background:#7c3aed}.adx{margin-top:8px}.adx-h{font-weight:800;font-size:12.5px;color:#0b4a38;margin:10px 0 3px}.adx-im{display:flex;gap:6px;flex-wrap:wrap}.adx-b{margin:0;flex:1;text-align:center}.adx-more{white-space:pre-wrap;line-height:1.75;font-size:14.5px;margin:10px 0}.adx-vi{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.adx-vi img{width:calc(50% - 3px);border-radius:10px;border:1px solid #d6ddd8;object-fit:cover;max-height:150px}
.czb{border:0;border-radius:20px;background:#fff;padding:9px 16px;font:inherit;font-weight:800;font-size:15px}
.pp-hero{background:linear-gradient(150deg,#0f6a4c,#05301f);color:#fff;border:1px solid #ffc83d66;border-radius:18px;padding:12px 14px;margin:10px 0}.pp-hero small{color:#ffc83d;font-weight:700}.pp-hr{display:flex;gap:12px;align-items:center;margin-top:6px}.pp-hr b{font-size:15.5px}.pp-s{font-size:12px;color:#bfe3d2;margin:2px 0 8px}.pp-hr .btn{margin:0;width:100%}
.pp-mini{width:62px;flex:none;background:#fff;border:1px solid #cfd6d2;border-radius:4px;padding:4px;box-shadow:0 2px 6px #0003}.pp-mini div{background:#111;color:#fff;font-size:8px;font-weight:900;text-align:center;padding:2px 0}.pp-mini u{display:block;height:3px;background:#c4c9c5;margin:3px 0}
.pp-t{font-weight:800;font-size:13.5px;margin:14px 2px 2px}.pp-r{display:flex;gap:11px;align-items:center;padding:10px 4px;border-bottom:1px solid #ebe5d6;cursor:pointer}.pp-r b{display:block;font-size:14.5px}.pp-r small{color:#6b7a72;font-size:12px}.pp-d{margin:12px 0}.pp-d summary{font-weight:800;cursor:pointer;padding:8px 0}
.dv-g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px}.dv-g div{background:#fff;border:1.5px solid #e1e8e3;border-radius:14px;padding:8px 2px;text-align:center;font-size:11.5px;font-weight:700;box-shadow:0 2px 6px #0001;cursor:pointer}.dv-g b{display:block;font-size:24px}.dv-g div.on{border-color:#0b6a4a;background:#e6f4ec}
.p41c{background:#fff;border-radius:16px;padding:11px 12px;margin:9px 0;box-shadow:0 2px 8px #0001;border-left:4px solid #0b6a4a;cursor:pointer}.p41c.fg{border-left-color:#1d4ed8}.p41m{font-size:12.5px;color:#55655d;margin-top:2px}.p41t{display:inline-block;font-size:11px;font-weight:700;padding:3px 8px;border-radius:12px;margin:5px 4px 0 0}
.fg-prep{display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,#1d4ed8,#1e3a8a);color:#fff;border-radius:16px;padding:13px 14px;margin:0 0 10px;cursor:pointer}.fg-prep b{display:block;font-size:16px}.fg-prep small{color:#cfe0ff;font-size:12px}.fg-w{background:#fff3f0;border:1px solid #f3b7a8;border-radius:12px;padding:8px 10px;margin-bottom:8px;font-size:12.5px;color:#9a2a10;font-weight:700}
.fgp .chip.on{background:#1d4ed8;color:#fff;border-color:#1d4ed8}.drv .chip.on{background:#0b6a4a;color:#fff}.fg-ck{display:block;padding:7px 0;font-size:14px;border-bottom:1px solid #f0ece0}
.fp-r{display:flex;gap:11px;align-items:center;padding:11px 0;border-bottom:1px solid #eee;cursor:pointer}.fp-r:last-child{border:0}.fp-r b{display:block;font-size:14px}.fp-r small{display:block;color:#55655d;font-size:12px}.fp-i{width:40px;height:40px;border-radius:12px;background:#e8eefb;display:flex;align-items:center;justify-content:center;font-size:21px;flex:none}
.adm-b{background:#fff4e5;border:1.5px dashed #f59e0b;border-radius:12px;padding:7px 10px;margin:8px 0;font-size:12.5px;font-weight:700;color:#92400e;display:flex;gap:8px;align-items:center}.adm-b button{border:0;background:#c2410c;color:#fff;border-radius:9px;padding:6px 11px;font:inherit;font-weight:800}
.nd-hero .hcg{position:absolute;top:8px;right:8px;z-index:2;width:30px;height:30px;border-radius:10px;border:1px solid #ffffff44;background:#ffffff22;color:#fff;font-size:15px;padding:0}.hc-sw{display:flex;gap:9px;margin:6px 0 10px;flex-wrap:wrap}.hc-sw i{width:36px;height:36px;border-radius:50%;display:block;cursor:pointer;border:3px solid #fff;box-shadow:0 0 0 1px #cbd5e1}.hc-sw i.on{box-shadow:0 0 0 3px #0c6247}
body #ndsheet h4{position:relative}body #ndsheet h4 .hed{position:absolute;right:2px;top:-4px;border:0;background:#eef2ee;border-radius:10px;width:34px;height:30px;font-size:15px;padding:0}
.tile .fbadge{position:absolute;top:6px;right:8px;background:#0c6247;color:#fff;font-style:normal;font-size:11px;font-weight:800;border-radius:10px;padding:1px 7px}
`; document.head.appendChild(st); })();

// =====================================================================
//  P45/P46: স্মার্ট পাতা — লেখা দেখে নিজে সাজে (সন্ধি, বাগধারা, বিপরীত, সমার্থক, এক কথায়…)
// =====================================================================
let SM = {pid: '', rows: [], q: '', only: false};
const smStarAll = () => { try { return JSON.parse(localStorage.getItem('p45star') || '{}'); } catch (e) { return {}; } };
const SM_LAT = x => /^[A-Za-z]/.test(x), SM_BN = x => /[ঀ-৿]/.test(x);
function smParse(text) {
  const rows = []; let n = 0, sm = 0;
  String(text || '').split('\n').forEach(raw => {
    const l = raw.trim(); if (!l) return;
    if (/^#{1,3}\s+/.test(l)) { rows.push({k: 'h', t: l.replace(/^#+\s+/, '')}); return; }
    n++; let m;
    if ((m = l.match(/^(?:সূত্র|formula)\s*[:：]\s*(.+)$/i))) { sm++; rows.push({k: 'fm', q: m[1].trim()}); return; }
    if ((m = l.match(/^(?:উত্তর|ans(?:wer)?)\s*[:：]\s*(.+)$/i))) { sm++; rows.push({k: 'ans', q: m[1].trim()}); return; }
    if ((m = l.match(/^([০-৯0-9]{1,2})\s*[.)।]\s+(.+)$/))) { sm++; rows.push({k: 'st', no: m[1], q: m[2].trim()}); return; }
    if (l.indexOf('↔') > 0) { const p = l.split('↔').map(s => s.trim()); if (p[0] && p[1]) { sm++; rows.push({k: 'opp', q: p[0], a: p[1]}); return; } }
    const eq = l.indexOf('=');
    if (eq > 0 && eq < l.length - 1) {
      let L = l.slice(0, eq).trim(); const R = l.slice(eq + 1).trim();
      if (L && R) {
        sm++;
        if (SM_LAT(L) && SM_BN(R)) { const pm = L.match(/^([A-Za-z][A-Za-z' \-]*?)\s*(?:\/([^\/]+)\/)?\s*(?:\(([A-Za-z.]+)\))?\s*$/); if (pm) { const q = R.split('|').map(s => s.trim()); rows.push({k: 'en', q: pm[1].trim(), pr: (pm[2] || '').trim(), pos: (pm[3] || '').trim(), a: q[0], ex: q[1] || '', sy: (q[2] || '').split(/\s*,\s*/).filter(Boolean)}); return; } }
        if (R.indexOf('|') >= 0) { const q = R.split('|'); rows.push({k: 'idm', q: L, a: q[0].trim(), ex: q.slice(1).join('|').trim()}); return; }
        const pl = R.split(/\s*\+\s*/).filter(Boolean); if (pl.length >= 2 && !/[=×÷]/.test(R)) { rows.push({k: 'sd', q: L, parts: pl}); return; }
        const sy = R.split(/\s*[,،、]\s*/).filter(Boolean); if (sy.length >= 2) { rows.push({k: 'syn', q: L, list: sy}); return; }
        if (/^[০-৯0-9]{3,4}$/.test(L)) { rows.push({k: 'yr', q: L, a: R}); return; }
        if (L.split(/\s+/).length >= 3 && !/\s/.test(R)) { rows.push({k: 'one', q: R, ph: L}); return; }
        rows.push({k: 'gen', q: L, a: R}); return;
      }
    }
    rows.push({k: 't', t: l});
  });
  rows.forEach(r => {
    if (r.k === 'h' || r.k === 't') return;
    if (r.k === 'fm') { r.fr = r.q; r.bk = ''; r.key = 'fm:' + r.q; r.say = 'সূত্র। ' + r.q; return; }
    if (r.k === 'ans') { r.fr = ''; r.bk = ''; r.key = ''; r.say = 'উত্তর ' + r.q; return; }
    if (r.k === 'st') { r.fr = ''; r.bk = ''; r.key = ''; r.say = r.q; return; }
    r.fr = r.k === 'one' ? r.ph : r.q; r.bk = r.k === 'sd' ? r.parts.join(' + ') : r.k === 'syn' ? r.list.join(', ') : r.k === 'one' ? r.q : r.a; r.key = r.fr + '=' + r.bk;
    r.say = r.k === 'sd' ? r.q + '। ' + r.parts.join(' ও ') : r.k === 'syn' ? r.q + '। ' + r.list.join(', ') : r.k === 'opp' ? r.q + ', বিপরীত ' + r.a : r.k === 'idm' ? r.q + '। অর্থ ' + r.a + (r.ex ? '। ' + r.ex : '') : r.k === 'en' ? r.q + '। ' + r.a : r.fr + '। ' + r.bk;
  });
  return {rows, ok: sm >= 2 && sm >= n * 0.5};
}
function smRow(r, i, pid, st) {
  if (r.k === 'h') return `<div class="sm-h" data-i="${i}">${esc(r.t)}</div>`;
  if (r.k === 't') return `<div class="sm-t" data-i="${i}" data-s="${esc(r.t.toLowerCase())}">${esc(r.t)}</div>`;
  const on = !!st[pid + '|' + r.key], s = esc((r.fr + ' ' + r.bk + ' ' + (r.ex || '') + ' ' + (r.q || '')).toLowerCase()), star = r.key ? `<span class="sm-st${on ? ' on' : ''}" onclick="smStar(${i})">★</span>` : '';
  let b;
  if (r.k === 'sd') b = `<b class="sm-w">${esc(r.q)}</b><span class="sm-eq">=</span>${r.parts.map((p, j) => (j ? '<span class="sm-eq">+</span>' : '') + `<span class="sm-ch">${esc(p)}</span>`).join('')}`;
  else if (r.k === 'syn') b = `<b class="sm-w sm-big">${esc(r.q)}</b><div class="sm-chs">${r.list.map(p => `<span class="sm-ch">${esc(p)}</span>`).join('')}</div>`;
  else if (r.k === 'opp') b = `<span class="sm-a">${esc(r.q)}</span><span class="sm-m">⇄</span><span class="sm-b">${esc(r.a)}</span>`;
  else if (r.k === 'idm') b = `<b class="sm-id">${esc(r.q)}</b><div>অর্থ: <span class="sm-ch o">${esc(r.a)}</span></div>${r.ex ? `<i class="sm-ex">উদাহরণ: ${esc(r.ex)}</i>` : ''}`;
  else if (r.k === 'one') b = `<span class="sm-ch g">${esc(r.q)}</span><div class="sm-ph">${esc(r.ph)}</div>`;
  else if (r.k === 'fm') b = `<div class="sm-fm"><b>📐 সূত্র</b><div>${esc(r.q)}</div></div>`;
  else if (r.k === 'ans') b = `<div class="sm-ans">উত্তর: ${esc(r.q)}</div>`;
  else if (r.k === 'st') b = `<i class="sm-no">${esc(r.no)}</i><span class="sm-sp">${esc(r.q)}</span>`;
  else if (r.k === 'yr') b = `<span class="sm-yr">${esc(r.q)}</span><span class="sm-sp">${esc(r.a)}</span>`;
  else if (r.k === 'en') b = `<span class="sm-w sm-big" style="width:auto">${esc(r.q)}</span>${r.pos ? `<span class="sm-pos">${esc(r.pos)}</span>` : ''}<span class="sm-spk" onclick="speak('${esc(r.q).replace(/'/g, '')}')">🔊</span>${r.pr ? `<div class="sm-pr">/${esc(r.pr)}/</div>` : ''}<div class="sm-bn">${esc(r.a)}</div>${r.ex ? `<i class="sm-ex">${esc(r.ex)}</i>` : ''}${r.sy.length ? `<div class="sm-chs">${r.sy.map(p => `<span class="sm-ch">${esc(p)}</span>`).join('')}</div>` : ''}`;
  else if (r.k === 'gen' && (r.q.length > 10 || /\s/.test(r.q))) b = `<span class="sm-gq">${esc(r.q)}</span><b class="sm-ga">${esc(r.a)}</b>`;
  else b = `<b class="sm-w">${esc(r.q)}</b><span class="sm-eq">=</span><span class="sm-ch">${esc(r.a)}</span>`;
  return `<div class="sm-row k-${r.k}" data-i="${i}" data-s="${s}">${b}${star}</div>`;
}
function smHtml(pid, text) {
  const P = smParse(text); SM = {pid, rows: P.rows, q: '', only: false}; const st = smStarAll();
  const cnt = P.rows.filter(r => r.key && st[pid + '|' + r.key]).length;
  return `<div class="sm"><div class="sm-s"><span>🔍</span><input id="smq" placeholder="খুঁজুন…" oninput="smFilter()"></div>
    <div class="sm-tools"><button onclick="smFlash()">🃏 ফ্ল্যাশকার্ড</button><button onclick="smQuiz()">❓ কুইজ করুন</button><button id="smonly" onclick="smOnly()">⭐ মুখস্থ <b id="smcnt">${bn(cnt)}</b></button></div>
    <div class="sm-list">${P.rows.map((r, i) => smRow(r, i, pid, st)).join('')}</div><div id="smnone" class="hint" style="display:none;text-align:center;padding:14px">কিছু পাওয়া যায়নি।</div>
    <button class="btn sm" style="margin-top:10px" onclick="smSpeak()">🔊 পড়ে শোনান</button></div>`;
}
function smFilter() {
  const q = (document.getElementById('smq').value || '').trim().toLowerCase(), st = smStarAll(); let shown = 0;
  document.querySelectorAll('.sm-list > [data-i]').forEach(el => {
    const r = SM.rows[+el.dataset.i]; let vis = true;
    if (r.k === 'h') vis = !q && !SM.only; else { if (q && (el.dataset.s || '').indexOf(q) < 0) vis = false; if (SM.only && !(r.key && st[SM.pid + '|' + r.key])) vis = false; }
    el.style.display = vis ? '' : 'none'; if (vis && r.k !== 'h') shown++;
  });
  const nn = document.getElementById('smnone'); if (nn) nn.style.display = shown ? 'none' : '';
}
function smOnly() { SM.only = !SM.only; const b = document.getElementById('smonly'); if (b) b.classList.toggle('on', SM.only); smFilter(); }
function smStar(i) {
  const r = SM.rows[i]; if (!r || !r.key) return; const st = smStarAll(), k = SM.pid + '|' + r.key; if (st[k]) delete st[k]; else st[k] = 1;
  try { localStorage.setItem('p45star', JSON.stringify(st)); } catch (e) {}
  const el = document.querySelector(`.sm-list [data-i="${i}"] .sm-st`); if (el) el.classList.toggle('on', !!st[k]);
  const c = document.getElementById('smcnt'); if (c) c.textContent = bn(SM.rows.filter(x => x.key && st[SM.pid + '|' + x.key]).length); if (SM.only) smFilter();
}
function smSpeak() { speak(SM.rows.map(r => r.k === 'h' ? r.t : r.k === 't' ? r.t : r.say).join('। ')); }
let SMF = {i: 0, f: false, d: []};
function smFlash() {
  const d = SM.rows.filter(r => r.key && r.bk); if (!d.length) return; SMF = {i: 0, f: false, d};
  showModal('<div id="smfc"></div>'); smFlashDraw();
}
function smFlashDraw() {
  const el = document.getElementById('smfc'); if (!el) return; const r = SMF.d[SMF.i], st = smStarAll(), on = !!st[SM.pid + '|' + r.key];
  el.innerHTML = `<div class="hint" style="text-align:center">${bn(SMF.i + 1)} / ${bn(SMF.d.length)}</div><div class="sm-fc${SMF.f ? ' bk' : ''}" onclick="SMF.f=!SMF.f;smFlashDraw()"><div>${esc(SMF.f ? r.bk : r.fr)}${SMF.f && r.ex ? `<small>${esc(r.ex)}</small>` : ''}</div><small class="sm-tap">${SMF.f ? 'উত্তর' : 'চাপলে উত্তর দেখবেন'}</small></div>
    <div class="sm-fb"><button onclick="SMF.i=(SMF.i+SMF.d.length-1)%SMF.d.length;SMF.f=false;smFlashDraw()">‹ আগে</button><button onclick="smFlashStar()">${on ? '⭐ মুখস্থ' : '☆ মুখস্থ'}</button><button onclick="SMF.i=(SMF.i+1)%SMF.d.length;SMF.f=false;smFlashDraw()">পরে ›</button></div>`;
}
function smFlashStar() { const r = SMF.d[SMF.i], i = SM.rows.indexOf(r); smStar(i); smFlashDraw(); }
let SMQ = {n: 0, s: 0, qs: []};
function smQuiz() {
  const d = SM.rows.filter(r => r.key && r.bk); if (d.length < 2) return alert('কুইজের জন্য অন্তত ২টি সাজানো লাইন লাগবে।');
  const sh = a => a.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  SMQ = {n: 0, s: 0, qs: sh(d).slice(0, 10).map(r => { const others = sh(d.filter(x => x.bk !== r.bk)).map(x => x.bk).filter((v, j, a) => a.indexOf(v) === j).slice(0, 3); return {t: r.fr, a: r.bk, o: sh(others.concat([r.bk]))}; })};
  showModal('<div id="smqz"></div>'); smQuizDraw();
}
function smQuizDraw() {
  const el = document.getElementById('smqz'); if (!el) return;
  if (SMQ.n >= SMQ.qs.length) { el.innerHTML = `<div style="text-align:center;padding:10px"><div style="font-size:44px">🏆</div><h3>${bn(SMQ.s)} / ${bn(SMQ.qs.length)}</h3><button class="btn" onclick="smQuiz()">আবার করুন</button></div>`; return; }
  const q = SMQ.qs[SMQ.n];
  el.innerHTML = `<div class="hint">প্রশ্ন ${bn(SMQ.n + 1)} / ${bn(SMQ.qs.length)}</div><h3 style="margin:6px 0 10px">«${esc(q.t)}» — সঠিক উত্তর কোনটি?</h3>${q.o.map((o, i) => `<button class="sm-o" onclick="smAns(${i},this)">${esc(o)}</button>`).join('')}`;
}
function smAns(i, b) {
  const q = SMQ.qs[SMQ.n]; if (document.querySelector('.sm-o.ok')) return; const good = q.o[i] === q.a; if (good) SMQ.s++;
  document.querySelectorAll('.sm-o').forEach((x, j) => { if (q.o[j] === q.a) x.classList.add('ok'); else if (x === b) x.classList.add('no'); });
  setTimeout(() => { SMQ.n++; smQuizDraw(); }, good ? 600 : 1300);
}
// পাতার লেখা স্মার্ট হলে .rich বদলে দেয়
function smApply(c) {
  try {
    if (c && c.fmt === 'plain') return; const body = c && (c.type === 'node' ? nBody(c) : c.body); if (!body) return; const P = smParse(body); if (!P.ok) return;
    const el = document.querySelector('#app .cx .rich'); if (!el) return;
    const wrap = document.createElement('div'); wrap.innerHTML = smHtml(c.id, body); el.replaceWith(wrap.firstChild);
    document.querySelectorAll('#app .cx .btn.sm').forEach(b => { if (/শুনুন/.test(b.textContent) && !b.closest('.sm')) b.remove(); });
  } catch (e) { console.error(e); }
}
// ---------- সহজ লেখার পাতা (অ্যাডমিন) ----------
let SMW = {mode: 'edit', id: '', parent: '', fmt: 'smart'};
function smWrite(mode, key) {
  const c = mode === 'edit' ? ADMIN_CONTENT.find(x => x.id === key) : null;
  SMW = mode === 'edit' ? {mode, id: key, parent: '', fmt: (c && c.fmt) || 'smart'} : {mode, id: '', parent: key, fmt: 'smart'}; stack.push(() => mode === 'edit' ? nodePage(key) : reopenKey(key));
  render(pageHead('✍️ এখানে লিখুন') + `<div class="pad"><div class="cx">${mode === 'new' ? '<input class="inp" id="sw_t" placeholder="পাতার নাম (যেমন: ১ম দিন (স্বরসন্ধি))">' : `<b>${esc(c ? nTitle(c) : '')}</b>`}
    <div class="seg" style="margin:8px 0"><button id="sw_f1" class="${SMW.fmt !== 'plain' ? 'on' : ''}" onclick="smFmt('smart')">✨ সাজানো</button><button id="sw_f2" class="${SMW.fmt === 'plain' ? 'on' : ''}" onclick="smFmt('plain')">📄 সাদা লেখা (বইয়ের মতো)</button></div>
    <div class="hint" id="sw_h" style="margin:6px 0"></div>
    <textarea class="inp" id="sw_b" rows="18" placeholder="এখানে লিখুন বা বই থেকে একসাথে অনেকগুলো লাইন পেস্ট করুন…" style="font-size:16px" oninput="smCount()">${esc(c ? (c.body || '') : '')}</textarea><div class="hint" id="sw_c"></div>
    ${mode === 'new' ? '<label style="display:block;margin:6px 0;font-size:14px"><input type="checkbox" id="sw_sp" checked> প্রতিটি «# শিরোনাম» আলাদা আলাদা পাতা হবে (একসাথে অনেক পাতা)</label>' : ''}
    <div id="sw_m" class="hint"></div><button class="btn" onclick="smSave()">💾 সেভ করুন</button></div></div>`); smFmt(SMW.fmt); smCount();
}
function smFmt(f) {
  SMW.fmt = f; const a = document.getElementById('sw_f1'), b = document.getElementById('sw_f2'); if (a) a.className = f !== 'plain' ? 'on' : ''; if (b) b.className = f === 'plain' ? 'on' : '';
  const h = document.getElementById('sw_h'); if (!h) return;
  h.innerHTML = f === 'plain' ? 'লেখা যেমন দেবেন ঠিক তেমনই দেখাবে। অনুচ্ছেদ আলাদা করতে ফাঁকা লাইন দিন। বড় শিরোনামের জন্য লাইনের শুরুতে <b>#</b> দিন।'
    : 'প্রতি লাইনে একটি। অ্যাপ লেখা দেখে নিজে সাজাবে:<br>• <b>শতেক = শত + এক</b> ভাগ করা ঘর • <b>চাঁদ = শশী, সোম</b> সমার্থক • <b>ভালো ↔ মন্দ</b> বিপরীত<br>• <b>অকালকুষ্মাণ্ড = অপদার্থ | উদাহরণ</b> বাগধারা • <b>অনাথ = যার পিতামাতা নেই</b> এক কথায়<br>• <b>সূত্র: লাভ = বিক্রয় − ক্রয়</b> • <b>১. ধাপ</b> • <b>উত্তর: ১৫%</b> অঙ্কের জন্য<br>• <b>abandon /আ-ব্যান-ডন/ (v) = ত্যাগ করা | বাক্য | leave, quit</b> ইংলিশ<br>• <b>১৯৭১ = স্বাধীনতা যুদ্ধ</b> • <b>রাজধানী = ঢাকা</b> সাধারণ জ্ঞান • <b># শিরোনাম</b> ভাগের নাম';
}
function smCount() { const t = (document.getElementById('sw_b') || {}).value || '', c = document.getElementById('sw_c'); if (c) c.textContent = bn(t.split('\n').filter(x => x.trim()).length) + 'টি লাইন • ' + bn(t.length) + '/২০০০০ অক্ষর'; }
async function smSave() {
  const m = await sme(); if (!m) return; let body = (document.getElementById('sw_b').value || ''), msg = t => { const e = document.getElementById('sw_m'); if (e) e.textContent = t; };
  if (body.length > 20000 && !(SMW.mode === 'new' && (document.getElementById('sw_sp') || {}).checked)) return msg('এক পাতায় সর্বোচ্চ ২০,০০০ অক্ষর। «# শিরোনাম» দিয়ে ভাগ করে নতুন পাতা হিসেবে দিন।');
  try {
    msg('⏳ সেভ হচ্ছে...'); const F = F0 => m.f.F[F0];
    if (SMW.mode === 'edit') { await m.f.F.setDoc(m.f.F.doc(m.f.db, 'content', SMW.id), {body: body.slice(0, 20000), fmt: SMW.fmt}, {merge: true}); await refreshContent(); stack.pop(); return nodePage(SMW.id); }
    const t = gv('sw_t'), split = (document.getElementById('sw_sp') || {}).checked; let pages = [];
    if (split && /^# /m.test(body)) {
      let cur = null; body.split('\n').forEach(ln => { const h = ln.match(/^#\s+(.+)$/); if (h) { cur = {t: h[1].trim(), b: []}; pages.push(cur); } else if (cur) cur.b.push(ln); else if (ln.trim()) { if (!pages.pre) pages.pre = []; pages.pre.push(ln); } });
      if (pages.pre && pages.pre.length) pages.unshift({t: t || 'ভূমিকা', b: pages.pre});
    } else { if (!t) return msg('পাতার নাম দিন।'); pages = [{t, b: body.split('\n')}]; }
    if (pages.length > 40) return msg('একবারে সর্বোচ্চ ৪০টি পাতা।');
    let o = 0; for (const pg of pages) {
      const d = {type: 'node', parent: SMW.parent, title: pg.t.slice(0, 150), titleEn: '', body: pg.b.join('\n').trim().slice(0, 20000), bodyEn: '', lang: 'auto', url: '', pub: true, by: m.u.uid, qz: [], blocks: [], pd: '', credit: '', color: '', ord: ++o, ic: '', mt: 'none', fmt: SMW.fmt, createdAt: m.f.F.serverTimestamp()};
      await m.f.F.addDoc(m.f.F.collection(m.f.db, 'content'), d);
    }
    await refreshContent(); stack.pop(); rebuildStack(SMW.parent); reopenKey(SMW.parent);
  } catch (e) { msg('⚠️ ' + ((e && e.code === 'permission-denied') ? 'অনুমতি নেই।' : 'সেভ হয়নি।')); }
}

// =====================================================================
//  P43b: দেনা-পাওনা — প্রতি জনের আলাদা খাতা (নিলাম/দিলাম), রিমাইন্ডার, PDF/Excel
// =====================================================================
let LG_DP = '', DBF = {k: 'n'};
function dbCalc(d) {
  if (!Array.isArray(d.tx)) {
    d.tx = []; const o = d.type === 'owe';
    if (d.amt > 0) d.tx.push({id: 't0', k: o ? 'n' : 'd', amt: d.amt, date: d.date || todayISO(), note: d.note || ''});
    if (d.paid > 0) d.tx.push({id: 't1', k: o ? 'd' : 'n', amt: d.paid, date: d.date || todayISO(), note: ''});
  }
  const took = d.tx.filter(t => t.k === 'n').reduce((a, t) => a + t.amt, 0), gave = d.tx.filter(t => t.k === 'd').reduce((a, t) => a + t.amt, 0), bal = gave - took;
  if (bal > 0) d.type = 'due'; else if (bal < 0) d.type = 'owe';
  if (d.type === 'due') { d.amt = gave; d.paid = took; } else { d.amt = took; d.paid = gave; }
  d.bal = bal; return d;
}
const dbBalTxt = d => d.bal > 0 ? `<b style="color:#b45309">পাব ${tk(d.bal)}</b>` : d.bal < 0 ? `<b style="color:#7e22ce">দেব ${tk(-d.bal)}</b>` : '<b style="color:#15803d">✅ মিটে গেছে</b>';
function dbLast(d) { const t = d.tx.slice().sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))[0]; return t ? lgDate(t.date) : ''; }
function dbList(l) {
  const ds = lgDebts(l); ds.forEach(dbCalc);
  const owe = lgDebtSum(l, 'owe'), due = lgDebtSum(l, 'due');
  return `<div class="lg-card"><b>🤝 দেনা-পাওনা</b><div class="lg2"><div><span>আমি দেব (দেনা)</span><b style="color:#7e22ce">${tk(owe)}</b></div><div><span>আমি পাব (পাওনা)</span><b style="color:#b45309">${tk(due)}</b></div></div>
    ${ds.length ? `<div class="db-exp"><a href="#" onclick="dbExport('pdf','');return false">📄 সবার PDF</a><a href="#" onclick="dbExport('xlsx','');return false">📊 সবার Excel</a></div>` : ''}</div>
    ${ds.map(d => `<div class="db-p" onclick="LG_DP='${esc(d.id)}';DBF={k:'n'};ledgerPage()"><div class="db-av">${esc((d.who || '?').trim().slice(0, 1))}</div><div style="flex:1;min-width:0"><b>${esc(d.who)}</b><small>${bn(d.tx.length)}টি লেনদেন${dbLast(d) ? ' • ' + dbLast(d) : ''}${d.rem && d.rem.d ? ' • 🔔 ' + lgDate(d.rem.d) : ''}</small></div><div style="text-align:right">${dbBalTxt(d)}</div></div>`).join('') || '<div class="hint" style="text-align:center;padding:12px">এখনো কেউ নেই। নিচে থেকে যোগ করুন।</div>'}
    <div class="lg-card"><b>➕ নতুন ব্যক্তি / নতুন লেনদেন</b><input class="inp" id="dw" list="dbn" placeholder="কার সাথে (নাম)"><datalist id="dbn">${ds.map(d => `<option value="${esc(d.who)}">`).join('')}</datalist>
    <div class="seg" style="margin:8px 0"><button id="dk_n" class="on" onclick="DBF.k='n';this.className='on';document.getElementById('dk_d').className=''">🟣 নিলাম (তার কাছ থেকে)</button><button id="dk_d" onclick="DBF.k='d';this.className='on';document.getElementById('dk_n').className=''">🟠 দিলাম (তাকে)</button></div>
    <input class="inp" id="da" type="number" inputmode="decimal" min="0" placeholder="টাকা"><input class="inp" id="ddt" type="date" value="${todayISO()}"><input class="inp" id="dn" placeholder="বিবরণ (ঐচ্ছিক)"><button class="btn" onclick="dbNew()">💾 সংরক্ষণ</button></div>`;
}
function dbNew() {
  const w = gv2('dw'), a = +gv2('da'); if (!w || !(a > 0)) return alert('নাম ও টাকা দিন।');
  const l = ledgerData(), ds = lgDebts(l); let d = ds.find(x => (x.who || '').trim() === w);
  if (!d) { d = {id: String(Date.now()), who: w, amt: 0, paid: 0, type: DBF.k === 'n' ? 'owe' : 'due', note: '', date: todayISO(), tx: []}; ds.push(d); }
  dbCalc(d); d.tx.push({id: String(Date.now()), k: DBF.k, amt: a, date: gv2('ddt') || todayISO(), note: gv2('dn')}); dbCalc(d); saveLedger(l); DBF = {k: 'n'}; ledgerPage();
}
function dbPerson(l) {
  const d = lgDebts(l).find(x => x.id === LG_DP); if (!d) { LG_DP = ''; return dbList(l); } dbCalc(d);
  const tx = d.tx.slice().sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id)); let run = 0; const rows = tx.map(t => { run += t.k === 'd' ? t.amt : -t.amt; return Object.assign({run}, t); }).reverse();
  const r = d.rem || {};
  return `<button class="lg-bk" onclick="LG_DP='';ledgerPage()">‹ সবার তালিকা</button>
    <div class="lg-card"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:19px">👤 ${esc(d.who)}</b><a href="#" onclick="dbDel('${esc(d.id)}');return false">🗑️</a></div>
    <div class="lg3"><div><span>নিলাম</span><b style="color:#7e22ce">${tk(d.tx.filter(t => t.k === 'n').reduce((a, t) => a + t.amt, 0))}</b></div><div><span>দিলাম</span><b style="color:#b45309">${tk(d.tx.filter(t => t.k === 'd').reduce((a, t) => a + t.amt, 0))}</b></div><div><span>বাকি</span>${dbBalTxt(d)}</div></div>
    <div class="db-exp"><a href="#" onclick="dbExport('pdf','${esc(d.id)}');return false">📄 PDF</a><a href="#" onclick="dbExport('xlsx','${esc(d.id)}');return false">📊 Excel</a></div></div>
    <div class="lg-card"><b>➕ নতুন লেনদেন</b><div class="seg" style="margin:8px 0"><button id="dk_n" class="${DBF.k === 'n' ? 'on' : ''}" onclick="DBF.k='n';this.className='on';document.getElementById('dk_d').className=''">🟣 নিলাম</button><button id="dk_d" class="${DBF.k === 'd' ? 'on' : ''}" onclick="DBF.k='d';this.className='on';document.getElementById('dk_n').className=''">🟠 দিলাম</button></div>
      <input class="inp" id="da" type="number" inputmode="decimal" min="0" placeholder="টাকা"><input class="inp" id="ddt" type="date" value="${todayISO()}"><input class="inp" id="dn" placeholder="বিবরণ (ঐচ্ছিক)"><button class="btn" onclick="dbAddTx('${esc(d.id)}')">💾 সংরক্ষণ</button></div>
    <div class="lg-card"><b>🔔 মনে করিয়ে দিন</b><div class="hint">ওই তারিখ-সময়ে ফোনে নোটিফিকেশন আসবে (অ্যাপে)।</div><div style="display:flex;gap:6px"><input class="inp" style="margin:0" id="rd" type="date" value="${esc(r.d || '')}"><input class="inp" style="margin:0" id="rt" type="time" value="${esc(r.tm || '09:00')}"></div><div style="display:flex;gap:6px;margin-top:6px"><button class="btn sm" style="margin:0;flex:1" onclick="dbRem('${esc(d.id)}',1)">🔔 ঠিক করুন</button>${r.d ? `<button class="btn sm" style="margin:0;background:#64748b" onclick="dbRem('${esc(d.id)}',0)">বাদ</button>` : ''}</div><div id="rm" class="hint"></div></div>
    <div class="lg-card" style="padding:4px 12px"><div class="db-h"><span>তারিখ ও বিবরণ</span><span>লেনদেন</span><span>বাকি</span></div>${rows.map(t => `<div class="db-t"><div><b>${lgDate(t.date)}</b><small>${esc(t.note || '')}</small></div><span style="color:${t.k === 'n' ? '#7e22ce' : '#b45309'}">${t.k === 'n' ? 'নিলাম' : 'দিলাম'}<br><b>${tk(t.amt)}</b></span><span class="rb" style="color:${t.run > 0 ? '#b45309' : t.run < 0 ? '#7e22ce' : '#15803d'}">${t.run > 0 ? 'পাব ' : t.run < 0 ? 'দেব ' : ''}${tk(Math.abs(t.run))}</span><a href="#" onclick="dbDelTx('${esc(d.id)}','${esc(t.id)}');return false">✕</a></div>`).join('')}</div>`;
}
function dbAddTx(id) { const a = +gv2('da'); if (!(a > 0)) return alert('টাকা দিন।'); const l = ledgerData(), d = lgDebts(l).find(x => x.id === id); if (!d) return; dbCalc(d); d.tx.push({id: String(Date.now()), k: DBF.k, amt: a, date: gv2('ddt') || todayISO(), note: gv2('dn')}); dbCalc(d); saveLedger(l); ledgerPage(); }
function dbDelTx(id, tid) { if (!confirm('এই লেনদেন মুছবেন?')) return; const l = ledgerData(), d = lgDebts(l).find(x => x.id === id); if (!d) return; dbCalc(d); d.tx = d.tx.filter(t => t.id !== tid); dbCalc(d); saveLedger(l); ledgerPage(); }
function dbDel(id) { if (!confirm('এই ব্যক্তির পুরো খাতা মুছবেন?')) return; const l = ledgerData(); l.debts = lgDebts(l).filter(x => x.id !== id); saveLedger(l); dbNotifCancel(id); LG_DP = ''; ledgerPage(); }
const dbNid = id => (parseInt(String(id).replace(/\D/g, '').slice(-8), 10) || 7) % 2000000000;
async function dbNotifCancel(id) { const ln = LNP(); if (!ln) return; try { await ln.cancel({notifications: [{id: dbNid(id)}]}); } catch (e) {} }
async function dbRem(id, on) {
  const l = ledgerData(), d = lgDebts(l).find(x => x.id === id); if (!d) return; dbCalc(d); const m = t => { const e = document.getElementById('rm'); if (e) e.textContent = t; };
  if (!on) { delete d.rem; saveLedger(l); await dbNotifCancel(id); return ledgerPage(); }
  const dt = gv2('rd'), tm = gv2('rt') || '09:00'; if (!dt) return m('তারিখ দিন।');
  d.rem = {d: dt, tm}; saveLedger(l); const ln = LNP(); if (!ln) return m('✅ সেভ হয়েছে। নোটিফিকেশন শুধু ফোনের অ্যাপে আসবে; এখানে হোমে মনে করানো হবে।');
  await dbNotifCancel(id);
  try {
    const p = await ln.requestPermissions(); if (p.display !== 'granted') return m('⚠️ নোটিফিকেশনের অনুমতি দেওয়া নেই। ফোনের সেটিংস থেকে অনুমতি দিন।');
    const a = dt.split('-').map(Number), t = tm.split(':').map(Number), at = new Date(a[0], a[1] - 1, a[2], t[0] || 9, t[1] || 0, 0); if (at <= new Date()) return m('⚠️ এই সময় পার হয়ে গেছে।');
    await ln.schedule({notifications: [{id: dbNid(id), title: 'আমার ভাই: ' + d.who, body: (d.bal > 0 ? 'পাব ' : d.bal < 0 ? 'দেব ' : 'দেনা-পাওনা ') + (d.bal ? bn(Math.abs(d.bal)) + ' টাকা' : '') + ' — মনে করার সময় হয়েছে', extra: {db: id}, schedule: {at, allowWhileIdle: true}}]}); m('✅ নোটিফিকেশন ঠিক হয়েছে।');
  } catch (e) { m('⚠️ নোটিফিকেশন ঠিক হয়নি।'); }
}
function dbExportData(id) {
  const l = ledgerData(), all = lgDebts(l); all.forEach(dbCalc); const ps = id ? all.filter(d => d.id === id) : all;
  return {ps, title: id && ps[0] ? ps[0].who + ' — দেনা-পাওনার খাতা' : 'সবার দেনা-পাওনার খাতা'};
}
async function dbExport(fmt, id) {
  const D = dbExportData(id); if (!D.ps.length || !D.ps.some(d => d.tx.length)) return alert('কোনো লেনদেন নেই।');
  const nm = 'denapawna_' + (id ? D.ps[0].who.replace(/[^\wঀ-৿]+/g, '_') : 'sob');
  try { if (fmt === 'pdf') await lbSaveFile(nm + '.pdf', await dbPdf(D), 'application/pdf', D.title); else await lbSaveFile(nm + '.xlsx', dbXlsx(D), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', D.title); } catch (e) { alert('ফাইল তৈরি হয়নি।'); }
}
async function dbPdf(D) {
  const W = 1240, H = 1754, P = 70, rowH = 52, pages = []; let cv, g, y;
  const np = () => { cv = document.createElement('canvas'); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); pages.push(cv); y = P; };
  const F = (w, s) => `${w} ${s}px "Noto Sans Bengali","Hind Siliguri",sans-serif`; try { await document.fonts.load(F(700, 30), 'দেনা'); } catch (e) {}
  const txt = (s, x, yy, f, c, al) => { g.font = f; g.fillStyle = c; g.textAlign = al || 'left'; g.fillText(String(s), x, yy); };
  np(); const PI = padOn() ? await padImgs() : null; if (PI) { y = padDraw(g, W, P, PI) + 14; txt('দেনা-পাওনার খাতা • ' + D.title + ' • ' + lgDate(todayISO()), P, y + 26, F(800, 26), '#0b3d2e'); y += 56; } else { g.fillStyle = '#05301f'; g.fillRect(0, 0, W, 140); txt('আমার ভাই — দেনা-পাওনার খাতা', P, 66, F(800, 42), '#ffc83d'); txt(D.title + ' • ' + lgDate(todayISO()), P, 114, F(600, 28), '#fff'); y = 180; }
  const sumO = D.ps.reduce((a, d) => a + Math.max(0, -d.bal), 0), sumD = D.ps.reduce((a, d) => a + Math.max(0, d.bal), 0);
  g.fillStyle = '#f4f6f4'; g.fillRect(P, y, 540, 100); txt('মোট দেব', P + 24, y + 40, F(600, 26), '#475569'); txt('৳ ' + bn(rpN(sumO)), P + 24, y + 84, F(800, 38), '#7e22ce'); g.fillRect(P + 570, y, 540, 100); txt('মোট পাব', P + 594, y + 40, F(600, 26), '#475569'); txt('৳ ' + bn(rpN(sumD)), P + 594, y + 84, F(800, 38), '#b45309'); y += 140;
  D.ps.forEach(d => {
    if (y > H - 300) np(); g.fillStyle = '#0b3d2e'; g.fillRect(P, y, W - 2 * P, 58); txt('👤 ' + d.who, P + 16, y + 40, F(800, 28), '#fff'); txt(d.bal > 0 ? 'পাব ৳ ' + bn(rpN(d.bal)) : d.bal < 0 ? 'দেব ৳ ' + bn(rpN(-d.bal)) : 'মিটে গেছে', W - P - 16, y + 40, F(800, 26), '#ffc83d', 'right'); y += 58;
    g.fillStyle = '#e5eae7'; g.fillRect(P, y, W - 2 * P, 44); txt('তারিখ', P + 12, y + 31, F(700, 22), '#14231c'); txt('বিবরণ', P + 190, y + 31, F(700, 22), '#14231c'); txt('নিলাম', W - P - 380, y + 31, F(700, 22), '#7e22ce', 'right'); txt('দিলাম', W - P - 220, y + 31, F(700, 22), '#b45309', 'right'); txt('বাকি', W - P - 12, y + 31, F(700, 22), '#14231c', 'right'); y += 44;
    let run = 0; d.tx.slice().sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id)).forEach((t, i) => {
      if (y > H - 110) np(); run += t.k === 'd' ? t.amt : -t.amt; if (i % 2) { g.fillStyle = '#f6f8f6'; g.fillRect(P, y, W - 2 * P, rowH); }
      txt(lgDate(t.date), P + 12, y + 35, F(500, 22), '#14231c'); const s = t.note || ''; txt(s.length > 28 ? s.slice(0, 27) + '…' : s, P + 190, y + 35, F(500, 22), '#14231c');
      if (t.k === 'n') txt(bn(rpN(t.amt)), W - P - 380, y + 35, F(700, 22), '#7e22ce', 'right'); else txt(bn(rpN(t.amt)), W - P - 220, y + 35, F(700, 22), '#b45309', 'right');
      txt((run > 0 ? 'পাব ' : run < 0 ? 'দেব ' : '') + bn(rpN(Math.abs(run))), W - P - 12, y + 35, F(700, 22), run > 0 ? '#b45309' : run < 0 ? '#7e22ce' : '#15803d', 'right'); y += rowH;
    }); y += 36;
  });
  pages.forEach((c, i) => { const g2 = c.getContext('2d'); g2.font = F(500, 20); g2.fillStyle = '#6b7a72'; g2.textAlign = 'center'; g2.fillText('আমার ভাই অ্যাপ • পেজ ' + bn(i + 1) + '/' + bn(pages.length), W / 2, H - 28); });
  const jp = pages.map(c => Uint8Array.from(atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), ch => ch.charCodeAt(0))); return pdfMulti(jp, W, H, 595);
}
function dbXlsx(D) {
  const d0 = {es: [], title: D.title, inc: 0, out: 0, head: 'আমার ভাই — দেনা-পাওনার খাতা', catL: 'ব্যক্তি', inL: 'দিলাম', outL: 'নিলাম', totIn: 'মোট দিলাম', totOut: 'মোট নিলাম', balL: 'বাকি (দিলাম − নিলাম)'}; let rows = [];
  D.ps.forEach(d => d.tx.slice().sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id)).forEach(t => rows.push({date: t.date, type: t.k === 'd' ? 'in' : 'out', cat: d.who, note: t.note || '', amt: t.amt, id: t.id})));
  d0.es = rows; d0.inc = rows.filter(r => r.type === 'in').reduce((a, r) => a + r.amt, 0); d0.out = rows.filter(r => r.type === 'out').reduce((a, r) => a + r.amt, 0);
  return rpXlsx(d0);
}

// =====================================================================
//  P44: আয়-খরচ খাতার পাতা (খাতার মতো) • P47b: লগ বুক সহজ সাজ
// =====================================================================
function p44Home(l) {
  const t = todayISO(), inc = lsum(l.entries, 'in'), out = lsum(l.entries, 'out'), cur = lmstat(l, t.slice(0, 7)), prev = lmstat(l, lshift(t.slice(0, 7), -1));
  const sv = l.goals.reduce((a, g) => a + g.saved, 0), cell = (lab, v, col) => `<div><span>${lab}</span><b style="color:${col}">${tk(v)}</b></div>`;
  const stT = [['d', '📅 দৈনিক'], ['m', '🗓️ মাসিক'], ['y', '📆 বার্ষিক']];
  let es = l.entries.slice().sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  if (LG_F === 'in') es = es.filter(e => e.type === 'in'); else if (LG_F === 'out') es = es.filter(e => e.type === 'out'); else if (LG_F === 'month') es = es.filter(e => e.date.slice(0, 7) === t.slice(0, 7)); else if (LG_F === 'today') es = es.filter(e => e.date === t);
  const more = es.length > 60; es = es.slice(0, 60); const days = []; es.forEach(e => { let g = days[days.length - 1]; if (!g || g.d !== e.date) { g = {d: e.date, a: []}; days.push(g); } g.a.push(e); });
  const note = days.map(g => { const di = lsum(g.a, 'in'), dо = lsum(g.a, 'out'), n = di - dо; return `<div class="nb-d"><span>${g.d === t ? 'আজ • ' : ''}${lgDate(g.d)}</span><b style="color:${n < 0 ? '#dc2626' : '#15803d'}">${n < 0 ? '−' : '+'}${tk(Math.abs(n))}</b></div>` + g.a.map(e => `<div class="nb-r"><span class="nb-c"><i style="color:${e.type === 'in' ? '#15803d' : '#dc2626'}">${e.type === 'in' ? 'আয়' : 'খরচ'}</i> ${esc(e.cat || '')}${e.note ? `<small>${esc(e.note)}</small>` : ''}</span><b style="color:${e.type === 'in' ? '#15803d' : '#dc2626'}">${e.type === 'in' ? '+' : '−'}${tk(e.amt)}</b><a href="#" class="x" onclick="lgDel2('${e.id}');return false">✕</a></div>`).join(''); }).join('');
  return `<div class="lg-sum"><div class="lg3">${cell('মোট আয়', inc, '#15803d')}${cell('মোট খরচ', out, '#dc2626')}${cell('মোট ব্যালেন্স', inc - out, inc - out < 0 ? '#dc2626' : 'inherit')}</div>
    <div class="lg2">${cell('এই মাসের ব্যালেন্স', cur.net, '#b45309')}${cell('গত মাসের ব্যালেন্স', prev.net, '#0e7490')}</div>
    <div class="lg3">${cell('সঞ্চয়', sv, '#be185d')}${cell('দেনা', lgDebtSum(l, 'owe'), '#7e22ce')}${cell('পাওনা', lgDebtSum(l, 'due'), '#7e22ce')}</div></div>
    <div class="lg-bt"><button class="o" onclick="lgNew('out')">👛 খরচ লিখুন ➖</button><button class="i" onclick="lgNew('in')">💰 আয় লিখুন ➕</button></div>
    <div class="lg-hh"><b>📒 আয়-খরচের খাতা</b><select onchange="LG_F=this.value;ledgerPage()">${[['all', 'সব'], ['today', 'আজ'], ['month', 'এই মাস'], ['in', 'শুধু আয়'], ['out', 'শুধু খরচ']].map(o => `<option value="${o[0]}" ${LG_F === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
    <div class="nb">${note || '<div class="hint" style="text-align:center;padding:26px 8px">খাতা ফাঁকা। উপরের বাটন দিয়ে লেখা শুরু করুন।</div>'}</div>${more ? '<div class="hint" style="text-align:center">সর্বশেষ ৬০টি দেখানো হচ্ছে।</div>' : ''}
    <div class="lg-h"><span>আয়-খরচের পরিসংখ্যান</span></div><div class="lg-st">${stT.map(x => `<button class="${LG_ST === x[0] ? 'on' : ''}" onclick="LG_ST='${x[0]}';ledgerPage()">${x[1]}</button>`).join('')}</div>${lgStat(l)}
    <div class="nb-ln"><a href="#" onclick="lgGo('more');return false">⋮ আরও দেখুন</a><a href="#" onclick="lgReport();return false">📤 রিপোর্ট (PDF / Excel)</a></div>`;
}
const LBOPEN = {};
function p44Init() {
  if (window.__p44) return; window.__p44 = 1;
  const ab0 = window.adminBar; window.adminBar = function (key, c) {
    const h = ab0.apply(this, arguments); if (!h) return h; const k = esc(key);
    const add = `<button class="smw" onclick="smWrite('new','${k}')">✍️ নতুন পাতা লিখুন</button>` + (c && c.type === 'node' ? `<button class="smw" onclick="smWrite('edit','${esc(c.id)}')">✍️ এখানে লিখুন</button>` : '');
    const i = h.lastIndexOf('</div>'); return h.slice(0, i) + add + h.slice(i);
  };
  const n0 = window.nodePage; window.nodePage = function (id) { const r = n0.apply(this, arguments); smApply(ADMIN_CONTENT.find(x => x.id === id)); return r; };
  const s0 = window.sectionPage; window.sectionPage = function (id) { const r = s0.apply(this, arguments); smApply(ADMIN_CONTENT.find(x => x.id === id)); return r; };
  window.lgDebtV = function (l) { return LG_DP ? dbPerson(l) : dbList(l); };
  window.lgHome = p44Home;
  const lgo = window.lgGo; window.lgGo = function (v) { if (v !== 'debt') LG_DP = ''; return lgo.apply(this, arguments); };
  const lr0 = window.lbRender; window.lbRender = function () { const r = lr0.apply(this, arguments); lbFold(); return r; };
  const lf0 = window.lbRefresh; window.lbRefresh = function () { const r = lf0.apply(this, arguments); lbFold(); return r; };
  const ra0 = window.remAlerts; window.remAlerts = function () {
    const out = ra0.apply(this, arguments);
    try { lgDebts(ledgerData()).forEach(d => { if (d.rem && d.rem.d && d.rem.d <= todayISO()) { dbCalc(d); if (d.bal) out.push({lvl: 1, t: `🤝 ${d.who}: ${d.bal > 0 ? 'পাব' : 'দেব'} ${bn(Math.abs(d.bal))} টাকা — মনে করার দিন`}); } }); } catch (e) {}
    return out;
  };
  try { const ln = LNP(); if (ln && ln.addListener) ln.addListener('localNotificationActionPerformed', e => { const x = e && e.notification && e.notification.extra; if (x && x.db) { LG_V = 'debt'; LG_DP = x.db; try { open_('ledger'); } catch (er) {} } }); } catch (e) {}
}
(function () { const st = document.createElement('style'); st.textContent = `
.adbar .smw{flex:1 0 100%;background:#0f6a4c;font-size:16px;padding:13px 10px;border-radius:12px}
.sm-s{display:flex;gap:8px;align-items:center;background:#fff;border:1.5px solid #d6ddd8;border-radius:14px;padding:4px 12px;margin-bottom:8px}.sm-s input{flex:1;border:0;outline:0;font:inherit;font-size:15px;padding:8px 0;background:transparent}
.sm-tools{display:flex;gap:6px;margin-bottom:10px}.sm-tools button{flex:1;border:0;border-radius:10px;background:#ede7fb;color:#4c1d95;font:inherit;font-weight:800;font-size:12.5px;padding:9px 2px}.sm-tools button.on{background:#f5a400;color:#fff}
.sm-list{background:#fff;border-radius:16px;padding:4px 12px;box-shadow:0 2px 8px #0001}.sm-h{font-weight:800;font-size:16px;color:#0b3d2e;margin:14px 0 4px;padding-bottom:4px;border-bottom:2px solid #0b6a4a}.sm-t{padding:8px 0;font-size:14.5px;line-height:1.6}
.sm-row{position:relative;display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:10px 30px 10px 2px;border-bottom:1px dashed #e0dac8}.sm-row:last-child{border:0}
.sm-w{font-size:16px;color:#0b4a6e}.sm-big{width:100%;font-size:17px}.sm-eq{color:#9aa5a0;font-weight:800}.sm-ch{background:#e8f2fb;border:1px solid #bcd7ee;border-radius:10px;padding:2px 9px;font-size:14.5px;font-weight:700;color:#0b4a6e}.sm-ch.o{background:#fff1e0;border-color:#f2c48c;color:#9a3412}.sm-ch.g{background:#e6f6ea;border-color:#a8dbb5;color:#166534;font-size:16px}
.sm-chs{display:flex;gap:5px;flex-wrap:wrap}.k-syn,.k-idm,.k-one{flex-direction:column;align-items:flex-start;gap:3px}.sm-id{font-size:16px;color:#7c2d12}.sm-ex{font-style:normal;color:#6b7a72;font-size:12.5px}.sm-ph{font-size:13.5px}
.sm-a,.sm-b{flex:1;text-align:center;border-radius:11px;padding:6px;font-size:15px;font-weight:800}.sm-a{background:#e6f6ea;color:#166534}.sm-b{background:#fde8e8;color:#991b1b}.sm-m{font-size:18px;color:#9aa5a0}
.sm-st{position:absolute;right:4px;top:10px;font-size:20px;color:#d4cfbf;cursor:pointer;padding:0 2px}.sm-st.on{color:#f5a400}
.sm-fc{min-height:170px;border-radius:18px;background:#e8f2fb;border:2px solid #bcd7ee;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16px;margin:8px 0;font-size:24px;font-weight:800;color:#0b4a6e;position:relative;cursor:pointer}.sm-fc.bk{background:#e6f6ea;border-color:#a8dbb5;color:#166534}.sm-fc small{display:block;font-size:13px;font-weight:600;margin-top:8px}.sm-tap{position:absolute;bottom:8px;font-size:11px!important;color:#6b7a72;font-weight:600}
.sm-fb{display:flex;gap:8px}.sm-fb button{flex:1;border:0;border-radius:12px;background:#ede7fb;color:#4c1d95;font:inherit;font-weight:800;padding:12px 4px}
.sm-o{display:block;width:100%;text-align:left;border:1.5px solid #d6ddd8;background:#fff;border-radius:12px;padding:12px;margin:7px 0;font:inherit;font-size:15px;font-weight:700}.sm-o.ok{background:#dcfce7;border-color:#16a34a}.sm-o.no{background:#fee2e2;border-color:#dc2626}
.db-p{display:flex;gap:11px;align-items:center;background:#fff;border-radius:14px;padding:11px 12px;margin:8px 0;box-shadow:0 1px 6px #0001;cursor:pointer}.db-p b{display:block;font-size:15.5px}.db-p small{color:#6b7a72;font-size:12px}.db-av{width:42px;height:42px;border-radius:50%;background:#ede7fb;color:#4c1d95;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:19px;flex:none}
.db-exp{display:flex;gap:16px;justify-content:center;padding-top:8px;font-size:13px}.db-exp a{color:#0b7ac9;font-weight:700}.db-h,.db-t{display:grid;grid-template-columns:1fr 64px 84px 18px;gap:6px;align-items:center}.db-h{font-size:11.5px;color:#64748b;padding:8px 0;border-bottom:1px solid #e5e7eb}.db-t{padding:9px 0;border-bottom:1px solid #f0ece0;font-size:13px}.db-t small{display:block;color:#6b7a72;font-size:11.5px}.db-t .rb{font-weight:800;text-align:right;font-size:12.5px}
.nb{background:#fffef6;border-radius:12px;border-left:3px solid #f4a0a0;box-shadow:0 1px 6px #0002;padding:0 10px 0 12px;margin-bottom:8px;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 41px,#bcd4ee 41px,#bcd4ee 42px)}
.nb-d{display:flex;justify-content:space-between;align-items:center;height:42px;font-weight:800;color:#0b3d2e;font-size:14px}.nb-r{display:flex;align-items:center;gap:8px;min-height:42px;font-size:14px}.nb-c{flex:1;min-width:0;line-height:1.25}.nb-c i{font-style:normal;font-size:11px;font-weight:800;margin-right:4px}.nb-c small{display:block;color:#6b7a72;font-size:11.5px}.nb-r .x{color:#cbd5e1;text-decoration:none;padding:0 3px}
.nb-ln{display:flex;justify-content:center;gap:22px;padding:14px 0 6px;font-size:13px}.nb-ln a{color:#64748b;text-decoration:underline}
.lbfold{padding:0!important}.lbfold>summary{list-style:none;padding:13px 14px;font-weight:800;font-size:14.5px;cursor:pointer;display:flex;justify-content:space-between}.lbfold>summary::after{content:'▾'}.lbfold[open]>summary::after{content:'▴'}.lbfold>*:not(summary){margin-left:14px;margin-right:14px}.lbfold[open]{padding-bottom:12px!important}
#lbform .lb-g2{grid-template-columns:1fr 1fr 1fr;gap:6px}#lbform .lb-g2 .lb-f label{font-size:11px}#lbform .lb-g2 input,#lbform .lb-g2 select{padding-left:6px;padding-right:4px;font-size:13px}
.sm-fm{width:100%;background:#fff7e6;border:1.5px solid #f2c48c;border-radius:12px;padding:8px 10px}.sm-fm b{color:#9a3412;font-size:13px}.sm-fm div{font-size:17px;font-weight:800;margin-top:2px;font-family:serif;line-height:1.5}
.sm-ans{background:#e6f6ea;border:1.5px solid #a8dbb5;border-radius:10px;padding:5px 12px;font-weight:800;color:#166534;font-size:15px}.sm-no{flex:none;width:24px;height:24px;border-radius:50%;background:#2563eb;color:#fff;font-style:normal;font-weight:800;font-size:12.5px;display:flex;align-items:center;justify-content:center}.sm-sp{font-size:14.5px;line-height:1.5;flex:1}
.sm-yr{background:#12307a;color:#fff;border-radius:8px;padding:1px 9px;font-size:13px;font-weight:800}.sm-pos{background:#fde8e8;color:#991b1b;font-size:11px;font-weight:800;border-radius:8px;padding:1px 7px}.sm-spk{font-size:16px;cursor:pointer}.sm-pr{color:#7c3aed;font-size:12.5px;font-weight:700;width:100%}.sm-bn{font-size:14.5px;width:100%}
.sm-gq{flex:1;font-size:14px}.sm-ga{color:#7c2d12;font-size:14.5px;text-align:right}.k-en{flex-direction:column;align-items:flex-start;gap:2px;flex-wrap:nowrap}.k-fm,.k-ans{padding-right:2px}
body.dark .nb,body.dark .sm-list,body.dark .db-p{background:#1f2937}
`; document.head.appendChild(st); })();

// =====================================================================
//  P50: নতুন আপডেট বোর্ড (আজকের প্রশ্নের জায়গায়)
// =====================================================================
let UPD = {rows: [], t: 0, busy: false}; try { UPD.rows = JSON.parse(localStorage.getItem('updcache') || '[]'); } catch (e) {}
const updMs = x => x ? (x.toMillis ? x.toMillis() : (+x || 0)) : 0;
const updDay = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
function updAge(ms) { const n = Math.round((updDay(Date.now()) - updDay(ms)) / 864e5); return n <= 0 ? 0 : n; }
function updBuild() {
  const lim = Date.now() - 7 * 864e5 - 864e5, out = [];
  (ADMIN_CONTENT || []).forEach(c => {
    if (!c.at || c.at < lim || !c.pub || c.hid) return; if (c.slot || c.key) return;
    if (c.type === 'node') out.push({k: 'node', id: c.id, ic: c.ic || '📄', t: nTitle(c), s: 'নতুন পাতা', at: c.at});
    else if (c.type === 'section') out.push({k: 'sec', id: c.id, ic: c.ic || '📌', t: c.title, s: 'নতুন বিভাগ', at: c.at});
    else if (c.type === 'job') out.push({k: 'page', id: 'job', ic: '💼', t: c.title, s: 'চাকরির বিজ্ঞাপন', at: c.at});
    else if (c.type === 'notice') out.push({k: 'page', id: 'board', ic: '📢', t: c.title, s: 'নোটিশ', at: c.at});
  });
  (UPD.extra || UPD.rows.filter(x => x.k !== 'node' && x.k !== 'sec' && !(x.k === 'page' && x.s !== 'চাকরির বিজ্ঞাপন' && x.s !== 'নোটিশ'))).forEach(x => { if (x.at >= lim) out.push(x); });
  const seen = new Set(); return out.filter(x => { const k = x.k + x.id, k2 = 't:' + x.s + '|' + (x.t || '').trim(); if (seen.has(k) || seen.has(k2) || !x.t) return false; seen.add(k2); seen.add(k); return true; }).sort((a, b) => b.at - a.at).slice(0, 40);
}
async function updLoad() {
  if (UPD.busy) return; UPD.busy = true;
  try {
    if (CLOUD_ON() && navigator.onLine) {
      const f = await fb(), ex = [], lim = Date.now() - 8 * 864e5;
      try { (await sList(f, ['circulars'], f.F.where('pub', '==', true), f.F.limit(60))).forEach(c => { const at = updMs(c.at) || updMs(c.createdAt); if (at >= lim) ex.push(c.kind === 'paper' ? {k: 'paper', id: c.id, ic: '📰', t: c.title || 'সাপ্তাহিক পত্রিকা', s: 'চাকরির পত্রিকা', at} : {k: 'circ', id: c.id, ic: '📢', t: c.title, s: 'চাকরির বিজ্ঞপ্তি', at}); }); } catch (e) {}
      try { (await sList(f, ['fprep'], f.F.where('pub', '==', true), f.F.limit(60))).forEach(c => { const at = updMs(c.at) || updMs(c.createdAt); if (at >= lim) ex.push({k: 'fp', id: c.id, ic: c.ic || '🌍', t: c.title, s: 'বিদেশে চাকরির প্রস্তুতি', at}); }); } catch (e) {}
      try { (typeof JOBADS !== 'undefined' ? JOBADS : []).forEach(a => { const at = updMs(a.at) || updMs(a.createdAt); if (at >= lim && a.status === 'approved') ex.push({k: 'page', id: a.kind === 'foreign' ? 'intjob' : 'job', ic: '💼', t: a.t, s: a.kind === 'foreign' ? 'বিদেশে চাকরি' : 'ড্রাইভিং জব', at}); }); } catch (e) {}
      UPD.extra = ex;
    }
  } catch (e) {}
  UPD.rows = updBuild(); UPD.t = Date.now(); UPD.busy = false; try { localStorage.setItem('updcache', JSON.stringify(UPD.rows)); } catch (e) {}
}
function updTag(ms) { const n = updAge(ms); return n === 0 ? ['আজ', 't0'] : n === 1 ? ['গতকাল', 't1'] : [bn(n) + ' দিন আগে', 't2']; }
function updCard() {
  const rows = updBuild().filter(x => Date.now() - x.at < 7.5 * 864e5), adm = isAdminFlag();
  if (!UPD.t || Date.now() - UPD.t > 90000) updLoad().then(() => { const e = document.getElementById('daily'); if (e) e.outerHTML = updCard(); });
  if (!rows.length) return adm ? `<div class="upd" id="daily"><div class="upd-h"><b>🔔 নতুন আপডেট</b><span>গত ৭ দিনে নতুন কিছু নেই</span></div><div class="hint" style="color:#bfe3d2">কোথাও নতুন কিছু যোগ করলে এখানে নিজে আসবে।</div></div>` : '<div id="daily"></div>';
  const today = rows.filter(x => updAge(x.at) === 0).length;
  return `<div class="upd" id="daily"><div class="upd-h"><b>🔔 নতুন আপডেট</b><span>${today ? 'আজ ' + bn(today) + 'টি নতুন' : 'গত ৭ দিনে ' + bn(rows.length) + 'টি'}</span></div>
    ${rows.slice(0, 4).map((x, i) => { const g = updTag(x.at); return `<div class="upd-i" onclick="updGo(${i})"><div class="ic">${esc(x.ic)}</div><div style="min-width:0;flex:1"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></div><span class="tg ${g[1]}">${g[0]}</span></div>`; }).join('')}
    <div class="upd-m" onclick="updPage()">সব আপডেট দেখুন (গত ৭ দিন) ›</div></div>`;
}
function updRows() { return updBuild().filter(x => Date.now() - x.at < 7.5 * 864e5); }
function updGo(i, all) {
  const x = updRows()[i]; if (!x) return; push(() => all ? updPage() : home());
  if (x.k === 'node') nodePage(x.id); else if (x.k === 'sec') sectionPage(x.id); else if (x.k === 'circ') circView(x.id); else if (x.k === 'paper') p39View(x.id); else if (x.k === 'fp') { fpPage(); setTimeout(() => { try { fpView(x.id); } catch (e) {} }, 400); } else { stack.pop(); open_(x.id); }
}
function updPage() {
  tab = 'home'; const rows = updRows(); let last = -1, h = '';
  rows.forEach((x, i) => { const a = updAge(x.at); if (a !== last) { last = a; const g = updTag(x.at); h += `<div class="upd-d">${g[0]}${a === 0 ? '<i>নতুন</i>' : ''}</div>`; } h += `<div class="upd-r" onclick="updGo(${i},1)"><div class="ic">${esc(x.ic)}</div><div style="min-width:0;flex:1"><b>${esc(x.t)}</b><small>${esc(x.s)} • ${new Date(x.at).toLocaleTimeString('bn-BD', {hour: 'numeric', minute: '2-digit'})}</small></div><em>›</em></div>`; });
  render(pageHead('🔔 নতুন আপডেট') + `<div class="pad">${h || sEmpty('📭', 'গত ৭ দিনে নতুন কিছু যোগ হয়নি।')}<div class="hint" style="text-align:center;margin-top:12px">৭ দিনের পুরোনো আপডেট নিজে সরে যায়।</div></div>`);
  updLoad().then(() => { if (document.querySelector('.upd-d,.upd-r') !== null || !rows.length) { const y = window.scrollY; if (updRows().length !== rows.length) { updPage(); window.scrollTo(0, y); } } });
}

// =====================================================================
//  P51: রিমাইন্ডার — যেকোনো কিছুর, ফোনে নোটিফিকেশনসহ
// =====================================================================
const RMX_CAT = [['💊', 'ওষুধ'], ['💡', 'বিল'], ['💳', 'কিস্তি'], ['🎂', 'জন্মদিন'], ['🤝', 'মিটিং'], ['✈️', 'ডিউটি/ফ্লাইট'], ['🚗', 'গাড়ি'], ['📄', 'কাগজ'], ['💰', 'দেনা-পাওনা'], ['🛒', 'বাজার'], ['🕌', 'নামাজ/দান'], ['✏️', 'অন্য']];
const RMX_REP = [['once', 'একবার'], ['day', 'প্রতিদিন'], ['week', 'প্রতি সপ্তাহ'], ['month', 'প্রতি মাস'], ['year', 'প্রতি বছর']];
const RMX_AH = [[0, 'ঠিক সময়ে'], [60, '১ ঘণ্টা আগে'], [1440, '১ দিন আগে'], [4320, '৩ দিন আগে']];
let RMF = {};
const rmxAll = () => { try { return JSON.parse(localStorage.getItem('rmx') || '[]'); } catch (e) { return []; } };
const rmxSave = a => { try { localStorage.setItem('rmx', JSON.stringify(a)); } catch (e) {} };
function rmxAt(r, d) { const a = d.split('-').map(Number), t = (r.tm || '09:00').split(':').map(Number); return new Date(a[0], a[1] - 1, a[2], t[0] || 0, t[1] || 0, 0); }
function rmxAdd(iso, rep, k) { const a = iso.split('-').map(Number), d = new Date(a[0], a[1] - 1, a[2]); if (rep === 'day') d.setDate(d.getDate() + k); else if (rep === 'week') d.setDate(d.getDate() + 7 * k); else if (rep === 'month') { const day = a[2]; d.setDate(1); d.setMonth(d.getMonth() + k); const dm = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, dm)); } else if (rep === 'year') { const day = a[2]; d.setDate(1); d.setFullYear(d.getFullYear() + k); const dm = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, dm)); } const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function rmxNext(r) {
  if (r.rep === 'once' || !r.rep) return r.done ? null : r.d;
  let k = 0, o = r.d; while (r.last && o <= r.last && k < 4000) { k++; o = rmxAdd(r.d, r.rep, k); } return o;
}
const rmxLbl = o => { const n = daysTo(o); return n === 0 ? 'আজ' : n === 1 ? 'কাল' : n === -1 ? 'গতকাল' : n < 0 ? bn(-n) + ' দিন আগে' : bn(n) + ' দিন পরে'; };
async function rmxNotify(r) {
  const ln = LNP(); if (!ln) return 'web'; const id = notifId('rx' + r.id); try { await ln.cancel({notifications: [{id}, {id: id + 1}]}); } catch (e) {}
  if (!r.n || (r.rep === 'once' && r.done)) return 'off';
  try {
    const p = await ln.requestPermissions(); if (p.display !== 'granted') return 'denied';
    let o = rmxNext(r) || r.d, at = new Date(rmxAt(r, o).getTime() - (+r.ah || 0) * 60000), sch;
    if (r.rep && r.rep !== 'once') { const base = rmxAt(r, r.d); at = new Date(base.getTime() - (+r.ah || 0) * 60000); while (at <= new Date() && r.rep === 'once') break; sch = {at: at <= new Date() ? new Date(rmxAt(r, o).getTime() - (+r.ah || 0) * 60000) : at, every: r.rep, allowWhileIdle: true}; if (sch.at <= new Date()) { const t = new Date(); t.setMinutes(t.getMinutes() + 1); sch.at = t; } }
    else { if (at <= new Date()) return 'past'; sch = {at, allowWhileIdle: true}; }
    await ln.schedule({notifications: [{id, title: (r.ic || '⏰') + ' ' + r.t, body: r.note || (r.ah ? 'আসছে — ' + (RMX_AH.find(x => x[0] === +r.ah) || [0, ''])[1] : 'এখনই মনে করার সময়'), schedule: sch, extra: {rmx: r.id}}]}); return 'ok';
  } catch (e) { return 'err'; }
}
async function rmxSnooze(id) { const r = rmxAll().find(x => x.id === id); if (!r) return; const ln = LNP(); const t = new Date(Date.now() + 3600000); if (!ln) return alert('১ ঘণ্টা পরে মনে করানো ফোনের অ্যাপে চলে।'); try { await ln.requestPermissions(); await ln.schedule({notifications: [{id: notifId('rx' + id) + 1, title: (r.ic || '⏰') + ' ' + r.t, body: 'আবার মনে করাচ্ছি', schedule: {at: t, allowWhileIdle: true}}]}); alert('✅ ১ ঘণ্টা পরে আবার মনে করাব।'); } catch (e) { alert('ঠিক হয়নি।'); } }
function rmxDone(id) { const a = rmxAll(), r = a.find(x => x.id === id); if (!r) return; if (r.rep === 'once' || !r.rep) { r.done = true; rmxNotify(r); } else r.last = rmxNext(r); rmxSave(a); remindPage(); }
function rmxDel(id) { if (!confirm('এই রিমাইন্ডার মুছবেন?')) return; const a = rmxAll(), r = a.find(x => x.id === id); if (r) { r.n = false; rmxNotify(r); } rmxSave(a.filter(x => x.id !== id)); stack.pop(); remindPage(); }
function rmxHtml() {
  const all = rmxAll(), t = todayISO(), it = all.map(r => ({r, o: rmxNext(r)})).filter(x => x.o); const dn = all.filter(r => r.done && r.rep === 'once');
  const ov = it.filter(x => x.o < t).sort((a, b) => a.o.localeCompare(b.o)), td = it.filter(x => x.o === t).sort((a, b) => (a.r.tm || '').localeCompare(b.r.tm || '')), up = it.filter(x => x.o > t).sort((a, b) => a.o.localeCompare(b.o));
  const row = (x, c) => { const r = x.r; return `<div class="rx-r" style="border-left-color:${c}"><div class="ic">${esc(r.ic || '⏰')}</div><div style="min-width:0;flex:1" onclick="rmxForm('${esc(r.id)}')"><b>${esc(r.t)}</b><small>${rmxLbl(x.o)} ${esc(r.tm || '')}${r.rep && r.rep !== 'once' ? ' • 🔁 ' + RMX_REP.find(z => z[0] === r.rep)[1] : ''}${r.n ? ' • 🔔' : ''}</small></div><div class="bt"><span onclick="rmxDone('${esc(r.id)}')">✔</span><span class="z" onclick="rmxSnooze('${esc(r.id)}')">⏳</span></div></div>`; };
  return `<button class="rx-big" onclick="rmxForm('')">➕ নতুন রিমাইন্ডার</button>
    ${td.length ? `<div class="rx-h">⏰ আজ <i>${bn(td.length)}টি</i></div>${td.map(x => row(x, '#6d28d9')).join('')}` : ''}
    ${up.length ? `<div class="rx-h">📅 আসছে</div>${up.slice(0, 20).map(x => row(x, '#2563eb')).join('')}` : ''}
    ${ov.length ? `<div class="rx-h">❗ পার হয়েছে <i>${bn(ov.length)}টি</i></div>${ov.map(x => row(x, '#dc2626')).join('')}` : ''}
    ${!it.length ? '<div class="hint" style="text-align:center;padding:12px">এখনো কোনো রিমাইন্ডার নেই। ওপরের বাটনে চাপুন।</div>' : ''}
    ${dn.length ? `<div class="hint" style="text-align:center">সম্পন্ন: ${bn(dn.length)}টি</div>` : ''}`;
}
function rmxFold() {
  try { document.querySelectorAll('#app .pad > .sec').forEach(sec => { const b = sec.querySelector(':scope > b'); if (!b) return; const d = document.createElement('details'); d.className = 'sec lbfold'; const s = document.createElement('summary'); s.textContent = b.textContent; b.remove(); d.appendChild(s); while (sec.firstChild) d.appendChild(sec.firstChild); sec.replaceWith(d); }); } catch (e) { console.error(e); }
}
function rmxForm(id) {
  const r = rmxAll().find(x => x.id === id); RMF = r ? Object.assign({}, r) : {id: '', ic: '✏️', t: '', d: todayISO(), tm: '09:00', rep: 'once', ah: 0, note: '', n: true};
  push(() => remindPage());
  render(pageHead(r ? 'রিমাইন্ডার বদলান' : 'নতুন রিমাইন্ডার') + `<div class="pad"><div class="cx"><b>কিসের রিমাইন্ডার?</b><div class="rx-ch" id="rx_c">${RMX_CAT.map(c => `<span class="${RMF.ic === c[0] ? 'on' : ''}" onclick="RMF.ic='${c[0]}';if(!document.getElementById('rx_t').value)document.getElementById('rx_t').value='${c[1] === 'অন্য' ? '' : c[1]}';rmxSel('rx_c',this)">${c[0]} ${c[1]}</span>`).join('')}</div>
    <input class="inp" id="rx_t" placeholder="শিরোনাম (যেমন: ওষুধ খাওয়া)" value="${esc(RMF.t)}">
    <div class="lb-g2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label class="lg-l">তারিখ</label><input class="inp" id="rx_d" type="date" value="${esc(RMF.d)}"></div><div><label class="lg-l">সময়</label><input class="inp" id="rx_tm" type="time" value="${esc(RMF.tm)}"></div></div>
    <b style="display:block;margin-top:8px">কতবার?</b><div class="rx-ch" id="rx_r">${RMX_REP.map(c => `<span class="${RMF.rep === c[0] ? 'on' : ''}" onclick="RMF.rep='${c[0]}';rmxSel('rx_r',this)">${c[1]}</span>`).join('')}</div>
    <b style="display:block">আগে জানাবে?</b><div class="rx-ch" id="rx_a">${RMX_AH.map(c => `<span class="${+RMF.ah === c[0] ? 'on' : ''}" onclick="RMF.ah=${c[0]};rmxSel('rx_a',this)">${c[1]}</span>`).join('')}</div>
    <input class="inp" id="rx_n" placeholder="নোট (ঐচ্ছিক)" value="${esc(RMF.note || '')}">
    <label style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700"><span>🔔 ফোনে নোটিফিকেশন</span><input type="checkbox" id="rx_nt" ${RMF.n ? 'checked' : ''}></label>
    <div class="hint">নোটিফিকেশন শুধু ফোনের অ্যাপে (APK) আসে। ব্রাউজারে অ্যাপ খুললে হোমের সতর্কতায় দেখাবে।</div><div id="rx_m" class="hint"></div>
    <button class="btn" onclick="rmxSaveF()">💾 রিমাইন্ডার সেট করুন</button>${r ? `<button class="btn" style="background:#b91c1c" onclick="rmxDel('${esc(r.id)}')">🗑️ মুছুন</button>` : ''}</div></div>`);
}
function rmxSel(box, el) { document.querySelectorAll('#' + box + ' span').forEach(x => x.classList.remove('on')); el.classList.add('on'); }
async function rmxSaveF() {
  const t = gv('rx_t'), d = gv('rx_d'); if (!t) return document.getElementById('rx_m').textContent = 'শিরোনাম দিন।'; if (!d) return document.getElementById('rx_m').textContent = 'তারিখ দিন।';
  const a = rmxAll(), o = {id: RMF.id || String(Date.now()), ic: RMF.ic || '⏰', t: t.slice(0, 80), d, tm: gv('rx_tm') || '09:00', rep: RMF.rep || 'once', ah: +RMF.ah || 0, note: gv('rx_n').slice(0, 120), n: document.getElementById('rx_nt').checked, done: false, last: ''};
  const i = a.findIndex(x => x.id === o.id); if (i >= 0) a[i] = o; else a.push(o); rmxSave(a); const st = await rmxNotify(o);
  if (st === 'denied') alert('নোটিফিকেশনের অনুমতি দেওয়া নেই। ফোনের সেটিংস থেকে অনুমতি দিন।'); else if (st === 'past') alert('এই সময় পার হয়ে গেছে, তাই নোটিফিকেশন হবে না।');
  stack.pop(); remindPage();
}
// ---------- ইনস্টল ----------
function p45Init() {
  if (window.__p45) return; window.__p45 = 1;
  dailyCard = updCard; try { updLoad(); } catch (e) {}
  const rp0 = window.remindPage; window.remindPage = function () { const r = rp0.apply(this, arguments); try { const pad = document.querySelector('#app .pad'); if (pad) pad.insertAdjacentHTML('afterbegin', rmxHtml()); rmxFold(); } catch (e) { console.error(e); } return r; };
  const ra1 = window.remAlerts; window.remAlerts = function () { const out = ra1.apply(this, arguments); try { rmxAll().forEach(r => { const o = rmxNext(r); if (o && o <= todayISO()) out.push({lvl: o < todayISO() ? 2 : 1, t: `${r.ic || '⏰'} ${r.t}: ${rmxLbl(o)}`}); }); } catch (e) {} return out.sort((a, b) => b.lvl - a.lvl); };
  setTimeout(() => { try { rmxAll().forEach(r => { if (r.n && !(r.rep === 'once' && r.done)) rmxNotify(r); }); } catch (e) {} }, 4000);
  try { const ln = LNP(); if (ln && ln.addListener) ln.addListener('localNotificationActionPerformed', e => { const x = e && e.notification && e.notification.extra; if (x && x.rmx) { try { open_('remind'); } catch (er) {} } }); } catch (e) {}
}
(function () { const st = document.createElement('style'); st.textContent = `
.upd{margin:12px 0;border-radius:20px;background:linear-gradient(150deg,#0f3b26,#05301f);color:#fff;padding:12px 14px;border:1px solid #ffc83d88;box-shadow:0 6px 18px #0004;position:relative;overflow:hidden}.upd:after{content:'';position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:#ffc83d22;pointer-events:none}
.upd-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.upd-h b{font-size:16px;color:#ffc83d}.upd-h span{font-size:11px;background:#ffc83d;color:#05301f;font-weight:800;border-radius:20px;padding:2px 9px}
.upd-i{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid #ffffff22;cursor:pointer}.upd-i .ic{width:36px;height:36px;border-radius:11px;background:#ffffff1c;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}.upd-i b{display:block;font-size:13.5px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.upd-i small{color:#bfe3d2;font-size:11.5px}
.upd .tg{margin-left:auto;font-size:10.5px;font-weight:800;border-radius:8px;padding:2px 8px;flex:none;white-space:nowrap}.t0{background:#ef4444;color:#fff}.t1{background:#ffc83d;color:#05301f}.t2{background:#ffffff2a;color:#fff}
.upd-m{text-align:center;color:#ffc83d;font-weight:800;font-size:12.5px;padding-top:8px;border-top:1px solid #ffffff22;cursor:pointer}
.upd-d{font-weight:800;font-size:13.5px;color:#0a5a3f;margin:14px 2px 4px;display:flex;gap:8px;align-items:center}.upd-d i{background:#ef4444;color:#fff;font-style:normal;font-size:10.5px;border-radius:8px;padding:1px 8px}
.upd-r{display:flex;gap:11px;align-items:center;background:#fff;border-radius:14px;padding:10px 12px;margin:6px 0;box-shadow:0 1px 6px #0001;cursor:pointer}.upd-r .ic{width:40px;height:40px;border-radius:12px;background:#eef2ee;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}.upd-r b{display:block;font-size:14px}.upd-r small{color:#6b7a72;font-size:12px}.upd-r em{color:#9ca3af;font-style:normal;font-size:20px}
.rx-big{display:block;width:100%;margin:0 0 6px;border:0;background:#6d28d9;color:#fff;border-radius:16px;padding:14px;font:inherit;font-weight:800;font-size:16px;box-shadow:0 4px 12px #6d28d955}
.rx-h{font-weight:800;font-size:13.5px;color:#0a5a3f;margin:12px 2px 4px;display:flex;gap:8px;align-items:center}.rx-h i{background:#ef4444;color:#fff;font-style:normal;font-size:10.5px;border-radius:8px;padding:1px 8px}
.rx-r{display:flex;gap:11px;align-items:center;background:#fff;border-radius:14px;padding:10px 12px;margin:6px 0;box-shadow:0 1px 6px #0001;border-left:5px solid #6d28d9}.rx-r .ic{width:40px;height:40px;border-radius:12px;background:#ede7fb;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}.rx-r b{display:block;font-size:14px}.rx-r small{color:#6b7a72;font-size:12px}.rx-r .bt{display:flex;gap:6px}.rx-r .bt span{font-size:15px;font-weight:800;border-radius:9px;padding:6px 10px;background:#e6f6ea;color:#166534}.rx-r .bt .z{background:#fff1e0;color:#9a3412}
.rx-ch{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px}.rx-ch span{background:#f1f3f2;border-radius:20px;padding:7px 12px;font-size:13px;font-weight:700}.rx-ch span.on{background:#6d28d9;color:#fff}
body.dark .upd-r,body.dark .rx-r{background:#1f2937}
`; document.head.appendChild(st); })();

// =====================================================================
//  P54: «আমার প্যাড» (লেটারহেড) + কথায় টাকা + মেসেজ পাঠানো + সাধারণ Excel বানানো
// =====================================================================
const en2 = x => String(x == null ? '' : x).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
const nm2 = v => bn(Math.round((+v || 0) * 100) / 100);
const PAD_ST = {royal: {n: '👑 রাজকীয়', a: '#0b2a4a', b: '#12467a', g: '#d4a017'}, green: {n: '🌿 সবুজ', a: '#14532d', b: '#166534', g: '#ca8a04'}, mono: {n: '⚫ সাদাকালো', a: '#111111', b: '#333333', g: '#888888'}, plain: {n: '🤍 সাদাসিধা', a: '#ffffff', b: '#ffffff', g: '#cbd5e1'}};
function padGet() {
  let p = {}; try { p = JSON.parse(localStorage.getItem('pad') || '{}'); } catch (e) {}
  if (!p.name && !p.owner) { try { const c = (lbLoad().co) || {}; if (c.name) p = Object.assign({name: c.name, addr: c.addr, phone: c.phone, email: c.email, web: c.web, lic: c.lic, logo: c.logo}, p); } catch (e) {} }
  return Object.assign({name: '', owner: '', addr: '', phone: '', email: '', web: '', lic: '', logo: '', sig: '', seal: '', st: 'royal'}, p);
}
const padOn = () => { const p = padGet(); return !!(p.name || p.owner); };
const padLines = () => { const p = padGet(); return [p.owner, p.addr, p.phone && '📞 ' + p.phone, p.email && '✉ ' + p.email, p.web, p.lic && 'লাইসেন্স: ' + p.lic].filter(Boolean); };
function padImg(src) { return new Promise(r => { if (!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
async function padImgs() { const p = padGet(); return {logo: await padImg(p.logo), sig: await padImg(p.sig), seal: await padImg(p.seal)}; }
function padDraw(g, W, P, PI) {
  const p = padGet(), S = PAD_ST[p.st] || PAD_ST.royal, F = (w, s) => `${w} ${s}px "Noto Sans Bengali","Hind Siliguri",sans-serif`; PI = PI || {};
  const dark = p.st !== 'plain', H = 170; if (dark) { const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, S.a); gr.addColorStop(1, S.b); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  g.fillStyle = S.g; g.fillRect(0, H, W, 8); let x = P;
  if (PI.logo) { g.save(); g.beginPath(); g.arc(P + 50, H / 2, 50, 0, 7); g.clip(); g.fillStyle = '#fff'; g.fillRect(P, H / 2 - 50, 100, 100); const k = Math.min(100 / PI.logo.width, 100 / PI.logo.height); g.drawImage(PI.logo, P + 50 - PI.logo.width * k / 2, H / 2 - PI.logo.height * k / 2, PI.logo.width * k, PI.logo.height * k); g.restore(); x = P + 126; }
  else if (p.name) { g.fillStyle = dark ? S.g : S.a; g.beginPath(); g.arc(P + 50, H / 2, 50, 0, 7); g.fill(); g.fillStyle = dark ? S.a : '#fff'; g.font = F(900, 54); g.textAlign = 'center'; g.fillText(Array.from(p.name)[0] || '', P + 50, H / 2 + 19); x = P + 126; }
  g.textAlign = 'left'; g.fillStyle = dark ? '#fff' : S.a; g.font = F(800, 46); g.fillText(p.name || p.owner, x, 70);
  g.font = F(500, 23); g.fillStyle = dark ? '#dbe4ee' : '#475569'; const ls = padLines(); const a = ls.slice(0, 2).join('  •  '), b = ls.slice(2).join('  •  '); if (a) g.fillText(a.length > 78 ? a.slice(0, 77) + '…' : a, x, 108); if (b) g.fillText(b.length > 78 ? b.slice(0, 77) + '…' : b, x, 142);
  return H + 8 + 26;
}
function padSig(g, W, P, y, PI, lab) {
  g.font = '500 22px "Noto Sans Bengali",sans-serif'; g.fillStyle = '#475569'; g.textAlign = 'center'; PI = PI || {};
  g.strokeStyle = '#94a3b8'; g.lineWidth = 2; g.beginPath(); g.moveTo(P, y); g.lineTo(P + 340, y); g.moveTo(W - P - 340, y); g.lineTo(W - P, y); g.stroke();
  g.fillText(lab || 'গ্রহীতার স্বাক্ষর', P + 170, y + 30); g.fillText('মালিকের স্বাক্ষর', W - P - 170, y + 30);
  if (PI.sig) { const k = Math.min(300 / PI.sig.width, 90 / PI.sig.height); g.drawImage(PI.sig, W - P - 170 - PI.sig.width * k / 2, y - PI.sig.height * k - 4, PI.sig.width * k, PI.sig.height * k); }
  if (PI.seal) { const k = Math.min(130 / PI.seal.width, 130 / PI.seal.height); g.globalAlpha = .85; g.drawImage(PI.seal, W / 2 - PI.seal.width * k / 2, y - 120, PI.seal.width * k, PI.seal.height * k); g.globalAlpha = 1; }
}
const BW = ['শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ', 'এগার', 'বার', 'তের', 'চৌদ্দ', 'পনের', 'ষোল', 'সতের', 'আঠার', 'ঊনিশ', 'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ', 'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ', 'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ', 'পঞ্চাশ', 'একান্ন', 'বাহান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট', 'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর', 'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি', 'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'ঊননব্বই', 'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'];
function numWords(n) {
  n = Math.round(+n || 0); if (n <= 0) return 'শূন্য'; const out = [];
  const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const hz = Math.floor(n / 1e3); n %= 1e3; const sh = Math.floor(n / 100); n %= 100;
  if (cr) out.push((cr < 100 ? BW[cr] : bn(cr)) + ' কোটি'); if (lk) out.push(BW[lk] + ' লক্ষ'); if (hz) out.push(BW[hz] + ' হাজার'); if (sh) out.push(BW[sh] + ' শ'); if (n) out.push(BW[n]);
  return out.join(' ');
}
// ---------- মেসেজ পাঠানো (SMS / হোয়াটসঅ্যাপ / কপি) ----------
let _smT = '', _smP = '';
function sendMsg(ph, text, title) {
  _smP = String(ph || '').replace(/[^\d+]/g, ''); _smT = text;
  showModal(`<h3 style="margin:0 0 8px">${esc(title || '📩 মেসেজ পাঠান')}</h3><input class="inp" id="sm_p" placeholder="মোবাইল নম্বর" value="${esc(_smP)}" inputmode="tel"><textarea class="inp" id="sm_t" rows="7" style="font-size:15px">${esc(text)}</textarea>
    <div style="display:flex;gap:8px"><button class="btn" style="flex:1;background:#2563eb;margin:0" onclick="sendGo('sms')">📱 SMS</button><button class="btn" style="flex:1;background:#16a34a;margin:0" onclick="sendGo('wa')">💬 হোয়াটসঅ্যাপ</button><button class="btn" style="flex:1;background:#64748b;margin:0" onclick="sendGo('cp')">📋 কপি</button></div><div class="hint" style="margin-top:6px">লেখা বদলাতে পারেন। বাটন চাপলে ওই অ্যাপ খুলবে, সেখানে «পাঠান» চাপবেন।</div>`);
}
function sendGo(k) {
  const ph = en2((document.getElementById('sm_p').value || '').replace(/[^\d+০-৯]/g, '')), t = document.getElementById('sm_t').value || '';
  if (k === 'cp') { try { navigator.clipboard.writeText(t); alert('✅ কপি হয়েছে।'); } catch (e) { alert('কপি হয়নি।'); } return; }
  if (!ph) return alert('মোবাইল নম্বর দিন।');
  if (k === 'sms') { window.location.href = 'sms:' + ph + '?body=' + encodeURIComponent(t); return; }
  let w = ph.replace(/^\+/, ''); if (/^01\d{9}$/.test(w)) w = '88' + w; goUrl('https://wa.me/' + w + '?text=' + encodeURIComponent(t));
}
// ---------- একাধিক পাতার Excel (.xlsx) বানানো ----------
function xl2(sheets) {
  const X = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''), col = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="166" formatCode="#,##0.##"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FFFFC83D"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B2A4A"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFDE047"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCCCCCC"/></left><right style="thin"><color rgb="FFCCCCCC"/></right><top style="thin"><color rgb="FFCCCCCC"/></top><bottom style="thin"><color rgb="FFCCCCCC"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="3" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="166" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/></cellXfs></styleSheet>`;
  const sh = sheets.map((S, si) => {
    let r = 0; const rows = [], mg = [], mc = S.rows.reduce((a, rw) => Math.max(a, rw.length), 1);
    S.rows.forEach(rw => { r++; const ht = rw.ht ? ` ht="${rw.ht}" customHeight="1"` : ''; rows.push(`<row r="${r}"${ht}>${Array.from(rw).map((c, i) => { if (c == null) return ''; const ref = col(i) + r; if (c.f) return `<c r="${ref}" s="${c.s || 0}"><f>${X(c.f)}</f><v>${c.v}</v></c>`; if (typeof c.v === 'number') return `<c r="${ref}" s="${c.s || 0}"><v>${c.v}</v></c>`; return `<c r="${ref}" s="${c.s || 0}" t="inlineStr"><is><t xml:space="preserve">${X(c.v)}</t></is></c>`; }).join('')}</row>`); if (rw.merge) mg.push(`A${r}:${col(mc - 1)}${r}`); });
    const cols = (S.w || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${col(mc - 1)}${r}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${rows.join('')}</sheetData>${mg.length ? `<mergeCells count="${mg.length}">${mg.map(x => `<mergeCell ref="${x}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${S.land ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  });
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((S, i) => `<sheet name="${X(S.name).slice(0, 30)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  return lbZip([
    {name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((S, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
    {name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name: 'xl/workbook.xml', data: wb}, {name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((S, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name: 'xl/styles.xml', data: styles}].concat(sh.map((x, i) => ({name: `xl/worksheets/sheet${i + 1}.xml`, data: x}))));
}
function xlHead(title, ncol) { const r = []; const t = [{v: (padOn() ? padGet().name || padGet().owner : 'আমার ভাই'), s: 1}]; for (let i = 1; i < ncol; i++) t.push({v: '', s: 1}); t.ht = 30; t.merge = 1; r.push(t); if (padOn() && padLines().length) { const l = [{v: padLines().join('   •   '), s: 2}]; for (let i = 1; i < ncol; i++) l.push({v: '', s: 2}); l.merge = 1; r.push(l); } const u = [{v: title, s: 2}]; for (let i = 1; i < ncol; i++) u.push({v: '', s: 2}); u.merge = 1; r.push(u); r.push([]); return r; }
// ---------- «আমার প্যাড» সেটআপ পাতা ----------
let PADF = {};
function padPage() {
  tab = 'home'; PADF = Object.assign({}, padGet());
  const im = (k, lab) => `<div class="fi2"><label class="lg-l">${lab}</label>${PADF[k] ? `<img src="${PADF[k]}" style="max-height:60px;max-width:100%;display:block;margin:4px 0;border-radius:6px;background:#f1f5f9">` : ''}<input type="file" accept="image/*" onchange="padPick('${k}',this)">${PADF[k] ? `<a href="#" onclick="PADF.${k}='';padPage2();return false" style="font-size:12px;color:#b91c1c">সরান</a>` : ''}</div>`;
  render(pageHead('🪪 আমার প্যাড') + hero('🪪', 'আমার প্যাড', 'সব PDF ও Excel-এর মাথায় বসবে') + `<div class="pad" id="padbody"></div>`); padPage2();
}
function padPage2() {
  const im = (k, lab) => `<div style="margin:6px 0"><label class="lg-l">${lab}</label>${PADF[k] ? `<img src="${PADF[k]}" style="max-height:60px;max-width:100%;display:block;margin:4px 0;border-radius:6px;background:#f1f5f9">` : ''}<input type="file" accept="image/*" onchange="padPick('${k}',this)">${PADF[k] ? ` <a href="#" onclick="PADF.${k}='';padPage2();return false" style="font-size:12px;color:#b91c1c">সরান</a>` : ''}</div>`;
  const f = (k, lab, ph, t) => `<label class="lg-l">${lab}</label><input class="inp" ${t ? `type="${t}"` : ''} value="${esc(PADF[k] || '')}" placeholder="${esc(ph || '')}" oninput="PADF.${k}=this.value">`;
  document.getElementById('padbody').innerHTML = `<div class="cx">${f('name', 'বাড়ি / প্রতিষ্ঠানের নাম', 'যেমন: আল-আমিন ভিলা')}${f('owner', 'মালিকের নাম', 'যেমন: মোঃ নজরুল ইসলাম')}${f('addr', 'ঠিকানা', 'বাড়ি, রোড, এলাকা, শহর')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div>${f('phone', 'ফোন', '০১৭XXXXXXXX', 'tel')}</div><div>${f('email', 'ইমেইল', 'name@mail.com')}</div></div>${f('web', 'ওয়েবসাইট (ঐচ্ছিক)', '')}${f('lic', 'ট্রেড লাইসেন্স / অন্য নম্বর (ঐচ্ছিক)', '')}</div>
    <div class="cx"><b>🖼️ ছবি</b>${im('logo', 'লোগো')}${im('sig', '✍️ স্বাক্ষরের ছবি')}${im('seal', '🔴 সিলের ছবি')}<div class="hint">স্বাক্ষর ও সিলের ছবি সাদা কাগজে সই করে ছবি তুলে দিলেই হবে।</div></div>
    <div class="cx"><b>🎨 প্যাডের ধরন</b><div class="rx-ch">${Object.keys(PAD_ST).map(k => `<span class="${PADF.st === k || (!PADF.st && k === 'royal') ? 'on' : ''}" onclick="PADF.st='${k}';padPage2()">${PAD_ST[k].n}</span>`).join('')}</div><canvas id="padprev" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;background:#fff"></canvas></div><button class="btn" onclick="padSave()">💾 প্যাড সেভ করুন</button>`;
  padPrev();
}
async function padPrev() { const cv = document.getElementById('padprev'); if (!cv) return; cv.width = 1240; cv.height = 300; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1240, 300); const save = localStorage.getItem('pad'); try { localStorage.setItem('pad', JSON.stringify(PADF)); const PI = await padImgs(); padDraw(g, 1240, 50, PI); } catch (e) {} if (save === null) localStorage.removeItem('pad'); else localStorage.setItem('pad', save); }
function padPick(k, inp) {
  const f = inp.files && inp.files[0]; if (!f) return; const rd = new FileReader();
  rd.onload = () => { const im = new Image(); im.onload = () => { const mx = k === 'logo' ? 220 : 360, s = Math.min(1, mx / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s)); const g = c.getContext('2d'); if (k === 'logo') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); } g.drawImage(im, 0, 0, c.width, c.height); PADF[k] = k === 'logo' ? c.toDataURL('image/jpeg', .85) : c.toDataURL('image/png'); padPage2(); }; im.src = rd.result; };
  rd.readAsDataURL(f);
}
function padSave() { try { localStorage.setItem('pad', JSON.stringify(PADF)); alert('✅ প্যাড সেভ হয়েছে। এখন থেকে সব PDF/Excel-এ এটা বসবে।'); back(); } catch (e) { alert('জায়গা কম, ছবি ছোট দিন।'); } }

// =====================================================================
//  P52c/d: মেসের মিল হিসাব
// =====================================================================
const MS_VALS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
let MS = {ym: '', tab: 'm', date: '', kind: 'a', vals: {}, who: '', bt: 's'};
function msLoad() { let d = {}; try { d = JSON.parse(localStorage.getItem('mess') || '{}'); } catch (e) {} d.mem = d.mem || []; d.mon = d.mon || {}; d.title = d.title || 'আমার মেস'; return d; }
function msSave(d) { try { localStorage.setItem('mess', JSON.stringify(d)); } catch (e) { alert('জায়গা শেষ।'); } }
function msM(d, ym) { const m = d.mon[ym] = d.mon[ym] || {}; m.meals = m.meals || {}; m.plan = m.plan || {}; m.bz = m.bz || []; m.pay = m.pay || []; return m; }
const msYm = () => MS.ym || (MS.ym = todayISO().slice(0, 7));
const msMonName = ym => lmName(ym);
const msDays = ym => { const a = ym.split('-').map(Number); return new Date(a[0], a[1], 0).getDate(); };
function msCalc(ym) {
  const d = msLoad(), m = msM(d, ym), mem = d.mem.map(x => ({n: x.n, ph: x.ph || '', meals: 0, bazar: 0, pin: 0, pout: 0, cost: 0, net: 0}));
  const by = {}; mem.forEach(x => { by[x.n] = x; });
  Object.keys(m.meals).forEach(dt => { const r = m.meals[dt]; Object.keys(r).forEach(n => { if (by[n]) by[n].meals += +r[n] || 0; }); });
  m.bz.forEach(b => { if (by[b.who]) by[b.who].bazar += +b.amt || 0; });
  m.pay.forEach(p => { if (by[p.from]) by[p.from].pin += +p.amt || 0; if (by[p.to]) by[p.to].pout += +p.amt || 0; });
  const tb = mem.reduce((a, x) => a + x.bazar, 0), tm = mem.reduce((a, x) => a + x.meals, 0), rate = tm ? tb / tm : 0;
  mem.forEach(x => { x.cost = x.meals * rate; x.net = x.bazar + x.pin - x.pout - x.cost; });
  const cr = mem.filter(x => x.net > 0.5).map(x => ({n: x.n, v: x.net})), db = mem.filter(x => x.net < -0.5).map(x => ({n: x.n, v: -x.net})), setl = [];
  cr.sort((a, b) => b.v - a.v); db.sort((a, b) => b.v - a.v);
  db.forEach(dd => { let need = dd.v; cr.forEach(cc => { if (need > 0.5 && cc.v > 0.5) { const t = Math.min(need, cc.v); setl.push({from: dd.n, to: cc.n, amt: t}); need -= t; cc.v -= t; } }); });
  return {mem, tb, tm, rate, setl, m};
}
const msNet = x => x.net > 0.5 ? `<span class="get">পাবে ${nm2(x.net)}</span>` : x.net < -0.5 ? `<span class="pay">দিবে ${nm2(-x.net)}</span>` : '<span class="get" style="background:#f1f5f9;color:#475569">মিটে গেছে</span>';
function msPage() {
  tab = 'home'; const d = msLoad(), ym = msYm(), C = msCalc(ym), t = todayISO();
  if (!d.mem.length) return msMembers(true);
  const m = C.m, plan = m.plan[t] || null, act = m.meals[t] || null, show = plan || act, tomorrow = addDays(t, 1), pt = m.plan[tomorrow] || (d.mon[tomorrow.slice(0, 7)] || {plan: {}}).plan[tomorrow];
  const tot = show ? d.mem.reduce((a, x) => a + (+show[x.n] || 0), 0) : 0, mx = show ? Math.max(1, ...d.mem.map(x => +show[x.n] || 0)) : 1, ptot = pt ? d.mem.reduce((a, x) => a + (+pt[x.n] || 0), 0) : 0;
  const chart = ym === t.slice(0, 7) ? `<div class="ms-plan"><div class="hd"><b>🍽️ আজ ${bn(+t.slice(8))} ${L_MON[+t.slice(5, 7) - 1]} — কে কত মিল খাবে</b><span>${show ? 'মোট ' + nm2(tot) : 'বলা নেই'}</span></div>
    ${show ? d.mem.map(x => `<div class="bar"><u>${esc(x.n)}</u><div class="tr"><i style="width:${Math.round((+show[x.n] || 0) / mx * 100)}%"></i></div><em>${nm2(+show[x.n] || 0)}</em></div>`).join('') : '<div style="padding:8px 0;color:#fed7aa;font-size:13px">আজ কে কত মিল খাবে বলা হয়নি। নিচের বাটন চেপে বলে রাখুন।</div>'}
    <div class="ft"><span>${plan && !act ? '✍️ আগের দিন বলা মিল' : act ? '✔ আজকের মিল সেভ আছে' : ''}</span><span onclick="msMeal('${tomorrow}','p')" style="cursor:pointer">কাল: ${pt ? nm2(ptot) + ' মিল' : 'বলা হয়নি'} ›</span></div>
    ${plan && !act ? `<div class="ok"><div style="background:#dcfce7;color:#166534" onclick="msConfirm()">✔ আজ সব ঠিক আছে</div><div style="background:#fff1e0;color:#9a3412" onclick="msMeal('${t}','a')">✏️ কিছু বদলাব</div></div>` : ''}</div>` : '';
  render(pageHead('🍛 ' + d.title) + `<div class="pad ms"><div class="mon"><span onclick="msMon(-1)">‹</span><b>${msMonName(ym)}</b><span onclick="msMon(1)">›</span></div>${chart}
    <div class="ms-btns"><div style="background:#c2410c" onclick="msMeal('${t}','a')">🍽️<br>আজকের মিল<small>কে কয়টা খেল</small></div><div style="background:#16a34a" onclick="msBazar()">🛒<br>বাজার লিখুন<small>কে কত টাকার</small></div></div>
    <div class="ms-btns" style="margin-top:0"><div style="background:#7c3aed;padding:12px" onclick="msMeal('${tomorrow}','p')">📅 কালকের মিল বলে রাখুন</div></div>
    <div class="ms-mini"><span>মোট বাজার ${tk(C.tb)}</span><span>মোট মিল ${nm2(C.tm)}</span><span>এক মিল ৳${nm2(C.rate)}</span></div>
    <div class="ms-t">কার কত পাওনা / দেনা</div>${C.mem.map(x => `<div class="ms-p" onclick="msPerson('${esc(x.n)}')"><b>${esc(x.n)}<small>${nm2(x.meals)} মিল • বাজার ${tk(x.bazar)}</small></b>${msNet(x)}</div>`).join('')}
    ${C.setl.length ? `<div class="ms-give"><b>💰 কে কাকে দিবে</b>${C.setl.map(s => `<div>👉 ${esc(s.from)} দিবে ${esc(s.to)} কে <b>${tk(s.amt)}</b></div>`).join('')}</div>` : ''}
    <div class="ms-ln"><a href="#" onclick="msSheet('m');return false">📋 পুরো শিট</a><a href="#" onclick="msExport();return false">📤 PDF / Excel</a><a href="#" onclick="msPayForm();return false">💵 টাকা মেটালাম</a><a href="#" onclick="msMembers();return false">👥 সদস্য</a></div></div>`);
}
function msMon(k) { const a = msYm().split('-').map(Number), d = new Date(a[0], a[1] - 1 + k, 1); MS.ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); msPage(); }
function msConfirm() { const d = msLoad(), t = todayISO(), m = msM(d, t.slice(0, 7)); if (m.plan[t]) { m.meals[t] = Object.assign({}, m.plan[t]); msSave(d); } msPage(); }
// ---------- মিল লেখা (আসল / আগাম) ----------
function msMeal(date, kind) {
  const d = msLoad(); if (!d.mem.length) return msMembers(true); MS.date = date; MS.kind = kind; const m = msM(d, date.slice(0, 7)), src = (kind === 'p' ? m.plan[date] : m.meals[date]) || (kind === 'a' ? m.plan[date] : null) || {};
  MS.vals = {}; d.mem.forEach(x => { MS.vals[x.n] = src[x.n] != null ? +src[x.n] : 0; }); push(() => msPage()); msMealDraw();
}
function msMealDraw() {
  const d = msLoad(), t = todayISO(), p = MS.kind === 'p', days = p ? [[t, 'আজ'], [addDays(t, 1), 'কাল'], [addDays(t, 2), 'পরশু']] : [[t, 'আজ'], [addDays(t, -1), 'গতকাল'], [addDays(t, -2), 'পরশু']];
  const dc = `<div class="ms-days">${days.map(x => `<div class="${MS.date === x[0] ? 'on' : ''}" onclick="msDate('${x[0]}')">${x[1]}<small>${bn(+x[0].slice(8))}</small></div>`).join('')}<div class="${days.some(x => x[0] === MS.date) ? '' : 'on'}" onclick="document.getElementById('msdt').showPicker ? document.getElementById('msdt').showPicker() : document.getElementById('msdt').focus()">📅<small>তারিখ</small></div></div><input type="date" id="msdt" value="${MS.date}" onchange="msDate(this.value)" style="position:absolute;opacity:0;pointer-events:none;height:0">`;
  render(pageHead(p ? '📅 মিল বলে রাখুন' : '🍽️ আজকের মিল') + `<div class="pad ms"><div class="ms-q">${lgDate(MS.date)} — কে কয় মিল?</div>${dc}
    ${d.mem.map((x, i) => `<div class="ms-mr"><b>${esc(x.n)}</b><div class="ns">${MS_VALS.map(v => `<div class="n${v % 1 ? ' h' : ''}${MS.vals[x.n] === v ? ' on' : ''}" onclick="msSet(${i},${v})">${nm2(v)}</div>`).join('')}<div class="n" onclick="msMore(${i})">${MS_VALS.includes(MS.vals[x.n]) ? 'আরও' : nm2(MS.vals[x.n])}</div></div></div>`).join('')}
    <div class="ms-sv" onclick="msSaveMeal()">✔ ${p ? 'কালকের' : 'আজকের'} মিল সেভ (মোট ${nm2(d.mem.reduce((a, x) => a + (MS.vals[x.n] || 0), 0))})</div>
    <div class="ms-ln"><a href="#" onclick="msBulkMeal();return false">⚡ এক চাপে পুরো মাসের মিল লিখুন</a></div></div>`);
}
function msDate(dt) { if (!dt) return; const d = msLoad(), m = msM(d, dt.slice(0, 7)), src = (MS.kind === 'p' ? m.plan[dt] : m.meals[dt]) || {}; MS.date = dt; MS.vals = {}; d.mem.forEach(x => { MS.vals[x.n] = src[x.n] != null ? +src[x.n] : 0; }); msMealDraw(); }
function msSet(i, v) { const d = msLoad(); MS.vals[d.mem[i].n] = v; const y = window.scrollY; msMealDraw(); window.scrollTo(0, y); }
function msMore(i) { const d = msLoad(), v = prompt('কত মিল? (যেমন: ६ বা ৫.৫)', ''); if (v === null) return; const n = parseFloat(en2(v)); if (!(n >= 0 && n <= 50)) return alert('সঠিক সংখ্যা দিন।'); MS.vals[d.mem[i].n] = Math.round(n * 2) / 2; msMealDraw(); }
function msSaveMeal() {
  const d = msLoad(), m = msM(d, MS.date.slice(0, 7)), o = {}; d.mem.forEach(x => { o[x.n] = MS.vals[x.n] || 0; });
  if (MS.kind === 'p') m.plan[MS.date] = o; else { m.meals[MS.date] = o; } msSave(d); MS.ym = MS.date.slice(0, 7); stack.pop(); msPage();
}
function msBulkMeal() {
  const d = msLoad(), ym = MS.date ? MS.date.slice(0, 7) : msYm();
  render(pageHead('⚡ এক চাপে পুরো মাসের মিল') + `<div class="pad ms"><div class="cx"><b>${msMonName(ym)}</b><div class="hint" style="margin:6px 0">প্রতি লাইনে একটি দিন: <b>তারিখ = মিল, মিল, মিল…</b><br>সদস্যের ক্রম: <b>${d.mem.map(x => esc(x.n)).join(' , ')}</b><br>যেমন: <b>৫ = ২, ৩, ২, ২.৫, ২</b> (শিট থেকে কপি করে পেস্ট করলেও হবে)</div>
    <textarea class="inp" id="mb_t" rows="14" style="font-size:15px" placeholder="১ = 2, 2, 2, 2, 2\n২ = 2, 2, 2, 2.5, 2" oninput="msBulkPrev()"></textarea><div class="hint" id="mb_p"></div><button class="btn" onclick="msBulkSave('${ym}')">💾 সব একসাথে সেভ</button></div></div>`);
}
function msBulkParse(txt, ym) {
  const d = msLoad(), out = []; txt.split('\n').forEach(l => { l = en2(l).trim(); if (!l) return; const m = l.match(/^(\d{1,2})(?:[\/\-](\d{1,2}))?\s*[=:\t ]\s*(.+)$/); if (!m) return; let day = +m[1]; if (m[2]) day = +m[1]; const dim = msDays(ym); if (day < 1 || day > dim) return; const nums = m[3].split(/[\s,،;|]+/).filter(Boolean).map(x => parseFloat(x)); if (!nums.length || nums.some(x => isNaN(x))) return; const o = {}; d.mem.forEach((x, i) => { o[x.n] = nums[i] != null ? nums[i] : 0; }); out.push([ym + '-' + String(day).padStart(2, '0'), o]); });
  return out;
}
function msBulkPrev() { const ym = MS.date ? MS.date.slice(0, 7) : msYm(), r = msBulkParse(document.getElementById('mb_t').value, ym), e = document.getElementById('mb_p'); if (e) e.textContent = r.length ? '✔ ' + bn(r.length) + 'টি দিন বোঝা গেছে' : ''; }
function msBulkSave(ym) { const r = msBulkParse(document.getElementById('mb_t').value, ym); if (!r.length) return alert('কোনো লাইন বোঝা যায়নি।'); const d = msLoad(), m = msM(d, ym); r.forEach(x => { m.meals[x[0]] = x[1]; }); msSave(d); MS.ym = ym; alert('✅ ' + bn(r.length) + 'টি দিনের মিল সেভ হয়েছে।'); stack.pop(); msPage(); }
// ---------- বাজার ----------
function msBazar() { const d = msLoad(); if (!d.mem.length) return msMembers(true); if (!MS.who || !d.mem.some(x => x.n === MS.who)) MS.who = d.mem[0].n; push(() => msPage()); msBazarDraw(); }
function msBazarDraw(keep) {
  const d = msLoad(), ym = msYm(), single = MS.bt !== 'b', k = keep || {};
  render(pageHead('🛒 বাজার লিখুন') + `<div class="pad ms"><div class="ms-tabs"><div class="${single ? 'on' : ''}" onclick="MS.bt='s';msBazarDraw()">একটা</div><div class="${single ? '' : 'on'}" onclick="MS.bt='b';msBazarDraw()">⚡ এক চাপে অনেকগুলো</div></div>
    <div class="ms-q">কে বাজার করল?</div><div class="ms-chips">${d.mem.map(x => `<span class="${MS.who === x.n ? 'on' : ''}" onclick="MS.who='${esc(x.n)}';msBazarDraw()">${esc(x.n)}</span>`).join('')}</div>
    ${single ? `<div class="ms-q">কত টাকা?</div><input class="inp" id="bz_a" type="number" inputmode="decimal" placeholder="টাকা" style="font-size:24px;text-align:center"><input class="inp" id="bz_d" type="date" value="${todayISO()}"><input class="inp" id="bz_n" placeholder="কী কিনল (ঐচ্ছিক)"><div class="ms-sv" style="background:#16a34a" onclick="msBazarSave()">✔ সেভ করুন</div>`
      : `<div class="ms-q">প্রতি লাইনে «তারিখ টাকা»</div><textarea class="inp" id="bz_t" rows="10" style="font-size:16px" placeholder="৪ ৭০০\n৫ ৫০০\n৬ ৩৭৫" oninput="msBzPrev()"></textarea><div class="hint" id="bz_p">শিট থেকে কপি করে পেস্ট করলেও হবে। ${msMonName(ym)} মাসের তারিখ ধরা হবে।</div><div class="ms-sv" style="background:#16a34a" onclick="msBzBulkSave()">✔ সব একসাথে সেভ</div>`}
    <div class="ms-q" style="margin-top:14px">এই মাসে ${esc(MS.who)}-এর বাজার</div>${msBzList(MS.who)}</div>`);
}
function msBzList(who) { const m = msM(msLoad(), msYm()), l = m.bz.filter(b => b.who === who).sort((a, b) => a.d.localeCompare(b.d)); return l.length ? `<div class="cx">${l.map(b => `<div class="ms-bz"><span>${lgDate(b.d)}${b.note ? ' • ' + esc(b.note) : ''}</span><b>${tk(b.amt)}</b><a href="#" onclick="msBzDel('${b.id}');return false">✕</a></div>`).join('')}<div class="ms-bz" style="font-weight:800"><span>মোট</span><b>${tk(l.reduce((a, b) => a + b.amt, 0))}</b></div></div>` : '<div class="hint">এখনো কিছু নেই।</div>'; }
function msBazarSave() { const a = parseFloat(en2(gv('bz_a'))); if (!(a > 0)) return alert('টাকা দিন।'); const dt = gv('bz_d') || todayISO(), d = msLoad(), m = msM(d, dt.slice(0, 7)); m.bz.push({id: String(Date.now()), who: MS.who, d: dt, amt: a, note: gv('bz_n')}); msSave(d); MS.ym = dt.slice(0, 7); msBazarDraw(); }
function msBzParse(txt, ym) { const out = []; txt.split('\n').forEach(l => { l = en2(l).trim(); if (!l) return; const m = l.match(/^(\d{1,2})(?:[\/\-](\d{1,2}))?[\s,=:\t]+(\d+(?:\.\d+)?)/); if (!m) return; const day = +m[1]; if (day < 1 || day > msDays(ym)) return; out.push({d: ym + '-' + String(day).padStart(2, '0'), amt: +m[3]}); }); return out; }
function msBzPrev() { const r = msBzParse(document.getElementById('bz_t').value, msYm()), e = document.getElementById('bz_p'); if (e) e.textContent = r.length ? '✔ ' + bn(r.length) + 'টি বাজার • মোট ' + tk(r.reduce((a, x) => a + x.amt, 0)) + ' — ঠিক থাকলে সেভ' : ''; }
function msBzBulkSave() { const ym = msYm(), r = msBzParse(document.getElementById('bz_t').value, ym); if (!r.length) return alert('কোনো লাইন বোঝা যায়নি।'); const d = msLoad(), m = msM(d, ym); r.forEach((x, i) => m.bz.push({id: String(Date.now()) + i, who: MS.who, d: x.d, amt: x.amt, note: ''})); msSave(d); MS.bt = 's'; msBazarDraw(); }
function msBzDel(id) { if (!confirm('এটা মুছবেন?')) return; const d = msLoad(), m = msM(d, msYm()); m.bz = m.bz.filter(b => b.id !== id); msSave(d); const pg = document.querySelector('.ms-tabs'); if (pg) msBazarDraw(); else msSheet(MS.tab); }
// ---------- পুরো শিট (৩ ট্যাব) ----------
function msSheet(tb) {
  MS.tab = tb || 'm'; if (!stack.length || !stack[stack.length - 1]._ms) { const f = () => msPage(); f._ms = 1; push(f); } const d = msLoad(), ym = msYm(), C = msCalc(ym), m = C.m, n = msDays(ym), T = [['m', '🍽️ মিল'], ['b', '🛒 বাজার'], ['h', '💰 হিসাব']];
  let body = '';
  if (MS.tab === 'm') {
    const days = []; for (let i = 1; i <= n; i++) { const dt = ym + '-' + String(i).padStart(2, '0'); if (m.meals[dt] || (ym === todayISO().slice(0, 7) && dt <= todayISO())) days.push(dt); }
    body = `<div class="ms-tw"><table class="ms-tb"><tr><th style="background:#ef4444;color:#fff">তারিখ</th>${d.mem.map(x => `<th>${esc(x.n)}</th>`).join('')}</tr>${days.map(dt => { const r = m.meals[dt]; return `<tr onclick="msMeal('${dt}','a')"><td>${bn(+dt.slice(8))}</td>${d.mem.map(x => r ? `<td class="${(+r[x.n] || 0) ? '' : 'z'}">${nm2(+r[x.n] || 0)}</td>` : '<td class="z">–</td>').join('')}</tr>`; }).join('')}<tr class="tt"><td>মোট</td>${C.mem.map(x => `<td>${nm2(x.meals)}</td>`).join('')}</tr></table></div><div class="hint" style="margin-top:6px">মোট মিল ${nm2(C.tm)} • এক মিলের দাম ৳${nm2(C.rate)} • কোনো দিনে চাপলে বদলানো যায়</div>`;
  } else if (MS.tab === 'b') {
    body = C.mem.map(x => `<div class="ms-pb"><div class="h">${esc(x.n)} <span>${tk(x.bazar)}</span></div>${m.bz.filter(b => b.who === x.n).sort((a, b) => a.d.localeCompare(b.d)).map(b => `<i onclick="msBzDel('${b.id}')">${bn(+b.d.slice(8))} • ${bn(b.amt)}</i>`).join('') || '<small style="color:#94a3b8">কিছু নেই</small>'}</div>`).join('') + `<div class="ms-pb" style="background:#fde047"><div class="h" style="margin:0">সবার মোট বাজার <span style="color:#000">${tk(C.tb)}</span></div></div><div class="hint">কোনো বাজারে চাপলে মুছতে পারবেন।</div>`;
  } else {
    body = `<div class="ms-tw"><table class="ms-tb"><tr><th>নাম</th><th>মিল</th><th>খরচ</th><th>বাজার</th><th>মেটানো</th><th>পাবে/দিবে</th></tr>${C.mem.map(x => `<tr><td>${esc(x.n)}</td><td>${nm2(x.meals)}</td><td>${nm2(x.cost)}</td><td>${nm2(x.bazar)}</td><td>${nm2(x.pin - x.pout)}</td><td style="font-weight:800;color:${x.net >= 0 ? '#15803d' : '#dc2626'}">${x.net >= 0 ? '+' : '−'}${nm2(Math.abs(x.net))}</td></tr>`).join('')}<tr class="tt"><td>মোট</td><td>${nm2(C.tm)}</td><td>${nm2(C.tb)}</td><td>${nm2(C.tb)}</td><td>০</td><td>০</td></tr></table></div>
      ${C.setl.length ? `<div class="ms-give"><b>💰 কে কাকে দিবে</b>${C.setl.map(s => `<div>👉 ${esc(s.from)} দিবে ${esc(s.to)} কে <b>${tk(s.amt)}</b></div>`).join('')}</div>` : '<div class="hint" style="text-align:center">সবার হিসাব মিটে গেছে ✔</div>'}
      <div class="ms-give" style="background:#f8fafc;border-color:#cbd5e1;font-size:12.5px;font-weight:500">নিয়ম: মিল রেট = মোট বাজার ÷ মোট মিল। কারও খরচ = তার মিল × রেট। পাবে/দিবে = (বাজার + মেটানো) − খরচ।</div>`;
  }
  render(pageHead('📋 ' + msMonName(ym) + ' — শিট') + `<div class="pad ms"><div class="mon"><span onclick="MS.ym=msShift(-1);msSheet(MS.tab)">‹</span><b>${msMonName(ym)}</b><span onclick="MS.ym=msShift(1);msSheet(MS.tab)">›</span></div><div class="ms-tabs">${T.map(x => `<div class="${MS.tab === x[0] ? 'on' : ''}" onclick="msSheet('${x[0]}')">${x[1]}</div>`).join('')}</div>${body}<div class="ms-ex"><div style="background:#b91c1c" onclick="msGo('pdf')">📄 PDF</div><div style="background:#15803d" onclick="msGo('xlsx')">📊 Excel</div></div></div>`);
}
function msShift(k) { const a = msYm().split('-').map(Number), d = new Date(a[0], a[1] - 1 + k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function msPerson(n) {
  const C = msCalc(msYm()), x = C.mem.find(y => y.n === n); if (!x) return; const mine = C.setl.filter(s => s.from === n || s.to === n);
  showModal(`<h3 style="margin:0 0 6px">${esc(n)}</h3><div style="line-height:1.9">মিল: <b>${nm2(x.meals)}</b> • খরচ: <b>${tk(x.cost)}</b><br>বাজার করেছে: <b>${tk(x.bazar)}</b><br>${msNet(x)}</div>${mine.map(s => `<div>👉 ${esc(s.from)} দিবে ${esc(s.to)} কে <b>${tk(s.amt)}</b></div>`).join('')}<button class="btn" style="margin-top:10px" onclick="msRemind('${esc(n)}')">📩 হিসাব পাঠান (SMS / হোয়াটসঅ্যাপ)</button>`);
}
function msRemind(n) {
  const C = msCalc(msYm()), x = C.mem.find(y => y.n === n); if (!x) return; closeModal(); const mine = C.setl.filter(s => s.from === n || s.to === n), pad = padGet();
  let t = `${n} ভাই, ${msMonName(msYm())} মাসের মিলের হিসাব:\nমিল ${nm2(x.meals)} • খরচ ৳${nm2(x.cost)} • বাজার ৳${nm2(x.bazar)}\n`;
  if (x.net < -0.5) t += `আপনি দিবেন মোট ৳${nm2(-x.net)}।\n` + mine.filter(s => s.from === n).map(s => `• ${s.to} কে ৳${nm2(s.amt)}`).join('\n') + '\nদয়া করে মিটিয়ে দিন। ধন্যবাদ।'; else if (x.net > 0.5) t += `আপনি পাবেন মোট ৳${nm2(x.net)}।\n` + mine.filter(s => s.to === n).map(s => `• ${s.from} দিবে ৳${nm2(s.amt)}`).join('\n'); else t += 'আপনার হিসাব মিটে গেছে ✔';
  sendMsg(x.ph, t + (pad.name ? '\n— ' + pad.name : ''), '📩 ' + n + ' কে হিসাব পাঠান');
}
function msPayForm() {
  const d = msLoad(); if (d.mem.length < 2) return alert('অন্তত ২ জন সদস্য লাগবে।'); MS.pf = {from: d.mem[0].n, to: d.mem[1].n}; push(() => msPage()); msPayDraw();
}
function msPayDraw() {
  const d = msLoad(), m = msM(d, msYm());
  render(pageHead('💵 টাকা মেটালাম') + `<div class="pad ms"><div class="ms-q">কে দিল?</div><div class="ms-chips">${d.mem.map(x => `<span class="${MS.pf.from === x.n ? 'on' : ''}" onclick="MS.pf.from='${esc(x.n)}';msPayDraw()">${esc(x.n)}</span>`).join('')}</div><div class="ms-q">কাকে দিল?</div><div class="ms-chips">${d.mem.map(x => `<span class="${MS.pf.to === x.n ? 'on' : ''}" onclick="MS.pf.to='${esc(x.n)}';msPayDraw()">${esc(x.n)}</span>`).join('')}</div>
    <input class="inp" id="mp_a" type="number" inputmode="decimal" placeholder="কত টাকা" style="font-size:22px;text-align:center"><input class="inp" id="mp_d" type="date" value="${todayISO()}"><div class="ms-sv" onclick="msPaySave()">✔ সেভ করুন</div>
    ${m.pay.length ? `<div class="ms-q" style="margin-top:14px">এই মাসের মেটানো</div><div class="cx">${m.pay.map(p => `<div class="ms-bz"><span>${esc(p.from)} → ${esc(p.to)} • ${lgDate(p.d)}</span><b>${tk(p.amt)}</b><a href="#" onclick="msPayDel('${p.id}');return false">✕</a></div>`).join('')}</div>` : ''}</div>`);
}
function msPaySave() { const a = parseFloat(en2(gv('mp_a'))); if (!(a > 0)) return alert('টাকা দিন।'); if (MS.pf.from === MS.pf.to) return alert('একই জন হতে পারে না।'); const d = msLoad(), m = msM(d, msYm()); m.pay.push({id: String(Date.now()), from: MS.pf.from, to: MS.pf.to, amt: a, d: gv('mp_d') || todayISO()}); msSave(d); msPayDraw(); }
function msPayDel(id) { if (!confirm('মুছবেন?')) return; const d = msLoad(), m = msM(d, msYm()); m.pay = m.pay.filter(p => p.id !== id); msSave(d); msPayDraw(); }
function msMembers(first) {
  const d = msLoad(); if (!first) push(() => msPage());
  render(pageHead('👥 সদস্য') + `<div class="pad ms">${first ? '<div class="hint" style="margin:6px 0">আগে মেসের <b>সদস্যদের নাম</b> একে একে যোগ করুন (নিজেরটাও)। মোবাইল নম্বর দিলে পরে হিসাব সরাসরি পাঠাতে পারবেন।</div>' : ''}
    ${d.mem.map((x, i) => `<div class="ms-p"><b>${esc(x.n)}<small>${esc(x.ph || 'নম্বর নেই')}</small></b><a href="#" onclick="msMemPh(${i});return false">📞</a>&nbsp;&nbsp;<a href="#" onclick="msMemDel(${i});return false">🗑️</a></div>`).join('')}
    <div class="cx"><b>➕ নতুন সদস্য</b><input class="inp" id="mm_n" placeholder="নাম"><input class="inp" id="mm_p" type="tel" placeholder="মোবাইল (ঐচ্ছিক)"><button class="btn" onclick="msMemAdd(${first ? 1 : 0})">যোগ করুন</button></div><div class="cx"><b>মেসের নাম (ঐচ্ছিক — শুধু উপরের শিরোনাম)</b><input class="inp" id="mm_t" value="${esc(d.title)}" onchange="msTitle(this.value)"></div>${d.mem.length ? `<button class="btn" style="background:#c2410c" onclick="${first ? 'stack.pop();' : ''}msPage()">✔ হয়েছে, হিসাবে যাই</button>` : ''}</div>`);
}
function msTitle(v) { const d = msLoad(); d.title = v.trim() || 'আমার মেস'; msSave(d); }
function msMemAdd(first) { const n = gv('mm_n'), p = gv('mm_p'); if (!n) return alert('নাম দিন।'); const d = msLoad(); if (d.mem.some(x => x.n === n)) return alert('এই নামে আগে থেকেই আছে।'); d.mem.push({n, ph: p}); msSave(d); msMembers(!!first); }
function msMemPh(i) { const d = msLoad(), v = prompt('মোবাইল নম্বর', d.mem[i].ph || ''); if (v === null) return; d.mem[i].ph = v.trim(); msSave(d); msMembers(); }
function msMemDel(i) { const d = msLoad(), n = d.mem[i].n; const used = Object.keys(d.mon).some(k => { const m = d.mon[k]; return Object.keys(m.meals || {}).some(dt => m.meals[dt][n]) || (m.bz || []).some(b => b.who === n); }); if (used) return alert('এই সদস্যের মিল বা বাজারের হিসাব আছে, তাই মোছা যাবে না।'); if (!confirm(n + ' কে বাদ দেবেন?')) return; d.mem.splice(i, 1); msSave(d); msMembers(); }
// ---------- PDF / Excel ----------
function msExport() { showModal(`<h3 style="margin:0 0 8px">📤 ${msMonName(msYm())} — ফাইল</h3><div style="display:flex;gap:8px"><button class="btn" style="flex:1;background:#b91c1c;margin:0" onclick="closeModal();msGo('pdf')">📄 PDF</button><button class="btn" style="flex:1;background:#15803d;margin:0" onclick="closeModal();msGo('xlsx')">📊 Excel</button></div>`); }
async function msGo(f) { const ym = msYm(); try { if (f === 'pdf') await lbSaveFile('mess_' + ym + '.pdf', await msPdf(ym), 'application/pdf', 'মেসের হিসাব'); else await lbSaveFile('mess_' + ym + '.xlsx', msXlsx(ym), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'মেসের হিসাব'); } catch (e) { alert('ফাইল তৈরি হয়নি।'); } }
function msXlsx(ym) {
  const d = msLoad(), C = msCalc(ym), m = C.m, n = msDays(ym), mem = C.mem, nc = mem.length + 1, S = (v, s) => ({v, s});
  const days = []; for (let i = 1; i <= n; i++) days.push(ym + '-' + String(i).padStart(2, '0'));
  const r1 = xlHead(d.title + ' — মিলের শিট • ' + msMonName(ym), nc); r1.push([S('তারিখ', 3)].concat(mem.map(x => S(x.n, 3)))); const f0 = r1.length + 1;
  days.forEach(dt => { const r = m.meals[dt] || {}; r1.push([S(+dt.slice(8), 8)].concat(mem.map(x => S(+r[x.n] || 0, 5)))); }); const f1 = r1.length; const L = i => String.fromCharCode(66 + i);
  r1.push([S('মোট মিল', 6)].concat(mem.map((x, i) => ({f: `SUM(${L(i)}${f0}:${L(i)}${f1})`, v: x.meals, s: 7}))));
  const bzRows = []; const maxB = Math.max(1, ...mem.map(x => m.bz.filter(b => b.who === x.n).length)); const r2 = xlHead(d.title + ' — বাজারের হিসাব • ' + msMonName(ym), mem.length * 2); r2.push(mem.flatMap(x => [S(x.n + ' — তারিখ', 3), S('টাকা', 3)]));
  const lists = mem.map(x => m.bz.filter(b => b.who === x.n).sort((a, b) => a.d.localeCompare(b.d))); const g0 = r2.length + 1;
  for (let i = 0; i < maxB; i++) r2.push(lists.flatMap(l => l[i] ? [S(+l[i].d.slice(8), 8), S(l[i].amt, 5)] : [S('', 4), S('', 4)])); const g1 = r2.length;
  r2.push(mem.flatMap((x, i) => { const c = String.fromCharCode(66 + i * 2); return [S('মোট', 6), {f: `SUM(${c}${g0}:${c}${g1})`, v: x.bazar, s: 7}]; }));
  const r3 = xlHead(d.title + ' — হিসাব • ' + msMonName(ym), 6); r3.push([S('নাম', 3), S('মিল', 3), S('খরচ', 3), S('বাজার', 3), S('মেটানো', 3), S('পাবে / দিবে', 3)]); const h0 = r3.length + 1;
  mem.forEach(x => { const rr = r3.length + 1; r3.push([S(x.n, 4), S(x.meals, 5), {f: `B${rr}*$B$${h0 + mem.length + 3}`, v: x.cost, s: 5}, S(x.bazar, 5), S(x.pin - x.pout, 5), {f: `D${rr}+E${rr}-C${rr}`, v: x.net, s: 5}]); }); const h1 = r3.length;
  r3.push([S('মোট', 6), {f: `SUM(B${h0}:B${h1})`, v: C.tm, s: 7}, {f: `SUM(C${h0}:C${h1})`, v: C.tb, s: 7}, {f: `SUM(D${h0}:D${h1})`, v: C.tb, s: 7}, S('', 6), S('', 6)]); r3.push([]);
  r3.push([S('মোট বাজার', 6), {f: `D${h1 + 1}`, v: C.tb, s: 7}]); r3.push([S('মোট মিল', 6), {f: `B${h1 + 1}`, v: C.tm, s: 7}]); r3.push([S('মিল রেট', 6), {f: `IF(B${h1 + 3}=0,0,B${h1 + 2}/B${h1 + 3})`, v: C.rate, s: 7}]);
  r3.push([]); r3.push([S('কে কাকে দিবে', 3), S('', 3), S('টাকা', 3)]); C.setl.forEach(s => r3.push([S(s.from + ' → ' + s.to, 4), S('', 4), S(Math.round(s.amt * 100) / 100, 5)]));
  return xl2([{name: 'মিল', rows: r1, w: [14].concat(mem.map(() => 12)), land: true}, {name: 'বাজার', rows: r2, w: mem.flatMap(() => [16, 12]), land: true}, {name: 'হিসাব', rows: r3, w: [22, 12, 12, 12, 12, 16]}]);
}
async function msPdf(ym) {
  const d = msLoad(), C = msCalc(ym), m = C.m, mem = C.mem, W = 1240, H = 1754, P = 60, rowH = 46, pages = []; let cv, g, y;
  const F = (w, s) => `${w} ${s}px "Noto Sans Bengali","Hind Siliguri",sans-serif`; try { await document.fonts.load(F(700, 30), 'মিল'); } catch (e) {} const PI = padOn() ? await padImgs() : null;
  const np = () => { cv = document.createElement('canvas'); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); pages.push(cv); y = P; if (PI) y = padDraw(g, W, P, PI) + 10; else { g.fillStyle = '#9a3412'; g.fillRect(0, 0, W, 120); g.fillStyle = '#fff'; g.font = F(800, 40); g.textAlign = 'left'; g.fillText('আমার ভাই — মেসের হিসাব', P, 74); y = 150; } };
  const txt = (s, x, yy, f, c, al) => { g.font = f; g.fillStyle = c; g.textAlign = al || 'left'; g.fillText(String(s), x, yy); };
  np(); txt(d.title + ' — ' + msMonName(ym), P, y + 34, F(800, 36), '#9a3412'); y += 64;
  const bx = (lab, v, x) => { g.fillStyle = '#fff7ed'; g.fillRect(x, y, 350, 96); txt(lab, x + 20, y + 36, F(600, 24), '#7c2d12'); txt(v, x + 20, y + 80, F(800, 36), '#9a3412'); };
  bx('মোট বাজার', '৳ ' + nm2(C.tb), P); bx('মোট মিল', nm2(C.tm), P + 380); bx('এক মিলের দাম', '৳ ' + nm2(C.rate), P + 760); y += 130;
  const colW = Math.min(110, Math.floor((W - 2 * P - 130) / Math.max(1, mem.length)));
  // মিল শিট
  txt('🍽️ মিলের শিট', P, y + 28, F(800, 28), '#9a3412'); y += 46; const hd = () => { g.fillStyle = '#16a34a'; g.fillRect(P, y, W - 2 * P, 44); txt('তারিখ', P + 12, y + 31, F(700, 22), '#000'); mem.forEach((x, i) => txt(x.n.length > 8 ? x.n.slice(0, 7) + '…' : x.n, P + 130 + i * colW + colW / 2, y + 31, F(700, 21), '#000', 'center')); y += 44; }; hd();
  const nd = msDays(ym), today = todayISO(); for (let i = 1; i <= nd; i++) { const dt = ym + '-' + String(i).padStart(2, '0'), r = m.meals[dt]; if (!r && dt > today) continue; if (!r && ym !== today.slice(0, 7)) continue; if (y > H - 200) { np(); hd(); } if (i % 2) { g.fillStyle = '#f6f8f6'; g.fillRect(P, y, W - 2 * P, rowH); } txt(bn(i), P + 12, y + 32, F(700, 22), '#14231c'); mem.forEach((x, k) => txt(r ? nm2(+r[x.n] || 0) : '–', P + 130 + k * colW + colW / 2, y + 32, F(500, 22), r && (+r[x.n] || 0) ? '#14231c' : '#bbb', 'center')); y += rowH; }
  g.fillStyle = '#fde047'; g.fillRect(P, y, W - 2 * P, rowH); txt('মোট', P + 12, y + 32, F(800, 23), '#000'); mem.forEach((x, k) => txt(nm2(x.meals), P + 130 + k * colW + colW / 2, y + 32, F(800, 23), '#000', 'center')); y += rowH + 40;
  // বাজার
  if (y > H - 420) np(); txt('🛒 বাজারের হিসাব', P, y + 28, F(800, 28), '#9a3412'); y += 46;
  mem.forEach(x => { const l = m.bz.filter(b => b.who === x.n).sort((a, b) => a.d.localeCompare(b.d)); if (y > H - 200) np(); g.fillStyle = '#fff7ed'; g.fillRect(P, y, W - 2 * P, 48); txt(x.n, P + 14, y + 33, F(800, 25), '#7c2d12'); txt('৳ ' + nm2(x.bazar), W - P - 14, y + 33, F(800, 25), '#15803d', 'right'); y += 52; let line = ''; l.forEach(b => { const s = bn(+b.d.slice(8)) + ' তারিখ: ' + nm2(b.amt) + '   '; if (line.length + s.length > 62) { txt(line, P + 14, y + 26, F(500, 21), '#334155'); y += 34; line = ''; } line += s; }); if (line) { txt(line, P + 14, y + 26, F(500, 21), '#334155'); y += 34; } y += 14; });
  // হিসাব
  if (y > H - 520) np(); y += 10; txt('💰 মাস শেষের হিসাব', P, y + 28, F(800, 28), '#9a3412'); y += 46; g.fillStyle = '#9a3412'; g.fillRect(P, y, W - 2 * P, 44); [['নাম', P + 14, 'left'], ['মিল', P + 330, 'center'], ['খরচ', P + 500, 'center'], ['বাজার', P + 690, 'center'], ['মেটানো', P + 860, 'center'], ['পাবে/দিবে', W - P - 14, 'right']].forEach(c => txt(c[0], c[1], y + 31, F(700, 22), '#fff', c[2])); y += 44;
  C.mem.forEach((x, i) => { if (y > H - 160) np(); if (i % 2) { g.fillStyle = '#f6f8f6'; g.fillRect(P, y, W - 2 * P, rowH); } txt(x.n, P + 14, y + 32, F(700, 22), '#14231c'); txt(nm2(x.meals), P + 330, y + 32, F(500, 22), '#14231c', 'center'); txt(nm2(x.cost), P + 500, y + 32, F(500, 22), '#14231c', 'center'); txt(nm2(x.bazar), P + 690, y + 32, F(500, 22), '#14231c', 'center'); txt(nm2(x.pin - x.pout), P + 860, y + 32, F(500, 22), '#14231c', 'center'); txt((x.net >= 0 ? 'পাবে ' : 'দিবে ') + nm2(Math.abs(x.net)), W - P - 14, y + 32, F(800, 22), x.net >= 0 ? '#15803d' : '#dc2626', 'right'); y += rowH; });
  y += 24; if (C.setl.length) { if (y > H - 200) np(); g.fillStyle = '#fff7ed'; const hh = 60 + C.setl.length * 40; g.fillRect(P, y, W - 2 * P, hh); g.strokeStyle = '#fdba74'; g.lineWidth = 3; g.strokeRect(P, y, W - 2 * P, hh); txt('কে কাকে দিবে', P + 20, y + 40, F(800, 26), '#7c2d12'); C.setl.forEach((s, i) => txt('👉 ' + s.from + ' দিবে ' + s.to + ' কে   ৳ ' + nm2(s.amt), P + 20, y + 84 + i * 40, F(700, 24), '#14231c')); y += hh + 20; }
  pages.forEach((c, i) => { const g2 = c.getContext('2d'); g2.font = F(500, 20); g2.fillStyle = '#6b7a72'; g2.textAlign = 'center'; g2.fillText('আমার ভাই অ্যাপ • পেজ ' + bn(i + 1) + '/' + bn(pages.length), W / 2, H - 28); });
  const jp = pages.map(c => Uint8Array.from(atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), ch => ch.charCodeAt(0))); return pdfMulti(jp, W, H, 595);
}
(function () { const st = document.createElement('style'); st.textContent = `
.ms .mon{display:flex;justify-content:center;gap:16px;align-items:center;font-weight:800;font-size:16px;margin:2px 0 10px}.ms .mon span{background:#fff;border-radius:10px;padding:2px 14px;font-size:20px}
.ms-plan{background:linear-gradient(150deg,#c2410c,#9a3412);color:#fff;border-radius:20px;padding:12px 14px;box-shadow:0 6px 16px #9a341255;margin-bottom:10px}.ms-plan .hd{display:flex;justify-content:space-between;align-items:center;gap:8px}.ms-plan .hd b{font-size:14.5px}.ms-plan .hd span{background:#fde68a;color:#7c2d12;font-weight:800;font-size:12px;border-radius:14px;padding:3px 10px;white-space:nowrap}
.ms-plan .bar{display:flex;align-items:center;gap:8px;margin:7px 0;font-size:13.5px;font-weight:700}.ms-plan .bar u{text-decoration:none;width:66px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ms-plan .bar .tr{flex:1;height:16px;border-radius:9px;background:#ffffff26;overflow:hidden}.ms-plan .bar .tr i{display:block;height:100%;background:#fde68a;border-radius:9px}.ms-plan .bar em{font-style:normal;width:30px;text-align:right}
.ms-plan .ft{border-top:1px solid #ffffff33;margin-top:6px;padding-top:7px;font-size:12.5px;color:#fed7aa;display:flex;justify-content:space-between}.ms-plan .ok{display:flex;gap:8px;margin-top:8px}.ms-plan .ok div{flex:1;text-align:center;border-radius:12px;padding:10px;font-weight:800;font-size:13px}
.ms-btns{display:flex;gap:10px;margin:10px 0}.ms-btns div{flex:1;text-align:center;border-radius:18px;padding:18px 4px;font-weight:800;font-size:17px;color:#fff;line-height:1.3}.ms-btns small{display:block;font-size:12px;font-weight:600;opacity:.9}
.ms-mini{display:flex;justify-content:space-between;font-size:12.5px;color:#6b7a72;margin:4px 2px}.ms-t{font-weight:800;font-size:15px;margin:14px 2px 6px;color:#7c2d12}
.ms-p{display:flex;align-items:center;background:#fff;border-radius:16px;padding:12px 14px;margin:8px 0;box-shadow:0 1px 6px #0001;font-size:16px;font-weight:800}.ms-p b{flex:1}.ms-p small{display:block;font-weight:500;font-size:11.5px;color:#6b7a72}
.ms .get{background:#dcfce7;color:#166534;border-radius:12px;padding:5px 12px;font-size:14px;font-weight:800}.ms .pay{background:#fee2e2;color:#991b1b;border-radius:12px;padding:5px 12px;font-size:14px;font-weight:800}
.ms-give{background:#fff7ed;border:2px solid #fdba74;border-radius:16px;padding:12px 14px;margin:10px 0;font-size:14.5px;line-height:2}.ms-give b:first-child{display:block;color:#7c2d12}
.ms-ln{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;padding:14px 0 6px;font-size:13px}.ms-ln a{color:#64748b;text-decoration:underline}
.ms-q{margin:12px 2px 4px;font-size:14.5px;font-weight:800}.ms-days{display:flex;gap:7px;margin:8px 0}.ms-days div{flex:1;text-align:center;background:#fff;border:2px solid #e2d6c4;border-radius:13px;padding:8px 2px;font-weight:800;font-size:13px}.ms-days div.on{background:#c2410c;border-color:#c2410c;color:#fff}.ms-days small{display:block;font-size:11px;font-weight:600}
.ms-mr{background:#fff;border-radius:14px;padding:8px 10px;margin:8px 0;box-shadow:0 1px 6px #0001}.ms-mr b{display:block;font-size:15px;margin-bottom:5px}.ms-mr .ns{display:flex;flex-wrap:wrap;gap:5px}.ms-mr .n{width:calc(16.6% - 5px);height:36px;border-radius:10px;background:#f1f3f2;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}.ms-mr .n.h{background:#fff1e0;color:#9a3412}.ms-mr .n.on{background:#c2410c;color:#fff}
.ms-sv{margin:14px 0;background:#c2410c;color:#fff;text-align:center;border-radius:16px;padding:14px;font-weight:800;font-size:16px}
.ms-tabs{display:flex;margin:6px 0 10px;background:#fde8d4;border-radius:14px;padding:4px}.ms-tabs div{flex:1;text-align:center;padding:9px 2px;font-weight:800;font-size:13px;border-radius:11px;color:#9a3412}.ms-tabs .on{background:#c2410c;color:#fff}
.ms-chips{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0}.ms-chips span{background:#fff;border:2px solid #e2d6c4;border-radius:12px;padding:10px 15px;font-weight:800;font-size:15px}.ms-chips .on{background:#16a34a;border-color:#16a34a;color:#fff}
.ms-bz{display:flex;gap:8px;align-items:center;padding:7px 0;border-bottom:1px dashed #eadfcf;font-size:13.5px}.ms-bz span{flex:1}.ms-bz a{color:#dc2626;text-decoration:none}
.ms-tw{overflow-x:auto}.ms-tb{border-collapse:collapse;font-size:12.5px;width:100%;min-width:100%}.ms-tb th{background:#16a34a;color:#000;padding:6px 4px;border:1px solid #fff;font-size:12px}.ms-tb td{text-align:center;padding:6px 4px;border-bottom:1px solid #e5e7eb;background:#fff}.ms-tb td:first-child{background:#fde68a;font-weight:800;position:sticky;left:0}.ms-tb tr.tt td{background:#fde047;font-weight:800}.ms-tb .z{color:#bbb}
.ms-pb{background:#fff;border-radius:12px;margin:7px 0;padding:8px 10px;box-shadow:0 1px 6px #0001}.ms-pb .h{display:flex;justify-content:space-between;font-weight:800;font-size:14px;margin-bottom:5px}.ms-pb .h span{color:#166534}.ms-pb i{display:inline-block;font-style:normal;background:#ffedd5;border-radius:8px;padding:3px 8px;font-size:12.5px;font-weight:700;margin:2px 2px 0 0}
.ms-ex{display:flex;gap:8px;margin:12px 0}.ms-ex div{flex:1;text-align:center;color:#fff;border-radius:14px;padding:13px;font-weight:800;font-size:14px}
`; document.head.appendChild(st); })();

// =====================================================================
//  P53/P54: বাড়ি ভাড়া + রসিদ
// =====================================================================
let RT = {ym: '', tid: '', pm: '', meth: 'নগদ', F: {}};
function rtLoad() { let d = {}; try { d = JSON.parse(localStorage.getItem('rent') || '{}'); } catch (e) {} d.t = d.t || []; d.pay = d.pay || []; d.seq = d.seq || 0; d.rem = d.rem || {on: false, day: 5, tm: '10:00'}; return d; }
function rtSave(d) { try { localStorage.setItem('rent', JSON.stringify(d)); } catch (e) { alert('জায়গা শেষ।'); } }
const rtYm = () => RT.ym || (RT.ym = todayISO().slice(0, 7));
const rtMonthly = t => (+t.rent || 0) + (t.extras || []).reduce((a, e) => a + (+e.amt || 0), 0);
function rtShiftYm(ym, k) { const a = ym.split('-').map(Number), d = new Date(a[0], a[1] - 1 + k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function rtLedger(t, upto) {
  const d = rtLoad(), pays = d.pay.filter(p => p.tid === t.id), mo = rtMonthly(t), rows = [], cur = todayISO().slice(0, 7);
  let credit = pays.filter(p => p.m === 'adv').reduce((a, p) => a + (+p.amt || 0), 0), totalDue = 0, ym = t.since || cur;
  upto = upto || cur; if (ym > upto) return {rows, credit, totalDue, mo};
  let guard = 0;
  while (ym <= upto && guard++ < 600) {
    const paid = pays.filter(p => p.m === ym).reduce((a, p) => a + (+p.amt || 0), 0); let used = 0, short = mo - paid;
    if (short > 0) { used = Math.min(credit, short); credit -= used; short -= used; } else if (short < 0) { credit += -short; short = 0; }
    const st = short <= 0 ? (paid >= mo ? 'ok' : 'ad') : (paid + used > 0 ? 'pt' : 'du');
    if (ym <= cur) totalDue += short; rows.push({ym, paid, used, short, st}); ym = rtShiftYm(ym, 1);
  }
  return {rows, credit, totalDue, mo};
}
const RT_ST = {ok: ['✔ দিয়েছে', '#dcfce7', '#166534'], ad: ['🔵 অগ্রিম থেকে', '#dbeafe', '#1e40af'], pt: ['⚠ আংশিক', '#ffedd5', '#9a3412'], du: ['✖ বাকি', '#fee2e2', '#991b1b'], f: ['–', '#f1f5f9', '#94a3b8']};
function rtStat(t, ym) { if (ym < (t.since || ym)) return {st: 'f', short: 0, paid: 0}; const L = rtLedger(t, ym), r = L.rows.find(x => x.ym === ym); return r || {st: 'f', short: 0, paid: 0}; }
function rtDueMonths(t) { const L = rtLedger(t); return L.rows.filter(r => r.short > 0 && r.ym <= todayISO().slice(0, 7)); }
function rtPage() {
  tab = 'home'; const d = rtLoad(), ym = rtYm(), cur = todayISO().slice(0, 7), pad = padGet();
  let due = 0, got = 0, rest = 0; const cards = d.t.map(t => { const s = rtStat(t, ym), L = rtLedger(t, cur), mo = rtMonthly(t); if (s.st !== 'f') { due += mo; got += s.paid; rest += s.short; } return {t, s, L, mo}; });
  const exp = d.t.filter(t => t.end && daysTo(t.end) <= 30 && daysTo(t.end) >= 0);
  render(pageHead('🏠 ' + (pad.name || 'বাড়ি ভাড়া')) + `<div class="pad rt"><div class="mon"><span onclick="RT.ym=rtShiftYm(rtYm(),-1);rtPage()">‹</span><b>${lmName(ym)}</b><span onclick="RT.ym=rtShiftYm(rtYm(),1);rtPage()">›</span></div>
    <div class="rt-h"><div><span>ধার্য</span><b>${tk(due)}</b></div><div><span>আদায়</span><b style="color:#86efac">${tk(got)}</b></div><div><span>বাকি</span><b style="color:#fca5a5">${tk(rest)}</b></div></div>
    ${exp.map(t => `<div class="rt-warn">⏰ ${esc(t.name)}-এর চুক্তি শেষ ${bn(daysTo(t.end))} দিনে (${lgDate(t.end)})</div>`).join('')}
    ${cards.map(c => { const S = RT_ST[c.s.st], t = c.t; return `<div class="rt-c" style="border-color:${S[2]}55"><div class="top" onclick="rtTenant('${t.id}')"><div><b>${esc(t.name)}</b><small>${esc(t.unit || '')}${t.ph ? ' • ' + esc(t.ph) : ''}</small></div><span style="background:${S[1]};color:${S[2]}">${S[0]}</span></div>
      <div class="am"><span>ভাড়া ${tk(c.mo)}</span><span>${c.L.totalDue > 0 ? 'মোট বাকি <b style="color:#dc2626">' + tk(c.L.totalDue) + '</b>' : c.L.credit > 0 ? 'অগ্রিম <b style="color:#1d4ed8">' + tk(c.L.credit) + '</b>' : 'কোনো বাকি নেই'}</span></div>
      <div class="bt">${c.L.totalDue > 0 ? `<div style="background:#fee2e2;color:#991b1b" onclick="rtTagada('${t.id}')">📩 তাগাদা পাঠান</div>` : ''}<div style="background:#dcfce7;color:#166534" onclick="rtPayForm('${t.id}')">💵 টাকা পেলাম</div></div></div>`; }).join('') || '<div class="hint" style="text-align:center;padding:16px">এখনো কোনো ভাড়াটিয়া নেই। নিচে যোগ করুন।</div>'}
    <div class="ms-sv" style="background:#0f766e" onclick="rtEdit('')">➕ নতুন ভাড়াটিয়া</div>
    <div class="ms-ln"><a href="#" onclick="rtExport();return false">📤 PDF / Excel</a><a href="#" onclick="rtRem();return false">🔔 রিমাইন্ডার</a><a href="#" onclick="open_('pad');return false">🪪 আমার প্যাড</a></div></div>`);
}
function rtTenant(id) {
  const d = rtLoad(), t = d.t.find(x => x.id === id); if (!t) return; RT.tid = id; push(() => rtPage()); rtTenantDraw();
}
function rtTenantDraw() {
  const d = rtLoad(), t = d.t.find(x => x.id === RT.tid); if (!t) return rtPage(); const yr = RT.yr || todayISO().slice(0, 4), L = rtLedger(t, yr + '-12'), cur = todayISO().slice(0, 7), pays = d.pay.filter(p => p.tid === t.id).sort((a, b) => (b.d || '').localeCompare(a.d || '') || b.id.localeCompare(a.id));
  const cells = []; for (let m = 1; m <= 12; m++) { const ym = yr + '-' + String(m).padStart(2, '0'), s = ym < (t.since || ym) ? {st: 'f'} : (L.rows.find(r => r.ym === ym) || {st: 'f'}), fut = ym > cur && s.st === 'du', S = fut ? RT_ST.f : RT_ST[s.st]; cells.push(`<div style="background:${S[1]};color:${S[2]}" onclick="rtPayForm('${t.id}','${ym}')"><small>${L_MON[m - 1]}</small>${S === RT_ST.f ? '–' : s.st === 'ok' ? '✔' : s.st === 'ad' ? '🔵' : s.st === 'pt' ? '⚠' : '✖'}</div>`); }
  const all = rtLedger(t, cur);
  render(pageHead('🏠 ' + t.name) + `<div class="pad rt"><div class="cx"><b>${esc(t.name)}</b> <a href="#" onclick="rtEdit('${t.id}');return false" style="float:right">✏️ বদলান</a><div class="hint">${esc(t.unit || '')}${t.ph ? ' • ' + esc(t.ph) : ''}${t.nid ? '<br>NID: ' + esc(t.nid) : ''}${t.fam ? '<br>পরিবার: ' + esc(t.fam) : ''}${t.since ? '<br>উঠেছেন: ' + lmName(t.since) : ''}${t.end ? '<br>চুক্তি শেষ: ' + lgDate(t.end) : ''}${t.note ? '<br>' + esc(t.note) : ''}</div></div>
    <div class="rt-h"><div><span>মাসিক ভাড়া</span><b>${tk(all.mo)}</b></div><div><span>মোট বাকি</span><b style="color:#fca5a5">${tk(all.totalDue)}</b></div><div><span>অগ্রিম</span><b style="color:#93c5fd">${tk(all.credit)}</b></div></div>
    ${(t.extras || []).length ? `<div class="hint">ভাড়ার মধ্যে: ${esc('ভাড়া ' + bn(t.rent))}${t.extras.map(e => ' + ' + esc(e.n) + ' ' + bn(e.amt)).join('')}</div>` : ''}
    <div class="mon"><span onclick="RT.yr=String(+(RT.yr||todayISO().slice(0,4))-1);rtTenantDraw()">‹</span><b>${bn(yr)}</b><span onclick="RT.yr=String(+(RT.yr||todayISO().slice(0,4))+1);rtTenantDraw()">›</span></div><div class="rt-g">${cells.join('')}</div>
    <div class="bt2"><div style="background:#16a34a" onclick="rtPayForm('${t.id}')">💵 টাকা পেলাম</div>${all.totalDue > 0 ? `<div style="background:#dc2626" onclick="rtTagada('${t.id}')">📩 তাগাদা</div>` : ''}</div>
    <div class="ms-q">টাকা পাওয়ার তালিকা</div>${pays.map(p => `<div class="ms-bz"><span>${lgDate(p.d)} • ${p.m === 'adv' ? 'অগ্রিম' : lmName(p.m)} • ${esc(p.meth || '')}<br><small style="color:#64748b">রসিদ ${esc(p.no || '')}</small></span><b>${tk(p.amt)}</b><a href="#" onclick="rtReceipt('${p.id}');return false" style="font-size:18px">🧾</a><a href="#" onclick="rtPayDel('${p.id}');return false">✕</a></div>`).join('') || '<div class="hint">এখনো কিছু পাওয়া যায়নি।</div>'}</div>`);
}
// ---------- টাকা পেলাম ----------
function rtPayForm(tid, ym) {
  const d = rtLoad(), t = d.t.find(x => x.id === tid); if (!t) return; RT.tid = tid; const L = rtLedger(t), dm = rtDueMonths(t); RT.pm = ym || (dm[0] ? dm[0].ym : todayISO().slice(0, 7)); RT.pamt = ''; RT.meth = 'নগদ';
  if (!stack.length || !stack[stack.length - 1]._rt) { const f = () => rtPage(); f._rt = 1; push(f); } rtPayDraw();
}
function rtPayDraw() {
  const d = rtLoad(), t = d.t.find(x => x.id === RT.tid), cur = todayISO().slice(0, 7), ms = []; for (let i = -5; i <= 2; i++) ms.push(rtShiftYm(cur, i)); const mo = rtMonthly(t), s = RT.pm !== 'adv' ? rtStat(t, RT.pm) : null, sug = s && s.short > 0 ? s.short : mo;
  render(pageHead('💵 টাকা পেলাম') + `<div class="pad rt"><div class="cx"><b>${esc(t.name)}</b><div class="hint">${esc(t.unit || '')} • মাসিক ${tk(mo)}</div></div><div class="ms-q">কোন মাসের ভাড়া?</div><div class="ms-chips">${ms.map(m => `<span class="${RT.pm === m ? 'on' : ''}" onclick="RT.pamt=gv('rp_a');RT.pm='${m}';rtPayDraw()">${lmName(m).split(' ')[0]}</span>`).join('')}<span class="${RT.pm === 'adv' ? 'on' : ''}" style="background:${RT.pm === 'adv' ? '#1d4ed8' : '#dbeafe'};border-color:#1d4ed8" onclick="RT.pamt=gv('rp_a');RT.pm='adv';rtPayDraw()">🔵 অগ্রিম</span></div>
    <input class="inp" id="rp_a" type="number" inputmode="decimal" value="${RT.pamt || (RT.pm === 'adv' ? '' : sug)}" placeholder="কত টাকা" style="font-size:24px;text-align:center"><input class="inp" id="rp_d" type="date" value="${todayISO()}">
    <div class="ms-chips">${['নগদ', 'বিকাশ', 'নগদ(অ্যাপ)', 'ব্যাংক'].map(m => `<span class="${RT.meth === m ? 'on' : ''}" onclick="RT.pamt=gv('rp_a');RT.meth='${m}';rtPayDraw()">${m}</span>`).join('')}</div>
    <div class="ms-sv" style="background:#16a34a" onclick="rtPaySave()">✔ সেভ করে রসিদ দিন</div></div>`);
}
function rtPaySave() {
  const a = parseFloat(en2(gv('rp_a'))); if (!(a > 0)) return alert('টাকা দিন।'); const d = rtLoad(), t = d.t.find(x => x.id === RT.tid), dt = gv('rp_d') || todayISO(), pad = padGet(); d.seq++;
  const no = (pad.rcPre || 'RC') + '-' + dt.slice(0, 4) + '-' + String(d.seq).padStart(4, '0'), p = {id: String(Date.now()), tid: t.id, m: RT.pm, amt: a, d: dt, meth: RT.meth, no}; d.pay.push(p); rtSave(d);
  stack.pop(); RT.tid = t.id; rtTenantDraw(); setTimeout(() => { if (confirm('✅ সেভ হয়েছে। রসিদ (PDF) বানাবেন?')) rtReceipt(p.id); }, 100);
}
function rtPayDel(id) { if (!confirm('এই পাওয়া মুছবেন? (রসিদ নম্বর বাতিল হবে না)')) return; const d = rtLoad(); d.pay = d.pay.filter(p => p.id !== id); rtSave(d); rtTenantDraw(); }
// ---------- ভাড়াটিয়া ফর্ম ----------
function rtEdit(id) {
  const d = rtLoad(), t = id ? d.t.find(x => x.id === id) : null; RT.F = t ? JSON.parse(JSON.stringify(t)) : {id: '', name: '', unit: '', ph: '', rent: '', since: todayISO().slice(0, 7), extras: [], nid: '', fam: '', end: '', note: ''}; push(() => id ? rtTenantDraw() : rtPage()); rtEditDraw();
}
function rtEditDraw() {
  const F = RT.F, f = (k, lab, ph, ty) => `<label class="lg-l">${lab}</label><input class="inp" ${ty ? `type="${ty}"` : ''} value="${esc(F[k] || '')}" placeholder="${esc(ph || '')}" oninput="RT.F.${k}=this.value">`;
  render(pageHead(F.id ? '✏️ ভাড়াটিয়া' : '➕ নতুন ভাড়াটিয়া') + `<div class="pad rt"><div class="cx">${f('name', 'নাম', 'ভাড়াটিয়ার নাম')}${f('unit', 'ফ্ল্যাট / তলা', 'যেমন: ২য় তলা, বাম পাশ')}${f('ph', 'মোবাইল', '01XXXXXXXXX', 'tel')}${f('rent', 'মাসিক ভাড়া (টাকা)', '', 'number')}<label class="lg-l">কোন মাস থেকে ভাড়া শুরু</label><input class="inp" type="month" value="${esc(F.since || '')}" oninput="RT.F.since=this.value"></div>
    <div class="cx"><b>💧 অতিরিক্ত বিল (মাসে মাসে ভাড়ার সাথে)</b>${(F.extras || []).map((e, i) => `<div style="display:flex;gap:6px;align-items:center"><input class="inp" style="flex:2" value="${esc(e.n)}" oninput="RT.F.extras[${i}].n=this.value" placeholder="যেমন: গ্যাস"><input class="inp" style="flex:1" type="number" value="${e.amt}" oninput="RT.F.extras[${i}].amt=+this.value"><a href="#" onclick="RT.F.extras.splice(${i},1);rtEditDraw();return false">✕</a></div>`).join('')}
      <div class="ms-chips">${['পানি', 'গ্যাস', 'বিদ্যুৎ', 'সার্ভিস চার্জ'].map(n => `<span onclick="RT.F.extras.push({n:'${n}',amt:0});rtEditDraw()">+ ${n}</span>`).join('')}</div></div>
    <div class="cx"><b>📁 ভাড়াটিয়ার ফাইল</b>${f('nid', 'NID / পরিচয়', '')}${f('fam', 'পরিবারের সদস্য', 'যেমন: স্বামী-স্ত্রী ও ২ সন্তান')}<label class="lg-l">চুক্তি শেষের তারিখ (ঐচ্ছিক)</label><input class="inp" type="date" value="${esc(F.end || '')}" oninput="RT.F.end=this.value">${f('note', 'নোট', '')}</div>
    <div class="ms-sv" style="background:#0f766e" onclick="rtEditSave()">💾 সেভ</div>${F.id ? `<div class="ms-ln"><a href="#" onclick="rtDel('${F.id}');return false" style="color:#dc2626">🗑️ ভাড়াটিয়া মুছুন</a></div>` : ''}</div>`);
}
function rtEditSave() {
  const F = RT.F; if (!(F.name || '').trim()) return alert('নাম দিন।'); if (!(+F.rent > 0)) return alert('মাসিক ভাড়া দিন।'); F.rent = +F.rent; F.extras = (F.extras || []).filter(e => e.n && +e.amt > 0).map(e => ({n: e.n, amt: +e.amt}));
  const d = rtLoad(); if (F.id) { const i = d.t.findIndex(x => x.id === F.id); d.t[i] = F; } else { F.id = 't' + Date.now(); d.t.push(F); } rtSave(d); rtRemSched(); stack.pop(); RT.tid = F.id; F.id && rtPage();
}
function rtDel(id) { const d = rtLoad(); if (d.pay.some(p => p.tid === id)) return alert('এই ভাড়াটিয়ার টাকার হিসাব আছে, তাই মোছা যাবে না।'); if (!confirm('মুছবেন?')) return; d.t = d.t.filter(t => t.id !== id); rtSave(d); stack.pop(); rtPage(); }
// ---------- তাগাদা ----------
function rtTagada(id) {
  const d = rtLoad(), t = d.t.find(x => x.id === id), pad = padGet(), dm = rtDueMonths(t), tot = dm.reduce((a, r) => a + r.short, 0);
  sendMsg(t.ph, `আসসালামু আলাইকুম ${t.name}। ${pad.name || 'বাড়ির'}${t.unit ? ' ' + t.unit : ''}-এর ভাড়া বাকি আছে: ${dm.map(r => lmName(r.ym) + ' ৳' + nm2(r.short)).join(', ')}। মোট ৳${nm2(tot)}। অনুগ্রহ করে দ্রুত পরিশোধ করবেন। ধন্যবাদ।${pad.owner ? '\n— ' + pad.owner : ''}`, '📩 ' + t.name + ' কে তাগাদা');
}
// ---------- রিমাইন্ডার ----------
function rtRem() {
  const d = rtLoad(), r = d.rem; showModal(`<h3 style="margin:0 0 8px">🔔 রিমাইন্ডার</h3><label class="lg-l">প্রতি মাসের কত তারিখে ভাড়া তোলার কথা মনে করাবে?</label><input class="inp" id="rr_d" type="number" min="1" max="28" value="${r.day}"><label class="lg-l">সময়</label><input class="inp" id="rr_t" type="time" value="${r.tm}"><label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="rr_o" ${r.on ? 'checked' : ''}> চালু রাখুন</label><div class="hint">চুক্তি শেষের ৩০ দিন আগেও জানাবে। নোটিফিকেশন শুধু ফোনের অ্যাপে আসবে।</div><button class="btn" onclick="rtRemSave()">💾 সেভ</button>`);
}
async function rtRemSave() { const d = rtLoad(); d.rem = {on: document.getElementById('rr_o').checked, day: Math.min(28, Math.max(1, +gv('rr_d') || 5)), tm: gv('rr_t') || '10:00'}; rtSave(d); closeModal(); const s = await rtRemSched(); alert(s === 'web' ? '✅ সেভ হয়েছে। নোটিফিকেশন শুধু ফোনের অ্যাপে আসবে।' : s === 'denied' ? 'ফোনের সেটিংসে নোটিফিকেশনের অনুমতি দিন।' : '✅ রিমাইন্ডার ঠিক হয়েছে।'); }
async function rtRemSched() {
  const ln = LNP(); if (!ln) return 'web'; const d = rtLoad(); try { await ln.cancel({notifications: [{id: notifId('rt_m')}].concat(d.t.map(t => ({id: notifId('rt_e' + t.id)})))}); } catch (e) {}
  try {
    if (!d.rem.on) return 'off'; const p = await ln.requestPermissions(); if (p.display !== 'granted') return 'denied'; const hm = d.rem.tm.split(':').map(Number), list = [];
    list.push({id: notifId('rt_m'), title: 'আমার ভাই: ভাড়া তোলার দিন', body: 'আজ ভাড়াটিয়াদের কাছ থেকে ভাড়া তোলার দিন। হিসাব দেখুন।', schedule: {on: {day: d.rem.day, hour: hm[0], minute: hm[1] || 0}, allowWhileIdle: true}});
    d.t.forEach(t => { if (t.end) { const a = t.end.split('-').map(Number), at = new Date(a[0], a[1] - 1, a[2] - 30, hm[0], hm[1] || 0); if (at > new Date()) list.push({id: notifId('rt_e' + t.id), title: 'আমার ভাই: চুক্তি শেষ হচ্ছে', body: t.name + '-এর চুক্তি ৩০ দিনে শেষ। ভাড়া বাড়ানো বা নবায়নের কথা ভাবুন।', schedule: {at, allowWhileIdle: true}}); } });
    await ln.schedule({notifications: list}); return 'ok';
  } catch (e) { return 'err'; }
}
// ---------- রসিদ PDF ----------
async function rtReceipt(pid) {
  const d = rtLoad(), p = d.pay.find(x => x.id === pid), t = p && d.t.find(x => x.id === p.tid); if (!t) return; const pad = padGet(), L = rtLedger(t), W = 1240, H = 1000, P = 70;
  const F = (w, s) => `${w} ${s}px "Noto Sans Bengali","Hind Siliguri",sans-serif`; try { await document.fonts.load(F(700, 30), 'রসিদ'); } catch (e) {} const PI = padOn() ? await padImgs() : null;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); let y = PI ? padDraw(g, W, P, PI) + 20 : 40;
  const tx = (s, x, yy, f, c, al) => { g.font = f; g.fillStyle = c; g.textAlign = al || 'left'; g.fillText(String(s), x, yy); };
  tx('ভাড়ার রসিদ', W / 2, y + 40, F(800, 44), '#0f766e', 'center'); y += 70; tx('রসিদ নং: ' + p.no, P, y, F(700, 26), '#14231c'); tx('তারিখ: ' + lgDate(p.d), W - P, y, F(700, 26), '#14231c', 'right'); y += 40;
  const row = (a, b) => { tx(a, P, y, F(600, 26), '#64748b'); tx(b, P + 280, y, F(700, 27), '#14231c'); y += 44; };
  row('ভাড়াটিয়া', t.name); if (t.unit) row('ফ্ল্যাট / তলা', t.unit); row('মাস', p.m === 'adv' ? 'অগ্রিম' : lmName(p.m)); row('পরিশোধ', p.meth || 'নগদ');
  if (p.m !== 'adv' && (t.extras || []).length) { y += 6; g.fillStyle = '#f0fdfa'; g.fillRect(P, y - 30, W - 2 * P, 44 + (t.extras.length + 1) * 40); tx('ভাড়া', P + 20, y + 6, F(600, 25), '#134e4a'); tx('৳ ' + nm2(t.rent), W - P - 20, y + 6, F(700, 25), '#134e4a', 'right'); y += 40; t.extras.forEach(e => { tx(e.n, P + 20, y + 6, F(600, 25), '#134e4a'); tx('৳ ' + nm2(e.amt), W - P - 20, y + 6, F(700, 25), '#134e4a', 'right'); y += 40; }); y += 20; }
  g.fillStyle = '#0f766e'; g.fillRect(P, y, W - 2 * P, 70); tx('মোট পরিশোধ', P + 24, y + 46, F(700, 28), '#fff'); tx('৳ ' + nm2(p.amt), W - P - 24, y + 48, F(800, 38), '#fff', 'right'); y += 100;
  tx('কথায়: ' + numWords(Math.round(p.amt)) + ' টাকা মাত্র', P, y, F(600, 25), '#14231c'); y += 44;
  const s = p.m !== 'adv' ? rtStat(t, p.m) : null; if (s && s.short > 0) { tx('এই মাসের বাকি: ৳ ' + nm2(s.short), P, y, F(700, 25), '#dc2626'); y += 40; } if (L.totalDue > 0) tx('মোট বকেয়া এখন: ৳ ' + nm2(L.totalDue), P, y, F(700, 25), '#dc2626'); else if (L.credit > 0) tx('অগ্রিম জমা: ৳ ' + nm2(L.credit), P, y, F(700, 25), '#1d4ed8');
  padSig(g, W, P, H - 90, PI, 'গ্রহীতার স্বাক্ষর'.replace('গ্রহীতার', 'ভাড়াটিয়ার'));
  const jp = Uint8Array.from(atob(cv.toDataURL('image/jpeg', 0.92).split(',')[1]), c => c.charCodeAt(0));
  try { await lbSaveFile('rosid_' + p.no + '.pdf', pdfMulti([jp], W, H, 595), 'application/pdf', 'ভাড়ার রসিদ'); } catch (e) { alert('রসিদ তৈরি হয়নি।'); }
}
// ---------- বছরের PDF / Excel ----------
function rtExport() { showModal(`<h3 style="margin:0 0 8px">📤 ${bn(rtYm().slice(0, 4))} সালের হিসাব</h3><div style="display:flex;gap:8px"><button class="btn" style="flex:1;background:#b91c1c;margin:0" onclick="closeModal();rtGo('pdf')">📄 PDF</button><button class="btn" style="flex:1;background:#15803d;margin:0" onclick="closeModal();rtGo('xlsx')">📊 Excel</button></div>`); }
async function rtGo(f) { const yr = rtYm().slice(0, 4); try { if (f === 'pdf') await lbSaveFile('rent_' + yr + '.pdf', await rtPdf(yr), 'application/pdf', 'ভাড়ার হিসাব'); else await lbSaveFile('rent_' + yr + '.xlsx', rtXlsx(yr), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'ভাড়ার হিসাব'); } catch (e) { alert('ফাইল তৈরি হয়নি।'); } }
function rtGrid(yr) { const d = rtLoad(), cur = todayISO().slice(0, 7); return d.t.map(t => { const L = rtLedger(t, yr + '-12'), cells = []; for (let m = 1; m <= 12; m++) { const ym = yr + '-' + String(m).padStart(2, '0'), r = L.rows.find(x => x.ym === ym); cells.push(r ? {paid: r.paid, short: ym <= cur ? r.short : 0, st: r.st} : null); } return {t, cells, due: rtLedger(t, cur).totalDue}; }); }
function rtXlsx(yr) {
  const G = rtGrid(yr), S = (v, s) => ({v, s}), r = xlHead('বাড়ি ভাড়ার হিসাব • ' + bn(yr), 15); r.push([S('ভাড়াটিয়া', 3), S('ফ্ল্যাট', 3)].concat(L_MON.map(m => S(m, 3))).concat([S('মোট আদায়', 3)])); const f0 = r.length + 1;
  G.forEach(x => { const n = r.length + 1; r.push([S(x.t.name, 4), S(x.t.unit || '', 4)].concat(x.cells.map(c => S(c ? c.paid : '', 5))).concat([{f: `SUM(C${n}:N${n})`, v: x.cells.reduce((a, c) => a + (c ? c.paid : 0), 0), s: 7}])); });
  const f1 = r.length; r.push([S('মোট', 6), S('', 6)].concat(Array.from({length: 13}, (_, i) => { const c = String.fromCharCode(67 + i); return {f: `SUM(${c}${f0}:${c}${f1})`, v: 0, s: 7}; })));
  const d = rtLoad(), p = d.pay.filter(x => x.d.startsWith(yr)).sort((a, b) => a.d.localeCompare(b.d)), r2 = xlHead('টাকা পাওয়ার তালিকা • ' + bn(yr), 6); r2.push([S('রসিদ নং', 3), S('তারিখ', 3), S('ভাড়াটিয়া', 3), S('মাস', 3), S('পদ্ধতি', 3), S('টাকা', 3)]); const a0 = r2.length + 1;
  p.forEach(x => { const t = d.t.find(y => y.id === x.tid) || {name: '?'}; r2.push([S(x.no, 4), S(x.d, 4), S(t.name, 4), S(x.m === 'adv' ? 'অগ্রিম' : x.m, 4), S(x.meth || '', 4), S(x.amt, 5)]); }); r2.push([S('মোট', 6), S('', 6), S('', 6), S('', 6), S('', 6), {f: `SUM(F${a0}:F${r2.length})`, v: p.reduce((a, x) => a + x.amt, 0), s: 7}]);
  return xl2([{name: 'বার্ষিক', rows: r, w: [18, 14].concat(Array(12).fill(10)).concat([13]), land: true}, {name: 'রসিদ তালিকা', rows: r2, w: [18, 12, 18, 12, 12, 12]}]);
}
async function rtPdf(yr) {
  const G = rtGrid(yr), W = 1754, H = 1240, P = 50, F = (w, s) => `${w} ${s}px "Noto Sans Bengali","Hind Siliguri",sans-serif`; try { await document.fonts.load(F(700, 30), 'ভাড়া'); } catch (e) {} const PI = padOn() ? await padImgs() : null, pages = []; let cv, g, y;
  const np = () => { cv = document.createElement('canvas'); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); pages.push(cv); y = PI ? padDraw(g, W, P, PI) + 10 : 40; };
  const tx = (s, x, yy, f, c, al) => { g.font = f; g.fillStyle = c; g.textAlign = al || 'left'; g.fillText(String(s), x, yy); };
  np(); tx('বাড়ি ভাড়ার হিসাব — ' + bn(yr), P, y + 34, F(800, 34), '#0f766e'); y += 60; const nw = 260, cw = (W - 2 * P - nw - 130) / 12;
  const hd = () => { g.fillStyle = '#0f766e'; g.fillRect(P, y, W - 2 * P, 44); tx('ভাড়াটিয়া', P + 10, y + 31, F(700, 21), '#fff'); L_MON.forEach((m, i) => tx(m, P + nw + i * cw + cw / 2, y + 31, F(700, 19), '#fff', 'center')); tx('বাকি', W - P - 10, y + 31, F(700, 21), '#fff', 'right'); y += 44; }; hd();
  G.forEach((x, k) => { if (y > H - 120) { np(); hd(); } g.fillStyle = k % 2 ? '#f6f8f6' : '#fff'; g.fillRect(P, y, W - 2 * P, 70); tx(x.t.name, P + 10, y + 30, F(700, 21), '#14231c'); tx(x.t.unit || '', P + 10, y + 58, F(500, 17), '#64748b'); x.cells.forEach((c, i) => { const cx = P + nw + i * cw + cw / 2; if (!c) tx('–', cx, y + 44, F(500, 20), '#cbd5e1', 'center'); else if (c.st === 'ok' || c.st === 'ad') tx(nm2(c.paid || 0) || '✔', cx, y + 44, F(700, 19), '#15803d', 'center'); else { tx(c.paid ? nm2(c.paid) : '✖', cx, y + 34, F(700, 19), c.paid ? '#c2410c' : '#dc2626', 'center'); if (c.short) tx('(' + nm2(c.short) + ')', cx, y + 58, F(500, 15), '#dc2626', 'center'); } }); tx(x.due > 0 ? nm2(x.due) : '০', W - P - 10, y + 44, F(800, 21), x.due > 0 ? '#dc2626' : '#15803d', 'right'); y += 70; });
  y += 20; tx('✔/টাকা = পেয়েছি • ✖ = বাকি • ( ) = বাকির পরিমাণ', P, y, F(500, 19), '#64748b'); padSig(g, W, P, H - 70, PI, 'প্রস্তুতকারক');
  pages.forEach((c, i) => { const g2 = c.getContext('2d'); g2.font = F(500, 17); g2.fillStyle = '#6b7a72'; g2.textAlign = 'center'; g2.fillText('আমার ভাই অ্যাপ • পেজ ' + bn(i + 1) + '/' + bn(pages.length), W / 2, H - 14); });
  const jp = pages.map(c => Uint8Array.from(atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), ch => ch.charCodeAt(0))); return pdfMulti(jp, W, H, 842);
}
(function () { const st = document.createElement('style'); st.textContent = `
.rt-h{display:flex;gap:8px;background:linear-gradient(150deg,#0f766e,#115e59);color:#fff;border-radius:18px;padding:12px;margin:6px 0 10px}.rt-h div{flex:1;text-align:center}.rt-h span{display:block;font-size:11.5px;opacity:.85}.rt-h b{font-size:18px}
.rt-c{background:#fff;border:2px solid;border-radius:18px;padding:12px;margin:10px 0;box-shadow:0 2px 8px #0001}.rt-c .top{display:flex;justify-content:space-between;align-items:center;gap:8px}.rt-c .top b{font-size:16.5px}.rt-c small{display:block;color:#64748b;font-size:12px}.rt-c .top span{border-radius:12px;padding:4px 10px;font-weight:800;font-size:12.5px;white-space:nowrap}
.rt-c .am{display:flex;justify-content:space-between;margin:8px 0;font-size:13.5px}.rt-c .bt{display:flex;gap:8px}.rt-c .bt div{flex:1;text-align:center;border-radius:12px;padding:10px 4px;font-weight:800;font-size:13px}
.rt-warn{background:#fef3c7;border:2px solid #fcd34d;color:#92400e;border-radius:12px;padding:8px 12px;margin:6px 0;font-size:13px;font-weight:700}
.rt-g{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:8px 0}.rt-g div{border-radius:12px;padding:8px 2px;text-align:center;font-weight:800;font-size:17px}.rt-g small{display:block;font-size:11px;font-weight:700}
.bt2{display:flex;gap:8px;margin:10px 0}.bt2 div{flex:1;text-align:center;color:#fff;border-radius:14px;padding:13px;font-weight:800;font-size:15px}
`; document.head.appendChild(st); })();

// ---------- প্রবেশ পথ ----------
function p46Init() {
  if (window.__p46) return; window.__p46 = 1;
  const o = window.open_; window.open_ = function (id) { if (id === 'mess' || id === 'rent' || id === 'pad') { push(() => home()); return id === 'mess' ? msPage() : id === 'rent' ? rtPage() : padPage(); } return o.apply(this, arguments); };
  Object.assign(NDQ_B, {mess: ['🍛', 'মেসের মিল', '#ffedd5'], rent: ['🏠', 'বাড়ি ভাড়া', '#ccfbf1']});
  const q = window.ndQ; window.ndQ = function (k) { if (k === 'mess' || k === 'rent') { ndSheetClose(); stack = []; return open_(k); } return q.apply(this, arguments); };
}

// =====================================================================
//  v39: মেস এক পেজ + খাতা নতুন সাজ + পুরো মাসের পেজ + ছোট «আরও»
// =====================================================================
const msR = () => { const y = window.scrollY; msPage(); window.scrollTo(0, y); };
function msInit() {
  const d = msLoad(), t = todayISO(); if (!MS.date) MS.date = t; if (MS.vd !== MS.date || !MS.vals || Object.keys(MS.vals).length !== d.mem.length) {
    const m = msM(d, MS.date.slice(0, 7)), src = m.meals[MS.date] || m.plan[MS.date] || {}; MS.vals = {}; d.mem.forEach(x => { MS.vals[x.n] = src[x.n] != null ? +src[x.n] : 0; }); MS.vd = MS.date; }
}
function msPage() {
  tab = 'home'; const d = msLoad(), ym = msYm(), t = todayISO(); if (!d.mem.length) return msMembers(true);
  if (!MS.date || MS.date.slice(0, 7) !== ym) { MS.date = ym === t.slice(0, 7) ? t : ym + '-01'; MS.vd = ''; } msInit(); const C = msCalc(ym), m = C.m, n = msDays(ym), isF = MS.date > t;
  const days = [[t, 'আজ'], [addDays(t, 1), 'কাল'], [addDays(t, 2), 'পরশু']], single = MS.bt !== 'b', tot = d.mem.reduce((a, x) => a + (MS.vals[x.n] || 0), 0);
  const rows = []; for (let i = 1; i <= n; i++) { const dt = ym + '-' + String(i).padStart(2, '0'); if (m.meals[dt]) rows.push(dt); }
  const net = C.mem.map(x => `<div class="ms-p" onclick="msPerson('${esc(x.n)}')"><b>${esc(x.n)}<small>${nm2(x.meals)} মিল • বাজার ${tk(x.bazar)}</small></b>${msNet(x)}</div>`).join('');
  render(pageHead('🍛 ' + d.title) + `<div class="pad ms"><div class="mon"><span onclick="msMon(-1)">‹</span><b>${msMonName(ym)}</b><span onclick="msMon(1)">›</span></div>
  <div class="ms-s"><div class="sh"><i>১</i>মাসের মোট</div><div class="ms-hero"><div>মোট বাজার<b>${tk(C.tb)}</b></div><div>মোট মিল<b>${nm2(C.tm)}</b></div><div>এক মিলের দাম<b>৳${nm2(C.rate)}</b></div></div></div>
  <div class="ms-s"><div class="sh"><i>২</i>কে কয় মিল খাবে?</div><div class="ms-days">${days.map(x => `<div class="${MS.date === x[0] ? 'on' : ''}" onclick="msDate('${x[0]}')">${x[1]}<small>${bn(+x[0].slice(8))}</small></div>`).join('')}<div class="${days.some(x => x[0] === MS.date) ? '' : 'on'}" onclick="var e=document.getElementById('msdt');e.showPicker?e.showPicker():e.focus()">📅<small>${days.some(x => x[0] === MS.date) ? 'তারিখ' : bn(+MS.date.slice(8))}</small></div></div><input type="date" id="msdt" value="${MS.date}" onchange="msDate(this.value)" style="position:absolute;opacity:0;pointer-events:none;height:0;width:0">
    ${d.mem.map((x, i) => `<div class="ms-mr"><b>${esc(x.n)}</b><div class="ns">${MS_VALS.map(v => `<div class="n${v % 1 ? ' h' : ''}${MS.vals[x.n] === v ? ' on' : ''}" onclick="msSet(${i},${v})">${nm2(v)}</div>`).join('')}<div class="n" onclick="msMore(${i})">${MS_VALS.includes(MS.vals[x.n]) ? 'আরও' : nm2(MS.vals[x.n])}</div></div></div>`).join('')}
    <div class="ms-sv" onclick="msSaveMeal()">✔ ${isF ? 'আগাম মিল' : 'মিল'} সেভ (মোট ${nm2(tot)})</div><div class="ms-ln" style="padding:6px 0 0"><a href="#" onclick="msBulkMeal();return false">⚡ এক চাপে অনেক দিনের মিল লিখুন</a></div></div>
  <div class="ms-s"><div class="sh"><i>৩</i>বাজার লিখুন</div><div class="ms-chips">${d.mem.map(x => `<span class="${MS.who === x.n ? 'on' : ''}" onclick="MS.who='${esc(x.n)}';msR()">${esc(x.n)}</span>`).join('')}</div>
    ${single ? `<div style="display:flex;gap:6px"><input class="inp" id="bz_a" type="number" inputmode="decimal" placeholder="কত টাকা?" style="flex:1.2;margin:4px 0;font-size:18px"><input class="inp" id="bz_d" type="date" value="${todayISO()}" style="flex:1;margin:4px 0"></div><div class="ms-sv" style="background:#16a34a;margin:6px 0" onclick="msBazarSave()">✔ বাজার সেভ</div><div class="ms-ln" style="padding:2px 0"><a href="#" onclick="MS.bt='b';msR();return false">⚡ এক চাপে অনেকগুলো</a></div>`
      : `<textarea class="inp" id="bz_t" rows="6" style="font-size:16px" placeholder="প্রতি লাইনে: তারিখ টাকা&#10;৪ ৭০০&#10;৫ ৫০০" oninput="msBzPrev()"></textarea><div class="hint" id="bz_p"></div><div class="ms-sv" style="background:#16a34a;margin:6px 0" onclick="msBzBulkSave()">✔ সব একসাথে সেভ</div><div class="ms-ln" style="padding:2px 0"><a href="#" onclick="MS.bt='s';msR();return false">একটা করে লিখুন</a></div>`}
    ${MS.who ? msBzList(MS.who) : ''}</div>
  <div class="ms-s"><div class="sh"><i>৪</i>মিলের শিট</div>${rows.length ? `<div class="ms-tw"><table class="ms-tb"><tr><th style="background:#ef4444;color:#fff">তারিখ</th>${d.mem.map(x => `<th>${esc(x.n)}</th>`).join('')}</tr>${rows.map(dt => { const r = m.meals[dt]; return `<tr onclick="msDate('${dt}')"><td>${bn(+dt.slice(8))}</td>${d.mem.map(x => `<td class="${(+r[x.n] || 0) ? '' : 'z'}">${nm2(+r[x.n] || 0)}</td>`).join('')}</tr>`; }).join('')}<tr class="tt"><td>মোট</td>${C.mem.map(x => `<td>${nm2(x.meals)}</td>`).join('')}</tr></table></div><div class="hint">কোনো দিনে চাপলে ওই দিনের মিল উপরে এসে বদলানো যায়।</div>` : '<div class="hint">এখনো কোনো মিল সেভ হয়নি।</div>'}</div>
  <div class="ms-s"><div class="sh"><i>৫</i>কার কত পাওনা / দেনা</div>${net}${C.setl.length ? `<div class="ms-give"><b>💰 কে কাকে দিবে</b>${C.setl.map(s => `<div>👉 ${esc(s.from)} দিবে ${esc(s.to)} কে <b>${tk(s.amt)}</b></div>`).join('')}</div>` : ''}<div class="hint">নিয়ম: মিলের দাম = মোট বাজার ÷ মোট মিল। পাবে/দিবে = (বাজার + মেটানো) − (মিল × দাম)।</div></div>
  <div class="ms-s"><div class="sh"><i>৬</i>ফাইল ও অন্যান্য</div><div class="ms-ex" style="margin:0 0 8px"><div style="background:#b91c1c" onclick="msGo('pdf')">📄 PDF</div><div style="background:#15803d" onclick="msGo('xlsx')">📊 Excel</div></div><div class="ms-ex" style="margin:0"><div style="background:#e0e7ff;color:#3730a3" onclick="msPayForm()">💵 টাকা মেটালাম</div><div style="background:#e0e7ff;color:#3730a3" onclick="msMembers()">👥 সদস্য</div></div></div></div>`);
}
function msMeal(date) { MS.date = date; MS.vd = ''; msPage(); window.scrollTo(0, 0); }
function msDate(dt) { if (!dt) return; MS.date = dt; MS.ym = dt.slice(0, 7); MS.vd = ''; const y = window.scrollY; msPage(); window.scrollTo(0, y); }
function msSet(i, v) { const d = msLoad(); MS.vals[d.mem[i].n] = v; msR(); }
function msMore(i) { const d = msLoad(), v = prompt('কত মিল? (যেমন: ৬ বা ৫.৫)', ''); if (v === null) return; const n = parseFloat(en2(v)); if (!(n >= 0 && n <= 50)) return alert('সঠিক সংখ্যা দিন।'); MS.vals[d.mem[i].n] = Math.round(n * 2) / 2; msR(); }
function msSaveMeal() { const d = msLoad(), m = msM(d, MS.date.slice(0, 7)), o = {}; d.mem.forEach(x => { o[x.n] = MS.vals[x.n] || 0; }); if (MS.date > todayISO()) m.plan[MS.date] = o; else { m.meals[MS.date] = o; } msSave(d); msR(); }
function msBazar() { msPage(); }
function msBazarDraw() { msR(); }
function msBazarSave() { const a = parseFloat(en2(gv('bz_a'))); if (!(a > 0)) return alert('টাকা দিন।'); if (!MS.who) return alert('কে বাজার করল, নাম চাপুন।'); const dt = gv('bz_d') || todayISO(), d = msLoad(), m = msM(d, dt.slice(0, 7)); m.bz.push({id: String(Date.now()), who: MS.who, d: dt, amt: a, note: ''}); msSave(d); MS.ym = dt.slice(0, 7); msR(); }
function msBzBulkSave() { if (!MS.who) return alert('কে বাজার করল, নাম চাপুন।'); const ym = msYm(), r = msBzParse(document.getElementById('bz_t').value, ym); if (!r.length) return alert('কোনো লাইন বোঝা যায়নি।'); const d = msLoad(), m = msM(d, ym); r.forEach((x, i) => m.bz.push({id: String(Date.now()) + i, who: MS.who, d: x.d, amt: x.amt, note: ''})); msSave(d); MS.bt = 's'; msR(); }
function msBzDel(id) { if (!confirm('এটা মুছবেন?')) return; const d = msLoad(), m = msM(d, msYm()); m.bz = m.bz.filter(b => b.id !== id); msSave(d); msR(); }
function msBulkMeal() { push(() => msPage()); const d = msLoad(), ym = msYm(); render(pageHead('⚡ এক চাপে অনেক দিনের মিল') + `<div class="pad ms"><div class="cx"><b>${msMonName(ym)}</b><div class="hint" style="margin:6px 0">প্রতি লাইনে একটি দিন: <b>তারিখ = মিল, মিল, মিল…</b><br>সদস্যের ক্রম: <b>${d.mem.map(x => esc(x.n)).join(' , ')}</b><br>যেমন: <b>৫ = ২, ৩, ২.৫</b> (শিট থেকে কপি করে পেস্ট করলেও হবে)</div><textarea class="inp" id="mb_t" rows="14" style="font-size:15px" oninput="msBulkPrev()"></textarea><div class="hint" id="mb_p"></div><button class="btn" onclick="msBulkSave('${ym}')">💾 সব একসাথে সেভ</button></div></div>`); }
function msBulkPrev() { const ym = msYm(), r = msBulkParse(document.getElementById('mb_t').value, ym), e = document.getElementById('mb_p'); if (e) e.textContent = r.length ? '✔ ' + bn(r.length) + 'টি দিন বোঝা গেছে' : ''; }
function msBulkSave(ym) { const r = msBulkParse(document.getElementById('mb_t').value, ym); if (!r.length) return alert('কোনো লাইন বোঝা যায়নি।'); const d = msLoad(), m = msM(d, ym); r.forEach(x => { m.meals[x[0]] = x[1]; }); msSave(d); MS.ym = ym; MS.vd = ''; stack.pop(); msPage(); }
function msTitle(v) { const d = msLoad(); d.title = v.trim() || 'আমার মেস'; msSave(d); }
(function () { const st = document.createElement('style'); st.textContent = `
.ms-s{background:#fff;border-radius:18px;padding:12px;margin:12px 0;box-shadow:0 1px 6px #0002}.ms-s .sh{font-weight:800;font-size:16px;margin-bottom:8px;display:flex;align-items:center;gap:8px}.ms-s .sh i{font-style:normal;background:#c2410c;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex:none}
.ms-hero{display:flex;gap:6px}.ms-hero div{flex:1;background:#fff7ed;border-radius:12px;text-align:center;padding:8px 2px;font-size:11.5px}.ms-hero b{display:block;font-size:17px;color:#9a3412}
.ms-s .ms-mr{box-shadow:none;background:#faf7f2}
`; document.head.appendChild(st); })();

// ---------- খাতা ----------
function lgSave2() {
  const amt = parseFloat(en2(document.getElementById('la').value)); if (!(amt > 0)) return alert('সঠিক টাকার পরিমাণ দিন।'); const n = new Date();
  const d = document.getElementById('ldt').value || todayISO(), l = ledgerData(); l.entries.push({id: String(Date.now()), date: d, tm: String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'), type: _lt, amt, cat: (document.getElementById('lc').value || '').trim() || (_lt === 'in' ? 'আয়' : 'খরচ'), note: document.getElementById('ln').value.trim()}); saveLedger(l); _lt = 'out'; LG_V = 'home'; ledgerPage();
}
function p47Home(l) {
  const t = todayISO(), inc = lsum(l.entries, 'in'), out = lsum(l.entries, 'out'), cur = lmstat(l, t.slice(0, 7)), prev = lmstat(l, lshift(t.slice(0, 7), -1));
  const sv = l.goals.reduce((a, g) => a + g.saved, 0), cell = (lab, v, col) => `<div><span>${lab}</span><b style="color:${col}">${tk(v)}</b></div>`;
  let es = l.entries.slice().sort((a, b) => (b.date + (b.tm || '') + b.id).localeCompare(a.date + (a.tm || '') + a.id));
  if (LG_F === 'in') es = es.filter(e => e.type === 'in'); else if (LG_F === 'out') es = es.filter(e => e.type === 'out'); else if (LG_F === 'month') es = es.filter(e => e.date.slice(0, 7) === t.slice(0, 7)); else if (LG_F === 'today') es = es.filter(e => e.date === t);
  const more = es.length > 60; es = es.slice(0, 60); const days = []; es.forEach(e => { let g = days[days.length - 1]; if (!g || g.d !== e.date) { g = {d: e.date, a: []}; days.push(g); } g.a.push(e); });
  const list = days.map(g => { const net = lsum(g.a, 'in') - lsum(g.a, 'out'); return `<div class="lx-d"><div class="lx-dh"><span>${g.d === t ? 'আজ • ' : ''}${lgDate(g.d)}</span><b style="color:${net < 0 ? '#dc2626' : '#15803d'}">${net < 0 ? '−' : '+'}${tk(Math.abs(net))}</b></div>` + g.a.map(e => `<div class="lx-e"><div class="ic" style="background:${e.type === 'in' ? '#dcfce7' : '#fee2e2'}">${e.type === 'in' ? '💰' : '🛍️'}</div><div style="flex:1;min-width:0"><b>${esc(e.cat || (e.type === 'in' ? 'আয়' : 'খরচ'))}${e.note ? ' <em>• ' + esc(e.note) + '</em>' : ''}</b><small>${lgTm(e.tm) || '—'}</small></div><span style="color:${e.type === 'in' ? '#15803d' : '#dc2626'}">${e.type === 'in' ? '+' : '−'}${tk(e.amt)}</span><a href="#" onclick="lgDel2('${e.id}');return false">✕</a></div>`).join('') + '</div>'; }).join('');
  return `<div class="lg-sum"><div class="lg3">${cell('মোট আয়', inc, '#15803d')}${cell('মোট খরচ', out, '#dc2626')}${cell('মোট ব্যালেন্স', inc - out, inc - out < 0 ? '#dc2626' : 'inherit')}</div>
    <div class="lg2">${cell('এই মাসের ব্যালেন্স', cur.net, '#b45309')}${cell('গত মাসের ব্যালেন্স', prev.net, '#0e7490')}</div>
    <div class="lg3">${cell('সঞ্চয়', sv, '#be185d')}${cell('দেনা', lgDebtSum(l, 'owe'), '#7e22ce')}${cell('পাওনা', lgDebtSum(l, 'due'), '#7e22ce')}</div></div>
    <div class="lg-bt"><button class="o" onclick="lgNew('out')">👛 খরচ লিখুন ➖</button><button class="i" onclick="lgNew('in')">💰 আয় লিখুন ➕</button></div>
    <div class="lx-b"><div class="sq" onclick="lgGo('more')">⋯<small>আরও</small></div><div style="background:#ede9fe;color:#5b21b6" onclick="lgGo('mfull')">📊 পুরো মাসের হিসাব</div><div style="background:#fee2e2;color:#991b1b" onclick="lgReport()">📤 PDF/Excel</div></div>
    <div class="lg-hh"><b>📒 আয়-খরচের খাতা</b><select onchange="LG_F=this.value;ledgerPage()">${[['all', 'সব'], ['today', 'আজ'], ['month', 'এই মাস'], ['in', 'শুধু আয়'], ['out', 'শুধু খরচ']].map(o => `<option value="${o[0]}" ${LG_F === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
    ${list || '<div class="hint" style="text-align:center;padding:26px 8px">খাতা ফাঁকা। উপরের বাটন দিয়ে লেখা শুরু করুন।</div>'}${more ? '<div class="hint" style="text-align:center">সর্বশেষ ৬০টি দেখানো হচ্ছে।</div>' : ''}
    <div class="lx-big" onclick="lgGo('mfull')">📊 পুরো মাসের হিসাব দেখুন</div>`;
}
function lgMfull(l) {
  const s = lmstat(l, lm), cat = {}, byd = {}; s.es.forEach(e => { const dd = byd[e.date] = byd[e.date] || {i: 0, o: 0}; if (e.type === 'out') { dd.o += e.amt; const k = e.cat || 'অন্যান্য'; cat[k] = (cat[k] || 0) + e.amt; } else dd.i += e.amt; }); if (s.fx) cat['নির্দিষ্ট মাসিক খরচ'] = s.fx;
  const rows = Object.keys(cat).sort((a, b) => cat[b] - cat[a]), mx = Math.max(1, ...rows.map(k => cat[k])), ds = Object.keys(byd).sort(); let run = 0;
  return `<div class="lm" style="display:flex;justify-content:center;gap:14px;align-items:center;margin:4px 0 10px;font-weight:800"><button onclick="lgMonth(-1)">‹</button><b>${lmName(lm)}</b><button onclick="lgMonth(1)">›</button></div>
  <div class="lx-hero">${s.net >= 0 ? 'এই মাসে বাকি' : 'এই মাসে ঘাটতি'}<b>${tk(Math.abs(s.net))}</b><div><span>আয়<b>${tk(s.inc)}</b></span><span>খরচ<b>${tk(s.exp)}</b></span></div></div>
  <div class="lg-card"><b>কোথায় কত খরচ</b>${rows.map(k => `<div class="crow"><span>${esc(k)}</span><div class="cb"><i style="width:${Math.round(cat[k] / mx * 100)}%"></i></div><b>${tk(cat[k])}</b></div>`).join('') || '<div class="hint">এই মাসে খরচ নেই।</div>'}</div>
  <div class="lg-card"><b>দিন অনুযায়ী</b><table class="lx-t"><tr><th>তারিখ</th><th>আয়</th><th>খরচ</th><th>জমা</th></tr>${ds.map(k => { run += byd[k].i - byd[k].o; return `<tr><td>${bn(+k.slice(8))}</td><td style="color:#15803d">${byd[k].i ? tk(byd[k].i) : '–'}</td><td style="color:#dc2626">${byd[k].o ? tk(byd[k].o) : '–'}</td><td>${tk(run)}</td></tr>`; }).join('')}<tr style="font-weight:800;background:#f1f5f9"><td>মোট</td><td>${tk(s.inc)}</td><td>${tk(s.exp)}</td><td>${tk(s.net)}</td></tr></table></div>
  <div class="lx-b"><div style="background:#b91c1c;color:#fff" onclick="lgReport()">📄 PDF / Excel</div></div>`;
}
function lgMore() {
  const T = [['debt', '🤝', 'দেনা-পাওনা'], ['save', '🐷', 'সঞ্চয়'], ['budget', '📋', 'বাজেট'], ['notes', '📝', 'নোট'], ['calc', '🧮', 'ক্যালকুলেটর'], ['sum', '📊', 'মাস-বছরের হিসাব']];
  return `<div class="lg-grid">${T.map(x => `<div onclick="${x[0] === 'notes' ? "open_('notes')" : x[0] === 'calc' ? 'lgCalc()' : `lgGo('${x[0]}')`}"><span>${x[1]}</span>${x[2]}</div>`).join('')}</div>`;
}
function p47Init() {
  if (window.__p47) return; window.__p47 = 1; window.lgHome = p47Home;
  const lp = window.ledgerPage; window.ledgerPage = function () { if (LG_V === 'mfull') { tab = 'home'; const l = ledgerData(), t = todayISO(); if (!lm) lm = t.slice(0, 7); return render(pageHead('📊 পুরো মাসের হিসাব') + `<div class="pad lg"><button class="lg-bk" onclick="lgGo('home')">‹ খাতায় ফিরুন</button>${lgMfull(l)}</div><div class="lg-fab" onclick="lgCalc()">🧮</div>`); } return lp.apply(this, arguments); };
  const hg = window.homeGroups; window.homeGroups = function (inc) { const g = hg.apply(this, arguments); if (g.some(x => x[0].indexOf('আমার ঘর') >= 0)) return g; const ex = [['mess', '🍛', 'মেসের মিল', '#ea580c'], ['rent', '🏠', 'বাড়ি ভাড়া', '#0f766e'], ['pad', '🪪', 'আমার প্যাড', '#475569']].map(x => ({id: x[0], ic: x[1], name: x[2], sub: '', color: x[3]})), c = g.slice(); c.splice(Math.min(2, c.length), 0, ['🏠 আমার ঘর ও কাজ', ex]); return c; };
  const st = document.createElement('style'); st.textContent = `html{scroll-behavior:auto!important}*{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.lx-b{display:flex;gap:8px;margin:8px 0}.lx-b div{flex:1;border-radius:16px;padding:13px 4px;text-align:center;font-weight:800;font-size:14px}.lx-b .sq{flex:none;width:58px;background:#e0f2fe;color:#0369a1;font-size:22px;padding:6px 0;line-height:1.1}.lx-b .sq small{display:block;font-size:10px}
.lx-d{background:#fff;border-radius:16px;margin:8px 0;box-shadow:0 1px 6px #0002;overflow:hidden}.lx-dh{display:flex;justify-content:space-between;background:#eef2ff;padding:8px 12px;font-weight:800;font-size:13.5px}
.lx-e{display:flex;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid #eef}.lx-e .ic{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}.lx-e b{font-size:14.5px;display:block}.lx-e em{font-style:normal;font-weight:500;color:#64748b;font-size:12px}.lx-e small{color:#64748b;font-size:11.5px}.lx-e span{font-weight:800;font-size:15px;white-space:nowrap}.lx-e a{color:#cbd5e1;text-decoration:none;font-size:15px;padding:4px}
.lx-big{background:#6d28d9;color:#fff;border-radius:16px;padding:14px;text-align:center;font-weight:800;margin:12px 0}
.lx-hero{background:linear-gradient(150deg,#6d28d9,#4c1d95);color:#fff;border-radius:20px;padding:14px;text-align:center}.lx-hero>b{font-size:30px;display:block}.lx-hero div{display:flex;gap:6px;margin-top:8px}.lx-hero div span{flex:1;background:#ffffff22;border-radius:12px;padding:6px;font-size:12px}.lx-hero div span b{display:block;font-size:16px}
.lx-t{width:100%;border-collapse:collapse;font-size:12.5px}.lx-t td,.lx-t th{padding:6px 4px;border-bottom:1px solid #eee;text-align:right}.lx-t th{background:#f1f5f9}.lx-t td:first-child,.lx-t th:first-child{text-align:left}`; document.head.appendChild(st);
}

// =====================================================================
//  v40: সব জায়গায় ▾ ভাঁজ (accordion) + রিপোর্ট প্রিভিউ + রিপোর্টে সময়
// =====================================================================
window.ACC = window.ACC || {};
function accH(g, k, title, body, ld) { return `<div class="ac${ACC[g] === k ? ' open' : ''}" data-g="${g}" data-k="${k}"><div class="h" onclick="accT(this)"><span>${title}</span><em class="ar">▾</em></div><div class="b">${body}${ld ? `<div class="pv" data-ld="${ld}"></div>` : ''}</div></div>`; }
function accT(h) {
  const ac = h.parentNode, g = ac.dataset.g, k = ac.dataset.k, was = ac.classList.contains('open');
  document.querySelectorAll('#app .ac[data-g="' + g + '"]').forEach(x => x.classList.remove('open')); ACC[g] = '';
  if (!was) { ac.classList.add('open'); ACC[g] = k; accLoad(ac); setTimeout(() => { const r = ac.getBoundingClientRect(); if (r.top < 70) window.scrollBy(0, r.top - 80); }, 30); }
}
function accLoad(ac) { ac.querySelectorAll('[data-ld]:not([data-ok])').forEach(el => { el.dataset.ok = 1; try { window[el.dataset.ld](el); } catch (e) { el.textContent = 'দেখানো যায়নি।'; } }); }
function accInit() { document.querySelectorAll('#app .ac.open').forEach(accLoad); }
// DOM থেকে বানানো ভাঁজ (মেস ইত্যাদি)
function accDom(root, itemSel, g, defKey) {
  const r = document.querySelector(root); if (!r) return; if (ACC[g] === undefined) ACC[g] = defKey;
  r.querySelectorAll(itemSel).forEach((it, i) => { const k = 'k' + i, h = it.querySelector(':scope > .sh'); if (!h) return; const b = document.createElement('div'); b.className = 'b'; while (h.nextSibling) b.appendChild(h.nextSibling); h.classList.add('h'); h.setAttribute('onclick', 'accT(this)'); h.insertAdjacentHTML('beforeend', '<em class="ar">▾</em>'); it.className = 'ac' + (ACC[g] === k ? ' open' : ''); it.dataset.g = g; it.dataset.k = k; it.appendChild(b); });
}
// ---- প্রিভিউ: PDF-এর ছবি পাতাগুলো সরাসরি দেখানো ----
(function () { const p0 = window.pdfMulti; window.pdfMulti = function (j, w, h, pw) { if (window.__pv) { window.__pv.push.apply(window.__pv, j); return new Uint8Array(0); } return p0.apply(this, arguments); }; })();
let PVU = [];
async function pvImgs(build) { window.__pv = []; try { await build(); } finally { var js = window.__pv; window.__pv = null; } PVU.forEach(u => URL.revokeObjectURL(u)); PVU = js.map(b => URL.createObjectURL(new Blob([b], {type: 'image/jpeg'}))); return PVU; }
async function pvShow(el, build, btns) {
  el.innerHTML = '<div class="hint" style="text-align:center;padding:14px">⏳ রিপোর্ট সাজানো হচ্ছে...</div>';
  try { const u = await pvImgs(build); el.innerHTML = `<div class="pv-i">${u.map(x => `<img src="${x}">`).join('')}</div><div class="hint" style="text-align:center">ফাইল নেওয়ার আগেই এখানে পুরোটা দেখা যাচ্ছে</div>${btns || ''}`; } catch (e) { el.innerHTML = '<div class="hint">প্রিভিউ তৈরি হয়নি।</div>'; }
}
function pvLg(el) { const t = todayISO(); RP = {kind: 'm', ym: lm || t.slice(0, 7), y: +t.slice(0, 4), from: t.slice(0, 8) + '01', to: t}; const d = rpData(); if (!d.es.length) { el.innerHTML = '<div class="hint" style="padding:10px">এই মাসে কোনো হিসাব নেই।</div>'; return; } pvShow(el, () => rpPdf(d), '<div class="ms-ex"><div style="background:#b91c1c" onclick="rpGo(\'pdf\')">📄 PDF</div><div style="background:#15803d" onclick="rpGo(\'xlsx\')">📊 Excel</div></div><div id="rp_m" class="hint"></div>'); }
function pvMs(el) { pvShow(el, () => msPdf(msYm()), '<div class="ms-ex"><div style="background:#b91c1c" onclick="msGo(\'pdf\')">📄 PDF</div><div style="background:#15803d" onclick="msGo(\'xlsx\')">📊 Excel</div></div>'); }
function pvRt(el) { const yr = rtYm().slice(0, 4); pvShow(el, () => rtPdf(yr), '<div class="ms-ex"><div style="background:#b91c1c" onclick="rtGo(\'pdf\')">📄 PDF</div><div style="background:#15803d" onclick="rtGo(\'xlsx\')">📊 Excel</div></div>'); }
// ---- সময় ----
function lgTmOf(e) { if (e.tm) return e.tm; if (/^\d{12,}$/.test(String(e.id))) { const d = new Date(+e.id); if (!isNaN(d)) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } return ''; }
function lgTm(tm) { if (!tm) return ''; const a = tm.split(':').map(Number), h = a[0], m = a[1] || 0, p = h >= 4 && h < 12 ? 'সকাল' : h >= 12 && h < 16 ? 'দুপুর' : h >= 16 && h < 18 ? 'বিকাল' : h >= 18 && h < 20 ? 'সন্ধ্যা' : 'রাত', h12 = h % 12 || 12; return '🕘 ' + p + ' ' + bn(h12) + ':' + bn(String(m).padStart(2, '0')); }
function lgTmPlain(tm) { return lgTm(tm).replace('🕘 ', ''); }
// ---- খাতার নতুন হোম: সব ভাঁজে ----
function p48Home(l) {
  const t = todayISO(), inc = lsum(l.entries, 'in'), out = lsum(l.entries, 'out'), cur = lmstat(l, t.slice(0, 7)), prev = lmstat(l, lshift(t.slice(0, 7), -1));
  const sv = l.goals.reduce((a, g) => a + g.saved, 0), cell = (lab, v, col) => `<div><span>${lab}</span><b style="color:${col}">${tk(v)}</b></div>`;
  if (ACC.lg === undefined) ACC.lg = 'diary';
  let es = l.entries.slice().sort((a, b) => (b.date + (lgTmOf(b)) + b.id).localeCompare(a.date + (lgTmOf(a)) + a.id));
  if (LG_F === 'in') es = es.filter(e => e.type === 'in'); else if (LG_F === 'out') es = es.filter(e => e.type === 'out'); else if (LG_F === 'month') es = es.filter(e => e.date.slice(0, 7) === t.slice(0, 7)); else if (LG_F === 'today') es = es.filter(e => e.date === t);
  const more = es.length > 60; es = es.slice(0, 60); const days = []; es.forEach(e => { let g = days[days.length - 1]; if (!g || g.d !== e.date) { g = {d: e.date, a: []}; days.push(g); } g.a.push(e); });
  const list = days.map(g => { const net = lsum(g.a, 'in') - lsum(g.a, 'out'); return `<div class="lx-d"><div class="lx-dh"><span>${g.d === t ? 'আজ • ' : ''}${lgDate(g.d)}</span><b style="color:${net < 0 ? '#dc2626' : '#15803d'}">${net < 0 ? '−' : '+'}${tk(Math.abs(net))}</b></div>` + g.a.map(e => `<div class="lx-e"><div class="ic" style="background:${e.type === 'in' ? '#dcfce7' : '#fee2e2'}">${e.type === 'in' ? '💰' : '🛍️'}</div><div style="flex:1;min-width:0"><b>${esc(e.cat || (e.type === 'in' ? 'আয়' : 'খরচ'))}${e.note ? ' <em>• ' + esc(e.note) + '</em>' : ''}</b><small>${lgTm(lgTmOf(e)) || '—'}</small></div><span style="color:${e.type === 'in' ? '#15803d' : '#dc2626'}">${e.type === 'in' ? '+' : '−'}${tk(e.amt)}</span><a href="#" onclick="lgDel2('${e.id}');return false">✕</a></div>`).join('') + '</div>'; }).join('');
  const nav = `<div class="lm" style="display:flex;justify-content:center;gap:14px;align-items:center;margin:2px 0 8px;font-weight:800"><button onclick="lgMonth(-1)">‹</button><b>${lmName(lm)}</b><button onclick="lgMonth(1)">›</button></div>`;
  return `<div class="lg-sum"><div class="lg3">${cell('মোট আয়', inc, '#15803d')}${cell('মোট খরচ', out, '#dc2626')}${cell('মোট ব্যালেন্স', inc - out, inc - out < 0 ? '#dc2626' : 'inherit')}</div>
    <div class="lg2">${cell('এই মাসের ব্যালেন্স', cur.net, '#b45309')}${cell('গত মাসের ব্যালেন্স', prev.net, '#0e7490')}</div>
    <div class="lg3">${cell('সঞ্চয়', sv, '#be185d')}${cell('দেনা', lgDebtSum(l, 'owe'), '#7e22ce')}${cell('পাওনা', lgDebtSum(l, 'due'), '#7e22ce')}</div></div>
    <div class="lg-bt"><button class="o" onclick="lgNew('out')">👛 খরচ লিখুন ➖</button><button class="i" onclick="lgNew('in')">💰 আয় লিখুন ➕</button></div>
    <div class="lg-mud" onclick="mdPage()"><span style="font-size:30px">🛒</span><div>মুদির দোকান<small>কী কিনলাম, কত টাকা</small></div></div>
    ${accH('lg', 'diary', '📒 আয়-খরচের খাতা', `<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><select onchange="LG_F=this.value;ledgerPage()">${[['all', 'সব'], ['today', 'আজ'], ['month', 'এই মাস'], ['in', 'শুধু আয়'], ['out', 'শুধু খরচ']].map(o => `<option value="${o[0]}" ${LG_F === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>${list || '<div class="hint" style="text-align:center;padding:20px 8px">খাতা ফাঁকা। উপরের বাটন দিয়ে লেখা শুরু করুন।</div>'}${more ? '<div class="hint" style="text-align:center">সর্বশেষ ৬০টি দেখানো হচ্ছে।</div>' : ''}`)}
    ${accH('lg', 'month', '📊 পুরো মাসের হিসাব', '', 'lgLzMonth')}
    ${accH('lg', 'pv', '📄 রিপোর্ট দেখুন (PDF/Excel-এর আগে)', nav, 'pvLg')}
    ${accH('lg', 'sum', '📆 মাস-বছরের হিসাব', '', 'lgLzSum')}
    ${accH('lg', 'debt', '🤝 দেনা-পাওনা', '', 'lgLzDebt')}${accH('lg', 'save', '🐷 সঞ্চয়', '', 'lgLzSave')}${accH('lg', 'budget', '📋 বাজেট', '', 'lgLzBudget')}
    ${accH('lg', 'note', '📝 নোট', '<button class="btn" onclick="open_(\'notes\')">📝 নোটপ্যাড খুলুন</button>')}${accH('lg', 'calc', '🧮 ক্যালকুলেটর', '<button class="btn" onclick="lgCalc()">🧮 ক্যালকুলেটর খুলুন</button>')}`;
}
// ---- লগ বুক: সব অংশ ভাঁজে ----
function lbFold() {
  try {
    const lb = document.querySelector('#app .lb'); if (!lb) return;
    const mk = (k, t, nodes, open) => { const d = document.createElement('details'); d.className = 'cx lbfold'; if (LBOPEN[k] === undefined ? open : LBOPEN[k]) d.open = true; const s = document.createElement('summary'); s.textContent = t; d.appendChild(s); nodes.forEach(n => d.appendChild(n)); d.addEventListener('toggle', () => { if (d.open) lb.querySelectorAll('details.lbfold').forEach(o => { if (o !== d && o.open) { o.open = false; } }); LBOPEN[k] = d.open; }); return d; };
    const st = lb.querySelector(':scope > .sec-t'); if (st) { const nodes = [], tb = st.nextElementSibling; if (tb && (tb.classList.contains('lb-tw') || tb.classList.contains('hint'))) nodes.push(tb); const d = mk('list', '🚖 ' + st.textContent.trim(), nodes, true); st.replaceWith(d); }
    lb.querySelectorAll(':scope > .cx').forEach(cx => { const b = cx.querySelector(':scope > b'); if (!b) return; const t = b.textContent.trim(), k = t.slice(0, 12), ic = /^মাসিক সারাংশ/.test(t) ? '📊 ' : /^গাড়ির অবস্থা/.test(t) ? '🔧 ' : /^স্বাক্ষর/.test(t) ? '✍ ' : ''; b.remove(); const nodes = []; while (cx.firstChild) nodes.push(cx.removeChild(cx.firstChild)); const d = mk(k, ic + t, nodes, /বদলান/.test(t)); if (cx.id) d.id = cx.id; cx.replaceWith(d); });
  } catch (e) { console.error(e); }
}
function lgLzMonth(el) { el.className = ''; el.innerHTML = lgMfull(ledgerData()); }
function lgLzSum(el) { el.className = ''; const l = ledgerData(); el.innerHTML = `<div class="lhero"><div class="lm"><button onclick="lgMonth(-1)">‹</button><b>${lmName(lm)}</b><button onclick="lgMonth(1)">›</button></div></div>` + lSum(l); }
function lgLzDebt(el) { el.className = ''; el.innerHTML = lgDebtV(ledgerData()); }
function lgLzSave(el) { el.className = ''; el.innerHTML = lSave(ledgerData()); }
function lgLzBudget(el) { el.className = ''; el.innerHTML = lgBudgetV(); }
function p48Init() {
  { const r0 = window.render; window.render = function (html) { const m = String(html).match(/<h2[^>]*>([^<]*)<\/h2>/), same = m && m[1] === window.__rh; window.__rh = m ? m[1] : ''; const r = r0.apply(this, arguments); if (same) window.__rt = 0; return r; }; }
  if (window.__p48) return; window.__p48 = 1; window.lgHome = p48Home;
  const lp = window.ledgerPage; window.ledgerPage = function () { const r = lp.apply(this, arguments); accInit(); return r; };
  const mp = window.msPage; window.msPage = function () { const r = mp.apply(this, arguments); const pad = document.querySelector('#app .pad.ms'); if (pad && pad.querySelector('.ms-s')) { pad.insertAdjacentHTML('beforeend', '<div class="ms-s"><div class="sh"><i>৮</i>👁 রিপোর্ট দেখুন (PDF/Excel-এর আগে)</div><div class="pv" data-ld="pvMs"></div></div>'); accDom('#app .pad.ms', '.ms-s', 'ms', 'k1'); accInit(); } return r; };
  const st = document.createElement('style'); st.textContent = `.ac{background:#fff;border-radius:16px;margin:10px 0;box-shadow:0 1px 6px #0002;border-left:5px solid #b3185c;overflow:hidden}.ac>.h{display:flex;align-items:center;gap:8px;padding:14px;font-weight:800;font-size:15px;cursor:pointer;margin:0}.ac>.h .ar{margin-left:auto;font-style:normal;font-size:14px;transition:transform .15s}.ac.open>.h .ar{transform:rotate(180deg)}.ac>.b{display:none;padding:0 12px 12px}.ac.open>.b{display:block}
.pv-i img{width:100%;border:1px solid #d9dee3;border-radius:6px;margin:6px 0;display:block;background:#fff}.ms-s.ac,.ac.ms-s{padding:0}`; document.head.appendChild(st);
}

// =====================================================================
//  v41: মুদির দোকান + বাড়ি ভাড়া (ভাঁজ, সবার হিসাব, রসিদ হোয়াটসঅ্যাপে) 
// =====================================================================
const MD_DEF = [['চাল', '🍚'], ['ডাল', '🫘'], ['তেল', '🛢️'], ['আলু', '🥔'], ['পেঁয়াজ', '🧅'], ['ডিম', '🥚'], ['চিনি', '🍬'], ['লবণ', '🧂'], ['চা-পাতা', '🍵'], ['দুধ', '🥛'], ['আটা', '🌾'], ['মরিচ', '🌶️']];
let MD = {lines: [], date: '', ym: ''};
function mdCat() { let a = []; try { a = JSON.parse(localStorage.getItem('mudiItems') || '[]'); } catch (e) {} const base = MD_DEF.map(x => x[0]); return base.concat(a.filter(x => !base.includes(x))); }
const mdIc = n => (MD_DEF.find(x => x[0] === n) || [0, '🛒'])[1];
function mdLearn(n) { let a = []; try { a = JSON.parse(localStorage.getItem('mudiItems') || '[]'); } catch (e) {} if (!MD_DEF.some(x => x[0] === n) && !a.includes(n)) { a.push(n); try { localStorage.setItem('mudiItems', JSON.stringify(a.slice(-60))); } catch (e) {} } }
function mdPage() {
  tab = 'home'; if (!MD.date) MD.date = todayISO(); push(() => ledgerPage());
  render(pageHead('🛒 মুদির দোকান') + `<div class="pad md"><div class="md-s"><div class="md-h">কী কিনলেন? চাপুন</div><div class="md-ch">${mdCat().map(n => `<span onclick="mdPick('${esc(n)}')">${mdIc(n)} ${esc(n)}</span>`).join('')}</div><div class="hint">নতুন কিছু লিখলে অ্যাপ মনে রাখবে, পরের বার বাটন হয়ে আসবে।</div></div>
    <div class="md-s"><div class="md-h">🛍️ কেনাকাটা</div><input class="inp" type="date" id="md_d" value="${MD.date}" onchange="MD.date=this.value||MD.date"><div id="md_l"></div>
      <div style="display:flex;gap:6px;margin-top:8px"><input class="inp" id="md_n" placeholder="কী কিনলেন" style="flex:1.5;margin:0"><input class="inp" id="md_q" placeholder="পরিমাণ" style="flex:1;margin:0"><input class="inp" id="md_a" type="number" inputmode="decimal" placeholder="টাকা" style="flex:1;margin:0"></div>
      <div class="md-add" onclick="mdAdd()">➕ লাইন যোগ</div></div>
    <div class="md-tot"><span>মোট</span><b id="md_t">৳০</b></div><div class="md-sv" onclick="mdSave()">✔ খাতায় খরচ লিখে রাখুন</div><div class="ms-ln"><a href="#" onclick="mdHist();return false">📖 মুদির খাতা দেখুন</a></div></div>`); mdLines();
}
function mdPick(n) { const i = document.getElementById('md_n'); if (i) { i.value = n; const q = document.getElementById('md_q'); if (q) q.focus(); } }
function mdLines() { const l = document.getElementById('md_l'), t = document.getElementById('md_t'); if (!l) return; l.innerHTML = MD.lines.map((x, i) => `<div class="md-li"><b>${mdIc(x.n)} ${esc(x.n)}</b><span>${esc(x.q || '')}</span><em>৳${bn(x.a)}</em><a href="#" onclick="mdDel(${i});return false">✕</a></div>`).join('') || '<div class="hint" style="padding:6px 2px">এখনো কিছু যোগ হয়নি।</div>'; if (t) t.textContent = tk(MD.lines.reduce((a, x) => a + x.a, 0)); }
function mdAdd() { const n = gv('md_n'), a = parseFloat(en2(gv('md_a'))); if (!n) return alert('কী কিনলেন লিখুন।'); if (!(a >= 0)) return alert('টাকা দিন।'); MD.lines.push({n, q: gv('md_q'), a}); mdLearn(n); ['md_n', 'md_q', 'md_a'].forEach(i => { const e = document.getElementById(i); if (e) e.value = ''; }); mdLines(); document.getElementById('md_n').focus(); }
function mdDel(i) { MD.lines.splice(i, 1); mdLines(); }
function mdSave() {
  if (document.getElementById('md_n') && gv('md_n') && parseFloat(en2(gv('md_a'))) >= 0) mdAdd(); if (!MD.lines.length) return alert('আগে কিছু যোগ করুন।'); const n = new Date(), l = ledgerData(), tot = MD.lines.reduce((a, x) => a + x.a, 0);
  l.entries.push({id: String(Date.now()), date: MD.date || todayISO(), tm: String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'), type: 'out', amt: tot, cat: 'মুদির দোকান', note: MD.lines.map(x => x.n + (x.q ? ' ' + x.q : '')).join(', '), items: MD.lines}); saveLedger(l); MD.lines = []; stack.pop(); LG_V = 'home'; ledgerPage(); alert('✅ মুদির খরচ খাতায় লেখা হয়েছে।');
}
function mdHist() {
  const ym = MD.ym || todayISO().slice(0, 7); MD.ym = ym; const l = ledgerData(), es = l.entries.filter(e => e.items && e.date.slice(0, 7) === ym).sort((a, b) => (b.date + (lgTmOf(b))).localeCompare(a.date + lgTmOf(a))), by = {}; let tot = 0;
  es.forEach(e => e.items.forEach(x => { by[x.n] = (by[x.n] || 0) + x.a; tot += x.a; })); const ks = Object.keys(by).sort((a, b) => by[b] - by[a]).slice(0, 10), mx = Math.max(1, ...ks.map(k => by[k]));
  push(() => mdPage());
  render(pageHead('📖 মুদির খাতা') + `<div class="pad md"><div class="mon"><span onclick="MD.ym=rtShiftYm(MD.ym,-1);stack.pop();mdHist()">‹</span><b>${lmName(ym)}</b><span onclick="MD.ym=rtShiftYm(MD.ym,1);stack.pop();mdHist()">›</span></div><div class="md-tot" style="background:#16a34a;color:#fff"><span>মুদি খরচ</span><b>${tk(tot)}</b></div>
    <div class="md-s"><div class="md-h">কোন জিনিসে কত গেল</div>${ks.map(k => `<div class="bar2"><u>${mdIc(k)} ${esc(k)}</u><div><i style="width:${Math.round(by[k] / mx * 100)}%"></i></div><b>${tk(by[k])}</b></div>`).join('') || '<div class="hint">এই মাসে কিছু নেই।</div>'}</div>
    ${es.map(e => `<div class="lx-d"><div class="lx-dh"><span>${lgDate(e.date)} ${lgTm(lgTmOf(e))}</span><b style="color:#dc2626">−${tk(e.amt)}</b></div><div class="lx-e" style="display:block;font-size:13px">${e.items.map(x => `${mdIc(x.n)} ${esc(x.n)}${x.q ? ' ' + esc(x.q) : ''} — ${tk(x.a)}`).join('<br>')}</div></div>`).join('')}</div>`);
}
// ---------- বাড়ি ভাড়ার নতুন পেজ ----------
function rtWaText(p) {
  const d = rtLoad(), t = d.t.find(x => x.id === p.tid) || {name: ''}, pad = padGet(), L = rtLedger(t), s = p.m !== 'adv' ? rtStat(t, p.m) : null;
  return `🧾 ভাড়ার রসিদ${pad.name ? ' — ' + pad.name : ''}\nরসিদ নং: ${p.no}\nতারিখ: ${lgDate(p.d)}\nভাড়াটিয়া: ${t.name}${t.unit ? ' (' + t.unit + ')' : ''}\nমাস: ${p.m === 'adv' ? 'অগ্রিম' : lmName(p.m)}\nপরিশোধ: ${p.meth || 'নগদ'}\nজমা: ৳${nm2(p.amt)} (কথায়: ${numWords(Math.round(p.amt))} টাকা মাত্র)\n` + (s && s.short > 0 ? `এই মাসের বাকি: ৳${nm2(s.short)}\n` : '') + (L.totalDue > 0 ? `মোট বকেয়া: ৳${nm2(L.totalDue)}\n` : L.credit > 0 ? `অগ্রিম জমা: ৳${nm2(L.credit)}\n` : '') + `ধন্যবাদ।${pad.owner ? '\n— ' + pad.owner : ''}`;
}
function rtWa(pid) { const d = rtLoad(), p = d.pay.find(x => x.id === pid); if (!p) return; const t = d.t.find(x => x.id === p.tid) || {}; sendMsg(t.ph, rtWaText(p), '📤 ' + (t.name || '') + ' কে রসিদ পাঠান'); }
function rtPaySave() {
  const a = parseFloat(en2(gv('rp_a'))); if (!(a > 0)) return alert('টাকা দিন।'); const d = rtLoad(), t = d.t.find(x => x.id === RT.tid), dt = gv('rp_d') || todayISO(), pad = padGet(); d.seq++;
  const no = (pad.rcPre || 'RC') + '-' + dt.slice(0, 4) + '-' + String(d.seq).padStart(4, '0'), p = {id: String(Date.now()), tid: t.id, m: RT.pm, amt: a, d: dt, meth: RT.meth, no}; d.pay.push(p); rtSave(d);
  stack.pop(); RT.tid = t.id; rtTenantDraw(); setTimeout(() => { if (confirm('✅ সেভ হয়েছে। রসিদ এখনই হোয়াটসঅ্যাপে/মেসেজে পাঠাবেন?')) rtWa(p.id); }, 150);
}
function rtAllGrid() {
  const yr = rtYm().slice(0, 4), G = rtGrid(yr), mk = ['জ', 'ফ', 'মা', 'এ', 'মে', 'জু', 'জু', 'আ', 'সে', 'অ', 'ন', 'ডি'];
  const dot = c => !c ? '<span class="dt" style="background:#e5e7eb;color:#94a3b8">–</span>' : c.st === 'ok' ? '<span class="dt" style="background:#16a34a">✔</span>' : c.st === 'ad' ? '<span class="dt" style="background:#2563eb">●</span>' : c.st === 'pt' ? '<span class="dt" style="background:#f59e0b">⚠</span>' : c.short > 0 ? '<span class="dt" style="background:#dc2626">✖</span>' : '<span class="dt" style="background:#e5e7eb;color:#94a3b8">–</span>';
  const tot = G.reduce((a, x) => a + x.due, 0);
  return `<div class="ms-tw"><table class="ms-tb rtt"><tr><th style="background:#0f766e">নাম</th>${mk.map(m => `<th style="background:#0f766e;color:#fff">${m}</th>`).join('')}<th style="background:#0f766e;color:#fff">বাকি</th></tr>${G.map(x => `<tr onclick="rtTenant('${x.t.id}')"><td>${esc(x.t.name)}</td>${x.cells.map(c => `<td>${dot(c)}</td>`).join('')}<td style="font-weight:800;color:${x.due > 0 ? '#dc2626' : '#15803d'}">${x.due > 0 ? nm2(x.due) : '০'}</td></tr>`).join('')}<tr class="tt"><td>মোট</td><td colspan="12"></td><td>${nm2(tot)}</td></tr></table></div><div class="hint">✔ দিয়েছে • ⚠ আংশিক • ✖ বাকি • ● অগ্রিম থেকে — নামে চাপলে ভাড়াটিয়ার পাতা</div>`;
}
function rtRcList() {
  const d = rtLoad(), ps = d.pay.slice().sort((a, b) => (b.d || '').localeCompare(a.d || '') || b.id.localeCompare(a.id)).slice(0, 40);
  return ps.map(p => { const t = d.t.find(x => x.id === p.tid) || {name: '?'}; return `<div class="rc"><div style="flex:1;min-width:0"><b>${esc(t.name)} • ${p.m === 'adv' ? 'অগ্রিম' : lmName(p.m)}</b><small>${esc(p.no || '')} • ${lgDate(p.d)}</small></div><em>${tk(p.amt)}</em><a onclick="rtReceipt('${p.id}')" title="PDF">📎</a><a onclick="rtWa('${p.id}')" title="হোয়াটসঅ্যাপ">📤</a></div>`; }).join('') || '<div class="hint">এখনো কোনো রসিদ নেই।</div>';
}
function rtPage() {
  tab = 'home'; const d = rtLoad(), ym = rtYm(), cur = todayISO().slice(0, 7), pad = padGet(); if (ACC.rt === undefined) ACC.rt = 'ten';
  let due = 0, got = 0, rest = 0; const cards = d.t.map(t => { const s = rtStat(t, ym), L = rtLedger(t, cur), mo = rtMonthly(t); if (s.st !== 'f') { due += mo; got += s.paid; rest += s.short; } return {t, s, L, mo}; });
  const exp = d.t.filter(t => t.end && daysTo(t.end) <= 30 && daysTo(t.end) >= 0), cols = ['#0f766e', '#d97706', '#7c3aed', '#be185d', '#2563eb', '#475569'];
  const tcards = cards.map((c, i) => { const S = RT_ST[c.s.st], t = c.t, pc = c.mo ? Math.min(100, Math.round(c.s.paid / c.mo * 100)) : 0; return `<div class="rt-c" style="border-color:${S[2]}66"><div class="top" onclick="rtTenant('${t.id}')"><div class="av" style="background:${cols[i % cols.length]}">${esc((t.name || '?').trim().charAt(0).toUpperCase())}</div><div style="flex:1;min-width:0"><b>${esc(t.name)}</b><small>${esc(t.unit || '')}${t.ph ? ' • ' + esc(t.ph) : ''}</small></div><span style="background:${S[1]};color:${S[2]}">${S[0]}</span></div>
      <div class="am"><span>ভাড়া ${tk(c.mo)}</span><span>দিয়েছে ${tk(c.s.paid)}</span></div><div class="pb"><i style="width:${pc}%;background:${c.s.st === 'ok' || c.s.st === 'ad' ? '#16a34a' : c.s.st === 'pt' ? '#f59e0b' : '#dc2626'}"></i></div>
      <div class="am"><span>${c.L.totalDue > 0 ? 'মোট বাকি <b style="color:#dc2626">' + tk(c.L.totalDue) + '</b>' : c.L.credit > 0 ? 'অগ্রিম <b style="color:#1d4ed8">' + tk(c.L.credit) + '</b>' : '<b style="color:#15803d">কোনো বাকি নেই</b>'}</span></div>
      <div class="bt">${c.L.totalDue > 0 ? `<div style="background:#fee2e2;color:#991b1b" onclick="rtTagada('${t.id}')">📩 তাগাদা পাঠান</div>` : ''}<div style="background:#dcfce7;color:#166534" onclick="rtPayForm('${t.id}')">💵 টাকা পেলাম</div></div></div>`; }).join('');
  render(pageHead('🏠 ' + (pad.name || 'বাড়ি ভাড়া')) + `<div class="pad rt"><div class="mon"><span onclick="RT.ym=rtShiftYm(rtYm(),-1);rtPage()">‹</span><b>${lmName(ym)}</b><span onclick="RT.ym=rtShiftYm(rtYm(),1);rtPage()">›</span></div>
    <div class="rt-h"><div><span>ধার্য</span><b>${tk(due)}</b></div><div><span>আদায়</span><b style="color:#86efac">${tk(got)}</b></div><div><span>বাকি</span><b style="color:#fca5a5">${tk(rest)}</b></div></div>
    ${exp.map(t => `<div class="rt-warn">⏰ ${esc(t.name)}-এর চুক্তি শেষ ${bn(daysTo(t.end))} দিনে (${lgDate(t.end)})</div>`).join('')}
    ${accH('rt', 'ten', `🏠 ভাড়াটিয়া (${bn(d.t.length)} জন)`, (tcards || '<div class="hint" style="text-align:center;padding:14px">এখনো কোনো ভাড়াটিয়া নেই।</div>') + '<div class="ms-sv" style="background:#0f766e;margin:8px 0 0" onclick="rtEdit(\'\')">➕ নতুন ভাড়াটিয়া</div>')}
    ${accH('rt', 'all', '📊 সবার হিসাব একসাথে', rtAllGrid())}${accH('rt', 'pv', '📄 রিপোর্ট দেখুন (PDF/Excel-এর আগে)', '', 'pvRt')}${accH('rt', 'rc', '🧾 সব রসিদ (📎 PDF • 📤 হোয়াটসঅ্যাপ)', rtRcList())}
    ${accH('rt', 'rem', '🔔 রিমাইন্ডার', '<button class="btn" onclick="rtRem()">🔔 রিমাইন্ডার ঠিক করুন</button>')}${accH('rt', 'pad', '🪪 আমার প্যাড', '<button class="btn" onclick="open_(\'pad\')">🪪 প্যাড খুলুন</button>')}</div>`); accInit();
}
function p49Init() {
  if (window.__p49) return; window.__p49 = 1;
  const st = document.createElement('style'); st.textContent = `
.md-s{background:#fff;border-radius:16px;padding:12px;margin:10px 0;box-shadow:0 1px 6px #0002}.md-h{font-weight:800;margin-bottom:6px;font-size:14.5px}.md-ch{display:flex;flex-wrap:wrap;gap:6px}.md-ch span{background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:8px 12px;font-weight:800;font-size:13.5px}
.md-li{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px dashed #d9e8d9;font-size:14px}.md-li b{flex:1}.md-li span{color:#64748b;font-size:12px}.md-li em{font-style:normal;font-weight:800}.md-li a{color:#dc2626;text-decoration:none}
.md-add{background:#e8f5e9;color:#15803d;text-align:center;border-radius:12px;padding:10px;font-weight:800;margin-top:8px}.md-tot{display:flex;justify-content:space-between;align-items:center;background:#dcfce7;border-radius:14px;padding:12px;font-weight:800;color:#166534;font-size:15px}.md-tot b{font-size:20px}.md-sv{background:#16a34a;color:#fff;text-align:center;border-radius:16px;padding:14px;font-weight:800;font-size:16px;margin-top:10px}
.bar2{display:flex;align-items:center;gap:6px;margin:6px 0;font-size:12.5px;font-weight:700}.bar2 u{text-decoration:none;width:84px}.bar2 div{flex:1;height:11px;background:#e5e7eb;border-radius:6px}.bar2 i{display:block;height:100%;background:#16a34a;border-radius:6px}
.lg-mud{display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border-radius:18px;padding:14px;margin:10px 50px;font-weight:800;font-size:17px;box-shadow:0 4px 12px #15803d55}.lg-mud small{display:block;font-size:11px;font-weight:600;opacity:.9}
.rt-c .top{display:flex;gap:10px;align-items:center}.rt-c .av{width:42px;height:42px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex:none}.rt-c .pb{height:8px;background:#e5e7eb;border-radius:5px;margin:2px 0 6px}.rt-c .pb i{display:block;height:100%;border-radius:5px}
.rtt td,.rtt th{padding:5px 1px;font-size:11px}.rtt td:first-child{font-size:12px;position:static;background:#fff}.dt{display:inline-block;width:17px;height:17px;border-radius:5px;font-size:10px;line-height:17px;color:#fff;font-weight:800}
.rc{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #eee}.rc b{display:block;font-size:13px}.rc small{color:#64748b;font-size:11px}.rc em{font-style:normal;font-weight:800;font-size:13px}.rc a{font-size:19px;padding:2px 4px}`; document.head.appendChild(st);
}

// =====================================================================
//  v42: রঙিন ভাঁজ • রঙিন ট্যাপ-করা হিসাব • অটো রিমাইন্ডার • হোমে ৮টি গ্রুপ
// =====================================================================
const ACCCOL = {
  'lg:diary': ['#ea580c', '#ffedd5'], 'lg:month': ['#7c3aed', '#ede9fe'], 'lg:pv': ['#dc2626', '#fee2e2'], 'lg:sum': ['#0891b2', '#cffafe'], 'lg:debt': ['#2563eb', '#dbeafe'], 'lg:save': ['#db2777', '#fce7f3'], 'lg:budget': ['#16a34a', '#dcfce7'], 'lg:note': ['#475569', '#e2e8f0'], 'lg:calc': ['#475569', '#e2e8f0'],
  'rt:ten': ['#0f766e', '#ccfbf1'], 'rt:all': ['#7c3aed', '#ede9fe'], 'rt:pv': ['#dc2626', '#fee2e2'], 'rt:rc': ['#2563eb', '#dbeafe'], 'rt:rem': ['#d97706', '#fef3c7'], 'rt:pad': ['#475569', '#e2e8f0']
};
const ACCSEQ = [['#16a34a', '#dcfce7'], ['#ea580c', '#ffedd5'], ['#2563eb', '#dbeafe'], ['#7c3aed', '#ede9fe'], ['#db2777', '#fce7f3'], ['#0891b2', '#cffafe'], ['#dc2626', '#fee2e2']];
const LBCOL = [[/সময়/, 0], [/চালক|গাড়ি নং|গাড়ির তথ্য/, 1], [/নতুন/, 2], [/ট্রিপ|যাত্রা|তালিকা|🚖/, 3], [/সারাংশ/, 4], [/অবস্থা/, 6], [/স্বাক্ষর/, 5]];
const LBSEQ = [['#2563eb', '#dbeafe'], ['#0f766e', '#ccfbf1'], ['#16a34a', '#dcfce7'], ['#ea580c', '#ffedd5'], ['#7c3aed', '#ede9fe'], ['#475569', '#e2e8f0'], ['#dc2626', '#fee2e2']];
function accPaint() {
  document.querySelectorAll('#app .ac[data-g]').forEach(a => { if (a.dataset.pt) return; const g = a.dataset.g, k = a.dataset.k; let c = ACCCOL[g + ':' + k]; if (!c && g === 'ms') c = ACCSEQ[(parseInt(String(k).slice(1)) || 0) % 7]; if (c) { a.style.setProperty('--c', c[0]); a.style.setProperty('--b', c[1]); a.dataset.pt = 1; } });
  document.querySelectorAll('#app details.lbfold').forEach((d, i) => { if (d.dataset.pt) return; const t = (d.querySelector('summary') || {}).textContent || '', m = LBCOL.find(x => x[0].test(t)), c = LBSEQ[m ? m[1] : i % 7]; d.style.setProperty('--c', c[0]); d.style.setProperty('--b', c[1]); d.dataset.pt = 1; });
}
// ---------- খাতার রঙিন হিসাব-বাক্স ----------
function lgSumHtml(l) {
  const t = todayISO(), inc = lsum(l.entries, 'in'), out = lsum(l.entries, 'out'), cur = lmstat(l, t.slice(0, 7)), prev = lmstat(l, lshift(t.slice(0, 7), -1)), sv = l.goals.reduce((a, g) => a + g.saved, 0);
  const c = (lab, v, col, k) => `<div class="lt" style="background:${col}"${k ? ` onclick="lgTile('${k}')"` : ''}><span>${lab}${k ? ' ▸' : ''}</span><b>${tk(v)}</b></div>`;
  return `<div class="lgS"><div class="g3">${c('মোট আয়', inc, '#16a34a', 'in')}${c('মোট খরচ', out, '#f97316', 'out')}${c('ব্যালেন্স', inc - out, '#475569')}</div><div class="g2">${c('এই মাস', cur.net, '#d97706')}${c('গত মাস', prev.net, '#0e7490')}</div><div class="g3">${c('সঞ্চয়', sv, '#db2777', 'save')}${c('দেনা', lgDebtSum(l, 'owe'), '#7c3aed', 'owe')}${c('পাওনা', lgDebtSum(l, 'due'), '#2563eb', 'due')}</div></div>`;
}
function lgTile(k) {
  const l = ledgerData(), t = todayISO(), cl = {out: '#f97316', in: '#16a34a', owe: '#7c3aed', due: '#2563eb', save: '#db2777'}[k], tt = {out: '👛 মোট খরচ — কোথায় গেল', in: '💰 মোট আয়', owe: '🤲 দেনা — কাকে দেব', due: '🤝 পাওনা — কার কাছে পাব', save: '🐷 সঞ্চয়'}[k];
  push(() => ledgerPage()); let b = '';
  const row = e => `<div class="lx-e"><div class="ic" style="background:${e.type === 'in' ? '#dcfce7' : '#fee2e2'}">${e.type === 'in' ? '💰' : '👛'}</div><div style="flex:1;min-width:0"><b>${esc(e.cat || 'অন্যান্য')}</b><small>${lgDate(e.date)} ${lgTm(lgTmOf(e))}${e.note ? ' • ' + esc(e.note) : ''}</small></div><span style="color:${e.type === 'in' ? '#15803d' : '#dc2626'}">${tk(e.amt)}</span></div>`;
  const srt = a => a.slice().sort((x, y) => (y.date + lgTmOf(y) + y.id).localeCompare(x.date + lgTmOf(x) + x.id));
  if (k === 'out' || k === 'in') {
    const es = l.entries.filter(e => e.type === k), by = {}; es.forEach(e => by[e.cat || 'অন্যান্য'] = (by[e.cat || 'অন্যান্য'] || 0) + e.amt); const ks = Object.keys(by).sort((a, c) => by[c] - by[a]), tot = es.reduce((a, e) => a + e.amt, 0), mx = Math.max(1, ...ks.map(x => by[x]));
    b = `<div class="lt" style="background:${cl};margin:6px 0"><span>${k === 'out' ? 'মোট খরচ' : 'মোট আয়'}</span><b>${tk(tot)}</b></div>` + (ks.length ? `<div class="md-s"><div class="md-h">${k === 'out' ? 'কোথায় কত গেল' : 'কোথা থেকে কত এল'}</div>${ks.map(x => `<div class="bar2"><u>${esc(x)}</u><div><i style="width:${Math.round(by[x] / mx * 100)}%;background:${cl}"></i></div><b>${tk(by[x])}</b></div>`).join('')}</div>` : '') + `<div class="md-h" style="margin:10px 2px 2px">সাম্প্রতিক ${k === 'out' ? 'খরচ' : 'আয়'}</div><div class="lx-d">${srt(es).slice(0, 30).map(row).join('') || '<div class="hint" style="padding:10px">কিছু নেই।</div>'}</div>`;
  } else if (k === 'owe' || k === 'due') {
    const ds = lgDebts(l).map(d => dbCalc(d)).filter(d => d.type === k && d.amt - (d.paid || 0) > 0).sort((a, c) => (c.amt - c.paid) - (a.amt - a.paid));
    b = `<div class="lt" style="background:${cl};margin:6px 0"><span>${k === 'owe' ? 'মোট দেনা' : 'মোট পাওনা'}</span><b>${tk(lgDebtSum(l, k))}</b></div>` + (ds.map(d => `<div class="lx-d" onclick="lgDebtGo('${d.id}')"><div class="lx-e"><div class="ic" style="background:${cl}22">👤</div><div style="flex:1"><b>${esc(d.name || d.who || 'নাম নেই')}</b><small>${d.rem && d.rem.d ? 'ফেরত: ' + lgDate(d.rem.d) : ''}</small></div><span style="color:${cl}">${tk(d.amt - (d.paid || 0))} ›</span></div></div>`).join('') || '<div class="hint" style="padding:12px;text-align:center">কেউ নেই 🎉</div>');
  } else {
    b = `<div class="lt" style="background:${cl};margin:6px 0"><span>মোট সঞ্চয়</span><b>${tk(l.goals.reduce((a, g) => a + g.saved, 0))}</b></div>` + (l.goals.map(g => { const pc = g.target ? Math.min(100, Math.round(g.saved / g.target * 100)) : 0; return `<div class="md-s"><div style="display:flex;justify-content:space-between"><b>🎯 ${esc(g.n)}</b><b>${tk(g.saved)}${g.target ? ' / ' + tk(g.target) : ''}</b></div><div class="bar2"><div style="flex:1"><i style="width:${pc}%;background:${cl}"></i></div><b>${bn(pc)}%</b></div></div>`; }).join('') || '<div class="hint" style="padding:12px;text-align:center">এখনো কোনো লক্ষ্য নেই।</div>') + `<div class="ms-sv" style="background:${cl}" onclick="stack.pop();ACC.lg='save';LG_V='home';ledgerPage()">🐷 সঞ্চয় পাতায় যান</div>`;
  }
  render(pageHead(tt) + `<div class="pad">${b}</div>`);
}
function lgDebtGo(id) { stack.pop(); LG_V = 'debt'; LG_DP = id; ledgerPage(); }
// ---------- অটো রিমাইন্ডার ----------
const ARM_DEF = {exp: {on: false, tm: '21:00'}, mess: {on: false, tm: '08:00', m28: true}, rent: {on: false, day: 5, tm: '10:00', end: true}, debt: {on: false}, save: {on: false, day: 1}, bud: {on: false}};
function armGet() { let a = {}; try { a = JSON.parse(localStorage.getItem('arm') || '{}'); } catch (e) {} const o = {}; Object.keys(ARM_DEF).forEach(k => o[k] = Object.assign({}, ARM_DEF[k], a[k] || {})); o.bk = Object.assign({on: false}, a.bk || {}); o.ids = a.ids || []; o.bn = a.bn || ''; return o; }
function armPut(a) { try { localStorage.setItem('arm', JSON.stringify(a)); } catch (e) {} }
const hm = s => { const p = String(s || '09:00').split(':').map(Number); return {hour: p[0] || 0, minute: p[1] || 0}; };
async function armSched() {
  const ln = LNP(); if (!ln) return 'web'; const a = armGet();
  try { if (a.ids.length) await ln.cancel({notifications: a.ids.map(id => ({id}))}); } catch (e) {}
  const ns = [], nid = s => notifId('arm:' + s), ex = k => ({arm: k});
  if (a.exp.on) ns.push({id: nid('exp'), title: '📒 আমার ভাই', body: 'আজকের খরচ লিখেছেন?', schedule: {on: hm(a.exp.tm), allowWhileIdle: true}, extra: ex('exp')});
  if (a.mess.on) { ns.push({id: nid('mess'), title: '🍛 মেস', body: 'আজ মিল বলুন', schedule: {on: hm(a.mess.tm), allowWhileIdle: true}, extra: ex('mess')}); if (a.mess.m28) ns.push({id: nid('m28'), title: '🍛 মেস', body: 'মাস শেষ — হিসাব মিলিয়ে নিন', schedule: {on: Object.assign({day: 28}, hm('09:00')), allowWhileIdle: true}, extra: ex('mess')}); }
  if (a.rent.on) { ns.push({id: nid('rent'), title: '🏠 বাড়ি ভাড়া', body: 'আজ ভাড়া তোলার দিন', schedule: {on: Object.assign({day: +a.rent.day || 5}, hm(a.rent.tm)), allowWhileIdle: true}, extra: ex('rent')}); if (a.rent.end) rtLoad().t.filter(t => t.end).forEach(t => { const e = new Date(t.end + 'T09:00:00'); e.setDate(e.getDate() - 30); if (e > new Date()) ns.push({id: nid('re' + t.id), title: '🏠 চুক্তি শেষ হচ্ছে', body: t.name + '-এর চুক্তি ৩০ দিনে শেষ', schedule: {at: e, allowWhileIdle: true}, extra: ex('rent')}); }); }
  if (a.debt.on) lgDebts(ledgerData()).forEach(d => { if (!d.rem || !d.rem.d) return; const tm = hm(d.rem.tm || '09:00'), who = d.name || d.who || '', ty = d.type === 'owe' ? 'দেওয়ার' : 'পাওয়ার'; [[-1, 'কাল ' + who + '-এর টাকা ' + ty + ' দিন'], [0, 'আজ ' + who + '-এর টাকা ' + ty + ' দিন']].forEach(x => { const e = new Date(d.rem.d + 'T00:00:00'); e.setDate(e.getDate() + x[0]); e.setHours(tm.hour, tm.minute, 0, 0); if (e > new Date()) ns.push({id: nid('d' + d.id + x[0]), title: '🤝 দেনা-পাওনা', body: x[1], schedule: {at: e, allowWhileIdle: true}, extra: ex('debt')}); }); });
  if (a.bk && a.bk.on) ns.push({id: nid('bk'), title: '💾 ব্যাকআপ', body: 'সপ্তাহের ব্যাকআপ নেওয়ার সময়', schedule: {on: {weekday: 7, hour: 10, minute: 0}, allowWhileIdle: true}, extra: ex('bk')});
  if (a.save.on) ns.push({id: nid('save'), title: '🐷 সঞ্চয়', body: 'আজ সঞ্চয় জমানোর দিন', schedule: {on: Object.assign({day: +a.save.day || 1}, hm('09:00')), allowWhileIdle: true}, extra: ex('save')});
  a.ids = ns.map(n => n.id); armPut(a);
  if (!ns.length) return 'off';
  try { const p = await ln.requestPermissions(); if (p.display !== 'granted') return 'denied'; await ln.schedule({notifications: ns}); return 'ok'; } catch (e) { return 'err'; }
}
async function armSet(k, f, v) {
  const a = armGet(); a[k][f] = v; armPut(a); const r = await armSched();
  if (f === 'on' && v) toast_(r === 'web' ? '✅ চালু। নোটিফিকেশন শুধু ফোনের অ্যাপে (APK) আসবে' : r === 'denied' ? '⚠️ ফোনের সেটিংসে নোটিফিকেশন অনুমতি দিন' : '🔔 রিমাইন্ডার চালু');
  document.querySelectorAll('.arm-sw[data-k="' + k + '"] input').forEach(i => { i.checked = !!a[k].on; });
}
function toast_(t) { try { if (window.toastMsg) return toastMsg(t); } catch (e) {} const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 16px;border-radius:20px;z-index:99999;font-size:13.5px;max-width:86%;text-align:center'; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
const swH = (k, on) => `<label class="sw"><input type="checkbox" ${on ? 'checked' : ''} onchange="armSet('${k}','on',this.checked)"><i></i></label>`;
function armSw(k) { const a = armGet(); return `<div class="arm-sw" data-k="${k}"><span>🔔 রিমাইন্ডার</span>${swH(k, a[k].on)}<a onclick="open_('remind')">সব ›</a></div>`; }
function armHtml() {
  const a = armGet(), r = (k, ic, col, t, sub, extra) => `<div class="arm-r" style="border-left-color:${col}"><div class="ai" style="background:${col}22">${ic}</div><div style="flex:1;min-width:0"><b>${t}</b><small>${sub}</small>${extra || ''}</div>${swH(k, a[k].on)}</div>`;
  const tm = (k, f) => `<input type="time" value="${a[k][f]}" onchange="armSet('${k}','${f}',this.value)">`, dy = k => `<select onchange="armSet('${k}','day',+this.value)">${Array.from({length: 28}, (_, i) => `<option value="${i + 1}" ${+a[k].day === i + 1 ? 'selected' : ''}>${bn(i + 1)} তারিখ</option>`).join('')}</select>`;
  return `<div class="cx" style="padding:12px"><b style="font-size:15px">🔔 অটো রিমাইন্ডার</b><div class="hint">যেটা দরকার সেটার সুইচ চালু করুন। মনে করিয়ে দেবে — ট্যাপ করলে ঠিক পাতাটি খুলবে।</div>
  ${r('exp', '📒', '#ea580c', 'খরচ লেখার রিমাইন্ডার', 'রোজ "আজকের খরচ লিখেছেন?"', tm('exp', 'tm'))}
  ${r('mess', '🍛', '#c2410c', 'মেস — আজ মিল বলুন', 'রোজ + মাসের ২৮ তারিখ হিসাব মেলানো', tm('mess', 'tm') + `<label class="ck"><input type="checkbox" ${a.mess.m28 ? 'checked' : ''} onchange="armSet('mess','m28',this.checked)"> ২৮ তারিখের রিমাইন্ডারও</label>`)}
  ${r('rent', '🏠', '#0f766e', 'বাড়ি ভাড়া', 'ভাড়া তোলার দিন + চুক্তি শেষের ৩০ দিন আগে', dy('rent') + tm('rent', 'tm') + `<label class="ck"><input type="checkbox" ${a.rent.end ? 'checked' : ''} onchange="armSet('rent','end',this.checked)"> চুক্তি শেষের রিমাইন্ডার</label>`)}
  ${r('debt', '🤝', '#2563eb', 'দেনা-পাওনা', 'ফেরতের ১ দিন আগে আর সেই দিনে (ফেরতের তারিখ দেওয়া থাকলে)')}
  ${r('save', '🐷', '#db2777', 'সঞ্চয়', 'প্রতি মাসে জমানোর দিন', dy('save'))}
  ${r('bud', '📋', '#16a34a', 'বাজেট সতর্কতা', 'মাসের বাজেটের ৮০% খরচ হলে জানাবে')}
  <div class="hint" style="margin-top:8px">📱 নোটিফিকেশন শুধু অ্যাপে (APK) আসে। অন্যের ফোনে (ভাড়াটিয়া/দেনাদার) পাঠাতে এসএমএস/হোয়াটসঅ্যাপের লেখা ব্যবহার হয়।</div></div>`;
}
async function armBudget() {
  try {
    const a = armGet(); if (!a.bud.on) return; const l = ledgerData(), b = +l.budget || 0; if (!(b > 0)) return; const ym = todayISO().slice(0, 7), s = lmstat(l, ym), out = s.out != null ? s.out : lsum(l.entries.filter(e => e.date.slice(0, 7) === ym), 'out');
    if (out < b * 0.8 || a.bn === ym) return; a.bn = ym; armPut(a); const pc = Math.round(out / b * 100), msg = 'এই মাসের বাজেটের ' + bn(pc) + '% খরচ হয়ে গেছে';
    const ln = LNP(); if (ln) { const p = await ln.requestPermissions(); if (p.display === 'granted') await ln.schedule({notifications: [{id: notifId('arm:bud'), title: '📋 বাজেট সতর্কতা', body: msg, schedule: {at: new Date(Date.now() + 1500)}, extra: {arm: 'bud'}}]}); } else toast_('📋 ' + msg);
  } catch (e) {}
}
function armGo(k) {
  stack = []; if (k === 'bk') return open_('safe');
  if (k === 'exp') { open_('ledger'); return setTimeout(() => lgNew('out'), 150); }
  if (k === 'mess') return open_('mess'); if (k === 'rent') return open_('rent');
  if (k === 'debt') { LG_V = 'debt'; return open_('ledger'); }
  if (k === 'save') { ACC.lg = 'save'; LG_V = 'home'; return open_('ledger'); } if (k === 'bud') { ACC.lg = 'budget'; LG_V = 'home'; return open_('ledger'); }
}
// ---------- হোমের ৮টি গ্রুপ ----------
const HG = [
  ['jobs', '💼', 'চাকরি ও প্রস্তুতি', '#2563eb', ['job', 'circ', 'intjob', 'paper', 'govguide', 'jobprep', 'cv'], ['gov']],
  ['gov', '🏛️', 'সরকারি চাকরির পড়াশোনা', '#7c3aed', ['govqa', 'bangla', 'math', 'english', 'gk', 'hist'], []],
  ['lic', '🪪', 'লাইসেন্স ও পরীক্ষা', '#0891b2', ['licguide', 'test', 'signs', 'signquiz', 'roadtest', 'police', 'idp', 'book', 'road'], []],
  ['car', '🚗', 'গাড়ি চেনা ও চালানো', '#ea580c', ['learn', 'parts', 'warn', 'cockpit', 'care', 'hacks', 'lessons'], []],
  ['home', '🏠', 'আমার ঘর ও কাজ', '#0f766e', ['mess', 'rent', 'pad', 'ledger'], []],
  ['khata', '📒', 'আমার খাতা', '#16a34a', ['logbook', 'ledger', 'remind', 'safe', 'sos', 'links'], []],
  ['com', '💬', 'কমিউনিটি ও যোগাযোগ', '#db2777', ['board', 'community', 'seeker', 'maker', 'contact', 'qorder', 'notes', 'tools', 'viewset'], []],
  ['col', '📌', 'আমার সংগ্রহ', '#475569', [], []]
];
function hgBuild() {
  const gs = homeGroups(), all = {safe: {id: 'safe', ic: '🔒', name: 'সুরক্ষা ও ব্যাকআপ', sub: '', color: '#0f766e'}}; gs.forEach(g => g[1].forEach(c => { if (!all[c.id]) all[c.id] = c; })); const used = {}, out = [];
  HG.forEach(h => { let ids = h[4].filter(id => all[id] && !(h[0] === 'khata' && id === 'ledger' && false)); out.push({k: h[0], ic: h[1], n: h[2], col: h[3], tiles: ids.map(id => all[id]), sub: h[5]}); });
  // একই টাইল দুই জায়গায় না: প্রথম যেখানে পেয়েছে
  const seen = new Set(['job', 'mess', 'logbook', 'ledger'].filter(id => !tileOv(id).hide)); out.forEach(o => { o.tiles = o.tiles.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; }); });
  const col = out[out.length - 1]; Object.keys(all).forEach(id => { if (!seen.has(id) && id !== 'home') col.tiles.push(all[id]); });
  return out;
}
function hgCards() {
  const o = hgBuild(); return `<div class="hgh">সব বিভাগ</div><div class="hg">${o.filter(x => x.tiles.length || x.k !== 'col').map(x => `<div class="hgc" style="background:linear-gradient(135deg,${x.col},${x.col}cc)" onclick="hgOpen('${x.k}')"><span class="hi">${x.ic}</span><b>${x.n}</b><em>${bn(x.tiles.length)}</em></div>`).join('')}</div><div style="height:14px"></div>`;
}
function hgOpen(k) {
  const o = hgBuild(), x = o.find(y => y.k === k); if (!x) return; push(() => home()); tab = 'home';
  const subs = x.sub.map(s => o.find(y => y.k === s)).filter(Boolean);
  render(pageHead(x.ic + ' ' + x.n) + `<div class="pad"><div class="tgrid">${subs.map(s => `<div class="tile" onclick="hgOpen('${s.k}')"><div class="ti" style="background:${s.col}26">${s.ic}</div><span>${s.n}</span></div>`).join('')}${x.tiles.map(tile).join('')}</div>${x.tiles.length || subs.length ? '' : '<div class="hint" style="text-align:center;padding:20px">এখনো কিছু নেই।</div>'}</div>`);
}
function p50Init() {
  if (window.__p50) return; window.__p50 = 1;
  const lh = window.lgHome; window.lgHome = function (l) { const h = lh.apply(this, arguments), i = h.indexOf('<div class="lg-bt">'); return i < 0 ? h : lgSumHtml(l) + h.slice(i); };
  const rd = window.render; window.render = function () { const r = rd.apply(this, arguments); try { requestAnimationFrame(accPaint); } catch (e) {} return r; };
  const addSw = (fn, k) => { const f = window[fn]; if (!f) return; window[fn] = function () { const r = f.apply(this, arguments); try { if (k !== 'exp' || LG_V === 'home' || !LG_V) { const p = document.querySelector('#app .pad') || document.querySelector('#app'); if (p && !p.querySelector('.arm-sw')) p.insertAdjacentHTML('afterbegin', armSw(k)); } } catch (e) {} return r; }; };
  addSw('ledgerPage', 'exp'); addSw('msPage', 'mess'); addSw('rtPage', 'rent');
  const rp = window.remindPage; window.remindPage = function () { const r = rp.apply(this, arguments); try { const p = document.querySelector('#app .pad') || document.querySelector('#app'); if (p) p.insertAdjacentHTML('afterbegin', armHtml()); } catch (e) {} return r; };
  const sl = window.saveLedger; window.saveLedger = function () { const r = sl.apply(this, arguments); setTimeout(armBudget, 300); return r; };
  const hm0 = window.home; const hgSplit = () => { };
  try { const ln = LNP(); if (ln && ln.addListener) ln.addListener('localNotificationActionPerformed', e => { const x = e && e.notification && e.notification.extra; if (x && x.arm) armGo(x.arm); }); } catch (e) {}
  setTimeout(() => { armSched(); armBudget(); }, 3500);
  const st = document.createElement('style'); st.textContent = `
.ac{border-left-color:var(--c,#b3185c)!important}.ac>.h{background:var(--b,transparent);color:#1e293b}.lbfold{border-left:5px solid var(--c,#b3185c)!important}.lbfold>summary{background:var(--b,transparent)}
.lgS{margin:6px 0}.lgS .g3,.lgS .g2{display:grid;gap:8px;margin-bottom:8px}.lgS .g3{grid-template-columns:repeat(3,1fr)}.lgS .g2{grid-template-columns:repeat(2,1fr)}
.lt{border-radius:14px;padding:10px 6px;color:#fff;text-align:center;box-shadow:0 2px 6px #0002;min-width:0}.lt span{display:block;font-size:11.5px;font-weight:700;opacity:.95}.lt b{display:block;font-size:16.5px;margin-top:2px;overflow:hidden;text-overflow:ellipsis}.lt[onclick]{cursor:pointer}
.arm-sw{display:flex;align-items:center;gap:8px;background:#fff7ed;border-radius:12px;padding:6px 12px;margin:6px 0;font-weight:700;font-size:13.5px}.arm-sw span{flex:1}.arm-sw a{color:#c2410c;font-size:12.5px}
.sw{position:relative;width:46px;height:26px;flex:none;display:inline-block}.sw input{opacity:0;width:100%;height:100%;position:absolute;margin:0;z-index:2}.sw i{position:absolute;inset:0;background:#cbd5e1;border-radius:13px;transition:.15s}.sw i:after{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.15s}.sw input:checked+i{background:#16a34a}.sw input:checked+i:after{left:23px}
.arm-r{display:flex;align-items:center;gap:10px;border-left:5px solid #ccc;background:#fff;border-radius:14px;padding:10px;margin:8px 0;box-shadow:0 1px 5px #0002}.arm-r .ai{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}.arm-r b{display:block;font-size:14px}.arm-r small{display:block;color:#64748b;font-size:11.5px;margin-bottom:4px}.arm-r input[type=time],.arm-r select{border:1px solid #cbd5e1;border-radius:8px;padding:4px 6px;margin-right:6px;font-size:13px}.ck{display:block;font-size:12px;margin-top:3px}
.hg{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:8px 14px}.hgc{position:relative;border-radius:18px;padding:14px 12px;color:#fff;min-height:84px;box-shadow:0 3px 9px #0003;cursor:pointer}.hgc .hi{font-size:28px;display:block}.hgc b{display:block;font-size:14px;margin-top:4px;line-height:1.3}.hgc em{position:absolute;top:10px;right:10px;background:#ffffff33;border-radius:12px;padding:1px 9px;font-style:normal;font-weight:800;font-size:12.5px}`; document.head.appendChild(st);
}

// =====================================================================
//  v43: ব্যাকআপ • PIN লক • মেস শেয়ার • কার্ড ওপরে • ইউজার ভিউ বাটন
// =====================================================================
// ---------- ব্যাকআপ ----------
const BK_KEYS = () => SYNC_KEYS.concat(['mudiItems', 'arm', 'pin', 'messShare', 'books']).concat(Object.keys(localStorage).filter(k => k.indexOf('bk:') === 0));
async function bkExport() {
  const o = {}; BK_KEYS().forEach(k => { const v = localStorage.getItem(k); if (v !== null) o[k] = v; });
  const txt = JSON.stringify({app: 'chalok-bhai', v: 43, at: new Date().toISOString(), data: o}), bytes = new TextEncoder().encode(txt);
  try { localStorage.setItem('bkLast', String(Date.now())); } catch (e) {}
  await lbSaveFile('chalok-backup-' + todayISO() + '.json', bytes, 'application/json', 'আমার ভাই ব্যাকআপ'); safePage();
}
function bkImport(inp) {
  const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result); if (!j || j.app !== 'chalok-bhai' || !j.data) return alert('এটা আমার ভাইয়ের ব্যাকআপ ফাইল নয়।');
      const ks = Object.keys(j.data).filter(k => BK_KEYS().includes(k) || k.indexOf('bk:') === 0); if (!ks.length) return alert('ফাইলে কিছু পাওয়া যায়নি।');
      if (!confirm('ফাইলের তথ্য এই ফোনের বর্তমান তথ্যের জায়গায় বসবে (' + ks.length + 'টি অংশ)। নিশ্চিত?')) return;
      ks.forEach(k => { try { localStorage.setItem(k, j.data[k]); } catch (e) {} }); alert('✅ ফেরত এসেছে। অ্যাপ নতুন করে খুলছে।'); location.reload();
    } catch (e) { alert('ফাইল পড়া যায়নি।'); }
  }; r.readAsText(f);
}
// ---------- PIN ----------
async function pinHash(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('chalok:' + s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { let h = 5381; for (const c of 'chalok:' + s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'x' + h; } }
const pinGet = () => { try { return JSON.parse(localStorage.getItem('pin') || 'null'); } catch (e) { return null; } };
const pinPut = o => { try { o ? localStorage.setItem('pin', JSON.stringify(o)) : localStorage.removeItem('pin'); } catch (e) {} };
window.__pinOk = window.__pinOk || {}; let PINB = '', PINT = '';
const pinNeeds = id => { const p = pinGet(); return !!(p && p.h && p.ls && p.ls[id] && !window.__pinOk[id]); };
function pinAsk(id) {
  PINB = ''; PINT = id; push(() => home());
  render(pageHead('🔒 PIN দিন') + `<div class="pad"><div id="pin_d" style="text-align:center;font-size:30px;letter-spacing:12px;margin:22px 0 6px;min-height:40px"></div><div id="pin_m" class="hint" style="text-align:center;min-height:20px"></div>
    <div class="pk">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✔'].map(k => `<div onclick="pinKey('${k}')">${bn(k)}</div>`).join('')}</div><div style="text-align:center;margin-top:10px"><a onclick="pinForgot()" style="color:#2563eb;font-weight:700">PIN ভুলে গেছেন?</a></div></div>`); pinDots();
}
function pinDots() { const e = document.getElementById('pin_d'); if (e) e.textContent = PINB ? '●'.repeat(PINB.length) : '○ ○ ○ ○'; }
async function pinKey(k) {
  if (k === '⌫') PINB = PINB.slice(0, -1); else if (k === '✔') {
    const p = pinGet(), m = document.getElementById('pin_m'); if (!p) return; if (await pinHash(PINB) === p.h) { window.__pinOk[PINT] = 1; stack.pop(); open_(PINT); return; }
    PINB = ''; if (m) m.textContent = '❌ PIN ভুল, আবার দিন'; pinDots(); return;
  } else if (PINB.length < 6) PINB += k; pinDots();
}
function pinForgot() {
  const ci = cloudInfo(); if (!ci || !ci.id) return alert('লগইন করা না থাকলে PIN রিসেট করা যায় না। অ্যাপের ডেটা মুছে নতুন করে শুরু করতে হবে।');
  const v = prompt('আপনার লগইন করা মোবাইল নম্বর দিন'); if (!v) return; if (loginEmail(v) && loginEmail(v) === loginEmail(ci.id)) { pinPut(null); alert('✅ PIN মুছে গেছে। আবার নতুন PIN দিতে পারবেন।'); stack.pop(); open_(PINT); } else alert('নম্বর মেলেনি।');
}
async function pinSave() {
  const a = gv('pn_a'), b = gv('pn_b'); if (!/^\d{4,6}$/.test(en2(a))) return alert('PIN ৪ থেকে ৬ সংখ্যার হতে হবে।'); if (en2(a) !== en2(b)) return alert('দুই বারের PIN মেলেনি।');
  const o = pinGet() || {ls: {ledger: 1, mess: 1, rent: 1}}; o.h = await pinHash(en2(a)); pinPut(o); alert('✅ PIN সেট হয়েছে।'); safePage();
}
function pinTog(id, on) { const o = pinGet(); if (!o) return; o.ls = o.ls || {}; o.ls[id] = on ? 1 : 0; pinPut(o); }
function pinOff() { if (confirm('PIN লক তুলে দেবেন?')) { pinPut(null); safePage(); } }
function safePage() {
  tab = 'home'; push(() => home()); const p = pinGet(), a = armGet(), last = +localStorage.getItem('bkLast') || 0, sw = (id, on, fn) => `<label class="sw"><input type="checkbox" ${on ? 'checked' : ''} onchange="${fn}"><i></i></label>`;
  render(pageHead('🔒 সুরক্ষা ও ব্যাকআপ') + `<div class="pad">
    <div class="cx" style="border-left:6px solid #2563eb"><b>💾 ব্যাকআপ</b><div class="hint">খাতা, মেস, ভাড়া, লগ বুক, নোট, রিমাইন্ডার — সব একটা ফাইলে। ফোন বদলালে ফাইল থেকে ফেরত আনুন।${last ? '<br>সর্বশেষ ব্যাকআপ: ' + lgDate(new Date(last).toISOString().slice(0, 10)) : ''}</div>
      <div class="ms-ex"><div style="background:#2563eb" onclick="bkExport()">⬇️ ব্যাকআপ নিন</div><div style="background:#16a34a" onclick="document.getElementById('bk_f').click()">⬆️ ফেরত আনুন</div></div><input type="file" id="bk_f" accept=".json,application/json" style="display:none" onchange="bkImport(this)">
      <div class="arm-r" style="border-left-color:#2563eb"><div class="ai" style="background:#2563eb22">🔔</div><div style="flex:1"><b>প্রতি সপ্তাহে মনে করান</b><small>শনিবার সকাল ১০টা</small></div>${sw('bk', a.bk.on, "armSet('bk','on',this.checked)")}</div></div>
    <div class="cx" style="border-left:6px solid #dc2626"><b>🔒 PIN লক</b><div class="hint">${p && p.h ? 'PIN চালু আছে। কোনটা লক থাকবে বাছুন:' : 'PIN দিলে নিচের পাতাগুলো PIN ছাড়া খুলবে না।'}</div>
      ${p && p.h ? [['ledger', '💰 আয়-খরচ খাতা'], ['mess', '🍛 মেসের মিল'], ['rent', '🏠 বাড়ি ভাড়া']].map(x => `<div class="arm-sw" style="background:#fef2f2"><span>${x[1]}</span>${sw(x[0], p.ls && p.ls[x[0]], `pinTog('${x[0]}',this.checked)`)}</div>`).join('') + '<div class="hint" style="margin-top:8px">PIN বদলাতে নিচে নতুন PIN দিন:</div>' : ''}
      <input class="inp" id="pn_a" type="password" inputmode="numeric" maxlength="6" placeholder="নতুন PIN (৪-৬ সংখ্যা)"><input class="inp" id="pn_b" type="password" inputmode="numeric" maxlength="6" placeholder="আবার লিখুন">
      <div class="ms-sv" style="background:#dc2626;margin:8px 0 0" onclick="pinSave()">🔒 PIN সেভ করুন</div>${p && p.h ? '<div class="ms-sv" style="background:#64748b;margin:8px 0 0" onclick="pinOff()">PIN তুলে দিন</div>' : ''}
      <div class="hint" style="margin-top:8px">ভুলে গেলে: লগইন করা মোবাইল নম্বর দিয়ে রিসেট করা যায়।</div></div></div>`);
}
// ---------- মেস শেয়ার ----------
const msShGet = () => { try { return JSON.parse(localStorage.getItem('messShare') || 'null'); } catch (e) { return null; } };
const msShPut = o => { try { o ? localStorage.setItem('messShare', JSON.stringify(o)) : localStorage.removeItem('messShare'); } catch (e) {} };
const msShDoc = (m, code) => m.f.F.doc(m.f.db, 'messShares', code);
function msShHtml() {
  const s = msShGet();
  if (s && s.role === 'owner') return `<div style="text-align:center"><div class="hint">এই কোড বাকিদের দিন:</div><div style="font-size:32px;letter-spacing:6px;font-weight:800;color:#0e7490;margin:6px 0">${bn(s.code)}</div></div>
    <div class="ms-ex"><div style="background:#16a34a" onclick="msShSend()">📤 কোড পাঠান</div><div style="background:#0e7490" onclick="msShPush(true)">🔄 এখনই আপডেট</div></div><div class="hint">আপনি যা লিখবেন সঙ্গে সঙ্গে বাকিদের ফোনে বদলে যাবে। তারা শুধু দেখতে পারবে।</div><div class="ms-sv" style="background:#64748b;margin:8px 0 0" onclick="msShOff()">শেয়ার বন্ধ করুন</div>`;
  return `<div class="ms-sv" style="background:#0e7490;margin:0" onclick="msShOn()">🔗 শেয়ার চালু করুন</div><div class="hint">একটা কোড পাবেন; বাকিরা সেই কোড দিয়ে নিজের ফোনে হিসাব দেখবে। লগইন থাকতে হবে।</div>${msJoinHtml()}`;
}
const msJoinHtml = () => `<div class="hint" style="margin-top:10px"><b>অন্যের মেসে ঢুকতে চান?</b></div><div style="display:flex;gap:6px"><input class="inp" id="ms_jc" inputmode="numeric" placeholder="মেসের কোড" style="margin:0;flex:1"><div class="ms-sv" style="background:#16a34a;margin:0;padding:10px 16px" onclick="msJoin()">ঢুকুন</div></div>`;
async function msShOn() {
  const m = await sme(); if (!m) return alert('আগে লগইন করুন (আমি ▸ লগইন)।');
  let code = '', tries = 0; do { code = String(Math.floor(1e7 + Math.random() * 9e7)); tries++; } while (tries < 4 && (await m.f.F.getDoc(msShDoc(m, code))).exists());
  const d = msLoad(), ci = cloudInfo() || {};
  try { await m.f.F.setDoc(msShDoc(m, code), {owner: m.u.uid, ownerName: ci.name || '', title: d.title, json: JSON.stringify(d), at: Date.now()}); msShPut({code, role: 'owner'}); msPage(); } catch (e) { alert('শেয়ার চালু হয়নি। (Firestore rules বসানো হয়েছে?)'); }
}
let _msShT = null;
function msShPush(now) {
  const s = msShGet(); if (!s || s.role !== 'owner') return; clearTimeout(_msShT);
  _msShT = setTimeout(async () => { try { const m = await sme(); if (!m) return; const d = msLoad(); await m.f.F.setDoc(msShDoc(m, s.code), {owner: m.u.uid, ownerName: (cloudInfo() || {}).name || '', title: d.title, json: JSON.stringify(d), at: Date.now()}); if (now) toast_('✅ আপডেট হয়েছে'); } catch (e) { if (now) toast_('আপডেট হয়নি'); } }, now ? 0 : 1500);
}
function msShSend() { const s = msShGet(); if (!s) return; const t = '🍛 ' + msLoad().title + ' — মেসের হিসাব দেখতে আমার ভাই অ্যাপে মেসের মিল ▸ "অন্যের মেসে ঢুকুন"-এ এই কোড দিন: ' + s.code; try { sendMsg('', t, '📤 কোড পাঠান'); } catch (e) { prompt('কোড কপি করুন', t); } }
async function msShOff() { if (!confirm('শেয়ার বন্ধ করলে বাকিরা আর দেখতে পাবে না। বন্ধ করবেন?')) return; const s = msShGet(); try { const m = await sme(); if (m && s) await m.f.F.deleteDoc(msShDoc(m, s.code)); } catch (e) {} msShPut(null); msPage(); }
async function msJoin() {
  const code = en2(gv('ms_jc') || '').replace(/\D/g, ''); if (code.length < 6) return alert('কোড দিন।'); const m = await sme(); if (!m) return alert('আগে লগইন করুন (আমি ▸ লগইন)।');
  try { const d = await m.f.F.getDoc(msShDoc(m, code)); if (!d.exists()) return alert('এই কোডে কোনো মেস পাওয়া যায়নি।'); msShPut({code, role: 'member', title: d.data().title}); msViewPage(); } catch (e) { alert('ঢোকা যায়নি। ইন্টারনেট/লগইন দেখুন।'); }
}
function msLeave() { if (!confirm('এই মেস থেকে বের হবেন?')) return; msShPut(null); stack = []; open_('mess'); }
async function msViewPage(silent) {
  const s = msShGet(); if (!s || s.role !== 'member') return; tab = 'home';
  if (!silent) { push(() => home()); render(pageHead('🍛 ' + (s.title || 'মেস')) + '<div class="pad ms" id="msv"><div class="hint" style="text-align:center;padding:20px">⏳ আনা হচ্ছে...</div></div>'); }
  let data = null, at = 0;
  try { const m = await sme(); if (m) { const d = await m.f.F.getDoc(msShDoc(m, s.code)); if (d.exists()) { data = JSON.parse(d.data().json); at = d.data().at; window.__msVC = {data, at}; } else { const e = document.getElementById('msv'); if (e) e.innerHTML = '<div class="warn">মালিক শেয়ার বন্ধ করে দিয়েছেন।</div><div class="ms-sv" style="background:#64748b" onclick="msShPut(null);open_(\'mess\')">ঠিক আছে</div>'; return; } } } catch (e) {}
  if (!data && window.__msVC) data = window.__msVC.data, at = window.__msVC.at; const el = document.getElementById('msv'); if (!el) return; if (!data) { el.innerHTML = '<div class="warn">দেখা যায়নি। ইন্টারনেট ও লগইন দেখুন।</div><div class="ms-sv" style="background:#0e7490" onclick="msViewPage()">🔄 আবার চেষ্টা</div>'; return; }
  data.mem = data.mem || []; data.mon = data.mon || {}; data.title = data.title || 'মেস'; window.__msView = data;
  try {
    const ym = msYm(), C = msCalc(ym);
    el.innerHTML = `<div class="mon"><span onclick="msMon(-1)">‹</span><b>${msMonName(ym)}</b><span onclick="msMon(1)">›</span></div><div class="hint" style="text-align:center">👁 শুধু দেখা • ${data.title} • আপডেট: ${lgDate(new Date(at).toISOString().slice(0, 10))} ${lgTm(String(new Date(at).getHours()).padStart(2, '0') + ':' + String(new Date(at).getMinutes()).padStart(2, '0'))}</div>
      ${msAllHtml(C, true)}
      <div class="ms-ex"><div style="background:#0e7490" onclick="msViewPage()">🔄 রিফ্রেশ</div><div style="background:#64748b" onclick="msLeave()">🚪 বের হন</div></div>`;
  } catch (e) { el.innerHTML = '<div class="warn">হিসাব দেখানো যায়নি।</div>'; }
  window.__msView = null; clearTimeout(window.__msvT); window.__msvT = setTimeout(() => { if (document.getElementById('msv')) msViewPage(true); }, 30000);
}
// ---------- init ----------
function p51Init() {
  if (window.__p51) return; window.__p51 = 1;
  ARM_DEF.bk = {on: false}; ACCCOL['ms:share'] = ['#0e7490', '#cffafe'];
  const ml = window.msLoad; window.msLoad = function () { return window.__msView || ml.apply(this, arguments); };
  const sv = window.msSave; window.msSave = function () { if (window.__msView) return; const r = sv.apply(this, arguments); msShPush(); return r; };
  const mp = window.msPage; window.msPage = function () {
    const s = msShGet(); if (s && s.role === 'member') return msViewPage();
    const r = mp.apply(this, arguments); try { const pad = document.querySelector('#app .pad.ms'); if (pad && !pad.querySelector('.ac[data-k=share]')) pad.insertAdjacentHTML('beforeend', accH('ms', 'share', '🔗 সবার সাথে শেয়ার', msShHtml())); else if (!pad) { const p = document.querySelector('#app .pad'); if (p) p.insertAdjacentHTML('beforeend', `<div class="cx" style="border-left:5px solid #0e7490">${msJoinHtml()}</div>`); } } catch (e) {} return r;
  };
  const o0 = window.open_; window.open_ = function (id) { if (id === 'safe') return safePage(); if (pinNeeds(id)) return pinAsk(id); return o0.apply(this, arguments); };
  let hid = 0; document.addEventListener('visibilitychange', () => { if (document.hidden) hid = Date.now(); else if (hid && Date.now() - hid > 60000) window.__pinOk = {}; });
  // কার্ড "এক নজরে"-র ঠিক নিচে
  const h0 = window.home; window.home = function () { const r = h0.apply(this, arguments); try { const g = document.querySelector('#app .hg'), a = document.querySelector('#app .nd-g'); if (g && a) a.after(g); } catch (e) {} return r; };
  const st = document.createElement('style'); st.textContent = `
#uvbar.uv-pill{left:auto!important;right:8px!important;bottom:150px!important}#uvbar.uv-pill button{font-size:0!important;padding:0!important;width:34px;height:34px;opacity:.5;border-radius:50%!important}#uvbar.uv-pill button:before{content:'👁';font-size:16px}
.pk{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 40px}.pk div{background:#fff;border-radius:50%;height:62px;line-height:62px;text-align:center;font-size:22px;font-weight:800;box-shadow:0 1px 6px #0003}.pk div:active{background:#e2e8f0}
.hgh{font-weight:800;font-size:16px;margin:14px 14px 0;border-left:4px solid #ffc83d;padding-left:8px}
#spkb{position:fixed;left:12px;bottom:150px;z-index:9999;background:#dc2626;color:#fff;border-radius:22px;padding:10px 16px;font-weight:800;font-size:14px;box-shadow:0 3px 10px #0005;display:none}`; document.head.appendChild(st);
  // ---- পড়ে শোনানো: থামার বাটন + পাতা বদলালে নিজে থামে ----
  const bt = document.createElement('div'); bt.id = 'spkb'; bt.textContent = '⏹ পড়া থামান'; bt.onclick = () => speakStop(); document.body.appendChild(bt);
  let pt = null; const ui = on => { bt.style.display = on ? 'block' : 'none'; clearInterval(pt); if (on) pt = setInterval(() => { try { if (!ttsPlugin() && 'speechSynthesis' in window && !speechSynthesis.speaking && !speechSynthesis.pending) { ui(false); window.__spkOn = false; } } catch (e) { ui(false); } }, 900); };
  window.__spkOn = false;
  const sp0 = window.speak; window.speak = async function () { window.__spkOn = true; ui(true); try { return await sp0.apply(this, arguments); } finally { if (ttsPlugin()) { ui(false); window.__spkOn = false; } } };
  const ss0 = window.speakStop; window.speakStop = function () { window.__spkOn = false; ui(false); return ss0.apply(this, arguments); };
  const nvStop = () => { if (window.__spkOn) { try { speakStop(); } catch (e) {} } };
  ['open_', 'back'].forEach(n => { const f = window[n]; if (typeof f !== 'function') return; window[n] = function () { nvStop(); return f.apply(this, arguments); }; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) nvStop(); });
}

// =====================================================================
//  v44: 🎛️ আমার অ্যাপ সাজান — সব দেখা / সব লুকানো
// =====================================================================
const VIS_SEC = [['hero', '💳', 'ব্যালেন্স কার্ড'], ['glance', '⚡', 'এক নজরে'], ['upd', '🔔', 'নতুন আপডেট'], ['tip', '💡', 'আজকের টিপস'], ['cards', '📂', 'সব বিভাগ (রঙিন কার্ড)']];
const VIS_KEEP = ['account', 'safe', 'vis'], VIS_GL = ['job', 'mess', 'logbook', 'ledger'];
function visGet() { let v = null; try { v = JSON.parse(localStorage.getItem('vis') || 'null'); } catch (e) {} v = v || {}; v.sec = v.sec || []; v.grp = v.grp || []; v.tile = v.tile || []; return v; }
function visPut(v) { try { localStorage.setItem('vis', JSON.stringify(v)); } catch (e) {} visCss(); }
const visTileHid = id => visGet().tile.includes(id) && !VIS_KEEP.includes(id);
function visCss() {
  const v = visGet(), r = [], css = {hero: '.nd-hero', glance: '.nd-sec,.nd-g', upd: '.upd', tip: '.tip', cards: '.hgh,.hg'};
  v.sec.forEach(k => css[k] && r.push(css[k] + '{display:none!important}'));
  v.tile.filter(id => !VIS_KEEP.includes(id)).forEach(id => { r.push(`[onclick*="open_('${id}')"]{display:none!important}`); if (id === 'jobprep') r.push('[data-k=prep]{display:none!important}'); if (id === 'ledger') r.push('[data-k=led]{display:none!important}'); });
  v.grp.forEach(k => r.push(`[onclick="hgOpen('${k}')"]{display:none!important}`));
  let st = document.getElementById('vis-css'); if (!st) { st = document.createElement('style'); st.id = 'vis-css'; document.head.appendChild(st); } st.textContent = r.join('\n');
}
// সব ট্যাপযোগ্য আইটেমের তালিকা (লুকানো থাকলেও)
function visAll() { const g = (window.__hgb0 || hgBuild)(true); return g; }
function visPreset(k) {
  const all = visAll(), ids = []; all.forEach(g => g.tiles.forEach(c => ids.push(c.id))); const v = {sec: [], grp: [], tile: [], done: 1};
  if (k === 'all') return visPut(v), visPage();
  const secs = VIS_SEC.map(s => s[0]); v.sec = secs.slice(); v.grp = all.map(g => g.k); v.tile = ids.filter(id => !VIS_KEEP.includes(id));
  const show = (s, t, gr) => { v.sec = v.sec.filter(x => !s.includes(x)); v.tile = v.tile.filter(x => !t.includes(x)); v.grp = v.grp.filter(x => !(gr || []).includes(x)); };
  if (k === 'none') {} else if (k === 'log') show(['glance'], ['logbook']); else if (k === 'ledger') show(['hero', 'glance'], ['ledger']); else if (k === 'mess') show(['glance', 'cards'], ['mess', 'rent'], ['home']);
  visPut(v); visPage();
}
function visTog(kind, id, on) { const v = visGet(), a = v[kind], i = a.indexOf(id); if (on && i >= 0) a.splice(i, 1); else if (!on && i < 0) a.push(id); v.done = 1; visPut(v); }
function visPage(manual) {
  tab = 'home'; push(() => home()); const v = visGet(), sw = (kind, id, hid) => `<label class="sw"><input type="checkbox" ${hid ? '' : 'checked'} onchange="visTog('${kind}','${id}',this.checked)"><i></i></label>`, all = visAll();
  const pb = (k, ic, t, c) => `<div style="background:${c}" onclick="visPreset('${k}')">${ic} ${t}</div>`;
  render(pageHead('🎛️ আমার অ্যাপ সাজান') + `<div class="pad"><div class="cx" style="border-left:6px solid #7c3aed"><b>এক ট্যাপে সাজিয়ে নিন</b><div class="vp">${pb('all', '✅', 'সব দেখাও', '#16a34a')}${pb('none', '🙈', 'সব লুকাও', '#dc2626')}${pb('log', '🚖', 'শুধু লগ বুক', '#2563eb')}${pb('mess', '🏠', 'শুধু মেস-ভাড়া', '#0f766e')}${pb('ledger', '💰', 'শুধু খাতা', '#d97706')}</div>
    <div class="hint">সুইচ বন্ধ = ওই জিনিস হোম, মেনু ও সার্চ — কোথাও দেখাবে না। যেকোনো সময় এই পাতা থেকে ফিরিয়ে আনা যায়।</div></div>
    <div class="cx" style="border-left:6px solid #0891b2"><b>🏠 হোমের অংশ</b>${VIS_SEC.map(s => `<div class="arm-sw" style="background:#f0f9ff"><span>${s[1]} ${s[2]}</span>${sw('sec', s[0], v.sec.includes(s[0]))}</div>`).join('')}</div>
    ${all.map(g => `<div class="cx" style="border-left:6px solid ${g.col}"><div class="arm-sw" style="background:${g.col}1a;margin-top:0"><span><b>${g.ic} ${g.n}</b></span>${sw('grp', g.k, v.grp.includes(g.k))}</div>${g.tiles.filter(c => !VIS_KEEP.includes(c.id)).map(c => `<div class="arm-sw" style="background:#fff;margin-left:10px"><span>${c.ic || ''} ${esc(SHORT[c.id] || c.name)}</span>${sw('tile', c.id, v.tile.includes(c.id))}</div>`).join('') || '<div class="hint">এখানে কিছু নেই।</div>'}</div>`).join('')}
    <div class="hint" style="text-align:center;margin:6px 0 20px">🔒 "আমি", সুরক্ষা ও এই পাতা সবসময় থাকবে, যাতে ফিরতে পারেন।</div></div>`);
}
// হোমের ফাঁকা অবস্থা + প্রথমবার জিজ্ঞেস
function visFirst() {
  const v = visGet(); if (v.done) return; v.done = 1; visPut(v);
  showModal(`<h3 style="margin:0 0 6px">🎛️ কী কী দেখতে চান?</h3><div class="hint" style="margin-bottom:8px">নিজের মতো করে সাজিয়ে নিন। পরে "আমার অ্যাপ সাজান" থেকে বদলানো যাবে।</div>
   <div class="vp" style="grid-template-columns:1fr">${[['all', '✅', 'সবকিছু দেখাব', '#16a34a'], ['log', '🚖', 'শুধু লগ বুক', '#2563eb'], ['mess', '🏠', 'শুধু মেস-ভাড়া', '#0f766e'], ['ledger', '💰', 'শুধু খাতা', '#d97706']].map(x => `<div style="background:${x[3]}" onclick="closeModal();visPreset('${x[0]}')">${x[1]} ${x[2]}</div>`).join('')}<div style="background:#7c3aed" onclick="closeModal();visPage()">✏️ নিজে বাছব</div></div>`);
}
function visEmpty() {
  const v = visGet(); if (!v.sec.length || document.querySelector('#app .vis-e')) return; const open = VIS_SEC.every(s => v.sec.includes(s[0]));
  if (!open) return; const sg = document.querySelector('#app .ndh') || document.querySelector('#app .sign'); if (sg) sg.insertAdjacentHTML('afterend', `<div class="cx vis-e" style="text-align:center;margin:14px"><div style="font-size:34px">✨</div><b>সব লুকানো আছে</b><div class="hint">ফিরিয়ে আনতে ওপরের 🎛️ চাপুন।</div><div class="ms-sv" style="background:#7c3aed" onclick="open_('vis')">🎛️ আমার অ্যাপ সাজান</div></div>`);
}
function p52Init() {
  if (window.__p52) return; window.__p52 = 1;
  window.__hgb0 = function (raw) {
    const gs = homeGroups(), all = {safe: {id: 'safe', ic: '🔒', name: 'সুরক্ষা ও ব্যাকআপ', sub: '', color: '#0f766e'}, vis: {id: 'vis', ic: '🎛️', name: 'আমার অ্যাপ সাজান', sub: '', color: '#7c3aed'}};
    gs.forEach(g => g[1].forEach(c => { if (!all[c.id]) all[c.id] = c; })); const v = visGet(), out = [];
    const glOn = raw ? true : !v.sec.includes('glance'), seen = new Set(glOn ? VIS_GL.filter(id => !tileOv(id).hide && (raw || !v.tile.includes(id))) : []);
    HG.forEach(h => { const ids = h[4].slice(); if (h[0] === 'khata') ids.push('vis'); const o = {k: h[0], ic: h[1], n: h[2], col: h[3], tiles: [], sub: h[5]}; ids.forEach(id => { if (all[id] && !seen.has(id) && !o.tiles.includes(all[id])) { o.tiles.push(all[id]); seen.add(id); } }); out.push(o); });
    const col = out[out.length - 1]; Object.keys(all).forEach(id => { if (!seen.has(id) && id !== 'home') { col.tiles.push(all[id]); seen.add(id); } });
    if (raw) { VIS_GL.forEach(id => { if (all[id] && !out.some(o => o.tiles.some(c => c.id === id))) out.find(o => o.k === (id === 'job' ? 'jobs' : id === 'mess' ? 'home' : 'khata')).tiles.unshift(all[id]); }); return out; }
    out.forEach(o => { if (v.grp.includes(o.k)) { o.tiles = []; o.sub = []; } else o.tiles = o.tiles.filter(c => !v.tile.includes(c.id) || VIS_KEEP.includes(c.id)); if (o.k === 'gov' && v.grp.includes('gov')) o.hidden = 1; });
    out.forEach(o => { o.sub = (o.sub || []).filter(s => !v.grp.includes(s) && out.find(x => x.k === s) && out.find(x => x.k === s).tiles.length); }); return out;
  };
  window.hgBuild = function () { return window.__hgb0(false); };
  window.hgCards = function () { const o = hgBuild(); return `<div class="hgh">সব বিভাগ</div><div class="hg">${o.filter(x => x.tiles.length || x.sub.length).map(x => `<div class="hgc" style="background:linear-gradient(135deg,${x.col},${x.col}cc)" onclick="hgOpen('${x.k}')"><span class="hi">${x.ic}</span><b>${x.n}</b><em>${bn(x.tiles.length)}</em></div>`).join('')}</div><div style="height:14px"></div>`; };
  const o0 = window.open_; window.open_ = function (id) { if (id === 'vis') return visPage(); return o0.apply(this, arguments); };
  const h0 = window.home; window.home = function () {
    const r = h0.apply(this, arguments);
    try { const hb = document.querySelector('#app .ndh .gr, #app .sign .gr'); if (hb && !document.querySelector('#app .vis-b')) hb.insertAdjacentHTML('beforeend', `<span class="vis-b" onclick="open_('vis')">🎛️ সাজান</span>`); visEmpty(); if (!visGet().done) setTimeout(visFirst, 1200); } catch (e) {}
    return r;
  };
  const dr = window.drawer; window.drawer = function () { const h = dr.apply(this, arguments), k = '<div class="it" onclick="toggleDrawer();ndLayout()">'; return h.includes(k) ? h.replace(k, `<div class="it" onclick="toggleDrawer();open_('vis')"><span>🎛️</span>আমার অ্যাপ সাজান</div>` + k) : h; };
  visCss();
  const st = document.createElement('style'); st.textContent = `.vis-b{float:right;background:#ffffff26;border:1px solid #ffffff40;border-radius:14px;padding:3px 11px;font-size:12.5px;font-weight:800;color:#fff;cursor:pointer}.vp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.vp div{color:#fff;font-weight:800;font-size:13px;text-align:center;padding:11px 4px;border-radius:12px;cursor:pointer}.vp div:active{opacity:.8}`; document.head.appendChild(st);
}

// ===== p53: বহু খাতা + রঙ/থিম + নতুন লোগো + স্ট্রিপ ঠিক =====
const BKM = {
  lbook: {n: 'লগ বুক', ic: '📚', col: '#2563eb', pg: 'logbookPage', u: 'ট্রিপ'},
  ledger: {n: 'আয়-খরচ খাতা', ic: '💰', col: '#db2777', pg: 'ledgerPage', u: 'এন্ট্রি'},
  mess: {n: 'মেস', ic: '🍛', col: '#16a34a', pg: 'msPage', u: 'মাস'},
  rent: {n: 'বাড়ি ভাড়া', ic: '🏠', col: '#0f766e', pg: 'rtPage', u: 'ইউনিট'}
};
const bkIdx = () => { try { return JSON.parse(localStorage.getItem('books') || '{}') || {}; } catch (e) { return {}; } };
const bkPut = o => { try { localStorage.setItem('books', JSON.stringify(o)); } catch (e) {} };
function bkGet(k) {
  const o = bkIdx(); let m = o[k];
  if (!m || !m.list || !m.list.length) { m = {cur: 'b1', list: [{id: 'b1', name: BKM[k].n + ' ১', at: Date.now()}]}; o[k] = m; bkPut(o); }
  return m;
}
function bkRaw(k, id) { const m = bkGet(k); return id === m.cur ? localStorage.getItem(k) : localStorage.getItem('bk:' + k + ':' + id); }
function bkInfo(k, id) {
  let d = {}; try { d = JSON.parse(bkRaw(k, id) || '{}') || {}; } catch (e) {}
  const n = k === 'lbook' ? (d.rows || []).length : k === 'ledger' ? (d.entries || []).length : k === 'mess' ? Object.keys(d.mon || {}).length : (d.t || []).length;
  return bn(n) + ' ' + BKM[k].u;
}
function bkSwitch(k, id) {
  const m = bkGet(k); if (m.cur === id) return true;
  try {
    const raw = localStorage.getItem(k); localStorage.setItem('bk:' + k + ':' + m.cur, raw === null ? '{}' : raw);
    const nx = localStorage.getItem('bk:' + k + ':' + id); localStorage.setItem(k, nx === null ? '{}' : nx); localStorage.removeItem('bk:' + k + ':' + id);
  } catch (e) { alert('ফোনে জায়গা কম। কিছু ছবি/লোগো সরিয়ে আবার চেষ্টা করুন।'); return false; }
  const o = bkIdx(); m.cur = id; o[k] = m; bkPut(o); return true;
}
function bkGo(k) { closeModal(); window.__bkPg = null; const f = window[BKM[k].pg]; if (typeof f === 'function') f(); }
function bkxOpen(k) {
  const m = bkGet(k), M = BKM[k];
  showModal(`<h3 style="margin:0 0 10px">${M.ic} আমার ${M.n}গুলো</h3>` + m.list.slice().reverse().map(b => { const on = b.id === m.cur, c = b.col || M.col; return `<div class="bkr${on ? ' on' : ''}" style="--c:${c}" onclick="bkUse('${k}','${b.id}')"><b>${on ? '🟢 ' : ''}${esc(b.name)}<em class="bkgo">ঢুকুন ›</em></b><small>${bkInfo(k, b.id)}${on ? ' • চালু আছে' : ' • পুরনো খাতা'}</small><div class="bka"><span onclick="event.stopPropagation();bkUse('${k}','${b.id}')">${on ? 'ঢুকুন' : 'খুলুন'}</span><span onclick="event.stopPropagation();bkRen('${k}','${b.id}')">নাম বদল</span><span onclick="event.stopPropagation();bkCol('${k}','${b.id}')">🎨 রঙ</span>${on ? '' : `<span style="background:#fee2e2" onclick="event.stopPropagation();bkxDel('${k}','${b.id}')">মুছুন</span>`}</div></div>`; }).join('') + `<div class="bkn" onclick="bkNewForm('${k}')">➕ নতুন ${M.n} খুলুন</div><div class="hint" style="margin-top:8px">পুরনো খাতা মুছে যায় না। যখন খুশি খুলে দেখা যাবে।</div>`);
}
function bkUse(k, id) { if (!bkSwitch(k, id)) return; bkGo(k); try { const b = bkGet(k).list.find(x => x.id === id); const t = document.createElement('div'); t.textContent = '✅ ' + (b ? b.name : '') + ' খোলা হয়েছে'; t.style.cssText = 'position:fixed;left:50%;top:70px;transform:translateX(-50%);background:#111827;color:#fff;padding:9px 16px;border-radius:14px;font-size:13px;font-weight:700;z-index:99;box-shadow:0 6px 16px #0006'; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); } catch (e) {} }
function bkRen(k, id) { const o = bkIdx(), m = bkGet(k), b = m.list.find(x => x.id === id); const n = prompt('খাতার নতুন নাম', b.name); if (n && n.trim()) { b.name = n.trim().slice(0, 40); o[k] = m; bkPut(o); bkxOpen(k); bkRefresh(); } }
function bkxDel(k, id) { const o = bkIdx(), m = bkGet(k); if (id === m.cur) return; const b = m.list.find(x => x.id === id); if (!confirm('"' + b.name + '" খাতা চিরতরে মুছবেন? এটা আর ফেরানো যাবে না।')) return; m.list = m.list.filter(x => x.id !== id); o[k] = m; bkPut(o); try { localStorage.removeItem('bk:' + k + ':' + id); } catch (e) {} bkxOpen(k); }
const BKCOLS = ['#2563eb', '#16a34a', '#ea580c', '#db2777', '#7c3aed', '#0f766e', '#dc2626', '#ca8a04', '#0891b2', '#475569', '#be185d', '#65a30d'];
function bkCol(k, id) {
  const m = bkGet(k), b = m.list.find(x => x.id === id), c = b.col || BKM[k].col;
  showModal(`<h3 style="margin:0 0 8px">🎨 খাতার রঙ</h3><div class="bkpal">${BKCOLS.map(x => `<i style="background:${x}" onclick="bkSetCol('${k}','${id}','${x}')"></i>`).join('')}<label class="bkany"><input type="color" value="${c}" onchange="bkSetCol('${k}','${id}',this.value)">যেকোনো রঙ</label></div><button class="btn sm" style="margin-top:10px;background:#64748b" onclick="bkSetCol('${k}','${id}','')">↩️ আগের রঙ</button>`);
}
function bkSetCol(k, id, c) { const o = bkIdx(), m = bkGet(k), b = m.list.find(x => x.id === id); if (c) b.col = c; else delete b.col; o[k] = m; bkPut(o); bkxOpen(k); bkRefresh(); }
function bkNewForm(k) {
  const m = bkGet(k), M = BKM[k];
  const opt = {lbook: [['drv', 'চালক ও গাড়ির তথ্য কপি করুন', 1], ['co', 'কোম্পানি ও লোগো কপি করুন', 1], ['rows', 'পুরনো ট্রিপও কপি করুন', 0]], ledger: [['fix', 'স্থায়ী খরচ, বাজেট ও লক্ষ্য কপি করুন', 1], ['debt', 'দেনা-পাওনা কপি করুন', 1]], mess: [['mem', 'সদস্যদের তালিকা কপি করুন', 1]], rent: [['ten', 'ভাড়াটিয়া/ইউনিটের তালিকা কপি করুন', 1]]}[k];
  showModal(`<h3 style="margin:0 0 8px">➕ নতুন ${M.n}</h3><input class="inp" id="bk_nm" value="${esc(M.n + ' ' + bn(m.list.length + 1))}" maxlength="40">${opt.map(x => `<label style="display:block;margin:8px 2px;font-size:14px"><input type="checkbox" class="bk_o" data-k="${x[0]}" ${x[2] ? 'checked' : ''}> ${x[1]}</label>`).join('')}<button class="btn" style="width:100%;margin-top:8px;background:#16a34a" onclick="bkCreate('${k}')">✅ নতুন ${M.n} খুলুন</button><div class="hint" style="margin-top:8px">এখনকার খাতা নিজে থেকে পুরনো খাতায় চলে যাবে, ডেটা অক্ষত থাকবে।</div>`);
}
function bkCreate(k) {
  const nm = (document.getElementById('bk_nm').value || '').trim().slice(0, 40) || BKM[k].n; const op = {}; document.querySelectorAll('.bk_o').forEach(x => { op[x.dataset.k] = x.checked; });
  const o = bkIdx(), m = bkGet(k); let od = {}; try { od = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) {}
  const cp = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x)), nd = {};
  if (k === 'lbook') { if (op.drv) { nd.info = cp(od.info); nd.cond = od.cond; } if (op.co) { nd.co = cp(od.co); nd.style = od.style; nd.sig = cp(od.sig); } if (op.rows) nd.rows = cp(od.rows); nd.xl = cp(od.xl); }
  if (k === 'ledger') { if (op.fix) { nd.fixed = cp(od.fixed); nd.budget = od.budget; nd.goals = cp(od.goals); } if (op.debt) { nd.loans = cp(od.loans); nd.debts = cp(od.debts); } }
  if (k === 'mess') { nd.title = nm; if (op.mem) nd.mem = cp(od.mem); }
  if (k === 'rent') { if (op.ten) { nd.t = cp(od.t); nd.seq = od.seq; } nd.rem = cp(od.rem); }
  Object.keys(nd).forEach(x => { if (nd[x] === undefined) delete nd[x]; });
  const id = 'b' + Date.now().toString(36);
  try { localStorage.setItem('bk:' + k + ':' + m.cur, localStorage.getItem(k) || '{}'); localStorage.setItem(k, JSON.stringify(nd)); } catch (e) { return alert('ফোনে জায়গা কম।'); }
  m.list.push({id, name: nm, at: Date.now()}); m.cur = id; o[k] = m; bkPut(o); bkGo(k);
}
function bkBar(k) {
  const m = bkGet(k), b = m.list.find(x => x.id === m.cur) || m.list[0], c = b.col || BKM[k].col;
  return `<div class="bkbar" style="--c:${c}" onclick="bkxOpen('${k}')"><span class="bki">${BKM[k].ic}</span><div><b>${esc(b.name)}</b><small>${bkInfo(k, m.cur)} • চালু আছে</small></div><span class="bkar">▾</span></div>`;
}
function bkInject() {
  const k = window.__bkPg; if (!k) return; const app = document.getElementById('app'); if (!app || app.querySelector('.bkbar')) return;
  try { if (k === 'ledger' && LG_V !== 'home') return; } catch (e) {}
  const h = app.querySelector('.page-h'); if (h) h.insertAdjacentHTML('afterend', bkBar(k)); else app.insertAdjacentHTML('afterbegin', bkBar(k));
}
function bkRefresh() { const a = document.querySelector('#app .bkbar'); if (a && window.__bkPg) { a.remove(); bkInject(); } }

// ---------- রঙ / থিম ----------
const THM = {
  purple: {n: '💜 বেগুনি', p: '#6d2aa6', pg: '#f6f1fb', cd: '#ffffff', tx: '#2a1740', ac: '#f1e6e0', acx: '#4c1d7a', nv: '#2a2336', tl: ['#5b2a9a', '#272733', '#8a4fd0', '#4a2380', '#6d2aa6', '#38384a', '#7c3fc4', '#3f1c70']},
  sky: {n: '💙 আকাশি', p: '#1e90e8', pg: '#e8f3ff', cd: '#ffffff', tx: '#0b2a4a', ac: '#ffffff', acx: '#1e90e8', nv: '#0f5fa8', tl: ['#1e90e8', '#0f6fc0', '#2f9bf0', '#0b4f8f', '#4aaaf5', '#1b6cc0', '#3b82d6', '#0e5aa0']},
  green: {n: '🌿 সবুজ-সোনালি', p: '#006a4e', pg: '#f4f5f1', cd: '#ffffff', tx: '#1a1a1a', ac: '#ffc83d', acx: '#3a2800', nv: '#0a3a28', tl: null},
  gold: {n: '✨ সোনালি', p: '#92400e', pg: '#faf5e8', cd: '#fffdf6', tx: '#2b2216', ac: '#f6d365', acx: '#3a2800', nv: '#3a2a10', tl: null}
};
function thmGet() {
  let t = null; try { t = JSON.parse(localStorage.getItem('thm') || 'null'); } catch (e) {}
  if (!t) { let uc = ''; try { uc = localStorage.getItem('ucolor') || ''; } catch (e) {} t = {id: uc ? 'legacy' : 'purple'}; }
  t.mine = t.mine || []; return t;
}
function thmSet(t) { try { localStorage.setItem('thm', JSON.stringify(t)); } catch (e) {} }
function thmVals(t) {
  if (t.id === 'legacy') return null;
  if (t.id === 'custom') { const c = t.c || {}, b = THM.purple, p = c.p || b.p; return {p, pg: c.pg || b.pg, cd: '#ffffff', tx: '#1f1a2b', ac: c.ac || b.ac, acx: c.acx || hexMix(c.ac || b.ac, '#000000', .6), nv: c.nv || b.nv, tl: [p, hexMix(p, '#000000', .35), hexMix(p, '#ffffff', .18), hexMix(p, '#000000', .18), hexMix(p, '#ffffff', .08), hexMix(p, '#000000', .5), hexMix(p, '#ffffff', .28), hexMix(p, '#000000', .28)]}; }
  const m = (t.mine || []).find(x => x.id === t.id); if (m) return thmVals({id: 'custom', c: m});
  return THM[t.id] || THM.purple;
}
let _thEl = null;
function applyThm() {
  try {
    const v = thmVals(thmGet()); const r = document.documentElement.style; if (!_thEl) { _thEl = document.createElement('style'); _thEl.id = 'p53th'; document.head.appendChild(_thEl); }
    if (!v) { _thEl.textContent = ''; return; }
    const dk = document.body && document.body.classList.contains('dark');
    r.setProperty('--p2', v.p); r.setProperty('--p1', hexMix(v.p, '#000000', .22)); r.setProperty('--tint', hexMix(v.p, '#ffffff', .88)); r.setProperty('--g2', v.p); r.setProperty('--g1', hexMix(v.p, '#000000', .22));
    if (!dk) { r.setProperty('--pg', v.pg); r.setProperty('--cd', v.cd); r.setProperty('--tx', v.tx); }
    r.setProperty('--ac', v.ac); r.setProperty('--acx', v.acx); r.setProperty('--nv1', v.nv); r.setProperty('--nv2', hexMix(v.nv, '#000000', .35));
    const tm = document.querySelector('meta[name=theme-color]'); if (tm) tm.setAttribute('content', hexMix(v.p, '#000000', .22));
    _thEl.textContent = `.ndh{background:radial-gradient(120% 90% at 85% 0%,var(--p2) 0%,var(--p1) 62%)!important}#ndnav{background:linear-gradient(180deg,var(--nv1),var(--nv2))!important;border-color:color-mix(in srgb,var(--ac) 45%,transparent)!important}#ndnav .plus{background:linear-gradient(145deg,var(--ac),color-mix(in srgb,var(--ac) 78%,#000))!important;color:var(--acx)!important;box-shadow:0 10px 20px color-mix(in srgb,var(--ac) 45%,transparent)!important}.nd-hero,.upd{background:linear-gradient(150deg,var(--p2),var(--p1))!important;border-color:color-mix(in srgb,var(--ac) 55%,transparent)!important}.upd .t1{background:var(--ac)!important;color:var(--acx)!important}.nbr .logo{box-shadow:0 0 0 2px color-mix(in srgb,var(--ac) 70%,transparent),0 6px 16px #0006!important}`;
  } catch (e) {}
}
function thmPick(id) { const t = thmGet(); t.id = id; thmSet(t); applyThm(); applyTheme(); hgRepaint(); thmPage(); }
function thmLive(key, val) {
  const t = thmGet(), cur = thmVals(t) || THM.purple; const c = (t.id === 'custom' && t.c) ? t.c : {p: cur.p, pg: cur.pg, ac: cur.ac, nv: cur.nv}; c[key] = val; t.id = 'custom'; t.c = c; thmSet(t); applyThm(); hgRepaint();
}
function thmReset() { const t = thmGet(); t.id = 'purple'; delete t.c; thmSet(t); applyThm(); applyTheme(); hgRepaint(); thmPage(); }
function thmSave() {
  const t = thmGet(); if (t.id !== 'custom') return alert('আগে নিচের রঙগুলো থেকে নিজের পছন্দের রঙ বেছে নিন।');
  const n = prompt('থিমের নাম দিন', 'আমার থিম'); if (!n) return; const id = 'm' + Date.now().toString(36); t.mine.push(Object.assign({id, n: '⭐ ' + n.trim().slice(0, 16)}, t.c)); t.id = id; thmSet(t); thmPage();
}
function thmDel(id) { const t = thmGet(); t.mine = t.mine.filter(x => x.id !== id); if (t.id === id) t.id = 'purple'; thmSet(t); applyThm(); hgRepaint(); thmPage(); }
function hgRepaint() { try { if (document.querySelector('#app .hgc')) window.home(); } catch (e) {} }
function thmPage() {
  tab = 'home'; push(() => home()); const t = thmGet(), v = thmVals(t) || THM.purple, all = Object.keys(THM).map(k => [k, THM[k].n, THM[k]]).concat(t.mine.map(m => [m.id, m.n, thmVals({id: 'custom', c: m}), 1]));
  const inp = (key, lab) => `<div class="thr"><span>${lab}</span><input type="color" value="${v[key]}" oninput="thmLive('${key}',this.value)"></div>`;
  render(pageHead('🎨 রঙ ও থিম সাজান') + `<div class="pad"><div class="cx"><b>তৈরি থিম</b><div class="thg">${all.map(x => `<div class="thc${t.id === x[0] ? ' on' : ''}" style="background:linear-gradient(135deg,${x[2].p},${x[2].tl ? x[2].tl[3] : hexMix(x[2].p, '#000000', .35)})" onclick="thmPick('${x[0]}')">${x[1]}${x[3] ? `<u onclick="event.stopPropagation();thmDel('${x[0]}')">✕</u>` : ''}</div>`).join('')}</div></div><div class="cx"><b>নিজের পছন্দের রঙ</b><div class="hint">রঙের গোল চাপুন। সাথে সাথে পুরো অ্যাপে বদলাবে।</div>${inp('p', 'কার্ড ও হেডারের মূল রঙ')}${inp('pg', 'অ্যাপের পেছনের রঙ')}${inp('ac', 'ব্যাজ ও বোতামের রঙ')}${inp('nv', 'নিচের মেনুর রঙ')}<button class="btn sm" style="margin-top:10px;background:#16a34a" onclick="thmSave()">⭐ এই রঙ নিজের থিম হিসেবে সেভ করুন</button> <button class="btn sm" style="background:#64748b" onclick="thmReset()">↩️ ডিফল্ট থিমে ফিরুন</button></div></div>`);
}
const HGC_RE = /background:linear-gradient\(135deg,#[0-9a-fA-F]{6},#[0-9a-fA-F]{6}cc\)/;

function p53Init() {
  if (window.__p53) return; window.__p53 = 1;
  // লোগো
  window.appLogoHtml = function () { const c = APPCFG(); return `<span class="logo"><img src="${okImg(c.logo) ? c.logo : 'icon-192.png'}" alt=""></span>`; };
  // থিম
  const at0 = window.applyTheme; window.applyTheme = function () { at0.apply(this, arguments); applyThm(); }; applyThm();
  const td0 = window.toggleDark; if (td0) window.toggleDark = function () { const r = td0.apply(this, arguments); setTimeout(() => { try { applyTheme(); } catch (e) {} }, 30); return r; };
  const hc0 = window.hgCards; window.hgCards = function () {
    let h = hc0.apply(this, arguments); const v = thmVals(thmGet()); if (!v || !v.tl) return h; let i = 0;
    return h.replace(new RegExp(HGC_RE.source, 'g'), () => { const c = v.tl[i++ % v.tl.length]; return `background:linear-gradient(135deg,${c},${hexMix(c, '#ffffff', .14)})`; });
  };
  // বহু খাতা
  const wrap = (fn, k) => { const o = window[fn]; if (typeof o !== 'function' || o.__bk) return; window[fn] = function () { window.__bkPg = k; const r = o.apply(this, arguments); try { bkInject(); } catch (e) {} return r; }; window[fn].__bk = 1; };
  Object.keys(BKM).forEach(k => wrap(BKM[k].pg, k));
  const rd0 = window.render; window.render = function () { const r = rd0.apply(this, arguments); try { bkInject(); } catch (e) {} return r; };
  const op0 = window.open_; window.open_ = function (id) { window.__bkPg = null; if (id === 'theme') return thmPage(); return op0.apply(this, arguments); };
  const bk0 = window.back; window.back = function () { window.__bkPg = null; return bk0.apply(this, arguments); };
  const hm0 = window.home; window.home = function () { window.__bkPg = null; return hm0.apply(this, arguments); };
  // সাইড মেনুতে রঙের লাইন
  const dr0 = window.drawer; window.drawer = function () {
    const h = dr0.apply(this, arguments), it = `<div class="it" onclick="toggleDrawer();open_('theme')"><span>🎨</span>রঙ ও থিম সাজান</div>`, k = `<div class="it" onclick="toggleDrawer();open_('vis')">`;
    if (h.includes(k)) return h.replace(k, it + k); const j = h.indexOf('<div class="it"'); return j >= 0 ? h.slice(0, j) + it + h.slice(j) : h;
  };
  const st = document.createElement('style'); st.textContent = `
.bkbar{margin:10px 14px;background:var(--cd,#fff);border-radius:20px;padding:11px 13px;display:flex;align-items:center;gap:10px;box-shadow:0 3px 12px #0002;border-left:8px solid var(--c);cursor:pointer;color:var(--tx,#1a1a1a)}
.bkbar .bki{width:40px;height:40px;border-radius:13px;background:color-mix(in srgb,var(--c) 16%,#fff);display:flex;align-items:center;justify-content:center;font-size:21px;flex:none}.bkbar b{display:block;font-size:14.5px}.bkbar small{color:#64748b;font-size:11.5px}.bkbar .bkar{margin-left:auto;font-size:18px;color:#64748b}
.bkr{cursor:pointer;background:#f8fafc;border-radius:16px;padding:10px 12px;margin:8px 0;border-left:7px solid var(--c)}.bkr.on{background:#ecfdf5}.bkr b{font-size:14px;display:flex;justify-content:space-between;align-items:center}.bkgo{font-style:normal;font-size:12px;color:#2563eb;font-weight:800}.bkr small{color:#64748b;font-size:11.5px;display:block;margin:2px 0 6px}.bka{display:flex;flex-wrap:wrap;gap:6px}.bka span{font-size:12px;font-weight:700;background:#e2e8f0;border-radius:10px;padding:5px 10px;cursor:pointer}
.bkn{margin-top:10px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;text-align:center;font-weight:800;border-radius:16px;padding:12px;cursor:pointer}
.bkpal{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.bkpal i{width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 5px #0004;display:block;cursor:pointer}.bkany{font-size:12.5px;display:flex;align-items:center;gap:6px}
.thg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}.thc{color:#fff;font-weight:800;font-size:13px;text-align:center;padding:16px 6px;border-radius:16px;cursor:pointer;position:relative;box-shadow:0 3px 10px #0003}.thc.on{outline:3px solid var(--ac,#f6d365);outline-offset:2px}.thc u{position:absolute;top:4px;right:8px;text-decoration:none;font-size:12px;opacity:.8}
.thr{display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:14px;padding:8px 12px;margin:8px 0;font-size:13.5px;font-weight:700}.thr input{width:46px;height:34px;border:0;padding:0;background:none}
.hgc{box-shadow:0 8px 18px #0003!important;border-radius:22px!important}
body.nd #bars{left:50%;transform:translateX(-50%);width:calc(100% - 28px);max-width:452px;bottom:90px;border-radius:14px;overflow:hidden;box-shadow:0 8px 18px #0005}body.nd #bars .tkr{height:30px}body.nd #bars .adbot{border-radius:14px 14px 0 0}body.nd #app{padding-bottom:170px!important}`;
  document.head.appendChild(st);
}

// ===== p54: মেসে টাকা জমা + এক পেজের হিসাব + কার কাছ থেকে/কাকে =====
function msCalc(ym) {
  const d = msLoad(), m = msM(d, ym); m.dep = m.dep || [];
  const mem = d.mem.map(x => ({n: x.n, ph: x.ph || '', meals: 0, bazar: 0, pin: 0, pout: 0, cost: 0, net: 0, dep: 0, hold: 0, recv: [], give: []}));
  const by = {}; mem.forEach(x => { by[x.n] = x; });
  Object.keys(m.meals).forEach(dt => { const r = m.meals[dt]; Object.keys(r).forEach(n => { if (by[n]) by[n].meals += +r[n] || 0; }); });
  m.bz.forEach(b => { if (by[b.who]) by[b.who].bazar += +b.amt || 0; });
  m.pay.forEach(p => { if (by[p.from]) by[p.from].pin += +p.amt || 0; if (by[p.to]) by[p.to].pout += +p.amt || 0; });
  let td = 0;
  m.dep.forEach(p => { const a = +p.amt || 0; td += a; if (by[p.n]) by[p.n].dep += a; if (p.to && p.to !== p.n && by[p.n] && by[p.to]) { by[p.n].pin += a; by[p.to].pout += a; by[p.to].hold += a; } });
  const tb = mem.reduce((a, x) => a + x.bazar, 0), tm = mem.reduce((a, x) => a + x.meals, 0), rate = tm ? tb / tm : 0;
  mem.forEach(x => { x.cost = x.meals * rate; x.net = x.bazar + x.pin - x.pout - x.cost; });
  const cr = mem.filter(x => x.net > 0.5).map(x => ({n: x.n, v: x.net})), db = mem.filter(x => x.net < -0.5).map(x => ({n: x.n, v: -x.net})), setl = [];
  cr.sort((a, b) => b.v - a.v); db.sort((a, b) => b.v - a.v);
  db.forEach(dd => { let need = dd.v; cr.forEach(cc => { if (need > 0.5 && cc.v > 0.5) { const t = Math.min(need, cc.v); setl.push({from: dd.n, to: cc.n, amt: t}); need -= t; cc.v -= t; } }); });
  setl.forEach(s => { by[s.from].give.push({n: s.to, amt: s.amt}); by[s.to].recv.push({n: s.from, amt: s.amt}); });
  return {mem, tb, tm, rate, setl, m, td};
}
const MSX = {w: '', to: ''};
function msDepForm(C) {
  const d = msLoad(); if (!MSX.to) MSX.to = d.cash || ''; const chips = (k, v) => `<div class="ms-chips">${d.mem.map(x => `<span class="${v === x.n ? 'on' : ''}" onclick="MSX.${k}='${esc(x.n)}';msR()">${esc(x.n)}</span>`).join('')}</div>`;
  const l = (C.m.dep || []).slice().sort((a, b) => (b.d || '').localeCompare(a.d || ''));
  return `<div class="hint" style="margin:0">কে জমা দিল?</div>${chips('w', MSX.w)}<div class="hint" style="margin:6px 0 0">টাকা কার কাছে জমা হলো? (ক্যাশিয়ার)</div>${chips('to', MSX.to)}
    <div style="display:flex;gap:6px"><input class="inp" id="dp_a" type="number" inputmode="decimal" placeholder="কত টাকা?" style="flex:1.2;margin:4px 0;font-size:18px"><input class="inp" id="dp_d" type="date" value="${todayISO()}" style="flex:1;margin:4px 0"></div>
    <input class="inp" id="dp_n" placeholder="নোট (ঐচ্ছিক) — যেমন বিকাশে দিয়েছে" maxlength="60" style="margin:4px 0">
    <div class="ms-sv" style="background:#16a34a;margin:6px 0" onclick="msDepSave()">✅ জমা নিন</div>
    ${l.length ? `<div class="ms-q" style="margin-top:10px">📋 এই মাসের জমার তালিকা</div>${l.map(p => `<div class="ms-bz"><span>${esc(p.n)} → ${esc(p.to || '—')} • ${lgDate(p.d)}${p.note ? ' • ' + esc(p.note) : ''}</span><b>${tk(p.amt)}</b><a href="#" onclick="msDepDel('${p.id}');return false" style="color:#dc2626">✕</a></div>`).join('')}` : '<div class="hint">এই মাসে কোনো জমা লেখা হয়নি।</div>'}`;
}
function msDepSave() {
  const a = parseFloat(en2(gv('dp_a'))); if (!(a > 0)) return alert('টাকা দিন।'); if (!MSX.w) return alert('কে জমা দিল, নাম চাপুন।'); if (!MSX.to) return alert('টাকা কার কাছে জমা হলো, নাম চাপুন।');
  const d = msLoad(), dt = gv('dp_d') || todayISO(), m = msM(d, dt.slice(0, 7)); m.dep = m.dep || []; m.dep.push({id: String(Date.now()), n: MSX.w, to: MSX.to, amt: a, d: dt, note: gv('dp_n').slice(0, 60)}); d.cash = MSX.to; msSave(d); MS.ym = dt.slice(0, 7); msR();
}
function msDepDel(id) { if (!confirm('এই জমা মুছবেন?')) return; const d = msLoad(), m = msM(d, msYm()); m.dep = (m.dep || []).filter(p => p.id !== id); msSave(d); msR(); }
function msAllHtml(C, ro) {
  const d = msLoad(), cash = d.cash || '';
  const top = `<div class="mxt"><div style="background:#16a34a">${nm2(C.tm)}<small>মোট মিল</small></div><div style="background:#2563eb">${tk(C.td)}<small>মোট জমা</small></div><div style="background:#ea580c">${tk(C.tb)}<small>মোট বাজার</small></div></div><div class="mxr">এক মিলের দাম: ${tk(Math.round(C.rate * 100) / 100)}</div>`;
  const cards = C.mem.map(x => {
    const g = x.net > 0.5, dd = x.net < -0.5, col = g ? '#16a34a' : dd ? '#dc2626' : '#94a3b8';
    const tag = g ? `<span class="mxg">পাবে ${tk(Math.round(x.net))}</span>` : dd ? `<span class="mxd">দিবে ${tk(Math.round(-x.net))}</span>` : '<span class="mxz">মিটে গেছে</span>';
    const fr = x.recv.length ? `<div class="mxf g">↩ ${x.recv.map(r => esc(r.n) + '-এর কাছ থেকে ' + tk(Math.round(r.amt))).join(' • ')}</div>` : '', to = x.give.length ? `<div class="mxf d">↪ ${x.give.map(r => esc(r.n) + '-কে ' + tk(Math.round(r.amt))).join(' • ')}</div>` : '';
    return `<div class="mxc" style="--c:${col}" ${ro ? '' : `onclick="msPerson('${esc(x.n)}')"`}><b>${esc(x.n)}${cash === x.n ? ' 💼' : ''} ${tag}</b>${fr}${to}${x.hold > 0 ? `<div class="mxh">💼 জমার টাকা ${tk(x.hold)} এর কাছে আছে</div>` : ''}
      <div class="mxg4"><div><b>${nm2(x.meals)}</b>মিল</div><div><b>${tk(x.dep)}</b>জমা</div><div><b>${tk(x.bazar)}</b>বাজার</div><div><b>${tk(Math.round(x.cost))}</b>খরচ</div></div>
      <div class="mxe">বাজার ${tk(x.bazar)} + দিয়েছে ${tk(x.pin)} − নিয়েছে ${tk(x.pout)} − খরচ ${tk(Math.round(x.cost))} = ${x.net < 0 ? '−' : ''}${tk(Math.round(Math.abs(x.net)))}</div></div>`;
  }).join('');
  const setl = C.setl.length ? `<div class="ms-give"><b>🔁 কে কাকে কত দিবে</b>${C.setl.map(s => `<div>👉 ${esc(s.from)} ➜ ${esc(s.to)} <b>${tk(Math.round(s.amt))}</b></div>`).join('')}</div>` : '';
  const dl = ro && (C.m.dep || []).length ? `<div class="ms-q" style="margin-top:10px">📋 জমার তালিকা</div>${C.m.dep.slice().sort((a, b) => (b.d || '').localeCompare(a.d || '')).map(p => `<div class="ms-bz"><span>${esc(p.n)} → ${esc(p.to || '—')} • ${lgDate(p.d)}</span><b>${tk(p.amt)}</b></div>`).join('')}` : '';
  return top + cards + setl + dl + '<div class="hint">নিয়ম: মিলের দাম = মোট বাজার ÷ মোট মিল। পাবে/দিবে = বাজার + দিয়েছে − নিয়েছে − খরচ। জমার টাকা ক্যাশিয়ারের কাছে ধরা হয়।</div>';
}
function msXform(h) {
  const a = h.indexOf('<div class="ms-s"><div class="sh"><i>৫</i>কার কত পাওনা'), b = h.indexOf('<div class="ms-s"><div class="sh"><i>৬</i>ফাইল'); if (a < 0 || b < a) return h;
  const C = msCalc(msYm());
  return h.slice(0, a) + `<div class="ms-s"><div class="sh"><i>৫</i>💵 টাকা জমা</div>${msDepForm(C)}</div><div class="ms-s"><div class="sh"><i>৬</i>কার কত মিল, জমা, বাজার, পাবে/দিবে</div>${msAllHtml(C)}</div>` + h.slice(b).replace('<i>৬</i>ফাইল', '<i>৭</i>ফাইল');
}
function p54Init() {
  if (window.__p54) return; window.__p54 = 1;
  const mp = window.msPage; window.msPage = function () { window.__msX = 1; try { return mp.apply(this, arguments); } finally { window.__msX = 0; } };
  const r0 = window.render; window.render = function (h) { if (window.__msX && typeof h === 'string' && h.indexOf('class="pad ms"') >= 0) { try { h = msXform(h); } catch (e) { console.error(e); } } const a = Array.prototype.slice.call(arguments); a[0] = h; return r0.apply(this, a); };
  const st = document.createElement('style'); st.textContent = `.mxt{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:4px 0 8px}.mxt div{border-radius:14px;padding:9px 4px;text-align:center;color:#fff;font-weight:800;font-size:15px}.mxt small{display:block;font-size:10.5px;font-weight:600;opacity:.92}.mxr{text-align:center;font-size:12.5px;font-weight:700;color:#475569;margin-bottom:6px}
.mxc{background:#fff;border-radius:18px;padding:11px 12px;margin:8px 0;box-shadow:0 2px 8px #0002;border-left:7px solid var(--c);cursor:pointer;color:#1a1a1a}.mxc>b{font-size:15px;display:flex;justify-content:space-between;align-items:center;gap:8px}.mxg,.mxd,.mxz{border-radius:10px;padding:4px 10px;font-weight:800;font-size:13px}.mxg{background:#dcfce7;color:#166534}.mxd{background:#fee2e2;color:#991b1b}.mxz{background:#f1f5f9;color:#475569}
.mxf{margin-top:6px;font-size:12.5px;font-weight:700}.mxf.g{color:#166534}.mxf.d{color:#991b1b}.mxh{margin-top:5px;font-size:11.5px;color:#475569;font-weight:700}.mxg4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.mxg4 div{background:#f8fafc;border-radius:10px;padding:6px 2px;text-align:center;font-size:11px;color:#64748b}.mxg4 b{display:block;font-size:13px;color:#111}.mxe{font-size:10.8px;color:#64748b;margin-top:7px;text-align:center}`;
  document.head.appendChild(st);
}
