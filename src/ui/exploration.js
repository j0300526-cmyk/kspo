import { $ } from './primitives.js';
import { REGIONS, observationRegion, regionSummary } from '../domain/observation-regions.js';

export function renderExploration(analysis, stage, regionId) {
  const counts = Object.fromEntries(REGIONS.map((r) => [r.id, 0]));
  for (const point of analysis?.points || []) counts[observationRegion(point, stage)]++;
  counts.all = analysis?.count || 0;
  document.querySelectorAll('[data-region]').forEach((button) => {
    const active = button.dataset.region === regionId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.querySelector('[data-region-count]').textContent = analysis
      ? `${counts[button.dataset.region].toLocaleString()}개`
      : '—';
  });
  const summary = regionSummary(analysis, stage, regionId);
  $('#region-title').textContent = REGIONS.find((r) => r.id === regionId).name;
  $('#region-count').textContent = `${summary.count.toLocaleString()}개 관찰점`;
  const visible = summary.count ? (1 - summary.mean) * 100 : 0;
  $('#region-visible').textContent = summary.count ? `${visible.toFixed(1)}%` : '—';
  $('#region-visible-bar').style.width = `${visible}%`;
  $('#region-affected').textContent = summary.count
    ? `가림 발생 ${summary.affected.toLocaleString()}개 · 무대 위 9개 표본 기준`
    : '이 영역에 분석할 관찰점이 없습니다.';
  $('#region-enter').disabled = !summary.count;
}

export function bindExploration({ onRegion, onEnter }) {
  const events = new AbortController();
  const tabs = [...document.querySelectorAll('[data-panel]')];
  function showPanel(id) {
    for (const tab of tabs) {
      const active = tab.dataset.panel === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      $(`#panel-${tab.dataset.panel}`).hidden = !active;
    }
    $('#workspace-title').textContent = id === 'edit' ? '무대·장비 배치 편집' : '관람 위치별 시야';
    $('#workspace-description').textContent =
      id === 'edit'
        ? '장비 위치를 조정하고, 관람 위치별 시야 변화를 확인하세요.'
        : '공연장을 둘러보고, 장비 배치 전후의 시야를 비교하세요.';
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.panel), { signal: events.signal });
    tab.addEventListener(
      'keydown',
      (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
          return;
        event.preventDefault();
        const next =
          event.key === 'Home'
            ? tabs[0]
            : event.key === 'End'
              ? tabs.at(-1)
              : tabs[
                  (index +
                    (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : tabs.length - 1)) %
                    tabs.length
                ];
        showPanel(next.dataset.panel);
        next.focus();
      },
      { signal: events.signal },
    );
  });
  document.querySelectorAll('[data-region]').forEach((button) =>
    button.addEventListener('click', () => onRegion(button.dataset.region), {
      signal: events.signal,
    }),
  );
  $('#region-enter').addEventListener('click', onEnter, { signal: events.signal });
  return { showPanel, dispose: () => events.abort() };
}
