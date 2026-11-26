import { ico, esc } from './primitives.js';
import { renderReviewPanel } from './review-panel.js';
import { renderMapBoard } from './map-board.js';

function metric(label, valueId, note, icon, className = '') {
  return `<section class="card metric ${className}"><div class="card-body"><div class="metric-top"><span>${label}</span><span class="metric-icon">${ico(icon)}</span></div><strong id="${valueId}">—</strong>${note}</div></section>`;
}

export function renderLayout({ name, stage }) {
  return `<div class="studio-shell">
    <aside class="studio-sidebar" aria-label="작업 메뉴">
      <a class="studio-brand" href="#main-content"><span class="brand-icon">${ico('scan-eye')}</span><span>가림제로<small>공연장 시야 분석</small></span></a>
      <span class="sidebar-label">WORKSPACE</span>
      <nav class="studio-navigation" role="tablist" aria-label="작업 선택" aria-orientation="vertical">
        <button id="tab-explore" class="sidebar-link" data-panel="explore" role="tab" aria-label="관람 위치 탐색" aria-controls="panel-explore" aria-selected="true" tabindex="0">${ico('map-pin')}<span>관람 위치 탐색</span></button>
        <button id="tab-edit" class="sidebar-link" data-panel="edit" role="tab" aria-label="무대·장비 편집" aria-controls="panel-edit" aria-selected="false" tabindex="-1">${ico('sliders-horizontal')}<span>무대·장비 편집</span></button>
      </nav>
      <div class="sidebar-venue"><span class="sidebar-label">분석 중인 공연장</span><strong>KSPO DOME</strong><span>올림픽공원 · 체조경기장</span><div class="venue-tag">공개 모델 기반</div></div>
      <div class="sidebar-bottom"><p>한국체육산업개발<br/>공공데이터 활용 프로젝트</p><span id="saved-label" class="saved-label" role="status">이 브라우저에 자동 저장</span></div>
    </aside>
    <div class="studio-main" id="main-content">
      <header class="studio-toolbar"><div class="toolbar-location">${ico('grid-2x2')}<span>공연장 작업실</span><span class="toolbar-divider">/</span><strong>KSPO DOME</strong></div><div class="toolbar-actions">
        <details class="file-menu"><summary class="btn btn-outline-secondary">${ico('panel-top')}<span>프로젝트</span></summary><div class="file-popover card"><label class="form-label" for="project-name">배치안 이름</label><input id="project-name" class="control-input form-control" maxlength="70" value="${esc(name)}"/><button id="import-project" class="btn btn-outline-secondary full">${ico('upload')}불러오기</button><button id="export-project" class="btn btn-outline-secondary full">${ico('download')}JSON 저장</button><button id="reset" class="btn btn-ghost-secondary full">${ico('rotate-ccw')}기본 배치로</button></div></details>
        <button id="report" class="btn btn-primary">${ico('file-text')}<span>보고서 내보내기</span></button>
      </div></header>
      <main class="studio-content">
        <div class="page-heading"><div><div class="page-pretitle">KSPO DOME / SIGHTLINE STUDIO</div><h1 id="workspace-title">관람 위치별 시야</h1><p id="workspace-description">공연장을 둘러보고, 장비 배치 전후의 시야를 비교하세요.</p></div><button id="load-example" class="btn btn-outline-secondary">${ico('rotate-ccw')}배치 비교 예제</button></div>
        <section class="analysis-overview" aria-label="전체 관찰점 분석"><div class="analysis-heading"><span id="metrics-caption">현재안 · 전체 관찰점</span><div class="analysis-status"><span id="analysis-status" role="status">분석 준비 중</span><span id="engine-mode" class="sr-only"></span><button id="cancel-analysis" class="text-button">다시 계산</button></div></div>
        <div id="analysis-error" class="analysis-error hidden" role="alert"></div><div class="metrics">
          ${metric('분석 관찰점', 'metric-total', '<p id="metric-total-note">공개 관찰점 준비 중</p>', 'map-pin')}
          ${metric('가림 발생', 'metric-affected', '<p id="metric-severe">50% 이상 가림 —</p>', 'layers-3', 'affected-metric')}
          ${metric('평균 가시율', 'metric-visible', '<p>무대 위 9개 표본 기준</p>', 'eye')}
          ${metric('기준안 대비 변화', 'impact-delta', '<p id="impact-note">같은 관찰점에서 비교</p>', 'copy', 'change-metric')}
        </div></section>
        <div class="workspace">${renderMapBoard()}${renderReviewPanel(stage)}</div>
        <footer class="studio-footer"><span>관찰점 기반 시뮬레이션 · 공식 좌석번호 및 예매 좌석도가 아닙니다.</span><button id="sources" class="text-button">${ico('database')}데이터 출처·분석 기준</button></footer>
      </main>
    </div>
  </div>
  <dialog id="modal"></dialog><div id="toast" class="studio-toast" role="status" aria-live="polite"></div><input id="project-file" type="file" accept=".json,application/json" hidden/><input id="model-file" type="file" accept=".glb,.dae" hidden/>`;
}
