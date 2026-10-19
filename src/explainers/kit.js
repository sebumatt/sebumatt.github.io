// Small building blocks shared by every explainer: controls, readouts,
// step-throughs and a minimal SVG chart. Everything returns DOM nodes.

export const C = {
  gold: '#D8A657',
  copper: '#B8693D',
  cyan: '#7FD3E6',
  frost: '#DCE7EE',
  muted: '#8FA3B1',
  steel: '#5d7282',
  good: '#7CCB8E',
  bad: '#E5736A',
  grid: 'rgba(220,231,238,0.09)',
};

export function el(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object')
      for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? n.style.setProperty(sk, sv) : (n.style[sk] = sv);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}

const svgNS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, ...children) {
  const n = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const c of children.flat()) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}

let uid = 0;
export function slider({ label, min, max, step = 1, value, format = (v) => v, onInput }) {
  const id = `s${++uid}`;
  const out = el('output', { for: id }, format(value));
  const input = el('input', { id, type: 'range', min, max, step, value });
  input.addEventListener('input', () => {
    out.textContent = format(+input.value);
    onInput?.(+input.value);
  });
  const node = el('div', { class: 'x-slider' }, el('label', { for: id }, label), out, input);
  return {
    node,
    get value() {
      return +input.value;
    },
    set(v) {
      input.value = v;
      out.textContent = format(+v);
    },
  };
}

export function toggle({ label, value = false, onChange }) {
  const b = el('button', { type: 'button', class: 'x-toggle', 'aria-pressed': String(value) }, label);
  b.addEventListener('click', () => {
    const v = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(v));
    onChange?.(v);
  });
  return b;
}

export function segmented({ label, options, value, onChange }) {
  const wrap = el('div', { class: 'x-seg', role: 'group', 'aria-label': label });
  const buttons = options.map((o) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(o.value === value) }, o.label);
    b.addEventListener('click', () => {
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onChange?.(o.value);
    });
    return b;
  });
  wrap.append(...buttons);
  return wrap;
}

export function controls(...nodes) {
  return el('div', { class: 'x-controls' }, ...nodes);
}

// Plain-language opener, like the first line of a Claude explainer.
export function lede(text) {
  return el('p', { class: 'x-lede' }, text);
}

export function notice(points) {
  return el('div', { class: 'x-notice' }, el('p', { class: 'x-notice-h' }, 'What to notice'), el('ul', {}, points.map((p) => el('li', {}, p))));
}

// Key/value readout with optional pass/fail status per row.
export function readout(rows) {
  const node = el('dl', { class: 'x-readout' });
  const cells = {};
  for (const [key, label] of rows) {
    const dd = el('dd', {}, '–');
    node.append(el('div', {}, el('dt', {}, label), dd));
    cells[key] = dd;
  }
  return {
    node,
    set(key, text, status) {
      cells[key].textContent = text;
      cells[key].dataset.status = status ?? '';
    },
  };
}

export function verdict() {
  const node = el('p', { class: 'x-verdict', role: 'status' });
  return {
    node,
    set(ok, text) {
      node.dataset.ok = String(ok);
      node.textContent = text;
    },
  };
}

// A numbered walk-through: the content really is a sequence here.
export function steps(list, { onStep } = {}) {
  let i = 0;
  const title = el('h4', { class: 'x-step-title' });
  const body = el('p', { class: 'x-step-body' });
  const dots = el('ol', { class: 'x-step-dots' });
  const buttons = list.map((s, k) => {
    const b = el('button', { type: 'button', 'aria-label': `Step ${k + 1}: ${s.title}` }, String(k + 1));
    b.addEventListener('click', () => go(k));
    dots.append(el('li', {}, b));
    return b;
  });
  const prev = el('button', { type: 'button', class: 'ghost' }, 'Back');
  const next = el('button', { type: 'button', class: 'x-primary' }, 'Next step');
  prev.addEventListener('click', () => go(i - 1));
  next.addEventListener('click', () => go(i + 1));
  function go(k) {
    i = Math.max(0, Math.min(list.length - 1, k));
    title.textContent = list[i].title;
    body.textContent = list[i].body;
    buttons.forEach((b, k2) => {
      b.setAttribute('aria-current', k2 === i ? 'step' : 'false');
      b.dataset.done = String(k2 < i);
    });
    prev.disabled = i === 0;
    next.disabled = i === list.length - 1;
    onStep?.(i);
  }
  const node = el('div', { class: 'x-steps' }, dots, title, body, el('div', { class: 'x-step-nav' }, prev, next));
  go(0);
  return { node, go, get index() { return i; } };
}

