import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { Window } from 'happy-dom';

test('application flow: official observations, equipment edits, undo, comparison and report',async()=>{
  const {outputFiles}=await build({entryPoints:['src/main.js'],bundle:true,write:false,format:'iife',loader:{'.css':'empty'},plugins:[{
    name:'dom-renderer-test-double',setup(b){b.onLoad({filter:/[\\/]src[\\/]scene\.js$/},()=>({contents:`export class VenueScene {
      constructor(host,callbacks){this.callbacks=callbacks;this.mode='orbit';this.modelMode='schematic';this.officialModel={};this.showHeat=true;}
      setStage(){} setEquipment(){} setAnalysis(){} showSightlines(){} setAddPoint(){}
      setView(mode){this.mode=mode;} setModelMode(mode){this.modelMode=mode;}
      async loadOfficial(){this.modelMode='official';return {name:'KSPO DOME'};}
      capture(){return 'data:image/png;base64,iVBORw0KGgo=';}
    }`,loader:'js'}));}
  }]});
  const window=new Window({url:'http://localhost:5173'});
  window.document.body.innerHTML='<div id="app"></div>';
  const data=JSON.parse(await fs.readFile('public/models/observation-points.json','utf8'));
  window.fetch=async()=>({ok:true,json:async()=>data});
  window.structuredClone=structuredClone;
  window.eval(outputFiles[0].text);
  await new Promise(r=>setTimeout(r,30));
  const $=s=>window.document.querySelector(s);
  const change=(s,v)=>{const el=$(s);el.value=v;el.dispatchEvent(new window.Event('change',{bubbles:true}));};
  const diagnostic=()=>window.garimZeroDiagnostics();
  assert.equal(diagnostic().count,7382);
  assert.equal(diagnostic().modelObserverCount,7382);
  assert.equal($('#observer-mode').value,'official');
  const before=diagnostic().mean;
  change('#eq-height','0.3');
  assert.ok(diagnostic().mean<=before);
  $('#undo').click();
  assert.equal(diagnostic().equipment[0].height,4.5);
  $('#save-baseline').click();
  assert.ok($('#comparison').classList.contains('visible'));
  change('#eq-x','12');
  assert.match($('#compare-note').textContent,/7382/);
  $('#add-equipment').click();
  $('[data-add="screen"]').click();
  assert.equal(diagnostic().equipment.length,4);
  assert.equal(diagnostic().equipment.at(-1).type,'screen');
  change('#eq-width','999');
  assert.equal(diagnostic().equipment.at(-1).width,8);
  change('#eq-name','<img src=x onerror=alert(1)>');
  assert.equal($('#equipment-list img'),null);
  $('#report').click();
  assert.ok($('#print-report').open);
  assert.match($('#print-report').textContent,/7,382/);
  assert.match($('#print-report').textContent,/공식 좌석|좌석번호/);
  assert.equal($('#print-report img[src="x"]'),null);
  $('#close-modal').click();
  change('#observer-mode','custom');
  assert.equal(diagnostic().count,0);
  assert.equal($('#metric-visible').textContent,'—');
  $('#eye-view').click();
  assert.match($('#toast').textContent,/관찰점/);
  const saved=JSON.parse(window.localStorage.getItem('garim-zero-v1'));
  assert.equal(saved.equipment.length,4);
  assert.equal(saved.observerMode,'custom');
  await window.happyDOM.abort();
});
