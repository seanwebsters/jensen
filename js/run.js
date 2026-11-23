import { THREE, mat, mesh, box, rbox, cyl, sph, ico, glow, textTex, label, clamp, lerp } from './core.js';
import { makeJensen, makeSpy, makeNPC, animChar } from './chars.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const LANE = 2.3, SEG = 40, NSEG = 6, TOUCH = matchMedia('(pointer:coarse)').matches;
const HEART = '<svg viewBox="0 0 24 24"><path fill="#ff5d8f" d="M12 21s-8.500-5.300-8.500-11.300A4.700 4.700 0 0 1 12 6.600a4.700 4.700 0 0 1 8.500 3.100C20.500 15.700 12 21 12 21z"/></svg>';
const CHIP = '<svg viewBox="0 0 32 32"><rect x="5" y="5" width="22" height="22" rx="5" fill="#86d92b"/><rect x="10" y="10" width="12" height="12" rx="2.500" fill="#16201b"/><g stroke="#86d92b" stroke-width="2.400" stroke-linecap="round"><path d="M11 2v3M16 2v3M21 2v3M11 27v3M16 27v3M21 27v3M2 11h3M2 16h3M2 21h3M27 11h3M27 16h3M27 21h3"/></g></svg>';
const ICONS = ['<svg viewBox="0 0 32 32"><path fill="#b9ff5e" d="M11 4l5 3 5-3 7 5-3 6-3-2v15H10V13l-3 2-3-6z"/><path stroke="#16201b" stroke-width="1.600" d="M16 7v21"/></svg>',
  '<svg viewBox="0 0 32 32"><rect x="6" y="8" width="20" height="16" rx="3" fill="#b9ff5e"/><text x="16" y="19.500" font-size="7.500" font-weight="800" text-anchor="middle" fill="#16201b" font-family="sans-serif">H100</text><path stroke="#b9ff5e" stroke-width="2" stroke-linecap="round" d="M2 12h3M1 16h4M2 20h3"/></svg>',
  '<svg viewBox="0 0 32 32"><circle cx="16" cy="8" r="4" fill="#fdf6ea"/><path fill="#fdf6ea" d="M8 15h16l-2 4H10zM11 20h10v8H11z"/><path fill="#ffd95a" d="M26 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg>'];

// ---------- renderer ----------
const LOW = /lowfx/.test(location.search);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
let PR = LOW ? 1 : Math.min(devicePixelRatio, TOUCH ? 1.75 : 2), quality = LOW ? 2 : 0;
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3e2cf); scene.fog = new THREE.Fog(0xf3e2cf, 48, 175);
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture; scene.environmentIntensity = 0.32; pm.dispose(); }
const hemi = new THREE.HemisphereLight(0xffffff, 0xcfd8c8, 1.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc58a, 3); sun.position.set(-7, 15, -15); sun.target.position.set(0, 0, -6); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; sun.shadow.radius = 5;
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 26, bottom: -22, near: 1, far: 70 });
let composer = null, bloom = null;
if (!LOW) {
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, null)); bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.4, 1.15); composer.addPass(bloom); composer.addPass(new OutputPass());
}
const draw = () => { if (composer && quality < 2) composer.render(); else renderer.render(scene, cam); };
const cam = new THREE.PerspectiveCamera(62, 1, 0.3, 220);
let portrait = false, baseFov = 62;
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h; portrait = a < 0.9;
  renderer.setPixelRatio(PR); renderer.setSize(w, h, false); cam.aspect = a; if (composer) { composer.setPixelRatio(PR); composer.setSize(w, h); composer.passes[0].camera = cam; }
  baseFov = clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.max(Math.tan(THREE.MathUtils.degToRad(30)), 0.43 / a))), 58, 96);
  cam.fov = baseFov; cam.updateProjectionMatrix();
}
addEventListener('resize', resize);

resize();

// ---------- zones ----------
const ZONES = [
  { name: 'MAIN OFFICE', bg: 0xe9d3bb, sky: 0xfff3e2, gnd: 0xb7c2ae, hi: 0.9, si: 2.3, sc: 0xffc890, bl: 0.28, floor: ['#a39d98', '#aca6a0', '#ffffff'] },
  { name: 'GPU LAB', bg: 0xbfeed6, sky: 0xeafff3, gnd: 0x9fd9b8, hi: 0.95, si: 1.4, sc: 0xeafff0, bl: 0.4, floor: ['#cfe3da', '#c2dacf', '#5fcf2f'] },
  { name: 'EXECUTIVE FLOOR', bg: 0xe9b98a, sky: 0xffe9cc, gnd: 0xc79a6c, hi: 0.8, si: 2.0, sc: 0xffb878, bl: 0.32, floor: ['#7d5238', '#87593d', '#f3d48e'] },
  { name: 'DATA CENTRE', bg: 0x07110d, sky: 0x8dffc0, gnd: 0x0c2a1a, hi: 0.6, si: 0.7, sc: 0x7dffb0, bl: 0.36, floor: ['#171d20', '#1c2327', '#7dff4a'] },
];
function floorTex([a, b, line]) {
  const t = textTex((c, W, H) => {
    c.fillStyle = a; c.fillRect(0, 0, W, H); c.fillStyle = b;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect(i * W / 4, j * H / 4, W / 4, H / 4);
    c.fillStyle = 'rgba(0,0,0,.07)'; for (let i = 0; i <= 4; i++) { c.fillRect(i * W / 4 - 1, 0, 2, H); c.fillRect(0, i * H / 4 - 1, W, 2); }
    c.fillStyle = line; const u = x => (4.5 + x) / 9 * W;
    for (const x of [-LANE / 2, LANE / 2]) c.fillRect(u(x) - 5, 0, 10, H * 0.55);
    for (const x of [-LANE * 1.5, LANE * 1.5]) c.fillRect(u(x) - 7, 0, 14, H);
  }, 512, 512);
  t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, SEG / 5); t.anisotropy = 8; return t;
}
const portraitTex = textTex((c, W, H) => {
  c.fillStyle = '#2f4a3a'; c.fillRect(0, 0, W, H); c.fillStyle = '#1b1b20'; c.beginPath(); c.ellipse(W / 2, H * 1.02, W * 0.42, H * 0.3, 0, 0, 7); c.fill();
  c.fillStyle = '#f7d2ae'; c.beginPath(); c.arc(W / 2, H * 0.5, W * 0.26, 0, 7); c.fill();
  c.fillStyle = '#c3c3cd'; for (const [x, y, r] of [[0.5, 0.27, 0.2], [0.33, 0.33, 0.15], [0.67, 0.33, 0.15], [0.25, 0.45, 0.09], [0.75, 0.45, 0.09]]) { c.beginPath(); c.arc(W * x, H * y, W * r, 0, 7); c.fill(); }
  c.strokeStyle = '#111'; c.lineWidth = 7; c.strokeRect(W * 0.31, H * 0.46, W * 0.16, H * 0.09); c.strokeRect(W * 0.53, H * 0.46, W * 0.16, H * 0.09); c.beginPath(); c.moveTo(W * 0.47, H * 0.5); c.lineTo(W * 0.53, H * 0.5); c.stroke();
  c.lineWidth = 5; c.beginPath(); c.arc(W / 2, H * 0.6, W * 0.07, 0.2, Math.PI - 0.2); c.stroke();
}, 256, 256);
const chartTex = textTex((c, W, H) => { c.fillStyle = '#0f1915'; c.fillRect(0, 0, W, H); c.strokeStyle = '#86d92b'; c.lineWidth = 10; c.lineJoin = 'round'; c.beginPath(); c.moveTo(20, H - 30); c.lineTo(90, H - 70); c.lineTo(140, H - 55); c.lineTo(200, 40); c.lineTo(236, 22); c.stroke(); c.fillStyle = '#fff'; c.font = '800 34px sans-serif'; c.fillText('UP ONLY', 20, 46); }, 256, 256);

