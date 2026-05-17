import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { createBoxMesh } from './GameUtils';
import { Poolable } from '@lib/core/object_pool';

export class Explosion implements Poolable<Explosion> {
    particles: { pos: vec3, vel: vec3, life: number, maxLife: number, colorIdx: number, scaleMultiplier: number, type: 'fire' | 'smoke' | 'flash' | 'debris' }[] = [];
    static particleMeshes: Map<string, Gfx3Mesh> = new Map();
    static qMat = new Quaternion();
    colorKeys: string[] = [];
    expType: 'muzzle' | 'normal' | 'grenade' | 'trail' = 'normal';
    active: boolean = false;

    constructor() {
        // Empty constructor for pooling
    }

    clone(): Explosion {
        return new Explosion();
    }

    reset(x: number, y: number, z: number, color: [number, number, number] = [1.0, 0.4, 0.0], direction?: vec3, scaleMultiplier: number = 1.0, type: 'muzzle' | 'normal' | 'grenade' | 'trail' = 'normal') {
        const colorKey1 = `${color[0]},${color[1]},${color[2]}`;
        const color2 = [Math.min(1.0, color[0] * 1.5), Math.min(1.0, color[1] * 1.5), Math.min(1.0, color[2] * 1.5)];
        const colorKey2 = `${color2[0]},${color2[1]},${color2[2]}`;
        const color3 = [Math.max(0.0, color[0] * 0.5), Math.max(0.0, color[1] * 0.5), Math.max(0.0, color[2] * 0.5)];
        const colorKey3 = `${color3[0]},${color3[1]},${color3[2]}`;
        
        const smokeKey1 = 'smoke1';
        const smokeKey2 = 'smoke2';
        
        if (!Explosion.particleMeshes.has(colorKey1)) {
            Explosion.particleMeshes.set(colorKey1, createBoxMesh(0.6, 0.6, 0.6, color));
            Explosion.particleMeshes.set(colorKey2, createBoxMesh(0.4, 0.4, 0.4, color2 as [number, number, number]));
            Explosion.particleMeshes.set(colorKey3, createBoxMesh(0.8, 0.8, 0.8, color3 as [number, number, number]));
            Explosion.particleMeshes.set(smokeKey1, createBoxMesh(1.0, 1.0, 1.0, [0.2, 0.2, 0.2]));
            Explosion.particleMeshes.set(smokeKey2, createBoxMesh(1.2, 1.2, 1.2, [0.4, 0.4, 0.4]));
        }

        this.colorKeys = [colorKey1, colorKey2, colorKey3, smokeKey1, smokeKey2];
        this.expType = type;
        this.particles = [];
        this.active = true;
        
        if (type === 'grenade') {
            // Cinematic grenade explosion
            const numFire = 45 * scaleMultiplier;
            const numSmoke = 12 * scaleMultiplier;
            const numDebris = 25 * scaleMultiplier;
            
            // 1. Initial blinding flash
            this.particles.push({ 
                pos: [x, y, z], vel: [0, 0, 0], 
                life: 0.15, maxLife: 0.15, 
                colorIdx: 1, // Use brightest color
                scaleMultiplier: scaleMultiplier * 3.75, // 15 / 4
                type: 'flash' 
            });

            // 2. Core Fireball (expands fast, dies quick)
            for (let i = 0; i < numFire / 4; i++) {
                const pos: vec3 = [x + (Math.random() - 0.5) * 1.5, y + (Math.random() - 0.5) * 1.5, z + (Math.random() - 0.5) * 1.5];
                const speed = (25 + Math.random() * 35);
                
                // Spherical distribution
                const theta = Math.random() * 2 * Math.PI;
                const phi = Math.acos(2 * Math.random() - 1);
                const dirX = Math.sin(phi) * Math.cos(theta);
                const dirY = Math.sin(phi) * Math.sin(theta);
                const dirZ = Math.cos(phi);
                
                const vel = UT.VEC3_SCALE([dirX, dirY, dirZ], speed);
                const life = (0.2 + Math.random() * 0.4);
                this.particles.push({ pos, vel, life, maxLife: life, colorIdx: Math.floor(Math.random() * 3), scaleMultiplier: scaleMultiplier * (1.5 + Math.random()*2.0), type: 'fire' });
            }
            
            // 3. Smoke Puff (expands outwards then drifts up)
            for (let i = 0; i < numSmoke / 4; i++) {
                const pos: vec3 = [x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2, z + (Math.random() - 0.5) * 2];
                const speed = (10 + Math.random() * 25);
                
                const theta = Math.random() * 2 * Math.PI;
                // Bias upwards slightly, but still spread outwards
                const phi = Math.acos(Math.random() * 1.5 - 0.5); 
                const dirX = Math.sin(phi) * Math.cos(theta);
                const dirY = Math.sin(phi) * Math.sin(theta);
                const dirZ = Math.cos(phi);

                const vel = UT.VEC3_SCALE([dirX, dirY, dirZ], speed);
                const life = (0.8 + Math.random() * 0.8);
                this.particles.push({ pos, vel, life, maxLife: life, colorIdx: 3 + Math.floor(Math.random() * 2), scaleMultiplier: scaleMultiplier * (0.4 + Math.random() * 0.4), type: 'smoke' });
            }

            // 4. Heavy debris chunks (fly up and fall)
            for (let i = 0; i < numDebris / 4; i++) {
                const pos: vec3 = [x + (Math.random() - 0.5), y + (Math.random() - 0.5), z + (Math.random() - 0.5)];
                const speed = (15 + Math.random() * 25);
                
                const dirX = (Math.random() - 0.5) * 2;
                const dirY = Math.random() * 2 + 0.5; // Always launch upwards
                const dirZ = (Math.random() - 0.5) * 2;
                
                const vel = UT.VEC3_SCALE(UT.VEC3_NORMALIZE([dirX, dirY, dirZ]), speed);
                const life = (1.0 + Math.random() * 1.5);
                // debris uses fire/dark color but is very small
                this.particles.push({ pos, vel, life, maxLife: life, colorIdx: Math.random() > 0.5 ? 2 : 3, scaleMultiplier: scaleMultiplier * (0.3 + Math.random()*0.5), type: 'debris' });
            }
            
        } else if (type === 'trail') {
            // Trail: small fire transitioning to smoke
            const numParticles = 1;
            for (let i = 0; i < numParticles; i++) {
                const pos: vec3 = [x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.1, z + (Math.random() - 0.5) * 0.1];
                let dirX = (Math.random() - 0.5) * 0.5;
                let dirY = (Math.random() - 0.5) * 0.5;
                let dirZ = (Math.random() - 0.5) * 0.5;
                const vel = UT.VEC3_SCALE([dirX, dirY, dirZ], 0.5);
                const life = 0.4 + Math.random() * 0.4;
                // colorIdx 0 is fire/bright, 3 is smoke
                this.particles.push({ 
                    pos, vel, life, maxLife: life, 
                    colorIdx: Math.random() < 0.3 ? 0 : 3, 
                    scaleMultiplier: scaleMultiplier * (0.8 + Math.random() * 0.4), 
                    type: Math.random() < 0.3 ? 'fire' : 'smoke' 
                });
            }
        } else {
            // Muzzle or normal explosion
            const numParticles = Math.floor((direction ? 12 : 20) * (scaleMultiplier >= 2 ? 1.5 : scaleMultiplier));

            if (type === 'muzzle') {
                this.particles.push({ 
                    pos: [x, y, z], vel: [0, 0, 0], 
                    life: 0.1, maxLife: 0.1, 
                    colorIdx: 1, 
                    scaleMultiplier: scaleMultiplier * 2.0, 
                    type: 'flash' 
                });
            }

            for (let i = 0; i < numParticles; i++) {
                const pos: vec3 = [x + (Math.random() - 0.5) * 0.5 * scaleMultiplier, y + (Math.random() - 0.5) * 0.5 * scaleMultiplier, z + (Math.random() - 0.5) * 0.5 * scaleMultiplier];
                
                let vel: vec3;
                let life: number;

                if (direction) {
                    // Muzzle flash: cone spread
                    const speed = (15 + Math.random() * 25) * ((scaleMultiplier > 1) ? 1.5 : 1);
                    const spread = 0.8 * scaleMultiplier;
                    let dirX = direction[0] + (Math.random() - 0.5) * spread;
                    let dirY = direction[1] + (Math.random() - 0.5) * spread;
                    let dirZ = direction[2] + (Math.random() - 0.5) * spread;
                    vel = UT.VEC3_SCALE(UT.VEC3_NORMALIZE([dirX, dirY, dirZ]), speed);
                    life = (0.1 + Math.random() * 0.2) * (scaleMultiplier > 1 ? 1.5 : 1);
                } else {
                    // Explosion: spherical spread
                    const speed = (8 + Math.random() * 15) * scaleMultiplier;
                    let dirX = (Math.random() - 0.5) * 2;
                    let dirY = (Math.random() - 0.5) * 2 + 0.5; // bias upwards
                    let dirZ = (Math.random() - 0.5) * 2;
                    vel = UT.VEC3_SCALE(UT.VEC3_NORMALIZE([dirX, dirY, dirZ]), speed);
                    life = (0.4 + Math.random() * 0.6) * (scaleMultiplier > 1 ? 1.5 : 1);
                }
                
                this.particles.push({ pos, vel, life, maxLife: life, colorIdx: Math.floor(Math.random() * 3), scaleMultiplier, type: 'fire' });
            }
        }
    }

