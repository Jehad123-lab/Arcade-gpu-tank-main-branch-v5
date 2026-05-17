import { FormatJAS, fromAseprite, fromEzSpriteSheet } from './format_jas';

/**
 * Singleton spritesheet manager.
 */
class SpritesheetManager {
  spritesheets: Map<string, FormatJAS>;
  textures: Map<string, ImageBitmap>;
  textureUrls: Map<string, string>;

  constructor() {
    this.spritesheets = new Map<string, FormatJAS>();
    this.textures = new Map<string, ImageBitmap>();
    this.textureUrls = new Map<string, string>();
  }

  /**
   * Loads asynchronously a file from a given path, caching it for future use and returns it as an `Blob`.
   * 
   * @param {string} path - The file path.
   * @param {string} storePath - The optionnal store file path.
   */
  async loadSpritesheet(type: 'asesprite' | 'ezspritesheet' | 'jas' = 'jas', path: string, imagePath: string = '', storePath: string = '', loadSpritesheetTexture: boolean = false): Promise<FormatJAS> {
    storePath = storePath ? storePath : path;

    if (this.spritesheets.has(storePath)) {
      return this.spritesheets.get(storePath)!;
    }

    if (type == 'asesprite') {
      const data = await fromAseprite(path);
      this.spritesheets.set(storePath, data);
      if (loadSpritesheetTexture && imagePath) {
        await this.loadSpritesheetTexture(imagePath, data);
      }
      return data;
    }
    else if (type == 'ezspritesheet') {
      const data = await fromEzSpriteSheet(path);
      this.spritesheets.set(storePath, data);
      if (loadSpritesheetTexture && imagePath) {
        await this.loadSpritesheetTexture(imagePath, data);
      }
      return data;
    }
    else if (type == 'jas') {
      const data = await fetch(path).then(res => res.json()) as FormatJAS;
      this.spritesheets.set(storePath, data);
      if (loadSpritesheetTexture && imagePath) {
        await this.loadSpritesheetTexture(imagePath, data);
      }
      return data;
    }
    else {
      throw new Error('SpritesheetManager::loadFile(): Unknown file type !');
    }
  }

  async loadSpritesheetTexture(imagePath: string, data: FormatJAS) {
    const res = await fetch(imagePath);
    const blobImg = await res.blob();
    const bitmap = await createImageBitmap(blobImg);

    const promises = data['Animations'].map(async (animation) => {
      const frame = animation['Frames'][0];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = frame['Width'];
      canvas.height = frame['Height'];

      if (ctx) {
        ctx.drawImage(
          bitmap,
          frame['X'], frame['Y'], frame['Width'], frame['Height'],
          0, 0, frame['Width'], frame['Height']
        );

        const extractedBitmap = await createImageBitmap(canvas);
        this.textures.set(animation['Name'], extractedBitmap);

        return new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              this.textureUrls.set(animation['Name'], URL.createObjectURL(blob));
            }
            resolve();
          });
        });
      }
    });

    await Promise.all(promises);
  }

  /**
   * Deletes a spritesheet if it exists, otherwise it throws an error.
   * 
   * @param {string} path - The file path.
   */
  deleteSpritesheet(path: string): void {
    if (!this.spritesheets.has(path)) {
      throw new Error('SpritesheetManager::deleteSpritesheet(): The spritesheet file doesn\'t exist, cannot delete !');
    }

    this.spritesheets.delete(path);
  }

  /**
   * Returns an `FormatJAS` object for a given spritesheet path, or throws an error if the file doesn't exist.
   * 
   * @param {string} path - The file path.
   */
  getSpritesheet(path: string): FormatJAS {
    if (!this.spritesheets.has(path)) {
      throw new Error('SpritesheetManager::getSpritesheet(): The file doesn\'t exist, cannot get !');
    }

    return this.spritesheets.get(path)!;
  }

  getTexture(name: string): ImageBitmap {
    if (!this.textures.has(name)) {
      throw new Error('SpritesheetManager::getTexture(): The texture doesn\'t exist, cannot get !');
    }

    return this.textures.get(name)!;
  }

  getTextureURL(name: string): string {
    if (!this.textureUrls.has(name)) {
      throw new Error('SpritesheetManager::getTextureURL(): The texture doesn\'t exist, cannot get !');
    }

    return this.textureUrls.get(name)!;
  }

  /**
   * Checks if spritesheet exists.
   * 
   * @param {string} path - The spritesheet path.
   */
  hasSpritesheet(path: string): boolean {
    return this.spritesheets.has(path);
  }

  /**
   * Deletes all stored files.
   */
  releaseFiles(): void {
    for (const path of this.spritesheets.keys()) {
      this.spritesheets.delete(path);
    }
  }
}

export { SpritesheetManager };
export const spritesheetManager = new SpritesheetManager();