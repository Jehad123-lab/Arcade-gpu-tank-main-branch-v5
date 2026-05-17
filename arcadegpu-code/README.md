**ArcadeGPU** is a modern game engine inspired by classic techniques that made retro games legendary.  
Designed for developers and artists who want complete freedom and maximum control, ArcadeGPU combines physics, rendering, and proven graphical pipelines to create unique experiences.

Why ArcadeGPU stands out:  
- Walkmesh and Hitmesh for simple and arcade physics.   
- Legacy aesthetics techniques.   
- Total rendering freedom: no forced scene graph, raw draw calls for direct control over every piece of your scene.   

Who is it for ?   
- Indie developers creating retro or experimental games.   
- Students and enthusiasts learning the foundations of physics and rendering.   
- Artists and retro tech lovers seeking authentic visual effects.  
- Modders and makers exploring new gameplay and technical experiences.   

# Quick Start
Once the project is created, follow the instructions to install dependencies:
```bash
cd arcadegpu
npm install
```
And start the dev server on browser:
```bash
npm run dev
```
Or start the dev server on desktop:
```bash
npm run dev:tauri
```

You should now have your ArcadeGPU project running!   
A homepage let you choose between your game screen and a set of examples.   
The game screen is located in src/game/main.js.   
The default scene of the game is located in public/scene.blend, open this file with the portable version
of Blender inside editor folder to navigate the scene.   

# Build
When you are ready to ship your app to production, run the following:
```bash
npm run build:game
```
This will create a production-ready build of your app in the project's ./dist directory.

# General highlights
- 👨‍🌾 **Examples:** +30 "real-life" samples
- 🧙 **Supports:** Browser and desktop with Tauri
- ✍ **Languages:** Typescript, WGSL
- 👩‍🎓 **Documentation:** Working on it
- 🧑‍🏫 **Contributions:** We welcome any help! Send me an email at aliyah.raijin (at) gmail (dot) com

# Features
- 👨‍💻 **2D Software Compatibility**
    - AseSprite compatible
    - EzSpriteSheet compatible
    - Tilekit compatible
    - SpriteFusion compatible
- ------------------------------------------------------------
- 👨‍💻 **3D Software Compatibility**
    - Blender compatible & real-time scene editing
- ------------------------------------------------------------
- 👾 **General**
    - Container Manager
    - Maths
    - Tweening
    - Events
    - Curves: Catmull-Rom
    - Quaternions
    - Object pooling
    - Physics primitives
    - Motion lines
- ------------------------------------------------------------
- 📐 **2D**
    - Sprite: Static, Animated
    - Tilemap: Isometric, Orthographic with tile animation
    - Tilemap Animation
    - Tilemap multi-layers and objects
    - Particles
    - Rendering filters
    - Bitmap font
- ------------------------------------------------------------
- 📐 **2D Physics**
    - BoundingRect
    - Arcade collision system with slopes support
    - Box2D built-in
- ------------------------------------------------------------
- 🧊 **3D General**
    - Debug renderer
    - Mesh renderer
    - Sprite renderer
    - Particles renderer
    - Skybox renderer
    - Sun renderer
    - Flares renderer
    - Post processing renderer
    - Shadow volume renderer
    - Multi-viewport
    - Camera: Isometric, Perspective, Clipping
    - Auto mip-map
    - Customizable shaders: Text insertions
    - Output multiple rendering attachments: Depth, Normal, Tag, Custom channel
- ------------------------------------------------------------
- 🧊 **3D Mesh**
    - Static & Animated mesh
    - OBJ loader
    - Billboarding
    - Fog
    - Vertex colorization
    - Decals
    - Shadow mapping
    - Normal smooth group
    - Directional light
    - Point lights: 64 lights
    - Spot lights: 16 lights
    - +16 custom params
    - +2 custom textures
- ------------------------------------------------------------
- 🧊 **3D Camera**
    - Orbit
    - WASD
- ------------------------------------------------------------
- 🧊 **3D Physics**
    - BoundingBox
    - BoundingCylinder
    - Walkmesh with BSP
    - Hitmesh with BSP
    - Ray-testing
    - Jolt built-in
- ------------------------------------------------------------
- 🧊 **3D Material**
    - Opacity
    - Texture albedo
    - Color blending
    - Light Phong reflection: Diffuse, Specular, Ambient, Emissive
    - Light Group
    - Shadow Mapping
    - Secondary texture albedo
    - Secondary texture blending mode: Mul or Mix
    - DuDv map: Multi-target
    - Normal map
    - Dissolve map
    - Diffuse map
    - Specular map
    - Emissive map
    - Normal map
    - Env map
    - Toon map
    - PSX Shader: Jitter vertex, Gouraud shading
    - Textures scroll: Multi-target
    - Flipbook UV: Multi-target
    - Decal group
    - Volumetric
    - Arcade custom shader effect: Experimental
    - +16 custom params
    - +2 custom textures
- ------------------------------------------------------------
- 🧊 **3D Post-processing**
    - Outline
    - Hardware dithering
    - Pixelation
    - Color depth limiting
    - Shadow volume