    update(ts: number): boolean {
        if (!this.active) return false;

        // Return false when fully dead
        let aliveCount = 0;
        const dt = ts / 1000;
        
        for (const p of this.particles) {
            p.life -= dt;
            if (p.life > 0) {
                aliveCount++;
                
                // physics
                if (p.type === 'smoke') {
                    p.vel[0] *= 0.92; // More drag
                    p.vel[2] *= 0.92;
                    p.vel[1] *= 0.92;
                    p.vel[1] += 8 * dt; // Smoke rises
                } else if (p.type === 'debris') {
                    p.vel[0] *= 0.98; // Less drag for solid fragments
                    p.vel[2] *= 0.98;
                    p.vel[1] -= 35 * dt; // Strong gravity
                } else if (p.type === 'flash') {
                    // stays in place
                } else {
                    // fire
                    p.vel[0] *= 0.85; // Heavy drag for an explosive "poof" stop
                    p.vel[2] *= 0.85;
                    p.vel[1] *= 0.85;
                    p.vel[1] += 5 * dt; // Fire slightly rises
                }
                
                p.pos[0] += p.vel[0] * dt;
                p.pos[1] += p.vel[1] * dt;
                p.pos[2] += p.vel[2] * dt;
            }
        }
        
        this.active = aliveCount > 0;
        return this.active;
    }

