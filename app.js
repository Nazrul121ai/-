const $app = document.getElementById('app');
let tab = 'home', stack = [];

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bn = n => LANG === 'en' ? String(n) : String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };

// ---------- ভয়েস ----------
function speak(text) {
  if (!('speechSynthesis' in window)) { alert('এই ডিভাইসে ভয়েস সাপোর্ট নেই।'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = /[\u0980-\u09FF]/.test(text) ? 'bn-BD' : 'en-US'; u.rate = .9;
  speechSynthesis.speak(u);
}

// ---------- কাঠামো ----------
function nav() {
  const items = [['home','🏠','হোম'],['study','🎓','প্রস্তুতি'],['quiz','📋','মডেল টেস্ট'],['job','💼','চাকরি'],['profile','👤','প্রোফাইল']];
  return '<div class="nav">' + items.map(i =>
    `<div class="${tab===i[0]?'on':''}" onclick="go('${i[0]}')"><b>${i[1]}</b>${i[2]}</div>`).join('') + '</div>';
}
function drawer() {
  const m = [['test','🛞','Driving Test প্রশ্ন'],['book','📘','Driving বই'],['road','🛣️','রাস্তার নিয়ম'],['signs','🛑','ট্রাফিক সাইন'],
    ['lessons','🎓','ড্রাইভ লেসন'],['paper','📰','সাপ্তাহিক চাকরির পত্রিকা'],['account','👤','লগইন ও ব্যাকআপ'],...(PAID_ENABLED ? [['courses','🎓','পেইড কোর্স']] : []),['parts','⚙️','গাড়ির যন্ত্রাংশ'],['learn','🚗','গাড়ি চালানো শিখুন'],['ledger','💰','আয়-খরচ খাতা'],['remind','⏰','রিমাইন্ডার'],['sos','🆘','জরুরি নম্বর'],['hacks','🛠️','দ্রুত সমাধান'],['govguide','🏛️','সরকারি চাকরির প্রস্তুতি'],['govqa','📝','সরকারি চাকরির প্রশ্ন ও সমাধান'],['licguide','🪪','লাইসেন্স করার নিয়ম'],['idp','🌐','আন্তর্জাতিক লাইসেন্স (IDP)'],['warn','🚨','ড্যাশবোর্ড বাতি'],['police','👮','পুলিশের ইশারা'],['signquiz','🧠','সাইন চিনুন কুইজ'],['care','🔧','গাড়ির যত্ন'],['cockpit','🎛️','ককপিট গাইড'],['links','🔗','দরকারি লিংক'],['share','📤','অ্যাপ শেয়ার করুন'],['quiz','📋','মডেল টেস্ট'],['jobprep','💼','চাকরির প্রস্তুতি'],['job','🧑‍✈️','ড্রাইভিং জব'],['cv','🪪','ডিজিটাল সিভি'],['lang','🌐',LANG === 'bn' ? 'ভাষা: English' : 'Language: বাংলা']];
  return `<div class="drawer-bg" id="dbg" onclick="toggleDrawer()"></div><div class="drawer" id="drw">
    <div class="dh">🛞 চালক ভাই<br><small style="font-weight:normal;font-size:13px">শিখুন • নিরাপদে চালান</small></div>` +
    m.map(i => `<div class="it" onclick="toggleDrawer();open_('${i[0]}')"><span>${i[1]}</span>${i[2]}</div>`).join('') + '</div>';
}
function toggleDrawer() {
  const d = document.getElementById('drw'), b = document.getElementById('dbg');
  const o = d.classList.toggle('open'); b.style.display = o ? 'block' : 'none';
}
function render(html) { $app.innerHTML = html + nav() + drawer(); window.scrollTo(0, 0); }
function pageHead(t, back = true) {
  return `<div class="page-h">${back ? '<button class="back" onclick="back()">←</button>' : ''}<h2>${esc(t)}</h2></div>`;
}
function back() { const p = stack.pop(); if (p) p(); else home(); }
function push(fn) { stack.push(fn); }

// ---------- হোম ----------
let tipIdx = Math.floor(Math.random() * TIPS.length);
const SHORT = {intjob:'বিদেশে চাকরি', govqa:'সরকারি চাকরির প্রশ্ন', govguide:'সরকারি চাকরি গাইড', paper:'সাপ্তাহিক পত্রিকা', idp:'আন্তর্জাতিক লাইসেন্স', licguide:'লাইসেন্সের নিয়ম', signquiz:'সাইন কুইজ', roadtest:'রোড টেস্ট', jobprep:'চাকরির প্রস্তুতি', test:'লিখিত প্রশ্ন', book:'ড্রাইভিং বই', road:'রাস্তার নিয়ম', warn:'ড্যাশবোর্ড বাতি', police:'পুলিশের ইশারা', care:'গাড়ির যত্ন', cockpit:'ককপিট গাইড', learn:'গাড়ি চালানো শিখুন', hacks:'দ্রুত সমাধান', parts:'গাড়ির যন্ত্রাংশ', ledger:'আয়-খরচ খাতা', remind:'রিমাইন্ডার', sos:'জরুরি নম্বর', links:'দরকারি লিংক', lessons:'ড্রাইভ লেসন', job:'ড্রাইভিং জব', signs:'ট্রাফিক সাইন', gk:'সাধারণ জ্ঞান'};
const GROUPS = [
  ['লাইসেন্স ও পরীক্ষা', ['licguide','test','signs','signquiz','roadtest','police','idp','book','road']],
  ['গাড়ি চেনা ও চালানো', ['learn','parts','warn','cockpit','care','hacks','lessons']],
  ['চাকরি ও প্রস্তুতি', ['job','intjob','paper','govguide','govqa','jobprep','bangla','english','math','gk']],
  ['আমার খাতা', ['ledger','remind','sos','links']]
];
const QUICK = [['quiz','📋','মডেল টেস্ট'],['signs','🛑','সাইন'],['parts','⚙️','যন্ত্রাংশ'],['job','💼','চাকরি']];
function tile(c) { return `<div class="tile" onclick="open_('${c.id}')"><div class="ti" style="background:${c.color}26">${c.ic}</div><span>${esc(SHORT[c.id] || c.name)}</span></div>`; }
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
function home(q = '') {
  tab = 'home'; stack = [];
  const list = CATS.filter(c => !q || c.name.includes(q) || (SHORT[c.id] || '').includes(q) || c.sub.includes(q));
  let body;
  if (q) body = `<div class="tgrid" style="margin-top:14px">${list.map(tile).join('') || '<div class="empty" style="grid-column:span 3">কিছু পাওয়া যায়নি</div>'}</div>`;
  else {
    const used = new Set(); GROUPS.forEach(g => g[1].forEach(x => used.add(x)));
    const known = ['quiz','signquiz','links','share','paper','parts','learn','hacks','ledger','remind','sos','govqa','signs','lessons','job','intjob','cv','jobprep','roadtest','account'];
    if (PAID_ENABLED) known.push('courses');
    const canOpen = id => known.includes(id) || INFO[id] || STUDY[id] || QA[id];
    const shown = new Set(GROUPS.flatMap(g => g[1].map(id => (CATS.find(c => c.id === id) || {}).name)));
    const rest = CATS.filter((c, i) => !used.has(c.id) && canOpen(c.id) && !shown.has(c.name) && CATS.findIndex(x => x.id === c.id) === i);
    const groups = GROUPS.map(g => [g[0], g[1].map(id => CATS.find(c => c.id === id)).filter(Boolean)]);
    if (rest.length) groups[groups.length - 1][1] = groups[groups.length - 1][1].concat(rest);
    body = `<div class="qrow">${QUICK.map(x => `<div class="qk" onclick="open_('${x[0]}')"><b>${x[1]}</b>${x[2]}</div>`).join('')}</div>` +
      alertBanner() +
      `<div class="stats"><span>🔥 ধারাবাহিক ${bn(updateStreak().n)} দিন</span><span>🏆 সেরা স্কোর ${bn(load('best', 0))}/${bn(QUIZ.length)}</span></div>` +
      dailyCard() +
      `<div class="tip"><div><b>💡 আজকের টিপস</b><div id="tip-t">${esc(TIPS[tipIdx])}</div></div><button class="btn sm" onclick="speak(document.getElementById('tip-t').innerText)">🔊</button></div>` +
      groups.map(g => `<div class="sec-h">${esc(g[0])}</div><div class="tgrid">${g[1].map(tile).join('')}</div>`).join('') + '<div style="height:14px"></div>';
  }
  render(`<div class="sign"><div class="hrow"><div class="brand"><span class="logo">🛞</span><div>চালক ভাই<small>শেখা, কাগজ ও চাকরি এক জায়গায়</small></div></div>
      <div style="display:flex;gap:6px"><button class="iconbtn" onclick="toggleDark()">🌙</button><button class="iconbtn" style="width:auto;padding:0 10px;font-weight:800;font-size:14px" onclick="toggleLang()">${LANG === 'bn' ? 'EN' : 'বাং'}</button><button class="iconbtn" onclick="toggleDrawer()">☰</button></div></div>
      <div class="search"><span>🔍</span><input id="q" value="${esc(q)}" placeholder="কী শিখতে চান? যেমন: ব্রেক, লাইসেন্স" oninput="home(this.value)"></div><div class="lane"></div></div>` + body);
  if (q) { const i = document.getElementById('q'); i.focus(); i.setSelectionRange(q.length, q.length); }
}

function open_(id) {
  push(() => home());
  if (id === 'roadtest' || id === 'quiz') return startQuiz();
  if (id === 'signs') return signsPage();
  if (id === 'account') return accountPage();
  if (id === 'courses' && PAID_ENABLED) return paidHome();
  if (id === 'lang') { stack.pop(); return toggleLang(); }
  if (id === 'parts') return partsHome();
  if (id === 'learn') return learnPage();
  if (id === 'hacks') return hacksPage();
  if (id === 'ledger') return ledgerPage();
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
    `<div class="sign" onclick="showSign(${o.i})"><div class="e">${o.s[0]}</div><b>${esc(o.s[1])}</b></div>`).join('')}</div>`);
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
    (safeUrl(j.url) ? `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:10px" href="${esc(safeUrl(j.url))}" target="_blank">🔗 আবেদন / বিস্তারিত</a>` : '') + (j.phone ? `<a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:10px" href="tel:${esc(String(j.phone).replace(/[^\\d+]/g, ''))}">📞 কল করুন</a>` : ''));
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
function openLink(i) { const x = paperList()[i]; if (x) window.open(x.url, '_blank'); }
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
    <h2>স্কোর: ${bn(sqs)} / ${bn(SIGNS.length)}</h2><button class="btn" onclick="startSignQuiz()">আবার দিন</button></div>`);
}

