# ArcadeGPU Camera & Movement Controls

This document explains the implementation of car movement and camera systems in ArcadeGPU, based on the `car-arcade` example.

## Movement Logic (`CarController`)

The movement logic is built on top of the **Walkmesh** system (`Gfx3PhysicsJWM`), which provides robust ground detection and simple arcade collisions.

### 1. Dynamics
- **Speed**: Managed with `accelerationSpeed`, `brakeFriction`, and `engineBrakeFriction` multipliers. Speed is clamped by `maxSpeed`.
- **Sens (Sensitivity/Direction)**: A value of `1` (Forward), `-1` (Backward), or `0` (Idle). It determines the current "intent" of movement.
- **Handbrake**: Reduces `adherence` and increases `friction`, allowing for drifting-like behavior (though full drifting is marked as TODO in the source).

### 2. Steering
- **Wheel Angle**: Rotates incrementally when steering inputs are active, and "auto-centers" when released.
- **Direction Angle**: The vehicle's orientation in world space. It is calculated as:
  `directionAngle += adherence * sens * wheelAngle * speedFactor * rotationFactor`.
  - **Swiftness Map**: A curve used to reduce steering sensitivity as the speed increases, preventing oversteer at high velocities.

### 3. Collision & Ground Alignment
- **Chassis Points**: 4 points (FL, FR, RL, RR) representing the car's corners are projected onto the ground.
- **Elevation Snap**: The car's Y position is set to `ground_elevation + rideHeight`.
- **Pitch & Roll**: Calculated by comparing the elevation of front vs rear points (Pitch) and left vs right points (Roll).
- **Collision**: Each movement step checks these points against the walkmesh walls.

### 4. Airborne Physics
- The car enters the `airborne` state if the suspension is fully extended (e.g., driving off a cliff or hitting a ramp).
- While airborne, gravity is applied to `verticalVelocity`.
- The state returns to `grounded` when the mesh Y position falls below the ground elevation.

## Camera Logic (`CarArcadeScreen`)

The camera uses a **Smooth Chase** behavior.

### 1. Distance & Height
The camera is kept at a fixed `CAMERA_DISTANCE` (e.g., 15 units) behind the car and `CAMERA_HEIGHT` (e.g., 5 units) above it.

### 2. Target Position
The ideal camera position (`camTargetPos`) is calculated relative to the car's position and its `forward` vector:
`targetPos = carPos - (carForward * distance) + (UP * height)`

### 3. Smoothing (LERP)
To avoid jerky movements, the actual camera position transitions toward the `targetPos` using Linear Interpolation (LERP) at a factor of `0.1` per frame.

### 4. Orientation (LookAt)
The camera always looks at the car's position, typically with a small vertical offset (e.g., +1 unit) to frame the vehicle better.

---
*For implementation details, refer to `arcadegpu-code/src/examples/car-arcade/car_controller.ts` and `arcadegpu-code/src/examples/car-arcade/car_arcade_screen.js`.*