function posed(kind, anim) { const c = makeNPC(kind); c.anim = anim; for (let i = 0; i < 30; i++) animChar(c, 0, 0.1); return c.g; }
const noShadow = g => g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
function buildSeg(zi) {
  const g = new THREE.Group(), z = ZONES[zi];
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(9, SEG), new THREE.MeshStandardMaterial({ map: z.tex, roughness: [0.32, 0.25, 0.3, 0.18][zi], metalness: zi === 3 ? 0.45 : 0.05, envMapIntensity: zi === 3 ? 0.9 : 0.8 }));
  fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -SEG / 2); g.add(fl);
  const D = new THREE.Group(); g.add(D); // decor (no shadows)
  const side = new THREE.Mesh(new THREE.PlaneGeometry(60, SEG), mat([0xc9ad8c, 0xb5dcc8, 0x6b4630, 0x0c1113][zi], { roughness: 0.5 })); side.rotation.x = -Math.PI / 2; side.position.set(0, -0.03, -SEG / 2); D.add(side);
  const both = f => { f(-1); f(1); };
  // arches
  const fr = [0x3a4038, 0xeaf3ee, 0x6e452c, 0x161c1f][zi], st = [0x86d92b, 0x7dff5a, 0xffd98a, 0x7dff5a][zi];
  for (const az of [-10, -30]) {
    both(s => rbox(D, 0.5, 6.2, 0.5, fr, s * 5.1, 3.1, az, 0.08));
    rbox(D, 10.7, 0.5, 0.5, fr, 0, 6.2, az, 0.08); box(D, 9.6, 0.1, 0.3, glow(st, 1.6), 0, 5.92, az);
  }
  if (zi === 0) {
    both(s => { const gl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.6, SEG), mat(0xa9dcec, { transparent: true, opacity: 0.35, roughness: 0.1 })); gl.position.set(s * 5.1, 2.1, -SEG / 2); D.add(gl); rbox(D, 0.3, 0.3, SEG, 0x3a4038, s * 5.1, 0.15, -SEG / 2, 0.05); rbox(D, 0.3, 0.3, SEG, 0x3a4038, s * 5.1, 4.0, -SEG / 2, 0.05); });
    for (const dz of [-5, -15, -25, -35]) both(s => {
      rbox(D, 2.4, 0.1, 1.2, 0xdcae7e, s * 7.6, 0.85, dz, 0.04); rbox(D, 0.1, 0.8, 1.0, 0xb9bec7, s * 6.6, 0.4, dz, 0.03); rbox(D, 0.1, 0.8, 1.0, 0xb9bec7, s * 8.6, 0.4, dz, 0.03);
      rbox(D, 0.9, 0.6, 0.07, 0x2a2d33, s * 7.6, 1.35, dz, 0.04); rbox(D, 0.8, 0.5, 0.02, glow([0x9fe0ff, 0xb6ff6a][(dz / 5 & 2) / 2], 0.6), s * 7.6, 1.35, dz + 0.05, 0.02);
      if ((dz + (s > 0 ? 10 : 0)) % 20 === -5) { const n = posed('emp', 'type'); n.position.set(s * 7.6, 0, dz - 1); D.add(n); }
    });
    for (const pz of [-2, -20, -38]) both(s => { cyl(D, 0.42, 0.32, 0.7, 0xf6f4ef, s * 4.25, 0.35, pz, 10); ico(D, 0.6, 0x7cc45c, s * 4.25, 1.15, pz); ico(D, 0.42, 0x9ad67a, s * 4.3, 1.75, pz + 0.1); });
    rbox(D, 5.4, 1.3, 0.2, 0x1a211d, 0, 5.0, -30, 0.08); rbox(D, 0.7, 0.7, 0.24, 0x86d92b, -1.9, 5.0, -29.98, 0.14); rbox(D, 0.34, 0.34, 0.28, 0x1a211d, -1.9, 5.0, -29.96, 0.07);
    label(D, 'NVIDIA', 3.4, 0.85, 0.5, 5.0, -29.88, { size: 104 });
  } else if (zi === 1) {
    for (let rz = -3; rz > -SEG; rz -= 3.4) both(s => {
      rbox(D, 1.5, 3.6, 1.6, 0xf4f7f5, s * 6.2, 1.8, rz, 0.1); rbox(D, 0.06, 3.2, 1.3, 0x2a2d33, s * 5.44, 1.8, rz, 0.02);
      for (let k = 0; k < 4; k++) box(D, 0.04, 0.08, 1.1, glow(k % 2 ? 0x5ee6ff : 0x7dff5a, 1.6), s * 5.4, 0.7 + k * 0.72, rz);
    });
    both(s => box(D, 0.16, 0.06, SEG, glow(0x7dff5a, 1.4), s * 4.3, 0.03, -SEG / 2));
    for (const pz of [-8, -28]) both(s => { cyl(D, 0.3, 0.38, 1.0, 0xe9f2ee, s * 4.5, 0.5, pz, 12); rbox(D, 0.5, 0.08, 0.5, glow(0x7dff5a, 1.8), s * 4.5, 1.25, pz, 0.03).rotation.set(0.5, 0.6, 0); });
  } else if (zi === 2) {
    both(s => { rbox(D, 0.4, 5, SEG, 0x7a4d32, s * 6.6, 2.5, -SEG / 2, 0.05); rbox(D, 0.5, 0.5, SEG, 0x5e3a25, s * 6.5, 0.25, -SEG / 2, 0.05); });
    for (const pz of [-6, -20, -34]) both(s => {
      rbox(D, 0.12, 2.3, 1.9, mat(0xd9b25a, { metalness: 0.6, roughness: 0.3 }), s * 6.36, 2.9, pz, 0.04);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0), new THREE.MeshBasicMaterial({ map: (pz === -20 ? chartTex : portraitTex) })); p.position.set(s * 6.28, 2.9, pz); p.rotation.y = -s * Math.PI / 2; D.add(p);
    });
    for (const pz of [-13, -27]) both(s => {
      rbox(D, 1.1, 0.55, 2.8, 0x5b3a2a, s * 5.3, 0.35, pz, 0.22); rbox(D, 0.35, 1.1, 2.8, 0x5b3a2a, s * 5.85, 0.6, pz, 0.16);
      cyl(D, 0.05, 0.05, 2.2, 0xd9b25a, s * 5.5, 1.1, pz + 2.1, 6); cyl(D, 0.2, 0.36, 0.5, glow(0xffe2a0, 1.3), s * 5.5, 2.3, pz + 2.1, 12);
    });
    both(s => box(D, 0.2, 0.05, SEG, mat(0xd9b25a, { metalness: 0.6, roughness: 0.3 }), s * 4.3, 0.03, -SEG / 2));
  } else {
    for (let rz = -2; rz > -SEG; rz -= 2.6) both(s => {
      rbox(D, 1.6, 5.2, 2.2, 0x14191c, s * 6.0, 2.6, rz, 0.08);
      for (let k = 0; k < 6; k++) box(D, 0.04, 0.07, 1.7, glow((k + Math.round(rz)) % 3 ? 0x7dff5a : 0x5ee6ff, 1.5), s * 5.18, 0.6 + k * 0.72, rz);
    });
    both(s => { box(D, 0.2, 0.06, SEG, glow(0x7dff5a, 1.4), s * 4.3, 0.03, -SEG / 2); rbox(D, 1.2, 0.25, SEG, 0x22292d, s * 3.4, 6.9, -SEG / 2, 0.05); });
    for (const pz of [-6, -18, -32]) for (const x of [-3.6, -3.1, 3.3, 3.7]) cyl(D, 0.04, 0.04, 1.4 + (Math.abs(pz + x * 3) % 1), 0x0c0f10, x, 6.2, pz, 5);
    for (const pz of [-20]) both(s => { rbox(D, 0.7, 1.6, 1.6, 0x2b3338, s * 4.6, 0.8, pz, 0.1); cyl(D, 0.55, 0.55, 0.08, glow(0x5ee6ff, 0.9), s * 4.22, 0.9, pz, 14).rotation.z = Math.PI / 2; });
  }
  // ceiling structure, light fixtures, outer walls
  const cc = [0x3a4038, 0xf4faf7, 0x5e3a25, 0x0f1416][zi], lc = [0xfff1d6, 0xdffff0, 0xffd9a0, 0x7dff5a][zi];
  both(s => { rbox(D, 0.35, 0.35, SEG, cc, s * 2.7, 6.9, -SEG / 2, 0.05); rbox(D, 0.5, 7.4, SEG, [0xe9e1d3, 0xe6f2ec, 0x6e452c, 0x0f1416][zi], s * 11, 3.7, -SEG / 2, 0.05); });
  for (let cz = -2.5; cz > -SEG; cz -= 5) { rbox(D, 22, 0.25, 0.3, cc, 0, 6.95, cz, 0.05); if (zi) box(D, 1.8, 0.07, 0.55, glow(lc, zi === 3 ? 1.5 : 2), 0, 6.8, cz); }
  if (zi === 0) {
    box(D, 22, 0.05, SEG, glow(0xffe2bd, 0.8), 0, 7.4, -SEG / 2);
    for (const pz of [-5, -15, -25, -35]) both(s => { for (let k = 0; k < 3; k++) ico(D, 0.5 - k * 0.1, k % 2 ? 0x7cc45c : 0x5faa48, s * 2.7 + (k - 1) * 0.3, 6.5 - k * 0.42, pz + k * 0.2); });
    for (const rz of [-20, -1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 8, 40), glow(0xfff4dc, 2.6)); r.rotation.x = Math.PI / 2; r.position.set(0, 5.75, rz); D.add(r); }
    both(s => { rbox(D, 0.2, 2.4, 2.4, 0x86d92b, s * 10.7, 3.6, -20, 0.5); rbox(D, 0.24, 1.3, 1.3, 0x1a211d, s * 10.66, 3.6, -20, 0.3); rbox(D, 0.28, 0.6, 0.6, 0x86d92b, s * 10.62, 3.6, -20, 0.14); for (const wz of [-6, -34]) box(D, 0.1, 2.6, 5, glow(0xffd9a0, 0.9), s * 10.72, 4.2, wz); });
    for (const [x, z] of [[-2.2, -14], [1.6, -33]]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 11), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); b.position.set(x, 3.6, z); b.rotation.set(0.5, 0.25, 0.42); D.add(b); }
  } else if (zi === 1) { box(D, 9, 0.05, SEG, glow(0xe6fff2, 0.4), 0, 7.4, -SEG / 2); for (const tz of [-12, -30]) both(s => { const t = cyl(D, 0.42, 0.42, 3.4, mat(0x9dffc8, { transparent: true, opacity: 0.3, roughness: 0.05 }), s * 4.5, 2.9, tz, 14); rbox(D, 0.34, 0.06, 0.34, glow(0x7dff5a, 3), s * 4.5, 2.6, tz, 0.02).rotation.y = 0.6; cyl(D, 0.5, 0.5, 0.2, 0xdfeee8, s * 4.5, 1.15, tz, 14); cyl(D, 0.5, 0.5, 0.2, 0xdfeee8, s * 4.5, 4.65, tz, 14); cyl(D, 0.36, 0.5, 1.1, 0xe9f2ee, s * 4.5, 0.55, tz, 14); t.renderOrder = 2; }); }
  else if (zi === 2) { for (const rz of [-20, -1]) for (const [rr, y] of [[1.6, 5.7], [1.0, 5.3]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.06, 8, 36), glow(0xffd98a, 2.8)); r.rotation.x = Math.PI / 2; r.position.set(0, y, rz); D.add(r); } rbox(D, 3.4, 0.03, SEG, mat(0x244a36, { roughness: 0.8 }), 0, 0.012, -SEG / 2, 0.01).visible = false; }
  noShadow(D); fl.receiveShadow = true; fl.castShadow = false;
  return g;
}
ZONES.forEach(z => { z.tex = floorTex(z.floor); z.cBg = new THREE.Color(z.bg); z.cSky = new THREE.Color(z.sky); z.cGnd = new THREE.Color(z.gnd); z.cSun = new THREE.Color(z.sc); });
const ZLEN = 7; // segments per zone
const slots = [];
for (let i = 0; i < NSEG; i++) { const s = { idx: i, g: new THREE.Group(), zs: ZONES.map((_, zi) => buildSeg(zi)) }; s.zs.forEach(z => s.g.add(z)); scene.add(s.g); slots.push(s); }
const zoneOf = idx => Math.floor(Math.max(0, idx) / ZLEN) % 4;
const setSlot = s => s.zs.forEach((z, zi) => { z.visible = zi === zoneOf(s.idx); });

