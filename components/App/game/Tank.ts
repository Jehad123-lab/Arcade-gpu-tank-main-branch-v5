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
  rotVel: number = 0; // Rotational velocity
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

  options = {
    accelerationSpeed: 30.0,
    maxSpeed: 18.0,
    minSpeed: 0.1,
    boostAtStart: 1.0,
    brakeFriction: 4.0,
    engineBrakeFriction: 1.5,
    steerSpeed: 1.5,
    maxTurn: 0.6,
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
    
    // 1. TANK MOVEMENT LOGIC (Classic Tank Controls)
    const TANK_MAX_SPEED = 18.0;
    const MAX_ROT_VEL = 3.5;
    
    // W/S corresponds to moveDir.y (Throttle)
    // A/D corresponds to moveDir.x (Steering)
    const throttle = moveDir.y; 
    const steer = -moveDir.x; // Flip steer to make D = Right turn

    if (Math.abs(throttle) > 0.05 || Math.abs(steer) > 0.05) {
        // Rotation (Independent of camera direction)
        // High rotation speed at low speed, wider turns at high speed
        const turnAuthority = 1.0 - (Math.abs(this.speed) / TANK_MAX_SPEED * 0.4);
        const targetRotVel = steer * MAX_ROT_VEL * turnAuthority;
        this.rotVel = UT.LERP(this.rotVel, targetRotVel, 1.0 - Math.exp(-10.0 * (ts / 1000)));

        // Throttle (Relative to current chassis orientation)
        const targetSpeed = throttle * TANK_MAX_SPEED;
        const isBraking = (targetSpeed > 0 && this.speed < -0.1) || (targetSpeed < 0 && this.speed > 0.1);
        const accelAlpha = isBraking ? 12.0 : 6.0; 
        this.speed = UT.LERP(this.speed, targetSpeed, 1.0 - Math.exp(-accelAlpha * (ts / 1000)));
    } else {
        // Braking and stopping rotation
        this.speed = UT.LERP(this.speed, 0, 1.0 - Math.exp(-6.0 * (ts / 1000)));
        this.rotVel = UT.LERP(this.rotVel, 0, 1.0 - Math.exp(-15.0 * (ts / 1000)));
    }

    this.rotation += this.rotVel * (ts / 1000);
    this.rotation = UT.CLAMP_ANGLE(this.rotation);

    // 2. JOLT PHYSICS SYNC
    gfx3JoltManager.bodyInterface.ActivateBody(this.physicsBody.body.GetID());

    const pos = this.physicsBody.body.GetPosition();
    const rayStart = [pos.GetX(), pos.GetY() + 0.5, pos.GetZ()];
    const rayEnd = [pos.GetX(), pos.GetY() - 2.5, pos.GetZ()];
    
    const rayHit = gfx3JoltManager.createRay(rayStart[0], rayStart[1], rayStart[2], rayEnd[0], rayEnd[1], rayEnd[2]);
    let groundNormal: vec3 = [0, 1, 0];
    
    if (rayHit.body && rayHit.normal) {
        groundNormal = [rayHit.normal.GetX(), rayHit.normal.GetY(), rayHit.normal.GetZ()];
    }

    // Smoothly align the tank's UP to the ground normal
    this.currentNormal[0] = UT.LERP(this.currentNormal[0], groundNormal[0], 10.0 * (ts / 1000));
    this.currentNormal[1] = UT.LERP(this.currentNormal[1], groundNormal[1], 10.0 * (ts / 1000));
    this.currentNormal[2] = UT.LERP(this.currentNormal[2], groundNormal[2], 10.0 * (ts / 1000));
    this.currentNormal = UT.VEC3_NORMALIZE(this.currentNormal);

    // Calculate the orientation from Yaw + Ground Normal
    // 1. Create a quat for the arcade yaw
    const yawQ = Quaternion.createFromEuler(this.rotation, 0, 0, 'YXZ');
    
    // 2. Align local UP ([0, 1, 0]) to currentNormal
    const upAlignmentQ = Quaternion.createFromBetweenVectors([0, 1, 0], this.currentNormal);
    
    // 3. Combine them: Apply Yaw first, then align to surface
    const targetQuat = upAlignmentQ.mul(yawQ.w, yawQ.x, yawQ.y, yawQ.z);
    
    const joltQuatSet = new Gfx3Jolt.Quat(targetQuat.x, targetQuat.y, targetQuat.z, targetQuat.w);
    gfx3JoltManager.bodyInterface.SetRotation(this.physicsBody.body.GetID(), joltQuatSet, Gfx3Jolt.EActivation_Activate);

    // Precise Velocity
    const forward = targetQuat.rotateVector([0, 0, -1]);
    const currentJoltVel = this.physicsBody.body.GetLinearVelocity();
    
    const newVelX = forward[0] * this.speed;
    const newVelZ = forward[2] * this.speed;
    
    // Keep internal physics Y velocity but dampen vertical separation
    const newVelY = currentJoltVel.GetY();

    gfx3JoltManager.bodyInterface.SetLinearVelocity(
        this.physicsBody.body.GetID(), 
        new Gfx3Jolt.Vec3(newVelX, newVelY, newVelZ)
    );
    
    // 3. CHASSIS TILT (Acceleration-based lurch)
    // Disabled movement-based tilt per user request for a more stable platform
    this.velocity = this.speed; 
    this.chassisTilt = 0;
    
    // Add firing lurch (nose up when firing)
    const firingLurch = this.recoil * 0.12; 
    const finalTilt = Math.max(-0.25, Math.min(0.25, -firingLurch));

    // Teleport if out of bounds
    if (pos.GetY() < -20.0) {
        const resetPos = new Gfx3Jolt.RVec3(0, 5.0, 0);
        gfx3JoltManager.bodyInterface.SetPosition(this.physicsBody.body.GetID(), resetPos, Gfx3Jolt.EActivation_Activate);
        gfx3JoltManager.bodyInterface.SetLinearVelocity(this.physicsBody.body.GetID(), new Gfx3Jolt.Vec3(0, 0, 0));
        this.speed = 0;
    }

    // --- SYNC VISUALS ---
    const origin: vec3 = [pos.GetX(), pos.GetY(), pos.GetZ()];

    // RECOIL CALCULATION (Sharp kick, slow settle)
    const bodyRecoilOffset = this.recoil * -0.25; 
    const tiltQ = Quaternion.createFromEuler(0, finalTilt, 0, 'YXZ');
    
    // Final body orientation with tilt and lurch
    const finalVisualQ = targetQuat.mul(tiltQ.w, tiltQ.x, tiltQ.y, tiltQ.z);

    const recoiledOrigin: vec3 = [
        origin[0] + forward[0] * bodyRecoilOffset,
        origin[1],
        origin[2] + forward[2] * bodyRecoilOffset
    ];

    const bodyMatrix = UT.MAT4_TRANSFORM(recoiledOrigin, [0, 0, 0], [1, 1, 1], finalVisualQ);
    this.recoil = UT.LERP(this.recoil, 0, 8.0 * (ts / 1000)); // Smoother recovery
    
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
    
    const turretTraverseSpeed = 25.0;
    this.turretYaw += yawDiff * turretTraverseSpeed * (ts / 1000);
    
    const localYaw = (this.turretYaw - this.rotation);
    const localYawQ = Quaternion.createFromEuler(localYaw, 0, 0, 'YXZ');
    
    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.72, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4());
    this.turret.enableManualTransform(turretMatrix);
 
    // BARREL PITCH (Smoothed)
    const maxDepress = -0.15; 
    const maxElevate = 0.55;
    const targetPitch = Math.max(maxDepress, Math.min(maxElevate, aimPitch));
    this.barrelPitch = UT.LERP(this.barrelPitch, targetPitch, 4.0 * (ts / 1000));
    
    const pitchQ = Quaternion.createFromEuler(0, -this.barrelPitch, 0, 'YXZ');

    // Reduced recoil slide to prevent clipping out the back of the turret
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
