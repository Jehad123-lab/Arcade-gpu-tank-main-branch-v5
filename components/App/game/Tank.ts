import { gfx3JoltManager, Gfx3Jolt } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { createBoxMesh, createUnitBoxMesh } from './GameUtils';
import { Gfx3JoltCar } from '@lib/gfx3_jolt/gfx3_jolt_car_manager';

/**
 * The Tank class represents the player-controlled vehicle.
 * Now using Gfx3JoltCar for advanced vehicle physics and controls.
 */
export class Tank {
  static hpGreen: Gfx3Mesh;
  static hpRed: Gfx3Mesh;
  static hpInit: boolean = false;

  body: Gfx3Mesh;
  turret: Gfx3Mesh;
  barrel: Gfx3Mesh;
  trackL: Gfx3Mesh;
  trackR: Gfx3Mesh;
  engine: Gfx3Mesh;
  hatch: Gfx3Mesh;
  antenna: Gfx3Mesh;
  
  physicsCar: Gfx3JoltCar;
  
  speed: number = 0;
  rotation: number = 0;
  shellRecoil: number = 0;
  grenadeRecoil: number = 0;
  turretYaw: number = 0;
  barrelPitch: number = 0;
  hp: number = 100;
  recoil: number = 0;

  static initHPMeshes() {
    if (Tank.hpInit) return;
    Tank.hpGreen = createUnitBoxMesh([0, 1, 0]);
    Tank.hpRed = createUnitBoxMesh([1, 0, 0]);
    Tank.hpInit = true;
  }
  
  constructor() {
    Tank.initHPMeshes();
    const chassisColor: [number, number, number] = [0.4, 0.5, 0.3];
    const turretColor: [number, number, number] = [0.35, 0.45, 0.25];
    const trackColor: [number, number, number] = [0.15, 0.15, 0.15];
    const engineColor: [number, number, number] = [0.2, 0.2, 0.2];

    // Initial placeholders until JSM models load
    this.body = createBoxMesh(2.25, 0.9, 3.3, chassisColor);
    this.turret = createBoxMesh(1.65, 0.75, 1.65, turretColor);
    this.barrel = createBoxMesh(0.3, 0.3, 2.25, [0.2, 0.2, 0.2]);
    this.trackL = createBoxMesh(0.6, 0.9, 3.6, trackColor);
    this.trackR = createBoxMesh(0.6, 0.9, 3.6, trackColor);
    this.engine = createBoxMesh(1.8, 0.6, 0.9, engineColor);
    this.hatch = createBoxMesh(0.6, 0.15, 0.6, [0.15, 0.15, 0.15]);
    this.antenna = createBoxMesh(0.05, 1.5, 0.05, [0.1, 0.1, 0.1]);

    // Use Advanced Jolt Car Physics
    this.physicsCar = gfx3JoltManager.cars.add({
      x: 0, 
      y: 5.0, 
      z: 0,
      size: [2.5, 0.8, 3.8],
      mass: 4500, // Heavy tank
      maxEngineTorque: 4000, 
      wheelRadius: 0.5,
      wheelWidth: 0.35,
      wheelOffsetHorizontal: 1.45,
      wheelOffsetVertical: 0.3,
      maxSteerAngle: 30, // Steerable like a car
      suspensionMaxLength: 0.4,
      suspensionMinLength: 0.1,
      fourWheelDrive: true,
      airResistance: 0.15,
      rollingResistance: 0.1,
      friction: 1.8
    });
  }

  /**
   * Loads high-fidelity JSM models for the tank components.
   */
  async load() {
    const bodyJSM = new Gfx3MeshJSM();
    const turretJSM = new Gfx3MeshJSM();
    const barrelJSM = new Gfx3MeshJSM();

    try {
      await Promise.all([
        bodyJSM.loadFromFile('models/tank_body.jsm'),
        turretJSM.loadFromFile('models/tank_turret.jsm'),
        barrelJSM.loadFromFile('models/tank_barrel.jsm')
      ]);

      this.body = bodyJSM;
      this.turret = turretJSM;
      this.barrel = barrelJSM;
    } catch (e) {
      console.warn('Failed to load JSM models, falling back to procedural boxes.', e);
    }
  }

