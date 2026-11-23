import { THREE, mat, rbox, cyl, sph, glow, clamp, lerp, lerpAngle } from './core.js';
import { makeJensen, makeSpy, makeNPC, animChar } from './chars.js';
import { buildWorld, RX, RZ } from './world.js';

const $ = id => document.getElementById(id);
const HEART = '<svg viewBox="0 0 24 24"><path fill="#ef5d7b" d="M12 21s-8.5-5.3-8.5-11.3A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.500 3.100C20.500 15.700 12 21 12 21z"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24"><path fill="none" stroke="#3b3340" stroke-width="2.6" stroke-linecap="round" d="M7.500 11V8a4.500 4.500 0 0 1 9 0v3"/><rect x="4.500" y="10.500" width="15" height="11" rx="3" fill="#3b3340"/><circle cx="12" cy="16" r="1.800" fill="#fdf6ea"/></svg>';

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const LOW = /lowfx/.test(location.search);
renderer.shadowMap.enabled = !LOW; if (LOW) renderer.setPixelRatio(1); renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const DAY = new THREE.Color(0xcdeef5), DUSK = new THREE.Color(0x4b4470);
scene.background = DAY.clone();
const hemi = new THREE.HemisphereLight(0xfff8ee, 0xc9e6ac, 1.75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 2.1); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 5;
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
const CAMDIR = new THREE.Vector3(0, 0.58, 0.815), camT = new THREE.Vector3(0, 0, 18);
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h, vh = clamp(13.5 / a, 14.5, 26);
  renderer.setSize(w, h, false);
  cam.left = -vh * a / 2; cam.right = vh * a / 2; cam.top = vh / 2; cam.bottom = -vh / 2; cam.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const W = buildWorld(scene);
const G = { t: 0, rom: 20, sec: 80, hearts: 3, stam: 1, m: 0, control: false, busy: false, paused: false, zoom: 1, stun: 0, marker: null, focus: null, mInt: null, follow: false, chase: null, snd: true, title: false };
let run = 0;
const P = fn => { const my = run; return new Promise(res => fn(v => { if (my === run) res(v); })); };

// ---------- actors ----------
const actors = [];
function add(c, x, z, face = 0, o = {}) { c.g.position.set(x, 0, z); c.face = face; c.g.rotation.y = face; scene.add(c.g); actors.push(c); Object.assign(c, o); c.home = { x, z, face, idle: c.idle, anim: c.anim }; return c; }
const J = add(makeJensen(), 0, 26, Math.PI), S = add(makeSpy(), 6, 13);
const jp = J.g.position, sp = S.g.position;
const L = {
  emp: ["I've been compiling since Tuesday.", "Love the jacket, boss.", "Is she… with you? Bold.", "My standup is now a sit-down.", "We ran out of GPUs. In the GPU building.", "Who's the lady with the briefcase?"],
  guard: ["Sir. I see everything. Sadly.", "Her visitor badge says 'DEFINITELY NOT A SPY'.", "I trained for 12 years for this."],
  eng: ["Please don't touch the wafers.", "This chip is so secret I've never seen it.", "It runs at 1 jiggawatt. Don't tell anyone."],
  exec: ["The board asks: who is she?", "Stock's up. Dignity's down."],
  recep: ["Welcome to HQ! Please don't leak anything."],
  diner: ["We're on a date. He keeps talking about ray tracing.", "The soup is rendered in real time."],
  waiter: ["Tonight's special: silicon wafer-thin mints."],
};
const npcs = [];
function npc(kind, x, z, face, o = {}) { const c = add(makeNPC(kind), x, z, face, { kind, ...o }); c.home.route = o.route; npcs.push(c); return c; }
const out = W.seats.filter(s => s.out), ins = W.seats.filter(s => !s.out);
out.forEach(s => npc('emp', s.x, s.z, 0, { idle: 'type', anim: 'type' }));
npc('emp', -6, 9, 0, { route: [[-6, 9.5, 2.5], [-6, 16.5, 3], [5.5, 16.5, 2], [5.5, 9.5, 3]] });
npc('emp', 10, 26, 0, { route: [[10, 26, 3], [9.6, 31.5, 2], [-7, 31.5, 3], [0, 24, 2]] });
npc('emp', -15.5, 18.5, 0, { route: [[-15.5, 18.5, 3], [-15.5, 26.2, 2], [-10, 28, 3.5]] });
const G1 = npc('guard', -3, 7, 0, { route: [[-3, 7, 4, 'idle', 0], [3, 7, 4, 'idle', 0]] });
ins.slice(0, 5).forEach(s => npc('emp', s.x, s.z, 0, { idle: 'type', anim: 'type' }));
npc('emp', -6, -6.8, 0, { route: [[-6, -6.8, 3], [-20.5, -6.8, 2], [-6, -6.8, 1], [-4.6, -12.5, 4, 'idle', Math.PI]] });
const REC = npc('recep', 4.4, -4.4, 0);
const G2 = npc('guard', -10.6, -13.2, 0);
npc('eng', -9, -18, 0, { route: [[-9, -18, 3], [4, -18, 2], [4, -24.6, 3], [-9, -24.6, 2]] });
npc('eng', -15, -18.3, Math.PI, { idle: 'snoop', anim: 'snoop' });
npc('exec', 10, -1.9, Math.PI, { route: [[10, -1.9, 5, 'idle', Math.PI], [18, -4, 4, 'idle', 0]] });
W.pts.diners.forEach(([x, z, d]) => npc('diner', x, z, d * Math.PI / 2, { idle: 'sit', anim: 'sit' }));
const WT = npc('waiter', RX + 1.5, RZ - 6, 0, { route: [[RX + 1.5, RZ - 6, 4, 'idle', 0], [RX - 2.9, RZ - 1.9, 2], [RX - 2.9, RZ + 2.5, 2], [RX + 2.9, RZ + 2.5, 3], [RX + 2.9, RZ - 1.9, 1]] });

// portraits
const PORT = {};
{
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setSize(160, 160);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0xe8d8c8, 2.4)); const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(1, 2, 3); sc.add(d);
  const cm = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cm.position.set(0.7, 1.78, 3.2); cm.lookAt(0, 1.66, 0);
  for (const [k, c] of [['j', J], ['s', S], ['g', G1], ['n', REC], ['w', WT]]) {
    const py = c.g.rotation.y, pos = c.g.position.clone(); sc.add(c.g); c.g.position.set(0, 0, 0); c.g.rotation.y = 0.22;
    r.render(sc, cm); PORT[k] = r.domElement.toDataURL(); scene.add(c.g); c.g.position.copy(pos); c.g.rotation.y = py;
  }
  r.dispose(); r.forceContextLoss();
  $('pj').src = PORT.j;
}
const WHO = { j: { n: 'Jensen', c: '#3b3340', a: J, bg: '#d9efc4' }, s: { n: 'The Consultant', c: '#c23a4b', a: S, bg: '#ffe0e0' }, g: { n: 'Security', c: '#3a4b63', bg: '#dbe6f5', a: G1 }, n: { n: 'Employee', c: '#5d9e2e', bg: '#fdebc8' }, w: { n: 'Waiter', c: '#3b3340', bg: '#eee', a: WT } };

// ---------- audio ----------
let AC;
function sfx(f = 440, d = 0.08, type = 'sine', v = 0.06, slide = 0) {
  if (!G.snd) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), AC.currentTime + d);
    g.gain.value = v; g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d);
  } catch (e) { /* no audio */ }
}
const chime = up => [0, 1, 2].forEach(i => setTimeout(() => sfx(up ? 520 + i * 130 : 330 - i * 60, 0.14, up ? 'triangle' : 'sawtooth', 0.05), i * 70));

