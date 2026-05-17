// @todo: - drift missing, doing that later...
import { gfx3TextureManager } from '@lib/gfx3/gfx3_texture_manager';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { Gfx3PhysicsJWM, WalkPoint } from '@lib/gfx3_physics/gfx3_physics_jwm';
import { UT, CurveMapItem } from '@lib/core/utils';
// ---------------------------------------------------------------------------------------
import { Wheel, DEFAULT_WHEEL_POSITIONS, WheelPosition } from './wheel';
// ---------------------------------------------------------------------------------------

export interface CarOptions {
  position: vec3;
  quickFactor: number;
  streerSpeed: number;
  accelerationSpeed: number;
  adherence: number;
  minSpeed: number;
  maxSpeed: number;
  maxTurn: number;
  boostAtStart: number;
  engineBrakeFriction: number;
  brakeFriction: number;
  forwardStrongAfterBackward: number;
  turnFriction: number;
  handbrakeFriction: number;
  handbrakeAdherence: number;
  rideHeight: number;
  suspensionDrop: number;
  gravity: number;
  jumpImpulseStrength: number;
  jumpAngleOnUp: number;
  jumpAngleOnDown: number;
  wheelRotationSpeed: number;
  wheelPositions: Array<WheelPosition>;
  swiftnessMap: Array<CurveMapItem>;
};

export class CarController {
  options: CarOptions;
  // ------------------------------------ meshs ---------------------------------------------------------
  mesh: Gfx3MeshJSM;
  wheels: Array<Wheel>;
  frontWheels: Array<Wheel>;
  // ------------------------------------ walkmesh ------------------------------------------------------
  walkmesh: Gfx3PhysicsJWM;
  chassis: Array<WalkPoint>;
  // ------------------------------------ vars ----------------------------------------------------------
  rotation: number;
  speed: number;
  velocity: vec3;
  forward: vec3;
  sens: number;
  newSens: number;
  wheelAngle: number;
  directionAngle: number;
  adherence: number;
  handbrakeDirectionAngle: number;
  oldDirection: number;
  chassisDir: Array<vec3>;
  colliding: boolean;
  // ------------------------------------ states --------------------------------------------------------
  idle: boolean;
  wasIdle: boolean;
  isFirstAccel: boolean;
  isFirstBrake: boolean;
  isBraking: boolean;
  isHandBraking: boolean;
  // ------------------------------------ vertical physics ----------------------------------------------
  airState: 'airborne' | 'grounded' = 'grounded';
  verticalVelocity: number;
  suspensionCompressionLeft: number;
  suspensionCompressionRight: number;
  // ------------------------------------ inputs --------------------------------------------------------
  inputLeft: boolean;
  inputRight: boolean;
  inputAccel: boolean;
  inputBrake: boolean;
  inputHandbrake: boolean;

