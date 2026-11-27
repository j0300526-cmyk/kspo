import { $ } from './primitives.js';
export function renderResults({
  analysis,
  prior,
  project,
  busy,
  error,
  history,
  selectedId,
  description,
  engineMode,
  displayAnalysis,
}) {
  const shown = displayAnalysis || analysis;
  $('#analysis-status').textContent = error
    ? '분석을 다시 확인해 주세요'
    : busy
      ? '시야를 계산하고 있어요'
      : analysis
        ? '계산을 마쳤어요'
        : '대기';
  $('#analysis-status').dataset.busy = String(busy);
  $('#engine-mode').textContent =
    engineMode === 'worker' ? 'Worker' : engineMode === 'cooperative' ? '분할 계산' : '준비 중';
  $('#analysis-error').textContent = error || '';
  $('#analysis-error').classList.toggle('hidden', !error);
  $('#undo').disabled = !history.length;
  $('#optimize').disabled = !selectedId || !analysis?.count || busy;
  $('#report').disabled = busy || !analysis;
  $('#cancel-analysis').disabled = !busy && !error;
  if (!analysis) return;
  $('#metric-total').innerHTML = `${shown.count.toLocaleString()}<small>개</small>`;
  $('#metric-affected').innerHTML = `${shown.affected.toLocaleString()}<small>개</small>`;
  $('#metric-visible').innerHTML = shown.count
    ? `${((1 - shown.mean) * 100).toFixed(1)}<small>%</small>`
    : '—';
  $('#metric-severe').textContent = `50% 이상 가림 ${shown.severe.toLocaleString()}개`;
  $('#metric-total-note').textContent = description;
  $('#viewer-observer-label').textContent = `${description} · 공식 좌석번호 아님`;
  $('#custom-point-count').textContent = project.customPoints.length
    ? `직접 지정 ${project.customPoints.length}개`
    : '';
  $('#clear-points').classList.toggle('hidden', !project.customPoints.length);
  $('#comparison').classList.toggle('visible', !!prior && analysis.count > 0);
  if (prior && analysis.count) {
    const base = (1 - prior.mean) * 100,
      current = (1 - analysis.mean) * 100,
      delta = current - base;
    $('#base-score').textContent = `${base.toFixed(1)}%`;
    $('#current-score').textContent = `${current.toFixed(1)}%`;
    $('#bar-base').style.width = `${base}%`;
    $('#bar-current').style.width = `${current}%`;
    $('#compare-delta').textContent = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%p`;
    $('#compare-note').textContent =
      `관찰점 ${analysis.count}개 · 가림 ${prior.affected} → ${analysis.affected}개 · 50% 이상 가림 ${prior.severe} → ${analysis.severe}개${JSON.stringify(project.stage) !== JSON.stringify(project.baseline?.stage) ? ' · 무대 설정 변경' : ''}`;
  }
}
