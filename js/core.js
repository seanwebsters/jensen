import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export { THREE };

const mats = new Map(), geos = new Map();
export function mat(color, o) {
  const k = color + (o ? JSON.stringify(o) : '');
  let m = mats.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, ...o }); mats.set(k, m); }
  return m;
}
const geo = (k, f) => { let g = geos.get(k); if (!g) { g = f(); geos.set(k, g); } return g; };
export function mesh(g, m, p, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m && m.isMaterial ? m : mat(m));
  o.position.set(x, y, z); o.castShadow = o.receiveShadow = true;
  if (p) p.add(o);
  return o;
}
export const box = (p, w, h, d, c, x, y, z) => mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), c, p, x, y, z);
export const rbox = (p, w, h, d, c, x, y, z, r = 0.08) =>
  mesh(geo(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2))), c, p, x, y, z);
export const cyl = (p, rt, rb, h, c, x, y, z, seg = 14) => mesh(geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), c, p, x, y, z);
export const sph = (p, r, c, x, y, z, seg = 16) => mesh(geo(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), c, p, x, y, z);
export const ico = (p, r, c, x, y, z, d = 1) => mesh(geo(`i${r},${d}`, () => new THREE.IcosahedronGeometry(r, d)), mat(c, { flatShading: true }), p, x, y, z);
export const cap = (p, r, l, c, x, y, z) => mesh(geo(`k${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 14)), c, p, x, y, z);
export const glow = (c, i = 1.4) => mat(c, { emissive: c, emissiveIntensity: i, roughness: 0.5 });

export function textTex(draw, w = 512, h = 128) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export function label(p, text, w, h, x, y, z, o = {}) {
  const tex = textTex((c, W, H) => {
    if (o.bg) { c.fillStyle = o.bg; c.fillRect(0, 0, W, H); }
    c.fillStyle = o.color || '#fff'; c.font = `800 ${o.size || 72}px "Baloo 2","Nunito","Trebuchet MS",sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    String(text).split('\n').forEach((l, i, a) => c.fillText(l, W / 2, H / 2 + (i - (a.length - 1) / 2) * (o.size || 72) * 1.05 + 4));
  }, o.tw || 512, o.th || 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !o.bg }));
  m.position.set(x, y, z); if (p) p.add(m);
  return m;
}

export function makeGPU(s = 1) {
  const g = new THREE.Group();
  rbox(g, 1.3, 0.22, 0.62, mat(0x2a2d33, { roughness: 0.4, metalness: 0.3 }), 0, 0, 0, 0.06);
  rbox(g, 1.34, 0.06, 0.1, glow(0x86d92b), 0, 0.03, 0.3, 0.02);
  for (const x of [-0.33, 0.33]) {
    cyl(g, 0.24, 0.24, 0.04, 0x15171a, x, 0.12, 0, 16);
    cyl(g, 0.07, 0.07, 0.06, glow(0x86d92b, 0.8), x, 0.13, 0, 10);
  }
  rbox(g, 0.08, 0.3, 0.62, 0xb9bec7, -0.68, 0, 0, 0.02);
  g.scale.setScalar(s);
  return g;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
