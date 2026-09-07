/**
 * Combat-lab aggro rings as a billboard bang: yellow = detect, red = aggro.
 * One sprite per actor — not a second VFX engine.
 */
import * as THREE from 'three';

let _tex = null;

function bangTex() {
  if (_tex) return _tex;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = '#fff8c8';
  g.beginPath();
  g.moveTo(32, 6);
  g.lineTo(58, 54);
  g.lineTo(6, 54);
  g.closePath();
  g.fill();
  g.strokeStyle = '#1a1408';
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = '#1a1408';
  g.font = 'bold 36px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('!', 32, 38);
  _tex = new THREE.CanvasTexture(c);
  _tex.colorSpace = THREE.SRGBColorSpace;
  return _tex;
}

export function attachAlertMark(actor, height = 1.8) {
  if (!actor?.root || actor.alertMark) return actor?.alertMark;
  const map = bangTex();
  if (!map) return null;
  const mat = new THREE.SpriteMaterial({
    map: bangTex(),
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const spr = new THREE.Sprite(mat);
  spr.name = 'alert-mark';
  spr.scale.set(0.42, 0.42, 1);
  spr.position.y = height + 0.35;
  spr.visible = false;
  spr.renderOrder = 8;
  actor.root.add(spr);
  actor.alertMark = spr;
  return spr;
}

export function updateAlertMark(e) {
  const spr = e?.actor?.alertMark;
  if (!spr) return;
  if (!e.alive || e.asleep) {
    spr.visible = false;
    return;
  }
  if ((e.aggro || 0) > 0) {
    spr.visible = true;
    spr.material.color.setHex(0xd8433a);
    spr.position.y = (e.prefab?.height || 1.8) + 0.4;
    return;
  }
  if (e.alert) {
    spr.visible = true;
    spr.material.color.setHex(0xffe08a);
    spr.position.y = (e.prefab?.height || 1.8) + 0.35;
    return;
  }
  spr.visible = false;
}
