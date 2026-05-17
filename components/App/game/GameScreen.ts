/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState, useRef } from 'react';
import { em } from '@lib/engine/engine_manager';
import { screenManager } from '@lib/screen/screen_manager';
import { Screen } from '@lib/screen/screen';
import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { coreManager, SizeMode } from '@lib/core/core_manager';
import { gfx3PostRenderer, PostParam } from '@lib/gfx3_post/gfx3_post_renderer';
import { gfx3JoltManager, JOLT_LAYER_MOVING, JOLT_RVEC3_TO_VEC3, VEC3_TO_JOLT_RVEC3, Gfx3Jolt } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3Camera } from '@lib/gfx3_camera/gfx3_camera';
import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { eventManager } from '@lib/core/event_manager';
import { Gfx3Drawable, Gfx3MeshEffect } from '@lib/gfx3/gfx3_drawable';
import { inputManager } from '@lib/input/input_manager';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Target, 
    Fire, 
    ArrowsOut, 
    Crosshair
} from 'phosphor-react';
import { Tank } from './Tank';
import { Environment } from './Environment';
import { Enemy } from './Enemy';
import { Explosion } from './Explosion';
import { createBoxMesh } from './GameUtils';
import { ObjectPool } from '@lib/core/object_pool';

// --- PROJECTILE SYSTEM ---
export enum ProjectileType {
  SHELL = 'shell',
  GRENADE = 'grenade'
}

export interface Projectile {
  body: any;
  life: number;
  type: ProjectileType;
  ownerId: string;
  mesh: Gfx3Mesh;
  lastVel: vec3;
}

// --- INPUT INTENT OBJECT ---
export interface InputIntent {
  moveDir: { x: number, y: number };
  aimYaw: number;
  aimPitch: number;
  isFiringNormal: boolean;
  isFiringGrenade: boolean;
}

export class GameScreen extends Screen {
  camera: Gfx3Camera;
  tank: Tank;
  level: Environment;
  enemies: Enemy[] = [];
  explosions: Explosion[] = [];
  explosionPool: ObjectPool<Explosion>;
  projectiles: Projectile[] = [];
  shellMesh: Gfx3Mesh;
  grenadeMesh: Gfx3Mesh;
  
  // Input State
  intent: InputIntent = {
    moveDir: { x: 0, y: 0 },
    aimYaw: 0,
    aimPitch: 0,
    isFiringNormal: false,
    isFiringGrenade: false
  };

  virtualFireNormal: boolean = false;
  virtualFireGrenade: boolean = false;
  moveDirInput = { x: 0, y: 0 };
  
  cameraYaw = 0; 
  cameraPitch = 0.45;
  cameraDistance = 18;
  cameraOffset: vec3 = [0, 6, 12]; 
  cameraLookTarget: vec3 = [0, 0, 0];
  cameraPos: vec3 = [0, 0, 0];

  isReady: boolean = false;
  rightClickFire: boolean = false;
  mouseX: number = 0;
  mouseY: number = 0;
  shakeIntensity: number = 0;
  lastMouseManualTS: number = 0;

  constructor() {
    super();
    this.camera = new Gfx3Camera(0);
    this.tank = new Tank();
    this.level = new Environment();
    
    this.explosionPool = new ObjectPool<Explosion>(new Explosion(), 600, (obj: Explosion) => {
        obj.active = false;
        return {};
    });

    // Projectiles
    this.projectiles = [];
    
    // Create base meshes for projectiles
    // Shell: Longer, slimmer, yellow/bright
    this.shellMesh = createBoxMesh(0.2, 0.2, 1.8, [1.0, 1.0, 0.3]); 
    // Grenade: Larger, dark grey with orange stripe (simulated by color contrast)
    this.grenadeMesh = createBoxMesh(0.7, 0.7, 0.7, [0.3, 0.3, 0.3]); 

    // Spawn exactly 3 enemies as requested
    while (this.enemies.length < 3) {
       const x = (Math.random() - 0.5) * 120;
       const z = (Math.random() - 0.5) * 120;
       if (Math.abs(x) < 25 && Math.abs(z) < 25) continue;
       this.enemies.push(new Enemy(x, 2, z));
    }

    if (typeof window !== 'undefined') {
       window.addEventListener('pointerdown', this.handleGlobalPointerDown);
       window.addEventListener('pointerup', this.handleGlobalPointerUp);
    }
  }

