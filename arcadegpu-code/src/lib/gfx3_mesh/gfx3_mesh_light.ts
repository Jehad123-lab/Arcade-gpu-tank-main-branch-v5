import { gfx3MeshRenderer } from './gfx3_mesh_renderer';
import { Gfx3Transformable } from '../gfx3/gfx3_transformable';

export enum Gfx3LightType {
  POINT = 'POINT',
  SPOT = 'SPOT'
};

/**
 * A 3D light.
 */
class Gfx3MeshLight extends Gfx3Transformable {
  type: Gfx3LightType;
  diffuse: vec3;
  specular: vec3;
  intensity: number;
  constant: number;
  linear: number;
  exp: number;
  groupId: number;
  spotCutoff: number;
  spotDirection: vec3;

  constructor() {
    super();
    this.type = Gfx3LightType.POINT;
    this.diffuse = [0.7, 0.7, 0.7];
    this.specular = [1.0, 1.0, 1.0];
    this.intensity = 1.0;
    this.constant = 1;
    this.linear = 0;
    this.exp = 0;
    this.groupId = 0;
    this.spotCutoff = 12.5;
    this.spotDirection = [0, -1, 0];
  }

  /**
   * Load asynchronously point light data from a json file (jlt).
   * 
   * @param {string} path - The file path.
   */
  async loadFromFile(path: string): Promise<void> {
    const response = await fetch(path);
    const json = await response.json();

    if (!json.hasOwnProperty('Ident') || json['Ident'] != 'JLT') {
      throw new Error('Gfx3MeshLight::loadFromFile(): File not valid !');
    }

    this.type = json['Type'] == 'POINT' ? Gfx3LightType.POINT : Gfx3LightType.SPOT;
    this.position = json['Position'];    
    this.diffuse = json['DiffuseColor'];
    this.specular = json['SpecularColor'];
    this.intensity = json['Intensity'];
    this.constant = json['Constant'];
    this.linear = json['Linear'];
    this.exp = json['Exp'];
    this.groupId = json['GroupId'];
    this.spotCutoff = json['SpotCutoff'];
    this.spotDirection = json['SpotDirection'];
  }

  /**
   * The draw function.
   */
  draw(): void {
    if (this.type == Gfx3LightType.POINT) {
      gfx3MeshRenderer.drawPointLight(
        this.position,
        this.diffuse,
        this.specular,
        this.intensity,
        this.groupId,
        this.constant,
        this.linear,
        this.exp
      );
    }
    else {
      gfx3MeshRenderer.drawSpotLight(
        this.position,
        this.spotDirection, 
        this.spotCutoff,
        this.diffuse,
        this.specular,
        this.intensity,
        this.groupId,
        this.constant,
        this.linear,
        this.exp
      );
    }
  }

  /**
   * Set the light type.
   * 
   * @param {Gfx3LightType} type - The type.
   */
  setType(type: Gfx3LightType): void {
    this.type = type;
  }

  /**
   * Set diffuse color.
   * 
   * @param {number} r - The red channel.
   * @param {number} g - The green channel.
   * @param {number} b - The blue channel.
   */
  setDiffuse(r: number, g: number, b: number): void {
    this.diffuse[0] = r;
    this.diffuse[1] = g;
    this.diffuse[2] = b;
  }

  /**
   * Set specular color.
   * 
   * @param {number} r - The red channel.
   * @param {number} g - The green channel.
   * @param {number} b - The blue channel.
   */
  setSpecular(r: number, g: number, b: number): void {
    this.specular[0] = r;
    this.specular[1] = g;
    this.specular[2] = b;
  }

  /**
   * Set intensity value.
   * 
   * @param {number} intensity - The intensity value.
   */
  setIntensity(intensity: number): void {
    this.intensity = intensity;
  }

  /**
   * Set constant attenuation.
   * 
   * @param {number} constant - The constant value.
   */
  setConstant(constant: number): void {
    this.constant = constant;
  }

  /**
   * Set linear attenuation.
   * 
   * @param {number} linear - The linear value.
   */
  setLinear(linear: number): void {
    this.linear = linear;
  }

  /**
   * Set exp attenuation.
   * 
   * @param {number} exp - The exp value.
   */
  setExp(exp: number): void {
    this.exp = exp;
  }

  /**
   * Set group light identifier.
   * Note: 0 is the default group and will affect all mesh
   * 
   * @param {number} groupId - The group id.
   */
  setGroup(groupId: number): void {
    this.groupId = groupId;
  }

  /**
   * Set the spot cutoff angle.
   * 
   * @param {number} cutoff - The cutoff angle.
   */
  setCutoff(cutoff: number): void {
    this.spotCutoff = cutoff;
  }

  /**
   * Set the spot direction.
   * 
   * @param {number} x - The x direction.
   * @param {number} y - The y direction.
   * @param {number} z - The z direction.
   */
  setDirection(x: number, y: number, z: number): void {
    this.spotDirection[0] = x;
    this.spotDirection[1] = y;
    this.spotDirection[2] = z;
  }

  /**
   * Returns the type.
   */
  getType(): Gfx3LightType {
    return this.type;
  }

  /**
   * Returns the diffuse color.
   */
  getDiffuse(): vec3 {
    return this.diffuse;
  }

  /**
   * Returns the specular color.
   */
  getSpecular(): vec3 {
    return this.specular;
  }

  /**
   * Returns the intensity.
   */
  getIntensity(): number {
    return this.intensity;
  }

  /**
   * Returns the constant attenuation value.
   */
  getConstant(): number {
    return this.constant;
  }

  /**
   * Returns the linear attenuation value.
   */
  getLinear(): number {
    return this.linear;
  }

  /**
   * Returns the exponent attenuation value.
   */
  getExp(): number {
    return this.exp;
  }

  /**
   * Returns the group id.
   */
  getGroup(): number {
    return this.groupId;
  }

  /**
   * Returns the spot cutoff angle.
   */
  getCutoff(): number {
    return this.spotCutoff;
  }

  /**
   * Returns the spot direction.
   */
  getDirection(): vec3 {
    return this.spotDirection;
  }
}

export { Gfx3MeshLight };