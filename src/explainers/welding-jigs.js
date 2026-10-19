import { el, svg, lede, steps, readout, notice, C } from './kit.js';

// The 3-2-1 locating principle: six points remove six degrees of freedom.
export default function mount(root) {
  const W = 560;
  const H = 300;
  const pic = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'x-chart', role: 'img', 'aria-label': 'Part in a fixture with locators' });
  const fig = el('figure', { class: 'x-figure' }, pic);
  const out = readout([
    ['locators', 'Locators placed'],
    ['dof', 'Ways the part can still move'],
  ]);

  // Isometric helper.
  const iso = (x, y, z) => [W / 2 + (x - z) * 0.87 * 1.0, 200 + (x + z) * 0.5 - y];
  const pt = (p) => p.join(',');
  const LOC = [
    { p: [-80, 0, -40], face: 'A' },
    { p: [60, 0, -50], face: 'A' },
    { p: [0, 0, 60], face: 'A' },
    { p: [-50, 30, -70], face: 'B' },
    { p: [50, 30, -70], face: 'B' },
    { p: [-110, 30, 10], face: 'C' },
  ];
  const DOF = ['Move up/down', 'Tilt front/back', 'Tilt left/right', 'Slide front/back', 'Rotate flat', 'Slide left/right'];

  function draw(n) {
    pic.replaceChildren();
    const a = 110;
    const b = 60;
    const c = 70;
    const box = (col, faces) => faces.forEach((f) => pic.append(svg('polygon', { points: f.map((q) => pt(iso(...q))).join(' '), fill: col[0], stroke: col[1], 'stroke-width': 1 })));
    box(['#4a6070', '#7d8b96'], [
      [[-a, 0, -c], [a, 0, -c], [a, 0, c], [-a, 0, c]],
    ]);
    box(['#5d7282', '#9aa8b2'], [
      [[-a, b, -c], [a, b, -c], [a, b, c], [-a, b, c]],
      [[-a, 0, c], [a, 0, c], [a, b, c], [-a, b, c]],
      [[a, 0, -c], [a, 0, c], [a, b, c], [a, b, -c]],
    ]);
    LOC.forEach((l, i) => {
      const [x, y] = iso(...l.p);
      const on = i < n;
      pic.append(svg('circle', { cx: x, cy: y + (l.face === 'A' ? 8 : 0), r: 7, fill: on ? C.gold : 'none', stroke: on ? C.gold : 'rgba(220,231,238,0.25)', 'stroke-width': 1.5 }));
      if (on) pic.append(svg('text', { x: x + 10, y: y + 4, class: 'x-tick', fill: C.gold }, `${l.face}${i < 3 ? i + 1 : i < 5 ? i - 2 : 1}`));
    });
    const remaining = DOF.slice(n);
    pic.append(svg('text', { x: 16, y: 22, class: 'x-axis', fill: C.frost }, remaining.length ? `Still free: ${remaining.join(', ')}` : 'Fully located. Clamp it, then weld.'));
    out.set('locators', `${n} of 6`);
    out.set('dof', String(6 - n), n === 6 ? 'pass' : '');
  }

  const s = steps(
    [
      { title: 'Start: a loose part', body: 'A part on a table can move in six ways: slide in three directions and rotate about three axes.' },
      { title: 'Primary datum A, first point', body: 'The largest flat face rests on three points. The first stops it moving down.' },
      { title: 'A, second point', body: 'A second point on the same face stops one tilt.' },
      { title: 'A, third point', body: 'Three points define a plane. Now the part sits flat and cannot rock.' },
      { title: 'Secondary datum B, first point', body: 'Two points on a long side face. The first stops sliding towards it.' },
      { title: 'B, second point', body: 'The second stops the part rotating flat on the table.' },
      { title: 'Tertiary datum C', body: 'One point on the end face stops the last slide. Six points, six freedoms removed, same position every time.' },
    ],
    { onStep: draw }
  );

  root.append(
    lede('A welding jig works when every part lands in exactly the same place. The 3-2-1 rule does that with six points, and those same datums carry into the GD&T on the drawing.'),
    fig,
    s.node,
    out.node,
    notice(['Locators sit on the datums the drawing measures from, so the fixture and the inspection agree.', 'Over-constraining (a seventh point) makes the part rock or bend under the clamp.'])
  );
}
