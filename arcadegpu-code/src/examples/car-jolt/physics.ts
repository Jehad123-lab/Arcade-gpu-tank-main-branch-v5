import { dnaManager } from "@lib/dna/dna_manager";
import { gfx3JoltManager } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3JoltCar, Gfx3JoltCarOptions } from '@lib/gfx3_jolt/gfx3_jolt_car_manager';
import { DNASystem } from '@lib/dna/dna_system';
import { DNAComponent } from '@lib/dna/dna_component';
// ---------------------------------------------------------------------------------------
import { EntityComponent } from './entity';
// ---------------------------------------------------------------------------------------

export class PhysicsComponent extends DNAComponent {
  car: Gfx3JoltCar | null;
  options: Gfx3JoltCarOptions;

  constructor(options: Gfx3JoltCarOptions = {}) {
    super('Physics');
    this.car = null;
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
    physics.car = gfx3JoltManager.cars.add(physics.options);
  }

  onBeforeUpdate(ts: number): void {
    gfx3JoltManager.update(ts);
  }

  onEntityUpdate(ts: number, eid: number): void {
    const entity = dnaManager.getComponent(eid, EntityComponent);
    const physics = dnaManager.getComponent(eid, PhysicsComponent);
    if (!physics.car) {
      return;
    }

    entity.x = physics.car.x;
    entity.y = physics.car.y;
    entity.z = physics.car.z;
  }
}