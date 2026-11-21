import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

export class VenueScene {
  constructor(host, callbacks) {
    this.host=host; this.callbacks=callbacks; this.mode='orbit'; this.modelMode='schematic'; this.showHeat=true; this.showRoof=false;
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color('#14231e'); this.scene.fog=new THREE.Fog('#14231e',110,300);
    this.camera=new THREE.PerspectiveCamera(43,1,0.05,900); this.camera.position.set(70,65,82);
    this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.35;
    host.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement); this.controls.target.set(0,3,0); this.controls.enableDamping=true; this.controls.maxPolarAngle=Math.PI*.49; this.controls.minDistance=3;this.controls.maxDistance=230;
    this.scene.add(new THREE.HemisphereLight(0xe9f3dc,0x233a2c,2.5));
    const light=new THREE.DirectionalLight(0xf4f9df,3); light.position.set(40,80,30); this.scene.add(light);
    const fill=new THREE.DirectionalLight(0xa5cbbb,1);fill.position.set(-40,20,-20);this.scene.add(fill);
    this.floor=new THREE.Mesh(new THREE.PlaneGeometry(350,350),new THREE.MeshStandardMaterial({color:0x182c23,roughness:1}));this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-.3;this.scene.add(this.floor);
    const grid=new THREE.GridHelper(240,80,0x304637,0x243a2d);grid.position.y=-.25;this.scene.add(grid);
    this.schematic=new THREE.Group(); this.scene.add(this.schematic); this.createBowl();
    this.equipmentGroup=new THREE.Group();this.scene.add(this.equipmentGroup);
    this.stageGroup=new THREE.Group();this.scene.add(this.stageGroup);
    this.linesGroup=new THREE.Group();this.scene.add(this.linesGroup);
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.renderer.domElement.addEventListener('pointerdown',e=>this.onDown(e),true);
    this.renderer.domElement.addEventListener('pointermove',e=>this.onMove(e),true);
    this.renderer.domElement.addEventListener('pointerup',e=>this.onUp(e),true);
    this.renderer.domElement.addEventListener('pointercancel',()=>{this.drag=null;this.controls.enabled=true;});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
    this.renderer.setAnimationLoop(()=>{this.controls.update();this.renderer.render(this.scene,this.camera);});
  }
  clear(group) { while(group.children.length){const obj=group.children[0];group.remove(obj);obj.traverse(o=>{o.geometry?.dispose();if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});} }
  createBowl(){
    // This diagram is an explicitly labelled design aid, not a surveyed venue model.
    for(let level=0;level<9;level++){
      const radius=27+level*2.05;
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius+1.7,radius+1.7,.7,96,1,true),new THREE.MeshStandardMaterial({color:0x3a4e36,side:THREE.DoubleSide,roughness:1}));
      mesh.position.y=1.1+level*1.15;this.schematic.add(mesh);
      const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+1.85,96),new THREE.MeshStandardMaterial({color:level%2?0x35492f:0x30432c,side:THREE.DoubleSide,roughness:1}));
      ring.rotation.x=-Math.PI/2;ring.position.y=1.45+level*1.15;this.schematic.add(ring);
    }
    const court=new THREE.Mesh(new THREE.PlaneGeometry(45,48),new THREE.MeshStandardMaterial({color:0x253b2c,roughness:1}));court.rotation.x=-Math.PI/2;court.position.y=.01;this.schematic.add(court);
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(44,.02,47)),new THREE.LineBasicMaterial({color:0x536549}));this.schematic.add(outline);
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6;
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Math.sin(angle)*28,1.6,Math.cos(angle)*28),new THREE.Vector3(Math.sin(angle)*46,12,Math.cos(angle)*46)]),new THREE.LineBasicMaterial({color:0x71835d,transparent:true,opacity:.45}));this.schematic.add(line);
    }
  }
  setStage(stage){
    this.stage=stage;this.clear(this.stageGroup);
    const deck=new THREE.Mesh(new THREE.BoxGeometry(stage.width,Math.max(.1,stage.height),stage.depth),new THREE.MeshStandardMaterial({color:0xc6d9a4,roughness:.65}));
    deck.position.set(stage.x,stage.height/2,stage.z);this.stageGroup.add(deck);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(deck.geometry),new THREE.LineBasicMaterial({color:0xe2f6b7}));edge.position.copy(deck.position);this.stageGroup.add(edge);
    const marker=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,1.35,12),new THREE.MeshStandardMaterial({color:0xf6ffe5}));marker.position.set(stage.x,stage.height+.675,stage.z);this.stageGroup.add(marker);
  }
  setEquipment(equipment,selectedId){
    this.equipment=equipment;this.selectedId=selectedId;this.clear(this.equipmentGroup);this.pickEquipment=[];
    for(const e of equipment){
      const group=new THREE.Group();group.position.set(e.x,0,e.z);group.rotation.y=-(e.rotation||0)*Math.PI/180;group.userData.id=e.id;
      const mat=new THREE.MeshStandardMaterial({color:e.id===selectedId?0xe5be73:0x839571,roughness:.55,metalness:.12});
      const body=new THREE.Mesh(new THREE.BoxGeometry(e.width,e.height,e.depth),mat);body.position.y=e.height/2;body.userData.id=e.id;group.add(body);this.pickEquipment.push(body);
      const edges=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color:e.id===selectedId?0xffe3a2:0xc0cfad}));edges.position.copy(body.position);group.add(edges);
      if(e.type==='camera'){
        const head=new THREE.Mesh(new THREE.BoxGeometry(Math.min(1,e.width*.4),.55,.8),new THREE.MeshStandardMaterial({color:0x253628}));head.position.set(0,e.height+.275,0);group.add(head);
      }else if(e.type==='speaker'){
        const face=new THREE.Mesh(new THREE.PlaneGeometry(e.width*.75,e.height*.8),new THREE.MeshStandardMaterial({color:0x243726,side:THREE.DoubleSide}));face.position.set(0,e.height/2,e.depth/2+.01);group.add(face);
      }
      this.equipmentGroup.add(group);
    }
    this.scene.updateMatrixWorld(true);
  }
  setAnalysis(result){
    this.result=result;
    if(this.samples){this.scene.remove(this.samples);this.samples.geometry.dispose();this.samples.material.dispose();}
    const geometry=new THREE.BoxGeometry(.42,.16,.42), material=new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false});
    this.samples=new THREE.InstancedMesh(geometry,material,result.points.length);
    const matrix=new THREE.Matrix4();
    this.samples.renderOrder=3;
    result.points.forEach((p,i)=>{matrix.makeTranslation(p.x,p.y-.35,p.z);this.samples.setMatrixAt(i,matrix);this.samples.setColorAt(i,new THREE.Color(this.showHeat?(p.ratio>=.5?'#ee8a72':p.ratio>0?'#f5c37b':'#a9cb7f'):'#8ea783'));});
    this.samples.instanceMatrix.needsUpdate=true;if(this.samples.instanceColor)this.samples.instanceColor.needsUpdate=true;this.scene.add(this.samples);
    if(this.selectedPoint){const p=result.points.find(x=>x.id===this.selectedPoint.id);if(p)this.showSightlines(p);}
  }
  showSightlines(point){
    this.selectedPoint=point;this.clear(this.linesGroup);if(!point||!this.result)return;
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(.42,12,8),new THREE.MeshBasicMaterial({color:0xeaffbc}));sphere.position.set(point.x,point.y,point.z);this.linesGroup.add(sphere);
    for(const target of this.result.targets){
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(point.x,point.y,point.z),new THREE.Vector3(target.x,target.y,target.z)]),new THREE.LineBasicMaterial({color:0xd9f99d,transparent:true,opacity:.6}));this.linesGroup.add(line);
    }
  }
  setView(mode){
    this.mode=mode;
    const span=this.modelMode==='official'?140:100;
    const distance=span/(2*Math.tan(this.camera.fov*Math.PI/360))/Math.min(1,this.camera.aspect)*1.08;
    if(mode==='eye'&&this.selectedPoint){const p=this.selectedPoint;this.camera.position.set(p.x,p.y,p.z);this.controls.target.set(this.stage.x,this.stage.height+this.stage.targetHeight,this.stage.z);this.controls.minDistance=.1;}
    else if(mode==='top'){this.camera.position.set(0,distance,0.01);this.controls.target.set(0,0,0);this.controls.minDistance=3;}
    else{this.camera.position.copy(new THREE.Vector3(1,.9,1.15).normalize().multiplyScalar(distance));this.controls.target.set(0,3,0);this.controls.minDistance=3;}
    this.controls.update();
  }
  setPointer(event){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set(((event.clientX-r.left)/r.width)*2-1,-((event.clientY-r.top)/r.height)*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);}
  groundAt(event){this.setPointer(event);return this.raycaster.ray.intersectPlane(this.ground,new THREE.Vector3());}
  onDown(e){
    if(e.button!==0)return;this.down={x:e.clientX,y:e.clientY};this.setPointer(e);
    if(this.addPointMode)return;
    const hit=this.raycaster.intersectObjects(this.pickEquipment||[],false)[0];
    if(hit&&this.mode!=='eye'){
      const id=hit.object.userData.id, position=this.groundAt(e), entry=this.equipment.find(x=>x.id===id);
      if(!position||!entry)return;this.drag={id,offsetX:entry.x-position.x,offsetZ:entry.z-position.z,startX:entry.x,startZ:entry.z,moved:false};
      this.controls.enabled=false;this.renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();e.preventDefault();this.callbacks.selectEquipment(id);
    }
  }
  onMove(e){
    if(!this.drag)return;const point=this.groundAt(e);if(!point)return;
    this.drag.x=Math.round(Math.max(-45,Math.min(45,point.x+this.drag.offsetX))*10)/10;
    this.drag.z=Math.round(Math.max(-45,Math.min(45,point.z+this.drag.offsetZ))*10)/10;
    this.drag.moved=Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>3;
    const obj=this.equipmentGroup.children.find(c=>c.userData.id===this.drag.id);if(obj)obj.position.set(this.drag.x,0,this.drag.z);
    e.stopImmediatePropagation();
  }
  onUp(e){
    if(this.drag){const d=this.drag;this.drag=null;this.controls.enabled=true;try{this.renderer.domElement.releasePointerCapture(e.pointerId);}catch{}
      if(d.moved)this.callbacks.moveEquipment(d.id,d.x,d.z);e.stopImmediatePropagation();return;}
    if(!this.down||Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>5)return;
    this.setPointer(e);
    if(this.addPointMode){
      let point=null;
      if(this.modelMode==='official'&&this.officialModel){const hits=this.raycaster.intersectObject(this.officialModel,true).filter(h=>h.object.visible&&h.point.y<20);point=hits[0]?.point;}
      else{point=this.groundAt(e);}
      if(point)this.callbacks.addPoint({x:point.x,y:point.y+1.15,z:point.z,source:this.modelMode==='official'?'official-surface':'manual'});
      return;
    }
    const hit=this.samples?this.raycaster.intersectObject(this.samples,false)[0]:null;
    if(hit&&hit.instanceId!==undefined){this.callbacks.selectPoint(this.result.points[hit.instanceId]);return;}
  }
  setAddPoint(enabled){this.addPointMode=enabled;this.renderer.domElement.style.cursor=enabled?'crosshair':'grab';}
  setModelMode(mode){this.modelMode=mode;this.schematic.visible=mode==='schematic';if(this.officialModel)this.officialModel.visible=mode==='official';}
  applyModel(object,meta={}){
    if(this.officialModel){this.scene.remove(this.officialModel);this.clear(this.officialModel);}
    this.officialModel=object;this.officialModel.name='official-venue';
    object.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshStandardMaterial({color:0x6e8069,roughness:.95,side:THREE.DoubleSide,transparent:true,opacity:.24,depthWrite:false});if(o.name.toLowerCase().includes('roof'))o.visible=this.showRoof;}});
    this.scene.add(object);this.setModelMode('official');this.meta=meta;this.setView('orbit');
  }
  async loadOfficial(){
    const metaResponse=await fetch('/models/venue-meta.json');if(!metaResponse.ok)throw new Error('공식 모델 메타데이터를 불러오지 못했습니다.');
    const meta=await metaResponse.json();this.callbacks.modelProgress('공식 모델을 불러오는 중…');
    const model=await new GLTFLoader().loadAsync(meta.modelUrl||'/models/kspo-dome.glb',e=>{if(e.total)this.callbacks.modelProgress(`공식 모델 ${Math.round(e.loaded/e.total*100)}%`);});
    this.applyModel(model.scene,meta);return meta;
  }
  async loadUserFile(file){
    let model;
    if(/\.dae$/i.test(file.name)){const data=await file.text();model=new ColladaLoader().parse(data,'').scene;}
    else{const buffer=await file.arrayBuffer();model=(await new GLTFLoader().parseAsync(buffer,'')).scene;}
    const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());
    model.position.x-=center.x;model.position.z-=center.z;model.position.y-=bounds.min.y;
    this.applyModel(model,{name:file.name,custom:true});
  }
  toggleRoof(){this.showRoof=!this.showRoof;this.officialModel?.traverse(o=>{if(o.isMesh&&o.name.toLowerCase().includes('roof'))o.visible=this.showRoof;});return this.showRoof;}
  capture(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
}