  handleGlobalPointerDown = (e: PointerEvent) => {
    if (e.button === 2) { // Right click
      if (inputManager.isPointerLockCaptured()) {
         this.rightClickFire = true;
         this.lastMouseManualTS = Date.now();
      }
    }
  };

  handleGlobalPointerUp = (e: PointerEvent) => {
    if (e.button === 2) {
      this.rightClickFire = false;
    }
  };

  cameraAlpha: number = 0.1;
  isSniperMode: boolean = false;
  targetCameraDistance: number = 28.0;

  handleGlobalWheel = (e: WheelEvent) => {
    if (inputManager.isPointerLockCaptured()) {
       const step = 4.0;
       this.targetCameraDistance += e.deltaY > 0 ? step : -step;
       this.targetCameraDistance = Math.max(10, Math.min(60, this.targetCameraDistance));
    }
  };

  handleMouseDown = (e: MouseEvent) => {
    if (e.button === 2) { // Right Click
        this.isSniperMode = true;
    }
  };

  handleMouseUp = (e: MouseEvent) => {
    if (e.button === 2) {
        this.isSniperMode = false;
    }
  };

  async onEnter() {
    // Fix canvas sizing bug - set to FULL mode
    coreManager.setSize(window.innerWidth, window.innerHeight, SizeMode.FULL);
    
    if (typeof window !== 'undefined') {
       window.addEventListener('wheel', this.handleGlobalWheel, { passive: true });
       window.addEventListener('mousedown', this.handleMouseDown);
       window.addEventListener('mouseup', this.handleMouseUp);
       window.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    gfx3PostRenderer.setParam(PostParam.PIXELATION_ENABLED, 0.0);
    
    // Load Models
    await Promise.all([
      this.tank.load(),
      Enemy.initMeshes()
    ]);
    
    // Desktop Controls
    inputManager.registerAction('keyboard', 'KeyW', 'THR_FWD');
    inputManager.registerAction('keyboard', 'KeyS', 'THR_BWD');
    inputManager.registerAction('keyboard', 'KeyA', 'STR_LFT');
    inputManager.registerAction('keyboard', 'KeyD', 'STR_RGT');
    inputManager.registerAction('keyboard', 'KeyQ', 'CAM_L');
    inputManager.registerAction('keyboard', 'KeyC', 'CAM_R');
    inputManager.registerAction('keyboard', 'KeyR', 'CAM_Z_IN');
    inputManager.registerAction('keyboard', 'KeyF', 'CAM_Z_OUT');
    inputManager.registerAction('keyboard', 'Space', 'FIRE');
    inputManager.registerAction('keyboard', 'KeyG', 'FIRE_ALT'); 
    inputManager.registerAction('keyboard', 'ShiftLeft', 'FIRE_ALT'); 
    inputManager.registerAction('keyboard', 'KeyE', 'FIRE_ALT'); 

    inputManager.setPointerLockEnabled(true);
    eventManager.subscribe(inputManager, 'E_MOUSE_MOVE', this, this.handleMouseMove);

    this.camera.setPosition(0, 12, 20); // Start at cy=0 position offset (0, 12, distance)
    this.camera.lookAt(0, 0, 0);
    this.cameraYaw = 0; // aimYaw
    this.cameraPitch = 0.5; // aimPitch
    this.cameraDistance = 15;
    this.camera.getView().setBgColor(0.53, 0.81, 0.92, 1.0); // Sky blue
    
    const tankP = this.tank.physicsBody.body.GetPosition();
    this.cameraLookTarget = [tankP.GetX(), tankP.GetY() + 1.5, tankP.GetZ()];
    this.isReady = true;
  }

  handleMouseMove = (data: any) => {
    this.mouseX = data.clientX;
    this.mouseY = data.clientY;
    
    if (inputManager.isPointerLockCaptured()) {
        const sensitivity = 0.003;
        this.cameraYaw -= data.movementX * sensitivity;
        this.cameraPitch = Math.max(-0.4, Math.min(1.0, this.cameraPitch - data.movementY * sensitivity));
        this.lastMouseManualTS = Date.now();
    }
  };

  /**
   * ABSTRACTION LAYER: Updates the Intent Object
   */
  updateIntent(ts: number) {
    let kbX = 0;
    let kbY = 0;
    if (inputManager.isActiveAction('STR_LFT')) kbX -= 1;
    if (inputManager.isActiveAction('STR_RGT')) kbX += 1;
    if (inputManager.isActiveAction('THR_FWD')) kbY += 1;
    if (inputManager.isActiveAction('THR_BWD')) kbY -= 1;

    const moveX = kbX + (Math.abs(this.moveDirInput.x) > 0.1 ? this.moveDirInput.x : 0);
    const moveY = kbY + (Math.abs(this.moveDirInput.y) > 0.1 ? this.moveDirInput.y : 0);
    
    this.intent.moveDir.x = Math.max(-1, Math.min(1, moveX));
    this.intent.moveDir.y = Math.max(-1, Math.min(1, moveY));

    this.intent.isFiringNormal = this.virtualFireNormal || inputManager.isActiveAction('FIRE') || (inputManager.isMouseDown() && !this.rightClickFire);
    this.intent.isFiringGrenade = this.virtualFireGrenade || this.rightClickFire || inputManager.isActiveAction('FIRE_ALT');

    // Aim where the camera is looking (Directly ahead of the player)
    this.intent.aimYaw = this.cameraYaw;
    this.intent.aimPitch = this.cameraPitch;
  }

  update(ts: number) {
    inputManager.update(ts);
    gfx3JoltManager.update(ts);
    
    this.updateIntent(ts);
    this.level.update(ts);

    const shots = this.tank.update(
        ts, 
        this.intent.moveDir, 
        this.intent.isFiringNormal, 
        this.intent.isFiringGrenade, 
        this.intent.aimYaw, 
        this.intent.aimPitch
    );
    
    if (shots.normal) {
       this.spawnProjectile(ProjectileType.SHELL, shots.muzzlePos[0], shots.muzzlePos[1], shots.muzzlePos[2], shots.muzzleDir, 'player');
       this.handleTankMuzzleFlash(shots.muzzlePos, shots.muzzleDir, ProjectileType.SHELL);
       this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
    }
    if (shots.grenade) {
       this.spawnProjectile(ProjectileType.GRENADE, shots.muzzlePos[0], shots.muzzlePos[1], shots.muzzlePos[2], shots.muzzleDir, 'player');
       this.handleTankMuzzleFlash(shots.muzzlePos, shots.muzzleDir, ProjectileType.GRENADE);
       this.shakeIntensity = Math.max(this.shakeIntensity, 0.6);
    }

    const tankP = this.tank.physicsBody.body.GetPosition();
    const playerPos: vec3 = [tankP.GetX(), tankP.GetY(), tankP.GetZ()];
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
       const enemy = this.enemies[i];
       
       if (enemy.hp <= 0) {
           if (enemy.physicsBody) {
               gfx3JoltManager.remove(enemy.physicsBody.bodyId);
               enemy.physicsBody = null as any;
           }
           this.enemies.splice(i, 1);
           continue;
       }

       const res = enemy.update(ts, playerPos);
       if (res.didShoot && res.muzzlePos && res.dir) {
           this.spawnProjectile(ProjectileType.SHELL, res.muzzlePos[0], res.muzzlePos[1], res.muzzlePos[2], res.dir, 'enemy', 1.0);
           const exp = this.explosionPool.acquire() as Explosion;
           if (exp) {
               exp.reset(res.muzzlePos[0], res.muzzlePos[1], res.muzzlePos[2], [1.0, 0.5, 0.1], res.dir);
               this.explosions.push(exp);
           }
       }
    }
    
    this.updateProjectiles(ts);

    for (let i = this.explosions.length - 1; i >= 0; i--) {
        const alive = this.explosions[i].update(ts);
        if (!alive) {
            this.explosionPool.dispose(this.explosions[i]);
            this.explosions.splice(i, 1);
        }
    }


    const finalTargetDist = this.isSniperMode ? 8.0 : this.targetCameraDistance;
    this.cameraDistance = UT.LERP(this.cameraDistance, finalTargetDist, 1.0 - Math.exp(-8.0 * (ts / 1000)));

    const cameraPitchActual = this.isSniperMode ? Math.max(this.cameraPitch, -0.1) : this.cameraPitch; 

    const rotQ = Quaternion.createFromEuler(this.cameraYaw, cameraPitchActual, 0, 'YXZ');
    const idealOffset = rotQ.rotateVector([0, 0, this.cameraDistance]);
    const idealPos: vec3 = [
        playerPos[0] + idealOffset[0],
        playerPos[1] + idealOffset[1] + 1.5,
        playerPos[2] + idealOffset[2]
    ];
    
    // Prevent camera from going under ground
    if (idealPos[1] < 1.0) {
        idealPos[1] = 1.0;
    }
    
    // Position smoothing
    const camAlpha = 1.0 - Math.exp(-6.0 * (ts / 1000));
    this.cameraPos = UT.VEC3_LERP(this.cameraPos, idealPos, camAlpha);
    
    // Look Target smoothing - Look slightly above the tank for better visibility
    const noseOffset = rotQ.rotateVector([0, 0, -3.0]);
    const lookGoal: vec3 = [
        playerPos[0] + noseOffset[0],
        playerPos[1] + 1.8 + (idealOffset[1] * 0.15), 
        playerPos[2] + noseOffset[2]
    ];
    const lookAlpha = 1.0 - Math.exp(-15.0 * (ts / 1000));
    this.cameraLookTarget = UT.VEC3_LERP(this.cameraLookTarget, lookGoal, lookAlpha);
    
    const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    const shakeZ = (Math.random() - 0.5) * this.shakeIntensity;
    
    this.camera.setPosition(this.cameraPos[0] + shakeX, this.cameraPos[1] + shakeY, this.cameraPos[2] + shakeZ);
    this.camera.lookAt(this.cameraLookTarget[0], this.cameraLookTarget[1], this.cameraLookTarget[2]);
    
    this.shakeIntensity = UT.LERP(this.shakeIntensity, 0, 5.0 * (ts / 1000));
  }

