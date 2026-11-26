import * as THREE from 'three';
import { observationRegion } from '../domain/observation-regions.js';
export class ObservationLayer {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.key = null;
    this.capacity = 0;
    this.matrix = new THREE.Matrix4();
    this.color = new THREE.Color();
  }
  update(result, showHeat, regionId = 'all', stage = { x: 0, z: 0 }) {
    let rebuild = false;
    if (!this.mesh || this.capacity < result.points.length) {
      this.dispose();
      this.capacity = 2 ** Math.ceil(Math.log2(Math.max(1, result.points.length)));
      this.mesh = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.12, 8),
        new THREE.MeshBasicMaterial({ depthTest: true, depthWrite: false }),
        this.capacity,
      );
      this.mesh.renderOrder = 3;
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(this.mesh);
      rebuild = true;
    }
    this.mesh.count = result.points.length;
    const key = result.observerKey ?? result.points;
    if (rebuild || this.key !== key) {
      result.points.forEach((p, i) => {
        this.matrix.makeTranslation(p.x, p.y, p.z);
        this.mesh.setMatrixAt(i, this.matrix);
      });
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.computeBoundingSphere();
      this.key = key;
    }
    result.points.forEach((p, i) => {
      const active = regionId === 'all' || observationRegion(p, stage) === regionId;
      this.color.set(
        !active
          ? '#d7dfe4'
          : showHeat
            ? p.ratio >= 0.5
              ? '#d84e43'
              : p.ratio > 0
                ? '#d9a051'
                : '#66808e'
            : '#66808e',
      );
      this.mesh.setColorAt(i, this.color);
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return this.mesh;
  }
  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh.dispose();
    }
    this.mesh = null;
    this.key = null;
    this.capacity = 0;
  }
}
