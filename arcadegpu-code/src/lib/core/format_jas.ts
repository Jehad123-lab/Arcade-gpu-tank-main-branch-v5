export interface FormatJAS {
  Ident: string;
  Animations: Array<FormatJASAnimation>;
  OffsetX?: number;
  OffsetY?: number;
  OffsetFactorX?: number;
  OffsetFactorY?: number;
  FlipX?: boolean;
  FlipY?: boolean;
};

export interface FormatJASAnimation {
  'Name': string;
  'Frames': Array<FormatJASAnimationFrame>;
  'FrameDuration': number;
};

export interface FormatJASAnimationFrame {
  'X': number;
  'Y': number;
  'Width': number;
  'Height': number;
};

interface Aseprite {
  meta: AsepriteMeta;
  frames: Array<AsepriteFrame>;
};

interface AsepriteFrame {
  frame: { x: number, y: number, w: number, h: number; };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number, y: number, w: number, h: number; };
  sourceSize: { x: number, y: number };
  duration: number;
};

interface AsepriteMeta {
  app: string;
  version: string;
  image: string;
  format: string;
  size: { w: number, h: number };
  scale: string;
  frameTags: Array<AsepriteTag>,
};

interface AsepriteTag {
  name: string;
  from: number;
  to: number;
  direction: string;
  color: string;
};

export function getSpriteAnimation(jas: FormatJAS, name: string): FormatJASAnimation {
  for (const item of jas['Animations']) {
    if (item['Name'] == name) {
      return item;
    }
  }

  throw new Error('FormatJAS::getSpriteAnimation(): animation not found !');
}

export function getSpriteFrame(jas: FormatJAS, name: string, frameIndex: number = 0): FormatJASAnimationFrame {
  for (const item of jas['Animations']) {
    if (item['Name'] == name) {
      return item['Frames'][frameIndex];
    }
  }

  throw new Error('FormatJAS::getSpriteFrame(): animation frame not found !');
}

export async function fromEzSpriteSheet(path: string): Promise<FormatJAS> {
  const response = await fetch(path);
  const data = await response.json();

  const animations = new Array<FormatJASAnimation>();
  for (const item of data.animation) {
    const frames = new Array<FormatJASAnimationFrame>();
    for (let i = 0; i < item.frame.length; i++) {
      frames.push({
        'X': item.frame[i].x,
        'Y': item.frame[i].y,
        'Width': item.frame[i].w,
        'Height': item.frame[i].h
      });
    }

    animations.push({
      'Name': item.name,
      'Frames': frames,
      'FrameDuration': item.ms
    });
  }

  return {
    'Ident': 'JAS',
    'Animations': animations
  };
}

export async function fromAseprite(path: string): Promise<FormatJAS> {
  const response = await fetch(path);
  const aseprite = await response.json() as Aseprite;

  const arrayFrames = new Array<AsepriteFrame>();
  for (const key in aseprite.frames) {
    arrayFrames.push(aseprite.frames[key]);
  }

  const animations = new Array<FormatJASAnimation>();
  let duration = 0;

  if (aseprite.meta.frameTags.length == 0) {
    const frames = new Array<FormatJASAnimationFrame>();
    for (const key in aseprite.frames) {
      frames.push({
        'X': aseprite.frames[key].frame.x,
        'Y': aseprite.frames[key].frame.y,
        'Width': aseprite.frames[key].frame.w,
        'Height': aseprite.frames[key].frame.h,
      });

      duration = aseprite.frames[key].duration;
    }

    animations.push({
      'Name': 'default',
      'Frames': frames,
      'FrameDuration': duration
    });
  }

  for (const tag of aseprite.meta.frameTags) {
    const frames = new Array<FormatJASAnimationFrame>();
    for (let i = tag.from; i <= tag.to; i++) {
      frames.push({
        'X': arrayFrames[i].frame.x,
        'Y': arrayFrames[i].frame.y,
        'Width': arrayFrames[i].frame.w,
        'Height': arrayFrames[i].frame.h,
      });
    }

    animations.push({
      'Name': tag.name,
      'Frames': frames,
      'FrameDuration': arrayFrames[tag.from].duration
    });
  }

  return {
    'Ident': 'JAS',
    'Animations': animations
  };
}