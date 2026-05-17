import { eventManager } from '@lib/core/event_manager';
import { inputManager } from '@lib/input/input_manager';
import { UT } from '@lib/core/utils';
// ---------------------------------------------------------------------------------------

export class PlayerInput {
  constructor(player, camera) {
    this.player = player;
    this.camera = camera;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.maxMouseDelta = 50;

    eventManager.subscribe(inputManager, 'E_MOUSE_MOVE', this, this.handleMouseMove);
    eventManager.subscribe(inputManager, 'E_ACTION_ONCE', this, this.handleActionOnce);
    eventManager.subscribe(inputManager, 'E_MOUSE_DOWN', this, this.handleMouseDown);
  }

  delete() {
    eventManager.unsubscribe(inputManager, 'E_MOUSE_MOVE', this.handleMouseMove);
    eventManager.unsubscribe(inputManager, 'E_ACTION_ONCE', this.handleActionOnce);
  }

  update(ts) {
    this.player.rotation[1] += this.mouseDX;
    this.player.rotation[0] += this.mouseDY;
    this.player.rotation[0] = UT.CLAMP(this.player.rotation[0], -Math.PI / 2, Math.PI / 2);
    this.player.rotation[1] = UT.CLAMP_ANGLE(this.player.rotation[1]);
    this.mouseDX = 0; // Reset des deltas
    this.mouseDY = 0;

    this.camera.setRotation(this.player.rotation[0], this.player.rotation[1], this.player.rotation[2]);

    const cameraAxies = this.camera.getAxies();
    this.player.dir = [0, 0, 0];
    let moving = false;

    if (inputManager.isActiveAction('LEFT')) {
      this.player.dir[0] += cameraAxies[0][0] * -1;
      this.player.dir[2] += cameraAxies[0][2] * -1;
      moving = true;
    }

    if (inputManager.isActiveAction('RIGHT')) {
      this.player.dir[0] += cameraAxies[0][0];
      this.player.dir[2] += cameraAxies[0][2];
      moving = true;
    }

    if (inputManager.isActiveAction('UP')) {
      this.player.dir[0] += cameraAxies[2][0] * -1;
      this.player.dir[2] += cameraAxies[2][2] * -1;
      moving = true;
    }

    if (inputManager.isActiveAction('DOWN')) {
      this.player.dir[0] += cameraAxies[2][0];
      this.player.dir[2] += cameraAxies[2][2];
      moving = true;
    }

    if (moving) {
      this.player.dir = UT.VEC3_NORMALIZE(this.player.dir);
    }
  }

  handleMouseMove(e) {
    const dx = UT.CLAMP(e.movementX, -this.maxMouseDelta, this.maxMouseDelta);
    const dy = UT.CLAMP(e.movementY, -this.maxMouseDelta, this.maxMouseDelta);

    this.mouseDX += dx * (this.player.rotationSpeed / 1000);
    this.mouseDY += dy * (this.player.rotationSpeed / 1000);
  }

  handleActionOnce(e) {
    if (e.actionId == 'SELECT') {
      this.player.jump = true;
    }
  }

  handleMouseDown() {
    this.player.shoot();
  }
}