  handleTankMuzzleFlash(pos: vec3, forward: vec3, type: ProjectileType) {
    const exp = this.explosionPool.acquire() as Explosion;
    if (exp) {
        exp.reset(pos[0], pos[1], pos[2], type === ProjectileType.GRENADE ? [1.0, 0.5, 0.2] : [1.0, 0.9, 0.3], forward, type === ProjectileType.GRENADE ? 2.5 : 1.5, 'muzzle');
        this.explosions.push(exp);
    }
  }

  draw() {
    gfx3Manager.beginDrawing();
    gfx3MeshRenderer.drawDirLight([0.6, -1.0, 0.4], [1.0, 0.95, 0.85], [1.0, 1.0, 1.0], 1.2);
    gfx3MeshRenderer.setAmbientColor([0.4, 0.4, 0.45]);

    const camPos = this.camera.getPosition();
    this.level.draw(camPos);
    this.tank.draw(this.cameraYaw);
    
    for (const enemy of this.enemies) {
       enemy.draw(this.cameraYaw);
    }
    for (const exp of this.explosions) {
       exp.draw();
    }

    // Draw active projectiles
    const scaleShell: vec3 = [1.5, 1.5, 1.5];
    const scaleGrenade: vec3 = [1.2, 1.2, 1.2];
    const ZERO: vec3 = [0, 0, 0];

    for (const p of this.projectiles) {
       const pPos = p.body.body.GetPosition();
       const pRot = p.body.body.GetRotation();
       const q = new Quaternion(pRot.GetW(), pRot.GetX(), pRot.GetY(), pRot.GetZ());
       
       const matProj = UT.MAT4_TRANSFORM(
           [pPos.GetX(), pPos.GetY(), pPos.GetZ()], 
           ZERO, 
           p.type === ProjectileType.GRENADE ? scaleGrenade : scaleShell, 
           q
       );
       gfx3MeshRenderer.drawMesh(p.mesh, matProj);
    }
    
    gfx3Manager.endDrawing();
  }

