/* ════════════════════════════════════════════════════════════════════
   The cup, as geometry.

   A vessel is a 2D outline spun around the Y axis. Every profile point
   is (radius, height): walk UP the outside, over the rim, back DOWN the
   inside, then in to the axis to cap the floor. Radius must stay above
   zero, which is why floors end at 0.001 rather than 0.

   Shared by index.html and vessels.html.
   ══════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

/* ── profiles ─────────────────────────────────────────────────────── */

/* Hollow open vessel from any outer-radius curve r(t): t = 0 at the
   floor, 1 at the rim. Covers most drinkware on its own. */
export function hollow({ h, wall, r, rim = 0, steps = 22 }){
  const p = [];
  for(let i = 0; i <= steps; i++){                 // outside, floor → rim
    const t = i / steps;
    p.push(new THREE.Vector2(r(t), t * h));
  }
  if(rim){                                          // rolled lip
    p.push(new THREE.Vector2(r(1) + rim, h + rim * 0.6));
    p.push(new THREE.Vector2(r(1) - wall, h - rim * 0.3));
  }
  for(let i = steps; i >= 1; i--){                  // inside, rim → floor
    const t = i / steps;
    p.push(new THREE.Vector2(Math.max(r(t) - wall, 0.02), Math.max(t * h, wall)));
  }
  p.push(new THREE.Vector2(0.001, wall));           // seal the floor
  return p;
}

const lerp = (a, b) => t => a + (b - a) * t;

export const VESSELS = {
  'Paper cup': {
    note: 'straight taper, rolled rim', h: 1.24, fill: .86, label: 'wrap',
    profile: hollow({ h:1.24, wall:.028, rim:.035, r: lerp(.42, .60) })
  },
  'Tumbler': {
    note: 'constant radius, thick glass floor', h: 1.15, fill: .80, glass: true, label: 'patch',
    profile: (() => {
      const p = hollow({ h:1.15, wall:.05, r: () => .52 });
      p[p.length - 1] = new THREE.Vector2(0.001, 0.13);
      return p;
    })()
  },
  'Bell glass': {
    note: 'r(t) is a curve — the classic chocolat chaud', h: 1.2, fill: .72, glass: true, label: 'patch',
    profile: hollow({ h:1.2, wall:.035, r: t => .30 + .34 * Math.sin(t * 2.1) })
  },
  'Mug': {
    note: 'a lathe plus a torus', h: 1.05, fill: .82, handle: true, label: 'wrap',
    profile: hollow({ h:1.05, wall:.06, r: lerp(.50, .54) })
  },
  'Goblet': {
    note: 'bowl, stem and foot in one outline', h: 1.5, fill: .62, glass: true, label: 'none',
    profile: [
      new THREE.Vector2(0.001, 0.02), new THREE.Vector2(0.40, 0.02),
      new THREE.Vector2(0.40, 0.05),  new THREE.Vector2(0.09, 0.13),
      new THREE.Vector2(0.05, 0.30),  new THREE.Vector2(0.05, 0.58),
      new THREE.Vector2(0.16, 0.68),  new THREE.Vector2(0.34, 0.86),
      new THREE.Vector2(0.42, 1.12),  new THREE.Vector2(0.43, 1.50),
      new THREE.Vector2(0.40, 1.50),  new THREE.Vector2(0.39, 1.14),
      new THREE.Vector2(0.31, 0.90),  new THREE.Vector2(0.14, 0.72),
      new THREE.Vector2(0.03, 0.62),  new THREE.Vector2(0.001, 0.60)
    ]
  }
};

/* ── marshmallows ─────────────────────────────────────────────────────
   Round ones are lathes. Shaped ones are ExtrudeGeometry with a bevel,
   which is what puffs the edges and makes them read as soft.
   ─────────────────────────────────────────────────────────────────── */

function cylinderMallow(r = .085, hh = .055, fillet = .022){
  const p = [], q = 5;
  p.push(new THREE.Vector2(0.001, -hh));
  p.push(new THREE.Vector2(r - fillet, -hh));
  for(let i = 0; i <= q; i++){
    const a = -Math.PI / 2 + (i / q) * (Math.PI / 2);
    p.push(new THREE.Vector2(r - fillet + Math.cos(a) * fillet, -hh + fillet + Math.sin(a) * fillet));
  }
  for(let i = 0; i <= q; i++){
    const a = (i / q) * (Math.PI / 2);
    p.push(new THREE.Vector2(r - fillet + Math.cos(a) * fillet, hh - fillet + Math.sin(a) * fillet));
  }
  p.push(new THREE.Vector2(0.001, hh));
  return new THREE.LatheGeometry(p, 28);
}

