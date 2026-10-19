import * as THREE from 'three';

// A dilution refrigerator insert in the style of the gold "chandeliers"
// Bluefors builds: a room-temperature flange, then plates that get colder
// and smaller on the way down, joined by G10 supports and wired with coax.

export const STAGES = [
  { name: 'Top flange', temp: '300 K', y: 2.9, r: 1.7, metal: 'steel' },
  { name: '50 K plate', temp: '50 K', y: 1.95, r: 1.55 },
  { name: '4 K plate', temp: '4 K', y: 1.05, r: 1.4 },
  { name: 'Still plate', temp: '800 mK', y: 0.2, r: 1.22 },
  { name: 'Cold plate', temp: '100 mK', y: -0.6, r: 1.06 },
  { name: 'Mixing chamber plate', temp: '10 mK', y: -1.4, r: 0.92 },
];

export function createCryostat() {
  const root = new THREE.Group();
  root.name = 'cryostat';
  const body = new THREE.Group(); // spins slowly; root carries flight transforms
  root.add(body);

  const gold = new THREE.MeshPhysicalMaterial({
    color: '#D8A657',
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: 1.6,
    clearcoat: 0.6,
    clearcoatRoughness: 0.18,
  });
  const copper = new THREE.MeshPhysicalMaterial({ color: '#B8693D', metalness: 1, roughness: 0.32 });
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa8b2', metalness: 0.95, roughness: 0.3 });
  const g10 = new THREE.MeshStandardMaterial({ color: '#d9cfa8', metalness: 0, roughness: 0.55 });
  const coaxMat = new THREE.MeshStandardMaterial({ color: '#c7ced4', metalness: 0.9, roughness: 0.35 });

  const plates = [];
  STAGES.forEach((s, i) => {
    const mat = s.metal === 'steel' ? steel : gold;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r, i === 0 ? 0.2 : 0.13, 72), mat);
    plate.position.y = s.y;
    plate.userData.stage = s;
    body.add(plate);
    plates.push(plate);

    // Bolt circle around the rim.
    const bolts = 18 + i * 2;
    const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8);
    for (let b = 0; b < bolts; b++) {
      const a = (b / bolts) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeo, steel);
      bolt.position.set(Math.cos(a) * (s.r - 0.08), s.y + (i === 0 ? 0.11 : 0.065), Math.sin(a) * (s.r - 0.08));
      body.add(bolt);
    }

    // Thermalisation blocks clamped to each cold plate.
    if (i > 0) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + i * 0.7;
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.14), copper);
        block.position.set(Math.cos(a) * s.r * 0.62, s.y + 0.09, Math.sin(a) * s.r * 0.62);
        block.rotation.y = -a;
        body.add(block);
      }
    }

    // G10 supports to the plate above.
    if (i > 0) {
      const above = STAGES[i - 1];
      const len = above.y - s.y;
      const supportGeo = new THREE.CylinderGeometry(0.045, 0.045, len, 10);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
        const rod = new THREE.Mesh(supportGeo, g10);
        rod.position.set(Math.cos(a) * s.r * 0.82, s.y + len / 2, Math.sin(a) * s.r * 0.82);
        body.add(rod);
      }
    }
  });

  // Coax bundles: each line wanders slightly as it passes through the plates.
  const lines = 12;
  for (let l = 0; l < lines; l++) {
    const a0 = (l / lines) * Math.PI * 2;
    const pts = STAGES.map((s, i) => {
      const r = 0.42 + 0.05 * Math.sin(l * 1.7 + i);
      const a = a0 + i * 0.06;
      return new THREE.Vector3(Math.cos(a) * r, s.y, Math.sin(a) * r);
    });
    pts.unshift(new THREE.Vector3(pts[0].x, STAGES[0].y + 0.35, pts[0].z));
    const curve = new THREE.CatmullRomCurve3(pts);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.018, 6), coaxMat));
  }

  // Pulse-tube cold head and its motor on the top flange.
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 32), steel);
  head.position.set(0.75, 3.45, 0);
  body.add(head);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.45), steel);
  motor.position.set(0.75, 4.05, 0);
  body.add(motor);
  const pumpLine = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 10, 32, Math.PI), steel);
  pumpLine.position.set(-0.6, 3.0, 0);
  body.add(pumpLine);
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 20), steel);
  stub.position.set(-0.95, 3.25, 0);
  body.add(stub);

  // Continuous heat exchanger: a copper helix from the still down to the mixing chamber.
  const helix = new THREE.Curve();
  const hTop = STAGES[3].y - 0.08;
  const hBot = STAGES[5].y + 0.08;
  helix.getPoint = (t, target = new THREE.Vector3()) => {
    const a = t * Math.PI * 2 * 7;
    return target.set(Math.cos(a) * 0.24 - 0.5, hTop + (hBot - hTop) * t, Math.sin(a) * 0.24 + 0.25);
  };
  body.add(new THREE.Mesh(new THREE.TubeGeometry(helix, 400, 0.022, 8), copper));

  // Mixing chamber can and a sample stage below the coldest plate.
  const mxc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 40), gold);
  mxc.position.set(0, STAGES[5].y - 0.32, 0);
  body.add(mxc);
  const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 20), gold);
  finger.position.set(0, STAGES[5].y - 1.0, 0);
  body.add(finger);
  const sample = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 48), gold);
  sample.position.set(0, STAGES[5].y - 1.45, 0);
  body.add(sample);
  // A faint cyan glow marks the coldest point.
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#9fe6f5', toneMapped: false })
  );
  glow.position.set(0, STAGES[5].y - 1.55, 0);
  body.add(glow);

  // Centre the model vertically around the origin.
  body.position.y = -0.2;

  return { root, body, plates, glow };
}
