export const REGIONS = [
  { id: 'all', name: '전체 관람 영역' },
  { id: 'front', name: '무대 맞은편' },
  { id: 'left', name: '평면도 왼쪽' },
  { id: 'right', name: '평면도 오른쪽' },
  { id: 'back', name: '무대 뒤편' },
];

// Geometric exploration regions, deliberately independent of official seat numbering.
export function observationRegion(point, stage) {
  const x = point.x - stage.x,
    z = point.z - stage.z;
  if (Math.abs(x) > Math.abs(z)) return x < 0 ? 'left' : 'right';
  return z >= 0 ? 'front' : 'back';
}

export function regionSummary(result, stage, regionId = 'all') {
  const points =
    result?.points.filter((p) => regionId === 'all' || observationRegion(p, stage) === regionId) ||
    [];
  return {
    points,
    count: points.length,
    affected: points.filter((p) => p.blocked > 0).length,
    mean: points.reduce((sum, p) => sum + p.ratio, 0) / (points.length || 1),
  };
}

export function representativePoint(points) {
  if (!points.length) return null;
  const center = points.reduce(
    (sum, p) => ({
      x: sum.x + p.x / points.length,
      y: sum.y + p.y / points.length,
      z: sum.z + p.z / points.length,
    }),
    { x: 0, y: 0, z: 0 },
  );
  const distance = (p) => (p.x - center.x) ** 2 + (p.y - center.y) ** 2 + (p.z - center.z) ** 2;
  return points.reduce((best, p) => (distance(p) < distance(best) ? p : best));
}
