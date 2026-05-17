import { dnaManager } from '@lib/dna/dna_manager';
import { gfx2Box2DManager, BOX2D_PM } from '@lib/gfx2_box2d/gfx2_box2d_manager';
import { DNASystem } from '@lib/dna/dna_system';
import { DNAComponent } from '@lib/dna/dna_component';
import { Gfx2Box2DCharacter, Gfx2Box2DCharacterOptions } from '@lib/gfx2_box2d/gfx2_box2d_manager';
// ---------------------------------------------------------------------------------------
import { EntityComponent } from './entity';
// ---------------------------------------------------------------------------------------

export class PhysicsComponent extends DNAComponent {
  character: Gfx2Box2DCharacter;

  constructor(options: Gfx2Box2DCharacterOptions) {
    super('Physics');
    this.character = new Gfx2Box2DCharacter(options);
  }
}

export class PhysicsSystem extends DNASystem {
  constructor() {
    super();
    super.addRequiredComponentTypename('Physics');
    super.addRequiredComponentTypename('Entity');
  }

  onEntityBind(eid: number): void {
    const physics = dnaManager.getComponent(eid, PhysicsComponent);
    gfx2Box2DManager.addCharacter(physics.character);
  }

  onBeforeUpdate(ts: number): void {
    gfx2Box2DManager.update(ts);
  }

  onEntityUpdate(ts: number, eid: number): void {
    const entity = dnaManager.getComponent(eid, EntityComponent);
    const physics = dnaManager.getComponent(eid, PhysicsComponent);

    entity.x = physics.character.x;
    entity.y = physics.character.y;

    gfx2Box2DManager.drawDebugLine(entity.x, entity.y, entity.x + (50 * BOX2D_PM), entity.y);
  }

  onAfterDraw(): void {
    gfx2Box2DManager.draw();
  }
}