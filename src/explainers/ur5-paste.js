import { lede, segmented, slider, controls, readout, verdict, canvas, loop, notice, C } from './kit.js';

// A planar two-link arm drawing a paste stroke from A to B. MoveL keeps the
// tool on a straight line; MoveJ interpolates joint angles and curves the path.
// Near full extension the arm approaches a singularity and joint speed explodes.
const L1 = 1.5;
const L2 = 1.5;

function ik(x, y) {
  const c2 = Math.max(-1, Math.min(1, (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2)));
  const q2 = Math.acos(c2);
  const q1 = Math.atan2(y, x) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2));
  return [q1, q2];
}
const fk = ([q1, q2]) => [L1 * Math.cos(q1) + L2 * Math.cos(q1 + q2), L1 * Math.sin(q1) + L2 * Math.sin(q1 + q2)];

export default function mount(root) {
  let mode = 'L';
  const cv = canvas(560, 320, 'Robot arm drawing a paste path');
  const dist = slider({ label: 'Path distance from robot base', min: 1.2, max: 2.75, step: 0.01, value: 1.8, format: (v) => `${(v * 300).toFixed(0)} mm`, onInput: reset });
  const out = readout([
    ['elbow', 'Smallest elbow angle'],
    ['speed', 'Peak elbow speed'],
  ]);
  const v = verdict();
  let t = 0;
  let trail = [];
  let peak = 0;
  let minElbow = Math.PI;
  let prevQ = null;

  function reset() {
    t = 0;
    trail = [];
    peak = 0;
    minElbow = Math.PI;
    prevQ = null;
  }

  const A = () => [-1.2, dist.value];
  const B = () => [1.2, dist.value];

  function pose(s) {
    if (mode === 'L') {
      const [ax, ay] = A();
      const [bx, by] = B();
      return ik(ax + (bx - ax) * s, ay + (by - ay) * s);
    }
    const qa = ik(...A());
    const qb = ik(...B());
    return [qa[0] + (qb[0] - qa[0]) * s, qa[1] + (qb[1] - qa[1]) * s];
  }

  const stop = loop((dt) => {
    const period = 3.2;
    t += dt / period;
    if (t > 1.25) reset();
    const s = Math.min(1, Math.max(0, t));
    const q = pose(s);
    if (prevQ && t <= 1) {
      const sp = Math.abs(q[1] - prevQ[1]) / Math.max(dt, 1e-3);
      peak = Math.max(peak, sp);
    }
    prevQ = q;
    if (t <= 1) minElbow = Math.min(minElbow, q[1]);
    const tip = fk(q);
    if (t <= 1) trail.push(tip);

    const { ctx, w, h } = cv;
    const S = 90;
    const ox = w / 2;
    const oy = h - 26;
    const P = ([x, y]) => [ox + x * S, oy - y * S];
    ctx.clearRect(0, 0, w, h);
    // Reach limit.
    ctx.strokeStyle = 'rgba(220,231,238,0.12)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(ox, oy, (L1 + L2) * S, Math.PI, 0);
    ctx.stroke();
    // Intended straight stroke.
    ctx.strokeStyle = 'rgba(127,211,230,0.5)';
    ctx.beginPath();
    ctx.moveTo(...P(A()));
    ctx.lineTo(...P(B()));
    ctx.stroke();
    ctx.setLineDash([]);
    // Paste trail.
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    trail.forEach((p, i) => (i ? ctx.lineTo(...P(p)) : ctx.moveTo(...P(p))));
    ctx.stroke();
    // Arm.
    const elbow = [L1 * Math.cos(q[0]), L1 * Math.sin(q[0])];
    const danger = q[1] < 0.35;
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#9aa8b2';
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(...P(elbow));
    ctx.lineTo(...P(tip));
    ctx.stroke();
    ctx.fillStyle = danger ? C.bad : C.frost;
    ctx.beginPath();
    ctx.arc(...P(elbow), 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.steel;
    ctx.fillRect(ox - 26, oy, 52, 14);

    out.set('elbow', `${Math.round((minElbow * 180) / Math.PI)}°`, minElbow < 0.35 ? 'fail' : 'pass');
    out.set('speed', `${Math.round((peak * 180) / Math.PI)}°/s`, peak > 1.6 ? 'fail' : 'pass');
    if (minElbow < 0.35 && mode === 'L') v.set(false, 'Near singularity: the arm is almost straight, so a straight tool line needs huge elbow speed.');
    else if (mode === 'J') v.set(true, 'MoveJ stays smooth in the joints, but the paste no longer follows a straight line.');
    else v.set(true, 'Straight stroke with comfortable joint speeds.');
  });

  root.append(
    lede('Paste needs a straight, even stroke. A robot can move straight in the tool (MoveL) or smoothly in its joints (MoveJ), and near full reach those two goals fight each other.'),
    cv.node,
    controls(
      segmented({ label: 'Motion type', options: [{ value: 'L', label: 'MoveL, straight tool path' }, { value: 'J', label: 'MoveJ, joint interpolation' }], value: mode, onChange: (m) => ((mode = m), reset()) }),
      dist.node
    ),
    out.node,
    v.node,
    notice(['Push the path out towards the reach limit with MoveL and watch the elbow straighten and its speed spike.', 'The fix was to place waypoints so the wrist and elbow never line up mid-stroke.'])
  );
  return stop;
}
