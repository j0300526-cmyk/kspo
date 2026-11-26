import * as THREE from 'three';
import { disposeObject } from './resources.js';
export class StageLayer {
  constructor() {
    this.group = new THREE.Group();
    this.deck = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x242625, roughness: 0.9 }),
    );
    this.group.add(this.deck);
    this.edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.deck.geometry),
      new THREE.LineBasicMaterial({ color: 0x6a7269 }),
    );
    this.group.add(this.edge);
    this.marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 1.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x9a4a37 }),
    );
    this.group.add(this.marker);
    this.front = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x9a4a37 }),
    );
    this.group.add(this.front);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#ffffff';
        context.font = '600 65px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('STAGE', 256, 64);
        this.labelTexture = new THREE.CanvasTexture(canvas);
        this.label = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({
            map: this.labelTexture,
            transparent: true,
            depthWrite: false,
          }),
        );
        this.label.rotation.x = -Math.PI / 2;
        this.group.add(this.label);
      }
    }
  }
  update(stage) {
    this.deck.scale.set(stage.width, Math.max(0.1, stage.height), stage.depth);
    this.deck.position.set(stage.x, stage.height / 2, stage.z);
    this.edge.scale.copy(this.deck.scale);
    this.edge.position.copy(this.deck.position);
    this.marker.position.set(stage.x, stage.height + 0.675, stage.z);
    this.front.scale.set(stage.width, 0.12, 0.16);
    this.front.position.set(stage.x, stage.height + 0.06, stage.z + stage.depth / 2);
    if (this.label) {
      const width = Math.min(stage.width * 0.62, stage.depth * 2);
      this.label.scale.set(width, width / 4, 1);
      this.label.position.set(stage.x, stage.height + 0.025, stage.z - stage.depth * 0.2);
    }
  }
  dispose() {
    disposeObject(this.group);
  }
}
