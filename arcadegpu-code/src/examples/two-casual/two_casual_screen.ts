import { inputManager } from '@lib/input/input_manager';
import { gfx2TextureManager } from '@lib/gfx2/gfx2_texture_manager';
import { gfx2Manager } from '@lib/gfx2/gfx2_manager';
import { soundManager } from '@lib/sound/sound_manager';
import { Screen } from '@lib/screen/screen';
import { Gfx2SpriteJSS } from '@lib/gfx2_sprite/gfx2_sprite_jss';
import { UT } from '@lib/core/utils';
import { Gfx2SpriteJAS } from '@lib/gfx2_sprite/gfx2_sprite_jas';
import { Gfx2BoundingRect } from '@lib/gfx2/gfx2_bounding_rect';
import { coreManager } from '@lib/core/core_manager';
import { uiManager } from '@lib/ui/ui_manager';
import { eventManager } from '@lib/core/event_manager';
import { Gfx2Drawable } from '@lib/gfx2/gfx2_drawable';
import { Tween } from '@lib/core/tween';
// ---------------------------------------------------------------------------------------

const FLOOR_RECT = new Gfx2BoundingRect([-300, 250], [300, 260]);

const CLOUD_SPEED = 10;
const BOMB_MAX_SCALE = 3.0;
const BOMB_MIN_SCALE_TO_EXPLODE = 0.5;
const ASTEROID_DAMAGEPOINT = 1;
const ASTEROID_GENERATE_DEFAULT_DELAY = 4;
const ASTEROID_GENERATE_MIN_DELAY = 2;
const ASTEROID_GENERATE_MAX_DELAY = 4;
const ASTEROID_VERTICAL_MIN_SPEED = 60;
const ASTEROID_VERTICAL_MAX_SPEED = 80;
const ASTEROID_HORIZONTAL_MIN_SPEED = 0;
const ASTEROID_HORIZONTAL_MAX_SPEED = 40;
const HEALTH_LIFEPOINT = 1;
const HEALTH_GENERATE_DEFAULT_DELAY = 6;
const HEALTH_GENERATE_MIN_DELAY = 1;
const HEALTH_GENERATE_MAX_DELAY = 5;
const HEALTH_HORIZONTAL_MIN_SPEED = 0;
const HEALTH_HORIZONTAL_MAX_SPEED = 20;
const HEALTH_VERTICAL_SPEED = 20;

enum Layer {
  BACKGROUND = 0,
  MIDDLEGROUND = 1,
  FOREGROUND = 2
};

enum GameState {
  START,
  PLAY,
  GAMEOVER
};

enum BombState {
  DISARMED,
  ARMED,
  EXPLODE
};

interface Entity {
  sprite: Gfx2SpriteJSS;
  vx: number;
  vy: number;
};

class TwoCasualScreen extends Screen {
  // ------- numerics variables ----------------------
  energy: number;
  score: number;
  gameState: GameState;
  bombState: BombState;
  asteroidGenerateTimer: number;
  asteroidGenerateDelay: number;
  healthGenerateTimer: number;
  healthGenerateDelay: number;
  // ------- ui -------------------------------------
  scoreDisplay: HTMLDivElement;
  energyDisplay: HTMLDivElement;
  introMessage: Gfx2SpriteJSS;
  gameOverMessage: Gfx2SpriteJSS;
  // ------- sprites --------------------------------
  map: Array<Gfx2Drawable>;
  bomb: Gfx2SpriteJSS;
  bombSparkle: Gfx2SpriteJSS;
  bombHalo: Gfx2SpriteJSS;
  shockwave: Gfx2SpriteJSS;
  animated: Gfx2SpriteJAS;
  crashes: Array<Gfx2SpriteJAS>;
  explosions: Array<Gfx2SpriteJAS>;
  clouds: Array<Gfx2SpriteJSS>;
  // ------- entities ------------------------------
  asteroids: Array<Entity>;
  healths: Array<Entity>;
  healthTweens: Array<Tween<number>>;

