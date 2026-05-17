import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { gfx3DebugRenderer } from '@lib/gfx3/gfx3_debug_renderer';
import { Curve, CurveInterpolator } from '@lib/core/curve';
import { UT } from '@lib/core/utils';
import { Screen } from '@lib/screen/screen';
import { Gfx3Camera } from '@lib/gfx3_camera/gfx3_camera';
import { inputManager } from '@lib/input/input_manager';
import { Quaternion } from '@lib/core/quaternion';

// Caméra
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 3;
const CAMERA_LERP = 0.09;

// Déplacements
const DRAG = 0.97;
const BOUNCE_FACTOR = 0.5;

// Antigravité
const HOVER_HEIGHT = 1.2;      // hauteur cible au-dessus du rail
const HOVER_STRENGTH = 0.0002; // force du ressort
const HOVER_DAMPING = 0.015;   // amortissement vertical
const GRAVITY = 0.0001;

interface Ship {
  pos: vec3;
  velocity: vec3;
  yaw: number;
  roll: number;
  pitch: number;
  matrix: mat4;
  size: vec3;
  forward: vec3;
  acceleration: number;
  maxSpeed: number;
  accelerationSpeed: number;
  maxAcceleration: number;
  turnSpeed: number;
};

interface Circuit {
  curve: CurveInterpolator;
  verticesCenter: number[];
  verticesLeft: number[];
  verticesRight: number[];
  vertexCount: number;
  width: number;
}

class RacingShipScreen extends Screen {
  camera: Gfx3Camera;
  camFollowPos: vec3;
  railPos: vec3;
  railTangent: vec3;
  circuit: Circuit;
  ship: Ship;
  minShip: vec3;
  maxShip: vec3;

  constructor() {
    super();
    this.camera = new Gfx3Camera(0);
    this.camFollowPos = [0, 0, 0];
    this.railPos = [0, 0, 0];
    this.railTangent = [0, 0, 0];

    this.circuit = {
      curve: new CurveInterpolator([[0, 0, 0], [1, 1, 1]]),
      verticesCenter: [],
      verticesLeft: [],
      verticesRight: [],
      vertexCount: 0,
      width: 1
    };

    this.ship = {
      pos: [0, 0, 0],
      velocity: [0, 0, 0],
      yaw: 0,
      roll: 0,
      pitch: 0,
      matrix: UT.MAT4_IDENTITY(),
      size: [1.2, 0.4, 2.0],
      forward: [0, 0, 1],
      acceleration: 0,
      maxAcceleration: 0.1,
      maxSpeed: 0.1,
      accelerationSpeed: 0.3,
      turnSpeed: 3
    };

    this.minShip = [-this.ship.size[0] / 2, -this.ship.size[1] / 2, -this.ship.size[2] / 2];
    this.maxShip = [this.ship.size[0] / 2, this.ship.size[1] / 2, this.ship.size[2] / 2];
  }

  async onEnter(): Promise<void> {
    this.circuit = await this.createCircuit('./examples/racing-ship/circuit.jlm', 5);

    const startPoint = this.circuit.curve.getPointAt(0) as vec3;
    const normalPoint = this.circuit.curve.getNormalAt(0) as vec3;
    this.ship.pos = [startPoint[0], startPoint[1] + 5, startPoint[2]];
    this.ship.yaw = UT.VEC2_ANGLE([normalPoint[0], normalPoint[2]]);

    this.camFollowPos = [this.ship.pos[0], this.ship.pos[1] + 10, this.ship.pos[2] - 10];
  }

  update(ts: number): void {
    this.updateOrientation(ts);
    this.updateAcceleration(ts);
    this.updateVelocity(ts);
    this.updateRailCurrentPosition();
    this.updateCollision(ts);
    this.updateAntiGravity(ts);
    this.updatePosition(ts);
    this.updateDamping(ts);
    this.updatePitch();
    this.updateTransform();
    this.updateCamera();
  }

  updateOrientation(ts: number) {
    const speed = UT.VEC3_LENGTH(this.ship.velocity);
    const speedFactor = speed / this.ship.maxSpeed;

    if (inputManager.isActiveAction('LEFT')) {
      this.ship.yaw -= speedFactor * this.ship.turnSpeed * (ts / 1000);
      this.ship.roll = UT.LERP(this.ship.roll, -0.5, 0.08);
    }
    else if (inputManager.isActiveAction('RIGHT')) {
      this.ship.yaw += speedFactor * this.ship.turnSpeed * (ts / 1000);
      this.ship.roll = UT.LERP(this.ship.roll, 0.5, 0.08);
    }
    else {
      this.ship.roll = UT.LERP(this.ship.roll, 0, 0.05);
    }

    this.ship.forward = [-Math.sin(this.ship.yaw), 0, Math.cos(this.ship.yaw)];
  }

