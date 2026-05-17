import { inputManager } from '@lib/input/input_manager';
import { dnaManager } from '@lib/dna/dna_manager';
import { DNASystem } from '@lib/dna/dna_system';
import { DNAComponent } from '@lib/dna/dna_component';
// ---------------------------------------------------------------------------------------
import { PhysicsComponent } from './physics';
// ---------------------------------------------------------------------------------------

export class InputComponent extends DNAComponent {
  constructor() {
    super('Input');
  }
}

export class InputSystem extends DNASystem {
  constructor() {
    super();
    super.addRequiredComponentTypename('Input');
    super.addRequiredComponentTypename('Physics');
    super.addRequiredComponentTypename('Entity');
  }

  onEntityUpdate(ts: number, eid: number) {
    const physics = dnaManager.getComponent(eid, PhysicsComponent);

    physics.character.inputDir[0] = 0;

    if (inputManager.isActiveAction('LEFT')) {
      physics.character.inputDir[0] = -1;
    }

    if (inputManager.isActiveAction('RIGHT')) {
      physics.character.inputDir[0] = +1;
    }

    if (inputManager.isActiveAction('SELECT')) {
      physics.character.inputJump = true;
    }
  }
}