  /**
   * Updates physics and syncs mesh transforms.
   */
  update(ts: number, moveDir: { x: number, y: number }, fireNormal: boolean, fireGrenade: boolean, aimYaw: number = 0, aimPitch: number = 0): { normal: boolean, grenade: boolean, muzzlePos: vec3, muzzleDir: vec3 } {
    let didShootNormal = false;
    let didShootGrenade = false;

    // Apply Inputs to Jolt Car Manager
    // Forward/Backward
    this.physicsCar.inputForwardPressed = moveDir.y > 0.1;
    this.physicsCar.inputBackwardPressed = moveDir.y < -0.1;
    // LEFT/RIGHT corresponds to Steering
    this.physicsCar.inputLeftPressed = moveDir.x < -0.1;
    this.physicsCar.inputRightPressed = moveDir.x > 0.1;

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
    
    // Physics State
    const pos = this.physicsCar.body.GetPosition();
    const rot = this.physicsCar.body.GetRotation();
    const q = new Quaternion(rot.GetW(), rot.GetX(), rot.GetY(), rot.GetZ());
    const forward = q.rotateVector([0, 0, -1]);

    // Speed for UI
    const vel = this.physicsCar.body.GetLinearVelocity();
    this.speed = Math.sqrt(vel.GetX()**2 + vel.GetZ()**2);
    
    // Current base rotation (yaw) for turret calculation
    this.rotation = Math.atan2(forward[0], -forward[2]);

    // --- SYNC VISUALS ---
    const visualOrigin: vec3 = [pos.GetX(), pos.GetY(), pos.GetZ()];
    
    // RECOIL CALCULATION (Sharp kick)
    const bodyRecoilOffset = this.recoil * -0.25; 
    const finalVisualOrigin: vec3 = [
        visualOrigin[0] + forward[0] * bodyRecoilOffset,
        visualOrigin[1] - 0.45, // Adjust for center of mass and suspension
        visualOrigin[2] + forward[2] * bodyRecoilOffset
    ];

    const bodyMatrix = UT.MAT4_TRANSFORM(finalVisualOrigin, [0, 0, 0], [1, 1, 1], q);
    this.recoil = UT.LERP(this.recoil, 0, 8.0 * (ts / 1000));
    
    this.body.enableManualTransform(bodyMatrix);

    const syncRigid = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSFORM(localPos, [0, 0, 0], [1, 1, 1], new Quaternion());
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(bodyMatrix, localMatrix));
    };

    syncRigid(this.trackL, [-1.425, -0.1, 0]);
    syncRigid(this.trackR, [1.425, -0.1, 0]);
    syncRigid(this.engine, [0, 0.3, 1.8]);

    // INDEPENDENT TURRET (Matches Camera Yaw)
    this.turretYaw = aimYaw - this.rotation;
    const localYawQ = Quaternion.createFromEuler(this.turretYaw, 0, 0, 'YXZ');
    
    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.72, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4());
    this.turret.enableManualTransform(turretMatrix);
 
    // BARREL PITCH (Matches Camera Pitch)
    this.barrelPitch = -aimPitch; 
    this.barrelPitch = Math.max(-0.5, Math.min(1.0, this.barrelPitch));
    const pitchQ = Quaternion.createFromEuler(0, this.barrelPitch, 0, 'YXZ');

    const barrelRecoilVis = Math.max(this.shellRecoil * 0.7, this.grenadeRecoil * 0.4);
    const barrelBaseMatrix = UT.MAT4_MULTIPLY(turretMatrix, UT.MAT4_TRANSLATE(0, 0.08, 0));
    const barrelRotMatrix = UT.MAT4_MULTIPLY(barrelBaseMatrix, pitchQ.toMatrix4());
    const barrelMatrix = UT.MAT4_MULTIPLY(barrelRotMatrix, UT.MAT4_TRANSLATE(0, 0, -1.125 + barrelRecoilVis));
    this.barrel.enableManualTransform(barrelMatrix);
    
    this.shellRecoil = UT.LERP(this.shellRecoil, 0, 10.0 * (ts / 1000));
    this.grenadeRecoil = UT.LERP(this.grenadeRecoil, 0, 10.0 * (ts / 1000));
    
    const syncToTurret = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSLATE(localPos[0], localPos[1], localPos[2]);
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(turretMatrix, localMatrix));
    };

    syncToTurret(this.hatch, [0, 0.45, 0.3]);
    syncToTurret(this.antenna, [-0.6, 1.1, 0.6]);

    // Muzzle Logic
    const muzzleLocalPos: vec4 = new Float32Array([0, 0, -1.15, 1]);
    const muzzleWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelMatrix, muzzleLocalPos);
    const muzzleWorldPos: vec3 = [muzzleWorldPosVec4[0], muzzleWorldPosVec4[1], muzzleWorldPosVec4[2]];
    
    const tipLocalPos: vec4 = new Float32Array([0, 0, -2.0, 1]);
    const tipWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelMatrix, tipLocalPos);
    const tipWorldPos: vec3 = [tipWorldPosVec4[0], tipWorldPosVec4[1], tipWorldPosVec4[2]];
    
    const muzzleWorldDir = UT.VEC3_NORMALIZE([
        tipWorldPos[0] - muzzleWorldPos[0],
        tipWorldPos[1] - muzzleWorldPos[1],
        tipWorldPos[2] - muzzleWorldPos[2]
    ]);

    // Teleport out of bounds
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
  
  draw(cameraYaw: number = 0) {
    this.body.draw();
    this.trackL.draw();
    this.trackR.draw();
    this.engine.draw();
    this.turret.draw();
    this.barrel.draw();
    this.hatch.draw();
    this.antenna.draw();
  }

  drawHealthBar(origin: vec3, hp: number, maxHp: number, cameraYaw: number = 0) {
      const hpPercentage = Math.max(0, hp / maxHp);
      const barMesh = hpPercentage > 0.5 ? Tank.hpGreen : Tank.hpRed;
      const barWidth = 1.5;
      const barHeight = 0.2;
      const barDepth = 0.2;
      const scaleX = barWidth * hpPercentage;
      const barRotation = Quaternion.createFromEuler(cameraYaw, 0, 0, 'YXZ');
      const offsetLocal = [-(barWidth - scaleX) / 2, 0, 0] as vec3;
      const offsetWorld = barRotation.rotateVector(offsetLocal);
      
      const matBar = UT.MAT4_TRANSFORM(
          [origin[0] + offsetWorld[0], origin[1] + 3.0, origin[2] + offsetWorld[2]], 
          [0, 0, 0], 
          [scaleX, barHeight, barDepth], 
          barRotation
      );
      
      gfx3MeshRenderer.drawMesh(barMesh, matBar);
  }
}
