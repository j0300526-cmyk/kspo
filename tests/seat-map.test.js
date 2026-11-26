import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseObservations, parseProject } from '../src/domain/project-schema.js';
import { analyze } from '../src/domain/sightlines.js';
import {
  seatMapSVG,
  comparisonCounts,
  nearestObservation,
  MAP_COLORS,
} from '../src/rendering/seat-map.js';

test('map renders actual observations and distinguishes improvement from worsening', async () => {
  const project = parseProject(JSON.parse(await fs.readFile('src/data/demo-project.json', 'utf8')));
  const points = parseObservations(
    JSON.parse(await fs.readFile('public/models/observation-points.json', 'utf8')),
  );
  const analysis = analyze(points, project.stage, project.equipment),
    prior = analyze(points, project.baseline.stage, project.baseline.equipment);
  assert.deepEqual(project.stage, project.baseline.stage);
  for (const e of project.equipment) {
    const original = project.baseline.equipment.find((b) => b.id === e.id);
    for (const key of ['width', 'depth', 'height', 'rotation', 'type'])
      assert.equal(e[key], original[key]);
  }
  assert.ok(analysis.mean < prior.mean);
  assert.ok(analysis.severe <= prior.severe);
  assert.ok(analysis.affected <= prior.affected);
  const counts = comparisonCounts(analysis, prior);
  assert.equal(counts.improved + counts.worse + counts.same, points.length);
  assert.ok(counts.improved > 0);
  assert.ok(counts.worse > 0, 'aggregate improvement still discloses individually worsened points');
  const svg = seatMapSVG({ analysis, prior, project, plan: 'changes' });
  assert.match(svg, new RegExp(MAP_COLORS.improved));
  assert.match(svg, new RegExp(MAP_COLORS.worse));
  assert.ok(!svg.includes('NaN'));
  assert.ok(!svg.includes('Infinity'));
  assert.match(svg, /STAGE/);
  assert.match(svg, /data-map-equipment="camera-1"/);
  assert.equal(
    nearestObservation(points, points[0].x, points[0].z, project.stage)?.id,
    points[0].id,
  );
  assert.equal(nearestObservation(points, 1000, 1000, project.stage), null);
  assert.doesNotThrow(() => seatMapSVG({ analysis: { points: [], count: 0 }, project }));
});
