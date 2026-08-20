import sharp from 'sharp'
const [src,out,l,t,w,h,scale]=process.argv.slice(2)
let img=sharp(src).extract({left:+l,top:+t,width:+w,height:+h})
if(scale)img=img.resize({width:+w*+scale,kernel:'nearest'})
await img.png().toFile(out)
console.log('ok',out)
