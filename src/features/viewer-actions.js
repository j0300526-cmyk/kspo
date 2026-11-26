import { $, toast } from '../ui/primitives.js';
export function bindViewerActions({ project, edit, get, getScene, selectPoint }) {
  let addPointMode = false;
  document.querySelectorAll('[data-view]').forEach(
    (btn) =>
      (btn.onclick = () => {
        if (btn.dataset.view === 'eye' && !get().selectedPointId) {
          const p = get().analysis?.points.find((p) => p.ratio > 0) || get().analysis?.points[0];
          if (!p) return toast('관찰점을 먼저 지정하세요.');
          selectPoint(p);
        }
        getScene()?.setView(btn.dataset.view);
        document
          .querySelectorAll('[data-view]')
          .forEach((b) => b.classList.toggle('active', b === btn));
      }),
  );
  $('#fit-view').onclick = () => {
    getScene()?.setView('orbit');
    document
      .querySelectorAll('[data-view]')
      .forEach((b) => b.classList.toggle('active', b.dataset.view === 'orbit'));
  };
  $('#heat-toggle').onclick = (e) => {
    if (!getScene()) return;
    getScene().showHeat = !getScene().showHeat;
    if (get().analysis) getScene().setAnalysis(get().analysis);
    e.currentTarget.classList.toggle('active', getScene().showHeat);
    e.currentTarget.setAttribute('aria-pressed', String(getScene().showHeat));
  };
  $('#snapshot').onclick = () => {
    if (!getScene()) return toast('3D 화면을 사용할 수 없습니다.');
    const a = document.createElement('a');
    a.href = getScene().capture();
    a.download = 'garim-zero-view.png';
    a.click();
  };
  $('#model-mode').onchange = (e) => {
    getScene()?.setModelMode(e.target.value);
    $('#viewer-model-label').textContent =
      e.target.value === 'schematic'
        ? 'KSPO DOME / 간단 시야도'
        : getScene()?.meta?.custom
          ? '사용자 모델'
          : 'KSPO DOME / 원본 건물 모델';
  };
  $('#add-point').onclick = () => {
    addPointMode = !addPointMode;
    getScene()?.setAddPoint(addPointMode);
    $('#add-point').classList.toggle('primary', addPointMode);
    toast(addPointMode ? '모델 표면을 클릭해 관찰점을 추가하세요.' : '관찰점 지정 종료');
  };
  $('#clear-points').onclick = () =>
    edit((p) => {
      p.customPoints = [];
    });
  $('#upload-model').onclick = () => $('#model-file').click();
  $('#model-file').onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (!getScene()) throw new Error('3D 화면을 먼저 준비해주세요.');
      if (file.size > 150e6) throw new Error('모델은 150MB 이하여야 합니다.');
      await getScene().loadUserFile(file);
      $('#model-progress').classList.add('hidden');
      $('#render-status').textContent = '3D 준비됨';
      edit((p) => {
        p.customModel = file.name;
        p.observerMode = 'custom';
        p.customPoints = [];
      });
      $('#observer-mode').value = 'custom';
      $('#venue-status').textContent = `사용자 모델 / ${file.name}`;
      $('#model-mode option[value="official"]').disabled = false;
      $('#model-mode option[value="official"]').textContent = '사용자 모델';
      $('#model-mode').value = 'official';
      $('#viewer-model-label').textContent = '사용자 모델';
      toast('모델을 불러왔습니다. 관찰점을 직접 지정하세요.');
    } catch (error) {
      toast(error.message);
    } finally {
      $('#model-progress').classList.add('hidden');
      e.target.value = '';
    }
  };
}
