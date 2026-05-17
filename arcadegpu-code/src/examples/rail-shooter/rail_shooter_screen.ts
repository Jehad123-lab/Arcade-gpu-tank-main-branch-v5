import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { gfx3DebugRenderer } from '@lib/gfx3/gfx3_debug_renderer';
import { Curve, CurveInterpolator } from '@lib/core/curve';
import { UT } from '@lib/core/utils';
import { Screen } from '@lib/screen/screen';
import { Gfx3Camera } from '@lib/gfx3_camera/gfx3_camera';
import { inputManager } from '@lib/input/input_manager';

// Distance de la caméra derrière le dragon
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 3;

// Vitesse de déplacement sur le rail
const RAIL_SPEED = 0.00005;

// Limites de déplacement du dragon autour du rail
const DRAGON_OFFSET_MAX_X = 5;
const DRAGON_OFFSET_MAX_Y = 3;
const DRAGON_MOVE_SPEED = 0.01;

// Taille du dragon (box)
const DRAGON_SIZE: vec3 = [1, 0.5, 2];

class RailShooterScreen extends Screen {
  camera: Gfx3Camera;
  curve: CurveInterpolator | null;
  curveVertices: number[];
  curveVertexCount: number;
  t: number; // Position sur la curve (0 à 1)
  dragonOffsetX: number; // Décalage horizontal du dragon
  dragonOffsetY: number; // Décalage vertical du dragon
  dragonPos: vec3;
  dragonMatrix: mat4;

  constructor() {
    super();
    this.camera = new Gfx3Camera(0);
    this.curve = null;
    this.curveVertices = [];
    this.curveVertexCount = 0;
    this.t = 0.05;
    this.dragonOffsetX = 0;
    this.dragonOffsetY = 0;
    this.dragonPos = [0, 0, 0];
    this.dragonMatrix = UT.MAT4_IDENTITY();
  }

  async onEnter(): Promise<void> {
    inputManager.registerAction('keyboard', 'KeyQ', 'LEFT');
    inputManager.registerAction('keyboard', 'KeyZ', 'UP');
    inputManager.registerAction('keyboard', 'KeyD', 'RIGHT');
    inputManager.registerAction('keyboard', 'KeyS', 'DOWN');

    // Charger la curve du rail (définie en dur pour simplifier)
    const points: Array<number[]> = [
      [0, 5, 0],
      [0, 5, 0],
      [20, 5, 10],
      [40, 8, 0],
      [60, 5, -10],
      [80, 5, 0],
      [100, 8, 10],
      [120, 5, 0],
      [120, 5, 0]
    ];

    this.curve = Curve.createInterpolator(points, { tension: 0.3, closed: false });

    // Générer les vertices pour visualiser la curve (ligne verte)
    for (let i = 0; i <= 0.99; i += 0.005) {
      const p0 = this.curve.getPointAt(i);
      const p1 = this.curve.getPointAt(i + 0.005);
      this.curveVertices.push(p0[0], p0[1], p0[2]!, 0, 1, 0);
      this.curveVertices.push(p1[0], p1[1], p1[2]!, 0, 1, 0);
      this.curveVertexCount += 2;
    }
  }

