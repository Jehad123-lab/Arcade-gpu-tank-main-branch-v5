import { eventManager } from '@lib/core/event_manager';
import { gfx3TextureManager } from '@lib/gfx3/gfx3_texture_manager';
import { PH } from '@lib/core/physics';
import { Gfx3Transformable } from '@lib/gfx3/gfx3_transformable';
import { Gfx3SpriteJAS } from '@lib/gfx3_sprite/gfx3_sprite_jas';
// ---------------------------------------------------------------------------------------
import { DIRECTION, DIRECTION_TO_VEC3, PIXEL_PER_UNIT } from './room';
// ---------------------------------------------------------------------------------------

class Model extends Gfx3Transformable {
  constructor() {
    super();
    this.jas = new Gfx3SpriteJAS();
    this.radius = 0;
    this.height = 1;
    this.direction = DIRECTION.FORWARD;
    this.onActionBlockId = '';

    this.jas.setPixelsPerUnit(PIXEL_PER_UNIT);
    this.jas.setBillboardMode(true);
  }

  async loadFromData(data) {
    await this.jas.loadFromFile(data['JASFile']);
    this.jas.setTexture(await gfx3TextureManager.loadTexture(data['TextureFile']));
    this.jas.setOffset(data['OffsetX'], data['OffsetY']);
    this.position[0] = data['PositionX'];
    this.position[1] = data['PositionY'];
    this.position[2] = data['PositionZ'];
    this.radius = data['Radius'];
    this.height = data['Height'];
    this.direction = data['Direction'];
    this.onActionBlockId = data['OnActionBlockId'];
  }

  delete() {
    this.jas.delete();
  }

  update(ts) {
    let offsetY = this.jas.getOffsetY() / PIXEL_PER_UNIT;
    this.jas.setPosition(this.position[0], this.position[1] + offsetY, this.position[2]);
    this.jas.update(ts);
  }

  draw() {
    this.jas.draw();
  }

  move(mx, mz, direction = null) {
    const old = this.position.slice();
    this.position[0] += mx;
    this.position[2] += mz;
    this.direction = direction;
    eventManager.emit(this, 'E_MOVED', { old: old, moveX: mx, moveZ: mz });
  }

  play(animationName, isLooped = false) {
    this.jas.play(animationName, isLooped, true);
  }

  getDirection() {
    return this.direction;
  }

  setDirection(direction) {
    this.direction = direction;
  }

  getRadius() {
    return this.radius;
  }

  getHeight() {
    return this.height;
  }

  getOnActionBlockId() {
    return this.onActionBlockId;
  }

  getHandPosition() {
    return [
      this.position[0] + (DIRECTION_TO_VEC3[this.direction][0] * this.radius * 1.2),
      this.position[1],
      this.position[2] + (DIRECTION_TO_VEC3[this.direction][2] * this.radius * 1.2)
    ];
  }

  isCollideTrigger(trigger) {
    return PH.CYLINDERS_COLLIDE(
      this.position,
      this.radius,
      this.height,
      trigger.getPosition(),
      trigger.getRadius(),
      trigger.getHeight()
    );
  }

  isCollideModel(model) {
    return PH.CYLINDERS_COLLIDE(
      this.position,
      this.radius,
      this.height,
      model.getPosition(),
      model.getRadius(),
      model.getHeight()
    );
  }

  isHandCollide(other) {
    return PH.CYLINDERS_COLLIDE(
      this.getHandPosition(),
      0,
      this.height,
      other.getPosition(),
      other.getRadius(),
      other.getHeight()
    );
  }
}

export { Model };