import { gfx3JoltManager, JOLT_LAYER_NON_MOVING, Gfx3Jolt, JOLT_LAYER_MOVING } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { UT } from '@lib/core/utils';
import { Quaternion } from '@lib/core/quaternion';
import { createBoxMesh, createTerrainMesh, generateHeightmapCanvas } from './GameUtils';

export class Environment {
  floor: Gfx3Mesh;
  static meshesInitialized = false;
  static qMat = new Quaternion();
  
  static wallBaseN: Gfx3Mesh;
  static wallBaseS: Gfx3Mesh;
  static wallBaseE: Gfx3Mesh;
  static wallBaseW: Gfx3Mesh;
  
  static treeTrunk: Gfx3Mesh;
  static treeLeaves: Gfx3Mesh;
  static building: Gfx3Mesh;
  static sandWall: Gfx3Mesh;
  static crateMesh: Gfx3Mesh;
  static cloudMesh: Gfx3Mesh;
  
  decorations: { type: string, pos: vec3, scale: vec3 }[] = [];
  clouds: { pos: vec3, scale: vec3, nextX: number }[] = [];

  constructor() {
    if (!Environment.meshesInitialized) {
      Environment.wallBaseN = createBoxMesh(400, 40, 20, [0.3, 0.4, 0.3]);
      Environment.wallBaseS = createBoxMesh(400, 40, 20, [0.3, 0.4, 0.3]);
      Environment.wallBaseE = createBoxMesh(20, 40, 400, [0.3, 0.4, 0.3]);
      Environment.wallBaseW = createBoxMesh(20, 40, 400, [0.3, 0.4, 0.3]);
      
      Environment.treeTrunk = createBoxMesh(1, 1, 1, [0.4, 0.25, 0.1]); // 1x1x1 scaled
      Environment.treeLeaves = createBoxMesh(1, 1, 1, [0.2, 0.6, 0.1]); 
      Environment.building = createBoxMesh(1, 1, 1, [0.55, 0.55, 0.6]); 
      Environment.sandWall = createBoxMesh(1, 1, 1, [0.6, 0.55, 0.45]);
      Environment.crateMesh = createBoxMesh(2, 2, 2, [0.6, 0.4, 0.2]); // Fix size to map physics
      Environment.cloudMesh = createBoxMesh(1, 1, 1, [0.9, 0.9, 0.95]); 
      
      Environment.meshesInitialized = true;
    }

    const canvas = generateHeightmapCanvas(256, 256);
    const terrainData = createTerrainMesh(400, 400, 32, 32, [0.25, 0.45, 0.2], canvas);
    this.floor = terrainData.mesh;
    
    const indexesArray = new Gfx3Jolt.IndexedTriangleList();
    const vertexArray = new Gfx3Jolt.VertexList();

    for (let i = 0; i < terrainData.vertices.length; i += 3) {
      vertexArray.push_back(
        new Gfx3Jolt.Float3(terrainData.vertices[i + 0], terrainData.vertices[i + 1], terrainData.vertices[i + 2])
      );
    }

    for (let i = 0; i < terrainData.indexes.length; i += 3) {
      indexesArray.push_back(
        new Gfx3Jolt.IndexedTriangle(terrainData.indexes[i + 0], terrainData.indexes[i + 1], terrainData.indexes[i + 2], 0)
      );
    }

    const m = new Gfx3Jolt.PhysicsMaterialList();
    const settings = new Gfx3Jolt.MeshShapeSettings(vertexArray, indexesArray, m);
    const result = settings.Create();

    if (!result.HasError()) {
       gfx3JoltManager.addEntity(result.Get(), {
         x: 0, y: 0, z: 0,
         motionType: Gfx3Jolt.EMotionType_Static,
         layer: JOLT_LAYER_NON_MOVING
       });
    } else {
       console.error("Terrain collision generation failed:", result.GetError());
    }

    // Generate mountains/walls at the edges
    const mapSize = 400;
    const borderThickness = 20;
    const borderHeight = 40;
    
    // North wall
    this.decorations.push({ type: 'wallN', pos: [0, borderHeight / 2 - 1, -mapSize / 2], scale: [1,1,1]});
    gfx3JoltManager.addBox({
        width: mapSize, height: borderHeight, depth: borderThickness,
        x: 0, y: borderHeight / 2 - 1, z: -mapSize / 2,
        motionType: Gfx3Jolt.EMotionType_Static,
        layer: JOLT_LAYER_NON_MOVING
    });

    // South wall
    this.decorations.push({ type: 'wallS', pos: [0, borderHeight / 2 - 1, mapSize / 2], scale: [1,1,1]});
    gfx3JoltManager.addBox({
        width: mapSize, height: borderHeight, depth: borderThickness,
        x: 0, y: borderHeight / 2 - 1, z: mapSize / 2,
        motionType: Gfx3Jolt.EMotionType_Static,
        layer: JOLT_LAYER_NON_MOVING
    });

    // East wall
    this.decorations.push({ type: 'wallE', pos: [mapSize / 2, borderHeight / 2 - 1, 0], scale: [1,1,1]});
    gfx3JoltManager.addBox({
        width: borderThickness, height: borderHeight, depth: mapSize,
        x: mapSize / 2, y: borderHeight / 2 - 1, z: 0,
        motionType: Gfx3Jolt.EMotionType_Static,
        layer: JOLT_LAYER_NON_MOVING
    });

    // West wall
    this.decorations.push({ type: 'wallW', pos: [-mapSize / 2, borderHeight / 2 - 1, 0], scale: [1,1,1]});
    gfx3JoltManager.addBox({
        width: borderThickness, height: borderHeight, depth: mapSize,
        x: -mapSize / 2, y: borderHeight / 2 - 1, z: 0,
        motionType: Gfx3Jolt.EMotionType_Static,
        layer: JOLT_LAYER_NON_MOVING
    });

    // Generate cityscape / buildings / trees
    for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 350;
        const z = (Math.random() - 0.5) * 350;
        
        // Clear space near spawn
        if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
        
        const type = Math.random();
        
        if (type < 0.4) {
            // Tree
            const trunkHeight = 2 + Math.random() * 2;
            this.decorations.push({ type: 'trunk', pos: [x, trunkHeight / 2, z], scale: [0.8, trunkHeight, 0.8] });
            
            // Leaves
            const leavesHeight = 3 + Math.random() * 2;
            const leavesSize = 3 + Math.random();
            this.decorations.push({ type: 'leaves', pos: [x, trunkHeight + leavesHeight / 2 - 0.5, z], scale: [leavesSize, leavesHeight, leavesSize] });
            
            gfx3JoltManager.addBox({
                width: 1.5, height: 10, depth: 1.5,
                x, y: 5, z,
                motionType: Gfx3Jolt.EMotionType_Static,
                layer: JOLT_LAYER_NON_MOVING
            });
        } else if (type < 0.7) {
            // Building
            const width = 10 + Math.random() * 15;
            const depth = 10 + Math.random() * 15;
            const height = 10 + Math.random() * 25;
            this.decorations.push({ type: 'building', pos: [x, height / 2, z], scale: [width, height, depth] });
            
            gfx3JoltManager.addBox({
                width, height, depth,
                x, y: height / 2, z,
                motionType: Gfx3Jolt.EMotionType_Static,
                layer: JOLT_LAYER_NON_MOVING
            });
        } else {
            // Random Wall / Obstacle
            const width = 5 + Math.random() * 10;
            const depth = 2 + Math.random() * 3;
            const height = 3 + Math.random() * 5;
            const isRotated = Math.random() > 0.5;
            
            const wallW = isRotated ? depth : width;
            const wallD = isRotated ? width : depth;
            
            this.decorations.push({ type: 'sandWall', pos: [x, height / 2, z], scale: [wallW, height, wallD] });
            
            gfx3JoltManager.addBox({
                width: wallW, height, depth: wallD,
                x, y: height / 2, z,
                motionType: Gfx3Jolt.EMotionType_Static,
                layer: JOLT_LAYER_NON_MOVING
            });
        }
    }
    
