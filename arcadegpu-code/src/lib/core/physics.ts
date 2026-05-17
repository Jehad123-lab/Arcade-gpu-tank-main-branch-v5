import { UT } from './utils';

class PH {
  // ------------------------------------------------------------------------------------
  // BOX
  // ------------------------------------------------------------------------------------

  /**
   * @param min1 - The min of box 1.
   * @param max1 - The max of box 1.
   * @param min2 - The min of box 2.
   * @param max2 - The max of box 2.
   */
  static BOXES_COLLIDE(min1: vec3, max1: vec3, min2: vec3, max2: vec3): boolean {
    return (
      (min1[0] <= max2[0] && max1[0] >= min2[0]) &&
      (min1[1] <= max2[1] && max1[1] >= min2[1]) &&
      (min1[2] <= max2[2] && max1[2] >= min2[2])
    );
  }

  /**
   * @param min - The min point of box.
   * @param max - The max point of box.
   * @param p - The point.
   */
  static BOX_POINT_COLLIDE(min: vec3, max: vec3, p: vec3): boolean {
    return (
      (p[0] >= min[0] && p[0] <= max[0]) &&
      (p[1] >= min[1] && p[1] <= max[1]) &&
      (p[2] >= min[2] && p[2] <= max[2])
    );
  }

  /**
   * @param min - The min corner of the box.
   * @param max - The max corner of the box.
   * @param c - The bottom-center of the cylinder.
   * @param r - The radius of the cylinder.
   * @param h - The height of the cylinder.
   */
  static BOX_CYLINDER_COLLIDE(min: vec3, max: vec3, c: vec3, r: number, h: number): boolean {
    const cylMin = c[1];
    const cylMax = c[1] + h;

    if (!(cylMin <= max[1] && cylMax >= min[1])) {
      return false;
    }

    const closestX = UT.CLAMP(c[0], min[0], max[0]);
    const closestZ = UT.CLAMP(c[2], min[2], max[2]);

    const dx = c[0] - closestX;
    const dz = c[2] - closestZ;
    const distSq = dx * dx + dz * dz;
    return distSq <= r * r;
  }

  // ------------------------------------------------------------------------------------
  // CYLINDER
  // ------------------------------------------------------------------------------------

  /**
   * @param c1 - The bottom-center of cylinder 1.
   * @param r1 - The radius of cylinder 1.
   * @param h1 - The height of cylinder 1.
   * @param c2 - The bottom-center of cylinder 2.
   * @param r2 - The radius of cylinder 2.
   * @param h2 - The height of cylinder 2.
   * @param outVelocity - The out elastic collision velocity.
   */
  static CYLINDERS_COLLIDE(c1: vec3, r1: number, h1: number, c2: vec3, r2: number, h2: number, outVelocity: vec2 = [0, 0]): boolean {
    const isCollide = PH.CIRCLES_COLLIDE([c1[0], c1[2]], r1, [c2[0], c2[2]], r2, outVelocity);
    if (!isCollide) {
      return false;
    }

    const min1 = c1[1];
    const max1 = c1[1] + h1;
    const min2 = c2[1];
    const max2 = c2[1] + h2;
    return min1 <= max2 && max1 >= min2;
  }

  /**
   * @param c - The bottom-center of cylinder.
   * @param h - The height of cylinder.
   * @param r - The radius of cylinder.
   * @param p - The point.
   */
  static CYLINDER_POINT_COLLIDE(c: vec3, h: number, r: number, p: vec3): boolean {
    const delta = UT.VEC2_SUBSTRACT([p[0], p[2]], [c[0], c[2]]);
    const distance = UT.VEC2_LENGTH(delta);
    if (distance > r) {
      return false;
    }

    return p[1] >= c[1] && p[1] <= c[1] + h;
  }

  /**
   * @param c - The bottom-center of the cylinder.
   * @param r - The radius of the cylinder.
   * @param h - The height of the cylinder.
   * @param min - The min corner of the box.
   * @param max - The max corner of the box.
   */
  static CYLINDER_BOX_COLLIDE(c: vec3, r: number, h: number, min: vec3, max: vec3): boolean {
    return PH.BOX_CYLINDER_COLLIDE(min, max, c, r, h);
  }

