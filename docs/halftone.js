const processed=new Map();
export function halftonePhoto(src){
 if(processed.has(src))return processed.get(src);
 const result=new Promise((resolve,reject)=>{
  const photo=new Image();photo.crossOrigin='anonymous';
  photo.onerror=()=>reject(new Error('Halftone source could not be loaded'));
  photo.onload=async()=>{
   try{
    const width=1920,height=1080,cell=4;
    const sample=document.createElement('canvas');sample.width=width/cell;sample.height=height/cell;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    const ratio=width/height,sourceRatio=photo.naturalWidth/photo.naturalHeight;
    const sw=sourceRatio>ratio?photo.naturalHeight*ratio:photo.naturalWidth;
    const sh=sourceRatio>ratio?photo.naturalHeight:photo.naturalWidth/ratio;
    ctx.fillStyle='#fff';ctx.fillRect(0,0,sample.width,sample.height);
    ctx.drawImage(photo,(photo.naturalWidth-sw)/2,(photo.naturalHeight-sh)/2,sw,sh,0,0,sample.width,sample.height);
    const pixels=ctx.getImageData(0,0,sample.width,sample.height).data;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ink=canvas.getContext('2d');ink.fillStyle='#fff';ink.fillRect(0,0,width,height);ink.fillStyle='#000';
    // Rotate only the print lattice, keeping the photograph upright.
    const diagonal=Math.SQRT1_2;
    const uMax=Math.ceil((width+height)*diagonal/cell)+2;
    const vMin=Math.floor(-width*diagonal/cell)-2;
    const vMax=Math.ceil(height*diagonal/cell)+2;
    for(let row=vMin;row<=vMax;row++){
     if((row-vMin)%8===0)await new Promise(resolve=>setTimeout(resolve,0));
     for(let col=-2;col<=uMax;col++){
     const u=(col+.5)*cell,v=(row+.5)*cell;
     const x=(u-v)*diagonal,y=(u+v)*diagonal;
     if(x < -cell || x > width+cell || y < -cell || y > height+cell)continue;
     const sx=Math.max(0,Math.min(sample.width-1,Math.floor(x/cell)));
     const sy=Math.max(0,Math.min(sample.height-1,Math.floor(y/cell)));
     const i=(sy*sample.width+sx)*4,luma=(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])/255;
     const radius=Math.sqrt(1-luma)*cell*.71;
     if(radius<.1)continue;
     ink.beginPath();ink.arc(x,y,radius,0,Math.PI*2);ink.fill();
     }
    }
    canvas.toBlob(blob=>blob?resolve(URL.createObjectURL(blob)):reject(new Error('Halftone export failed')),'image/png');
   }catch(error){reject(error)}
  };
  photo.src=src;
 });
 processed.set(src,result);result.catch(()=>processed.delete(src));return result;
}
