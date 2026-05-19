import { JOLT_LAYER_MOVING, JOLT_RVEC3_TO_VEC3, Gfx3Jolt, gfx3JoltManager } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { createBoxMesh, createUnitBoxMesh } from './GameUtils';

export enum EnemyType {
  STANDARD = 'standard',
  SCOUT = 'scout',
  HEAVY = 'heavy'
}

export enum EnemyState {
  IDLE = 'idle',
  PURSUE = 'pursue',
  ATTACK = 'attack',
  EVADE = 'evade'
}

interface EnemyStats {
  hp: number;
  maxHp: number;
  speed: number;
  rotSpeed: number;
  shootInterval: number;
  damage: number;
  chassisColor: [number, number, number];
  turretColor: [number, number, number];
  scale: number;
}

const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
  [EnemyType.STANDARD]: {
    hp: 100,
    maxHp: 100,
    speed: 10,
    rotSpeed: 1.0,
    shootInterval: 2.5,
    damage: 35,
    chassisColor: [0.45, 0.55, 0.35],
    turretColor: [0.4, 0.5, 0.3],
    scale: 1.0
  },
  [EnemyType.SCOUT]: {
    hp: 50,
    maxHp: 50,
    speed: 18,
    rotSpeed: 2.0,
    shootInterval: 1.2,
    damage: 15,
    chassisColor: [0.3, 0.4, 0.6], // Blueish
    turretColor: [0.25, 0.35, 0.55],
    scale: 0.8
  },
  [EnemyType.HEAVY]: {
    hp: 250,
    maxHp: 250,
    speed: 6,
    rotSpeed: 0.5,
    shootInterval: 4.0,
    damage: 70,
    chassisColor: [0.5, 0.3, 0.3], // Reddish
    turretColor: [0.45, 0.25, 0.25],
    scale: 1.4
  }
};

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
      Enemy.bodyMesh = createBoxMesh(2.25, 0.9, 3.3, [1, 1, 1]);
      Enemy.turretMesh = createBoxMesh(1.65, 0.75, 1.65, [1, 1, 1]);
      Enemy.barrelMesh = createBoxMesh(0.3, 0.3, 2.25, [1, 1, 1]);
    }

    Enemy.trackLMesh = createBoxMesh(0.6, 0.9, 3.6, [0.15, 0.15, 0.15]);
    Enemy.trackRMesh = createBoxMesh(0.6, 0.9, 3.6, [0.15, 0.15, 0.15]);
    Enemy.engineMesh = createBoxMesh(1.8, 0.6, 0.9, [0.2, 0.2, 0.2]);
    Enemy.hatchMesh = createBoxMesh(0.6, 0.15, 0.6, [0.15, 0.15, 0.15]);
    Enemy.antennaMesh = createBoxMesh(0.05, 1.5, 0.05, [0.1, 0.1, 0.1]);
    Enemy.projMesh = createBoxMesh(0.6, 0.6, 0.6, [1.0, 0.2, 0.0]);

    Enemy.initialized = true;
  }

  physicsBody: any;
  type: EnemyType;
  state: EnemyState = EnemyState.IDLE;
  stats: EnemyStats;
  
  rotation: number = 0;
  velocity: number = 0;
  recoil: number = 0;
  shootCooldown: number = 0;
  hp: number;
  turretYaw: number = 0;
  chassisTilt: number = 0;
  visualQuat: quat = [0, 0, 0, 1];
  
  // AI Params
  lastHitTime: number = 0;
  orbitDir: number = 1;
  stateTimer: number = 0;
  
  constructor(x: number, y: number, z: number, type: EnemyType = EnemyType.STANDARD) {
    this.type = type;
    this.stats = ENEMY_STATS[type];
    this.hp = this.stats.hp;
    this.orbitDir = Math.random() > 0.5 ? 1 : -1;

    if (!Enemy.initialized) {
       Enemy.initMeshes(); 
    }

    const s = this.stats.scale;
    this.physicsBody = gfx3JoltManager.addBox({
      width: 3.45 * s, height: 1.2 * s, depth: 3.6 * s,
      x, y: y + 0.5, z,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      settings: { 
          mAngularDamping: 2.0, 
          mMassPropertiesOverride: 10000.0 * (s * s * s),
      }
    });

    this.rotation = Math.random() * Math.PI * 2;
  }

  update(ts: number, playerPos: vec3): { didShoot: boolean, muzzlePos?: vec3, dir?: vec3 } {
    if (this.hp <= 0) return { didShoot: false };

    const dt = ts / 1000;
    this.recoil = Math.max(0, this.recoil - dt * 5);
    this.shootCooldown -= dt;
    this.stateTimer -= dt;

    const pos = JOLT_RVEC3_TO_VEC3(this.physicsBody.body.GetPosition());
    if (pos[1] < -20.0) { this.hp = 0; return { didShoot: false }; }

    const dx = playerPos[0] - pos[0];
    const dz = playerPos[2] - pos[2];
    const dist = Math.sqrt(dx*dx + dz*dz);
    const PI2 = Math.PI * 2;
    
    // --- FSM LOGIC ---
    this.updateState(dist);

    // --- AI BEHAVIOR ---
    let targetAngle = Math.atan2(-dx, -dz);
    let throttle = 0;

    switch (this.state) {
      case EnemyState.IDLE:
        throttle = 0;
        break;

      case EnemyState.PURSUE:
        throttle = 1.0;
        break;

      case EnemyState.ATTACK:
        // Orbit logic
        const orbitDist = 25;
        const orbitAngle = targetAngle + (Math.PI / 2) * this.orbitDir;
        targetAngle = orbitAngle;
        
        if (dist > orbitDist + 5) throttle = 1.0;
        else if (dist < orbitDist - 5) throttle = -0.5;
        else throttle = 0.2;
        break;

      case EnemyState.EVADE:
        targetAngle = Math.atan2(dx, dz); // Move away
        throttle = 1.5; // Sprint away
        break;
    }

    // OBSTACLE AVOIDANCE
    targetAngle = this.avoidObstacles(pos, targetAngle);

    // --- MOVEMENT EXECUTION ---
    this.applyMovement(ts, targetAngle, throttle);

    // --- TURRET & SHOOTING ---
    return this.updateCombat(ts, playerPos, targetAngle, dist);
  }

  private updateState(dist: number) {
    const isHitRecently = Date.now() - this.lastHitTime < 1000;

    if (isHitRecently && this.state !== EnemyState.EVADE) {
      this.state = EnemyState.EVADE;
      this.stateTimer = 2.0;
    }

    if (this.stateTimer > 0) return;

    if (dist > 60) {
      this.state = EnemyState.IDLE;
    } else if (dist > 35) {
      this.state = EnemyState.PURSUE;
    } else {
      this.state = EnemyState.ATTACK;
      if (Math.random() < 0.05) this.orbitDir *= -1; // Randomly flip orbit
    }
  }

  private avoidObstacles(pos: vec3, currentTargetAngle: number): number {
    const castStartY = pos[1] + 0.5;
    const qRot = Quaternion.createFromEuler(this.rotation, 0, 0, 'YXZ');
    const fLeft = qRot.rotateVector([-1.0, 0, -1.0]);
    const fRight = qRot.rotateVector([1.0, 0, -1.0]);
    
    const rayDist = 15.0;
    const lRay = gfx3JoltManager.createRay(pos[0], castStartY, pos[2], pos[0] + fLeft[0] * rayDist, castStartY, pos[2] + fLeft[2] * rayDist);
    const rRay = gfx3JoltManager.createRay(pos[0], castStartY, pos[2], pos[0] + fRight[0] * rayDist, castStartY, pos[2] + fRight[2] * rayDist);
    
    const lHit = lRay.fraction < 1.0 && lRay.fraction > 0.1;
    const rHit = rRay.fraction < 1.0 && rRay.fraction > 0.1;
    
    if (lHit && !rHit) return currentTargetAngle + 1.0;
    if (rHit && !lHit) return currentTargetAngle - 1.0;
    if (lHit && rHit) return currentTargetAngle + (lRay.fraction < rRay.fraction ? 1.5 : -1.5);
    
    return currentTargetAngle;
  }

  private applyMovement(ts: number, targetAngle: number, throttle: number) {
    const dt = ts / 1000;
    const qPhysics = this.physicsBody.body.GetRotation();
    const currentQuat = new Quaternion(qPhysics.GetW(), qPhysics.GetX(), qPhysics.GetY(), qPhysics.GetZ());
    const currentForward = currentQuat.rotateVector([0, 0, -1]);
    const currentYaw = Math.atan2(-currentForward[0], -currentForward[2]);

    let yawDiff = ((targetAngle - this.rotation) % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    
    this.rotation += Math.sign(yawDiff) * Math.min(Math.abs(yawDiff), this.stats.rotSpeed * dt);
    
    // Physics sync
    let physYawDiff = ((this.rotation - currentYaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (physYawDiff > Math.PI) physYawDiff -= Math.PI * 2;
    
    const targetAngVelY = physYawDiff * 15.0; 
    const currentAngVel = this.physicsBody.body.GetAngularVelocity();
    const newAngY = UT.LERP(currentAngVel.GetY(), targetAngVelY, 1.0 - Math.exp(-15.0 * dt));

    const currentUpVec = currentQuat.rotateVector([0, 1, 0]);
    const rightingStrength = 10.0;
    const newAngX = currentAngVel.GetX() * 0.6 - currentUpVec[2] * rightingStrength;
    const newAngZ = currentAngVel.GetZ() * 0.6 + currentUpVec[0] * rightingStrength;

    gfx3JoltManager.bodyInterface.SetAngularVelocity(this.physicsBody.body.GetID(), new Gfx3Jolt.Vec3(newAngX, newAngY, newAngZ));

    const targetVelocity = throttle * this.stats.speed;
    this.velocity = UT.LERP(this.velocity, targetVelocity, 1.0 - Math.exp(-8.0 * dt));

    const forward = currentQuat.rotateVector([0, 0, -1]);
    const currentJoltVel = this.physicsBody.body.GetLinearVelocity();
    gfx3JoltManager.bodyInterface.SetLinearVelocity(
        this.physicsBody.body.GetID(), 
        new Gfx3Jolt.Vec3(forward[0] * this.velocity, currentJoltVel.GetY(), forward[2] * this.velocity)
    );

    // Visual tilt
    const accelInput = (targetVelocity - this.velocity);
    this.chassisTilt = UT.LERP(this.chassisTilt, -accelInput * 0.1 * (Math.PI / 180), 5.0 * dt);
    const tiltQ = Quaternion.createFromEuler(this.chassisTilt, 0, 0, 'YXZ');
    this.visualQuat = currentQuat.mul(tiltQ.w, tiltQ.x, tiltQ.y, tiltQ.z);
  }

  private updateCombat(ts: number, playerPos: vec3, targetAngle: number, dist: number): { didShoot: boolean, muzzlePos?: vec3, dir?: vec3 } {
    const dt = ts / 1000;
    const PI2 = Math.PI * 2;
    
    // Turret aiming directly at player
    const pos = JOLT_RVEC3_TO_VEC3(this.physicsBody.body.GetPosition());
    const dx = playerPos[0] - pos[0];
    const dz = playerPos[2] - pos[2];
    const playerAngle = Math.atan2(-dx, -dz);

    let turretYawDiff = ((playerAngle - this.turretYaw) % PI2 + PI2) % PI2;
    if (turretYawDiff > Math.PI) turretYawDiff -= Math.PI * 2;
    this.turretYaw += turretYawDiff * (1.0 - Math.exp(-6.0 * dt));

    if (dist < 45 && Math.abs(turretYawDiff) < 0.2 && this.shootCooldown <= 0 && this.state !== EnemyState.IDLE) {
        const muzzleData = this.getMuzzleData(this.visualQuat);
        this.shootCooldown = this.stats.shootInterval * (0.8 + Math.random() * 0.4); 
        this.recoil = 1.0;
        return { didShoot: true, muzzlePos: muzzleData.muzzlePos, dir: muzzleData.dir };
    }
    
    return { didShoot: false };
  }

  getMuzzleData(q: Quaternion): { muzzlePos: vec3, dir: vec3 } {
    const pos = this.physicsBody.body.GetPosition();
    const origin: vec3 = [pos.GetX(), pos.GetY() - 0.15, pos.GetZ()];
    const bodyMatrix = UT.MAT4_TRANSFORM(origin, [0, 0, 0], [1, 1, 1], q);
    
    const currentForward = q.rotateVector([0, 0, -1]);
    const currentYaw = Math.atan2(-currentForward[0], -currentForward[2]);
    const localYaw = (this.turretYaw - currentYaw);
    const localYawQ = Quaternion.createFromEuler(localYaw, 0, 0, 'YXZ');

    const s = this.stats.scale;
    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.85 * s, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4());
    const visualRecoilValue = this.recoil > 0 ? this.recoil * 0.45 : 0;
    const barrelPivotMatrix = UT.MAT4_MULTIPLY(turretMatrix, UT.MAT4_TRANSLATE(0, 0.1 * s, (-1.2 * s) + visualRecoilValue));
    
    const muzzleLocalPos: vec4 = new Float32Array([0, 0, -1.125 * s, 1]);
    const muzzleWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelPivotMatrix, muzzleLocalPos);
    const muzzleWorldDirVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelPivotMatrix, new Float32Array([0, 0, -1, 0]));
    const muzzleWorldDir = UT.VEC3_NORMALIZE([muzzleWorldDirVec4[0], muzzleWorldDirVec4[1], muzzleWorldDirVec4[2]]);
    
    return { muzzlePos: [muzzleWorldPosVec4[0], muzzleWorldPosVec4[1], muzzleWorldPosVec4[2]] as vec3, dir: muzzleWorldDir };
  }

  draw(cameraYaw: number = 0) {
    if (this.hp <= 0) return;

    const s = this.stats.scale;
    const scale: vec3 = [s, s, s];
    const ZERO: vec3 = [0,0,0];

    const pos = this.physicsBody.body.GetPosition();
    const origin: vec3 = [pos.GetX(), pos.GetY() - 0.15, pos.GetZ()];
    
    const bodyRecoil = this.recoil > 0 ? this.recoil * 0.05 : 0;
    const recoilQ = Quaternion.createFromEuler(0, bodyRecoil, 0, 'YXZ');
    const finalVisualQ = this.visualQuat.mul(recoilQ.w, recoilQ.x, recoilQ.y, recoilQ.z);

    const bodyMatrix = UT.MAT4_TRANSFORM(origin, ZERO, scale, finalVisualQ);
    
    // Tint meshes
    Enemy.bodyMesh.setTag(0, 1, this.stats.chassisColor[0], this.stats.chassisColor[1], this.stats.chassisColor[2]);
    Enemy.turretMesh.setTag(0, 1, this.stats.turretColor[0], this.stats.turretColor[1], this.stats.turretColor[2]);

    gfx3MeshRenderer.drawMesh(Enemy.bodyMesh, bodyMatrix);

    const syncRigid = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSFORM([localPos[0]*s, localPos[1]*s, localPos[2]*s], [0, 0, 0], scale, new Quaternion());
        gfx3MeshRenderer.drawMesh(mesh, UT.MAT4_MULTIPLY(bodyMatrix, localMatrix));
    };

    syncRigid(Enemy.trackLMesh, [-1.425, -0.15, 0]);
    syncRigid(Enemy.trackRMesh, [1.425, -0.15, 0]);
    syncRigid(Enemy.engineMesh, [0, 0.3, 1.8]);

    const currentForward = finalVisualQ.rotateVector([0, 0, -1]);
    const currentYaw = Math.atan2(-currentForward[0], -currentForward[2]);
    const localYaw = (this.turretYaw - currentYaw);
    const localYawQ = Quaternion.createFromEuler(localYaw, 0, 0, 'YXZ');

    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.85 * s, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4()); 
    gfx3MeshRenderer.drawMesh(Enemy.turretMesh, turretMatrix);

    const visualRecoilValue = this.recoil > 0 ? this.recoil * 0.45 : 0;
    const barrelPivotMatrix = UT.MAT4_MULTIPLY(turretMatrix, UT.MAT4_TRANSLATE(0, 0.1 * s, (-1.2 * s) + visualRecoilValue));
    gfx3MeshRenderer.drawMesh(Enemy.barrelMesh, barrelPivotMatrix);
    
    const syncToTurret = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSLATE(localPos[0]*s, localPos[1]*s, localPos[2]*s);
        gfx3MeshRenderer.drawMesh(mesh, UT.MAT4_MULTIPLY(turretMatrix, localMatrix));
    };

    syncToTurret(Enemy.hatchMesh, [0, 0.45, 0.3]);
    syncToTurret(Enemy.antennaMesh, [-0.6, 1.125, 0.6]);
  }
}