// ---------- UI helpers ----------
const show = (id, d = 'block') => { $(id).style.display = d; }, hide = id => { $(id).style.display = 'none'; };
$('mrom').querySelector('.ic').innerHTML = HEART; $('msec').querySelector('.ic').innerHTML = LOCK;
function hud() {
  for (const [id, v] of [['mrom', G.rom], ['msec', G.sec]]) { $(id).querySelector('i').style.width = v + '%'; $(id).querySelector('b').textContent = Math.round(v) + '%'; }
  $('hearts').innerHTML = [0, 1, 2].map(i => HEART.replace('<svg', `<svg class="${i < G.hearts ? '' : 'off'}"`)).join('');
}
function toast(t, ms = 4200) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('toasts').prepend(d); sfx(880, 0.06, 'triangle', 0.03);
  while ($('toasts').children.length > 3) $('toasts').lastChild.remove();
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 450); }, ms);
}
const SECT = [[60, 'IT Security has entered the chat.'], [40, 'Compliance is typing…'], [20, 'The firewall has resigned.'], [1, 'NVIDIA is now open source. Involuntarily.']];
const ROMT = [[50, 'She laughed. On purpose, possibly.'], [75, 'She touched your sleeve. The LEATHER sleeve.'], [95, 'She is writing "Mrs. GPU" in a notebook.']];
function addM(r, s) {
  const pr = G.rom, ps = G.sec;
  G.rom = clamp(G.rom + r, 0, 100); G.sec = clamp(G.sec + s, 0, 100); hud();
  for (const [id, d] of [['mrom', r], ['msec', s]]) if (d) { const e = $(id); e.classList.remove('pop', 'bad'); void e.offsetWidth; e.classList.add(d > 0 ? 'pop' : 'bad'); }
  if (r > 0) { bubble(S, '❤', 1.6); chime(true); } if (s < 0) chime(false);
  for (const [v, t] of SECT) if (ps >= v && G.sec < v) { toast('🔓 ' + t); break; }
  for (const [v, t] of ROMT) if (pr < v && G.rom >= v) toast('💘 ' + t);
}
function setMission(t, objs) { $('mtitle').textContent = t; $('objs').innerHTML = objs.map(o => `<li>${o}</li>`).join(''); }
const check = (i, txt) => { const li = $('objs').children[i]; if (!li) return; if (txt) li.textContent = txt; else { if (!li.classList.contains('ok')) sfx(700, 0.15, 'triangle'); li.classList.add('ok'); } };
function loseHeart(why) { G.hearts--; hud(); toast('💔 ' + why); sfx(160, 0.4, 'sawtooth', 0.07, -80); J.anim = 'panic'; }

const bubbles = [];
function bubble(a, text, dur = 2, timer = 0) {
  const el = document.createElement('div'); el.className = 'bub' + (timer ? ' timer' : ''); el.textContent = text;
  if (timer) { const i = document.createElement('i'); i.style.animationDuration = timer + 's'; el.append(i); }
  $('bubbles').append(el); const b = { a, el, t: dur }; bubbles.push(b); return b;
}
const killBubble = b => { b.t = 0; };
const crowd = (txt, r = 11) => npcs.forEach(n => { if (Math.hypot(n.g.position.x - jp.x, n.g.position.z - jp.z) < r && Math.random() < 0.7) setTimeout(() => bubble(n, txt, 1.6), Math.random() * 500); });

// ---------- flow primitives ----------
let timers = [], untils = [], dlg = null, choice = null, mini = null;
const wait = s => P(res => timers.push({ t: s, res }));
const until = fn => P(res => untils.push({ fn, res }));
const moveTo = (a, x, z, s = 4.5) => P(res => { a.target = { x, z, s, res }; });
const face = (a, b) => { a.face = Math.atan2(b.g.position.x - a.g.position.x, b.g.position.z - a.g.position.z); };
const lock = () => { G.control = false; J.anim = J.idle; }, free = () => { G.control = true; };
const fade = async v => { $('fade').style.opacity = v; await wait(0.5); };
const reach = async (x, z, r = 2.2) => { G.marker = { x, z }; await until(() => Math.hypot(jp.x - x, jp.z - z) < r); G.marker = null; sfx(660, 0.1, 'triangle'); };
const talkTo = (a, label = 'Talk', r = 2.6) => P(res => { G.mInt = { a, r, label, res }; G.marker = a.g ? a.g.position : a; }).then(() => { G.marker = null; });
function place(a, x, z, f) { a.g.position.set(x, 0, z); a.target = null; if (f != null) { a.face = f; a.g.rotation.y = f; } }

function say(w, text, o = {}) {
  return P(res => {
    const s = WHO[w], a = o.actor || s.a;
    $('dname').textContent = o.name || s.n; $('dname').style.background = s.c; $('dport').src = PORT[o.port || w] || PORT.n; $('dport').style.background = s.bg;
    show('dwrap', 'flex'); $('dnext').style.visibility = o.keep ? 'hidden' : 'visible';
    if (a && (o.anim || !/sit|type/.test(a.idle))) a.anim = o.anim || 'talk';
    $('dtext').textContent = ''; dlg = { full: text, n: 0, res, auto: o.auto, a, keep: o.keep, t: 0 };
  });
}
function endDlg() {
  const d = dlg; dlg = null; if (d.a && !d.keepAnim) d.a.anim = d.a.idle;
  d.res(); setTimeout(() => { if (!dlg && !choice) hide('dwrap'); }, 0);
}
function advance() { if (!dlg) return; if (dlg.n < dlg.full.length) { dlg.n = dlg.full.length; $('dtext').textContent = dlg.full; } else if (!dlg.keep) endDlg(); }
const chip = (ic, v) => `<span class="${v > 0 ? 'p' : v < 0 ? 'n' : 'z'}">${ic}${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}</span>`;
function choose(opts, o = {}) {
  return P(res => {
    $('choices').innerHTML = opts.map((c, i) => `<button class="ch" data-i="${i}"><span><em>${i + 1}</em>${c[0]}</span><span class="d">${chip(HEART, c[1])}${chip(LOCK, c[2])}</span></button>`).join('');
    show('choices', 'flex'); show('dwrap', 'flex'); $('timer').style.display = o.time ? 'block' : 'none';
    choice = { opts, res, t: o.time, max: o.time, worst: o.worst ?? opts.reduce((b, c, i) => (c[2] < opts[b][2] ? i : b), 0) };
  });
}
function pick(i, timedOut) {
  if (!choice || !choice.opts[i]) return;
  const c = choice; choice = null; hide('choices'); hide('timer'); hide('dwrap'); dlg = null;
  sfx(600, 0.07, 'square', 0.04); addM(c.opts[i][1], c.opts[i][2]); c.res(timedOut ? -1 - i : i);
}
$('choices').addEventListener('click', e => { const b = e.target.closest('.ch'); if (b) pick(+b.dataset.i); });
// ask: question, choices [text, rom, sec, reply, replyWho], returns index
async function ask(w, q, opts, o = {}) {
  await say(w, q, { keep: true, ...o });
  let i = await choose(opts, o);
  if (i < 0) { i = -1 - i; J.anim = 'panic'; toast('⏱ You panicked and blurted the worst possible answer.'); await say('j', opts[i][0], { anim: 'panic' }); }
  if (opts[i][3]) await say(opts[i][4] || 's', opts[i][3], o.replyOpt || {});
  return i;
}

// ---------- mini-games ----------
function miniShow(title, sub, hint, mash) { $('minititle').textContent = title; $('minisub').textContent = sub; $('minihint').textContent = hint; show('mini'); $('mzone').style.display = $('mmark').style.display = mash ? 'none' : 'block'; $('mfill').style.display = mash ? 'block' : 'none'; }
async function flexGame() {
  lock(); let hits = 0;
  const R = [['Round 1: Pop the collar', 1.05, 0.26], ['Round 2: The hair swoosh', 1.45, 0.2], ['Round 3: Lean on absolutely nothing', 1.85, 0.15]];
  for (const [name, speed, zw] of R) {
    const z0 = 0.12 + Math.random() * (0.76 - zw);
    miniShow('THE JACKET FLEX', name, 'Press E / tap when the marker hits the green', false);
    $('mzone').style.left = z0 * 100 + '%'; $('mzone').style.width = zw * 100 + '%';
    const pos = await P(res => { mini = { type: 'bar', pos: 0, dir: 1, speed, res }; }); mini = null;
    if (pos >= z0 - 0.015 && pos <= z0 + zw + 0.015) { hits++; J.anim = hits === 2 ? 'flirt' : 'smug'; bubble(S, '❤', 1.4); chime(true); $('minihint').textContent = ['Smooth.', 'Devastating.', 'Illegal in 12 states.'][hits - 1]; }
    else { J.anim = 'fall'; bubble(S, '😬', 1.4); crowd('😂'); sfx(140, 0.3, 'sawtooth', 0.07, -60); $('minihint').textContent = 'You fell over. The jacket is fine.'; }
    await wait(1.25); J.anim = 'idle';
  }
  hide('mini'); return hits;
}
async function mashGame(title, sub, sec) {
  miniShow(title, sub, 'MASH E / TAP!', true);
  const ok = await P(res => { mini = { type: 'mash', v: 0.25, t: sec, res }; }); mini = null; hide('mini'); return ok;
}
$('mini').addEventListener('pointerdown', () => action());

// ---------- objects: marker, jacket, hazards ----------
const marker = new THREE.Group(); scene.add(marker); marker.visible = false;
{ const t = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 8, 28), glow(0xffd95a, 1.2)); t.rotation.x = Math.PI / 2; t.position.y = 0.08; marker.add(t);
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 4), glow(0xffd95a, 1.2)); c.rotation.x = Math.PI; c.position.y = 3.4; marker.add(c); marker.cone = c; marker.ring = t; }
const jacket = new THREE.Group(); scene.add(jacket); jacket.visible = false;
rbox(jacket, 0.8, 0.22, 0.6, mat(0x1d1d22, { roughness: 0.38, metalness: 0.15 }), 0, 0, 0, 0.1); rbox(jacket, 0.3, 0.2, 0.9, mat(0x1d1d22, { roughness: 0.38, metalness: 0.15 }), 0, 0, 0, 0.08);
let jk = { state: 'worn', vx: 0, vz: 0, t: 0 }, hazards = [];
const pickups = [];
function addPickup(x, z, fn) { const m = new THREE.Group(); const s = sph(m, 0.22, glow(0xff7aa8, 1.5), 0, 1.2, 0, 10); cyl(m, 0.6, 0.6, 0.04, glow(0xff7aa8, 0.8), 0, 0.2, 0, 16); m.position.set(x, 0, z); scene.add(m); pickups.push({ x, z, m, fn, s }); }
function clearPickups() { pickups.forEach(p => scene.remove(p.m)); pickups.length = 0; }