// ---------- লিংক, শেয়ার, ডার্ক মোড, স্ট্রিক ----------
function linksPage() {
  tab = 'home';
  render(pageHead('দরকারি লিংক') + '<div class="pad">' + LINKS.map((x, i) =>
    `<div class="job" style="border-color:#475569"><b>${esc(x.t)}</b><div style="font-size:13px;color:#666;margin:2px 0 8px">${esc(x.d)}</div>
     <button class="btn sm" style="background:#475569" onclick="window.open(LINKS[${i}].url,'_blank')">🔗 খুলুন</button></div>`).join('') +
    '<div class="warn">লিংক ব্রাউজারে খুলবে, ইন্টারনেট লাগবে।</div></div>');
}
function shareApp() {
  const text = 'চালক ভাই অ্যাপ: ড্রাইভিং লাইসেন্স পরীক্ষার প্রস্তুতি, রোড সাইন, কুইজ ও চাকরির খবর এক জায়গায়।';
  if (navigator.share) navigator.share({title:'চালক ভাই', text}).catch(() => {});
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
function safeUrl(u) { return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : ''; }
function todayISO() { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function activeJobs() {
  const t = todayISO();
  return JOBS.concat(Array.isArray(REMOTE_JOBS) ? REMOTE_JOBS : []).filter(j => j && typeof j === 'object' && j.t && (!j.deadline || String(j.deadline) >= t));
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
     ${safeUrl(h[3]) ? `<button class="btn sm" onclick="window.open('${esc(safeUrl(h[3]))}','_blank')">▶️ ভিডিও দেখুন</button>` : ''}
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
    `<div class="sec"><b>➕ নিজের কন্টাক্ট যোগ করুন</b><div style="font-size:13px;color:#666">মেকানিক, গ্যারেজ, হাইওয়ে পুলিশ, পরিবারের সদস্য</div>
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
function ledgerData() { return load('ledger', {entries: [], fixed: [], budget: 0}); }
function saveLedger(l) { localStorage.setItem('ledger', JSON.stringify(l)); }
function ledgerPage() {
  tab = 'home'; const l = ledgerData(), t = todayISO(), m = t.slice(0, 7);
  const sum = (arr, ty) => arr.filter(e => e.type === ty).reduce((s, e) => s + e.amt, 0);
  const today = l.entries.filter(e => e.date === t), month = l.entries.filter(e => e.date.slice(0, 7) === m);
  const fixed = l.fixed.reduce((s, f) => s + f.amt, 0);
  const inc = sum(month, 'in'), exp = sum(month, 'out') + fixed, save = inc - exp;
  const over = l.budget > 0 && exp > l.budget;
  render(pageHead('আয়-খরচ খাতা') + `<div class="pad">
    ${over ? `<div class="warn" style="margin:0 0 10px;background:#fee2e2;border-color:#f87171;color:#991b1b">🚨 সতর্কতা: এই মাসের খরচ (${taka(exp)}) আপনার বাজেট সীমা (${taka(l.budget)}) ছাড়িয়ে গেছে।</div>` : ''}
    <div class="two"><div class="flash"><b>আজকের আয়</b><div>${taka(sum(today, 'in'))}</div></div><div class="flash"><b>আজকের খরচ</b><div>${taka(sum(today, 'out'))}</div></div>
      <div class="flash"><b>এ মাসের আয়</b><div>${taka(inc)}</div></div><div class="flash"><b>এ মাসের খরচ (নির্দিষ্ট সহ)</b><div>${taka(exp)}</div></div></div>
    <div class="cvcard" style="margin:12px 0"><b>💵 মাসিক জমা / সেভিংস: ${taka(save)}</b>${l.budget ? `<div>বাজেট সীমা: ${taka(l.budget)}</div>` : ''}</div>
    <div class="sec"><b>➕ নতুন হিসাব</b>
      <select class="inp" id="lt"><option value="in">আয়</option><option value="out">খরচ</option></select>
      <input class="inp" id="la" type="number" min="0" placeholder="টাকা">
      <input class="inp" id="ln" placeholder="বিবরণ (যেমন: ভাড়া, গ্যাস, তেল)">
      <button class="btn sm" onclick="addEntry()">সংরক্ষণ</button></div>
    <div class="sec"><b>📋 আজকের তালিকা</b>${today.map(e => `<div class="note" style="display:flex;justify-content:space-between"><span>${e.type === 'in' ? '🟢' : '🔴'} ${esc(e.note || (e.type === 'in' ? 'আয়' : 'খরচ'))}</span><span>${taka(e.amt)} <a href="#" onclick="delEntry('${e.id}');return false">✕</a></span></div>`).join('') || '<div class="empty" style="padding:10px">আজ এখনো কিছু লেখা হয়নি</div>'}</div>
    <div class="sec"><b>🏠 মাসিক নির্দিষ্ট খরচ (কিস্তি, গ্যারেজ ভাড়া)</b>${l.fixed.map((f, i) => `<div class="note" style="display:flex;justify-content:space-between"><span>${esc(f.n)}</span><span>${taka(f.amt)} <a href="#" onclick="delFixed(${i});return false">✕</a></span></div>`).join('')}
      <input class="inp" id="fn" placeholder="নাম (যেমন: গাড়ির কিস্তি)"><input class="inp" id="fa" type="number" min="0" placeholder="মাসে কত টাকা">
      <button class="btn sm" onclick="addFixed()">যোগ করুন</button></div>
    <div class="sec"><b>🎯 মাসিক খরচের বাজেট সীমা</b><input class="inp" id="lb" type="number" min="0" value="${l.budget || ''}" placeholder="যেমন: ২০০০০"><button class="btn sm" onclick="setBudget()">সেট করুন</button></div></div>`);
}
function addEntry() {
  const amt = parseFloat(document.getElementById('la').value);
  if (!(amt > 0)) { alert('সঠিক টাকার পরিমাণ দিন।'); return; }
  const l = ledgerData(); l.entries.push({id: String(Date.now()), date: todayISO(), type: document.getElementById('lt').value, amt, note: document.getElementById('ln').value.trim()}); saveLedger(l); ledgerPage();
}
function delEntry(id) { const l = ledgerData(); l.entries = l.entries.filter(e => e.id !== id); saveLedger(l); ledgerPage(); }
function addFixed() {
  const n = document.getElementById('fn').value.trim(), amt = parseFloat(document.getElementById('fa').value);
  if (!n || !(amt > 0)) { alert('নাম ও টাকা দিন।'); return; }
  const l = ledgerData(); l.fixed.push({n, amt}); saveLedger(l); ledgerPage();
}
function delFixed(i) { const l = ledgerData(); l.fixed.splice(i, 1); saveLedger(l); ledgerPage(); }
function setBudget() { const l = ledgerData(); l.budget = parseFloat(document.getElementById('lb').value) || 0; saveLedger(l); ledgerPage(); }

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
  document.getElementById('nx').innerHTML = `<button class="btn" onclick="nextQ()">${qi+1<QUIZ.length?'পরের প্রশ্ন →':'ফলাফল দেখুন'}</button>`;
}
function nextQ() { qi++; qi < QUIZ.length ? quizQ() : result(); }
function result() {
  const pass = score / QUIZ.length >= .7;
  if (score > load('best', 0)) localStorage.setItem('best', JSON.stringify(score));
  render(pageHead('ফলাফল', false) + `<div class="pad" style="text-align:center">
    <div style="font-size:64px">${pass?'🏆':'📚'}</div>
    <h2>আপনার স্কোর: ${bn(score)} / ${bn(QUIZ.length)}</h2>
    <p>${pass?'অভিনন্দন! আপনি পাস করেছেন।':'আরও অনুশীলন করুন, আবার চেষ্টা করুন।'}</p>
    <button class="btn" onclick="startQuiz()">আবার দিন</button></div>`);
}

// ---------- ডিজিটাল সিভি ও প্রোফাইল ----------
function profile() {
  tab = 'profile'; stack = [];
  const p = load('cv', null);
  render(pageHead('প্রোফাইল', false) + `<div class="profile"><div class="avatar">👤</div><h3>${esc(p ? p.name : 'আপনার নাম')}</h3></div>` +
    (p ? `<div class="cvcard"><b>${esc(p.name)}</b><div>📞 ${esc(p.phone)}</div><div>🪪 লাইসেন্স: ${esc(p.lic)} (${esc(p.exp || '০')} বছর অভিজ্ঞতা)</div><div>📍 এলাকা: ${esc(p.city || '—')}</div></div>`
       : '<div class="empty">এখনো সিভি বানানো হয়নি</div>') +
    `<div style="text-align:center"><button class="btn" onclick="openCv()">${p ? 'তথ্য আপডেট করুন' : 'ডিজিটাল সিভি বানান'}</button></div>` +
    `<div class="box" style="text-align:center"><b>☁️ ${cloudInfo() ? 'লগইন করা: ' + esc(cloudInfo().name || cloudInfo().id) : 'লগইন ও ব্যাকআপ'}</b><div style="font-size:13px;color:#666;margin:4px 0 8px">ফোন হারালে বা অ্যাপ মুছে গেলে তথ্য ফিরে পেতে</div><button class="btn sm" onclick="push(()=>profile());accountPage()">${cloudInfo() ? 'অ্যাকাউন্ট দেখুন' : 'লগইন করুন'}</button></div>` +
    `<div class="box" style="text-align:center"><b>🌐 ভাষা</b><div style="margin-top:8px"><button class="btn sm" style="${LANG === 'bn' ? '' : 'background:#64748b'}" onclick="LANG!=='bn'&&toggleLang()">বাংলা</button> <button class="btn sm" style="${LANG === 'en' ? '' : 'background:#64748b'}" onclick="LANG!=='en'&&toggleLang()">English</button></div></div>`);
}
function openCv() {
  const p = load('cv', {name:'', phone:'', lic:'হালকা (Light)', exp:'', city:''});
  const lics = ['হালকা (Light)','মধ্যম (Medium)','ভারী (Heavy)','মোটরসাইকেল'];
  showModal(`<h3>🪪 চালক ডিজিটাল সিভি</h3>
    <label>পূর্ণ নাম</label><input class="inp" id="cv-name" value="${esc(p.name)}" placeholder="যেমন: মো: রফিকুল ইসলাম">
    <label>মোবাইল নম্বর</label><input class="inp" id="cv-phone" type="tel" value="${esc(p.phone)}" placeholder="০১৭XXXXXXXX">
    <label>লাইসেন্স টাইপ</label><select class="inp" id="cv-lic">${lics.map(l => `<option ${l===p.lic?'selected':''}>${l}</option>`).join('')}</select>
    <label>অভিজ্ঞতা (বছর)</label><input class="inp" id="cv-exp" type="number" value="${esc(p.exp)}">
    <label>বর্তমান এলাকা / শহর</label><input class="inp" id="cv-city" value="${esc(p.city)}" placeholder="যেমন: মিরপুর, ঢাকা">
    <button class="btn" style="width:100%;margin-top:12px" onclick="saveCv()">সংরক্ষণ করুন</button>`);
}
function saveCv() {
  const v = id => document.getElementById(id).value.trim();
  if (!v('cv-name') || !v('cv-phone')) { alert('নাম ও মোবাইল নম্বর দিন।'); return; }
  localStorage.setItem('cv', JSON.stringify({name:v('cv-name'), phone:v('cv-phone'), lic:v('cv-lic'), exp:v('cv-exp'), city:v('cv-city')}));
  closeModal(); if (tab === 'profile') profile(); else alert('সিভি সংরক্ষিত হয়েছে। প্রোফাইল ট্যাবে দেখুন।');
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
  closeModal(); speechSynthesis && speechSynthesis.cancel && speechSynthesis.cancel();
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
  s.innerHTML = '<div class="sp-logo">🛞</div><div class="sp-t">চালক ভাই</div><div class="lane" style="width:120px"></div>';
  document.body.appendChild(s);
  setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 500); }, 900);
})();
setTimeout(() => { try { loginNudge(); } catch (e) {} }, 1600);