  spawnProjectile(type: ProjectileType, x: number, y: number, z: number, orientation: Quaternion | vec3, ownerId: string, speedMod: number = 1.0) {
    let finalDirection: vec3;
    let finalRotation: any;

    if (orientation instanceof Quaternion) {
        finalDirection = orientation.rotateVector([0, 0, -1]);
        finalRotation = new Gfx3Jolt.Quat(orientation.x, orientation.y, orientation.z, orientation.w);
    } else {
        finalDirection = orientation;
        const yaw = Math.atan2(-finalDirection[0], -finalDirection[2]);
        const pitch = Math.asin(finalDirection[1]);
        const q = Quaternion.createFromEuler(yaw, pitch, 0, 'YXZ');
        finalRotation = new Gfx3Jolt.Quat(q.x, q.y, q.z, q.w);
    }

    const pMesh = type === ProjectileType.GRENADE ? this.grenadeMesh : this.shellMesh;
    
    const pBody = gfx3JoltManager.addBox({
      width: type === ProjectileType.GRENADE ? 0.6 : 0.4,
      height: type === ProjectileType.GRENADE ? 0.6 : 0.4,
      depth: type === ProjectileType.GRENADE ? 0.6 : 1.2,
      x: x, y: y, z: z,
      rotation: finalRotation,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      settings: { 
          mMassPropertiesOverride: 0.1, 
          mRestitution: 0.025 
      }
    });

    if (type === ProjectileType.SHELL) {
        gfx3JoltManager.bodyInterface.SetGravityFactor(pBody.body.GetID(), 0); 
    }

    let forwardSpeed = type === ProjectileType.GRENADE ? 45 : 180; 
    let upwardVel = type === ProjectileType.GRENADE ? 18 : 0;
    
    forwardSpeed *= speedMod;

    const pVel = new Gfx3Jolt.Vec3(
      finalDirection[0] * forwardSpeed, 
      (finalDirection[1] * forwardSpeed) + upwardVel, 
      finalDirection[2] * forwardSpeed
    );
    gfx3JoltManager.bodyInterface.SetLinearVelocity(pBody.body.GetID(), pVel);

    if (type === ProjectileType.GRENADE) {
        const angVel = new Gfx3Jolt.Vec3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
        gfx3JoltManager.bodyInterface.SetAngularVelocity(pBody.body.GetID(), angVel);
    }

    this.projectiles.push({
      body: pBody,
      life: 5.0,
      type,
      ownerId,
      mesh: pMesh,
      lastVel: [pVel.GetX(), pVel.GetY(), pVel.GetZ()]
    });
  }

