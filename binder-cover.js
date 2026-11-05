import * as THREE from './three.module.min.js';

export function createBinderCover(model) {
  const hinges = [];
  const axis = new THREE.Vector3(0, 0, -1);
  const turn = new THREE.Quaternion();
  model.traverse(object => {
    if (object.userData.binder_fold) {
      hinges.push({ object, open: object.quaternion.clone() });
    }
  });
  return {
    set(progress) {
      const amount = THREE.MathUtils.clamp(progress, 0, 1);
      turn.setFromAxisAngle(axis, amount * Math.PI / 2);
      for (const hinge of hinges) hinge.object.quaternion.copy(hinge.open).multiply(turn);
      model.updateMatrixWorld(true);
    },
    get available() { return hinges.length === 2; }
  };
}
