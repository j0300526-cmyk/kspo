import { polygonHull } from 'd3-polygon';
import { colors } from '../design/colors.js';
import { observationRegion } from '../domain/observation-regions.js';
import { esc } from '../ui/primitives.js';
import { MAP_COLORS } from './palette.js';
export { MAP_COLORS } from './palette.js';

export function comparisonCounts(current, prior) {
  const before = new Map(prior?.points.map((p) => [p.id, p]) || []);
  let improved = 0,
    worse = 0,
    same = 0;
  for (const point of current?.points || []) {
    const previous = before.get(point.id);
    if (!previous || previous.blocked === point.blocked) same++;
    else if (point.blocked < previous.blocked) improved++;
    else worse++;
  }
  return { improved, worse, same };
}
export function nearestObservation(points, x, z, stage, region = 'all', radius = 1.1) {
  let closest = null,
    distance = radius * radius;
  for (const point of points) {
    if (region !== 'all' && observationRegion(point, stage) !== region) continue;
    const d = (point.x - x) ** 2 + (point.z - z) ** 2;
    if (d < distance) {
      distance = d;
      closest = point;
    }
  }
  return closest;
}
const polygon = (points) =>
  points?.length ? `M${points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L')}Z` : '';
const circle = (x, y, r = 0.21) =>
  `M${(x - r).toFixed(2)},${y.toFixed(2)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;

export function seatMapSVG({
  analysis,
  prior,
  project,
  regionId = 'all',
  selectedPointId = null,
  selectedId = null,
  plan = 'current',
}) {
  const shown = plan === 'before' && prior ? prior : analysis;
  const stage = plan === 'before' && project.baseline ? project.baseline.stage : project.stage;
  const equipment =
    plan === 'before' && project.baseline ? project.baseline.equipment : project.equipment;
  const points = shown?.points || [];
  const coordinates = points.map((p) => [p.x, p.z]);
  const xs = [
    -35,
    35,
    ...points.map((p) => p.x),
    stage.x - stage.width / 2,
    stage.x + stage.width / 2,
  ];
  const zs = [
    -35,
    35,
    ...points.map((p) => p.z),
    stage.z - stage.depth / 2,
    stage.z + stage.depth / 2,
  ];
  const x0 = Math.min(...xs) - 16,
    z0 = Math.min(...zs) - 15,
    w = Math.max(...xs) - x0 + 16,
    h = Math.max(...zs) - z0 + 15;
  const hull = polygonHull(coordinates);
  const bins = new Map();
  for (const point of points) {
    const key = Math.floor(((Math.atan2(point.z, point.x) + Math.PI) / (2 * Math.PI)) * 72);
    const r = point.x ** 2 + point.z ** 2;
    if (!bins.has(key) || r < bins.get(key).r) bins.set(key, { r, point });
  }
  const inner =
    bins.size > 30
      ? [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => [v.point.x, v.point.z])
      : [];
  const boundary = polygon(hull) + polygon(inner);
  const before = new Map(prior?.points.map((p) => [p.id, p]) || []);
  const groups = {};
  for (const point of points) {
    let color = MAP_COLORS.clear;
    if (regionId !== 'all' && observationRegion(point, stage) !== regionId)
      color = MAP_COLORS.inactive;
    else if (plan === 'changes' && prior) {
      const old = before.get(point.id);
      color =
        !old || old.blocked === point.blocked
          ? MAP_COLORS.same
          : point.blocked < old.blocked
            ? MAP_COLORS.improved
            : MAP_COLORS.worse;
    } else if (point.ratio >= 0.5) color = MAP_COLORS.severe;
    else if (point.blocked) color = MAP_COLORS.partial;
    groups[color] = (groups[color] || '') + circle(point.x, point.z);
  }
  const sectors = {
    front: [
      [stage.x, stage.z],
      [stage.x + 180, stage.z + 180],
      [stage.x - 180, stage.z + 180],
    ],
    back: [
      [stage.x, stage.z],
      [stage.x - 180, stage.z - 180],
      [stage.x + 180, stage.z - 180],
    ],
    left: [
      [stage.x, stage.z],
      [stage.x - 180, stage.z + 180],
      [stage.x - 180, stage.z - 180],
    ],
    right: [
      [stage.x, stage.z],
      [stage.x + 180, stage.z - 180],
      [stage.x + 180, stage.z + 180],
    ],
  };
  const selected = points.find((p) => p.id === selectedPointId);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${z0} ${w} ${h}" data-base-viewbox="${x0} ${z0} ${w} ${h}" role="group" aria-label="공개 관찰점 위치 기반 공연장 지도. 공식 좌석번호가 아닙니다." style="width:100%;height:100%;display:block;background:${colors.background};font-family:Arial,'Malgun Gothic',sans-serif">
    <rect x="${x0}" y="${z0}" width="${w}" height="${h}" fill="white"/>
    <defs><clipPath id="bowl-clip"><path d="${boundary}" clip-rule="evenodd"/></clipPath></defs>
    <path d="${boundary}" fill="${colors.grey50}" fill-rule="evenodd" stroke="${colors.grey200}" stroke-width=".25"/>
    <g clip-path="url(#bowl-clip)">${Object.entries(sectors)
      .map(
        ([id, p]) =>
          `<path d="${polygon(p)}" fill="${regionId === id ? colors.blue50 : 'transparent'}" data-map-region="${id}" style="cursor:pointer"/>`,
      )
      .join('')}</g>
    ${Object.entries(groups)
      .map(([fill, d]) => `<path d="${d}" fill="${fill}"/>`)
      .join('')}
    <g transform="translate(${stage.x},${stage.z})"><rect x="${-stage.width / 2}" y="${-stage.depth / 2}" width="${stage.width}" height="${stage.depth}" rx=".8" fill="${colors.grey800}"/><text x="0" y=".8" text-anchor="middle" fill="white" font-size="${Math.min(2.5, stage.width / 7)}" font-weight="700" letter-spacing=".35">STAGE</text><path d="M${-stage.width / 2 + 0.8},${stage.depth / 2 - 0.4}h${stage.width - 1.6}" stroke="${colors.blue400}" stroke-width=".35"/></g>
    ${equipment.map((e) => `<g transform="translate(${e.x},${e.z}) rotate(${e.rotation})" data-map-equipment="${esc(e.id)}" style="cursor:pointer"><rect x="${-e.width / 2}" y="${-e.depth / 2}" width="${e.width}" height="${e.depth}" rx=".3" fill="${e.id === selectedId ? colors.blue500 : colors.grey500}" stroke="white" stroke-width=".3"/><text y="${e.depth / 2 + 2.3}" text-anchor="middle" fill="${colors.grey700}" font-size="1.5">${{ camera: 'CAM', speaker: 'SPK', console: 'FOH', screen: 'LED' }[e.type]}</text></g>`).join('')}
    <g fill="${colors.grey600}" font-size="2.15" text-anchor="middle"><text x="${(Math.min(...xs) + Math.max(...xs)) / 2}" y="${z0 + 5}">무대 뒤편</text><text x="${(Math.min(...xs) + Math.max(...xs)) / 2}" y="${z0 + h - 4}">무대 맞은편</text><text x="${x0 + 8}" y="0" transform="rotate(-90 ${x0 + 8} 0)">평면도 왼쪽</text><text x="${x0 + w - 8}" y="0" transform="rotate(90 ${x0 + w - 8} 0)">평면도 오른쪽</text></g>
    ${selected ? `<circle cx="${selected.x}" cy="${selected.z}" r="1.35" fill="${colors.background}" stroke="${colors.blue500}" stroke-width=".5"/><circle cx="${selected.x}" cy="${selected.z}" r=".42" fill="${colors.blue500}"/>` : ''}
    ${points.length ? '' : `<text x="0" y="15" text-anchor="middle" font-size="3" fill="${colors.grey600}">관찰점을 불러오고 있어요</text>`}
  </svg>`;
}