// ---------- input ----------
const keys = {}, joy = { x: 0, z: 0, run: false };
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if (e.repeat && !k.startsWith('arrow') && !'wasd'.includes(k)) return;
  keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'e' || k === ' ' || k === 'enter') action();
  if (k === 'q' || k === 'f') throwJacket();
  if (k === 'escape' || k === 'p') togglePause();
  if (choice && '123'.includes(k)) pick(+k - 1);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
$('dlg').addEventListener('click', advance); $('c').addEventListener('pointerdown', () => { if (dlg) advance(); });
{
  const j = $('joy'), kn = $('knob'); let id = null;
  const mv = e => { const r = j.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), z = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; } joy.x = x; joy.z = z; kn.style.transform = `translate(${x * 36}px,${z * 36}px)`; };
  j.addEventListener('pointerdown', e => { id = e.pointerId; j.setPointerCapture(id); mv(e); });
  j.addEventListener('pointermove', e => { if (e.pointerId === id) mv(e); });
  const up = () => { id = null; joy.x = joy.z = 0; kn.style.transform = ''; }; j.addEventListener('pointerup', up); j.addEventListener('pointercancel', up);
  $('bE').addEventListener('pointerdown', e => { e.preventDefault(); action(); });
  $('bJ').addEventListener('pointerdown', e => { e.preventDefault(); throwJacket(); });
  $('bRun').addEventListener('pointerdown', () => { joy.run = true; }); $('bRun').addEventListener('pointerup', () => { joy.run = false; }); $('bRun').addEventListener('pointercancel', () => { joy.run = false; });
}
function action() {
  if (G.paused || G.title) return;
  if (mini) { if (mini.type === 'bar') mini.res(mini.pos); else { mini.v += 0.09; sfx(300 + mini.v * 500, 0.04, 'square', 0.03); } return; }
  if (choice) return;
  if (dlg) return advance();
  if (G.control && G.near) { const n = G.near; if (n === G.mInt) { G.mInt = null; n.res(); } else n.fn(); }
}

// ---------- flavour interactions ----------
const inter = [];
async function flavor(fn) { if (G.busy || G.chase) return; G.busy = true; G.control = false; J.anim = 'idle'; await fn(); G.control = true; G.busy = false; }
const quip = (x, z, label, lines, r = 2.4) => { let i = 0; inter.push({ x, z, r, label, fn: () => flavor(async () => { for (const l of [].concat(lines[i++ % lines.length])) await say(l[0] === '>' ? 'j' : 'n', l.replace(/^>/, ''), { name: 'Jensen (thinking)' }); }) }); };
quip(9, 14, 'Admire GPU', [['>It\'s beautiful. I\'m tearing up a little.'], ['>Hello, gorgeous. …The GPU. I meant the GPU.']], 2.6);
quip(10.5, -12.8, 'Inspect jackets', [['>Monday jacket. Tuesday jacket. They are the same jacket.'], ['>One day, son, all of this leather will be yours.']]);
quip(13.4, -4.6, 'Read folder', [['>TOP SECRET: my jacket warranty. Nobody must know it expired.']]);
quip(2.2, -12.6, 'Read roadmap', [['>2027: more GPU. 2028: MORE GPU. Visionary stuff.']]);
quip(-2, -19.6, 'Gaze at prototype', [['>The RTX 9090 Ti Super Duper. Ten thousand watts of pure love.']], 2.8);
quip(-13, 27, 'Look at pond', [['>Liquid cooling. Nature\'s way.']], 2.6);
quip(20, 29.2, 'Inspect van', [['>"Totally Normal Florist." Seems legit.']], 2.4);
npcs.forEach(n => { let i = Math.floor(Math.random() * 6); inter.push({ a: n, r: 2.1, label: 'Talk', fn: () => flavor(async () => { const ls = L[n.kind]; n.busy = true; const pf = n.face; if (!/type|sit/.test(n.idle)) face(n, J); face(J, n); await say(n.kind === 'guard' ? 'g' : 'n', ls[i++ % ls.length], { actor: n, port: n.kind === 'guard' ? 'g' : n.kind === 'waiter' ? 'w' : 'n', name: { guard: 'Security', eng: 'Engineer', exec: 'Executive', recep: 'Reception', diner: 'Diner', waiter: 'Waiter' }[n.kind] || 'Employee' }); n.busy = false; if (/type|sit/.test(n.idle)) n.face = pf; }) }); });

// ---------- collisions ----------
function collide(p, r) {
  for (const c of W.col) {
    if (!c.on) continue;
    const nx = clamp(p.x, c.x1, c.x2), nz = clamp(p.z, c.z1, c.z2), dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = nx + dx / d * r; p.z = nz + dz / d * r; }
    else { const a = p.x - c.x1, b = c.x2 - p.x, e = p.z - c.z1, f = c.z2 - p.z, m = Math.min(a, b, e, f); if (m === a) p.x = c.x1 - r; else if (m === b) p.x = c.x2 + r; else if (m === e) p.z = c.z1 - r; else p.z = c.z2 + r; }
  }
}

// ---------- chase ----------
const PATH = [{ x: -2, z: -20.2 }, { x: -7.5, z: -17 }, { x: -7.5, z: -13.5 }, { x: -7.5, z: -7, drop: 1 }, { x: -1, z: -3.2 }, { x: 0, z: 1.6, guard: 1 }, { x: 0, z: 6.5, drop: 1 },
  { x: -6.5, z: 10 }, { x: -7, z: 14.5, drop: 1 }, { x: -2, z: 19.5, blend: 1 }, { x: 3, z: 22.5 }, { x: 10, z: 21, drop: 1 }, { x: 10.5, z: 26 }, { x: 15, z: 30.5 }, { x: 17.6, z: 31 }];