  // ------------------------------------------------------------------------------------
  // TRIANGLE 3D
  // ------------------------------------------------------------------------------------

  /**
   * @param a - The first triangle point.
   * @param b - The second triangle point.
   * @param c - The third triangle point.
   * @param out - The normal vector.
   */
  static TRI3_NORMAL(a: vec3, b: vec3, c: vec3, out: vec3 = [0, 0, 0]): vec3 {
    const ab = UT.VEC3_SUBSTRACT(b, a);
    const ac = UT.VEC3_SUBSTRACT(c, a);
    return UT.VEC3_CROSS(ab, ac, out);
  }

  /**
   * @param p - The point.
   * @param a - The first triangle point.
   * @param b - The second triangle point.
   * @param c - The third triangle point.
   * @param n - The normal vector.
   */
  static TRI3_POINT_INSIDE(p: vec3, a: vec3, b: vec3, c: vec3): boolean {
    const v0 = UT.VEC3_SUBSTRACT(c, a);
    const v1 = UT.VEC3_SUBSTRACT(b, a);
    const v2 = UT.VEC3_SUBSTRACT(p, a);

    const dot00 = UT.VEC3_DOT(v0, v0);
    const dot01 = UT.VEC3_DOT(v0, v1);
    const dot02 = UT.VEC3_DOT(v0, v2);
    const dot11 = UT.VEC3_DOT(v1, v1);
    const dot12 = UT.VEC3_DOT(v1, v2);

    // Compute barycentric coordinates
    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    // Check if point is in triangle
    return (u >= 0) && (v >= 0) && (u + v < 1);
  }

  /**
   * @param p - The point.
   * @param a - The first triangle point.
   * @param b - The second triangle point.
   * @param c - The third triangle point.
   */
  static TRI3_POINT_ELEVATION(p: vec2, a: vec3, b: vec3, c: vec3): number {
    const ab = UT.VEC3_CREATE(b[0] - a[0], 0, b[2] - a[2]);
    const ca = UT.VEC3_CREATE(a[0] - c[0], 0, a[2] - c[2]);
    const ap = UT.VEC3_CREATE(p[0] - a[0], 0, p[1] - a[2]);
    const bp = UT.VEC3_CREATE(p[0] - b[0], 0, p[1] - b[2]);
    const cp = UT.VEC3_CREATE(p[0] - c[0], 0, p[1] - c[2]);

    const area = UT.VEC3_LENGTH(UT.VEC3_CROSS(ab, ca));
    const wa = UT.VEC3_LENGTH(UT.VEC3_CROSS(bp, cp)) / area;
    const wb = UT.VEC3_LENGTH(UT.VEC3_CROSS(ap, cp)) / area;
    const wc = UT.VEC3_LENGTH(UT.VEC3_CROSS(ap, bp)) / area;
    if (wa + wb + wc > 1 + UT.BIG_EPSILON) {
      return Infinity;
    }

    // We determine the 'y' coordinate using the weights found previously.
    // This is possible because: wa*HA + wb*HB = 0 and wa+wb*GH + wc*GC = 0.
    const vert = a[1] + ((b[1] - a[1]) * (wb / (wa + wb)));
    const elev = vert + ((c[1] - vert) * (wc / (wa + wb + wc)));
    return elev;
  }

  // ------------------------------------------------------------------------------------
  // RAY 3D
  // ------------------------------------------------------------------------------------

  /**
   * @param origin - The origin ray.
   * @param dir - The direction ray.
   * @param a - The first triangle point.
   * @param b - The second triangle point.
   * @param c - The third triangle point.
   * @param culling - Culling enabled flag.
   * @param outIntersectPoint - The intersection point.
   */
  static RAY_TRIANGLE(origin: vec3, dir: vec3, a: vec3, b: vec3, c: vec3, culling: boolean = false, outIntersectPoint: vec3 = [0, 0, 0]): boolean {
    const n = PH.TRI3_NORMAL(a, b, c);
    if (!PH.RAY_PLAN(origin, dir, a, n, culling, outIntersectPoint)) {
      return false;
    }

    return PH.TRI3_POINT_INSIDE(outIntersectPoint, a, b, c);
  }

