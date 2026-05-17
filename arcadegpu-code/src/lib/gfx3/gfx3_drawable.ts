import { gfx3Manager, VertexSubBuffer } from './gfx3_manager';
import { UT } from '../core/utils';
import { Poolable } from '../core/object_pool';
import { Gfx3Transformable } from './gfx3_transformable';
import { Gfx3BoundingBox } from './gfx3_bounding_box';
import { Gfx3BoundingCylinder } from './gfx3_bounding_cylinder';
import { Quaternion } from '../core/quaternion';

enum Gfx3MeshEffect {
  NONE = 0,
  PIXELATION = 2,
  COLOR_LIMITATION = 4,
  DITHER = 8,
  OUTLINE = 16,
  SHADOW_VOLUME = 32,
  CHANNEL1 = 64
};

/**
 * A 3D drawable object.
 */
class Gfx3Drawable extends Gfx3Transformable implements Poolable<Gfx3Drawable> {
  tag: vec4;
  vertexSubBuffer: VertexSubBuffer;
  vertices: Array<number>;
  vertexCount: number;
  vertexStride: number;
  boundingBox: Gfx3BoundingBox;
  boundingCylinder: Gfx3BoundingCylinder;

  /**
   * @param {number} vertexStride - The number of attributes for each vertex.
   */
  constructor(vertexStride: number) {
    super();
    this.tag = [0, 0, 0, 0];
    this.vertexSubBuffer = gfx3Manager.createVertexBuffer(0);
    this.vertices = [];
    this.vertexCount = 0;
    this.vertexStride = vertexStride;
    this.boundingBox = new Gfx3BoundingBox();
    this.boundingCylinder = new Gfx3BoundingCylinder();
  }

  /**
   * Free all resources.
   * Warning: You need to call this method to free allocation for this object.
   */
  delete(): void {
    gfx3Manager.destroyVertexBuffer(this.vertexSubBuffer);
  }

  /**
   * Virtual update function.
   * 
   * @param {number} ts - The timestep.
   */
  update(ts: number): void {}

  /**
   * Virtual draw function.
   */
  draw(): void {}

  /**
   * Prepare your vertex buffer to write process.
   * Warning: You need to call this method before define your vertices.
   * 
   * @param {number} vertexCount - The number of vertices.
   */
  beginVertices(vertexCount: number): void {
    gfx3Manager.destroyVertexBuffer(this.vertexSubBuffer);
    this.vertexSubBuffer = gfx3Manager.createVertexBuffer(vertexCount * this.vertexStride);
    this.vertices = [];
    this.vertexCount = vertexCount;
  }

  /**
   * Delete all values from vertex buffer but keep the allocation alive.
   */
  flushVertices(): void {
    this.vertices = [];
  }

  /**
   * Add a vertex.
   * 
   * @param v - The attributes data of the vertex.
   */
  defineVertex(...v: Array<number>) {
    this.vertices.push(...v);
  }

  /**
   * Set vertices.
   * 
   * @param vertices - The list of vertices.
   */
  setVertices(vertices: Array<number>) {
    this.vertices = vertices;
  }

  /**
   * Close your vertex buffer to write process.
   */
  endVertices(): void {
    gfx3Manager.writeVertexBuffer(this.vertexSubBuffer, this.vertices);
    this.boundingBox = Gfx3BoundingBox.createFromVertices(this.vertices, this.vertexStride);
    this.boundingCylinder = Gfx3BoundingCylinder.createFromBoundingBox(this.boundingBox);
  }

  /**
   * Returns the vertex sub-buffer offset in the global vertex buffer.
   * Nota bene: All vertices are stored in one global vertex buffer handled by "Gfx3Manager".
   * SubBuffer is just a reference offset/size pointing to the big one buffer.
   */
  getVertexSubBufferOffset(): number {
    return this.vertexSubBuffer.offset;
  }

  /**
   * Returns the byte length of the vertex sub buffer.
   */
  getVertexSubBufferSize(): number {
    return this.vertexSubBuffer.vertices.byteLength;
  }

  /**
   * Returns vertices.
   */
  getVertices(): Array<number> {
    return this.vertices;
  }

  /**
   * Returns the number of vertices.
   */
  getVertexCount(): number {
    return this.vertexCount;
  }

  /**
   * Render tag are written into a dedicated attachement buffer during rendering.
   * They allow the engine and post-processing steps to identify, filter,
   * group or apply special effects to a drawable object.
   * Effects:
   * ■ pixelation: 2
   * ■ color limitation: 4
   * ■ dither: 8
   * ■ outline: 16
   * ■ shadow volume: 32
   * ■ channel1: 64
   * 
   * @param {number} groupId - Identifies group of objects (e.g. category).
   * @param {number} meshId - Identifies this specific mesh within its group.
   * @param {Gfx3MeshEffect|number} effects - Apply differents post-processing effects.
   */
  setTag(groupId: number, meshId: number = 0, effects: Gfx3MeshEffect = 0): void {
    this.tag = [groupId, meshId, effects, 1.0];
  }

