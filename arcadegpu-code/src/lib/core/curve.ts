import { CurveInterpolator } from 'curve-interpolator';

interface CurveOptions {
  tension?: number,
  alpha?: number,
  closed?: boolean,
  arcDivisions?: number,
  numericalApproximationOrder?: number,
  numericalInverseSamples?: number,
  lmargin?: number
};

/**
 * A Centripetal Catmull–Rom spline.
 */
class Curve {
  /**
   * Create a curve interpolator from asynchronously loads curve data from a json file and return it.
   * 
   * @param {string} path - The file path.
   */
  static async createFromFile(path: string): Promise<CurveInterpolator> {
    const response = await fetch(path);
    const json = await response.json();

    if (!json.hasOwnProperty('Ident') || json['Ident'] != 'JLM') {
      throw new Error('Curve::createFromFile(): File not valid !');
    }

    const points = [];
    for (const point of json['Points']) {
      points.push(point);
    }

    return Curve.createInterpolator(points, {
      tension: json['Tension'] ?? 0.5,
      alpha: json['Alpha'] ?? 0,
      closed: json['Closed'] ?? false,
      arcDivisions: json['ArcDivisions'],
      numericalApproximationOrder: json['NumericalApproximationOrder'],
      numericalInverseSamples: json['NumericalInverseSamples'],
      lmargin: json['LMargin']
    });
  }

  /**
   * Load asynchronously from a binary file (blm).
   * 
   * @param {string} path - The file path.
   * @param {string} optionsFile - The options file path.
   */
  static async createFromBinaryFile(path: string, optionsFile: string = ''): Promise<CurveInterpolator> {
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    const data = new Float32Array(buffer);
    let json: any = {};

    if (optionsFile) {
      const response = await fetch(optionsFile);
      json = await response.json();
    }

    const points: Array<any> = [];
    for (var i = 0; i < data.length; i += 3) {
      points.push([data[i + 0], data[i + 1], data[i + 2]])
    }

    return Curve.createInterpolator(points, {
      tension: json['Tension'] ?? 0.5,
      alpha: json['Alpha'] ?? 0,
      closed: json['Closed'] ?? false,
      arcDivisions: json['ArcDivisions'],
      numericalApproximationOrder: json['NumericalApproximationOrder'],
      numericalInverseSamples: json['NumericalInverseSamples'],
      lmargin: json['LMargin']
    });
  }

  /**
   * Create and returns a curve interpolator.
   * 
   * @param {Array<vec_any>} points - Control points.
   * @param {CurveOptions} options - Interpolator options.
   */
  static createInterpolator(points: Array<vec_any>, options: CurveOptions): CurveInterpolator {
    return new CurveInterpolator(points, {
      tension: options.tension,
      alpha: options.alpha,
      closed: options.closed,
      arcDivisions: options.arcDivisions,
      numericalApproximationOrder: options.numericalApproximationOrder,
      numericalInverseSamples: options.numericalInverseSamples,
      lmargin: options.lmargin
    });
  }
}

export { Curve, CurveInterpolator };