  constructor(walkmesh: Gfx3PhysicsJWM, options: Partial<CarOptions> = {}) {
    this.options = {
      position: options.position ?? [0, 0, 0],
      quickFactor: options.quickFactor ?? 5.0,
      streerSpeed: options.streerSpeed ?? 2.5,
      accelerationSpeed: options.accelerationSpeed ?? 550.0,
      adherence: options.adherence ?? 1.0,
      minSpeed: options.minSpeed ?? 5,
      maxSpeed: options.maxSpeed ?? 40.0,
      maxTurn: options.maxTurn ?? 0.5,
      boostAtStart: options.boostAtStart ?? 5.0,
      engineBrakeFriction: options.engineBrakeFriction ?? 1.0,
      brakeFriction: options.brakeFriction ?? 10.0,
      forwardStrongAfterBackward: options.forwardStrongAfterBackward ?? 5.0,
      turnFriction: options.turnFriction ?? 0.4,
      handbrakeFriction: options.handbrakeFriction ?? 3,
      handbrakeAdherence: options.handbrakeAdherence ?? 2,
      rideHeight: options.rideHeight ?? 0.2,
      suspensionDrop: options.suspensionDrop ?? 0.3,
      gravity: options.gravity ?? -30,
      jumpImpulseStrength: options.jumpImpulseStrength ?? 20,
      jumpAngleOnUp: options.jumpAngleOnUp ?? 0.1,
      jumpAngleOnDown: options.jumpAngleOnDown ?? 0.3,
      wheelRotationSpeed: options.wheelRotationSpeed ?? 2,
      wheelPositions: options.wheelPositions ?? DEFAULT_WHEEL_POSITIONS,
      swiftnessMap: options.swiftnessMap ?? [{
        mapBegin: 1,
        mapEnd: 1,
        valueMin: 0,
        valueMax: 5 + 20
      }, {
        mapBegin: 1,
        mapEnd: 1,
        valueMin: 5 + 20,
        valueMax: 5 + 250
      }, {
        mapBegin: 0.3,
        mapEnd: 1.0,
        valueMin: 5 + 250,
        valueMax: 5 + 500,
      }, {
        mapBegin: 1.0,
        mapEnd: 0.1,
        valueMin: 5 + 500,
        valueMax: 3000.0
      }]
    };

    this.mesh = new Gfx3MeshJSM();
    this.wheels = [];
    this.frontWheels = [];
    // --------------------------------------------------------------------------------------------------
    this.walkmesh = walkmesh;
    this.chassis = [];
    // --------------------------------------------------------------------------------------------------
    this.rotation = 0;
    this.speed = 0.0;
    this.velocity = [0, 0, 0];
    this.forward = [0, 0, 0];
    this.sens = 0;
    this.newSens = 0;
    this.wheelAngle = 0.0;
    this.directionAngle = 0.0;
    this.adherence = this.options.adherence;
    this.handbrakeDirectionAngle = 0.0;
    this.oldDirection = 0;
    this.chassisDir = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    this.colliding = false;
    // --------------------------------------------------------------------------------------------------
    this.idle = false;
    this.wasIdle = false;
    this.isFirstAccel = false;
    this.isFirstBrake = false;
    this.isBraking = false;
    this.isHandBraking = false;
    // --------------------------------------------------------------------------------------------------
    this.airState = 'grounded';
    this.verticalVelocity = 0;
    this.suspensionCompressionLeft = 0;
    this.suspensionCompressionRight = 0;
    // --------------------------------------------------------------------------------------------------
    this.inputLeft = false;
    this.inputRight = false;
    this.inputAccel = false;
    this.inputBrake = false;
    this.inputHandbrake = false;
  }

  async loadFromFiles(carModelPath: string, carTexturePath: string, wheelModelPath: string, wheelTexturePath: string) {
    await this.mesh.loadFromFile(carModelPath);
    this.mesh.setPosition(this.options.position[0], this.options.position[1], this.options.position[2]);
    this.mesh.mat.setTexture(await gfx3TextureManager.loadTexture(carTexturePath));

    for (const pos of this.options.wheelPositions) {
      const wheel = new Wheel(this, pos.x, pos.y, pos.z, pos.front, pos.mirrored);
      await wheel.mesh.loadFromFile(wheelModelPath);
      wheel.mesh.mat.setTexture(await gfx3TextureManager.loadTexture(wheelTexturePath));
      this.wheels.push(wheel);

      if (pos.front) {
        this.frontWheels.push(wheel);
      }
    }

    // chassis is the car frame projected on the floor
    const wbb = this.mesh.getWorldBoundingBox();
    this.chassis.push(
      this.walkmesh.addWalkPoint('CHASSIS_FL', wbb.max[0], wbb.max[2]),
      this.walkmesh.addWalkPoint('CHASSIS_FR', wbb.min[0], wbb.max[2]),
      this.walkmesh.addWalkPoint('CHASSIS_RL', wbb.max[0], wbb.min[2]),
      this.walkmesh.addWalkPoint('CHASSIS_RR', wbb.min[0], wbb.min[2])
    );
  }

  update(ts: number) {
    this.updateInputs(ts);
    this.updateAcceleration(ts);
    this.updateWheelAngle(ts);
    this.updateDirectionAngle(ts);
    this.updateCarTransform(ts);
    this.updateVerticalPhysics(ts);
    this.updateChassisRotation(ts);
    this.updateWheels(ts);
    this.updateVars();
  }

  draw() {
    this.mesh.draw();
    for (const wheel of this.wheels) {
      wheel.draw();
    }
  }

  updateInputs(ts: number) {
    if (this.airState === 'airborne') {
      return;
    }

    if (this.speed <= this.options.minSpeed) {
      this.sens = 0;
    }

    this.wasIdle = this.idle;

    // handle first handbrake touch
    if (this.inputHandbrake && !this.isHandBraking) {
      this.isHandBraking = true;
      this.handbrakeDirectionAngle = this.directionAngle;
    }

    if (!this.inputHandbrake || (this.inputHandbrake && this.speed <= this.options.minSpeed)) {
      this.isHandBraking = false;
    }

    // go forward if car is off else car sens remains same
    if (this.inputAccel && !this.inputBrake) {
      this.newSens = 1;
      this.isFirstAccel = this.sens == 0;
      this.sens = this.sens == 0 ? 1 : this.sens;
      this.isBraking = false;
      this.isHandBraking = false;
    }
    // go backward if car is off else car sens remains same
    else if (this.inputBrake && !this.inputAccel) {
      this.newSens = -1;
      this.isFirstBrake = this.sens == 0;
      this.sens = this.sens == 0 ? -1 : this.sens;
      this.isBraking = true;
      this.isHandBraking = false;
    }
    // No active pedal or both pressed
    else {
      this.newSens = 0;
      this.isFirstAccel = false;
      this.isFirstBrake = false;
      this.isBraking = false;
    }
  }

