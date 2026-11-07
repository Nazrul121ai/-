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
const mapRow = r => ({id: r.id, type: r.type, title: r.title, body: r.body, url: r.url, sub: r.sub, ic: r.ic, mt: r.mt, pin: !!r.pin, pub: r.pub !== false, at: r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : (+r.createdAt || 0), job: r.job || null, contact: r.contact || null, cfg: r.cfg || null, quiz: r.quiz || null, img: r.img || '', parent: r.parent || '', titleEn: r.titleEn || '', bodyEn: r.bodyEn || '', lang: r.lang || 'auto', color: r.color || '', ord: +r.ord || 0, slot: r.slot || '', label: r.label || '', pd: r.pd || '', exp: r.exp || '', credit: r.credit || '', bank: r.bank || '', n: +r.n || 0, hid: !!r.hid, qz: Array.isArray(r.qz) ? r.qz : [], key: r.key || '', blocks: Array.isArray(r.blocks) ? r.blocks : []});

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
  const tabs = [['pub', '✍️ নতুন'], ['list', '📚 সব কনটেন্ট'], ['set', '🎨 রং ও পরিচয়'], ['lay', '🧩 সাজানো'], ['qg', '🤖 প্রশ্ন বানান'], ['hid', '🙈 লুকানো'], ['ads', '📣 বিজ্ঞাপন ও খবর'], ['contact', '📞 যোগাযোগ'], ['rep', '🚩 রিপোর্ট'], ['stat', '📊 পরিসংখ্যান'], ['ord', '📨 অর্ডার ও PDF'], ['jads', '💼 জব বিজ্ঞাপন'], ['mkr', '🛠️ মেকার ভাই'], ['adm', '👥 অ্যাডমিন']];
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
const CFG_DEF = {name: 'চালক ভাই', sub: 'শেখা • কাগজপত্র • চাকরি', ic: '🛞', logo: '', c1: '#006a4e', pg: '#f4f5f1', cd: '#ffffff', tx: '#1a1a1a', bism: true, tiles: {}, layout: null, hidden: null, edits: null, pdfDef: true, pdfOff: null, pdfOn: null, daily: null, ntc: null, jobAuto: false, mkOn: true, mkReg: true, mkJobs: null, mkVil: null, hubs: null, seedHide: null};
function APPCFG() {
  const c = ADMIN_CONTENT.find(x => x.type === 'config'); const k = (c && c.cfg) || {};
  const o = Object.assign({}, CFG_DEF); Object.keys(CFG_DEF).forEach(f => { if (k[f] !== undefined && k[f] !== null && k[f] !== '') o[f] = k[f]; });
  if (c && okImg(c.img)) o.logo = c.img;
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
  b.innerHTML = h; const ap = document.getElementById('app'); if (ap) ap.style.paddingBottom = (h ? b.offsetHeight + 14 : 16) + 'px';
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
    ${g.ids.map((id, ti) => { const t = tiles[id] || {}; return `<div class="layrow"><span class="lai">${esc(tileOv(id).ic || t.ic || '•')}</span><span class="lan">${esc(keyName(id))}</span><button onclick="layHide('${esc(id)}')" style="background:${tileOv(id).hide ? '#dc2626' : '#64748b'}">${tileOv(id).hide ? '🙈' : '👁️'}</button><button onclick="layMoveT(${gi},${ti},-1)">⬆</button><button onclick="layMoveT(${gi},${ti},1)">⬇</button><select onchange="layTo(${gi},${ti},this.value)"><option value="">কোথায়</option>${_lay.map((x, k) => k === gi ? '' : `<option value="${k}">${esc(x.name || 'গ্রুপ ' + (k + 1))}</option>`).join('')}</select></div>`; }).join('') || '<div class="hint">এই গ্রুপে এখন কিছু নেই।</div>'}</div>`).join('');
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
function layTo(gi, ti, v) { if (v === '') return; layCommit(); const id = _lay[gi].ids.splice(ti, 1)[0]; _lay[+v].ids.push(id); layRefresh(); }
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
(function () { const st = document.createElement('style'); st.textContent = `.layrow{display:flex;align-items:center;gap:6px;margin:6px 0;padding:6px;border-radius:10px;background:var(--tint)}.lai{font-size:20px;width:28px;text-align:center}.lan{flex:1;font-size:14px;font-weight:600}.layrow button{border:0;background:var(--p2);color:#fff;border-radius:8px;width:34px;height:32px}.layrow select{max-width:84px;font:inherit;font-size:12px;border-radius:8px;border:1px solid #cbd5e1;height:32px}`; document.head.appendChild(st); })();

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
      { const ad = attDoc(k), bh = ad ? bkHtml(ad.blocks, adm) : ''; if (bh) el.insertAdjacentHTML('afterend', `<div class="atch">${bh}</div>`); }
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
    await ln.schedule({notifications: [{id: notifId(n.id), title: 'চালক ভাই: ' + (n.t || 'নোট'), body: (n.b || '').slice(0, 100) || 'আপনার নোটের সময় হয়েছে', schedule: {at, allowWhileIdle: true}}]}); return 'ok';
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
        : b.t === 'img' ? `<input type="file" accept="image/*" id="bk_f"><input class="inp" id="bk_c" placeholder="ছবির নিচের লেখা (ঐচ্ছিক)" value="${esc(b.c || '')}"><div class="hint">অথবা ছবির লিংক:</div><input class="inp" id="bk_v" placeholder="https://..." value="${esc(okImg(b.v) ? '' : (b.v || ''))}">`
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
    if (b.t === 'img') { const f = document.getElementById('bk_f'); if (f && f.files && f.files[0]) b.v = await imgToData(f.files[0], 1000); else if (v.trim()) { if (!safeUrl(v)) throw {message: 'ছবির লিংক ঠিক নয়।'}; b.v = v.trim(); } b.c = (document.getElementById('bk_c') || {}).value || ''; if (!b.v) throw {message: 'ছবি বাছুন বা লিংক দিন।'}; }
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
  const txt = e ? `আমি "চালক ভাই" অ্যাপের লম্বা কুইজে ${QT.s} পয়েন্ট পেয়েছি! তুমি কত পাবে?` : `আমি "চালক ভাই" অ্যাপে ${QT.s}/${QT.list.length} পেয়েছি!`;
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
    <input class="inp" id="ja_t" maxlength="100" placeholder="পদের নাম * (যেমন: ট্রাক ড্রাইভার)"><input class="inp" id="ja_c" maxlength="100" placeholder="কোম্পানি / আপনার নাম *"><input class="inp" id="ja_s" maxlength="60" placeholder="বেতন (যেমন: ২০,০০০ টাকা)"><input class="inp" id="ja_lic" maxlength="60" placeholder="লাইসেন্স (যেমন: হেভি)"><input class="inp" id="ja_loc" maxlength="80" placeholder="কাজের জায়গা"><input class="inp" id="ja_ph" maxlength="20" placeholder="যোগাযোগের মোবাইল নম্বর *"><label class="hint">আবেদনের শেষ তারিখ (ঐচ্ছিক)</label><input class="inp" id="ja_dl" type="date"><select class="inp" id="ja_k"><option value="local">দেশি চাকরি</option><option value="foreign">বিদেশি চাকরি</option></select><textarea class="inp" id="ja_d" rows="4" maxlength="800" placeholder="বিস্তারিত"></textarea><div id="ja_m" class="warn" style="display:none"></div><button class="btn" onclick="jadSave()">📤 জমা দিন</button>`);
}
async function jadSave() {
  const m = await sme(); const msg = t => { const e = document.getElementById('ja_m'); e.style.display = 'block'; e.textContent = t; }; if (!m) return msg('লগইন দরকার।');
  const d = {t: gv('ja_t'), c: gv('ja_c'), s: gv('ja_s'), lic: gv('ja_lic'), loc: gv('ja_loc'), phone: gv('ja_ph'), d: gv('ja_d'), deadline: gv('ja_dl'), kind: gv('ja_k') === 'foreign' ? 'foreign' : 'local'};
  if (!d.t || !d.c) return msg('পদের নাম ও কোম্পানি/নাম দিন।'); if (!/^[\d০-৯+\-\s]{6,20}$/.test(d.phone)) return msg('সঠিক মোবাইল নম্বর দিন।');
  d.by = m.u.uid; d.byName = ((cloudInfo() || {}).name || '').slice(0, 40); d.at = Date.now(); const auto = cfgv('jobAuto') === true; d.status = auto ? 'approved' : 'pending';
  try {
    const mine = await sList(m.f, ['jobads'], m.f.F.where('by', '==', m.u.uid)); if (mine.length >= 20) return msg('আপনার অনেক বিজ্ঞাপন আছে। পুরোনো কিছু মুছে আবার দিন।');
    try { await m.f.F.addDoc(m.f.F.collection(m.f.db, 'jobads'), d); } catch (e) { if (auto) { d.status = 'pending'; await m.f.F.addDoc(m.f.F.collection(m.f.db, 'jobads'), d); } else throw e; }
    closeModal(); await jadRefresh(); alert(d.status === 'approved' ? '✅ বিজ্ঞাপন চালু হয়েছে।' : '✅ জমা হয়েছে। অ্যাডমিন অনুমোদন দিলে সবার কাছে দেখাবে।'); jobsPage();
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
  const aj0 = adminJobs; adminJobs = function () { return aj0().concat(JOBADS.map(a => ({kind: a.kind === 'foreign' ? 'foreign' : 'local', t: a.t, c: a.c, s: a.s, lic: a.lic, loc: a.loc, deadline: a.deadline, phone: a.phone, d: a.d, _ad: a.id, _st: a.status, _by: a.by}))); };
  const jp0 = jobsPage; jobsPage = function () { jp0.apply(this, arguments); jadBar(); };
  const sj0 = showJob; showJob = function (i) {
    sj0.apply(this, arguments); const j = activeJobs()[i]; if (!j || !j._ad) return; const b = document.querySelector('#modal .mbox'); if (!b) return;
    b.insertAdjacentHTML('beforeend', `${j._st === 'illegal' ? '<div class="warn" style="background:#fee2e2;color:#991b1b;border-color:#dc2626">⚠️ অ্যাডমিন এই বিজ্ঞাপনটিকে সন্দেহজনক/অবৈধ হিসেবে চিহ্নিত করেছেন। আবেদন করবেন না, কোনো টাকা দেবেন না।</div>' : '<div class="hint" style="margin-top:8px">👤 ব্যবহারকারীর দেওয়া বিজ্ঞাপন — আবেদনের আগে নিজে যাচাই করুন।</div>'}<button class="btn sm" style="background:#64748b;margin-top:8px" onclick="jadReport('${esc(j._ad)}')">🚩 রিপোর্ট করুন</button>`);
  };
  const o1 = open_; open_ = function (id) { if (id === 'maker') { push(() => home()); return makerPage(); } return o1.apply(this, arguments); };
  setTimeout(jadRefresh, 1500);
}

const PRIVACY=[["সারসংক্ষেপ", "\"চালক ভাই\" অ্যাপটি বাংলাদেশের চালক ও চালক হতে ইচ্ছুকদের জন্য তৈরি। এই নীতিতে বলা আছে আমরা কোন তথ্য নিই, কেন নিই এবং আপনি কীভাবে সেটি নিয়ন্ত্রণ করবেন। আমরা কোনো তথ্য বিক্রি করি না এবং অ্যাপে কোনো বিজ্ঞাপন-ট্র্যাকিং নেই।"], ["কোন তথ্য আমরা নিই", "• অ্যাকাউন্ট: নাম এবং মোবাইল নম্বর বা ইমেইল (লগইনের জন্য)। পাসওয়ার্ড সরাসরি আমাদের কাছে থাকে না, Firebase Authentication সেটি সুরক্ষিতভাবে রাখে।\n• আপনি ইচ্ছা করে যা দেন: কমিউনিটির পোস্ট ও মন্তব্য, চাকরিপ্রার্থী আইডি, চাকরির বিজ্ঞাপন, মেকার ভাইয়ের নিবন্ধন (নাম, ঠিকানা, পেশা, অভিজ্ঞতা, ঐচ্ছিক ছবি), অর্ডার ফর্ম।\n• ক্লাউড ব্যাকআপ: আপনি চালু করলে খাতা, নোট, আয়-খরচ, রিমাইন্ডার ইত্যাদি আপনার অ্যাকাউন্টে সংরক্ষিত হয়।\n• শেষ কখন অ্যাপ খুলেছেন (ব্যবহারকারী গণনার জন্য)।\n• অ্যাপের বাকি তথ্য (সেটিং, নোট, খাতা) আপনার ফোনেই থাকে।"], ["মোবাইল নম্বর ও ইমেইল", "মেকার ভাই ও চাকরিপ্রার্থী আইডিতে আপনার মোবাইল নম্বর বা ইমেইল অন্যদের দেখানো হয় শুধু আপনি অনুমতি দিলে। অনুমতি না দিলে সেগুলো শুধু অ্যাপের অ্যাডমিন দেখতে পারেন। চাকরির বিজ্ঞাপনে আপনি যে যোগাযোগ নম্বর দেন সেটি বিজ্ঞাপনের অংশ হিসেবে সবাই দেখে।"], ["তথ্য কেন ব্যবহার করি", "অ্যাকাউন্ট চালু রাখা, ক্লাউড ব্যাকআপ, কমিউনিটি ও চাকরি/মেকার সেবা চালানো, অপব্যবহার ঠেকানো এবং অ্যাপ উন্নত করা।"], ["তৃতীয় পক্ষ", "অ্যাপ Google Firebase (Authentication ও Firestore) ব্যবহার করে। তথ্য Google-এর সার্ভারে সংরক্ষিত থাকে। ইউটিউব বা অন্য লিংক খুললে সেই সাইটের নীতি প্রযোজ্য। আমরা তথ্য কোনো বিজ্ঞাপনদাতার কাছে বিক্রি বা ভাগ করি না।"], ["অনুমতি (পারমিশন)", "ইন্টারনেট: ক্লাউড ও কনটেন্ট আনতে। নোটিফিকেশন: আপনার সেট করা নোট/রিমাইন্ডারের স্মরণ করিয়ে দিতে। ফাইল সংরক্ষণ/শেয়ার: PDF ও ব্যাকআপ ফাইল তৈরি ও পাঠাতে।"], ["আপনার নিয়ন্ত্রণ ও তথ্য মোছা", "• অ্যাপের ভিতরে «অ্যাকাউন্ট» পাতা থেকে «অ্যাকাউন্ট মুছে ফেলুন» চাপলে আপনার অ্যাকাউন্ট, প্রোফাইল, চাকরিপ্রার্থী আইডি, মেকার প্রোফাইল ও ক্লাউড ব্যাকআপ মুছে যায়।\n• আপনার আগে করা কমিউনিটি পোস্ট/মন্তব্য নিজে মুছতে পারবেন।\n• মেকার প্রোফাইল নিজে লুকাতে বা মুছে ফেলার আবেদন করতে পারবেন।\n• অ্যাপের অ্যাডমিনকে লিখেও তথ্য মোছার অনুরোধ করা যায়।"], ["শিশুদের তথ্য", "অ্যাপটি ১৩ বছরের কম বয়সীদের জন্য নয় এবং আমরা জেনেশুনে তাদের তথ্য নিই না।"], ["নিরাপত্তা ও মডারেশন", "ডেটা ইন্টারনেটে এনক্রিপ্টেড সংযোগে যায়। ভুয়া বা ক্ষতিকর কনটেন্ট রিপোর্ট করা যায় এবং অ্যাডমিন তা সরাতে বা অপব্যবহারকারীর আইডি বন্ধ করতে পারেন।"], ["দাবিত্যাগ", "এটি কোনো সরকারি অ্যাপ নয়। অ্যাপের তথ্য শেখার সহায়তা হিসেবে দেওয়া; সরকারি নিয়ম ও চাকরির বিজ্ঞাপনের সত্যতা আপনি নিজে যাচাই করুন।"], ["নীতি বদল ও যোগাযোগ", "নীতি বদলালে এখানে নতুন তারিখসহ জানানো হবে। প্রশ্ন বা তথ্য মোছার অনুরোধ: [আপনার ইমেইল এখানে লিখুন]। সর্বশেষ হালনাগাদ: ৪ নভেম্বর ২০২৬।"]];
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
  b.className = on ? 'uv-top' : 'uv-pill';
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
  g.fillStyle = P.p; g.fillRect(0, H - 28, W, 28); T('Safe Drive • Smart Record • Better Service', 28, H - 9, {sz: 13, b: 1, col: P.a === '#c8c8c8' ? '#e5e5e5' : P.a}); T((typeof appName === 'function' ? appName() : 'চালক ভাই') + ' • পাতা ' + lbBn(pi + 1) + '/' + lbBn(np), W - 28, H - 9, {sz: 12, col: '#fff', al: 'right'});
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
