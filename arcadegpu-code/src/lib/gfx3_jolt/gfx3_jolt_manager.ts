import initJolt from 'jolt-physics';
import Jolt from 'jolt-physics';
// ---------------------------------------------------------------------------------------
const Gfx3Jolt = await initJolt();
export const bodyFilter = new Gfx3Jolt.BodyFilter();
export const shapeFilter = new Gfx3Jolt.ShapeFilter();
// ---------------------------------------------------------------------------------------
import { gfx3DebugRenderer } from '../gfx3/gfx3_debug_renderer';
import { Gfx3JoltCharacterManager } from './gfx3_jolt_character_manager';
import { Gfx3JoltCarManager } from './gfx3_jolt_car_manager';
import { Gfx3JoltMotorcycleManager } from './gfx3_jolt_motorcycle_manager';
// ---------------------------------------------------------------------------------------

// Jolt constants
export const JOLT_MAX_TIMESTEP = 1 / 30.0;
export const JOLT_LAYER_NON_MOVING = 0;
export const JOLT_LAYER_MOVING = 1;
export const JOLT_NUM_OBJECT_LAYERS = 2;
export const JOLT_GRAVITY = -25;

// Utilities
export const JOLT_RVEC3_TO_VEC3 = (v: Jolt.RVec3): vec3 => [v.GetX(), v.GetY(), v.GetZ()];
export const VEC3_TO_JOLT_RVEC3 = (v: vec3): Jolt.RVec3 => new Gfx3Jolt.RVec3(v[0], v[1], v[2]);
export const JOLT_VEC3_TO_VEC3 = (v: Jolt.Vec3): vec3 => [v.GetX(), v.GetY(), v.GetZ()];
export const VEC3_TO_JOLT_VEC3 = (v: vec3): Jolt.Vec3 => new Gfx3Jolt.Vec3(v[0], v[1], v[2]);
export const JOLT_QUAT_TO_VEC4 = (q: Jolt.Quat): vec4 => [q.GetX(), q.GetY(), q.GetZ(), q.GetW()];
export const VEC4_TO_JOLT_QUAT = (q: vec4): Jolt.Quat => new Gfx3Jolt.Quat(q[0], q[1], q[2], q[3]);

export interface Gfx3JoltCreatePrimitiveOptions {
  x?: number;
  y?: number;
  z?: number;
  rotation?: Jolt.Quat,
  motionType?: Jolt.EMotionType;
  layer?: number;
  settings?: Gfx3JoltBodySettings;
  color?: vec3;
  meta?: any;
}

export interface Gfx3JoltBodySettings {
  mFriction?: number;
  mRestitution?: number;
  mOverrideMassProperties?: number;
  mMassPropertiesOverride?: number;
  mAngularDamping?: number;
}

export interface Gfx3JoltRayCast {
  body: Jolt.Body | null;
  result: Jolt.RayCastResult | null;
  normal: Jolt.Vec3 | null;
  fraction: number;
}

export interface Gfx3JoltEntity {
  type: string; // 'primitive' | 'character' | 'car' | 'motorcycle';
  bodyId: number;
  body: Jolt.Body;
  color: vec3;
  meta: any;
}

/**
 * Singleton 3D physics manager that wrap the Jolt physics engine.
 */
class Gfx3JoltManager {
  inter: Jolt.JoltInterface;
  system: Jolt.PhysicsSystem;
  bodyInterface: Jolt.BodyInterface;
  movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter;
  movingLayerFilter: Jolt.DefaultObjectLayerFilter;
  raycastBPFilter: Jolt.BroadPhaseLayerFilter;
  raycastObjectFilter: Jolt.ObjectLayerFilter
  raycastBodyFilter: Jolt.BodyFilter;
  raycastShapeFilter: Jolt.ShapeFilter;
  showDebug: boolean;
  entitiesMap: Map<number, Gfx3JoltEntity>;
  entities: Array<Gfx3JoltEntity>;
  // ----------------------------------------------------
  characterManager: Gfx3JoltCharacterManager;
  carManager: Gfx3JoltCarManager;
  motorcycleManager: Gfx3JoltMotorcycleManager;

