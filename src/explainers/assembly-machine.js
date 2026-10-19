import { el, svg, lede, slider, segmented, controls, readout, verdict, notice, rng, C } from './kit.js';

// Stack straightness and four-point repeatability: manual vs semi-automatic.
export default function mount(root) {
  let mode = 'manual';
  let seed = 3;
  const SIGMA = { manual: 0.09, machine: 0.025 }; // mm per layer, representative

  const W = 560;
  const H = 280;
  const pic = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'x-chart', role: 'img', 'aria-label': 'Side view of an interconnect stack' });
  const fig = el('figure', { class: 'x-figure' }, pic);
  const tol = slider({ label: 'Straightness tolerance', min: 0.1, max: 0.6, step: 0.02, value: 0.3, format: (v) => `${v.toFixed(2)} mm`, onInput: draw });
  const out = readout([
    ['straight', 'Stack straightness'],
    ['four', 'Four-point spread'],
    ['yield', 'Pass rate, 200 stacks'],
  ]);
  const v = verdict();

  function stack(r, sigma) {
    let x = 0;
    return Array.from({ length: 20 }, () => (x += (r() - 0.5) * 2 * sigma));
  }

  function draw() {
    const r = rng(seed);
    const offsets = stack(r, SIGMA[mode]);
    const straight = Math.max(...offsets) - Math.min(...offsets);
    const four = Array.from({ length: 4 }, () => (r() - 0.5) * SIGMA[mode] * 3);
    const fourSpread = Math.max(...four) - Math.min(...four);

    // Pass rate over many stacks with the same process.
    const rr = rng(99);
    let pass = 0;
    for (let k = 0; k < 200; k++) {
      const o = stack(rr, SIGMA[mode]);
      if (Math.max(...o) - Math.min(...o) <= tol.value) pass++;
    }

    pic.replaceChildren();
    const scale = 260; // px per mm sideways, exaggerated so drift is visible
    const cx = W / 2;
    const lh = 10;
    offsets.forEach((o, i) => {
      const y = H - 40 - i * lh;
      pic.append(svg('rect', { x: cx - 110 + o * scale, y, width: 220, height: lh - 3, rx: 2, fill: i % 2 ? C.gold : '#b88a45', opacity: 0.9 }));
    });
    // Tolerance corridor.
    for (const s of [-1, 1]) {
      const x = cx + s * (110 + (tol.value / 2) * scale);
      pic.append(svg('line', { x1: x, x2: x, y1: 20, y2: H - 30, stroke: C.cyan, 'stroke-dasharray': '5 5' }));
    }
    pic.append(svg('text', { x: cx, y: 16, 'text-anchor': 'middle', class: 'x-tick', fill: C.cyan }, 'tolerance corridor (sideways drift shown 260× larger)'));
    pic.append(svg('rect', { x: cx - 140, y: H - 30, width: 280, height: 8, fill: C.steel }));

    const ok = straight <= tol.value;
    out.set('straight', `${straight.toFixed(2)} mm`, ok ? 'pass' : 'fail');
    out.set('four', `${fourSpread.toFixed(3)} mm`);
    out.set('yield', `${Math.round(pass / 2)}%`, pass / 200 > 0.9 ? 'pass' : 'fail');
    v.set(ok, ok ? 'This stack is inside the corridor.' : 'This stack drifts outside the corridor.');
  }

  root.append(
    lede('Each layer of a stack can sit a little off from the one below. Small errors add up, so the requirement is written on the whole stack: how straight it is, and how repeatably four points on the line measure.'),
    fig,
    controls(
      segmented({ label: 'Assembly method', options: [{ value: 'manual', label: 'Manual' }, { value: 'machine', label: 'Semi-automatic' }], value: mode, onChange: (m) => ((mode = m), draw()) }),
      tol.node,
      el('button', { type: 'button', class: 'x-primary', onclick: () => ((seed += 1), draw()) }, 'Build another stack')
    ),
    out.node,
    v.node,
    notice(['Switch to semi-automatic: the drift per layer shrinks, and the pass rate jumps without touching the tolerance.', 'Measurable acceptance criteria made FAT and SAT a yes/no question.'])
  );
  draw();
}
