import JSZip from 'jszip';
// -----------------------------------------------------------------------------------------------
import { gfx2Manager } from '../gfx2/gfx2_manager';
import { gfx2TextureManager } from '../gfx2/gfx2_texture_manager';
import { soundManager } from '../sound/sound_manager';
import { spritesheetManager } from '../core/spritesheet_manager';
import { fileManager } from '../core/file_manager';
import { UT } from '../core/utils';
import { Curve, CurveInterpolator } from '../core/curve';
import { FormatJAS } from '../core/format_jas';
import { Gfx2SpriteJSS } from '../gfx2_sprite/gfx2_sprite_jss';
import { Gfx2SpriteJAS } from '../gfx2_sprite/gfx2_sprite_jas';
import { Gfx2TileMap } from '../gfx2_tile/gfx2_tile_map';
import { Sound } from '../sound/sound_manager';
import { Motion } from '../motion/motion';
import { ScriptMachine } from '../script/script_machine';
import { AIPathGraph2D } from '../ai/ai_path_graph';
import { AIPathGrid2D } from '../ai/ai_path_grid';
import { EnginePackItemList, EnginePackItem } from './engine_pack_item_list';

/**
 * A package manager for 2D assets.
 */
class EnginePack2D {
  bin: EnginePackItemList<Blob>;
  sst: EnginePackItemList<FormatJAS>;
  jsc: EnginePackItemList<ScriptMachine>;
  snd: EnginePackItemList<Sound>;
  tex: EnginePackItemList<ImageBitmap>;
  jss: EnginePackItemList<Gfx2SpriteJSS>;
  jas: EnginePackItemList<Gfx2SpriteJAS>;
  jtm: EnginePackItemList<Gfx2TileMap>;
  jlm: EnginePackItemList<Motion>;
  crv: EnginePackItemList<CurveInterpolator>;
  grf: EnginePackItemList<AIPathGraph2D>;
  grd: EnginePackItemList<AIPathGrid2D>;
  any: EnginePackItemList<any>;
  cameraX: number;
  cameraY: number;
  scaleX: number;
  scaleY: number;
  updateItems: Array<EnginePackItem<any>>;
  drawItems: Array<EnginePackItem<any>>;

  constructor() {
    this.bin = new EnginePackItemList<Blob>;
    this.sst = new EnginePackItemList<FormatJAS>;
    this.jsc = new EnginePackItemList<ScriptMachine>;
    this.snd = new EnginePackItemList<Sound>;
    this.tex = new EnginePackItemList<ImageBitmap>;
    this.jss = new EnginePackItemList<Gfx2SpriteJSS>;
    this.jas = new EnginePackItemList<Gfx2SpriteJAS>;
    this.jtm = new EnginePackItemList<Gfx2TileMap>;
    this.jlm = new EnginePackItemList<Motion>;
    this.crv = new EnginePackItemList<CurveInterpolator>;
    this.grf = new EnginePackItemList<AIPathGraph2D>;
    this.grd = new EnginePackItemList<AIPathGrid2D>;
    this.any = new EnginePackItemList<any>;
    this.cameraX = 0;
    this.cameraY = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.updateItems = [];
    this.drawItems = [];
  }