function puff(shape, depth = .05, bevel = .022){
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled:true, bevelSize:bevel, bevelThickness:bevel,
    bevelSegments:4, curveSegments:14
  });
  g.center();
  g.rotateX(-Math.PI / 2);          // lie flat, thickness now vertical
  return g;
}

function heartShape(s = .1){
  const h = new THREE.Shape();
  h.moveTo(0, -1.1 * s);
  h.bezierCurveTo(-1.5 * s, .2 * s, -.9 * s, 1.2 * s, 0, .55 * s);
  h.bezierCurveTo(.9 * s, 1.2 * s, 1.5 * s, .2 * s, 0, -1.1 * s);
  return h;
}

function starShape(points = 5, outer = .11, inner = .05){
  const s = new THREE.Shape();
  for(let i = 0; i < points * 2; i++){
    const rad = i % 2 ? inner : outer;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
      : s.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  s.closePath();
  return s;
}

function pillowShape(w = .085, r = .03){
  const s = new THREE.Shape();
  s.moveTo(-w + r, -w);
  s.lineTo(w - r, -w);  s.quadraticCurveTo(w, -w, w, -w + r);
  s.lineTo(w, w - r);   s.quadraticCurveTo(w, w, w - r, w);
  s.lineTo(-w + r, w);  s.quadraticCurveTo(-w, w, -w, w - r);
  s.lineTo(-w, -w + r); s.quadraticCurveTo(-w, -w, -w + r, -w);
  return s;
}

export const MALLOWS = {
  Cylinder: () => cylinderMallow(),
  Pillow:   () => puff(pillowShape(), .055, .025),
  Heart:    () => puff(heartShape(), .045, .018),
  Star:     () => puff(starShape(), .04, .016),
  Sphere:   () => new THREE.SphereGeometry(.075, 20, 14),
  None:     () => null
};

/* nominal half-width of each shape at size 1, used to keep marshmallows
   inside the rim however big they are scaled */
const MALLOW_R = { Cylinder:.085, Pillow:.11, Heart:.115, Star:.115, Sphere:.075, None:0 };

/* ── materials ────────────────────────────────────────────────────── */
/* ── the liquid, coloured in OKLCH ────────────────────────────────────
   OKLCH is perceptually uniform: hold L and C, sweep H, and every hue
   keeps the same apparent lightness — which sRGB emphatically does not.
   The conversion runs in the fragment shader so L, C and H are live
   uniforms, and so depth can darken the colour toward the bottom of
   the cup without needing a second material.
   ─────────────────────────────────────────────────────────────────── */
export const DEFAULT_LIQUID = { l: 0.327, c: 0.051, h: 47 };   // #4a2c1d

const OKLCH_GLSL = `
uniform vec3  uOklch;    // L, C, H in degrees
uniform float uDepth;    // how much darker the bottom sits, 0–1
varying float vSurfT;    // 0 at the base of the liquid, 1 at the surface

vec3 oklchToLinear(float L, float C, float Hdeg){
  float h = radians(Hdeg);
  float a = C * cos(h);
  float b = C * sin(h);
  float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  float s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  vec3 lms = vec3(l_ * l_ * l_, m_ * m_ * m_, s_ * s_ * s_);
  return vec3(
     4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
    -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
    -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z
  );
}

vec3 cocoaAt(float t){
  float L = uOklch.x * mix(1.0 - uDepth, 1.0, t);
  return max(oklchToLinear(L, uOklch.y, uOklch.z), vec3(0.0));
}
`;

export function makeLiquid(){
  const m = new THREE.MeshStandardMaterial({ roughness:.34, metalness:.05 });

  m.userData.uOklch = { value: new THREE.Vector3(
    DEFAULT_LIQUID.l, DEFAULT_LIQUID.c, DEFAULT_LIQUID.h) };
  m.userData.uDepth = { value: 0.32 };
  m.userData.uHalfH = { value: 0.5 };

  m.onBeforeCompile = shader => {
    shader.uniforms.uOklch = m.userData.uOklch;
    shader.uniforms.uDepth = m.userData.uDepth;
    shader.uniforms.uHalfH = m.userData.uHalfH;

    shader.vertexShader =
      'varying float vSurfT;\nuniform float uHalfH;\n' +
      shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  vSurfT = clamp((position.y + uHalfH) / max(2.0 * uHalfH, 1e-4), 0.0, 1.0);');

    shader.fragmentShader =
      OKLCH_GLSL + shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\n  diffuseColor.rgb = cocoaAt(vSurfT);');
  };
  return m;
}

export const MATERIALS = {
  paper:  new THREE.MeshStandardMaterial({ color:0xf2f2f2, roughness:.92, side:THREE.DoubleSide }),
  glass:  new THREE.MeshPhysicalMaterial({ color:0xffffff, roughness:.08, transmission:.92,
                                           thickness:.4, ior:1.45, transparent:true, side:THREE.DoubleSide }),
  cocoa:  makeLiquid(),
  mallow: new THREE.MeshStandardMaterial({ color:0xfbf7f2, roughness:.95 })
};

/* live — no rebuild, no recompile. Pass a material to colour one cup
   on its own; omit it and you set the shared one. */
export function setLiquid({ l, c, h, depth }, mat = MATERIALS.cocoa){
  const u = mat.userData;
  if(l !== undefined) u.uOklch.value.x = l;
  if(c !== undefined) u.uOklch.value.y = c;
  if(h !== undefined) u.uOklch.value.z = h;
  if(depth !== undefined) u.uDepth.value = depth;
}

/* Map cups are ~30px tall: too small for a label, but big enough to
   read as a colour. One opaque material per distinct tint — and never
   transmission at this size, which is expensive and reads grey anyway. */
const tintCache = new Map();
export function tintedShell(hex){
  if(!tintCache.has(hex)){
    tintCache.set(hex, new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex), roughness: .9, side: THREE.DoubleSide
    }));
  }
  return tintCache.get(hex);
}