// ---------- characters ----------
const J = makeJensen(), S = makeSpy();
scene.add(J.g, S.g); J.g.rotation.y = S.g.rotation.y = Math.PI; S.brief.visible = false;
const shield = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), new THREE.MeshBasicMaterial({ color: 0xb9ff5e, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
shield.position.y = 1.1; J.g.add(shield); shield.visible = false;
const blobT = textTex((c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W); }, 64, 64);
const blobs = [J, S].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 1; scene.add(m); return m; });
{ // portrait for the HUD
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setSize(128, 128);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0xe8d8c8, 2.4)); const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(1, 2, 3); sc.add(d);
  const cm = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cm.position.set(0.7, 1.78, 3.2); cm.lookAt(0, 1.66, 0);
  sc.add(J.g); J.g.rotation.y = 0.22; r.render(sc, cm); $('pj').src = r.domElement.toDataURL(); scene.add(J.g); J.g.rotation.y = Math.PI; r.dispose(); r.forceContextLoss();
}

// ---------- obstacles (pooled) ----------
const CARD = 0xc9a071, DARK = 0x2a2f33;
const OB = {
  chair: { hw: 0.55, y0: 0, y1: 1.0, hd: 0.5, cls: 'low', make(g) {
    cyl(g, 0.07, 0.07, 0.45, 0x8a8f99, 0, 0.32, 0, 8); for (let i = 0; i < 5; i++) { const a = i * 1.257; rbox(g, 0.1, 0.07, 0.5, DARK, Math.sin(a) * 0.25, 0.1, Math.cos(a) * 0.25, 0.03).rotation.y = a; sph(g, 0.08, 0x111111, Math.sin(a) * 0.48, 0.08, Math.cos(a) * 0.48, 8); }
    rbox(g, 0.95, 0.2, 0.9, DARK, 0, 0.62, 0, 0.09); rbox(g, 0.9, 0.95, 0.18, DARK, 0, 1.15, -0.42, 0.09).rotation.x = -0.12; for (const s of [-1, 1]) rbox(g, 0.1, 0.08, 0.6, 0x3d4449, s * 0.52, 0.86, 0, 0.03);
  } },
  cart: { hw: 0.75, y0: 0, y1: 1.3, hd: 0.85, cls: 'low', make(g) {
    rbox(g, 1.5, 0.75, 1.7, 0xf4ead8, 0, 0.62, 0, 0.12); rbox(g, 1.6, 0.1, 1.8, 0x8a5a3a, 0, 1.02, 0, 0.04); rbox(g, 1.52, 0.16, 1.72, 0x86d92b, 0, 0.3, 0, 0.05);
    for (const x of [-0.6, 0.6]) for (const z of [-0.7, 0.7]) cyl(g, 0.17, 0.17, 0.1, 0x222, x, 0.17, z, 10).rotation.z = Math.PI / 2;
    cyl(g, 0.24, 0.24, 0.5, mat(0xc9ced6, { metalness: 0.7, roughness: 0.25 }), -0.35, 1.3, -0.3, 12); for (const [x, z] of [[0.3, -0.4], [0.4, 0.1], [0.1, 0.4], [-0.3, 0.45]]) { cyl(g, 0.09, 0.07, 0.2, 0xffffff, x, 1.17, z, 8); cyl(g, 0.075, 0.075, 0.02, 0x6b4226, x, 1.27, z, 8); }
  } },
  rack: { hw: 0.85, y0: 0, y1: 3.3, hd: 0.55, cls: 'tall', make(g) {
    rbox(g, 1.75, 3.3, 1.15, 0x1c2124, 0, 1.65, 0, 0.1); rbox(g, 1.5, 3.0, 0.05, 0x0d1012, 0, 1.65, 0.57, 0.03);
    for (let k = 0; k < 6; k++) { box(g, 1.3, 0.1, 0.04, glow(k % 2 ? 0x5ee6ff : 0x7dff5a, 2), 0, 0.5 + k * 0.47, 0.6); }
    rbox(g, 1.75, 0.22, 1.17, 0xffd23f, 0, 0.11, 0, 0.04);
  } },
  boxes: { hw: 0.95, y0: 0, y1: 3.0, hd: 0.8, cls: 'tall', make(g) {
    const b = (w, h, d, x, y, z, r) => { const m = rbox(g, w, h, d, CARD, x, y, z, 0.05); m.rotation.y = r; rbox(m, w * 0.4, h * 0.4, 0.03, 0x86d92b, 0, 0, d / 2 + 0.01, 0.06); rbox(m, w * 0.18, h * 0.18, 0.04, CARD, 0, 0, d / 2 + 0.02, 0.03); box(m, w + 0.01, 0.1, d + 0.01, 0xb38a5c, 0, h / 2 - 0.2, 0); };
    b(1.8, 1.3, 1.5, 0, 0.65, 0, 0.05); b(1.5, 1.1, 1.3, 0.08, 1.85, 0, -0.12); b(1.0, 0.75, 0.9, -0.15, 2.78, 0, 0.2);
  } },
};
function mkLaser(w) { return g => { const hw = w / 2; for (const s of [-1, 1]) { rbox(g, 0.22, 3.2, 0.22, 0x30363a, s * (hw - 0.08), 1.6, 0, 0.05); rbox(g, 0.3, 0.3, 0.3, glow(0xff3b4e, 1.5), s * (hw - 0.08), 3.3, 0, 0.08); } for (const y of [1.15, 1.6, 2.05, 2.5, 2.95]) { const b = cyl(g, 0.045, 0.045, w - 0.3, glow(0xff3b4e, 3), 0, y, 0, 6); b.rotation.z = Math.PI / 2; b.castShadow = false; } }; }
function mkTable(w) { return g => { const hw = w / 2; rbox(g, w - 0.15, 0.16, 2.0, 0xe9dcc6, 0, 1.3, 0, 0.06); rbox(g, w - 0.3, 0.2, 0.2, 0x8a8f99, 0, 1.15, 0, 0.04); for (const s of [-1, 1]) for (const z of [-0.8, 0.8]) cyl(g, 0.06, 0.06, 1.25, 0x8a8f99, s * (hw - 0.22), 0.62, z, 6); for (let x = -hw + 0.8; x < hw - 0.3; x += 1.5) { rbox(g, 0.5, 0.03, 0.34, 0xc9ced6, x, 1.4, 0.2, 0.01); rbox(g, 0.5, 0.32, 0.03, 0xc9ced6, x, 1.56, 0.02, 0.01).rotation.x = -0.2; cyl(g, 0.07, 0.06, 0.14, 0x86d92b, x + 0.45, 1.45, -0.3, 8); } }; }
OB.laser1 = { hw: LANE / 2, y0: 1.0, y1: 3.4, hd: 0.15, cls: 'high', make: mkLaser(LANE) }; OB.laser3 = { hw: LANE * 1.5, y0: 1.0, y1: 3.4, hd: 0.15, cls: 'high', make: mkLaser(LANE * 3) };
OB.table1 = { hw: LANE / 2, y0: 1.05, y1: 1.5, hd: 1.0, cls: 'high', make: mkTable(LANE) }; OB.table3 = { hw: LANE * 1.5, y0: 1.05, y1: 1.5, hd: 1.0, cls: 'high', make: mkTable(LANE * 3) };
const pool = {}, obs = [];
function spawnOb(type, x, s) {
  let o = (pool[type] || (pool[type] = [])).pop();
  if (!o) { o = { type, spec: OB[type], g: new THREE.Group() }; OB[type].make(o.g); o.g.traverse(m => { if (m.isMesh) m.receiveShadow = false; }); scene.add(o.g); }
  o.x = x; o.s = s; o.fly = null; o.g.visible = true; o.g.rotation.set(0, 0, 0); o.g.position.set(x, 0, 0); o.spin = type === 'chair' ? (Math.random() - 0.5) * 3 : 0; obs.push(o);
}
function freeOb(i) { const o = obs[i]; o.g.visible = false; pool[o.type].push(o); obs.splice(i, 1); }

