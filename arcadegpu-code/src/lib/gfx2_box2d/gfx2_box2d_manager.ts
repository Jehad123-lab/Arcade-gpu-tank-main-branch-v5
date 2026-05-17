import Box2DFactory from 'box2d-wasm/dist/es/Box2D.simd';
// ---------------------------------------------------------------------------------------
import { gfx2Manager } from '../gfx2/gfx2_manager';
import { makeDebugDraw } from './gfx2_box2d_debug.js';
// ---------------------------------------------------------------------------------------
const Gfx2Box2D = await Box2DFactory({ locateFile: (url, scriptDirectory) => '/wasms/box2d.wasm' });
// ---------------------------------------------------------------------------------------

// Box2D constants
export const BOX2D_GRAVITY = 9.8;
export const BOX2D_MAX_TIMESTEP = 1 / 60;
export const BOX2D_PPM = 32;
export const BOX2D_PM = 1 / BOX2D_PPM;
export const BOX2D_MP = BOX2D_PPM;

// Utilities
export const BOX2D_VEC2_TO_VEC2 = (v: Box2D.b2Vec2): vec2 => [v.get_x(), v.get_y()];
export const VEC2_TO_BOX2D_VEC2 = (v: vec2): Box2D.b2Vec2 => new Gfx2Box2D.b2Vec2(v[0], v[1]);

export interface Gfx2Box2DCreatePrimitiveOptions {
  x?: number;
  y?: number;
  angle?: number;
  dynamic?: boolean;
  density?: number;
  metaData?: any;
}

export interface Gfx2Box2DDebugLine {
  from: vec2;
  to: vec2;
  color: string;
  width: number;
}

interface Gfx2Box2DRayCast {
  fixture: Box2D.b2Fixture | null;
  point: Box2D.b2Vec2;
  normal: Box2D.b2Vec2;
  fraction: number;
}

export interface Gfx2Box2DCharacterOptions {
  x?: number;
  y?: number;
  shapeType?: 'circle' | 'capsule';
  width?: number;
  height?: number;
  density?: number;
  circleRadius?: number;
  accelOnGround?: number;
  accelOnAir?: number;
  groundSpeed?: number;
  airSpeed?: number;
  jumpImpulse?: number;
  airJump?: boolean;
  canControlAir?: boolean;
  metaData?: any;
}

export class Gfx2Box2DCharacter {
  x: number;
  y: number;
  shapeType: 'circle' | 'capsule';
  width: number;
  height: number;
  density: number;
  circleRadius: number;
  accelOnGround: number;
  accelOnAir: number;
  groundSpeed: number;
  airSpeed: number;
  jumpImpulse: number;
  airJump: boolean;
  canControlAir: boolean;
  metaData: any;
  inputDir: vec2;
  inputJump: boolean;
  body: Box2D.b2Body | null;
  feetFixture: Box2D.b2Fixture | null;
  trunkFixture: Box2D.b2Fixture | null;
  headFixture: Box2D.b2Fixture | null;

  constructor(options: Gfx2Box2DCharacterOptions = {}) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.shapeType = options.shapeType ?? 'capsule';
    this.width = options.width ?? 1;
    this.height = options.height ?? 2;
    this.density = options.density ?? 1.0;
    this.circleRadius = options.circleRadius ?? 1;
    this.accelOnGround = options.accelOnGround ?? 0.5;
    this.accelOnAir = options.accelOnAir ?? 0.2;
    this.groundSpeed = options.groundSpeed ?? 10;
    this.airSpeed = options.airSpeed ?? 5;
    this.jumpImpulse = options.jumpImpulse ?? -5;
    this.airJump = options.airJump ?? false;
    this.canControlAir = options.canControlAir ?? true;
    this.metaData = {};
    this.inputDir = [0, 0];
    this.inputJump = false;
    this.body = null;
    this.feetFixture = null;
    this.trunkFixture = null;
    this.headFixture = null;

    if (this.width >= this.height) {
      throw new Error('Gfx2Box2DCharacter::constructor(): The capsule width cannot be upper to height');
    }
  }

  updateHook(ray: Gfx2Box2DRayCast, onGround: boolean): void {}
}

/**
 * Singleton 2D physics manager that wrap the Box2D physics engine.
 */
