import { el, lede, slider, segmented, controls, readout, canvas, notice, rng, C } from './kit.js';

// A 2D toy of Gaussian splatting: a scene is rebuilt from soft coloured
// blobs that get smaller and more numerous as training runs. Capture passes
// at more heights give the optimiser views of more of the room.
export default function mount(root) {
  const RW = 260;
  const RH = 180;
  const ref = document.createElement('canvas');
  ref.width = RW;
  ref.height = RH;
  const r = ref.getContext('2d');
  // A drawing room: wall, window, table, lamp, picture, floor.
  r.fillStyle = '#3b4f5e';
  r.fillRect(0, 0, RW, RH);
  r.fillStyle = '#4b3a2c';
  r.fillRect(0, 128, RW, 52);
  const win = r.createLinearGradient(0, 20, 0, 90);
  win.addColorStop(0, '#e9f4fb');
  win.addColorStop(1, '#9fc3d6');
  r.fillStyle = win;
  r.fillRect(150, 22, 70, 72);
  r.fillStyle = '#2b3a46';
  r.fillRect(183, 22, 4, 72);
  r.fillRect(150, 56, 70, 4);
  r.fillStyle = '#c99a5a';
  r.fillRect(28, 36, 56, 40);
  r.fillStyle = '#7a3f2a';
  r.fillRect(34, 42, 44, 28);
  r.fillStyle = '#8a5a34';
  r.fillRect(60, 104, 120, 10);
  r.fillRect(68, 114, 8, 30);
  r.fillRect(164, 114, 8, 30);
  r.fillStyle = '#d8a657';
  r.beginPath();
  r.moveTo(110, 80);
  r.lineTo(130, 80);
  r.lineTo(124, 66);
  r.lineTo(116, 66);
  r.fill();
  r.fillRect(118, 80, 4, 24);
  const pixels = r.getImageData(0, 0, RW, RH).data;
  const colour = (x, y) => {
    const i = (Math.floor(y) * RW + Math.floor(x)) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  };

  const cv = canvas(560, 200, 'Reference view and splat reconstruction side by side');
  const iters = slider({ label: 'Training iterations', min: 0, max: 30000, step: 500, value: 3000, format: (v) => v.toLocaleString('en-US'), onInput: draw });
  let passes = 1;
  const out = readout([
    ['splats', 'Gaussians'],
    ['cover', 'Room seen by the cameras'],
  ]);

  function draw() {
    const { ctx } = cv;
    const p = iters.value / 30000;
    const n = Math.round(80 + p ** 0.8 * 3800);
    const radius = 26 - p ** 0.5 * 22;
    ctx.clearRect(0, 0, 560, 200);
    ctx.drawImage(ref, 10, 10, RW, RH);
    ctx.fillStyle = C.muted;
    ctx.font = '12px Archivo, sans-serif';
    ctx.fillText('Reference frame', 14, 196);
    const ox = 290;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, 10, RW, RH);
    ctx.clip();
    ctx.fillStyle = '#0e1a24';
    ctx.fillRect(ox, 10, RW, RH);
    // Rows the capture never saw stay empty: one pass at chest height misses
    // the ceiling and under the table.
    const seen = (y) => (passes >= 3 ? true : passes === 2 ? y > 12 : y > 30 && y < 124);
    const rand = rng(5);
    let kept = 0;
    for (let k = 0; k < n; k++) {
      const x = rand() * RW;
      const y = rand() * RH;
      if (!seen(y)) continue;
      kept++;
      const [cr, cg, cb] = colour(x, y);
      const rr = radius * (0.6 + rand() * 0.8);
      const g = ctx.createRadialGradient(ox + x, 10 + y, 0, ox + x, 10 + y, rr);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},0.85)`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(ox + x - rr, 10 + y - rr, rr * 2, rr * 2);
    }
    ctx.restore();
    ctx.fillStyle = C.muted;
    ctx.fillText('Splat render', ox + 4, 196);
    out.set('splats', kept.toLocaleString('en-US'));
    out.set('cover', passes >= 3 ? 'All of it' : passes === 2 ? 'Most, top rows thin' : 'Middle band only', passes >= 3 ? 'pass' : passes === 1 ? 'fail' : '');
  }

  root.append(
    lede('Gaussian splatting rebuilds a real space from video as millions of soft, coloured blobs. Training starts blurry and gets sharper as the blobs shrink and multiply. It can only rebuild what the camera saw.'),
    cv.node,
    controls(
      iters.node,
      segmented({
        label: 'Capture passes',
        options: [
          { value: 1, label: 'One height' },
          { value: 2, label: 'Two heights' },
          { value: 3, label: 'Three heights' },
        ],
        value: 1,
        onChange: (v) => ((passes = v), draw()),
      })
    ),
    out.node,
    el('p', { class: 'x-lede' }, 'Pipeline: Insta360 X5 video at several heights, perspective crops from the 360° footage with a custom Blender add-on, camera poses solved (COLMAP, RealityCapture, PostShot), then training and a web viewer.'),
    notice(['One pass at chest height leaves holes at the ceiling and under furniture. Extra heights fill them.', 'The drawing-room capture went on to a USD scene for Isaac Sim.'])
  );
  draw();
}
