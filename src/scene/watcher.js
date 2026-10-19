import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A geared pan-tilt inspection head: a stereo camera pair on a yoke that
// follows the cursor. Yaw and pitch are driven through visible gear pairs,
// so every glance turns the pinions.

const YAW_TEETH = 48;
const YAW_PINION = 12;
const PITCH_TEETH = 30;
const PITCH_PINION = 10;

function gearGeometry(teeth, module, thickness, bore = 0.3) {
  const r = (module * teeth) / 2; // pitch radius
  const ra = r + module; // tip
  const rf = r - 1.25 * module; // root
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [rf, a],
      [ra, a + step * 0.18],
      [ra, a + step * 0.42],
      [rf, a + step * 0.6],
      [rf, a + step],
    ];
    pts.forEach(([rad, ang], k) => {
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      if (i === 0 && k === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * bore, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 4 });
  geo.translate(0, 0, -thickness / 2);
  return { geo, r };
}

export function createWatcher() {
  const root = new THREE.Group();
  root.name = 'watcher';
  const body = new THREE.Group();
  root.add(body);
  body.scale.setScalar(1.6);

  const gold = new THREE.MeshPhysicalMaterial({ color: '#D8A657', metalness: 1, roughness: 0.22, envMapIntensity: 1.5, clearcoat: 0.5 });
  const copper = new THREE.MeshPhysicalMaterial({ color: '#B8693D', metalness: 1, roughness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa8b2', metalness: 0.95, roughness: 0.3 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: '#3a4a56', metalness: 0.8, roughness: 0.38 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#06121a', metalness: 0.2, roughness: 0.05, clearcoat: 1 });
  const irisMat = new THREE.MeshBasicMaterial({ color: '#7FD3E6', toneMapped: false });

  const parts = [];
  const label = (mesh, name, detail) => {
    mesh.userData.part = { name, detail };
    parts.push(mesh);
    return mesh;
  };

  // Base.
  label(addMesh(body, new THREE.CylinderGeometry(1.35, 1.45, 0.4, 64), darkSteel, 0, -2.45, 0), 'Base', 'Bolted pedestal');
  addMesh(body, new THREE.CylinderGeometry(0.95, 1.1, 0.5, 48), steel, 0, -2.0, 0);
  const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8);
  for (let b = 0; b < 16; b++) {
    const a = (b / 16) * Math.PI * 2;
    addMesh(body, boltGeo, steel, Math.cos(a) * 1.22, -2.23, Math.sin(a) * 1.22);
  }

  // Yaw drive: a large ring gear on the turntable, driven by a motor pinion fixed to the base.
  const yaw = new THREE.Group();
  yaw.position.y = -1.7;
  body.add(yaw);
  const big = gearGeometry(YAW_TEETH, 0.045, 0.14, 0.55);
  const yawGear = new THREE.Mesh(big.geo, gold);
  yawGear.rotation.x = -Math.PI / 2;
  yaw.add(label(yawGear, 'Yaw gear', `${YAW_TEETH} teeth, ${YAW_TEETH / YAW_PINION}:1 to its pinion`));
  const small = gearGeometry(YAW_PINION, 0.045, 0.16, 0.3);
  const yawPinion = new THREE.Mesh(small.geo, copper);
  yawPinion.rotation.x = -Math.PI / 2;
  const pinionHolder = new THREE.Group();
  pinionHolder.position.set(big.r + small.r + 0.01, -1.7, 0);
  pinionHolder.add(yawPinion);
  body.add(pinionHolder);
  label(addMesh(body, new THREE.BoxGeometry(0.42, 0.5, 0.42), darkSteel, big.r + small.r, -2.05, 0), 'Yaw motor', 'Drives the turntable through a 4:1 gear pair');

  // Turntable and yoke.
  addMesh(yaw, new THREE.CylinderGeometry(0.7, 0.75, 0.16, 48), steel, 0, 0.14, 0);
  const armGeo = new RoundedBoxGeometry(0.16, 2.3, 0.5, 3, 0.05);
  for (const s of [-1, 1]) addMesh(yaw, armGeo, steel, s * 1.02, 1.3, 0);
  addMesh(yaw, new RoundedBoxGeometry(2.2, 0.16, 0.5, 3, 0.05), steel, 0, 0.22, 0);

  // A coiled cable up one arm.
  const coil = new THREE.Curve();
  coil.getPoint = (t, target = new THREE.Vector3()) => {
    const a = t * Math.PI * 2 * 9;
    return target.set(-1.02 + Math.cos(a) * 0.17, 0.35 + t * 1.9, Math.sin(a) * 0.3);
  };
  yaw.add(new THREE.Mesh(new THREE.TubeGeometry(coil, 300, 0.02, 6), copper));

  // Pitch axis between the arms.
  const pitch = new THREE.Group();
  pitch.position.y = 2.2;
  yaw.add(pitch);
  addMesh(pitch, new THREE.CylinderGeometry(0.06, 0.06, 2.12, 16), steel, 0, 0, 0).rotation.z = Math.PI / 2;

  const pg = gearGeometry(PITCH_TEETH, 0.04, 0.08, 0.4);
  const pitchGear = new THREE.Mesh(pg.geo, gold);
  pitchGear.rotation.y = Math.PI / 2;
  pitchGear.position.x = 0.86;
  pitch.add(label(pitchGear, 'Pitch gear', `${PITCH_TEETH} teeth, ${PITCH_TEETH / PITCH_PINION}:1 to its pinion`));
  const pp = gearGeometry(PITCH_PINION, 0.04, 0.1, 0.3);
  const pitchPinion = new THREE.Mesh(pp.geo, copper);
  pitchPinion.rotation.y = Math.PI / 2;
  const pitchPinionHolder = new THREE.Group();
  pitchPinionHolder.position.set(0.86, 2.2 - (pg.r + pp.r + 0.01), 0);
  pitchPinionHolder.add(pitchPinion);
  yaw.add(pitchPinionHolder);

  // Head housing.
  const head = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.95, 1.05, 5, 0.2), darkSteel);
  pitch.add(label(head, 'Sensor head', 'Stereo cameras on a geared pan-tilt'));
  const visor = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.62, 0.08, 3, 0.04), glass);
  visor.position.z = 0.52;
  pitch.add(visor);
  // Status light on top.
  addMesh(pitch, new THREE.CylinderGeometry(0.05, 0.05, 0.25, 12), steel, -0.5, 0.58, -0.2);
  const glow = addMesh(pitch, new THREE.SphereGeometry(0.06, 16, 12), irisMat, -0.5, 0.74, -0.2);

  // Eyes: lens barrels with a cyan iris and a pupil.
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.36, 0.02, 0.5);
    pitch.add(eye);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.22, 40), gold);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.08;
    eye.add(barrel);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.18;
    lens.scale.y = 0.45;
    eye.add(lens);
    const iris = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.12, 40), irisMat);
    iris.position.z = 0.285;
    eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.065, 32), new THREE.MeshBasicMaterial({ color: '#02070a' }));
    pupil.position.z = 0.286;
    eye.add(pupil);
    eye.userData = { iris, pupil };
    label(barrel, 'Camera', 'Follows your cursor');
    eyes.push(eye);
  }

  body.position.y = 0.5;

  // ---- Tracking ----
  const state = { yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0, blink: 0, nextBlink: 2.5 };
  const local = new THREE.Vector3();
  const pivotWorld = new THREE.Vector3();

  function lookAt(worldPoint) {
    pitch.getWorldPosition(pivotWorld);
    local.copy(worldPoint).sub(pivotWorld);
    // Undo the root's own yaw so the head angle is relative to its base.
    local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -root.rotation.y);
    const horiz = Math.hypot(local.x, local.z);
    state.targetYaw = Math.atan2(local.x, local.z);
    state.targetPitch = THREE.MathUtils.clamp(-Math.atan2(local.y, horiz), -0.7, 0.6);
  }

  function update(dt, t) {
    // Shortest way round for yaw.
    // The head covers most of the turn; the pupils lead and cover the rest.
    let dy = state.targetYaw * 0.75 - state.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    state.yaw += dy * Math.min(1, dt * 5);
    state.pitch += (state.targetPitch * 0.75 - state.pitch) * Math.min(1, dt * 6);
    const lead = (a, b) => THREE.MathUtils.clamp(Math.atan2(Math.sin(a - b), Math.cos(a - b)) * 0.22, -0.075, 0.075);
    const px = lead(state.targetYaw, state.yaw);
    const py = -lead(state.targetPitch, state.pitch);
    yaw.rotation.y = state.yaw;
    pitch.rotation.x = state.pitch;
    yawPinion.rotation.z = -state.yaw * (YAW_TEETH / YAW_PINION);
    pitchPinion.rotation.z = state.pitch * (PITCH_TEETH / PITCH_PINION);

    // Blink every few seconds.
    state.nextBlink -= dt;
    if (state.nextBlink <= 0) {
      state.blink = 0.16;
      state.nextBlink = 2.5 + Math.random() * 4;
    }
    state.blink = Math.max(0, state.blink - dt);
    const lid = state.blink > 0 ? Math.abs(Math.sin((state.blink / 0.16) * Math.PI)) : 0;
    for (const e of eyes) {
      e.userData.iris.position.x = e.userData.pupil.position.x = px;
      e.userData.iris.position.y = e.userData.pupil.position.y = py;
      e.userData.iris.scale.y = 1 - lid * 0.9;
      e.userData.pupil.scale.y = 1 - lid * 0.9;
    }
    glow.material.color.setHSL(0.53, 0.65, 0.62 + Math.sin(t * 2.4) * 0.1);
  }

  return { root, body, parts, glow, lookAt, update, restY: 0.5, openScale: 0.42 };
}

function addMesh(parent, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
