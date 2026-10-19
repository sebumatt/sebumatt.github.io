import { el, lede, flow, slider, controls, readout, verdict, svg, notice, C } from './kit.js';

// The process train as a clickable flow, and the reserved-space problem:
// equipment has to fit the box the shipyard reserved on the ship outline.
export default function mount(root) {
  const process = flow([
    { title: 'Collect', sub: 'Vacuum circuit', detail: 'Food waste from the galley travels through a vacuum collection circuit, so the system can sit far from the kitchen. Valve and vacuum design are about reliability at sea.' },
    { title: 'Buffer', sub: 'Food-grade tank', detail: 'A buffer tank evens out meal-time peaks so treatment runs steadily. Food-grade materials and cleanability drive the design.' },
    { title: 'Treat', sub: 'Pressure vessel', detail: 'The core step happens in a pressure vessel. Pressure-equipment rules, class requirements and safe operation by crew all shape the vessel.' },
    { title: 'Recover heat', sub: 'Heat exchangers', detail: 'Heat exchangers recover energy between streams, which decides the running cost and how much capacity fits the energy budget on board.' },
    { title: 'Discharge', sub: 'To storage', detail: 'The treated output goes to storage or onward processing, in a form that is easier and safer to handle than raw food waste.' },
  ]);

  // Fit the module into the reserved space.
  const BOX = { w: 6.0, d: 3.2 }; // m, representative reserved footprint
  const cap = slider({ label: 'Treatment capacity', min: 200, max: 1600, step: 50, value: 800, format: (v) => `${v} kg/day`, onInput: draw });
  const std = el('button', { type: 'button', class: 'x-toggle', 'aria-pressed': 'true' }, 'Standard pump and blower stations');
  std.addEventListener('click', () => {
    std.setAttribute('aria-pressed', String(std.getAttribute('aria-pressed') !== 'true'));
    draw();
  });
  const pic = svg('svg', { viewBox: '0 0 560 240', class: 'x-chart', role: 'img', 'aria-label': 'Equipment footprint inside reserved space' });
  const out = readout([
    ['area', 'Footprint used'],
    ['parts', 'Unique part numbers'],
  ]);
  const v = verdict();

  function draw() {
    const standard = std.getAttribute('aria-pressed') === 'true';
    const k = cap.value / 800;
    const items = [
      { name: 'Vessel', w: 1.2 * Math.sqrt(k), d: 1.2 * Math.sqrt(k), c: C.gold },
      { name: 'Buffer', w: 1.3 * Math.sqrt(k), d: 1.0 * Math.sqrt(k), c: C.copper },
      { name: 'HX', w: 0.8 * Math.sqrt(k), d: 0.6, c: C.cyan },
      { name: standard ? 'Pump station' : 'Custom pumps', w: standard ? 1.1 : 1.6, d: standard ? 0.8 : 1.0, c: '#9aa8b2' },
      { name: standard ? 'Blower station' : 'Custom blower', w: standard ? 0.9 : 1.3, d: standard ? 0.8 : 1.0, c: '#7d8b96' },
    ];
    const S = 80;
    const ox = 40;
    const oy = 20;
    pic.replaceChildren(
      svg('rect', { x: ox, y: oy, width: BOX.w * S, height: BOX.d * S, fill: 'none', stroke: C.cyan, 'stroke-dasharray': '6 5' }),
      svg('text', { x: ox, y: oy + BOX.d * S + 16, class: 'x-tick', fill: C.cyan }, `Reserved space on the ship outline, ${BOX.w} × ${BOX.d} m`)
    );
    let x = 0.15;
    let y = 0.15;
    let rowH = 0;
    let fits = true;
    for (const it of items) {
      if (x + it.w > BOX.w - 0.1) {
        x = 0.15;
        y += rowH + 0.25;
        rowH = 0;
      }
      if (y + it.d > BOX.d - 0.05 || x + it.w > BOX.w) fits = false;
      pic.append(svg('rect', { x: ox + x * S, y: oy + y * S, width: it.w * S, height: it.d * S, rx: 4, fill: it.c, opacity: 0.85 }));
      pic.append(svg('text', { x: ox + x * S + 6, y: oy + y * S + 16, 'font-size': 11, fill: '#0e1a24', 'font-weight': 600 }, it.name));
      x += it.w + 0.25;
      rowH = Math.max(rowH, it.d);
    }
    const used = items.reduce((a, it) => a + it.w * it.d, 0);
    out.set('area', `${Math.round((used / (BOX.w * BOX.d)) * 100)}%`, fits ? 'pass' : 'fail');
    out.set('parts', standard ? '~40, shared across products' : '~95, one-off for this unit');
    v.set(fits, fits ? 'Fits the reserved space. The layout can be built to it.' : 'Does not fit. Either capacity or the layout has to give.');
  }

  root.append(
    lede('HydroTreat® turns galley food waste into something a ship can store and handle. Getting it from a working R&D rig to a product meant five process steps that crews can run, inside a space the shipyard reserves years ahead.'),
    process,
    el('h4', { class: 'x-step-title' }, 'Owning the reserved space'),
    pic,
    controls(cap.node, std),
    out.node,
    v.node,
    notice(['Standard pump and blower stations save floor space and halve the number of unique parts to stock on board.', 'Patent FI20185059A1, with international filings.'])
  );
  draw();
}