  updateAcceleration(ts: number) {
    if (inputManager.isActiveAction('UP')) {
      this.ship.acceleration += this.ship.accelerationSpeed * (ts / 1000);
    }
    else {
      this.ship.acceleration -= this.ship.accelerationSpeed * 30 * (ts / 1000);
    }

    this.ship.acceleration = UT.CLAMP(this.ship.acceleration, 0, this.ship.maxAcceleration);
    this.ship.acceleration = UT.DEADZONE(this.ship.acceleration, 0.001);
  }

  updateVelocity(ts: number) {
    this.ship.velocity[0] += this.ship.forward[0] * this.ship.acceleration * (ts / 1000);
    this.ship.velocity[2] += this.ship.forward[2] * this.ship.acceleration * (ts / 1000);
    this.ship.velocity[0] = UT.CLAMP(this.ship.velocity[0], -this.ship.maxSpeed, this.ship.maxSpeed);
    this.ship.velocity[2] = UT.CLAMP(this.ship.velocity[2], -this.ship.maxSpeed, this.ship.maxSpeed);
  }

  updateRailCurrentPosition() {
    if (!this.circuit.curve) {
      return;
    }

    let minDist = Infinity;
    let tNearest = 0;

    const p1 = [this.ship.pos[0] - this.ship.size[0] / 2, 0, this.ship.pos[2] - this.ship.size[2] / 2];
    const p2 = [this.ship.pos[0] - this.ship.size[0] / 2, 0, this.ship.pos[2] + this.ship.size[2] / 2];
    const p3 = [this.ship.pos[0] + this.ship.size[0] / 2, 0, this.ship.pos[2] - this.ship.size[2] / 2];
    const p4 = [this.ship.pos[0] + this.ship.size[0] / 2, 0, this.ship.pos[2] + this.ship.size[2] / 2];
    const shipPoints = [p1, p2, p3, p4];

    for (let i = 0; i <= 1; i += 0.01) { // Recherche du point de rail le plus proche (projection XZ)
      for (const sp of shipPoints) {
        const p = this.circuit.curve.getPointAt(i) as number[];
        const dx = sp[0] - p[0];
        const dz = sp[2] - p[2];
        const d = Math.sqrt(dx * dx + dz * dz);

        if (d < minDist) {
          minDist = d;
          tNearest = i;
        }
      }
    }

    this.railPos = this.circuit.curve.getPointAt(tNearest) as vec3;
    this.railTangent = UT.VEC3_NORMALIZE(this.circuit.curve.getTangentAt(tNearest) as vec3);
  }

  updateCollision(ts: number) {
    const right = UT.VEC3_NORMALIZE(
      UT.VEC3_CROSS(this.railTangent, [0, 1, 0])
    );

    const toShip: vec3 = [
      this.ship.pos[0] - this.railPos[0],
      0,
      this.ship.pos[2] - this.railPos[2]
    ];

    const lateralDist = UT.VEC3_DOT(toShip, right);
    const limit = this.circuit.width - this.ship.size[0] / 2;

    if (Math.abs(lateralDist) > limit) { // Limites latérales de la piste
      const correction = (Math.sign(lateralDist) * limit) - lateralDist;

      this.ship.pos[0] += right[0] * correction;
      this.ship.pos[2] += right[2] * correction;

      const dot = UT.VEC3_DOT(this.ship.velocity, right);
      this.ship.velocity[0] -= right[0] * dot * BOUNCE_FACTOR;
      this.ship.velocity[2] -= right[2] * dot * BOUNCE_FACTOR;
    }
  }

  updateAntiGravity(ts: number) {
    const distanceFromGround = this.ship.pos[1] - this.railPos[1];
    const error = HOVER_HEIGHT - distanceFromGround;

    if (distanceFromGround < HOVER_HEIGHT * 2) {
      this.ship.velocity[1] += error * HOVER_STRENGTH * ts;
      this.ship.velocity[1] -= this.ship.velocity[1] * HOVER_DAMPING * ts;
    }

    this.ship.velocity[1] -= GRAVITY * ts;
  }

  updatePosition(ts: number) {
    this.ship.pos[0] += this.ship.velocity[0] * ts;
    this.ship.pos[1] += this.ship.velocity[1] * ts;
    this.ship.pos[2] += this.ship.velocity[2] * ts;
  }

