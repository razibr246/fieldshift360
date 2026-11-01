import * as THREE from 'three';

const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });

function part(root, geometry, color, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.ownsGeometry = true;
  root.add(mesh);
  return mesh;
}

// Small built-in person used only when a licensed character model cannot be loaded.
export function createFallbackPerson(spec, x = 0) {
  const root = new THREE.Group();
  root.position.x = x;
  const colors = spec.colors ?? {};
  const skin = colors.Skin ?? '#b77b52';
  const shirt = colors.Shirt ?? '#43863a';
  const pants = colors.Pants ?? '#3f5c78';
  const hair = colors.Hair ?? '#211914';
  const kidScale = spec.kid ? 0.62 : 1;

  part(root, new THREE.CapsuleGeometry(0.22, 0.34, 4, 10), shirt, [0, 1.08, 0]);
  part(root, new THREE.CylinderGeometry(0.15, 0.17, 0.22, 12), pants, [0, 0.78, 0]);
  for (const side of [-1, 1]) {
    part(root, new THREE.CapsuleGeometry(0.064, 0.35, 3, 8), skin, [side * 0.29, 1.06, 0], [0, 0, side * -0.08]);
    part(root, new THREE.CapsuleGeometry(0.068, 0.39, 3, 8), pants, [side * 0.095, 0.43, 0]);
    part(root, new THREE.BoxGeometry(0.12, 0.07, 0.22), '#362a20', [side * 0.095, 0.12, 0.035]);
  }
  const head = part(root, new THREE.SphereGeometry(0.145, 16, 12), skin, [0, 1.55, 0]);
  head.scale.set(1, spec.kid ? 1.22 : 1, 0.92);
  part(root, new THREE.SphereGeometry(0.148, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), hair, [0, 1.59, -0.006]);
  for (const side of [-1, 1]) part(root, new THREE.SphereGeometry(0.012, 8, 6), '#201611', [side * 0.052, 1.565, 0.131]);

  root.scale.setScalar(kidScale);
  return { root, fallback: true };
}

// Dispose cloned resources owned by a character instance. Cached GLTF geometry and textures are shared,
// so only fallback geometry and per-instance materials are released here.
export function disposePerson(person) {
  if (!person?.root) return;
  person.mixer?.stopAllAction();
  person.root.traverse((object) => {
    if (!object.isMesh) return;
    if (object.userData.ownsGeometry) object.geometry.dispose();
    for (const m of Array.isArray(object.material) ? object.material : [object.material]) m?.dispose();
    if (object.isSkinnedMesh) object.skeleton?.dispose();
  });
}
