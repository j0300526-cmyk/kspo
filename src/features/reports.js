import { $, ico, esc, modal, download, toast } from '../ui/primitives.js';
const csvCell = (value) => {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
};
export function analysisCSV(result, equipment) {
  const rows = [
    [
      '관찰점',
      '분류',
      'X(m)',
      '눈높이Y(m)',
      'Z(m)',
      '가림표본수',
      '전체표본수',
      '가림비율',
      '원인장비',
    ],
    ...result.points.map((p) => [
      p.id,
      p.source || 'design-sample',
      p.x,
      p.y,
      p.z,
      p.blocked,
      p.total,
      p.ratio,
      p.causes.map((id) => equipment.find((e) => e.id === id)?.name || id).join(' / '),
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
export function showReport({ project, result, prior, scene, description, image: suppliedImage }) {
  const image = suppliedImage || scene?.capture(),
    visible = result.count ? `${((1 - result.mean) * 100).toFixed(1)}%` : '분석점 없음';
  modal(
    '시야 가림 분석',
    `<div class="eyebrow">GARIM ZERO / REPORT</div><h3>${esc(project.name)}</h3><p>${new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date())}</p>${image ? `<img src="${image}" class="report-image" alt="배치 화면"/>` : ''}<table><tr><th>관찰점</th><th>가림 발생</th><th>평균 가시율</th></tr><tr><td>${result.count.toLocaleString()}개</td><td>${result.affected.toLocaleString()}개</td><td>${visible}</td></tr></table>${prior ? `<p>기준안 대비 ${((prior.mean - result.mean) * 100).toFixed(1)}%p</p>` : ''}<p>50% 이상 가림: ${result.severe.toLocaleString()}개${prior ? ` · 기준안 ${prior.severe.toLocaleString()}개` : ''}</p><h3>장비</h3><table><tr><th>이름</th><th>X / Z (m)</th><th>너비 × 깊이 × 높이 (m)</th></tr>${project.equipment.map((e) => `<tr><td>${esc(e.name)}</td><td>${e.x} / ${e.z}</td><td>${e.width} × ${e.depth} × ${e.height}</td></tr>`).join('')}</table><h3>자료와 해석 범위</h3><p>${esc(description)}. 공식 좌석번호 매핑 및 기존 구조물 가림은 포함하지 않아요. 무대 위 9개 지점에 대한 추가 장비 가림을 계산해요. 관찰점 높이는 모델 등받이 상단 +0.30m 가정이에요.</p><p><a href="https://www.data.go.kr/data/15127487/fileData.do">한국체육산업개발 공공데이터</a> · ${scene?.meta?.custom ? '사용자 모델' : scene?.modelMode === 'official' ? '공식 모델' : '간단 시야도'}</p><div class="modal-actions"><button class="btn" id="export-csv">${ico('download')}CSV</button><button class="btn primary" id="print-report-btn">${ico('file-text')}인쇄하거나 PDF 저장</button></div>`,
    'print-report',
  );
  $('#print-report-btn').onclick = () => window.print();
  $('#export-csv').onclick = () => {
    download(
      'garim-zero-analysis.csv',
      analysisCSV(result, project.equipment),
      'text/csv;charset=utf-8',
    );
    toast('CSV를 저장했어요.');
  };
}
