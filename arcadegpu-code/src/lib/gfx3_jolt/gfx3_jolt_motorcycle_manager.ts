import Jolt from 'jolt-physics';
import { UT } from '../core/utils';
import { gfx3JoltManager, Gfx3Jolt, Gfx3JoltEntity, JOLT_LAYER_MOVING } from './gfx3_jolt_manager';

export interface Gfx3JoltMotorcycleOptions {
  x?: number;
  y?: number;
  z?: number;
  backWheelRadius?: number;
  backWheelWidth?: number;
  backWheelPosZ?: number;
  backSuspensionMinLength?: number;
  backSuspensionMaxLength?: number;
  backSuspensionFreq?: number;
  backBrakeTorque?: number;
  frontWheelRadius?: number;
  frontWheelWidth?: number;
  frontWheelPosZ?: number;
  frontSuspensionMinLength?: number;
  frontSuspensionMaxLength?: number;
  frontSuspensionFreq?: number;
  frontBrakeTorque?: number;
  halfVehicleLength?: number;
  halfVehicleWidth?: number;
  halfVehicleHeight?: number;
  maxSteeringAngle?: number;
  steerSpeed?: number;
  casterAngle?: number;
  mass?: number;
  maxPitchRollAngle?: number;
  engineMaxTorque?: number;
  engineMinRPM?: number;
  engineMaxRPM?: number;
  transmissionShiftDownRPM?: number;
  transmissionShiftUpRPM?: number;
  transmissionClutchStrength?: number;
  differentialLeftWheel?: number;
  differentialRightWheel?: number;
  differentialRatio?: number;
  collisionTesterType?: string;
  color?: vec3;
  meta?: any;
}

export interface Gfx3JoltMotorcycle extends Required<Gfx3JoltMotorcycleOptions>, Gfx3JoltEntity {
  wheels: Array<Gfx3JoltMotorcycleWheel>;
  previousForward: number;
  controller: Jolt.WheeledVehicleController;
  constraint: Jolt.VehicleConstraint;
  currentRight: number;
  oldPos: vec3;
  inputForwardPressed: boolean;
  inputBackwardPressed: boolean;
  inputLeftPressed: boolean;
  inputRightPressed: boolean;
  inputHandBrake: boolean;
}

export class Gfx3JoltMotorcycleManager {
  system: Jolt.PhysicsSystem;
  inter: Jolt.JoltInterface;
  bodyInter: Jolt.BodyInterface;
  movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter;
  movingLayerFilter: Jolt.DefaultObjectLayerFilter;
  motorcyclesMap: Map<number, Gfx3JoltMotorcycle>;
  motorcycles: Array<Gfx3JoltMotorcycle>;

  constructor(system: Jolt.PhysicsSystem, inter: Jolt.JoltInterface, bodyInter: Jolt.BodyInterface, movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter, movingLayerFilter: Jolt.DefaultObjectLayerFilter) {
    this.system = system;
    this.inter = inter;
    this.bodyInter = bodyInter;
    this.movingBPFilter = movingBPFilter;
    this.movingLayerFilter = movingLayerFilter;
    this.motorcyclesMap = new Map();
    this.motorcycles = [];
  }

