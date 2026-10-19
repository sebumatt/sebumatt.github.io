import { el, lede, slider, controls, readout, verdict, canvas, notice, rng, C } from './kit.js';

// Acceptance logic with a metric hierarchy: the largest spot is judged first,
// and only a part that passes that is judged on combined spot area.
export default function mount(root) {
  const LIMIT_SPOT = 0.8; // mm, representative
  const LIMIT_AREA = 0.35; // % of coated area, representative
  const PLATE = { w: 120, h: 70 }; // mm
  let seed = 7;

  const cv = canvas(560, 300, 'Coated plate with defect spots');
  const density = slider({ label: 'How many spots', min: 0, max: 60, value: 18, onInput: draw });
  const size = slider({ label: 'Typical spot size', min: 0.1, max: 1.2, step: 0.05, value: 0.35, format: (v) => `${v.toFixed(2)} mm`, onInput: draw });
  const newPart = el('button', { type: 'button', class: 'x-primary', onclick: () => ((seed += 1), draw()) }, 'Inspect a new part');
  const out = readout([
    ['spot', `1. Largest spot (limit ${LIMIT_SPOT} mm)`],
    ['area', `2. Combined spot area (limit ${LIMIT_AREA}%)`],
  ]);
  const v = verdict();

  function draw() {
    const r = rng(seed);
    const n = density.value;
    const spots = Array.from({ length: n }, () => ({
      x: r() * PLATE.w,
      y: r() * PLATE.h,
      d: Math.max(0.05, size.value * (0.4 + r() * r() * 2.2)),
    }));
    const { ctx, w, h } = cv;
    const m = 24;
    const sx = (w - 2 * m) / PLATE.w;
    const sy = (h - 2 * m) / PLATE.h;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(m, m, w - m, h - m);
    g.addColorStop(0, '#3d4f5c');
    g.addColorStop(1, '#2a3a46');
    ctx.fillStyle = g;
    ctx.fillRect(m, m, w - 2 * m, h - 2 * m);
    ctx.strokeStyle = 'rgba(220,231,238,0.2)';
    ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);

    const largest = spots.reduce((a, b) => (b.d > (a?.d ?? 0) ? b : a), null);
    for (const s of spots) {
      ctx.beginPath();
      ctx.arc(m + s.x * sx, m + s.y * sy, Math.max(1.5, (s.d / 2) * sx * 2.2), 0, Math.PI * 2);
      ctx.fillStyle = s === largest ? C.bad : 'rgba(220,231,238,0.75)';
      ctx.fill();
    }
    if (largest) {
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(m + largest.x * sx, m + largest.y * sy, 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    const maxD = largest?.d ?? 0;
    const area = spots.reduce((a, s) => a + Math.PI * (s.d / 2) ** 2, 0);
    const areaPct = (area / (PLATE.w * PLATE.h)) * 100 * 40; // scaled so the demo range is readable
    const spotOk = maxD <= LIMIT_SPOT;
    const areaOk = areaPct <= LIMIT_AREA;
    out.set('spot', `${maxD.toFixed(2)} mm`, spotOk ? 'pass' : 'fail');
    out.set('area', spotOk ? `${areaPct.toFixed(2)}%` : 'Not checked', spotOk ? (areaOk ? 'pass' : 'fail') : '');
    if (!spotOk) v.set(false, 'Rejected at check 1: one spot is too large. Area is not checked.');
    else if (!areaOk) v.set(false, 'Rejected at check 2: no single spot is too big, but together they cover too much.');
    else v.set(true, 'Accepted: passes both checks in order.');
  }

  root.append(
    lede('A coated part is judged in a fixed order. First, is any single spot too big? Only then: do all the spots together cover too much? Production and the supplier read the same verdict.'),
    cv.node,
    controls(density.node, size.node, newPart),
    out.node,
    v.node,
    notice([
      'A few small spots can pass while one large spot fails the part outright.',
      'Many small spots can fail on combined area even though each one is fine.',
      'The order matters: it tells the supplier which process problem to fix first.',
    ])
  );
  draw();
}
