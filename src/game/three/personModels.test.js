import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFallbackPerson, disposePerson } from './personModels.js';

test('missing-model fallback builds a visible adult or child with the requested colors', () => {
  for (const spec of [
    { colors: { Skin: '#c8946a', Shirt: '#43863a', Pants: '#314f78' } },
    { kid: true, colors: { Skin: '#c8946a', Shirt: '#e0567a', Pants: '#7b5cd6' } },
  ]) {
    const person = createFallbackPerson(spec, 0.75);
    const meshes = [];
    person.root.traverse((object) => { if (object.isMesh) meshes.push(object); });
    assert.equal(person.fallback, true);
    assert.equal(person.root.position.x, 0.75);
    assert.ok(meshes.length >= 10);
    assert.ok(meshes.every((mesh) => mesh.material instanceof THREE.MeshStandardMaterial));
    disposePerson(person);
  }
});

test('disposing a character stops its mixer and releases cloned materials', () => {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  root.add(mesh);
  let stopped = 0, released = 0;
  mesh.material.addEventListener('dispose', () => { released++; });
  disposePerson({ root, mixer: { stopAllAction() { stopped++; } } });
  assert.equal(stopped, 1);
  assert.equal(released, 1);
});
