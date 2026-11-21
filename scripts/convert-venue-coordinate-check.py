"""Static, non-browser coordinate QA plot of the converted official geometry."""
from pathlib import Path
import numpy as np
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
ROOT=Path(__file__).resolve().parents[1]
s=trimesh.load(ROOT/'public/models/kspo-dome.glb',force='scene')
points=[]
for name,m in s.geometry.items():
    if name.startswith('roof_'): continue
    v=m.vertices
    points.append(v[::max(1,len(v)//2500)])
v=np.concatenate(points);v=v[(v[:,1]>-.3)&(v[:,1]<19)]
fig=plt.figure(figsize=(15,7),facecolor='#f5f7fb')
ax=fig.add_subplot(121)
ax.scatter(v[:,0],v[:,2],c=v[:,1],s=.5,cmap='viridis',vmin=0,vmax=14)
ax.add_patch(Rectangle((-9,-20),18,8,facecolor='#fc6c45',edgecolor='black',alpha=.9))
ax.text(0,-16,'18 x 8m stage',ha='center',va='center',fontsize=10)
ax.scatter([0],[0],color='black',s=20);ax.text(1,1,'Court origin')
ax.set(xlabel='X (metres)',ylabel='Z (metres)',title='Official mesh top view; roof hidden',xlim=(-68,68),ylim=(-68,68))
ax.set_aspect('equal');ax.grid(alpha=.25)
ax3=fig.add_subplot(122,projection='3d')
ax3.scatter(v[:,0],v[:,2],v[:,1],c=v[:,1],s=.25,cmap='viridis',vmin=0,vmax=14,alpha=.6)
verts=[(-9,-20,0),(9,-20,0),(9,-12,0),(-9,-12,0),(-9,-20,1.5),(9,-20,1.5),(9,-12,1.5),(-9,-12,1.5)]
faces=[[verts[i] for i in ids] for ids in [(0,1,2,3),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]]
ax3.add_collection3d(Poly3DCollection(faces,facecolors='#fc6c45',edgecolors='#5e1d11',linewidths=.5))
ax3.set(xlabel='X (m)',ylabel='Z (m)',zlabel='Height Y (m)',title='Geometry coordinate check; stage base Y=0',xlim=(-65,65),ylim=(-65,65),zlim=(0,20))
ax3.set_box_aspect((1,1,.35));ax3.view_init(elev=32,azim=-58)
fig.suptitle('KSPO DOME public-data model — stage coordinate verification',fontsize=15)
fig.tight_layout()
dest=ROOT/'assets-source/coordinate-check.png';fig.savefig(dest,dpi=140);print(dest)
