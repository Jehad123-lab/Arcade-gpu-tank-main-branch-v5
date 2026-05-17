import { JOLT_LAYER_MOVING, JOLT_RVEC3_TO_VEC3, Gfx3Jolt, gfx3JoltManager } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { createBoxMesh, createUnitBoxMesh } from './GameUtils';

/**
 * The Enemy class represents an AI-controlled tank.
 * It uses static shared meshes for better performance across many instances.
 */
export class Enemy {
  static bodyMesh: Gfx3Mesh;
  static turretMesh: Gfx3Mesh;
  static barrelMesh: Gfx3Mesh;
  static trackLMesh: Gfx3Mesh;
  static trackRMesh: Gfx3Mesh;
  static engineMesh: Gfx3Mesh;
  static hatchMesh: Gfx3Mesh;
  static antennaMesh: Gfx3Mesh;
  static projMesh: Gfx3Mesh;
  static hpGreen: Gfx3Mesh;
  static hpRed: Gfx3Mesh;
  static initialized = false;

  /**
   * Initializes shared meshes for all enemy instances.
   * Supports falling back to procedural boxes if JSM files are missing.
   */
  static async initMeshes() {
    if (Enemy.initialized) return;
    
    const bodyJSM = new Gfx3MeshJSM();
    const turretJSM = new Gfx3MeshJSM();
    const barrelJSM = new Gfx3MeshJSM();

    try {
      await Promise.all([
        bodyJSM.loadFromFile('models/tank_body.jsm'),
        turretJSM.loadFromFile('models/tank_turret.jsm'),
        barrelJSM.loadFromFile('models/tank_barrel.jsm')
      ]);

      Enemy.bodyMesh = bodyJSM;
      Enemy.turretMesh = turretJSM;
      Enemy.barrelMesh = barrelJSM;
    } catch (e) {
      console.warn('Enemy: Failed to load JSM models, falling back to boxes.', e);
      
      const chassisColor: [number, number, number] = [0.45, 0.55, 0.35]; // Slightly lighter green than player
      const turretColor: [number, number, number] = [0.4, 0.5, 0.3];
      Enemy.bodyMesh = createBoxMesh(2.25, 0.9, 3.3, chassisColor);
      Enemy.turretMesh = createBoxMesh(1.65, 0.75, 1.65, turretColor);
      Enemy.barrelMesh = createBoxMesh(0.3, 0.3, 2.25, [0.2, 0.2, 0.2]);
    }

    const trackColor: [number, number, number] = [0.15, 0.15, 0.15];
    const engineColor: [number, number, number] = [0.2, 0.2, 0.2];
    Enemy.trackLMesh = createBoxMesh(0.6, 0.9, 3.6, trackColor);
    Enemy.trackRMesh = createBoxMesh(0.6, 0.9, 3.6, trackColor);
    Enemy.engineMesh = createBoxMesh(1.8, 0.6, 0.9, engineColor);
    Enemy.hatchMesh = createBoxMesh(0.6, 0.15, 0.6, [0.15, 0.15, 0.15]);
    Enemy.antennaMesh = createBoxMesh(0.05, 1.5, 0.05, [0.1, 0.1, 0.1]);
    Enemy.projMesh = createBoxMesh(0.6, 0.6, 0.6, [1.0, 0.2, 0.0]);
    Enemy.hpGreen = createUnitBoxMesh([0, 1, 0]);
    Enemy.hpRed = createUnitBoxMesh([1, 0, 0]);

    Enemy.initialized = true;
  }

  physicsBody: any;
  
  rotation: number = 0;
  velocity: number = 0;
  recoil: number = 0;
  shootCooldown: number = 0;
  hp: number = 100;
  turretYaw: number = 0;
  chassisTilt: number = 0;
  currentUp: vec3 = [0, 1, 0];
  visualQuat: quat = [0, 0, 0, 1];
  
  constructor(x: number, y: number, z: number) {
    // Note: initMeshes should be called externally to wait for async loading
    if (!Enemy.initialized) {
       Enemy.initMeshes(); 
    }

    this.physicsBody = gfx3JoltManager.addBox({
      width: 3.45, height: 1.2, depth: 3.6,
      x, y: y + 0.5, z,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      settings: { 
          mAngularDamping: 2.0, 
          mMassPropertiesOverride: 10000.0,
      }
    });
  }

