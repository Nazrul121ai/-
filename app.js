// Capacitor প্লাগইন ধরার নিরাপদ উপায় (registerPlugin না থাকলেও চলে)
function capP(n) {
  const C = window.Capacitor; if (!C) return null;
  try { if (typeof C.registerPlugin === 'function') return C.registerPlugin(n); } catch (e) {}
  try { if (C.Plugins && C.Plugins[n]) return C.Plugins[n]; } catch (e) {}
  if (typeof C.nativePromise === 'function') return new Proxy({}, {get: (_, m) => m === 'then' ? undefined : m === 'addListener' ? (ev, cb) => (typeof C.addListener === 'function' ? C.addListener(n, ev, cb) : null) : (o) => C.nativePromise(n, String(m), o || {})});
  return null;
}
const $app = document.getElementById('app');
let tab = 'home', stack = [];

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bn = n => LANG === 'en' ? String(n) : String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };

// ---------- ভয়েস ----------
let _spkId = 0;
const ttsPlugin = () => { try { const C = window.Capacitor; if (C && C.isNativePlatform && C.isNativePlatform()) return capP('TextToSpeech'); } catch (e) {} return null; };
function speakStop() { _spkId++; try { const p = ttsPlugin(); if (p) p.stop(); else if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {} }
function ttsHelp(why) {
  showModal(`<h3 style="margin:0 0 8px">🔊 বাংলা ভয়েস চালু করুন</h3><div style="font-size:14.5px;line-height:1.7">${why === 'none' ? 'এই ফোনে শোনানোর ব্যবস্থা পাওয়া যায়নি।' : 'আপনার ফোনে বাংলা ভয়েস এখনো নেই বা বন্ধ আছে।'} একবার এটা করলেই অ্যাপের "🔊 শুনুন" বাটন কাজ করবে:<ol style="padding-left:20px"><li>ফোনের <b>সেটিংস</b> খুলুন</li><li><b>সাধারণ ব্যবস্থাপনা / সিস্টেম → ভাষা → টেক্সট-টু-স্পিচ</b> (Text-to-speech) এ যান</li><li><b>Google টেক্সট-টু-স্পিচ</b> বেছে নিন, তারপর ⚙️ → <b>ভয়েস ডেটা ইনস্টল করুন</b></li><li><b>বাংলা (বাংলাদেশ)</b> বেছে ডাউনলোড করুন</li></ol>ফোনে Google ইঞ্জিন না থাকলে Play Store থেকে "Speech Services by Google" ইনস্টল করুন।</div>`);
}
function ttsChunks(t) { const parts = t.split(/(?<=[।.!?\n])/), out = []; let cur = ''; parts.forEach(x => { if ((cur + x).length > 280 && cur) { out.push(cur); cur = ''; } cur += x; }); if (cur.trim()) out.push(cur); return out.map(x => x.trim()).filter(Boolean); }
async function speak(text) {
  text = String(text || '').replace(/\{red:([^}]*)\}/g, '$1').replace(/[*#]/g, '').trim(); if (!text) return;
  const lang = /[\u0980-\u09FF]/.test(text) ? 'bn-BD' : 'en-US', id = ++_spkId, p = ttsPlugin();
  if (p) {
    try {
      try { await p.stop(); } catch (e) {}
      try { const s = await p.isLanguageSupported({lang}); if (s && s.supported === false) return ttsHelp(); } catch (e) {}
      for (const c of ttsChunks(text)) { if (id !== _spkId) return; await p.speak({text: c, lang, rate: 0.9, pitch: 1.0, volume: 1.0, category: 'playback'}); }
    } catch (e) { if (id === _spkId) ttsHelp(); }
    return;
  }
  if (!('speechSynthesis' in window)) return ttsHelp('none');
  speechSynthesis.cancel(); let started = false;
  ttsChunks(text).forEach((c, i) => { const u = new SpeechSynthesisUtterance(c); u.lang = lang; u.rate = .9; if (!i) { u.onstart = () => { started = true; }; u.onerror = () => { if (!started) ttsHelp(); }; } speechSynthesis.speak(u); });
  setTimeout(() => { if (!started && id === _spkId && !speechSynthesis.speaking) ttsHelp(); }, 1800);
}

// ---------- কাঠামো ----------
function nav() {
  const items = [['home','🏠','হোম'],['study','🎓','প্রস্তুতি'],['quiz','📋','মডেল টেস্ট'],['job','💼','চাকরি'],['profile','👤','প্রোফাইল']];
  return '<div class="nav">' + items.map(i =>
    `<div class="${tab===i[0]?'on':''}" onclick="go('${i[0]}')"><b>${i[1]}</b>${i[2]}</div>`).join('') + '</div>';
}
function drawer() {
  const m = [['test','🛞','ড্রাইভিং টেস্টের প্রশ্ন'],['book','📘','ড্রাইভিং বই'],['road','🛣️','রাস্তার নিয়ম'],['signs','🛑','ট্রাফিক সাইন'],
    ['lessons','🎓','ড্রাইভ লেসন'],['circ','📢','চাকরির বিজ্ঞপ্তি'],['hist','📖','আমার পড়া'],['paper','📰','সাপ্তাহিক চাকরির পত্রিকা'],['account','☁️','লগইন ও ব্যাকআপ'],['profile','👤','আমার প্রোফাইল'],...(CLOUD_ON() ? [['board','📢','নোটিশ বোর্ড'],['community','💬','কমিউনিটি'],['seeker','🪪','চাকরিপ্রার্থী আইডি']] : []),['admin','🛡️','অ্যাডমিন প্যানেল'],...(PAID_ENABLED ? [['courses','🎓','পেইড কোর্স']] : []),['parts','⚙️','গাড়ির যন্ত্রাংশ'],['learn','🚗','গাড়ি চালানো শিখুন'],['logbook','🚖','ড্রাইভার লগ বুক'],['ledger','💰','আয়-খরচ খাতা'],['remind','⏰','রিমাইন্ডার'],['sos','🆘','জরুরি নম্বর'],['hacks','🛠️','দ্রুত সমাধান'],['govguide','🏛️','সরকারি চাকরির প্রস্তুতি'],['govqa','📝','সরকারি চাকরির প্রশ্ন ও সমাধান'],['licguide','🪪','লাইসেন্স করার নিয়ম'],['idp','🌐','আন্তর্জাতিক লাইসেন্স (IDP)'],['warn','🚨','ড্যাশবোর্ড বাতি'],['police','👮','পুলিশের ইশারা'],['signquiz','🧠','সাইন চিনুন কুইজ'],['care','🔧','গাড়ির যত্ন'],['cockpit','🎛️','ককপিট গাইড'],['links','🔗','দরকারি লিংক'],['contact','📞','যোগাযোগ'],['qorder','📨','চাকরির প্রশ্ন নিন'],['notes','🗒️','নোটপ্যাড ও নোট'],['tools','🧰','দৈনন্দিন টুলস'],['viewset','🔎','দেখার সেটিং (জুম ও রং)'],['share','📤','অ্যাপ শেয়ার করুন'],['quiz','📋','মডেল টেস্ট'],['jobprep','💼','চাকরির প্রস্তুতি'],['job','🧑‍✈️','ড্রাইভিং জব'],['cv','🪪','ডিজিটাল সিভি'],['lang','🌐',LANG === 'bn' ? 'ভাষা: English' : 'Language: বাংলা']];
  const byId = {}; m.forEach(i => { byId[i[0]] = i; });
  const DG = [['⭐ আমার অ্যাকাউন্ট ও চাকরি', ['account', 'hist', 'profile', 'seeker', 'maker', 'govguide', 'govqa', 'admin']],
    ['💼 চাকরি', ['job', 'circ', 'jobprep', 'paper', 'cv']],
    ['📚 শেখা ও পরীক্ষা', ['test', 'book', 'road', 'signs', 'lessons', 'quiz', 'signquiz', 'police', 'warn', 'cockpit', 'licguide', 'idp']],
    ['🚗 গাড়ি', ['parts', 'learn', 'care', 'hacks']],
    ['📒 আমার খাতা', ['logbook', 'ledger', 'remind', 'notes', 'tools', 'sos']], ['💬 কমিউনিটি ও নোটিশ', ['board', 'community', 'qorder', 'contact']], ['🗒️ নোট ও টুলস', ['notes', 'tools']],
    ['⚙️ অ্যাপ', ['viewset', 'courses', 'links', 'share', 'lang']]];
  const used = new Set(); let html = '';
  const row = i => `<div class="it" onclick="toggleDrawer();open_('${i[0]}')"><span>${i[1]}</span>${i[2]}</div>`;
  DG.forEach(g => { const items = g[1].map(id => byId[id]).filter(Boolean); items.forEach(i => used.add(i[0])); if (items.length) html += `<div class="dg">${g[0]}</div>` + items.map(row).join(''); });
  const other = m.filter(i => !used.has(i[0])); if (other.length) html += '<div class="dg">অন্যান্য</div>' + other.map(row).join('');
  const ci = typeof cloudInfo === 'function' ? cloudInfo() : null;
  return `<div class="drawer-bg" id="dbg" onclick="toggleDrawer()"></div><div class="drawer" id="drw">
    <div class="dh"><div class="dt">${appLogoHtml()}<div><div class="dn">${esc(appName())}</div><div class="ds">${esc(appSub())}</div></div></div>
      <div class="du" onclick="toggleDrawer();open_('account')"><span>${ci ? '👤 ' + esc(ci.name || ci.id) : '👤 অতিথি • লগইন করুন'}</span><span>›</span></div></div>` + html + `<div class="it" onclick="toggleDrawer();ndLayout()"><span>🎨</span>ডিজাইন ও মেনুর ধরন</div><div class="it" onclick="exitNow()"><span>🚪</span>অ্যাপ থেকে বের হন</div><div class="foot">${esc(appName())} • সংস্করণ ${BUILD_V}</div></div>`;
}
function toggleDrawer() {
  const d = document.getElementById('drw'), b = document.getElementById('dbg');
  const o = d.classList.toggle('open'); b.style.display = o ? 'block' : 'none';
}
function render(html) { window.__rt = Date.now(); window.__rn = (window.__rn || 0) + 1; $app.innerHTML = html + drawer(); window.scrollTo(0, 0); }
// তাড়াহুড়োয় দুইবার চাপ/ভুতুড়ে ক্লিকে অন্য পাতায় চলে যাওয়া ঠেকানো: নতুন পাতা আঁকার ০.৪ সেকেন্ডের মধ্যে পাতার ভিতরের ক্লিক বাদ
document.addEventListener('click', e => { try { if (Date.now() - (window.__rt || 0) < 400 && e.target.closest && e.target.closest('#app') && !e.target.closest('#modal')) { e.preventDefault(); e.stopPropagation(); } } catch (x) {} }, true);
function hero(ic, t, sub) { return `<div class="hero"><div class="hi">${ic}</div><div><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>`; }
function pageHead(t, back = true) {
  return `<div class="page-h">${back ? '<button class="back" onclick="back()">←</button>' : ''}<h2 style="flex:1">${esc(t)}</h2><button class="back hz" aria-label="লেখা ছোট-বড়" onclick="hzOpen()">Aa</button><button class="back hz" aria-label="রং" onclick="hcOpen()">🎨</button><button class="back" style="font-size:20px" aria-label="হোম" onclick="home()">🏠</button><button class="back" aria-label="মেনু" onclick="toggleDrawer()">☰</button></div>`;
}
let _bt = 0;
function back() { if (window.__lgBack && window.__lgBack()) return; if (Date.now() - _bt < 300) return; _bt = Date.now(); const p = stack.pop(); if (p) { p(); if (p._y) { const y = p._y; window.scrollTo(0, y); setTimeout(() => window.scrollTo(0, y), 60); } } else home(); }
function push(fn) { fn._y = window.scrollY || 0; stack.push(fn); }

// ---------- হোম ----------
let tipIdx = Math.floor(Math.random() * TIPS.length);
const SHORT = {intjob:'বিদেশে চাকরি', govqa:'সরকারি চাকরির প্রশ্ন', govguide:'সরকারি চাকরি গাইড', paper:'সাপ্তাহিক পত্রিকা', idp:'আন্তর্জাতিক লাইসেন্স', licguide:'লাইসেন্সের নিয়ম', signquiz:'সাইন কুইজ', roadtest:'রোড টেস্ট', jobprep:'চাকরির প্রস্তুতি', test:'লিখিত প্রশ্ন', book:'ড্রাইভিং বই', road:'রাস্তার নিয়ম', warn:'ড্যাশবোর্ড বাতি', police:'পুলিশের ইশারা', care:'গাড়ির যত্ন', cockpit:'ককপিট গাইড', learn:'গাড়ি চালানো শিখুন', hacks:'দ্রুত সমাধান', parts:'গাড়ির যন্ত্রাংশ', ledger:'আয়-খরচ খাতা', remind:'রিমাইন্ডার', sos:'জরুরি নম্বর', links:'দরকারি লিংক', lessons:'ড্রাইভ লেসন', job:'ড্রাইভিং জব', signs:'ট্রাফিক সাইন', gk:'সাধারণ জ্ঞান'};
const GROUPS = [
  ['চাকরি ও প্রস্তুতি', ['job','circ','intjob','paper','govguide','govqa','jobprep','bangla','english','math','gk']],
  ['লাইসেন্স ও পরীক্ষা', ['licguide','test','signs','signquiz','roadtest','police','idp','book','road']],
  ['গাড়ি চেনা ও চালানো', ['learn','parts','warn','cockpit','care','hacks','lessons']],
  ['কমিউনিটি ও যোগাযোগ', ['board','community','seeker','maker','contact','qorder','notes','tools','viewset']],
  ['আমার খাতা', ['hist','logbook','ledger','remind','sos','links']]
];
const QUICK = [['home','🏠','হোম'],['paper','📰','সাপ্তাহিক পত্রিকা'],['govguide','🏛️','সরকারি চাকরি'],['licguide','🪪','লাইসেন্সের নিয়ম'],['job','💼','চাকরি']];
function tile(c) { const o = tileOv(c.id); if (o.hide) return ''; return `<div class="tile" onclick="open_('${c.id}')"><div class="ti" style="background:${c.color}26">${esc(o.ic || c.ic)}</div><span>${esc(o.name || SHORT[c.id] || c.name)}</span></div>`; }
const BUILD_V = '৪৭ (১৪ নভেম্বর)';
const bismOn = () => { try { return APPCFG().bism !== false; } catch (e) { return true; } };
function dayIdx() { const d = new Date(); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
function dailyCard() {
  const q = QUIZ[dayIdx() % QUIZ.length], st = load('daily', {}), ans = st.d === todayISO() ? st.a : -1;
  return `<div class="daily" id="daily"><div class="dh2"><b>আজকের প্রশ্ন</b><span>${ans >= 0 ? (ans === q[2] ? '✅ সঠিক' : '❌ ভুল') : ''}</span></div><div class="dq">${esc(q[0])}</div>` +
    q[1].map((o, i) => `<div class="opt ${ans >= 0 ? (i === q[2] ? 'ok' : (i === ans ? 'no' : '')) : ''}" onclick="dailyPick(${i})">${esc(o)}</div>`).join('') + '</div>';
}
function dailyPick(i) {
  const st = load('daily', {}); if (st.d === todayISO()) return;
  localStorage.setItem('daily', JSON.stringify({d: todayISO(), a: i}));
  document.getElementById('daily').outerHTML = dailyCard();
}
function homeGroups(includeHidden) {
  const used = new Set(); GROUPS.forEach(g => g[1].forEach(x => used.add(x)));
  const known = ['circ','hist','quiz','signquiz','links','share','paper','parts','learn','hacks','logbook','ledger','remind','sos','govqa','signs','lessons','job','intjob','cv','jobprep','roadtest','account','board','community','seeker','contact','qorder','notes','tools','viewset'];
  if (PAID_ENABLED) known.push('courses');
  const canOpen = id => known.includes(id) || INFO[id] || STUDY[id] || QA[id];
  const shown = new Set(GROUPS.flatMap(g => g[1].map(id => (CATS.find(c => c.id === id) || {}).name)));
  const rest = CATS.filter((c, i) => !used.has(c.id) && canOpen(c.id) && !shown.has(c.name) && CATS.findIndex(x => x.id === c.id) === i);
  const groups = GROUPS.map(g => [g[0], g[1].map(id => CATS.find(c => c.id === id)).filter(Boolean)]).filter(g => g[1].length);
  if (rest.length) groups[groups.length - 1][1] = groups[groups.length - 1][1].concat(rest);
  if (typeof adminTiles === 'function') { const t = adminTiles(); if (t.length) groups.splice(Math.min(1, groups.length), 0, ['📌 নতুন ও বিশেষ', t]); }
  const lg = typeof applyLayout === 'function' ? applyLayout(groups) : groups;
  return includeHidden ? lg : lg.map(g => [g[0], g[1].filter(c => !tileOv(c.id).hide)]).filter(g => g[1].length);
}
function home(q = '') {
  tab = 'home'; stack = [];
  const list = CATS.filter(c => !q || c.name.includes(q) || (SHORT[c.id] || '').includes(q) || c.sub.includes(q));
  let body;
  if (q) body = `<div class="tgrid" style="margin-top:14px">${list.map(tile).join('') || '<div class="empty" style="grid-column:span 3">কিছু পাওয়া যায়নি</div>'}</div>`;
  else {
    const groups = homeGroups();
    body = `<div class="qrow">${QUICK.filter(x => !tileOv(x[0]).hide).map(x => { const o = tileOv(x[0]); return `<div class="qk" onclick="${x[0] === 'home' ? 'home()' : `open_('${x[0]}')`}"><b>${esc(o.ic || x[1])}</b>${esc(o.name || x[2])}</div>`; }).join('')}</div>` +
      alertBanner() + (typeof homeNotice === 'function' ? homeNotice() : '') +
      `<div class="stats"><span>🔥 ধারাবাহিক ${bn(updateStreak().n)} দিন</span><span>🏆 সেরা স্কোর ${bn(load('best', 0))}/${bn(QUIZ.length)}</span></div>` +
      dailyCard() +
      `<div class="tip"><div><b>💡 আজকের টিপস</b><div id="tip-t">${esc(TIPS[tipIdx])}</div></div><button class="btn sm" onclick="speak(document.getElementById('tip-t').innerText)">🔊</button></div>` +
      (typeof hgCards === 'function' ? hgCards() : groups.map(g => `<div class="sec-h">${esc(g[0])}</div><div class="tgrid">${g[1].map(tile).join('')}</div>`).join('') + '<div style="height:14px"></div>');
  }
  render((q || typeof topAd !== 'function' ? '' : topAd()) + `<div class="sign">${!q && bismOn() ? '<div class="bism3">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>' : ''}<div class="hrow"><div class="brand">${appLogoHtml()}<div>${esc(appName())}<small>${esc(appSub())}</small></div></div>
      <div style="display:flex;gap:6px"><button class="iconbtn hz" onclick="hzOpen()">Aa</button><button class="iconbtn hz" onclick="hcOpen()">🎨</button><button class="iconbtn" onclick="toggleDark()">🌙</button><button class="iconbtn" style="width:auto;padding:0 10px;font-weight:800;font-size:14px" onclick="toggleLang()">${LANG === 'bn' ? 'EN' : 'বাং'}</button><button class="iconbtn" onclick="toggleDrawer()">☰</button></div></div>
      <div class="search"><span>🔍</span><input id="q" value="${esc(q)}" placeholder="কী শিখতে চান? যেমন: ব্রেক, লাইসেন্স" oninput="home(this.value)"></div></div>` + body);
  if (q) { const i = document.getElementById('q'); i.focus(); i.setSelectionRange(q.length, q.length); }
}

function open_(id) {
  push(() => home());
  if (id === 'roadtest' || id === 'quiz') return startQuiz();
  if (id === 'signs') return signsPage();
  if (id === 'account') return accountPage();
  if (id === 'profile') return profile();
  if (id.indexOf('sec_') === 0 && typeof sectionPage === 'function') return sectionPage(id.slice(4));
  if (id === 'contact') return contactPage();
  if (id === 'qorder') return orderPage();
  if (id === 'notes') return notesPage();
  if (id === 'tools') return toolsPage();
  if (id === 'viewset') return viewsetPage();
  if (id === 'board') return boardPage();
  if (id === 'community') return communityPage();
  if (id === 'seeker') return seekerPage();
  if (id === 'admin') return adminPage();
  if (id === 'courses' && PAID_ENABLED) return paidHome();
  if (id === 'lang') { stack.pop(); return toggleLang(); }
  if (id === 'parts') return partsHome();
  if (id === 'learn') return learnPage();
  if (id === 'hacks') return hacksPage();
  if (id === 'logbook') return logbookPage();
  if (id === 'circ') return circPage();
  if (id === 'hist') return hsPage();
  if (id === 'ledger') { if (typeof LG_V !== 'undefined') { LG_V = 'home'; LG_B = ''; LG_BN = false; } return ledgerPage(); }
  if (id === 'remind') return remindPage();
  if (id === 'sos') return sosPage();
  if (id === 'govqa') return govHome();
  if (INFO[id]) return infoPage(id);
  if (id === 'signquiz') return startSignQuiz();
  if (id === 'links') return linksPage();
  if (id === 'share') { stack.pop(); return shareApp(); }
  if (id === 'paper') return paperPage();
  if (id === 'lessons') return lessonsPage();
  if (id === 'job' || id === 'intjob') return jobsPage(id === 'intjob' ? 'foreign' : 'all');
  if (id === 'cv') { stack.pop(); return openCv(); }
  if (id === 'jobprep') return studyPage('bangla');
  if (STUDY[id]) return studyPage(id);
  if (QA[id]) return qaPage(id);
}

// ---------- প্রশ্ন-উত্তর ----------
function qaPage(id) {
  tab = 'home';
  const c = CATS.find(x => x.id === id);
  render(pageHead(c.name) + '<div class="list">' + QA[id].map((x, i) =>
    `<div class="qa"><div class="q">${bn(String(i+1).padStart(2,'0'))}. প্রশ্ন: ${esc(x[0])}</div><div class="a">উত্তর: ${esc(x[1])}</div></div>`).join('') + '</div>');
}

// ---------- চাকরি প্রস্তুতি ----------
let sSub = 'bangla', sQ = '';
function studyPage(sub) {
  tab = 'study'; if (sub) sSub = sub; sQ = '';
  const chips = Object.keys(STUDY_LABELS).map(k =>
    `<button class="chip ${k===sSub?'on':''}" onclick="studyPage('${k}')">${STUDY_LABELS[k]}</button>`).join('');
  render(pageHead('চাকরির প্রস্তুতি') + `<div class="pad"><input class="inp" id="sq" placeholder="বিষয় বা পড়া খুঁজুন..." oninput="sQ=this.value.toLowerCase();document.getElementById('sbody').innerHTML=studyBody()">
    <div class="chips">${chips}</div><div id="sbody">${studyBody()}</div></div>`);
}
function studyBody() {
  return (STUDY[sSub] || []).map((sec, si) => {
    const items = sec.items.filter(it => !sQ || (it[0] + it[1]).toLowerCase().includes(sQ));
    if (!items.length) return '';
    const body = sec.type === 'flash'
      ? '<div class="two">' + items.map(it => `<div class="flash"><b>${esc(it[0])}</b><div>${esc(it[1])}</div></div>`).join('') + '</div>'
      : items.map(it => `<div class="note"><b>প্রশ্ন/নোট: ${esc(it[0])}</b><div class="ans">উত্তর: ${esc(it[1])}</div></div>`).join('');
    return `<div class="sec"><div class="sech"><b>📌 ${esc(sec.title)}</b><button class="btn sm" onclick="readSec(${si})">🔊 শুনুন</button></div>${body}</div>`;
  }).join('') || '<div class="empty">কিছু পাওয়া যায়নি</div>';
}
function readSec(si) {
  const sec = STUDY[sSub][si];
  speak(sec.title + '। ' + sec.items.map(it => it[0] + '। ' + it[1]).join('। '));
}

// ---------- লেসন ----------
function lessonsPage() {
  tab = 'home';
  render(pageHead('ড্রাইভ লেসন') + '<div class="pad">' + LESSONS.map(l =>
    `<details class="acc"><summary>${esc(l[0])}</summary><ol>${l[1].map(p => `<li>${esc(p)}</li>`).join('')}</ol></details>`).join('') + '</div>');
}

// ---------- সাইন ----------
let sgF = 'all';
function signsPage() {
  tab = 'home';
  const f = [['all','সব সাইন'],['mandatory','অবশ্যই পালনীয়'],['warning','সতর্কতামূলক'],['info','তথ্যমূলক']];
  render(pageHead('ট্রাফিক সাইন') + `<div class="pad"><div class="chips">${f.map(x =>
    `<button class="chip ${sgF===x[0]?'on':''}" onclick="sgF='${x[0]}';signsPage()">${x[1]}</button>`).join('')}</div></div>
    <div class="signs">${SIGNS.map((s, i) => ({s, i})).filter(o => sgF === 'all' || o.s[3] === sgF).map(o =>
    `<div class="sgn" onclick="showSign(${o.i})"><div class="e">${o.s[0]}</div><b>${esc(o.s[1])}</b></div>`).join('')}</div>`);
}
function showSign(i) { const s = SIGNS[i]; showModal(`<div style="text-align:center"><div style="font-size:60px">${s[0]}</div><h3>${esc(s[1])}</h3><p>${esc(s[2])}</p>
  <button class="btn sm" onclick="speak('${esc(s[1])}। ${esc(s[2])}')">🔊 শুনুন</button></div>`); }

// ---------- চাকরি ----------
let jF = 'all';
function jobsPage(f) {
  tab = 'job'; if (f) jF = f;
  const fs = [['all','সব চাকরি'],['govt','সরকারি'],['local','দেশি চাকরি'],['foreign','বিদেশি চাকরি']];
  render(pageHead('ড্রাইভিং জব', false) + `<div class="pad"><button class="btn" style="width:100%;margin-bottom:6px;background:#9333ea" onclick="push(()=>jobsPage());paperPage()">📰 সাপ্তাহিক চাকরির পত্রিকা দেখুন</button><div class="chips">${fs.map(x =>
    `<button class="chip ${jF===x[0]?'on':''}" onclick="jobsPage('${x[0]}')">${x[1]}</button>`).join('')}</div>` +
    activeJobs().map((j, i) => ({j, i})).filter(o => jF === 'all' || o.j.kind === jF).map(o =>
    `<div class="job" onclick="showJob(${o.i})"><div style="display:flex;justify-content:space-between"><b>${esc(o.j.t)}</b>${o.j.urgent?'<span class="badge">জরুরি</span>':''}</div>
     <div style="color:#666;font-size:14px">🏢 ${esc(o.j.c || '')}</div><div style="font-size:14px;margin-top:4px">💰 ${esc(o.j.s || '')}</div></div>`).join('') +
    (activeJobs().some(j => jF === 'all' || j.kind === jF) ? '' : `<div class="empty">এই বিভাগে এখন কোনো চাকরি নেই।<br><br><button class="btn sm" onclick="window.open('https://alljobs.teletalk.com.bd','_blank')">সরকারি সার্কুলার দেখুন</button></div>`) +
    `<div style="font-size:13px;color:#a33;margin-top:10px">${esc(JOB_NOTE)}</div></div>`);
}
function showJob(i) {
  const j = activeJobs()[i];
  showModal(`<span class="badge" style="background:${j.kind==='local'?'#2b9348':'#4f46e5'}">${j.kind==='local'?'দেশি চাকরি':'বিদেশি চাকরি'}</span>
    <h3>${esc(j.t)}</h3><p style="font-weight:bold;color:#555">${esc(j.c || '')}</p><hr>
    <p>💰 <b>বেতন:</b> ${esc(j.s || '—')}</p><p>📜 <b>লাইসেন্স:</b> ${esc(j.lic || '—')}</p><p>📍 <b>লোকেশন:</b> ${esc(j.loc || '—')}</p><p>📝 ${esc(j.d || '')}</p>${j.deadline ? `<p>⏰ <b>আবেদনের শেষ তারিখ:</b> ${esc(j.deadline)}</p>` : ''}
    <div class="warn">⚠️ আবেদন করার সময় কোনো প্রকার আর্থিক লেনদেন করবেন না।</div>` +
    (safeUrl(j.url) ? `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:10px" href="${esc(safeUrl(j.url))}" onclick="goUrl(this.getAttribute('href'));return false">🔗 আবেদন / বিস্তারিত</a>` : '') + (j.phone ? `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:10px" href="tel:${esc(String(j.phone).replace(/[^\\d+]/g, ''))}">📞 কল করুন</a>` : ''));
}


// ---------- সাপ্তাহিক চাকরির পত্রিকা ----------
function lastFriday() {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() - 5 + 7) % 7)); return d;
}
function fridayBn() {
  const m = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  const d = lastFriday(); return LANG === 'en' ? d.toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'}) : bn(d.getDate()) + ' ' + m[d.getMonth()] + ' ' + bn(d.getFullYear());
}
function paperList() {
  const mine = load('paperlinks', []);
  return PAPER_LINKS.map(x => ({t:x.t, d:x.d, url: x.url || ('https://www.google.com/search?q=' + encodeURIComponent(x.q.replace('{DATE}', fridayBn())))}))
    .concat(mine.map(x => ({t:x.t, d:'আমার যোগ করা লিংক', url:x.url, mine:true})));
}
function paperPage() {
  const list = paperList(); let mi = -1;
  render(pageHead('সাপ্তাহিক চাকরির পত্রিকা') + `<div class="pad">
    <div class="tip" style="margin:0 0 12px"><div><b>📅 সর্বশেষ শুক্রবার: ${fridayBn()}</b><div>সাপ্তাহিক চাকরির পত্রিকা সাধারণত শুক্রবার প্রকাশিত হয়। নিচের লিংকে চাপ দিলে ব্রাউজারে খুলবে (ইন্টারনেট লাগবে)।</div></div></div>` +
    list.map((x, i) => {
      if (x.mine) mi++;
      return `<div class="job" style="border-color:#9333ea"><b>${esc(x.t)}</b><div style="font-size:13px;color:#666;margin:2px 0 8px">${esc(x.d)}</div>
        <button class="btn sm" style="background:#9333ea" onclick="openLink(${i})">🔗 খুলুন</button>
        ${x.mine ? `<button class="btn sm" style="background:#dc2626;margin-left:6px" onclick="delPaper(${mi})">মুছুন</button>` : ''}</div>`;
    }).join('') + `
    <div class="sec"><b>➕ নিজের পত্রিকার লিংক যোগ করুন</b>
      <input class="inp" id="pl-t" placeholder="নাম (যেমন: এই সপ্তাহের পত্রিকা)">
      <input class="inp" id="pl-u" placeholder="লিংক (https://...)">
      <button class="btn sm" onclick="addPaper()">সংরক্ষণ করুন</button></div>
    <div class="warn">⚠️ শুধু বিশ্বস্ত সোর্স ব্যবহার করুন। চাকরির নামে কেউ টাকা চাইলে বিশ্বাস করবেন না।</div></div>`);
}
function openLink(i) { const x = paperList()[i]; if (x) goUrl(x.url); }
function addPaper() {
  const t = document.getElementById('pl-t').value.trim(); let u = document.getElementById('pl-u').value.trim();
  if (!t || !u) { alert('নাম ও লিংক দিন।'); return; }
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  if (/^https?:\/\/\s*$/i.test(u) || u.indexOf('.') < 0) { alert('সঠিক লিংক দিন।'); return; }
  const a = load('paperlinks', []); a.push({t, url:u}); localStorage.setItem('paperlinks', JSON.stringify(a)); paperPage();
}
function delPaper(i) { const a = load('paperlinks', []); a.splice(i, 1); localStorage.setItem('paperlinks', JSON.stringify(a)); paperPage(); }


