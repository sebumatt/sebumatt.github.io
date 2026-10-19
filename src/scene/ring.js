import * as THREE from 'three';
import { ORGS } from '../data/projects.js';

const CARD_W = 2.2;
const CARD_H = 1.32;
const TEX_W = 640;
const TEX_H = 384;

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCard(p, index, total) {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext('2d');
  const accent = ORGS[p.org]?.color ?? '#D8A657';

  roundRect(ctx, 4, 4, TEX_W - 8, TEX_H - 8, 22);
  const g = ctx.createLinearGradient(0, 0, 0, TEX_H);
  g.addColorStop(0, 'rgba(26,44,58,0.96)');
  g.addColorStop(1, 'rgba(14,26,36,0.96)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(220,231,238,0.16)';
  ctx.stroke();

  // Accent edge in the company colour.
  ctx.save();
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(4, 4, 10, TEX_H);
  ctx.restore();

  const left = 44;
  ctx.fillStyle = accent;
  ctx.font = '600 26px Archivo, sans-serif';
  ctx.fillText(p.org, left, 62);

  ctx.fillStyle = 'rgba(220,231,238,0.55)';
  ctx.font = '500 22px Archivo, sans-serif';
  const meta = `${index + 1} of ${total}`;
  ctx.fillText(meta, TEX_W - 40 - ctx.measureText(meta).width, 62);

  ctx.fillStyle = '#DCE7EE';
  ctx.font = '700 44px Archivo, sans-serif';
  const lines = wrap(ctx, p.title, TEX_W - left - 44).slice(0, 3);
  lines.forEach((l, i) => ctx.fillText(l, left, 128 + i * 52));

  ctx.fillStyle = 'rgba(220,231,238,0.6)';
  ctx.font = '500 24px Archivo, sans-serif';
  ctx.fillText(p.years, left, TEX_H - 40);
  const tags = p.tags.slice(0, 2).join(', ');
  ctx.fillText(tags, TEX_W - 40 - ctx.measureText(tags).width, TEX_H - 40);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createRing(projects) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  const cards = projects.map((p, i) => {
    const mat = new THREE.MeshBasicMaterial({
      map: drawCard(p, i, projects.length),
      transparent: true,
      toneMapped: false,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { project: p, index: i, scale: 1, targetScale: 1, opacity: 1, targetOpacity: 1, flip: 0 };
    mesh.renderOrder = 2;
    group.add(mesh);
    return mesh;
  });

  const ring = {
    group,
    cards,
    angle: 0,
    speed: 0.06, // radians per second
    baseSpeed: 0.06,
    frozen: false,
    radius: 7.4,
    tilt: 0.16,
    setRadius(r) {
      ring.radius = r;
    },
    // Card i's position on the tilted orbit at the current ring angle.
    positionOf(i, target = new THREE.Vector3()) {
      const a = ring.angle + (i / cards.length) * Math.PI * 2;
      const x = Math.cos(a) * ring.radius;
      const z = Math.sin(a) * ring.radius;
      const y = Math.sin(a + 0.9) * ring.radius * ring.tilt + Math.sin(a * 3) * 0.25;
      return target.set(x, y, z);
    },
    update(dt, camera) {
      if (!ring.frozen) ring.angle += ring.speed * dt;
      cards.forEach((card, i) => {
        const u = card.userData;
        if (!u.pinned) ring.positionOf(i, card.position);
        card.lookAt(camera.position);
        card.rotateY(u.flip);
        u.scale += (u.targetScale - u.scale) * Math.min(1, dt * 8);
        card.scale.setScalar(u.scale);
        u.opacity += (u.targetOpacity - u.opacity) * Math.min(1, dt * 6);
        card.material.opacity = u.opacity;
        card.visible = u.opacity > 0.02;
      });
    },
  };
  return ring;
}