  update(ts: number, targetPos: any): { didShoot: boolean, muzzlePos?: vec3, dir?: vec3 } {
    if (this.hp <= 0) return { didShoot: false };

    const speed = 10;
    const rotSpeed = 1.0; // ~60 deg/sec

    this.recoil -= (ts / 1000) * 5; 
    if (this.recoil < 0) this.recoil = 0;
    
    this.shootCooldown -= ts / 1000;

    const pos = this.physicsBody.body.GetPosition();

    if (pos.GetY() < -20.0) {
        this.hp = 0; 
        return { didShoot: false };
    }

    const qPhysics = this.physicsBody.body.GetRotation();
    const currentQuat = new Quaternion(qPhysics.GetW(), qPhysics.GetX(), qPhysics.GetY(), qPhysics.GetZ());
    
    const myPos = JOLT_RVEC3_TO_VEC3(pos);
    const dx = targetPos[0] - myPos[0];
    const dz = targetPos[2] - myPos[2];
    const dist = Math.sqrt(dx*dx + dz*dz);
    const PI2 = Math.PI * 2;
    let targetAngle = Math.atan2(-dx, -dz);
    
    // OBSTACLE AVOIDANCE
    const castStartY = pos.GetY() + 0.5;
    const qRot = Quaternion.createFromEuler(this.rotation, 0, 0, 'YXZ');
    const fLeft = qRot.rotateVector([-0.7, 0, -1.0]);
    const fRight = qRot.rotateVector([0.7, 0, -1.0]);
    
    const rayDist = 12.0;
    const lRay = gfx3JoltManager.createRay(pos.GetX(), castStartY, pos.GetZ(), pos.GetX() + fLeft[0] * rayDist, castStartY, pos.GetZ() + fLeft[2] * rayDist);
    const rRay = gfx3JoltManager.createRay(pos.GetX(), castStartY, pos.GetZ(), pos.GetX() + fRight[0] * rayDist, castStartY, pos.GetZ() + fRight[2] * rayDist);
    
    const lHit = lRay.fraction < 1.0 && lRay.fraction > 0.15;
    const rHit = rRay.fraction < 1.0 && rRay.fraction > 0.15;
    
    let isAvoiding = false;
    if (lHit && !rHit) {
        targetAngle += 1.2;
        isAvoiding = true;
    } else if (rHit && !lHit) {
        targetAngle -= 1.2;
        isAvoiding = true;
    } else if (lHit && rHit) {
        targetAngle += lRay.fraction < rRay.fraction ? 1.5 : -1.5;
        isAvoiding = true;
    }

    let bodyYawDiff = ((targetAngle - this.rotation) % PI2 + PI2) % PI2;
    if (bodyYawDiff > Math.PI) bodyYawDiff -= Math.PI * 2;
    
    const currentRotSpeed = isAvoiding ? rotSpeed * 1.5 : rotSpeed;
    this.rotation += Math.sign(bodyYawDiff) * Math.min(Math.abs(bodyYawDiff), currentRotSpeed * (ts / 1000));
    
    const currentForward = currentQuat.rotateVector([0, 0, -1]);
    const currentYaw = Math.atan2(-currentForward[0], -currentForward[2]);
    const uprightQuat = Quaternion.createFromEuler(currentYaw, 0, 0, 'YXZ');
    
    const currentUpVec = currentQuat.rotateVector([0, 1, 0]);
    const tiltErrorX = -currentUpVec[2]; 
    const tiltErrorZ = currentUpVec[0];  

    let physYawDiff = ((this.rotation - currentYaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (physYawDiff > Math.PI) physYawDiff -= Math.PI * 2;
    this.rotation = currentYaw + Math.max(-0.5, Math.min(0.5, physYawDiff));
    
    const targetAngularVelY = physYawDiff * 15.0; 
    const currentAngVel = this.physicsBody.body.GetAngularVelocity();
    const newAngY = UT.LERP(currentAngVel.GetY(), targetAngularVelY, 1.0 - Math.exp(-15.0 * (ts / 1000)));

    // Dampen physical bouncy rotation, apply gentle righting force
    const rightingStrength = Math.max(0, 1.0 - Math.abs(this.velocity) / 30.0) * 10.0;
    const newAngX = currentAngVel.GetX() * 0.6 + tiltErrorX * rightingStrength;
    const newAngZ = currentAngVel.GetZ() * 0.6 + tiltErrorZ * rightingStrength;

    gfx3JoltManager.bodyInterface.SetAngularVelocity(
        this.physicsBody.body.GetID(), 
        new Gfx3Jolt.Vec3(newAngX, newAngY, newAngZ)
    );

    let throttle = 0;
    if (dist > 15) {
        throttle = 1; 
    } else if (dist < 10) {
        throttle = -0.5; 
    }

    const targetVelocity = throttle * speed;
    const accelInput = (targetVelocity - this.velocity);
    const targetTilt = -accelInput * 0.1 * (Math.PI / 180);
    this.chassisTilt = UT.LERP(this.chassisTilt, targetTilt, 5.0 * (ts / 1000));

    const tiltQ = Quaternion.createFromEuler(this.chassisTilt, 0, 0, 'YXZ');
    this.visualQuat = currentQuat.mul(tiltQ.w, tiltQ.x, tiltQ.y, tiltQ.z);

    const isBraking = (throttle > 0 && this.velocity < 0) || (throttle < 0 && this.velocity > 0);
    const accelRate = throttle !== 0 ? (isBraking ? -20.0 : -8.0) : -12.0;
    const accelAlphaValue = 1.0 - Math.exp(accelRate * (ts / 1000));
    this.velocity = UT.LERP(this.velocity, targetVelocity, accelAlphaValue);

    const forward = currentQuat.rotateVector([0, 0, -1]);
    const currentJoltVel = this.physicsBody.body.GetLinearVelocity();
    
    // Strict forward movement
    const newVelX = forward[0] * this.velocity;
    const newVelZ = forward[2] * this.velocity;
    const verticalAssist = forward[1] * this.velocity;
    const newVelY = currentJoltVel.GetY() * (Math.abs(verticalAssist) > 0.1 ? 0.5 : 1.0) + verticalAssist;

    gfx3JoltManager.bodyInterface.SetLinearVelocity(
        this.physicsBody.body.GetID(), 
        new Gfx3Jolt.Vec3(newVelX, newVelY, newVelZ)
    );
    
    let didShoot = false;
    let muzzlePos: vec3 | undefined = undefined;
    let dir: vec3 | undefined = undefined;

    let turretYawDiff = ((targetAngle - this.turretYaw) % PI2 + PI2) % PI2;
    if (turretYawDiff > Math.PI) turretYawDiff -= Math.PI * 2;
    
    // Smooth weighted turret traverse
    const traverseAlpha = 1.0 - Math.exp(-4.5 * (ts / 1000));
    this.turretYaw += turretYawDiff * traverseAlpha;

    if (dist < 40 && Math.abs(turretYawDiff) < 0.25 && Math.abs(bodyYawDiff) < 1.0 && this.shootCooldown <= 0) {
        const muzzleData = this.getMuzzleData(this.visualQuat);
        muzzlePos = muzzleData.muzzlePos;
        dir = muzzleData.dir;
        this.shootCooldown = 2.5; 
        this.recoil = 1.0;
        didShoot = true;
    }
    
    return { didShoot, muzzlePos, dir };
  }

  
  getMuzzleData(q: Quaternion): { muzzlePos: vec3, dir: vec3 } {
    const pos = this.physicsBody.body.GetPosition();
    const origin: vec3 = [pos.GetX(), pos.GetY() - 0.15, pos.GetZ()];
    const bodyMatrix = UT.MAT4_TRANSFORM(origin, [0, 0, 0], [1, 1, 1], q);
    
    const currentForward = q.rotateVector([0, 0, -1]);
    const currentYaw = Math.atan2(-currentForward[0], -currentForward[2]);
    const localYaw = (this.turretYaw - currentYaw);
    const localYawQ = Quaternion.createFromEuler(localYaw, 0, 0, 'YXZ');

    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.85, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4());
    
    const visualRecoilValue = this.recoil > 0 ? this.recoil * 0.45 : 0;
    const barrelPivotMatrix = UT.MAT4_MULTIPLY(turretMatrix, UT.MAT4_TRANSLATE(0, 0.1, -1.2 + visualRecoilValue));
    
    const muzzleLocalPos: vec4 = new Float32Array([0, 0, -1.125, 1]);
    const muzzleWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelPivotMatrix, muzzleLocalPos);
    
    const muzzleWorldDirVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelPivotMatrix, new Float32Array([0, 0, -1, 0]));
    const muzzleWorldDir = UT.VEC3_NORMALIZE([muzzleWorldDirVec4[0], muzzleWorldDirVec4[1], muzzleWorldDirVec4[2]]);
    
