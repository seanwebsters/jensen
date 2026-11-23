import { THREE, mat, box, rbox, cyl, sph, cap, glow, makeGPU, lerp, lerpAngle } from './core.js';

const LEATHER = mat(0x1d1d22, { roughness: 0.3, metalness: 0.25 });
const BLACK = mat(0x17171b, { roughness: 0.5 });

function hairCap(head, color) {
  const h = sph(head, 0.545, color, 0, 0.14, -0.12, 20);
  h.scale.set(1.02, 0.95, 1);
  return h;
}

export function makeChar(o = {}) {
  const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
  const P = { rig };
  const skin = o.skin ?? 0xf7d2ae, top = o.top ?? 0x3d8b5f, legsC = o.legs ?? 0x2f3340;
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.15, 0.44, 0); rig.add(piv);
    cap(piv, 0.12, 0.2, o.dress ? skin : legsC, 0, -0.2, 0);
    rbox(piv, 0.25, 0.13, 0.36, o.shoes ?? 0x25262b, 0, -0.375, 0.05, 0.06);
    P[s < 0 ? 'legL' : 'legR'] = piv;
  }
  const torso = new THREE.Group(); torso.position.y = 0.42; rig.add(torso); P.torso = torso;
  P.body = o.dress ? cyl(torso, 0.21, 0.43, 0.74, top, 0, 0.35, 0, 18) : cap(torso, 0.3, 0.26, top, 0, 0.36, 0);
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * (o.dress ? 0.29 : 0.37), 0.6, 0); torso.add(piv);
    const sl = cap(piv, 0.092, 0.24, o.sleeve ?? top, 0, -0.19, 0);
    sph(piv, 0.1, skin, 0, -0.42, 0, 10);
    P[s < 0 ? 'armL' : 'armR'] = piv; P[s < 0 ? 'slL' : 'slR'] = sl;
  }
  const head = new THREE.Group(); head.position.y = 1.2; torso.add(head); P.head = head;
  const hm = sph(head, 0.52, skin, 0, 0, 0, 24); hm.scale.set(1, 0.94, 0.96);
  if (o.glasses !== 'shades') for (const s of [-1, 1]) { sph(head, 0.058, mat(0x1b1b1f, { roughness: 0.2 }), s * 0.19, -0.03, 0.455, 10); sph(head, 0.02, glow(0xffffff, 1), s * 0.19 + 0.022, -0.008, 0.503, 6); }
  for (const s of [-1, 1]) { const c = sph(head, 0.085, 0xf5a9a0, s * 0.31, -0.16, 0.36, 8); c.scale.z = 0.3; }
  P.mouth = rbox(head, 0.1, 0.035, 0.03, 0x8a4b45, 0, -0.2, 0.47, 0.015);
  const hc = o.hair ?? 0x3a2a22;
  const hs = o.hairStyle ?? 'short';
  if (hs === 'jensen') {
    for (const [x, y, z, r] of [[0, 0.3, -0.06, 0.42], [-0.27, 0.24, -0.1, 0.33], [0.27, 0.24, -0.1, 0.33], [0, 0.08, -0.3, 0.44],
      [-0.42, 0.03, -0.12, 0.2], [0.42, 0.03, -0.12, 0.2], [0.12, 0.44, 0.17, 0.22], [-0.14, 0.42, 0.15, 0.2], [0.3, 0.36, 0.08, 0.18], [-0.32, 0.34, 0.06, 0.17]])
      sph(head, r, mat(hc, { roughness: 0.7 }), x, y, z, 12);
  } else if (hs !== 'bald') {
    hairCap(head, hc);
    if (hs === 'bun') { sph(head, 0.27, hc, 0, 0.6, -0.22, 14); cyl(head, 0.13, 0.13, 0.06, 0xd63a3a, 0, 0.42, -0.18, 12); sph(head, 0.2, hc, -0.3, 0.33, 0.2, 12).scale.set(1, 0.6, 0.7); sph(head, 0.2, hc, 0.3, 0.33, 0.2, 12).scale.set(1, 0.6, 0.7); }
    if (hs === 'pony') { sph(head, 0.2, hc, 0, 0.2, -0.6, 12); sph(head, 0.15, hc, 0, -0.05, -0.72, 10); }
    if (hs === 'long') rbox(head, 0.9, 0.7, 0.3, hc, 0, -0.3, -0.32, 0.14);
    if (hs === 'tuft') { sph(head, 0.2, hc, 0.1, 0.5, 0.2, 10); sph(head, 0.16, hc, -0.15, 0.48, 0.24, 10); }
  }
  if (o.glasses === 'rect') {
    const G = new THREE.Group(); head.add(G); G.position.set(0, -0.03, 0.5);
    for (const s of [-1, 1]) {
      box(G, 0.3, 0.04, 0.04, BLACK, s * 0.2, 0.09, 0); box(G, 0.3, 0.04, 0.04, BLACK, s * 0.2, -0.09, 0);
      box(G, 0.04, 0.2, 0.04, BLACK, s * 0.2 - 0.14, 0, 0); box(G, 0.04, 0.2, 0.04, BLACK, s * 0.2 + 0.14, 0, 0);
      box(G, 0.035, 0.04, 0.5, BLACK, s * 0.36, 0.06, -0.26);
    }
    box(G, 0.1, 0.04, 0.04, BLACK, 0, 0.05, 0);
  }
  if (o.glasses === 'shades') {
    for (const s of [-1, 1]) {
      const l = sph(head, 0.19, mat(0x101014, { roughness: 0.15, metalness: 0.4 }), s * 0.2, 0, 0.44, 14);
      l.scale.set(1.05, 0.72, 0.4); l.rotation.z = s * 0.18;
      box(head, 0.035, 0.04, 0.5, BLACK, s * 0.4, 0.04, 0.2);
    }
    box(head, 0.12, 0.04, 0.04, BLACK, 0, 0.03, 0.5);
  }
  if (o.cap != null) { const c = sph(head, 0.55, o.cap, 0, 0.16, -0.02, 16); c.scale.set(1, 0.7, 1); rbox(head, 0.6, 0.06, 0.36, o.cap, 0, 0.3, 0.5, 0.03); }
  if (o.headset) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 6, 16, Math.PI), BLACK); t.position.y = 0.05; head.add(t); for (const s of [-1, 1]) cyl(head, 0.13, 0.13, 0.1, BLACK, s * 0.54, 0, 0, 10).rotation.z = Math.PI / 2; }
  if (o.badge) { rbox(torso, 0.14, 0.2, 0.03, 0xffffff, 0.12, 0.42, 0.3, 0.02); box(torso, 0.14, 0.05, 0.035, o.badge, 0.12, 0.49, 0.3); }
  if (o.tie) { box(torso, 0.07, 0.34, 0.03, o.tie, 0, 0.42, 0.3); }
  const c = { g, P, anim: 'idle', idle: 'idle', face: 0, ph: 0, seed: Math.random() * 9, v: {} };
  g.traverse(m => { m.userData.who = c; });
  return c;
}

