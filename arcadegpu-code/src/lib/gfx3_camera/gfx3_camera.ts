import { gfx3Manager } from '../gfx3/gfx3_manager';
import { Quaternion } from '../core/quaternion';
import { Gfx3View, Gfx3ProjectionMode } from '../gfx3/gfx3_view';
import { Gfx3Transformable } from '../gfx3/gfx3_transformable';

/**
 * A 3D camera object.
 */
class Gfx3Camera extends Gfx3Transformable {
  view: Gfx3View;
  projectionMode: Gfx3ProjectionMode;
  perspectiveFovy: number;
  perspectiveNear: number;
  perspectiveFar: number;
  orthographicSize: number;
  orthographicDepth: number;

  /**
   * @param {number} viewIndex - The view you want to bind the camera.
   */
  constructor(viewIndex: number) {
    super();
    this.view = gfx3Manager.getView(viewIndex);
    this.projectionMode = this.view.getProjectionMode();
    this.perspectiveFovy = this.view.getPerspectiveFovy();
    this.perspectiveNear = this.view.getPerspectiveNear();
    this.perspectiveFar = this.view.getPerspectiveFar();
    this.orthographicSize = this.view.getOrthographicSize();
    this.orthographicDepth = this.view.getOrthographicDepth();
  }

  /**
   * Returns the projection mode.
   */
  getProjectionMode(): Gfx3ProjectionMode {
    return this.projectionMode;
  }

  /**
   * Set the projection mode.
   * 
   * @param {Gfx3ProjectionMode} projectionMode - The projection mode.
   */
  setProjectionMode(projectionMode: Gfx3ProjectionMode): void {
    this.projectionMode = projectionMode;
    this.view.setProjectionMode(projectionMode);
  }

  /**
   * Returns the fovy angle (perspective eye-angle).
   */
  getPerspectiveFovy(): number {
    return this.perspectiveFovy;
  }

  /**
   * Set the fovy angle.
   * 
   * @param {number} perspectiveFovy - The fovy angle.
   */
  setPerspectiveFovy(perspectiveFovy: number): void {
    this.perspectiveFovy = perspectiveFovy;
    this.view.setPerspectiveFovy(this.perspectiveFovy);
  }

  /**
   * Returns the near limit.
   */
  getPerspectiveNear(): number {
    return this.perspectiveNear;
  }

  /**
   * Set the near limit.
   * 
   * @param {number} perspectiveNear - The distance to the near clipping plane of a perspective projection.
   */
  setPerspectiveNear(perspectiveNear: number): void {
    this.perspectiveNear = perspectiveNear;
    this.view.setPerspectiveNear(perspectiveNear);
  }

  /**
   * Returns the far limit.
   */
  getPerspectiveFar(): number {
    return this.perspectiveFar;
  }

  /**
   * Set the far limit.
   * 
   * @param {number} perspectiveFar - The maximum distance from the camera at which objects will be rendered.
   */
  setPerspectiveFar(perspectiveFar: number): void {
    this.perspectiveFar = perspectiveFar;
    this.view.setPerspectiveFar(perspectiveFar);
  }

  /**
   * Returns the orthographic size.
   */
  getOrthographicSize(): number {
    return this.orthographicSize;
  }

  /**
   * Set orthographic size.
   * 
   * @param {number} orthographicSize - Determines how much of the scene is visible within the camera's view frustum.
   */
  setOrthographicSize(orthographicSize: number): void {
    this.orthographicSize = orthographicSize;
    this.view.setOrthographicSize(orthographicSize);
  }

  /**
   * Returns the orthographic depth.
   */
  getOrthographicDepth(): number {
    return this.orthographicDepth;
  }

  /**
   * Set orthographic depth.
   * 
   * @param {number} orthographicDepth - The depth of the orthographic view.
   */
  setOrthographicDepth(orthographicDepth: number): void {
    this.orthographicDepth = orthographicDepth;
    this.view.setOrthographicDepth(orthographicDepth);
  }