/* the same maths on the CPU, for swatches and any non-shader use */
export function oklchToHex(l, c, hDeg){
  const h = hDeg * Math.PI / 180;
  const a = c * Math.cos(h), b = c * Math.sin(h);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  const L = l_ ** 3, M = m_ ** 3, S = s_ ** 3;
  const lin = [
     4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.7076147010 * S
  ];
  const enc = v => {
    v = Math.max(0, Math.min(1, v));
    const srgb = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255).toString(16).padStart(2, '0');
  };
  return '#' + lin.map(enc).join('');
}

/* ── reading the profile ──────────────────────────────────────────────
   Slice the outline at height y. A hollow vessel gives two crossings —
   the outside wall and the inside one — so the widest is the outside
   and the narrowest is the cavity. Don't split the loop by index: the
   goblet's outer wall is 10 points and its inner only 6.
   ─────────────────────────────────────────────────────────────────── */
function crossings(profile, y){
  const rs = [];
  for(let i = 0; i < profile.length - 1; i++){
    const a = profile[i], b = profile[i + 1];
    if((a.y - y) * (b.y - y) <= 0 && a.y !== b.y){
      rs.push(a.x + (b.x - a.x) * ((y - a.y) / (b.y - a.y)));
    }
  }
  return rs;
}

export function innerRadiusAt(profile, y){
  const rs = crossings(profile, y);
  return Math.max((rs.length ? Math.min(...rs) : .2) - .012, .04);
}

export function outerRadiusAt(profile, y){
  const rs = crossings(profile, y);
  return rs.length ? Math.max(...rs) : .5;
}

/* Deliberately the cup the board already renders: configure a place and
   it changes, leave it alone and it looks exactly as it always has. */
export const DEFAULT_CUP = { vessel:'Paper cup', mallow:'None', count:0,
                             size:1, tilt:0, label:'auto', finish:'auto' };

/* 'auto' takes whatever the vessel says; the rest are explicit overrides */
export const LABEL_MODES = ['auto', 'wrap', 'patch', 'none'];

/* 'auto' reads the artwork. Square art is a decal, wide art is a band —
   so dropping a 428x428 file in assets just works, no config needed.
   Glass still never wraps, whatever shape the art is; the goblet still
   carries nothing. aspect is null until the image has loaded, in which
   case fall back to the vessel so nothing flashes the wrong way. */