  constructor() {
    super();
    this.energy = 100;
    this.score = 0;
    this.gameState = GameState.START;
    this.bombState = BombState.DISARMED;
    this.asteroidGenerateTimer = 0;
    this.asteroidGenerateDelay = ASTEROID_GENERATE_DEFAULT_DELAY;
    this.healthGenerateTimer = 0;
    this.healthGenerateDelay = HEALTH_GENERATE_DEFAULT_DELAY;

    this.scoreDisplay = document.createElement('div');
    this.energyDisplay = document.createElement('div');
    this.introMessage = new Gfx2SpriteJSS();
    this.gameOverMessage = new Gfx2SpriteJSS();

    this.map = [];
    this.bomb = new Gfx2SpriteJSS();
    this.bombSparkle = new Gfx2SpriteJSS();
    this.bombHalo = new Gfx2SpriteJSS();
    this.shockwave = new Gfx2SpriteJSS();
    this.animated = new Gfx2SpriteJAS();
    this.crashes = [];
    this.explosions = [];
    this.clouds = [];

    this.asteroids = [];
    this.healths = [];
    this.healthTweens = [];
  }

  async onEnter() {
    await gfx2TextureManager.loadTexture('./examples/two-casual/bg.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/city_light.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/city_dark.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/trees.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/cloud.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/bomb.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/sparkle.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/halo.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/shockwave.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/meteor.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/health.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/intro_message.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/game_over_message.png');
    await gfx2TextureManager.loadTexture('./examples/two-casual/sprite_sheet.png');
    await soundManager.loadSound('./examples/two-casual/background.mp3', 'music');

    soundManager.playSound('./examples/two-casual/background.mp3', true);

    const bg = new Gfx2SpriteJSS();
    bg.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/bg.png'));
    bg.setTextureRect(0, 0, 600, 600);
    bg.setOffsetNormalized(0.5, 0.5);
    this.map.push(bg);

    for (let i = 0; i < 4; i++) {
      const cityLight = new Gfx2SpriteJSS();
      cityLight.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/city_light.png'));
      cityLight.setOffsetNormalized(0.5, 0.5);
      cityLight.setPositionX(LEFT(0) + (i * 240));
      cityLight.setPositionY(240);
      cityLight.setPositionZ(Layer.MIDDLEGROUND);
      this.map.push(cityLight);

      const cityDark = new Gfx2SpriteJSS();
      cityDark.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/city_dark.png'));
      cityDark.setOffsetNormalized(0.5, 0.5);
      cityDark.setPositionX(LEFT(0) + (i * 240));
      cityDark.setPositionY(265);
      cityDark.setPositionZ(Layer.FOREGROUND);
      this.map.push(cityDark);
    }

    for (let i = 0; i < 4; i++) {
      const trees = new Gfx2SpriteJSS();
      trees.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/trees.png'));
      trees.setOffsetNormalized(0.5, 0.5);
      trees.setPosition(LEFT(0) + (i * 240), 280);
      trees.setPositionZ(Layer.FOREGROUND);
      this.map.push(trees);
    }

    for (let i = 0; i < 4; i++) {
      const z = (i % 2 == 0) ? Layer.FOREGROUND : Layer.MIDDLEGROUND;
      const posY = (i % 2 == 0) ? 100.0 : 150.0;

      const cloud = new Gfx2SpriteJSS();
      cloud.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/cloud.png'));
      cloud.setOffsetNormalized(0.5, 0.5);
      cloud.setPosition(60 + (i * 120), posY);
      cloud.setPositionZ(z);
      this.clouds.push(cloud);
    }

    const icon = document.createElement('img');
    icon.src = './examples/two-casual/energy_icon.png';
    icon.style.width = '50px';
    uiManager.addNode(icon, 'position:absolute; top:10px; left:10px;');

    this.energyDisplay = document.createElement('div');
    this.energyDisplay.textContent = '1/100';
    uiManager.addNode(this.energyDisplay, 'position:absolute; top:20px; left:60px; font-size:20px; margin-left:10px;');

    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.textContent = 'Score: 000';
    uiManager.addNode(this.scoreDisplay, 'position:absolute; top:20px; right:10px; color:white; font-size:20px;');

    this.introMessage = new Gfx2SpriteJSS();
    this.introMessage.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/intro_message.png'));
    this.introMessage.setOffsetNormalized(0.5, 0.5);

    this.gameOverMessage = new Gfx2SpriteJSS();
    this.gameOverMessage.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/game_over_message.png'));
    this.gameOverMessage.setOffsetNormalized(0.5, 0.5);
    this.gameOverMessage.setVisible(false);

    this.bomb = new Gfx2SpriteJSS();
    this.bomb.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/bomb.png'));
    this.bomb.setOffsetNormalized(0.5, 0.5);
    this.bomb.setPosition(0, 0);
    this.bomb.setPositionZ(Layer.FOREGROUND);
    this.bomb.setScale(1, 1);
    this.bomb.setVisible(false);

    this.bombSparkle = new Gfx2SpriteJSS();
    this.bombSparkle.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/sparkle.png'));
    this.bombSparkle.setOffsetNormalized(0.5, 0.5);
    this.bombSparkle.setPosition(0, 0);
    this.bombSparkle.setVisible(false);

    this.bombHalo = new Gfx2SpriteJSS();
    this.bombHalo.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/halo.png'));
    this.bombHalo.setOffsetNormalized(0.5, 0.5);
    this.bombHalo.setPosition(this.bomb.getTextureRectWidth() / 2, this.bomb.getTextureRectHeight() / 2);
    this.bombHalo.setVisible(false);

    this.shockwave = new Gfx2SpriteJSS();
    this.shockwave.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/shockwave.png'));
    this.shockwave.setOffsetNormalized(0.5, 0.5);
    this.shockwave.setScale(0, 0);
    this.shockwave.setPosition(0, 0);
    this.shockwave.setVisible(false);

    this.animated = new Gfx2SpriteJAS();
    this.animated.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/sprite_sheet.png'));
    await this.animated.loadFromFile('./examples/two-casual/sprite_sheet.jas');
    this.animated.setOffsetNormalized(0.5, 1);
    this.animated.setPosition(0, 0);
    this.animated.setPositionZ(Layer.MIDDLEGROUND);

    eventManager.subscribe(inputManager, 'E_MOUSE_DOWN', this, this.handleInput);
  }