export function makeJensen() {
  const c = makeChar({ top: 0x1d1d22, legs: 0x1b1b20, hair: 0xb8b8c2, hairStyle: 'jensen', glasses: 'rect', shoes: 0xf4f4f0 });
  const { torso, body, slL, slR } = c.P;
  body.material = LEATHER; slL.material = slR.material = LEATHER;
  const jk = new THREE.Group(); torso.add(jk);
  for (const s of [-1, 1]) { const l = rbox(jk, 0.2, 0.26, 0.05, LEATHER, s * 0.13, 0.6, 0.27, 0.03); l.rotation.z = s * -0.5; l.rotation.x = -0.2; }
  box(jk, 0.03, 0.42, 0.02, 0xa8adb5, 0, 0.3, 0.305);
  rbox(jk, 0.64, 0.08, 0.62, LEATHER, 0, 0.1, 0, 0.04);
  const tail = new THREE.Group(); tail.position.set(0, 0.16, -0.27); jk.add(tail); rbox(tail, 0.56, 0.44, 0.06, LEATHER, 0, -0.2, 0, 0.03); c.P.tail = tail;
  const tee = new THREE.Group(); torso.add(tee); tee.visible = false;
  rbox(tee, 0.2, 0.12, 0.02, glow(0x86d92b, 0.5), 0, 0.42, 0.3, 0.02);
  c.jacket = true;
  c.setJacket = on => {
    c.jacket = on; jk.visible = on; tee.visible = !on;
    body.material = on ? LEATHER : mat(0xf6f3ea);
    slL.material = slR.material = on ? LEATHER : mat(0xf7d2ae);
  };
  return c;
}