  updateAcceleration(ts: number) {
    if (this.airState === 'airborne') {
      return;
    }

    this.idle = (this.speed <= this.options.minSpeed && this.newSens == 0) ? true : false;

    // boost acceleration at start
    if (this.wasIdle && this.newSens === 1) {
      this.speed = this.options.accelerationSpeed * this.options.boostAtStart * (ts / 1000);
    }

    // no pedals = engine brake -- so reduce a little bit acceleration
    if (this.sens !== 0 && this.newSens === 0) {
      this.speed -= this.speed * 1.0 * (ts / 1000);
    }
    // running in the same way -- so increase acceleration
    else if (this.sens !== 0 && this.newSens === this.sens) {
      this.speed += this.options.accelerationSpeed * (ts / 1000);
    }
    // braking while running -- so reduce acceleration
    else if (this.sens === 1 && this.newSens === -1) {
      this.speed -= this.speed * this.options.brakeFriction * (ts / 1000);
    }
    // going forward after backward -- so reduce acceleration with a specific force
    else if (this.sens === -1 && this.newSens === +1) {
      this.speed -= this.speed * this.options.forwardStrongAfterBackward * (ts / 1000);
    }

    this.speed = UT.CLAMP(this.speed, -this.options.maxSpeed, this.options.maxSpeed);
    this.speed = UT.DEADZONE(this.speed, this.options.minSpeed);
  }

  updateWheelAngle(ts: number) {
    if (this.airState === 'airborne') {
      return;
    }

    // turning to left
    if (this.inputLeft) {
      this.wheelAngle -= this.options.streerSpeed * (ts / 1000);
    }
    // turning to right
    else if (this.inputRight) {
      this.wheelAngle += this.options.streerSpeed * (ts / 1000);
    }
    // no turn -- angle decrease slowly to zero
    else {
      this.wheelAngle = UT.DEADZONE(this.wheelAngle - (this.wheelAngle * 0.5));
    }

    this.wheelAngle = UT.CLAMP(this.wheelAngle, -this.options.maxTurn, this.options.maxTurn);
  }

  updateDirectionAngle(ts: number) {
    if (this.colliding) {
      return;
    }
    if (this.airState === 'airborne') {
      return;
    }

    // compute direction angle from a map of values -- rotation depends speed
    const rotationFactor = UT.MAP_VALUE_FROM_CURVE(this.speed, this.options.swiftnessMap);

    // many factor to influence the direction angle
    this.directionAngle += this.adherence * this.sens * this.wheelAngle * this.options.quickFactor * rotationFactor * (ts / 1000);
    this.directionAngle = UT.CLAMP_ANGLE(this.directionAngle);

    this.forward[0] = -Math.sin(this.directionAngle);
    this.forward[2] = Math.cos(this.directionAngle);

    if (this.airState === 'grounded') {
      if (this.isHandBraking) {
        this.speed -= this.options.handbrakeFriction * 10 * (ts / 1000);
        this.speed = UT.CLAMP(this.speed, this.options.minSpeed, this.options.maxSpeed);
        this.adherence = this.options.handbrakeAdherence;
        this.forward[0] = -Math.sin(this.handbrakeDirectionAngle);
        this.forward[2] = Math.cos(this.handbrakeDirectionAngle);
      }
      else {
        const turnAmount = Math.abs(this.wheelAngle) / this.options.maxTurn;
        this.speed -= this.speed * turnAmount * this.options.turnFriction * (ts / 1000);
        this.adherence = this.options.adherence;
        this.forward[0] = -Math.sin(this.directionAngle);
        this.forward[2] = Math.cos(this.directionAngle);
      }
    }
  }

