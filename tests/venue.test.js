import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3 } from 'three';
import {analyze,DEFAULT_STAGE,DEFAULT_EQUIPMENT,optimizeEquipment} from '../src/analysis.js';

test('official binary loads through the real GLTFLoader and matches metadata bounds',async()=>{
  const buffer=await fs.readFile('public/models/kspo-dome.glb');
  const meta=JSON.parse(await fs.readFile('public/models/venue-meta.json','utf8'));
  const array=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
  const model=await new GLTFLoader().parseAsync(array,'');
  let meshes=0,roofs=0;model.scene.traverse(o=>{if(o.isMesh){meshes++;if(o.name.startsWith('roof_'))roofs++;assert.ok(o.geometry.attributes.position.count>0);}});
  assert.equal(meshes,meta.meshCount);assert.ok(roofs>0);
  const bounds=new Box3().setFromObject(model.scene);
  assert.ok(Math.abs(bounds.max.y-meta.bounds[1][1])<.01);
  assert.ok(bounds.max.x>60&&bounds.max.x<70);
});
test('geometry-derived observations have unique IDs and yield finite, reproducible improvement',async()=>{
  const data=JSON.parse(await fs.readFile('public/models/observation-points.json','utf8'));
  assert.equal(data.points.length,7382);assert.equal(new Set(data.points.map(p=>p.id)).size,7382);
  const points=data.points.map(p=>{assert.ok(p.position.every(Number.isFinite));return {id:p.id,x:p.position[0],y:p.position[1],z:p.position[2]};});
  const result=analyze(points,DEFAULT_STAGE,DEFAULT_EQUIPMENT);
  assert.ok(result.affected>0&&result.affected<result.count);assert.ok(Number.isFinite(result.mean));
  assert.equal(analyze(points,DEFAULT_STAGE,[]).affected,0);
  const improved=optimizeEquipment(points,DEFAULT_STAGE,DEFAULT_EQUIPMENT,'camera-1');
  assert.ok(improved.result.mean<result.mean);
});
