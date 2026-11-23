import { analyze, stageTargets } from '../domain/sightlines.js';

export class AnalysisCancelled extends Error {
  constructor() {
    super('분석 요청이 새 배치로 대체되었습니다.');
    this.name = 'AbortError';
  }
}
let channel,
  queue = [];
export function yieldTask() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  if (typeof MessageChannel === 'undefined')
    return new Promise((resolve) => setTimeout(resolve, 0));
  channel ??= new MessageChannel();
  if (!channel.port1.onmessage) {
    channel.port1.onmessage = () => {
      queue.shift()?.();
      if (!queue.length) channel.port1.unref?.();
    };
    channel.port1.unref?.();
    channel.port2.unref?.();
  }
  return new Promise((resolve) => {
    queue.push(resolve);
    channel.port1.ref?.();
    channel.port2.postMessage(0);
  });
}
export async function analyzeInBatches(
  observers,
  stage,
  equipment,
  { cancelled = () => false, yieldControl = yieldTask, batchSize = 192 } = {},
) {
  const points = [];
  for (let start = 0; start < observers.length; start += batchSize) {
    if (cancelled()) throw new AnalysisCancelled();
    points.push(...analyze(observers.slice(start, start + batchSize), stage, equipment).points);
    if (start + batchSize < observers.length) await yieldControl();
  }
  if (cancelled()) throw new AnalysisCancelled();
  return {
    points,
    count: points.length,
    affected: points.filter((p) => p.blocked > 0).length,
    severe: points.filter((p) => p.ratio >= 0.5).length,
    mean: points.reduce((sum, p) => sum + p.ratio, 0) / (points.length || 1),
    targets: stageTargets(stage),
  };
}
export function createAnalysisEngine(options = {}) {
  let epoch = 0,
    observers = [],
    observerKey = null;
  const config = (token) => ({ ...options, cancelled: () => token !== epoch });
  return {
    ping() {
      return true;
    },
    cancel() {
      epoch++;
    },
    setObservers(key, points) {
      epoch++;
      observerKey = key;
      observers = points;
    },
    async analyze({ stage, equipment, baseline }) {
      const token = ++epoch,
        current = await analyzeInBatches(observers, stage, equipment, config(token));
      const prior = baseline
        ? await analyzeInBatches(observers, baseline.stage, baseline.equipment, config(token))
        : null;
      return { current: { ...current, observerKey }, prior };
    },
    async optimize({ stage, equipment, selectedId }) {
      const token = ++epoch,
        selected = equipment.find((e) => e.id === selectedId),
        current = await analyzeInBatches(observers, stage, equipment, config(token));
      let best = { equipment: structuredClone(equipment), result: current, moved: false };
      if (!selected) return best;
      const overlaps = (a, b) =>
        Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 0.5 &&
        Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + 0.5;
      const seen = new Set();
      for (const dx of [-12, -8, -4, 0, 4, 8, 12])
        for (const dz of [-4, 0, 4]) {
          if (token !== epoch) throw new AnalysisCancelled();
          const box = {
            ...selected,
            x: Math.max(-23, Math.min(23, selected.x + dx)),
            z: Math.max(-12, Math.min(20, selected.z + dz)),
          };
          const key = `${box.x}:${box.z}`;
          if (
            seen.has(key) ||
            overlaps(box, stage) ||
            equipment.some((e) => e.id !== box.id && overlaps(box, e))
          )
            continue;
          seen.add(key);
          const candidate = equipment.map((e) => (e.id === box.id ? box : e)),
            result = await analyzeInBatches(observers, stage, candidate, config(token));
          if (result.mean < best.result.mean - 1e-8)
            best = { equipment: structuredClone(candidate), result, moved: true };
          await (options.yieldControl || yieldTask)();
        }
      return best;
    },
  };
}
