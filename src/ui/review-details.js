import { $, esc } from './primitives.js';
import { comparisonCounts } from '../rendering/seat-map.js';
import { regionSummary } from '../domain/observation-regions.js';

export function createReviewDetails(selectPoint) {
  let listSignature,
    shownPoints = [];
  $('#point-list').onclick = (event) => {
    const button = event.target.closest('[data-pick-point]');
    if (button) selectPoint(shownPoints.find((p) => p.id === button.dataset.pickPoint));
  };
  return ({ analysis, prior, project, regionId, selectedPointId, plan }) => {
    const shown = plan === 'before' && prior ? prior : analysis;
    const stage = plan === 'before' && project.baseline ? project.baseline.stage : project.stage;
    const summary = regionSummary(shown, stage, regionId);
    const subset = regionSummary(analysis, stage, regionId);
    const ids = new Set(subset.points.map((p) => p.id));
    const counts = comparisonCounts(
      subset,
      prior ? { points: prior.points.filter((p) => ids.has(p.id)) } : null,
    );
    $('#change-improved').textContent = prior ? `${counts.improved.toLocaleString()}개` : '—';
    $('#change-worse').textContent = prior ? `${counts.worse.toLocaleString()}개` : '—';
    $('#plan-caption').textContent = {
      before: '기준안',
      current: '현재안',
      changes: '배치 전후 변화',
    }[plan];
    $('#metrics-caption').textContent = `${plan === 'before' ? '기준안' : '현재안'} · 전체 관찰점`;
    document.querySelectorAll('[data-plan]').forEach((button) => {
      const active = button.dataset.plan === plan;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = button.dataset.plan !== 'current' && !prior;
    });
    const delta = prior && analysis?.count ? (prior.mean - analysis.mean) * 100 : null;
    $('#impact-delta').textContent =
      delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%p`;
    $('#impact-note').textContent = prior
      ? `50% 이상 가림 ${prior.severe.toLocaleString()} → ${analysis.severe.toLocaleString()}개`
      : '기준안을 저장해 비교하세요';
    $('#map-comparison-note').textContent = prior
      ? `가림 감소 ${counts.improved.toLocaleString()}개 · 가림 증가 ${counts.worse.toLocaleString()}개 · 같은 관찰점 기준`
      : '기준안을 저장하면 배치 전후를 비교할 수 있습니다.';
    const legend =
      plan === 'changes'
        ? [
            ['#3859ed', '가림 감소'],
            ['#d98525', '가림 증가'],
            ['#d4dce4', '동일'],
          ]
        : [
            ['#9aaebf', '가림 없음'],
            ['#e7a246', '일부 가림'],
            ['#da5a54', '50% 이상 가림'],
          ];
    $('#map-legend').innerHTML = legend
      .map(([color, label]) => `<span><i style="background:${color}"></i>${label}</span>`)
      .join('');
    const current = analysis?.points.find((p) => p.id === selectedPointId),
      previous = prior?.points.find((p) => p.id === selectedPointId);
    $('#point-title').textContent = current ? current.id : '지도에서 위치를 선택하세요';
    $('#point-before').textContent = previous
      ? `${previous.total - previous.blocked} / ${previous.total}`
      : '—';
    $('#point-current').textContent = current
      ? `${current.total - current.blocked} / ${current.total}`
      : '—';
    $('#point-change').classList.toggle('hidden', !current || !previous);
    if (current && previous) {
      const gain = previous.blocked - current.blocked;
      $('#point-change').textContent =
        gain > 0
          ? `현재안에서 보이는 표본 ${gain}개 증가`
          : gain < 0
            ? `현재안에서 보이는 표본 ${-gain}개 감소`
            : '두 배치에서 보이는 표본 수가 같습니다.';
      $('#point-change').classList.toggle('worse', gain < 0);
    }
    const signature = [shown, prior, regionId, selectedPointId, project.stage];
    if (listSignature?.every((v, i) => v === signature[i])) return;
    listSignature = signature;
    shownPoints = [...summary.points]
      .sort((a, b) => b.blocked - a.blocked || a.id.localeCompare(b.id))
      .slice(0, 3);
    $('#point-list').innerHTML =
      shownPoints
        .map(
          (p) =>
            `<button class="point-row ${p.id === selectedPointId ? 'active' : ''}" data-pick-point="${esc(p.id)}"><span>${esc(p.id)} <small>관찰점</small></span><strong>${p.total - p.blocked} / ${p.total} 보임</strong></button>`,
        )
        .join('') || '<p class="secondary-note">이 영역에 관찰점이 없습니다.</p>';
  };
}