// ---------- chips (instanced) ----------
const MAXC = 220, chips = [];
const cGeo = new THREE.BoxGeometry(0.62, 0.62, 0.12), cIn = new THREE.BoxGeometry(0.34, 0.34, 0.15), cHalo = new THREE.CircleGeometry(0.55, 14);
const imA = new THREE.InstancedMesh(cGeo, glow(0x8cf03a, 1.5), MAXC), imB = new THREE.InstancedMesh(cIn, mat(0x16201b, { roughness: 0.4 }), MAXC);
const imH = new THREE.InstancedMesh(cHalo, new THREE.MeshBasicMaterial({ color: 0x9dff4a, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false }), MAXC);
for (const m of [imA, imB, imH]) { m.frustumCulled = false; m.count = 0; scene.add(m); } imA.castShadow = false;
const dummy = new THREE.Object3D();

// ---------- power-up pickups ----------
const PW = [{ name: 'LEATHER JACKET SHIELD', dur: 0 }, { name: 'H100 TURBO', dur: 5 }, { name: 'KEYNOTE MODE', dur: 6 }];
const pwMesh = PW.map((_, i) => {
  const g = new THREE.Group(), in_ = new THREE.Group(); g.add(in_); g.inner = in_;
  if (i === 0) { rbox(in_, 0.8, 0.9, 0.3, mat(0x1d1d22, { roughness: 0.35, metalness: 0.2 }), 0, 0, 0, 0.14); for (const s of [-1, 1]) rbox(in_, 0.3, 0.7, 0.26, mat(0x1d1d22, { roughness: 0.35, metalness: 0.2 }), s * 0.52, 0.05, 0, 0.1).rotation.z = s * 0.4; box(in_, 0.04, 0.8, 0.32, 0xb9bec7, 0, 0, 0); }
  if (i === 1) { rbox(in_, 1.0, 1.0, 0.2, glow(0x8cf03a, 1.6), 0, 0, 0, 0.08); rbox(in_, 0.7, 0.7, 0.24, 0x16201b, 0, 0, 0, 0.05); label(in_, 'H100', 0.66, 0.3, 0, 0, 0.13, { size: 80, color: '#b9ff5e', tw: 256, th: 110 }); label(in_, 'H100', 0.66, 0.3, 0, 0, -0.13, { size: 80, color: '#b9ff5e', tw: 256, th: 110 }).rotation.y = Math.PI; }
  if (i === 2) { rbox(in_, 0.7, 0.9, 0.5, 0xfdf6ea, 0, -0.15, 0, 0.08); rbox(in_, 0.9, 0.12, 0.6, 0xd9b25a, 0, 0.33, 0, 0.04); cyl(in_, 0.03, 0.03, 0.4, 0x333, 0.15, 0.55, 0, 5); sph(in_, 0.08, 0x333, 0.15, 0.78, 0, 8); rbox(in_, 0.3, 0.3, 0.04, 0x86d92b, 0, -0.1, 0.26, 0.05); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 8, 28), glow([0xb9ff5e, 0xb9ff5e, 0xffd95a][i], 2)); g.add(ring); g.ring = ring;
  g.traverse(m => { if (m.isMesh) m.castShadow = false; }); g.visible = false; scene.add(g); return g;
});
let pickup = null;

