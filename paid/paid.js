// পেইড কোর্স (আলাদা মডিউল)। এখন বন্ধ আছে। ভবিষ্যতে চালু করতে নিচে PAID_ENABLED = true করুন এবং SETUP.md এর "পেইড কোর্স" অংশ অনুসরণ করুন।
// কোর্সের তালিকা, দাম ও ফ্রি পাঠ data.js এর COURSES এ আছে। পেইড পাঠের আসল লেখা Firestore এ থাকে, অ্যাপের ফাইলে নয়।
const PAID_ENABLED = false;
const PAY_INFO = {
  bkash: '',   // যেমন: '01XXXXXXXXX' (পার্সোনাল বা মার্চেন্ট নম্বর)
  nagad: '',
  note: 'টাকা পাঠিয়ে ট্রানজেকশন আইডি জমা দিন। যাচাই শেষে কোর্স খুলে দেওয়া হবে।'
};
const paidCourses = () => (typeof COURSES !== 'undefined' && Array.isArray(COURSES)) ? COURSES : [];
// চালু থাকলে হোমে "পেইড কোর্স" আইকন দেখাবে
if (PAID_ENABLED && !CATS.some(c => c.id === 'courses')) CATS.push({id: 'courses', name: 'পেইড কোর্স', ic: '🎓', color: '#a16207', sub: 'প্রিমিয়াম কোর্স'});

async function paidState() {
  const st = {owned: {}, pending: {}};
  if (!CLOUD_ON() || !cloudInfo()) return st;
  const f = await fb(); const u = f.auth.currentUser; if (!u) return st;
  const e = await f.F.getDoc(f.F.doc(f.db, 'entitlements', u.uid)); if (e.exists()) st.owned = e.data() || {};
  const q = await f.F.getDocs(f.F.query(f.F.collection(f.db, 'orders'), f.F.where('uid', '==', u.uid)));
  q.forEach(d => { const o = d.data(); if (o.status === 'pending') st.pending[o.courseId] = true; });
  return st;
}
async function paidHome() {
  tab = 'home';
  render(pageHead('পেইড কোর্স') + '<div class="pad" id="paidbody"><div class="empty">⏳ লোড হচ্ছে...</div></div>');
  let st = {owned: {}, pending: {}}, note = '';
  try { st = await paidState(); } catch (e) { note = '<div class="warn" style="margin:0 0 10px">কোর্সের অবস্থা আনা যায়নি। ইন্টারনেট সংযোগ দেখুন।</div>'; }
  const list = paidCourses(); const el = document.getElementById('paidbody'); if (!el) return;
  el.innerHTML = note + (list.length ? list.map(c => `<div class="sec"><b>🎓 ${esc(c.title)}</b><div style="margin:4px 0">${esc(c.desc || '')}</div>
    <ul style="margin:6px 0;padding-left:20px;font-size:14px">${(c.outline || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div style="font-weight:bold;margin:6px 0">${taka(c.price || 0)}</div>
    ${c.preview ? `<button class="btn sm" style="background:#475569" onclick="paidPreview('${esc(c.id)}')">বিনামূল্যে দেখুন</button> ` : ''}
    ${st.owned[c.id] === true ? `<button class="btn sm" onclick="paidRead('${esc(c.id)}')">পড়ুন</button> ✅ কেনা হয়েছে`
      : st.pending[c.id] ? '<span class="badge" style="background:#d97706">অনুমোদনের অপেক্ষায়</span>'
      : `<button class="btn sm" style="background:#a16207" onclick="paidBuy('${esc(c.id)}')">কিনুন</button>`}</div>`).join('') : '<div class="empty">এখনো কোনো কোর্স যোগ হয়নি।</div>');
}
function paidPreview(id) { const c = paidCourses().find(x => x.id === id); if (c && c.preview) showModal(`<h3>${esc(c.preview.t)}</h3><p style="line-height:1.7;white-space:pre-line">${esc(c.preview.body)}</p>`); }
function paidBuy(id) {
  const c = paidCourses().find(x => x.id === id); if (!c) return;
  if (!CLOUD_ON()) { alert('এই সুবিধা এখনো চালু হয়নি।'); return; }
  if (!cloudInfo()) { alert('কোর্স কিনতে আগে লগইন করুন।'); push(() => paidHome()); return accountPage(); }
  showModal(`<h3>${esc(c.title)}</h3><p><b>${taka(c.price || 0)}</b></p>
    <div class="warn" style="margin:0 0 8px">${PAY_INFO.bkash ? '📲 বিকাশ: <b>' + esc(PAY_INFO.bkash) + '</b><br>' : ''}${PAY_INFO.nagad ? '📲 নগদ: <b>' + esc(PAY_INFO.nagad) + '</b><br>' : ''}${esc(PAY_INFO.note)}</div>
    <input class="inp" id="ptrx" placeholder="ট্রানজেকশন আইডি (TrxID)"><input class="inp" id="psnd" type="tel" placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন">
    <button class="btn" style="width:100%" onclick="paidSubmit('${esc(id)}')">জমা দিন</button><div id="pmsg" style="font-size:13px;margin-top:6px"></div>`);
}
async function paidSubmit(id) {
  const c = paidCourses().find(x => x.id === id), trx = document.getElementById('ptrx').value.trim(), snd = document.getElementById('psnd').value.trim(), m = document.getElementById('pmsg');
  if (!trx || !snd) { m.textContent = '⚠️ ট্রানজেকশন আইডি ও নম্বর দিন।'; return; }
  try {
    m.textContent = '⏳ জমা হচ্ছে...'; const f = await fb(); const u = f.auth.currentUser; if (!u) throw {code: 'auth/user-not-found'};
    await f.F.addDoc(f.F.collection(f.db, 'orders'), {uid: u.uid, courseId: id, price: c.price || 0, trx, sender: snd, status: 'pending', createdAt: f.F.serverTimestamp()});
    closeModal(); alert('অনুরোধ জমা হয়েছে। যাচাই শেষে কোর্স খুলে যাবে।'); paidHome();
  } catch (e) { m.textContent = '⚠️ ' + cloudErr(e); }
}
async function paidRead(id) {
  render(pageHead('পেইড কোর্স') + '<div class="pad"><div class="empty">⏳ লোড হচ্ছে...</div></div>');
  try {
    const f = await fb(); const d = await f.F.getDoc(f.F.doc(f.db, 'courseContent', id));
    if (!d.exists()) throw {message: 'এই কোর্সের পাঠ এখনো যোগ হয়নি'};
    const ls = (d.data() || {}).lessons || [];
    render(pageHead('পেইড কোর্স') + '<div class="pad">' + (ls.map(l => `<details class="acc"><summary>${esc(l.t || '')}</summary><p style="line-height:1.8;white-space:pre-line">${esc(l.body || '')}</p></details>`).join('') || '<div class="empty">পাঠ নেই</div>') + '</div>');
  } catch (e) { render(pageHead('পেইড কোর্স') + `<div class="pad"><div class="warn">⚠️ ${esc(e.code === 'permission-denied' ? 'এই কোর্স আপনার জন্য খোলা নেই।' : (e.message || 'লোড করা যায়নি।'))}</div></div>`); }
}