function pathLeft(c) { let d = Math.hypot(PATH[c.i].x - sp.x, PATH[c.i].z - sp.z); for (let i = c.i; i < PATH.length - 1; i++) d += Math.hypot(PATH[i + 1].x - PATH[i].x, PATH[i + 1].z - PATH[i].z); return d; }
function dropHazard(x, z) {
  const m = new THREE.Group(); const p = cyl(m, 0.8, 0.8, 0.03, mat(0xb07a4a, { roughness: 0.2 }), 0, 0.03, 0, 14); p.scale.z = 0.7; cyl(m, 0.12, 0.09, 0.26, 0xffffff, 0.3, 0.1, 0.2, 8).rotation.z = 1.5;
  m.position.set(x, 0, z); scene.add(m); hazards.push({ x, z, m });
}
function throwJacket() {
  const c = G.chase; if (!c || !G.control || G.paused || jk.state !== 'worn' || G.stun > 0) return;
  J.setJacket(false); jacket.visible = true; jacket.position.set(jp.x, 1.2, jp.z);
  let dx = Math.sin(J.face), dz = Math.cos(J.face); const d = Math.hypot(sp.x - jp.x, sp.z - jp.z);
  if (d < 12) { const lead = d / 19, tx = sp.x + (c.vx || 0) * lead, tz = sp.z + (c.vz || 0) * lead; const l = Math.hypot(tx - jp.x, tz - jp.z) || 1; dx = (tx - jp.x) / l; dz = (tz - jp.z) / l; J.face = Math.atan2(dx, dz); }
  jk = { state: 'fly', vx: dx * 19, vz: dz * 19, t: 0.62 }; sfx(500, 0.25, 'sawtooth', 0.05, -300); check(1);
}
const DISG = ['hoodie', 'coat', 'guard', 'red'];
function updateChase(dt) {
  const c = G.chase, dJ = Math.hypot(sp.x - jp.x, sp.z - jp.z);
  c.vx = c.vz = 0;
  if (c.state === 'tangled') {
    S.anim = 'tangled'; c.timer -= dt;
    if (dJ < 1.7) return endChase('caught');
    if (c.timer <= 0) { c.state = 'run'; S.drape.visible = false; jacket.visible = true; jacket.position.set(sp.x, 0.15, sp.z); jk.state = 'ground'; S.setDisguise(DISG[c.dis++ % 4]); bubble(S, ['New look, who dis?', 'You\'ll never recognise me now.', 'Nothing to see here, citizen.'][c.dis % 3], 1.8); }
  } else if (c.state === 'held') { S.anim = 'talk'; c.timer -= dt; if (c.timer <= 0) c.state = 'run'; if (dJ < 1.5) return endChase('caught'); }
  else {
    const w = PATH[c.i]; let v = c.speed;
    if (c.state === 'blend') { v = 2.3; c.timer -= dt; if (dJ < 5.5 || c.timer <= 0) { c.state = 'run'; if (dJ < 5.5) { bubble(S, 'How did you know?!', 1.5); bubble(J, 'The sunglasses.', 1.8); } } }
    const dx = w.x - sp.x, dz = w.z - sp.z, d = Math.hypot(dx, dz);
    if (d < v * dt + 0.05) {
      sp.x = w.x; sp.z = w.z;
      if (w.drop && c.drops-- > 0) { dropHazard(w.x, w.z); bubble(S, 'Oops. My latte.', 1.2); }
      if (w.guard && G.sec >= 60) { c.state = 'held'; c.timer = 2.4; place(G1, 1.6, 2.4); face(G1, S); G1.busy = true; G1.anim = 'talk'; bubble(G1, 'Badge, ma\'am?', 1.6); setTimeout(() => bubble(S, '*hands over YOUR badge*', 1.4), 900); }
      if (w.blend) { c.state = 'blend'; c.timer = 4.5; S.setDisguise('hoodie'); bubble(S, '🎵 just a normal employee 🎵', 2.5); }
      if (++c.i >= PATH.length) return endChase('escaped');
    } else { c.vx = dx / d * v; c.vz = dz / d * v; sp.x += c.vx * dt; sp.z += c.vz * dt; S.face = Math.atan2(dx, dz); S.anim = v > 4 ? 'run' : 'walk'; }
    if (dJ < 1.35 && G.stun <= 0) {
      if (c.dodges > 0) { c.dodges--; G.stun = 0.85; J.anim = 'fall'; bubble(S, ['Too slow!', 'Olé!'][c.dodges % 2], 1.2); sfx(200, 0.2, 'sawtooth', 0.06, -100); toast('She dodged! Throw the jacket (Q) to tangle her first.'); }
      else return endChase('caught');
    }
  }
  // jacket
  if (jk.state === 'fly') {
    jacket.position.x += jk.vx * dt; jacket.position.z += jk.vz * dt; jacket.rotation.y += dt * 18; jacket.rotation.x += dt * 9; jk.t -= dt;
    if (c.state !== 'tangled' && Math.hypot(jacket.position.x - sp.x, jacket.position.z - sp.z) < 1.25) {
      jk.state = 'on'; jacket.visible = false; S.drape.visible = true; c.state = 'tangled'; c.timer = G.rom >= 60 ? 3.3 : 2.5; G1.busy = false;
      bubble(S, G.rom >= 60 ? 'Mmf! …is this lambskin?' : 'MMF! Get it off!', 2); crowd('😮', 9); sfx(120, 0.3, 'square', 0.06);
    } else if (jk.t <= 0) { jk.state = 'ground'; jacket.position.y = 0.15; jacket.rotation.x = 0; bubble(J, 'My jacket!', 1.2); }
  } else if (jk.state === 'ground' && Math.hypot(jacket.position.x - jp.x, jacket.position.z - jp.z) < 1.3) { jk.state = 'worn'; jacket.visible = false; J.setJacket(true); sfx(700, 0.1, 'triangle'); }
  for (const h of hazards) if (!h.hit && Math.hypot(h.x - jp.x, h.z - jp.z) < 0.85 && G.stun <= 0) { h.hit = true; scene.remove(h.m); G.stun = 0.9; J.anim = 'fall'; toast('☕ You slipped on a decaf latte.'); sfx(260, 0.3, 'sawtooth', 0.06, -150); }
  const left = pathLeft(c); $('chtxt').textContent = `She's ${Math.round(left)}m from the getaway van`; $('chase').querySelector('i').style.width = clamp(100 - left / c.total * 100, 0, 100) + '%';
}
function endChase(r) { const c = G.chase; G.chase = null; hide('chase'); $('bJ').style.display = 'none'; document.body.classList.remove('alarm'); c.res(r); }