  updateProjectiles(ts: number) {
    const tankP = this.tank.physicsBody.body.GetPosition();
    const playerPos3: vec3 = [tankP.GetX(), tankP.GetY(), tankP.GetZ()];

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= ts / 1000;

      const pPos = p.body.body.GetPosition();
      const pPos3: vec3 = [pPos.GetX(), pPos.GetY(), pPos.GetZ()];
      const curV = p.body.body.GetLinearVelocity();

      if (p.life <= 0) {
        if (p.type === ProjectileType.GRENADE) {
            this.onProjectileEnvironmentImpact(p, pPos3);
        }
        gfx3JoltManager.remove(p.body.bodyId);
        this.projectiles.splice(i, 1);
        continue;
      }
      
      if (p.life < 4.9 && Math.random() < 0.4) {
          const exp = this.explosionPool.acquire() as Explosion;
          if (exp) {
              const trailColor: [number, number, number] = p.type === ProjectileType.GRENADE ? [0.6, 0.6, 0.6] : [1.0, 0.8, 0.5];
              const trailScale = p.type === ProjectileType.GRENADE ? 1.5 : 0.6;
              exp.reset(pPos3[0], pPos3[1], pPos3[2], trailColor, undefined, trailScale, 'trail');
              this.explosions.push(exp);
          }
      }

      let destroyed = false;

      if (p.ownerId === 'player') {
          for (const enemy of this.enemies) {
              if (enemy.hp <= 0) continue;
              const ePos = enemy.physicsBody.body.GetPosition();
              const dist = UT.VEC3_DISTANCE(pPos3, [ePos.GetX(), ePos.GetY() + 0.3, ePos.GetZ()]); 
              
              if (dist < 3.5) {
                  this.onProjectileHit(p, enemy, pPos3);
                  destroyed = true;
                  break;
              }
          }
      } else {
          const distToPlayer = UT.VEC3_DISTANCE(pPos3, [playerPos3[0], playerPos3[1] + 0.5, playerPos3[2]]);
          if (distToPlayer < 3.5) {
              this.onProjectileHit(p, this.tank, pPos3);
              destroyed = true;
          }
      }

      if (!destroyed) {
          const velDiff = UT.VEC3_DISTANCE(p.lastVel, [curV.GetX(), curV.GetY(), curV.GetZ()]);
          const impacted = pPos.GetY() < -15.0 || (p.life < 4.98 && velDiff > 8);

          if (impacted) {
              this.onProjectileEnvironmentImpact(p, pPos3);
              destroyed = true;
          }
      }

      if (destroyed) {
          gfx3JoltManager.remove(p.body.bodyId);
          this.projectiles.splice(i, 1);
      } else {
          p.lastVel = [curV.GetX(), curV.GetY(), curV.GetZ()];
          
          if (p.type === ProjectileType.SHELL) {
             const velLen = Math.sqrt(curV.GetX()*curV.GetX() + curV.GetY()*curV.GetY() + curV.GetZ()*curV.GetZ());
             if (velLen > 0.1) {
                const dir = UT.VEC3_NORMALIZE([curV.GetX(), curV.GetY(), curV.GetZ()]);
                const yaw = Math.atan2(-dir[0], -dir[2]);
                const pitch = Math.asin(dir[1]);
                const q = Quaternion.createFromEuler(yaw, pitch, 0, 'YXZ');
                const joltQuat = new Gfx3Jolt.Quat(q.x, q.y, q.z, q.w);
                gfx3JoltManager.bodyInterface.SetRotation(p.body.body.GetID(), joltQuat, Gfx3Jolt.EActivation_Activate);
             }
          }
      }
    }
  }

  onProjectileHit(p: Projectile, target: any, hitPos: vec3) {
      const isEnemy = target instanceof Enemy;
      const dmg = p.type === ProjectileType.GRENADE ? 100 : 35;
      
      if (isEnemy) {
          target.hp -= dmg;
          const ePos = target.physicsBody.body.GetPosition();
          
          const exp = this.explosionPool.acquire() as Explosion;
          if (exp) {
              exp.reset(hitPos[0], hitPos[1], hitPos[2], [1, 0.6, 0.2], undefined, p.type === ProjectileType.GRENADE ? 3.0 : 0.12);
              this.explosions.push(exp);
          }

          if (target.hp <= 0) {
              const expDeath = this.explosionPool.acquire() as Explosion;
              if (expDeath) {
                  expDeath.reset(ePos.GetX(), ePos.GetY(), ePos.GetZ(), [0.8, 0.2, 0.1], undefined, 2.5);
                  this.explosions.push(expDeath);
              }
          }
      } else {
          this.tank.hp -= dmg;
          const exp = this.explosionPool.acquire() as Explosion;
          if (exp) {
              exp.reset(hitPos[0], hitPos[1], hitPos[2], [1, 0.1, 0.1], undefined, 0.2);
              this.explosions.push(exp);
          }
          this.tank.recoil = Math.max(this.tank.recoil, 0.5);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.5); 
      }
      
      if (p.type === ProjectileType.GRENADE) {
          this.applyAOE(hitPos, 12, 100);
      }
  }

  onProjectileEnvironmentImpact(p: Projectile, pos: vec3) {
      const exp = this.explosionPool.acquire() as Explosion;
      if (exp) {
          const color: [number, number, number] = p.type === ProjectileType.GRENADE ? [0.8, 0.4, 0.1] : [0.6, 0.6, 0.6];
          exp.reset(pos[0], pos[1], pos[2], color, undefined, p.type === ProjectileType.GRENADE ? 4.0 : 1.0, p.type === ProjectileType.GRENADE ? 'grenade' : undefined);
          this.explosions.push(exp);
      }

      if (p.type === ProjectileType.GRENADE) {
          this.applyAOE(pos, 12, 100);
      }
  }

  applyAOE(origin: vec3, radius: number, damage: number) {
      for (const enemy of this.enemies) {
          if (enemy.hp <= 0) continue;
          const ePos = enemy.physicsBody.body.GetPosition();
          const dist = UT.VEC3_DISTANCE(origin, [ePos.GetX(), ePos.GetY(), ePos.GetZ()]);
          if (dist < radius) {
              enemy.hp -= damage;
              const pushDir = UT.VEC3_NORMALIZE(UT.VEC3_SUBSTRACT([ePos.GetX(), ePos.GetY() + 0.5, ePos.GetZ()], origin));
              const pushForce = new Gfx3Jolt.Vec3(pushDir[0] * 2000, pushDir[1] * 1000, pushDir[2] * 2000);
              gfx3JoltManager.bodyInterface.AddImpulse(enemy.physicsBody.body.GetID(), pushForce);
              
              if (enemy.hp <= 0) {
                  // Wait for the main loop to clean up the dead physics entity.
              }
          }
      }

      const tankP = this.tank.physicsBody.body.GetPosition();
      const playerPos3: vec3 = [tankP.GetX(), tankP.GetY(), tankP.GetZ()];
      const distToPlayer = UT.VEC3_DISTANCE(origin, playerPos3);
      if (distToPlayer < radius) {
          this.tank.hp -= damage;
          this.tank.recoil = Math.max(this.tank.recoil, 1.0);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.8);
      }
  }

  render(ts: number) {
    if (!this.isReady) return;
    
    gfx3Manager.beginRender();
    
    // 1. Render scene to post-processing source texture
    gfx3Manager.setDestinationTexture(gfx3PostRenderer.getSourceTexture());
    gfx3Manager.beginPassRender(0);
    gfx3MeshRenderer.render(ts);
    gfx3Manager.endPassRender();
    
    // 2. Render post-processing to canvas
    gfx3Manager.setDestinationTexture(null);
    gfx3PostRenderer.render(ts, gfx3Manager.getCurrentRenderingTexture());
    
    gfx3Manager.endRender();
  }
}