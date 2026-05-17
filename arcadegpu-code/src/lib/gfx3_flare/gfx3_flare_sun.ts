import { gfx3Manager } from '../gfx3/gfx3_manager';
import { UT } from '../core/utils';
import { Gfx3Texture } from '../gfx3/gfx3_texture';
import { Gfx3Flare } from './gfx3_flare';

const CENTER_SCREEN: vec2 = [0.5, 0.5];

export interface LensFlareItem {
  texture: Gfx3Texture;
  scale: number;
  step: number
}

/**
 * A lens flare handler.
 */
class Gfx3FlareSun {
  flares: Array<Gfx3Flare>;
  flareItems: Array<LensFlareItem>;
  sunFlare: Gfx3Flare;
  sunItem: LensFlareItem | null;
  sunWorldPos: vec3;
  scaleStepFactor: number;
  maxDistanceBrightness: number;

  constructor() {
    this.flares = [];
    this.flareItems = [];
    this.sunFlare = new Gfx3Flare();
    this.sunItem = null;
    this.sunWorldPos = [0, 0, 0];
    this.scaleStepFactor = 0.1;
    this.maxDistanceBrightness = 0.7;
  }

  /**
   * Free all resources.
   * 
   * @param {number} spacing - The space between flares
   */
  async startup(sunPos: vec3, sun: LensFlareItem, items: Array<LensFlareItem>): Promise<void> {
    this.flareItems = items;
    this.sunItem = sun;
    this.sunWorldPos = sunPos;

    const currentView = gfx3Manager.getCurrentView();
    const viewportSize = currentView.getViewportSize();
    const minViewportSize = Math.min(viewportSize[0], viewportSize[1]);

    this.sunFlare = new Gfx3Flare();
    this.sunFlare.setTexture(sun.texture);
    this.sunFlare.setSize2D(1, 1); // special case for lens flares
    this.sunFlare.setOffset2DNormalized(0.5, 0.5);
    this.sunFlare.setScale2D(sun.scale * minViewportSize, sun.scale * minViewportSize); // special case for lens flares

    this.flares = [];
    for (const item of items) {
      const flare = new Gfx3Flare();
      flare.setTexture(item.texture);
      flare.setSize2D(1, 1);
      flare.setOffset2DNormalized(0.5, 0.5);
      flare.setScale2D(item.scale * minViewportSize, item.scale * minViewportSize);
      this.flares.push(flare);
    }
  }

  /**
   * The draw function.
   */
  draw(): void {
    const currentView = gfx3Manager.getCurrentView();
    const viewportSize = currentView.getViewportSize();

    const sunPosPx = currentView.getScreenPosition(this.sunWorldPos[0], this.sunWorldPos[1], this.sunWorldPos[2]);
    const sunPosN: vec2 = [sunPosPx[0] / viewportSize[0], sunPosPx[1] / viewportSize[1]];
    const sunToCenterN = UT.VEC2_SUBSTRACT(CENTER_SCREEN, sunPosN);
    const brightness = 1 - UT.VEC2_LENGTH(sunToCenterN) / this.maxDistanceBrightness;

    if (brightness <= 0) {
      return;
    }

    for (let i = 0; i < this.flares.length; i++) {
      const directionScaled = UT.VEC2_SCALE(sunToCenterN, this.flareItems[i].step);
      this.flares[i].setColor(1, 1, 1, brightness);

      const flarePosN = UT.VEC2_ADD(sunPosN, directionScaled);
      const flarePosPx = [flarePosN[0] * viewportSize[0], flarePosN[1] * viewportSize[1]];
      this.flares[i].setPosition2D(flarePosPx[0], flarePosPx[1]);
      this.flares[i].setColor(1, 1, 1, brightness);
      this.flares[i].draw();
    }

    this.sunFlare.setPosition2D(sunPosPx[0], sunPosPx[1]);
    this.sunFlare.draw();
  }

  /**
   * Set the sun position.
   * 
   * @param {number} x - The x position.
   * @param {number} y - The y position.
   * @param {number} z - The z position.
   */
  setSunWorldPosition(x: number, y: number, z: number): void {
    this.sunWorldPos = [x, y, z];
  }

  /**
   * Set the scale step factor.
   * 
   * @param {number} scaleStepFactor - The scale value.
   */
  setScaleStepFactor(scaleStepFactor: number): void {
    this.scaleStepFactor = scaleStepFactor;
  }

  /**
   * Set the maximum distance for brightness.
   * 
   * @param {number} maxDistanceBrightness - The distance max.
   */
  setMaxDistanceBrightness(maxDistanceBrightness: number): void {
    this.maxDistanceBrightness = maxDistanceBrightness;
  }

  /**
   * Replace default flares config by a custom one.
   * 
   * @param {Array<Gfx3Flare>} flares - The flare list.
   */
  setFlares(flares: Array<Gfx3Flare>): void {
    this.flares = flares;
  }
}

export { Gfx3FlareSun };