  /**
   * Create a 2D pack from archive file.
   * 
   * @param {string} path - The archive file path.
   */
  async createFromFile(path: string): Promise<EnginePack2D> {
    const res = await fetch(path);
    const zip = await JSZip.loadAsync(await res.blob());
    const pack = new EnginePack2D();

    // load textures first
    for (const entry of zip.file(/\.(jpg|jpeg|png|bmp)/)) {
      const infos = UT.GET_FILENAME_INFOS(entry.name);
      const file = zip.file(entry.name);

      if (file != null) {
        const url = URL.createObjectURL(await file.async('blob'));
        const tex = await gfx2TextureManager.loadTexture(url);
        pack.tex.push({ name: infos.name, ext: 'bitmap', object: tex, blobUrl: url });
      }
    }

    // load all others resources
    for (const entry of zip.file(/.*/)) {
      const infos = UT.GET_FILENAME_INFOS(entry.name);
      const file = zip.file(entry.name);

      if (file != null && infos.name == 'camera') {
        const data = JSON.parse(await file.async('string'));
        pack.cameraX = data['PositionX'];
        pack.cameraY = data['PositionY'];
        pack.scaleX = data['ScaleX'];
        pack.scaleY = data['ScaleY'];
        gfx2Manager.setCameraPosition(pack.cameraX, pack.cameraY);
        gfx2Manager.setCameraScale(pack.scaleX, pack.scaleY);
      }
      else if (file != null && infos.ext == 'ase') {
        const url = URL.createObjectURL(await file.async('blob'));
        const sst = await spritesheetManager.loadSpritesheet('asesprite', url, entry.name);
        pack.sst.push({ name: infos.name, ext: 'ase', object: sst, blobUrl: url });
      }
      else if (file != null && infos.ext == 'ezs') {
        const url = URL.createObjectURL(await file.async('blob'));
        const sst = await spritesheetManager.loadSpritesheet('ezspritesheet', url, entry.name);
        pack.sst.push({ name: infos.name, ext: 'ezs', object: sst, blobUrl: url });
      }
      else if (file != null && infos.ext == 'mp3') {
        const url = URL.createObjectURL(await file.async('blob'));
        const snd = await soundManager.loadSound(url, entry.name);
        pack.snd.push({ name: infos.name, ext: 'mp3', object: snd, blobUrl: url });
      }
      else if (file != null && infos.ext == 'jsc') {
        const url = URL.createObjectURL(await file.async('blob'));
        const jsc = new ScriptMachine();
        await jsc.loadFromFile(url);
        pack.jsc.push({ name: infos.name, ext: 'jsc', object: jsc, blobUrl: url });
      }
      else if (file != null && infos.ext == 'jss') {
        const url = URL.createObjectURL(await file.async('blob'));
        const jss = new Gfx2SpriteJSS();
        await jss.loadFromFile(url);
        pack.jss.push({ name: infos.name, ext: 'jss', object: jss, blobUrl: url });
      }
      else if (file != null && infos.ext == 'jas') {
        const url = URL.createObjectURL(await file.async('blob'));
        const jas = new Gfx2SpriteJAS();
        await jas.loadFromFile(url);
        pack.jas.push({ name: infos.name, ext: 'jas', object: jas, blobUrl: url });
      }
      else if (file != null && infos.ext == 'jtm') {
        const url = URL.createObjectURL(await file.async('blob'));
        const jtm = new Gfx2TileMap();
        await jtm.loadFromFile(url);
        pack.jtm.push({ name: infos.name, ext: 'jtm', object: jtm, blobUrl: url });
      }
      else if (file != null && infos.ext == 'tilekit') {
        const url = URL.createObjectURL(await file.async('blob'));
        const jtm = new Gfx2TileMap();
        await jtm.loadFromTileKit(url);
        pack.jtm.push({ name: infos.name, ext: 'jtm', object: jtm, blobUrl: url });
      }
      else if (file != null && infos.ext == 'spritefusion') {
        const url = URL.createObjectURL(await file.async('blob'));
        const jtm = new Gfx2TileMap();
        await jtm.loadFromSpriteFusion(url);
        pack.jtm.push({ name: infos.name, ext: 'jtm', object: jtm, blobUrl: url });
      }
      else if (file != null && infos.ext == 'jlm') {
        const url = URL.createObjectURL(await file.async('blob'));
        const jlm = new Motion();
        await jlm.loadFromFile(url);
        pack.jlm.push({ name: infos.name, ext: 'jlm', object: jlm, blobUrl: url });
      }
      else if (file != null && infos.ext == 'crv') {
        const url = URL.createObjectURL(await file.async('blob'));
        const crv = await Curve.createFromFile(url);
        pack.crv.push({ name: infos.name, ext: 'crv', object: crv, blobUrl: url });
      }
      else if (file != null && infos.ext == 'blm') {
        const url = URL.createObjectURL(await file.async('blob'));
        const jlm = new Motion();
        await jlm.loadFromBinaryFile(url);
        pack.jlm.push({ name: infos.name, ext: 'blm', object: jlm, blobUrl: url });
      }
      else if (file != null && infos.ext == 'grf') {
        const url = URL.createObjectURL(await file.async('blob'));
        const grf = new AIPathGraph2D();
        await grf.loadFromFile(url);
        pack.grf.push({ name: infos.name, ext: 'grf', object: grf, blobUrl: url });
      }
      else if (file != null && infos.ext == 'grd') {
        const url = URL.createObjectURL(await file.async('blob'));
        const grd = new AIPathGrid2D();
        await grd.loadFromFile(url);
        pack.grd.push({ name: infos.name, ext: 'grd', object: grd, blobUrl: url });
      }
      else if (file != null && infos.ext == 'any') {
        const data = JSON.parse(await file.async('string'));
        pack.any.push({ name: infos.name, ext: 'any', object: data, blobUrl: '' });
      }
      else if (file != null) {
        const url = URL.createObjectURL(await file.async('blob'));
        const blob = await fileManager.loadFile(url, entry.name);
        pack.bin.push({ name: infos.name, ext: infos.ext, object: blob, blobUrl: url });
      }
    }

    pack.updateItems.push(...pack.jsc, ...pack.jas, ...pack.jss, ...pack.jtm, ...pack.jlm);
    pack.drawItems.push(...pack.jas, ...pack.jss, ...pack.jtm);

    return pack;
  }

  update(ts: number) {
    for (const item of this.updateItems) {
      item.object.update(ts);
    }
  }

  draw() {
    for (const item of this.drawItems) {
      item.object.draw();
    }
  }
}

export { EnginePack2D };