  /**
   * @param origin - The origin ray.
   * @param dir - The direction ray.
   * @param a - The plan corner.
   * @param n - The plan normal.
   * @param culling - Culling enabled flag.
   * @param outIntersectPoint - The intersection point.
   */
  static RAY_PLAN(origin: vec3, dir: vec3, a: vec3, n: vec3, culling: boolean, outIntersectPoint: vec3 = [0, 0, 0]): boolean {
    const s = UT.VEC3_DOT(dir, n);
    if (culling && s >= 0) {
      return false;
    }

    if (s > -UT.EPSILON && s < UT.EPSILON) {
      return false;
    }

    const d = UT.VEC3_DOT(n, a) * -1;
    const l = UT.VEC3_DOT(n, origin) * -1;
    const t = (l - d) / s;

    if (t < 0) {
      return false;
    }

    outIntersectPoint[0] = origin[0] + (dir[0] * t);
    outIntersectPoint[1] = origin[1] + (dir[1] * t);
    outIntersectPoint[2] = origin[2] + (dir[2] * t);
    return true;
  }

  /**
   * @param origin - The origin ray.
   * @param dir - The direction ray.
   * @param min - The min box.
   * @param max - The max box.
   * @param outIntersectPoint - The intersection point.
   */
  static RAY_BOX(origin: vec3, dir: vec3, min: vec3, max: vec3, outIntersectPoint: vec3 = [0, 0, 0]): boolean {
    for (let i = 0; i < 3; i++) {
      if (origin[i] < min[i]) {
        const t = (min[i] - origin[i]) / (dir[i]);
        const x = origin[0] + dir[0] * t;
        const y = origin[1] + dir[1] * t;
        const z = origin[2] + dir[2] * t;
        if (x >= min[0] && x <= max[0] && y >= min[1] && y <= max[1] && z >= min[2] && z <= max[2]) {
          outIntersectPoint[0] = x;
          outIntersectPoint[1] = y;
          outIntersectPoint[2] = z;
          return true;
        }
      }
      else if (origin[i] > max[i]) {
        const t = (max[i] - origin[i]) / (dir[i]);
        const x = origin[0] + (dir[0] * t);
        const y = origin[1] + (dir[1] * t);
        const z = origin[2] + (dir[2] * t);
        if (x >= min[0] && x <= max[0] && y >= min[1] && y <= max[1] && z >= min[2] && z <= max[2]) {
          outIntersectPoint[0] = x;
          outIntersectPoint[1] = y;
          outIntersectPoint[2] = z;
          return true;
        }
      }
    }

    return false;
  }

  // ------------------------------------------------------------------------------------
  // RECT
  // ------------------------------------------------------------------------------------

  /**
   * @param min1 - The min rect 1.
   * @param max1 - The max rect 1.
   * @param min2 - The min rect 2.
   * @param max2 - The max rect 2.
   */
  static RECTS_COLLIDE(min1: vec2, max1: vec2, min2: vec2, max2: vec2): boolean {
    return (
      (min1[0] <= max2[0] && max1[0] >= min2[0]) &&
      (min1[1] <= max2[1] && max1[1] >= min2[1])
    );
  }

  /**
   * @param min - The min of rect.
   * @param max - The max of rect.
   * @param p - The point.
   */
  static RECT_POINT_COLLIDE(min: vec2, max: vec2, p: vec2): boolean {
    return (
      (p[0] >= min[0] && p[0] <= max[0]) &&
      (p[1] >= min[1] && p[1] <= max[1])
    );
  }

  /**
   * @param min - The min point of the rect.
   * @param max - The max point of the rect.
   * @param c    - The circle center.
   * @param r    - The circle radius.
   */
  static RECT_CIRCLE_COLLIDE(min: vec2, max: vec2, c: vec2, r: number): boolean {
    const closestX = UT.CLAMP(c[0], min[0], max[0]);
    const closestY = UT.CLAMP(c[1], min[1], max[1]);
    const dx = c[0] - closestX;
    const dy = c[1] - closestY;
    return (dx * dx + dy * dy) <= (r * r);
  }

  // ------------------------------------------------------------------------------------
  // CIRCLE
  // ------------------------------------------------------------------------------------