    return {
       muzzlePos: [muzzleWorldPosVec4[0], muzzleWorldPosVec4[1], muzzleWorldPosVec4[2]] as vec3,
       dir: muzzleWorldDir
    };
  }

  draw(cameraYaw: number = 0) {
    if (this.hp <= 0) return;

    const scale: vec3 = [1, 1, 1];
    const ZERO: vec3 = [0,0,0];

    const pos = this.physicsBody.body.GetPosition();
    const origin: vec3 = [pos.GetX(), pos.GetY() - 0.15, pos.GetZ()];
    
    const bodyRecoil = this.recoil > 0 ? this.recoil * 0.05 : 0;
    const recoilQ = Quaternion.createFromEuler(0, bodyRecoil, 0, 'YXZ');
    const finalVisualQ = this.visualQuat.mul(recoilQ.w, recoilQ.x, recoilQ.y, recoilQ.z);

    const bodyMatrix = UT.MAT4_TRANSFORM(origin, ZERO, scale, finalVisualQ);
    gfx3MeshRenderer.drawMesh(Enemy.bodyMesh, bodyMatrix);

    const syncRigid = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSFORM(localPos, [0, 0, 0], [1, 1, 1], new Quaternion());
        gfx3MeshRenderer.drawMesh(mesh, UT.MAT4_MULTIPLY(bodyMatrix, localMatrix));
    };

    syncRigid(Enemy.trackLMesh, [-1.425, -0.15, 0]);
    syncRigid(Enemy.trackRMesh, [1.425, -0.15, 0]);
    syncRigid(Enemy.engineMesh, [0, 0.3, 1.8]);

    const currentForward = finalVisualQ.rotateVector([0, 0, -1]);
    const currentYaw = Math.atan2(-currentForward[0], -currentForward[2]);
    const localYaw = (this.turretYaw - currentYaw);
    const localYawQ = Quaternion.createFromEuler(localYaw, 0, 0, 'YXZ');

    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.85, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4()); 
    gfx3MeshRenderer.drawMesh(Enemy.turretMesh, turretMatrix);

    const visualRecoilValue = this.recoil > 0 ? this.recoil * 0.45 : 0;
    const barrelPivotMatrix = UT.MAT4_MULTIPLY(turretMatrix, UT.MAT4_TRANSLATE(0, 0.1, -1.2 + visualRecoilValue));
    gfx3MeshRenderer.drawMesh(Enemy.barrelMesh, barrelPivotMatrix);
    
    const syncToTurret = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSLATE(localPos[0], localPos[1], localPos[2]);
        gfx3MeshRenderer.drawMesh(mesh, UT.MAT4_MULTIPLY(turretMatrix, localMatrix));
    };

    syncToTurret(Enemy.hatchMesh, [0, 0.375 + 0.075, 0.3]);
    syncToTurret(Enemy.antennaMesh, [-0.6, 0.375 + 0.75, 0.6]);
  }

  drawHealthBar(origin: vec3, hp: number, maxHp: number, cameraYaw: number = 0) {
      const hpPercentage = Math.max(0, hp / maxHp);
      const barMesh = hpPercentage > 0.5 ? Enemy.hpGreen : Enemy.hpRed;
      
      const barWidth = 1.5;
      const barHeight = 0.2;
      const barDepth = 0.2;
      
      // Calculate scale
      const scaleX = barWidth * hpPercentage;
      
      // Billboarding
      const barRotation = Quaternion.createFromEuler(cameraYaw, 0, 0, 'YXZ');
      
      // Offset local
      const offsetLocal = [-(barWidth - scaleX) / 2, 0, 0] as vec3;
      const offsetWorld = barRotation.rotateVector(offsetLocal);
      
      const matBar = UT.MAT4_TRANSFORM(
          [origin[0] + offsetWorld[0], origin[1] + 2.5, origin[2] + offsetWorld[2]], 
          [0, 0, 0], 
          [scaleX, barHeight, barDepth], 
          barRotation
      );
      
      gfx3MeshRenderer.drawMesh(barMesh, matBar);
  }
}
