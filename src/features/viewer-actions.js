import { $, toast, download } from '../ui/primitives.js';
export function bindViewerActions({
  project,
  edit,
  get,
  getScene,
  selectPoint,
  getMap = () => null,
  getDisplay = () => '3d',
  on3D = () => {},
}) {
  let addPointMode = false;
  document.querySelectorAll('[data-view]').forEach(
    (btn) =>
      (btn.onclick = () => {
        on3D();
        if (btn.dataset.view === 'eye' && !get().selectedPointId) {
          const p = get().analysis?.points.find((p) => p.ratio > 0) || get().analysis?.points[0];
          if (!p) return toast('지도에서 관찰점을 고르면 관객 시점을 볼 수 있어요.');
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
    if (getDisplay() === 'map' && getMap())
      return download('garim-zero-map.svg', getMap(), 'image/svg+xml');
    if (!getScene())
      return toast('지도를 저장할 수 있어요. 3D는 새로고침한 뒤 다시 확인해 주세요.');
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
    on3D();
    addPointMode = !addPointMode;
    getScene()?.setAddPoint(addPointMode);
    $('#add-point').classList.toggle('primary', addPointMode);
    toast(addPointMode ? '모델 표면을 누르면 관찰점을 추가해요.' : '관찰점 추가를 마쳤어요');
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
      if (file.size > 150e6) throw new Error('150MB 이하의 모델 파일을 선택해 주세요.');
      await getScene().loadUserFile(file);
      $('#model-progress').classList.add('hidden');
      $('#render-status').textContent = '3D를 준비했어요';
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
      toast('모델을 불러왔어요. 표면을 눌러 관찰점을 추가해 주세요.');
    } catch (error) {
      toast(error.message);
    } finally {
      $('#model-progress').classList.add('hidden');
      e.target.value = '';
    }
  };
}
