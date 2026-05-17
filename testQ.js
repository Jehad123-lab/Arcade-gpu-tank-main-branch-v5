const f = 0.5; // testing
const s = 0;
const t = 0;

let _x = f * 0.5;
let _y = s * 0.5;
let _z = t * 0.5;

let cX = Math.cos(_x);
let cY = Math.cos(_y);
let cZ = Math.cos(_z);
let sX = Math.sin(_x);
let sY = Math.sin(_y);
let sZ = Math.sin(_z);

const w = sX * sY * sZ + cX * cY * cZ;
const x = sX * sZ * cY + sY * cX * cZ;
const y = sX * cY * cZ - sY * sZ * cX;
const z = sZ * cX * cY - sX * sY * cZ;

console.dir({w, x, y, z});
