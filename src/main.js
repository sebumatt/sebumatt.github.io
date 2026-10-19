import './styles.css';
import * as THREE from 'three';
import gsap from 'gsap';
import { VISIBLE_PROJECTS as PROJECTS, TAGS, ORGS } from './data/projects.js';
import { createStage } from './scene/stage.js';
import { createCryostat } from './scene/cryostat.js';
import { createRing } from './scene/ring.js';
import { renderPanel } from './panel/panel.js';

const $ = (s) => document.querySelector(s);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = (s) => (reducedMotion ? s * 0.12 : s); // shortens every flight when motion is reduced
const isNarrow = () => window.innerWidth < 760;

const panel = $('#panel');
const panelBody = $('#panel-body');
const listView = $('#list-view');
const viewToggle = $('#view-toggle');
const stageLabel = $('#stage-label');

let state = 'orbit'; // orbit | travel | open | closing
let currentId = null;
let cleanupExplainer = null;
let activeTag = null;

// ---------- List view (also the no-WebGL fallback) ----------
function buildList() {
  const list = $('#list');
  list.innerHTML = '';
  for (const p of PROJECTS) {
    const li = document.createElement('li');
    li.style.setProperty('--accent', ORGS[p.org].color);
    li.dataset.tags = p.tags.join('|');
    const a = document.createElement('a');
    a.href = `#/${p.id}`;
    for (const [cls, text] of [['li-org', `${p.org}, ${p.years}`], ['li-title', p.title], ['li-problem', p.problem]]) {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = text;
      a.appendChild(span);
    }
    li.appendChild(a);
    list.appendChild(li);
  }
}

function setListView(on) {
  listView.hidden = !on;
  document.body.classList.toggle('is-list', on);
  viewToggle.setAttribute('aria-pressed', String(on));
  viewToggle.textContent = on ? 'Show in 3D' : 'Show as list';
}
viewToggle.addEventListener('click', () => setListView(listView.hidden));

// ---------- Filters ----------
function buildFilters(onChange) {
  const wrap = $('#filters');
  for (const tag of TAGS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = tag;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      activeTag = activeTag === tag ? null : tag;
      wrap.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.textContent === activeTag)));
      onChange();
    });
    wrap.appendChild(b);
  }
}

function applyFilterToList() {
  document.querySelectorAll('#list li').forEach((li) => {
    li.hidden = activeTag ? !li.dataset.tags.split('|').includes(activeTag) : false;
  });
}

// ---------- Panel ----------
async function showPanel(id) {
  const p = PROJECTS.find((x) => x.id === id);
  if (cleanupExplainer) cleanupExplainer();
  cleanupExplainer = await renderPanel(panelBody, p);
  panel.setAttribute('aria-hidden', 'false');
  panel.classList.add('open');
  panel.scrollTop = 0;
  panelBody.scrollTop = 0;
  document.title = `${p.short}, Sebastian Mathews`;
}

function hidePanel() {
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  if (cleanupExplainer) cleanupExplainer();
  cleanupExplainer = null;
  document.title = 'Sebastian Mathews, engineering portfolio';
}

function step(dir) {
  const i = PROJECTS.findIndex((p) => p.id === currentId);
  const next = PROJECTS[(i + dir + PROJECTS.length) % PROJECTS.length];
  location.hash = `#/${next.id}`;
}
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
$('#close').addEventListener('click', () => (location.hash = '#/'));
window.addEventListener('keydown', (e) => {
  if (!currentId) return;
  if (e.key === 'Escape') location.hash = '#/';
  if (e.target.closest?.('input, select, textarea')) return;
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});

// ---------- 3D ----------
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

let scene3d = null;