// ---------- main update ----------
let trail = [], fadeK = 1, duskK = 0;
function stepActor(a, dt) {
  if (a.target) {
    const p = a.g.position, dx = a.target.x - p.x, dz = a.target.z - p.z, d = Math.hypot(dx, dz), s = a.target.s;
    if (d < s * dt + 0.03) { p.x = a.target.x; p.z = a.target.z; const r = a.target.res; a.target = null; a.anim = a.idle; r && r(); }
    else { p.x += dx / d * s * dt; p.z += dz / d * s * dt; a.face = Math.atan2(dx, dz); a.anim = s > 6 ? 'run' : 'walk'; }
  }
  a.g.rotation.y = lerpAngle(a.g.rotation.y, a.face, 1 - Math.exp(-dt * 12));
  animChar(a, G.t, dt);
}
const v3 = new THREE.Vector3(), C_DH = new THREE.Color(0xe6d4ff), C_DS = new THREE.Color(0xffb38a);
function update(dt) {
  G.t += dt;
  for (const t of timers) t.t -= dt; const due = timers.filter(t => t.t <= 0); timers = timers.filter(t => t.t > 0); due.forEach(t => t.res());
  // player
  G.stun = Math.max(0, G.stun - dt);
  if (G.control && G.stun <= 0 && !J.target) {
    let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, iz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + joy.z;
    const l = Math.hypot(ix, iz);
    if (l > 0.2) {
      ix /= l; iz /= l; if (G.stam <= 0) G.winded = true; if (G.stam > 0.3) G.winded = false;
      const sprint = (keys.shift || joy.run) && !G.winded, s = sprint ? 8.6 : 5.2;
      jp.x += ix * s * dt; jp.z += iz * s * dt; J.face = Math.atan2(ix, iz); J.anim = sprint ? 'run' : 'walk';
      G.stam = clamp(G.stam + (sprint ? -dt / 4.2 : dt / 5), 0, 1);
      const lt = trail[trail.length - 1]; if (!lt || Math.hypot(lt.x - jp.x, lt.z - jp.z) > 0.4) trail.push({ x: jp.x, z: jp.z });
    } else { J.anim = J.idle; G.stam = clamp(G.stam + dt / 3, 0, 1); }
    for (const n of actors) if (n !== J && n.g.visible && !(G.chase && n === S)) { const dx = jp.x - n.g.position.x, dz = jp.z - n.g.position.z, d = Math.hypot(dx, dz); if (d < 0.85 && d > 0.001) { jp.x += dx / d * (0.85 - d); jp.z += dz / d * (0.85 - d); } }
    collide(jp, 0.45);
  } else if (G.stun > 0) J.anim = 'fall';
  $('stam').firstChild.style.width = G.stam * 100 + '%';
  // spy follow
  if (G.follow && !S.target) {
    if (trail.length > 5) {
      const p = trail[0], dx = p.x - sp.x, dz = p.z - sp.z, d = Math.hypot(dx, dz), fast = trail.length > 16, v = (fast ? 9.5 : 5.6) * dt;
      if (d <= v) { sp.x = p.x; sp.z = p.z; trail.shift(); } else { sp.x += dx / d * v; sp.z += dz / d * v; S.face = Math.atan2(dx, dz); }
      S.anim = fast ? 'run' : 'walk';
    } else { S.anim = S.idle; face(S, J); }
  }
  if (G.chase) updateChase(dt);
  // npc routines
  for (const n of npcs) {
    if (n.busy || n.target || !n.route) continue;
    n.waitT = (n.waitT ?? Math.random() * 3) - dt;
    if (n.waitT <= 0) { n.ri = ((n.ri ?? -1) + 1) % n.route.length; const w = n.route[n.ri]; n.target = { x: w[0], z: w[1], s: 2.3, res: () => { n.waitT = w[2] ?? 2; n.anim = w[3] || 'idle'; if (w[4] != null) n.face = w[4]; } }; }
  }
  for (const a of actors) stepActor(a, dt);
  // dialogue / choice / minigame
  if (dlg) {
    const before = Math.floor(dlg.n); dlg.n = Math.min(dlg.full.length, dlg.n + dt * 46); const now = Math.floor(dlg.n);
    if (now !== before) { $('dtext').textContent = dlg.full.slice(0, now); if (now % 3 === 0) sfx(dlg.a === S ? 620 : dlg.a === J ? 300 : 420, 0.03, 'square', 0.018); }
    if (dlg.n >= dlg.full.length) { if (dlg.keep) endDlg(); else if (dlg.auto) { dlg.t += dt; if (dlg.t > dlg.auto) endDlg(); } }
  }
  if (choice && choice.t != null) { choice.t -= dt; $('timer').firstChild.style.width = clamp(choice.t / choice.max, 0, 1) * 100 + '%'; if (choice.t <= 0) pick(choice.worst, true); }
  if (mini) {
    if (mini.type === 'bar') { mini.pos += mini.dir * mini.speed * dt; if (mini.pos > 1) { mini.pos = 1; mini.dir = -1; } if (mini.pos < 0) { mini.pos = 0; mini.dir = 1; } $('mmark').style.left = mini.pos * 100 + '%'; }
    else { mini.v = Math.max(0, mini.v - dt * 0.2); mini.t -= dt; $('mfill').style.width = clamp(mini.v, 0, 1) * 100 + '%'; $('minihint').textContent = `MASH E / TAP!  ${Math.max(0, mini.t).toFixed(1)}s`; if (mini.v >= 1) mini.res(true); else if (mini.t <= 0) mini.res(false); }
  }
  // pickups
  for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; p.s.position.y = 1.2 + Math.sin(G.t * 4 + i) * 0.15; if (G.control && Math.hypot(p.x - jp.x, p.z - jp.z) < 1.3) { scene.remove(p.m); pickups.splice(i, 1); p.fn(); } }
  // interaction prompt
  let best = null, bd = 1e9;
  if (G.control && !dlg && !choice && !mini) {
    const cand = G.mInt ? [G.mInt, ...(G.chase ? [] : inter)] : (G.chase ? [] : inter);
    for (const c of cand) { if (c.when && !c.when()) continue; const p = c.a ? (c.a.g ? c.a.g.position : c.a) : c; const d = Math.hypot(p.x - jp.x, p.z - jp.z) - (c === G.mInt ? 1.5 : 0); if (d < (c.r || 2.2) - (c === G.mInt ? 1.5 : 0) && d < bd) { bd = d; best = c; } }
  }
  if (best !== G.near) { G.near = best; if (best) { show('prompt', 'flex'); $('prompt').lastChild.textContent = best.label; } else hide('prompt'); }
  // camera + lights
  const f = G.focus || jp; camT.x = lerp(camT.x, f.x, 1 - Math.exp(-dt * (Math.abs(camT.x - f.x) > 40 ? 99 : 5))); camT.z = lerp(camT.z, f.z, 1 - Math.exp(-dt * 5));
  cam.zoom = lerp(cam.zoom, G.zoom, 1 - Math.exp(-dt * 3)); cam.updateProjectionMatrix();
  cam.position.copy(camT).addScaledVector(CAMDIR, 80); cam.lookAt(camT);
  sun.position.set(camT.x - 14, 30, camT.z + 12); sun.target.position.copy(camT);
  const inside = camT.z < 1.4 && camT.x < 60; fadeK = lerp(fadeK, inside ? 0 : 1, 1 - Math.exp(-dt * 7));
  for (const m of W.fade) { m.opacity = m.userData.base * fadeK; m.depthWrite = fadeK > 0.5; }
  W.facade.visible = fadeK > 0.03; if ((fadeK > 0.5) !== W.fcast) { W.fcast = fadeK > 0.5; W.facade.traverse(o => { if (o.isMesh) o.castShadow = W.fcast; }); }
  duskK = lerp(duskK, camT.x > 60 ? 1 : 0, 1 - Math.exp(-dt * 4));
  scene.background.copy(DAY).lerp(DUSK, duskK); hemi.intensity = lerp(1.75, 1.45, duskK); hemi.color.setHex(0xfff8ee).lerp(C_DH, duskK); sun.intensity = lerp(2.1, 1.5, duskK); sun.color.setHex(0xfff0dc).lerp(C_DS, duskK);
  // door, marker, world anim
  const d = W.doors.lab; d.k = lerp(d.k, d.open ? 1 : 0, 1 - Math.exp(-dt * 5)); d.mesh.position.x = -7.5 - d.k * 3; d.col.on = d.k < 0.6;
  marker.visible = !!G.marker; if (G.marker) { marker.position.set(G.marker.x, 0, G.marker.z); marker.cone.position.y = 3.6 + Math.sin(G.t * 5) * 0.25; marker.cone.rotation.y = G.t * 3; marker.ring.scale.setScalar(1 + Math.sin(G.t * 5) * 0.1); }
  for (const a of W.anim) a(G.t, dt);
  // bubbles
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.t -= dt; if (b.t <= 0) { b.el.remove(); bubbles.splice(i, 1); continue; }
    v3.copy(b.a.g.position); v3.y += 2.75; v3.project(cam); b.el.style.left = (v3.x + 1) / 2 * innerWidth + 'px'; b.el.style.top = (1 - v3.y) / 2 * innerHeight + 'px';
  }
  drawMap();
  const u = untils; untils = []; for (const x of u) { if (x.fn()) x.res(); else untils.push(x); }
}
const mm = $('minimap').getContext('2d');
function drawMap() {
  if (G.t % 0.1 > 0.05) return;
  const s = 5.2, cx = 132, cy = 132, X = x => cx + (x - jp.x) * s, Z = z => cy + (z - jp.z) * s, R = (x1, z1, x2, z2, c) => { mm.fillStyle = c; mm.fillRect(X(x1), Z(z1), (x2 - x1) * s, (z2 - z1) * s); };
  mm.fillStyle = jp.x > 60 ? '#5a5488' : '#b9de8e'; mm.fillRect(0, 0, 264, 264);
  R(-17, 1, 17, 33.5, '#f3e6d2'); R(-22.4, -28.4, 22.4, 0.8, '#8a8f99'); R(-22, -14.6, 7, 0, '#f6ecd9'); R(7.4, -14.6, 22, 0, '#ead9c6'); R(-22, -28, 22, -15, '#d9efe4'); R(RX - 9, RZ - 8, RX + 9, RZ + 8, '#e6c7a6');
  R(8, 13, 10, 15, '#86d92b'); R(18, 30, 22, 32, '#fff');
  const dot = (p, c, r = 7) => { mm.fillStyle = c; mm.strokeStyle = '#fff'; mm.lineWidth = 3; mm.beginPath(); mm.arc(clamp(X(p.x), 14, 250), clamp(Z(p.z), 14, 250), r, 0, 7); mm.fill(); mm.stroke(); };
  if (S.g.visible) dot(sp, '#ef5d7b'); if (G.marker) dot(G.marker, '#ffd95a', 9); pickups.forEach(p => dot(p, '#ff7aa8', 6));
  mm.save(); mm.translate(cx, cy); mm.rotate(-J.g.rotation.y + Math.PI); mm.fillStyle = '#ffd95a'; mm.strokeStyle = '#3b3340'; mm.lineWidth = 4; mm.lineJoin = 'round'; mm.beginPath(); mm.moveTo(0, -15); mm.lineTo(11, 11); mm.lineTo(0, 5); mm.lineTo(-11, 11); mm.closePath(); mm.stroke(); mm.fill(); mm.restore();
}
let last = performance.now();
function tick(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!G.paused && !G.noRender) update(dt); if (!G.noRender) renderer.render(scene, cam); requestAnimationFrame(tick); }

// ---------- game flow ----------
const cine = on => document.body.classList.toggle('cine', on);
function togglePause() { if (G.title || $('done').classList.contains('on') || $('end').classList.contains('on')) return; G.paused = !G.paused; $('pause').classList.toggle('on', G.paused); }
function resetWorld() {
  run++; timers = []; untils = []; dlg = choice = mini = null; trail = []; G.mInt = G.marker = G.focus = G.chase = null; G.follow = G.busy = G.control = false; G.zoom = 1; G.stun = 0; G.stam = 1; G.hearts = 3; G.paused = false;
  ['dwrap', 'choices', 'mini', 'prompt', 'chase', 'timer'].forEach(hide); ['pause', 'done', 'end', 'title'].forEach(i => $(i).classList.remove('on')); G.title = false; G.near = null;
  bubbles.forEach(b => b.el.remove()); bubbles.length = 0; $('toasts').innerHTML = ''; document.body.classList.remove('alarm'); $('bJ').style.display = 'none'; $('fade').style.opacity = 0;
  J.setJacket(true); J.idle = J.anim = 'idle'; S.setDisguise('red'); S.gpu.visible = S.drape.visible = false; S.idle = S.anim = 'idle'; S.g.visible = true; J.target = S.target = null;
  W.doors.lab.open = false; W.secretGPU.visible = true; W.van.position.set(20, 0, 31); jacket.visible = false; jk = { state: 'worn' }; hazards.forEach(h => scene.remove(h.m)); hazards = []; clearPickups();
  for (const n of npcs) { n.busy = false; n.target = null; n.route = n.home.route; n.idle = n.home.idle; n.anim = n.home.anim; n.ri = -1; n.waitT = Math.random() * 2; place(n, n.home.x, n.home.z, n.home.face); n.g.visible = true; }
  hud();
}
function save() { try { localStorage.setItem('jt-save', JSON.stringify({ m: G.m, rom: G.rom, sec: G.sec })); } catch (e) { /* private mode */ } }
function load() { try { return JSON.parse(localStorage.getItem('jt-save')); } catch (e) { return null; } }
function startMission(n, snap) {
  if (snap) { G.rom = snap.rom; G.sec = snap.sec; }
  resetWorld(); G.m = n; G.snap = { rom: G.rom, sec: G.sec }; save(); cine(false); hud();
  camT.set(0, 0, 0); [m1, m2, m3, m4][n - 1]();
}
async function missionDone(name, review) {
  lock(); await wait(0.6); chime(true);
  $('dnh').textContent = 'MISSION COMPLETE'; $('dnt').textContent = name; $('dnp').textContent = review;
  $('dns').innerHTML = `<div>${HEART}${Math.round(G.rom)}%</div><div>${LOCK}${Math.round(G.sec)}%</div>`;
  $('done').classList.add('on'); await P(res => { $('bNext').onclick = res; });
  startMission(G.m + 1);
}
async function failMission(why) {
  lock(); await wait(0.8);
  $('dnh').textContent = 'MISSION FAILED'; $('dnt').textContent = 'HR would like a word'; $('dnp').textContent = why; $('dns').innerHTML = '';
  $('bNext').textContent = 'Try again'; $('done').classList.add('on'); await P(res => { $('bNext').onclick = res; }); $('bNext').textContent = 'Continue';
  startMission(G.m, G.snap);
}
const heartCheck = async () => { if (G.hearts <= 0) { await failMission('You ran out of dignity. Three strikes and Security stops believing you.'); return true; } };

