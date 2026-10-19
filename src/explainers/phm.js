import { lede, slider, toggle, controls, readout, verdict, canvas, loop, notice, C } from './kit.js';

// A live three-axis vibration signal with the two numbers the Node-RED
// dashboard shows: RMS (how much it shakes) and crest factor (how spiky).
export default function mount(root) {
  const N = 600;
  const axes = [
    { name: 'X', color: C.gold, buf: new Float32Array(N), phase: 0 },
    { name: 'Y', color: C.cyan, buf: new Float32Array(N), phase: 1.3 },
    { name: 'Z', color: C.copper, buf: new Float32Array(N), phase: 2.1 },
  ];
  let fault = false;
  let t = 0;
  const imbalance = slider({ label: 'Imbalance', min: 0.5, max: 6, step: 0.1, value: 1.6, format: (v) => `${v.toFixed(1)} mm/s`, onInput: () => {} });
  const faultBtn = toggle({ label: 'Inject bearing fault', value: false, onChange: (v) => (fault = v) });
  const out = readout([
    ['rms', 'RMS velocity, worst axis'],
    ['crest', 'Crest factor, worst axis'],
  ]);
  const v = verdict();
  const cv = canvas(560, 300, 'Live three-axis vibration signal');
  let lastReadout = 0;

  function sample(ax, time) {
    const f = 24.6; // running speed, Hz
    const amp = imbalance.value * Math.SQRT2;
    let x = amp * Math.sin(2 * Math.PI * f * time + ax.phase) * (ax.name === 'Z' ? 0.5 : 1);
    x += 0.25 * Math.sin(2 * Math.PI * 2 * f * time + ax.phase * 2);
    x += (Math.random() - 0.5) * 0.5;
    if (fault) {
      // Outer-race impacts: short decaying bursts at ~3.6× running speed.
      const bpfo = f * 3.6;
      const ph = (time * bpfo) % 1;
      x += ph < 0.12 ? 13 * Math.exp(-ph * 40) * Math.sin(ph * 900) * (ax.name === 'Y' ? 1 : 0.6) : 0;
    }
    return x;
  }

  const stop = loop((dt, now) => {
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      t += 1 / 1600;
      for (const ax of axes) {
        ax.buf.copyWithin(0, 1);
        ax.buf[N - 1] = sample(ax, t);
      }
    }
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    const lane = h / 3;
    let worstRms = 0;
    let worstCrest = 0;
    axes.forEach((ax, i) => {
      const mid = lane * i + lane / 2;
      ctx.strokeStyle = 'rgba(220,231,238,0.08)';
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();
      ctx.strokeStyle = ax.color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      let sum = 0;
      let peak = 0;
      for (let k = 0; k < N; k++) {
        const val = ax.buf[k];
        sum += val * val;
        peak = Math.max(peak, Math.abs(val));
        const x = (k / (N - 1)) * w;
        const y = mid - val * (lane / 26);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      const rms = Math.sqrt(sum / N);
      worstRms = Math.max(worstRms, rms);
      worstCrest = Math.max(worstCrest, peak / (rms || 1));
      ctx.fillStyle = ax.color;
      ctx.font = '600 12px Archivo, sans-serif';
      ctx.fillText(`${ax.name}  ${rms.toFixed(2)} mm/s`, 10, lane * i + 18);
    });
    if (now - lastReadout > 0.25) {
      lastReadout = now;
      out.set('rms', `${worstRms.toFixed(2)} mm/s`, worstRms > 4.5 ? 'fail' : 'pass');
      out.set('crest', worstCrest.toFixed(1), worstCrest > 4.5 ? 'fail' : 'pass');
      if (worstCrest > 4.5) v.set(false, 'Crest factor alarm: sharp impacts in the signal. Typical of an early bearing defect.');
      else if (worstRms > 4.5) v.set(false, 'RMS alarm: the whole machine is shaking more. Check balance and alignment.');
      else v.set(true, 'Normal running.');
    }
  });

  root.append(
    lede('A WISE-2410 sensor on a machine sends three-axis vibration over LoRaWAN to a gateway, then MQTT to a Node-RED dashboard. Two numbers do most of the work: RMS says how much it shakes, crest factor says how spiky the shaking is.'),
    cv.node,
    controls(imbalance.node, faultBtn),
    out.node,
    v.node,
    notice([
      'Raise imbalance: RMS climbs but crest factor stays calm. The machine is shaking evenly.',
      'Inject a bearing fault: RMS barely moves while crest factor jumps. That is why both are on the dashboard.',
      'Next step: mount it on a pump and train a model on its normal behaviour.',
    ])
  );
  return stop;
}
