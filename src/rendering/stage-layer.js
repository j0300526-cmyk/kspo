import * as THREE from 'three';
import { disposeObject } from './resources.js';
export class StageLayer {
  constructor() {
    this.group = new THREE.Group();
    this.deck = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xcbd4e1, roughness: 0.7 }),
    );
    this.group.add(this.deck);
    this.edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.deck.geometry),
      new THREE.LineBasicMaterial({ color: 0xe0e8f4 }),
    );
    this.group.add(this.edge);
    this.marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 1.35, 12),
      new THREE.MeshStandardMaterial({ color: 0xf2f5fb }),
    );
    this.group.add(this.marker);
  }
  update(stage) {
    this.deck.scale.set(stage.width, Math.max(0.1, stage.height), stage.depth);
    this.deck.position.set(stage.x, stage.height / 2, stage.z);
    this.edge.scale.copy(this.deck.scale);
    this.edge.position.copy(this.deck.position);
    this.marker.position.set(stage.x, stage.height + 0.675, stage.z);
  }
  dispose() {
    disposeObject(this.group);
  }
}