// ---------- particles ----------
const NP = 320, pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), parts = [];
for (let i = 0; i < NP; i++) parts.push({ life: 0 });
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const pTex = textTex((c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, '#fff'); g.addColorStop(0.4, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W); }, 64, 64);
const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.3, map: pTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
pts.frustumCulled = false; scene.add(pts);
let pi = 0;
function burst(x, y, z, n, col, sp = 5, life = 0.5) { for (let i = 0; i < n; i++) { const p = parts[pi++ % NP]; p.x = x; p.y = y; p.z = z; p.vx = (Math.random() - 0.5) * sp; p.vy = Math.random() * sp * 0.8; p.vz = (Math.random() - 0.5) * sp; p.life = p.max = life * (0.6 + Math.random() * 0.6); p.c = col; } }
const C_G = [0.6, 1, 0.25], C_W = [1, 1, 0.8], C_R = [1, 0.3, 0.4], C_Y = [1, 0.85, 0.3];

// ---------- audio ----------
let AC, snd = true, musicT = 0, beat = 0;
function tone(f, d = 0.08, type = 'sine', v = 0.06, slide = 0, at = 0) {
  if (!snd || !AC) return;
  const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
}
const initAudio = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { /* silent */ } };
const BASS = [110, 110, 165, 110, 131, 131, 196, 147], ARP = [440, 554, 659, 880, 659, 554, 523, 659];
function music(dt) {
  if (!snd || !AC || G.state !== 'run') return;
  musicT -= dt; if (musicT > 0) return; musicT += 0.5 * 60 / (132 + G.speed * 1.6);
  const k = G.turbo > 0 ? 1.5 : G.keynote > 0 ? 0.75 : 1;
  if (beat % 2 === 0) tone(BASS[(beat / 2) % 8] * k, 0.16, 'triangle', 0.07);
  tone(ARP[beat % 8] * k, 0.07, 'square', 0.012); if (beat % 4 === 2) tone(2400, 0.03, 'square', 0.008); beat++;
}

// ---------- state ----------
let tutRows = [];
const G = { state: 'menu', dist: 0, speed: 10, chips: 0, hits: 0, lane: 0, px: 0, py: 0, vy: 0, ground: true, slide: 0, fast: false, stumble: 0, inv: 0, shield: false, turbo: 0, keynote: 0, gap: 3.4, shake: 0, t: 0, combo: 0, comboT: 0, paused: false, nextRow: 0, nextPw: 0, nextMile: 5e8, caughtT: 0, land: 0, tut: 0 };
let best = 0; try { best = +localStorage.getItem('jr-best') || 0; } catch (e) { /* */ }
const money = () => Math.floor(G.dist) * 1e6 + G.chips * 2.5e6;
const fmt = n => '$' + Math.floor(n).toLocaleString('en-US');
const short = n => n >= 1e12 ? '$' + (n / 1e12).toFixed(2) + ' TRILLION' : n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + ' BILLION' : '$' + Math.round(n / 1e6) + ' MILLION';
$('chipic').innerHTML = CHIP; ICONS.forEach((s, i) => { $('s' + i).firstChild.innerHTML = s; });
function hearts() { $('hearts').innerHTML = [0, 1, 2].map(i => HEART.replace('<svg', `<svg class="${i < 3 - G.hits ? '' : 'off'}"`)).join(''); const l = $('lead').firstChild; l.style.width = [100, 62, 28, 4][G.hits] + '%'; l.style.background = G.hits ? (G.hits > 1 ? '#ff5d8f' : '#ffd23f') : ''; }
function pop(t, cls = '') { const d = document.createElement('div'); d.className = 'popt ' + cls; d.textContent = t; $('toasts').prepend(d); while ($('toasts').children.length > 2) $('toasts').lastChild.remove(); setTimeout(() => d.remove(), 2400); }
const bubs = [];
function bubble(a, t, dur = 1.6) { const el = document.createElement('div'); el.className = 'bub'; el.textContent = t; $('pops').append(el); bubs.push({ a, el, t: dur }); }
const MILE = ['Analysts upgrade to STRONG RUN.', 'The jacket remains immaculate.', 'Shareholders weep with joy.', 'Cardio: the ultimate moat.', 'She wants the chips. You want the exit.', 'Leather has never moved this fast.', 'Stock split? No. Lane split.', 'HR has stopped asking questions.'];
const SPYQ = ['Just ONE chip, Jensen!', 'Nice jacket! Is it real?', 'Slow down, I only want to talk!', 'Tell me about the roadmap!', 'Your shoelace is untied!'];
const QUIP = ['She says the leather was "surprisingly soft".', 'The chips are fine. Your dignity is not.', 'Security footage of this will be shown at the all-hands.', 'She thanked you for the cardio.', 'The jacket has been taken into custody.'];

function reset() {
  Object.assign(G, { dist: 0, speed: 11, chips: 0, hits: 0, lane: 0, px: 0, py: 0, vy: 0, ground: true, slide: 0, fast: false, stumble: 0, inv: 0, shield: false, turbo: 0, keynote: 0, gap: 3.6, shake: 0, combo: 0, paused: false, nextRow: 46, nextPw: 260, nextMile: 5e8, caughtT: 0, zone: 0 });
  while (obs.length) { obs[0].g.position.y = 0; freeOb(0); } chips.length = 0; tutRows = []; pickup = null; pwMesh.forEach(m => { m.visible = false; });
  slots.forEach((s, i) => { s.idx = i - 1; setSlot(s); });
  let seen = 0; try { seen = +localStorage.getItem('jr-tut') || 0; } catch (e) { /* */ } G.tut = seen ? 3 : 0; G.practice = seen ? 0 : 125;
  hearts(); $('chipn').textContent = '0'; $('hint').classList.remove('on'); shield.visible = false; J.setJacket(true);
  bubs.forEach(b => b.el.remove()); bubs.length = 0;
}
function start() {
  initAudio(); reset(); G.state = 'run'; document.body.classList.add('run'); ['menu', 'over', 'paused'].forEach(i => $(i).classList.remove('on'));
  tone(520, 0.1, 'triangle', 0.08); tone(780, 0.14, 'triangle', 0.08, 0, 0.09); bubble(S, 'Jensen! Wait!', 1.6);
}

