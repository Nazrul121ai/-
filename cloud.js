// লগইন ও ক্লাউড ব্যাকআপ (Firebase Authentication + Firestore)
// অ্যাপ বা ফোন হারিয়ে গেলেও লগইন করলে সব তথ্য ফেরত আসে।
// ইন্টারনেট ছাড়া অ্যাপ আগের মতোই চলে। লগইন ও ব্যাকআপ শুধু ইন্টারনেট থাকলে হয়।
const SYNC_KEYS = ['cv', 'ledger', 'remind', 'sos', 'streak', 'best', 'daily', 'paperlinks', 'dark', 'lang', 'remoteJobs'];
const CLOUD_ON = () => !!(typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
let _fb = null, _user = null, _pushT = null, _restoring = false;

async function fb() {
  if (_fb) return _fb;
  if (window.__FB_MOCK) { _fb = window.__FB_MOCK; }
  else {
    const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
    const [app, auth, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    _fb = {auth: auth.getAuth(a), db: fs.getFirestore(a), A: auth, F: fs, app: a};
  }
  _fb.A.onAuthStateChanged(_fb.auth, u => { _user = u; });
  return _fb;
}
// ক্লাউডে আগে লগইন ছিল কি না, ইন্টারনেট ছাড়াই জানার জন্য
function cloudInfo() { try { return JSON.parse(localStorage.getItem('cloudInfo') || 'null'); } catch (e) { return null; } }
function setCloudInfo(o) { try { o ? localStorage.setItem('cloudInfo', JSON.stringify(o)) : localStorage.removeItem('cloudInfo'); } catch (e) {} }

// ফোন নম্বরকে লগইন আইডিতে রূপান্তর (ওটিপি ছাড়া)
function loginEmail(id) {
  id = String(id || '').trim();
  if (id.includes('@')) return id.toLowerCase();
  let d = id.replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('1')) d = '0' + d;
  if (!/^01\d{9}$/.test(d)) return '';
  return d + '@chalokbhai.app';
}
function cloudErr(e) {
  const c = (e && e.code) || '';
  const m = {
    'auth/email-already-in-use': 'এই আইডি দিয়ে আগেই অ্যাকাউন্ট খোলা আছে। লগইন করুন।',
    'auth/invalid-credential': 'আইডি বা পাসওয়ার্ড ভুল।', 'auth/wrong-password': 'আইডি বা পাসওয়ার্ড ভুল।', 'auth/user-not-found': 'আইডি বা পাসওয়ার্ড ভুল।',
    'auth/weak-password': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।', 'auth/invalid-email': 'সঠিক মোবাইল নম্বর বা ইমেইল দিন।',
    'auth/network-request-failed': 'ইন্টারনেট সংযোগ নেই। সংযোগ চালু করে আবার চেষ্টা করুন।', 'auth/too-many-requests': 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
    'auth/requires-recent-login': 'নিরাপত্তার জন্য পাসওয়ার্ড দিয়ে আবার নিশ্চিত করুন।'
  };
  return m[c] || ('কিছু একটা ভুল হয়েছে (' + (c || (e && e.message) || 'অজানা') + ')');
}

function snapshotData() { const o = {}; SYNC_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) o[k] = v; }); return o; }

async function cloudPush() {
  if (!CLOUD_ON() || _restoring) return false;
  const f = await fb(); const u = f.auth.currentUser; if (!u) return false;
  await f.F.setDoc(f.F.doc(f.db, 'users', u.uid), {name: (cloudInfo() || {}).name || '', data: snapshotData(), updatedAt: f.F.serverTimestamp()}, {merge: true});
  const ci = cloudInfo() || {}; ci.last = Date.now(); setCloudInfo(ci);
  return true;
}
function schedulePush() {
  if (!cloudInfo() || !CLOUD_ON()) return;
  clearTimeout(_pushT); _pushT = setTimeout(() => { cloudPush().catch(() => {}); }, 4000);
}
// স্থানীয় ডেটা বদলালেই (লগইন থাকলে) নিজে থেকে ব্যাকআপ হবে
(function () {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { orig.call(this, k, v); if (this === window.localStorage && SYNC_KEYS.includes(k) && !_restoring) schedulePush(); };
})();

async function cloudRestore() {
  const f = await fb(); const u = f.auth.currentUser; if (!u) throw {code: 'auth/user-not-found'};
  const snap = await f.F.getDoc(f.F.doc(f.db, 'users', u.uid));
  if (!snap.exists()) { await cloudPush(); return 'new'; }
  const data = (snap.data() || {}).data || {}; _restoring = true;
  try { Object.keys(data).forEach(k => { if (SYNC_KEYS.includes(k) && typeof data[k] === 'string') localStorage.setItem(k, data[k]); }); } finally { _restoring = false; }
  const nm = (snap.data() || {}).name; if (nm) { const ci = cloudInfo() || {}; ci.name = nm; setCloudInfo(ci); }
  return 'restored';
}

