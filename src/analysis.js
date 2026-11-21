// Geometry is in metres, Y is up. Observer points are design samples, not ticketed seats.
export const DEFAULT_STAGE = { x: 0, z: -16, width: 18, depth: 8, height: 1.5, targetHeight: 1.5 };
export const DEFAULT_EQUIPMENT = [
  { id: 'camera-1', name: '중앙 카메라 플랫폼', type: 'camera', x: 0, z: 5, width: 4, depth: 3, height: 4.5, rotation: 0 },
  { id: 'speaker-1', name: '왼쪽 스피커 타워', type: 'speaker', x: -10, z: -10, width: 2, depth: 2, height: 7, rotation: 0 },
  { id: 'speaker-2', name: '오른쪽 스피커 타워', type: 'speaker', x: 10, z: -10, width: 2, depth: 2, height: 7, rotation: 0 },
];
export const clone = (v) => structuredClone(v);
export function createObservers() {
  const samples = [];
  for (let block = 0; block < 12; block++) {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 6; col++) {
        const angle = ((-50 + block * 25) + (col - 2.5) * 3.1) * Math.PI / 180;
        const radius = 28 + row * 2.1;
        samples.push({ id: `S${block + 1}-${row + 1}-${col + 1}`, block: block + 1, row: row + 1,
          x: Math.sin(angle) * radius, y: 2.5 + row * 1.15, z: Math.cos(angle) * radius });
      }
    }
  }
  return samples;
}
export function stageTargets(stage) {
  const targets = [];
  for (const u of [-0.4, 0, 0.4]) for (const v of [-0.3, 0, 0.3]) {
    targets.push({ x: stage.x + stage.width * u, y: stage.height + stage.targetHeight, z: stage.z + stage.depth * v });
  }
  return targets;
}
// Slab intersection for a finite line segment and a Y-axis oriented box.
export function segmentHitsBox(from, to, box) {
  const theta = -(box.rotation || 0) * Math.PI / 180;
  const c = Math.cos(theta), s = Math.sin(theta);
  const local = p => ({ x: c*(p.x-box.x)-s*(p.z-box.z), y:p.y, z:s*(p.x-box.x)+c*(p.z-box.z) });
  const a = local(from), b = local(to);
  const min = {x:-box.width/2, y:0, z:-box.depth/2};
  const max = {x:box.width/2, y:box.height, z:box.depth/2};
  let near = 0.00001, far = 0.99999;
  for (const axis of ['x','y','z']) {
    const d = b[axis]-a[axis];
    if (Math.abs(d) < 1e-10) { if (a[axis]<min[axis] || a[axis]>max[axis]) return false; }
    else { let t1=(min[axis]-a[axis])/d, t2=(max[axis]-a[axis])/d;
      if(t1>t2) [t1,t2]=[t2,t1]; near=Math.max(near,t1); far=Math.min(far,t2); if(near>far) return false; }
  }
  return true;
}
export function analyze(observers, stage, equipment) {
  const targets = stageTargets(stage);
  const points = observers.map(point => {
    let blocked=0; const causes=new Set();
    for (const target of targets) {
      let hit=false;
      for(const box of equipment) if(segmentHitsBox(point,target,box)) { hit=true; causes.add(box.id); }
      if(hit) blocked++;
    }
    return {...point, blocked, total:targets.length, ratio:blocked/targets.length, causes:[...causes]};
  });
  return {points, count:points.length, affected:points.filter(p=>p.blocked>0).length,
    severe:points.filter(p=>p.ratio>=0.5).length,
    mean:points.reduce((s,p)=>s+p.ratio,0)/(points.length||1), targets};
}
export function optimizeEquipment(observers, stage, equipment, selectedId) {
  const current=analyze(observers,stage,equipment);
  let best={equipment:clone(equipment),result:current,moved:false};
  const selected=equipment.find(e=>e.id===selectedId); if(!selected) return best;
  for(const dx of [-12,-8,-4,0,4,8,12]) for(const dz of [-4,0,4]) {
    const candidate=clone(equipment), box=candidate.find(e=>e.id===selectedId);
    box.x=Math.max(-23,Math.min(23,selected.x+dx)); box.z=Math.max(-12,Math.min(20,selected.z+dz));
    const overlaps=(a,b)=> Math.abs(a.x-b.x)<(a.width+b.width)/2+0.5 && Math.abs(a.z-b.z)<(a.depth+b.depth)/2+0.5;
    if(overlaps(box,stage) || candidate.some(b=>b.id!==box.id&&overlaps(box,b))) continue;
    const result=analyze(observers,stage,candidate);
    if(result.mean<best.result.mean-1e-8) best={equipment:candidate,result,moved:true};
  }
  return best;
}
export function validateProject(value) {
  if(!value || value.version!==1 || !value.stage || !Array.isArray(value.equipment) || value.equipment.length>30) throw new Error('가림제로 프로젝트 JSON 파일을 선택해주세요.');
  const inRange=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  for (const key of ['x','z']) if(!inRange(value.stage[key],-50,50)) throw new Error('무대 좌표가 허용 범위를 벗어났습니다.');
  for (const key of ['width','depth']) if(!inRange(value.stage[key],1,50)) throw new Error('무대 크기가 올바르지 않습니다.');
  for (const key of ['height','targetHeight']) if(!inRange(value.stage[key],0,10)) throw new Error('무대 높이가 올바르지 않습니다.');
  const ids=new Set();
  for (const e of value.equipment) {
    if(typeof e.id!=='string'||ids.has(e.id)||typeof e.name!=='string'||e.name.length>80||!['camera','speaker','console','screen'].includes(e.type)) throw new Error('장비 형식이 올바르지 않습니다.');
    ids.add(e.id);
    for(const k of ['x','z']) if(!inRange(e[k],-50,50)) throw new Error('장비 위치가 올바르지 않습니다.');
    for(const k of ['width','height','depth']) if(!inRange(e[k],0.3,20)) throw new Error('장비 크기가 올바르지 않습니다.');
    if(!inRange(e.rotation,-180,180)) throw new Error('장비 회전값이 올바르지 않습니다.');
  }
  return {version:1,stage:clone(value.stage),equipment:clone(value.equipment)};
}
