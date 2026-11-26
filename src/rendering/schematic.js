import { Group } from 'three';

export function createSchematic() {
  // Real observation coordinates form the seating layout in the simple view.
  // Avoid invented bowl surfaces that cover those markers.
  return new Group();
}