class Gfx2Box2DManager {
  world: Box2D.b2World;
  velocityIterations: number;
  positionIterations: number;
  showDebug: boolean;
  debugDraw: Box2D.JSDraw;
  drawDebugLines: Array<Gfx2Box2DDebugLine>;
  characters: Gfx2Box2DCharacter[];
  metaData: any;

  constructor() {
    // Initialize Box2D
    this.world = new Gfx2Box2D.b2World(new Gfx2Box2D.b2Vec2(0, BOX2D_GRAVITY));
    this.velocityIterations = 1;
    this.positionIterations = 1;
    this.showDebug = true;
    this.debugDraw = makeDebugDraw(gfx2Manager.getContext(), BOX2D_PPM, Gfx2Box2D);
    this.drawDebugLines = [];
    this.characters = [];
    this.metaData = {};

    // Initialize Box2D Debug
    this.world.SetDebugDraw(this.debugDraw);
  }

  setShowDebug(showDebug: boolean) {
    this.showDebug = showDebug;
  }

  setDebugDrawFlags(flags: number) {
    this.debugDraw.SetFlags(flags);
  }

  setVelocityIterations(velocityIterations: number) {
    this.velocityIterations = velocityIterations;
  }

  setPositionIterations(positionIterations: number) {
    this.positionIterations = positionIterations;
  }

  addBox(options: Gfx2Box2DCreatePrimitiveOptions & { width: number, height: number }): Box2D.b2Body {
    const shape = new Gfx2Box2D.b2PolygonShape();
    shape.SetAsBox(options.width / 2, options.height / 2);

    const body = this.#createBody(options.x, options.y, options.angle, options.dynamic);
    body.CreateFixture(shape, options.density ?? 1.0);

    this.metaData[Gfx2Box2D.getPointer(body)] = options.metaData;
    return body;
  }

  addCircle(options: Gfx2Box2DCreatePrimitiveOptions & { radius: number }): Box2D.b2Body {
    const shape = new Gfx2Box2D.b2CircleShape();
    shape.set_m_radius(options.radius);

    const body = this.#createBody(options.x, options.y, options.angle, options.dynamic);
    body.CreateFixture(shape, options.density ?? 1.0);

    this.metaData[Gfx2Box2D.getPointer(body)] = options.metaData;
    return body;
  }

  addPolygon(options: Gfx2Box2DCreatePrimitiveOptions & { points: Array<vec2> }): Box2D.b2Body {
    const shape = new Gfx2Box2D.b2PolygonShape();
    const vertices = options.points.map(p => new Gfx2Box2D.b2Vec2(p[0], p[1]));
    shape.Set(vertices as any, vertices.length);

    const body = this.#createBody(options.x, options.y, options.angle, options.dynamic);
    body.CreateFixture(shape, options.density ?? 1.0);

    this.metaData[Gfx2Box2D.getPointer(body)] = options.metaData;
    return body;
  }

  addEdge(options: Gfx2Box2DCreatePrimitiveOptions & { startX: number, startY: number, endX: number, endY: number }): Box2D.b2Body {
    const shape = new Gfx2Box2D.b2EdgeShape();
    shape.SetTwoSided(new Gfx2Box2D.b2Vec2(options.startX, options.startY), new Gfx2Box2D.b2Vec2(options.endX, options.endY));

    const body = this.#createBody(options.x, options.y, options.angle, false);
    body.CreateFixture(shape, 0);

    this.metaData[Gfx2Box2D.getPointer(body)] = options.metaData;
    return body;
  }

  addChain(options: Gfx2Box2DCreatePrimitiveOptions & { points: Array<vec2>, loop?: boolean }): Box2D.b2Body {
    const shape = new Gfx2Box2D.b2ChainShape();
    const vertices = options.points.map(p => new Gfx2Box2D.b2Vec2(p[0], p[1]));

    if (options.loop) {
      shape.CreateLoop(vertices as any, vertices.length);
    }
    else {
      shape.CreateChain(vertices as any, vertices.length, vertices[0], vertices[vertices.length - 1]);
    }

    const body = this.#createBody(options.x, options.y, options.angle, false);
    body.CreateFixture(shape, 0);

    this.metaData[Gfx2Box2D.getPointer(body)] = options.metaData;
    return body;
  }

