import Stats from 'stats.js';
// ---------------------------------------------------------------------------------------
import { coreManager } from '../core/core_manager';
import { inputManager } from '../input/input_manager';
import { screenManager } from '../screen/screen_manager';
import { uiManager } from '../ui/ui_manager';
import { soundManager } from '../sound/sound_manager';

const DEFAULT_FRAME_RATE = 60;

export enum EngineFormat {
  JSC = 0, // script machine
  JAM = 1, // animated mesh - with its binary alternative: BAM
  JSM = 2, // static mesh - with its binary alternative: BSM
  OBJ = 4, // multiple static mesh
  JAS = 8, // animated sprite
  JSS = 16, // static sprite
  JWM = 32, // collision walkmesh
  JNM = 64, // collision hitmesh
  JLM = 128, // line mesh
  JSV = 256, // shadow volume
  JLT = 512, // light
};

/**
 * Singleton managing the main loop engine.
 */
class EngineManager {
  then: number;
  delta: number;
  timeStamp: number;
  frameRate: number;
  paused: boolean;
  lastAnimationFrameId: number;
  pauseStartTime: number;
  stats: Stats;

  constructor() {
    this.then = 0;
    this.timeStamp = 0;
    this.delta = 0;
    this.frameRate = DEFAULT_FRAME_RATE;
    this.paused = false;
    this.lastAnimationFrameId = 0;
    this.pauseStartTime = 0;
    this.stats = new Stats();

    this.stats.showPanel(0);
    this.stats.dom.style.display = 'none';
    this.stats.dom.style.position = 'relative';
    this.stats.dom.style.float = 'right';
    document.getElementById('APP')!.appendChild(this.stats.dom);
  
    document.addEventListener('visibilitychange', () => this.#handleVisibilityChange());
  }

  /**
   * Start the engine with optional parameters and run the main loop.
   * 
   * @param {boolean} [enableScanlines=true] - Determines whether scanlines should be enabled or not.
   */
  startup(enableScanlines: boolean = true, ): void {
    coreManager.enableScanlines(enableScanlines);
    this.run(0);
  }

  /**
   * The main loop.
   */
  run(timeStamp: number, state: 'pause' | 'resume' | 'normal' = 'normal'): void {
    this.stats.begin();
    this.timeStamp = timeStamp;

    if (state === 'pause') {
      this.pauseStartTime = timeStamp;
      cancelAnimationFrame(this.lastAnimationFrameId);
      return;
    }

    if (state === 'resume') {
      const pauseDuration = timeStamp - this.pauseStartTime;
      this.then = this.then + pauseDuration;
    }

    const frameDuration = 1000 / this.frameRate;
    this.delta = (timeStamp - this.then) ;

    if (this.delta >= frameDuration) {
      this.then = timeStamp - (this.delta % frameDuration);
      inputManager.update(frameDuration);

      uiManager.update(frameDuration);
      screenManager.update(frameDuration);

      screenManager.draw();
      screenManager.render(frameDuration);

      this.stats.end();
    }

    this.lastAnimationFrameId = requestAnimationFrame(timeStamp => this.run(timeStamp));
  }

  /**
   * Set the frame rate value.
   * 
   * @param {number} value - The fps value.
   */
  setFrameRate(value: number): void {
    this.frameRate = value;
  }

  /**
   * Get the frame rate value.
   */
  getFrameRate(): number {
    return this.frameRate;
  }

  /**
   * Set the actual timestamp since the app is running.
   */
  getTimeStamp(): number {
    return this.timeStamp;
  }

  /**
   * Get the time since the last frame.
   */
  getDelta(): number {
    return this.delta;
  }

  /**
   * Make the update loop paused.
   */
  pause(): void {
    if (this.paused) {
      return;
    }

    this.paused = true;
    this.run(performance.now(), 'pause');
    soundManager.pause();
  }

  /**
   * Make the update loop running.
   */
  resume(): void {
    if (!this.paused) {
      return;
    }

    this.paused = false;
    this.run(performance.now(), 'resume');
    soundManager.resume();
  }

  /**
   * Returns the stats object.
   */
  getStats(): Stats {
    return this.stats;
  }

  /**
   * Show or hide the stats.
   * 
   * @param {boolean} show - The show flag.
   */
  showStats(show: boolean) {
    this.stats.dom.style.display = show ? 'block' : 'none';
  }

  #handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
    }
    else {
      this.resume();
    }
  }
}

export { EngineManager };
export const em = new EngineManager();