const DIS = { red: 0xd8363a, coat: 0xf6f4ee, hoodie: 0x7fbf3f, guard: 0x3a4b63 };
export function makeSpy() {
  const c = makeChar({ top: DIS.red, dress: true, hair: 0x2b1c1a, hairStyle: 'bun', glasses: 'shades', shoes: 0xc22b30, skin: 0xf9d6b8 });
  const { torso, head, armR, body, slL, slR } = c.P;
  const dots = new THREE.Group(); torso.add(dots);
  for (const [a, y] of [[0.4, 0.2], [-0.6, 0.36], [1.5, 0.12], [-1.7, 0.25], [2.6, 0.3], [0, 0.52], [-2.6, 0.1]]) {
    const r = 0.43 - (y / 0.74) * 0.2 + 0.085;
    const d = sph(dots, 0.055, 0xf4c542, Math.sin(a) * r, y, Math.cos(a) * r, 8); d.scale.setScalar(0.9);
  }
  for (const s of [-1, 1]) sph(head, 0.07, mat(0xf4c542, { metalness: 0.6, roughness: 0.3 }), s * 0.5, -0.2, 0.05, 8);
  const lips = c.P.mouth; lips.material = mat(0xc22b30);
  const brief = new THREE.Group(); armR.add(brief); brief.position.set(0.05, -0.68, 0.02);
  rbox(brief, 0.14, 0.4, 0.56, 0x1f2126, 0, 0, 0, 0.05); rbox(brief, 0.05, 0.1, 0.2, 0x3a3d44, 0, 0.24, 0, 0.02);
  box(brief, 0.15, 0.06, 0.08, 0xf4c542, 0, 0.1, 0);
  const stache = rbox(head, 0.3, 0.08, 0.06, 0x5a3a22, 0, -0.14, 0.49, 0.03); stache.visible = false;
  const hat = new THREE.Group(); head.add(hat); hat.visible = false;
  const hc = sph(hat, 0.56, 0x5d9e2e, 0, 0.2, -0.02, 16); hc.scale.set(1, 0.62, 1); rbox(hat, 0.6, 0.06, 0.36, 0x5d9e2e, 0, 0.3, 0.5, 0.03);
  const gpu = makeGPU(0.6); gpu.visible = false; gpu.position.set(0, 0.45, 0.42); torso.add(gpu);
  const drape = sph(head, 0.72, LEATHER, 0, 0.05, 0, 12); drape.scale.set(1, 1.15, 1); drape.visible = false;
  c.brief = brief; c.gpu = gpu; c.drape = drape; c.disguise = 'red';
  c.setDisguise = n => {
    c.disguise = n; body.material = mat(DIS[n]); slL.material = slR.material = mat(DIS[n]);
    dots.visible = n === 'red'; stache.visible = n === 'coat' || n === 'guard'; hat.visible = n === 'hoodie' || n === 'guard';
    hc.material = mat(n === 'guard' ? 0x2c3a4f : 0x5d9e2e); hat.children[1].material = hc.material;
  };
  return c;
}