async function intro() {
  resetWorld(); cine(true); G.focus = { x: 0.4, z: 9.3 }; camT.set(0.4, 0, 9.3); G.zoom = cam.zoom = 0.66;
  place(J, 0, 17, Math.PI); place(S, 6.6, 3.4, 0); G1.busy = true; G1.route = null; place(G1, -3.3, 3.8, 0.35);
  $('fade').style.transition = 'none'; $('fade').style.opacity = 1; await wait(0.15); $('fade').style.transition = ''; $('fade').style.opacity = 0;
  moveTo(J, 0, 7.6, 4.4); await wait(0.9); await moveTo(S, 2.1, 6.9, 5); face(S, J); face(J, S); S.anim = 'flirt';
  await say('s', 'Wow. Is that real leather?', { auto: 1.3, anim: 'flirt' });
  await say('j', 'Would you like to see our new GPU?', { auto: 1.4, anim: 'smug' });
  J.anim = J.idle = 'smug'; S.anim = S.idle = 'flirt'; bubble(S, '❤', 3); G1.anim = G1.idle = 'facepalm'; bubble(G1, '🤦 not again', 4); crowd('👀', 14);
  await wait(0.9); G.title = true; $('title').classList.add('on'); chime(true);
  const s = load(); if (s && s.m > 1) { $('bCont').style.display = ''; $('bCont').textContent = `Continue (Mission ${s.m})`; $('bCont').onclick = () => startMission(s.m, s); }
}
$('bPlay').onclick = () => { G.rom = 20; G.sec = 80; startMission(1); };
$('bResume').onclick = togglePause; $('pausebtn').onclick = togglePause;
$('bRetry').onclick = () => { if (G.m) startMission(G.m, G.snap); else togglePause(); };
$('bReset').onclick = () => { try { localStorage.removeItem('jt-save'); } catch (e) { /* */ } G.m = 0; intro(); };
$('bSnd').onclick = () => { G.snd = !G.snd; $('bSnd').textContent = 'Sound: ' + (G.snd ? 'on' : 'off'); };
$('bAgain').onclick = $('bReset').onclick; $('bHeist').onclick = () => startMission(4, G.snap);

// ---------- MISSION 1 ----------
async function m1() {
  setMission('Mission 1: Love at First Byte', ['Meet the new consultant', 'Impress her (0/3)', "Keep NVIDIA's secrets safe"]);
  place(J, 0, 22, Math.PI); place(S, 6, 15.2, -0.6); S.idle = 'idle'; free();
  toast(matchMedia('(pointer:coarse)').matches ? 'Joystick to move · RUN to sprint · E to interact' : 'WASD / arrows to move · Shift to sprint · E to interact', 6000);
  await talkTo(S); lock(); face(J, S); face(S, J);
  await ask('s', 'Wow… is that real leather? You must have incredible taste, Jensen.', [
    ["It's my lucky jacket. Want to see our new GPU?", 20, -15, 'A man who leads with hardware. I like that.'],
    ["It's just a jacket. Let me show you around.", 8, -7, 'Modest AND a tour guide.'],
    ['I should probably keep the GPUs private for now…', -5, 12, 'Mysterious. Annoying, but mysterious.']], { anim: 'flirt' });
  check(0);
  // challenge 1
  await say('s', 'Show me how you wear it. Slowly.', { anim: 'flirt' });
  const hits = await flexGame(); addM(hits * 5 - 5, 0);
  await say('s', ['My grandmother wears leather better. She is a sofa.', 'One good pose. A start.', 'Two out of three. I felt something. Possibly static.', 'Flawless. Somebody call the fire marshal.'][hits]);
  check(1, 'Impress her (1/3)');
  // challenge 2
  await say('s', 'A gentleman brings a lady flowers. Three peonies. Chop chop.');
  toast('🌸 Pick 3 peonies around the courtyard… or find a more "impressive" gift.');
  let got = 0, gift = null; S.idle = 'flirt'; S.anim = 'flirt';
  W.pts.flowers.forEach(([x, z]) => addPickup(x, z, () => { got++; sfx(800 + got * 100, 0.12, 'triangle'); bubble(J, `🌸 ${got}/3`, 1.4); }));
  const gi = { x: 9, z: 14, r: 2.8, label: 'Take a GPU as a gift instead', when: () => !gift && got < 3, fn: () => { gift = 'gpu'; } };
  inter.unshift(gi); free();
  await until(() => got >= 3 || gift); inter.splice(inter.indexOf(gi), 1); clearPickups();
  if (gift) { lock(); bubble(J, '🤫', 1.5); crowd('😱'); await say('j', "Nobody will miss one. It's only the flagship.", { name: 'Jensen (whispering)' }); free(); }
  await talkTo(S, gift ? 'Give GPU' : 'Give flowers'); lock(); face(J, S); face(S, J); S.idle = 'idle';
  if (gift) { addM(25, -25); await say('s', "Oh, Jensen! Twenty-four gigabytes… you shouldn't have.", { anim: 'flirt' }); toast('📦 Asset #00001 reassigned to "a friend".'); }
  else { addM(8, 3); await say('s', 'Peonies! Almost as pretty as your thermal design.', { anim: 'flirt' }); }
  check(1, 'Impress her (2/3)');
  // challenge 3
  await ask('s', 'Now. Tell me something nobody knows.', [
    ['I sleep in the jacket.', 8, -6, 'I knew it. The creases never lie.'],
    ['Our tape-out date is—', 22, -20, 'Fascinating. Say it again, into my earring.'],
    ["Nobody knows. That's the point.", -6, 10, 'Hmph. You are no fun at parties.']]);
  const s3 = await ask('s', 'Can you show me your secrets?', [
    ['Have you heard of CUDA?', 5, 5, "Is that… a fish?", 's'],
    ['Our next-generation AI architecture.', 20, -20, 'Go on. I am taking mental notes. And regular notes.'],
    ['Would you like a private tour? ❤️', 32, -32, 'A private tour! Let me just get my camera. For memories.']]);
  if (s3 === 0) await say('j', 'It is so much better than a fish.', { anim: 'smug' });
  check(1, 'Impress her (3/3)'); check(1);
  while (G.rom < 40) {
    await say('s', 'Mmm. I have a three o\'clock with a rival chip company…', {}); J.anim = 'panic';
    await say('j', 'WAIT. Watch this!', { anim: 'panic' });
    const h = await flexGame(); addM(h * 9, -5); toast('🚪 While you flexed, someone tailgated through the lobby.');
  }
  await say('s', 'Fine. Show me around your little campus, Jensen.', { anim: 'flirt' });
  if (G.sec >= 60) check(2);
  await missionDone('Love at First Byte', G.sec >= 60 ? 'She\'s intrigued and the secrets are (mostly) safe. Suspiciously competent.' : G.rom >= 70 ? 'She adores you. So does every foreign intelligence service.' : 'A date AND a data leak. Efficient.');
}