  addCharacter(character: Gfx2Box2DCharacter): Gfx2Box2DCharacter {
    const bodyDef = new Gfx2Box2D.b2BodyDef();
    bodyDef.set_type(Gfx2Box2D.b2_dynamicBody);
    bodyDef.set_position(new Gfx2Box2D.b2Vec2(character.x, character.y));

    const body = this.world.CreateBody(bodyDef);
    body.SetFixedRotation(true);

    if (character.shapeType === 'circle') {
      const radius = character.circleRadius;
      const circle = new Gfx2Box2D.b2CircleShape();
      circle.set_m_radius(radius);
      body.CreateFixture(circle, character.density);
    }
    else if (character.shapeType === 'capsule') {
      const radius = character.width / 2;
      const boxHeight = character.height - 2 * radius;

      const boxShape = new Gfx2Box2D.b2PolygonShape();
      boxShape.SetAsBox(character.width / 2, boxHeight / 2);
      character.trunkFixture = body.CreateFixture(boxShape, character.density);

      const circleTop = new Gfx2Box2D.b2CircleShape();
      circleTop.set_m_radius(radius);
      circleTop.set_m_p(new Gfx2Box2D.b2Vec2(0, -boxHeight / 2));
      character.headFixture = body.CreateFixture(circleTop, character.density);

      const circleBottom = new Gfx2Box2D.b2CircleShape();
      circleBottom.set_m_radius(radius);
      circleBottom.set_m_p(new Gfx2Box2D.b2Vec2(0, boxHeight / 2));
      character.feetFixture = body.CreateFixture(circleBottom, character.density);
    }

    character.body = body;
    character.body.SetLinearDamping(0);

    this.metaData[Gfx2Box2D.getPointer(character.body)] = character.metaData;
    this.characters.push(character);
    return character;
  }

  remove(element: Box2D.b2Body | Gfx2Box2DCharacter): void {
    if (element instanceof Box2D.b2Body) {
      this.metaData[Gfx2Box2D.getPointer(element)] = undefined;
      this.world.DestroyBody(element);
    }
    else if (element instanceof Gfx2Box2DCharacter) {
      const foundIndex = this.characters.findIndex(c => c === element);
      if (foundIndex >= 0 && element.body) {
        this.characters.splice(foundIndex, 1);
        this.metaData[Gfx2Box2D.getPointer(element.body)] = undefined;
        this.world.DestroyBody(element.body);
      }
    }
    else {
      throw new Error('Gfx2Box2DManager::remove(): Unknown type');
    }
  }

  getMetaData(body: Box2D.b2Body): any {
    return this.metaData[Gfx2Box2D.getPointer(body)];
  }

  rayCast(startX: number, startY: number, endX: number, endY: number): Gfx2Box2DRayCast {
    const rayStart = new Gfx2Box2D.b2Vec2(startX, startY);
    const rayEnd = new Gfx2Box2D.b2Vec2(endX, endY);

    let closestFixture: Box2D.b2Fixture | null = null;
    let closestPoint: Box2D.b2Vec2 = new Gfx2Box2D.b2Vec2(0, 0);
    let closestNormal: Box2D.b2Vec2 = new Gfx2Box2D.b2Vec2(0, 0);
    let minFraction = 1.0;

    const callback = Object.assign(new Gfx2Box2D.JSRayCastCallback(), {
      ReportFixture(fixturePtr: any, pointPtr: any, normalPtr: any, fraction: any) {
        if (fraction < 1.0) {
          closestFixture = Gfx2Box2D.wrapPointer(fixturePtr, Gfx2Box2D.b2Fixture);
          closestPoint = Gfx2Box2D.wrapPointer(pointPtr, Gfx2Box2D.b2Vec2);
          closestNormal = Gfx2Box2D.wrapPointer(normalPtr, Gfx2Box2D.b2Vec2);
          minFraction = fraction;
        }

        return fraction;
      }
    });

    this.world.RayCast(callback, rayStart, rayEnd);

    return {
      fixture: closestFixture,
      point: closestPoint,
      normal: closestNormal,
      fraction: minFraction
    };
  }