export class SeatMap {
  constructor(host, { selectPoint, selectEquipment, selectRegion }) {
    this.host = host;
    this.callbacks = { selectPoint, selectEquipment, selectRegion };
    this.click = (event) => {
      const equipment = event.target.closest('[data-map-equipment]');
      if (equipment) return selectEquipment(equipment.dataset.mapEquipment);
      const svg = host.querySelector('svg');
      if (!svg?.getScreenCTM) return;
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const shown =
        this.state.plan === 'before' && this.state.prior ? this.state.prior : this.state.analysis;
      const stage =
        this.state.plan === 'before' && this.state.project.baseline
          ? this.state.project.baseline.stage
          : this.state.project.stage;
      const hit = nearestObservation(
        shown?.points || [],
        point.x,
        point.y,
        stage,
        this.state.regionId,
      );
      if (hit) selectPoint(hit);
      else {
        const region = event.target.closest('[data-map-region]');
        if (region) selectRegion(region.dataset.mapRegion);
      }
    };
    host.addEventListener('click', this.click);
  }
  update(state) {
    const signature = [
      state.analysis,
      state.prior,
      state.regionId,
      state.selectedPointId,
      state.selectedId,
      state.plan,
      JSON.stringify([state.project.stage, state.project.equipment]),
    ];
    if (this.signature?.every((v, i) => v === signature[i])) return;
    const previous = this.host.querySelector('svg')?.getAttribute('viewBox');
    const retain = this.state?.analysis?.observerKey === state.analysis?.observerKey;
    this.state = state;
    this.signature = signature;
    this.host.innerHTML = seatMapSVG(state);
    if (retain && previous) this.host.querySelector('svg').setAttribute('viewBox', previous);
  }
  zoom(factor) {
    const svg = this.host.querySelector('svg');
    if (!svg) return;
    if (factor === 0) return svg.setAttribute('viewBox', svg.dataset.baseViewbox);
    const [x, y, w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
    const width = Math.max(20, Math.min(300, w * factor)),
      height = (h * width) / w;
    svg.setAttribute(
      'viewBox',
      `${x + (w - width) / 2} ${y + (h - height) / 2} ${width} ${height}`,
    );
  }
  dispose() {
    this.host.removeEventListener('click', this.click);
  }
}
