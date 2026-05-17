import { dnaManager } from "@lib/dna/dna_manager";
import { gfx3JoltManager } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3JoltMotorcycle, Gfx3JoltMotorcycleOptions } from '@lib/gfx3_jolt/gfx3_jolt_motorcycle_manager';
import { DNASystem } from '@lib/dna/dna_system';
import { DNAComponent } from '@lib/dna/dna_component';
// ---------------------------------------------------------------------------------------
import { EntityComponent } from './entity';
// ---------------------------------------------------------------------------------------

export class PhysicsComponent extends DNAComponent {
  motorcycle: Gfx3JoltMotorcycle | null;
  options: Gfx3JoltMotorcycleOptions;

  constructor(options: Gfx3JoltMotorcycleOptions = {}) {
    super('Physics');
    this.motorcycle = null;
    this.options = options;
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
    physics.motorcycle = gfx3JoltManager.motorcycles.add(physics.options);
  }

  onBeforeUpdate(ts: number): void {
    gfx3JoltManager.update(ts);
  }

  onEntityUpdate(ts: number, eid: number): void {
    const entity = dnaManager.getComponent(eid, EntityComponent);
    const physics = dnaManager.getComponent(eid, PhysicsComponent);
    if (!physics.motorcycle) {
      return;
    }

    entity.x = physics.motorcycle.x;
    entity.y = physics.motorcycle.y;
    entity.z = physics.motorcycle.z;
  }
}