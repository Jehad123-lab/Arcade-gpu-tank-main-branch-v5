import { inputManager } from '@lib/input/input_manager';
import { dnaManager } from '@lib/dna/dna_manager';
import { DNASystem } from '@lib/dna/dna_system';
import { Gfx3CameraOrbit } from '@lib/gfx3_camera/gfx3_camera_orbit';
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
  camera: Gfx3CameraOrbit;

  constructor(camera: Gfx3CameraOrbit) {
    super();
    super.addRequiredComponentTypename('Input');
    super.addRequiredComponentTypename('Physics');
    super.addRequiredComponentTypename('Entity');
    this.camera = camera;
  }

  onEntityUpdate(ts: number, eid: number) {
    const physics = dnaManager.getComponent(eid, PhysicsComponent);
    if (!physics.car) {
      return;
    }

    physics.car.inputLeftPressed = false;
    physics.car.inputRightPressed = false;
    physics.car.inputForwardPressed = false;
    physics.car.inputBackwardPressed = false;
    physics.car.inputHandBrake = false;

    if (inputManager.isActiveAction('LEFT')) {
      physics.car.inputLeftPressed = true;
    }

    if (inputManager.isActiveAction('RIGHT')) {
      physics.car.inputRightPressed = true;
    }

    if (inputManager.isActiveAction('UP')) {
      physics.car.inputForwardPressed = true;
    }

    if (inputManager.isActiveAction('DOWN')) {
      physics.car.inputBackwardPressed = true;
    }

    if (inputManager.isActiveAction('SELECT')) {
      physics.car.inputHandBrake = true;
    }
  }
}