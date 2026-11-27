import * as THREE from 'three';
import { colors } from '../design/colors.js';
import { disposeObject } from './resources.js';
export class EquipmentLayer {
  constructor() {
    this.group = new THREE.Group();
    this.items = new Map();
    this.pickTargets = [];
  }
  update(equipment, selectedId) {
    const ids = new Set(equipment.map((e) => e.id));
    for (const [id, item] of this.items)
      if (!ids.has(id)) {
        this.group.remove(item.group);
        disposeObject(item.group);
        this.items.delete(id);
      }
    this.pickTargets = [];
    for (const e of equipment) {
      let item = this.items.get(e.id);
      if (item && item.type !== e.type) {
        this.group.remove(item.group);
        disposeObject(item.group);
        this.items.delete(e.id);
        item = null;
      }
      if (!item) {
        const group = new THREE.Group();
        group.userData.id = e.id;
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: colors.grey500, roughness: 0.65 }),
        );
        body.userData.id = e.id;
        group.add(body);
        const edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(body.geometry),
          new THREE.LineBasicMaterial({ color: colors.grey300 }),
        );
        group.add(edge);
        let detail;
        if (e.type === 'camera') {
          detail = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.55, 0.8),
            new THREE.MeshStandardMaterial({ color: colors.grey800 }),
          );
          group.add(detail);
        }
        if (e.type === 'speaker') {
          detail = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshStandardMaterial({ color: colors.grey800, side: THREE.DoubleSide }),
          );
          group.add(detail);
        }
        item = { group, body, edge, detail, type: e.type };
        this.items.set(e.id, item);
        this.group.add(group);
      }
      item.group.position.set(e.x, 0, e.z);
      item.group.rotation.y = (-e.rotation * Math.PI) / 180;
      item.body.scale.set(e.width, e.height, e.depth);
      item.body.position.y = e.height / 2;
      item.edge.scale.copy(item.body.scale);
      item.edge.position.copy(item.body.position);
      item.body.material.color.set(e.id === selectedId ? colors.blue500 : colors.grey500);
      item.edge.material.color.set(e.id === selectedId ? colors.blue200 : colors.grey300);
      if (e.type === 'camera') {
        item.detail.position.set(0, e.height + 0.275, 0);
        item.detail.scale.x = Math.min(1, e.width * 0.4);
      }
      if (e.type === 'speaker') {
        item.detail.scale.set(e.width * 0.75, e.height * 0.8, 1);
        item.detail.position.set(0, e.height / 2, e.depth / 2 + 0.01);
      }
      this.pickTargets.push(item.body);
    }
    this.group.updateMatrixWorld(true);
  }
  move(id, x, z) {
    this.items.get(id)?.group.position.set(x, 0, z);
  }
  dispose() {
    disposeObject(this.group);
    this.items.clear();
  }
}
