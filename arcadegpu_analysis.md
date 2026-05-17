# ArcadeGPU Integration Analysis & Report

## Executive Summary
ArcadeGPU is a powerful, WebGPU-native engine optimized for retro-arcade aesthetics (low-poly, pixelated, vertex jitter). Moving from Three.js to ArcadeGPU gives you better control over these specific styles without the overhead of a massive general-purpose engine.

## 🟢 WHAT TO KEEP (The Core Engine)

### 1. Library Source (`/arcadegpu-code/src/lib`)
This is the heart of the engine. Maintain these folders for a functional 3D React stack:
- **`gfx3/`**: Core 3D logic (managers, views, basic drawables).
- **`gfx3_mesh/`**: For loading `.obj`, `.jsm` (ArcadeGPU Static Mesh), and `.jam` (ArcadeGPU Animated Mesh).
- **`gfx3_camera/`**: WASD and Orbit cameras.
- **`gfx3_jolt/`**: The modern 3D physics bridge to Jolt Physics.
- **`gfx3_post/`**: The "secret sauce" for the retro look (Pixelation, Dithering, Fog).
- **`gfx3_lighting/`**: (Integrated within mesh renderer) support for up to 64 point lights and shadow mapping.
- **`core/`**: Critical math (Quaternions, Tweening, Object Pooling).
- **`engine/`**: Manages the main engine cycle and high-level configuration.
- **`input/`**: Essential for handling user control.

### 2. Assets (`/arcadegpu-code/public`)
- **`wasms/jolt-physics.wasm`**: **MANDATORY.** Physics will not initialize without this.
- **`textures/`**: Keep `default_noise.jpg`, `default_toon.png` as these are often referenced as fallbacks in shaders.

---

## 🔴 WHAT TO REMOVE (Cleanup Checklist)

### 1. Large Example Set (`/arcadegpu-code/src/examples`)
Delete this entire folder. It contains dozens of finished games and tech demos that you don't need for your custom project. **Potential Space Saving: ~15MB of code/assets.**

### 2. Standalone HTML Entry Points (`/arcadegpu-code/`)
- `examples.html`, `game.html`, `index.html`: These are entry points for the engine's original non-React architecture. Your entry point is the root `index.html`.

### 3. Built-in UI (`/arcadegpu-code/src/lib/ui_*`)
ArcadeGPU contains heavy canvas-based UI widgets (`ui_dialog`, `ui_menu`, `ui_bubble`).
- **Recommendation**: Remove them and use your existing React components + Tailwind for HUDs, menus, and text. Experience shows React is much easier for UI than direct canvas rendering.

### 4. 2D Engine (`/arcadegpu-code/src/lib/gfx2*`)
If you are doing a purely 3D game, you can remove `gfx2/` and all `gfx2_*` folders to lean out the engine. Note: Keep them if you plan on using 2D sprites *within* the 3D world (billboarding).

---

## 🚀 REACT INTEGRATION STEPS

### 1. Root dependencies
You will need to install these in your main `package.json`:
```bash
npm install jolt-physics vite-plugin-wasm vite-plugin-top-level-await stats.js
```

### 2. Vite Config Update
Your `vite.config.ts` needs to be updated to handle WebGPU and WASM:
```typescript
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// Add to plugins array in vite.config.ts
plugins: [
  react(),
  wasm(),
  topLevelAwait()
]
```

### 3. Creating a React "Viewport"
Instead of `Canvas` from R3F, create an `ArcadeViewport` component:
```tsx
import { useEffect, useRef } from 'react';
import { gfx3Manager, deviceManager } from '@lib/gfx3/gfx3_manager';

export function ArcadeViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function init() {
      // 1. Initialize WebGPU
      await deviceManager.initialize();
      // 2. Initialize GFX3 with the ref.current
      gfx3Manager.initialize(canvasRef.current);
      
      // ... setup your engine loop here
    }
    init();
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
```

### 4. Asset Pipeline
- Use the `gfx3MeshRenderer` for your 3D models.
- Convert 3D models to `.obj` or the engine's native formats for best compatibility.

---

## 📂 RECOMMENDED FILE STRUCTURE
```text
/src
  /lib (ArcadeGPU core - cleaned)
  /components
    /Game
      - ArcadeStage.tsx (React wrapper)
      - Player.tsx (Logic)
  /assets (Models, textures)
```
