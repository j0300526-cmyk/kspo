import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  Scene,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  DoubleSide,
  PerspectiveCamera,
  Group,
} from 'three';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { EquipmentLayer } from '../src/rendering/equipment-layer.js';
import { StageLayer } from '../src/rendering/stage-layer.js';
import { ObservationLayer } from '../src/rendering/observation-layer.js';
import { VenueScene } from '../src/rendering/venue-scene.js';
import { DEFAULT_STAGE, DEFAULT_EQUIPMENT, createObservers, analyze } from '../src/analysis.js';

test('overview and top cameras keep all observations visible on wide and narrow screens', async () => {
  const data = JSON.parse(await fs.readFile('public/models/observation-points.json', 'utf8'));
  const points = data.points.map((p) => ({ x: p.position[0], y: p.position[1], z: p.position[2] }));
  for (const aspect of [0.65, 1, 2.5])
    for (const mode of ['orbit', 'top']) {
      const view = {
        camera: new PerspectiveCamera(43, aspect, 0.05, 900),
        stage: DEFAULT_STAGE,
        result: { points },
        invalidate() {},
      };
      view.controls = {
        target: new Vector3(),
        update() {
          view.camera.lookAt(this.target);
          view.camera.updateMatrixWorld(true);
        },
      };
      VenueScene.prototype.setView.call(view, mode);
      for (const point of points) {
        const projected = new Vector3(point.x, point.y, point.z).project(view.camera);
        assert.ok(
          Math.abs(projected.x) < 1 &&
            Math.abs(projected.y) < 1 &&
            projected.z > -1 &&
            projected.z < 1,
        );
      }
    }
});

test('background original model loading does not replace the simple observation view', () => {
  const view = {
    scene: new Scene(),
    modelMode: 'schematic',
    showRoof: false,
    clear: VenueScene.prototype.clear,
    setModelMode(mode) {
      this.modelMode = mode;
    },
    setView(mode) {
      this.mode = mode;
    },
  };
  const object = new Group();
  object.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial()));
  VenueScene.prototype.applyModel.call(view, object, { name: 'official' });
  assert.equal(view.modelMode, 'schematic');
  assert.equal(view.mode, undefined);
  const custom = new Group();
  custom.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial()));
  VenueScene.prototype.applyModel.call(view, custom, { custom: true });
  assert.equal(view.modelMode, 'official');
  assert.equal(view.mode, 'orbit');
});

test('equipment edits and selections reuse GPU geometry and dispose deleted items', () => {
  const layer = new EquipmentLayer();
  layer.update(DEFAULT_EQUIPMENT, 'camera-1');
  const body = layer.items.get('camera-1').body,
    geometry = body.geometry;
  let disposed = 0;
  geometry.addEventListener('dispose', () => disposed++);
  layer.update(
    DEFAULT_EQUIPMENT.map((e) => (e.id === 'camera-1' ? { ...e, width: 9, x: 7 } : e)),
    'speaker-1',
  );
  assert.equal(layer.items.get('camera-1').body, body);
  assert.equal(body.geometry, geometry);
  assert.equal(body.scale.x, 9);
  assert.equal(layer.items.get('camera-1').group.position.x, 7);
  assert.equal(disposed, 0);
  layer.update(
    DEFAULT_EQUIPMENT.filter((e) => e.id !== 'camera-1'),
    null,
  );
  assert.equal(disposed, 1);
  layer.dispose();
});
test('stage and observation colors update without recreating their geometries', () => {
  const stage = new StageLayer(),
    geometry = stage.deck.geometry;
  stage.update(DEFAULT_STAGE);
  stage.update({ ...DEFAULT_STAGE, width: 25 });
  assert.equal(stage.deck.geometry, geometry);
  assert.equal(stage.deck.scale.x, 25);
  stage.dispose();
  const scene = new Scene(),
    layer = new ObservationLayer(scene),
    points = createObservers();
  layer.update({ ...analyze(points, DEFAULT_STAGE, []), observerKey: 'same' }, true);
  const mesh = layer.mesh;
  layer.update({ ...analyze(points, DEFAULT_STAGE, DEFAULT_EQUIPMENT), observerKey: 'same' }, true);
  assert.equal(layer.mesh, mesh);
  const changed = points.map((p) => ({ ...p, x: p.x + 10 }));
  layer.update({ ...analyze(changed, DEFAULT_STAGE, []), observerKey: 'new' }, false);
  assert.equal(layer.mesh, mesh);
  assert.equal(layer.mesh.instanceMatrix.array[12], Math.fround(changed[0].x));
  layer.dispose();
  assert.equal(scene.children.length, 0);
});
test('BVH accelerated picking agrees with Three.js ray intersections', () => {
  const mesh = new Mesh(
    new BoxGeometry(6, 8, 10, 10, 10, 10),
    new MeshBasicMaterial({ side: DoubleSide }),
  );
  mesh.position.set(3, 4, 2);
  mesh.updateMatrixWorld();
  const ray = new Raycaster(new Vector3(3, 4, 30), new Vector3(0, 0, -1));
  const normal = ray.intersectObject(mesh)[0];
  mesh.geometry.boundsTree = computeBoundsTree.call(mesh.geometry);
  mesh.raycast = acceleratedRaycast;
  const accelerated = ray.intersectObject(mesh)[0];
  assert.ok(Math.abs(normal.distance - accelerated.distance) < 1e-6);
  mesh.geometry.dispose();
  mesh.material.dispose();
});
