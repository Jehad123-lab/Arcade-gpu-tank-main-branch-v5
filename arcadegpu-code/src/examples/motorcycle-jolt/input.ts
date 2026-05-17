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
    if (!physics.motorcycle) {
      return;
    }

    physics.motorcycle.inputLeftPressed = false;
    physics.motorcycle.inputRightPressed = false;
    physics.motorcycle.inputForwardPressed = false;
    physics.motorcycle.inputBackwardPressed = false;
    physics.motorcycle.inputHandBrake = false;

    if (inputManager.isActiveAction('LEFT')) {
      physics.motorcycle.inputLeftPressed = true;
    }

    if (inputManager.isActiveAction('RIGHT')) {
      physics.motorcycle.inputRightPressed = true;
    }

    if (inputManager.isActiveAction('UP')) {
      physics.motorcycle.inputForwardPressed = true;
    }

    if (inputManager.isActiveAction('DOWN')) {
      physics.motorcycle.inputBackwardPressed = true;
    }

    if (inputManager.isActiveAction('SELECT')) {
      physics.motorcycle.inputHandBrake = true;
    }
  }
}