async function init3D() {
  await Promise.race([
    Promise.all([document.fonts.load('700 44px Archivo'), document.fonts.load('600 26px Archivo')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);

  const stage = createStage($('#scene'));
  const { scene, camera, composer, view, applyView } = stage;
  const cryo = createCryostat();
  scene.add(cryo.root);
  const ring = createRing(PROJECTS);
  scene.add(ring.group);

  const HOME_CAM = new THREE.Vector3(0, 4.2, 17);
  const camTarget = new THREE.Vector3(0, -0.2, 0);
  const homeShift = () => (window.innerWidth > 1100 ? -0.15 : 0);
  const fitRing = () => {
    ring.setRadius(isNarrow() ? 5.4 : 8.4);
    if (state === 'orbit') {
      view.shift = homeShift();
      applyView();
    }
    HOME_CAM.set(0, isNarrow() ? 4.6 : 4.2, isNarrow() ? 21 : 17);
    if (state === 'orbit') camera.position.copy(HOME_CAM);
  };
  fitRing();
  window.addEventListener('resize', fitRing);

  // Pointer: hover, drag to spin, click to open.
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;
  let drag = null;
  let spinVelocity = 0;

  function pick(e) {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const cards = ring.cards.filter((c) => c.visible && c.userData.opacity > 0.5);
    const hit = raycaster.intersectObjects(cards, false)[0];
    const plateHit = hit ? null : raycaster.intersectObjects(cryo.plates, false)[0];
    return { card: hit?.object ?? null, plate: plateHit?.object ?? null };
  }

  const canvas = $('#scene');
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, moved: 0, last: e.clientX, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag && state === 'orbit') {
      const dx = e.clientX - drag.last;
      drag.moved += Math.abs(dx);
      drag.last = e.clientX;
      ring.angle += dx * 0.004;
      spinVelocity = dx * 0.004 * 60;
    }
    if (state !== 'orbit' || (drag && drag.moved > 4)) return setHover(null);
    const { card, plate } = pick(e);
    setHover(card);
    if (plate) {
      const s = plate.userData.stage;
      stageLabel.textContent = `${s.name}, ${s.temp}`;
      stageLabel.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
      stageLabel.classList.add('show');
    } else stageLabel.classList.remove('show');
  });
  canvas.addEventListener('pointerup', (e) => {
    const wasClick = drag && drag.moved < 6;
    drag = null;
    if (!wasClick) return;
    const { card } = pick(e);
    if (card && state !== 'travel') location.hash = `#/${card.userData.project.id}`;
    else if (!card && state === 'open') location.hash = '#/';
  });
  canvas.addEventListener('pointerleave', () => {
    setHover(null);
    stageLabel.classList.remove('show');
  });

  function setHover(card) {
    if (hovered === card) return;
    if (hovered && hovered.userData.project.id !== currentId) hovered.userData.targetScale = 1;
    hovered = card;
    canvas.style.cursor = card ? 'pointer' : 'grab';
    if (card) card.userData.targetScale = 1.12;
  }

  function applyFilter() {
    applyFilterToList();
    if (state !== 'orbit') return;
    for (const c of ring.cards) {
      const match = !activeTag || c.userData.project.tags.includes(activeTag);
      c.userData.targetOpacity = match ? 1 : 0.12;
    }
  }
  buildFilters(applyFilter);

  // Flight: ring stops, cryostat flies beside the card, camera follows.
  let tl = null;
  const flight = { t: 0 };
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const ctrl = new THREE.Vector3();
  const bez = (t, out) =>
    out
      .copy(from)
      .multiplyScalar((1 - t) ** 2)
      .addScaledVector(ctrl, 2 * (1 - t) * t)
      .addScaledVector(to, t * t);

  function flyTo(id) {
    const card = ring.cards.find((c) => c.userData.project.id === id);
    if (!card) return;
    const prevId = currentId;
    currentId = id;
    if (tl) tl.kill();
    state = 'travel';
    setHover(null);
    stageLabel.classList.remove('show');
    document.body.classList.add('is-open');
    hidePanel();

    ring.frozen = true;
    ring.speed = 0;
    spinVelocity = 0;
    for (const c of ring.cards) {
      const u = c.userData;
      const isActive = c === card;
      u.targetOpacity = isActive ? 1 : 0.1;
      u.targetScale = 1;
      if (!isActive && u.flip) gsap.to(u, { flip: 0, duration: T(0.4) });
    }

    const P = card.position.clone();
    const out = new THREE.Vector3(P.x, 0, P.z);
    if (out.lengthSq() < 1e-6) out.set(0, 0, 1);
    out.normalize();
    const left = new THREE.Vector3(out.z, 0, -out.x).negate(); // camera-left when looking in from outside
    const narrow = isNarrow();
    const C = P.clone().addScaledVector(left, narrow ? 1.7 : 2.3).add(new THREE.Vector3(0, -0.15, 0));
    const F = P.clone().add(C).multiplyScalar(0.5);
    const camPos = F.clone().addScaledVector(out, narrow ? 17 : 10.5).add(new THREE.Vector3(0, 0.7, 0));

    from.copy(cryo.root.position);
    to.copy(C);
    ctrl.copy(from).add(to).multiplyScalar(0.5);
    ctrl.y += prevId ? 1.5 : 3.2;
    flight.t = 0;

    const u = card.userData;
    tl = gsap.timeline({
      onComplete: () => {
        state = 'open';
        showPanel(id);
      },
    });
    tl.to(flight, {
      t: 1,
      duration: T(1.5),
      ease: 'power2.inOut',
      onUpdate: () => bez(flight.t, cryo.root.position),
    }, 0)
      .to(cryo.root.scale, { x: 0.52, y: 0.52, z: 0.52, duration: T(1.2), ease: 'power2.inOut' }, 0)
      .to(cryo.root.rotation, { y: Math.atan2(out.x, out.z), duration: T(1.5), ease: 'power2.inOut' }, 0)
      .to(camera.position, { x: camPos.x, y: camPos.y, z: camPos.z, duration: T(1.6), ease: 'power3.inOut' }, 0.05)
      .to(camTarget, { x: F.x, y: F.y, z: F.z, duration: T(1.6), ease: 'power3.inOut' }, 0.05)
      .to(view, { shift: narrow ? 0 : 0.26, shiftY: narrow ? 0.33 : 0, duration: T(1.4), ease: 'power2.inOut', onUpdate: applyView }, 0.1)
      .to(u, { flip: Math.PI * 2, duration: T(1.1), ease: 'power2.inOut' }, 0.35)
      .add(() => (u.targetScale = 1.3), 0.5);
  }

  function flyHome() {
    if (tl) tl.kill();
    state = 'closing';
    hidePanel();
    document.body.classList.remove('is-open');
    const card = ring.cards.find((c) => c.userData.project.id === currentId);
    currentId = null;
    from.copy(cryo.root.position);
    to.set(0, 0, 0);
    ctrl.copy(from).add(to).multiplyScalar(0.5);
    ctrl.y += 2;
    flight.t = 0;
    tl = gsap.timeline({
      onComplete: () => {
        state = 'orbit';
        ring.frozen = false;
        gsap.to(ring, { speed: ring.baseSpeed, duration: 1.2 });
        applyFilter();
      },
    });
    if (card) {
      card.userData.targetScale = 1;
      tl.to(card.userData, { flip: 0, duration: T(0.6) }, 0);
    }
    for (const c of ring.cards) c.userData.targetOpacity = 1;
    tl.to(flight, { t: 1, duration: T(1.3), ease: 'power2.inOut', onUpdate: () => bez(flight.t, cryo.root.position) }, 0)
      .to(cryo.root.scale, { x: 1, y: 1, z: 1, duration: T(1.3), ease: 'power2.inOut' }, 0)
      .to(cryo.root.rotation, { y: 0, duration: T(1.3) }, 0)
      .to(camera.position, { x: HOME_CAM.x, y: HOME_CAM.y, z: HOME_CAM.z, duration: T(1.4), ease: 'power3.inOut' }, 0)
      .to(camTarget, { x: 0, y: -0.2, z: 0, duration: T(1.4), ease: 'power3.inOut' }, 0)
      .to(view, { shift: homeShift(), shiftY: 0, duration: T(1.2), ease: 'power2.inOut', onUpdate: applyView }, 0);
  }

  // Render loop.
  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) {
      clock.getDelta();
      requestAnimationFrame(frame);
    }
  });
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (state === 'orbit' && !drag) {
      if (Math.abs(spinVelocity) > 0.001) {
        ring.angle += spinVelocity * dt;
        spinVelocity *= 0.94;
      }
      ring.speed += ((hovered ? 0.012 : ring.baseSpeed) - ring.speed) * Math.min(1, dt * 3);
    }
    ring.update(dt, camera);
    if (!reducedMotion) {
      cryo.body.rotation.y += dt * 0.12;
      cryo.body.position.y = -0.2 + Math.sin(t * 0.8) * 0.08;
    }
    cryo.glow.scale.setScalar(1 + Math.sin(t * 2.2) * 0.15);
    camera.lookAt(camTarget);
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Place the cards now so a deep link on first load has real targets.
  ring.update(0, camera);

  return {
    open: flyTo,
    close: () => currentId && flyHome(),
  };
}

// ---------- Router ----------
function route() {
  const id = location.hash.replace(/^#\/?/, '');
  const exists = PROJECTS.some((p) => p.id === id);
  if (exists) {
    if (id === currentId && state !== 'closing') return;
    if (!listView.hidden) setListView(false);
    if (scene3d) scene3d.open(id);
    else {
      currentId = id;
      document.body.classList.add('is-open');
      showPanel(id);
    }
  } else if (currentId) {
    if (scene3d) scene3d.close();
    else {
      currentId = null;
      document.body.classList.remove('is-open');
      hidePanel();
    }
  }
}

buildList();
if (hasWebGL()) {
  scene3d = await init3D();
} else {
  document.body.classList.add('no-webgl');
  buildFilters(applyFilterToList);
  setListView(true);
  viewToggle.hidden = true;
}
window.addEventListener('hashchange', route);
route();