  /**
   * Set the position with the given x, y and z coordinates.
   * 
   * @param {number} x - The X coordinate of the position.
   * @param {number} y - The Y coordinate of the position.
   * @param {number} z - The Z coordinate of the position.
   */
  setPosition(x: number, y: number, z: number): void {
    super.setPosition(x, y, z);
    this.view.setCameraMatrix(this.getTransformMatrix());
  }

  /**
   * Translate the position.
   * 
   * @param {number} x - The amount of translation in the x-axis direction.
   * @param {number} y - The amount of translation in the y-axis direction.
   * @param {number} z - The amount of translation in the z-axis direction.
   */
  translate(x: number, y: number, z: number): void {
    super.translate(x, y, z);
    this.view.setCameraMatrix(this.getTransformMatrix());
  }

  /**
   * Set euler rotation in radians.
   * 
   * @param {number} x - The rotation angle on x-axis in radians.
   * @param {number} y - The rotation angle on y-axis in radians.
   * @param {number} z - The rotation angle on z-axis in radians.
   */
  setRotation(x: number, y: number, z: number): void {
    super.setRotation(x, y, z);
    this.view.setCameraMatrix(this.getTransformMatrix());
  }

  /**
   * Add euler rotation in radians.
   * 
   * @param {number} x - The rotation angle on x-axis in radians.
   * @param {number} y - The rotation angle on y-axis in radians.
   * @param {number} z - The rotation angle on z-axis in radians.
   */
  rotate(x: number, y: number, z: number): void {
    super.rotate(x, y, z);
    this.view.setCameraMatrix(this.getTransformMatrix());
  }

  /**
   * Set the Quaternion rotation.
   * 
   * @param {vec4} quaternion - The quaternion.
   */
  setQuaternion(quaternion: Quaternion) : void {
    super.setQuaternion(quaternion);
    this.view.setCameraMatrix(this.getTransformMatrix());
  }

  /**
   * Set the scale with the given x, y and z factors.
   * 
   * @param {number} x - The x factor in the x-axis direction.
   * @param {number} y - The y factor in the y-axis direction.
   * @param {number} z - The z factor in the z-axis direction.
   */
  setScale(x: number, y: number, z: number): void {
    super.setScale(x, y, z);
    this.view.setCameraMatrix(this.getTransformMatrix());
  }

  /**
   * Add scale values.
   * 
   * @param {number} x - The x factor in the x-axis direction.
   * @param {number} y - The y factor in the y-axis direction.
   * @param {number} z - The z factor in the z-axis direction.
   */
  zoom(x: number, y: number, z: number): void {
    super.zoom(x, y, z);
    this.view.setCameraMatrix(this.getTransformMatrix());
  }

  /**
   * Change the view attached to the camera.
   * @param {number} viewIndex - The view index.
   */
  changeView(viewIndex: number): void {
    this.view = gfx3Manager.getView(viewIndex);
    this.view.setProjectionMode(this.projectionMode);
    this.view.setPerspectiveFovy(this.perspectiveFovy);
    this.view.setPerspectiveNear(this.perspectiveNear);
    this.view.setPerspectiveFar(this.perspectiveFar);
    this.view.setOrthographicSize(this.orthographicSize);
    this.view.setOrthographicDepth(this.orthographicDepth);
    this.view.setCameraMatrix(this.getTransformMatrix());
  }

  /**
   * Rotate to look at the specified coordinates.
   * Note: Avoid euler rotation and quaternion rotation.
   * 
   * @param {number} x - The x-coordinate of the target position that the transformable should look at.
   * @param {number} y - The y-coordinate of the target position that the transformable should look at.
   * @param {number} z - The z-coordinate of the target position that the transformable should look at.
   */
  lookAt(x: number, y: number, z:number, up: vec3 = [0, 1, 0]): void {
    super.lookAt(x, y, z, up);
    this.view.setCameraMatrix(this.getTransformMatrix());
  }

  /**
   * Returns the camera matrix.
   */
  getCameraMatrix(): mat4 {
    return this.view.getCameraMatrix();
  }

  getView(): Gfx3View {
    return this.view;
  }
}

export { Gfx3Camera };