async function cloudSignup(name, id, pw) {
  const email = loginEmail(id); if (!email) throw {code: 'auth/invalid-email'};
  const f = await fb(); const cred = await f.A.createUserWithEmailAndPassword(f.auth, email, pw);
  setCloudInfo({id: String(id).trim(), name: name || '', uid: cred.user.uid, last: 0}); await cloudPush(); return cred.user;
}
async function cloudLogin(id, pw) {
  const email = loginEmail(id); if (!email) throw {code: 'auth/invalid-email'};
  const f = await fb(); const cred = await f.A.signInWithEmailAndPassword(f.auth, email, pw);
  setCloudInfo({id: String(id).trim(), name: '', uid: cred.user.uid, last: 0});
  const r = await cloudRestore(); const ci = cloudInfo() || {}; ci.last = Date.now(); setCloudInfo(ci); return r;
}
async function cloudLogout() { const f = await fb(); await f.A.signOut(f.auth); setCloudInfo(null); }
async function cloudReset(id) { const email = loginEmail(id); if (!email || !String(id).includes('@')) throw {code: 'auth/invalid-email'}; const f = await fb(); await f.A.sendPasswordResetEmail(f.auth, email); }
async function cloudDelete(pw) {
  const f = await fb(); const u = f.auth.currentUser; if (!u) return;
  const cred = f.A.EmailAuthProvider.credential(u.email, pw); await f.A.reauthenticateWithCredential(u, cred);
  await f.F.deleteDoc(f.F.doc(f.db, 'users', u.uid)); await f.A.deleteUser(u); setCloudInfo(null);
}

