export function disposeObject(object) {
  const geometries = new Set(),
    materials = new Set();
  object.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    for (const material of Array.isArray(o.material) ? o.material : [o.material])
      if (material) materials.add(material);
  });
  for (const geometry of geometries) {
    geometry.boundsTree?.dispose?.();
    geometry.dispose();
  }
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
    material.dispose();
  }
  object.clear();
}
