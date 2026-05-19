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
  muzzlePos: vec3 = [0, 0, 0];
  muzzleDir: vec3 = [0, 0, -1];
  tipPos: vec3 = [0, 0, 0];

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
    // Orientation: Z+ is Front, X+ is Right.
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
      size: [2.8, 1.2, 4.0],
      mass: 30000, 
      maxEngineTorque: 250000, 
      clutchStrength: 200.0,
      wheelRadius: 0.55,
      wheelWidth: 0.6,
      wheelOffsetHorizontal: 1.4,
      wheelOffsetVertical: 0.4,
      maxSteerAngle: 25, 
      suspensionMaxLength: 0.25,
      suspensionMinLength: 0.1,
      fourWheelDrive: true,
      airResistance: 0.8, 
      rollingResistance: 1.2, 
      friction: 15.0 
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
  update(ts: number, moveDir: { x: number, y: number }, fireNormal: boolean, fireGrenade: boolean, aimYaw: number = 0, aimPitch: number = 0): { normal: boolean, grenade: boolean, muzzlePos: vec3, muzzleDir: vec3, muzzleQuat: Quaternion } {
    let didShootNormal = false;
    let didShootGrenade = false;

    // Apply Inputs to Jolt Car Manager
    // Forward/Backward
    this.physicsCar.inputForwardPressed = moveDir.y > 0.1;
    this.physicsCar.inputBackwardPressed = moveDir.y < -0.1;
    // LEFT/RIGHT corresponds to Steering
    this.physicsCar.inputLeftPressed = moveDir.x < -0.1;
    this.physicsCar.inputRightPressed = moveDir.x > 0.1;

    if (fireNormal && this.shellRecoil < 0.05) {
      this.shellRecoil = 1.0;
      didShootNormal = true;
      this.recoil = 1.0; 
    }

    if (fireGrenade && this.grenadeRecoil < 0.05) {
      this.grenadeRecoil = 1.0;
      didShootGrenade = true;
      this.recoil = 1.8; 
    }

    this.shellRecoil = Math.max(0, this.shellRecoil - (ts / 1000) * 8.0);
    this.grenadeRecoil = Math.max(0, this.grenadeRecoil - (ts / 1000) * 2.5);
    this.recoil = Math.max(0, this.recoil - (ts / 1000) * 12.0);

    // Physics State
    const pos = this.physicsCar.body.GetPosition();
    const rot = this.physicsCar.body.GetRotation();
    const q = new Quaternion(rot.GetW(), rot.GetX(), rot.GetY(), rot.GetZ());
    
    // Physics Forward is Z+
    const forwardVec = q.rotateVector([0, 0, 1]); 

    // Speed for UI
    const vel = this.physicsCar.body.GetLinearVelocity();
    this.speed = Math.sqrt(vel.GetX()**2 + vel.GetZ()**2);

    // Current base rotation (yaw) for turret calculation
    // Since physics is Z+ forward, we use atan2(x, z)
    this.rotation = Math.atan2(forwardVec[0], forwardVec[2]);

    // Stationary Turning Logic (Simulate Tracks)
    if (Math.abs(moveDir.x) > 0.1 && this.speed < 5.0) {
        const turnSpeed = 2.5 * -moveDir.x;
        this.physicsCar.body.SetAngularVelocity(new Gfx3Jolt.Vec3(0, turnSpeed, 0));
    }

    // --- SYNC VISUALS ---
    const visualOrigin: vec3 = [pos.GetX(), pos.GetY(), pos.GetZ()];
    
    // RECOIL CALCULATION (Sharp kick)
    const bodyRecoilOffset = this.recoil * -0.25; 
    const finalVisualOrigin: vec3 = [
        visualOrigin[0] + forwardVec[0] * bodyRecoilOffset,
        visualOrigin[1] - 0.45, // Adjusted for 30-ton weight and wheel offset
        visualOrigin[2] + forwardVec[2] * bodyRecoilOffset
    ];

    // Tank mesh components facing Z- will point at Z+ after this rotation
    // This aligns visual and physical "Front".
    const visualRotation = q.mul(0, 0, 1, 0); 
    const bodyMatrix = UT.MAT4_TRANSFORM(finalVisualOrigin, [0, 0, 0], [1, 1, 1], visualRotation);
    
    this.body.enableManualTransform(bodyMatrix);

    const syncRigid = (mesh: Gfx3Mesh, localPos: vec3) => {
        // localPos is relative to visual forward (Z-)
        const localMatrix = UT.MAT4_TRANSLATE(localPos[0], localPos[1], localPos[2]);
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(bodyMatrix, localMatrix));
    };

    syncRigid(this.trackL, [-1.425, -0.1, 0]);
    syncRigid(this.trackR, [1.425, -0.1, 0]);
    syncRigid(this.engine, [0, 0.3, 1.8]); // Engine at the back

    // INDEPENDENT TURRET (Matches Camera Yaw)
    // Using CW-based rotation difference converted to CCW for createFromEuler.
    // rotation 0 is North (Z+), aimYaw 0 is South (Z-).
    this.turretYaw = this.rotation - aimYaw - Math.PI;
    const localYawQ = Quaternion.createFromEuler(this.turretYaw, 0, 0, 'YXZ');
    
    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.72, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4());
    this.turret.enableManualTransform(turretMatrix);
 
    // BARREL PITCH (Matches Camera Pitch)
    // Positive pitch is UP in our coordinate system now.
    this.barrelPitch = aimPitch; 
    this.barrelPitch = Math.max(-0.6, Math.min(1.0, this.barrelPitch));
    const pitchQ = Quaternion.createFromEuler(0, this.barrelPitch, 0, 'YXZ');

    const barrelRecoilVis = Math.max(this.shellRecoil * 0.7, this.grenadeRecoil * 0.4);
    const barrelBaseMatrix = UT.MAT4_MULTIPLY(turretMatrix, UT.MAT4_TRANSLATE(0, 0.08, 0));
    const barrelRotMatrix = UT.MAT4_MULTIPLY(barrelBaseMatrix, pitchQ.toMatrix4());
    // Visual barrel points at Z- (forward relative to visual orientation)
    const barrelMatrix = UT.MAT4_MULTIPLY(barrelRotMatrix, UT.MAT4_TRANSLATE(0, 0, -1.125 + barrelRecoilVis));
    this.barrel.enableManualTransform(barrelMatrix);
    
    const syncToTurret = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSLATE(localPos[0], localPos[1], localPos[2]);
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(turretMatrix, localMatrix));
    };

    syncToTurret(this.hatch, [0, 0.45, 0.3]);
    syncToTurret(this.antenna, [-0.6, 1.1, 0.6]);

    // Muzzle Logic (Barrel points at Z-)
    // The barrel model is roughly 2.25m long. We spawn 3.0m from the turret pivot.
    const muzzleRelPos: vec4 = new Float32Array([0, 0, -3.2, 1]); 
    const muzzleWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelRotMatrix, muzzleRelPos);
    this.muzzlePos = [muzzleWorldPosVec4[0], muzzleWorldPosVec4[1], muzzleWorldPosVec4[2]];
    
    // Tip position for precision effects
    const tipRelPos: vec4 = new Float32Array([0, 0, -4.2, 1]);
    const tipWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelRotMatrix, tipRelPos);
    this.tipPos = [tipWorldPosVec4[0], tipWorldPosVec4[1], tipWorldPosVec4[2]];
    
    // Calculate world orientation of the barrel.
    // Combinatory approach: Tank Orientation * Flip * Turret Yaw * Barrel Pitch
    const barrelLocalQ = Quaternion.createFromEuler(this.turretYaw, this.barrelPitch, 0, 'YXZ');
    const barrelWorldQ = visualRotation.mul(barrelLocalQ.w, barrelLocalQ.x, barrelLocalQ.y, barrelLocalQ.z);
    
    const muzzleDirVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelRotMatrix, new Float32Array([0, 0, -1, 0]));
    this.muzzleDir = UT.VEC3_NORMALIZE([muzzleDirVec4[0], muzzleDirVec4[1], muzzleDirVec4[2]]);

    // Teleport out of bounds
    if (pos.GetY() < -20.0) {
        const resetPos = new Gfx3Jolt.RVec3(0, 5.0, 0);
        gfx3JoltManager.bodyInterface.SetPosition(this.physicsCar.body.GetID(), resetPos, Gfx3Jolt.EActivation_Activate);
        gfx3JoltManager.bodyInterface.SetLinearVelocity(this.physicsCar.body.GetID(), new Gfx3Jolt.Vec3(0, 0, 0));
    }
    
    return { 
      normal: didShootNormal, 
      grenade: didShootGrenade,
      muzzlePos: this.muzzlePos,
      muzzleDir: this.muzzleDir,
      muzzleQuat: barrelWorldQ
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

    const pos = this.physicsCar.body.GetPosition();
    this.drawHealthBar([pos.GetX(), pos.GetY(), pos.GetZ()], this.hp, 100, cameraYaw);
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