  add(options: Gfx3JoltMotorcycleOptions): Gfx3JoltMotorcycle {
    const o: Required<Gfx3JoltMotorcycleOptions> = {
      x: options.x ?? 0,
      y: options.y ?? 0,
      z: options.z ?? 0,
      backWheelRadius: options.backWheelRadius ?? 0.3,
      backWheelWidth: options.backWheelWidth ?? 0.05,
      backWheelPosZ: options.backWheelPosZ ?? -0.75,
      backSuspensionMinLength: options.backSuspensionMinLength ?? 0.3,
      backSuspensionMaxLength: options.backSuspensionMaxLength ?? 0.5,
      backSuspensionFreq: options.backSuspensionFreq ?? 2,
      backBrakeTorque: options.backBrakeTorque ?? 250,
      frontWheelRadius: options.frontWheelRadius ?? 0.3,
      frontWheelWidth: options.frontWheelWidth ?? 0.05,
      frontWheelPosZ: options.frontWheelPosZ ?? 0.75,
      frontSuspensionMinLength: options.frontSuspensionMinLength ?? 0.3,
      frontSuspensionMaxLength: options.frontSuspensionMaxLength ?? 0.5,
      frontSuspensionFreq: options.frontSuspensionFreq ?? 1.5,
      frontBrakeTorque: options.frontBrakeTorque ?? 500,
      halfVehicleLength: options.halfVehicleLength ?? 0.4,
      halfVehicleWidth: options.halfVehicleWidth ?? 0.2,
      halfVehicleHeight: options.halfVehicleHeight ?? 0.3,
      maxSteeringAngle: UT.DEG_TO_RAD(options.maxSteeringAngle ?? 30),
      steerSpeed: options.steerSpeed ?? 4.0,
      casterAngle: UT.DEG_TO_RAD(options.casterAngle ?? 30),
      mass: options.mass ?? 240.0,
      maxPitchRollAngle: UT.DEG_TO_RAD(options.maxPitchRollAngle ?? 60),
      engineMaxTorque: options.engineMaxTorque ?? 150.0,
      engineMinRPM: options.engineMinRPM ?? 1000.0,
      engineMaxRPM: options.engineMaxRPM ?? 10000.0,
      transmissionShiftDownRPM: options.transmissionShiftDownRPM ?? 2000.0,
      transmissionShiftUpRPM: options.transmissionShiftUpRPM ?? 8000.0,
      transmissionClutchStrength: options.transmissionClutchStrength ?? 2.0,
      differentialLeftWheel: options.differentialLeftWheel ?? -1,
      differentialRightWheel: options.differentialRightWheel ?? 1,
      differentialRatio: options.differentialRatio ?? 1.93 * 40.0 / 16.0,
      collisionTesterType: options.collisionTesterType ?? 'cylinder',
      color: options.color ?? [0, 1, 0],
      meta: options.meta ?? {}
    };

    const body = this.#createBody(o);
    const constraintSettings = this.#createConstraintsSettings(o);
    const controllerSettings = this.#createControllerSettings(o, constraintSettings);
    constraintSettings.mController = controllerSettings;

    const constraint = new Gfx3Jolt.VehicleConstraint(body, constraintSettings);
    this.#setCollisionTester(o, constraint);

    const controller = Gfx3Jolt.castObject(constraint.GetController(), Gfx3Jolt.MotorcycleController);
    const wheels = [];

    for (let i = 0; i < constraintSettings.mWheels.size(); i++) {
      const joltWheel = constraint.GetWheel(i);
      const wheelSetting = joltWheel.GetSettings();
      const shape = new Gfx3Jolt.CylinderShape(wheelSetting.mWidth / 2, wheelSetting.mRadius, 0.05);
      const wheel = new Gfx3JoltMotorcycleWheel(shape, new Gfx3Jolt.RMat44());
      wheel.updateLocalTransform(constraint, i, body);
      wheels.push(wheel);
    }

    this.system.AddConstraint(constraint);
    this.system.AddStepListener(new Gfx3Jolt.VehicleConstraintStepListener(constraint));

    const m: Gfx3JoltMotorcycle = {
      type: 'motorcycle',
      bodyId: body.GetID().GetIndex(),
      body: body,
      wheels: wheels,
      previousForward: 0.0,
      controller: controller,
      constraint: constraint,
      currentRight: 0.0,
      oldPos: [o.x, o.y, o.z],
      inputForwardPressed: false,
      inputBackwardPressed: false,
      inputLeftPressed: false,
      inputRightPressed: false,
      inputHandBrake: false,
      ...o
    };

    this.motorcyclesMap.set(m.bodyId, m);
    this.motorcycles.push(m);
    return m;
  }

  get(bodyId: number): Gfx3JoltMotorcycle | undefined {
    return this.motorcyclesMap.get(bodyId);
  }

  getMeta(bodyId: number): any {
    const m = this.motorcyclesMap.get(bodyId);
    if (!m) {
      return undefined;
    }

    return m.meta;
  }

