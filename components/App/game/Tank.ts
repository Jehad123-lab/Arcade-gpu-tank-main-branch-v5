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
  speed: number = 0;
  sens: number = 0;
  newSens: number = 0;
  wheelAngle: number = 0;
  rotation: number = 0;
  shellRecoil: number = 0;
  grenadeRecoil: number = 0;
  turretYaw: number = 0;
  barrelPitch: number = 0;
  chassisTilt: number = 0;
  wasFiringInternal: boolean = false;
  currentNormal: vec3 = [0, 1, 0];
  hp: number = 100;
  recoil: number = 0;

  // New smoothing properties
  visualRotation: number = 0;
  visualTurretYaw: number = 0;
  visualBarrelPitch: number = 0;

  options = {
    accelerationSpeed: 30.0,
    maxSpeed: 18.0,
    minSpeed: 0.1,
    boostAtStart: 1.0,
    brakeFriction: 4.0,
    engineBrakeFriction: 1.5,
    steerSpeed: 1.2,
    maxTurn: 0.8,
    turretTraverseSpeed: 1.8, // Radians per second
    barrelPitchSpeed: 1.2,
    quickFactor: 3.0,
    swiftnessMap: [
      { mapBegin: 1.0, mapEnd: 1.0, valueMin: 0, valueMax: 10 },
      { mapBegin: 1.0, mapEnd: 0.6, valueMin: 10, valueMax: 20 },
      { mapBegin: 0.6, mapEnd: 0.4, valueMin: 20, valueMax: 40 }
    ]
  };

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
      width: 3.45, height: 1.0, depth: 3.6, // Slightly shorter physics box to avoid ground issues
      x: 0, y: 3.0, z: 0, // Spawn higher
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      settings: { 
          mAngularDamping: 5.0, // More stable
          mMassPropertiesOverride: 15000.0,
          mFriction: 0.1, // Less friction since we set velocity manually
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
    
    // 1. TANK MOVEMENT LOGIC (Camera-Relative Smart Controls)
    const isMoving = Math.abs(moveDir.x) > 0.05 || Math.abs(moveDir.y) > 0.05;
    const TANK_MAX_SPEED = 16.0;

    if (isMoving) {
        let targetWorldYaw = aimYaw + Math.atan2(-moveDir.x, moveDir.y);
        let yawDiff = UT.NORMALIZE_ANGLE(targetWorldYaw - this.rotation);

        let isReversing = false;
        if (Math.abs(yawDiff) > Math.PI * 0.6) {
            targetWorldYaw = UT.CLAMP_ANGLE(targetWorldYaw + Math.PI);
            isReversing = true;
            yawDiff = UT.NORMALIZE_ANGLE(targetWorldYaw - this.rotation);
        }

        // Limit Chassis Rotation Speed for realism (Weight feel)
        const chassisTurnSpeed = 1.8; // Rad/s
        const maxTurn = chassisTurnSpeed * (ts / 1000);
        this.rotation += UT.CLAMP(yawDiff, -maxTurn, maxTurn);
        this.rotation = UT.CLAMP_ANGLE(this.rotation);

        const alignment = Math.max(0, Math.cos(yawDiff));
        const maxCurrentSpeed = TANK_MAX_SPEED * alignment;
        let targetSpeed = isReversing ? -maxCurrentSpeed : maxCurrentSpeed;

        if (Math.abs(yawDiff) > Math.PI / 3) {
             targetSpeed *= 0.3; 
        }
        
        const isBraking = (targetSpeed > 0 && this.speed < -0.1) || (targetSpeed < 0 && this.speed > 0.1);
        const linearAccel = isBraking ? 7.0 : 4.0;
        this.speed = UT.LERP(this.speed, targetSpeed, 1.0 - Math.exp(-linearAccel * (ts / 1000)));
        
    } else {
        this.speed = UT.LERP(this.speed, 0, 1.0 - Math.exp(-6.0 * (ts / 1000)));
    }

    // 2. JOLT PHYSICS SYNC
    if (!this.physicsBody || !this.physicsBody.body) return { normal: didShootNormal, grenade: didShootGrenade, muzzlePos: [0, 0, 0], muzzleDir: [0, 0, -1] };
    
    gfx3JoltManager.bodyInterface.ActivateBody(this.physicsBody.body.GetID());
    const pos = this.physicsBody.body.GetPosition();
    if (!pos) return { normal: didShootNormal, grenade: didShootGrenade, muzzlePos: [0, 0, 0], muzzleDir: [0, 0, -1] };
    
    const rayStart = [pos.GetX(), pos.GetY() + 1.5, pos.GetZ()];
    const rayEnd = [pos.GetX(), pos.GetY() - 3.0, pos.GetZ()];
    const rayHit = gfx3JoltManager.createRay(rayStart[0], rayStart[1], rayStart[2], rayEnd[0], rayEnd[1], rayEnd[2]);
    let groundNormal: vec3 = [0, 1, 0];
    
    if (rayHit.body && rayHit.normal) {
        groundNormal = [rayHit.normal.GetX(), rayHit.normal.GetY(), rayHit.normal.GetZ()];
    }

    // Smoothly align the tank's UP to the ground normal
    this.currentNormal = UT.VEC3_LERP(this.currentNormal, groundNormal, 1.0 - Math.exp(-10.0 * (ts / 1000)));
    this.currentNormal = UT.VEC3_NORMALIZE(this.currentNormal);

    const invYawQ = Quaternion.createFromEuler(-this.rotation, 0, 0, 'YXZ');
    const localNormal = invYawQ.rotateVector(this.currentNormal);
    
    const targetPitch = Math.atan2(localNormal[2], localNormal[1]);
    const targetRoll = Math.atan2(-localNormal[0], localNormal[1]);

    const targetQuat = Quaternion.createFromEuler(this.rotation, targetPitch, targetRoll, 'YXZ');
    const joltQuatSet = new Gfx3Jolt.Quat(targetQuat.x, targetQuat.y, targetQuat.z, targetQuat.w);
    gfx3JoltManager.bodyInterface.SetRotation(this.physicsBody.body.GetID(), joltQuatSet, Gfx3Jolt.EActivation_Activate);

    const forward = targetQuat.rotateVector([0, 0, -1]);
    const currentJoltVel = this.physicsBody.body.GetLinearVelocity();
    if (!currentJoltVel) return { normal: didShootNormal, grenade: didShootGrenade, muzzlePos: [0, 0, 0], muzzleDir: [0, 0, -1] };
    
    const newVelX = forward[0] * this.speed;
    const newVelZ = forward[2] * this.speed;
    const newVelY = currentJoltVel.GetY();

    gfx3JoltManager.bodyInterface.SetLinearVelocity(
        this.physicsBody.body.GetID(), 
        new Gfx3Jolt.Vec3(newVelX, newVelY, newVelZ)
    );
    
    // 3. CHASSIS TILT (Acceleration-based lurch)
    const acceleration = (this.speed - this.velocity) / (ts / 1000); 
    this.velocity = this.speed; 
    
    const targetTilt = -acceleration * 0.01; 
    this.chassisTilt = UT.LERP(this.chassisTilt, targetTilt, 12.0 * (ts / 1000));
    
    // Firing lurch
    const firingLurch = this.recoil * 0.15; 
    const finalTilt = UT.CLAMP(this.chassisTilt - firingLurch, -0.3, 0.3);

    // Out of bounds reset
    if (pos.GetY() < -30.0) {
        const resetPos = new Gfx3Jolt.RVec3(0, 10.0, 0);
        gfx3JoltManager.bodyInterface.SetPosition(this.physicsBody.body.GetID(), resetPos, Gfx3Jolt.EActivation_Activate);
        gfx3JoltManager.bodyInterface.SetLinearVelocity(this.physicsBody.body.GetID(), new Gfx3Jolt.Vec3(0, 0, 0));
        this.speed = 0;
    }

    // --- SYNC VISUALS ---
    const origin: vec3 = [pos.GetX(), pos.GetY(), pos.GetZ()];
    const bodyRecoilOffset = this.recoil * -0.3; 
    const tiltQ = Quaternion.createFromEuler(0, finalTilt, 0, 'YXZ');
    const finalVisualQ = targetQuat.mul(tiltQ.w, tiltQ.x, tiltQ.y, tiltQ.z);

    const recoiledOrigin: vec3 = [
        origin[0] + forward[0] * bodyRecoilOffset,
        origin[1],
        origin[2] + forward[2] * bodyRecoilOffset
    ];

    const bodyMatrix = UT.MAT4_TRANSFORM(recoiledOrigin, [0, 0, 0], [1, 1, 1], finalVisualQ);
    this.recoil = UT.LERP(this.recoil, 0, 10.0 * (ts / 1000));
    this.body.enableManualTransform(bodyMatrix);

    const syncRigid = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSFORM(localPos, [0, 0, 0], [1, 1, 1], new Quaternion());
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(bodyMatrix, localMatrix));
    };

    syncRigid(this.trackL, [-1.425, -0.15, 0]);
    syncRigid(this.trackR, [1.425, -0.15, 0]);
    syncRigid(this.engine, [0, 0.3, 1.8]);

    // 4. REALISTIC TURRET TRAVERSE (Limited degrees per second)
    const targetTurretYaw = aimYaw;
    let yawDiffT = UT.NORMALIZE_ANGLE(targetTurretYaw - this.turretYaw);
    
    // Constant speed traverse
    const traverseSpeed = this.options.turretTraverseSpeed * (ts / 1000);
    this.turretYaw += UT.CLAMP(yawDiffT, -traverseSpeed, traverseSpeed);
    this.turretYaw = UT.CLAMP_ANGLE(this.turretYaw);
    
    // Local yaw relative to chassis
    const localYaw = UT.NORMALIZE_ANGLE(this.turretYaw - this.rotation);
    const localYawQ = Quaternion.createFromEuler(localYaw, 0, 0, 'YXZ');
    
    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.72, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4());
    this.turret.enableManualTransform(turretMatrix);
 
    // REALISTIC BARREL PITCH
    const maxDepress = -0.1; 
    const maxElevate = 0.6;
    const targetBarrelPitch = UT.CLAMP(aimPitch, maxDepress, maxElevate);
    
    let pitchDiff = targetBarrelPitch - this.barrelPitch;
    const pitchTraverseSpeed = this.options.barrelPitchSpeed * (ts / 1000);
    this.barrelPitch += UT.CLAMP(pitchDiff, -pitchTraverseSpeed, pitchTraverseSpeed);
    
    const pitchQ = Quaternion.createFromEuler(0, -this.barrelPitch, 0, 'YXZ');

    const barrelRecoilVis = Math.max(this.shellRecoil * 0.7, this.grenadeRecoil * 0.4);
    const barrelPivotMatrix = UT.MAT4_MULTIPLY(turretMatrix, UT.MAT4_TRANSLATE(0, 0.08, -1.0 + barrelRecoilVis));
    const barrelMatrix = UT.MAT4_MULTIPLY(barrelPivotMatrix, pitchQ.toMatrix4());
    this.barrel.enableManualTransform(barrelMatrix);
    
    this.shellRecoil = UT.LERP(this.shellRecoil, 0, 10.0 * (ts / 1000));
    this.grenadeRecoil = UT.LERP(this.grenadeRecoil, 0, 10.0 * (ts / 1000));
    
    const syncToTurret = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSLATE(localPos[0], localPos[1], localPos[2]);
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(turretMatrix, localMatrix));
    };

    syncToTurret(this.hatch, [0, 0.45, 0.3]);
    syncToTurret(this.antenna, [-0.6, 1.1, 0.6]);

    const muzzleLocalPos: vec4 = new Float32Array([0, 0, -2.4, 1]);
    const muzzleWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelMatrix, muzzleLocalPos);
    const muzzleWorldPos: vec3 = [muzzleWorldPosVec4[0], muzzleWorldPosVec4[1], muzzleWorldPosVec4[2]];
    
    // Use the same TIP position to calculate world direction for consistency
    const tipLocalPos: vec4 = new Float32Array([0, 0, -3.0, 1]);
    const tipWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelMatrix, tipLocalPos);
    const tipWorldPos: vec3 = [tipWorldPosVec4[0], tipWorldPosVec4[1], tipWorldPosVec4[2]];
    
    const muzzleWorldDir = UT.VEC3_NORMALIZE([
        tipWorldPos[0] - muzzleWorldPos[0],
        tipWorldPos[1] - muzzleWorldPos[1],
        tipWorldPos[2] - muzzleWorldPos[2]
    ]);
    
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