// Minimal line/area chart in SVG. draw() can be called on every input change.
export function chart({ w = 560, h = 260, x, y, xLabel, yLabel, xTicks = 5, yTicks = 4, xFmt = (v) => v, yFmt = (v) => v }) {
  const pad = { l: 52, r: 16, t: 14, b: 40 };
  const root = svg('svg', { viewBox: `0 0 ${w} ${h}`, class: 'x-chart', role: 'img' });
  const sx = (v) => pad.l + ((v - x[0]) / (x[1] - x[0])) * (w - pad.l - pad.r);
  const sy = (v) => h - pad.b - ((v - y[0]) / (y[1] - y[0])) * (h - pad.t - pad.b);
  const axes = svg('g');
  for (let k = 0; k <= yTicks; k++) {
    const v = y[0] + ((y[1] - y[0]) * k) / yTicks;
    axes.append(svg('line', { x1: pad.l, x2: w - pad.r, y1: sy(v), y2: sy(v), stroke: C.grid }));
    axes.append(svg('text', { x: pad.l - 8, y: sy(v) + 4, 'text-anchor': 'end', class: 'x-tick' }, yFmt(+v.toFixed(2))));
  }
  for (let k = 0; k <= xTicks; k++) {
    const v = x[0] + ((x[1] - x[0]) * k) / xTicks;
    axes.append(svg('text', { x: sx(v), y: h - pad.b + 18, 'text-anchor': 'middle', class: 'x-tick' }, xFmt(+v.toFixed(2))));
  }
  if (xLabel) axes.append(svg('text', { x: (pad.l + w - pad.r) / 2, y: h - 4, 'text-anchor': 'middle', class: 'x-axis' }, xLabel));
  if (yLabel)
    axes.append(svg('text', { x: 12, y: (pad.t + h - pad.b) / 2, 'text-anchor': 'middle', class: 'x-axis', transform: `rotate(-90 12 ${(pad.t + h - pad.b) / 2})` }, yLabel));
  const layer = svg('g');
  root.append(axes, layer);
  const legend = el('div', { class: 'x-legend' });
  const node = el('figure', { class: 'x-figure' }, root, legend);
  return {
    node,
    sx,
    sy,
    draw({ series = [], hlines = [], vlines = [], marks = [], bands = [] }) {
      layer.replaceChildren();
      legend.replaceChildren();
      for (const b of bands)
        layer.append(svg('rect', { x: sx(b.x0), y: pad.t, width: Math.max(0, sx(b.x1) - sx(b.x0)), height: h - pad.t - pad.b, fill: b.color, opacity: b.opacity ?? 0.12 }));
      for (const l of hlines) {
        layer.append(svg('line', { x1: pad.l, x2: w - pad.r, y1: sy(l.y), y2: sy(l.y), stroke: l.color, 'stroke-dasharray': '5 5' }));
        if (l.label) layer.append(svg('text', { x: w - pad.r - 4, y: sy(l.y) - 6, 'text-anchor': 'end', class: 'x-tick', fill: l.color }, l.label));
      }
      for (const l of vlines) {
        layer.append(svg('line', { x1: sx(l.x), x2: sx(l.x), y1: pad.t, y2: h - pad.b, stroke: l.color, 'stroke-dasharray': '4 4' }));
        if (l.label) layer.append(svg('text', { x: sx(l.x) + 6, y: pad.t + 12, class: 'x-tick', fill: l.color }, l.label));
      }
      for (const s of series) {
        const d = s.pts.map(([a, b], k) => `${k ? 'L' : 'M'}${sx(a).toFixed(1)},${sy(Math.max(y[0], Math.min(y[1], b))).toFixed(1)}`).join('');
        if (s.fill) layer.append(svg('path', { d: `${d}L${sx(s.pts.at(-1)[0])},${sy(y[0])}L${sx(s.pts[0][0])},${sy(y[0])}Z`, fill: s.color, opacity: 0.12 }));
        layer.append(svg('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.width ?? 2.2, 'stroke-dasharray': s.dash ?? null, 'stroke-linejoin': 'round' }));
        if (s.label) legend.append(el('span', { style: { '--c': s.color } }, s.label));
      }
      for (const m of marks) {
        layer.append(svg('circle', { cx: sx(m.x), cy: sy(m.y), r: 5, fill: m.color ?? C.frost }));
        if (m.label) layer.append(svg('text', { x: sx(m.x) + 8, y: sy(m.y) - 8, class: 'x-tick', fill: m.color ?? C.frost }, m.label));
      }
    },
  };
}

// Canvas sized for the device pixel ratio; draw in CSS pixels.
export function canvas(w, h, label) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const node = el('canvas', { class: 'x-canvas', width: w * dpr, height: h * dpr, role: 'img', 'aria-label': label });
  node.style.aspectRatio = `${w} / ${h}`;
  const ctx = node.getContext('2d');
  ctx.scale(dpr, dpr);
  return { node, ctx, w, h };
}

export function loop(fn) {
  let id;
  let last = performance.now();
  const tick = (now) => {
    fn(Math.min((now - last) / 1000, 0.05), now / 1000);
    last = now;
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

// Seeded random so a "generate" button gives repeatable demos.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fmt = {
  eur: (v) => `€${Math.round(v).toLocaleString('en-US')}`,
  k: (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`),
  pct: (v) => `${Math.round(v)}%`,
};

// Clickable flow diagram: boxes in a row with a detail line underneath.
export function flow(nodes, { onSelect } = {}) {
  const detail = el('p', { class: 'x-flow-detail' });
  const row = el('div', { class: 'x-flow' });
  const btns = nodes.map((n, i) => {
    const b = el('button', { type: 'button', 'aria-pressed': 'false' }, el('strong', {}, n.title), n.sub ? el('span', {}, n.sub) : null);
    b.addEventListener('click', () => select(i));
    row.append(b);
    return b;
  });
  function select(i) {
    btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    detail.textContent = nodes[i].detail;
    onSelect?.(i);
  }
  select(0);
  return el('div', {}, row, detail);
}
