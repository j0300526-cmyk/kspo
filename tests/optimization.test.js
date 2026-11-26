import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseObservations } from '../src/domain/project-schema.js';
import { analyze, optimizeEquipment, isBetterLayout } from '../src/domain/sightlines.js';
import { DEFAULT_STAGE, DEFAULT_EQUIPMENT } from '../src/domain/defaults.js';
import { createAnalysisEngine } from '../src/services/analysis-engine.js';

test('layout recommendations reject average gains that increase severe or affected observations', async () => {
  assert.equal(
    isBetterLayout({ mean: 0.05, affected: 10, severe: 1 }, { mean: 0.1, affected: 20, severe: 0 }),
    false,
  );
  assert.equal(
    isBetterLayout({ mean: 0.05, affected: 21, severe: 0 }, { mean: 0.1, affected: 20, severe: 0 }),
    false,
  );
  const points = parseObservations(
    JSON.parse(await fs.readFile('public/models/observation-points.json', 'utf8')),
  );
  const engine = createAnalysisEngine();
  engine.setObservers('official', points);
  let equipment = structuredClone(DEFAULT_EQUIPMENT),
    previous = analyze(points, DEFAULT_STAGE, equipment);
  assert.equal(previous.severe, 0);
  for (const selected of DEFAULT_EQUIPMENT) {
    const sync = optimizeEquipment(points, DEFAULT_STAGE, equipment, selected.id);
    const result = await engine.optimize({
      stage: DEFAULT_STAGE,
      equipment,
      selectedId: selected.id,
    });
    assert.equal(result.result.mean, sync.result.mean);
    assert.equal(result.result.affected, sync.result.affected);
    assert.equal(result.result.severe, sync.result.severe);
    assert.ok(result.result.mean <= previous.mean);
    assert.ok(result.result.affected <= previous.affected);
    assert.ok(result.result.severe <= previous.severe);
    equipment = result.equipment;
    previous = result.result;
  }
});