  /**
   * Returns the tag list.
   */
  getTag(): vec4 {
    return this.tag;
  }

  /**
   * Set group identifier.
   * 
   * @param {number} groupId - The group identifier.
   */
  setGroupId(groupId: number): void {
    this.tag[0] = groupId;
  }

  /**
   * Set mesh identifier.
   * 
   * @param {number} meshId - The mesh identifier.
   */
  setMeshId(meshId: number): void {
    this.tag[1] = meshId;
  }

  /**
   * Set the effects.
   * 
   * @param {Gfx3MeshEffecta|number} effects - The effects.
   */
  setEffects(effects: number): void {
    this.tag[2] = effects;
  }

  /**
   * Disable tag.
   */
  disableTag(): void {
    this.tag[3] = 0.0;
  }

  /**
   * Returns the group identifier.
   */
  getGroupId(): number {
    return this.tag[0];
  }

  /**
   * Returns the mesh identifier.
   */
  getMeshId(): number {
    return this.tag[1];
  }

  /**
   * Returns the identifier.
   */
  getEffects(): number {
    return this.tag[2];
  }

  /**
   * Returns true if tag is enabled.
   */
  isTagEnabled(): boolean {
    return !!this.tag[3];
  }

  /**
   * Returns tag as a string.
   */
  getTagAsString(): string {
    return '' + this.tag[0] + '' + this.tag[1] + '' + this.tag[2] + '' + this.tag[3] + '';
  }

  /**
   * Set the bounding box.
   * 
   * @param {Gfx3BoundingBox} boundingBox - The bounding box.
   */
  setBoundingBox(boundingBox: Gfx3BoundingBox): void {
    this.boundingBox = boundingBox;
  }

  /**
   * Returns the bounding box.
   */
  getBoundingBox(): Gfx3BoundingBox {
    return this.boundingBox;
  }

  /**
   * Returns the bounding box in the world space coordinates.
   */
  getWorldBoundingBox(): Gfx3BoundingBox {
    return this.boundingBox.transform(this.getTransformMatrix());
  }

  /**
   * Returns the bounding cylinder.
   */
  getBoundingCylinder(): Gfx3BoundingCylinder {
    return this.boundingCylinder;
  }

  /**
   * Returns the bounding cylinder.
   */
  getWorldBoundingCylinder(): Gfx3BoundingCylinder {
    return this.boundingCylinder.transform(this.getTransformMatrix());
  }

  /**
   * Returns true if meshes collides.
   */
  isCollideAsCylinder(drawable: Gfx3Drawable, slideVelocity: vec2 = [0, 0]): boolean {
    return this.getWorldBoundingCylinder().intersectBoundingCylinder(drawable.getWorldBoundingCylinder(), slideVelocity);
  }

  /**
   * Returns true if meshes collides.
   */
  isCollideAsBox(drawable: Gfx3Drawable): boolean {
    return this.getWorldBoundingBox().intersectBoundingBox(drawable.getWorldBoundingBox());
  }

  /**
   * Clone the object.
   * 
   * @param {Gfx3Drawable} drawable - The copy object.
   * @param {mat4} transformMatrix - The transformation matrix.
   */
  clone(drawable: Gfx3Drawable = new Gfx3Drawable(this.vertexStride), transformMatrix: mat4 = UT.MAT4_IDENTITY()): Gfx3Drawable {
    drawable.position = [this.position[0], this.position[1], this.position[2]];
    drawable.rotation = [this.rotation[0], this.rotation[1], this.rotation[2]];
    drawable.scale = [this.scale[0], this.scale[1], this.scale[2]];
    drawable.quaternion = new Quaternion(this.quaternion.w, this.quaternion.x, this.quaternion.y, this.quaternion.z);
    drawable.tag = this.tag;
    drawable.boundingBox = new Gfx3BoundingBox(this.boundingBox.min, this.boundingBox.max);
    drawable.boundingCylinder = new Gfx3BoundingCylinder(this.boundingCylinder.position, this.boundingCylinder.height, this.boundingCylinder.radius);

    drawable.beginVertices(this.vertexCount);

    for (let i = 0; i < this.vertices.length; i += this.vertexStride) {
      const v = UT.MAT4_MULTIPLY_BY_VEC4(transformMatrix, [this.vertices[i + 0], this.vertices[i + 1], this.vertices[i + 2], 1.0]);
      drawable.defineVertex(v[0], v[1], v[2], ...this.vertices.slice(3, this.vertexStride));
    }

    drawable.endVertices();
    return drawable;
  }
}

export { Gfx3Drawable, Gfx3MeshEffect };