import { gfx3JoltManager, Gfx3Jolt } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { Gfx3JoltCar, Gfx3JoltCarOptions } from '@lib/gfx3_jolt/gfx3_jolt_car_manager';
import { UT } from '@lib/core/utils';
import { Quaternion } from '@lib/core/quaternion';
import { createBoxMesh, createCylinderGeo } from './GameUtils';

/**
 * The Car class represents an alternative player-controlled vehicle.
 * It leverages the advanced Gfx3JoltCar vehicle physics for realistic driving.
 */
export class Car {
  body: Gfx3Mesh;
  wheels: Gfx3Mesh[] = [];
  physicsCar: Gfx3JoltCar;
  hp: number = 100;
  speed: number = 0;
  
  // Combat stats
  shellRecoil: number = 0;
  grenadeRecoil: number = 0;
  recoil: number = 0;

  constructor(options: Gfx3JoltCarOptions = {}) {
    const carColor: [number, number, number] = [0.8, 0.1, 0.1]; // Racing Red
    const wheelColor: [number, number, number] = [0.15, 0.15, 0.15];

    // 1. Create Graphics
    this.body = createBoxMesh(2.0, 0.8, 4.2, carColor);
    
    // Create wheel meshes
    const wheelRadius = 0.45;
    const wheelWidth = 0.3;
    for (let i = 0; i < 4; i++) {
       const wMesh = new Gfx3Mesh();
       wMesh.geo = createCylinderGeo(wheelRadius, wheelWidth, 16, wheelColor);
       wMesh.beginVertices(wMesh.geo.vertices.length / 17);
       wMesh.setVertices(wMesh.geo.vertices);
       wMesh.endVertices();
       this.wheels.push(wMesh);
    }

    // 2. Setup Physics Car
    this.physicsCar = gfx3JoltManager.cars.add({
      x: options.x ?? 0,
      y: options.y ?? 5.0,
      z: options.z ?? 0,
      size: [2.0, 0.8, 4.2],
      mass: 1800,
      maxEngineTorque: 3500, // Punchy acceleration
      wheelRadius: wheelRadius,
      wheelWidth: wheelWidth,
      wheelOffsetHorizontal: 1.6,
      wheelOffsetVertical: 0.2,
      maxSteerAngle: 35,
      suspensionMaxLength: 0.3,
      suspensionMinLength: 0.1,
      fourWheelDrive: true,
      airResistance: 0.1,
      rollingResistance: 0.05,
      friction: 1.5,
      ...options
    });
  }

  /**
   * Updates physics inputs and syncs mesh transforms.
   */
  update(ts: number, moveDir: { x: number, y: number }, fireNormal: boolean, fireGrenade: boolean): { normal: boolean, grenade: boolean, muzzlePos: vec3, muzzleDir: vec3 } {
    let didShootNormal = false;
    let didShootGrenade = false;

    // Apply Inputs to Jolt Car
    this.physicsCar.inputForwardPressed = moveDir.y > 0.1;
    this.physicsCar.inputBackwardPressed = moveDir.y < -0.1;
    this.physicsCar.inputLeftPressed = moveDir.x < -0.1;
    this.physicsCar.inputRightPressed = moveDir.x > 0.1;
    this.physicsCar.inputHandBrake = false; // We can add mapping if needed

    // Combat Logic (Car mounted weapons)
    if (fireNormal && this.shellRecoil <= 0) {
      this.shellRecoil = 1.0;
      didShootNormal = true;
      this.recoil = 1.0; 
    }

    if (fireGrenade && this.grenadeRecoil <= 0) {
      this.grenadeRecoil = 1.0;
      didShootGrenade = true;
      this.recoil = 1.8; 
    }

    this.shellRecoil -= (ts / 1000) * 4.5; 
    if (this.shellRecoil < 0) this.shellRecoil = 0;
    this.grenadeRecoil -= (ts / 1000) * 1.5;
    if (this.grenadeRecoil < 0) this.grenadeRecoil = 0;
    
    this.recoil = UT.LERP(this.recoil, 0, 8.0 * (ts / 1000));

    // Get Physics state
    const pos = this.physicsCar.body.GetPosition();
    const rot = this.physicsCar.body.GetRotation();
    const q = new Quaternion(rot.GetW(), rot.GetX(), rot.GetY(), rot.GetZ());
    const forward = q.rotateVector([0, 0, -1]);

    // Speed for UI
    const vel = this.physicsCar.body.GetLinearVelocity();
    this.speed = Math.sqrt(vel.GetX()**2 + vel.GetZ()**2);

    // Sync Chassis Mesh
    const visualOrigin: vec3 = [pos.GetX(), pos.GetY(), pos.GetZ()];
    const bodyMatrix = UT.MAT4_TRANSFORM(visualOrigin, [0, 0, 0], [1, 1, 1], q);
    this.body.enableManualTransform(bodyMatrix);

    // Sync Wheel Meshes
    this.wheels.forEach((mesh, i) => {
        const joltWheel = this.physicsCar.wheels[i];
        if (joltWheel.worldTransform) {
            const wt = joltWheel.worldTransform;
            const mat = UT.MAT4_IDENTITY();
            
            // Jolt RMat44 to Gfx3 Mat4
            // Note: ArcadeGPU stores Mat4 as Array<number> (16)
            for(let row=0; row<4; row++) {
                const r = wt.GetColumn4(row);
                mat[row*4 + 0] = r.GetX();
                mat[row*4 + 1] = r.GetY();
                mat[row*4 + 2] = r.GetZ();
                mat[row*4 + 3] = r.GetW();
            }
            
            // Re-orient cylinder (Jolt cylinder is along Y, we might need Z for wheels depending on creation)
            // our createCylinderGeo creates along Y.
            // Jolt's wheelRight is [0, 1, 0] (Y) and wheelUp is [1, 0, 0] (X).
            // Actually the worldTransform from Jolt already accounts for rotation.
            // But Gfx3 meshes might need a pivot adjustment.
            // Let's rotate 90 deg around Z to lay the cylinder flat if needed.
            const pivot = UT.MAT4_ROTATE_Z(Math.PI / 2);
            mesh.enableManualTransform(UT.MAT4_MULTIPLY(mat, pivot));
        }
    });

    // Muzzle Position (Fixed forward position on roof or hood)
    const muzzleLocalPos: vec4 = new Float32Array([0, 0.4, -2.2, 1]);
    const muzzleWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(bodyMatrix, muzzleLocalPos);
    const muzzleWorldPos: vec3 = [muzzleWorldPosVec4[0], muzzleWorldPosVec4[1], muzzleWorldPosVec4[2]];
    const muzzleWorldDir = forward;

    // Teleport if out of bounds
    if (pos.GetY() < -20.0) {
        const resetPos = new Gfx3Jolt.RVec3(0, 5.0, 0);
        gfx3JoltManager.bodyInterface.SetPosition(this.physicsCar.body.GetID(), resetPos, Gfx3Jolt.EActivation_Activate);
        gfx3JoltManager.bodyInterface.SetLinearVelocity(this.physicsCar.body.GetID(), new Gfx3Jolt.Vec3(0, 0, 0));
    }

    return { 
      normal: didShootNormal, 
      grenade: didShootGrenade,
      muzzlePos: muzzleWorldPos,
      muzzleDir: muzzleWorldDir
    };
  }

  draw() {
    this.body.draw();
    this.wheels.forEach(w => w.draw());
  }
}
