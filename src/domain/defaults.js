export const DEFAULT_STAGE = { x: 0, z: -16, width: 18, depth: 8, height: 1.5, targetHeight: 1.5 };
export const DEFAULT_EQUIPMENT = [
  {
    id: 'camera-1',
    name: '중앙 카메라 플랫폼',
    type: 'camera',
    x: 0,
    z: 5,
    width: 4,
    depth: 3,
    height: 4.5,
    rotation: 0,
  },
  {
    id: 'speaker-1',
    name: '왼쪽 스피커 타워',
    type: 'speaker',
    x: -10,
    z: -10,
    width: 2,
    depth: 2,
    height: 7,
    rotation: 0,
  },
  {
    id: 'speaker-2',
    name: '오른쪽 스피커 타워',
    type: 'speaker',
    x: 10,
    z: -10,
    width: 2,
    depth: 2,
    height: 7,
    rotation: 0,
  },
];
export const clone = (v) => structuredClone(v);
export function createObservers() {
  const samples = [];
  for (let block = 0; block < 12; block++) {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 6; col++) {
        const angle = ((-50 + block * 25 + (col - 2.5) * 3.1) * Math.PI) / 180;
        const radius = 28 + row * 2.1;
        samples.push({
          id: `S${block + 1}-${row + 1}-${col + 1}`,
          block: block + 1,
          row: row + 1,
          x: Math.sin(angle) * radius,
          y: 2.5 + row * 1.15,
          z: Math.cos(angle) * radius,
        });
      }
    }
  }
  return samples;
}