// ---------- তথ্য পেজ ----------
function infoPage(id) {
  tab = 'home'; const x = INFO[id];
  render(pageHead(x.title) + '<div class="pad">' + (x.note ? `<div class="warn" style="margin:0 0 10px">${esc(x.note)}</div>` : '') +
    x.items.map((it, i) => `<div class="infoc"><div class="ie">${it[0]}</div><div style="flex:1"><b>${esc(it[1])}</b><div>${esc(it[2])}</div></div>
      <button class="btn sm" onclick="readInfo('${id}',${i})">🔊</button></div>`).join('') + '</div>');
}
function readInfo(id, i) { const it = INFO[id].items[i]; speak(it[1] + '। ' + it[2]); }

// ---------- সাইন চিনুন কুইজ ----------
let sqi = 0, sqs = 0, sqAns = false, sqOrder = [], sqOpts = [];
function startSignQuiz() { tab = 'home'; sqi = 0; sqs = 0; sqOrder = SIGNS.map((_, i) => i).sort(() => Math.random() - .5); signQ(); }
function signQ() {
  sqAns = false; const s = SIGNS[sqOrder[sqi]];
  const others = SIGNS.filter((_, i) => i !== sqOrder[sqi]).map(x => x[1]).sort(() => Math.random() - .5).slice(0, 3);
  sqOpts = [s[1]].concat(others).sort(() => Math.random() - .5);
  render(pageHead('সাইন চিনুন') + `<div class="pad quiz"><div style="color:#666">সাইন ${bn(sqi+1)} / ${bn(SIGNS.length)}</div>
    <div style="text-align:center;font-size:90px;margin:10px 0">${s[0]}</div><h3 style="text-align:center">এই সাইনের নাম কী?</h3>` +
    sqOpts.map((o, i) => `<div class="opt" id="so${i}" onclick="pickSign(${i})">${esc(o)}</div>`).join('') + '<div id="snx" style="text-align:right;margin-top:12px"></div></div>');
}
function pickSign(i) {
  if (sqAns) return; sqAns = true; const right = SIGNS[sqOrder[sqi]][1];
  if (sqOpts[i] === right) sqs++; else document.getElementById('so' + i).classList.add('no');
  document.getElementById('so' + sqOpts.indexOf(right)).classList.add('ok');
  document.getElementById('snx').innerHTML = `<button class="btn" onclick="sqi++;sqi<SIGNS.length?signQ():signResult()">${sqi+1<SIGNS.length?'পরের সাইন →':'ফলাফল দেখুন'}</button>`;
}
function signResult() {
  render(pageHead('ফলাফল') + `<div class="pad" style="text-align:center"><div style="font-size:64px">${sqs/SIGNS.length>=.7?'🏆':'📚'}</div>
    <h2>স্কোর: ${bn(sqs)} / ${bn(SIGNS.length)}</h2><button class="btn" onclick="startSignQuiz()">আবার চেষ্টা করুন</button></div>`);
}

