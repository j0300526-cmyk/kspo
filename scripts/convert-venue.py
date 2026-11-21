"""Convert the official KSPO Collada mesh to a compact GLB in metres.

Requires numpy, lxml, trimesh, fast-simplification. No network calls during conversion.
XML external entities, DTD loading and networking are disabled.
"""
from pathlib import Path
from collections import Counter, defaultdict
import json, hashlib, time, sys
import numpy as np
from lxml import etree as E

ROOT = Path(__file__).resolve().parents[1]
source = next((ROOT / 'assets-source').rglob('*.dae'))
NS = {'c':'http://www.collada.org/2005/11/COLLADASchema'}
def el(node,path): return node.find(path,NS)
def els(node,path): return node.findall(path,NS)
print('Parsing official Collada',flush=True)
tree=E.parse(str(source),E.XMLParser(resolve_entities=False,no_network=True,load_dtd=False,huge_tree=True))
root=tree.getroot()
geoms={}
for i,g in enumerate(els(root,'.//c:geometry')):
    mesh=el(g,'c:mesh'); vertex=el(mesh,'c:vertices/c:input[@semantic="POSITION"]')
    if vertex is None: continue
    sid=vertex.get('source')[1:]
    src=el(mesh,f'c:source[@id="{sid}"]')
    positions=np.fromstring(el(src,'c:float_array').text,sep=' ',dtype=np.float32).reshape(-1,3)
    parts=[]
    for tri in els(mesh,'c:triangles'):
        inputs=els(tri,'c:input'); stride=max(int(t.get('offset','0')) for t in inputs)+1
        offset=next(int(t.get('offset','0')) for t in inputs if t.get('semantic')=='VERTEX')
        idx=np.fromstring(el(tri,'c:p').text or '',sep=' ',dtype=np.int32).reshape(-1,stride)[:,offset].reshape(-1,3)
        parts.append((tri.get('material'),idx))
    geoms[g.get('id')]=(positions,parts)
    if i%20000==0: print('geometries',i,flush=True)
print('geometry loaded',len(geoms),flush=True)
chunks=defaultdict(list); frequent=defaultdict(list); inst=[]; observations=[]
def traverse(node,parent,path):
    matrix=el(node,'c:matrix'); m=parent @ (np.fromstring(matrix.text,sep=' ').reshape(4,4) if matrix is not None else np.eye(4))
    name=node.get('name',''); path=path+[name]; points=[]
    for instance in els(node,'c:instance_geometry'):
        gid=instance.get('url')[1:]
        if gid not in geoms: continue
        pos,parts=geoms[gid]
        world=(pos @ m[:3,:3].T+m[:3,3]).astype(np.float32)
        points.append(np.array([world.min(0),world.max(0)]))
        bindings={x.get('symbol'):x.get('target')[1:] for x in els(instance,'.//c:instance_material')}
        for symbol,faces in parts:
            chunks[bindings.get(symbol,'default')].append((world,faces))
    for child in els(node,'c:node'):
        box=traverse(child,m,path)
        if box is not None: points.append(box)
    if not points: return None
    points=np.concatenate(points); box=np.array([points.min(0),points.max(0)])
    if len(frequent[name])<3: frequent[name].append((box.tolist(),path[-4:]))
    if name in ('instance_10459','instance_10466','instance_10298'): inst.append({'name':name,'box':box.tolist()})
    if name in ('group_84','group_86','group_90','group_92','group_94','group_98'):
        observations.append({'sourceNode':node.get('id'),'component':name,'box':box.tolist()})
    return box
scene=el(root,'c:library_visual_scenes/c:visual_scene')
bounds=[]
for n in els(scene,'c:node'):
    box=traverse(n,np.eye(4),[])
    if box is not None: bounds.append(box)
bounds=np.concatenate(bounds); bounds=np.array([bounds.min(0),bounds.max(0)])
print('bounds inches',bounds.tolist(),flush=True)
counts=Counter(n.get('name','') for n in els(root,'.//c:node'))
print('frequent node bounding boxes',json.dumps({k:frequent[k] for k,n in counts.most_common(16)}),flush=True)
print('total triangles',sum(len(f) for c in chunks.values() for _,f in c),flush=True)
with (ROOT/'assets-source'/'venue-inspection.json').open('w',encoding='utf8') as f:
    json.dump({'sourceBoundsInches':bounds.tolist(),'frequentNodes':{k:frequent[k] for k,n in counts.most_common(20)},'candidateInstances':inst},f)

