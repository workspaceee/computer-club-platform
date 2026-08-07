import sharp from 'sharp'
const load=async p=>{const i=sharp(p);const m=await i.metadata();return {w:m.width,d:await i.ensureAlpha().raw().toBuffer()}}
const A=await load(process.argv[2]),B=await load(process.argv[3])
const pts=process.argv.slice(4).map(s=>s.split(',').map(Number))
for(const [x,y] of pts){const i=(y*A.w+x)*4
console.log(`(${x},${y})  before rgb(${A.d[i]},${A.d[i+1]},${A.d[i+2]})  after rgb(${B.d[i]},${B.d[i+1]},${B.d[i+2]})`)}
