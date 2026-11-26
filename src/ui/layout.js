import { ico, esc, numberField } from './primitives.js';
import { REGIONS } from '../domain/observation-regions.js';

export function renderLayout({ name, stage }) {
  return `
  <header class="app-header">
    <div class="brand"><span class="brand-symbol">${ico('scan-eye')}</span>가림제로<span class="brand-caption">공연장 시야 탐색</span></div>
    <div class="header-actions">
      <span class="saved-label" id="saved-label">이 브라우저에 자동 저장</span>
      <details class="file-menu"><summary class="btn">${ico('panel-top')}<span>프로젝트</span></summary><div class="file-popover"><label class="field-label" for="project-name">배치안 이름</label><input id="project-name" class="control-input" maxlength="70" value="${esc(name)}"/><button class="btn full" id="import-project">${ico('upload')}불러오기</button><button class="btn full" id="export-project">${ico('download')}JSON 저장</button><button class="btn ghost full" id="reset">${ico('rotate-ccw')}기본 배치로 초기화</button></div></details>
      <button class="btn primary" id="report" title="전체 관찰점 분석 보고서">${ico('file-text')}<span>전체 보고서</span></button>
    </div>
  </header>
  <main class="workspace">
    <section class="center" aria-label="공연장 탐색">
      <div class="venue-heading"><div><div class="venue-location">서울 · 올림픽공원</div><h1>KSPO DOME<span>체조경기장</span></h1></div><span class="venue-caption">공개 3D 모델</span></div>
      <div class="viewer-card" id="viewer-card">
        <div class="canvas-host" id="canvas-host" role="img" aria-label="공연장 3D 화면. 관찰점을 클릭하면 무대까지의 시야를 확인합니다."></div>
        <div class="viewer-toolbar"><div class="segmented" aria-label="보기 방식"><button data-view="orbit" class="active">${ico('box')}3D</button><button data-view="top">${ico('grid-2x2')}평면</button><button data-view="eye" id="eye-view">${ico('eye')}관객 시점</button></div><div class="viewer-buttons"><button class="icon-btn active" id="heat-toggle" title="가림 분석 색상" aria-label="가림 분석 색상 표시 전환" aria-pressed="true">${ico('layers-3')}</button><button class="icon-btn" id="fit-view" title="전체 보기" aria-label="전체 보기">${ico('focus')}</button><button class="icon-btn" id="snapshot" title="화면 PNG 저장" aria-label="화면 PNG 저장">${ico('camera')}</button></div></div>
        <div class="model-controls"><select id="model-mode" class="select" aria-label="공연장 모델"><option value="schematic">개략 모델</option><option value="official" disabled>공식 모델 로딩 중</option></select><span id="render-status">3D 로딩</span></div>
        <div id="model-progress" class="model-progress hidden" role="status"></div><div id="selected-badge" class="selected-badge hidden"></div>
        <div class="viewer-title"><strong id="viewer-model-label">KSPO DOME / 개략 모델</strong><p id="viewer-observer-label">모델 관찰점 · 공식 좌석번호 아님</p></div>
        <div class="viewer-bottom"><div class="legend"><span><i class="green-dot"></i>가림 없음</span><span><i class="orange-dot"></i>일부 가림</span><span><i class="red-dot"></i>50% 이상 가림</span></div><span class="viewer-hint">드래그로 회전 · 휠로 확대</span></div>
      </div>
      <div class="map-status"><span id="analysis-status" role="status">준비 중</span><span id="engine-mode"></span><button id="cancel-analysis" class="text-button">다시 계산</button><span class="status-spacer"></span><span>전체 관찰점 기준</span></div>
      <div id="analysis-error" class="analysis-error hidden" role="alert"></div>
      <div class="metrics" aria-label="전체 공연장 분석"><div class="metric"><span class="metric-label">분석 관찰점</span><strong id="metric-total">—</strong><p id="metric-total-note">모델 데이터 준비 중</p></div><div class="metric warn"><span class="metric-label">가림 발생</span><strong id="metric-affected">—</strong><p id="metric-severe">무대 표본 중 하나 이상 가림</p></div><div class="metric score"><span class="metric-label">평균 가시율</span><strong id="metric-visible">—</strong><p>추가 장비 가림 기준</p></div></div>
    </section>

    <aside class="explore-panel" aria-label="관람 위치와 배치 설정">
      <div class="panel-tabs" role="tablist" aria-label="탐색 도구"><button id="tab-explore" role="tab" data-panel="explore" aria-selected="true" aria-controls="panel-explore" tabindex="0">시야 탐색</button><button id="tab-edit" role="tab" data-panel="edit" aria-selected="false" aria-controls="panel-edit" tabindex="-1">장비·무대</button></div>
      <div class="panel-body">
        <section id="panel-explore" role="tabpanel" aria-labelledby="tab-explore">
          <div class="section-intro"><span class="section-kicker">VIEWPOINT</span><h2>관람 위치</h2><p>영역을 고르고, 무대가 어떻게 보이는지 확인하세요.</p></div>
          <div class="region-list" role="group" aria-label="무대 기준 관람 영역">${REGIONS.map((r) => `<button class="region-button ${r.id === 'all' ? 'active' : ''}" data-region="${r.id}" aria-pressed="${r.id === 'all'}"><span class="region-marker region-${r.id}" aria-hidden="true"></span><span>${r.name}</span><span class="region-count" data-region-count="${r.id}">—</span></button>`).join('')}</div>
          <p class="region-footnote">무대 기준 방향으로 나눈 영역입니다.<br/>공식 좌석 구역·번호와 다릅니다.</p>
          <div class="region-summary"><div class="row spread"><h3 id="region-title">전체 관람 영역</h3><span id="region-count">—</span></div><div class="region-score"><strong id="region-visible">—</strong><span>평균 가시율</span></div><div class="visibility-track" aria-hidden="true"><div id="region-visible-bar"></div></div><p id="region-affected">관찰점 데이터를 준비하고 있습니다.</p><button class="btn primary full" id="region-enter">${ico('eye')}이 영역에서 무대 보기</button><p class="secondary-note">영역 중앙에 가까운 관찰점을 선택합니다.</p></div>
          <section class="point-card"><div class="section-head">선택한 관찰점</div><p id="point-description">공연장 화면의 점을 누르면 관찰점 정보가 표시됩니다.</p><button class="btn full" id="add-point">${ico('map-pin')}관찰점 직접 지정</button><p id="custom-point-count" class="custom-points"></p><button class="btn small ghost full hidden" id="clear-points">직접 지정한 관찰점 삭제</button></section>
          <details class="advanced-settings"><summary>분석 데이터 설정</summary><label class="field-label" for="observer-mode">관찰점 데이터</label><select id="observer-mode" class="select"><option value="official">공식 모델 형상 추출</option><option value="design">개략 표본 504개</option><option value="custom">직접 지정 관찰점만</option></select><p id="venue-status" class="secondary-note">공식 모델 준비 중</p><button class="btn small ghost full" id="upload-model">${ico('upload')}내 3D 모델 불러오기</button></details>
        </section>

        <section id="panel-edit" role="tabpanel" aria-labelledby="tab-edit" hidden>
          <div class="section-intro"><span class="section-kicker">STAGE & EQUIPMENT</span><h2>장비·무대</h2><p>배치를 바꾸면 시야 분석에 반영됩니다.</p></div>
          <div class="section-head">배치된 장비 <small id="eq-count"></small></div><div id="equipment-list" class="equipment-list"></div><button class="add-equipment" id="add-equipment">${ico('plus')}장비 추가</button>
          <section class="inspector"><h3 id="inspector-title">장비 속성</h3><div id="inspector-fields"></div><button class="btn ghost full" id="undo">${ico('undo-2')}이전 변경 취소</button></section>
          <details class="advanced-settings"><summary>무대 크기·위치</summary><label class="field-label" for="stage-preset">무대 형태</label><select id="stage-preset" class="select"><option value="end">엔드 스테이지</option><option value="center">센터 스테이지</option><option value="custom">직접 설정</option></select><div class="input-grid stage-inputs">${numberField('stage-width', '너비', stage.width, 1, 50)}${numberField('stage-depth', '깊이', stage.depth, 1, 50)}${numberField('stage-height', '무대 높이', stage.height, 0, 10)}${numberField('stage-z', '앞뒤 위치 Z', stage.z, -50, 50)}${numberField('stage-x', '좌우 위치 X', stage.x, -50, 50)}${numberField('target-height', '관찰 대상 높이', stage.targetHeight, 0, 10)}</div></details>
          <section class="analysis-strip"><h3>장비 위치 후보 비교</h3><p>선택한 장비를 최대 21개 위치에서 비교합니다.</p><button class="btn primary full" id="optimize">${ico('move-3d')}위치 후보 비교</button><button class="btn ghost full" id="save-baseline">${ico('copy')}현재 배치를 기준안으로</button></section>
          <div class="comparison" id="comparison"><div class="comparison-title"><span>기준안 비교 · 전체 관찰점</span><span id="compare-delta"></span></div><div class="comparison-row"><span>기준안</span><div class="bar-track"><div id="bar-base" class="bar-fill"></div></div><strong id="base-score"></strong></div><div class="comparison-row"><span>현재</span><div class="bar-track"><div id="bar-current" class="bar-fill current"></div></div><strong id="current-score"></strong></div><p id="compare-note" class="secondary-note"></p></div>
        </section>
      </div>
      <footer class="panel-footer"><button class="source-button" id="sources">${ico('database')}데이터 출처·분석 기준</button><p>추가 장비의 가림을 비교하는 설계 참고용입니다.</p></footer>
    </aside>
  </main>
  <dialog id="modal"></dialog><div class="toast" id="toast" role="status" aria-live="polite"></div><input type="file" id="project-file" accept=".json,application/json" hidden/><input type="file" id="model-file" accept=".glb,.dae" hidden/>`;
}
