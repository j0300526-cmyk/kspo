import { clone } from './defaults.js';
export function stageTargets(stage) {
  const targets = [];
  for (const u of [-0.4, 0, 0.4])
    for (const v of [-0.3, 0, 0.3]) {
      targets.push({
        x: stage.x + stage.width * u,
        y: stage.height + stage.targetHeight,
        z: stage.z + stage.depth * v,
      });
    }
  return targets;
}
// Slab intersection for a finite line segment and a Y-axis oriented box.
export function segmentHitsBox(from, to, box) {
  const theta = (-(box.rotation || 0) * Math.PI) / 180;
  const c = Math.cos(theta),
    s = Math.sin(theta);
  const local = (p) => ({
    x: c * (p.x - box.x) - s * (p.z - box.z),
    y: p.y,
    z: s * (p.x - box.x) + c * (p.z - box.z),
  });
  const a = local(from),
    b = local(to);
  const min = { x: -box.width / 2, y: 0, z: -box.depth / 2 };
  const max = { x: box.width / 2, y: box.height, z: box.depth / 2 };
  let near = 0.00001,
    far = 0.99999;
  for (const axis of ['x', 'y', 'z']) {
    const d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-10) {
      if (a[axis] < min[axis] || a[axis] > max[axis]) return false;
    } else {
      let t1 = (min[axis] - a[axis]) / d,
        t2 = (max[axis] - a[axis]) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      near = Math.max(near, t1);
      far = Math.min(far, t2);
      if (near > far) return false;
    }
  }
  return true;
}
export function analyze(observers, stage, equipment) {
  const targets = stageTargets(stage);
  const points = observers.map((point) => {
    let blocked = 0;
    const causes = new Set();
    for (const target of targets) {
      let hit = false;
      for (const box of equipment)
        if (segmentHitsBox(point, target, box)) {
          hit = true;
          causes.add(box.id);
        }
      if (hit) blocked++;
    }
    return {
      ...point,
      blocked,
      total: targets.length,
      ratio: blocked / targets.length,
      causes: [...causes],
    };
  });
  return {
    points,
    count: points.length,
    affected: points.filter((p) => p.blocked > 0).length,
    severe: points.filter((p) => p.ratio >= 0.5).length,
    mean: points.reduce((s, p) => s + p.ratio, 0) / (points.length || 1),
    targets,
  };
}
export function isBetterLayout(candidate, previous) {
  return (
    candidate.mean < previous.mean - 1e-8 &&
    candidate.affected <= previous.affected &&
    candidate.severe <= previous.severe
  );
}
export function optimizeEquipment(observers, stage, equipment, selectedId) {
  const current = analyze(observers, stage, equipment);
  let best = { equipment: clone(equipment), result: current, moved: false };
  const selected = equipment.find((e) => e.id === selectedId);
  if (!selected) return best;
  for (const dx of [-12, -8, -4, 0, 4, 8, 12])
    for (const dz of [-4, 0, 4]) {
      const candidate = clone(equipment),
        box = candidate.find((e) => e.id === selectedId);
      box.x = Math.max(-23, Math.min(23, selected.x + dx));
      box.z = Math.max(-12, Math.min(20, selected.z + dz));
      const overlaps = (a, b) =>
        Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 0.5 &&
        Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + 0.5;
      if (overlaps(box, stage) || candidate.some((b) => b.id !== box.id && overlaps(box, b)))
        continue;
      const result = analyze(observers, stage, candidate);
      if (isBetterLayout(result, best.result)) best = { equipment: candidate, result, moved: true };
    }
  return best;
}