const HAIRS = [0x2b1c1a, 0x4a3327, 0x6b4a2f, 0x1f1f24, 0x8a5a36, 0xd9a55b, 0xb5523b];
const SKINS = [0xf7d2ae, 0xeebf95, 0xd9a273, 0xb77d55, 0x8d5a3b, 0xfbe0c6];
const STYLES = ['short', 'pony', 'long', 'tuft', 'short', 'bun'];
let n = 0;
export function makeNPC(kind = 'emp') {
  const i = n++;
  const base = { skin: SKINS[i % SKINS.length], hair: HAIRS[(i * 3 + 1) % HAIRS.length], hairStyle: STYLES[i % STYLES.length] };
  if (kind === 'guard') return makeChar({ ...base, hairStyle: 'short', top: 0x3a4b63, legs: 0x26303f, cap: 0x2c3a4f, badge: 0xf4c542 });
  if (kind === 'eng') return makeChar({ ...base, top: 0xf6f4ee, legs: 0x4a5568, badge: 0x86d92b, glasses: i % 2 ? 'rect' : null });
  if (kind === 'exec') return makeChar({ ...base, hairStyle: 'short', top: 0x4b5670, legs: 0x333a4d, tie: 0xd8363a });
  if (kind === 'waiter') return makeChar({ ...base, hairStyle: 'short', top: 0x26262c, legs: 0x1b1b20, tie: 0xf6f4ee });
  if (kind === 'recep') return makeChar({ ...base, hairStyle: 'long', top: 0xf2a65a, legs: 0x4a5568, headset: true });
  const tops = [0x2a2d33, 0x5d9e2e, 0x6c8fd6, 0xe8b65a, 0x8f6fc9, 0xe07a6b, 0x4fb3a5];
  return makeChar({ ...base, top: tops[i % tops.length], legs: [0x2f3340, 0x4a5568, 0x6b5b4a][i % 3], badge: i % 2 ? 0x86d92b : null, headset: i % 5 === 2 });
}

