import { UT } from '../core/utils';
import { gfx3JoltManager, Gfx3Jolt, Jolt, Gfx3JoltEntity, JOLT_LAYER_MOVING, VEC4_TO_JOLT_QUAT } from './gfx3_jolt_manager';

const FL_WHEEL = 0;
const FR_WHEEL = 1;
const BL_WHEEL = 2;
const BR_WHEEL = 3;

export interface Gfx3JoltCarOptions {
  x?: number,
  y?: number,
  z?: number,
  size?: vec3;
  fourWheelDrive?: boolean;
  wheelRadius?: number;
  wheelWidth?: number;
  wheelOffsetHorizontal?: number;
  wheelOffsetVertical?: number;
  maxSteerAngle?: number;
  suspensionMinLength?: number;
  suspensionMaxLength?: number;
  maxEngineTorque?: number;
  clutchStrength?: number;
  frontBackLimitedSlipRatio?: number;
  leftRightLimitedSlipRatio?: number;
  antiRollbar?: boolean;
  mass?: number
  rollingResistance?: number;
  airResistance?: number;
  friction?: number;
  collisionTesterType?: 'cylinder' | 'sphere' | 'ray';
  color?: vec3;
  meta?: any;
}

export interface Gfx3JoltCar extends Required<Gfx3JoltCarOptions>, Gfx3JoltEntity {
  wheels: Array<Gfx3JoltCarWheel>;
  previousForward: number;
  controller: Jolt.WheeledVehicleController;
  constraint: Jolt.VehicleConstraint;
  oldPos: vec3;
  inputForwardPressed: boolean;
  inputBackwardPressed: boolean;
  inputLeftPressed: boolean;
  inputRightPressed: boolean;
  inputHandBrake: boolean;
}

export class Gfx3JoltCarManager {
  system: Jolt.PhysicsSystem;
  inter: Jolt.JoltInterface;
  bodyInter: Jolt.BodyInterface;
  movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter;
  movingLayerFilter: Jolt.DefaultObjectLayerFilter;
  carsMap: Map<number, Gfx3JoltCar>;
  cars: Array<Gfx3JoltCar>;

  constructor(system: Jolt.PhysicsSystem, inter: Jolt.JoltInterface, bodyInter: Jolt.BodyInterface, movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter, movingLayerFilter: Jolt.DefaultObjectLayerFilter) {
    this.system = system;
    this.inter = inter;
    this.bodyInter = bodyInter;
    this.movingBPFilter = movingBPFilter;
    this.movingLayerFilter = movingLayerFilter;
    this.carsMap = new Map();
    this.cars = [];
  }

  add(options: Gfx3JoltCarOptions): Gfx3JoltCar {
    const o: Required<Gfx3JoltCarOptions> = {
      x: options.x ?? 0,
      y: options.y ?? 0,
      z: options.z ?? 0,
      size: options.size ?? [1.8, 0.4, 4],
      fourWheelDrive: options.fourWheelDrive ?? true,
      wheelRadius: options.wheelRadius ?? 0.3,
      wheelWidth: options.wheelWidth ?? 0.1,
      wheelOffsetHorizontal: options.wheelOffsetHorizontal ?? 1.4,
      wheelOffsetVertical: options.wheelOffsetVertical ?? 0.18,
      maxSteerAngle: UT.DEG_TO_RAD(options.maxSteerAngle ?? 30),
      suspensionMinLength: options.suspensionMinLength ?? 0.1,
      suspensionMaxLength: options.suspensionMaxLength ?? 0.2,
      maxEngineTorque: options.maxEngineTorque ?? 800,
      clutchStrength: options.clutchStrength ?? 10.0,
      frontBackLimitedSlipRatio: options.frontBackLimitedSlipRatio ?? 1.4,
      leftRightLimitedSlipRatio: options.leftRightLimitedSlipRatio ?? 1.4,
      antiRollbar: options.antiRollbar ?? true,
      mass: options.mass ?? 1500,
      rollingResistance: options.rollingResistance ?? 1.5,
      airResistance: options.airResistance ?? 0.5,
      friction: options.friction ?? 1.0,
      collisionTesterType: options.collisionTesterType ?? 'cylinder',
      color: options.color ?? [0, 1, 0],
      meta: options.meta ?? {}
    };

    const halfSize: vec3 = [
      o.size[0] / 2,
      o.size[1] / 2,
      o.size[2] / 2,
    ];

    const body = this.#createBody(o, [0, 1, 0, 0], halfSize);
    const constraintSettings = this.#createConstraintsSettings(o, halfSize);
    const controllerSettings = this.#createControllerSettings(o, constraintSettings);
    constraintSettings.mController = controllerSettings;

    const constraint = new Gfx3Jolt.VehicleConstraint(body, constraintSettings);
    this.#setCollisionTester(o, constraint);

    const controller = Gfx3Jolt.castObject(constraint.GetController(), Gfx3Jolt.WheeledVehicleController);
    const wheels = [];

    for (let i = 0; i < constraintSettings.mWheels.size(); i++) {
      const joltWheel = constraint.GetWheel(i);
      const wheelSetting = joltWheel.GetSettings();
      const shape = new Gfx3Jolt.CylinderShape(wheelSetting.mWidth / 2, wheelSetting.mRadius, 0.05);
      const wheel = new Gfx3JoltCarWheel(shape, new Gfx3Jolt.RMat44());
      wheel.updateLocalTransform(constraint, i, body);
      wheels.push(wheel);
    }

    this.system.AddConstraint(constraint);
    this.system.AddStepListener(new Gfx3Jolt.VehicleConstraintStepListener(constraint));

    const c: Gfx3JoltCar = {
      type: 'car',
      bodyId: body.GetID().GetIndex(),
      body: body,
      wheels: wheels,
      previousForward: 0.0,
      controller: controller,
      constraint: constraint,
      oldPos: [o.x, o.y, o.z],
      inputForwardPressed: false,
      inputBackwardPressed: false,
      inputLeftPressed: false,
      inputRightPressed: false,
      inputHandBrake: false,
      ...o
    };

    this.carsMap.set(c.bodyId, c);
    this.cars.push(c);
    return c;
  }

