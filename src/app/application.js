import { bindProjectActions } from '../features/project-actions.js';
import { bindViewerActions } from '../features/viewer-actions.js';
import { bindStageActions } from '../features/stage-actions.js';
import { bindEquipmentActions } from '../features/equipment-actions.js';
import { createProjectStore } from './store.js';
import { createProjectStorage } from '../services/project-storage.js';
import { AnalysisClient } from '../services/analysis-client.js';
import { createAnalysisCoordinator } from '../services/analysis-coordinator.js';
import { parseObservations, parseProject } from '../domain/project-schema.js';
import { clone, createObservers } from '../domain/defaults.js';
import { renderLayout } from '../ui/layout.js';
import { $, ico, icons, toast, modal } from '../ui/primitives.js';
import { renderEquipment, renderInspector } from '../ui/equipment.js';
import { renderResults } from '../ui/results.js';
import { sourceContent } from '../ui/sources.js';
import { showReport } from '../features/reports.js';
import { renderExploration, bindExploration } from '../ui/exploration.js';
import { SeatMap, seatMapSVG } from '../rendering/seat-map.js';
import { createReviewDetails } from '../ui/review-details.js';
import { observationLabel } from '../ui/observation-label.js';
import demoProject from '../data/demo-project.json';
import {
  observationRegion,
  regionSummary,
  representativePoint,
} from '../domain/observation-regions.js';

