import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { createAnalysisEngine } from '../src/services/analysis-engine.js';

test('application flow: official observations, equipment edits, undo, comparison and report', async () => {
  const { outputFiles } = await build({
    entryPoints: ['src/app/application.js'],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'GarimModules',
    define: { 'import.meta.url': '"http://localhost:5173/test-entry.js"' },
    loader: { '.css': 'empty' },
    plugins: [
      {
        name: 'dom-renderer-test-double',
        setup(b) {
          b.onLoad({ filter: /[\\/]src[\\/]scene\.js$/ }, () => ({
            contents: `export class VenueScene {
      constructor(host,callbacks){this.callbacks=callbacks;this.mode='orbit';this.modelMode='schematic';this.officialModel={};this.showHeat=true;}
      setStage(){} setEquipment(){} setAnalysis(){} showSightlines(){} setAddPoint(){}
      setView(mode){this.mode=mode;} setModelMode(mode){this.modelMode=mode;}
      async loadOfficial(){this.modelMode='official';return {name:'KSPO DOME'};}
      capture(){return 'data:image/png;base64,iVBORw0KGgo=';}
    }`,
            loader: 'js',
          }));
        },
      },
    ],
  });
  const window = new Window({ url: 'http://localhost:5173' });
  window.document.body.innerHTML = '<div id="app"></div>';
  const data = JSON.parse(await fs.readFile('public/models/observation-points.json', 'utf8'));
  window.fetch = async () => ({ ok: true, json: async () => data });
  window.structuredClone = structuredClone;
  window.eval(outputFiles[0].text);
  const engine = createAnalysisEngine();
  let key;
  const app = await window.GarimModules.createApplication({
    analysisClient: {
      cancel: () => engine.cancel(),
      dispose() {
        engine.cancel();
      },
      async run(method, input, observations) {
        if (key !== observations.key) {
          engine.setObservers(observations.key, observations.observers);
          key = observations.key;
        }
        return engine[method](input);
      },
    },
    createScene: async () => ({
      mode: 'orbit',
      modelMode: 'official',
      officialModel: {},
      showHeat: true,
      setStage() {},
      setEquipment() {},
      setAnalysis() {},
      showSightlines() {},
      setAddPoint() {},
      setView(mode) {
        this.mode = mode;
      },
      setModelMode(mode) {
        this.modelMode = mode;
      },
      async loadOfficial() {
        return { name: 'KSPO DOME' };
      },
      capture() {
        return 'data:image/png;base64,iVBORw0KGgo=';
      },
    }),
  });
  await app.ready();
  const $ = (s) => window.document.querySelector(s);
  const change = (s, v) => {
    const el = $(s);
    el.value = v;
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const diagnostic = () => window.garimZeroDiagnostics();
  assert.equal(diagnostic().count, 7382);
  assert.equal(diagnostic().modelObserverCount, 7382);
  assert.equal($('#observer-mode').value, 'official');
  assert.equal(diagnostic().display, 'map');
  assert.ok($('#seat-map-host svg'));
  assert.equal($('#canvas-host').classList.contains('hidden'), true);
  $('[data-plan="before"]').click();
  assert.equal(diagnostic().plan, 'before');
  assert.match($('#metric-affected').textContent, /3,072/);
  $('[data-plan="current"]').click();
  assert.match($('#metric-affected').textContent, /2,120/);
  $('[data-plan="changes"]').click();
  assert.match($('#map-legend').textContent, /가림 감소/);
  $('[data-pick-point]').click();
  assert.ok(diagnostic().selectedPointId);
  assert.match($('#point-current').textContent, /\/ 9/);
  $('[data-plan="current"]').click();
  assert.equal($('#panel-explore').hidden, false);
  $('[data-region="left"]').click();
  assert.equal(diagnostic().regionId, 'left');
  assert.equal(diagnostic().count, 7382, 'region exploration preserves the global analysis');
  assert.match($('#region-count').textContent, /1,974/);
  $('#region-enter').click();
  assert.ok(diagnostic().selectedPointId);
  assert.equal(diagnostic().viewMode, 'eye');
  assert.equal(diagnostic().display, '3d');
  $('#tab-edit').click();
  assert.equal($('#panel-explore').hidden, true);
  assert.equal($('#panel-edit').hidden, false);
  $('#tab-edit').dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
  );
  assert.equal($('#panel-explore').hidden, false);
  $('[data-region="all"]').click();
  $('#tab-edit').click();
  const before = diagnostic().mean;
  change('#eq-height', '0.3');
  await app.coordinator.flush();
  assert.ok(diagnostic().mean <= before);
  $('#undo').click();
  assert.equal(diagnostic().equipment[0].height, 4.5);
  $('#save-baseline').click();
  await app.coordinator.flush();
  assert.ok($('#comparison').classList.contains('visible'));
  change('#eq-x', '12');
  await app.coordinator.flush();
  assert.match($('#compare-note').textContent, /7382/);
  $('#add-equipment').click();
  $('[data-add="screen"]').click();
  assert.equal(diagnostic().equipment.length, 4);
  assert.equal(diagnostic().equipment.at(-1).type, 'screen');
  const rotation = $('#eq-rotation');
  rotation.focus();
  rotation.value = '35';
  rotation.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal($('#eq-rotation'), rotation, 'active input survives background updates');
  await app.coordinator.flush();
  assert.equal($('#eq-rotation'), rotation);
  rotation.blur();
  change('#eq-width', '999');
  assert.equal(diagnostic().equipment.at(-1).width, 8);
  change('#eq-name', '<img src=x onerror=alert(1)>');
  assert.equal($('#equipment-list img'), null);
  await app.coordinator.flush();
  $('#report').click();
  await new Promise((r) => setTimeout(r, 0));
  assert.ok($('#print-report').open);
  assert.match($('#print-report').textContent, /7,382/);
  assert.match($('#print-report').textContent, /공식 좌석|좌석번호/);
  assert.equal($('#print-report img[src="x"]'), null);
  $('#close-modal').click();
  change('#observer-mode', 'custom');
  await app.coordinator.flush();
  assert.equal(diagnostic().count, 0);
  assert.equal($('#region-enter').disabled, true);
  assert.equal($('#metric-visible').textContent, '—');
  $('#eye-view').click();
  assert.match($('#toast').textContent, /관찰점/);
  await app.storage.flush();
  const saved = JSON.parse(window.localStorage.getItem('garim-zero-v1'));
  assert.equal(saved.equipment.length, 4);
  assert.equal(saved.observerMode, 'custom');
  await app.dispose();
  await window.happyDOM.abort();
});
