import { UT } from '../core/utils';
import { gfx3JoltManager, Gfx3Jolt, Jolt, Gfx3JoltEntity, bodyFilter, shapeFilter, JOLT_LAYER_NON_MOVING } from './gfx3_jolt_manager';
import { JOLT_RVEC3_TO_VEC3, JOLT_VEC3_TO_VEC3, VEC3_TO_JOLT_RVEC3, VEC3_TO_JOLT_VEC3 } from './gfx3_jolt_manager';

export interface Gfx3JoltCharacterOptions {
  x?: number,
  y?: number,
  z?: number,
  heightStanding?: number,
  radiusStanding?: number,
  heightCrouching?: number,
  radiusCrouching?: number,
  headOffsetStanding?: number;
  headOffsetCrouching?: number;
  headRadius?: number;
  controlMovementDuringJump?: boolean,
  groundSpeed?: number,
  airSpeed?: number,
  jumpSpeed?: number,
  airJump?: boolean,
  enableInertia?: boolean,
  maxSlopeAngle?: number,
  maxStrength?: number,
  characterPadding?: number,
  penetrationRecoverySpeed?: number,
  predictiveContactDistance?: number,
  enableWalkStairs?: boolean,
  enableStickToFloor?: boolean,
  shapeType?: string;
  mass?: number;
  velocitySmoothing?: number;
  color?: vec3;
  meta?: any;
}

export interface Gfx3JoltCharacter extends Required<Gfx3JoltCharacterOptions>, Gfx3JoltEntity {
  vCharacter: Jolt.CharacterVirtual;
  standingShape: Jolt.Shape;
  crouchingShape: Jolt.Shape;
  isCrouching: boolean;
  updateSettings: Jolt.ExtendedUpdateSettings;
  lastLineaVelocity: Jolt.Vec3;
  desiredVelocity: vec3;
  inputDir: vec3;
  inputJump: boolean;
  inputCrouched: boolean;
}

export class Gfx3JoltCharacterManager {
  system: Jolt.PhysicsSystem;
  inter: Jolt.JoltInterface;
  bodyInter: Jolt.BodyInterface;
  movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter;
  movingLayerFilter: Jolt.DefaultObjectLayerFilter;
  charactersMap: Map<number, Gfx3JoltCharacter>;
  characters: Array<Gfx3JoltCharacter>;

  constructor(system: Jolt.PhysicsSystem, inter: Jolt.JoltInterface, bodyInter: Jolt.BodyInterface, movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter, movingLayerFilter: Jolt.DefaultObjectLayerFilter) {
    this.system = system;
    this.inter = inter;
    this.bodyInter = bodyInter;
    this.movingBPFilter = movingBPFilter;
    this.movingLayerFilter = movingLayerFilter;
    this.charactersMap = new Map();
    this.characters = [];
  }

