import { THREE, mat, mesh, box, rbox, cyl, sph, ico, glow, textTex, label, makeGPU } from './core.js';

export const RX = 140, RZ = -10; // rooftop centre

function tileTex(a, b, line, n = 4) {
  const t = textTex((c, W) => {
    c.fillStyle = line; c.fillRect(0, 0, W, W);
    const s = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      c.fillStyle = (i + j) % 2 ? a : b; c.beginPath(); c.roundRect(i * s + 2, j * s + 2, s - 4, s - 4, 9); c.fill();
    }
  }, 256, 256);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildWorld(scene) {
  const W = { col: [], anim: [], fade: [], seats: [], pts: {}, doors: {} };
  const root = new THREE.Group(); scene.add(root);
  const C = (x1, z1, x2, z2) => { const c = { x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: Math.min(z1, z2), z2: Math.max(z1, z2), on: true }; W.col.push(c); return c; };
  const CB = (x, z, w, d) => C(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  const floor = (x1, z1, x2, z2, c, y = 0.01, tex, rep = 4) => {
    let m = mat(c);
    if (tex) { const t = tex.clone(); t.repeat.set((x2 - x1) / rep, (z2 - z1) / rep); t.needsUpdate = true; m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); }
    const f = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), m);
    f.rotation.x = -Math.PI / 2; f.position.set((x1 + x2) / 2, y, (z1 + z2) / 2); f.receiveShadow = true; root.add(f);
    return f;
  };
  const wall = (x1, z1, x2, z2, h, c = 0xf6f0e4, p = root) => {
    const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
    rbox(p, w, h, d, c, (x1 + x2) / 2, h / 2, (z1 + z2) / 2, 0.06);
    return C(x1, z1, x2, z2);
  };

  // ---------- nature ----------
  const GREENS = [0x8fd06a, 0x7cc45c, 0xa3d977], PINKS = [0xf8b8cf, 0xf5a3c0, 0xfbcbdc];
  function tree(x, z, pink, s = 1, p = root, solid = true) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
    cyl(g, 0.15, 0.24, 1.3, 0xa0714d, 0, 0.65, 0, 8);
    const cs = pink ? PINKS : GREENS;
    ico(g, 1.0, cs[0], 0, 2.0, 0); ico(g, 0.75, cs[1], 0.65, 1.65, 0.25); ico(g, 0.72, cs[2], -0.6, 1.7, -0.15); ico(g, 0.62, cs[2], 0.05, 2.65, 0.1); ico(g, 0.6, cs[1], -0.1, 1.6, 0.6);
    g.rotation.y = x * 1.7 + z;
    if (solid) CB(x, z, 0.7, 0.7);
    W.anim.push(t => { g.rotation.z = Math.sin(t * 0.8 + x) * 0.012; });
    return g;
  }
  function bush(x, z, s = 1, p = root, c = 0x86c868) {
    ico(p, 0.55 * s, c, x, 0.4 * s, z); ico(p, 0.42 * s, 0x9ad67a, x + 0.45 * s, 0.32 * s, z + 0.1); ico(p, 0.38 * s, 0x7cc45c, x - 0.4 * s, 0.3 * s, z - 0.1);
  }
  const FL = [0xf48fb1, 0xffffff, 0xffd95a, 0xf9a8c4, 0xff8a80];
  function flowers(x, z, n = 6, r = 0.6, p = root, y = 0, col) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + x, d = r * (0.3 + ((i * 37) % 10) / 14);
      const fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d;
      cyl(p, 0.02, 0.02, 0.3, 0x6fae4f, fx, y + 0.15, fz, 5);
      sph(p, 0.11, col ?? FL[(i + Math.abs(Math.round(x))) % FL.length], fx, y + 0.33, fz, 8).scale.y = 0.7;
      sph(p, 0.05, 0xffd95a, fx, y + 0.37, fz, 6);
    }
  }
  function planter(x, z, w = 3, d = 1.2, pink = false) {
    rbox(root, w, 0.6, d, 0xf3ede2, x, 0.3, z, 0.12); rbox(root, w - 0.25, 0.1, d - 0.25, 0x8b6a4d, x, 0.58, z, 0.04);
    for (let i = -1; i <= 1; i++) flowers(x + i * w * 0.3, z, 5, 0.4, root, 0.6, pink ? 0xf48fb1 : undefined);
    bush(x, z, 0.6); CB(x, z, w, d);
  }
  function bench(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; root.add(g);
    rbox(g, 2.2, 0.12, 0.7, 0xd9a877, 0, 0.5, 0, 0.05); rbox(g, 2.2, 0.5, 0.12, 0xd9a877, 0, 0.9, -0.32, 0.05);
    for (const s of [-1, 1]) rbox(g, 0.12, 0.5, 0.6, 0x8a8f99, s * 0.9, 0.25, 0, 0.04);
    rot ? CB(x, z, 0.8, 2.2) : CB(x, z, 2.2, 0.8);
  }
  function lamp(x, z, p = root) {
    cyl(p, 0.06, 0.09, 2.6, 0x3a3d44, x, 1.3, z, 8); rbox(p, 0.36, 0.42, 0.36, glow(0xfff0b8, 0.9), x, 2.75, z, 0.08); cyl(p, 0.26, 0.2, 0.1, 0x3a3d44, x, 3.0, z, 8);
    CB(x, z, 0.3, 0.3);
  }
  function banner(x, z) {
    cyl(root, 0.05, 0.05, 3.4, 0x3a3d44, x, 1.7, z, 6); cyl(root, 0.25, 0.3, 0.1, 0x3a3d44, x, 0.05, z, 10);
    const b = rbox(root, 0.8, 1.8, 0.05, 0x86d92b, x + 0.45, 2.4, z, 0.03);
    rbox(root, 0.36, 0.36, 0.06, 0x2a2d33, x + 0.45, 2.6, z + 0.01, 0.06); rbox(root, 0.2, 0.2, 0.07, 0x86d92b, x + 0.45, 2.6, z + 0.02, 0.03);
    W.anim.push(t => { b.rotation.y = Math.sin(t * 1.6 + x) * 0.1; });
    CB(x, z, 0.3, 0.3);
  }
  function hedge(x1, x2, z) {
    rbox(root, x2 - x1, 0.9, 0.9, 0x86c868, (x1 + x2) / 2, 0.45, z, 0.3);
    for (let x = x1 + 0.5; x < x2; x += 1.1) ico(root, 0.42, 0x9ad67a, x, 0.85, z + Math.sin(x) * 0.1);
    C(x1, z - 0.45, x2, z + 0.45);
  }
  function laptop(p, x, y, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; p.add(g);
    rbox(g, 0.5, 0.03, 0.34, 0xc9ced6, 0, 0, 0, 0.01); const s = rbox(g, 0.5, 0.34, 0.03, 0xc9ced6, 0, 0.17, 0.18, 0.01); s.rotation.x = 0.25;
    rbox(g, 0.1, 0.1, 0.035, glow(0x86d92b, 0.6), 0, 0.2, 0.2, 0.02).rotation.x = 0.25;
  }
  // desk with a seat on the far (north) side; sitter faces the camera
  function desk(x, z, o = {}) {
    const w = o.w || 2.2, c = o.wood || 0xdcae7e;
    rbox(root, w, 0.1, 1.1, c, x, 0.82, z, 0.04);
    for (const s of [-1, 1]) rbox(root, 0.1, 0.8, 0.9, 0xb9bec7, x + s * (w / 2 - 0.15), 0.4, z, 0.03);
    if (o.monitor !== false) { rbox(root, 0.95, 0.6, 0.07, 0x2a2d33, x, 1.35, z + 0.3, 0.04); cyl(root, 0.05, 0.05, 0.3, 0x2a2d33, x, 1.0, z + 0.3, 6); rbox(root, 0.85, 0.5, 0.02, glow(o.screen ?? 0x9fe0ff, 0.5), x, 1.35, z + 0.26, 0.02); }
    else laptop(root, x, 0.88, z + 0.1);
    cyl(root, 0.07, 0.06, 0.14, [0xffffff, 0x86d92b, 0xf48fb1][Math.abs(Math.round(x)) % 3], x + 0.7, 0.94, z - 0.2, 8);
    rbox(root, 0.6, 0.1, 0.6, 0x4a5568, x, 0.5, z - 1.0, 0.05); rbox(root, 0.6, 0.6, 0.1, 0x4a5568, x, 0.9, z - 1.3, 0.05); cyl(root, 0.05, 0.05, 0.5, 0x8a8f99, x, 0.25, z - 1.0, 6);
    C(x - w / 2, z - 1.4, x + w / 2, z + 0.55);
    const seat = { x, z: z - 1.0, face: 0 }; W.seats.push(seat); return seat;
  }
  function pot(x, z, p = root, s = 1) { cyl(p, 0.3 * s, 0.22 * s, 0.5 * s, 0xf3ede2, x, 0.25 * s, z, 10); ico(p, 0.45 * s, 0x7cc45c, x, 0.85 * s, z); ico(p, 0.3 * s, 0x9ad67a, x + 0.2 * s, 1.2 * s, z); CB(x, z, 0.6 * s, 0.6 * s); }

  // ---------- ground ----------
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(170, 150), mat(0xb9de8e)); grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.02, 5); grass.receiveShadow = true; root.add(grass);
  for (let i = 0; i < 40; i++) { const x = ((i * 53) % 96) - 48, z = ((i * 31) % 50) - 8; const d = cyl(root, 1.2 + (i % 3) * 0.5, 1.2, 0.02, i % 2 ? 0xaed783 : 0xc4e59b, x, -0.005, z, 10); d.castShadow = false; }
  const pave = tileTex('#f7ecdc', '#f4e7d5', '#ebdcc6');
  floor(-17, 0.8, 17, 33.5, 0, 0.01, pave, 4.25);
  floor(15, 27.5, 24, 34.5, 0xd8d3cc, 0.012);
  floor(-3, 1, 3, 33, 0xfaf1e3, 0.02).material = mat(0xf9efe0);

  // ---------- courtyard ----------
  W.pts.display = [9, 14];
  const dg = new THREE.Group(); dg.position.set(9, 0, 14); root.add(dg);
  rbox(dg, 2.2, 0.7, 2.2, 0x4a4d55, 0, 0.35, 0, 0.1); rbox(dg, 2.5, 0.12, 2.5, glow(0x9be34a, 0.9), 0, 0.06, 0, 0.05);
  const dgpu = makeGPU(1.1); dgpu.position.y = 1.5; dgpu.rotation.z = 0.5; dg.add(dgpu);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2, 1.9), new THREE.MeshStandardMaterial({ color: 0xcffff0, transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false })); glass.position.y = 1.7; dg.add(glass);
  const ge = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: 0xb6ff6a })); ge.position.y = 1.7; dg.add(ge);
  W.anim.push(t => { dgpu.rotation.y = t * 0.8; dgpu.position.y = 1.55 + Math.sin(t * 2) * 0.08; });
  CB(9, 14, 2.4, 2.4);

  planter(-9, 8, 3.4, 1.3, true); planter(9, 6.5, 3.4, 1.3); planter(-6, 21, 3, 1.2); planter(7, 24, 3, 1.2, true); planter(14.5, 12, 1.3, 3.2);
  bench(-13.5, 14.5, Math.PI / 2); bench(13, 21); bench(-2.2, 29.5);
  hedge(-15, -8.5, 11.5); hedge(2.5, 8.5, 28.5); hedge(11, 16, 17.5); hedge(-9, -4, 26);
  lamp(-4.2, 5); lamp(4.2, 5); lamp(-4.2, 18); lamp(4.2, 18); lamp(-4.2, 30); lamp(9.5, 33);
  banner(-5.6, 2.6); banner(4.6, 2.6);
  // picnic work tables
  for (const [x, z] of [[-10.5, 17], [-12, 23.5], [13, 8.5]]) { const s = desk(x, z, { monitor: false, wood: 0xe2b98d }); s.out = true; }
  // pond
  const pond = cyl(root, 3, 3, 0.06, mat(0x8fd3e8, { roughness: 0.2 }), -13, 0.02, 30, 24); pond.castShadow = false; pond.scale.z = 0.75;
  for (let i = 0; i < 9; i++) { const a = i * 0.7; ico(root, 0.3 + (i % 3) * 0.1, 0xc9c5bf, -13 + Math.cos(a) * 3.1, 0.12, 30 + Math.sin(a) * 2.35, 0); }
  sph(root, 0.35, 0x8fd06a, -13.6, 0.04, 30.3, 10).scale.y = 0.1; sph(root, 0.12, 0xf8b8cf, -13.6, 0.1, 30.3, 8);
  CB(-13, 30, 5.6, 4.2);
  // trees ring
  const T = [[-21, 4, 1], [-20.5, 9.5, 0], [-21.5, 15, 0], [-20, 20.5, 1], [-21.5, 26, 0], [-20, 32, 0], [21, 4.5, 0], [20.5, 10, 1], [21.5, 16, 0], [20.5, 22, 0],
    [-16, 35.5, 0], [-9, 36, 1], [-2, 36.5, 0], [5, 36, 0], [11, 36.5, 1], [-17, 5, 1], [17.5, 4, 1], [-16.5, 19.5, 0], [16.5, 24.5, 1], [-17, 26, 1]];
  T.forEach(([x, z, p], i) => tree(x, z, p, 0.95 + (i % 4) * 0.12));
  for (let i = 0; i < 26; i++) tree(((i * 47) % 30) - 15 + (i % 2 ? 36 : -38), ((i * 29) % 46) - 6, i % 5 === 0, 1 + (i % 3) * 0.15, root, false);
  for (let i = 0; i < 14; i++) tree(-30 + i * 4.6, 41 + (i % 3) * 2, i % 4 === 1, 1.1, root, false);
  for (const [x, z] of [[-19, 12], [-18.5, 23], [19, 7], [19.5, 19], [-6, 35], [8, 35], [-19, 29], [18.5, 13.5]]) bush(x, z, 1.1);
  for (const [x, z] of [[-18.5, 7], [-19, 17.5], [19, 25.5], [0.5, 35.2], [-12, 35], [18.6, 16], [-18.2, 33], [14, 35.3]]) flowers(x, z, 7, 0.9);
  W.pts.flowers = [[-15, 6.5], [15.3, 21.5], [-4, 32.2]];
  for (const [x, z] of W.pts.flowers) { cyl(root, 1, 1.1, 0.16, 0x9a7654, x, 0.08, z, 12); flowers(x, z, 9, 0.8, root, 0.12, 0xf06292); }
  C(-40, 0, -22.5, 45); C(22.6, 0, 40, 27.4); C(24, 27, 40, 45); C(-40, 34.6, 40, 45);
  // getaway van
  const van = new THREE.Group(); van.position.set(20, 0, 31); root.add(van); W.van = van; W.pts.van = [20, 31];
  rbox(van, 3.6, 1.6, 1.9, 0xfdfbf5, 0, 1.15, 0, 0.25); rbox(van, 1.1, 0.8, 1.7, mat(0x9fd4e8, { roughness: 0.2 }), 1.35, 1.5, 0, 0.1); rbox(van, 3.7, 0.25, 1.95, 0xf48fb1, 0, 0.55, 0, 0.08);
  for (const x of [-1.1, 1.2]) for (const z of [-0.9, 0.9]) cyl(van, 0.36, 0.36, 0.25, 0x2a2d33, x, 0.36, z, 12).rotation.x = Math.PI / 2;
  label(van, 'TOTALLY NORMAL\nFLORIST', 2.1, 0.8, -0.55, 1.25, 0.96, { color: '#d8468a', size: 50 });
  W.vanCol = CB(20, 31, 3.8, 2);

  // ---------- HQ building ----------
  const WALL = 0xf6f0e4, DARK = 0x565a63;
  const fac = new THREE.Group(); root.add(fac);
  for (const s of [-1, 1]) {
    rbox(fac, 19.9, 0.5, 0.9, DARK, s * 12.45, 0.25, 0.4, 0.05);
    for (let i = 0; i <= 5; i++) rbox(fac, 0.35, 4.2, 0.6, DARK, s * (2.5 + i * 3.98), 2.1, 0.4, 0.05);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(19.9, 3.6, 0.2), mat(0xa9dcec, { roughness: 0.15, transparent: true, opacity: 0.55 })); gl.position.set(s * 12.45, 2.3, 0.4); fac.add(gl);
    C(s * 2.5, 0, s * 22.4, 0.8);
  }
  rbox(fac, 44.8, 1.7, 1.1, DARK, 0, 5.0, 0.4, 0.12);
  rbox(fac, 7, 0.18, 2.2, 0x6b7079, 0, 4.05, 1.3, 0.06);
  rbox(fac, 1.3, 1.3, 0.2, 0x86d92b, -3.3, 5.0, 1.0, 0.25); rbox(fac, 0.75, 0.75, 0.24, DARK, -3.3, 5.0, 1.02, 0.18); rbox(fac, 0.36, 0.36, 0.28, 0x86d92b, -3.3, 5.0, 1.04, 0.08);
  label(fac, 'NVIDIA', 5.2, 1.3, 0.6, 5.0, 0.97, { size: 110 });
  for (let x = -21; x <= 21; x += 2.1) if (Math.abs(x) > 5 || Math.round(x) % 2) bush(x, 0.4 + Math.sin(x) * 0.15, 1 + (Math.abs(x * 7) % 3) * 0.12, (() => { const g = new THREE.Group(); g.position.y = 5.8; fac.add(g); return g; })());
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) ico(fac, 0.42 - i * 0.02, i % 2 ? 0x9ad67a : 0x86c868, s * (22 - (i % 2) * 0.5), 5.4 - i * 0.6, 0.95);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) ico(fac, 0.36, i % 2 ? 0x9ad67a : 0x86c868, s * (9.3 + (i % 2) * 0.4), 5.6 - i * 0.55, 0.98);
  const fm = new Map();
  fac.traverse(o => { if (o.material) { let m = fm.get(o.material); if (!m) { m = o.material.clone(); m.transparent = true; m.userData.base = o.material.opacity ?? 1; fm.set(o.material, m); W.fade.push(m); } o.material = m; } });
  W.facade = fac;

  // outer + inner walls (east-west dividers are low cutaways)
  wall(-22.4, 0, -22, -28.4, 2.6); wall(22, 0, 22.4, -28.4, 2.6); wall(-22.4, -28.4, 22.4, -28, 3.2);
  wall(7, 0, 7.4, -6, 2.4); wall(7, -9, 7.4, -15, 2.4);
  wall(-22, -15, -9, -14.6, 1.5); wall(-6, -15, 22, -14.6, 1.5);
  // floors
  floor(-22, -14.6, 7, 0.8, 0, 0.01, tileTex('#f3e7d3', '#efe1cb', '#e3d3ba', 2), 4);
  floor(7, -14.6, 22, 0.8, 0xead9c6);
  floor(-22, -28, 22, -15, 0, 0.01, tileTex('#e3f1ea', '#dcece4', '#c9dfd4', 2), 3);
  rbox(root, 4.5, 0.04, 2, 0xa3d977, 0, 0.03, -1.4, 0.02); // welcome mat

  // ---------- open-plan office ----------
  W.pts.reception = [3.2, -5.4];
  rbox(root, 3.2, 1.1, 0.9, 0xf6f0e4, 4.4, 0.55, -3.2, 0.15); rbox(root, 3.3, 0.1, 1.0, 0xdcae7e, 4.4, 1.12, -3.2, 0.04); rbox(root, 1.2, 0.3, 0.06, 0x86d92b, 4.4, 0.6, -3.67, 0.03);
  label(root, 'RECEPTION', 2.2, 0.36, 4.4, 0.6, -2.73, { size: 60, color: '#565a63', tw: 512, th: 96 }).rotation.y = 0;
  laptop(root, 5.2, 1.18, -3.2, Math.PI); CB(4.4, -3.2, 3.2, 0.9); W.pts.recepSeat = [4.2, -2.0];
  for (const x of [-18.5, -14, -9.5]) for (const z of [-3.6, -10]) desk(x, z, { screen: [0x9fe0ff, 0xb6ff6a, 0xffd0e4][Math.abs(x + z | 0) % 3] });
  desk(-2.6, -10);
  // roadmap whiteboard on the lab divider
  W.pts.board = [2.2, -12.4];
  rbox(root, 4.4, 2.1, 0.12, 0xb9bec7, 2.2, 1.75, -14.35, 0.05);
  const bt = textTex((c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8363a'; c.font = '800 44px sans-serif'; c.fillText('SECRET ROADMAP', 24, 54);
    c.font = '700 30px sans-serif'; c.fillStyle = '#333'; ['2027: more GPU', '2028: MORE GPU', '2029: only GPU'].forEach((s, i) => c.fillText(s, 24, 110 + i * 44));
    c.strokeStyle = '#76b900'; c.lineWidth = 8; c.beginPath(); c.moveTo(330, 220); c.lineTo(390, 170); c.lineTo(440, 185); c.lineTo(495, 60); c.stroke();
  }, 512, 256);
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 1.85), new THREE.MeshBasicMaterial({ map: bt })); bm.position.set(2.2, 1.75, -14.28); root.add(bm);
  // water cooler, plants, sofa
  cyl(root, 0.3, 0.3, 1.0, 0xf6f0e4, -4.5, 0.5, -13.6, 12); cyl(root, 0.26, 0.26, 0.6, mat(0x9fd4e8, { transparent: true, opacity: 0.7 }), -4.5, 1.3, -13.6, 12); CB(-4.5, -13.6, 0.7, 0.7);
  pot(-21, -1.2); pot(6.2, -13.8); pot(-21, -13.6); pot(-6.4, -1.2, root, 0.9);
  rbox(root, 3, 0.5, 1.1, 0x8fb8de, -13.5, 0.3, -13.6, 0.2); rbox(root, 3, 0.9, 0.3, 0x8fb8de, -13.5, 0.6, -14.1, 0.14); CB(-13.5, -13.7, 3, 1.2);

  // ---------- GPU lab ----------
  W.pts.labDoor = [-7.5, -12.6]; W.pts.pedestal = [-2, -22];
  const door = rbox(root, 3, 2.3, 0.3, mat(0x7d8794, { metalness: 0.3, roughness: 0.4 }), -7.5, 1.15, -14.8, 0.06);
  rbox(door, 2.4, 0.3, 0.05, glow(0xff5a5a, 1), 0, 0.5, 0.16, 0.03);
  label(door, 'SECRET GPU LAB', 2.4, 0.4, 0, -0.1, 0.17, { size: 54, tw: 512, th: 96 });
  W.doors.lab = { mesh: door, col: C(-9, -15, -6, -14.6), open: false, k: 0, led: door.children[0] };
  rbox(root, 0.3, 1.2, 0.3, 0x565a63, -5.4, 0.6, -14.2, 0.05); rbox(root, 0.24, 0.3, 0.06, glow(0x86d92b, 1), -5.4, 1.05, -14.03, 0.02);
  const ped = new THREE.Group(); ped.position.set(-2, 0, -22); root.add(ped);
  cyl(ped, 1.5, 1.7, 0.3, 0x565a63, 0, 0.15, 0, 20); cyl(ped, 0.8, 1.0, 0.9, 0x6b7079, 0, 0.75, 0, 16); cyl(ped, 1.75, 1.75, 0.06, glow(0x9be34a, 1.2), 0, 0.03, 0, 24);
  const sgpu = makeGPU(1.25); sgpu.position.y = 1.9; ped.add(sgpu); W.secretGPU = sgpu;
  const pl = new THREE.PointLight(0x9be34a, 30, 12, 1.6); pl.position.set(-2, 2.4, -22); root.add(pl);
  W.anim.push(t => { sgpu.rotation.y = -t; sgpu.position.y = 1.9 + Math.sin(t * 2.4) * 0.1; pl.intensity = 26 + Math.sin(t * 3) * 8; });
  CB(-2, -22, 2.6, 2.6);
  const CH = [0x9be34a, 0x5ee6ff, 0xff7ad9, 0xffd95a];
  [[-15, -19.5], [-15, -24.5], [9, -19.5], [9, -24.5], [16.5, -22]].forEach(([x, z], k) => {
    rbox(root, 3.4, 0.9, 1.3, 0xffffff, x, 0.45, z, 0.1); rbox(root, 3.5, 0.06, 1.4, 0xcfe3da, x, 0.93, z, 0.03);
    for (let i = 0; i < 3; i++) { rbox(root, 0.5, 0.06, 0.5, 0x2a2d33, x - 1.1 + i * 1.1, 0.99, z, 0.02); const c = rbox(root, 0.3, 0.05, 0.3, glow(CH[(i + k) % 4], 1.6), x - 1.1 + i * 1.1, 1.03, z, 0.02); W.anim.push(t => { c.position.y = 1.08 + Math.sin(t * 2 + i + k) * 0.04; c.rotation.y = t + i; }); }
    CB(x, z, 3.4, 1.3);
  });
  for (let x = -20.4; x <= 20.5; x += 2.4) {
    rbox(root, 1.9, 2.8, 0.9, 0x3a3d44, x, 1.4, -27.3, 0.08);
    for (let j = 0; j < 5; j++) { const l = box(root, 1.4, 0.07, 0.03, glow(j % 2 ? 0x9be34a : 0x5ee6ff, 1.2), x, 0.6 + j * 0.45, -26.84); const ph = x * 3 + j; W.anim.push(t => { l.visible = Math.sin(t * (3 + j) + ph) > -0.5; }); }
  }
  C(-22, -28, 22, -26.8);
  for (const z of [-17.2, -25.8]) { const s = box(root, 30, 0.02, 0.12, glow(0x9be34a, 0.8), -2, 0.02, z); s.castShadow = false; }

  // ---------- executive office ----------
  W.pts.exec = [14.5, -9.5]; W.pts.elev = [19.5, -12];
  rbox(root, 7, 0.04, 5, 0xc9dba8, 14.5, 0.03, -7, 0.02); rbox(root, 6.4, 0.045, 4.4, 0xdcebbb, 14.5, 0.035, -7, 0.02);
  const es = desk(14.5, -6.2, { w: 3.4, wood: 0xb98558, screen: 0xb6ff6a }); W.pts.execSeat = [es.x, es.z]; W.seats.pop();
  rbox(root, 0.6, 0.06, 0.45, 0xd8363a, 13.4, 0.9, -6.2, 0.02); rbox(root, 0.6, 0.05, 0.45, 0xf6f0e4, 13.45, 0.95, -6.25, 0.02).rotation.y = 0.2;
  label(root, 'TOP SECRET', 0.5, 0.14, 13.4, 0.985, -6.2, { size: 60, color: '#d8363a', tw: 512, th: 128 }).rotation.x = -Math.PI / 2;
  // the jacket rack
  W.pts.rack = [10.5, -12.6];
  cyl(root, 0.04, 0.04, 4.6, 0x8a8f99, 10.5, 2.1, -13.9, 6).rotation.z = Math.PI / 2;
  for (const x of [8.3, 12.7]) cyl(root, 0.05, 0.05, 2.1, 0x8a8f99, x, 1.05, -13.9, 6);
  for (let i = 0; i < 6; i++) { rbox(root, 0.62, 1.0, 0.26, mat(0x1d1d22, { roughness: 0.38, metalness: 0.15 }), 8.8 + i * 0.68, 1.5, -13.9, 0.1); }
  CB(10.5, -13.9, 4.6, 0.6);
  // elevator
  rbox(root, 3, 3.3, 1.2, 0x8a8f99, 19.5, 1.65, -13.9, 0.08); rbox(root, 1.1, 2.5, 0.06, 0xc9ced6, 18.93, 1.3, -13.28, 0.03); rbox(root, 1.1, 2.5, 0.06, 0xc9ced6, 20.07, 1.3, -13.28, 0.03);
  rbox(root, 0.5, 0.3, 0.06, glow(0xffd95a, 1.2), 19.5, 2.85, -13.28, 0.05); label(root, 'ROOFTOP ↑', 1.6, 0.3, 19.5, 3.05, -13.2, { size: 60, color: '#565a63', tw: 512, th: 96 });
  CB(19.5, -13.9, 3, 1.2);
  rbox(root, 1.1, 0.5, 2.8, 0xe8a87c, 20.9, 0.3, -3, 0.2); rbox(root, 0.3, 1, 2.8, 0xe8a87c, 21.5, 0.5, -3, 0.14); CB(21, -3, 1.4, 2.8);
  pot(8.4, -1.2, root, 1.2); pot(21, -9.5);
  for (let i = 0; i < 3; i++) { cyl(root, 0.12, 0.16, 0.1, 0xb98558, 9 + i * 0.7, 0.05 + 1.1, -0.3, 8); sph(root, 0.14, mat(0xf4c542, { metalness: 0.7, roughness: 0.25 }), 9 + i * 0.7, 1.35, -0.3, 10); }
  rbox(root, 2.6, 1.1, 0.6, 0xdcae7e, 9.7, 0.55, -0.3, 0.06); CB(9.7, -0.3, 2.6, 0.7);

  // ---------- rooftop restaurant ----------
  const R = new THREE.Group(); R.position.set(RX, 0, RZ); root.add(R);
  const city = new THREE.Mesh(new THREE.PlaneGeometry(140, 120), mat(0x5a528a)); city.rotation.x = -Math.PI / 2; city.position.y = -9; R.add(city);
  for (let i = 0; i < 46; i++) {
    const a = i * 1.37, d = 17 + (i * 7) % 26, x = Math.cos(a) * d * 1.3, z = Math.sin(a) * d - 4, h = 4 + (i * 5) % 6;
    if (Math.abs(x) < 12 && Math.abs(z) < 11) continue;
    const b = rbox(R, 5 + (i % 3) * 2, h, 5 + (i % 2) * 2, [0x6a6396, 0x7a70a8, 0x5a5488][i % 3], x, -9 + h / 2, z, 0.15); b.castShadow = false;
    for (let j = 0; j < 4; j++) box(R, 0.5, 0.5, 0.05, glow(0xffe29a, 1.3), x - 1.4 + (j % 2) * 2.4 + (i % 2) * 0.3, -9 + h - 0.9 - Math.floor(j / 2) * 1.2, z + 2.55 + (i % 2)).castShadow = false;
  }
  rbox(R, 19, 4, 17, 0x8d86b5, 0, -2.02, 0, 0.1);
  const deck = floor(RX - 9, RZ - 8, RX + 9, RZ + 8, 0, 0.01, tileTex('#e6c7a6', '#dfbd99', '#c9a580', 2), 3);
  wall(RX - 9.5, RZ - 8.5, RX + 9.5, RZ - 8, 0.8, 0xf6f0e4); wall(RX - 9.5, RZ + 8, RX + 9.5, RZ + 8.5, 0.8, 0xf6f0e4);
  wall(RX - 9.5, RZ - 8.5, RX - 9, RZ + 8.5, 0.8, 0xf6f0e4); wall(RX + 9, RZ - 8.5, RX + 9.5, RZ + 8.5, 0.8, 0xf6f0e4);
  function table(x, z, main) {
    cyl(R, 0.95, 0.95, 0.06, 0xfffdf8, x, 0.85, z, 20); cyl(R, 1.0, 1.05, 0.5, 0xfffdf8, x, 0.6, z, 20); cyl(R, 0.1, 0.3, 0.8, 0x8a8f99, x, 0.4, z, 8);
    cyl(R, 0.05, 0.05, 0.3, 0xfff6e0, x, 1.03, z, 6); const f = sph(R, 0.07, glow(0xffb347, 2.5), x, 1.24, z, 8); W.anim.push(t => { f.scale.setScalar(1 + Math.sin(t * 13 + x) * 0.2); });
    for (const s of [-1, 1]) { cyl(R, 0.22, 0.22, 0.02, 0xffffff, x + s * 0.5, 0.89, z, 12); rbox(R, 0.6, 0.1, 0.6, 0xd9a877, x + s * 1.5, 0.5, z, 0.05); rbox(R, 0.1, 0.7, 0.6, 0xd9a877, x + s * 1.8, 0.85, z, 0.05); }
    if (main) { const l = new THREE.PointLight(0xffb060, 14, 8, 1.5); l.position.set(x, 1.8, z); R.add(l); sph(R, 0.1, 0xd8363a, x + 0.15, 0.95, z - 0.3, 8); cyl(R, 0.015, 0.015, 0.3, 0x6fae4f, x + 0.15, 0.95, z - 0.3, 4); }
    CB(RX + x, RZ + z, 2.0, 1.6);
  }
  table(0, 0, true); table(-5.5, 4.5); table(5.5, -4); table(5.5, 4.8); table(-5, -3);
  W.pts.table = [RX, RZ + 1.6]; W.pts.seatJ = [RX - 1.5, RZ]; W.pts.seatS = [RX + 1.5, RZ]; W.pts.roofElev = [RX - 7, RZ - 6.2];
  W.pts.diners = [[RX - 7, RZ + 4.5, 1], [RX - 4, RZ + 4.5, -1], [RX + 4, RZ - 4, 1], [RX + 7, RZ - 4, -1], [RX + 4, RZ + 4.8, 1]];
  rbox(R, 2.6, 3, 1.2, 0x8a8f99, -7, 1.5, -7.4, 0.08); rbox(R, 0.95, 2.3, 0.06, 0xc9ced6, -7.5, 1.2, -6.78, 0.03); rbox(R, 0.95, 2.3, 0.06, 0xc9ced6, -6.5, 1.2, -6.78, 0.03); CB(RX - 7, RZ - 7.4, 2.6, 1.2);
  const poles = [[-8.6, -7.6], [8.6, -7.6], [8.6, 7.6], [-8.6, 7.6]];
  poles.forEach(([x, z], i) => {
    cyl(R, 0.06, 0.06, 3.6, 0x565a63, x, 1.8, z, 6);
    const [nx, nz] = poles[(i + 1) % 4];
    for (let k = 1; k < 9; k++) { const u = k / 9; sph(R, 0.1, glow([0xffe29a, 0xffb3c7, 0xc8f59a][k % 3], 2), x + (nx - x) * u, 3.5 - Math.sin(u * Math.PI) * 0.7, z + (nz - z) * u, 6).castShadow = false; }
  });
  cyl(R, 0.06, 0.06, 4, 0x565a63, 0, 2, -7.6, 6);
  for (const [x, z] of [[8, 7], [-8, 7], [8, -7]]) { rbox(R, 1.3, 0.6, 1.3, 0xf3ede2, x, 0.3, z, 0.1); tree(x, z, true, 0.75, R, false).position.y = 0.4; CB(RX + x, RZ + z, 1.3, 1.3); }
  for (let x = -6; x <= 6; x += 3) flowers(x, 7.7, 5, 0.5, R, 0.8);
  rbox(R, 3.4, 1.1, 0.9, 0xb98558, 1.5, 0.55, -7.3, 0.1); for (let i = 0; i < 5; i++) cyl(R, 0.09, 0.07, 0.4, [0x86d92b, 0xf48fb1, 0xffd95a][i % 3], 0.3 + i * 0.6, 1.3, -7.4, 8); CB(RX + 1.5, RZ - 7.3, 3.4, 0.9);
  label(R, 'Chez GPU', 2.4, 0.5, 1.5, 0.6, -6.84, { size: 70, color: '#fff3d6', tw: 512, th: 110 });
  return W;
}
