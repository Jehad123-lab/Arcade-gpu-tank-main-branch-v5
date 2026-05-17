import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { UT } from '@lib/core/utils';
// ---------------------------------------------------------------------------------------
import { CarController } from './car_controller';
// ---------------------------------------------------------------------------------------

// Wheel order: FL (0), FR (1), RL (2), RR (3).
export type WheelPosition = {
  x: number;
  y: number;
  z: number;
  front: boolean;
  mirrored: boolean;
};

export const DEFAULT_WHEEL_POSITIONS = [
  { x: 1.0, y: 0, z: 1.34, front: true, mirrored: true }, { x: -1.0, y: 0, z: 1.34, front: true, mirrored: false },
  { x: 1.0, y: 0, z: -0.9, front: false, mirrored: true }, { x: -1.0, y: 0, z: -0.9, front: false, mirrored: false }
];

export class Wheel {
  car: CarController;
  front: boolean;
  mirrored: boolean;
  mesh: Gfx3MeshJSM;
  reference: vec3;

  constructor(car: CarController, x: number, y: number, z: number, front: boolean, mirrored: boolean) {
    this.car = car;
    this.front = front;
    this.mirrored = mirrored;
    this.mesh = new Gfx3MeshJSM();
    this.mesh.setPosition(x, y, z);
    this.reference = [x, y, z];
  }

  draw() {
    const mat = UT.MAT4_IDENTITY();
    UT.MAT4_MULTIPLY(mat, this.car.mesh.getTransformMatrix(), mat);
    UT.MAT4_MULTIPLY(mat, this.mesh.getTransformMatrix(), mat);
    gfx3MeshRenderer.drawMesh(this.mesh, mat);
  }

  getPosition(): vec3 {
    const bodyMat = this.car.mesh.getTransformMatrix();
    const meshMat = this.mesh.getTransformMatrix();
    const finalMat = UT.MAT4_MULTIPLY(bodyMat, meshMat);
    return UT.MAT4_MULTIPLY_BY_VEC3(finalMat, [0, 0, 0]);
  }

  getReferencePosition(): vec3 {
    const tmpX = this.mesh.getPositionX();
    const tmpY = this.mesh.getPositionY();
    const tmpZ = this.mesh.getPositionZ();

    this.mesh.setPosition(this.reference[0], this.reference[1], this.reference[2]);

    const bodyMat = this.car.mesh.getTransformMatrix();
    const meshMat = this.mesh.getTransformMatrix();
    const finalMat = UT.MAT4_MULTIPLY(bodyMat, meshMat);
    const originPosition = UT.MAT4_MULTIPLY_BY_VEC3(finalMat, [0, 0, 0]);

    this.mesh.setPosition(tmpX, tmpY, tmpZ);
    return originPosition;
  }

  getSuspensionPivotY(): number {
    const bb = this.mesh.getBoundingBox();
    const referencePos = this.getReferencePosition();
    return referencePos[1] + (bb.getHeight() / 2);
  }
}