  rayCastFromBody(body: Box2D.b2Body, dirX: number, dirY: number, offsetX: number = 0, offsetY: number = 0): Gfx2Box2DRayCast {
    const pos = body.GetPosition();
    const ray = this.rayCast(
      pos.get_x() + offsetX,
      pos.get_y() + offsetY,
      pos.get_x() + offsetX + dirX,
      pos.get_y() + offsetY + dirY
    );

    const isNotSameBody = ray.fixture && ray.fixture.GetBody() !== body;

    return {
      fixture: isNotSameBody ? ray.fixture : null,
      point: isNotSameBody ? ray.point : new Gfx2Box2D.b2Vec2(0, 0),
      normal: isNotSameBody ? ray.normal : new Gfx2Box2D.b2Vec2(0, 0),
      fraction: isNotSameBody ? ray.fraction : 1.0
    };
  }

  drawDebugLine(x1: number, y1: number, x2: number, y2: number, color: string = 'red', width: number = 0.05) {
    this.drawDebugLines.push({
      from: [x1, y1],
      to: [x2, y2],
      color: color,
      width: width
    });
  }

  update(ts: number) {
    for (const character of this.characters) {
      this.#updateCharacter(character);
    }

    const clampedDelta = Math.min(ts / 1000, BOX2D_MAX_TIMESTEP);
    this.world.Step(clampedDelta, this.velocityIterations, this.positionIterations);
  }

  draw() {
    if (!this.showDebug) {
      return;
    }

    gfx2Manager.drawCommand((ctx) => {
      ctx.save();
      ctx.scale(BOX2D_PPM, BOX2D_PPM);

      ctx.lineWidth /= BOX2D_PPM;
      this.world.DebugDraw();

      for (const line of this.drawDebugLines) {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.moveTo(line.from[0], line.from[1]);
        ctx.lineTo(line.to[0], line.to[1]);
        ctx.stroke();
      }

      this.drawDebugLines = [];
      ctx.restore();
    });
  }

  get box2DWorld(): Box2D.b2World {
    return this.world;
  }

  #createBody(x: number = 0, y: number = 0, angle: number = 0, dynamic: boolean = true): Box2D.b2Body {
    const bodyDef = new Gfx2Box2D.b2BodyDef();
    bodyDef.set_type(dynamic ? Gfx2Box2D.b2_dynamicBody : Gfx2Box2D.b2_staticBody);
    bodyDef.set_position(new Gfx2Box2D.b2Vec2(x, y));
    bodyDef.set_angle(angle);

    const body = this.world.CreateBody(bodyDef);
    body.SetLinearVelocity(0);
    body.SetAwake(true);
    body.SetEnabled(true);
    return body;
  }

  #updateCharacter(character: Gfx2Box2DCharacter) {
    if (!character.body) {
      return;
    }

    const vel = character.body.GetLinearVelocity();
    const feetRay = this.rayCastFromBody(character.body, 0, (character.height / 2) + (5 * BOX2D_PM), 0, (character.height / 2));
    const onGround = feetRay.fraction <= 0.1;

    character.updateHook(feetRay, onGround);

    // HORIZONTAL MOVEMENT
    const accel = onGround ? character.accelOnGround : character.accelOnAir;
    const maxSpeed = onGround ? character.groundSpeed : character.airSpeed;
    const desiredX = character.inputDir[0] * maxSpeed;

    let newVelX = vel.get_x();
    if (onGround || character.canControlAir) {
      newVelX += (desiredX - vel.get_x()) * accel;
    }

    newVelX = Math.max(-maxSpeed, Math.min(maxSpeed, newVelX));
    character.body.SetLinearVelocity(new Gfx2Box2D.b2Vec2(newVelX, vel.get_y()));

    // JUMP
    if (character.inputJump && (onGround || character.airJump)) {
      character.body.ApplyLinearImpulseToCenter(new Gfx2Box2D.b2Vec2(0, character.jumpImpulse), true);
    }
    character.inputJump = false;

    // UPDATE POSITION
    const pos = character.body.GetPosition();
    character.x = pos.get_x();
    character.y = pos.get_y();
  }
}

const gfx2Box2DManager = new Gfx2Box2DManager();
export { Gfx2Box2DManager };
export { gfx2Box2DManager };
export { Gfx2Box2D };