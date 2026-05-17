# Project Map: ArcadeGPU Tank Pursuit

## Overview
ArcadeGPU Tank Pursuit is a 3D arcade-style tank combat game built using the **ArcadeGPU** engine. It leverages WebGPU (via high-level abstractions) and Jolt Physics for real-time interaction.

## Architecture
The project follows a modular React architecture for the UI and a custom ECS-like structure for the game logic.

### 📁 /arcadegpu-code
Contains the core engine library.
- `/src/lib/gfx3`: Core rendering abstractions.
- `/src/lib/gfx3_mesh`: Mesh loading and rendering (including JSM support).
- `/src/lib/gfx3_jolt`: Jolt Physics integration.
- `/src/lib/engine`: High-level engine managers.

### 📁 /components/App
Contains the main application logic.
- `App.tsx`: Main entry point for the game screen and input handling.
- `/game`: Game-specific entities.
  - `Tank.ts`: Player-controlled tank entity.
  - `Player.ts`: On-foot player character.
  - `Enemy.ts`: AI-controlled enemy tanks.
  - `Environment.ts`: Level building and static objects.
  - `Explosion.ts`: Particle effects and visual feedback.

### 📁 /public
Static assets used by the game.
- `/models`: **[NEW]** JSM format 3D models.
- `/textures`: UI elements and particle textures.
- `/wasms`: Binary physics engines (Jolt, Box2D).

## Key Workflows
1. **Rendering**: Uses `Gfx3MeshRenderer` with a custom shader stack that supports pixelation and retro effects.
2. **Physics**: Managed by `gfx3JoltManager`. Entities sync their `Gfx3Mesh` position/rotation with `Jolt` bodies every frame.
3. **AI**: Enemies use simple distance-based heuristics to chase and fire at the player.
4. **Interaction**: Players can enter/exit the tank using the `INTERACT` action (Key E).

## Development Guidelines
- **Models**: Use the JSM format for static meshes.
- **Physics**: Ensure every dynamic entity has a corresponding Jolt body.
- **Performance**: Use `Gfx3Drawable` tags for efficient batching and effect application.
