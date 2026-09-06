/**
 * Owned third-person camera for dungeon crawl.
 * Harvest: Casting CameraRig TPS (yaw/pitch, shoulder, exp follow, look-along-aim).
 * OrbitControls never writes the lens. Indoor boom + grid occlusion for halls.
 */
import * as THREE from 'three';
import { DUNGEON_SI, PLAY } from '../ssot.js';
import { firstObstruction } from '../grid/cells.js';

const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _want = new THREE.Vector3();
const _look = new THREE.Vector3();
const _ray = new THREE.Raycaster();

function spec() {
  return PLAY.tps;
}

export class PlayTpsCamera {
  constructor(dom) {
    const s = spec();
    this.dom = dom;
    this.camera = new THREE.PerspectiveCamera(s.fov, innerWidth / innerHeight, 0.12, 72);
    this.yaw = 0;
    this.pitch = s.defaultPitch;
    this.distance = s.distance;
    this.anchor = new THREE.Vector3();
    this.enabled = false;
    this.sprinting = false;
    this.occluders = [];
    this.dungeon = null;
    this._rmb = false;
    this._lastX = 0;
    this._lastY = 0;
    this._fov = s.fov;
    this._shake = new THREE.Vector3();
    this._onMove = this._onMove.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.dom.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    this.dom.addEventListener('wheel', this._onWheel, { passive: false });
    document.body.classList.add('playing-tps');
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.dom.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    this.dom.removeEventListener('wheel', this._onWheel);
    if (document.pointerLockElement === this.dom) document.exitPointerLock?.();
    document.body.classList.remove('playing-tps');
  }

  setAnchor(x, y, z) {
    this.anchor.set(x, y, z);
  }

  setSprinting(on) {
    this.sprinting = !!on;
  }

  setOccluders(list) {
    this.occluders = Array.isArray(list) ? list : [];
  }

  setDungeon(d) {
    this.dungeon = d || null;
  }

  setSoftLock(point, weight = 0) {
    this.softLock = weight > 0.02 && point ? { x: point.x, y: point.y, z: point.z, w: weight } : null;
  }

  getCameraForward(out = _fwd) {
    out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    return out;
  }

  getLookDirection(out = _dir) {
    const s = spec();
    const p = THREE.MathUtils.clamp(this.pitch, s.minPitch, s.maxPitch);
    const cp = Math.cos(p);
    out.set(Math.sin(this.yaw) * cp, -Math.sin(p), Math.cos(this.yaw) * cp);
    return out.normalize();
  }

  snap(x, y, z, yaw = 0) {
    this.anchor.set(x, y, z);
    this.yaw = yaw;
    this.pitch = spec().defaultPitch;
    this.distance = spec().distance;
    this._place(1);
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  shake(amount) {
    this._shake.set(amount, amount * 0.6, 0);
  }

  _locked() {
    return document.pointerLockElement === this.dom;
  }

  _onDown(e) {
    if (e.button === 2 && e.shiftKey) {
      e.preventDefault();
      this._parryClick = true;
      this.onParry?.();
      return;
    }
    if (e.button === 2) {
      e.preventDefault();
      this._rmb = true;
      this._rmbAt = performance.now();
      this._lastX = e.clientX;
      this._lastY = e.clientY;
    }
    if (e.button === 2 || e.button === 0) {
      try {
        const p = this.dom.requestPointerLock?.();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch { /* gesture */ }
    }
  }

  _onUp(e) {
    if (this._parryClick || e?.shiftKey) {
      this._parryClick = false;
      this._rmb = false;
      return;
    }
    const held = this._rmbAt ? performance.now() - this._rmbAt : 999;
    this._rmb = false;
    if (e?.button === 2 && held < 220) this.onFocusToggle?.();
  }

  _onMove(e) {
    const look = this.enabled && (this._locked() || this._rmb);
    if (!look) {
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      return;
    }
    const s = spec();
    let dx = e.movementX || 0;
    let dy = e.movementY || 0;
    if (!this._locked() && !dx && !dy) {
      dx = e.clientX - this._lastX;
      dy = e.clientY - this._lastY;
    }
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    if (!dx && !dy) return;
    this.yaw -= dx * s.lookSens;
    this.pitch += dy * s.lookSens;
  }

  _onWheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    const s = spec();
    this.distance = THREE.MathUtils.clamp(
      this.distance * Math.exp((e.deltaY / 100) * 0.12 * s.zoomSpeed),
      s.minDistance,
      s.maxDistance,
    );
  }

  _gridPull(from, boomX, boomZ, dist) {
    const d = this.dungeon;
    if (!d) return dist;
    const bx = from.x + boomX * dist;
    const bz = from.z + boomZ * dist;
    const hit = firstObstruction(d, from.x, from.z, bx, bz);
    if (!hit) return dist;
    const cell = DUNGEON_SI.cell;
    const hx = (hit.gx + 0.5 - d.W / 2) * cell;
    const hz = (hit.gz + 0.5 - d.H / 2) * cell;
    const pulled = Math.hypot(hx - from.x, hz - from.z) - 0.4;
    return Math.max(spec().minDistance, Math.min(dist, pulled));
  }

  _place(k) {
    const s = spec();
    this.pitch = THREE.MathUtils.clamp(this.pitch, s.minPitch, s.maxPitch);
    this.getLookDirection(_dir);
    this.getCameraForward(_fwd);
    _right.set(_fwd.z, 0, -_fwd.x);

    _want.copy(this.anchor);
    _want.y += s.targetHeight;
    _want.addScaledVector(_fwd, s.lookAhead);
    if (this.softLock) {
      _look.set(this.softLock.x, this.softLock.y, this.softLock.z);
      _want.lerp(_look, 0.16 * this.softLock.w);
    }

    let dist = this.sprinting ? s.sprintDistance : this.distance;
    dist = this._gridPull(_want, -_dir.x, -_dir.z, dist);
    if (this.occluders.length) {
      _look.copy(_dir).multiplyScalar(-1);
      _ray.set(_want, _look);
      _ray.far = dist;
      const hits = _ray.intersectObjects(this.occluders, true);
      if (hits.length && hits[0].distance < dist) {
        dist = Math.max(s.minDistance, hits[0].distance - 0.32);
      }
    }

    _look.copy(_want).addScaledVector(_dir, -dist);
    _look.y += s.boomLift;
    _look.addScaledVector(_right, s.shoulderOffset);
    if (_look.y < 0.4) _look.y = 0.4;

    if (k >= 1) this.camera.position.copy(_look);
    else this.camera.position.lerp(_look, k);

    _want.copy(this.camera.position).addScaledVector(_dir, 36);
    this.camera.lookAt(_want);
  }

  update(dt) {
    if (!this.enabled) return;
    const s = spec();
    const wantFov = this.sprinting ? s.sprintFov : s.fov;
    this._fov += (wantFov - this._fov) * Math.min(1, dt * 6);
    if (Math.abs(this.camera.fov - this._fov) > 0.08) {
      this.camera.fov = this._fov;
      this.camera.updateProjectionMatrix();
    }
    const k = 1 - Math.exp(-(s.followLambda) * Math.max(0, dt));
    this._place(k);
    if (this._shake.lengthSq() > 1e-6) {
      this.camera.position.x += this._shake.x * 0.08;
      this.camera.position.y += this._shake.y * 0.05;
      this._shake.multiplyScalar(Math.max(0, 1 - dt * 9));
    }
  }
}
