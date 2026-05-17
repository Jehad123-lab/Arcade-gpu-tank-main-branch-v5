import { gfx3JoltManager, JOLT_LAYER_MOVING, Gfx3Jolt } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { createBoxMesh, createUnitBoxMesh } from './GameUtils';

/**
 * The Tank class represents the player-controlled vehicle.
 * It manages multiple mesh components (body, turret, barrel, etc.)
 * and integrates with Jolt Physics for movement.
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
  physicsBody: any;
  velocity: number = 0;
  rotation: number = 0;
  shellRecoil: number = 0;
  grenadeRecoil: number = 0;
  turretYaw: number = 0;
  barrelPitch: number = 0;
  chassisTilt: number = 0;
  wasFiringInternal: boolean = false;
  currentUp: vec3 = [0, 1, 0];
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

    this.physicsBody = gfx3JoltManager.addBox({
      width: 3.45, height: 1.2, depth: 3.6,
      x: 0, y: 2.0, z: 0,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      settings: { 
          mAngularDamping: 2.0, 
          mMassPropertiesOverride: 10000.0,
      }
    });

    // Note: SetCenterOfMass and SetLinearDamping are broken/missing in this version of the library
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
    const moveSpeed = 24.0;
    const reverseSpeed = 12.0;
    const rotSpeed = 110 * (Math.PI / 180); // 110 deg/sec

    let didShootNormal = false;
    let didShootGrenade = false;

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
    
    // 1. CHASSIS MOVEMENT
    let targetVelocity = 0;
    let targetAngularVelY = 0;

    const qPhysics = this.physicsBody.body.GetRotation();
    const currentQuat = new Quaternion(qPhysics.GetW(), qPhysics.GetX(), qPhysics.GetY(), qPhysics.GetZ());
    const currentForward = currentQuat.rotateVector([0, 0, -1]);
    const currentYaw = Math.atan2(-currentForward[0], -currentForward[2]);
    this.rotation = currentYaw; // Sync for other reads

    const throttle = (Math.abs(moveDir.y) < 0.05) ? 0 : moveDir.y;
    let turnInput = (Math.abs(moveDir.x) < 0.05) ? 0 : moveDir.x; // Strict deadzone to prevent veering

    // Standard tank controls: A/D rotates the chassis always in the same direction relative to front
    // But we maintain the inversion for backward movement as it's more intuitive for most players (car style)
    if (throttle < 0) {
        turnInput = -turnInput;
    }

    targetVelocity = throttle > 0 ? throttle * moveSpeed : throttle * reverseSpeed;
    targetAngularVelY = -turnInput * (rotSpeed * (throttle !== 0 ? 1.0 : 1.4)); // Buff turn-in-place speed

    // Heavy physical braking & acceleration feel
    const isBraking = (throttle === 0 && Math.abs(this.velocity) > 0.1) || (throttle > 0 && this.velocity < -0.1) || (throttle < 0 && this.velocity > 0.1);
    const accelRate = throttle !== 0 ? (isBraking ? -15.0 : -6.0) : -8.0;
    const accelAlphaValue = 1.0 - Math.exp(accelRate * (ts / 1000));
    this.velocity = UT.LERP(this.velocity, targetVelocity, accelAlphaValue);

    const currentUpVec = currentQuat.rotateVector([0, 1, 0]);
    
    // 2. CHASSIS TILT (Acceleration-based lurch)
    const acceleration = (targetVelocity - this.velocity);
    const targetTilt = -acceleration * 0.12 * (Math.PI / 180); // Lurch proportional to accel
    this.chassisTilt = UT.LERP(this.chassisTilt, targetTilt, 5.0 * (ts / 1000));
    
    // Softly upright the tank visual-only tilt
    const tiltErrorX = -currentUpVec[2]; 
    const tiltErrorZ = currentUpVec[0];  

    const currentAngVel = this.physicsBody.body.GetAngularVelocity();
    // Faster interpolation for better snap-to-command
    const rotationFixAlpha = throttle !== 0 ? 15.0 : 20.0;
    const newAngY = UT.LERP(currentAngVel.GetY(), targetAngularVelY, 1.0 - Math.exp(-rotationFixAlpha * (ts / 1000)));
    
    // Dampen physical bouncy rotation, apply gentle righting force if on flat ground
    const rightingStrength = Math.max(0, 1.0 - Math.abs(this.velocity) / 40.0) * 12.0;
    const newAngX = currentAngVel.GetX() * 0.6 + tiltErrorX * rightingStrength;
    const newAngZ = currentAngVel.GetZ() * 0.6 + tiltErrorZ * rightingStrength;

    gfx3JoltManager.bodyInterface.SetAngularVelocity(
        this.physicsBody.body.GetID(), 
        new Gfx3Jolt.Vec3(newAngX, newAngY, newAngZ)
    );

    // 3. STRICT LINEAR VELOCITY (Follow chassis forward)
    const currentJoltVel = this.physicsBody.body.GetLinearVelocity();
    const forward = currentQuat.rotateVector([0, 0, -1]); // Chassis forward vector (includes pitch)
    
    // Project speed onto chassis forward
    // On flat ground forward.y is ~0. On slopes it helps climb.
    const newVelX = forward[0] * this.velocity;
    const newVelZ = forward[2] * this.velocity;
    
    // Allow physics to handle vertical motion but add a slight "climb" assist boost from the engine speed
    // This ensures the tank doesn't just stop at ramps.
    const verticalAssist = forward[1] * this.velocity;
    const newVelY = currentJoltVel.GetY() * (Math.abs(verticalAssist) > 0.1 ? 0.5 : 1.0) + verticalAssist;

    gfx3JoltManager.bodyInterface.SetLinearVelocity(
        this.physicsBody.body.GetID(), 
        new Gfx3Jolt.Vec3(newVelX, newVelY, newVelZ)
    );

    const pos = this.physicsBody.body.GetPosition();
    
    // Teleport if out of bounds
    if (pos.GetY() < -20.0) {
        const resetPos = new Gfx3Jolt.RVec3(0, 2.0, 0);
        gfx3JoltManager.bodyInterface.SetPosition(this.physicsBody.body.GetID(), resetPos, Gfx3Jolt.EActivation_Activate);
        gfx3JoltManager.bodyInterface.SetLinearVelocity(this.physicsBody.body.GetID(), new Gfx3Jolt.Vec3(0, 0, 0));
    }

    // --- SYNC VISUALS ---
    const origin: vec3 = [pos.GetX(), pos.GetY() - 0.15, pos.GetZ()];

    // RECOIL CALCULATION
    const recoilImpact = this.recoil > 0 ? Math.sin(Date.now() * 0.1) * this.recoil * 0.02 : 0;
    const bodyRecoilOffset = this.recoil > 0 ? this.recoil * -0.2 : 0; // Push back effect
    const recoilQ = Quaternion.createFromEuler(0, recoilImpact, 0, 'YXZ');
    const tiltQ = Quaternion.createFromEuler(this.chassisTilt, 0, 0, 'YXZ');
    
    // Apply tilt THEN recoil
    const finalVisualQ = currentQuat.mul(tiltQ.w, tiltQ.x, tiltQ.y, tiltQ.z).mul(recoilQ.w, recoilQ.x, recoilQ.y, recoilQ.z);

    // Apply recoil translation to the matrix
    const recoiledOrigin: vec3 = [
        origin[0] + forward[0] * bodyRecoilOffset,
        origin[1],
        origin[2] + forward[2] * bodyRecoilOffset
    ];

    const bodyMatrix = UT.MAT4_TRANSFORM(recoiledOrigin, [0, 0, 0], [1, 1, 1], finalVisualQ);
    this.recoil = UT.LERP(this.recoil, 0, 8.0 * (ts / 1000));
    
    this.body.enableManualTransform(bodyMatrix);

    const syncRigid = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSFORM(localPos, [0, 0, 0], [1, 1, 1], new Quaternion());
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(bodyMatrix, localMatrix));
    };

    syncRigid(this.trackL, [-1.425, -0.15, 0]);
    syncRigid(this.trackR, [1.425, -0.15, 0]);
    syncRigid(this.engine, [0, 0.3, 1.8]);

    // 3. INDEPENDENT TURRET (Aligns to aimYaw)
    let yawDiff = ((aimYaw - this.turretYaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    
    // Traverse feel - Heavy and mechanical
    const turretTraverseSpeed = 2.5;
    this.turretYaw += yawDiff * turretTraverseSpeed * (ts / 1000);
    
    const localYaw = (this.turretYaw - currentYaw);
    const localYawQ = Quaternion.createFromEuler(localYaw, 0, 0, 'YXZ');
    
    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.85, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4());
    this.turret.enableManualTransform(turretMatrix);
 
    // BARREL PITCH (Smoothed)
    const maxDepress = -0.15; 
    const maxElevate = 0.55;
    const targetPitch = Math.max(maxDepress, Math.min(maxElevate, aimPitch));
    this.barrelPitch = UT.LERP(this.barrelPitch, targetPitch, 4.0 * (ts / 1000));
    
    const pitchQ = Quaternion.createFromEuler(0, -this.barrelPitch, 0, 'YXZ');

    const barrelRecoilVis = Math.max(this.shellRecoil * 1.2, this.grenadeRecoil * 0.5);
    const barrelPivotMatrix = UT.MAT4_MULTIPLY(turretMatrix, UT.MAT4_TRANSLATE(0, 0.1, -1.2 + barrelRecoilVis));
    const barrelMatrix = UT.MAT4_MULTIPLY(barrelPivotMatrix, pitchQ.toMatrix4());
    this.barrel.enableManualTransform(barrelMatrix);
    
    const syncToTurret = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSLATE(localPos[0], localPos[1], localPos[2]);
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(turretMatrix, localMatrix));
    };

    syncToTurret(this.hatch, [0, 0.45, 0.3]);
    syncToTurret(this.antenna, [-0.6, 1.1, 0.6]);

    const muzzleLocalPos: vec4 = new Float32Array([0, 0, -1.125, 1]);
    const muzzleWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelMatrix, muzzleLocalPos);
    const muzzleWorldPos: vec3 = [muzzleWorldPosVec4[0], muzzleWorldPosVec4[1], muzzleWorldPosVec4[2]];
    
    const muzzleWorldDirVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelMatrix, new Float32Array([0, 0, -1, 0]));
    const muzzleWorldDir = UT.VEC3_NORMALIZE([muzzleWorldDirVec4[0], muzzleWorldDirVec4[1], muzzleWorldDirVec4[2]]);
    
    return { 
      normal: didShootNormal, 
      grenade: didShootGrenade,
      muzzlePos: muzzleWorldPos,
      muzzleDir: muzzleWorldDir
    };
  }
  
  /**
   * Renders all tank components.
   */
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
      
      // Calculate scale and position to shrink towards the left
      const scaleX = barWidth * hpPercentage;
      
      // Billboarding: Rotate healthbar to face camera yaw
      const barRotation = Quaternion.createFromEuler(cameraYaw, 0, 0, 'YXZ');
      
      // Calculate offset in billboard space so it shrinks correctly
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