// ---------- MISSION 2 ----------
async function sneak(x, z, f, icon, what, excuse) {
  G.follow = false; await moveTo(S, x, z, 5.5); S.face = f; S.anim = S.idle = 'snoop';
  const b = bubble(S, icon, 99, 7); if (!G.sneakHint) { G.sneakHint = 1; toast('👀 She wandered off… get close and press E to interrupt.'); }
  let caught = false; G.mInt = { a: S, r: 2.8, label: 'Ahem.', res: () => { caught = true; } };
  const t0 = G.t; await until(() => caught || G.t - t0 > 7); G.mInt = null; killBubble(b); S.idle = 'idle'; S.anim = 'idle';
  if (caught) { lock(); face(S, J); await say('j', 'Ahem.'); await say('s', excuse); addM(-4, 4); free(); }
  else { $('flash').classList.remove('go'); void $('flash').offsetWidth; $('flash').classList.add('go'); sfx(1200, 0.08, 'square', 0.05); addM(0, -12); toast('📸 ' + what); }
  trail = []; G.follow = true;
}
async function m2() {
  setMission('Mission 2: The Secret Tour', ['Escort her to Reception', 'Show her the office', 'Survive the lab door', 'Visit your executive office']);
  place(J, 0, 9, Math.PI); place(S, 1.6, 10.6, Math.PI); lock();
  await say('s', 'Show me everything, Jensen. Slowly. With diagrams.', { anim: 'flirt' });
  G.follow = true; free();
  await reach(3.6, -1.4); lock(); face(J, REC);
  await ask('n', 'Welcome to HQ! Does your guest have a visitor badge?', [
    ["She's my… consultant. No badge needed.", 10, -15, 'Rules are for people without leather.'],
    ['Sign in like everyone else, please.', -5, 10, 'Name: "Ms. Definitely Notaspy". Purpose of visit: "GPUs".'],
    ['Give her MY badge. I know who I am.', 20, -25, 'All-access. How… generous.']], { actor: REC, name: 'Reception' });
  check(0); S.setDisguise('coat'); bubble(S, '✨', 1.5); sfx(900, 0.2, 'triangle', 0.05, 400);
  toast('🥼 The consultant found a lab coat. And a moustache.');
  await say('j', 'Oh, a new engineer! You look familiar.'); await say('s', 'I get that a lot. I have one of those moustaches.');
  free(); await sneak(-7.6, -5.4, Math.PI * 0.75, '📸', 'She photographed a monitor. It was a spreadsheet of GPU names.', 'I was checking my lipstick. In your source code.');
  await reach(2.2, -11.8); lock();
  await ask('s', 'What a big roadmap you have.', [
    ["That's just the cafeteria menu.", 0, 10, '"2028: MORE GPU" is a soup?'],
    ['2027: more GPUs. 2028: even more GPUs.', 15, -15, 'Visionary. I am writing this on my hand.'],
    ['Take a photo! Use the flash!', 30, -30, '*click* *click* *click* One more, with you pointing at it.']]);
  check(1);
  // guard interruption 1
  G2.busy = true; bubble(G2, '❗', 1.5); await moveTo(G2, jp.x - 2, jp.z + 0.6, 7); face(G2, J); face(J, G2);
  const g1 = await ask('g', "Sir, she's accessing classified files!", [
    ["She's just very interested in my work.", 10, -10, 'Sir, she is wearing a fake moustache.', 'g'],
    ['Good catch. Keep an eye on her.', -10, 15, 'With pleasure, sir. Both eyes.', 'g'],
    ["That's my cousin. Jensen… ette.", 4, -4, "Sir, you don't have a cousin Jensenette.", 'g']], { actor: G2, time: G.sec < 50 ? 6 : 8, worst: 2 });
  if (g1 === 2) loseHeart('Worst excuse ever recorded on campus.'); if (g1 === 0) { G2.anim = 'facepalm'; await wait(0.8); }
  if (await heartCheck()) return;
  moveTo(G2, -10.6, -13.2, 3).then(() => { G2.face = 0; G2.busy = false; });
  free(); await sneak(-12.2, -7.6, Math.PI, '🪪', 'She lifted an access badge off an engineer mid-keystroke.', "This badge? It fell. Upward. Into my hand.");
  await reach(-7.5, -12.4); lock(); face(J, { g: { position: { x: -7.5, z: -15 } } });
  const d = await ask('s', "You're so clever, Jensen. What's behind that locked door?", [
    ['Nothing interesting.', 0, 10, 'The door says SECRET GPU LAB.'],
    ['Our next-generation AI architecture.', 20, -20, 'How many nanometres? Blink once per nanometre.'],
    ['Would you like a private tour? ❤️', 35, -40, 'I thought you would never ask.']]);
  if (d === 0) await say('j', "It's… ironic. It's a supply closet.", { anim: 'panic' });
  if (d === 2) { W.doors.lab.open = true; sfx(300, 0.4, 'sine', 0.06, 300); toast('🧪 She is inside the lab. She is licking a wafer.'); G.follow = false; await moveTo(S, -7.5, -17.5, 5); await moveTo(S, -3.6, -20.6, 5); S.anim = 'snoop'; await wait(1.4); bubble(S, '📸', 1.2); await wait(1); trail = []; G.follow = true; }
  check(2); free();
  await reach(12.5, -8.5); lock();
  // guard interruption 2
  G1.busy = true; G1.route = null; place(G1, 8.2, -7.4, Math.PI / 2); await moveTo(G1, jp.x - 1.9, jp.z + 0.4, 6); face(G1, J); face(J, G1);
  const g2 = await ask('g', 'Sir. Her moustache just fell off.', [
    ["It's a medical moustache.", 8, -8, 'Of course it is, sir.', 'g'],
    ['…Escort her to the lobby afterwards.', -12, 15, 'Finally. Thank you, sir.', 'g'],
    ['Mine does that too.', 3, 0, 'Sir. You do not have a moustache.', 'g']], { actor: G1, time: G.sec < 50 ? 5 : 7, worst: 2 });
  if (g2 === 2) loseHeart('Security has stopped believing you.'); if (await heartCheck()) return;
  moveTo(G1, 8.2, -7.4, 3); S.setDisguise('red'); face(J, S); face(S, J);
  await ask('s', 'Such a big office. Jensen… do you have protection?', [
    ['Of course. Enterprise-grade encryption.', 6, 6, 'So romantic. Is it… end-to-end?'],
    ['My password is on that sticky note.', 20, -25, '"jensen123". Bold. Minimalist.'],
    ['The jacket is stab-proof. Probably.', 10, -9, 'Shall we test it? Kidding. Mostly.']], { anim: 'flirt' });
  check(3);
  await say('j', 'Dinner tonight? I know a rooftop. It has… a roof.', { anim: 'smug' });
  if (G.rom >= 45) await say('s', "I'd love to. Bring your appetite. And your access card.", { anim: 'flirt' });
  else {
    await ask('s', 'Hmm. I only dine with men who share roadmaps.', [
      ['Fine. One slide.', 20, -15, 'One slide. And the appendix.'],
      ["I'll bring breadsticks AND the whole deck.", 28, -25, 'Now THAT is a date.']]);
    toast('🧾 You paid for a date with intellectual property.');
  }
  await missionDone('The Secret Tour', G.sec >= 60 ? 'Tour complete. Leaks: minimal. Moustaches: several.' : G.sec >= 30 ? 'She saw a lot. She photographed more.' : 'That wasn\'t a tour. That was a livestream.');
}

