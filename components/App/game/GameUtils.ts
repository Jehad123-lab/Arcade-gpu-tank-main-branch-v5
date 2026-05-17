import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { Gfx3MeshEffect } from '@lib/gfx3/gfx3_drawable';
import { UT } from '@lib/core/utils';

export function createBoxMesh(width: number, height: number, depth: number, color: [number, number, number]): Gfx3Mesh {
  const mesh = new Gfx3Mesh();
  mesh.setTag(0, 0, Gfx3MeshEffect.PIXELATION); 
  mesh.geo = createBoxGeo(width, height, depth, color);
  mesh.beginVertices(mesh.geo.vertices.length / 17);
  mesh.setVertices(mesh.geo.vertices);
  mesh.endVertices();
  return mesh;
}

export function createUnitBoxMesh(color: [number, number, number]): Gfx3Mesh {
  return createBoxMesh(1, 1, 1, color);
}

export function createBoxGeo(width: number, height: number, depth: number, color: [number, number, number]) {
  const w = width / 2;
  const h = height / 2;
  const d = depth / 2;
  
  const coords = [
    -w, -h,  d,  w, -h,  d,  w,  h,  d,  -w, -h,  d,  w,  h,  d, -w,  h,  d,
     w, -h, -d, -w, -h, -d, -w,  h, -d,   w, -h, -d, -w,  h, -d,  w,  h, -d,
    -w,  h,  d,  w,  h,  d,  w,  h, -d,  -w,  h,  d,  w,  h, -d, -w,  h, -d,
    -w, -h, -d,  w, -h, -d,  w, -h,  d,  -w, -h, -d,  w, -h,  d, -w, -h,  d,
     w, -h,  d,  w, -h, -d,  w,  h, -d,   w, -h,  d,  w,  h, -d,  w,  h,  d,
    -w, -h, -d, -w, -h,  d, -w,  h,  d,  -w, -h, -d, -w,  h,  d, -w,  h, -d
  ];

  const colors = [];
  const normals = [];
  for (let i = 0; i < coords.length; i += 18) {
    const v0: vec3 = [coords[i], coords[i+1], coords[i+2]];
    const v1: vec3 = [coords[i+3], coords[i+4], coords[i+5]];
    const v2: vec3 = [coords[i+6], coords[i+7], coords[i+8]];
    const e1 = UT.VEC3_SUBSTRACT(v1, v0);
    const e2 = UT.VEC3_SUBSTRACT(v2, v0);
    const normal = UT.VEC3_NORMALIZE(UT.VEC3_CROSS(e1, e2));
    for (let j = 0; j < 6; j++) {
      colors.push(color[0], color[1], color[2]);
      normals.push(normal[0], normal[1], normal[2]);
    }
  }

  return Gfx3Mesh.buildVertices(coords.length / 3, coords, [], colors, normals);
}

export function combineGeos(geos: { geo: any, matrix: mat4 }[]): Gfx3Mesh {
    const totalVertices = geos.reduce((sum, g) => sum + g.geo.vertices.length, 0);
    const combinedVertices = new Float32Array(totalVertices);
    
    let offset = 0;
    for (const item of geos) {
        const vertices = item.geo.vertices;
        const matrix = item.matrix;
        
        // Vertices are 17 floats: 0-2 pos, 3-4 tex, 5-7 color, 8-10 norm, 11-13 tang, 14-16 bitang
        for (let i = 0; i < vertices.length; i += 17) {
            const pos = UT.MAT4_MULTIPLY_BY_VEC4(matrix, [vertices[i], vertices[i+1], vertices[i+2], 1]);
            combinedVertices[offset + i] = pos[0];
            combinedVertices[offset + i + 1] = pos[1];
            combinedVertices[offset + i + 2] = pos[2];
            
            // Copy the rest
            for (let j = 3; j < 8; j++) combinedVertices[offset + i + j] = vertices[i + j];
            
            // Transform normal (approx)
            const normal = UT.MAT4_MULTIPLY_BY_VEC4(matrix, [vertices[i+8], vertices[i+9], vertices[i+10], 0]);
            const normNormalized = UT.VEC3_NORMALIZE([normal[0], normal[1], normal[2]]);
            combinedVertices[offset + i + 8] = normNormalized[0];
            combinedVertices[offset + i + 9] = normNormalized[1];
            combinedVertices[offset + i + 10] = normNormalized[2];
            
            for (let j = 11; j < 17; j++) combinedVertices[offset + i + j] = vertices[i + j];
        }
        offset += vertices.length;
    }
    
    const mesh = new Gfx3Mesh();
    mesh.setTag(0, 0, Gfx3MeshEffect.PIXELATION);
    mesh.beginVertices(combinedVertices.length / 17);
    mesh.setVertices(Array.from(combinedVertices));
    mesh.endVertices();
    return mesh;
}