  updateDamping(ts: number) {
    this.ship.velocity[0] *= Math.pow(DRAG, ts / 16);
    this.ship.velocity[2] *= Math.pow(DRAG, ts / 16);
    this.ship.velocity[1] *= Math.pow(0.99, ts / 16);
  }

  updatePitch() {
    const slopeAngle = Math.atan2(
      this.railTangent[1],
      Math.sqrt(this.railTangent[0] ** 2 + this.railTangent[2] ** 2)
    );

    this.ship.pitch = UT.LERP(this.ship.pitch, slopeAngle, 0.1);
  }

  updateTransform() {
    this.ship.matrix = UT.MAT4_TRANSFORM(this.ship.pos, [this.ship.pitch, this.ship.yaw, this.ship.roll], [1, 1, 1], new Quaternion());
  }

  updateCamera() {
    const camTargetPos: vec3 = [ // Caméra qui suit avec inertie
      this.ship.pos[0] - this.ship.forward[0] * CAMERA_DISTANCE,
      this.ship.pos[1] + CAMERA_HEIGHT,
      this.ship.pos[2] - this.ship.forward[2] * CAMERA_DISTANCE
    ];

    this.camFollowPos[0] = UT.LERP(this.camFollowPos[0], camTargetPos[0], CAMERA_LERP);
    this.camFollowPos[1] = UT.LERP(this.camFollowPos[1], camTargetPos[1], CAMERA_LERP);
    this.camFollowPos[2] = UT.LERP(this.camFollowPos[2], camTargetPos[2], CAMERA_LERP);

    this.camera.setPosition(
      this.camFollowPos[0],
      this.camFollowPos[1],
      this.camFollowPos[2]
    );

    this.camera.lookAt(
      this.ship.pos[0] + this.ship.forward[0] * 5,
      this.ship.pos[1],
      this.ship.pos[2] + this.ship.forward[2] * 5
    );
  }

  draw(): void {
    gfx3Manager.beginDrawing();

    gfx3DebugRenderer.drawGrid(
      UT.MAT4_ROTATE_X(Math.PI * 0.5),
      100,
      10,
      [0.1, 0.1, 0.1]
    );

    gfx3DebugRenderer.drawVertices(this.circuit.verticesCenter, this.circuit.vertexCount);
    gfx3DebugRenderer.drawVertices(this.circuit.verticesLeft, this.circuit.vertexCount);
    gfx3DebugRenderer.drawVertices(this.circuit.verticesRight, this.circuit.vertexCount);
    gfx3DebugRenderer.drawBoundingBox(this.ship.matrix, this.minShip, this.maxShip, [0, 1, 1]);

    gfx3DebugRenderer.drawGizmo(this.ship.matrix, 1.5);
    gfx3Manager.endDrawing();
  }

  render(): void {
    gfx3Manager.beginRender();
    gfx3Manager.beginPassRender(0);
    gfx3DebugRenderer.render();
    gfx3Manager.endPassRender();
    gfx3Manager.endRender();
  }

  async createCircuit(path: string, width: number): Promise<Circuit> {
    let curve = await Curve.createFromFile(path);
    let verticesCenter = [];
    let verticesLeft = [];
    let verticesRight = [];
    let vertexCount = 0;

    for (let i = 0; i <= 1; i += 0.005) {
      const p0 = curve.getPointAt(i) as number[];
      const p1 = curve.getPointAt((i + 0.005) % 1) as number[];

      const tangent = UT.VEC3_NORMALIZE(curve.getTangentAt(i) as vec3);
      const right = UT.VEC3_NORMALIZE(UT.VEC3_CROSS(tangent, [0, 1, 0]));

      verticesCenter.push(
        p0[0], p0[1], p0[2], 1, 1, 0,
        p1[0], p1[1], p1[2], 1, 1, 0
      );

      verticesLeft.push(
        p0[0] - right[0] * width, p0[1], p0[2] - right[2] * width, 1, 0, 0,
        p1[0] - right[0] * width, p1[1], p1[2] - right[2] * width, 1, 0, 0
      );

      verticesRight.push(
        p0[0] + right[0] * width, p0[1], p0[2] + right[2] * width, 1, 0, 0,
        p1[0] + right[0] * width, p1[1], p1[2] + right[2] * width, 1, 0, 0
      );

      vertexCount += 2;
    }

    return {
      curve,
      verticesCenter,
      verticesLeft,
      verticesRight,
      vertexCount,
      width
    };
  }
}

export { RacingShipScreen };

