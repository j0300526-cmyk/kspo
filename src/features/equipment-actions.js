import { $, ico, modal, toast } from '../ui/primitives.js';
import { equipmentTypes } from '../ui/equipment.js';
export function bindEquipmentActions({ project, edit, store }) {
  $('#add-equipment').onclick = () => {
    if (project().equipment.length >= 30) return toast('장비는 최대 30개입니다.');
    modal(
      '장비 추가',
      `<div class="add-options">${Object.entries(equipmentTypes)
        .map(
          ([key, e]) =>
            `<button class="add-option" data-add="${key}">${ico(e.icon)}<strong>${e.name}</strong></button>`,
        )
        .join('')}</div>`,
    );
    document.querySelectorAll('[data-add]').forEach(
      (btn) =>
        (btn.onclick = () => {
          const type = btn.dataset.add,
            {
              name,
              size: [width, depth, height],
            } = equipmentTypes[type],
            id = crypto.randomUUID();
          edit((p) =>
            p.equipment.push({
              id,
              name: `${name} ${p.equipment.filter((e) => e.type === type).length + 1}`,
              type,
              x: 5,
              z: 12,
              width,
              depth,
              height,
              rotation: 0,
            }),
          );
          store.setState({ selectedId: id });
          $('dialog').close();
        }),
    );
  };
}
