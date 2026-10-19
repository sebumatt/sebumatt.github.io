import { el, lede, slider, controls, readout, canvas, steps, rng, C } from './kit.js';

// Good / not-good from two numbers per image: defect pixel area and
// missing-coating area. The viewer moves the limits and sees a batch re-sort.
export default function mount(root) {
  const r = rng(42);
  const parts = Array.from({ length: 24 }, () => {
    const bad = r() < 0.3;
    return {
      defect: Math.round((bad ? 120 + r() * 380 : r() * 160) * (r() < 0.15 ? 1.6 : 1)),
      missing: Math.round(bad && r() < 0.5 ? 60 + r() * 200 : r() * 70),
      blobs: Array.from({ length: 8 }, () => [r(), r(), r()]),
    };
  });

  const cv = canvas(560, 250, 'Batch of 24 inspected parts');
  const defectLimit = slider({ label: 'Defect pixel area limit', min: 50, max: 400, step: 10, value: 200, format: (v) => `${v} px`, onInput: draw });
  const missingLimit = slider({ label: 'Missing coating limit', min: 20, max: 200, step: 5, value: 80, format: (v) => `${v} px`, onInput: draw });
  const out = readout([
    ['good', 'Good'],
    ['ng', 'Not good'],
    ['rate', 'Reject rate'],
  ]);

  function draw() {
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    const cols = 8;
    const cw = (w - 16) / cols;
    const ch = (h - 16) / 3;
    let ng = 0;
    parts.forEach((p, i) => {
      const x = 8 + (i % cols) * cw + 4;
      const y = 8 + Math.floor(i / cols) * ch + 4;
      const fail = p.defect > defectLimit.value || p.missing > missingLimit.value;
      if (fail) ng++;
      ctx.fillStyle = '#34505f';
      ctx.fillRect(x, y, cw - 8, ch - 8);
      // Missing coating shows as a bare patch; defects as dark specks.
      const patch = Math.sqrt(p.missing) * 1.6;
      ctx.fillStyle = '#7d8b96';
      ctx.fillRect(x + 6, y + ch - 14 - patch, patch, patch);
      ctx.fillStyle = '#152330';
      p.blobs.slice(0, 2 + Math.round(p.defect / 70)).forEach(([a, b, c]) => {
        ctx.beginPath();
        ctx.arc(x + 8 + a * (cw - 24), y + 8 + b * (ch - 24), 1.5 + c * Math.sqrt(p.defect) * 0.18, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.lineWidth = 2;
      ctx.strokeStyle = fail ? C.bad : C.good;
      ctx.strokeRect(x, y, cw - 8, ch - 8);
      ctx.fillStyle = fail ? C.bad : C.good;
      ctx.font = '600 11px Archivo, sans-serif';
      ctx.fillText(fail ? 'NG' : 'OK', x + cw - 30, y + 14);
    });
    out.set('good', String(parts.length - ng));
    out.set('ng', String(ng));
    out.set('rate', `${Math.round((ng / parts.length) * 100)}%`, ng / parts.length > 0.35 ? 'fail' : '');
  }

  const project = steps([
    { title: 'Specify', body: 'Write the decision rule from the process requirement: a part is not good when defect pixel area or missing-coating area passes its limit. The camera supplier builds to this, not to a guess.' },
    { title: 'Plan and buy', body: 'Schedule, budget approval and delivery follow-up with the supplier, with the acceptance tests agreed before the machine is built.' },
    { title: 'Factory acceptance test (FAT)', body: 'At the supplier: run known good and known bad reference parts and check the system sorts them the way the specification says.' },
    { title: 'Site acceptance test (SAT)', body: 'Repeat on the line, at production speed, with real lighting and handling. Differences from FAT become follow-up actions.' },
    { title: 'Follow-up', body: 'Close the open points and tune the limits from production data, not from opinion.' },
  ]);

  root.append(
    lede('An inspection camera only needs two numbers per part to decide: how many pixels look like defects, and how many show missing coating. Move the limits and watch the batch re-sort.'),
    cv.node,
    controls(defectLimit.node, missingLimit.node),
    out.node,
    el('h4', { class: 'x-step-title' }, 'How the system got into the line'),
    project.node
  );
  draw();
}