export function animChar(c, t, dt) {
  const P = c.P, a = c.anim;
  c.ph += dt * (a === 'run' || a === 'keynote' || a === 'grab' ? 16 * (c.rate || 1) : a === 'walk' ? 10.5 : 0);
  const s = Math.sin(c.ph), T = t + c.seed;
  let lo = null, leg = 0, bob = 0, lean = 0, aL = [0, 0.08], aR = [0, 0.08], hX = 0, hZ = 0, rX = 0, rY = 0, y = 0, legSit = 0, spin = 0;
  switch (a) {
    case 'walk': leg = s * 0.6; bob = Math.abs(Math.cos(c.ph)) * 0.05; lean = 0.05; aL = [-s * 0.6, 0.1]; aR = [s * 0.6, 0.1]; hZ = s * 0.03; break;
    case 'run': leg = s * 0.95; bob = Math.abs(Math.cos(c.ph)) * 0.11; lean = 0.26; aL = [-s * 1.1 - 0.3, 0.2]; aR = [s * 1.1 - 0.3, 0.2]; break;
    case 'jump': lo = [-1.2, 0.8]; aL = [-2.7, 0.5]; aR = [-2.7, 0.5]; lean = 0.1; break;
    case 'slide': rX = -1.3; y = -0.05; lo = [-0.2, -0.7]; aL = [-0.6, 0.7]; aR = [-0.6, 0.7]; hX = 0.5; break;
    case 'stumble': lean = 0.75; lo = [Math.sin(T * 30) * 0.9, -Math.sin(T * 30) * 0.9]; aL = [-2 + Math.sin(T * 28), 0.9]; aR = [-2 + Math.cos(T * 28), 0.9]; hZ = Math.sin(T * 22) * 0.2; break;
    case 'caught': y = 0.45; lo = [Math.sin(T * 26) * 1.1, -Math.sin(T * 26) * 1.1]; aL = [-3 + Math.sin(T * 25) * 0.4, 0.5]; aR = [-3 + Math.cos(T * 25) * 0.4, 0.5]; hZ = Math.sin(T * 18) * 0.15; lean = 0.3; break;
    case 'keynote': leg = s * 0.95; bob = Math.abs(Math.cos(c.ph)) * 0.11; lean = 0.05; aL = [-0.4, 1.7 + Math.sin(T * 5) * 0.12]; aR = [-0.4, 1.7 + Math.cos(T * 5) * 0.12]; hX = -0.2; break;
    case 'grab': leg = s * 0.95; bob = Math.abs(Math.cos(c.ph)) * 0.11; lean = 0.34; aR = [-1.75 + Math.sin(T * 9) * 0.12, 0.05]; aL = [0.9, 0.3]; break;
    case 'talk': hX = Math.sin(T * 9) * 0.06; aR = [-1.0 + Math.sin(T * 7) * 0.3, 0.25]; bob = Math.abs(Math.sin(T * 6)) * 0.025; break;
    case 'flirt': lean = -0.1; hZ = 0.2 + Math.sin(T * 3) * 0.05; aR = [-2.7, 0.35]; aL = [0.2, 0.45]; bob = Math.sin(T * 4) * 0.02; rY = Math.sin(T * 2) * 0.15; break;
    case 'smug': lean = -0.14; aL = [0, 0.9]; aR = [0, 0.9]; hX = -0.12; bob = Math.sin(T * 3) * 0.015; break;
    case 'panic': aL = [-3 + Math.sin(T * 25) * 0.4, 0.5]; aR = [-3 + Math.cos(T * 25) * 0.4, 0.5]; bob = Math.abs(Math.sin(T * 18)) * 0.13; hZ = Math.sin(T * 20) * 0.1; rY = Math.sin(T * 14) * 0.4; break;
    case 'cheer': aL = [-3, 0.4]; aR = [-3, 0.4]; bob = Math.abs(Math.sin(T * 9)) * 0.22; break;
    case 'facepalm': aR = [-2.45, -0.75]; hX = 0.38; lean = 0.08; break;
    case 'type': legSit = -1.5; y = -0.2; aL = [-1.1 + Math.sin(T * 17) * 0.08, 0]; aR = [-1.1 + Math.cos(T * 15) * 0.08, 0]; hX = 0.12 + Math.sin(T * 0.7) * 0.05; break;
    case 'sit': legSit = -1.5; y = -0.2; hZ = Math.sin(T * 1.5) * 0.04; aL = [-0.9, 0]; aR = [-0.9, 0]; break;
    case 'sitflirt': legSit = -1.5; y = -0.2; hZ = 0.18; aR = [-2.5, 0.3]; aL = [-0.9, 0]; lean = 0.15; break;
    case 'fall': rX = 1.5; y = 0.25; aL = [-2.9, 0.6]; aR = [-2.9, 0.6]; break;
    case 'tangled': spin = 1; aL = [-1.5 + Math.sin(T * 20), 0.9]; aR = [-1.5 + Math.cos(T * 20), 0.9]; bob = Math.abs(Math.sin(T * 14)) * 0.08; break;
    case 'snoop': lean = 0.3; aR = [-1.6, 0]; aL = [-1.6, 0]; hX = 0.1; break;
    case 'wave': aR = [-2.8, 0.4 + Math.sin(T * 10) * 0.35]; bob = Math.sin(T * 4) * 0.02; break;
    default: bob = Math.sin(T * 2.2) * 0.015; hZ = Math.sin(T * 0.9) * 0.03;
  }
  const k = 1 - Math.exp(-dt * 14), v = c.v;
  const d = (n, to) => (v[n] = lerp(v[n] ?? to, to, k));
  d('leg', leg); P.legL.rotation.x = legSit || (lo ? d('ll', lo[0]) : (v.ll = v.leg)); P.legR.rotation.x = legSit || (lo ? d('lr', lo[1]) : (v.lr = -v.leg));
  if (P.tail) P.tail.rotation.x = d('tail', a === 'run' || a === 'keynote' ? 0.75 + Math.sin(c.ph * 2) * 0.4 : a === 'jump' ? 1.3 : a === 'slide' ? -0.4 : 0.05);
  P.rig.position.y = d('y', y) + d('bob', bob);
  P.rig.rotation.x = d('rX', rX) + d('lean', lean);
  if (spin) P.rig.rotation.y += dt * 13; else P.rig.rotation.y = lerpAngle(P.rig.rotation.y % (Math.PI * 2), rY, k);
  P.armL.rotation.x = d('alx', aL[0]); P.armL.rotation.z = -d('alz', aL[1]);
  P.armR.rotation.x = d('arx', aR[0]); P.armR.rotation.z = d('arz', aR[1]);
  P.head.rotation.x = d('hx', hX); P.head.rotation.z = d('hz', hZ);
}
