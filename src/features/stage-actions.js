import { $, toast } from '../ui/primitives.js';
import { DEFAULT_STAGE } from '../domain/defaults.js';
export function bindStageActions({ project, edit, store, stageInputs, refreshSelected }) {
  $('#stage-preset').onchange = (e) => {
    if (e.target.value === 'custom') return;
    edit((p) => {
      p.stage = {
        ...DEFAULT_STAGE,
        ...(e.target.value === 'center' ? { z: 0, width: 12, depth: 12 } : {}),
      };
    });
  };
  for (const [id, key] of stageInputs)
    $(id).onchange = (e) => {
      const value = Number(e.target.value);
      if (
        e.target.value === '' ||
        !Number.isFinite(value) ||
        value < Number(e.target.min) ||
        value > Number(e.target.max)
      ) {
        e.target.value = project().stage[key];
        return toast('입력 범위를 확인해주세요.');
      }
      edit((p) => {
        p.stage[key] = value;
      });
      $('#stage-preset').value = 'custom';
    };
  $('#observer-mode').onchange = (e) => {
    edit(
      (p) => {
        p.observerMode = e.target.value;
      },
      { history: false },
    );
    store.setState({ selectedPointId: null });
    refreshSelected();
  };
}
