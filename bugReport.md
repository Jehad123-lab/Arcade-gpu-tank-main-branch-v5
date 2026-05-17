# Bug Report Log

Tracking all issues, from critical bugs to minor suggestions.

## Critical (App Breaking)

-   **[RESOLVED] PROJECTILE PHYSICS DESYNC**: Shells weren't passing rotation to Jolt. Visually rotated, physically axis-aligned. Fixed by passing Euler-to-Quat to `addBox`.
-   **[RESOLVED] RECOIL CLIPPING**: Projectiles spawned at static offsets while barrel was recoiling, causing shells to spawn inside the turret. Fixed with dynamic muzzle offset.
-   **[RESOLVED] ELASTIC BOUNCE BUG**: Shells didn't explode on walls because speed didn't drop (elastic collision). Fixed by checking vector direction changes.
-   **[RESOLVED] THE 12-METER SAFE ZONE**: Projectiles were "invulnerable" for too long (0.1s), letting shells bounce off nearby walls without exploding. Fixed by tightening the window.
-   **[RESOLVED] TURRET INTERSECTION**: Turret center was at 0.675, body top at 0.45. Intersection caused Z-fighting/disappearing. Elevated to 0.85.
-   **[RESOLVED] GRENADE DUD BUG**: Grenades didn't explode if they came to a rest before life expired. Added expiry explosion logic.
-   **[RESOLVED] MOUSE LOOK/LOCK**: Added pointer lock and refined fire mappings for desktop feel.
-   **[RESOLVED] UI CLUTTER**: Virtual joysticks and action buttons now hide automatically in desktop mode.
-   **[RESOLVED] TANK DEFORMATION**: Sub-meshes drifted during rotation. Fixed with rigid matrix hierarchy sync.
-   **[RESOLVED] GROUND SINKING**: Visual meshes were offset downwards. Fixed by center-aligning meshes with physics bodies.
-   **[RESOLVED] CAMERA TRACKING**: Camera tracked stale mesh positions. Fixed by tracking physics bodies directly.
-   **[RESOLVED] CAMERA JITTER**: Refactored camera orbit interpolation to eliminate micro-shaking.
-   **[RESOLVED] TANK HANDLING**: Added momentum and improved steering responsiveness.
-   **[RESOLVED] AIMING DIFFICULTY**: Increased turret traverse speed and added red laser pointer for visual guidance. (Laser removed later per feedback).
-   **[RESOLVED] CAMERA AUTO-FOLLOW**: Camera now intelligently follows tank movement direction for easier navigation.
-   **[RESOLVED] ARCADE PHYSICS**: Controls now feature speed-sensitive steering and snappy braking/acceleration.
-   **[RESOLVED] EULER CRASH**: Fixed `toEuler` not a function error in `Tank.ts` and `Enemy.ts`.
-   **[RESOLVED] PHYSICS STEERING**: Refactored hull rotation to use angular velocity, allowing realistic environmental interactions and "bounce" during collisions.
-   **[RESOLVED] AIMING STABILITY**: Camera auto-follow now respects manual interaction, preventing the viewpoint from snapping while the player is actively tracking targets.
-   **[RESOLVED] COLLISION INSTABILITY**: Tank collided incorrectly and spun out of control because `SetRotation` overrode the physics solver every frame. Fixed by letting Pitch and Roll resolve dynamically through the Jolt physics engine while injecting precise target angular velocity for the Yaw steering.
-   **[RESOLVED] ENEMY PHYSICS & AI**: Refactored Enemy.ts to use the new robust physics scheme for rotation and movement, preventing collision jitter. Added basic ray-based obstacle avoidance so enemies path around static walls instead of driving into them endlessly.
-   **[RESOLVED] CLIPPING / FALLING THROUGH MAP**: A symptom of the previous physics instability setup (`AddTorque`) caused occasional extreme infinite forces applying downwards at the corners of the Box boundaries when driving over bumpy terrain heightmaps, pushing rigidbodies into the terrain plane until they tunneled under the floor. This bug was fixed by switching from massive torque forces `AddTorque` to precise target angular velocity resolution `SetAngularVelocity`. Also moved initial spawning `y` values higher up (so tanks drop into the action safely instead of spawning partially enclosed in hills), and added a catch-all teleport `posY < -5.0` check on the Tank/Enemy to guarantee we never stay stuck in the void.
-   **[RESOLVED] ENEMY APPEARANCE**: Enemies previously looked like miniature abstract boxes. Refactored the enemy mesh fallback system to reuse the exact dimensions and complex compound transformations (tracks, hatch, antenna, engine block) from the player's tank for maximum visual parity.
-   **[RESOLVED] CONTROLS & CAMERA**: Camera upgraded from a rigid tank-locked setup to a modern Orbit Camera with independent mouse look. Controls converted from retro "Resident evil tank controls" to a modern "Halo/Helldivers Twin Stick" system. The tank's hull automatically and intelligently rotates to face the user's camera-relative WASD input, dynamically selecting Reverse movement if the input direction is behind the tank's current facing angle.

## Warning (Unexpected Behavior)

-   ...

## Suggestion (Improvements)

-   [ ] Add more interactive SVG animations to the System Spec window for each rule.
-   ...