  add(options: Gfx3JoltCharacterOptions) {
    const o: Required<Gfx3JoltCharacterOptions> = {
      x: options.x ?? 0,
      y: options.y ?? 0,
      z: options.z ?? 0,
      heightStanding: options.heightStanding ?? 2,
      radiusStanding: options.radiusStanding ?? 1,
      heightCrouching: options.heightCrouching ?? 1,
      radiusCrouching: options.radiusCrouching ?? 0.8,
      headOffsetStanding: options.headOffsetStanding ?? 0.7,
      headOffsetCrouching: options.headOffsetCrouching ?? 0.5,
      headRadius: options.headRadius ?? 0.2,
      controlMovementDuringJump: options.controlMovementDuringJump ?? true,
      groundSpeed: options.groundSpeed ?? 6,
      airSpeed: options.airSpeed ?? 3,
      jumpSpeed: options.jumpSpeed ?? 15.0,
      airJump: options.airJump ?? false,
      enableInertia: options.enableInertia ?? true,
      maxSlopeAngle: UT.DEG_TO_RAD(options.maxSlopeAngle ?? 45.0),
      maxStrength: options.maxStrength ?? 100.0,
      characterPadding: options.characterPadding ?? 0.02,
      penetrationRecoverySpeed: options.penetrationRecoverySpeed ?? 1.0,
      predictiveContactDistance: options.predictiveContactDistance ?? 0.1,
      enableWalkStairs: options.enableWalkStairs ?? true,
      enableStickToFloor: options.enableStickToFloor ?? true,
      shapeType: options.shapeType ?? 'Capsule',
      mass: options.mass ?? 1000,
      velocitySmoothing: options.velocitySmoothing ?? 0.5,
      color: options.color ?? [0, 1, 0],
      meta: options.meta ?? {}
    };

    const positionStanding = new Gfx3Jolt.Vec3(0, 0.5 * o.heightStanding + o.radiusStanding, 0);
    const positionCrouching = new Gfx3Jolt.Vec3(0, 0.5 * o.heightCrouching + o.radiusCrouching, 0);
    const rotation = Gfx3Jolt.Quat.prototype.sIdentity();

    let standingShape = null;
    let crouchingShape = null;

    if (o.shapeType == 'Capsule') {
      standingShape = new Gfx3Jolt.RotatedTranslatedShapeSettings(positionStanding, rotation, new Gfx3Jolt.CapsuleShapeSettings(0.5 * o.heightStanding, o.radiusStanding)).Create().Get();
      crouchingShape = new Gfx3Jolt.RotatedTranslatedShapeSettings(positionCrouching, rotation, new Gfx3Jolt.CapsuleShapeSettings(0.5 * o.heightCrouching, o.radiusCrouching)).Create().Get();
    }
    else if (o.shapeType == 'Cylinder') {
      standingShape = new Gfx3Jolt.RotatedTranslatedShapeSettings(positionStanding, rotation, new Gfx3Jolt.CylinderShapeSettings(0.5 * o.heightStanding + o.radiusStanding, o.radiusStanding)).Create().Get();
      crouchingShape = new Gfx3Jolt.RotatedTranslatedShapeSettings(positionCrouching, rotation, new Gfx3Jolt.CylinderShapeSettings(0.5 * o.heightCrouching + o.radiusCrouching, o.radiusCrouching)).Create().Get();
    }
    else {
      standingShape = new Gfx3Jolt.RotatedTranslatedShapeSettings(positionStanding, rotation, new Gfx3Jolt.BoxShapeSettings(new Gfx3Jolt.Vec3(o.radiusStanding, 0.5 * o.heightStanding + o.radiusStanding, o.radiusStanding))).Create().Get();
      crouchingShape = new Gfx3Jolt.RotatedTranslatedShapeSettings(positionCrouching, rotation, new Gfx3Jolt.BoxShapeSettings(new Gfx3Jolt.Vec3(o.radiusCrouching, 0.5 * o.heightCrouching + o.radiusCrouching, o.radiusCrouching))).Create().Get();
    }

    const settings = new Gfx3Jolt.CharacterVirtualSettings();
    settings.mMass = o.mass;
    settings.mMaxSlopeAngle = o.maxSlopeAngle;
    settings.mMaxStrength = o.maxStrength;
    settings.mBackFaceMode = Gfx3Jolt.EBackFaceMode_CollideWithBackFaces;
    settings.mCharacterPadding = o.characterPadding;
    settings.mPenetrationRecoverySpeed = o.penetrationRecoverySpeed;
    settings.mPredictiveContactDistance = o.predictiveContactDistance;
    settings.mSupportingVolume = new Gfx3Jolt.Plane(Gfx3Jolt.Vec3.prototype.sAxisY(), -o.radiusStanding);
    settings.mShape = standingShape;

    const character = new Gfx3Jolt.CharacterVirtual(settings, Gfx3Jolt.RVec3.prototype.sZero(), Gfx3Jolt.Quat.prototype.sIdentity(), this.system);
    character.SetPosition(new Gfx3Jolt.RVec3(o.x, o.y, o.z));
    Gfx3Jolt.destroy(settings);

    const headShape = new Gfx3Jolt.SphereShapeSettings(o.headRadius).Create().Get();
    const headBodySettings = new Gfx3Jolt.BodyCreationSettings(
      headShape,
      new Gfx3Jolt.RVec3(o.x, o.y, o.z),
      Gfx3Jolt.Quat.prototype.sIdentity(),
      Gfx3Jolt.EMotionType_Static,
      JOLT_LAYER_NON_MOVING
    );

    headBodySettings.mIsSensor = true;
    headBodySettings.mAllowDynamicOrKinematic = true;
    const headBody = this.bodyInter.CreateBody(headBodySettings);
    this.bodyInter.AddBody(headBody.GetID(), Gfx3Jolt.EActivation_DontActivate);

    const c: Gfx3JoltCharacter = {
      type: 'character',
      bodyId: headBody.GetID().GetIndex(),
      body: headBody,
      vCharacter: character,
      standingShape: standingShape,
      crouchingShape: crouchingShape,
      isCrouching: false,
      updateSettings: new Gfx3Jolt.ExtendedUpdateSettings(),
      lastLineaVelocity: new Gfx3Jolt.Vec3(0, 0, 0),
      desiredVelocity: [0, 0, 0],
      inputDir: [0, 0, 0],
      inputJump: false,
      inputCrouched: false,
      ...o
    };

    this.charactersMap.set(character.GetID().GetValue(), c);
    this.characters.push(c);
    return c;
  }

