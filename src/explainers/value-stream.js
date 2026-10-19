import { el, lede, slider, controls, readout, canvas, loop, notice, C } from './kit.js';

// A tiny discrete-event line: four stations, queues between them, variation
// in every cycle. The bottleneck appears as the queue that keeps growing.
export default function mount(root) {
  const stations = [
    { name: 'Cut', cycle: 40 },
    { name: 'Coat', cycle: 55 },
    { name: 'Assemble', cycle: 48 },
    { name: 'Test', cycle: 35 },
  ].map((s) => ({ ...s, queue: 0, busy: false, rem: 0, busyTime: 0 }));
  let done = 0;
  let simTime = 0;
  const SPEED = 60; // simulated seconds per real second

  const sliders = stations.map((s) =>
    slider({ label: `${s.name} cycle time`, min: 20, max: 80, value: s.cycle, format: (v) => `${v} s`, onInput: (v) => (s.cycle = v) })
  );
  const cvSlider = slider({ label: 'Variation in every cycle', min: 0, max: 60, value: 25, format: (v) => `±${v}%`, onInput: () => {} });
  const resetBtn = el('button', { type: 'button', class: 'x-primary', onclick: reset }, 'Restart the line');
  const out = readout([
    ['tp', 'Output per hour'],
    ['wip', 'Parts waiting'],
    ['lead', 'Lead time estimate'],
    ['bn', 'Bottleneck'],
  ]);
  const cv = canvas(560, 220, 'Production line with queues');

  function reset() {
    for (const s of stations) Object.assign(s, { queue: 0, busy: false, rem: 0, busyTime: 0 });
    done = 0;
    simTime = 0;
  }

  const gauss = () => {
    let u = 0;
    for (let k = 0; k < 6; k++) u += Math.random();
    return (u - 3) / Math.sqrt(0.5);
  };
  const draw = (s) => Math.max(s.cycle * 0.25, s.cycle * (1 + (cvSlider.value / 100) * gauss() * 0.6));

  let lastOut = 0;
  const stop = loop((dt, now) => {
    let remaining = dt * SPEED;
    const step = 0.5;
    while (remaining > 0) {
      const h = Math.min(step, remaining);
      remaining -= h;
      simTime += h;
      for (let i = stations.length - 1; i >= 0; i--) {
        const s = stations[i];
        if (s.busy) {
          s.busyTime += h;
          s.rem -= h;
          if (s.rem <= 0) {
            s.busy = false;
            if (i === stations.length - 1) done++;
            else stations[i + 1].queue++;
          }
        }
        if (!s.busy && (i === 0 || s.queue > 0)) {
          if (i > 0) s.queue--;
          s.busy = true;
          s.rem = draw(s);
        }
      }
    }

    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    const bw = 96;
    const gap = (w - 40 - bw * stations.length) / (stations.length - 1);
    const util = stations.map((s) => s.busyTime / Math.max(simTime, 1));
    const bnIdx = stations.reduce((b, s, i) => (s.cycle > stations[b].cycle ? i : b), 0);
    stations.forEach((s, i) => {
      const x = 20 + i * (bw + gap);
      const y = 120;
      ctx.fillStyle = i === bnIdx ? 'rgba(229,115,106,0.18)' : 'rgba(220,231,238,0.06)';
      ctx.strokeStyle = i === bnIdx ? C.bad : 'rgba(220,231,238,0.25)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, bw, 64);
      ctx.strokeRect(x, y, bw, 64);
      ctx.fillStyle = C.frost;
      ctx.font = '600 13px Archivo, sans-serif';
      ctx.fillText(s.name, x + 10, y + 22);
      ctx.fillStyle = C.muted;
      ctx.font = '12px Archivo, sans-serif';
      ctx.fillText(`${Math.round(util[i] * 100)}% busy`, x + 10, y + 42);
      if (s.busy) {
        const p = 1 - s.rem / s.cycle;
        ctx.fillStyle = C.gold;
        ctx.fillRect(x + 10, y + 52, (bw - 20) * Math.max(0, Math.min(1, p)), 4);
      }
      // Queue in front of the station, as a pile of dots.
      if (i > 0) {
        const shown = Math.min(s.queue, 24);
        for (let k = 0; k < shown; k++) {
          ctx.fillStyle = C.copper;
          ctx.beginPath();
          ctx.arc(x - gap / 2 - 18 + (k % 4) * 12, y + 52 - Math.floor(k / 4) * 12, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = s.queue > 10 ? C.bad : C.muted;
        ctx.fillText(String(s.queue), x - gap / 2 - 8, y + 80);
      }
    });
    ctx.fillStyle = C.good;
    ctx.font = '600 13px Archivo, sans-serif';
    ctx.fillText(`${done} finished`, w - 110, 30);
    ctx.fillStyle = C.muted;
    ctx.fillText(`Simulated ${Math.floor(simTime / 3600)} h ${Math.floor((simTime % 3600) / 60)} min`, 20, 30);

    if (now - lastOut > 0.3) {
      lastOut = now;
      const tp = simTime > 300 ? (done / simTime) * 3600 : 0;
      const wip = stations.reduce((a, s) => a + s.queue + (s.busy ? 1 : 0), 0);
      out.set('tp', tp ? `${tp.toFixed(1)} parts` : 'Warming up');
      out.set('wip', String(wip), wip > 25 ? 'fail' : '');
      out.set('lead', tp ? `${Math.round((wip / tp) * 60)} min` : '–');
      out.set('bn', stations[bnIdx].name, 'fail');
    }
  });

  root.append(
    lede('A value stream map on paper shows averages. A simulation shows what averages hide: parts piling up in front of the slowest step, and variation making everything worse. This is a cut-down version of the SimPy engine.'),
    cv.node,
    controls(...sliders.map((s) => s.node)),
    controls(cvSlider.node, resetBtn),
    out.node,
    notice([
      'Output per hour is set by the slowest station. Speeding up any other station does nothing.',
      'Make the bottleneck faster and the queue moves to the next slowest station.',
      'Lead time follows Little’s law: parts waiting divided by output rate.',
    ])
  );
  return stop;
}
