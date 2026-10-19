import { el, lede, flow, slider, controls, readout, canvas, loop, notice, C } from './kit.js';

// Scan-to-simulation pipeline, then a sorting cell: a vision model labels
// items with a confidence; low-confidence items go to a manual check bin.
const KINDS = [
  { name: 'Plastic', color: C.cyan },
  { name: 'Metal', color: '#9aa8b2' },
  { name: 'Glass', color: '#9FC57A' },
  { name: 'Food', color: C.copper },
];

export default function mount(root) {
  const pipeline = flow([
    { title: 'Scan', sub: 'RealityCapture', detail: 'Photograph the real space and reconstruct it as a textured mesh, so the simulation starts from the room the cell will actually go in.' },
    { title: 'Clean up', sub: 'Blender', detail: 'Fix scale and orientation, simplify the mesh and split it into objects a physics engine can use.' },
    { title: 'Exchange', sub: 'USD', detail: 'Universal Scene Description carries the scene, materials and hierarchy into the simulator without losing structure.' },
    { title: 'Simulate', sub: 'Isaac Sim', detail: 'The robot, conveyor, camera and bins run in physics. Item mixes and failure cases are cheap to try here.' },
    { title: 'See and pick', sub: 'Local vision model', detail: 'A local model classifies each item from the simulated camera, and the robot picks it into a bin.' },
  ]);

  const thr = slider({ label: 'Confidence needed to auto-sort', min: 0.3, max: 0.95, step: 0.01, value: 0.7, format: (v) => `${Math.round(v * 100)}%`, onInput: () => {} });
  const out = readout([
    ['ok', 'Sorted correctly'],
    ['wrong', 'Wrong bin'],
    ['manual', 'Sent to manual check'],
  ]);
  const cv = canvas(560, 240, 'Conveyor with items being sorted into bins');
  const stats = { ok: 0, wrong: 0, manual: 0 };
  let items = [];
  let spawn = 0;

  const stop = loop((dt) => {
    spawn -= dt;
    if (spawn <= 0) {
      spawn = 0.7;
      const kind = Math.floor(Math.random() * 4);
      const conf = Math.min(0.99, 0.35 + Math.random() * 0.65);
      // Lower confidence means a higher chance the guess is wrong.
      const correct = Math.random() < conf;
      const guess = correct ? kind : (kind + 1 + Math.floor(Math.random() * 3)) % 4;
      items.push({ x: -20, kind, guess, conf, state: 'belt', y: 70, tx: 0, ty: 0 });
    }
    const { ctx, w, h } = cv;
    const binW = (w - 60) / 5;
    const binX = (i) => 30 + i * binW + binW / 2;
    const decideX = w * 0.45;

    for (const it of items) {
      if (it.state === 'belt') {
        it.x += dt * 110;
        if (it.x >= decideX) {
          it.state = 'fly';
          const auto = it.conf >= thr.value;
          it.bin = auto ? it.guess : 4;
          it.tx = binX(it.bin);
          it.ty = h - 40;
          if (!auto) stats.manual++;
          else if (it.guess === it.kind) stats.ok++;
          else stats.wrong++;
        }
      } else if (it.state === 'fly') {
        it.x += (it.tx - it.x) * Math.min(1, dt * 4);
        it.y += (it.ty - it.y) * Math.min(1, dt * 4);
        if (Math.abs(it.y - it.ty) < 2) it.state = 'done';
      }
    }
    items = items.filter((it) => it.state !== 'done');

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(220,231,238,0.08)';
    ctx.fillRect(0, 60, decideX + 20, 22);
    ctx.strokeStyle = C.gold;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(decideX, 40);
    ctx.lineTo(decideX, 100);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.gold;
    ctx.font = '12px Archivo, sans-serif';
    ctx.fillText('camera + model', decideX - 40, 34);
    [...KINDS, { name: 'Manual check', color: C.bad }].forEach((k, i) => {
      ctx.strokeStyle = k.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(binX(i) - binW / 2 + 6, h - 54, binW - 12, 40);
      ctx.fillStyle = k.color;
      ctx.fillText(k.name, binX(i) - binW / 2 + 12, h - 60);
    });
    for (const it of items) {
      ctx.fillStyle = KINDS[it.kind].color;
      ctx.beginPath();
      ctx.arc(it.x, it.y, 8, 0, Math.PI * 2);
      ctx.fill();
      if (it.state === 'fly' && it.bin !== 4 && it.guess !== it.kind) {
        ctx.strokeStyle = C.bad;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    const total = stats.ok + stats.wrong + stats.manual || 1;
    out.set('ok', `${Math.round((stats.ok / total) * 100)}%`, 'pass');
    out.set('wrong', `${Math.round((stats.wrong / total) * 100)}%`, stats.wrong / total > 0.1 ? 'fail' : '');
    out.set('manual', `${Math.round((stats.manual / total) * 100)}%`);
  });

  thr.node.querySelector('input').addEventListener('change', () => Object.assign(stats, { ok: 0, wrong: 0, manual: 0 }));

  root.append(
    lede('Before building a waste-sorting cell for a ship, build it in simulation: scan the real space, bring it into Isaac Sim, and let a vision model and a robot sort items there first.'),
    pipeline,
    el('h4', { class: 'x-step-title' }, 'The trade-off the simulation answers'),
    cv.node,
    controls(thr.node),
    out.node,
    notice(['Raise the confidence bar and fewer items land in the wrong bin, but more go to a person. The simulation finds the setting before hardware exists.'])
  );
  return stop;
}