// ---------- track generation ----------
const LOWS = ['chair', 'chair', 'cart'], TALLS = ['rack', 'boxes'];
const pickR = a => a[Math.floor(Math.random() * a.length)];
function addChips(lane, s0, s1, kind) { for (let s = s0; s <= s1 && chips.length < MAXC - 4; s += 1.9) { const ds = s - s1 + 2.2; let y = 1.05; if (kind === 'low') y += 1.7 * Math.max(0, 1 - (ds / 4.2) ** 2); if (kind === 'high' && Math.abs(ds) < 3.4) y = 0.5; chips.push({ x: lane * LANE, y, s, on: true }); } }
function genRow(s) {
  const D = clamp(G.dist / 2600, 0, 1); let k = [null, null, null], wide = null;
  if (G.tut < 3) { if (G.tut === 0) k = [null, 'tall', null]; else if (G.tut === 1) k = ['low', 'low', 'low']; else wide = 'laser3'; k.tutIdx = G.tut; }
  else {
    const w = [3.2 * (1 - D) + 0.6, 2.2, 0.5 + D, 0.5 + D, D * 2.2, D * 1.6]; let r = Math.random() * w.reduce((a, b) => a + b), p = 0; while (r > w[p]) r -= w[p++];
    const L = [0, 1, 2].sort(() => Math.random() - 0.5), any = () => pickR(['low', 'tall', 'high', 'tall', 'low']);
    if (p === 0) k[L[0]] = any(); else if (p === 1) { k[L[0]] = any(); k[L[1]] = any(); }
    else if (p === 2) k = ['low', 'low', 'low']; else if (p === 3) wide = Math.random() < 0.5 ? 'laser3' : 'table3';
    else if (p === 4) { k[L[0]] = 'tall'; k[L[1]] = 'tall'; k[L[2]] = pickR(['low', 'high', null]); }
    else { k[L[0]] = 'tall'; k[L[1]] = pickR(['low', 'high']); k[L[2]] = pickR(['low', 'high', 'tall']); if (k.every(x => x === 'tall')) k[L[2]] = 'low'; }
  }
  if (wide) { spawnOb(wide, 0, s); k = ['high', 'high', 'high']; }
  else k.forEach((c, i) => { if (c) spawnOb(c === 'low' ? pickR(LOWS) : c === 'tall' ? pickR(TALLS) : pickR(['laser1', 'table1']), (i - 1) * LANE, s); });
  const ok = [0, 1, 2].filter(i => k[i] !== 'tall'), free = ok.filter(i => !k[i]);
  const cl = free.length && Math.random() < 0.6 ? pickR(free) : pickR(ok);
  if (Math.random() < 0.85 || G.tut < 3) addChips(cl - 1, s - 11, s + 2.2, k[cl]);
  const row = { s, tut: G.tut < 3 ? G.tut : -1 }; if (G.tut < 3) G.tut++; return row;
}
function generate() {
  while (G.nextRow < G.dist + 170) {
    const r = genRow(G.nextRow); if (r.tut >= 0) tutRows.push(r);
    const gap = Math.max(15, (13 + 17 * (1 - Math.exp(-G.nextRow / 1500))) * (r.tut >= 0 ? 1.5 : 0.84)) + Math.random() * 5;
    if (G.nextRow > G.nextPw && !pickup) { const i = Math.floor(Math.random() * 3); pickup = { i, x: (Math.floor(Math.random() * 3) - 1) * LANE, s: G.nextRow + gap / 2, g: pwMesh[i] }; pickup.g.visible = true; G.nextPw = G.nextRow + 300 + Math.random() * 160; }
    G.nextRow += gap;
  }
}