  get(bodyId: number): Gfx3JoltCar | undefined {
    return this.carsMap.get(bodyId);
  }

  getMeta(bodyId: number): any {
    const c = this.carsMap.get(bodyId);
    if (!c) {
      return undefined;
    }

    return c.meta;
  }

  remove(bodyId: number): boolean {
    const c = this.carsMap.get(bodyId);
    if (!c) {
      return false;
    }

    const id = c.body.GetID();
    this.carsMap.delete(bodyId);
    this.cars.splice(this.cars.indexOf(c), 1);
    this.bodyInter.RemoveBody(id);
    this.bodyInter.DestroyBody(id);
    return true;
  }

  clear() {
    for (const c of this.cars) {
      this.remove(c.bodyId);
    }
  }

  update(clampedDeltaMs: number) {
    for (const c of this.cars) {
      this.#updateCar(clampedDeltaMs, c);
    }
  }

  draw() {
    for (const c of this.cars) {
      gfx3JoltManager.drawShape(c.body.GetShape(), c.body.GetWorldTransform(), c.color);
      for (const wheel of c.wheels) {
        if (wheel.worldTransform) {
          gfx3JoltManager.drawCylinder(wheel.shape, wheel.worldTransform, c.color);
        }
      }
    }
  }

  #updateCar(ts: number, c: Gfx3JoltCar) {
    let forward = 0.0, right = 0.0, brake = 0.0, handBrake = 0.0;
    forward = c.inputForwardPressed ? 1.0 : (c.inputBackwardPressed ? -1.0 : 0.0);
    right = c.inputRightPressed ? 1.0 : (c.inputLeftPressed ? -1.0 : 0.0);

    if (c.previousForward * forward < 0.0) {
      const rotation = c.body.GetRotation().Conjugated();
      const linearV = c.body.GetLinearVelocity();
      const velocity = rotation.MulVec3(linearV).GetZ();
      if ((forward > 0.0 && velocity < -0.1) || (forward < 0.0 && velocity > 0.1)) {
        forward = 0.0;
        brake = 1.0;
      }
      else {
        c.previousForward = forward;
      }
    }

    if (c.inputHandBrake) {
      forward = 0.0;
      handBrake = 1.0;
    }

    if (c.controller) {
      c.controller.SetDriverInput(forward, right, brake, handBrake);
    }

    if (right != 0.0 || forward != 0.0 || brake != 0.0 || handBrake != 0.0) {
      this.bodyInter.ActivateBody(c.body.GetID());
    }