  update(ts: number): void {
    if (!this.curve) return;

    // Avancer sur le rail
    if (this.t < 0.95) {
      this.t += RAIL_SPEED * ts;
    } else {
      // Boucler la curve
      this.t = 0.05;
    }

    // let rotationX = 0;
    // let rotationZ = 0;

    // Contrôles du dragon (décalage autour du rail)
    if (inputManager.isActiveAction('LEFT')) {
      this.dragonOffsetX = Math.max(this.dragonOffsetX - DRAGON_MOVE_SPEED * ts, -DRAGON_OFFSET_MAX_X);
    }
    if (inputManager.isActiveAction('RIGHT')) {
      this.dragonOffsetX = Math.min(this.dragonOffsetX + DRAGON_MOVE_SPEED * ts, DRAGON_OFFSET_MAX_X);
    }
    if (inputManager.isActiveAction('UP')) {
      this.dragonOffsetY = Math.min(this.dragonOffsetY + DRAGON_MOVE_SPEED * ts, DRAGON_OFFSET_MAX_Y);
    }
    if (inputManager.isActiveAction('DOWN')) {
      this.dragonOffsetY = Math.max(this.dragonOffsetY - DRAGON_MOVE_SPEED * ts, -DRAGON_OFFSET_MAX_Y);
    }

    // Obtenir position et direction sur la curve
    const railPos = this.curve.getPointAt(this.t) as vec3;
    const tangent = UT.VEC3_NORMALIZE(this.curve.getTangentAt(this.t) as vec3);

    // Calculer les axes locaux du rail
    const up: vec3 = [0, 1, 0];
    const right = UT.VEC3_NORMALIZE(UT.VEC3_CROSS(tangent, up));
    const realUp = UT.VEC3_NORMALIZE(UT.VEC3_CROSS(right, tangent));

    // Position du dragon avec offset
    this.dragonPos = [
      railPos[0] + right[0] * this.dragonOffsetX + realUp[0] * this.dragonOffsetY,
      railPos[1] + right[1] * this.dragonOffsetX + realUp[1] * this.dragonOffsetY,
      railPos[2] + right[2] * this.dragonOffsetX + realUp[2] * this.dragonOffsetY
    ];

    // Construire la matrice de transformation du dragon
    // this.dragonMatrix = UT.MAT4_TRANSLATE(this.dragonPos[0], this.dragonPos[1], this.dragonPos[2]);

    this.dragonMatrix = UT.MAT4_LOOKAT(this.dragonPos, [
      this.dragonPos[0] + tangent[0],
      this.dragonPos[1] + tangent[1],
      this.dragonPos[2] + tangent[2]
    ]);

    this.dragonMatrix = UT.MAT4_MULTIPLY(this.dragonMatrix, UT.MAT4_ROTATE_Z(0.1));

    // Position de la caméra (derrière le dragon)
    const camPos: vec3 = [
      this.dragonPos[0] - tangent[0] * CAMERA_DISTANCE + realUp[0] * CAMERA_HEIGHT,
      this.dragonPos[1] - tangent[1] * CAMERA_DISTANCE + realUp[1] * CAMERA_HEIGHT,
      this.dragonPos[2] - tangent[2] * CAMERA_DISTANCE + realUp[2] * CAMERA_HEIGHT
    ];
    this.camera.setPosition(camPos[0], camPos[1], camPos[2]);
    this.camera.lookAt(this.dragonPos[0], this.dragonPos[1], this.dragonPos[2]);
  }

  draw(): void {
    gfx3Manager.beginDrawing();

    // Dessiner la grille au sol
    gfx3DebugRenderer.drawGrid(UT.MAT4_IDENTITY(), 50, 5, [0.3, 0.3, 0.3]);

    // Dessiner la curve (rail)
    gfx3DebugRenderer.drawVertices(this.curveVertices, this.curveVertexCount);

    // Dessiner le dragon (box bleue)
    const min: vec3 = [-DRAGON_SIZE[0]/2, -DRAGON_SIZE[1]/2, -DRAGON_SIZE[2]/2];
    const max: vec3 = [DRAGON_SIZE[0]/2, DRAGON_SIZE[1]/2, DRAGON_SIZE[2]/2];
    gfx3DebugRenderer.drawBoundingBox(this.dragonMatrix, min, max, [0, 0.5, 1]);

    // Dessiner un gizmo au centre du dragon pour voir l'orientation
    gfx3DebugRenderer.drawGizmo(this.dragonMatrix, 1);

    gfx3Manager.endDrawing();
  }

  render(): void {
    gfx3Manager.beginRender();
    gfx3Manager.beginPassRender(0);
    gfx3DebugRenderer.render();
    gfx3Manager.endPassRender();
    gfx3Manager.endRender();
  }
}

export { RailShooterScreen };

