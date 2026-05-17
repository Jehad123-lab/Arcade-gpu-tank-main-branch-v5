import { UT } from '../core/utils';
import { PH } from '../core/physics';
import { Gfx3BoundingBox } from './gfx3_bounding_box';

/**
 * A 3D bounding cylinder.
 */
class Gfx3BoundingCylinder {
  position: vec3;
  height: number;
  radius: number;

  /**
   * @param {vec3} position - The bottom-center position.
   * @param {number} height - The height.
   * @param {number} radius - The radius.
   */
  constructor(position: vec3 = [0, 0, 0], height: number = 1, radius: number = 1) {
    this.position = position;
    this.height = height;
    this.radius = radius;
  }

  /**
   * Creates a new instance from center and size.
   * 
   * @param {number} x - The cylinder center.
   * @param {number} y - The cylinder center.
   * @param {number} z - The cylinder center.
   * @param {number} h - The height.
   * @param {number} r - The radius.
   */
  static createFromCenter(x: number, y: number, z: number, h: number, r: number): Gfx3BoundingCylinder {
    const cylinder = new Gfx3BoundingCylinder();
    cylinder.position = [x, y - (h * 0.5), z];
    cylinder.height = h;
    cylinder.radius = r;
    return cylinder;
  }

  /**
   * Creates a new instance from bounding box.
   * 
   * @param {Gfx3BoundingBox} aabb - The bounding box.
   */
  static createFromBoundingBox(aabb: Gfx3BoundingBox): Gfx3BoundingCylinder {
    const cylinder = new Gfx3BoundingCylinder();
    const center = aabb.getCenter();
    cylinder.position = [center[0], aabb.min[1], center[2]];
    cylinder.height = aabb.getHeight();
    cylinder.radius = aabb.getRadius();
    return cylinder;
  }

  /**
   * Merge and returns the union of multiple cylinders.
   * 
   * @param {Array<Gfx3BoundingCylinder>} cylinders - The list of cylinders.
   */
  static merge(cylinders: Array<Gfx3BoundingCylinder>): Gfx3BoundingCylinder {
    let minY = cylinders[0].position[1];
    let maxY = cylinders[0].position[1] + cylinders[0].height;
    const xs: number[] = [];
    const zs: number[] = [];

    for (const cyl of cylinders) {
      minY = Math.min(minY, cyl.position[1]);
      maxY = Math.max(maxY, cyl.position[1] + cyl.height);
      xs.push(cyl.position[0]);
      zs.push(cyl.position[2]);
    }

    const centerX = (Math.min(...xs) + Math.max(...xs)) * 0.5;
    const centerZ = (Math.min(...zs) + Math.max(...zs)) * 0.5;

    let maxRadius = 0;
    for (const cyl of cylinders) {
      const dx = cyl.position[0] - centerX;
      const dz = cyl.position[2] - centerZ;
      maxRadius = Math.max(maxRadius, Math.sqrt(dx * dx + dz * dz) + cyl.radius);
    }

    const height = maxY - minY;
    return new Gfx3BoundingCylinder([centerX, minY, centerZ], height, maxRadius);
  }

  /**
   * Change position and size of the cylinder.
   * 
   * @param {number} x - The cylinder center.
   * @param {number} y - The cylinder center.
   * @param {number} z - The cylinder center.
   * @param {number} h - The height.
   * @param {number} r - The radius.
   */
  fromCenter(x: number, y: number, z: number, h: number, r: number) {
    this.position = [x, y - (h * 0.5), z];
    this.height = h;
    this.radius = r;
  }

  /**
   * Converts an axis-aligned bounding box into an equivalent vertical bounding cylinder.
   * 
   * @param {Gfx3BoundingBox} aabb - The bounding box.
   */
  fromBoundingBox(aabb: Gfx3BoundingBox) {
    const center = aabb.getCenter();
    this.position = [center[0], aabb.min[1], center[2]];
    this.height = aabb.getHeight();
    this.radius = aabb.getRadius();
  }