export async function createApplication({
  createScene,
  analysisClient,
  storage: providedStorage,
} = {}) {
  const storage =
    providedStorage ||
    createProjectStorage({
      onStatus: (message) => {
        if ($('#saved-label')) $('#saved-label').textContent = message;
      },
    });
  const initial = (await storage.load()) || parseProject(structuredClone(demoProject)),
    store = createProjectStore(initial);
  $('#app').innerHTML = renderLayout(initial);
  icons();
  let scene = null,
    modelObservers = [],
    officialMeta = null,
    engineMode = 'starting',
    disposed = false,
    regionId = 'all',
    plan = 'current',
    display = 'map';
  let geometrySignature = '',
    observationsSignature = '',
    observerKey = 0,
    observers = [],
    optimizing = false;
  const samples = createObservers(),
    get = () => store.getState(),
    project = () => get().project;
  const displayedAnalysis = () => (plan === 'before' && get().prior ? get().prior : get().analysis);
  const displayedStage = () =>
    plan === 'before' && project().baseline ? project().baseline.stage : project().stage;
  const seatMap = new SeatMap($('#seat-map-host'), {
    selectPoint,
    selectEquipment,
    selectRegion: (id) => document.querySelector(`[data-region="${id}"]`).click(),
  });
  const renderReview = createReviewDetails(selectPoint);
  function setDisplay(mode) {
    if (mode === '3d' && plan !== 'current') {
      plan = 'current';
      syncScene();
      refreshResults();
    }
    display = mode;
    $('#seat-map-host').classList.toggle('hidden', mode !== 'map');
    $('#canvas-host').classList.toggle('hidden', mode !== '3d');
    $('#three-tools').classList.toggle('hidden', mode !== '3d');
    document
      .querySelectorAll('.map-only')
      .forEach((el) => el.classList.toggle('hidden', mode !== 'map'));
    document.querySelectorAll('[data-display]').forEach((button) => {
      button.classList.toggle('active', button.dataset.display === mode);
      button.setAttribute('aria-pressed', String(button.dataset.display === mode));
    });
    if (mode === '3d') {
      scene?.resize?.();
      scene?.invalidate?.();
    }
  }
  function syncScene() {
    const baseline = plan === 'before' && project().baseline;
    scene?.setStage(baseline ? baseline.stage : project().stage);
    scene?.setEquipment(baseline ? baseline.equipment : project().equipment, get().selectedId);
    if (displayedAnalysis()) scene?.setAnalysis(displayedAnalysis());
  }
  document
    .querySelectorAll('[data-display]')
    .forEach((button) => (button.onclick = () => setDisplay(button.dataset.display)));
  document.querySelectorAll('[data-plan]').forEach(
    (button) =>
      (button.onclick = () => {
        plan = button.dataset.plan;
        setDisplay('map');
        syncScene();
        refreshResults();
        refreshSelected();
      }),
  );
  document
    .querySelectorAll('[data-map-zoom]')
    .forEach((button) => (button.onclick = () => seatMap.zoom(Number(button.dataset.mapZoom))));
  $('#load-example').onclick = () => {
    plan = 'current';
    regionId = 'all';
    store.replace(parseProject(structuredClone(demoProject)));
    refreshStage();
    refreshInspector();
    setDisplay('map');
    toast('예제를 불러왔어요. 이전 변경 취소로 원래 배치를 복원할 수 있어요.');
  };
  const exploration = bindExploration({
    onRegion(id) {
      regionId = id;
      if (scene?.mode === 'eye') {
        scene.setView('orbit');
        document
          .querySelectorAll('[data-view]')
          .forEach((button) => button.classList.toggle('active', button.dataset.view === 'orbit'));
      }
      const point = get().analysis?.points.find((p) => p.id === get().selectedPointId);
      if (point && id !== 'all' && observationRegion(point, displayedStage()) !== id)
        selectPoint(null);
      scene?.setRegion?.(id);
      refreshResults();
    },
    onEnter() {
      const point = representativePoint(
        regionSummary(displayedAnalysis(), displayedStage(), regionId).points,
      );
      if (!point) return;
      selectPoint(point);
      setDisplay('3d');
      scene?.setView('eye');
      document
        .querySelectorAll('[data-view]')
        .forEach((button) => button.classList.toggle('active', button.dataset.view === 'eye'));
    },
  });
  const describe = () =>
    project().observerMode === 'custom'
      ? `직접 지정 ${project().customPoints.length}개`
      : project().observerMode === 'official' && modelObservers.length
        ? `모델 형상 추출 ${modelObservers.length.toLocaleString()}개 · 직접 지정 ${project().customPoints.length}개`
        : `개략 표본 504개 · 직접 지정 ${project().customPoints.length}개`;
  const client =
    analysisClient ||
    new AnalysisClient({
      onMode: (mode) => {
        engineMode = mode;
        refreshResults();
      },
    });
  const coordinator = createAnalysisCoordinator(client, {
    onResult({ current, prior }) {
      store.setState({ analysis: current, prior, error: null });
      syncScene();
      refreshSelected();
    },
    onBusy: (busy) => store.setState({ busy }),
    onError: (error) => store.setState({ error: error.message }),
  });
  function refreshResults() {
    renderResults({
      ...get(),
      busy: get().busy || optimizing,
      description: describe(),
      engineMode,
      displayAnalysis: displayedAnalysis(),
    });
    renderExploration(displayedAnalysis(), displayedStage(), regionId);
    const reviewState = { ...get(), regionId, plan };
    seatMap.update(reviewState);
    renderReview(reviewState);
  }
  function requestAnalysis() {
    const p = project(),
      obsSignature = JSON.stringify([p.observerMode, p.customPoints, modelObservers.length]);
    if (obsSignature !== observationsSignature) {
      observationsSignature = obsSignature;
      observerKey++;
      observers = [
        ...(p.observerMode === 'custom'
          ? []
          : p.observerMode === 'official' && modelObservers.length
            ? modelObservers
            : samples),
        ...p.customPoints,
      ];
    }
    const signature = JSON.stringify([
      observerKey,
      p.stage,
      p.equipment.map(({ name, ...e }) => e),
      p.baseline,
    ]);
    if (signature === geometrySignature) return;
    geometrySignature = signature;
    coordinator.request(
      { stage: p.stage, equipment: p.equipment, baseline: p.baseline },
      { key: String(observerKey), observers },
    );
  }
  function edit(fn, options) {
    plan = 'current';
    store.edit(fn, options);
  }
  function selected() {
    return project().equipment.find((e) => e.id === get().selectedId);
  }
  function refreshInspector() {
    renderInspector(selected(), {
      onEdit(key, value, group) {
        const id = get().selectedId;
        edit(
          (p) => {
            p.equipment.find((e) => e.id === id)[key] = value;
          },
          { group },
        );
      },
      onDelete() {
        const id = get().selectedId;
        edit((p) => {
          p.equipment = p.equipment.filter((e) => e.id !== id);
        });
      },
      onInvalid: () => toast('표시된 범위 안의 숫자를 입력해 주세요.'),
    });
  }
  function selectEquipment(id) {
    plan = 'current';
    store.setState({ selectedId: id });
    syncScene();
    exploration.showPanel('edit');
  }
  function refreshSelected() {
    const point = displayedAnalysis()?.points.find((p) => p.id === get().selectedPointId);
    $('#selected-badge').classList.toggle('hidden', !point);
    scene?.showSightlines(point || null);
    if (!point) {
      $('#point-description').textContent = '지도 위 점을 누르면 그 위치의 시야를 보여드려요.';
      return;
    }
    $('#selected-badge').textContent =
      `${observationLabel(point)} · ${point.total - point.blocked}/${point.total} 지점 보임`;
    $('#point-description').textContent =
      `눈높이 ${point.y.toFixed(2)}m · 가림 ${point.blocked}/${point.total}`;
    if (scene?.mode === 'eye') scene.setView('eye');
  }
  function selectPoint(point) {
    if (point && regionId !== 'all' && observationRegion(point, displayedStage()) !== regionId) {
      regionId = observationRegion(point, displayedStage());
      scene?.setRegion?.(regionId);
    }
    store.setState({ selectedPointId: point?.id ?? null });
    if (point) exploration.showPanel('explore');
    refreshSelected();
  }
  function refreshStage() {
    for (const [id, key] of stageInputs) $(id).value = project().stage[key];
    $('#observer-mode').value = project().observerMode;
    $('#project-name').value = project().name;
  }
  const stageInputs = [
    ['#stage-width', 'width'],
    ['#stage-depth', 'depth'],
    ['#stage-height', 'height'],
    ['#stage-z', 'z'],
    ['#stage-x', 'x'],
    ['#target-height', 'targetHeight'],
  ];
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.project !== previous.project) {
      plan = 'current';
      renderEquipment(state.project.equipment, state.selectedId, selectEquipment);
      // Keep the active input and its caret/drag gesture intact while values change.
      const inspectorActive = $('#inspector-fields')?.contains(document.activeElement);
      if (!inspectorActive || state.selectedId !== previous.selectedId) refreshInspector();
      if (state.project.stage !== previous.project.stage) refreshStage();
      scene?.setStage(state.project.stage);
      scene?.setEquipment(state.project.equipment, state.selectedId);
      storage.schedule(state.project);
      requestAnalysis();
    }
    if (state.selectedId !== previous.selectedId) {
      renderEquipment(state.project.equipment, state.selectedId, selectEquipment);
      refreshInspector();
      scene?.setEquipment(state.project.equipment, state.selectedId);
    }
    refreshResults();
  });
  renderEquipment(project().equipment, get().selectedId, selectEquipment);
  refreshInspector();
  refreshStage();
  requestAnalysis();

  bindEquipmentActions({ project, edit, store });
  bindStageActions({ project, edit, store, stageInputs, refreshSelected });
  bindProjectActions({
    project,
    edit,
    store,
    getScene: () => scene,
    refreshInspector,
    refreshStage,
  });
  $('#optimize').onclick = async () => {
    if (optimizing || !get().analysis?.count) return;
    optimizing = true;
    try {
      await coordinator.flush();
      const revision = coordinator.revision,
        p = project(),
        id = get().selectedId;
      $('#optimize').disabled = true;
      $('#optimize').textContent = '장비 위치를 비교하고 있어요';
      refreshResults();
      const best = await client.run(
        'optimize',
        { stage: p.stage, equipment: p.equipment, selectedId: id },
        { key: String(observerKey), observers },
      );
      if (revision !== coordinator.revision || id !== get().selectedId) return;
      if (best.moved) {
        edit((next) => {
          next.baseline ??= { stage: clone(next.stage), equipment: clone(next.equipment) };
          next.equipment = best.equipment;
        });
        toast('가림이 적은 위치를 적용했어요.');
      } else
        toast('지금 검토한 후보에서는 시야가 더 좋아지지 않았어요. 다른 장비도 비교해 보세요.');
    } catch (error) {
      if (error.name !== 'AbortError') toast(error.message);
    } finally {
      optimizing = false;
      $('#optimize').innerHTML = `${ico('sparkles')}위치 후보 찾기`;
      icons();
      refreshResults();
      refreshInspector();
    }
  };
  $('#cancel-analysis').onclick = () => {
    client.cancel();
    geometrySignature = '';
    requestAnalysis();
    toast('현재 배치의 분석으로 전환했어요.');
  };
  $('#sources').onclick = () => modal('자료 / 분석 기준', sourceContent(officialMeta));
  $('#report').onclick = async () => {
    try {
      await coordinator.flush();
      if (get().error) throw new Error(get().error);
      if (get().analysis)
        showReport({
          project: project(),
          result: get().analysis,
          prior: get().prior,
          scene,
          description: describe(),
          image:
            display === 'map'
              ? 'data:image/svg+xml;charset=utf-8,' +
                encodeURIComponent(
                  seatMapSVG({
                    analysis: get().analysis,
                    prior: get().prior,
                    project: project(),
                    selectedPointId: get().selectedPointId,
                    regionId,
                    plan: 'current',
                  }),
                )
              : undefined,
        });
    } catch (error) {
      toast(error.message);
    }
  };
  bindViewerActions({
    project,
    edit,
    get,
    getScene: () => scene,
    selectPoint,
    getMap: () => $('#seat-map-host svg')?.outerHTML,
    getDisplay: () => display,
    on3D: () => setDisplay('3d'),
  });
  // Load observations independently; a WebGL failure must not disable analysis.
  const dataReady = (async () => {
    try {
      const response = await fetch('/models/observation-points.json');
      if (!response.ok) throw new Error('관찰점 파일을 읽지 못했어요. 새로고침해 주세요.');
      modelObservers = parseObservations(await response.json());
      if (!disposed) requestAnalysis();
    } catch (error) {
      $('#venue-status').textContent =
        '관찰점 파일을 읽지 못해 개략 표본으로 계산해요. 새로고침하면 다시 불러와요.';
      toast(error.message);
    }
  })();
  const sceneReady = (async () => {
    try {
      const factory =
        createScene ||
        ((host, callbacks) =>
          import('../scene.js').then(({ VenueScene }) => new VenueScene(host, callbacks)));
      scene = await factory($('#canvas-host'), {
        selectEquipment,
        moveEquipment(id, x, z) {
          if (plan === 'before') return toast('현재안을 선택하면 장비를 옮길 수 있어요.');
          edit((p) => {
            Object.assign(
              p.equipment.find((e) => e.id === id),
              { x, z },
            );
          });
          refreshInspector();
        },
        selectPoint,
        addPoint(point) {
          if (project().customPoints.length >= 100)
            return toast('관찰점은 100개까지 직접 추가할 수 있어요.');
          const id = `P-${crypto.randomUUID().slice(0, 8)}`;
          edit((p) => p.customPoints.push({ ...point, id, block: '직접 지정', row: 0 }));
          store.setState({ selectedPointId: id });
        },
        modelProgress(message) {
          $('#model-progress').classList.remove('hidden');
          $('#model-progress').textContent = message;
        },
        contextStatus(message) {
          $('#render-status').textContent = message;
        },
      });
      if (disposed) {
        scene.dispose?.();
        return;
      }
      scene.setStage(project().stage);
      scene.setModelMode('schematic');
      scene.setRegion?.(regionId);
      scene.setEquipment(project().equipment, get().selectedId);
      if (get().analysis) scene.setAnalysis(get().analysis);
      officialMeta = await scene.loadOfficial();
      if (disposed || !officialMeta) return;
      $('#venue-status').textContent = '한국체육산업개발 공개 모델';
      $('#model-mode option[value="official"]').disabled = false;
      $('#model-mode option[value="official"]').textContent = '원본 건물 모델';
      $('#model-mode').value = scene.modelMode;
      $('#viewer-model-label').textContent =
        scene.modelMode === 'official' ? 'KSPO DOME / 원본 건물 모델' : 'KSPO DOME / 간단 시야도';
      $('#model-progress').classList.add('hidden');
      $('#render-status').textContent = '3D를 준비했어요';
      if (project().customModel) {
        scene.setModelMode('schematic');
        $('#model-mode').value = 'schematic';
        $('#venue-status').textContent =
          '이 모델 파일을 다시 선택해 주세요: ' + project().customModel;
      }
    } catch (error) {
      $('#model-progress').classList.add('hidden');
      $('#render-status').textContent = scene ? '간단 보기' : '3D를 다시 확인해 주세요';
      $('#venue-status').textContent = scene
        ? '원본 모델을 다시 불러오려면 새로고침해 주세요. 지금은 간단 시야도를 보여드려요.'
        : '지도와 수치 분석을 계속 사용할 수 있어요. 3D는 새로고침한 뒤 다시 확인해 주세요.';
      if (!scene)
        $('#canvas-host').innerHTML =
          '<div class="error-fallback">3D 화면을 시작하지 못했어요.<br/>지도 분석과 프로젝트 저장을 계속 사용할 수 있어요.</div>';
      console.warn('3D initialization', error);
    }
  })();
  const flushStorage = () => {
    storage.recover?.();
    return storage.flush();
  };
  window.addEventListener('pagehide', flushStorage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushStorage();
  });
  window.garimZeroDiagnostics = () => ({
    count: get().analysis?.count ?? 0,
    affected: get().analysis?.affected ?? 0,
    mean: get().analysis?.mean ?? 0,
    modelMode: scene?.modelMode,
    officialLoaded: !!scene?.officialModel,
    modelObserverCount: modelObservers.length,
    observerMode: project().observerMode,
    regionId,
    selectedPointId: get().selectedPointId,
    viewMode: scene?.mode,
    display,
    plan,
    equipment: clone(project().equipment),
    customPoints: clone(project().customPoints),
    busy: get().busy,
    engineMode,
  });
  return {
    store,
    storage,
    coordinator,
    client,
    sceneReady,
    dataReady,
    async ready() {
      await Promise.all([dataReady, sceneReady]);
      await coordinator.flush();
    },
    async dispose() {
      disposed = true;
      unsubscribe();
      exploration.dispose();
      seatMap.dispose();
      coordinator.dispose();
      scene?.dispose?.();
      window.removeEventListener('pagehide', flushStorage);
      await storage.dispose();
    },
  };
}
