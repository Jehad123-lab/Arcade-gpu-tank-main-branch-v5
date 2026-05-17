import { eventManager } from '@lib/core/event_manager';
import { uiManager } from '@lib/ui/ui_manager';
import { inputManager } from '@lib/input/input_manager';
import { gfx3TextureManager } from '@lib/gfx3/gfx3_texture_manager';
import { UT } from '@lib/core/utils';
import { Gfx3MeshEffect } from '@lib/gfx3/gfx3_drawable';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { Gfx3PhysicsJWM } from '@lib/gfx3_physics/gfx3_physics_jwm';
import { Gfx3Material } from '@lib/gfx3_mesh/gfx3_mesh_material';
// ---------------------------------------------------------------------------------------
import { Model } from './model';
import { TrackingCamera } from './tracking_camera';
// ---------------------------------------------------------------------------------------

const CHAR_SPEED = 0.5;

class Room {
  constructor() {
    this.name = '';
    this.description = '';
    this.background = new Gfx3MeshJSM();
    this.foreground = new Gfx3MeshJSM();
    this.walkmesh = new Gfx3PhysicsJWM();
    this.controller = new Model();
    this.controllerWalker = {};
    this.camera = new TrackingCamera(0);

    eventManager.subscribe(this.controller, 'E_MOVED', this, this.handleControllerMoved);
  }

  async loadFromFile(path) {
    let response = await fetch(path);
    let json = await response.json();

    this.name = json['Name'];
    this.description = json['Description'];

    this.background = new Gfx3MeshJSM();
    this.background.setEffects(Gfx3MeshEffect.CHANNEL1);
    await this.background.loadFromFile(json['BackgroundFile']);
    this.background.mat.setTexture(await gfx3TextureManager.loadTexture(json['BackgroundTextureFile'], {
      minFilter: 'nearest',
      magFilter: 'nearest'
    }));

    this.foreground = new Gfx3MeshJSM();
    this.foreground.setTag(1.0, 0.0, 0.0, 1.0);
    await this.foreground.loadFromBinaryFile(json['ForegroundMapFile']);

    this.walkmesh = new Gfx3PhysicsJWM();
    await this.walkmesh.loadFromFile(json['WalkmeshFile']);

    this.camera = new TrackingCamera(0);
    await this.camera.loadFromData(json['Camera']);
    this.camera.setTarget(this.controller);

    const spawnObj = json['Spawn'];
    await this.controller.loadFromData(json['Controller']);
    this.controller.setPosition(spawnObj['PositionX'], spawnObj['PositionY'], spawnObj['PositionZ']);
    this.controller.setRotation(0, UT.VEC2_ANGLE([spawnObj['DirectionX'], spawnObj['DirectionZ']]), 0);

    this.controllerWalker = this.walkmesh.addWalkRect('CONTROLLER', this.controller.getPositionX(), this.controller.getPositionZ(), this.controller.getRadius() * 2);
  }

  update(ts) {
    this.#updateMove(ts);
    this.background.update(ts);
    this.foreground.update(ts);
    this.walkmesh.update(ts);
    this.controller.update(ts);
  }

  draw() {
    this.background.draw();
    this.controller.draw();
    this.foreground.draw();
    this.walkmesh.draw();
  }

  handleControllerMoved({ old, moveX, moveZ }) {
    const navInfo = this.walkmesh.moveWalkRect(this.controllerWalker, moveX, moveZ);
    const newPos = UT.VEC3_ADD(old, navInfo.move);
    this.controller.setPosition(newPos[0], newPos[1], newPos[2]);
  }

  #updateMove(ts) {
    let moving = false;
    let moveDir = UT.VEC3_ZERO;

    // inverted cause the scene id not in the right direction lol
    if (inputManager.isActiveAction('RIGHT')) { 
      moveDir = UT.VEC3_ADD(moveDir, UT.VEC3_LEFT);
      moving = true;
    }
    if (inputManager.isActiveAction('LEFT')) {
      moveDir = UT.VEC3_ADD(moveDir, UT.VEC3_RIGHT);
      moving = true;
    }
    if (inputManager.isActiveAction('DOWN')) {
      moveDir = UT.VEC3_ADD(moveDir, UT.VEC3_FORWARD);
      moving = true;
    }
    if (inputManager.isActiveAction('UP')) {
      moveDir = UT.VEC3_ADD(moveDir, UT.VEC3_BACKWARD);
      moving = true;
    }

    if (moving && !this.pause) {
      moveDir = UT.VEC3_NORMALIZE(moveDir);
      const moveX = moveDir[0] * CHAR_SPEED * (ts / 1000);
      const moveZ = moveDir[2] * CHAR_SPEED * (ts / 1000);
      this.controller.move(moveX, moveZ, true);
      this.controller.play('RUN');
    }
    else {
      this.controller.play('IDLE');
    }
  }
}

export { Room };