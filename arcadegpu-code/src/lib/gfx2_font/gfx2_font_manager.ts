import { $Font, Font } from 'bdfparser';
// ---------------------------------------------------------------------------------------
import { gfx2Manager } from '../gfx2/gfx2_manager';
// ---------------------------------------------------------------------------------------

export interface Gfx2FontOptions {
  x?: number;
  y?: number;
  backgroundColor?: string;
  textColor?: string;
  glowColor?: string;
  hasGlow?: boolean;
  glowMode?: 0 | 1;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  [key: string]: any;
}

/**
 * Singleton font manager.
 */
export class Gfx2FontManager {
  fonts: Map<string, Font>;

  constructor() {
    this.fonts = new Map<string, Font>();
  }

  /**
   * Load asynchronously a font from a given path and returns it as a `Font`, caching it for future use.
   * 
   * @param {string} path - The file path.
   * @param {string} storePath - The optionnal store file path.
   */
  async loadFont(path: string, storePath: string = ''): Promise<Font> {
    storePath = storePath ? storePath : path;
    if (this.fonts.has(storePath)) {
      return this.fonts.get(storePath)!;
    }

    const lines = readLinesFromUrl(path);
    const font = await $Font(lines);
    this.fonts.set(storePath, font);

    return font;
  }

  /**
   * Returns a font or throws an error if doesn't exist.
   * 
   * @param {string} path - The file path.
   */
  getFont(path: string): Font | null {
    if (!this.fonts.has(path)) {
      throw new Error('Gfx2FontManager::getFont(): Font not found !');
    }

    return this.fonts.get(path)!;
  }

  /**
   * Deletes a font if it exists, otherwise it throws an error.
   * 
   * @param {string} path - The file path.
   */
  deleteFont(path: string): void {
    if (!this.fonts.has(path)) {
      throw new Error('Gfx2FontManager::deleteFont(): The font file doesn\'t exist, cannot delete !');
    }

    this.fonts.delete(path);
  }

  /**
   * Checks if a font exists.
   * 
   * @param {string} path - The file path.
   */
  hasFont(path: string): boolean {
    return this.fonts.has(path);
  }

  /**
   * Draw text using the given font.
   * 
   * @param {string} path - The font path.
   * @param {string} text - The text to draw.
   * @param {any} options - The options.
   * @param {boolean} glow - The glow.
   */
  draw(path: string, text: string, options: Gfx2FontOptions = {}) {
    const font = this.fonts.get(path);
    if (!font) {
      throw new Error('Gfx2FontManager::draw(): Font not found !');
    }

    const ctx = gfx2Manager.getContext();
    const bitmapText = font.draw(text, options as any);

    if (options.hasGlow) {
      bitmapText.glow(options.glowMode ?? 0);
    }

    let offsetX = options.x ?? 0;
    let offsetY = options.y ?? 0;

    if (options.align && options.align == 'center') {
      offsetX -= bitmapText.width() / 2;
    }
    if (options.align && options.align == 'right') {
      offsetX -= bitmapText.width();
    }

    if (options.valign && options.valign == 'middle') {
      offsetY -= bitmapText.height() / 2;
    }
    if (options.valign && options.valign == 'bottom') {
      offsetY -= bitmapText.height();
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);
    bitmapText.draw2canvas(gfx2Manager.getContext(), {
      '0': options.backgroundColor ?? null,
      '1': options.textColor ?? 'white',
      '2': options.glowColor ?? 'red'
    });
    ctx.restore();
  }

  /**
   * Deletes all stored fonts.
   */
  releaseFonts(): void {
    for (const path of this.fonts.keys()) {
      this.fonts.delete(path);
    }
  }
}

export const gfx2FontManager = new Gfx2FontManager();

// ---------------------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------------------
async function* readLinesFromUrl(url: string): AsyncIterableIterator<string> {
  const response = await fetch(url);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let lines = buffer.split("\n");
    buffer = lines.pop()!;

    for (const line of lines) {
      yield line;
    }
  }

  if (buffer.length > 0) {
    yield buffer;
  }
}