    const pos = c.body.GetPosition();
    c.x = pos.GetX();
    c.y = pos.GetY();
    c.z = pos.GetZ();
    c.oldPos = [c.x, c.y, c.z];
    c.wheels.forEach((wheel, index) => wheel.updateLocalTransform(c.constraint!, index, c.body!));
  }

  #createBody(o: Required<Gfx3JoltCarOptions>, rotation: vec4, halfSize: vec3): Jolt.Body {
    const compoundShape = new Gfx3Jolt.MutableCompoundShapeSettings();

    compoundShape.AddShape(
      Gfx3Jolt.Vec3.prototype.sZero(),
      Gfx3Jolt.Quat.prototype.sIdentity(),
      new Gfx3Jolt.BoxShapeSettings(
        new Gfx3Jolt.Vec3(halfSize[0], halfSize[1], halfSize[2]),
      ),
      0
    );

    compoundShape.AddShape(
      new Gfx3Jolt.Vec3(0, halfSize[1] * 3, - halfSize[2] / 2),
      Gfx3Jolt.Quat.prototype.sIdentity(),
      new Gfx3Jolt.BoxShapeSettings(
        new Gfx3Jolt.Vec3(halfSize[0], halfSize[1] * 2, halfSize[2] / 2),
      ),
      0
    );

    const shapeSettings = new Gfx3Jolt.OffsetCenterOfMassShapeSettings(
      new Gfx3Jolt.Vec3(0, -halfSize[1], 0),
      compoundShape
    );

    const shape = shapeSettings.Create().Get();
    const bodySettings = new Gfx3Jolt.BodyCreationSettings(
      shape,
      new Gfx3Jolt.RVec3(o.x, o.y, o.z),
      VEC4_TO_JOLT_QUAT(rotation),
      Gfx3Jolt.EMotionType_Dynamic,
      JOLT_LAYER_MOVING
    );

    bodySettings.mOverrideMassProperties = Gfx3Jolt.EOverrideMassProperties_CalculateInertia;
    bodySettings.mMassPropertiesOverride.mMass = o.mass;

    // Adjust to make the car less moving when no force applied
    bodySettings.mLinearDamping = o.airResistance;
    bodySettings.mAngularDamping = o.rollingResistance;
    bodySettings.mFriction = o.friction; // Floor friction
    const body = this.bodyInter.CreateBody(bodySettings);

    this.bodyInter.AddBody(body.GetID(), Gfx3Jolt.EActivation_Activate);
    return body;
  }

  #createConstraintsSettings(o: Required<Gfx3JoltCarOptions>, halfSize: vec3): Jolt.VehicleConstraintSettings {
    const halfVehicleWidth = halfSize[0];
    const constraintSettings = new Gfx3Jolt.VehicleConstraintSettings();
    constraintSettings.mMaxPitchRollAngle = UT.DEG_TO_RAD(60);
    constraintSettings.mWheels.clear();

    const mWheels = [];
    {
      const fl = new Gfx3Jolt.WheelSettingsWV();
      fl.mPosition = new Gfx3Jolt.Vec3(halfVehicleWidth, -o.wheelOffsetVertical, o.wheelOffsetHorizontal);
      fl.mMaxSteerAngle = o.maxSteerAngle;
      fl.mMaxHandBrakeTorque = 0.0;
      constraintSettings.mWheels.push_back(fl);
      mWheels.push(fl);

      const fr = new Gfx3Jolt.WheelSettingsWV();
      fr.mPosition = new Gfx3Jolt.Vec3(-halfVehicleWidth, -o.wheelOffsetVertical, o.wheelOffsetHorizontal);
      fr.mMaxSteerAngle = o.maxSteerAngle;
      fr.mMaxHandBrakeTorque = 0.0; // Front wheel doesn't have hand brake
      constraintSettings.mWheels.push_back(fr);
      mWheels.push(fr);

      const bl = new Gfx3Jolt.WheelSettingsWV();
      bl.mPosition = new Gfx3Jolt.Vec3(halfVehicleWidth, -o.wheelOffsetVertical, -o.wheelOffsetHorizontal);
      bl.mMaxSteerAngle = 0.0;
      constraintSettings.mWheels.push_back(bl);
      mWheels.push(bl);

      const br = new Gfx3Jolt.WheelSettingsWV();
      br.mPosition = new Gfx3Jolt.Vec3(-halfVehicleWidth, -o.wheelOffsetVertical, -o.wheelOffsetHorizontal);
      br.mMaxSteerAngle = 0.0;
      constraintSettings.mWheels.push_back(br);
      mWheels.push(br);
    }

    mWheels.forEach(wheel => {
      wheel.mRadius = o.wheelRadius;
      wheel.mWidth = o.wheelWidth;
      wheel.mSuspensionMinLength = o.suspensionMinLength;
      wheel.mSuspensionMaxLength = o.suspensionMaxLength;
    });

    return constraintSettings;
  }

  #createControllerSettings(o: Required<Gfx3JoltCarOptions>, constraintSettings: Jolt.VehicleConstraintSettings): Jolt.WheeledVehicleControllerSettings {
    const controllerSettings = new Gfx3Jolt.WheeledVehicleControllerSettings();
    controllerSettings.mEngine.mMaxTorque = o.maxEngineTorque;
    controllerSettings.mTransmission.mClutchStrength = o.clutchStrength;

    // Front differential
    controllerSettings.mDifferentials.clear();
    const frontWheelDrive = new Gfx3Jolt.VehicleDifferentialSettings();
    frontWheelDrive.mLeftWheel = FL_WHEEL;
    frontWheelDrive.mRightWheel = FR_WHEEL;
    frontWheelDrive.mLimitedSlipRatio = o.leftRightLimitedSlipRatio;
    if (o.fourWheelDrive)
      frontWheelDrive.mEngineTorqueRatio = 0.5; // Split engine torque when 4WD
    controllerSettings.mDifferentials.push_back(frontWheelDrive);
    controllerSettings.mDifferentialLimitedSlipRatio = o.frontBackLimitedSlipRatio;

    // Rear differential
    if (o.fourWheelDrive) {
      const rearWheelDrive = new Gfx3Jolt.VehicleDifferentialSettings();
      rearWheelDrive.mLeftWheel = BL_WHEEL;
      rearWheelDrive.mRightWheel = BR_WHEEL;
      rearWheelDrive.mLimitedSlipRatio = o.leftRightLimitedSlipRatio;
      rearWheelDrive.mEngineTorqueRatio = 0.5;
      controllerSettings.mDifferentials.push_back(rearWheelDrive);
    }

    // Anti-roll bars
    if (o.antiRollbar) {
      constraintSettings.mAntiRollBars.clear();
      const frontRollBar = new Gfx3Jolt.VehicleAntiRollBar();
      frontRollBar.mLeftWheel = FL_WHEEL;
      frontRollBar.mRightWheel = FR_WHEEL;
      const rearRollBar = new Gfx3Jolt.VehicleAntiRollBar();
      rearRollBar.mLeftWheel = BL_WHEEL;
      rearRollBar.mRightWheel = BR_WHEEL;
      constraintSettings.mAntiRollBars.push_back(frontRollBar);
      constraintSettings.mAntiRollBars.push_back(rearRollBar);
    }

    return controllerSettings;
  }

  #setCollisionTester(o: Required<Gfx3JoltCarOptions>, constraint: Jolt.VehicleConstraint) {
    let tester;
    switch (o.collisionTesterType) {
      case 'cylinder':
        tester = new Gfx3Jolt.VehicleCollisionTesterCastCylinder(JOLT_LAYER_MOVING, 0.05);
        break;
      case 'sphere':
        tester = new Gfx3Jolt.VehicleCollisionTesterCastSphere(JOLT_LAYER_MOVING, 0.5 * o.wheelWidth);
        break;
      default:
        tester = new Gfx3Jolt.VehicleCollisionTesterRay(JOLT_LAYER_MOVING);
        break;
    }

    constraint.SetVehicleCollisionTester(tester);
  }
}

