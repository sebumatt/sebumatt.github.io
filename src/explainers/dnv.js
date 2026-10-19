import { lede, slider, controls, chart, toggle, verdict, steps, el, C } from './kit.js';

// Incremental pressure test: step up, hold, inspect; then hold at test pressure.
export default function mount(root) {
  let leak = false;
  const design = slider({ label: 'Design pressure', min: 2, max: 16, step: 0.5, value: 6, format: (v) => `${v} bar`, onInput: draw });
  const factor = slider({ label: 'Test pressure factor', min: 1.1, max: 1.5, step: 0.05, value: 1.3, format: (v) => `${v.toFixed(2)} × design`, onInput: draw });
  const leakBtn = toggle({ label: 'Simulate a small leak', value: false, onChange: (v2) => ((leak = v2), draw()) });
  const v = verdict();
  const c = chart({ x: [0, 100], y: [0, 26], xLabel: 'Time (min)', yLabel: 'Pressure (bar)', xFmt: (x) => x, yFmt: (y) => y });

  function draw() {
    const test = design.value * factor.value;
    const fractions = [0.25, 0.5, 0.75, 1];
    const pts = [[0, 0]];
    let t = 0;
    fractions.forEach((f, i) => {
      const p = test * f;
      t += 6;
      pts.push([t, p]);
      const hold = i === fractions.length - 1 ? 30 : 10;
      // A leak shows as a pressure decay during the final hold.
      if (leak && i === fractions.length - 1) {
        for (let k = 1; k <= hold; k += 2) pts.push([t + k, p - k * 0.035 * test * 0.25]);
      } else pts.push([t + hold, p]);
      t += hold;
    });
    pts.push([t + 6, 0]);
    c.draw({
      series: [{ pts, color: C.gold, fill: true, label: 'Test pressure' }],
      hlines: [
        { y: test, color: C.cyan, label: `test ${test.toFixed(1)} bar` },
        { y: design.value, color: C.muted, label: `design ${design.value} bar` },
      ],
    });
    v.set(!leak, leak ? 'Pressure falls during the final hold. The test fails; find the leak and repeat.' : 'Pressure holds at every step. The surveyor can witness and sign.');
  }

  const itp = steps([
    { title: 'Write the ITP', body: 'The inspection and test plan lists every check, its acceptance criterion, and who must witness it: us, the surveyor, or both.' },
    { title: 'Agree with DNV', body: 'The surveyor reviews the ITP before work starts, so hold points are known and nobody is surprised on test day.' },
    { title: 'Test in steps', body: 'Raise pressure in increments with holds between them. A problem shows early, at low stored energy, instead of at full test pressure.' },
    { title: 'Witness and sign', body: 'Hold at test pressure, inspect, record. With every hold point signed, the vessel is requalified.' },
  ]);

  root.append(
    lede('A pressure vessel is requalified by proving it holds more than it will ever see in service. It is raised in steps so a weakness shows up early, while it is still safe to stop.'),
    controls(design.node, factor.node, leakBtn),
    c.node,
    v.node,
    el('h4', { class: 'x-step-title' }, 'From plan to sign-off'),
    itp.node
  );
  draw();
}
