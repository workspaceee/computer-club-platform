import sharp from 'sharp'
const [a,b]=process.argv.slice(2)
const load=async p=>{const i=sharp(p);const m=await i.metadata();return {w:m.width,h:m.height,d:await i.ensureAlpha().raw().toBuffer()}}
const A=await load(a),B=await load(b)
const buckets=[0,1,2,4,8,16,32,64,128,256]
const counts=new Array(buckets.length).fill(0)
const regions={}
for(let y=0;y<A.h;y++)for(let x=0;x<A.w;x++){const i=(y*A.w+x)*4
const d=Math.max(Math.abs(A.d[i]-B.d[i]),Math.abs(A.d[i+1]-B.d[i+1]),Math.abs(A.d[i+2]-B.d[i+2]))
if(!d)continue
for(let k=buckets.length-1;k>=0;k--){if(d>=buckets[k]){counts[k]++;break}}
if(d>=24){const rx=Math.floor(x/(A.w/8)),ry=Math.floor(y/(A.h/6));const k=`c${rx},r${ry}`;regions[k]=(regions[k]||0)+1}}
console.log('delta histogram:')
for(let k=0;k<buckets.length;k++)if(counts[k])console.log(`  >=${buckets[k]}: ${counts[k]}`)
const strong=Object.entries(regions).sort((p,q)=>q[1]-p[1])
console.log('cells with delta>=24 (8x6 grid):',strong.slice(0,14).map(([k,v])=>`${k}:${v}`).join('  '))
console.log('total strong:',strong.reduce((s,[,v])=>s+v,0))