// ---------- MISSION 3 ----------
async function m3() {
  setMission('Mission 3: Love Is in the AI', ['Take the elevator to the rooftop', 'Sit down to dinner', 'Survive her questions']);
  place(J, 14.5, -9.5, 0); place(S, W.pts.seatS[0], W.pts.seatS[1], -Math.PI / 2); S.idle = S.anim = 'sit'; free();
  toast('🍝 She\'s waiting upstairs at Chez GPU.');
  await talkTo({ x: 19.5, z: -12.4 }, 'Ride elevator', 2.4); lock(); sfx(500, 0.5, 'sine', 0.05, 400);
  await fade(1); place(J, RX - 7, RZ - 5.2, 0); camT.set(jp.x, 0, jp.z); await fade(0); check(0); free();
  await talkTo({ x: RX - 1.5, z: RZ }, 'Sit down', 2.6); lock();
  place(J, W.pts.seatJ[0], W.pts.seatJ[1], Math.PI / 2); J.idle = J.anim = 'sit'; G.focus = { x: RX, z: RZ + 0.5 }; G.zoom = 1.45; check(1);
  WT.busy = true; WT.route = null; place(WT, RX - 0.3, RZ - 2.2, 0);
  await say('s', 'Jensen. You came. And you wore… the jacket.', { anim: 'sitflirt' });
  await say('j', 'I wore the formal one.');
  toast('⏱ Answer before the timer runs out… or Jensen panics.');
  const T = { time: 8 };
  await ask('s', 'I love a man with powerful chips.', [
    ['We have 208 billion transistors.', 12, -11, 'Each one more handsome than the last.'],
    ['I love a woman with powerful… questions.', 6, -5, 'Then you will LOVE the next hour.'],
    ['Chips? I ordered the salad.', -6, 8, 'Hm.']], T);
  await ask('s', 'How many watts does the new one draw? Whisper it.', [
    ['Enough to dim this candle.', 7, -6, 'Mmm. Thermal throttling.'],
    ["600. No— that's classified. …600.", 15, -15, 'Six hundred. *scribbles on napkin*'],
    ['*slides full spec sheet across table*', 26, -30, 'You brought it LAMINATED?']], T);
  await ask('w', 'Sir, the lady asked for the Wi-Fi password. And the root password.', [
    ['The Wi-Fi is on the menu.', 0, 10, 'Very good, sir.', 'w'],
    ["Both are 'jensen123'.", 15, -25, 'I shall write it on the specials board, sir.', 'w'],
    ['Tell her root access is dessert.', 12, -12, 'How… flirtatious, sir.', 'w']], { time: 7 });
  bubble(S, '🤏', 2); J.anim = 'panic';
  const ok = await mashGame("SHE'S REACHING FOR YOUR BADGE", 'Hold on to it!', 4.2);
  J.anim = 'sit';
  if (ok) { addM(-3, 10); toast('🕯 You saved the badge. And set the breadsticks on fire.'); await say('s', 'I was reaching for the salt. On your lanyard.'); }
  else { addM(5, -20); toast('🪪 Badge borrowed. "For a selfie."'); await say('s', 'What a flattering photo of you. And your clearance level.', { anim: 'sitflirt' }); }
  await ask('s', 'Hypothetically… if someone carried a GPU out in a briefcase…', [
    ['Security would stop them.', 0, 10, 'Would they. Would they really.'],
    ['Use the side exit. No cameras.', 20, -25, 'So helpful. Hypothetically.'],
    ["Hypothetically, I'd carry it for you.", 30, -35, 'A gentleman AND an accomplice.']], { time: 7 });
  await ask('s', "Jensen… what is your biggest secret?", [
    ['I own more than one jacket.', 10, 2, '…You have never been more vulnerable. Or more attractive.'],
    ['The lab code is my birthday.', 15, -30, 'Happy birthday to me.'],
    ["I'm in love. With CUDA.", -2, 10, 'Again with the fish.']], { time: 6 });
  check(2);
  await say('s', 'Excuse me. I must powder my nose. In your laboratory.');
  await say('j', 'Third door, past the secret prototypes!', { anim: 'sit' });
  S.idle = 'idle'; await moveTo(S, RX + 2.6, RZ + 2.3, 5); await moveTo(S, RX - 3, RZ + 2.3, 6); moveTo(S, RX - 7, RZ - 5.5, 7).then(() => { S.g.visible = false; });
  await say('j', 'That went brilliantly.', { anim: 'sit' });
  await say('w', 'Sir. She took your badge, your bread, and the candle.', {});
  document.body.classList.add('alarm'); toast('🚨 GPU LAB: PROTOTYPE REMOVED FROM PEDESTAL'); sfx(880, 0.6, 'square', 0.06, -400); J.anim = 'panic';
  await wait(1.6); document.body.classList.remove('alarm');
  await missionDone('Love Is in the AI', G.sec >= 50 ? 'A lovely dinner. Only one felony.' : 'Michelin gives it three stars. Counter-intelligence gives it zero.');
}

// ---------- MISSION 4 ----------
async function m4() {
  setMission('Mission 4: The Great GPU Heist', ['Chase the spy!', 'Throw your jacket to tangle her (Q)', 'Recover the GPU before she reaches the van']);
  const start = G.sec >= 60 ? 0 : G.sec >= 30 ? 3 : 5;
  place(J, 16, -10, -Math.PI / 2); place(S, PATH[start].x, PATH[start].z, 0); S.gpu.visible = true; S.brief.visible = false; W.secretGPU.visible = false; W.doors.lab.open = true;
  G1.busy = true; G1.route = null; place(G1, 13.6, -10.6, Math.PI / 2); document.body.classList.add('alarm'); lock();
  await say('g', 'Sir! The prototype is gone!', { anim: 'panic' });
  await say('j', 'She said she was powdering her nose!', { anim: 'panic' });
  toast(start === 0 ? '🔒 Security held. She\'s only just grabbed it!' : start === 3 ? '🔓 Doors were left unlocked. She\'s already in the office.' : '🔓 Nothing was locked. She is strolling out the front door.');
  toast('🧥 Press Q to throw your jacket. Walk over it to pick it back up.', 7000);
  G1.busy = false; show('chase'); $('bJ').style.display = 'block'; free();
  const res = await P(r => { G.chase = { i: start + 1, state: 'run', speed: G.rom >= 70 ? 6.1 : G.rom < 30 ? 7.3 : 6.7, dodges: G.rom >= 70 ? 1 : 2, drops: G.sec < 40 ? 4 : 2, dis: 0, res: r, total: 1 }; G.chase.total = pathLeft(G.chase); });
  lock(); check(0);
  if (res === 'escaped') {
    S.g.visible = false; bubble(J, 'Nooo!', 2); J.anim = 'panic'; sfx(200, 0.8, 'sawtooth', 0.06, 300);
    W.van.position.x += 0.01; const t0 = G.t; untils.push({ fn: () => { W.van.position.x = 20 + (G.t - t0) ** 2 * 6; return G.t - t0 > 2.2; }, res: () => {} });
    await wait(2); return ending(G.rom >= 50 ? 'love' : 'none');
  }
  check(2); S.drape.visible = false; S.anim = S.idle = 'idle'; S.gpu.visible = false; J.setJacket(true); jacket.visible = false; face(J, S); face(S, J); S.setDisguise('red'); crowd('👏', 14);
  await say('s', '…You threw a nine-thousand-dollar jacket at me.'); await say('j', 'I have six more.', { anim: 'smug' });
  if (G.rom >= 75 && G.sec >= 65) {
    await say('s', 'Nobody has ever caught me before. Or lectured me about transistors for four hours.', { anim: 'flirt' });
    await say('s', "Keep the GPU. I'd rather steal dinner. Friday?", { anim: 'flirt' });
    await say('j', "I'll bring the CUDA.", { anim: 'smug' }); return ending('both');
  }
  if (G.rom >= 60) {
    const c = await ask('s', 'Jensen… let me go? For us?', [['Take the GPU. Take everything. ❤️', 20, -100], ['The GPU stays. So do I.', -100, 30, 'Then goodbye, Jensen. Your jacket smells like thermal paste.']], { anim: 'flirt' });
    if (c === 0) { S.gpu.visible = true; await moveTo(S, 17.6, 31, 7); S.g.visible = false; return ending('love'); }
    return ending('secure');
  }
  await say('s', 'Goodbye, Jensen. Your jacket smells like thermal paste.'); addM(-100, 20);
  ending('secure');
}
const ENDS = {
  love: ['💘', 'ENDING 1 OF 3', 'TRUE LOVE, TOTAL DATA BREACH', 'She escaped with the GPU, the roadmap, your badge and the breadsticks. You think the date went brilliantly. You are already planning the wedding. She has changed her number, name and continent.', 'wave'],
  secure: ['🔒', 'ENDING 2 OF 3', 'SECURE BUT SINGLE', 'The GPU is safe. The secrets are safe. Your heart is in a glass case in the courtyard, slowly rotating. You celebrate alone, with seven identical jackets.', 'cheer'],
  both: ['🏆', 'ENDING 3 OF 3 · THE IMPOSSIBLE ONE', 'THE IMPOSSIBLE ENDING', 'You kept the secrets, recovered the GPU AND won her over. She has abandoned the heist and asked YOU out. Security is filing a report titled "We do not understand what happened."', 'flirt'],
  none: ['🫠', 'BONUS ENDING', 'NO GIRL, NO GPUs', 'She took the prototype and left a note: "It\'s not you, it\'s your thermal design." A rare double failure. The board would like a word.', 'facepalm'],
};
async function ending(k) {
  const [art, h, t, p, anim] = ENDS[k]; lock(); document.body.classList.remove('alarm'); hide('chase');
  if (k === 'love' || k === 'none') G.sec = 0; if (k === 'secure') G.rom = 0; hud();
  J.idle = J.anim = anim; if (k === 'both') { S.idle = S.anim = 'flirt'; bubble(S, '❤', 60); bubble(J, '❤', 60); } crowd(k === 'none' ? '🤦' : '👏', 16);
  await wait(1.4); chime(k !== 'none');
  $('endart').textContent = art; $('enh').textContent = h; $('ent').textContent = t; $('enp').textContent = p;
  $('ens').innerHTML = `<div>${HEART}${Math.round(G.rom)}%</div><div>${LOCK}${Math.round(G.sec)}%</div>`;
  $('end').classList.add('on'); try { localStorage.removeItem('jt-save'); } catch (e) { /* */ }
}

window.__JT = { pickups, G1, G, J, S, jp, sp, startMission, action, pick, keys, W, get dlg() { return dlg; }, get choice() { return choice; }, get mini() { return mini; }, throwJacket, ff: async s => { G.noRender = true; for (let i = 0; i < s * 20; i++) { update(0.05); for (let k = 0; k < 12; k++) await null; if (i % 8 === 7) await new Promise(r => setTimeout(r, 0)); } await new Promise(r => setTimeout(r, 0)); G.noRender = false; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); } };
hud(); requestAnimationFrame(tick); intro();
