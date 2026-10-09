/* ════════════════════════════════════════════════════════════════════
   Holding the cup with your hand.

   The webcam goes through ml5's handPose. A grip is thumb and index tips
   close together, measured against the palm (wrist → middle knuckle) so
   it means the same near or far from the camera, with two thresholds so
   a wobbly grip doesn't drop the cup. The fingers have to close on the
   cup; then the cup's middle follows the point between the fingertips,
   and the cup turns as the hand turns from the moment of the grab. Let
   go and it settles back home.

   Shared by index.html (the "Hold cup" toggle) and hold.html.
   ══════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const GRAB   = 1.20;   // thumb–index gap / palm length to pick the cup up
const LET_GO = 1.45;   // …and to put it down
const REACH  = 0.15;   // how far (fraction of the stage) a grip can start from the cup
const EASE   = 0.3;    // per-frame smoothing; lower is steadier but laggier
const WIDE   = 3.0;    // the gap reported as fully apart (spread 1); GRAB is touching (0)

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

/* Start the camera and the model. With a `preview` element, a mirrored
   view with the thumb and index tips marked goes in it; without one the
   video still has to be in the page to keep decoding, so it hides. Throws
   if the camera is refused. `cup()` returns the current { group, h } —
   the page may swap cups while you hold one. Call update() once per
   frame: it returns { state, spread } — state is 'none' (no hand), 'far'
   (fingers too far apart to hold) or 'close'; spread runs from 0 with
   the fingers close enough to grab to 1 wide open. stop() to end. */
export async function holdCup({ camera, cup, preview }){
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  const video = Object.assign(document.createElement('video'), { srcObject: stream, muted: true, playsInline: true });
  const dots = document.createElement('canvas');
  const ctx = dots.getContext('2d');
  if(preview) preview.append(video, dots);
  else{
    video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.append(video);
  }

  let hands = [], model;
  try{
    await video.play();
    // the model sizes its results by these attributes, which a bare <video> leaves at 0
    video.width = video.videoWidth;
    video.height = video.videoHeight;
    await loadMl5();
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
  let pinched = false, held = false;

  /* How far the hand has turned since the grab, as a world rotation.
     Forward/back tilt (x) and turning (y) are reversed, because that's
     what reads right on screen; left/right tilt (z) passes through. */
  function turnSinceGrab(hand){
    const d = handTurn(hand).multiply(grabHand.clone().invert());
    d.x = -d.x;
    d.y = -d.y;
    return d.premultiply(camera.quaternion).multiply(camera.quaternion.clone().invert());
  }

  function hold(){
    const { group, h } = cup();
    const hand = hands[0];
    const W = video.videoWidth, H = video.videoHeight;
    const g = hand && {
      gap: gripGap(hand),
      x: (hand.thumb_tip.x + hand.index_finger_tip.x) / W - 1,      // midpoint, as NDC
      y: 1 - (hand.thumb_tip.y + hand.index_finger_tip.y) / H
    };
    const middle = new THREE.Vector3(0, h * 0.5, 0);

    const closed = !!g && g.gap < (pinched ? LET_GO : GRAB);
    if(closed && !pinched){                       // fingers just closed — on the cup?
      const c = middle.clone().applyQuaternion(group.quaternion).add(group.position).project(camera);
      held = Math.hypot(c.x - g.x, c.y - g.y) / 2 < REACH;
      if(held){ grabHand.copy(handTurn(hand)); grabCup.copy(group.quaternion); }
    }
    if(!closed) held = false;
    pinched = closed;

    /* where the cup wants to be: home, or turned with the hand and hung
       from the grip point by its middle (so it pivots there, not its base) */
    const turn = held ? turnSinceGrab(hand).multiply(grabCup) : new THREE.Quaternion();
    aim.set(0, 0, 0);
    if(held){
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(hit), middle);
      ray.setFromCamera(ndc.set(g.x, g.y), camera);
      if(ray.ray.intersectPlane(plane, hit)) aim.copy(hit).sub(middle.clone().applyQuaternion(turn));
    }
    group.position.lerp(aim, EASE);              // smooths the model's jitter too
    group.quaternion.slerp(turn, EASE);
  }

  /* glassy tips: blue once they're close enough to hold, red until then */
  function drawDots(){
    const w = dots.clientWidth, h = dots.clientHeight;
    if(dots.width !== w * devicePixelRatio){ dots.width = w * devicePixelRatio; dots.height = h * devicePixelRatio; }
    ctx.setTransform(dots.width / video.videoWidth, 0, 0, dots.height / video.videoHeight, 0, 0);
    ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);
    const r = 8 * video.videoWidth / w;           // 8 css px whatever the camera's resolution
    ctx.shadowBlur = 16;
    ctx.lineWidth = 1.5 * video.videoWidth / w;
    const hand = hands[0];
    if(!hand) return;
    ctx.shadowColor = pinched ? 'rgba(0,240,255,.9)'   : 'rgba(255,40,70,.9)';
    ctx.fillStyle   = pinched ? 'rgba(0,230,255,.27)'  : 'rgba(255,40,70,.27)';
    ctx.strokeStyle = pinched ? 'rgba(200,255,255,.8)' : 'rgba(255,200,205,.8)';
    for(const tip of [hand.thumb_tip, hand.index_finger_tip]){
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  return {
    update(){
      if(!video.videoWidth || !hands[0]) return { state: 'none', spread: 1 };
      hold();
      if(preview) drawDots();
      const spread = Math.min(Math.max((gripGap(hands[0]) - GRAB) / (WIDE - GRAB), 0), 1);
      return { state: pinched ? 'close' : 'far', spread };
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
