import { ico, esc } from './primitives.js';
import { renderReviewPanel } from './review-panel.js';
import { renderMapBoard } from './map-board.js';

function metric(label, valueId, note, icon, className = '') {
  return `<section class="card metric ${className}"><div class="card-body"><div class="metric-top"><span>${label}</span><span class="metric-icon">${ico(icon)}</span></div><strong id="${valueId}">—</strong>${note}</div></section>`;
}

export function renderLayout({ name, stage }) {
  return `<div class="studio-shell">
    <header class="studio-sidebar studio-header">
      <a class="studio-brand" href="#main-content"><span class="brand-icon">${ico('scan-eye')}</span><span>가림제로<small>공연장 시야 비교</small></span></a>
      <nav class="studio-navigation" role="tablist" aria-label="작업 선택">
        <button id="tab-explore" class="sidebar-link" data-panel="explore" role="tab" aria-label="관람 위치 탐색" aria-controls="panel-explore" aria-selected="true" tabindex="0">${ico('map-pin')}<span>관람 위치 탐색</span></button>
        <button id="tab-edit" class="sidebar-link" data-panel="edit" role="tab" aria-label="무대·장비 편집" aria-controls="panel-edit" aria-selected="false" tabindex="-1">${ico('sliders-horizontal')}<span>무대·장비 편집</span></button>
      </nav>
      <div class="toolbar-actions"><details class="file-menu"><summary class="btn btn-outline-secondary">${ico('panel-top')}<span>프로젝트</span></summary><div class="file-popover card"><label class="form-label" for="project-name">배치안 이름</label><input id="project-name" class="control-input form-control" maxlength="70" value="${esc(name)}"/><button id="import-project" class="btn btn-outline-secondary full">${ico('upload')}프로젝트 불러오기</button><button id="export-project" class="btn btn-outline-secondary full">${ico('download')}JSON 파일 저장</button><button id="reset" class="btn btn-ghost-secondary full">${ico('rotate-ccw')}기본 배치로 바꾸기</button></div></details><button id="report" class="btn btn-primary">${ico('file-text')}<span>보고서 보기</span></button></div>
    </header><div class="studio-main" id="main-content">
      <main class="studio-content">
        <div class="page-heading"><div><div class="page-pretitle">올림픽공원 · KSPO DOME</div><h1 id="workspace-title">관람 위치별 시야</h1><p id="workspace-description">지도에서 관람 위치를 고르고, 배치 전후의 시야를 비교해요.</p></div><button id="load-example" class="btn btn-outline-secondary">${ico('rotate-ccw')}예제 불러오기</button></div>
        <div class="workspace">${renderMapBoard()}${renderReviewPanel(stage)}</div>
        <section class="analysis-overview" aria-label="전체 관찰점 분석"><div class="analysis-heading"><span id="metrics-caption">현재안 · 전체 관찰점</span></div>
        <div id="analysis-error" class="analysis-error hidden" role="alert"></div><div class="metrics">
          ${metric('분석 관찰점', 'metric-total', '<p id="metric-total-note">관찰점을 불러오고 있어요</p>', 'map-pin')}
          ${metric('가림 발생', 'metric-affected', '<p id="metric-severe">50% 이상 가림 —</p>', 'layers-3', 'affected-metric')}
          ${metric('평균 가시율', 'metric-visible', '<p>무대 위 9개 표본 기준</p>', 'eye')}
          ${metric('기준안 대비 변화', 'impact-delta', '<p id="impact-note">같은 관찰점에서 비교</p>', 'copy', 'change-metric')}
        </div></section>
        <footer class="studio-footer"><span>공개 모델에서 추출한 관찰점이에요. 공식 좌석번호와는 달라요.</span><span id="saved-label" class="saved-label" role="status">변경 내용은 이 브라우저에 저장해요</span><button id="sources" class="text-button">${ico('database')}데이터 출처·분석 기준</button></footer>
      </main>
    </div>
  </div>
  <dialog id="modal"></dialog><div id="toast" class="studio-toast" role="status" aria-live="polite"></div><input id="project-file" type="file" accept=".json,application/json" hidden/><input id="model-file" type="file" accept=".glb,.dae" hidden/>`;
}