  get(characterId: number): Gfx3JoltCharacter | undefined {
    return this.charactersMap.get(characterId);
  }

  getMeta(characterId: number): any {
    const c = this.charactersMap.get(characterId);
    if (!c) {
      return undefined;
    }

    return c.meta;
  }

  remove(characterId: number) {
    const c = this.charactersMap.get(characterId);
    if (!c) {
      return;
    }

    const headId = c.body.GetID();
    this.charactersMap.delete(characterId);
    this.characters.splice(this.characters.indexOf(c), 1);
    c.vCharacter.Release();
    this.bodyInter.RemoveBody(headId);
    this.bodyInter.DestroyBody(headId);
  }

  clear() {
    for (const c of this.characters) {
      this.remove(c.bodyId);
    }
  }

  update(clampedDeltaMs: number) {
    for (const c of this.characters) {
      this.#updateCrouchInput(clampedDeltaMs, c);
      this.#updateDirectionnalInput(clampedDeltaMs, c);
      this.#updateCharacter(clampedDeltaMs, c);
      this.#updateHead(clampedDeltaMs, c);
    }
  }

  draw() {
    for (const c of this.characters) {
      gfx3JoltManager.drawShape(c.vCharacter.GetShape(), c.vCharacter.GetWorldTransform(), c.color);
      gfx3JoltManager.drawShape(c.body.GetShape(), c.body.GetWorldTransform(), c.color);
    }
  }

  #updateCrouchInput(ts: number, c: Gfx3JoltCharacter) {
    if (c.inputCrouched == c.isCrouching) {
      return;
    }

    let newShape;
    if (c.inputCrouched) {
      newShape = c.crouchingShape;
    }
    else {
      newShape = c.standingShape;
    }

    const success = c.vCharacter.SetShape(
      newShape, 1.5 * this.system.GetPhysicsSettings().mPenetrationSlop,
      this.movingBPFilter,
      this.movingLayerFilter,
      bodyFilter,
      shapeFilter,
      this.inter.GetTempAllocator()
    );

