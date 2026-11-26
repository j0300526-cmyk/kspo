import * as THREE from 'three';
export function createSchematic() {
  const group = new THREE.Group();
  // This diagram is an explicitly labelled design aid, not a surveyed venue model.
  for (let level = 0; level < 9; level++) {
    const radius = 27 + level * 2.05;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 1.7, radius + 1.7, 0.7, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xd5dde2, side: THREE.DoubleSide, roughness: 1 }),
    );
    mesh.position.y = 1.1 + level * 1.15;
    group.add(mesh);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius, radius + 1.85, 96),
      new THREE.MeshStandardMaterial({
        color: level % 2 ? 0xbcc9d1 : 0xcad4dc,
        side: THREE.DoubleSide,
        roughness: 1,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1.45 + level * 1.15;
    group.add(ring);
  }
  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(45, 48),
    new THREE.MeshStandardMaterial({ color: 0xe6e9ed, roughness: 1 }),
  );
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.01;
  group.add(court);
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(44, 0.02, 47)),
    new THREE.LineBasicMaterial({ color: 0xb6c2cb }),
  );
  group.add(outline);
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.sin(angle) * 28, 1.6, Math.cos(angle) * 28),
        new THREE.Vector3(Math.sin(angle) * 46, 12, Math.cos(angle) * 46),
      ]),
      new THREE.LineBasicMaterial({ color: 0x9aaebc, transparent: true, opacity: 0.45 }),
    );
    group.add(line);
  }

  return group;
}
