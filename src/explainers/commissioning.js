import { el, lede, slider, controls, readout, verdict, chart, steps, C } from './kit.js';

// Why the ship did not behave like the R&D rig: more heat loss to a colder,
// draughtier space means less energy left for treatment, so less capacity.
const HEATER = 60; // kW available, representative
const PROCESS_T = 95; // °C
const KWH_PER_KG = 0.07; // kWh per kg treated, representative

export default function mount(root) {
  const amb = slider({ label: 'Space temperature on board', min: 5, max: 35, value: 14, format: (v) => `${v} °C`, onInput: draw });
  const ins = slider({ label: 'Insulation and air movement', min: 0.2, max: 1.2, step: 0.05, value: 0.75, format: (v) => (v < 0.4 ? 'Lab-like, still air' : v < 0.8 ? 'Typical' : 'Draughty, partly bare'), onInput: draw });
  const out = readout([
    ['loss', 'Heat lost to the room'],
    ['cap', 'Treatment capacity'],
    ['vsRd', 'Versus the R&D rig'],
  ]);
  const v = verdict();
  const c = chart({ x: [5, 35], y: [0, 900], xLabel: 'Space temperature (°C)', yLabel: 'kg per hour', xFmt: (x) => x, yFmt: (y) => y });

  const UA = (k) => 0.32 * k; // kW per K
  const capacity = (ambient, k) => Math.max(0, (HEATER - UA(k) * (PROCESS_T - ambient)) / KWH_PER_KG);
  const RD = capacity(22, 0.3);

  function draw() {
    const loss = UA(ins.value) * (PROCESS_T - amb.value);
    const cap = capacity(amb.value, ins.value);
    out.set('loss', `${loss.toFixed(1)} kW`);
    out.set('cap', `${Math.round(cap)} kg/h`);
    const ratio = cap / RD;
    out.set('vsRd', `${Math.round(ratio * 100)}%`, ratio > 0.85 ? 'pass' : 'fail');
    v.set(ratio > 0.85, ratio > 0.85 ? 'Close to the design point.' : `A gap of ${Math.round((1 - ratio) * 100)}%. Agree a capacity compromise, then feed the cause back to R&D.`);
    const line = (k) => {
      const pts = [];
      for (let a = 5; a <= 35; a += 1) pts.push([a, capacity(a, k)]);
      return pts;
    };
    c.draw({
      series: [
        { pts: line(0.3), color: C.muted, dash: '6 5', label: 'R&D rig' },
        { pts: line(ins.value), color: C.gold, label: 'On board' },
      ],
      marks: [
        { x: 22, y: RD, color: C.muted, label: 'design point' },
        { x: amb.value, y: cap, color: C.gold },
      ],
    });
  }

  const month = steps([
    { title: 'Week 1: install and check', body: 'A team of four: two mechanical engineers, one external mechanical engineer, one automation and electrical engineer. Mechanical completion, then I/O checks.' },
    { title: 'Week 2: first runs', body: 'Capacity comes in below the R&D numbers. Measure temperatures and heat flows instead of guessing.' },
    { title: 'Week 3: fix causes', body: 'Agree the capacity compromise for the heat-loss gap. With the galley crew, fix a feedstock problem where it starts, in how waste was sorted.' },
    { title: 'Week 4: hand over', body: 'Picture-based operator manuals and hands-on handover to the crew. Lessons go back to R&D for the next design.' },
  ]);

  root.append(
    lede('The R&D rig ran in a warm, still lab. On the ship the same unit sat in a colder space with moving air, so more of the heater went into the room and less into treatment.'),
    controls(amb.node, ins.node),
    c.node,
    out.node,
    v.node,
    el('h4', { class: 'x-step-title' }, 'The month on board'),
    month.node
  );
  draw();
}