  remove(bodyId: number): boolean {
    const m = this.motorcyclesMap.get(bodyId);
    if (!m) {
      return false;
    }

    const id = m.body.GetID();
    this.motorcyclesMap.delete(bodyId);
    this.motorcycles.splice(this.motorcycles.indexOf(m), 1);
    this.bodyInter.RemoveBody(id);
    this.bodyInter.DestroyBody(id);
    return true;
  }

  clear() {
    for (const m of this.motorcycles) {
      this.remove(m.bodyId);
    }
  }

  update(clampedDeltaMs: number) {
    for (const m of this.motorcycles) {
      this.#updateMotorcycle(clampedDeltaMs, m);
    }
  }

  draw() {
    for (const m of this.motorcycles) {
      gfx3JoltManager.drawShape(m.body.GetShape(), m.body.GetWorldTransform(), m.color);
      for (const wheel of m.wheels) {
        if (wheel.worldTransform) {
          gfx3JoltManager.drawCylinder(wheel.shape, wheel.worldTransform, m.color);
        }
      }
    }
  }

  #updateMotorcycle(ts: number, m: Gfx3JoltMotorcycle) {
    let forward = 0.0, right = 0.0, brake = 0.0, handBrake = 0.0;
    forward = m.inputForwardPressed ? 1.0 : (m.inputBackwardPressed ? -1.0 : 0.0);
    right = m.inputRightPressed ? 1.0 : (m.inputLeftPressed ? -1.0 : 0.0);

    if (m.previousForward * forward < 0.0) {
      const rotation = m.body.GetRotation().Conjugated();
      const linearV = m.body.GetLinearVelocity();
      const velocity = rotation.MulVec3(linearV).GetZ();
      if ((forward > 0.0 && velocity < -0.1) || (forward < 0.0 && velocity > 0.1)) {
        forward = 0.0; // Brake while we've not stopped yet
        brake = 1.0;
      }
      else { // When we've come to a stop, accept the new direction
        m.previousForward = forward;
      }
    }

    if (m.inputHandBrake) {
      forward = 0.0;
      handBrake = 1.0;
    }

    if (right > m.currentRight) {
      m.currentRight = Math.min(m.currentRight + m.steerSpeed * ts, right);
    }
    else if (right < m.currentRight) {
      m.currentRight = Math.max(m.currentRight - m.steerSpeed * ts, right);
    }

    right = m.currentRight;
    m.controller.SetDriverInput(forward, right, brake, handBrake);

    if (right != 0.0 || forward != 0.0 || brake != 0.0 || handBrake != 0.0) {
      this.bodyInter.ActivateBody(m.body.GetID());
    }

