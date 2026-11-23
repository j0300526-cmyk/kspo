import { $, toast, modal, download } from '../ui/primitives.js';
import { clone, DEFAULT_STAGE, DEFAULT_EQUIPMENT } from '../domain/defaults.js';
import { parseProject } from '../domain/project-schema.js';
export function bindProjectActions({
  project,
  edit,
  store,
  getScene,
  refreshInspector,
  refreshStage,
}) {
  $('#project-name').onchange = (e) =>
    edit(
      (p) => {
        p.name = e.target.value.trim() || '새 배치안';
      },
      { history: false },
    );
  $('#undo').onclick = () => {
    document.activeElement?.blur();
    store.undo();
    refreshInspector();
    refreshStage();
  };
  $('#save-baseline').onclick = () => {
    edit(
      (p) => {
        p.baseline = { stage: clone(p.stage), equipment: clone(p.equipment) };
      },
      { history: false },
    );
    toast('기준안을 저장했습니다.');
  };
  $('#reset').onclick = () => {
    modal(
      '배치 초기화',
      '<p>현재 배치를 기본값으로 바꿉니다. 변경 취소로 되돌릴 수 있습니다.</p><button class="btn primary" id="confirm-reset">초기화</button>',
    );
    $('#confirm-reset').onclick = () => {
      edit((p) => {
        p.stage = clone(DEFAULT_STAGE);
        p.equipment = clone(DEFAULT_EQUIPMENT);
        p.customPoints = [];
        p.baseline = null;
      });
      store.setState({ selectedPointId: null });
      refreshStage();
      refreshInspector();
      $('dialog').close();
    };
  };
  $('#export-project').onclick = () =>
    download('garim-zero-project.json', JSON.stringify(project(), null, 2), 'application/json');
  $('#import-project').onclick = () => $('#project-file').click();
  $('#project-file').onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2e6) throw new Error('프로젝트 파일은 2MB 이하여야 합니다.');
      const next = parseProject(JSON.parse(await file.text()));
      store.replace(next);
      refreshStage();
      refreshInspector();
      if (next.customModel && getScene()?.meta?.name !== next.customModel) {
        getScene()?.setModelMode('schematic');
        $('#venue-status').textContent = '사용자 모델을 다시 불러오세요: ' + next.customModel;
      }
      toast('프로젝트를 불러왔습니다.');
    } catch (error) {
      toast(error.message);
    } finally {
      e.target.value = '';
    }
  };
}
