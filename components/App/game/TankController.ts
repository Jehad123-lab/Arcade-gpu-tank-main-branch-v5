import { gfx3JoltManager, JOLT_LAYER_MOVING, Gfx3Jolt } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';

export class TankController {
    physicsBody: any;
    speed: number = 0;
    rotVel: number = 0;
    rotation: number = 0;
    currentNormal: vec3 = [0, 1, 0];
    recoil: number = 0;

    constructor() {
        this.physicsBody = gfx3JoltManager.addSphere({
            radius: 1.5,
            x: 0, y: 3.0, z: 0,
            motionType: Gfx3Jolt.EMotionType_Dynamic,
            layer: JOLT_LAYER_MOVING,
            settings: { 
                mAngularDamping: 5.0,
                mMassPropertiesOverride: 15000.0,
                mFriction: 0.1,
            }
        });
    }

    addRecoil(amount: number) {
        this.recoil = amount;
    }

    update(ts: number, moveDir: { x: number, y: number }): { pos: any, targetQuat: Quaternion, forward: vec3, finalVisualQ: Quaternion, recoiledOrigin: vec3 } {
        // 1. TANK MOVEMENT LOGIC (Classic Tank Controls)
        const TANK_MAX_SPEED = 18.0;
        const MAX_ROT_VEL = 3.5;
        
        const throttle = moveDir.y; 
        let steer = -moveDir.x; 

        if (this.speed < -0.1) {
            steer = -steer;
        }

        if (Math.abs(throttle) > 0.05 || Math.abs(steer) > 0.05) {
            const turnAuthority = 1.0 - (Math.abs(this.speed) / TANK_MAX_SPEED * 0.4);
            const targetRotVel = steer * MAX_ROT_VEL * turnAuthority;
            this.rotVel = UT.LERP(this.rotVel, targetRotVel, 1.0 - Math.exp(-10.0 * (ts / 1000)));

            const targetSpeed = throttle * TANK_MAX_SPEED;
            const isBraking = (targetSpeed > 0 && this.speed < -0.1) || (targetSpeed < 0 && this.speed > 0.1);
            const accelAlpha = isBraking ? 12.0 : 6.0; 
            this.speed = UT.LERP(this.speed, targetSpeed, 1.0 - Math.exp(-accelAlpha * (ts / 1000)));
        } else {
            this.speed = UT.LERP(this.speed, 0, 1.0 - Math.exp(-6.0 * (ts / 1000)));
            this.rotVel = UT.LERP(this.rotVel, 0, 1.0 - Math.exp(-15.0 * (ts / 1000)));
        }

        this.rotation += this.rotVel * (ts / 1000);
        this.rotation = UT.CLAMP_ANGLE(this.rotation);

        // 2. JOLT PHYSICS SYNC
        gfx3JoltManager.bodyInterface.ActivateBody(this.physicsBody.body.GetID());

        const pos = this.physicsBody.body.GetPosition();
        const yawQ = Quaternion.createFromEuler(this.rotation, 0, 0, 'YXZ');

        const halfW = 1.6;
        const halfD = 1.7;
        const offsets = [
            yawQ.rotateVector([halfW, 0, halfD]),
            yawQ.rotateVector([-halfW, 0, halfD]),
            yawQ.rotateVector([halfW, 0, -halfD]),
            yawQ.rotateVector([-halfW, 0, -halfD])
        ];

        let hitCount = 0;
        let minDistFromCenter = 999;
        const rayLen = 4.0;
        const rayUpOffset = 0.5;

        const pts = offsets.map((offset) => {
            const sx = pos.GetX() + offset[0];
            const sy = pos.GetY() + rayUpOffset;
            const sz = pos.GetZ() + offset[2];
            const rayHit = gfx3JoltManager.createRay(sx, sy, sz, sx, sy - rayLen, sz);
            
            if (rayHit.body && rayHit.body.GetID().GetIndexAndSequenceNumber() !== this.physicsBody.body.GetID().GetIndexAndSequenceNumber() && rayHit.normal) {
                hitCount++;
                const distFromCenter = rayHit.fraction * rayLen - rayUpOffset;
                if (distFromCenter < minDistFromCenter) minDistFromCenter = distFromCenter;
                return [sx, sy - rayHit.fraction * rayLen, sz];
            } else {
                return [sx, sy - rayLen * 0.8, sz]; 
            }
        });

        let groundNormal: vec3 = [0, 1, 0];
        let isGrounded = false;

        const d1 = [pts[3][0] - pts[0][0], pts[3][1] - pts[0][1], pts[3][2] - pts[0][2]];
        const d2 = [pts[2][0] - pts[1][0], pts[2][1] - pts[1][1], pts[2][2] - pts[1][2]];
        
        let crossNormal: vec3 = [
            d1[1]*d2[2] - d1[2]*d2[1],
            d1[2]*d2[0] - d1[0]*d2[2],
            d1[0]*d2[1] - d1[1]*d2[0]
        ];
        
        let cnLen = UT.VEC3_LENGTH(crossNormal);
        if (cnLen < 0.0001) {
            crossNormal = [0, 1, 0];
        } else {
            crossNormal = UT.VEC3_NORMALIZE(crossNormal);
            if (crossNormal[1] < 0) {
                crossNormal[0] = -crossNormal[0];
                crossNormal[1] = -crossNormal[1];
                crossNormal[2] = -crossNormal[2];
            }
        }
        
        const centerHit = gfx3JoltManager.createRay(pos.GetX(), pos.GetY() + rayUpOffset, pos.GetZ(), pos.GetX(), pos.GetY() - rayLen, pos.GetZ());
        if (centerHit.body && centerHit.body.GetID().GetIndexAndSequenceNumber() !== this.physicsBody.body.GetID().GetIndexAndSequenceNumber() && centerHit.normal) {
            hitCount++;
            const centerDist = centerHit.fraction * rayLen - rayUpOffset;
            if (centerDist < minDistFromCenter) minDistFromCenter = centerDist;
        }

        if (hitCount > 0) {
            groundNormal = crossNormal;
            if (minDistFromCenter < 1.8) isGrounded = true;
        }

        const normalAlpha = 1.0 - Math.exp(-8.0 * (ts / 1000));
        this.currentNormal[0] = UT.LERP(this.currentNormal[0], groundNormal[0], normalAlpha);
        this.currentNormal[1] = UT.LERP(this.currentNormal[1], groundNormal[1], normalAlpha);
        this.currentNormal[2] = UT.LERP(this.currentNormal[2], groundNormal[2], normalAlpha);
        this.currentNormal = UT.VEC3_NORMALIZE(this.currentNormal);

        const upAlignmentQ = Quaternion.createFromBetweenVectors([0, 1, 0], this.currentNormal);
        const targetQuat = upAlignmentQ.mul(yawQ.w, yawQ.x, yawQ.y, yawQ.z);
        
        const joltQuatSet = new Gfx3Jolt.Quat(targetQuat.x, targetQuat.y, targetQuat.z, targetQuat.w);
        gfx3JoltManager.bodyInterface.SetRotation(this.physicsBody.body.GetID(), joltQuatSet, Gfx3Jolt.EActivation_Activate);

        const forward = targetQuat.rotateVector([0, 0, -1]);
        const currentJoltVel = this.physicsBody.body.GetLinearVelocity();
        
        let newVelX = forward[0] * this.speed;
        let newVelY = currentJoltVel.GetY(); 
        let newVelZ = forward[2] * this.speed;

        if (isGrounded && Math.abs(this.speed) > 5) {
            newVelY -= 1.0; 
        }

        gfx3JoltManager.bodyInterface.SetLinearVelocity(
            this.physicsBody.body.GetID(), 
            new Gfx3Jolt.Vec3(newVelX, newVelY, newVelZ)
        );
        
        const firingLurch = this.recoil * 0.12; 
        const finalTilt = Math.max(-0.25, Math.min(0.25, -firingLurch));

        if (pos.GetY() < -20.0) {
            const resetPos = new Gfx3Jolt.RVec3(0, 5.0, 0);
            gfx3JoltManager.bodyInterface.SetPosition(this.physicsBody.body.GetID(), resetPos, Gfx3Jolt.EActivation_Activate);
            gfx3JoltManager.bodyInterface.SetLinearVelocity(this.physicsBody.body.GetID(), new Gfx3Jolt.Vec3(0, 0, 0));
            this.speed = 0;
        }

        const origin: vec3 = [pos.GetX(), pos.GetY(), pos.GetZ()];
        const bodyRecoilOffset = this.recoil * -0.25; 
        const tiltQ = Quaternion.createFromEuler(0, finalTilt, 0, 'YXZ');
        
        const finalVisualQ = targetQuat.mul(tiltQ.w, tiltQ.x, tiltQ.y, tiltQ.z);

        const recoiledOrigin: vec3 = [
            origin[0] + forward[0] * bodyRecoilOffset,
            origin[1] - 1.0, 
            origin[2] + forward[2] * bodyRecoilOffset
        ];

        this.recoil = UT.LERP(this.recoil, 0, 8.0 * (ts / 1000)); 

        return { pos, targetQuat, forward, finalVisualQ, recoiledOrigin };
    }
}
