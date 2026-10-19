import { el, svg, lede, steps, C } from './kit.js';

// A non-conformance from detection to re-approval, drawn on the part itself.
export default function mount(root) {
  const W = 560;
  const H = 200;
  const pic = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'x-chart', role: 'img', 'aria-label': 'Gas-flow component with weld seam' });
  const fig = el('figure', { class: 'x-figure' }, pic);

  const STATES = [
    { seam: C.bad, tag: 'Found at verification', tagColor: C.bad, flaw: true },
    { seam: C.bad, tag: 'NCR raised, part on hold', tagColor: C.gold, flaw: true, hold: true },
    { seam: C.bad, tag: 'Root cause with design', tagColor: C.gold, flaw: true, hold: true, cause: true },
    { seam: C.cyan, tag: 'Corrective action applied', tagColor: C.cyan, hold: true },
    { seam: C.good, tag: 'Re-approved', tagColor: C.good },
  ];

  function draw(i) {
    const s = STATES[i];
    pic.replaceChildren();
    // Two tubes and a flange joined by a weld seam.
    pic.append(svg('rect', { x: 60, y: 80, width: 200, height: 44, rx: 6, fill: '#5d7282' }));
    pic.append(svg('rect', { x: 300, y: 80, width: 200, height: 44, rx: 6, fill: '#5d7282' }));
    pic.append(svg('rect', { x: 256, y: 64, width: 48, height: 76, rx: 4, fill: '#7d8b96' }));
    pic.append(svg('path', { d: 'M256 64 Q262 102 256 140 M304 64 Q298 102 304 140', stroke: s.seam, 'stroke-width': 5, fill: 'none' }));
    if (s.flaw) {
      pic.append(svg('circle', { cx: 258, cy: 96, r: 5, fill: C.bad }));
      pic.append(svg('circle', { cx: 258, cy: 96, r: 16, fill: 'none', stroke: C.bad, 'stroke-width': 1.5 }));
    }
    if (s.hold) {
      pic.append(svg('rect', { x: 380, y: 30, width: 120, height: 30, rx: 4, fill: 'none', stroke: C.gold }));
      pic.append(svg('text', { x: 440, y: 50, 'text-anchor': 'middle', class: 'x-tick', fill: C.gold }, 'On hold, do not use'));
    }
    if (s.cause) {
      ['Joint design', 'Weld parameters', 'Fit-up'].forEach((t, k) => {
        pic.append(svg('line', { x1: 258, y1: 96, x2: 110 + k * 30, y2: 30 + k * 12, stroke: C.gold, 'stroke-dasharray': '3 3' }));
        pic.append(svg('text', { x: 40 + k * 34, y: 26 + k * 12, class: 'x-tick', fill: C.frost }, t));
      });
    }
    pic.append(svg('text', { x: W / 2, y: H - 20, 'text-anchor': 'middle', fill: s.tagColor, 'font-size': 15, 'font-weight': 600 }, s.tag));
  }

  const flow = steps(
    [
      { title: 'Catch it', body: 'The weld issue on the gas-flow component surfaced during manufacturing verification, before the part reached assembly.' },
      { title: 'Raise and own the NCR', body: 'A non-conformance report puts the part on hold and gives the problem one owner, so it cannot be quietly reworked or forgotten.' },
      { title: 'Find the root cause', body: 'Work with the design team on why it happened, not just what is wrong with this part: joint design, weld parameters, fit-up.' },
      { title: 'Correct', body: 'The corrective action changes the cause, so the next part is right, and the affected part is fixed or replaced.' },
      { title: 'Re-approve', body: 'The corrected part is verified again against the original requirement and released. The NCR is closed with evidence.' },
    ],
    { onStep: draw }
  );

  root.append(
    lede('A non-conformance is only closed when the cause is fixed and the part is proven good again. Step through it on the part.'),
    fig,
    flow.node
  );
}