export class Gfx3JoltCarWheel {
  worldTransform: Jolt.RMat44;
  shape: Jolt.CylinderShape;
  wheelRight: Jolt.Vec3;
  wheelUp: Jolt.Vec3;

  constructor(shape: Jolt.CylinderShape, worldTransform: Jolt.RMat44) {
    this.worldTransform = worldTransform;
    this.shape = shape;
    this.wheelRight = new Gfx3Jolt.Vec3(0, 1, 0);
    this.wheelUp = new Gfx3Jolt.Vec3(1, 0, 0);
  }

  updateLocalTransform(constraint: Jolt.VehicleConstraint, wheelIndex: number, body: Jolt.Body) {
    // Transform locale roue→châssis
    const local = constraint.GetWheelLocalTransform(wheelIndex, this.wheelRight, this.wheelUp);

    // Décompose
    const lp = local.GetTranslation();
    const lq = local.GetRotation().GetQuaternion();

    // Transform monde du châssis
    const bq = body.GetRotation();
    const bp = body.GetPosition();

    // Compose : monde
    const wq = bq.MulQuat(lq);
    const rotatedLP = bq.MulVec3(lp);
    const wp = new Gfx3Jolt.RVec3(
      bp.GetX() + rotatedLP.GetX(),
      bp.GetY() + rotatedLP.GetY(),
      bp.GetZ() + rotatedLP.GetZ()
    );

    // Recompose une Mat44 monde
    this.worldTransform.SetRotation(Gfx3Jolt.Mat44.prototype.sRotation(wq));
    this.worldTransform.SetTranslation(wp);
  }
}