import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import fs from 'node:fs/promises';
import nodeEndpoint from 'comlink/dist/esm/node-adapter.mjs';
import { AnalysisClient } from '../src/services/analysis-client.js';
import { createAnalysisEngine, analyzeInBatches } from '../src/services/analysis-engine.js';
import { createAnalysisCoordinator } from '../src/services/analysis-coordinator.js';
import { analyze, DEFAULT_STAGE, DEFAULT_EQUIPMENT, createObservers } from '../src/analysis.js';

test('real Comlink worker preserves results and leaves the main event loop responsive', async () => {
  const worker = new Worker(new URL('./fixtures/analysis-node-worker.mjs', import.meta.url), {
    type: 'module',
  });
  const endpoint = nodeEndpoint(worker),
    errors = new Set();
  worker.on('exit', (code) => {
    if (code) for (const fn of errors) fn(new Error('Worker exited'));
  });
  const client = new AnalysisClient({
    workerFactory: () => ({
      ...endpoint,
      terminate: () => worker.terminate(),
      addEventListener(type, fn) {
        if (type === 'error') {
          errors.add(fn);
          worker.on('error', fn);
        } else if (type === 'messageerror') worker.on(type, fn);
        else endpoint.addEventListener(type, fn);
      },
    }),
  });
  try {
    const data = JSON.parse(await fs.readFile('public/models/observation-points.json', 'utf8'));
    const observers = data.points.map((p) => ({
      id: p.id,
      x: p.position[0],
      y: p.position[1],
      z: p.position[2],
    }));
    const spec = { key: 'official', observers },
      input = { stage: DEFAULT_STAGE, equipment: DEFAULT_EQUIPMENT, baseline: null };
    const result = await client.run('analyze', input, spec);
    assert.equal(client.mode, 'worker');
    assert.equal(result.current.mean, analyze(observers, DEFAULT_STAGE, DEFAULT_EQUIPMENT).mean);
    let ticks = 0;
    const timer = setInterval(() => ticks++, 5);
    try {
      const best = await client.run('optimize', { ...input, selectedId: 'camera-1' }, spec);
      assert.ok(best.result.mean < result.current.mean);
    } finally {
      clearInterval(timer);
    }
    assert.ok(ticks > 5, `event-loop heartbeat ${ticks}`);
    await worker.terminate();
    const recovered = await client.run('analyze', input, spec);
    assert.equal(client.mode, 'cooperative');
    assert.equal(recovered.current.mean, result.current.mean);
  } finally {
    client.dispose();
  }
});

test('cooperative calculation yields and cancels; a replacement job still completes', async () => {
  let cancelled = false,
    yields = 0;
  await assert.rejects(
    analyzeInBatches(createObservers(), DEFAULT_STAGE, DEFAULT_EQUIPMENT, {
      batchSize: 20,
      cancelled: () => cancelled,
      yieldControl: async () => {
        yields++;
        cancelled = true;
      },
    }),
    (e) => e.name === 'AbortError',
  );
  assert.equal(yields, 1);
  const engine = createAnalysisEngine();
  engine.setObservers('small', createObservers());
  const pending = engine.optimize({
    stage: DEFAULT_STAGE,
    equipment: DEFAULT_EQUIPMENT,
    selectedId: 'camera-1',
  });
  engine.cancel();
  await assert.rejects(pending, (e) => e.name === 'AbortError');
  const next = await engine.analyze({ stage: DEFAULT_STAGE, equipment: [], baseline: null });
  assert.equal(next.current.affected, 0);
});

test('rapid requests coalesce and out-of-date completions never overwrite the latest result', async () => {
  const pending = [],
    committed = [];
  const client = {
    cancel() {},
    dispose() {},
    run(method, input) {
      return new Promise((resolve) => pending.push({ input, resolve }));
    },
  };
  const coordinator = createAnalysisCoordinator(client, {
    onResult: (result) => committed.push(result.id),
  });
  coordinator.request({ id: 1 }, {});
  const flushed = coordinator.flush();
  coordinator.request({ id: 2 }, {});
  coordinator.request({ id: 3 }, {});
  pending[0].resolve({ id: 1 });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(pending.length, 2);
  assert.equal(pending[1].input.id, 3);
  pending[1].resolve({ id: 3 });
  await flushed;
  assert.deepEqual(committed, [3]);
  coordinator.dispose();
});
