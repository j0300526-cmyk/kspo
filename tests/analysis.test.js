import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, BoxGeometry, MeshBasicMaterial, DoubleSide, Raycaster, Vector3 } from 'three';
import {
  segmentHitsBox,
  analyze,
  createObservers,
  DEFAULT_STAGE,
  DEFAULT_EQUIPMENT,
  optimizeEquipment,
  validateProject,
} from '../src/analysis.js';
const box = { x: 0, z: 0, width: 2, depth: 2, height: 3, rotation: 0 };
test('finite sightline intersects a blocker only between viewer and target', () => {
  assert.equal(segmentHitsBox({ x: 0, y: 1, z: 5 }, { x: 0, y: 1, z: -5 }, box), true);
  assert.equal(segmentHitsBox({ x: 0, y: 4, z: 5 }, { x: 0, y: 4, z: -5 }, box), false);
  assert.equal(segmentHitsBox({ x: 0, y: 1, z: 5 }, { x: 0, y: 1, z: 2 }, box), false);
  assert.equal(segmentHitsBox({ x: 3, y: 1, z: 5 }, { x: 3, y: 1, z: -5 }, box), false);
});
test('rotated narrow equipment changes the obstruction envelope', () => {
  const beam = { ...box, width: 8, depth: 0.5, rotation: 90 };
  assert.equal(segmentHitsBox({ x: 2, y: 1, z: 5 }, { x: 2, y: 1, z: -5 }, beam), false);
  assert.equal(segmentHitsBox({ x: 0, y: 1, z: 5 }, { x: 0, y: 1, z: -5 }, beam), true);
});
test('no equipment yields zero incremental obstruction; obstacles produce measurable obstruction', () => {
  const observers = createObservers();
  assert.equal(analyze(observers, DEFAULT_STAGE, []).affected, 0);
  assert.ok(analyze(observers, DEFAULT_STAGE, DEFAULT_EQUIPMENT).affected > 0);
});
test('suggested alternative never worsens objective and does not mutate the source', () => {
  const source = structuredClone(DEFAULT_EQUIPMENT),
    obs = createObservers();
  const best = optimizeEquipment(obs, DEFAULT_STAGE, source, 'camera-1');
  assert.ok(best.result.mean <= analyze(obs, DEFAULT_STAGE, source).mean);
  assert.deepEqual(source, DEFAULT_EQUIPMENT);
});
test('project import rejects nonfinite dimensions, duplicated IDs and unsupported schema', () => {
  const p = { version: 1, stage: DEFAULT_STAGE, equipment: structuredClone(DEFAULT_EQUIPMENT) };
  assert.equal(validateProject(p).equipment.length, 3);
  assert.throws(() => validateProject({ ...p, version: 2 }));
  p.equipment[0].height = Infinity;
  assert.throws(() => validateProject(p));
  p.equipment[0].height = 4;
  p.equipment[1].id = p.equipment[0].id;
  assert.throws(() => validateProject(p));
});
test('analytic oriented boxes agree with the independently rendered Three.js geometry', () => {
  for (const rotation of [-135, -35, 0, 25, 90]) {
    const obstacle = { x: 2, z: -3, width: 3, depth: 7, height: 4, rotation };
    const mesh = new Mesh(
      new BoxGeometry(obstacle.width, obstacle.height, obstacle.depth),
      new MeshBasicMaterial({ side: DoubleSide }),
    );
    mesh.position.set(obstacle.x, obstacle.height / 2, obstacle.z);
    mesh.rotation.y = (-rotation * Math.PI) / 180;
    mesh.updateMatrixWorld(true);
    for (let i = 0; i < 30; i++) {
      const from = { x: -9 + i * 0.65, y: 1 + (i % 5) * 0.8, z: 12 },
        to = { x: 3 - i * 0.1, y: 1, z: -15 };
      const start = new Vector3(from.x, from.y, from.z),
        end = new Vector3(to.x, to.y, to.z);
      const ray = new Raycaster(
        start,
        end.clone().sub(start).normalize(),
        0.00001,
        start.distanceTo(end) - 0.00001,
      );
      assert.equal(
        segmentHitsBox(from, to, obstacle),
        ray.intersectObject(mesh).length > 0,
        `rotation=${rotation}, ray=${i}`,
      );
    }
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
});