  update(ts: number) {
    this.updateDisplayStats();
    this.updateGameState();
    this.updateClouds(ts);
    this.updateBomb(ts);
    this.updateAsteroidGenerate(ts);
    this.updateHealthGenerate(ts);
    this.updateAsteroids(ts);
    this.updateHealths(ts);
    this.updateCrashes(ts);
    this.updateExplosions(ts);
  }

  draw() {
    this.map.forEach(s => s.draw());
    this.clouds.forEach(c => c.draw());
    this.asteroids.forEach(a => a.sprite.draw());
    this.healths.forEach(h => h.sprite.draw());
    this.crashes.forEach(c => c.draw());
    this.explosions.forEach(e => e.draw());
    this.bomb.draw();
    this.bombHalo.draw();
    this.bombSparkle.draw();
    this.shockwave.draw();
    this.introMessage.draw();
    this.gameOverMessage.draw();
  }

  render() {
    gfx2Manager.beginRender();
    gfx2Manager.render();
    gfx2Manager.endRender();
  }

  updateDisplayStats() {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    this.energyDisplay.textContent = String(this.energy);
    this.scoreDisplay.textContent = String(this.score);
  }

  updateGameState() {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    if (this.energy <= 0) {
      this.asteroids = [];
      this.healths = [];
      this.gameOverMessage.setVisible(true);
      this.gameState = GameState.GAMEOVER;
    }
  }

  updateClouds(ts: number) {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    for (const cloud of this.clouds) {
      const halfWidth = cloud.getBoundingRect().getWidth() / 2;

      if (cloud.getPositionX() >= RIGHT(halfWidth)) {
        cloud.setPositionX(LEFT(-halfWidth));
      }

      const moveX = (CLOUD_SPEED + (cloud.getPositionZ() * 20)) * (ts / 1000);
      cloud.translate(moveX, 0);
    }
  }

  updateAsteroidGenerate(ts: number) {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    if (this.asteroidGenerateTimer >= this.asteroidGenerateDelay) {
      const sprite = new Gfx2SpriteJSS();
      sprite.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/meteor.png'));
      sprite.setOffsetNormalized(0.5, 0.5);
      sprite.setPositionX(UT.GET_RANDOM_INT(-300, 300));
      sprite.setPositionY(TOP(-sprite.getTextureRectHeight()));
      sprite.setPositionZ(Layer.MIDDLEGROUND);

      const dir = (sprite.getPositionX() <= coreManager.getWidth() / 2) ? 1 : -1;

      this.asteroids.push({
        sprite: sprite,
        vx: UT.GET_RANDOM_INT(ASTEROID_HORIZONTAL_MIN_SPEED, ASTEROID_HORIZONTAL_MAX_SPEED) * dir,
        vy: UT.GET_RANDOM_INT(ASTEROID_VERTICAL_MIN_SPEED, ASTEROID_VERTICAL_MAX_SPEED)
      });

      this.asteroidGenerateTimer = 0;
      this.asteroidGenerateDelay = UT.GET_RANDOM_INT(ASTEROID_GENERATE_MIN_DELAY, ASTEROID_GENERATE_MAX_DELAY);
    }
    else {
      this.asteroidGenerateTimer += ts / 1000;
    }
  }

