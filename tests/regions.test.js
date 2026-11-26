import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  REGIONS,
  observationRegion,
  regionSummary,
  representativePoint,
} from '../src/domain/observation-regions.js';
import { parseObservations } from '../src/domain/project-schema.js';
import { DEFAULT_STAGE, DEFAULT_EQUIPMENT, analyze } from '../src/analysis.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { preparePicking } from '../src/services/venue-models.js';

test('exploration regions partition the actual observations and follow stage translations', async () => {
  const data = JSON.parse(await fs.readFile('public/models/observation-points.json', 'utf8'));
  const points = parseObservations(data),
    result = analyze(points, DEFAULT_STAGE, DEFAULT_EQUIPMENT);
  const regions = REGIONS.filter((r) => r.id !== 'all').map((r) =>
    regionSummary(result, DEFAULT_STAGE, r.id),
  );
  assert.equal(
    regions.reduce((sum, r) => sum + r.count, 0),
    7382,
  );
  assert.equal(new Set(regions.flatMap((r) => r.points.map((p) => p.id))).size, 7382);
  assert.equal(
    regions.reduce((sum, r) => sum + r.affected, 0),
    result.affected,
  );
  for (const region of REGIONS.filter((r) => r.id !== 'all')) {
    const summary = regionSummary(result, DEFAULT_STAGE, region.id);
    const point = representativePoint(summary.points);
    assert.equal(observationRegion(point, DEFAULT_STAGE), region.id);
  }
  const translation = { x: 20, z: -12 };
  for (const point of points.slice(0, 300)) {
    assert.equal(
      observationRegion(
        { ...point, x: point.x + translation.x, z: point.z + translation.z },
        {
          ...DEFAULT_STAGE,
          x: DEFAULT_STAGE.x + translation.x,
          z: DEFAULT_STAGE.z + translation.z,
        },
      ),
      observationRegion(point, DEFAULT_STAGE),
    );
  }
  assert.equal(representativePoint([]), null);
  assert.equal(regionSummary(null, DEFAULT_STAGE).count, 0);
});

test('official model receives finite surface normals before shaded rendering', async () => {
  const data = await fs.readFile('public/models/kspo-dome.glb');
  const { scene } = await new GLTFLoader().parseAsync(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    '',
  );
  await preparePicking(scene);
  let checked = 0;
  scene.traverse((object) => {
    if (!object.isMesh) return;
    const normal = object.geometry.getAttribute('normal');
    assert.ok(normal);
    for (let i = 0; i < normal.count; i += 101) {
      const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
      assert.ok(Number.isFinite(length));
      assert.ok(length === 0 || Math.abs(length - 1) < 1e-5);
      checked++;
    }
  });
  assert.ok(checked > 1000);
});
