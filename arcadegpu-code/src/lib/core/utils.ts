import { Quaternion } from './quaternion';

export type CurveMapItem = {
  mapBegin: number;
  mapEnd: number;
  valueMin: number;
  valueMax: number;
};

class UT {
  static DEG_TO_RAD_RATIO = Math.PI / 180;
  static EPSILON = 0.0000001;
  static BIG_EPSILON = 0.0001;
  static VEC2_SIZE = 8;
  static VEC2_ZERO: vec2 = [0, 0];
  static VEC2_LEFT: vec2 = [-1, 0];
  static VEC2_RIGHT: vec2 = [1, 0];
  static VEC2_UP: vec2 = [0, 1];
  static VEC2_DOWN: vec2 = [0, -1];
  static VEC2_ISO_LEFT: vec2 = [0, 1];
  static VEC2_ISO_RIGHT: vec2 = [0, -1];
  static VEC2_ISO_FORWARD: vec2 = [-1, 0];
  static VEC2_ISO_BACKWARD: vec2 = [1, 0];
  static VEC3_SIZE = 12;
  static VEC3_ZERO: vec3 = [0, 0, 0];
  static VEC3_BACKWARD: vec3 = [0, 0, 1];
  static VEC3_FORWARD: vec3 = [0, 0, -1];
  static VEC3_LEFT: vec3 = [-1, 0, 0];
  static VEC3_RIGHT: vec3 = [1, 0, 0];
  static VEC3_UP: vec3 = [0, 1, 0];
  static VEC3_DOWN: vec3 = [0, -1, 0];

  /**
   * @ignore
   */
  static FAIL(message: string) {
    const elem = document.querySelector<HTMLDivElement>('#APP_FAIL')!;
    elem.classList.add('SHOW');
    elem.textContent = message;
  }

  /**
   * @param filename - The file name.
   */
  static GET_FILENAME_INFOS(filename: string): { name: string, ext: string } {
    const splitname = filename.split('.');
    return {
      name: splitname.slice(0, -1).join(),
      ext: splitname.at(-1) ?? ''
    };
  }

  /**
   * @param ms - Time to wait (in milliseconds).
   */
  static WAIT(ms: number): Promise<any> {
    return new Promise((resolve: Function) => {
      window.setTimeout(() => resolve(), ms);
    });
  }

  /**
   * @param arr - The array to shuffle.
   */
  static SHUFFLE(arr: Array<any>): Array<any> {
    const res = arr.slice();
    let tmp, cur, tp = res.length;
    if (tp) {
      while (--tp) {
        cur = Math.floor(Math.random() * (tp + 1));
        tmp = res[cur];
        res[cur] = res[tp];
        res[tp] = tmp;
      }
    }

    return res;
  }

  /**
   * @param start - The start value.
   * @param stop - The stop value.
   * @param step - Increment step.
   */
  static RANGE_ARRAY(start: number, stop: number, step: number = 0) {
    return Array.from({ length: (stop - start) / step + 1 }, (value, index) => start + index * step);
  }

  /**
   * @param min - The min.
   * @param max - The max.
   */
  static RANDARRAY(min: number, max: number): Array<number> {
    const arr = [];
    for (let i = min; i <= max; i++) {
      arr.push(i);
    }

    return UT.SHUFFLE(arr);
  }

  /**
   * @param base - The origin value.
   * @param spread - The spread value.
   */
  static SPREAD(base: number, spread: number): number {
    return base + spread * (Math.random() - 0.5);
  }

