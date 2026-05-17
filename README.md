# ArcadeGPU: Tank Pursuit v8

**ELI10 TLDR:** Drive your tank, aim the turret with your mouse, and blast enemy cubes with normal bullets or grenades while navigating a 3D pixelated battlefield.

A high-performance 3D Tank Game built with the **ArcadeGPU** engine. This project features real-time Jolt Physics, custom 3D mesh rendering, and a nostalgic arcade aesthetic.

**Remix:** [ai.studio/apps/cd4779aa-58fb-43a6-8a2f-757bb5829982](https://ai.studio/apps/cd4779aa-58fb-43a6-8a2f-757bb5829982)

## 🎮 Game Version: v0.3.1
*   **Engine:** ArcadeGPU v1.0
*   **Theme:** Retro-Arcade / Cyberpunk
*   **Performance:** 60FPS Target

## 🎮 How to Play

### Controls
*   **W A S D** - Drive the tank
*   **MOUSE** - Look around and aim your tank turret
*   **SPACE / LEFT CLICK** - Shoot normal projectiles (Thermal Rounds)
*   **SHIFT / RIGHT CLICK** - Throw grenade (Plasma Charges)
*   **Virtual Joystick / Buttons** - On-screen controls for mobile players

## 📁 Directory Structure

```text
/
├── arcadegpu-code/          # Core Engine Library (ArcadeGPU)
│   ├── src/lib/             # Engine Source (gfx3, jolt, input, etc.)
│   └── public/              # Core Assets (WASMs, standard textures)
├── components/
│   ├── App/                 # Main Application Components
│   │   ├── game/            # Game Entities (Tank, Enemy, Environment, Explosion)
│   │   └── App.tsx          # Main Game Screen Logic & UI Overlay
│   ├── Core/                # UI Design System Components
│   └── Package/             # Complex UI Modules
```

## 🛠 Developer Handoff Guide

### Key Systems

1.  **Input Handling**: Centralized in `inputManager`. Actions are registered in `GameScreen.onEnter()`. Pointer event propagation is explicitly stopped for touch UI buttons to prevent unintended camera movement while shooting/driving.
2.  **Continuous Fire**: Holding the fire button tracks the input state and recalculates recoil without requiring repeated button presses.
3.  **Entity Lifecycle**:
    -   `constructor()`: Setup physics bodies and load JSM meshes.
    -   `update(ts)`: Handle logic, move physics bodies, and sync mesh positions.
    -   `draw()`: Submit meshes to the `gfx3MeshRenderer`.
4.  **Targeting & Recoil**: The turret uses Shortest Angle Path to rotate towards the camera's yaw smoothly.

## ⚙️ Build and Run

1.  Ensure all dependencies are installed via `npm install`.
2.  Run the development server with `npm run dev`.
3.  Navigate to `localhost:3000` to play.

---
*Cleaned up /Encrypted directory and updated title references to ARCADE_GPU.*