export function generateHeightmapCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#000000'; // baseline 0 height
  ctx.fillRect(0, 0, width, height);

  const drawHill = (x: number, y: number, r: number, h: number) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const colorC = Math.floor(h);
    grad.addColorStop(0, `rgba(${colorC}, ${colorC}, ${colorC}, 1)`);
    grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // Keep center flat for spawn
  const cx = width / 2;
  const cy = height / 2;
  
  for (let i = 0; i < 40; i++) {
    const r = 20 + Math.random() * 80;
    const x = Math.random() * width;
    const y = Math.random() * height;
    const h = 5 + Math.random() * 30; // Max height representation
    
    // Avoid center
    const distToCenter = Math.sqrt((x - cx)*(x - cx) + (y - cy)*(y - cy));
    if (distToCenter < 60) continue;

    drawHill(x, y, r, h);
  }
  
  return canvas;
}

export function createTerrainMesh(width: number, depth: number, segmentsW: number, segmentsD: number, color: [number, number, number], heightmapCanvas: HTMLCanvasElement): { mesh: Gfx3Mesh, vertices: Array<number>, indexes: Array<number> } {
  const mesh = new Gfx3Mesh();
  mesh.setTag(0, 0, Gfx3MeshEffect.PIXELATION); 

  const ctx = heightmapCanvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, heightmapCanvas.width, heightmapCanvas.height).data;
  
  const hw = width / 2;
  const hd = depth / 2;
  const segW = width / segmentsW;
  const segD = depth / segmentsD;
  
  const verticesFlat = new Array<number>();
  const indexesFlat = new Array<number>();
  const colorsFlat = new Array<number>();
  const normalsFlat = new Array<number>();
  
  // Create grid of points
  const points = [];
  for (let z = 0; z <= segmentsD; z++) {
    const row = [];
    for (let x = 0; x <= segmentsW; x++) {
      const px = -hw + x * segW;
      const pz = -hd + z * segD;
      
      const u = x / segmentsW;
      const v = z / segmentsD;
      
      const texX = Math.floor(u * (heightmapCanvas.width - 1));
      const texY = Math.floor(v * (heightmapCanvas.height - 1));
      
      const idx = (texY * heightmapCanvas.width + texX) * 4;
      const heightVal = imgData[idx] / 255.0; // 0.0 to 1.0
      
      const py = heightVal * 30.0 - 0.5; // Max height is 30, base is -0.5
      
      row.push([px, py, pz]);
      verticesFlat.push(px, py, pz);
    }
    points.push(row);
  }

  // Create triangles
  for (let z = 0; z < segmentsD; z++) {
    for (let x = 0; x < segmentsW; x++) {
      const a = z * (segmentsW + 1) + x;
      const b = z * (segmentsW + 1) + x + 1;
      const c = (z + 1) * (segmentsW + 1) + x;
      const d = (z + 1) * (segmentsW + 1) + x + 1;
      
      // Triangle 1: a, c, b
      indexesFlat.push(a, c, b);
      // Triangle 2: b, c, d
      indexesFlat.push(b, c, d);
    }
  }

  // Compute normals simply (flat shading isn't right, let's smooth shade or flat shade)
  // Let's compute smooth normals
  const nPoints = [];
  for (let i = 0; i < verticesFlat.length; i+=3) nPoints.push([0,0,0] as vec3);
  
  for (let i = 0; i < indexesFlat.length; i+=3) {
      const i0 = indexesFlat[i];
      const i1 = indexesFlat[i+1];
      const i2 = indexesFlat[i+2];
      
      const v0: vec3 = [verticesFlat[i0*3], verticesFlat[i0*3+1], verticesFlat[i0*3+2]];
      const v1: vec3 = [verticesFlat[i1*3], verticesFlat[i1*3+1], verticesFlat[i1*3+2]];
      const v2: vec3 = [verticesFlat[i2*3], verticesFlat[i2*3+1], verticesFlat[i2*3+2]];
      
      const e1 = UT.VEC3_SUBSTRACT(v1, v0);
      const e2 = UT.VEC3_SUBSTRACT(v2, v0);
      const cross = UT.VEC3_CROSS(e1, e2);
      
      nPoints[i0] = UT.VEC3_ADD(nPoints[i0], cross);
      nPoints[i1] = UT.VEC3_ADD(nPoints[i1], cross);
      nPoints[i2] = UT.VEC3_ADD(nPoints[i2], cross);
  }
  
  for (let i = 0; i < nPoints.length; i++) {
      nPoints[i] = UT.VEC3_NORMALIZE(nPoints[i]);
      normalsFlat.push(nPoints[i][0], nPoints[i][1], nPoints[i][2]);
      colorsFlat.push(color[0], color[1], color[2]);
  }
  
  const faceGroups = [{ name: 'default', faces: [] as any[], vertexCount: verticesFlat.length }];
  for (let i = 0; i < indexesFlat.length; i+=3) {
      faceGroups[0].faces.push({
          v: [indexesFlat[i], indexesFlat[i+1], indexesFlat[i+2]],
          t: [indexesFlat[i], indexesFlat[i+1], indexesFlat[i+2]],
          n: [indexesFlat[i], indexesFlat[i+1], indexesFlat[i+2]],
          smoothGroup: 0
      });
  }

  mesh.geo = Gfx3Mesh.buildVertices(verticesFlat.length / 3, verticesFlat, [], colorsFlat, normalsFlat, faceGroups);
  mesh.beginVertices(mesh.geo.vertices.length / 17); // 17 floats per vertex
  mesh.setVertices(mesh.geo.vertices);
  mesh.endVertices();

  return { mesh, vertices: verticesFlat, indexes: indexesFlat };
}