# Convert (X,Y,Z) inches to (X,Z,-Y) metres and centre horizontally.
allworld=bounds*0.0254
cx=float((allworld[0,0]+allworld[1,0])/2); cy=float((allworld[0,1]+allworld[1,1])/2)
floor=0.0
def convert(p):
    return np.column_stack([p[:,0]*0.0254-cx,p[:,2]*0.0254-floor,-p[:,1]*0.0254+cy]).astype(np.float32)

dest=ROOT/'public'/'models';dest.mkdir(parents=True,exist_ok=True)
eye_points=[]
for i,o in enumerate(observations):
    b=np.array(o['box']); centre=b.mean(0)
    # A seated-eye estimate is above each repeated chair-back component.
    point=convert(np.array([centre]))[0];point[1]=b[1,2]*0.0254+0.30
    eye_points.append({'id':f'G{i+1:05d}','sourceNode':o['sourceNode'],'sourceComponent':o['component'],'position':np.round(point,4).tolist()})
(dest/'observation-points.json').write_text(json.dumps({'method':'Repeated chair-back mesh bounding-box centres; eye height = component top + 0.30 m. These are geometry-derived observation samples, not official seat identifiers or surveyed eye positions.','count':len(eye_points),'points':eye_points},ensure_ascii=False),encoding='utf8')
print('observation points',len(eye_points),flush=True)
if '--points-only' in sys.argv: sys.exit(0)

import trimesh
out=trimesh.Scene(); summary=[]
for mat,items in chunks.items():
    positions=[]; faces=[]; offset=0
    for v,f in items:
        positions.append(convert(v)); faces.append(f+offset); offset+=len(v)
    v=np.concatenate(positions); f=np.concatenate(faces)
    # Separate upper envelope for a removable roof. Triangles above 19 m are visual context only.
    roof_mask=np.mean(v[f,1],axis=1)>19
    for category,mask in [('bowl',~roof_mask),('roof',roof_mask)]:
        ff=f[mask]
        if not len(ff): continue
        m=trimesh.Trimesh(vertices=v,faces=ff,process=True)
        target=max(100,int(len(m.faces)*0.18)) if len(m.faces)>1500 else len(m.faces)
        if target<len(m.faces):
            try: m=m.simplify_quadric_decimation(face_count=target)
            except Exception as exc: print('decimation skipped',str(exc),flush=True)
        m.remove_unreferenced_vertices()
        color=[142,155,170,255] if category=='bowl' else [90,105,125,255]
        m.visual=trimesh.visual.ColorVisuals(mesh=m,face_colors=color)
        m.metadata={'sourceMaterial':mat,'category':category}
        name=f'{category}_{mat}'
        out.add_geometry(m,node_name=name,geom_name=name)
        summary.append({'name':name,'triangles':len(m.faces),'bounds':m.bounds.tolist()})
        print('converted',name,len(m.faces),flush=True)
glb=dest/'kspo-dome.glb';glb.write_bytes(out.export(file_type='glb'))
meta={
 'name':'KSPO DOME','source':'한국체육산업개발주식회사_올림픽공원 공연장 실감형 콘텐츠',
 'sourceUrl':'https://www.ksponco.or.kr/attachFiles/download/kspo/kspodome_dae.zip',
 'catalogUrl':'https://www.data.go.kr/data/15127487/fileData.do',
 'sourceSha256':hashlib.sha256((ROOT/'assets-source'/'kspodome_dae.zip').read_bytes()).hexdigest(),
 'sourceUnits':'inch','sourceUp':'Z_UP','units':'metres','upAxis':'Y',
 'transform':{'formula':'[x*0.0254-centerX, z*0.0254, -y*0.0254+centerY]','centerX':cx,'centerY':cy,'floorOffset':floor},
 'bounds':out.bounds.tolist(),'meshCount':len(out.geometry),'triangles':sum(x['triangles'] for x in summary),
 'bytes':glb.stat().st_size,'meshes':summary,
 'seatMapping':'No official seat identifiers were found. Generic SketchUp node names are not seat numbers.',
 'precision':'Visual geometry decimated to 18 percent per large material. Not surveyed or certified as-built geometry.'}
(dest/'venue-meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
print('GLB written',glb.stat().st_size,'bytes; bounds',out.bounds.tolist(),flush=True)
