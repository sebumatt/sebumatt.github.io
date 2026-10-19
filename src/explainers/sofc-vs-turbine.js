import { lede, slider, controls, readout, verdict, chart, notice, C } from './kit.js';

// 100 kW electric, 8000 h/year, 15 years at 7%. All figures representative.
const KW = 100;
const HOURS = 8000;
const YEARS = 15;
const RATE = 0.07;
const TECH = {
  sofc: { name: 'SOFC', capex: 3500, eff: 0.6, opex: 30, color: C.gold },
  mt: { name: 'Microturbine', capex: 1500, eff: 0.3, opex: 15, color: C.cyan },
};

const MWH = (KW * HOURS) / 1000;
const PV = (1 - (1 + RATE) ** -YEARS) / RATE;
const CRF = 1 / PV;

function evaluate(t, gas, elec, subsidy) {
  const capex = t.capex * KW * (t === TECH.sofc ? 1 - subsidy / 100 : 1);
  const fuel = (MWH / t.eff) * gas;
  const opex = MWH * t.opex;
  const annual = MWH * elec - fuel - opex;
  return { npv: -capex + annual * PV, lcoe: (capex * CRF + fuel + opex) / MWH };
}

export default function mount(root) {
  const gas = slider({ label: 'Gas price', min: 20, max: 100, value: 35, format: (v) => `€${v}/MWh`, onInput: draw });
  const elec = slider({ label: 'Electricity price', min: 80, max: 220, value: 170, format: (v) => `€${v}/MWh`, onInput: draw });
  const sub = slider({ label: 'Grant on SOFC investment', min: 0, max: 40, value: 0, format: (v) => `${v}%`, onInput: draw });
  const out = readout([
    ['sofcNpv', 'SOFC net present value'],
    ['mtNpv', 'Microturbine net present value'],
    ['sofcLcoe', 'SOFC cost per MWh'],
    ['mtLcoe', 'Microturbine cost per MWh'],
  ]);
  const v = verdict();
  const c = chart({ x: [20, 100], y: [-2200, 1400], xLabel: 'Gas price (€/MWh)', yLabel: 'NPV (k€)', xFmt: (x) => x, yFmt: (y) => y });

  function draw() {
    const s = evaluate(TECH.sofc, gas.value, elec.value, sub.value);
    const m = evaluate(TECH.mt, gas.value, elec.value, sub.value);
    const k = (x) => `€${Math.round(x / 1000).toLocaleString('en-US')}k`;
    out.set('sofcNpv', k(s.npv), s.npv > 0 ? 'pass' : 'fail');
    out.set('mtNpv', k(m.npv), m.npv > 0 ? 'pass' : 'fail');
    out.set('sofcLcoe', `€${Math.round(s.lcoe)}`);
    out.set('mtLcoe', `€${Math.round(m.lcoe)}`);
    const best = s.npv >= m.npv ? 'SOFC' : 'Microturbine';
    if (Math.max(s.npv, m.npv) > 0) v.set(true, `${best} wins by ${k(Math.abs(s.npv - m.npv))} over ${YEARS} years.`);
    else v.set(false, `Neither pays back at these prices. ${best} loses ${k(Math.abs(s.npv - m.npv))} less.`);

    const line = (t) => {
      const pts = [];
      for (let g = 20; g <= 100; g += 2) pts.push([g, evaluate(t, g, elec.value, sub.value).npv / 1000]);
      return pts;
    };
    // Crossover: where the two lines meet.
    let cross = null;
    for (let g = 20; g < 100; g += 0.5) {
      const d1 = evaluate(TECH.sofc, g, elec.value, sub.value).npv - evaluate(TECH.mt, g, elec.value, sub.value).npv;
      const d2 = evaluate(TECH.sofc, g + 0.5, elec.value, sub.value).npv - evaluate(TECH.mt, g + 0.5, elec.value, sub.value).npv;
      if (Math.sign(d1) !== Math.sign(d2)) cross = g;
    }
    c.draw({
      series: [
        { pts: line(TECH.sofc), color: C.gold, label: 'SOFC' },
        { pts: line(TECH.mt), color: C.cyan, label: 'Microturbine' },
      ],
      hlines: [{ y: 0, color: C.muted, label: 'break-even' }],
      vlines: cross ? [{ x: cross, color: C.copper, label: `crossover €${Math.round(cross)}` }] : [],
      marks: [
        { x: gas.value, y: s.npv / 1000, color: C.gold },
        { x: gas.value, y: m.npv / 1000, color: C.cyan },
      ],
    });
  }

  root.append(
    lede('A fuel cell costs more to buy but burns half the gas for the same electricity. Which one wins depends on prices you cannot control, so the model shows the whole range, not one answer.'),
    controls(gas.node, elec.node, sub.node),
    c.node,
    out.node,
    v.node,
    notice([
      'Cheap gas favours the cheaper machine; expensive gas favours the efficient one.',
      'A grant moves the SOFC line up by the same amount everywhere, which shifts the crossover left.',
      'The decision is "where is the crossover, and which side of it do we expect to live on?"',
    ])
  );
  draw();
}