export function autoLabel(v, aspect){
  if((v.label || 'none') === 'none') return 'none';
  if(v.label === 'patch') return 'patch';
  if(aspect == null) return v.label;
  return aspect >= 1.6 ? 'wrap' : 'patch';
}
export const FINISHES    = ['auto', 'glass', 'solid'];
export const finishFor = (v, cfg) =>
  (cfg && cfg.finish && cfg.finish !== 'auto') ? cfg.finish : (v.glass ? 'glass' : 'solid');
export const labelModeFor = (v, cfg, aspect) =>
  (cfg && cfg.label && cfg.label !== 'auto') ? cfg.label : autoLabel(v, aspect);

/* ── the whole object ─────────────────────────────────────────────── */
/* Keep the first and last point — the last one seals the floor. */
function decimate(pts, step){
  if(step <= 1) return pts;
  const out = [];
  for(let i = 0; i < pts.length; i += step) out.push(pts[i]);
  if(out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
}

/* A cup 30px tall on a map does not need 6,016 triangles. */
const LOD = {
  full: { seg: 64, step: 1, extras: true },
  map:  { seg: 16, step: 3, extras: false }
};

export function buildCup(cfg = {}){
  const c = { ...DEFAULT_CUP, ...cfg };
  const v = VESSELS[c.vessel] || VESSELS['Paper cup'];
  const q = LOD[cfg.lod] || LOD.full;
  const group = new THREE.Group();

  const shell = !q.extras
    ? tintedShell(cfg.tint || '#f2f2f2')
    : (finishFor(v, c) === 'glass' ? MATERIALS.glass : MATERIALS.paper);

  const body = new THREE.Mesh(
    new THREE.LatheGeometry(decimate(v.profile, q.step), q.seg), shell);
  group.add(body);

  if(v.handle) addHandle(group, v, shell, q);

  const fillY = v.h * v.fill;
  const inner = innerRadiusAt(v.profile, fillY);
  const depth = Math.min(fillY * .55, .55);
  const cocoa = cfg.liquidMaterial || MATERIALS.cocoa;
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(inner, Math.max(innerRadiusAt(v.profile, fillY - depth), .04),
                               depth, q.extras ? 48 : 16),
    cocoa
  );
  liquid.position.y = fillY - depth / 2;
  cocoa.userData.uHalfH.value = depth / 2;
  group.add(liquid);

  if(q.extras && cfg.labelTexture) addLabel(group, v, cfg.labelTexture, cfg.facing ?? 0, c);

  const mallows = q.extras ? addMallows(group, c, fillY, inner) : [];

  group.userData = { vessel:v, cfg:c, body, liquid, mallows, fillY, inner };
  return group;
}

/* ── labels ───────────────────────────────────────────────────────────
   'wrap'  — a full band round a cylindrical-ish vessel, sized to the
             artwork's aspect so the lettering never stretches.
   'patch' — a square-ish decal on ONE side of a glass. Built as a
             partial cylinder rather than a flat plane so it hugs the
             curve instead of slicing through it.
   'none'  — the goblet carries nothing.
   ─────────────────────────────────────────────────────────────────── */
/* Follow the wall instead of chording across it. A cone drawn between
   two points on a convex profile dips inside the surface in the middle
   — on the bell glass that buried the label by 0.011 — so sample the
   real outer curve and spin THAT through the arc. */
function skin(v, bot, top, gap, steps = 28){
  const pts = [];
  for(let i = 0; i <= steps; i++){
    const y = bot + (top - bot) * (i / steps);
    pts.push(new THREE.Vector2(outerRadiusAt(v.profile, y) + gap, y));
  }
  return pts;
}

