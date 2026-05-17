---
name: arcadegpu-controls
description: Technical guide for implementing arcade-style car movement and chase camera systems using ArcadeGPU's Walkmesh physics.
---

# ArcadeGPU Camera & Movement Controls

This skill provides the architectural pattern and implementation details for creating high-performance arcade vehicle controls and responsive chase cameras in the ArcadeGPU engine.

## 1. Movement System (CarController)

The ArcadeGPU vehicle system relies on a **Walkmesh-based Physics** approach (`Gfx3PhysicsJWM`), which is more performant and "arcade-feel" friendly than full rigid-body simulations.

### Core Architecture
Vehicle movement is managed by the `CarController` class, which decouples input, acceleration, steering, and vertical physics.

#### A. Input & Sensitivity
Inputs are mapped to boolean flags (`inputAccel`, `inputBrake`, etc.). The direction of movement is tracked via `sens`:
- `sens = 1`: Forward
- `sens = -1`: Backward
- `sens = 0`: Idle

#### B. Acceleration Logic
Speed is updated incrementally based on the current state:
- **Boost**: Applied when starting from `idle`.
- **Engine Braking**: Friction applied when no inputs are active.
- **Friction**: Different constants for normal braking vs. handbraking.
- **Clamping**: `UT.CLAMP(speed, -maxSpeed, maxSpeed)` ensures the car stays within manageable limits.

#### C. Steering & Direction
1. **Wheel Angle**: The `wheelAngle` (steering rack position) is updated by `steerSpeed`. It automatically centers when no input is provided.
2. **Vehicle Rotation**: The `directionAngle` (actual heading) depends on the `wheelAngle`, current `speed`, and `sens`.
   - **Rotation Factor**: Use `UT.MAP_VALUE_FROM_CURVE` to reduce steering sensitivity at high speeds (Swiftness Map).

#### D. Collision & Walkmesh Integration
ArcadeGPU uses "Chassis Points" (FL, FR, RL, RR) to detect walls and terrain:
- **Collision Check**: Iterate through chassis points and test them against the walkmesh using `this.walkmesh.testWalkPoint`.
- **Movement**: Move points to their new calculated positions using `this.walkmesh.moveWalkPoint`.

### 2. Vertical Physics & Suspensions
Vehicle pitch and roll are calculated dynamically to align with the terrain.

- **Ground Snap**: When `grounded`, the car's Y position is snapped to `elevation + rideHeight`.
- **Suspension Integration**: Each wheel calculates its distance to the ground. If the "compression" becomes too high or the terrain drops sharply (cliff/springboard), the car enters the `airborne` state.
- **Airborne State**: 
  - `verticalVelocity` is affected by `gravity`.
  - The car ignores ground-snapping until `position.y < ground_elevation`.
- **Rotation**:
  - **Pitch**: `Math.atan2(frontAvgY - rearAvgY, wheelBase)`
  - **Roll**: `Math.atan2(leftAvgY - rightAvgY, trackWidth)`

## 3. Camera System (Chase Follow)

A classic arcade chase camera combines distance-based positioning with smooth interpolation (LERP) and target-tracking (LookAt).

### Camera Positioning Recipe
```javascript
const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 5;
const CAMERA_LERP = 0.1;

function updateCamera(car, camera, camFollowPos) {
  const carPos = car.getPosition();
  const forward = car.getForwardVector();

  // 1. Calculate Target Position (behind the car)
  const targetPos = [
    carPos[0] - forward[0] * CAMERA_DISTANCE,
    carPos[1] + CAMERA_HEIGHT,
    carPos[2] - forward[2] * CAMERA_DISTANCE
  ];

  // 2. Smooth Interpolation (LERP)
  camFollowPos[0] = UT.LERP(camFollowPos[0], targetPos[0], CAMERA_LERP);
  camFollowPos[1] = UT.LERP(camFollowPos[1], targetPos[1], CAMERA_LERP);
  camFollowPos[2] = UT.LERP(camFollowPos[2], targetPos[2], CAMERA_LERP);

  // 3. Apply Transform
  camera.setPosition(camFollowPos[0], camFollowPos[1], camFollowPos[2]);
  
  // 4. Track Target (usually look at car center + vertical offset)
  camera.lookAt(carPos[0], carPos[1] + 1, carPos[2]);
}
```

## Best Practices
- **Deadzone Everything**: Use `UT.DEADZONE` on inputs and tiny velocities to prevent "shivering" or jittering when nearly stopped.
- **Input Sampling**: Always sample inputs in the main `update` loop of the `Screen` or `Scene` and pass them to the `Controller`.
- **Walkmesh Resolution**: Ensure the `.jwm` walkmesh is clean. Complex geometries should be simplified into a walkmesh for smooth arcade collisions.
- **Frame Independence**: All movement calculations (speed, rotation) must be multiplied by `ts / 1000` (Delta Time) to ensure consistent behavior across different hardware.
