import { $, ico, esc, icons, numberField } from './primitives.js';
export const equipmentTypes = {
  camera: { name: '카메라 플랫폼', icon: 'camera', size: [3, 2, 4] },
  speaker: { name: '스피커 타워', icon: 'volume-2', size: [2, 2, 7] },
  console: { name: '콘솔 부스', icon: 'sliders-horizontal', size: [5, 3, 2] },
  screen: { name: '스크린', icon: 'monitor', size: [8, 1, 5] },
};
export function renderEquipment(equipment, selectedId, onSelect) {
  $('#eq-count').textContent = `${equipment.length}개`;
  $('#equipment-list').innerHTML =
    equipment
      .map(
        (e) =>
          `<button class="equipment-item ${selectedId === e.id ? 'active' : ''}" data-eq="${esc(e.id)}"><span class="eq-icon">${ico(equipmentTypes[e.type].icon)}</span><span><span class="eq-name">${esc(e.name)}</span><span class="eq-meta">${e.width} × ${e.depth} × ${e.height} m</span></span></button>`,
      )
      .join('') || '<p class="source-note">장비를 추가하세요.</p>';
  document
    .querySelectorAll('[data-eq]')
    .forEach((btn) => (btn.onclick = () => onSelect(btn.dataset.eq)));
  icons();
}
export function renderInspector(e, { onEdit, onDelete, onInvalid }) {
  $('#inspector-title').textContent = e?.name || '선택한 장비 없음';
  $('#inspector-fields').innerHTML = e
    ? `<label class="field-label" for="eq-name">이름</label><input class="control-input form-control" id="eq-name" value="${esc(e.name)}" maxlength="80"/><div class="divider"></div><div class="section-head">위치</div><div class="input-grid">${numberField('eq-x', 'X', e.x, -50, 50)}${numberField('eq-z', 'Z', e.z, -50, 50)}</div><div class="divider"></div><div class="section-head">크기</div><div class="input-grid">${numberField('eq-width', '너비', e.width, 0.3, 20)}${numberField('eq-depth', '깊이', e.depth, 0.3, 20)}${numberField('eq-height', '높이', e.height, 0.3, 20)}</div><div class="divider"></div><label class="range-label" for="eq-rotation">회전<output id="rotation-output">${e.rotation}°</output></label><input class="range form-range" id="eq-rotation" type="range" min="-180" max="180" step="5" value="${e.rotation}" aria-label="장비 회전 각도"/><button class="btn btn-outline-danger delete-btn full" id="delete-equipment">${ico('trash-2')}삭제</button>`
    : '<p class="source-note">목록에서 장비를 선택하세요.</p>';
  if (!e) return;
  $('#eq-name').onchange = (event) =>
    onEdit('name', event.target.value.trim().slice(0, 80) || '장비');
  let rotationGroup;
  for (const key of ['x', 'z', 'width', 'depth', 'height', 'rotation']) {
    const input = $(`#eq-${key}`);
    input.addEventListener(key === 'rotation' ? 'input' : 'change', () => {
      const value = Number(input.value);
      if (
        input.value === '' ||
        !Number.isFinite(value) ||
        value < Number(input.min) ||
        value > Number(input.max)
      ) {
        input.value = e[key];
        onInvalid();
        return;
      }
      if (key === 'rotation') {
        rotationGroup ??= crypto.randomUUID();
        $('#rotation-output').textContent = `${value}°`;
      }
      onEdit(key, value, key === 'rotation' ? rotationGroup : null);
    });
    if (key === 'rotation')
      input.onchange = () => {
        rotationGroup = null;
      };
  }
  $('#delete-equipment').onclick = onDelete;
  icons();
}
