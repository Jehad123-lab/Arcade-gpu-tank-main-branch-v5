import { eventManager } from '@lib/core/event_manager';
import { inputManager } from '@lib/input/input_manager';
import { gfx3TextureManager } from '@lib/gfx3/gfx3_texture_manager';
import { UT } from '@lib/core/utils';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { Gfx3PhysicsJWM } from '@lib/gfx3_physics/gfx3_physics_jwm';
import { Gfx3Material } from '@lib/gfx3_mesh/gfx3_mesh_material';
// ---------------------------------------------------------------------------------------
import { Model } from './model';
import { TrackingCamera } from './tracking_camera';
// ---------------------------------------------------------------------------------------

export const DIRECTION = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  FORWARD: 'FORWARD',
  BACKWARD: 'BACKWARD'
};

export const DIRECTION_TO_VEC3 = {
  LEFT: UT.VEC3_LEFT,
  RIGHT: UT.VEC3_RIGHT,
  FORWARD: UT.VEC3_FORWARD,
  BACKWARD: UT.VEC3_BACKWARD
};

export const PIXEL_PER_UNIT = 48;
export const CHAR_SPEED = 1;

class Room {
  constructor() {
    this.name = '';
    this.description = '';
    this.map = new Gfx3MeshJSM();
    this.walkmesh = new Gfx3PhysicsJWM();
    this.controller = new Model();
    this.controllerWalker = {};
    this.camera = new TrackingCamera(0);
    this.models = [];

    eventManager.subscribe(this.controller, 'E_MOVED', this, this.handleControllerMoved);
  }

  async loadFromFile(path) {
    const response = await fetch(path);
    const json = await response.json();

    this.map = new Gfx3MeshJSM();
    this.map.mat.setTexture(await gfx3TextureManager.loadTexture(json['MapTextureFile'], { magFilter: 'nearest' }));
    await this.map.loadFromFile(json['MapFile']);

    this.walkmesh = new Gfx3PhysicsJWM();
    await this.walkmesh.loadFromFile(json['WalkmeshFile']);
    await this.controller.loadFromData(json['Controller']);

    this.camera = new TrackingCamera(0);
    await this.camera.loadFromData(json['Camera']);
    this.camera.setTarget(this.controller);

    this.models = [];
    for (let obj of json['Models']) {
      let model = new Model();
      await model.loadFromData(obj);
      model.play('IDLE_LEFT', true);
      this.models.push(model);
    }

    const spawnObj = json['Spawn'];
    this.controller.setPosition(spawnObj['PositionX'], spawnObj['PositionY'], spawnObj['PositionZ']);
    this.controller.setDirection(spawnObj['Direction']);
    this.controller.play('IDLE_' + spawnObj['Direction'], true, true);
    this.controllerWalker = this.walkmesh.addWalkRect('CONTROLLER', this.controller.getPositionX(), this.controller.getPositionZ(), this.controller.getRadius() * 2);
  }

  delete() {
    this.map.delete();
    for (const model of this.models) {
      model.delete();
    }

    eventManager.unsubscribe(this.controller, 'E_MOVED', this);
  }

  update(ts) {
    let direction = DIRECTION.FORWARD;
    let moving = false;

    if (inputManager.isActiveAction('LEFT')) {
      moving = true;
      direction = DIRECTION.LEFT;
    }
    else if (inputManager.isActiveAction('RIGHT')) {
      moving = true;
      direction = DIRECTION.RIGHT;
    }
    else if (inputManager.isActiveAction('UP')) {
      moving = true;
      direction = DIRECTION.FORWARD;
    }
    else if (inputManager.isActiveAction('DOWN')) {
      moving = true;
      direction = DIRECTION.BACKWARD;
    }

    if (moving && !this.pause) {
      const moveX = DIRECTION_TO_VEC3[direction][0] * CHAR_SPEED * (ts / 1000);
      const moveZ = DIRECTION_TO_VEC3[direction][2] * CHAR_SPEED * (ts / 1000);
      this.controller.move(moveX, moveZ, direction);
      this.controller.play('RUN_' + direction, true);
    }
    else {
      this.controller.play('IDLE_' + this.controller.getDirection(), true);
    }

    this.walkmesh.update(ts);
    this.controller.update(ts);
    this.camera.update(ts);

    for (let model of this.models) {
      model.update(ts);
    }
  }

  draw() {
    for (let model of this.models) {
      model.draw();
    }

    this.map.draw();
    this.walkmesh.draw();
    this.controller.draw();
  }

  handleControllerMoved({ old, moveX, moveZ }) {
    for (const model of this.models) {
      if (this.controller.isCollideModel(model)) {
        this.controller.setPosition(old[0], old[1], old[2]);
        return;
      }
    }

    const navInfo = this.walkmesh.moveWalkRect(this.controllerWalker, moveX, moveZ);
    const newPos = UT.VEC3_ADD(old, navInfo.move);
    this.controller.setPosition(newPos[0], newPos[1], newPos[2]);
  }
}

export { Room };