// ---------- input ----------
function act(a) {
  if (G.state !== 'run' || G.paused || G.stumble > 0.35) return;
  if (a === 'L' || a === 'R') { const n = clamp(G.lane + (a === 'L' ? -1 : 1), -1, 1); if (n === G.lane) { G.shake = Math.max(G.shake, 0.12); tone(120, 0.06, 'square', 0.04); } else { G.lane = n; tone(360, 0.05, 'sine', 0.04, 200); } }
  if (a === 'U' && G.ground) { G.vy = 11.6; G.ground = false; G.slide = 0; G.fast = false; tone(300, 0.16, 'sine', 0.06, 420); }
  if (a === 'D') { if (!G.ground) { G.fast = true; } else { G.slide = 0.7; tone(220, 0.18, 'sawtooth', 0.03, -120); } }
}
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'escape' || k === 'p') return pause();
  if ((k === ' ' || k === 'enter') && G.state !== 'run' && !e.repeat) { if (G.state === 'menu' || (G.state === 'over' && G.caughtT > 2.4)) start(); return; }
  if (e.repeat) return;
  act({ arrowleft: 'L', a: 'L', arrowright: 'R', d: 'R', arrowup: 'U', w: 'U', ' ': 'U', arrowdown: 'D', s: 'D' }[k]);
});
{ let sx, sy, live = false;
  addEventListener('pointerdown', e => { if (e.target.closest('button')) return; sx = e.clientX; sy = e.clientY; live = true; });
  addEventListener('pointermove', e => { if (!live) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return; live = false; act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : dy < 0 ? 'U' : 'D'); });
  addEventListener('pointerup', () => { live = false; }); addEventListener('pointercancel', () => { live = false; });
}
function pause(force) { if (G.state !== 'run') return; G.paused = force ?? !G.paused; $('paused').classList.toggle('on', G.paused); }
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
$('bPause').onclick = () => pause(); $('bResume').onclick = () => pause(false); $('bQuit').onclick = start; $('bPlay').onclick = start; $('bAgain').onclick = start;
$('bSnd').onclick = () => { snd = !snd; $('bSnd').textContent = 'Sound: ' + (snd ? 'on' : 'off'); };
$('bShare').onclick = async () => {
  const text = `I saved ${short(G.final)} before getting caught in JENSEN RUN! Can you beat me?`, url = location.href.split(/[?#]/)[0];
  try { if (navigator.share) { await navigator.share({ title: 'JENSEN RUN!', text, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + ' ' + url); $('bShare').textContent = 'Copied!'; } catch (e) { prompt('Copy your score:', text + ' ' + url); }
  setTimeout(() => { $('bShare').textContent = 'Share score'; }, 1800);
};
$('how').textContent = TOUCH ? 'Swipe ← → to dodge · ↑ jump · ↓ slide' : '← → dodge · ↑ / Space jump · ↓ slide';
$('mbest').textContent = best ? 'Personal best: ' + short(best) + ' saved' : '';

// ---------- gameplay events ----------
function fx(c, ms) { const e = $('fx'); e.className = c; if (ms) setTimeout(() => { if (e.className === c) e.className = ''; }, ms); }
function knock(o, big) { o.fly = { vx: (o.x - G.px || (Math.random() - 0.5)) * 3 + (Math.random() - 0.5) * 5, vy: big ? 11 : 6, vs: big ? 26 : 9, t: 0 }; }
function hit(o) {
  const z = -(o.s - G.dist);
  if (G.turbo > 0) { knock(o, true); burst(o.x, 1.2, z, 14, C_G, 9); tone(180, 0.12, 'square', 0.06, 300); G.shake = 0.25; G.chips += 2; return; }
  if (G.inv > 0) return;
  knock(o, false); burst(G.px, 1.2, 0, 16, C_W, 7);
  if (G.shield) { G.shield = false; shield.visible = false; G.inv = 1.2; $('s0').classList.remove('on'); tone(700, 0.25, 'triangle', 0.08, -500); pop('Jacket took the hit. Worth every penny.'); G.shake = 0.3; return; }
  G.stumble = 0.75; G.inv = 1.7; G.shake = 0.55; G.slide = 0; fx('hit', 160);
  if (G.practice && G.dist < G.practice) { pop('Practice bump. That one was free.'); tone(150, 0.25, 'sawtooth', 0.09, -90); return; }
  G.hits++; hearts();
  tone(150, 0.25, 'sawtooth', 0.09, -90); tone(90, 0.3, 'square', 0.06, -40, 0.05);
  if (navigator.vibrate) navigator.vibrate(60);
  if (G.hits >= 3) return caught();
  bubble(S, pickR(SPYQ), 1.8);
}
function caught() {
  G.state = 'over'; G.caughtT = 0; G.final = money(); G.turbo = G.keynote = 0; fx('');
  const nb = G.final > best; if (nb) { best = G.final; try { localStorage.setItem('jr-best', best); } catch (e) { /* */ } }
  try { localStorage.setItem('jr-tut', 1); } catch (e) { /* */ }
  $('oshort').textContent = short(G.final); $('odist').textContent = Math.floor(G.dist).toLocaleString('en-US') + ' m'; $('ochips').textContent = G.chips; $('obest').textContent = short(best).replace(' BILLION', 'B').replace(' MILLION', 'M').replace(' TRILLION', 'T');
  $('newbest').style.display = nb ? 'block' : 'none'; $('oquip').textContent = pickR(QUIP); $('mbest').textContent = 'Personal best: ' + short(best) + ' saved';
  bubble(S, 'Gotcha! Hand over the chips.', 2.2); [0, 1, 2, 3].forEach(i => tone(500 - i * 90, 0.18, 'sawtooth', 0.06, -40, i * 0.13));
}
function collect(c, z) {
  c.on = false; G.chips++; G.combo = G.comboT > 0 ? Math.min(G.combo + 1, 14) : 0; G.comboT = 0.45;
  tone(660 * Math.pow(1.0595, G.combo), 0.09, 'triangle', 0.07); tone(1320 * Math.pow(1.0595, G.combo), 0.06, 'sine', 0.03, 0, 0.03);
  burst(c.x, c.y, z, 5, C_G, 3.5, 0.35); $('chipn').textContent = G.chips;
  const e = $('chips'); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  if (G.chips % 2 === 0 && !LOW) { // fly to counter
    v3.set(c.x, c.y, z).project(cam); const f = document.createElement('div'); f.className = 'fly'; const x = (v3.x + 1) / 2 * innerWidth, y = (1 - v3.y) / 2 * innerHeight, r = e.getBoundingClientRect();
    f.style.left = x + 'px'; f.style.top = y + 'px'; $('pops').append(f); requestAnimationFrame(() => { f.style.transform = `translate(${r.left + 20 - x}px,${r.top + 10 - y}px) scale(.4)`; f.style.opacity = 0.3; }); setTimeout(() => f.remove(), 400);
  }
}
function power(i) {
  burst(G.px, 1.4, 0, 26, i === 2 ? C_Y : C_G, 9, 0.7); pop(PW[i].name + '!'); [0, 1, 2, 3].forEach(k => tone(440 * Math.pow(1.26, k), 0.12, 'triangle', 0.07, 0, k * 0.06));
  if (i === 0) { G.shield = true; shield.visible = true; } if (i === 1) { G.turbo = PW[1].dur; G.keynote = 0; } if (i === 2) { G.keynote = PW[2].dur; G.turbo = 0; }
}

// ---------- update ----------
const v3 = new THREE.Vector3(), cPos = new THREE.Vector3(0, 4.4, 7.4), cLook = new THREE.Vector3(0, 1.5, -10);
function update(dt) {
  G.t += dt; const run = G.state === 'run', slow = G.keynote > 0 ? 0.55 : 1;
  if (run) {
    const base = 13 + 17 * (1 - Math.exp(-G.dist / 1500));
    G.speed = lerp(G.speed, base * (G.turbo > 0 ? 1.85 : 1) * (G.stumble > 0 ? 0.5 : 1), 1 - Math.exp(-dt * 4));
    G.dist += G.speed * dt * slow;
    for (const k of ['stumble', 'inv', 'turbo', 'keynote', 'comboT', 'slide']) { const was = G[k]; G[k] = Math.max(0, G[k] - dt); if (was > 0 && !G[k] && (k === 'turbo' || k === 'keynote')) { G.inv = Math.max(G.inv, 1.3); fx(''); } }
    fx(G.turbo > 0 ? 'turbo' : G.keynote > 0 ? 'key' : $('fx').className === 'hit' ? 'hit' : '');
    generate();
    // physics
    if (!G.ground) { G.vy -= (G.fast ? 95 : 32) * dt; G.py += G.vy * dt; if (G.py <= 0) { G.py = 0; G.ground = true; G.land = 0.14; burst(G.px, 0.1, 0, 3, C_W, 2.5, 0.22); if (G.fast) { G.slide = 0.6; G.fast = false; } } }
    const ph = G.slide > 0 && G.ground ? 0.85 : 1.9;
    // collisions
    for (let i = obs.length - 1; i >= 0; i--) {
      const o = obs[i], dz = o.s - G.dist;
      if (o.fly) { o.fly.t += dt; o.fly.vy -= 26 * dt; o.x += o.fly.vx * dt; o.s += o.fly.vs * dt; o.g.position.y += o.fly.vy * dt; o.g.rotation.x += dt * 7; o.g.rotation.z += dt * 5; if (o.fly.t > 1.3) { o.g.position.y = 0; freeOb(i); continue; } }
      else if (dz < -10) { freeOb(i); continue; }
      else if (Math.abs(dz) < o.spec.hd + 0.32 && Math.abs(o.x - G.px) < o.spec.hw + 0.3 && G.py < o.spec.y1 - 0.08 && G.py + ph > o.spec.y0) { hit(o); if (G.state !== 'run') break; }
      if (o.spin) o.g.rotation.y += o.spin * dt;
    }
    // chips
    const mag = G.keynote > 0 || G.turbo > 0;
    if (G.state === 'run') for (const c of chips) {
      if (!c.on) continue; const dz = c.s - G.dist;
      if (mag && dz < 16 && dz > -1) { const k = 1 - Math.exp(-dt * 9); c.x = lerp(c.x, G.px, k); c.y = lerp(c.y, G.py + 1, k); c.s = lerp(c.s, G.dist, k * 0.55); }
      if (Math.abs(dz) < 0.95 && Math.abs(c.x - G.px) < 1.0 && Math.abs(c.y - (G.py + (ph > 1 ? 1.05 : 0.5))) < 1.25) collect(c, -dz);
    }
    while (chips.length && (!chips[0].on || chips[0].s < G.dist - 6)) chips.shift();
    if (pickup) { const dz = pickup.s - G.dist; if (Math.abs(dz) < 1.2 && Math.abs(pickup.x - G.px) < 1.2 && G.py < 2.2) { pickup.g.visible = false; power(pickup.i); pickup = null; } else if (dz < -8) { pickup.g.visible = false; pickup = null; } }
    // tutorial hints
    let h = ''; for (const r of tutRows) { const d = r.s - G.dist; if (d > 2 && d < 26) h = [TOUCH ? 'SWIPE ← →' : 'PRESS ← →', TOUCH ? 'SWIPE UP ↑<small>jump</small>' : 'PRESS ↑<small>jump</small>', TOUCH ? 'SWIPE DOWN ↓<small>slide</small>' : 'PRESS ↓<small>slide</small>'][r.tut]; }
    tutRows = tutRows.filter(r => r.s > G.dist - 3); const he = $('hint'); if (h) { if (he.dataset.h !== h) { he.innerHTML = h; he.dataset.h = h; } he.classList.add('on'); } else he.classList.remove('on');
    // score + milestones + zones
    const m = money(); $('capv').textContent = fmt(m);
    if (m >= G.nextMile) { pop(short(G.nextMile) + ' saved. ' + pickR(MILE)); G.nextMile += G.nextMile >= 2e9 ? 1e9 : 5e8; tone(880, 0.1, 'triangle', 0.05); tone(1175, 0.16, 'triangle', 0.05, 0, 0.09); }
    const zn = zoneOf(Math.floor(G.dist / SEG)); if (zn !== G.zone) { G.zone = zn; pop(ZONES[zn].name, 'zone'); }
    $('s0').classList.toggle('on', G.shield); $('s1').classList.toggle('on', G.turbo > 0); $('s1').style.setProperty('--p', G.turbo / PW[1].dur); $('s2').classList.toggle('on', G.keynote > 0); $('s2').style.setProperty('--p', G.keynote / PW[2].dur); $('s0').style.setProperty('--p', G.shield ? 1 : 0);
    if (G.turbo > 0) burst(G.px + (Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 1.4, 0.6, 2, C_G, 2, 0.5);
    if (G.keynote > 0 && Math.random() < 0.3) burst(G.px + (Math.random() - 0.5) * 3, 2.6, -1, 1, C_Y, 2, 0.7);
  } else if (G.state === 'menu') { G.dist += 9 * dt; G.speed = 9; }
  else { // caught
    G.caughtT += dt; G.speed = lerp(G.speed, 0, 1 - Math.exp(-dt * 5)); G.dist += G.speed * dt; G.py = lerp(G.py, 0, 0.2);
    if (G.caughtT > 1.7 && !$('over').classList.contains('on')) { $('over').classList.add('on'); document.body.classList.remove('run'); }
  }
  G.land = Math.max(0, G.land - dt); G.shake = Math.max(0, G.shake - dt * 1.6);
  // player + spy
  const tx = G.lane * LANE; G.px = lerp(G.px, tx, 1 - Math.exp(-dt * 19));
  const over = G.state === 'over', menu = G.state === 'menu';
  J.anim = over ? 'caught' : G.stumble > 0 ? 'stumble' : !G.ground ? 'jump' : G.slide > 0 ? 'slide' : G.keynote > 0 ? 'keynote' : 'run'; J.rate = clamp(G.speed / 15, 0.75, 1.6);
  J.g.position.set(G.px, G.py, 0); J.g.rotation.z = (tx - G.px) * -0.16; J.g.scale.set(1 + G.land * 1.2, 1 - G.land * 1.6, 1 + G.land * 1.2);
  J.g.visible = !(G.inv > 0 && run && G.turbo <= 0 && Math.floor(G.t * 14) % 2 === 0);
  shield.scale.setScalar(1 + Math.sin(G.t * 8) * 0.05); shield.material.opacity = 0.11 + Math.sin(G.t * 6) * 0.04;
  const gt = over ? 0.95 : G.state === 'menu' ? 2.4 : [G.dist < 26 ? 4.2 : 9.5, 5.2, 3.1][Math.min(G.hits, 2)] + (G.turbo > 0 ? 5 : 0);
  G.gap = lerp(G.gap, gt, 1 - Math.exp(-dt * (over ? 6 : 1.8)));
  S.g.position.x = lerp(S.g.position.x, G.px + (over ? 0.5 : menu ? 1.7 : 0), 1 - Math.exp(-dt * 5)); S.g.position.z = G.gap; S.anim = G.gap < 6.5 ? 'grab' : 'run'; S.rate = J.rate; S.g.visible = G.gap < 9.2;
  if (over && G.speed < 1) { S.anim = 'cheer'; }
  animChar(J, G.t, dt); animChar(S, G.t, dt);
  blobs[0].position.x = G.px; blobs[0].scale.setScalar(1 / (1 + G.py * 0.5)); blobs[1].position.set(S.g.position.x, 0.03, S.g.position.z); blobs[1].visible = S.g.visible;
  // world placement
  for (const s of slots) { if (s.idx * SEG + SEG < G.dist - (menu ? 150 : 14)) { s.idx += NSEG; setSlot(s); } s.g.position.z = -(s.idx * SEG - G.dist); }
  for (const o of obs) { o.g.position.x = o.x; o.g.position.z = -(o.s - G.dist); }
  let n = 0;
  for (const c of chips) { if (!c.on) continue; const z = -(c.s - G.dist); if (z < -150) break; dummy.position.set(c.x, c.y + Math.sin(G.t * 3 + c.s) * 0.1, z); dummy.rotation.set(0, G.t * 2.6 + c.s * 0.4, 0); dummy.scale.setScalar(1.25); dummy.updateMatrix(); imA.setMatrixAt(n, dummy.matrix); imB.setMatrixAt(n, dummy.matrix); dummy.position.y = 0.04; dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.updateMatrix(); imH.setMatrixAt(n, dummy.matrix); n++; }
  for (const m of [imA, imB, imH]) { m.count = n; m.instanceMatrix.needsUpdate = true; }
  if (pickup) { const g = pickup.g; g.position.set(pickup.x, 1.35 + Math.sin(G.t * 3) * 0.15, -(pickup.s - G.dist)); g.inner.rotation.y = G.t * 2.4; g.ring.rotation.x = G.t * 1.7; g.ring.rotation.y = G.t; }
  // particles
  for (let i = 0; i < NP; i++) { const p = parts[i]; if (p.life > 0) { p.life -= dt; p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += (p.vz + G.speed * slow) * dt; const a = Math.max(0, p.life / p.max); pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z; pCol[i * 3] = p.c[0] * a; pCol[i * 3 + 1] = p.c[1] * a; pCol[i * 3 + 2] = p.c[2] * a; } else pPos[i * 3 + 1] = -99; }
  pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = true;
  // zone lighting
  const z = ZONES[zoneOf(Math.floor((G.dist + 12) / SEG))], k = 1 - Math.exp(-dt * 2.2);
  scene.background.lerp(z.cBg, k); scene.fog.color.copy(scene.background); hemi.color.lerp(z.cSky, k); hemi.groundColor.lerp(z.cGnd, k); hemi.intensity = lerp(hemi.intensity, z.hi, k); sun.intensity = lerp(sun.intensity, z.si, k); sun.color.lerp(z.cSun, k); if (bloom) bloom.strength = lerp(bloom.strength, z.bl + (G.turbo > 0 ? 0.35 : 0), k);
  // camera
  const sh = G.shake * 0.45;
  v3.set(G.px * 0.55 + (over ? 2.6 : menu ? 0.4 : 0), (portrait ? 4.5 : 4.1) + G.py * 0.28 - (over ? 1.4 : 0), (portrait ? 6.9 : 6.6) - (over ? 1.6 : 0) + (menu ? 1.2 : 0)); if (menu) v3.set(portrait ? 1.3 : 2.3, portrait ? 1.9 : 1.6, portrait ? -6.4 : -4.9); cPos.lerp(v3, 1 - Math.exp(-dt * (over ? 3 : 7)));
  v3.set(G.px * 0.7, over ? 1.3 : 1.5 + G.py * 0.2, over ? 0.4 : -10); if (menu) v3.set(0.5, portrait ? 1.5 : 2.0, 1.5); cLook.lerp(v3, 1 - Math.exp(-dt * (over ? 3 : 7)));
  cam.position.set(cPos.x + (Math.random() - 0.5) * sh, cPos.y + (Math.random() - 0.5) * sh, cPos.z); cam.lookAt(cLook);
  const tf = baseFov + (G.turbo > 0 ? 13 : 0) + (G.speed - 13) * 0.35 - (G.keynote > 0 ? 5 : 0); if (Math.abs(cam.fov - tf) > 0.05) { cam.fov = lerp(cam.fov, tf, 1 - Math.exp(-dt * 4)); cam.updateProjectionMatrix(); }
  for (let i = bubs.length - 1; i >= 0; i--) { const b = bubs[i]; b.t -= dt; if (b.t <= 0) { b.el.remove(); bubs.splice(i, 1); continue; } v3.copy(b.a.g.position); v3.y += 2.7; v3.project(cam); b.el.style.left = clamp((v3.x + 1) / 2 * innerWidth, 90, innerWidth - 90) + 'px'; b.el.style.top = clamp((1 - v3.y) / 2 * innerHeight, 60, innerHeight - 110) + 'px'; }
  music(dt);
}
let last = performance.now(), noRender = false;
function tick(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!noRender) { if (!G.paused) update(dt); draw(); adapt(now); } requestAnimationFrame(tick); }
let fN = 0, fT = performance.now();
function adapt(now) { if (++fN < 90) return; const avg = (now - fT) / fN; fN = 0; fT = now; if (document.hidden || G.paused || quality >= 2 || avg < 23 || avg > 400 || /lockfx/.test(location.search)) return; quality++; PR = quality === 1 ? Math.min(PR, 1.25) : 1; if (quality === 2) renderer.shadowMap.enabled = TOUCH ? false : true; resize(); }
reset(); G.state = 'menu'; G.nextRow = 1e9; G.nextPw = 1e9; G.tut = 3; slots.forEach((s, i) => { s.idx = i - 4; setSlot(s); }); cPos.set(portrait ? 1.3 : 2.3, portrait ? 1.9 : 1.6, portrait ? -6.4 : -4.9); cLook.set(0.5, portrait ? 1.5 : 2.0, 1.5);
window.__JR = { G, obs, chips, act, start, OB, LANE, get pickup() { return pickup; }, ff: async (s, show) => { noRender = true; for (let i = 0; i < s * 60; i++) update(1 / 60); if (show) { draw(); await new Promise(r => requestAnimationFrame(r)); } }, live: () => { noRender = false; } };
requestAnimationFrame(tick);