    const pos = m.body.GetPosition();
    m.x = pos.GetX();
    m.y = pos.GetY();
    m.z = pos.GetZ();
    m.oldPos = [m.x, m.y, m.z];
    m.wheels.forEach((wheel, index) => wheel.updateLocalTransform(m.constraint!, index, m.body!));
  }

  #createBody(o: Required<Gfx3JoltMotorcycleOptions>): Jolt.Body {
    const shapeSettings = new Gfx3Jolt.OffsetCenterOfMassShapeSettings(
      new Gfx3Jolt.Vec3(0, -o.halfVehicleHeight, 0),
      new Gfx3Jolt.BoxShapeSettings(new Gfx3Jolt.Vec3(o.halfVehicleWidth, o.halfVehicleHeight, o.halfVehicleLength))
    );

    const shape = shapeSettings.Create().Get();

    const bodySettings = new Gfx3Jolt.BodyCreationSettings(
      shape,
      new Gfx3Jolt.RVec3(o.x, o.y, o.z),
      Gfx3Jolt.Quat.prototype.sRotation(new Gfx3Jolt.Vec3(0, 1, 0), Math.PI),
      Gfx3Jolt.EMotionType_Dynamic,
      JOLT_LAYER_MOVING
    );

    bodySettings.mOverrideMassProperties = Gfx3Jolt.EOverrideMassProperties_CalculateInertia;
    bodySettings.mMassPropertiesOverride.mMass = o.mass;
    const body = this.bodyInter.CreateBody(bodySettings);

    this.bodyInter.AddBody(body.GetID(), Gfx3Jolt.EActivation_Activate);
    return body;
  }

  #createConstraintsSettings(o: Required<Gfx3JoltMotorcycleOptions>): Jolt.VehicleConstraintSettings {
    const constraintSettings = new Gfx3Jolt.VehicleConstraintSettings();
    constraintSettings.mMaxPitchRollAngle = o.maxPitchRollAngle;

    constraintSettings.mWheels.clear();
    {
      const front = new Gfx3Jolt.WheelSettingsWV();
      front.mPosition = new Gfx3Jolt.Vec3(0.0, -0.9 * o.halfVehicleHeight, o.frontWheelPosZ);
      front.mMaxSteerAngle = o.maxSteeringAngle;
      front.mSuspensionDirection = new Gfx3Jolt.Vec3(0, -1, Math.tan(o.casterAngle)).Normalized();
      front.mSteeringAxis = new Gfx3Jolt.Vec3(0, 1, -Math.tan(o.casterAngle)).Normalized();
      front.mRadius = o.frontWheelRadius;
      front.mWidth = o.frontWheelWidth;
      front.mSuspensionMinLength = o.frontSuspensionMinLength;
      front.mSuspensionMaxLength = o.frontSuspensionMaxLength;
      front.mSuspensionSpring.mFrequency = o.frontSuspensionFreq;
      front.mMaxBrakeTorque = o.frontBrakeTorque;

      constraintSettings.mWheels.push_back(front);

      const back = new Gfx3Jolt.WheelSettingsWV();
      back.mPosition = new Gfx3Jolt.Vec3(0.0, -0.9 * o.halfVehicleHeight, o.backWheelPosZ);
      back.mMaxSteerAngle = 0.0;
      back.mRadius = o.backWheelRadius;
      back.mWidth = o.backWheelWidth;
      back.mSuspensionMinLength = o.backSuspensionMinLength;
      back.mSuspensionMaxLength = o.backSuspensionMaxLength;
      back.mSuspensionSpring.mFrequency = o.backSuspensionFreq;
      back.mMaxBrakeTorque = o.backBrakeTorque;

      constraintSettings.mWheels.push_back(back);
    }

    return constraintSettings;
  }

  #createControllerSettings(o: Required<Gfx3JoltMotorcycleOptions>, constraintSettings: Jolt.VehicleConstraintSettings): Jolt.VehicleControllerSettings {
    const controllerSettings = new Gfx3Jolt.MotorcycleControllerSettings();
    controllerSettings.mEngine.mMaxTorque = o.engineMaxTorque;
    controllerSettings.mEngine.mMinRPM = o.engineMinRPM;
    controllerSettings.mEngine.mMaxRPM = o.engineMaxRPM;
    controllerSettings.mTransmission.mShiftDownRPM = o.transmissionShiftDownRPM;
    controllerSettings.mTransmission.mShiftUpRPM = o.transmissionShiftUpRPM;
    controllerSettings.mTransmission.mClutchStrength = o.transmissionClutchStrength;
    constraintSettings.mController = controllerSettings;

    controllerSettings.mDifferentials.clear();
    const differential = new Gfx3Jolt.VehicleDifferentialSettings();
    differential.mLeftWheel = o.differentialLeftWheel;
    differential.mRightWheel = o.differentialRightWheel;
    differential.mDifferentialRatio = o.differentialRatio;
    controllerSettings.mDifferentials.push_back(differential);

    return controllerSettings;
  }

  #setCollisionTester(o: Required<Gfx3JoltMotorcycleOptions>, constraint: Jolt.VehicleConstraint) {
    let tester;
    switch (o.collisionTesterType) {
      case 'cylinder':
        tester = new Gfx3Jolt.VehicleCollisionTesterCastCylinder(JOLT_LAYER_MOVING, 0.05);
        break;
      case 'sphere':
        tester = new Gfx3Jolt.VehicleCollisionTesterCastSphere(JOLT_LAYER_MOVING, 0.5 * o.frontWheelWidth);
        break;
      default:
        tester = new Gfx3Jolt.VehicleCollisionTesterRay(JOLT_LAYER_MOVING);
        break;
    }

    constraint.SetVehicleCollisionTester(tester);
  }
}

export class Gfx3JoltMotorcycleWheel {
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