function addLabel(group, v, tex, facing, cfg){
  const img = tex.image;
  const aspect = img && img.height ? img.width / img.height : null;

  const mode = labelModeFor(v, cfg, aspect);
  if(mode === 'none') return null;

  /* clone so the two modes can set their own UV transform without
     fighting over one cached texture */
  const map = tex.clone();
  map.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map, roughness: .82, side: THREE.DoubleSide
  });

  let mesh;
  if(mode === 'wrap'){
    const midY = v.h * .52;
    const circumference = 2 * Math.PI * (outerRadiusAt(v.profile, midY) + .008);
    const hgt  = Math.min(circumference / (aspect ?? 3.27), v.h * .94);
    const top  = Math.min(midY + hgt / 2, v.h - .03);
    const bot  = Math.max(top - hgt, .02);
    mesh = new THREE.Mesh(new THREE.LatheGeometry(skin(v, bot, top, .008), 96), mat);
    map.wrapS = THREE.RepeatWrapping;
    /* cylinder UVs start at +Z, so the artwork's centre lands on the
       back — turn it round, then point it wherever the camera is */
    mesh.rotation.y = Math.PI + facing;
  } else {
    /* A square decal: the arc it subtends equals its height, so it
       stays on one side however wide the artwork happens to be. */
    /* Sit it on the widest part of the bowl, not blindly at half
       height — on a goblet that would land on the stem. */
    let midY = v.h * .5, wide = 0;
    for(let y = v.h * .25; y <= v.h * .95; y += v.h * .02){
      const r = outerRadiusAt(v.profile, y);
      if(r > wide){ wide = r; midY = y; }
    }
    const rMid = wide + .006;
    const hgt  = Math.min(v.h * .3, rMid * 1.1);   // keeps the arc under ~63°
    const top  = Math.min(midY + hgt / 2, v.h - .02);
    const bot  = Math.max(top - hgt, .02);
    const theta = hgt / rMid;

    mesh = new THREE.Mesh(
      new THREE.LatheGeometry(skin(v, bot, top, .006), 40, -theta / 2, theta), mat);
    mesh.rotation.y = facing;

    /* Fit wide artwork inside the square without distorting it: scale V
       by the aspect so the art occupies a centred band, and clamp so the
       rows above and below repeat the artwork's own background colour
       instead of tiling. */
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const ar = aspect ?? 1;
    map.repeat.set(1, ar);
    map.offset.set(0, (1 - ar) / 2);
  }

  group.add(mesh);
  return mesh;
}

/* A torus arc is closest to the mug at its two ends, so seat those on
   the wall and the rest of the ring can only curve away from it. The
   arc is rotated by -ARC/2 to point its opening at the mug; without
   that, the near side of the ring sweeps through the inside. */
function addHandle(group, v, shell, q = { seg: 44, extras: true }){
  const ARC = Math.PI * 1.2, R = .22, TUBE = .042, EMBED = .008;
  const cy   = v.h * .54;
  const span = R * Math.sin(ARC / 2);

  /* widest the wall gets anywhere the handle touches it */
  const wall = Math.max(
    outerRadiusAt(v.profile, cy - span),
    outerRadiusAt(v.profile, cy),
    outerRadiusAt(v.profile, cy + span)
  );

  /* cos(ARC/2) is negative, so this pushes the ring clear of the cup */
  const cx = wall - EMBED - R * Math.cos(ARC / 2);

  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(R, TUBE, q.extras ? 14 : 6, q.extras ? 44 : 14, ARC), shell);
  handle.position.set(cx, cy, 0);
  handle.rotation.z = -ARC / 2;
  group.add(handle);

  /* caps, so the open ends of the tube never show */
  if(!q.extras) return;
  for(const sign of [-1, 1]){
    const cap = new THREE.Mesh(new THREE.SphereGeometry(TUBE, 16, 12), shell);
    cap.position.set(cx + R * Math.cos(ARC / 2), cy + sign * span, 0);
    group.add(cap);
  }
}

function addMallows(group, c, fillY, inner){
  const make = MALLOWS[c.mallow];
  const geo = make && make();
  if(!geo || c.count < 1) return [];

  const size = c.size ?? 1;
  const reach = Math.max(inner - MALLOW_R[c.mallow] * size, 0);
  const out = [];

  /* One marshmallow is a deliberate placement, not a scatter — centre
     it and let the tilt do the work. */
  if(c.count === 1){
    const m = new THREE.Mesh(geo, MATERIALS.mallow);
    m.scale.setScalar(size);
    m.position.set(0, fillY + .012 * size, 0);
    m.rotation.x = (c.tilt ?? 0) * Math.PI / 180;
    group.add(m);
    return [m];
  }

  /* deterministic, so nudging a slider adds rather than reshuffles */
  let seed = (c.mallow.length * 977 + c.count * 31) % 2147483647;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  for(let i = 0; i < c.count; i++){
    const m = new THREE.Mesh(i ? geo.clone() : geo, MATERIALS.mallow);
    m.scale.setScalar(size);
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * reach;
    m.position.set(Math.cos(a) * d, fillY + .015 * size - rnd() * .02, Math.sin(a) * d);
    m.rotation.y = rnd() * Math.PI * 2;
    m.rotation.x = (rnd() - .5) * .35;
    group.add(m);
    out.push(m);
  }
  return out;
}