  updateCarTransform(ts: number) {
    // compute velocity
    this.velocity[0] = this.forward[0] * this.sens * this.speed * (ts / 1000);
    this.velocity[2] = this.forward[2] * this.sens * this.speed * (ts / 1000);
    if (this.velocity[0] == 0 && this.velocity[2] == 0) {
      return;
    }

    // save chassis positions
    const chassis1 = [this.chassis[0].x, this.chassis[0].y, this.chassis[0].z];
    const chassis2 = [this.chassis[1].x, this.chassis[1].y, this.chassis[1].z];
    const chassis3 = [this.chassis[2].x, this.chassis[2].y, this.chassis[2].z];
    const chassis4 = [this.chassis[3].x, this.chassis[3].y, this.chassis[3].z];

    const directionAngleVelocity = this.directionAngle - this.oldDirection;
    const newVelocity = this.computeCollisionVelocity(this.velocity[0], this.velocity[2], directionAngleVelocity);
    this.velocity[0] = newVelocity[0];
    this.velocity[2] = newVelocity[1];

    if (this.colliding) {
      this.directionAngle = this.oldDirection;
      this.forward[0] = -Math.sin(this.directionAngle);
      this.forward[2] = Math.cos(this.directionAngle);
    }

    // apply new velocity after check a "safe" move
    for (let i = 0; i < this.chassis.length; i++) {
      this.walkmesh.moveWalkPoint(
        this.chassis[i],
        newVelocity[0],
        newVelocity[1],
        this.colliding ? 0 : directionAngleVelocity,
        this.mesh.position[0],
        this.mesh.position[2]
      );
    }

    // compute and save chassis directions -- very helpful in many cases
    this.chassisDir[0][0] = this.chassis[0].x - chassis1[0];
    this.chassisDir[0][1] = this.chassis[0].y - chassis1[1];
    this.chassisDir[0][2] = this.chassis[0].z - chassis1[2];
    this.chassisDir[1][0] = this.chassis[1].x - chassis2[0];
    this.chassisDir[1][1] = this.chassis[1].y - chassis2[1];
    this.chassisDir[1][2] = this.chassis[1].z - chassis2[2];
    this.chassisDir[2][0] = this.chassis[2].x - chassis3[0];
    this.chassisDir[2][1] = this.chassis[2].y - chassis3[1];
    this.chassisDir[2][2] = this.chassis[2].z - chassis3[2];
    this.chassisDir[3][0] = this.chassis[3].x - chassis4[0];
    this.chassisDir[3][1] = this.chassis[3].y - chassis4[1];
    this.chassisDir[3][2] = this.chassis[3].z - chassis4[2];

    // if airborne velocity slope is handle by updateVerticalPhysics during jump impulse
    if (this.airState == 'airborne') {
      this.velocity[1] = 0;
    }
    // if grounded velocity slope is handle by chassis direction
    else {
      const dir = UT.VEC3_NORMALIZE(this.chassisDir[2]);
      this.velocity[1] = dir[1] * this.speed * (ts / 1000);
    }

    this.mesh.translate(this.velocity[0], this.velocity[1], this.velocity[2]);
  }

  computeCollisionVelocity(mx: number, mz: number, angle: number): vec2 {
    this.colliding = false;

    for (let i = 0; i < this.chassis.length; i++) {
      const res = this.walkmesh.testWalkPoint(
        this.chassis[i],
        mx,
        mz,
        angle,
        this.mesh.position[0],
        this.mesh.position[2]
      );

      if (res.collide) {
        mx = res.move[0];
        mz = res.move[2];
        angle *= 0.5;
        this.colliding = true;
      }
    }

    return [mx, mz];
  }

