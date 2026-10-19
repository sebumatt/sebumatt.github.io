import { el, lede, flow, slider, controls, canvas, notice, rng } from './kit.js';

// Four small tools on data the team already had, plus a live version of the
// defect heatmap idea: one part says little, hundreds show a pattern.
export default function mount(root) {
  const tools = flow([
    { title: 'Traceability', sub: 'SQLite + Flask', detail: 'Every component gets an ID, its supplier batch and inspection results. One search answers "which stacks used parts from this batch?".' },
    { title: 'Defect heatmaps', sub: 'Fiji/ImageJ + Python', detail: 'Defect positions from inspection images are stacked across many parts, so recurring locations stand out from random ones. Try it below.' },
    { title: 'Tilt analysis', sub: 'Streamlit + Azure AI Search', detail: 'A dashboard for stack tilt measurements with a retrieval-augmented assistant that answers questions from past reports and data.' },
    { title: 'Procurement analyzer', sub: 'Azure AI Foundry', detail: 'Reads quotes and order history so sourcing questions get answered from the documents instead of from memory.' },
  ]);

  const GX = 36;
  const GY = 20;
  const cv = canvas(560, 320, 'Defect heatmap across many parts');
  const n = slider({ label: 'Parts stacked into the map', min: 1, max: 400, value: 1, onInput: draw });
  const ramp = ['#0e1a24', '#1d3a4a', '#2f5a63', '#7a5a3a', '#b8693d', '#d8a657', '#f3e2b6'];

  function draw() {
    const grid = new Float32Array(GX * GY);
    const r = rng(11);
    for (let p = 0; p < n.value; p++) {
      const count = 3 + Math.floor(r() * 4);
      for (let k = 0; k < count; k++) {
        let x, y;
        if (r() < 0.45) {
          // Hidden cause: defects cluster near the inlet edge.
          x = Math.floor(GX * 0.82 + (r() - 0.5) * 6);
          y = Math.floor(GY * 0.3 + (r() - 0.5) * 5);
        } else {
          x = Math.floor(r() * GX);
          y = Math.floor(r() * GY);
        }
        if (x >= 0 && x < GX && y >= 0 && y < GY) grid[y * GX + x] += 1;
      }
    }
    const max = Math.max(1, ...grid);
    const { ctx, w, h } = cv;
    const cw = (w - 20) / GX;
    const ch = (h - 20) / GY;
    ctx.clearRect(0, 0, w, h);
    for (let y = 0; y < GY; y++)
      for (let x = 0; x < GX; x++) {
        const t = grid[y * GX + x] / max;
        ctx.fillStyle = ramp[Math.min(ramp.length - 1, Math.floor(t * (ramp.length - 1) + (t > 0 ? 0.6 : 0)))];
        ctx.fillRect(10 + x * cw, 10 + y * ch, cw - 1, ch - 1);
      }
    ctx.fillStyle = 'rgba(220,231,238,0.7)';
    ctx.font = '12px Archivo, sans-serif';
    ctx.fillText(n.value === 1 ? 'One part: looks random' : `${n.value} parts stacked`, 16, h - 16);
  }

  root.append(
    lede('None of these tools needed new data. They put scattered files, images and reports into one place where a question gets an answer in seconds. Click each one.'),
    tools,
    el('h4', { class: 'x-step-title' }, 'Why a heatmap beats looking at one image'),
    cv.node,
    controls(n.node),
    notice(['Drag the slider: with enough parts, one hot corner appears. That points to a process cause, such as a fixture or the coating flow, not to random dirt.'])
  );
  draw();
}
