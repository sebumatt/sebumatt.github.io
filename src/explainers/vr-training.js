import { el, lede, segmented, readout, verdict, notice } from './kit.js';

// Reusable presets: most of a training procedure is shared between pumps,
// blowers and tanks. The viewer runs one as a trainee would, in order.
const SHARED = ['Isolate and lock out', 'Drain and vent', 'Confirm zero energy'];
const PRESETS = {
  pump: { name: 'Hygienic centrifugal pump', own: ['Remove the casing clamp', 'Inspect impeller and seal', 'Reassemble and torque', 'Test run and leak check'] },
  blower: { name: 'Side-channel blower', own: ['Remove the inlet filter', 'Check impeller clearance', 'Refit and secure', 'Test run and listen'] },
  tank: { name: 'Tank entry', own: ['Ventilate the tank', 'Measure the atmosphere', 'Post the attendant', 'Open the manhole'] },
};

export default function mount(root) {
  let preset = 'pump';
  let next = 0;
  const list = el('ol', { class: 'x-flow x-checklist' });
  const out = readout([
    ['shared', 'Steps reused from the shared preset'],
    ['progress', 'Progress'],
  ]);
  const v = verdict();

  function render() {
    const p = PRESETS[preset];
    const all = [...SHARED.map((t) => ({ t, shared: true })), ...p.own.map((t) => ({ t, shared: false }))];
    // Shown shuffled so the trainee has to know the order.
    const order = all.map((s, i) => ({ ...s, i })).sort((a, b) => ((a.i * 7 + 3) % all.length) - ((b.i * 7 + 3) % all.length));
    list.replaceChildren(
      ...order.map((s) => {
        const b = el(
          'button',
          { type: 'button', 'aria-pressed': String(s.i < next) },
          el('strong', {}, s.i < next ? `${s.i + 1}. ${s.t}` : s.t),
          el('span', {}, s.shared ? 'Shared across all equipment' : `Specific to ${p.name.toLowerCase()}`)
        );
        b.addEventListener('click', () => {
          if (s.i < next) return;
          if (s.i === next) {
            next++;
            v.set(true, next === all.length ? 'Procedure complete. In VR, this is where the trainee gets scored.' : `Correct. Step ${next} done.`);
          } else v.set(false, `Not yet. In VR the valve would not turn: "${all[next].t}" comes first.`);
          render();
        });
        return el('li', {}, b);
      })
    );
    out.set('shared', `${SHARED.length} of ${all.length}`);
    out.set('progress', `${next} of ${all.length}`, next === all.length ? 'pass' : '');
  }

  root.append(
    lede('Training on real pumps and tanks at sea is risky and takes equipment out of service. In VR, a crew member can practise the procedure until the order is automatic. Pick equipment, then do the steps in the right order.'),
    segmented({
      label: 'Equipment preset',
      options: Object.entries(PRESETS).map(([k, p]) => ({ value: k, label: p.name })),
      value: preset,
      onChange: (k) => {
        preset = k;
        next = 0;
        v.set(true, 'New procedure loaded.');
        render();
      },
    }),
    list,
    out.node,
    v.node,
    notice(['The safety steps are the same for every machine, so they live in one shared preset. A new piece of equipment only adds its own steps.', 'The first Unity case is a hygienic centrifugal pump built from the vendor CAD model.'])
  );
  v.set(true, 'Start with whichever step should come first.');
  render();
}
