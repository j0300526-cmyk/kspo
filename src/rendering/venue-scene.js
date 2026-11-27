import * as THREE from 'three';
import { colors } from '../design/colors.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EquipmentLayer } from './equipment-layer.js';
import { StageLayer } from './stage-layer.js';
import { ObservationLayer } from './observation-layer.js';
import { createSchematic } from './schematic.js';
import { disposeObject } from './resources.js';
import { loadOfficialModel, loadModelFile } from '../services/venue-models.js';

export class VenueScene {
  constructor(host, callbacks) {
    this.loadTicket = 0;
    this.host = host;
    this.callbacks = callbacks;
    this.contextLost = false;
    this.disposed = false;
    this.frame = null;
    this.events = new AbortController();
    this.mode = 'orbit';
    this.modelMode = 'schematic';
    this.showHeat = true;
    this.showRoof = false;
    this.regionId = 'all';
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(colors.grey50);
    this.scene.fog = new THREE.Fog(colors.grey50, 170, 400);
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.05, 900);
    this.camera.position.set(70, 65, 82);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    host.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 3, 0);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 230;
    this.scene.add(new THREE.HemisphereLight(colors.background, colors.grey500, 1.8));
    const light = new THREE.DirectionalLight(colors.background, 2);
    light.position.set(40, 80, 30);
    this.scene.add(light);
    const fill = new THREE.DirectionalLight(colors.grey200, 0.6);
    fill.position.set(-40, 20, -20);
    this.scene.add(fill);
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(350, 350),
      new THREE.MeshBasicMaterial({ color: colors.grey50 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.3;
    this.scene.add(this.floor);
    const grid = (this.grid = new THREE.GridHelper(240, 80, colors.grey300, colors.grey200));
    grid.position.y = -0.25;
    grid.visible = false;
    this.scene.add(grid);
    this.schematic = createSchematic();
    this.scene.add(this.schematic);
    this.equipmentLayer = new EquipmentLayer();
    this.equipmentGroup = this.equipmentLayer.group;
    this.scene.add(this.equipmentGroup);
    this.stageLayer = new StageLayer();
    this.stageGroup = this.stageLayer.group;
    this.scene.add(this.stageGroup);
    this.observationLayer = new ObservationLayer(this.scene);
    this.linesGroup = new THREE.Group();
    this.scene.add(this.linesGroup);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    for (const [event, method] of [
      ['pointerdown', 'onDown'],
      ['pointermove', 'onMove'],
      ['pointerup', 'onUp'],
    ])
      this.renderer.domElement.addEventListener(event, (e) => this[method](e), {
        capture: true,
        signal: this.events.signal,
      });
    this.renderer.domElement.addEventListener(
      'pointercancel',
      () => {
        this.drag = null;
        this.controls.enabled = true;
      },
      { signal: this.events.signal },
    );
    this.controls.addEventListener('change', () => this.invalidate());
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        this.contextLost = true;
        this.callbacks.contextStatus?.('3D 복구 대기');
      },
      { signal: this.events.signal },
    );
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      () => {
        this.contextLost = false;
        this.invalidate();
        this.callbacks.contextStatus?.('3D 복구됨');
      },
      { signal: this.events.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (!document.hidden) this.invalidate();
      },
      { signal: this.events.signal },
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.invalidate();
  }
  invalidate() {
    if (this.frame !== null || this.contextLost || this.disposed || document.hidden) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      if (this.disposed || this.contextLost) return;
      const changed = this.controls.update();
      this.renderer.render(this.scene, this.camera);
      if (changed) this.invalidate();
    });
  }
  dispose() {
    this.disposed = true;
    this.loadTicket++;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.events.abort();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.observationLayer.dispose();
    disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
  clear(group) {
    while (group.children.length) {
      const obj = group.children[0];
      group.remove(obj);
      obj.traverse((o) => {
        o.geometry?.dispose();
        if (o.material)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    }
  }

  setStage(stage) {
    this.stage = stage;
    this.stageLayer.update(stage);
    if (this.result && this.regionId !== 'all') this.setAnalysis(this.result);
    this.invalidate();
  }
  setEquipment(equipment, selectedId) {
    this.equipment = equipment;
    this.selectedId = selectedId;
    this.equipmentLayer.update(equipment, selectedId);
    this.pickEquipment = this.equipmentLayer.pickTargets;
    this.invalidate();
  }
  setAnalysis(result) {
    const first = !this.result || this.result.observerKey !== result.observerKey;
    this.result = result;
    this.samples = this.observationLayer.update(result, this.showHeat, this.regionId, this.stage);
    if (this.selectedPoint) {
      const point = result.points.find((p) => p.id === this.selectedPoint.id);
      if (point) this.showSightlines(point);
    }
    if (first && this.mode !== 'eye') this.setView(this.mode);
    this.invalidate();
  }
  setRegion(id) {
    this.regionId = id;
    if (this.result) this.setAnalysis(this.result);
  }
  showSightlines(point) {
    this.selectedPoint = point;
    this.clear(this.linesGroup);
    this.invalidate();
    if (!point || !this.result) return;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 8),
      new THREE.MeshBasicMaterial({ color: colors.blue500 }),
    );
    sphere.position.set(point.x, point.y, point.z);
    this.linesGroup.add(sphere);
    // A single selection marker stays readable without nine crossing rays.
  }
  setView(mode) {
    this.mode = mode;
    if (mode === 'eye' && this.selectedPoint) {
      const p = this.selectedPoint;
      this.camera.position.set(p.x, p.y, p.z);
      this.controls.target.set(
        this.stage.x,
        this.stage.height + this.stage.targetHeight,
        this.stage.z,
      );
      this.controls.minDistance = 0.1;
    } else {
      const points = this.result?.points.length
        ? this.result.points
        : [
            { x: -55, y: 0, z: -55 },
            { x: 55, y: 12, z: 55 },
          ];
      const bounds = new THREE.Box3();
      for (const point of points)
        bounds.expandByPoint(new THREE.Vector3(point.x, point.y, point.z));
      if (this.stage) {
        for (const x of [-1, 1])
          for (const z of [-1, 1])
            bounds.expandByPoint(
              new THREE.Vector3(
                this.stage.x + (x * this.stage.width) / 2,
                this.stage.height,
                this.stage.z + (z * this.stage.depth) / 2,
              ),
            );
      }
      const center = bounds.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(
        0,
        mode === 'top' ? 1 : 1.7,
        mode === 'top' ? 0.0001 : 1,
      ).normalize();
      const up = new THREE.Vector3(0, direction.z, -direction.y);
      const tanV = Math.tan((this.camera.fov * Math.PI) / 360),
        tanH = tanV * this.camera.aspect;
      let distance = 40;
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const relative = new THREE.Vector3(x, y, z).sub(center),
              depth = relative.dot(direction);
            distance = Math.max(
              distance,
              depth + (Math.abs(relative.x) * 1.18) / tanH,
              depth + (Math.abs(relative.dot(up)) * 1.18) / tanV,
            );
          }
      this.camera.position.copy(center).addScaledVector(direction, distance);
      this.controls.target.copy(center);
      this.controls.maxDistance = Math.max(350, distance * 2);
      this.controls.minDistance = 3;
    }
    this.controls.update();
    this.invalidate();
  }
  setPointer(event) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      -((event.clientY - r.top) / r.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }
  groundAt(event) {
    this.setPointer(event);
    return this.raycaster.ray.intersectPlane(this.ground, new THREE.Vector3());
  }
  onDown(e) {
    if (e.button !== 0) return;
    this.down = { x: e.clientX, y: e.clientY };
    this.setPointer(e);
    if (this.addPointMode) return;
    const hit = this.raycaster.intersectObjects(this.pickEquipment || [], false)[0];
    if (hit && this.mode !== 'eye') {
      const id = hit.object.userData.id,
        position = this.groundAt(e),
        entry = this.equipment.find((x) => x.id === id);
      if (!position || !entry) return;
      this.drag = {
        id,
        offsetX: entry.x - position.x,
        offsetZ: entry.z - position.z,
        startX: entry.x,
        startZ: entry.z,
        moved: false,
      };
      this.controls.enabled = false;
      this.renderer.domElement.setPointerCapture(e.pointerId);
      e.stopImmediatePropagation();
      e.preventDefault();
      this.callbacks.selectEquipment(id);
    }
  }
  onMove(e) {
    if (!this.drag) return;
    const point = this.groundAt(e);
    if (!point) return;
    this.drag.x = Math.round(Math.max(-45, Math.min(45, point.x + this.drag.offsetX)) * 10) / 10;
    this.drag.z = Math.round(Math.max(-45, Math.min(45, point.z + this.drag.offsetZ)) * 10) / 10;
    this.drag.moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 3;
    const obj = this.equipmentGroup.children.find((c) => c.userData.id === this.drag.id);
    if (obj) obj.position.set(this.drag.x, 0, this.drag.z);
    this.invalidate();
    e.stopImmediatePropagation();
  }
  onUp(e) {
    if (this.drag) {
      const d = this.drag;
      this.drag = null;
      this.controls.enabled = true;
      try {
        this.renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {}
      if (d.moved) this.callbacks.moveEquipment(d.id, d.x, d.z);
      e.stopImmediatePropagation();
      return;
    }
    if (!this.down || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 5) return;
    this.setPointer(e);
    if (this.addPointMode) {
      let point = null;
      if (this.modelMode === 'official' && this.officialModel) {
        const hits = this.raycaster
          .intersectObject(this.officialModel, true)
          .filter((h) => h.object.visible && h.point.y < 20);
        point = hits[0]?.point;
      } else {
        point = this.groundAt(e);
      }
      if (point)
        this.callbacks.addPoint({
          x: point.x,
          y: point.y + 1.15,
          z: point.z,
          source: this.modelMode === 'official' ? 'official-surface' : 'manual',
        });
      return;
    }
    const hit = this.samples ? this.raycaster.intersectObject(this.samples, false)[0] : null;
    if (hit && hit.instanceId !== undefined) {
      this.callbacks.selectPoint(this.result.points[hit.instanceId]);
      return;
    }
  }
  setAddPoint(enabled) {
    this.addPointMode = enabled;
    this.renderer.domElement.style.cursor = enabled ? 'crosshair' : 'grab';
  }
  setModelMode(mode) {
    this.modelMode = mode;
    this.schematic.visible = mode === 'schematic';
    this.grid.visible = false;
    if (this.officialModel) this.officialModel.visible = mode === 'official';
    this.invalidate();
  }
  applyModel(object, meta = {}) {
    if (this.officialModel) {
      this.scene.remove(this.officialModel);
      this.clear(this.officialModel);
    }
    this.officialModel = object;
    this.officialModel.name = 'official-venue';
    object.traverse((o) => {
      if (o.isMesh) {
        const old = Array.isArray(o.material) ? o.material : [o.material];
        old.forEach((material) => material.dispose());
        o.material = new THREE.MeshStandardMaterial({
          color: colors.grey400,
          roughness: 0.9,
          side: THREE.DoubleSide,
          transparent: false,
          depthWrite: true,
        });
        if (o.name.toLowerCase().includes('roof')) o.visible = this.showRoof;
      }
    });
    this.scene.add(object);
    this.setModelMode(meta.custom ? 'official' : this.modelMode);
    this.meta = meta;
    if (meta.custom) this.setView('orbit');
  }
  async loadOfficial() {
    const ticket = ++this.loadTicket;
    const { object, meta } = await loadOfficialModel(this.callbacks.modelProgress);
    if (ticket !== this.loadTicket) {
      disposeObject(object);
      return null;
    }
    this.applyModel(object, meta);
    return meta;
  }
  async loadUserFile(file) {
    const ticket = ++this.loadTicket;
    const object = await loadModelFile(file, this.callbacks.modelProgress);
    if (ticket !== this.loadTicket) {
      disposeObject(object);
      return;
    }
    const bounds = new THREE.Box3().setFromObject(object),
      center = bounds.getCenter(new THREE.Vector3());
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= bounds.min.y;
    this.applyModel(object, { name: file.name, custom: true });
  }
  toggleRoof() {
    this.showRoof = !this.showRoof;
    this.officialModel?.traverse((o) => {
      if (o.isMesh && o.name.toLowerCase().includes('roof')) o.visible = this.showRoof;
    });
    return this.showRoof;
  }
  capture() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }
}