  updateVerticalPhysics(ts: number) {
    const elevation = this.walkmesh.getElevation(
      this.mesh.getPositionX(),
      this.mesh.getPositionZ()
    );

    const bb = this.mesh.getBoundingBox();
    const wheelBase = bb.getDepth();

    // adjust the ground position and assume groundY to be the ground elevation -- used to up the car
    // and project chassis direction on vertical axis for comparaisons
    const groundY = elevation.y + this.options.rideHeight;
    const aFL = Math.atan2(this.chassisDir[0][1], 1);
    const aFR = Math.atan2(this.chassisDir[1][1], 1);
    const aRL = Math.atan2(this.chassisDir[2][1], 1);
    const aRR = Math.atan2(this.chassisDir[3][1], 1);
    const diffAngleRLFL = aRL - aFL;
    const diffAngleRRFR = aRR - aFR;

    // general conditions to jump
    const isNotAirborne = this.airState != 'airborne';
    const isForward = this.sens == 1;

    // suspension loose conditions to jump
    const isSuspenionLeftLoose = this.suspensionCompressionLeft < 0;
    const isSuspensionRightLoose = this.suspensionCompressionRight < 0;
    const isSuspensionLoose = isSuspensionRightLoose || isSuspenionLeftLoose;

    // car is going uphill or downhill
    const isUphill = this.chassisDir[0][1] > this.chassisDir[2][1] || this.chassisDir[1][1] > this.chassisDir[3][1];
    const isDownhill = this.chassisDir[0][1] < this.chassisDir[2][1] || this.chassisDir[1][1] < this.chassisDir[3][1];

    // airbornes condition races
    const isSpringboard = (aFL < 0 || aFR < 0) && (aRL > 0 || aRR > 0);
    const isCliff = this.chassis[2].y - this.chassis[0].y > wheelBase;
    const isJumpUp = isUphill && (diffAngleRLFL > this.options.jumpAngleOnUp || diffAngleRRFR > this.options.jumpAngleOnUp);
    const isJumpDown = isDownhill && (diffAngleRLFL > this.options.jumpAngleOnDown || diffAngleRRFR > this.options.jumpAngleOnDown);

    if (isForward && isNotAirborne && isSuspensionLoose && (isSpringboard || isCliff || isJumpUp || isJumpDown)) {
      this.airState = 'airborne';
      this.verticalVelocity += this.chassisDir[2][1] * (this.speed * this.options.jumpImpulseStrength) * (ts / 1000);
    }

    // if not airborne -> snap to ground
    if (this.airState == 'grounded') {
      this.verticalVelocity = 0;
      this.mesh.setPositionY(groundY);
    }

    // gravity on air
    if (this.airState === 'airborne') {
      this.verticalVelocity += this.options.gravity * (ts / 1000);
    }

    this.mesh.translate(0, this.verticalVelocity * (ts / 1000), 0);

    // check collide with ground -- if collide, snap to ground and set airState to grounded
    // important: the check is made after the translation to be sure the car is not penetrate the ground
    if (this.mesh.getPositionY() < groundY) {
      this.mesh.setPositionY(groundY);
      this.verticalVelocity = 0;
      this.airState = 'grounded';
    }
  }

  updateChassisRotation(ts: number) {
    if (this.airState === 'airborne') {
      return; // no rotation on air
    }

    if (this.speed < this.options.minSpeed) {
      return;
    }

    const yFL = this.chassis[0].y;
    const yFR = this.chassis[1].y;
    const yRL = this.chassis[2].y;
    const yRR = this.chassis[3].y;

    const bb = this.mesh.getBoundingBox();
    const wheelBase = bb.getDepth();
    const trackWidth = bb.getWidth();

    const frontAvg = (yFL + yFR) * 0.5;
    const rearAvg = (yRL + yRR) * 0.5;
    let pitch = Math.atan2(frontAvg - rearAvg, wheelBase);

    const leftAvg = (yFL + yRL) * 0.5;
    const rightAvg = (yFR + yRR) * 0.5;
    let roll = Math.atan2(leftAvg - rightAvg, trackWidth);

    pitch = UT.CLAMP(pitch, -Math.PI / 5, Math.PI / 5);
    this.mesh.setRotation(pitch, this.directionAngle, roll);
  }

  updateWheels(ts: number) {
    let i = 0;

    // wheel must be align to ground AFTER chassis rotation
    for (const wheel of this.wheels) {
      // rotate wheel -- x axis for rotation speed, y axis for steering
      let ry = wheel.mirrored ? Math.PI : 0;
      ry += wheel.front ? this.wheelAngle : 0;
      let rx = wheel.mesh.getRotationX();
      rx += -this.sens * this.speed * this.options.wheelRotationSpeed * (ts / 1000);
      wheel.mesh.setRotation(rx, ry, 0);

      // align wheel to ground
      const bb = wheel.mesh.getBoundingBox();
      const currentPos = wheel.getPosition();
      const pivotY = wheel.getSuspensionPivotY();
      const elevation = this.walkmesh.getElevation(currentPos[0], currentPos[2]);

      // correct position each frame to match the bottom of the wheel to the ground
      // if correction is too high, clamp it to the maximum correction position
      const correction = (elevation.y - currentPos[1]) + (bb.getHeight() / 2);
      const clamp = Math.max(correction, pivotY - this.options.suspensionDrop - currentPos[1]);

      if (i == 0) {
        this.suspensionCompressionLeft += clamp;
      }
      else if (i == 1) {
        this.suspensionCompressionRight += clamp;
      }

      wheel.mesh.translate(0, clamp, 0);
      i++;
    }
  }

  updateVars() {
    this.oldDirection = this.directionAngle;
    this.inputLeft = false;
    this.inputRight = false;
    this.inputAccel = false;
    this.inputBrake = false;
    this.inputHandbrake = false;
  }

  getChassisDir(): Array<vec3> {
    return this.chassisDir;
  }

  getBody(): Gfx3MeshJSM {
    return this.mesh;
  }

  getWheels(): Array<Wheel> {
    return this.wheels;
  }
}