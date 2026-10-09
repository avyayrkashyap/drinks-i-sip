/* ════════════════════════════════════════════════════════════════════
   Holding the cup with your hand.

   The webcam goes through ml5's handPose. You hold the cup the way you
   would a real one: thumb and index each on a side of it — one tip just
   past the left of its outline on screen, the other the right — so the
   hand has to be near enough the camera to span it. The cup then hangs
   from the point between the fingertips where you took it, and turns as
   the hand turns from the moment of the grab. Bring the hand nearer the
   camera and the cup comes with it, or draw it back towards you and the
   cup goes back with it, smaller: the hand looking twice as big as at the
   grab puts the cup at half the distance it was taken from. Pinch the
   fingers together to put it down (or open them wide and it slips out),
   and it settles back home.

   Shared by index.html (the "Hold cup" toggle) and hold.html.
   ══════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const EDGE   = 0.1;    // how near a fingertip has to be to the cup's side (NDC, ~5% of the stage height)
const SLIP   = 1.35;   // the cup slips out once the fingers open this much wider than at the grab…
const DROP   = 0.5;    // …and is put down once they pinch in to this much of it
const HOME   = 0.5;    // how near home (scene units) a held cup is over its spot
const NEAREST = 1.0;   // how near the camera the cup can come, in scene units (it starts ~2.8 away)…
const FARTHEST = 8;    // …and how far back you can take it
const EASE   = 0.3;    // per-frame smoothing; lower is steadier but laggier
const TOUCH  = 1.20;   // thumb–index gap / palm length shown as touching (spread 0)…
const WIDE   = 3.0;    // …and as fully apart (spread 1)

const ML5 = 'https://unpkg.com/ml5@1.2.1/dist/ml5.min.js';

/* ml5 is a few MB, so it only loads once someone asks to hold a cup */
function loadMl5(){
  if(window.ml5) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = ML5; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const gripGap = h => dist(h.thumb_tip, h.index_finger_tip) / dist(h.wrist, h.middle_finger_mcp);

/* How big the hand looks for its real size, which grows as it nears the
   camera: the palm's lengths on screen over the same lengths in
   handPose's metric 3D, counting only their run across the screen, so
   tilting the palm shrinks both alike and doesn't read as moving away. */
const PALM = [['wrist', 'index_finger_mcp'], ['wrist', 'middle_finger_mcp'],
              ['wrist', 'pinky_finger_mcp'], ['index_finger_mcp', 'pinky_finger_mcp']];
function handScale(h){
  let px = 0, m = 0;
  for(const [a, b] of PALM){
    px += dist(h[a], h[b]);
    m  += Math.hypot(h[a].x3D - h[b].x3D, h[a].y3D - h[b].y3D);
  }
  return px / m;
}

/* The hand's orientation in camera space, from handPose's 3D keypoints
   (metres around the hand's centre, already mirrored like the preview).
   A frame on the palm: up runs wrist → middle knuckle, the normal comes
   off the palm, across runs index → pinky. MediaPipe's y points down and
   its z away from the camera, so both flip. */
const v3 = k => new THREE.Vector3(k.x3D, -k.y3D, -k.z3D);
const basis = new THREE.Matrix4();
function handTurn(hand){
  const up = v3(hand.middle_finger_mcp).sub(v3(hand.wrist)).normalize();
  const n  = v3(hand.pinky_finger_mcp).sub(v3(hand.index_finger_mcp)).cross(up).normalize();
  basis.makeBasis(new THREE.Vector3().crossVectors(up, n), up, n);
  return new THREE.Quaternion().setFromRotationMatrix(basis);
}

/* Start the camera and the model. A mirrored view with the thumb and
   index tips marked goes in `preview`; the page styles it, and whatever
   part of the frame shows there (object-fit: cover may crop it) is what
   maps onto the stage, so the fingers line up with the cup. Throws
   if the camera is refused. `cup()` returns the current { group, h } —
   the page may swap cups while you hold one. Call update() once per
   frame: it returns { state, spread, over } — state is 'none' (no hand),
   'far' (a hand, not holding) or 'close' (holding); spread runs from 0
   with the fingertips touching to 1 wide open; over is whether a held
   cup is back over its spot. stop() to end. */
export async function holdCup({ camera, cup, preview }){
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });   // the selfie camera on a phone
  const video = Object.assign(document.createElement('video'), { srcObject: stream, muted: true, playsInline: true });
  const dots = document.createElement('canvas');
  const ctx = dots.getContext('2d');
  preview.append(video, dots);

  let hands = [], model;
  try{
    await video.play();
    // the model sizes its results by these attributes, which a bare <video> leaves at 0
    video.width = video.videoWidth;
    video.height = video.videoHeight;
    await loadMl5();
    // iOS 26's WebGPU hands TF.js video frames turned 90°, so every keypoint
    // lands in the wrong place; copying frames instead fixes it (ml5 1.4 does
    // the same: github.com/tensorflow/tfjs/issues/8733, ml5-next-gen#306)
    ml5.tf.env().set('WEBGPU_IMPORT_EXTERNAL_TEXTURE', false);
    model = ml5.handPose({ flipped: true, maxHands: 1 });
    await model.ready;
  }catch(err){
    stream.getTracks().forEach(t => t.stop());
    video.remove(); dots.remove();
    throw err;
  }
  model.detectStart(video, r => hands = r);

  const ray = new THREE.Raycaster(), plane = new THREE.Plane();
  const ndc = new THREE.Vector2(), hit = new THREE.Vector3(), aim = new THREE.Vector3();
  const grabHand = new THREE.Quaternion(), grabCup = new THREE.Quaternion();   // both as at the grab
  const pivot = new THREE.Vector3();            // where on the cup it's held, in the cup's own space
  const look = new THREE.Vector3();
  let held = false, grabSpan = 0, grabScale = 1, grabDepth = 1;

  /* where the preview shows a keypoint, as stage NDC — through the crop
     the preview's object-fit: cover makes of the frame */
  function toNdc(k){
    const W = video.videoWidth, H = video.videoHeight;
    const cw = video.clientWidth || W, ch = video.clientHeight || H;
    const s = Math.max(cw / W, ch / H);
    return { x: 2 * (k.x - W / 2) * s / cw, y: -2 * (k.y - H / 2) * s / ch };
  }

  /* the stage's width over its height — camera.aspect isn't, once the page
     shifts the view with setViewOffset */
  const aspect = () => camera.projectionMatrix.elements[5] / camera.projectionMatrix.elements[0];

  /* which side of the cup's outline a fingertip is on: -1 the left, 1 the
     right, 0 neither — a ray just inside the tip hits the cup, one just
     outside misses */
  function side(group, p){
    const e = EDGE / aspect();
    const hits = x => { ray.setFromCamera(ndc.set(x, p.y), camera); return ray.intersectObject(group, true).length > 0; };
    const l = hits(p.x - e), r = hits(p.x + e);
    return l === r ? 0 : r ? -1 : 1;
  }

  /* How far the hand has turned since the grab, as a world rotation.
     Turning (y) is reversed, because that's what reads right on screen;
     forward/back tilt (x) and left/right tilt (z) pass through, so with
     the camera view it tilts like your hand in a mirror. */
  function turnSinceGrab(hand){
    const d = handTurn(hand).multiply(grabHand.clone().invert());
    d.y = -d.y;
    return d.premultiply(camera.quaternion).multiply(camera.quaternion.clone().invert());
  }

  function hold(){
    const { group, h } = cup();
    const hand = hands[0];
    const t = toNdc(hand.thumb_tip), i = toNdc(hand.index_finger_tip);
    const g = { x: (t.x + i.x) / 2, y: (t.y + i.y) / 2 };   // between the fingertips
    const span = Math.hypot((t.x - i.x) * aspect(), t.y - i.y);

    /* the cup moves on a camera-facing plane: through its middle at home,
       and nearer or farther as the hand is, against the grab */
    const middle = new THREE.Vector3(0, h * 0.5, 0);
    camera.getWorldDirection(look);
    const home = middle.clone().sub(camera.position).dot(look);
    const nearer = held ? handScale(hand) / grabScale : 1;   // how many times nearer (under 1: farther)
    const depth = held ? Math.min(Math.max(grabDepth / nearer, NEAREST), FARTHEST) : home;
    plane.setFromNormalAndCoplanarPoint(look, camera.position.clone().addScaledVector(look, depth));
    ray.setFromCamera(ndc.set(g.x, g.y), camera);
    const on = ray.ray.intersectPlane(plane, hit);

    const across = span / nearer / grabSpan;   // the fingers' gap against the grab's, allowing for a nearer hand looking wider
    if(held && (across > SLIP || across < DROP)) held = false;
    else if(!held && on && side(group, t) * side(group, i) === -1){   // a tip on each side
      held = true;
      grabSpan = span;
      grabScale = handScale(hand);
      grabDepth = home;
      group.updateMatrixWorld();
      pivot.copy(group.worldToLocal(hit.clone()));
      grabHand.copy(handTurn(hand));
      grabCup.copy(group.quaternion);
    }

    /* where the cup wants to be: home, or turned with the hand and hung
       from where it was taken (so it pivots there, not at its base) */
    const turn = held ? turnSinceGrab(hand).multiply(grabCup) : new THREE.Quaternion();
    aim.set(0, 0, 0);
    if(held && on) aim.copy(hit).sub(pivot.clone().applyQuaternion(turn));
    group.position.lerp(aim, EASE);              // smooths the model's jitter too
    group.quaternion.slerp(turn, EASE);
  }

  /* glassy tips: blue while they hold the cup, red until then */
  function drawDots(){
    const w = dots.clientWidth, h = dots.clientHeight, dpr = devicePixelRatio;
    if(dots.width !== Math.round(w * dpr) || dots.height !== Math.round(h * dpr)){ dots.width = w * dpr; dots.height = h * dpr; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, dots.width, dots.height);
    const W = video.videoWidth, H = video.videoHeight;
    const s = Math.max(w / W, h / H);             // the same cover crop as the video
    ctx.setTransform(s * dpr, 0, 0, s * dpr, (w - W * s) / 2 * dpr, (h - H * s) / 2 * dpr);
    const r = 8 / s;                              // 8 css px whatever the camera's resolution
    ctx.shadowBlur = 16;
    ctx.lineWidth = 1.5 / s;
    const hand = hands[0];
    if(!hand) return;
    ctx.shadowColor = held ? 'rgba(0,240,255,.9)'   : 'rgba(255,40,70,.9)';
    ctx.fillStyle   = held ? 'rgba(0,230,255,.27)'  : 'rgba(255,40,70,.27)';
    ctx.strokeStyle = held ? 'rgba(200,255,255,.8)' : 'rgba(255,200,205,.8)';
    for(const tip of [hand.thumb_tip, hand.index_finger_tip]){
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  return {
    update(){
      if(!video.videoWidth || !hands[0]){ held = false; drawDots(); return { state: 'none', spread: 1, over: false }; }
      hold();
      drawDots();
      const spread = Math.min(Math.max((gripGap(hands[0]) - TOUCH) / (WIDE - TOUCH), 0), 1);
      return { state: held ? 'close' : 'far', spread, over: held && cup().group.position.length() < HOME };
    },
    stop(){
      model.detectStop();
      stream.getTracks().forEach(t => t.stop());
      video.remove(); dots.remove();
      const { group } = cup();
      group.position.set(0, 0, 0);
      group.quaternion.identity();
    }
  };
}
