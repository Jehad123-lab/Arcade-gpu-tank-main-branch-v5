# Tank Controller System Design Spec
*A Senior Gameplay Engineer's Guide to Hybrid Tank Physics*

## 1. Movement System
### Fundamentals of Tracked Vehicles
Tanks don't have steering wheels; they have throttles for two separate drive sprockets. 
- **Differential Steering**: We calculate `Track_L` and `Track_R` speeds.
- **Pivot Logic**: If $W=0$ and $A \neq 0$, we apply equal and opposite forces to the tracks.
- **Blending**: As $W$ increases, we blend from "rotation" to "curved movement." 

### Acceleration & Weight
- **Inertia**: We use a `TargetSpeed` and `CurrentSpeed`. $CurrentSpeed = LERP(CurrentSpeed, TargetSpeed, AccelRate * ts)$.
- **Drag**: When $W=0$ and $S=0$, we apply a heavy `FrictionForce` to simulate the internal resistance of the gears. This prevents the "sliding car" feel.

## 2. Physics & Stability
### The "Stable Platform" Pattern
To avoid the annoying "tilting" while still feeling powerful:
- **Locked Pitch/Roll**: We keep the chassis pitch at 0 manually or via a stiff constraint.
- **Terrain Adaptation**: We raycast from four corners of the hull. We adjust the height (Y) but keep the orientation mostly parallel to the global UP, only tilting slightly on steep slopes to signal danger.
- **Recoil**: Instead of tilting the whole tank on firing, we recoil the **Barrel** and apply a very brief **Camera Shake**.

## 3. Turret & Aiming
### Decoupled Hierarchy
- **Hull**: Follows physics and movement input.
- **Turret**: Smoothly interpolates to look at the `AimPoint` (World Mouse Position).
- **Vertical Gun**: Clamped between limits (e.g., -10° to +25°).

### Mouse Aiming Logic
We use a **Turret Stabilization** algorithm:
1. Project a ray from the camera to the world.
2. Find the collision point (Ground or Enemy).
3. The Turret rotates around the Y-axis to face the point.
4. The Gun rotates around the X-axis (local) to match the angle.

## 4. Firing & Feedback
### Shell Ballistics
- **Projectile**: Use a bullet with `Velocity` and `Gravity`.
- **Trajectory**: $y = v_0 t \sin(\theta) - 0.5 g t^2$.
- **Feedback**:
  - **Muzzle Flash**: Bright PointLight for 0.05s.
  - **Smoke**: Particle burst at barrel tip.
  - **Kickback**: Move barrel back via GSAP, then return slowly.

## 5. Animation Tips for "Visual Weight"
- **Track Scrolling**: Texture offset = `CurrentSpeed * 0.1`.
- **Exhaust**: Particle rate increases as `EngineRPM` (mapped to input) goes up.
- **Idle Hum**: A subtle 2Hz vertical jitter on the whole model to simulate the engine vibration.

---
*Note: This system prioritizes player satisfaction. Real tanks are slower and harder to aim, but in games, we want the "Fantasy of Power".*
