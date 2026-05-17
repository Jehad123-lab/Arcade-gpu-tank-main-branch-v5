import { inputManager } from '@lib/input/input_manager';
import { dnaManager } from '@lib/dna/dna_manager';
import { DNASystem } from '@lib/dna/dna_system';
import { UT } from '@lib/core/utils';
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
    const cameraAxies = this.camera.getAxies();
    if (!physics.character) {
      return;
    }

    physics.character.inputDir = [0, 0, 0];
    physics.character.inputCrouched = false;
    physics.character.inputJump = false;

    const dir: vec3 = [0, 0, 0];

    if (inputManager.isActiveAction('LEFT')) {
      dir[0] += cameraAxies[0][0] * -1;
      dir[2] += cameraAxies[0][2] * -1;
    }

    if (inputManager.isActiveAction('RIGHT')) {
      dir[0] += cameraAxies[0][0];
      dir[2] += cameraAxies[0][2];
    }

    if (inputManager.isActiveAction('UP')) {
      dir[0] += cameraAxies[2][0] * -1;
      dir[2] += cameraAxies[2][2] * -1;
    }

    if (inputManager.isActiveAction('DOWN')) {
      dir[0] += cameraAxies[2][0];
      dir[2] += cameraAxies[2][2];
    }

    if (inputManager.isJustActiveAction('SELECT')) {
      physics.character.inputJump = true;
    }

    const ndir = UT.VEC3_NORMALIZE(dir);
    physics.character.inputDir[0] = ndir[0];
    physics.character.inputDir[1] = ndir[1];
    physics.character.inputDir[2] = ndir[2];
    physics.character.inputCrouched = !!inputManager.isActiveAction('OK');
  }
}