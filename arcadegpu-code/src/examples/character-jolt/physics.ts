import { UT } from '@lib/core/utils';
import { dnaManager } from '@lib/dna/dna_manager';
import { gfx3JoltManager, Gfx3Jolt, Gfx3JoltEntity } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3JoltCharacter, Gfx3JoltCharacterOptions } from '@lib/gfx3_jolt/gfx3_jolt_character_manager';
import { DNASystem } from '@lib/dna/dna_system';
import { DNAComponent } from '@lib/dna/dna_component';
// ---------------------------------------------------------------------------------------
import { EntityComponent } from './entity';
// ---------------------------------------------------------------------------------------

export class PhysicsComponent extends DNAComponent {
  character: Gfx3JoltCharacter | null;
  options: Gfx3JoltCharacterOptions;
  allowSliding: boolean;

  constructor(options: Gfx3JoltCharacterOptions = {}) {
    super('Physics');
    this.character = null;
    this.options = options;
    this.allowSliding = false;
  }
}

export class PhysicsSystem extends DNASystem {
  conveyor: Gfx3JoltEntity;

  constructor(conveyor: Gfx3JoltEntity) {
    super();
    super.addRequiredComponentTypename('Physics');
    super.addRequiredComponentTypename('Entity');
    this.conveyor = conveyor;
  }

  onEntityBind(eid: number): void {
    const physics = dnaManager.getComponent(eid, PhysicsComponent);
    physics.character = gfx3JoltManager.characters.add(physics.options);

    const characterContactListener = new Gfx3Jolt.CharacterContactListenerJS();
    characterContactListener.OnAdjustBodyVelocity = (...args) => this.OnAdjustBodyVelocity(...args, physics);
    characterContactListener.OnContactSolve = (...args) => this.OnContactSolve(...args, physics);
    characterContactListener.OnContactValidate = (...args) => this.OnContactValidate(...args);
    characterContactListener.OnCharacterContactValidate = (...args) => this.OnCharacterContactValidate(...args);
    characterContactListener.OnContactAdded = (...args) => this.OnContactAdded(...args);
    characterContactListener.OnContactPersisted = (...args) => this.OnContactPersisted(...args);
    characterContactListener.OnContactRemoved = (...args) => this.OnContactRemoved(...args);
    characterContactListener.OnCharacterContactAdded = (...args) => this.OnCharacterContactAdded(...args);
    characterContactListener.OnCharacterContactPersisted = (...args) => this.OnCharacterContactPersisted(...args);
    characterContactListener.OnCharacterContactRemoved = (...args) => this.OnCharacterContactRemoved(...args);
    characterContactListener.OnCharacterContactSolve = (...args) => this.OnCharacterContactSolve(...args);
    physics.character.vCharacter.SetListener(characterContactListener);
  }

  onBeforeUpdate(ts: number): void {
    gfx3JoltManager.update(ts);
  }

  onEntityUpdate(ts: number, eid: number): void {
    const entity = dnaManager.getComponent(eid, EntityComponent);
    const physics = dnaManager.getComponent(eid, PhysicsComponent);
    if (!physics.character) {
      return;
    }

    const playerControlsHorizontalVelocity = physics.character.controlMovementDuringJump || physics.character.vCharacter.IsSupported();
    if (playerControlsHorizontalVelocity) { // True if the player intended to move
      physics.allowSliding = !(UT.VEC3_LENGTH(physics.character.inputDir) < 1.0e-12);
    }
    else { // While in air we allow sliding
      physics.allowSliding = true;
    }

    entity.x = physics.character.x;
    entity.y = physics.character.y;
    entity.z = physics.character.z;
  }

  onAfterDraw(): void {
    gfx3JoltManager.draw();
  }

  OnAdjustBodyVelocity(character: number, body2: number, linearVelocity: number, angularVelocity: number, physics: PhysicsComponent): void {
    const body2Value = Gfx3Jolt.wrapPointer(body2, Gfx3Jolt.Body);
    const linearVelocityValue = Gfx3Jolt.wrapPointer(linearVelocity, Gfx3Jolt.Vec3);
    if (body2Value.GetID().GetIndex() == this.conveyor.bodyId) {
      linearVelocityValue.SetX(linearVelocityValue.GetX() + 5);
    }
  }

  OnContactSolve(character: number, bodyID2: number, subShapeID2: number, contactPosition: number, contactNormal: number, contactVelocity: number, contactMaterial: number, characterVelocity: number, newCharacterVelocity: number, physics: PhysicsComponent): void {
    const characterValue = Gfx3Jolt.wrapPointer(character, Gfx3Jolt.CharacterVirtual);
    const contactVelocityValue = Gfx3Jolt.wrapPointer(contactVelocity, Gfx3Jolt.Vec3);
    const newCharacterVelocityValue = Gfx3Jolt.wrapPointer(newCharacterVelocity, Gfx3Jolt.Vec3);
    const contactNormalValue = Gfx3Jolt.wrapPointer(contactNormal, Gfx3Jolt.Vec3);

    if (!physics.allowSliding && contactVelocityValue.IsNearZero() && !characterValue.IsSlopeTooSteep(contactNormalValue)) {
      newCharacterVelocityValue.SetX(0);
      newCharacterVelocityValue.SetY(0);
      newCharacterVelocityValue.SetZ(0);
    }
  }

  OnContactValidate(character: number, bodyID2: number, subShapeID2: number): boolean {
    return true;
  }

  OnCharacterContactValidate(character: number, otherCharacter: number, subShapeID2: number): boolean {
    return true;
  }

  OnContactAdded(character: number, bodyID2: number, subShapeID2: number, contactPosition: number, contactNormal: number, settings: number): void {
  }

  OnContactPersisted(character: number, bodyID2: number, subShapeID2: number, contactPosition: number, contactNormal: number, settings: number): void {
  }

  OnContactRemoved(character: number, bodyID2: number, subShapeID2: number): void {
  }

  OnCharacterContactAdded(character: number, otherCharacter: number, subShapeID2: number, contactPosition: number, contactNormal: number, settings: number): void {
  }

  OnCharacterContactPersisted(character: number, otherCharacter: number, subShapeID2: number, contactPosition: number, contactNormal: number, settings: number): void {
  }

  OnCharacterContactRemoved(character: number, otherCharacter: number, subShapeID2: number): void {
  }

  OnCharacterContactSolve(character: number, otherCharacter: number, subShapeID2: number, contactPosition: number, contactNormal: number, contactVelocity: number, contactMaterial: number, characterVelocity: number, newCharacterVelocity: number): void {
  }
}