  constructor() {
    // Initialize Jolt
    const settings = new Gfx3Jolt.JoltSettings();
    settings.mMaxWorkerThreads = 3;
    this.#setupCollisionFiltering(settings);
    this.inter = new Gfx3Jolt.JoltInterface(settings);
    Gfx3Jolt.destroy(settings);

    // Initialize Jolt Subsystems
    this.system = this.inter.GetPhysicsSystem();
    this.bodyInterface = this.system.GetBodyInterface();

    const objectVsBroadPhaseLayerFilter = this.inter.GetObjectVsBroadPhaseLayerFilter();
    const objectLayerPairFilter = this.inter.GetObjectLayerPairFilter();
    this.movingBPFilter = new Gfx3Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, JOLT_LAYER_MOVING);
    this.movingLayerFilter = new Gfx3Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, JOLT_LAYER_MOVING);
    this.raycastBPFilter = new Gfx3Jolt.BroadPhaseLayerFilter();
    this.raycastObjectFilter = new Gfx3Jolt.ObjectLayerFilter();
    this.raycastBodyFilter = new Gfx3Jolt.BodyFilter();
    this.raycastShapeFilter = new Gfx3Jolt.ShapeFilter();
    this.showDebug = true;
    this.entitiesMap = new Map();
    this.entities = [];
    
    this.characterManager = new Gfx3JoltCharacterManager(this.system, this.inter, this.bodyInterface, this.movingBPFilter, this.movingLayerFilter);
    this.carManager = new Gfx3JoltCarManager(this.system, this.inter, this.bodyInterface, this.movingBPFilter, this.movingLayerFilter);
    this.motorcycleManager = new Gfx3JoltMotorcycleManager(this.system, this.inter, this.bodyInterface, this.movingBPFilter, this.movingLayerFilter);

    this.system.SetGravity(new Gfx3Jolt.Vec3(0, JOLT_GRAVITY, 0));
  }

  addBox(options: Gfx3JoltCreatePrimitiveOptions & { width: number, height: number, depth: number }): Gfx3JoltEntity {
    const ext = new Gfx3Jolt.Vec3(options.width / 2, options.height / 2, options.depth / 2);
    const shape = new Gfx3Jolt.BoxShape(ext, 0.05);
    const entity = this.addEntity(shape, options);
    return entity;
  }

  addSphere(options: Gfx3JoltCreatePrimitiveOptions & { radius: number }): Gfx3JoltEntity {
    const shape = new Gfx3Jolt.SphereShape(options.radius);
    const entity = this.addEntity(shape, options);
    return entity;
  }

  addCylinder(options: Gfx3JoltCreatePrimitiveOptions & { radius: number, height: number }): Gfx3JoltEntity {
    const shape = new Gfx3Jolt.CylinderShape(options.height / 2, options.radius, 0.05);
    const entity = this.addEntity(shape, options);
    return entity;
  }

  addCapsule(options: Gfx3JoltCreatePrimitiveOptions & { radius: number, height: number }): Gfx3JoltEntity {
    const shape = new Gfx3Jolt.CapsuleShape(options.height / 2, options.radius);
    const entity = this.addEntity(shape, options);
    return entity;
  }

  addPolygonShape(options: Gfx3JoltCreatePrimitiveOptions & { vertices: Array<number>, indexes: Array<number> }): Gfx3JoltEntity {
    const indexesArray = new Gfx3Jolt.IndexedTriangleList();
    const vertexArray = new Gfx3Jolt.VertexList();

    for (let i = 0; i < options.vertices.length; i += 3) {
      vertexArray.push_back(
        new Gfx3Jolt.Float3(options.vertices[i + 0], options.vertices[i + 1], options.vertices[i + 2])
      );
    }

    for (let i = 0; i < options.vertices.length; i += 3) {
      indexesArray.push_back(
        new Gfx3Jolt.IndexedTriangle(options.indexes[i + 0], options.indexes[i + 1], options.indexes[i + 2], 0)
      );
    }

    const m = new Gfx3Jolt.PhysicsMaterialList();
    const settings = new Gfx3Jolt.MeshShapeSettings(vertexArray, indexesArray, m);
    const result = settings.Create();

    if (result.HasError()) {
      throw new Error('Gfx3JoltManager::addPolygonShape(): Error during generation.' + result.GetError());
    }

    const shape = result.Get();
    const entity = this.addEntity(shape, options);
    return entity;
  }

  addEntity(shape: Jolt.Shape, options: Gfx3JoltCreatePrimitiveOptions = {}): Gfx3JoltEntity {
    const pos = new Gfx3Jolt.RVec3(options.x ?? 0, options.y ?? 0, options.z ?? 0);
    const rot = options.rotation ?? Gfx3Jolt.Quat.prototype.sIdentity();
    const creationSettings = new Gfx3Jolt.BodyCreationSettings(shape, pos, rot, options.motionType ?? Gfx3Jolt.EMotionType_Static, options.layer ?? JOLT_LAYER_NON_MOVING);

    if (options.settings) {
      creationSettings.mFriction = options.settings.mFriction ?? 0.1;
      creationSettings.mRestitution = options.settings.mRestitution ?? 0.0;
      creationSettings.mOverrideMassProperties = options.settings.mOverrideMassProperties ?? Gfx3Jolt.EOverrideMassProperties_CalculateInertia;
      creationSettings.mMassPropertiesOverride.mMass = options.settings.mMassPropertiesOverride ?? 1;
      creationSettings.mAngularDamping = options.settings.mAngularDamping ?? 0.0;
    }

    const body = this.bodyInterface.CreateBody(creationSettings);
    body.SetUserData(options.meta);
    Gfx3Jolt.destroy(creationSettings);

    const bodyId = body.GetID().GetIndex();
    const entity = { type: 'primitive', bodyId: bodyId, body: body, color: options.color ?? [0, 1, 0], meta: options.meta };
    this.bodyInterface.AddBody(body.GetID(), Gfx3Jolt.EActivation_Activate);
    
    this.entitiesMap.set(bodyId, entity);
    this.entities.push(entity);
    return entity;
  }

  get(bodyId: number): Gfx3JoltEntity | undefined {
    return this.entitiesMap.get(bodyId);
  }

  getMeta(bodyId: number): any {
    const e = this.entitiesMap.get(bodyId);
    if (!e) {
      return undefined;
    }

    return e.meta;
  }

  remove(bodyId: number) {
    const e = this.entitiesMap.get(bodyId);
    if (!e) {
      return;
    }

    const id = e.body.GetID();
    this.entitiesMap.delete(bodyId);
    this.entities.splice(this.entities.indexOf(e), 1);
    this.bodyInterface.RemoveBody(id);
    this.bodyInterface.DestroyBody(id);
  }

  clear() {
    for (const e of this.entities) {
      this.remove(e.bodyId);
    }
  }

  update(ts: number): void {
    const clampedDeltaMs = Math.min(ts / 1000, JOLT_MAX_TIMESTEP);

    this.characterManager.update(clampedDeltaMs);
    this.carManager.update(clampedDeltaMs);
    this.motorcycleManager.update(clampedDeltaMs);

    this.inter.Step(clampedDeltaMs, clampedDeltaMs > 1.0 / 55.0 ? 2 : 1);
  }

  draw() {
    if (!this.showDebug) {
      return;
    }

    this.characterManager.draw();
    this.carManager.draw();
    this.motorcycleManager.draw();

    for (const e of this.entities) {
      this.drawShape(e.body.GetShape(), e.body.GetWorldTransform(), e.color);
    }
  }

  createRay(startX: number, startY: number, startZ: number, endX: number, endY: number, endZ: number): Gfx3JoltRayCast {
    let body: Jolt.Body | null = null;
    let rayCastResult: Jolt.RayCastResult | null = null;
    let fraction = Infinity;
    let normal: Jolt.Vec3 | null = null;

    const ray = new Gfx3Jolt.RRayCast();
    ray.mOrigin.Set(startX, startY, startZ);
    ray.mDirection.Set(endX - startX, endY - startY, endZ - startZ);

    const npq = this.system.GetNarrowPhaseQuery();

    // Default Settings
    const raySettings = new Gfx3Jolt.RayCastSettings();
    raySettings.SetBackFaceMode(Gfx3Jolt.EBackFaceMode_IgnoreBackFaces);

    const collector = new Gfx3Jolt.CastRayCollectorJS();
    collector.OnBody = (bodyPtr: number) => {
      body = Gfx3Jolt.wrapPointer(bodyPtr, Gfx3Jolt.Body)
    };

    collector.AddHit = (rayCastResultPtr: number) => {
      rayCastResult = Gfx3Jolt.wrapPointer(rayCastResultPtr, Gfx3Jolt.RayCastResult);
      fraction = rayCastResult.mFraction;

      if (body) {
        normal = body.GetTransformedShape().GetWorldSpaceSurfaceNormal(rayCastResult.mSubShapeID2, ray.GetPointOnRay(rayCastResult.mFraction));
      }
    };

    npq.CastRay(ray, raySettings, collector, this.raycastBPFilter, this.raycastObjectFilter, this.raycastBodyFilter, this.raycastShapeFilter);

    return {
      body: body,
      normal: normal,
      result: rayCastResult,
      fraction: fraction
    };
  }

  setShowDebug(showDebug: boolean): void {
    this.showDebug = showDebug;
  }

  get cars() {
    return this.carManager;
  }

  get motorcycles() {
    return this.motorcycleManager;
  }

  get characters() {
    return this.characterManager;
  }

  drawShape(shape: Jolt.Shape, matrix: Jolt.RMat44, color: vec3 = [0, 1, 0]) {
    let vertexCount = 0;
    const finalVertices = [];

    // Get triangle data
    const scale = new Gfx3Jolt.Vec3(1, 1, 1);
    const triContext = new Gfx3Jolt.ShapeGetTriangles(shape, Gfx3Jolt.AABox.prototype.sBiggest(), shape.GetCenterOfMass(), Gfx3Jolt.Quat.prototype.sIdentity(), scale);
    Gfx3Jolt.destroy(scale);

    // Get a view on the triangle data (does not make a copy)
    const vertices = new Float32Array(Gfx3Jolt.HEAPF32.buffer, triContext.GetVerticesData(), triContext.GetVerticesSize() / Float32Array.BYTES_PER_ELEMENT);

    // Now move the triangle data to a buffer and clone it so that we can free the memory from the C++ heap (which could be limited in size)
    for (let i = 0; i < vertices.length / 3; i += 3) {
      const v0 = [vertices[i * 3 + 0], vertices[i * 3 + 1], vertices[i * 3 + 2]];
      const v1 = [vertices[i * 3 + 3], vertices[i * 3 + 4], vertices[i * 3 + 5]];
      const v2 = [vertices[i * 3 + 6], vertices[i * 3 + 7], vertices[i * 3 + 8]];

      finalVertices.push(...v0, color[0], color[1], color[2]);
      finalVertices.push(...v1, color[0], color[1], color[2]);

      finalVertices.push(...v1, color[0], color[1], color[2]);
      finalVertices.push(...v2, color[0], color[1], color[2]);

      finalVertices.push(...v2, color[0], color[1], color[2]);
      finalVertices.push(...v0, color[0], color[1], color[2]);
      vertexCount += 6;
    }

    Gfx3Jolt.destroy(triContext);

    gfx3DebugRenderer.drawVertices(finalVertices, vertexCount, [
      matrix.GetColumn4(0).GetX(), matrix.GetColumn4(0).GetY(), matrix.GetColumn4(0).GetZ(), matrix.GetColumn4(0).GetW(),
      matrix.GetColumn4(1).GetX(), matrix.GetColumn4(1).GetY(), matrix.GetColumn4(1).GetZ(), matrix.GetColumn4(1).GetW(),
      matrix.GetColumn4(2).GetX(), matrix.GetColumn4(2).GetY(), matrix.GetColumn4(2).GetZ(), matrix.GetColumn4(2).GetW(),
      matrix.GetColumn4(3).GetX(), matrix.GetColumn4(3).GetY(), matrix.GetColumn4(3).GetZ(), matrix.GetColumn4(3).GetW()
    ]);
  }

  drawCylinder(shape: Jolt.CylinderShape, matrix: Jolt.RMat44, color: vec3 = [0, 1, 0]) {
    const segments = 16; // Qualité du cercle, 16 est un bon début
    const radius = shape.GetRadius();
    const halfHeight = shape.GetHalfHeight();
    const vertices = [];
    const topPoints = [];
    const bottomPoints = [];

    // Générer les points pour les cercles du haut et du bas
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      topPoints.push([x, halfHeight, z]);
      bottomPoints.push([x, -halfHeight, z]);
    }

    // Dessiner les cercles et les parois
    for (let i = 0; i < segments; i++) {
      const next_i = (i + 1) % segments;

      // Parois latérales
      vertices.push(...topPoints[i], ...color, ...topPoints[next_i], ...color);
      vertices.push(
        ...bottomPoints[i],
        ...color,
        ...bottomPoints[next_i],
        ...color
      );
      vertices.push(...topPoints[i], ...color, ...bottomPoints[i], ...color);
    }

    gfx3DebugRenderer.drawVertices(vertices, segments * 3 * 2, [
      matrix.GetColumn4(0).GetX(), matrix.GetColumn4(0).GetY(), matrix.GetColumn4(0).GetZ(), matrix.GetColumn4(0).GetW(),
      matrix.GetColumn4(1).GetX(), matrix.GetColumn4(1).GetY(), matrix.GetColumn4(1).GetZ(), matrix.GetColumn4(1).GetW(),
      matrix.GetColumn4(2).GetX(), matrix.GetColumn4(2).GetY(), matrix.GetColumn4(2).GetZ(), matrix.GetColumn4(2).GetW(),
      matrix.GetColumn4(3).GetX(), matrix.GetColumn4(3).GetY(), matrix.GetColumn4(3).GetZ(), matrix.GetColumn4(3).GetW()
    ]);
  }

  #setupCollisionFiltering(settings: Jolt.JoltSettings) {
    // Layer that objects can be in, determines which other objects it can collide with
    // Typically you at least want to have 1 layer for moving bodies and 1 layer for static bodies, but you can have more
    // layers if you want. E.g. you could have a layer for high detail collision (which is not used by the physics simulation
    // but only if you do collision testing).
    const objectFilter = new Gfx3Jolt.ObjectLayerPairFilterTable(JOLT_NUM_OBJECT_LAYERS);
    objectFilter.EnableCollision(JOLT_LAYER_NON_MOVING, JOLT_LAYER_MOVING);
    objectFilter.EnableCollision(JOLT_LAYER_MOVING, JOLT_LAYER_MOVING);

    // Each broadphase layer results in a separate bounding volume tree in the broad phase. You at least want to have
    // a layer for non-moving and moving objects to avoid having to update a tree full of static objects every frame.
    // You can have a 1-on-1 mapping between object layers and broadphase layers (like in this case) but if you have
    // many object layers you'll be creating many broad phase trees, which is not efficient.
    const BP_LAYER_NON_MOVING = new Gfx3Jolt.BroadPhaseLayer(0);
    const BP_LAYER_MOVING = new Gfx3Jolt.BroadPhaseLayer(1);
    const NUM_BROAD_PHASE_LAYERS = 2;
    const bpInterface = new Gfx3Jolt.BroadPhaseLayerInterfaceTable(JOLT_NUM_OBJECT_LAYERS, NUM_BROAD_PHASE_LAYERS);
    bpInterface.MapObjectToBroadPhaseLayer(JOLT_LAYER_NON_MOVING, BP_LAYER_NON_MOVING);
    bpInterface.MapObjectToBroadPhaseLayer(JOLT_LAYER_MOVING, BP_LAYER_MOVING);

    settings.mObjectLayerPairFilter = objectFilter;
    settings.mBroadPhaseLayerInterface = bpInterface;
    settings.mObjectVsBroadPhaseLayerFilter = new Gfx3Jolt.ObjectVsBroadPhaseLayerFilterTable(settings.mBroadPhaseLayerInterface, NUM_BROAD_PHASE_LAYERS, settings.mObjectLayerPairFilter, JOLT_NUM_OBJECT_LAYERS);
  }
}

const gfx3JoltManager = new Gfx3JoltManager();
export { Gfx3JoltManager };
export { gfx3JoltManager };
export { Gfx3Jolt };
export { Jolt };