  updateHealthGenerate(ts: number) {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    if (this.healthGenerateTimer >= this.healthGenerateDelay) {
      const sprite = new Gfx2SpriteJSS();
      sprite.setTexture(gfx2TextureManager.getTexture('./examples/two-casual/health.png'));
      sprite.setOffsetNormalized(0.5, 0.5);
      sprite.setPositionX(UT.GET_RANDOM_INT(0, coreManager.getWidth()));
      sprite.setPositionY(TOP(0));
      sprite.setPositionZ(Layer.FOREGROUND);

      const dir = sprite.getPositionX() <= coreManager.getWidth() / 2 ? 1 : -1;
      const tween = new Tween<number>();
      tween.setTimes([0, 2, 4, 6, 8]);
      tween.setValues([0, Math.PI / 6, 0, -Math.PI / 6, 0]);
      tween.setLooped(true);

      this.healths.push({
        sprite: sprite,
        vx: UT.GET_RANDOM_INT(HEALTH_HORIZONTAL_MIN_SPEED, HEALTH_HORIZONTAL_MAX_SPEED) * dir,
        vy: HEALTH_VERTICAL_SPEED
      });

      this.healthTweens.push(tween);

      this.healthGenerateTimer = 0;
      this.healthGenerateDelay = UT.GET_RANDOM_INT(HEALTH_GENERATE_MIN_DELAY, HEALTH_GENERATE_MAX_DELAY);
    }
    else {
      this.healthGenerateTimer += ts / 1000;
    }
  }

  updateBomb(ts: number) {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    this.bombSparkle.setPosition(this.bomb.getPositionX(), this.bomb.getPositionY());
    this.bombSparkle.setScale(this.bomb.getScaleX(), this.bomb.getScaleY());
    this.bombSparkle.setRotation(this.bombSparkle.getRotation() - 1);

    this.bombHalo.setPosition(this.bomb.getPositionX(), this.bomb.getPositionY());
    this.bombHalo.setScale(this.bomb.getScaleX(), this.bomb.getScaleY());
    this.bombHalo.setRotation(this.bombHalo.getRotation() + 1);

    if (this.bombState == BombState.ARMED) {
      const bombScale = this.bomb.getScaleX();

      if (bombScale < BOMB_MIN_SCALE_TO_EXPLODE) {
        this.bomb.setOpacity(0.5);
      }
      else {
        this.bomb.setOpacity(1);
      }

      if (bombScale < BOMB_MAX_SCALE) {
        this.bomb.setScale(bombScale + 0.01, bombScale + 0.01);
      }
    }
    else if (this.bombState == BombState.EXPLODE) {
      const bombScale = this.bomb.getScaleX();
      const shockwaveScale = this.shockwave.getScaleX();

      if (shockwaveScale < bombScale * 2) {
        this.shockwave.setScale(shockwaveScale + 0.1, shockwaveScale + 0.1);
      }
      else {
        const shockwavePosition = this.shockwave.getPosition();
        const shockwaveRadius = this.shockwave.getWorldBoundingRect().getWidth() / 2;

        this.asteroids = this.asteroids.filter(asteroid => {
          const hit = asteroid.sprite.getWorldBoundingRect().intersectCircle(shockwavePosition, shockwaveRadius);
          if (hit) {
            const explosion = this.animated.clone();
            explosion.setPositionX(asteroid.sprite.getPositionX());
            explosion.setPositionY(asteroid.sprite.getPositionY());
            explosion.setPositionZ(Layer.MIDDLEGROUND);
            explosion.setOffsetNormalized(0.5, 0.5);
            explosion.play('EXPLOSION_SMALL');
            this.explosions.push(explosion);
            this.score += 10;
          }

          return !hit;
        });

        this.healths = this.healths.filter(health => {
          const hit = health.sprite.getWorldBoundingRect().intersectCircle(shockwavePosition, shockwaveRadius);
          return !hit;
        });

        this.shockwave.setVisible(false);
        this.bombSparkle.setVisible(false);
        this.bombHalo.setVisible(false);
        this.bombState = BombState.DISARMED;
      }
    }
  }

