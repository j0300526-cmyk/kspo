import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { GenerateMeshBVHWorker } from 'three-mesh-bvh/worker';

export async function preparePicking(object, onProgress = () => {}) {
  const meshes = [];
  object.traverse((o) => {
    if (o.isMesh) {
      // The public converted GLB omits normals. Standard lighting needs these
      // before replacing its original unlit material with a shaded surface.
      if (!o.geometry.getAttribute('normal')) o.geometry.computeVertexNormals();
      o.raycast = acceleratedRaycast;
      if ((o.geometry.index?.count || o.geometry.attributes.position.count) > 30000) meshes.push(o);
    }
  });
  if (typeof Worker === 'undefined' || !meshes.length) return;
  let generator;
  try {
    generator = new GenerateMeshBVHWorker();
    for (let i = 0; i < meshes.length; i++) {
      onProgress(`공간 검색 준비 ${i + 1}/${meshes.length}`);
      // Work on a clone: if the worker fails, the model's original buffers survive.
      const copy = meshes[i].geometry.clone();
      let timer;
      try {
        const tree = await Promise.race([
          generator.generate(copy, { maxLeafSize: 12 }),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('BVH timeout')), 8000);
          }),
        ]);
        meshes[i].geometry.boundsTree = MeshBVH.deserialize(
          MeshBVH.serialize(tree),
          meshes[i].geometry,
        );
      } finally {
        clearTimeout(timer);
        copy.dispose();
      }
    }
  } catch (error) {
    console.warn('BVH unavailable, using normal picking', error.message);
  } finally {
    generator?.dispose();
  }
}
export async function loadOfficialModel(onProgress) {
  const response = await fetch('/models/venue-meta.json');
  if (!response.ok) throw new Error('공식 모델 정보를 불러오지 못했습니다.');
  const meta = await response.json();
  onProgress('공식 모델 로딩');
  const model = await new GLTFLoader().loadAsync(meta.modelUrl || '/models/kspo-dome.glb', (e) => {
    if (e.total) onProgress(`공식 모델 ${Math.round((e.loaded / e.total) * 100)}%`);
  });
  await preparePicking(model.scene, onProgress);
  return { object: model.scene, meta };
}
export async function loadModelFile(file, onProgress) {
  let object;
  if (/\.dae$/i.test(file.name)) {
    const { ColladaLoader } = await import('three/addons/loaders/ColladaLoader.js');
    object = new ColladaLoader().parse(await file.text(), '').scene;
  } else object = (await new GLTFLoader().parseAsync(await file.arrayBuffer(), '')).scene;
  await preparePicking(object, onProgress);
  return object;
}
