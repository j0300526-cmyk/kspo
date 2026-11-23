import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial, Raycaster, Vector3, DoubleSide } from 'three';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { EquipmentLayer } from '../src/rendering/equipment-layer.js';
import { StageLayer } from '../src/rendering/stage-layer.js';
import { ObservationLayer } from '../src/rendering/observation-layer.js';
import { DEFAULT_STAGE, DEFAULT_EQUIPMENT, createObservers, analyze } from '../src/analysis.js';

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