  /**
   * Transform the bounding cylinder by a matrix.
   * Note: The cylinder remains axis-aligned (vertical).
   * 
   * @param {mat4} matrix - The transformation matrix.
   */
  transform(matrix: mat4): Gfx3BoundingCylinder {
    const cx = this.position[0];
    const cy = this.position[1];
    const cz = this.position[2];
    const topY = cy + this.height;

    const points: Array<[number, number, number]> = [
      // Bottom center
      [cx, cy, cz],
      // Top center
      [cx, topY, cz],
      // Bottom circle cardinal points
      [cx + this.radius, cy, cz],
      [cx - this.radius, cy, cz],
      [cx, cy, cz + this.radius],
      [cx, cy, cz - this.radius],
      // Top circle cardinal points
      [cx + this.radius, topY, cz],
      [cx - this.radius, topY, cz],
      [cx, topY, cz + this.radius],
      [cx, topY, cz - this.radius]
    ];

    const transformed = points.map(p =>
      UT.MAT4_MULTIPLY_BY_VEC4(matrix, [p[0], p[1], p[2], 1])
    );

    const min: vec3 = [...transformed[0].slice(0, 3)] as vec3;
    const max: vec3 = [...transformed[0].slice(0, 3)] as vec3;

    for (let i = 1; i < transformed.length; i++) {
      for (let j = 0; j < 3; j++) {
        const v = transformed[i][j];
        min[j] = Math.min(min[j], v);
        max[j] = Math.max(max[j], v);
      }
    }

    return Gfx3BoundingCylinder.createFromBoundingBox(new Gfx3BoundingBox(min, max));
  }

  /**
   * Scale the cylinder along x, y and z axes.
   * The cylinder remains axis-aligned (vertical).
   *
   * @param {number} xz - Scale factor along X axis.
   * @param {number} y  - Scale factor along Y axis (affects height).
   */
  scale(xz: number = 1, y: number = 1): void {
    const centerY = this.position[1] + this.height * 0.5;
    const newHeight = this.height * y;
    const newRadius = this.radius * xz;

    this.position[1] = centerY - (newHeight * 0.5);
    this.height = newHeight;
    this.radius = newRadius;
  }

  /**
   * Checks if a given point is inside.
   * 
   * @param {number} x - The x-coordinate of the point.
   * @param {number} y - The y-coordinate of the point.
   * @param {number} z - The z-coordinate of the point.
   */
  isPointInside(x: number, y: number, z: number): boolean {
    return PH.CYLINDER_POINT_COLLIDE(this.position, this.height, this.radius, [x, y, z]);
  }

  /**
   * Checks if two bounding cylinders intersect.
   * 
   * @param {Gfx3BoundingCylinder} cylinder - The second cylinder.
   * @param outVelocity - The out elastic collision velocity.
   */
  intersectBoundingCylinder(cylinder: Gfx3BoundingCylinder, outVelocityImpact: vec2 = [0, 0]): boolean {
    return PH.CYLINDERS_COLLIDE(
      this.position,
      this.radius,
      this.height,
      cylinder.getPosition(),
      cylinder.getRadius(),
      cylinder.getHeight(),
      outVelocityImpact
    );
  }

  /**
   * Checks if bounding cylinder intersect a bounding box.
   * 
   * @param {Gfx3BoundingBox} aabb - The second box.
   */
  intersectBoundingBox(aabb: Gfx3BoundingBox): boolean {
    return PH.CYLINDER_BOX_COLLIDE(this.position, this.radius, this.height, aabb.min, aabb.max);
  }

  /**
   * Reset to default values.
   */
  reset(): void {
    this.position = [0, 0, 0];
    this.height = 1;
    this.radius = 1;
  }

  /**
   * Returns the bottom position.
   */
  getPosition(): vec3 {
    return this.position;
  }

  /**
   * Returns the height.
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Returns the radius.
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * Set the position (bottom origin).
   * 
   * @param {number} x - The x-coordinate.
   * @param {number} y - The y-coordinate.
   * @param {number} z - The z-coordinate.
   */
  setPosition(x: number, y: number, z: number): void {
    this.position = [x, y, z];
  }

  /**
   * Set the height.
   * 
   * @param {number} height - The height.
   */
  setHeight(height: number): void {
    this.height = height;
  }

  /**
   * Set the radius.
   * 
   * @param {number} radius - The radius.
   */
  setRadius(radius: number): void {
    this.radius = radius;
  }
}

export { Gfx3BoundingCylinder };