    draw() {
        if (!this.active) return;
        for (const p of this.particles) {
            if (p.life > 0) {
                const mesh = Explosion.particleMeshes.get(this.colorKeys[p.colorIdx]);
                if (!mesh) continue;
                
                let scale = 0;
                const lifeRatio = Math.max(0, p.life / p.maxLife);
                const invLifeRatio = 1.0 - lifeRatio; // 0 to 1
                
                if (p.type === 'smoke') {
                    // Smoke expands over time and shrinks slightly at end
                    scale = (0.5 + Math.sin(lifeRatio * Math.PI) * 0.8) * p.scaleMultiplier;
                } else if (p.type === 'flash') {
                    // Flash extremely fast decay out
                    scale = (lifeRatio * lifeRatio) * p.scaleMultiplier;
                } else if (p.type === 'debris') {
                    // Debris retains size mostly
                    scale = Math.max(0, lifeRatio) * p.scaleMultiplier;
                } else {
                    // Fire chunks shrink rapidly
                    scale = (lifeRatio * lifeRatio * 1.2) * (1.0 + Math.random() * 0.3) * p.scaleMultiplier; // Add some flicker
                }
                
                const ZERO: vec3 = [0,0,0];
                const mat = UT.MAT4_TRANSFORM(p.pos, ZERO, [scale, scale, scale], Explosion.qMat);
                gfx3MeshRenderer.drawMesh(mesh, mat);
            }
        }
    }
}