// ---------- লিংক, শেয়ার, ডার্ক মোড, স্ট্রিক ----------
function linksPage() {
  tab = 'home';
  render(pageHead('দরকারি লিংক') + '<div class="pad">' + LINKS.map((x, i) =>
    `<div class="job" style="border-color:#475569"><b>${esc(x.t)}</b><div style="font-size:13px;color:#666;margin:2px 0 8px">${esc(x.d)}</div>
     <button class="btn sm" style="background:#475569" onclick="goUrl(LINKS[${i}].url)">🔗 খুলুন</button></div>`).join('') +
    '<div class="warn">লিংক ব্রাউজারে খুলবে, ইন্টারনেট লাগবে।</div></div>');
}
function shareApp() {
  const text = 'আমার ভাই অ্যাপ: ড্রাইভিং লাইসেন্স পরীক্ষার প্রস্তুতি, রোড সাইন, কুইজ ও চাকরির খবর এক জায়গায়।';
  if (navigator.share) navigator.share({title:'আমার ভাই', text}).catch(() => {});
  else { try { navigator.clipboard.writeText(text); alert('শেয়ারের লেখা কপি হয়েছে।'); } catch (e) { alert(text); } }
}
function toggleDark() {
  const on = document.body.classList.toggle('dark'); localStorage.setItem('dark', on ? '1' : '0');
}
function dayStr(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function updateStreak() {
  const s = load('streak', {last:'', n:0}), t = dayStr(new Date());
  if (s.last === t) return s;
  s.n = s.last === dayStr(new Date(Date.now() - 864e5)) ? s.n + 1 : 1; s.last = t;
  localStorage.setItem('streak', JSON.stringify(s)); return s;
}
if (localStorage.getItem('dark') === '1') document.body.classList.add('dark');


// ---------- অনলাইন চাকরির তালিকা (মেয়াদ শেষ হলে নিজে সরে যায়) ----------
let REMOTE_JOBS = load('remoteJobs', []);
function fixUrl(u) {
  u = String(u || '').trim().replace(/\s+/g, ''); if (!u) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(u)) return u;
  if (/^(www\.|[\w-]+(\.[\w-]+)+(\/|\?|#|$))/i.test(u)) return 'https://' + u;
  return '';
}
function safeUrl(u) { const f = fixUrl(u); return /^https?:\/\//i.test(f) ? f : ''; }
// লিংক খোলা: ফোনে ব্রাউজারে, ব্রাউজার প্লাগিন না থাকলে সাধারণ পদ্ধতিতে
function goUrl(u) {
  u = fixUrl(u); if (!u) { alert('লিংকটি ঠিক নয়'); return; }
  if (/^(mailto:|tel:)/i.test(u)) { location.href = u; return; }
  try { const B = capP('Browser'); if (B && B.open) { B.open({url: u}).catch(() => window.open(u, '_system')); return; } } catch (e) {}
  window.open(u, '_system');
}
function todayISO() { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function activeJobs() {
  const t = todayISO();
  return JOBS.concat(Array.isArray(REMOTE_JOBS) ? REMOTE_JOBS : [], typeof adminJobs === 'function' ? adminJobs() : []).filter(j => j && typeof j === 'object' && j.t && (!j.deadline || String(j.deadline) >= t));
}
function fetchJobs() {
  if (!JOBS_URL) return;
  fetch(JOBS_URL + (JOBS_URL.includes('?') ? '&' : '?') + 't=' + Date.now()).then(r => r.json()).then(j => {
    if (!Array.isArray(j)) return;
    REMOTE_JOBS = j; try { localStorage.setItem('remoteJobs', JSON.stringify(j)); } catch (e) {}
    if (tab === 'job' && !document.getElementById('modal')) jobsPage();
  }).catch(() => {});
}

// ---------- সরকারি চাকরির প্রশ্ন ও সমাধান ----------
function govHome() {
  tab = 'home';
  render(pageHead('সরকারি চাকরির প্রশ্ন ও সমাধান') + '<div class="pad"><div class="warn" style="margin:0 0 10px">প্রতিটি প্রশ্নে উত্তর বেছে নিলে সঠিক উত্তর ও সমাধান দেখাবে।</div>' +
    Object.keys(GOV).map(k => `<div class="card" style="margin-bottom:10px" onclick="push(()=>govHome());govList('${k}')"><div class="t"><span style="flex:1">${GOV_LABELS[k]}</span><span style="color:#999">${bn(GOV[k].length)}টি ›</span></div></div>`).join('') +
    `<div class="card" style="margin-bottom:10px;border-color:#1e40af" onclick="push(()=>govHome());open_('govguide')"><div class="t">🏛️ <span style="flex:1;color:#1e40af">প্রস্তুতি গাইড</span><span style="color:#999">›</span></div></div></div>`);
}
function govList(k) {
  render(pageHead(GOV_LABELS[k]) + '<div class="list">' + GOV[k].map((q, i) =>
    `<div class="qa" id="g${i}"><div class="q">${bn(i+1)}. ${esc(q[0])}</div>` +
    q[1].map((o, j) => `<div class="opt" style="border:2px solid #dfe6ee;border-radius:12px;padding:10px;margin:6px 0" id="g${i}o${j}" onclick="govPick('${k}',${i},${j})">${esc(o)}</div>`).join('') +
    `<div class="a" id="g${i}s" style="display:none;margin-top:8px"></div></div>`).join('') + '</div>');
}
function govPick(k, i, j) {
  const q = GOV[k][i], box = document.getElementById('g' + i + 's');
  if (box.style.display === 'block') return;
  if (j !== q[2]) document.getElementById('g' + i + 'o' + j).classList.add('no');
  document.getElementById('g' + i + 'o' + q[2]).classList.add('ok');
  box.style.display = 'block';
  box.innerHTML = (j === q[2] ? '✅ সঠিক। ' : '❌ ভুল। সঠিক উত্তর: ' + esc(q[1][q[2]]) + '। ') + '<br><b>সমাধান:</b> ' + esc(q[3]) +
    ` <button class="btn sm" onclick="speak('${esc(q[3]).replace(/'/g, '')}')">🔊</button>`;
}


// ---------- যন্ত্রাংশ ----------
function partsHome() {
  tab = 'home';
  render(pageHead('গাড়ির যন্ত্রাংশ') + '<div class="pad"><div class="warn" style="margin:0 0 10px">গাড়ি বেছে নিন, তারপর যন্ত্রাংশে চাপ দিন। নিজে মেরামতের আগে মিস্ত্রির পরামর্শ নিন।</div>' +
    Object.keys(PART_GROUPS).map(k => `<div class="card" style="margin-bottom:10px" onclick="push(()=>partsHome());partsList('${k}')"><div class="t"><span style="flex:1">${PART_GROUPS[k].name}</span><span style="color:#999">${bn(PART_GROUPS[k].parts.length)}টি ›</span></div></div>`).join('') + '</div>');
}
let pQ = '';
function partsList(k) {
  pQ = '';
  render(pageHead(PART_GROUPS[k].name) + `<div class="pad"><input class="inp" placeholder="যন্ত্রাংশ খুঁজুন..." oninput="pQ=this.value;document.getElementById('plist').innerHTML=partsBody('${k}')"><div id="plist">${partsBody(k)}</div></div>`);
}
function partsBody(k) {
  const out = PART_GROUPS[k].parts.map((p, i) => ({p, i})).filter(o => !pQ || (o.p[1] + o.p[2]).includes(pQ));
  return out.map(o => `<div class="infoc" onclick="showPart('${k}',${o.i})"><div class="ie">${/\.(png|jpe?g|webp|svg)$/i.test(o.p[0]) ? `<img src="${esc(o.p[0])}" style="width:44px;height:44px">` : o.p[0]}</div><div style="flex:1"><b>${esc(o.p[1])}</b><div>${esc(o.p[2])}</div></div></div>`).join('') || '<div class="empty">কিছু পাওয়া যায়নি</div>';
}
function showPart(k, i) {
  const p = PART_GROUPS[k].parts[i];
  showModal(`<div style="text-align:center;font-size:56px">${/\.(png|jpe?g|webp|svg)$/i.test(p[0]) ? `<img src="${esc(p[0])}" style="width:90px">` : p[0]}</div><h3 style="text-align:center">${esc(p[1])}</h3>
    <p><b>কাজ:</b> ${esc(p[2])}</p><p><b>সমস্যার লক্ষণ:</b> ${esc(p[3])}</p><p><b>করণীয়:</b> ${esc(p[4])}</p>
    <button class="btn sm" onclick="speak('${esc(p[1] + '। ' + p[2] + '। সমস্যার লক্ষণ: ' + p[3] + '। করণীয়: ' + p[4]).replace(/'/g, '')}')">🔊 শুনুন</button>`);
}

// ---------- কোর্স ও দ্রুত সমাধান ----------
function learnPage() {
  tab = 'home';
  render(pageHead('গাড়ি চালানো শিখুন') + '<div class="pad"><div class="warn" style="margin:0 0 10px">অভিজ্ঞ প্রশিক্ষকের সঙ্গে ফাঁকা জায়গায় অনুশীলন করুন। এই কোর্স সাধারণ ধারণা দেয়।</div>' +
    COURSE.map((l, i) => `<details class="acc"><summary>${esc(l[0])}</summary><p style="line-height:1.7">${esc(l[1])}</p><button class="btn sm" onclick="speak('${esc(l[1]).replace(/'/g, '')}')">🔊 শুনুন</button></details>`).join('') + '</div>');
}
function hacksPage() {
  tab = 'home';
  render(pageHead('দ্রুত সমাধান') + '<div class="pad">' + HACKS.map((h, i) =>
    `<details class="acc"><summary>${h[0]} ${esc(h[1])}</summary><p style="line-height:1.8;white-space:pre-line">${esc(h[2])}</p>
     ${safeUrl(h[3]) ? `<button class="btn sm" onclick="goUrl('${esc(safeUrl(h[3]))}')">▶️ ভিডিও দেখুন</button>` : ''}
     <button class="btn sm" onclick="speak('${esc(h[2]).replace(/\n/g, ' ').replace(/'/g, '')}')">🔊 শুনুন</button></details>`).join('') + '</div>');
}

// ---------- জরুরি নম্বর ----------
function sosPage() {
  tab = 'home'; const mine = load('sos', []);
  render(pageHead('জরুরি নম্বর') + `<div class="pad"><div class="job" style="border-color:#dc2626"><b>🆘 জাতীয় জরুরি সেবা: ৯৯৯</b><div style="font-size:13px;color:#666;margin:4px 0 8px">পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্সের জন্য</div>
    <a class="btn sm" style="background:#dc2626;text-decoration:none" href="tel:999">📞 কল করুন</a></div>` +
    mine.map((m, i) => `<div class="job" style="border-color:#475569"><b>${esc(m.n)}</b><div style="font-size:14px;margin:4px 0 8px">📞 ${esc(m.p)}</div>
      <a class="btn sm" style="background:#475569;text-decoration:none" href="tel:${esc(String(m.p).replace(/[^\d+]/g, ''))}">কল</a>
      <button class="btn sm" style="background:#dc2626;margin-left:6px" onclick="delSos(${i})">মুছুন</button></div>`).join('') +
    `<div class="sec"><b>➕ নিজের যোগাযোগ নম্বর যোগ করুন</b><div style="font-size:13px;color:#666">মেকানিক, গ্যারেজ, হাইওয়ে পুলিশ, পরিবারের সদস্য</div>
      <input class="inp" id="sn" placeholder="নাম (যেমন: করিম মিস্ত্রি)"><input class="inp" id="sp" type="tel" placeholder="ফোন নম্বর">
      <button class="btn sm" onclick="addSos()">সংরক্ষণ করুন</button></div></div>`);
}
function addSos() {
  const n = document.getElementById('sn').value.trim(), p = document.getElementById('sp').value.trim();
  if (!n || !p) { alert('নাম ও নম্বর দিন।'); return; }
  const m = load('sos', []); m.push({n, p}); localStorage.setItem('sos', JSON.stringify(m)); sosPage();
}
function delSos(i) { const m = load('sos', []); m.splice(i, 1); localStorage.setItem('sos', JSON.stringify(m)); sosPage(); }

// ---------- আয়-খরচ খাতা ----------
const taka = n => bn(Math.round(n).toLocaleString('en-US')) + ' টাকা';
const tk = n => '৳' + bn(Math.round(n).toLocaleString('en-US'));
const kf = n => n >= 1000 ? bn(Math.round(n / 100) / 10) + 'k' : bn(Math.round(n));
const L_IN = ['ট্রিপের আয়', 'বেতন', 'বখশিশ', 'ভাড়ায় আয়', 'অন্যান্য আয়'];
const L_OUT = ['জ্বালানি (তেল/গ্যাস)', 'গাড়ির মেরামত', 'গাড়ির কিস্তি', 'খাবার', 'ঘর ভাড়া', 'টোল ও পার্কিং', 'মোবাইল ও ইন্টারনেট', 'চিকিৎসা', 'পরিবার ও সন্তান', 'জরিমানা ও চাঁদা', 'অন্যান্য খরচ'];
const L_MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const L_MSH = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const L_WD = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
let lv = 'cal', lm = '', ld = '', ly = 0;
function ledgerData() { const l = load('ledger', {}); l.entries = l.entries || []; l.fixed = l.fixed || []; l.loans = l.loans || []; l.goals = l.goals || []; l.budget = l.budget || 0; return l; }
function saveLedger(l) { localStorage.setItem('ledger', JSON.stringify(l)); }
const lsum = (a, ty) => a.filter(e => e.type === ty).reduce((s, e) => s + e.amt, 0);
function lmstat(l, ym) {
  const es = l.entries.filter(e => e.date.slice(0, 7) === ym), inc = lsum(es, 'in'), out = lsum(es, 'out');
  const cur = todayISO().slice(0, 7), first = l.entries.reduce((m, e) => e.date.slice(0, 7) < m ? e.date.slice(0, 7) : m, cur);
  const fx = ym >= first && ym <= cur ? l.fixed.reduce((s, f) => s + f.amt, 0) : 0;
  return {es, inc, out, fx, exp: out + fx, net: inc - out - fx};
}
const lmName = ym => L_MON[+ym.slice(5, 7) - 1] + ' ' + bn(ym.slice(0, 4));
const lshift = (ym, d) => { const dt = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + d, 1); return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); };
function ledgerOld() {
  tab = 'home'; const l = ledgerData(), t = todayISO();
  if (!lm) lm = t.slice(0, 7); if (!ld || ld.slice(0, 7) !== lm) ld = lm === t.slice(0, 7) ? t : lm + '-01'; if (!ly) ly = +t.slice(0, 4);
  const s = lmstat(l, lm), over = l.budget > 0 && s.exp > l.budget;
  const tabs = [['cal', '📅 ক্যালেন্ডার'], ['sum', '📊 হিসাব'], ['loan', '💳 কিস্তি'], ['save', '🏦 সঞ্চয়']];
  render(pageHead('আয়-খরচ খাতা') + `<div class="pad">
    <div class="lhero"><div class="lm"><button onclick="lgMonth(-1)">‹</button><b>${lmName(lm)}</b><button onclick="lgMonth(1)">›</button></div>
      <div class="l3"><div><small>আয়</small><b style="color:#86efac">${tk(s.inc)}</b></div><div><small>খরচ</small><b style="color:#fca5a5">${tk(s.exp)}</b></div><div><small>${s.net >= 0 ? 'বাঁচল' : 'ঘাটতি'}</small><b>${tk(Math.abs(s.net))}</b></div></div>
      ${l.budget ? `<div class="lbar"><i style="width:${Math.min(100, Math.round(s.exp / l.budget * 100))}%;background:${over ? '#ef4444' : '#22c55e'}"></i></div><small>বাজেট ${tk(l.budget)} • ${bn(Math.round(s.exp / l.budget * 100))}% খরচ</small>` : ''}</div>
    ${over ? `<div class="warn" style="background:#fee2e2;border-color:#f87171;color:#991b1b">🚨 এ মাসের খরচ বাজেট ছাড়িয়েছে।</div>` : ''}
    ${lDue(l)}
    <div class="seg lseg">${tabs.map(x => `<button class="${lv === x[0] ? 'on' : ''}" onclick="lv='${x[0]}';ledgerPage()">${x[1]}</button>`).join('')}</div>
    ${lv === 'cal' ? lCal(l) : lv === 'sum' ? lSum(l) : lv === 'loan' ? lLoan(l) : lSave(l)}</div>`);
}
function lDue(l) {
  const t = todayISO(), ym = t.slice(0, 7), d = +t.slice(8, 10); let h = '';
  l.loans.forEach(x => { if (x.paid >= x.count || x.last === ym) return; const left = x.day - d; if (left <= 3) h += `<div class="warn" style="background:#fff7ed;border-color:#fb923c">⏰ ${esc(x.n)}: ${left < 0 ? bn(-left) + ' দিন দেরি' : left === 0 ? 'আজ কিস্তির দিন' : bn(left) + ' দিন পরে কিস্তি'} (${tk(x.amt)})</div>`; });
  return h;
}
function lCal(l) {
  const y = +lm.slice(0, 4), mo = +lm.slice(5, 7), first = new Date(y, mo - 1, 1).getDay(), days = new Date(y, mo, 0).getDate(), t = todayISO();
  const by = {}; l.entries.filter(e => e.date.slice(0, 7) === lm).forEach(e => { const k = e.date.slice(8, 10); by[k] = by[k] || {i: 0, o: 0}; by[k][e.type === 'in' ? 'i' : 'o'] += e.amt; });
  let cells = L_WD.map(w => `<div class="lw">${w}</div>`).join('') + '<div></div>'.repeat(first);
  for (let d = 1; d <= days; d++) {
    const k = String(d).padStart(2, '0'), iso = lm + '-' + k, x = by[k];
    cells += `<div class="ld ${iso === ld ? 'sel' : ''} ${iso === t ? 'tod' : ''}" onclick="ld='${iso}';ledgerPage()"><b>${bn(d)}</b>${x && x.i ? `<i class="gi">${kf(x.i)}</i>` : ''}${x && x.o ? `<i class="ro">${kf(x.o)}</i>` : ''}</div>`;
  }
  const es = l.entries.filter(e => e.date === ld);
  const di = lsum(es, 'in'), dout = lsum(es, 'out');
  return `<div class="sec" style="padding:8px"><div class="lcal">${cells}</div></div>
    <div class="sec"><b>${bn(+ld.slice(8, 10))} ${L_MON[+ld.slice(5, 7) - 1]}</b> <small style="color:#6b7280">আয় ${tk(di)} • খরচ ${tk(dout)}</small>
    ${es.map(e => `<div class="note" style="display:flex;justify-content:space-between;gap:8px"><span>${e.type === 'in' ? '🟢' : '🔴'} ${esc(e.cat || '')}${e.note ? ' • ' + esc(e.note) : ''}</span><span style="white-space:nowrap">${tk(e.amt)} <a href="#" onclick="lgDel('${e.id}');return false">✕</a></span></div>`).join('') || '<div class="hint">এই দিনে কোনো হিসাব নেই।</div>'}</div>
    <div class="sec"><b>➕ হিসাব লিখুন (${bn(+ld.slice(8, 10))} ${L_MON[+ld.slice(5, 7) - 1]})</b>
      <div class="seg" style="margin:8px 0"><button id="lt_o" class="on" onclick="lgType('out')">🔴 খরচ</button><button id="lt_i" onclick="lgType('in')">🟢 আয়</button></div>
      <select class="inp" id="lc">${L_OUT.map(c => `<option>${c}</option>`).join('')}</select>
      <input class="inp" id="la" type="number" inputmode="decimal" min="0" placeholder="টাকা">
      <input class="inp" id="ln" placeholder="বিবরণ (ঐচ্ছিক)">
      <button class="btn" onclick="lgAdd()">💾 সংরক্ষণ</button></div>`;
}
let _lt = 'out';
function lgType(t) { _lt = t; document.getElementById('lc').innerHTML = (t === 'in' ? L_IN : L_OUT).map(c => `<option>${c}</option>`).join(''); document.getElementById('lt_o').className = t === 'out' ? 'on' : ''; document.getElementById('lt_i').className = t === 'in' ? 'on' : ''; }
function lgAdd() {
  const amt = parseFloat(document.getElementById('la').value); if (!(amt > 0)) { alert('সঠিক টাকার পরিমাণ দিন।'); return; }
  const l = ledgerData(); l.entries.push({id: String(Date.now()), date: ld, type: _lt, amt, cat: document.getElementById('lc').value, note: document.getElementById('ln').value.trim()}); saveLedger(l); _lt = 'out'; ledgerPage();
}
function lgDel(id) { const l = ledgerData(); l.entries = l.entries.filter(e => e.id !== id); saveLedger(l); ledgerPage(); }
function lgMonth(d) { lm = lshift(lm, d); ld = ''; ledgerPage(); }
function lSum(l) {
  const s = lmstat(l, lm), cat = {};
  s.es.filter(e => e.type === 'out').forEach(e => { const k = e.cat || 'অন্যান্য খরচ'; cat[k] = (cat[k] || 0) + e.amt; });
  if (s.fx) cat['নির্দিষ্ট মাসিক খরচ'] = s.fx;
  const rows = Object.keys(cat).sort((a, b) => cat[b] - cat[a]), mx = Math.max(1, ...rows.map(k => cat[k]));
  const inc = {}; s.es.filter(e => e.type === 'in').forEach(e => { const k = e.cat || 'অন্যান্য আয়'; inc[k] = (inc[k] || 0) + e.amt; });
  const mons = Array.from({length: 12}, (_, i) => { const ym = ly + '-' + String(i + 1).padStart(2, '0'); return Object.assign({ym}, lmstat(l, ym)); });
  const ti = mons.reduce((a, m) => a + m.inc, 0), te = mons.reduce((a, m) => a + m.exp, 0), mm = Math.max(1, ...mons.map(m => Math.max(m.inc, m.exp)));
  const act = mons.filter(m => m.inc || m.exp).length || 1;
  return `<div class="sec"><b>🧾 ${lmName(lm)} — কোথায় কত খরচ</b>
      ${rows.map(k => `<div class="crow"><span>${esc(k)}</span><div class="cb"><i style="width:${Math.round(cat[k] / mx * 100)}%"></i></div><b>${tk(cat[k])}</b></div>`).join('') || '<div class="hint">এ মাসে এখনো খরচ লেখা হয়নি।</div>'}</div>
    ${Object.keys(inc).length ? `<div class="sec"><b>💚 আয়ের উৎস</b>${Object.keys(inc).map(k => `<div class="crow"><span>${esc(k)}</span><div class="cb g"><i style="width:${Math.round(inc[k] / Math.max(1, s.inc) * 100)}%"></i></div><b>${tk(inc[k])}</b></div>`).join('')}</div>` : ''}
    <div class="sec"><div class="lm" style="color:inherit"><button onclick="ly--;ledgerPage()">‹</button><b>📆 ${bn(ly)} সালের হিসাব</b><button onclick="ly++;ledgerPage()">›</button></div>
      ${mons.map((m, i) => `<div class="yrow" onclick="lm='${m.ym}';ld='';lv='cal';ledgerPage()"><span>${L_MSH[i]}</span><div class="yb"><i class="gi2" style="width:${Math.round(m.inc / mm * 100)}%"></i><i class="ro2" style="width:${Math.round(m.exp / mm * 100)}%"></i></div><b style="color:${m.net >= 0 ? '#15803d' : '#b91c1c'}">${m.inc || m.exp ? (m.net < 0 ? '−' : '') + kf(Math.abs(m.net)) : '–'}</b></div>`).join('')}
      <div class="two" style="margin-top:10px"><div class="flash"><b>বছরের আয়</b><div>${tk(ti)}</div></div><div class="flash"><b>বছরের খরচ</b><div>${tk(te)}</div></div><div class="flash"><b>মোট সঞ্চয়</b><div>${tk(ti - te)}</div></div><div class="flash"><b>মাসে গড় সঞ্চয়</b><div>${tk((ti - te) / act)}</div></div></div></div>
    <div class="sec"><b>🎯 মাসিক খরচের বাজেট সীমা</b><input class="inp" id="lb" type="number" min="0" value="${l.budget || ''}" placeholder="যেমন: ২০০০০"><button class="btn sm" onclick="setBudget()">সেট করুন</button></div>`;
}
function setBudget() { const l = ledgerData(); l.budget = parseFloat(document.getElementById('lb').value) || 0; saveLedger(l); ledgerPage(); }
function lLoan(l) {
  return `<div class="sec"><b>💳 কিস্তি (লোন)</b><div class="hint">গাড়ি, ফোন বা ঋণের কিস্তি লিখে রাখুন। কিস্তি দিলে "দিলাম" চাপুন, নিজে খরচে যোগ হবে।</div>
    ${l.loans.map((x, i) => { const left = x.count - x.paid; return `<div class="loan"><div style="display:flex;justify-content:space-between"><b>${esc(x.n)}</b><a href="#" onclick="lgLoanDel(${i});return false">🗑️</a></div>
      <div class="lbar d"><i style="width:${Math.round(x.paid / x.count * 100)}%;background:#22c55e"></i></div>
      <small>${bn(x.paid)}/${bn(x.count)} টি দেওয়া • বাকি ${bn(left)}টি = ${tk(left * x.amt)} • প্রতি মাসে ${tk(x.amt)} • তারিখ ${bn(x.day)}</small>
      ${left > 0 ? `<button class="btn sm" ${x.last === todayISO().slice(0, 7) ? 'disabled style="opacity:.5"' : ''} onclick="lgLoanPay(${i})">${x.last === todayISO().slice(0, 7) ? '✅ এ মাসের দেওয়া হয়েছে' : '✅ এ মাসের কিস্তি দিলাম'}</button>` : '<div style="color:#15803d;font-weight:700">🎉 সব কিস্তি শোধ!</div>'}</div>`; }).join('') || ''}
    <input class="inp" id="kn" placeholder="নাম (যেমন: গাড়ির কিস্তি)"><input class="inp" id="ka" type="number" min="0" placeholder="প্রতি মাসে কত টাকা"><input class="inp" id="kc" type="number" min="1" placeholder="মোট কয়টি কিস্তি"><input class="inp" id="kp" type="number" min="0" placeholder="কয়টি ইতিমধ্যে দিয়েছেন (না থাকলে ০)"><input class="inp" id="kd" type="number" min="1" max="31" placeholder="মাসের কত তারিখে দিতে হয়">
    <button class="btn sm" onclick="lgLoanAdd()">➕ কিস্তি যোগ করুন</button></div>
    <div class="sec"><b>🏠 প্রতি মাসের নির্দিষ্ট খরচ</b><div class="hint">ঘর ভাড়া, গ্যারেজ ভাড়া ইত্যাদি। প্রতি মাসের খরচে নিজে যোগ হয়।</div>
    ${l.fixed.map((f, i) => `<div class="note" style="display:flex;justify-content:space-between"><span>${esc(f.n)}</span><span>${tk(f.amt)} <a href="#" onclick="delFixed(${i});return false">✕</a></span></div>`).join('')}
    <input class="inp" id="fn" placeholder="নাম (যেমন: ঘর ভাড়া)"><input class="inp" id="fa" type="number" min="0" placeholder="মাসে কত টাকা"><button class="btn sm" onclick="addFixed()">যোগ করুন</button></div>`;
}
function lgLoanAdd() {
  const n = gv2('kn'), a = +gv2('ka'), c = +gv2('kc'), p = +gv2('kp') || 0, d = +gv2('kd') || 1;
  if (!n || !(a > 0) || !(c > 0)) { alert('নাম, কিস্তির টাকা ও মোট কয়টি তা দিন।'); return; }
  const l = ledgerData(); l.loans.push({id: String(Date.now()), n, amt: a, count: c, paid: Math.min(p, c), day: Math.min(31, d), last: ''}); saveLedger(l); ledgerPage();
}
const gv2 = id => (document.getElementById(id).value || '').trim();
function lgLoanPay(i) {
  const l = ledgerData(), x = l.loans[i]; if (!x || x.paid >= x.count) return;
  x.paid++; x.last = todayISO().slice(0, 7); l.entries.push({id: String(Date.now()), date: todayISO(), type: 'out', amt: x.amt, cat: 'গাড়ির কিস্তি', note: x.n}); saveLedger(l); ledgerPage();
}
function lgLoanDel(i) { if (!confirm('এই কিস্তিটি মুছবেন?')) return; const l = ledgerData(); l.loans.splice(i, 1); saveLedger(l); ledgerPage(); }
function addFixed() {
  const n = gv2('fn'), amt = parseFloat(gv2('fa'));
  if (!n || !(amt > 0)) { alert('নাম ও টাকা দিন।'); return; }
  const l = ledgerData(); l.fixed.push({n, amt}); saveLedger(l); ledgerPage();
}
function delFixed(i) { const l = ledgerData(); l.fixed.splice(i, 1); saveLedger(l); ledgerPage(); }
function lSave(l) {
  const s = lmstat(l, lm), tot = l.goals.reduce((a, g) => a + g.saved, 0);
  return `<div class="two"><div class="flash"><b>এ মাসে বাঁচল</b><div>${tk(s.net)}</div></div><div class="flash"><b>সব লক্ষ্যে জমা</b><div>${tk(tot)}</div></div></div>
    <div class="sec"><b>🏦 সঞ্চয়ের লক্ষ্য</b><div class="hint">যেমন: নতুন গাড়ি, হজ্জ, মেয়ের পড়াশোনা। লক্ষ্য ঠিক করে একটু একটু করে জমান।</div>
    ${l.goals.map((g, i) => { const pc = Math.min(100, Math.round(g.saved / g.target * 100)); return `<div class="loan"><div style="display:flex;justify-content:space-between"><b>🎯 ${esc(g.n)}</b><a href="#" onclick="lgGoalDel(${i});return false">🗑️</a></div>
      <div class="lbar d"><i style="width:${pc}%;background:#3b82f6"></i></div><small>${tk(g.saved)} / ${tk(g.target)} (${bn(pc)}%) • বাকি ${tk(Math.max(0, g.target - g.saved))}</small>
      <div style="display:flex;gap:6px;margin-top:6px"><input class="inp" style="margin:0" id="gd${i}" type="number" min="0" placeholder="কত জমালেন"><button class="btn sm" style="margin:0" onclick="lgGoalAdd(${i})">+ জমা</button></div></div>`; }).join('')}
    <input class="inp" id="gn" placeholder="লক্ষ্যের নাম"><input class="inp" id="gt" type="number" min="1" placeholder="কত টাকা লাগবে"><button class="btn sm" onclick="lgGoalNew()">➕ নতুন লক্ষ্য</button></div>`;
}
function lgGoalNew() { const n = gv2('gn'), t = +gv2('gt'); if (!n || !(t > 0)) { alert('লক্ষ্যের নাম ও টাকা দিন।'); return; } const l = ledgerData(); l.goals.push({n, target: t, saved: 0}); saveLedger(l); ledgerPage(); }
function lgGoalAdd(i) { const v = +gv2('gd' + i); if (!(v > 0)) return; const l = ledgerData(); l.goals[i].saved += v; saveLedger(l); ledgerPage(); }
function lgGoalDel(i) { if (!confirm('এই লক্ষ্যটি মুছবেন?')) return; const l = ledgerData(); l.goals.splice(i, 1); saveLedger(l); ledgerPage(); }

// ---------- রিমাইন্ডার (কাগজের মেয়াদ ও সার্ভিসিং) ----------
function remData() { return load('remind', {km: 0, docs: [], svc: []}); }
function saveRem(r) { localStorage.setItem('remind', JSON.stringify(r)); }
function daysTo(iso) { return Math.ceil((new Date(iso + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 864e5); }
function remAlerts() {
  const r = remData(), out = [];
  r.docs.forEach(x => { const dl = daysTo(x.date); if (dl <= (x.alert || 30)) out.push({lvl: dl < 0 ? 2 : 1, t: dl < 0 ? `${x.n}: মেয়াদ ${bn(-dl)} দিন আগে শেষ হয়েছে` : `${x.n}: মেয়াদ শেষ হতে ${bn(dl)} দিন বাকি`}); });
  r.svc.forEach(x => {
    const kmLeft = x.lastKm + x.everyKm - r.km, dl = x.everyDays ? daysTo(addDays(x.lastDate, x.everyDays)) : 9999;
    if (kmLeft <= 0 || dl <= 0) out.push({lvl: 2, t: `${x.n}: বদলানোর সময় হয়ে গেছে!`});
    else if (kmLeft <= 200 || dl <= 15) out.push({lvl: 1, t: `${x.n}: শিগগিরই বদলাতে হবে (${kmLeft <= 200 ? bn(kmLeft) + ' কিমি' : bn(dl) + ' দিন'} বাকি)`});
  });
  return out.sort((a, b) => b.lvl - a.lvl);
}
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function alertBanner() {
  const al = remAlerts(); if (!al.length) return '';
  return `<div class="tip" style="background:#fef2f2;border-color:#dc2626;color:#7f1d1d;cursor:pointer" onclick="push(()=>home());remindPage()"><div><b>⏰ রিমাইন্ডার</b>${al.slice(0, 3).map(x => `<div>${esc(x.t)}</div>`).join('')}${al.length > 3 ? `<div>আরও ${bn(al.length - 3)}টি...</div>` : ''}</div></div>`;
}
function remindPage() {
  tab = 'home'; const r = remData(), al = remAlerts();
  render(pageHead('রিমাইন্ডার') + `<div class="pad">
    ${al.length ? `<div class="warn" style="margin:0 0 10px;background:#fee2e2;border-color:#f87171;color:#991b1b">${al.map(x => `<div>${x.lvl === 2 ? '🚨' : '⚠️'} ${esc(x.t)}</div>`).join('')}</div>` : '<div class="warn" style="margin:0 0 10px;background:#ecfdf5;border-color:#6ee7b7;color:#065f46">✅ এখন কোনো সতর্কতা নেই।</div>'}
    <div class="sec"><b>🚗 গাড়ির বর্তমান কিলোমিটার</b><input class="inp" id="rk" type="number" min="0" value="${r.km || ''}" placeholder="মিটারে যা দেখাচ্ছে"><button class="btn sm" onclick="setKm()">আপডেট</button></div>
    <div class="sec"><b>📄 কাগজের মেয়াদ</b>${r.docs.map((x, i) => `<div class="note" style="display:flex;justify-content:space-between"><span>${esc(x.n)}<br><small>শেষ: ${esc(x.date)}</small></span><a href="#" onclick="delRem('docs',${i});return false">✕</a></div>`).join('')}
      <select class="inp" id="dn"><option>ড্রাইভিং লাইসেন্স</option><option>ফিটনেস সার্টিফিকেট</option><option>ট্যাক্স টোকেন</option><option>ইনসিওরেন্স</option><option>রুট পারমিট</option></select>
      <label style="font-size:13px">মেয়াদ শেষের তারিখ</label><input class="inp" id="dd" type="date">
      <label style="font-size:13px">কত দিন আগে সতর্ক করবে</label><select class="inp" id="da"><option value="30">৩০ দিন আগে</option><option value="15">১৫ দিন আগে</option></select>
      <button class="btn sm" onclick="addDoc()">যোগ করুন</button></div>
    <div class="sec"><b>🔧 সার্ভিসিং / যন্ত্রাংশ বদলের হিসাব</b>${r.svc.map((x, i) => `<div class="note" style="display:flex;justify-content:space-between"><span>${esc(x.n)}<br><small>শেষ বদল: ${bn(x.lastKm)} কিমি, ${esc(x.lastDate)} · প্রতি ${bn(x.everyKm)} কিমি${x.everyDays ? ' / ' + bn(x.everyDays) + ' দিন' : ''}</small></span><a href="#" onclick="delRem('svc',${i});return false">✕</a></div>`).join('')}
      <select class="inp" id="sn2"><option>ইঞ্জিন অয়েল (মোবিল)</option><option>ব্রেক প্যাড</option><option>টায়ার</option><option>এয়ার ফিল্টার</option><option>ব্যাটারি</option><option>স্পার্ক প্লাগ</option></select>
      <input class="inp" id="sk" type="number" min="0" placeholder="যে কিলোমিটারে বদলেছেন">
      <label style="font-size:13px">বদলের তারিখ</label><input class="inp" id="sd" type="date" value="${todayISO()}">
      <input class="inp" id="se" type="number" min="1" placeholder="কত কিমি পর পর বদলাবেন (যেমন: ৫০০০)">
      <input class="inp" id="sy" type="number" min="1" placeholder="অথবা কত দিন পর (ঐচ্ছিক)">
      <button class="btn sm" onclick="addSvc()">যোগ করুন</button></div>
    <div class="warn">অ্যাপ খুললেই সতর্কতা হোমে দেখাবে। ফোনের নোটিফিকেশন ভবিষ্যতে যোগ করা যাবে।</div></div>`);
}
function setKm() { const r = remData(); r.km = parseFloat(document.getElementById('rk').value) || 0; saveRem(r); remindPage(); }
function addDoc() {
  const date = document.getElementById('dd').value; if (!date) { alert('তারিখ দিন।'); return; }
  const r = remData(); r.docs.push({n: document.getElementById('dn').value, date, alert: parseInt(document.getElementById('da').value)}); saveRem(r); remindPage();
}
function addSvc() {
  const lastKm = parseFloat(document.getElementById('sk').value), everyKm = parseFloat(document.getElementById('se').value), ed = parseInt(document.getElementById('sy').value) || 0;
  if (!(lastKm >= 0) || !(everyKm > 0) || document.getElementById('sk').value === '') { alert('কিলোমিটার ও কত কিমি পর পর বদলাবেন তা দিন।'); return; }
  const r = remData(); r.svc.push({n: document.getElementById('sn2').value, lastKm, lastDate: document.getElementById('sd').value || todayISO(), everyKm, everyDays: ed}); saveRem(r); remindPage();
}
function delRem(k, i) { const r = remData(); r[k].splice(i, 1); saveRem(r); remindPage(); }

// ---------- মডেল টেস্ট ----------
let qi = 0, score = 0, answered = false, order = [];
function startQuiz() {
  tab = 'quiz'; qi = 0; score = 0; order = QUIZ.map((_, i) => i).sort(() => Math.random() - .5); quizQ();
}
function quizQ() {
  answered = false;
  const q = QUIZ[order[qi]];
  render(pageHead('মডেল টেস্ট', false) + `<div class="pad quiz">
    <div style="display:flex;justify-content:space-between;color:#666"><span>প্রশ্ন ${bn(qi+1)} / ${bn(QUIZ.length)}</span>
      <button class="btn sm" onclick="readQuiz()">🔊 প্রশ্ন শুনুন</button></div>
    <h3 style="color:var(--pink)">${esc(q[0])}</h3>` +
    q[1].map((o, i) => `<div class="opt" id="o${i}" onclick="pick(${i})">${esc(o)}</div>`).join('') +
    '<div id="nx" style="text-align:right;margin-top:12px"></div></div>');
}
function readQuiz() { const q = QUIZ[order[qi]]; speak(q[0] + '। ' + q[1].join('। ')); }
function pick(i) {
  if (answered) return; answered = true;
  const q = QUIZ[order[qi]];
  if (i === q[2]) score++; else document.getElementById('o' + i).classList.add('no');
  document.getElementById('o' + q[2]).classList.add('ok');
  document.getElementById('nx').innerHTML = (q[3] ? `<div class="warn" style="text-align:left;margin:10px 0">💡 ${esc(q[3])}</div>` : '') + `<button class="btn" onclick="nextQ()">${qi+1<QUIZ.length?'পরের প্রশ্ন →':'ফলাফল দেখুন'}</button>`;
}
function nextQ() { qi++; qi < QUIZ.length ? quizQ() : result(); }
function result() {
  const pass = score / QUIZ.length >= .7;
  if (score > load('best', 0)) localStorage.setItem('best', JSON.stringify(score));
  render(pageHead('ফলাফল', false) + `<div class="pad" style="text-align:center">
    <div style="font-size:64px">${pass?'🏆':'📚'}</div>
    <h2>আপনার স্কোর: ${bn(score)} / ${bn(QUIZ.length)}</h2>
    <p>${pass?'অভিনন্দন! আপনি পাস করেছেন।':'আরও অনুশীলন করুন, আবার চেষ্টা করুন।'}</p>
    <button class="btn" onclick="startQuiz()">আবার চেষ্টা করুন</button></div>`);
}

// ---------- ডিজিটাল সিভি ও প্রোফাইল ----------
function profile() {
  tab = 'profile'; stack = [];
  const p = load('cv', null);
  render(pageHead('প্রোফাইল', false) + `<div class="profile"><div class="avatar">👤</div><h3>${esc(p ? p.name : 'আপনার নাম')}</h3></div>` +
    (p ? `<div class="cvcard"><b>${esc(p.name)}</b><div>📞 ${esc(p.phone)}</div><div>🪪 লাইসেন্স: ${esc(p.lic)} (${esc(p.exp || '০')} বছর অভিজ্ঞতা)</div><div>📍 এলাকা: ${esc(p.city || '—')}</div></div>`
       : '<div class="empty">এখনো সিভি বানানো হয়নি</div>') +
    `<div style="text-align:center"><button class="btn" onclick="openCv()">${p ? 'তথ্য আপডেট করুন' : 'ডিজিটাল সিভি বানান'}</button></div>` +
    `<div class="box" style="text-align:center"><b>☁️ ${cloudInfo() ? 'লগইন করা: ' + esc(cloudInfo().name || cloudInfo().id) : 'লগইন ও ব্যাকআপ'}</b><div style="font-size:13px;color:#666;margin:4px 0 8px">ফোন হারালে বা অ্যাপ মুছে গেলে তথ্য ফিরে পেতে</div><button class="btn sm" onclick="push(()=>profile());accountPage()">${cloudInfo() ? 'অ্যাকাউন্ট দেখুন' : 'লগইন করুন'}</button>${cloudInfo() && typeof adminPage === 'function' ? ' <button class="btn sm" style="background:#b45309" onclick="push(()=>profile());adminPage()">🛡️ অ্যাডমিন প্যানেল</button>' : ''}</div>` +
    (typeof ucolorBox === 'function' ? ucolorBox() : '') + fileBackupBox() +
    `<div class="box" style="text-align:center"><b>🌐 ভাষা</b><div style="margin-top:8px"><button class="btn sm" style="${LANG === 'bn' ? '' : 'background:#64748b'}" onclick="LANG!=='bn'&&toggleLang()">বাংলা</button> <button class="btn sm" style="${LANG === 'en' ? '' : 'background:#64748b'}" onclick="LANG!=='en'&&toggleLang()">English</button></div></div>`);
}
// =====================================================================
//  🪪 প্রফেশনাল ড্রাইভার সিভি: ফর্ম → সুন্দর ডিজাইন → PDF / ছবি / শেয়ার
// =====================================================================
const CV_LIC = ['হালকা (Light)', 'মধ্যম (Medium)', 'ভারী (Heavy)', 'মোটরসাইকেল'];
const CV_VEH = ['প্রাইভেট কার', 'মাইক্রোবাস / হাইয়েস', 'জিপ / SUV', 'পিকআপ', 'অ্যাম্বুলেন্স', 'মিনিবাস', 'বাস', 'ট্রাক / লরি', 'কভার্ড ভ্যান', 'CNG অটোরিকশা', 'মোটরসাইকেল'];
const CV_VEH_AUTO = {'হালকা (Light)': ['প্রাইভেট কার', 'জিপ / SUV', 'পিকআপ', 'মাইক্রোবাস / হাইয়েস'], 'মধ্যম (Medium)': ['প্রাইভেট কার', 'মাইক্রোবাস / হাইয়েস', 'মিনিবাস', 'অ্যাম্বুলেন্স'], 'ভারী (Heavy)': ['বাস', 'ট্রাক / লরি', 'কভার্ড ভ্যান', 'মিনিবাস'], 'মোটরসাইকেল': ['মোটরসাইকেল']};
const CV_SKILL = ['নিরাপদ ও সতর্ক ড্রাইভিং', 'ট্রাফিক আইন ও সাইন সম্পর্কে ভালো জ্ঞান', 'রাস্তাঘাট ও এলাকা ভালো চেনা', 'গুগল ম্যাপ / জিপিএস ব্যবহার', 'গাড়ির নিয়মিত যত্ন ও ছোটখাটো মেরামত', 'টায়ার বদল, জাম্পস্টার্ট ও ইঞ্জিন চেক', 'রাতে ও দূরপাল্লার ড্রাইভিং', 'জ্যাম ও বৃষ্টিতে ধৈর্য ধরে চালানো', 'যাত্রী ও মালিকের সাথে ভদ্র আচরণ', 'সময়নিষ্ঠতা ও বিশ্বস্ততা', 'প্রাথমিক চিকিৎসার জ্ঞান', 'জ্বালানি ও ট্রিপের হিসাব রাখা', 'গাড়ি পরিষ্কার ও পরিপাটি রাখা', 'পরিবার নিয়ে ভ্রমণে সতর্কতা', 'দুর্ঘটনায় করণীয় সম্পর্কে ধারণা'];
const CV_POST = ['ব্যক্তিগত গাড়ির চালক', 'অফিস / কোম্পানির গাড়ির চালক', 'মাইক্রোবাস চালক', 'রাইড-শেয়ার / অ্যাপ ড্রাইভার', 'ট্রাক / লরি চালক', 'বাস চালক', 'অ্যাম্বুলেন্স চালক', 'মোটরসাইকেল রাইডার', 'বিদেশে চালকের চাকরি'];
const CV_LANG = ['বাংলা', 'ইংরেজি', 'হিন্দি / উর্দু', 'আরবি'];
let _cv = null, _cvOut = null;
function cvLoad() { const p = load('cv', {}) || {}; const d = {name: '', phone: '', lic: CV_LIC[0], exp: '', city: '', fa: '', dob: '', mail: '', addr: '', mar: '', rel: '', nid: '', blood: '', edu: '', post: CV_POST[0], lno: '', lexp: '', veh: null, skills: null, lang: ['বাংলা'], jobs: [], sal: '', avail: 'যেকোনো সময়', ref: '', refp: '', sum: '', photo: '', col: ''}; const o = Object.assign(d, p); if (!o.veh) o.veh = (CV_VEH_AUTO[o.lic] || []).slice(); if (!o.skills) o.skills = CV_SKILL.slice(0, 9); if (!Array.isArray(o.jobs)) o.jobs = []; return o; }
function cvCollect() {
  if (!_cv || !document.getElementById('cv_name')) return;
  const g = id => { const e = document.getElementById('cv_' + id); return e ? e.value.trim() : ''; };
  ['name', 'phone', 'lic', 'exp', 'city', 'fa', 'dob', 'mail', 'addr', 'mar', 'rel', 'nid', 'blood', 'edu', 'post', 'lno', 'lexp', 'sal', 'avail', 'ref', 'refp', 'sum'].forEach(k => { _cv[k] = g(k); });
  _cv.veh = [...document.querySelectorAll('.cv_veh:checked')].map(x => x.value); _cv.skills = [...document.querySelectorAll('.cv_skl:checked')].map(x => x.value); _cv.lang = [...document.querySelectorAll('.cv_lng:checked')].map(x => x.value);
  _cv.jobs = [...document.querySelectorAll('[data-cj]')].map(r => ({c: r.querySelector('.j_c').value.trim(), p: r.querySelector('.j_p').value.trim(), f: r.querySelector('.j_f').value.trim(), t: r.querySelector('.j_t').value.trim()})).filter(j => j.c || j.p);
}
function openCv() { _cv = cvLoad(); cvPage(); }
function cvPage() {
  tab = 'profile'; const p = _cv || (_cv = cvLoad());
  const f = (id, label, ph, type) => `<label class="cvl">${label}</label><input class="inp" id="cv_${id}" type="${type || 'text'}" value="${esc(p[id] || '')}" placeholder="${esc(ph || '')}">`;
  const sel = (id, label, arr) => `<label class="cvl">${label}</label><select class="inp" id="cv_${id}">${arr.map(x => `<option ${x === p[id] ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
  const chk = (cls, arr, sel) => arr.map(x => `<label class="cvc"><input type="checkbox" class="${cls}" value="${esc(x)}" ${sel.includes(x) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('');
  render(pageHead('সিভি বানান') + hero('🪪', 'প্রফেশনাল সিভি', 'তথ্য দিন, সুন্দর সিভি নিজে তৈরি হবে') + `<div class="pad">
    <div class="cx"><b>📷 ছবি</b><div style="display:flex;align-items:center;gap:12px;margin-top:8px"><div class="cvph">${okImg(p.photo) ? `<img id="cv_phimg" src="${p.photo}">` : '<span id="cv_phimg">👤</span>'}</div><div><input type="file" accept="image/*" onchange="cvPhoto(this)"><div class="hint">পরিষ্কার পাসপোর্ট সাইজ ছবি দিলে ভালো দেখায়।</div>${okImg(p.photo) ? '<button class="btn sm" style="background:#64748b" onclick="cvCollect();_cv.photo=\'\';cvPage()">ছবি সরান</button>' : ''}</div></div></div>
    <div class="cx"><b>👤 ব্যক্তিগত তথ্য</b>${f('name', 'পূর্ণ নাম *', 'যেমন: মো. রফিকুল ইসলাম')}${f('phone', 'মোবাইল নম্বর *', '01XXXXXXXXX', 'tel')}${f('mail', 'ইমেইল (থাকলে)', 'name@gmail.com', 'email')}${f('fa', 'পিতার নাম', '')}${f('dob', 'জন্ম তারিখ', 'যেমন: ১৫-০৫-১৯৯০')}${f('addr', 'বর্তমান ঠিকানা', 'গ্রাম/মহল্লা, থানা, জেলা')}${f('city', 'কর্মস্থল / শহর', 'যেমন: মিরপুর, ঢাকা')}${sel('mar', 'বৈবাহিক অবস্থা', ['', 'বিবাহিত', 'অবিবাহিত'])}${f('blood', 'রক্তের গ্রুপ', 'যেমন: B+')}${f('nid', 'জাতীয় পরিচয়পত্র নম্বর (ঐচ্ছিক)', '')}${f('edu', 'শিক্ষাগত যোগ্যতা', 'যেমন: অষ্টম শ্রেণি / এসএসসি')}</div>
    <div class="cx"><b>🚗 ড্রাইভিং তথ্য</b>${sel('post', 'যে পদে কাজ চাই', CV_POST)}${sel('lic', 'লাইসেন্সের ধরন', CV_LIC)}${f('lno', 'লাইসেন্স নম্বর', '')}${f('lexp', 'লাইসেন্সের মেয়াদ', 'যেমন: ১২-২০২৮')}${f('exp', 'মোট অভিজ্ঞতা (বছর)', '', 'number')}
      <label class="cvl">যে গাড়ি চালাতে পারি <a href="#" onclick="cvAutoVeh();return false" style="font-size:12px">(লাইসেন্স অনুযায়ী নিজে বসান)</a></label><div id="cv_vehs">${chk('cv_veh', CV_VEH, p.veh)}</div></div>
    <div class="cx"><b>🛠️ দক্ষতা</b><div class="hint">যা পারেন তাতে টিক দিন। ড্রাইভারের দরকারি দক্ষতাগুলো আগেই দেওয়া আছে।</div>${chk('cv_skl', CV_SKILL, p.skills)}</div>
    <div class="cx"><b>🏢 কাজের অভিজ্ঞতা</b><div class="hint">আগের কাজগুলো লিখুন (সবচেয়ে নতুনটা আগে)।</div>
      ${p.jobs.map((j, i) => `<div class="cvj" data-cj><input class="inp j_c" placeholder="কোম্পানি / মালিকের নাম" value="${esc(j.c)}"><input class="inp j_p" placeholder="পদ (যেমন: ড্রাইভার)" value="${esc(j.p)}"><div class="two"><input class="inp j_f" placeholder="কবে থেকে (২০১৮)" value="${esc(j.f)}"><input class="inp j_t" placeholder="কবে পর্যন্ত (চলমান)" value="${esc(j.t)}"></div><a href="#" onclick="cvJob(${i});return false" style="color:#dc2626;font-size:13px">✕ এটি সরান</a></div>`).join('')}
      <button class="btn sm" onclick="cvJob(-1)">➕ কাজ যোগ করুন</button></div>
    <div class="cx"><b>🗣️ ভাষা ও অন্যান্য</b><div id="cv_langs">${chk('cv_lng', CV_LANG, p.lang)}</div>${f('sal', 'প্রত্যাশিত বেতন', 'যেমন: ২০,০০০ টাকা')}${f('avail', 'কাজে যোগ দিতে পারব', 'যেমন: যেকোনো সময়')}${f('ref', 'রেফারেন্স (নাম ও পদ)', '')}${f('refp', 'রেফারেন্সের মোবাইল', '', 'tel')}</div>
    <div class="cx"><b>✍️ নিজের সম্পর্কে ছোট পরিচিতি</b><textarea class="inp" id="cv_sum" rows="5" placeholder="নিজে লিখুন, অথবা নিচের বাটনে চাপুন">${esc(p.sum || '')}</textarea><button class="btn sm" onclick="cvAutoSum()">✨ নিজে লিখে দিন</button></div>
    <div class="cx"><b>🎨 সিভির রং</b><div class="presets" style="grid-template-columns:repeat(6,1fr)">${[['', 'অ্যাপের রং'], ['#0b5ed7', 'নীল'], ['#1f2937', 'কালচে'], ['#b91c1c', 'লাল'], ['#6d28d9', 'বেগুনি'], ['#0f766e', 'টিল']].map(x => `<button style="background:${x[0] || 'var(--p2)'};height:38px" onclick="cvCollect();_cv.col='${x[0]}';cvPage()">${(_cv.col || '') === x[0] ? '✔' : ''}</button>`).join('')}</div></div>
    <div id="cv_msg" class="warn" style="display:none"></div>
    <button class="btn" style="width:100%" onclick="cvSaveShow()">👁️ সংরক্ষণ করে সিভি দেখুন</button><div style="height:16px"></div></div>`);
}
function cvMsg(t) { const b = document.getElementById('cv_msg'); if (b) { b.style.display = 'block'; b.textContent = t; b.scrollIntoView({block: 'center'}); } }
function cvJob(i) { cvCollect(); if (i < 0) _cv.jobs.push({c: '', p: '', f: '', t: ''}); else _cv.jobs.splice(i, 1); cvPage(); }
function cvAutoVeh() { cvCollect(); _cv.veh = (CV_VEH_AUTO[_cv.lic] || []).slice(); cvPage(); }
function cvAutoSum() {
  cvCollect(); const c = _cv, e = +c.exp || 0; const v = (c.veh || []).slice(0, 3).join(', ');
  const t = `${c.name || 'আমি'}, ${e ? bn(e) + ' বছরের অভিজ্ঞতাসম্পন্ন ' : ''}${c.lic ? c.lic.replace(/\s*\(.*\)/, '') + ' লাইসেন্সধারী ' : ''}একজন পেশাদার চালক। ${v ? v + ' চালাতে দক্ষ। ' : ''}নিরাপদ ও সময়নিষ্ঠ ড্রাইভিং, ট্রাফিক আইন মেনে চলা এবং গাড়ির যত্ন নেওয়ায় আমি অভ্যস্ত। ${c.city ? c.city + ' ও আশপাশের এলাকার রাস্তা ভালো চিনি। ' : ''}আমি বিশ্বস্ত, পরিশ্রমী ও দায়িত্বশীল। ${c.post ? '"' + c.post + '" পদে কাজ করতে আগ্রহী।' : ''}`;
  document.getElementById('cv_sum').value = t.replace(/\s+/g, ' ').trim();
}
async function cvPhoto(inp) { const f = inp.files && inp.files[0]; if (!f) return; try { cvCollect(); _cv.photo = await imgToData(f, 360, false); cvPage(); } catch (e) { cvMsg('⚠️ ' + (e.message || 'ছবি নেওয়া যায়নি')); } }
function cvSaveShow() {
  cvCollect(); if (!_cv.name || !_cv.phone) return cvMsg('নাম ও মোবাইল নম্বর দিন।');
  if (!_cv.sum) cvAutoSum(), cvCollect();
  try { localStorage.setItem('cv', JSON.stringify(_cv)); } catch (e) { return cvMsg('জায়গা কম। ছবি সরিয়ে আবার চেষ্টা করুন।'); }
  cvPreview();
}
// ---------- ক্যানভাসে সিভি আঁকা ----------
function cvWrap(ctx, text, w) {
  const out = []; String(text || '').split('\n').forEach(par => { let line = ''; par.split(/(\s+)/).forEach(tok => { if (ctx.measureText(line + tok).width > w && line.trim()) { out.push(line.trim()); line = tok.trimStart(); } else line += tok; }); out.push(line.trim()); });
  return out;
}
function cvDraw(ctx, W, d, col, draw) {
  const F = (w, s) => `${w} ${s}px "Noto Sans Bengali","Kalpurush",sans-serif`, SB = 400, LM = 44, SW = 380, RX = LM + SW + 36, RW = W - RX - 44;
  const dark = '#1a1a1a', soft = '#4b5563'; const tint = col + '16';
  let yL = 0, yR = 0; const HH = 230;
  if (draw) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, 6000); const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, col); g.addColorStop(1, col + 'cc'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH); ctx.fillStyle = tint; ctx.fillRect(0, HH, SW + LM + 18, 6000); }
  // শিরোনাম
  const hasPh = okImg(d.photo);
  if (draw) {
    if (hasPh) { ctx.save(); ctx.beginPath(); ctx.arc(LM + 85, HH / 2, 85, 0, 7); ctx.clip(); ctx.drawImage(d._img, LM, HH / 2 - 85, 170, 170); ctx.restore(); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(LM + 85, HH / 2, 85, 0, 7); ctx.stroke(); }
    const tx = hasPh ? LM + 215 : LM; ctx.fillStyle = '#fff'; ctx.font = F(700, 54); ctx.fillText(d.name, tx, 100, W - tx - 40);
    ctx.font = F(600, 28); ctx.fillStyle = '#fde68a'; ctx.fillText(d.post || 'পেশাদার চালক', tx, 148, W - tx - 40);
    ctx.font = F(SB, 23); ctx.fillStyle = '#fff'; ctx.fillText([d.phone, d.mail].filter(Boolean).join('   •   '), tx, 192, W - tx - 40);
  }
  yL = HH + 44; yR = HH + 44;
  const head = (x, y, t, w) => { if (draw) { ctx.font = F(700, 27); ctx.fillStyle = col; ctx.fillText(t, x, y); ctx.fillRect(x, y + 10, 54, 4); } return y + 46; };
  const para = (x, y, t, w, font, color, lh) => { ctx.font = font; const ls = cvWrap(ctx, t, w); ls.forEach((l, i) => { if (draw) { ctx.fillStyle = color; ctx.fillText(l, x, y + i * lh); } }); return y + ls.length * lh; };
  const kv = (y, k, v) => { if (!v) return y; if (draw) { ctx.font = F(600, 20); ctx.fillStyle = col; ctx.fillText(k, LM, y); } return para(LM, y + 28, v, SW - 10, F(SB, 22), dark, 30) + 12; };
  // বাঁ কলাম
  yL = head(LM, yL, 'ব্যক্তিগত তথ্য');
  yL = kv(yL, 'পিতার নাম', d.fa); yL = kv(yL, 'জন্ম তারিখ', d.dob); yL = kv(yL, 'ঠিকানা', d.addr || d.city); yL = kv(yL, 'বৈবাহিক অবস্থা', d.mar); yL = kv(yL, 'রক্তের গ্রুপ', d.blood); yL = kv(yL, 'জাতীয় পরিচয়পত্র', d.nid); yL = kv(yL, 'শিক্ষাগত যোগ্যতা', d.edu); yL = kv(yL, 'জাতীয়তা', 'বাংলাদেশি');
  yL += 14; yL = head(LM, yL, 'লাইসেন্স');
  yL = kv(yL, 'ধরন', d.lic); yL = kv(yL, 'নম্বর', d.lno); yL = kv(yL, 'মেয়াদ', d.lexp);
  if (d.veh && d.veh.length) { yL = kv(yL, 'যে গাড়ি চালাতে পারি', d.veh.join(', ')); }
  if (d.lang && d.lang.length) { yL += 10; yL = head(LM, yL, 'ভাষা'); yL = para(LM, yL, d.lang.join(', '), SW - 10, F(SB, 22), dark, 30) + 10; }
  // ডান কলাম
  yR = head(RX, yR, 'পরিচিতি'); yR = para(RX, yR, d.sum, RW, F(SB, 23), dark, 36) + 22;
  yR = head(RX, yR, 'অভিজ্ঞতা'); const ex = +d.exp || 0;
  if (ex || (d.jobs || []).length) {
    if (ex) { yR = para(RX, yR, `মোট ${bn(ex)} বছরের ড্রাইভিং অভিজ্ঞতা`, RW, F(600, 24), dark, 34) + 8; }
    (d.jobs || []).forEach(j => { if (draw) { ctx.font = F(700, 23); ctx.fillStyle = dark; ctx.fillText(j.p || 'চালক', RX, yR, RW); ctx.font = F(SB, 21); ctx.fillStyle = soft; ctx.fillText([j.c, [j.f, j.t].filter(Boolean).join(' – ')].filter(Boolean).join('   |   '), RX, yR + 30, RW); } yR += 68; });
    yR += 10;
  } else yR = para(RX, yR, 'নতুন চালক', RW, F(SB, 22), soft, 32) + 16;
  yR = head(RX, yR, 'দক্ষতা');
  (d.skills || []).forEach(s => { if (draw) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(RX + 8, yR - 8, 6, 0, 7); ctx.fill(); } yR = para(RX + 28, yR, s, RW - 28, F(SB, 22), dark, 32) + 8; });
  yR += 14;
  { const best = +load('best', 0) || 0; const L = ['ট্রাফিক সাইন, সিগন্যাল ও রাস্তার নিয়মের থিওরি জ্ঞান আছে', 'ড্যাশবোর্ডের বাতি ও গাড়ির যন্ত্রাংশ চেনার প্রশিক্ষণ নিয়েছি', 'দুর্ঘটনা বা বিপদে প্রাথমিক করণীয় ও জরুরি নম্বর জানা আছে'];
    if (best > 0) L.unshift(`"আমার ভাই" মডেল টেস্টে সেরা স্কোর: ${bn(best)}/${bn(QUIZ.length)}`);
    yR = head(RX, yR, 'ড্রাইভিং জ্ঞান ও প্রস্তুতি'); L.forEach(s => { if (draw) { ctx.fillStyle = col; ctx.fillRect(RX, yR - 14, 12, 12); } yR = para(RX + 28, yR, s, RW - 28, F(SB, 22), dark, 32) + 8; }); yR += 14; }
  if (d.sal || d.avail) { yR = head(RX, yR, 'আরও তথ্য'); if (d.sal) yR = para(RX, yR, 'প্রত্যাশিত বেতন: ' + d.sal, RW, F(SB, 22), dark, 32) + 6; if (d.avail) yR = para(RX, yR, 'কাজে যোগদান: ' + d.avail, RW, F(SB, 22), dark, 32) + 6; yR += 12; }
  if (d.ref) { yR = head(RX, yR, 'রেফারেন্স'); yR = para(RX, yR, d.ref + (d.refp ? ' — ' + d.refp : ''), RW, F(SB, 22), dark, 32) + 12; }
  const total = Math.max(yL, yR) + 50;
  if (draw) { ctx.font = F(SB, 17); ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'center'; ctx.fillText('"আমার ভাই" অ্যাপ দিয়ে তৈরি', W / 2, Math.max(total, 1684) - 22); ctx.textAlign = 'left'; }
  return total;
}
async function cvRender() {
  const d = _cv || cvLoad(); try { await Promise.all(['400', '600', '700'].map(w => document.fonts.load(`${w} 22px "Noto Sans Bengali"`))); } catch (e) {}
  if (okImg(d.photo)) d._img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = d.photo; }); if (!d._img) d.photo = '';
  const col = /^#[0-9a-fA-F]{6}$/.test(d.col) ? d.col : (getComputedStyle(document.documentElement).getPropertyValue('--p2').trim() || '#006a4e'), W = 1190;
  const m = document.createElement('canvas').getContext('2d'); const need = cvDraw(m, W, d, col, false);
  const c = document.createElement('canvas'); c.width = W; c.height = Math.max(1684, Math.round(need) + 40); const ctx = c.getContext('2d'); ctx.textBaseline = 'alphabetic';
  cvDraw(ctx, W, d, col, true); return c;
}
async function cvPreview() {
  tab = 'profile'; render(pageHead('আপনার সিভি') + '<div class="pad"><div class="empty"><span class="e1">⏳</span>সিভি তৈরি হচ্ছে...</div></div>');
  const c = await cvRender(); _cvOut = c;
  render(pageHead('আপনার সিভি') + `<div class="pad"><img src="${c.toDataURL('image/jpeg', 0.92)}" style="width:100%;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.2)" alt="CV">
    <div class="two" style="margin-top:12px"><button class="btn" onclick="cvExport('pdf')">📄 PDF নিন</button><button class="btn" onclick="cvExport('jpg')">🖼️ ছবি নিন</button></div>
    <button class="btn" style="width:100%;margin-top:8px;background:#128c4a" onclick="cvExport('share')">📤 হোয়াটসঅ্যাপ / অন্য অ্যাপে পাঠান</button>
    <button class="btn sm" style="background:#475569;margin-top:10px" onclick="openCv()">✏️ তথ্য বদলান</button><div id="cv_msg" class="warn" style="display:none"></div><div style="height:14px"></div></div>`);
}
function cvPdf(jpg, w, h) {
  const enc = s => new TextEncoder().encode(s), W = 595, H = Math.round(595 * h / w), parts = [], off = []; let len = 0;
  const add = b => { parts.push(b); len += b.length; };
  add(enc('%PDF-1.4\n')); const obj = (n, body) => { off[n] = len; add(enc(n + ' 0 obj\n')); add(typeof body === 'string' ? enc(body) : body); add(enc('\nendobj\n')); };
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`);
  const cs = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`; obj(4, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
  off[5] = len; add(enc(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`)); add(jpg); add(enc('\nendstream\nendobj\n'));
  const xr = len; let x = 'xref\n0 6\n0000000000 65535 f \n'; for (let i = 1; i <= 5; i++) x += String(off[i]).padStart(10, '0') + ' 00000 n \n';
  add(enc(x + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`));
  const out = new Uint8Array(len); let p = 0; parts.forEach(b => { out.set(b, p); p += b.length; }); return out;
}
const u8b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
async function cvExport(kind) {
  try {
    const c = _cvOut || await cvRender(), nm = ((_cv && _cv.name) || 'cv').replace(/[^\wঀ-৿]+/g, '-').slice(0, 24) || 'cv';
    const jb64 = c.toDataURL('image/jpeg', 0.92).split(',')[1], jbin = Uint8Array.from(atob(jb64), ch => ch.charCodeAt(0));
    const isPdf = kind === 'pdf' || kind === 'share', bytes = isPdf ? cvPdf(jbin, c.width, c.height) : jbin, fname = nm + '-CV.' + (isPdf ? 'pdf' : 'jpg'), mime = isPdf ? 'application/pdf' : 'image/jpeg';
    const C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform()) {
      const FS = capP('Filesystem'), SH = capP('Share'); const r = await FS.writeFile({path: fname, data: u8b64(bytes), directory: 'CACHE'});
      await SH.share({title: 'আমার সিভি', url: r.uri, dialogTitle: kind === 'share' ? 'কোথায় পাঠাবেন?' : 'সিভি কোথায় রাখবেন?'}); return;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], {type: mime})); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  } catch (e) { if (e && /cancel/i.test(String(e.message || e))) return; cvMsg('⚠️ হয়নি: ' + ((e && e.message) || '')); }
}

// ---------- মোডাল ----------
function showModal(html) {
  closeModal();
  const m = document.createElement('div'); m.id = 'modal'; m.className = 'modal';
  m.innerHTML = `<div class="mbox"><button class="mx" onclick="closeModal()">✕</button>${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) closeModal(); });
  document.body.appendChild(m);
}
function closeModal() { const m = document.getElementById('modal'); if (m) m.remove(); }

// ---------- নেভিগেশন ----------
function go(t) {
  closeModal(); speakStop();
  if (t === 'home') return home();
  stack = [];
  if (t === 'study') return studyPage();
  if (t === 'quiz') return startQuiz();
  if (t === 'job') return jobsPage();
  if (t === 'profile') return profile();
}

document.addEventListener('backbutton', () => { if (document.getElementById('modal')) closeModal(); else if (stack.length) back(); });
home();
fetchJobs();
(function () {
  const s = document.createElement('div'); s.id = 'splash';
  s.innerHTML = `<div class="sp-logo">${appLogoHtml()}</div><div class="sp-t">${esc(appName())}</div>${bismOn() ? '<div class="bism">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ<small>পরম করুণাময় অসীম দয়ালু আল্লাহর নামে শুরু করছি</small></div>' : ''}`;
  document.body.appendChild(s);
  setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 500); }, bismOn() ? 2000 : 900);
})();
setTimeout(() => { try { loginNudge(); } catch (e) {} }, 1600);


// ---------- ফোনের ব্যাক বাটন (অ্যাপ থেকে সরাসরি বেরিয়ে যাওয়া আটকায়) ----------
(function () {
  let lastBack = 0;
  function onBack() {
    const m = document.getElementById('modal'); if (m) return closeModal();
    const d = document.getElementById('drw'); if (d && d.classList.contains('open')) return toggleDrawer();
    if (window.__lgBack && window.__lgBack()) return;
    if (stack.length) return back();
    if (!document.querySelector('.hrow')) return home();
    const q = document.getElementById('q'); if (q && q.value) { q.value = ''; return home(); }
    // হোম পেজে ব্যাক চাপলে সরাসরি অ্যাপ থেকে বের হয়
    if (Date.now() - lastBack < 2200) return exitNow();
    lastBack = Date.now(); toast_('বের হতে আবার ব্যাক চাপুন');
  }
  function toast_(t) {
    const e = document.createElement('div'); e.textContent = t;
    e.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#1F2329;color:#fff;padding:10px 16px;border-radius:20px;font-size:14px;z-index:99999;max-width:80%;text-align:center';
    document.body.appendChild(e); setTimeout(() => e.remove(), 1800);
  }
  let APP = null; const exitApp = () => APP && APP.exitApp && APP.exitApp();
  try {
    if (window.Capacitor) {
      APP = capP('App');
      if (APP) APP.addListener('backButton', onBack);
    }
  } catch (e) {}
  // ব্রাউজার/অন্য পরিবেশে: history ব্যবহার করা হয় না, তাই কিছু করার নেই
  window.__onBack = onBack; window.__exit = exitApp;
})();

// অ্যাডমিনের বানানো ভিতরের পাতা, বিজ্ঞাপন ও খবরের লাইন সব পাতায় জোড়া
(function () {
  const r0 = render, o0 = open_;
  render = function (h) { r0(h); if (typeof renderBars === 'function') renderBars(); if (typeof hideScan === 'function') hideScan(); if (typeof homeExtras === 'function') homeExtras(); };
  open_ = function (id) { o0(id); if (typeof injectKids === 'function' && id.indexOf('sec_') !== 0) injectKids(id); if (typeof hideScan === 'function') hideScan(); };
  if (typeof renderBars === 'function') renderBars();
  if (typeof lateInit === 'function') lateInit();
  if (typeof homeExtras === 'function') homeExtras();
})();

// ---------- ফাইলে ব্যাকআপ ও ফিরিয়ে আনা ----------
function fileBackupBox() {
  return `<div class="box" style="text-align:center"><b>💾 ফাইলে ব্যাকআপ</b><div style="font-size:13px;color:#666;margin:4px 0 8px">আপনার খাতা, সিভি, রিমাইন্ডার ইত্যাদি একটি ফাইলে রাখুন। চাইলে Google Drive বা WhatsApp এ পাঠিয়ে রাখতে পারবেন।</div>
    <button class="btn sm" onclick="fileBackup()">⬇️ ব্যাকআপ ফাইল নিন</button> <button class="btn sm" style="background:#475569" onclick="document.getElementById('bkfile').click()">⬆️ ফাইল থেকে ফিরিয়ে আনুন</button>
    <input type="file" id="bkfile" accept=".json,application/json" style="display:none" onchange="fileRestore(this)"></div>`;
}
async function fileBackup() {
  const keys = typeof SYNC_KEYS !== 'undefined' ? SYNC_KEYS : ['cv', 'ledger', 'remind', 'sos'], data = {};
  keys.forEach(k => { const v = localStorage.getItem(k); if (v !== null) data[k] = v; });
  const json = JSON.stringify({app: 'chalokbhai', v: 1, at: new Date().toISOString(), data}), name = 'chalok-bhai-backup-' + todayISO() + '.json';
  try {
    const C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform()) {
      const FS = capP('Filesystem'), SH = capP('Share');
      const r = await FS.writeFile({path: name, data: json, directory: 'CACHE', encoding: 'utf8'});
      await SH.share({title: 'আমার ভাই ব্যাকআপ', url: r.uri, dialogTitle: 'ব্যাকআপ ফাইল কোথায় রাখবেন?'}); return;
    }
  } catch (e) { if (e && /cancel/i.test(String(e.message || e))) return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], {type: 'application/json'})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function fileRestore(inp) {
  const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => {
    try {
      const o = JSON.parse(r.result); if (!o || o.app !== 'chalokbhai' || !o.data) throw 0;
      const keys = typeof SYNC_KEYS !== 'undefined' ? SYNC_KEYS : Object.keys(o.data); const ks = Object.keys(o.data).filter(k => keys.includes(k) && typeof o.data[k] === 'string');
      if (!ks.length) throw 0; if (!confirm('এই ফাইলের তথ্য ফোনের এখনকার তথ্যের জায়গায় বসবে। ঠিক আছে?')) return;
      ks.forEach(k => localStorage.setItem(k, o.data[k])); alert('✅ তথ্য ফিরে এসেছে।'); location.reload();
    } catch (e) { alert('এটি আমার ভাইয়ের ব্যাকআপ ফাইল নয়।'); }
  };
  r.readAsText(f); inp.value = '';
}