- ------------------------------------------------------------
- 🎮 **Input**
    - Action mapping
    - Gamepad, keyboard and mouse support
- ------------------------------------------------------------
- 🧠 **AI**
    - A* for 2D/3D with graph and grid
    - Djikstra graph
    - Min-max with alpha-beta pruning
- ------------------------------------------------------------
- 📺 **Screen**
    - Navigate between different view of your game
    - Resources pre-loading
- ------------------------------------------------------------
- 📜 **Scripts**
    - Load script from json file
    - Register async command function and call-it from json file
    - Manual jump to part of the script
    - Command primitives like: WAITPAD, GOTO, GOTO_IF, EXEC_IF, VAR_SET, VAR_ADD, VAR_SUB, DELAY
- ------------------------------------------------------------
- 🔊 **Sound**
    - Handle sounds by groups
    - Play multiple sounds at same time
- ------------------------------------------------------------
- 🌳 **Tree**
    - 2D binary space partition
    - 3D binary space partition
- ------------------------------------------------------------
- 🎨 **UI**
    - Focus/unfocus widgets
    - Fade in/out
    - Widget architecture
- ------------------------------------------------------------
- 🖍️ **UI Widgets**
    - Confetti
    - Dialog + choices
    - Dialog only
    - Print long text
    - Description list
    - Slider
    - Menu base
    - Menu list view
    - Menu text & sprites
    - Prompt
    - Sprite
    - Text
    - Input
    - Input keyboard
- ------------------------------------------------------------
- 🌆 **DNA**
    - ECS architecture implementation

# --------------------------------------------------------------------------------------------------
# Roadmap 1 - Codename: "Magic Ribbon"
# --------------------------------------------------------------------------------------------------

## Step 1 - Créer le ruban (facing camera ribbon)
- Cas d'usages:
    - Lasers de destruction
    - Nuées
    - etc...
- Fonctionnalités:
    - Génération des segments basé sur le temps (duration per segment)
    - Taille variable et définissable
    - Animation sprite de certaines parties OU défilement de texture
    - Bord du ruban estompés
    - UV Spécifique pour chaques segments
    - Gestion de la profondeur (faire en sorte que le ruban ait l'air de s'éloigner avec la caméra)
    - Affichage progressif à l'intérieur des segments (ont prends duration per segment, puis ont interpole le temps actuel pour linéarisé l'affichage de la texture dans le segment)
- Paramètres:
    - Nombres de segments
    - Plages de tailles par segment (largeur)
    - Possiblité d'affecter des plages UV par segment avec ou sans scrolling
    - Taux de réduction de taille par rapport à la distance
    - Reglage du temps d'affichage opaque des UV dans un segment (entre UV du vertex et UV du fragment = plus la distance est elevé plus la temps d'affichage est long)
    - Vitesse de génération
    - Opacité en début et en fin du ruban
    - Opacité totale
    - Remplissage intérieur / extérieur

# --------------------------------------------------------------------------------------------------
# Roadmap 2 - Codename: "The Legacy Reach"
# --------------------------------------------------------------------------------------------------

## Step 1 - Check the existing
- Construction d'une scène de démonstration constitué de l'essentiel des fonctions du moteur.
    - Theme: Jardin japonais

## Step 2 - Add features to the main shader
- Ajouter dans le shader principal:
    - Rotation UV
    - Ajouter tous les paramètres généraux de la scène (fog, etc...) dans le plugin
    - La envmap n'est pas correctement éditable dans le plugin Blender
    - Ajouter un nom pour chaque flipbook (permettra de gérer les animations comme tous les sprites)
    - Ajouter l'opacité de la envmap (canal alpha)
    - Supprimer le channel Alpha de la envmap dans le shader (passer en nuance de gris pour facteur shininess)
    - Vérifier la shininess de la specular map
    - Ajouter le défilement de texture pour les normales (pour les drapeaux, l'eau, etc...)

## Step 3 - Fast recheck
- Comparaison visuel du jardin entre étape 1 et 3.

## Step 4 - Add water shader
- Ajouter un shader d'eau (objectif: doit rendre une eau à la fois dans le style UT2K4 (min) et dans le style FFX (max) suivant les réglages)
    - Deux textures de normales
        - Image fixe avec défilement ou génération procédurale d'un bruit de perlin
    - Un bruit de perlin pour la couleur.
        - Image fixe avec défilement ou procédurale.
        - Mapping de la couleur avec un système de rampe de couleurs (linéaire entre deux plages) via texture
    - De l’eau proche de la caméra est plus claire et transparente, tandis que celle plus loin devient plus sombre ou saturée.
      Ce dégradé de couleur basé sur la profondeur donne l’illusion de profondeur sans calcul complexe
    - Gèrer la mousse par dessus l'eau avec un système sprite au niveau des bords
    - Gérer le vertex rippling
    - Reflexion possible avec une envmap
        - Déformation de la envmap par la normalmap
        - Déformation de la envmap par le vertex rippling
        - Déformation de la envmap par un bruit de perlin OU une DuDv scrollable
        - Bruit random de base dans tous les cas