    if (success) { // Accept the new shape only when the SetShape call was successful
      c.isCrouching = c.inputCrouched;
    }
  }

  #updateDirectionnalInput(ts: number, c: Gfx3JoltCharacter) {
    let newVelocity: vec3 = [0, 0, 0];
    const playerControlsHorizontalVelocity = c.controlMovementDuringJump || c.vCharacter.IsSupported();
    const maxSpeed = c.vCharacter.IsSupported() ? c.groundSpeed : c.airSpeed;

    if (playerControlsHorizontalVelocity) {
      if (c.enableInertia) {
        c.desiredVelocity[0] = UT.LERP(c.desiredVelocity[0], c.inputDir[0] * maxSpeed, c.velocitySmoothing);
        c.desiredVelocity[1] = UT.LERP(c.desiredVelocity[1], c.inputDir[1] * maxSpeed, c.velocitySmoothing);
        c.desiredVelocity[2] = UT.LERP(c.desiredVelocity[2], c.inputDir[2] * maxSpeed, c.velocitySmoothing);
      }
      else {
        c.desiredVelocity[0] = c.inputDir[0] * maxSpeed;
        c.desiredVelocity[1] = c.inputDir[1] * maxSpeed;
        c.desiredVelocity[2] = c.inputDir[2] * maxSpeed;
      }
    }

    const characterUpRotation = Gfx3Jolt.Quat.prototype.sIdentity();
    c.vCharacter.SetUp(characterUpRotation.RotateAxisY());
    c.vCharacter.SetRotation(characterUpRotation);

    c.vCharacter.UpdateGroundVelocity();
    const characterUp = JOLT_VEC3_TO_VEC3(c.vCharacter.GetUp());
    const linearVelocity = JOLT_VEC3_TO_VEC3(c.vCharacter.GetLinearVelocity());
    const currentVerticalVelocity = UT.VEC3_SCALE(characterUp, UT.VEC3_DOT(linearVelocity, characterUp));
    const groundVelocity = JOLT_VEC3_TO_VEC3(c.vCharacter.GetGroundVelocity());
    const gravity = JOLT_VEC3_TO_VEC3(this.system.GetGravity());

    const movingTowardsGround = (currentVerticalVelocity[1] - groundVelocity[1]) < 0.1;
    const onGround = c.vCharacter.GetGroundState() == Gfx3Jolt.EGroundState_OnGround;
    // If inertia enabled: And not moving away from ground
    // If inertia disabled: And not on a slope that is too steep
    const snapToGround = c.enableInertia ? movingTowardsGround : !c.vCharacter.IsSlopeTooSteep(c.vCharacter.GetGroundNormal());

    if (onGround && snapToGround) {
      newVelocity = groundVelocity;
      if (c.inputJump && movingTowardsGround) {
        newVelocity = UT.VEC3_ADD(newVelocity, UT.VEC3_SCALE(characterUp, c.jumpSpeed));
      }
    }
    else if (!onGround && c.inputJump && c.airJump) {
      newVelocity = UT.VEC3_ADD(newVelocity, UT.VEC3_SCALE(characterUp, c.jumpSpeed));
    }
    else {
      newVelocity[0] = currentVerticalVelocity[0];
      newVelocity[1] = currentVerticalVelocity[1];
      newVelocity[2] = currentVerticalVelocity[2];
    }

    newVelocity = UT.VEC3_ADD(newVelocity, UT.VEC3_SCALE(gravity, ts));

    if (playerControlsHorizontalVelocity) {
      newVelocity = UT.VEC3_ADD(newVelocity, c.desiredVelocity);
    }
    else {
      const currentHorizontalVelocity = UT.VEC3_SUBSTRACT(linearVelocity, currentVerticalVelocity);
      newVelocity = UT.VEC3_ADD(newVelocity, currentHorizontalVelocity);
    }

    c.lastLineaVelocity.Set(newVelocity[0], newVelocity[1], newVelocity[2]);
    c.vCharacter.SetLinearVelocity(c.lastLineaVelocity);
  }

  #updateCharacter(ts: number, c: Gfx3JoltCharacter) {
    const characterUp = JOLT_VEC3_TO_VEC3(c.vCharacter.GetUp());
    if (!c.enableStickToFloor) {
      c.updateSettings.mStickToFloorStepDown = Gfx3Jolt.Vec3.prototype.sZero();
    }
    else {
      const v = UT.VEC3_SCALE(characterUp, -c.updateSettings.mStickToFloorStepDown.Length());
      c.updateSettings.mStickToFloorStepDown.Set(v[0], v[1], v[2]);
    }

    if (!c.enableWalkStairs) {
      c.updateSettings.mWalkStairsStepUp = Gfx3Jolt.Vec3.prototype.sZero();
    }
    else {
      const v = UT.VEC3_SCALE(characterUp, c.updateSettings.mWalkStairsStepUp.Length());
      c.updateSettings.mWalkStairsStepUp.Set(v[0], v[1], v[2]);
    }

    c.vCharacter.ExtendedUpdate(ts,
      c.vCharacter.GetUp(),
      c.updateSettings,
      this.movingBPFilter,
      this.movingLayerFilter,
      bodyFilter,
      shapeFilter,
      this.inter.GetTempAllocator()
    );

    c.x = c.vCharacter.GetPosition().GetX();
    c.y = c.vCharacter.GetPosition().GetY();
    c.z = c.vCharacter.GetPosition().GetZ();
  }

  #updateHead(ts: number, c: Gfx3JoltCharacter) {
    const pos = c.vCharacter.GetPosition();
    const offset = c.isCrouching ? c.heightCrouching + c.headOffsetCrouching : c.heightStanding + c.headOffsetStanding;
    const headPos = new Gfx3Jolt.RVec3(pos.GetX(), pos.GetY() + offset, pos.GetZ());
    this.system.GetBodyInterface().SetPosition(c.body.GetID(), headPos, Gfx3Jolt.EActivation_DontActivate);
  }
}