// এক চাপে অ্যাপ থেকে সরাসরি বের হওয়া
function exitNow() {
  try { if (window.__exit) window.__exit(); } catch (e) {}
  setTimeout(() => { try { window.close(); } catch (e) {} }, 200);
}
// ওয়েবে ঠিকানার শেষে #admin থাকলে সরাসরি অ্যাডমিন লগইন
if (location.hash === '#admin') setTimeout(() => open_('admin'), 2300);

// ---------- শেষ দেখা পাতায় ফেরা (অ্যাপ ছোট করে রেখে পরে খুললে বা ফোন বন্ধ করে দিলেও) ----------
const RES = {
  on: () => { try { return localStorage.getItem('noresume') !== '1'; } catch (e) { return true; } },
  skip: ['quiz', 'roadtest', 'maker', 'govqa', 'account', 'admin', 'cv', 'lang', 'share', 'qorder', 'notes'],
  save(o) { try { if (!RES.on()) return; if (!o) localStorage.removeItem('lastPg'); else localStorage.setItem('lastPg', JSON.stringify(Object.assign({y: 0, t: Date.now()}, o))); } catch (e) {} },
  y() { try { const s = JSON.parse(localStorage.getItem('lastPg') || 'null'); if (s) { s.y = window.scrollY || 0; s.t = Date.now(); localStorage.setItem('lastPg', JSON.stringify(s)); } } catch (e) {} },
  restore() {
    try {
      if (!RES.on() || document.getElementById('modal')) return false; const s = JSON.parse(localStorage.getItem('lastPg') || 'null'); if (!s || !s.id) return false;
      if (Date.now() - (s.t || 0) > 3 * 86400000) return false;
      if (s.k === 'n') { if (!(typeof ADMIN_CONTENT !== 'undefined' && ADMIN_CONTENT.find(c => c.id === s.id))) return false; rebuildStack('n_' + s.id); nodePage(s.id); }
      else if (s.k === 'o') { if (s.id.indexOf('sec_') === 0 && !(typeof ADMIN_CONTENT !== 'undefined' && ADMIN_CONTENT.find(c => c.id === s.id.slice(4)))) return false; open_(s.id); }
      else return false;
      const y = s.y || 0; if (y) { setTimeout(() => window.scrollTo(0, y), 60); setTimeout(() => window.scrollTo(0, y), 350); }
      return true;
    } catch (e) { return false; }
  }
};
(function () {
  const h0 = home, o0 = open_, n0 = typeof nodePage === 'function' ? nodePage : null;
  home = function (q) { if (!q) RES.save(null); return h0.apply(this, arguments); };
  open_ = function (id) { if (!RES.skip.includes(id)) RES.save({k: 'o', id}); else RES.save(null); return o0.apply(this, arguments); };
  if (n0) nodePage = function (id) { RES.save({k: 'n', id}); return n0.apply(this, arguments); };
  let tm = null; window.addEventListener('scroll', () => { clearTimeout(tm); tm = setTimeout(RES.y, 400); }, {passive: true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) RES.y(); }); window.addEventListener('pagehide', RES.y);
  try { if (window.Capacitor) (capP('App') || {addListener(){}}).addListener('appStateChange', s => { if (!s.isActive) RES.y(); }); } catch (e) {}
  RES.restore();
})();