  /**
   * @param min - The min.
   * @param max - The max.
   */
  static GET_RANDOM_INT(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  /**
   * @param min - The min.
   * @param max - The max.
   */
  static GET_RANDOM_FLOAT(min: number, max: number): number {
    return (Math.random() * (max - min)) + min;
  }

  /**
   * @param value - The value to clamp.
   * @param min - The min.
   * @param max - The max.
   */
  static CLAMP(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * @param value - The value to check..
   * @param threshold - The threshold value after which the value is considered zero.
   */
  static DEADZONE(value: number, threshold = 0.001) {
    return Math.abs(value) < threshold ? 0 : value;
  }

  /**
   * @param deg - Angle in degrees.
   */
  static DEG_TO_RAD(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * @param angle - Angle in radians.
   */
  static NORMALIZE_ANGLE(angle: number) {
    angle = angle % Math.PI * 2;

    if (angle > Math.PI) {
      angle -= Math.PI * 2;
    }
    else if (angle < -Math.PI) {
      angle += Math.PI * 2;
    }

    return angle;
  }

  /**
   * @param angle - Angle to clamp in radians.
   */
  static CLAMP_ANGLE(angle: number) {
    angle %= (2 * Math.PI);
    if (angle < 0) angle += (2 * Math.PI);
    return angle;
  }

  /**
   * @param a - The begin.
   * @param b - The end.
   * @param t - The time.
   */
  static LERP(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * @param a - The begin.
   * @param b - The end.
   * @param coefficient - The increase coefficient factor.
   * @param t - The time.
   */
  static LERP_EXP(a: number, b: number, exp: number, t: number): number {
    return a + (b - a) * Math.pow(exp, t);
  }

  /**
   * @param a - The begin.
   * @param b - The end.
   * @param t - The time.
   */
  static MIX(a: Array<number>, b: Array<number>, t: number): Array<number> {
    return a.map((v, i) => UT.LERP(v, b[i], t));
  }

  /**
   * @param tl - The top left color.
   * @param tr - The top right color.
   * @param bl - The bottom left color.
   * @param br - The bottom right color.
   * @param t1 - The horizontal interpolation distance.
   * @param t2 - The vertical interpolation distance.
   */
  static BILINEAR_FILTER(tl: Array<number>, tr: Array<number>, bl: Array<number>, br: Array<number>, t1: number, t2: number): Array<any> {
    const t = UT.MIX(tl, tr, t1);
    const b = UT.MIX(bl, br, t1);
    return UT.MIX(t, b, t2);
  };

  /**
   * @param num - The number.
   * @param digits - The number after float.
   * @param base - The numeric base.
   */
  static TO_FIXED_NUMBER(num: number, digits: number, base: number = 10): number {
    const pow = Math.pow(base, digits);
    return Math.round(num * pow) / pow;
  }

  /**
   * @param src - Number.
   * @param out - Vector one.
   */
  static VEC1_COPY(src: number, out: vec1 = [0]): vec1 {
    out[0] = src;
    return out;
  }

  /**
   * @param x - The first component.
   * @param y - The second component.
   */
  static VEC2_CREATE(x: number = 0, y: number = 0): Float32Array {
    const out = new Float32Array(2);
    out[0] = x;
    out[1] = y;
    return out;
  }

  /**
   * @param str - The string.
   * @param separator - The token separator between components.
   * @param out - The vector.
   */
  static VEC2_PARSE(str: string, separator: string = ' ', out: vec2 = [0, 0]): vec2 {
    const a = str.split(separator);
    out[0] = parseFloat(a[0]);
    out[1] = parseFloat(a[1]);
    return out;
  }

  /**
   * @param src - The source vector.
   * @param out - The destination vector.
   */
  static VEC2_COPY(src: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = src[0];
    out[1] = src[1];
    return out;
  }

  /**
   * @param a - The vector to check.
   */
  static VEC2_ISZERO(a: vec2): boolean {
    return Math.abs(a[0]) <= UT.EPSILON && Math.abs(a[1]) <= UT.EPSILON;
  }

  /**
   * @param base - The base vector.
   * @param spread - The spread vector.
   */
  static VEC2_SPREAD(base: vec2, spread: vec2): vec2 {
    const rand: vec2 = [Math.random() - 0.5, Math.random() - 0.5];
    return UT.VEC2_ADD(base, UT.VEC2_MULTIPLY(spread, rand));
  }

  /**
   * @param b - The begin vector.
   * @param e - The end vector.
   * @param t - The time.
   * @param d - The divide.
   */
  static VEC2_LERP(b: vec2, e: vec2, t: number, d: number = 1): vec2 {
    const c = UT.VEC2_SUBSTRACT(e, b);
    const p = t / d;
    return [b[0] + c[0] * p, b[1] + c[1] * p];
  }

  /**
   * @param center - The position you want to rotate around.
   * @param radius - The radius relative to the center of the rotation.
   * @param angle - The angle rotation.
   */
  static VEC2_ROTATE_AROUND(center: vec2, radius: number, angle: number): vec2 {
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return [center[0] + x, center[1] + y];
  }

  /**
   * @param a - The source vector.
   * @param out - The opposite vector.
   */
  static VEC2_OPPOSITE(a: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
  }

  /**
   * @param a - The first point.
   * @param b - The second point.
   */
  static VEC2_DISTANCE(a: vec2, b: vec2): number {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    return Math.sqrt((x * x) + (y * y));
  }

  /**
   * @param a - The source vector.
   */
  static VEC2_LENGTH(a: vec2): number {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
  }

  /**
   * @param a - The source vector.
   * @param out - The normalized vector.
   */
  static VEC2_NORMALIZE(a: vec2, out: vec2 = [0, 0]): vec2 {
    const len = UT.VEC2_LENGTH(a);
    if (len > 0) {
      out[0] = a[0] / len;
      out[1] = a[1] / len;
    }

    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   */
  static VEC2_DOT(a: vec2, b: vec2): number {
    return a[0] * b[0] + a[1] * b[1];
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   */
  static VEC2_CROSS(a: vec2, b: vec2): number {
    return a[0] * b[1] - a[1] * b[0];
  }

  /**
   * @param p - The first point.
   * @param q - The second point.
   * @param r - The third point.
   */
  static VEC2_ORIENTATION(p: vec2, q: vec2, r: vec2): number {
    const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
    if (val == 0) return 0; // collinear
    return (val > 0) ? 1 : 2; // clock or counterclock wise
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector.
   */
  static VEC2_ADD(a: vec2, b: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector.
   */

  static VEC2_SUBSTRACT(a: vec2, b: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector.
   */
  static VEC2_MULTIPLY(a: vec2, b: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
  }

  /**
   * @param a - The first vector.
   * @param scale - The scale value.
   * @param out - The result vector.
   */
  static VEC2_SCALE(a: vec2, scale: number, out: vec2 = [0, 0]): vec2 {
    out[0] = a[0] * scale;
    out[1] = a[1] * scale;
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector to scale and add to the first.
   * @param scale - The scale value for second vector.
   * @param out - The result vector.
   */
  static VEC2_ADD_SCALED(a: vec2, b: vec2, scale: number, out: vec2 = [0, 0]): vec2 {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector with minimum values for each component pair.
   */
  static VEC2_MIN(a: vec2, b: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector with maximum values for each component pair.
   */
  static VEC2_MAX(a: vec2, b: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
  }

  /**
   * @param value - The vector to clamp.
   * @param min - The min vector.
   * @param max - The max vector.
   */
  static VEC2_CLAMP(value: vec2, min: vec2, max: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = Math.max(min[0], Math.min(max[0], value[0]));
    out[1] = Math.max(min[1], Math.min(max[1], value[1]));
    return out;
  }

  /**
   * @param a - The vector to floor.
   */
  static VEC2_FLOOR(a: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    return out;
  }

  /**
   * @param a - The vector to ceil.
   */
  static VEC2_CEIL(a: vec2, out: vec2 = [0, 0]): vec2 {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   */
  static VEC2_ANGLE_BETWEEN(a: vec2, b: vec2): number {
    return Math.acos(UT.VEC2_DOT(a, b) / (UT.VEC2_LENGTH(a) * UT.VEC2_LENGTH(b)));
  }

  /**
   * @param a - The vector.
   */
  static VEC2_ANGLE(a: vec2): number {
    const angle = Math.atan2(a[1], a[0]);
    return (angle > 0) ? angle : (angle + Math.PI * 2);
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   */
  static VEC2_ISEQUAL(a: vec2, b: vec2): boolean {
    return a[0] == b[0] && a[1] == b[1];
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The projection vector.
   */
  static VEC2_PROJECTION_COS(a: vec2, b: vec2, out: vec2 = [0, 0]): vec2 {
    const bLength = Math.sqrt((b[0] * b[0]) + (b[1] * b[1]));
    const scale = ((a[0] * b[0]) + (a[1] * b[1])) / (bLength * bLength);
    out[0] = b[0] * scale;
    out[1] = b[1] * scale;
    return out;
  }

  /**
   * @param p0 - The start point.
   * @param p1 - The inter point.
   * @param p2 - The end point.
   * @param t - The time.
   * @param out - The result point.
   */
  static VEC2_QUADRATIC_BEZIER(p0: vec2, p1: vec2, p2: vec2, t: number, out: vec2 = [0, 0]): vec2 {
    const pax = p0[0] + ((p1[0] - p0[0]) * t);
    const pay = p0[1] + ((p1[1] - p0[1]) * t);

    const pbx = p1[0] + ((p2[0] - p1[0]) * t);
    const pby = p1[1] + ((p2[1] - p1[1]) * t);

    out[0] = pax + ((pbx - pax) * t);
    out[1] = pay + ((pby - pay) * t);
    return out;
  }

  /**
   * @param p - The iso point.
   */
  static VEC2_ISO_TO_2D(p: vec2): vec2 {
    let x = (2 * p[1] + p[0]) * 0.5;
    let y = (2 * p[1] - p[0]) * 0.5;
    return [x, y];
  }

  /**
   * @param p - The ortho point.
   */
  static VEC2_2D_TO_ISO(p: vec2): vec2 {
    let x = (p[0] - p[1]);
    let y = (p[0] + p[1]) * 0.5;
    return [x, y];
  }

  /**
   * 
   * @param direction - The direction (FORWARD, BACKWARD, LEFT, RIGHT)
   * @param depth - The depth of shape.
   * @param width - The width of shape.
   */
  static VEC2_ISO_CARDINAL_POINTS(direction: string, depth: number, width: number): { f: vec2, l: vec2, r: vec2, b: vec2 } {
    if (direction == 'FORWARD') {
      const f = UT.VEC2_2D_TO_ISO([-depth * 0.5, 0]);
      const l = UT.VEC2_2D_TO_ISO([0, width * 0.5]);
      const r = UT.VEC2_2D_TO_ISO([0, -width * 0.5]);
      const b = UT.VEC2_2D_TO_ISO([depth * 0.5, 0]);
      return { f, l, r, b };
    }

    if (direction == 'BACKWARD') {
      const f = UT.VEC2_2D_TO_ISO([depth * 0.5, 0]);
      const l = UT.VEC2_2D_TO_ISO([0, -width * 0.5]);
      const r = UT.VEC2_2D_TO_ISO([0, width * 0.5]);
      const b = UT.VEC2_2D_TO_ISO([-depth * 0.5, 0]);
      return { f, l, r, b };
    }

    if (direction == 'LEFT') {
      const f = UT.VEC2_2D_TO_ISO([0, depth * 0.5]);
      const l = UT.VEC2_2D_TO_ISO([-width * 0.5, 0]);
      const r = UT.VEC2_2D_TO_ISO([width * 0.5, 0]);
      const b = UT.VEC2_2D_TO_ISO([0, depth * 0.5]);
      return { f, l, r, b };
    }

    if (direction == 'RIGHT') {
      const f = UT.VEC2_2D_TO_ISO([0, -depth * 0.5]);
      const l = UT.VEC2_2D_TO_ISO([width * 0.5, 0]);
      const r = UT.VEC2_2D_TO_ISO([-width * 0.5, 0]);
      const b = UT.VEC2_2D_TO_ISO([0, depth * 0.5]);
      return { f, l, r, b };
    }

    return { f: [0, 0], l: [0, 0], r: [0, 0], b: [0, 0] };
  }

  /**
   * @param x - The first component.
   * @param y - The second component.
   * @param z - The third component.
   */
  static VEC3_CREATE(x: number = 0, y: number = 0, z: number = 0): Float32Array {
    const out = new Float32Array(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }

  /**
   * @param str - The string.
   * @param separator - The token separator between components.
   * @param out - The vector.
   */
  static VEC3_PARSE(str: string, separator: string = ' ', out: vec3 = [0, 0, 0]): vec3 {
    const a = str.split(separator);
    out[0] = parseFloat(a[0]);
    out[1] = parseFloat(a[1]);
    out[2] = parseFloat(a[2]);
    return out;
  }

  /**
   * @param src - The source vector.
   * @param out - The destination vector.
   */
  static VEC3_COPY(src: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = src[0];
    out[1] = src[1];
    out[2] = src[2];
    return out;
  }

  /**
   * @param a - The vector to check.
   */
  static VEC3_ISZERO(a: vec3): boolean {
    return Math.abs(a[0]) <= UT.EPSILON && Math.abs(a[1]) <= UT.EPSILON && Math.abs(a[2]) <= UT.EPSILON;
  }

  /**
   * @param base - The base vector.
   * @param spread - The spread vector.
   */
  static VEC3_SPREAD(base: vec3, spread: vec3): vec3 {
    const rand3 = UT.VEC3_CREATE(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    return UT.VEC3_ADD(base, UT.VEC3_MULTIPLY(spread, rand3));
  }

  /**
   * @param b - The begin.
   * @param e - The end.
   * @param t - The time.
   * @param d - The divide.
   */
  static VEC3_LERP(b: vec3, e: vec3, t: number, d: number = 1): vec3 {
    const c = UT.VEC3_SUBSTRACT(e, b);
    const p = t / d;
    return [b[0] + c[0] * p, b[1] + c[1] * p, b[2] + c[2] * p];
  }

  /**
   * @param center - The position you want to rotate around.
   * @param radius - The radius relative to the center of the rotation.
   * @param phi - The phi angle (horizontal).
   * @param theta - The theta angle (vertical).
   */
  static VEC3_ROTATE_AROUND(center: vec3, radius: number, phi: number, theta: number): vec3 {
    const r = Math.cos(theta) * radius;
    const y = Math.sin(theta) * radius;
    const z = Math.sin(phi) * r;
    const x = Math.cos(phi) * r;
    return [center[0] + x, center[1] + y, center[2] + z];
  }

  /**
   * @param a - The origin vector.
   * @param out - The opposite vector.
   */
  static VEC3_OPPOSITE(a: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
  }

  /**
   * @param a - The first point.
   * @param b - The second point.
   */
  static VEC3_DISTANCE(a: vec3, b: vec3): number {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    const z = b[2] - a[2];
    return Math.sqrt((x * x) + (y * y) + (z * z));
  }

  /**
   * @param a - The vector.
   */
  static VEC3_LENGTH(a: vec3): number {
    return Math.sqrt((a[0] * a[0]) + (a[1] * a[1]) + (a[2] * a[2]));
  }

  /**
   * @param a - The origin vector.
   * @param out - The normalized vector.
   */
  static VEC3_NORMALIZE(a: vec3, out: vec3 = [0, 0, 0]): vec3 {
    const len = UT.VEC3_LENGTH(a);
    if (len > 0) {
      out[0] = a[0] / len;
      out[1] = a[1] / len;
      out[2] = a[2] / len;
    }

    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   */
  static VEC3_DOT(a: vec3, b: vec3): number {
    return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The cross vector.
   */
  static VEC3_CROSS(a: vec3, b: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = (a[1] * b[2]) - (a[2] * b[1]);
    out[1] = (a[2] * b[0]) - (a[0] * b[2]);
    out[2] = (a[0] * b[1]) - (a[1] * b[0]);
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector.
   */
  static VEC3_ADD(a: vec3, b: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector.
   */
  static VEC3_SUBSTRACT(a: vec3, b: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector.
   */
  static VEC3_MULTIPLY(a: vec3, b: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
  }

  /**
   * @param a - The first vector.
   * @param scale - The scale value.
   * @param out - The result vector.
   */
  static VEC3_SCALE(a: vec3, scale: number, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = a[0] * scale;
    out[1] = a[1] * scale;
    out[2] = a[2] * scale;
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector to scale and add to the first.
   * @param scale - The scale value for second vector.
   * @param out - The result vector.
   */
  static VEC3_ADD_SCALED(a: vec3, b: vec3, scale: number, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    out[2] = a[2] + b[2] * scale;
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   */
  static VEC3_ANGLE_BETWEEN(a: vec3, b: vec3): number {
    return Math.acos(UT.VEC3_DOT(a, b) / (UT.VEC3_LENGTH(a) * UT.VEC3_LENGTH(b)));
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector with minimum values for each component pair.
   */
  static VEC3_MIN(a: vec3, b: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   * @param out - The result vector with maximum values for each component pair.
   */
  static VEC3_MAX(a: vec3, b: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
  }

  /**
   * @param value - The vector to clamp.
   * @param min - The min vector.
   * @param max - The max vector.
   */
  static VEC3_CLAMP(value: vec3, min: vec3, max: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = Math.max(min[0], Math.min(max[0], value[0]));
    out[1] = Math.max(min[1], Math.min(max[1], value[1]));
    out[2] = Math.max(min[2], Math.min(max[2], value[2]));
    return out;
  }

  /**
   * @param a - The vector to floor.
   */
  static VEC3_FLOOR(a: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    return out;
  }

  /**
   * @param a - The vector to ceil.
   */
  static VEC3_CEIL(a: vec3, out: vec3 = [0, 0, 0]): vec3 {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    return out;
  }

  /**
   * @param a - The first vector.
   * @param b - The second vector.
   */
  static VEC3_ISEQUAL(a: vec3, b: vec3): boolean {
    return a[0] == b[0] && a[1] == b[1] && a[2] == b[2];
  }

  /**
   * @param p0 - The start point.
   * @param p1 - The inter point.
   * @param p2 - The end point.
   * @param t - The time.
   * @param out - The result point.
   */
  static VEC3_QUADRATIC_BEZIER(p0: vec3, p1: vec3, p2: vec3, t: number, out: vec3 = [0, 0, 0]): vec3 {
    const pax = p0[0] + ((p1[0] - p0[0]) * t);
    const pay = p0[1] + ((p1[1] - p0[1]) * t);
    const paz = p0[2] + ((p1[2] - p0[2]) * t);

    const pbx = p1[0] + ((p2[0] - p1[0]) * t);
    const pby = p1[1] + ((p2[1] - p1[1]) * t);
    const pbz = p1[2] + ((p2[2] - p1[2]) * t);

    out[0] = pax + ((pbx - pax) * t);
    out[1] = pay + ((pby - pay) * t);
    out[2] = paz + ((pbz - paz) * t);
    return out;
  }

  /**
   * @param a - The vector to transform.
   * @param q - The quaternion filter.
   */
  static VEC3_APPLY_QUATERNION(a: vec3, q: Quaternion): vec3 {
    return q.rotateVector(a);
  }

  /**
   * @param x - The first component.
   * @param y - The second component.
   * @param z - The third component.
   * @param w - The fourth component.
   */
  static VEC4_CREATE(x: number = 0, y: number = 0, z: number = 0, w: number = 0): Float32Array {
    const out = new Float32Array(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }

  /**
   * @param str - The string.
   * @param separator - The token separator between components.
   * @param out - The vector.
   */
  static VEC4_PARSE(str: string, separator: string = ' ', out: vec4 = [0, 0, 0, 0]): vec4 {
    const a = str.split(separator);
    out[0] = parseFloat(a[0]);
    out[1] = parseFloat(a[1]);
    out[2] = parseFloat(a[2]);
    out[3] = 1.0;
    return out;
  }

  /**
   * @param src - The source vector.
   * @param out - The destination vector.
   */
  static VEC4_COPY(src: vec4, out: vec4 = [0, 0, 0, 0]): vec4 {
    out[0] = src[0];
    out[1] = src[1];
    out[2] = src[2];
    out[3] = src[3];
    return out;
  }

  /**
   * @param a - The vector to check.
   */
  static VEC4_ISZERO(a: vec4): boolean {
    return Math.abs(a[0]) <= UT.EPSILON && Math.abs(a[1]) <= UT.EPSILON && Math.abs(a[2]) <= UT.EPSILON && Math.abs(a[3]) <= UT.EPSILON;
  }

  static MAT3_CREATE(): Float32Array {
    const out = new Float32Array(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }

  /**
   * @param src - The source matrix.
   * @param out - The destination matrix.
   */
  static MAT3_COPY(src: mat3, out: mat3): mat3 {
    out[0] = src[0];
    out[1] = src[1];
    out[2] = src[2];
    out[3] = src[3];
    out[4] = src[4];
    out[5] = src[5];
    out[6] = src[6];
    out[7] = src[7];
    out[8] = src[8];
    return out;
  }

  /**
   * @param a - The matrix.
   * @param v - The vector.
   * @param out - The result transformed vector.
   */
  static MAT3_MULTIPLY_BY_VEC3(a: mat3, v: vec3, out: vec3 = [0, 0, 0]): vec3 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];
    const v00 = v[0];
    const v01 = v[1];
    const v02 = v[2];

    out[0] = v00 * a00 + v01 * a10 + v02 * a20;
    out[1] = v00 * a01 + v01 * a11 + v02 * a21;
    out[2] = v00 * a02 + v01 * a12 + v02 * a22;
    return out;
  }

  /**
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @param out - The result matrix.
   */
  static MAT3_MULTIPLY(a: mat3, b: mat3, out: mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): mat3 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];
    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b10 = b[3];
    const b11 = b[4];
    const b12 = b[5];
    const b20 = b[6];
    const b21 = b[7];
    const b22 = b[8];

    const c00 = b00 * a00 + b01 * a10 + b02 * a20;
    const c01 = b00 * a01 + b01 * a11 + b02 * a21;
    const c02 = b00 * a02 + b01 * a12 + b02 * a22;

    const c10 = b10 * a00 + b11 * a10 + b12 * a20;
    const c11 = b10 * a01 + b11 * a11 + b12 * a21;
    const c12 = b10 * a02 + b11 * a12 + b12 * a22;

    const c20 = b20 * a00 + b21 * a10 + b22 * a20;
    const c21 = b20 * a01 + b21 * a11 + b22 * a21;
    const c22 = b20 * a02 + b21 * a12 + b22 * a22;

    out[0] = c00;
    out[1] = c01;
    out[2] = c02;
    out[3] = c10;
    out[4] = c11;
    out[5] = c12;
    out[6] = c20;
    out[7] = c21;
    out[8] = c22;
    return out;
  }

  /**
   * @param a - The matrix.
   * @param out - The inverted matrix.
   */
  static MAT3_INVERT(a: mat3, out: mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): mat3 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) {
      throw new Error('UT::MAT4_INVERT(): det is invalid !');
    }

    det = 1.0 / det;

    const c00 = b01 * det;
    const c01 = (-a22 * a01 + a02 * a21) * det;
    const c02 = (a12 * a01 - a02 * a11) * det;

    const c10 = b11 * det;
    const c11 = (a22 * a00 - a02 * a20) * det;
    const c12 = (-a12 * a00 + a02 * a10) * det;

    const c20 = b21 * det;
    const c21 = (-a21 * a00 + a01 * a20) * det;
    const c22 = (a11 * a00 - a01 * a10) * det;

    out[0] = c00;
    out[1] = c01;
    out[2] = c02;
    out[3] = c10;
    out[4] = c11;
    out[5] = c12;
    out[6] = c20;
    out[7] = c21;
    out[8] = c22;
    return out;
  }

  /**
   * @param out - The identity matrix.
   */
  static MAT3_IDENTITY(out: mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): mat3 {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }

  /**
   * @param x - The x-scale.
   * @param y - The y-scale.
   * @param out - The result matrix.
   */
  static MAT3_SCALE(x: number, y: number, out: mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): mat3 {
    out[0] = x;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = y;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }

  /**
   * @param a - The angle.
   * @param out - The result matrix.
   */
  static MAT3_ROTATE(a: number, out: mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): mat3 {
    const c = Math.cos(a);
    const s = Math.sin(a);
    out[0] = c;
    out[1] = -s;
    out[2] = 0;
    out[3] = s;
    out[4] = c;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }

  /**
   * @param x - The x-translation.
   * @param y - The y-translation.
   * @param out - The result matrix.
   */
  static MAT3_TRANSLATE(x: number, y: number, out: mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): mat3 {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = x;
    out[7] = y;
    out[8] = 1;
    return out;
  }

  /**
   * @param position - The position vector.
   * @param offset - The offset translation.
   * @param rotation - The rotation angle.
   * @param scale - The scale vector.
   * @param out - The result matrix.
   */
  static MAT3_TRANSFORM(position: vec2, offset: vec2, rotation: number, scale: vec2, out: mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): mat3 {
    UT.MAT3_TRANSLATE(position[0], position[1], out);
    UT.MAT3_MULTIPLY(out, UT.MAT3_ROTATE(rotation), out);
    UT.MAT3_MULTIPLY(out, UT.MAT3_SCALE(scale[0], scale[1]), out);
    UT.MAT3_MULTIPLY(out, UT.MAT3_TRANSLATE(-offset[0], -offset[1]), out);
    return out;
  }

  /**
   * @param w - The width;
   * @param h - The height;
   * @param out - The result matrix.
   */
  static MAT3_PROJECTION(w: number, h: number, out: mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): mat3 {
    out[0] = 2 / w;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 2 / h;
    out[5] = 0;
    out[6] = -1;
    out[7] = -1;
    out[8] = 1;
    return out;
  }

  static MAT4_CREATE(): Float32Array {
    const out = new Float32Array(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * @param src - The source matrix.
   * @param out - The destination matrix.
   */
  static MAT4_COPY(src: mat4, out: mat4): mat4 {
    out[0] = src[0];
    out[1] = src[1];
    out[2] = src[2];
    out[3] = src[3];
    out[4] = src[4];
    out[5] = src[5];
    out[6] = src[6];
    out[7] = src[7];
    out[8] = src[8];
    out[9] = src[9];
    out[10] = src[10];
    out[11] = src[11];
    out[12] = src[12];
    out[13] = src[13];
    out[14] = src[14];
    out[15] = src[15];
    return out;
  }

  /**
   * @param a - The matrix.
   * @param v - The vector.
   * @param out - The result vector.
   */
  static MAT4_MULTIPLY_BY_VEC4(a: mat4, v: vec4, out: vec4 = [0, 0, 0, 0]): vec4 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
    const v00 = v[0];
    const v01 = v[1];
    const v02 = v[2];
    const v03 = v[3];

    out[0] = v00 * a00 + v01 * a10 + v02 * a20 + v03 * a30;
    out[1] = v00 * a01 + v01 * a11 + v02 * a21 + v03 * a31;
    out[2] = v00 * a02 + v01 * a12 + v02 * a22 + v03 * a32;
    out[3] = v00 * a03 + v01 * a13 + v02 * a23 + v03 * a33;
    return out;
  }

  /**
   * @param a - The matrix.
   * @param v - The vector.
   * @param out - The result vector.
   */
  static MAT4_MULTIPLY_BY_VEC3(a: mat4, v: vec3, out: vec3 = [0, 0, 0]): vec3 {
    const x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[1] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[2] = a[2] * x + a[6] * y + a[10] * z + a[14];

    return out;
  }

  /**
   * Multiply in column-major.
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @param out - The result matrix.
   */
  static MAT4_MULTIPLY(a: mat4, b: mat4, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b03 = b[3];
    const b10 = b[4];
    const b11 = b[5];
    const b12 = b[6];
    const b13 = b[7];
    const b20 = b[8];
    const b21 = b[9];
    const b22 = b[10];
    const b23 = b[11];
    const b30 = b[12];
    const b31 = b[13];
    const b32 = b[14];
    const b33 = b[15];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
    out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
    out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
    out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
    out[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
    out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
    out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
    out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
    out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
    out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
    out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
    out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
    out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
    return out;
  }

  /**
   * @param matrices - The list of matrix to multiply.
   */
  static MAT4_COMPUTE(...matrices: Array<mat4>): mat4 {
    for (let i = 0; i < matrices.length - 1; i++) {
      matrices[i + 1] = UT.MAT4_MULTIPLY(matrices[i], matrices[i + 1]);
    }

    return matrices[matrices.length - 1];
  }

  /**
   * @param a - The origin matrix.
   * @param out - The inverted matrix.
   */
  static MAT4_INVERT(a: mat4, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      throw new Error('UT::MAT4_INVERT(): det is invalid !');
    }

    det = 1.0 / det;

    const c00 = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    const c01 = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    const c02 = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    const c03 = (a22 * b04 - a21 * b05 - a23 * b03) * det;

    const c10 = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    const c11 = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    const c12 = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    const c13 = (a20 * b05 - a22 * b02 + a23 * b01) * det;

    const c20 = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    const c21 = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    const c22 = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    const c23 = (a21 * b02 - a20 * b04 - a23 * b00) * det;

    const c30 = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    const c31 = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    const c32 = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    const c33 = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    out[0] = c00;
    out[1] = c01;
    out[2] = c02;
    out[3] = c03;
    out[4] = c10;
    out[5] = c11;
    out[6] = c12;
    out[7] = c13;
    out[8] = c20;
    out[9] = c21;
    out[10] = c22;
    out[11] = c23;
    out[12] = c30;
    out[13] = c31;
    out[14] = c32;
    out[15] = c33;
    return out;
  }

  /**
   * @param out - The matrix identity.
   */
  static MAT4_IDENTITY(out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * @param x - The x-scale.
   * @param y - The y-scale.
   * @param z - The z-scale.
   * @param out - The result matrix.
   */
  static MAT4_SCALE(x: number, y: number, z: number, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    out[0] = x;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = y;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = z;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * @param a - The x-angle.
   * @param out - The result matrix.
   */
  static MAT4_ROTATE_X(a: number, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    const c = Math.cos(a);
    const s = Math.sin(a);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = -s;
    out[7] = 0;
    out[8] = 0;
    out[9] = s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * @param a - The y-angle.
   * @param out - The result matrix.
   */
  static MAT4_ROTATE_Y(a: number, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    const c = Math.cos(a);
    const s = Math.sin(a);
    out[0] = c;
    out[1] = 0;
    out[2] = s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = -s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * @param a - The z-angle.
   * @param out - The result matrix.
   */
  static MAT4_ROTATE_Z(a: number, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    const c = Math.cos(a);
    const s = Math.sin(a);
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * @param x - The x-translation.
   * @param y - The y-translation.
   * @param z - The z-translation.
   * @param out - The result matrix.
   */
  static MAT4_TRANSLATE(x: number, y: number, z: number, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = x;
    out[13] = y;
    out[14] = z;
    out[15] = 1;
    return out;
  }

  /**
   * @param position - The position vector.
   * @param rotation - The rotation vector (y -> x -> z).
   * @param scale - The scale vector.
   * @param quaternion - The rotation quaternion.
   * @param out - The result matrix.
   */
  static MAT4_TRANSFORM(position: vec3, rotation: vec3, scale: vec3, quaternion: Quaternion, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    UT.MAT4_TRANSLATE(position[0], position[1], position[2], out);
    UT.MAT4_MULTIPLY(out, quaternion.toMatrix4(), out);
    UT.MAT4_MULTIPLY(out, UT.MAT4_ROTATE_Y(rotation[1]), out);
    UT.MAT4_MULTIPLY(out, UT.MAT4_ROTATE_X(rotation[0]), out); // y -> x -> z
    UT.MAT4_MULTIPLY(out, UT.MAT4_ROTATE_Z(rotation[2]), out);
    UT.MAT4_MULTIPLY(out, UT.MAT4_SCALE(scale[0], scale[1], scale[2]), out);
    return out;
  }

  /**
   * @param width - The width.
   * @param height - The height.
   * @param depth - The depth.
   * @param out - The result matrix.
   */
  static MAT4_ORTHOGRAPHIC(width: number, height: number, depth: number, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 { // @todo: add width & height
    out[0] = 2 / width;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 2 / height;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = -2 / depth;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * @param left - The left limit.
   * @param right - The right limit.
   * @param bottom - The bottom limit.
   * @param top - The top limit.
   * @param near - The near limit.
   * @param far - The far limit.
   * @param out - The result matrix.
   */
  static MAT4_ORTHO(left: number, right: number, bottom: number, top: number, near: number, far: number, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    out[0] = 2 / (right - left);
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 2 / (top - bottom);
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 / (near - far);
    out[11] = 0;
    out[12] = (left + right) / (left - right);
    out[13] = (bottom + top) / (bottom - top);
    out[14] = (near + far) / (near - far);
    out[15] = 1;
    return out;
  }

  /**
   * @param fov - The fovy angle.
   * @param ar - The aspect-ratio.
   * @param near - The near value.
   * @param far - The far value.
   * @param out - The result matrix.
   */
  static MAT4_PERSPECTIVE(fov: number, ar: number, near: number, far: number, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    out[0] = (1 / (Math.tan(fov / 2) * ar));
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1 / Math.tan(fov / 2);
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (near + far) / (near - far);
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) / (near - far);
    out[15] = 0;
    return out;
  }

  /**
   * @param position - The position.
   * @param target - The target.
   * @param vertical - The up vector.
   * @param out - The result matrix.
   */
  static MAT4_LOOKAT(position: vec3, target: vec3, vertical: vec3 = UT.VEC3_UP, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    const axeZ = UT.VEC3_NORMALIZE(UT.VEC3_SUBSTRACT(position, target));
    vertical = UT.VEC3_NORMALIZE(vertical);

    if (Math.abs(UT.VEC3_DOT(axeZ, vertical)) > 1 - UT.EPSILON) {
      const arbitraryVec: vec3 = Math.abs(axeZ[1]) < 1 - UT.EPSILON ? [0, 1, 0] : [1, 0, 0];
      vertical = UT.VEC3_NORMALIZE(UT.VEC3_CROSS(arbitraryVec, axeZ));
    }

    const axeX = UT.VEC3_NORMALIZE(UT.VEC3_CROSS(vertical, axeZ));
    const axeY = UT.VEC3_NORMALIZE(UT.VEC3_CROSS(axeZ, axeX));
    out[0] = axeX[0];
    out[1] = axeX[1];
    out[2] = axeX[2];
    out[3] = 0;
    out[4] = axeY[0];
    out[5] = axeY[1];
    out[6] = axeY[2];
    out[7] = 0;
    out[8] = axeZ[0];
    out[9] = axeZ[1];
    out[10] = axeZ[2];
    out[11] = 0;
    out[12] = position[0];
    out[13] = position[1];
    out[14] = position[2];
    out[15] = 1;
    return out;
  }

  /**
   * @param a - The source matrix.
   * @param out - The transposed matrix.
   */
  static MAT4_TRANSPOSE(a: mat4, out: mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]): mat4 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
    out[0] = a00;
    out[1] = a10;
    out[2] = a20;
    out[3] = a30;
    out[4] = a01;
    out[5] = a11;
    out[6] = a21;
    out[7] = a31;
    out[8] = a02;
    out[9] = a12;
    out[10] = a22;
    out[11] = a32;
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
    out[15] = a33;
    return out;
  }

  /**
   * @param t - The time.
   * @param b - The begin.
   * @param e - The end.
   * @param d - The divide.
   */
  static LINEAR(t: number, b: number, e: number, d: number = 1): number {
    return b + (e - b) * t / d;
  }

  /**
   * @param t - The time.
   * @param b - The begin.
   * @param e - The end.
   * @param d - The divide.
   */
  static EASE_IN_QUAD(t: number, b: number, e: number, d: number = 1): number {
    return (e - b) * (t /= d) * t + b;
  }

  /**
   * @param t - The time.
   * @param b - The begin.
   * @param e - The end.
   * @param d - The divide.
   */
  static EASE_OUT_QUAD(t: number, b: number, e: number, d: number = 1): number {
    const c = e - b;
    return -c * (t /= d) * (t - 2) + b;
  }

  /**
   * @param t - The time.
   * @param b - The begin.
   * @param e - The end.
   * @param d - The divide.
   */
  static EASE_IN_OUT_QUAD(t: number, b: number, e: number, d: number = 1): number {
    const c = e - b;
    if ((t /= d / 2) < 1) return c / 2 * t * t + b;
    return -c / 2 * ((--t) * (t - 2) - 1) + b;
  }

  /**
   * @param value - The value to map.
   * @param curve - The curve.
   * @param interpolateFn - The interpolate function.
   */
  static MAP_VALUE_FROM_CURVE(value: number, curve: Array<CurveMapItem>, interpolateFn = UT.LINEAR) {
    for (let c of curve) {
      if (value >= c.valueMin && value <= c.valueMax) {
        return interpolateFn(value - c.valueMin, c.mapBegin, c.mapEnd, c.valueMax - c.valueMin);
      }
    }

    return Infinity;
  }
}

export { UT };