  /**
   * @param c1 - center of circle 1.
   * @param r1 - radius of circle 1.
   * @param c2 - center of circle 2.
   * @param r2 - radius of circle 2.
   * @param outVelocity - The out elastic collision velocity.
   */
  static CIRCLES_COLLIDE(c1: vec2, r1: number, c2: vec2, r2: number, outVelocity: vec2 = [0, 0]): boolean {
    const delta = UT.VEC2_SUBSTRACT(c1, c2);
    const distance = UT.VEC2_LENGTH(delta);
    const distanceMin = r1 + r2;

    if (distance > distanceMin) {
      return false;
    }

    const c = Math.PI * 2 - (Math.PI * 2 - Math.atan2(delta[1], delta[0]));
    // const c = Math.atan2(delta[1], delta[0]);
    outVelocity[0] = Math.cos(c) * (distanceMin - distance);
    outVelocity[1] = Math.sin(c) * (distanceMin - distance);
    return true;
  }

  /**
   * @param c - center of circle 1.
   * @param r - radius of circle 1.
   * @param p - The point.
   */
  static CIRCLE_POINT_COLLIDE(c: vec2, r: number, p: vec2 = [0, 0]): boolean {
    const distance = UT.VEC2_DISTANCE(c, p);
    return distance <= r;
  }

  /**
   * @param c   - The circle center.
   * @param r   - The circle radius.
   * @param min - The min point of the rect.
   * @param max - The max point of the rect.
   */
  static CIRCLE_RECT_COLLIDE(c: vec2, r: number, min: vec2, max: vec2): boolean {
    return PH.RECT_CIRCLE_COLLIDE(min, max, c, r)
  }

  // ------------------------------------------------------------------------------------
  // LINE
  // ------------------------------------------------------------------------------------

  /**
   * @param p1 - The start line 1.
   * @param q1 - The end line 1.
   * @param p2 - The start line 2.
   * @param q2 - The end line 2.
   */
  static LINES_COLLIDE(p1: vec2, q1: vec2, p2: vec2, q2: vec2): boolean {
    let o1 = UT.VEC2_ORIENTATION(p1, q1, p2);
    let o2 = UT.VEC2_ORIENTATION(p1, q1, q2);
    let o3 = UT.VEC2_ORIENTATION(p2, q2, p1);
    let o4 = UT.VEC2_ORIENTATION(p2, q2, q1);
    return o1 != o2 && o3 != o4;
  }

  /**
   * @param {number} l - The left side of rectangle.
   * @param {number} r - The right side of rectangle.
   * @param {number} t - The top side of rectangle.
   * @param {number} b - The bottom side of rectangle.
   */
  static LINES_FROM_RECT(l : number, t: number, r: number, b: number): { l: [vec2, vec2], t: [vec2, vec2], r: [vec2, vec2], b: [vec2, vec2] } {
    return {
      t: [[l, t], [r, t]],
      r: [[r, t], [r, b]],
      b: [[r, b], [l, b]],
      l: [[l, b], [l, t]] 
    }
  }

  // ------------------------------------------------------------------------------------
  // TRIANGLE 2D
  // ------------------------------------------------------------------------------------

  /**
   * @param p - The point.
   * @param a - The first triangle point.
   * @param b - The second triangle point.
   * @param c - The third triangle point.
   */
  static TRI2_POINT_INSIDE(p: vec2, a: vec2, b: vec2, c: vec2): number {
    const ab = UT.VEC2_SUBSTRACT(b, a);
    const bc = UT.VEC2_SUBSTRACT(c, b);
    const ca = UT.VEC2_SUBSTRACT(a, c);
    const ap = UT.VEC2_SUBSTRACT(p, a);
    const bp = UT.VEC2_SUBSTRACT(p, b);
    const cp = UT.VEC2_SUBSTRACT(p, c);

    const crossAPAB = UT.VEC2_CROSS(ap, ab);
    if (crossAPAB < -UT.EPSILON) {
      return -1;
    }

    const crossBPBC = UT.VEC2_CROSS(bp, bc);
    if (crossBPBC < -UT.EPSILON) {
      return -2;
    }

    const crossCPCA = UT.VEC2_CROSS(cp, ca);
    if (crossCPCA < -UT.EPSILON) {
      return -3;
    }

    return 1;
  }
}

export { PH };