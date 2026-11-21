"""Finalize a raw GLB from convert-venue.py: centre arena, remove remote markers.
Run exactly once after conversion; writes final geometry and provenance metadata.
"""
from pathlib import Path
import json, hashlib
import numpy as np
import trimesh
ROOT=Path(__file__).resolve().parents[1]
dest=ROOT/'public'/'models';glb=dest/'kspo-dome.glb'
scene=trimesh.load(glb,force='scene')
offset=scene.geometry['roof_ID178511'].bounds.mean(0);offset[1]=0
for name,m in list(scene.geometry.items()):
    m.apply_translation(-offset)
    centres=m.triangles_center
    keep=(np.linalg.norm(centres[:,[0,2]],axis=1)<80)&(centres[:,1]>-0.25)
    m.update_faces(keep);m.remove_unreferenced_vertices()
    if len(m.faces)==0: scene.delete_geometry(name)
glb.write_bytes(scene.export(file_type='glb'))
pointsfile=dest/'observation-points.json'
data=json.loads(pointsfile.read_text(encoding='utf8'))
for p in data['points']:
    p['position']=np.round(np.array(p['position'])-offset,4).tolist()
data['rawComponentCount']=len(data['points'])
unique={}
for p in data['points']:
    key=tuple(p['position'])
    if key not in unique: unique[key]=p
data['points']=list(unique.values())
for i,p in enumerate(data['points']): p['id']=f'G{i+1:05d}'
data['count']=len(data['points'])
data['normalizationOffset']=offset.tolist()
pointsfile.write_text(json.dumps(data,ensure_ascii=False),encoding='utf8')
inspection=json.loads((ROOT/'assets-source'/'venue-inspection.json').read_text())
b=np.array(inspection['sourceBoundsInches'])*0.0254
cx=float(b[:,0].mean()+offset[0]);cy=float(b[:,1].mean()-offset[2])
meta={
 'name':'KSPO DOME',
 'source':'한국체육산업개발주식회사_올림픽공원 공연장 실감형 콘텐츠',
 'sourceUrl':'https://www.ksponco.or.kr/attachFiles/download/kspo/kspodome_dae.zip',
 'catalogUrl':'https://www.data.go.kr/data/15127487/fileData.do',
 'facilityUrl':'https://www.ksponco.or.kr/menu.es?mid=a10405050100',
 'license':'공공데이터포털 표시: 이용허락범위 제한 없음',
 'sourceSha256':hashlib.sha256((ROOT/'assets-source'/'kspodome_dae.zip').read_bytes()).hexdigest(),
 'sourceBytes':58775583,'sourceDaeBytes':475561443,
 'sourceUnits':'inch','sourceUp':'Z_UP','units':'metres','upAxis':'Y',
 'transform':{'formula':'[x*0.0254-centerX, z*0.0254, -y*0.0254+centerY]','centerX':cx,'centerY':cy,'floorOffset':0},
 'arenaCenter':[0,0,0],'bounds':scene.bounds.tolist(),'meshCount':len(scene.geometry),
 'triangles':sum(len(m.faces) for m in scene.geometry.values()),'bytes':glb.stat().st_size,
 'roofPrefix':'roof_','bowlPrefix':'bowl_',
 'observationPoints':{'file':'observation-points.json','count':data['count'],'method':data['method']},
 'seatMapping':'No official seat identifiers were found. Generic SketchUp node names are not seat numbers.',
 'processing':['inch to metre','Z-up to Y-up','centre on roof-envelope horizontal bounds','18% decimation for large material groups','remove triangles with centroid below -0.25m or beyond 80m radius','neutral visualization colours; textures omitted'],
 'precision':'Geometry-derived planning reference. Not surveyed or certified as-built geometry. The original contains lower tiered seating modules and upper tier seating. The public-model layout may differ from current event arrangements.',
 'meshes':[{'name':k,'triangles':len(m.faces),'bounds':m.bounds.tolist()} for k,m in scene.geometry.items()]}
(dest/'venue-meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:meta[k] for k in ['bounds','triangles','bytes','transform','meshCount']},ensure_ascii=False),flush=True)