    this.initBatch();
    gfx3JoltManager.system.OptimizeBroadPhase();

    // Add clouds
    for (let i = 0; i < 20; i++) {
        const cx = (Math.random() - 0.5) * 400;
        const cy = 40 + Math.random() * 20;
        const cz = (Math.random() - 0.5) * 400;
        const cw = 15 + Math.random() * 20;
        const ch = 4 + Math.random() * 4;
        const cd = 10 + Math.random() * 15;
        this.clouds.push({ pos: [cx, cy, cz], nextX: cx, scale: [cw, ch, cd] });
    }
  }

  batch: Gfx3Mesh | null = null;

  async initBatch() {
    const geos: { geo: any, matrix: mat4 }[] = [];
    const ZERO: vec3 = [0,0,0];
    const Q = new Quaternion();
    const { createBoxGeo, combineGeos } = await import('./GameUtils');

    for (const dec of this.decorations) {
        let geo: any;
        if (dec.type === 'trunk') geo = createBoxGeo(1, 1, 1, [0.4, 0.25, 0.1]);
        else if (dec.type === 'leaves') geo = createBoxGeo(1, 1, 1, [0.2, 0.6, 0.1]);
        else if (dec.type === 'building') geo = createBoxGeo(1, 1, 1, [0.55, 0.55, 0.6]);
        else if (dec.type === 'wallN' || dec.type === 'wallS') geo = createBoxGeo(400, 40, 20, [0.3, 0.4, 0.3]);
        else if (dec.type === 'wallE' || dec.type === 'wallW') geo = createBoxGeo(20, 40, 400, [0.3, 0.4, 0.3]);
        else geo = createBoxGeo(1, 1, 1, [0.6, 0.55, 0.45]);
        
        const mat = UT.MAT4_TRANSFORM(dec.pos, ZERO, dec.type.includes('wall') ? [1,1,1] : dec.scale, Q);
        geos.push({ geo, matrix: mat });
    }

    this.batch = combineGeos(geos);
  }
  
  update(ts: number) {
      // Animate clouds
      for (const cloud of this.clouds) {
          cloud.nextX += (ts / 1000) * 5; // Move slightly in X
          if (cloud.nextX > 200) {
              cloud.nextX = -200; // loop back
          }
      }
  }

  draw(cameraPos: vec3) {
    this.floor.draw();
    
    if (this.batch) {
        this.batch.draw();
    }
    
    for (const cloud of this.clouds) {
        const ZERO: vec3 = [0,0,0];
        const mat = UT.MAT4_TRANSFORM([cloud.nextX, cloud.pos[1], cloud.pos[2]], ZERO, cloud.scale, Environment.qMat);
        gfx3MeshRenderer.drawMesh(Environment.cloudMesh, mat);
    }
  }
}
