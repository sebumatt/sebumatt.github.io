import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const VACUUM = new THREE.Color('#0E1A24');

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = VACUUM;
  scene.fog = new THREE.Fog(VACUUM, 18, 34);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.6, 17);

  // A warm key and a cold rim, like a lab under work lights.
  const key = new THREE.DirectionalLight('#fff1dc', 2.2);
  key.position.set(5, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#7FD3E6', 1.4);
  rim.position.set(-6, 2, -6);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight('#c9dbe6', '#0E1A24', 0.35));

  // Floor: a faint ring grid that gives the orbit something to sit on.
  const floor = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 13, 96, 1),
    new THREE.MeshBasicMaterial({ color: '#16303f', transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.6;
  scene.add(floor);
  for (const r of [3, 6, 9, 12]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.012, r + 0.012, 160),
      new THREE.MeshBasicMaterial({ color: '#2b4a5c', transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -4.59;
    scene.add(ring);
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.5, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Shifts the projection centre so the scene can sit beside the open panel.
  const view = { shift: 0, shiftY: 0 };

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // Pull the camera back on narrow screens so the ring still fits.
    camera.fov = w < 700 ? 52 : 38;
    applyView();
  }

  function applyView() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (view.shift || view.shiftY) camera.setViewOffset(w, h, view.shift * w, view.shiftY * h, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, composer, view, applyView, resize };
}