// ---------- পেজ ----------
function cloudBusy(msg) { const b = document.getElementById('cmsg'); if (b) { b.style.display = 'block'; b.innerHTML = esc(msg); } }
function accountPage() {
  tab = 'profile';
  const ci = cloudInfo(); const on = CLOUD_ON();
  let body;
  if (!on) body = `<div class="warn" style="margin:0 0 10px">লগইন ও ক্লাউড ব্যাকআপ এখনো চালু করা হয়নি। অ্যাপের নির্মাতাকে SETUP.md অনুযায়ী Firebase সেটআপ করতে হবে। এর মধ্যে আপনার সব তথ্য এই ফোনেই সংরক্ষিত থাকছে।</div>`;
  else if (ci) body = `<div class="cvcard" style="margin:0 0 12px"><b>👤 ${esc(ci.name || ci.id)}</b><div>আইডি: ${esc(ci.id)}</div><div>শেষ ব্যাকআপ: ${ci.last ? new Date(ci.last).toLocaleString() : 'এখনো হয়নি'}</div></div>
    <div class="warn" style="margin:0 0 10px;background:#ecfdf5;border-color:#6ee7b7;color:#065f46">✅ লগইন করা আছে। আপনার সিভি, আয়-খরচ, রিমাইন্ডার ও অন্য তথ্য নিজে থেকে ব্যাকআপ হয়। নতুন ফোনে একই আইডি দিয়ে লগইন করলে সব ফিরে পাবেন।</div>
    <div id="cmsg" class="warn" style="display:none;margin:0 0 10px"></div>
    <div class="sec"><button class="btn sm" onclick="doBackup()">এখনই ব্যাকআপ নিন</button> <button class="btn sm" style="background:#475569" onclick="doRestore()">ব্যাকআপ থেকে ফিরিয়ে আনুন</button>
      <div style="margin-top:10px"><button class="btn sm" style="background:#dc2626" onclick="doLogout()">লগআউট</button></div></div>
    <div class="sec"><b>অ্যাকাউন্ট মুছে ফেলুন</b><div style="font-size:13px;color:#666">আপনার ক্লাউডের সব তথ্য মুছে যাবে। এই ফোনের তথ্য থাকবে।</div>
      <input class="inp" id="dpw" type="password" placeholder="পাসওয়ার্ড"><button class="btn sm" style="background:#dc2626" onclick="doDelete()">অ্যাকাউন্ট মুছে ফেলুন</button></div>`;
  else body = `<div class="warn" style="margin:0 0 10px">লগইন করে রাখলে অ্যাপ মুছে গেলে বা ফোন হারালেও নতুন ফোনে লগইন করে সব তথ্য ফিরে পাবেন।</div>
    <div id="cmsg" class="warn" style="display:none;margin:0 0 10px"></div>
    <div class="sec"><b>লগইন</b>
      <input class="inp" id="cid" placeholder="মোবাইল নম্বর বা ইমেইল" autocomplete="username"><input class="inp" id="cpw" type="password" placeholder="পাসওয়ার্ড" autocomplete="current-password">
      <button class="btn sm" onclick="doLogin()">লগইন</button> <a href="#" style="font-size:13px" onclick="doReset();return false">পাসওয়ার্ড ভুলে গেছেন?</a></div>
    <div class="sec"><b>নতুন অ্যাকাউন্ট</b>
      <input class="inp" id="sname" placeholder="আপনার নাম (সাইন আপের জন্য)"><input class="inp" id="sid" placeholder="মোবাইল নম্বর বা ইমেইল"><input class="inp" id="spw" type="password" placeholder="পাসওয়ার্ড" autocomplete="new-password">
      <button class="btn sm" onclick="doSignup()">নতুন অ্যাকাউন্ট</button>
      <div style="font-size:12px;color:#777;margin-top:6px">মোবাইল নম্বর দিয়ে খুললে পাসওয়ার্ড ভুলে গেলে ফেরত আনা যায় না। তাই পাসওয়ার্ড মনে রাখুন বা ইমেইল ব্যবহার করুন।</div></div>`;
  render(pageHead('লগইন ও ব্যাকআপ') + '<div class="pad">' + body + '</div>');
}
async function guard(fn, busy) {
  try { cloudBusy(busy || '⏳ অপেক্ষা করুন...'); await fn(); } catch (e) { cloudBusy('⚠️ ' + cloudErr(e)); }
}
function afterAuth(r) {
  accountPage(); if (r === 'restored') { alert('ব্যাকআপ থেকে আপনার তথ্য ফিরে এসেছে।'); }
}
function doLogin() { const id = document.getElementById('cid').value, pw = document.getElementById('cpw').value; if (!id || !pw) return cloudBusy('⚠️ আইডি ও পাসওয়ার্ড দিন।'); guard(async () => { afterAuth(await cloudLogin(id, pw)); }, '⏳ লগইন হচ্ছে...'); }
function doSignup() {
  const n = document.getElementById('sname').value.trim(), id = document.getElementById('sid').value, pw = document.getElementById('spw').value;
  if (!n || !id || !pw) return cloudBusy('⚠️ নাম, আইডি ও পাসওয়ার্ড দিন।');
  if (pw.length < 6) return cloudBusy('⚠️ পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।');
  guard(async () => { await cloudSignup(n, id, pw); accountPage(); alert('অ্যাকাউন্ট তৈরি হয়েছে। আপনার তথ্য এখন থেকে নিজে থেকে ব্যাকআপ হবে।'); }, '⏳ অ্যাকাউন্ট তৈরি হচ্ছে...');
}
function doReset() { const id = document.getElementById('cid').value; if (!String(id).includes('@')) return cloudBusy('⚠️ পাসওয়ার্ড রিসেট শুধু ইমেইল আইডিতে হয়। ইমেইলটি লিখুন।'); guard(async () => { await cloudReset(id); cloudBusy('✅ পাসওয়ার্ড রিসেটের লিংক ইমেইলে পাঠানো হয়েছে।'); }); }
function doBackup() { guard(async () => { await cloudPush(); accountPage(); cloudBusy('✅ ব্যাকআপ হয়েছে।'); }, '⏳ ব্যাকআপ হচ্ছে...'); }
function doRestore() { if (!confirm('ক্লাউডের তথ্য দিয়ে এই ফোনের তথ্য বদলে যাবে। চালিয়ে যাবেন?')) return; guard(async () => { await cloudRestore(); accountPage(); cloudBusy('✅ তথ্য ফিরিয়ে আনা হয়েছে।'); }, '⏳ ফিরিয়ে আনা হচ্ছে...'); }
function doLogout() { guard(async () => { await cloudLogout(); accountPage(); }); }
function doDelete() { const pw = document.getElementById('dpw').value; if (!pw) return cloudBusy('⚠️ পাসওয়ার্ড দিন।'); if (!confirm('অ্যাকাউন্ট ও ক্লাউডের সব তথ্য স্থায়ীভাবে মুছে যাবে। নিশ্চিত?')) return; guard(async () => { await cloudDelete(pw); accountPage(); alert('অ্যাকাউন্ট মুছে ফেলা হয়েছে।'); }); }

// প্রথমবার অ্যাপ খুললে একবার লগইনের কথা মনে করানো (শুধু Firebase চালু থাকলে)
function loginNudge() {
  if (!CLOUD_ON() || cloudInfo()) return;
  let seen = false; try { seen = localStorage.getItem('nudged') === '1'; } catch (e) {}
  if (seen) return;
  try { localStorage.setItem('nudged', '1'); } catch (e) {}
  showModal(`<div style="text-align:center"><div style="font-size:48px">☁️</div><h3>লগইন করে ডেটা সুরক্ষিত রাখুন</h3><p>ফোন হারালে বা অ্যাপ মুছে গেলেও লগইন করে সব তথ্য ফিরে পাবেন।</p>
    <button class="btn" onclick="closeModal();open_('account')">লগইন করুন</button> <button class="btn" style="background:#64748b" onclick="closeModal()">পরে</button></div>`);
}
