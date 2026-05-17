import { PlayerInput } from './player_input';
import { PlayerReticule } from './player_reticule';
import { PlayerPhysics } from './player_physics';
import { PlayerWeapon } from './player_weapon';
// ---------------------------------------------------------------------------------------

class Player {
  constructor(jnm, camera) {
    this.camera = camera;
    this.input = new PlayerInput(this, camera);
    this.reticule = new PlayerReticule();
    this.physics = new PlayerPhysics(this, jnm);
    this.weapon = new PlayerWeapon(this, jnm);
    // --------------------------------------------
    this.x = 0;
    this.y = 1;
    this.z = 1;
    this.height = 1.3;
    this.dir = [0, 0, 0];
    this.velocity = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.maxSpeed = 7;
    this.rotationSpeed = 1;
    this.jump = false;
    this.jumpStrength = 10;
  }

  async load() {
    await this.weapon.load();
  }

  update(ts) {
    this.input.update(ts);
    this.physics.update(ts);
    this.weapon.update(ts);
    this.camera.setPosition(this.x, this.y + this.height / 2, this.z);
  }

  draw() {
    this.weapon.draw();
  }

  shoot() {
    this.weapon.shoot();
  }
}

export { Player };