  updateAsteroids(ts: number) {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    for (const asteroid of this.asteroids) {
      asteroid.sprite.setPositionX(asteroid.sprite.getPositionX() + (asteroid.vx * (ts / 1000)));
      asteroid.sprite.setPositionY(asteroid.sprite.getPositionY() + (asteroid.vy * (ts / 1000)));

      if (asteroid.sprite.getWorldBoundingRect().intersectBoundingRect(FLOOR_RECT)) {
        const crash = this.animated.clone();
        crash.setPositionX(asteroid.sprite.getPositionX());
        crash.setPositionY(asteroid.sprite.getPositionY());
        crash.setPositionZ(Layer.MIDDLEGROUND);
        crash.setOffsetNormalized(0.5, 1);
        crash.play('BOOM', false, false);
        this.crashes.push(crash);
        this.energy -= ASTEROID_DAMAGEPOINT;
        this.asteroids.splice(this.asteroids.indexOf(asteroid), 1);
      }
    }
  }

  updateCrashes(ts: number) {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    for (let i = 0; i < this.crashes.length; i++) {
      const crash = this.crashes[i];
      crash.update(ts);

      if (crash.isFinished()) {
        this.crashes.splice(i, 1);
      }
    }
  }

  updateHealths(ts: number) {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    for (let i = 0; i < this.healths.length; i++) {
      const health = this.healths[i];
      this.healthTweens[i].update(ts);

      health.sprite.setRotation(this.healthTweens[i].getCurrentValue());
      health.sprite.setPositionX(health.sprite.getPositionX() + (health.vx * (ts / 1000)));
      health.sprite.setPositionY(health.sprite.getPositionY() + (health.vy * (ts / 1000)));

      if (health.sprite.getWorldBoundingRect().intersectBoundingRect(FLOOR_RECT)) {
        this.energy += HEALTH_LIFEPOINT;
        this.healths.splice(i, 1);
        this.healthTweens.splice(i, 1);
      }
    }
  }

  updateExplosions(ts: number) {
    if (this.gameState != GameState.PLAY) {
      return;
    }

    for (let i = 0; i < this.explosions.length; i++) {
      const explosion = this.explosions[i];
      explosion.update(ts);

      if (explosion.isFinished()) {
        this.explosions.splice(i, 1);
      }
    }
  }

  handleInput(data: any) {
    if (this.gameState == GameState.START) {
      this.introMessage.setVisible(false);
      this.gameState = GameState.PLAY;
    }
    else if (this.gameState == GameState.PLAY) {
      if (this.bombState == BombState.DISARMED) {
        this.bomb.setVisible(true);
        this.bomb.setPosition(data.x, data.y);
        this.bomb.setScale(0, 0);
        this.bombState = BombState.ARMED;
      }
      else if (this.bombState == BombState.ARMED) {
        if (this.bomb.getScaleX() >= BOMB_MIN_SCALE_TO_EXPLODE) {
          this.bomb.setVisible(false);
          this.shockwave.setPosition(this.bomb.getPositionX(), this.bomb.getPositionY());
          this.shockwave.setScale(0, 0);
          this.shockwave.setVisible(true);
          this.bombSparkle.setVisible(true);
          this.bombHalo.setVisible(true);
          this.bombState = BombState.EXPLODE;
        }
      }
    }
    else if (this.gameState == GameState.GAMEOVER) {
      this.energy = 100;
      this.score = 0;
      this.gameOverMessage.setVisible(false);
      this.gameState = GameState.PLAY;
    }

    return true;
  }
}

function LEFT(px: number) {
  const size = coreManager.getSize();
  const halfWidth = size[0] * 0.5;
  return px - halfWidth;
}

function RIGHT(px: number) {
  const size = coreManager.getSize();
  const halfWidth = size[0] * 0.5;
  return px + halfWidth;
}

function TOP(px: number) {
  const size = coreManager.getSize();
  const halfHeight = size[1] * 0.5;
  return px - halfHeight;
}

export { TwoCasualScreen };