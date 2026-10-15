// Project the supplied image as one textured plane; no invented sides or geometry.
function point(image,pose,u,v){
 const scale=Math.min(pose.w/image.width,pose.h/image.height);
 const x=(u-.5)*image.width*scale,y=(v-.5)*image.height*scale;
 const cy=Math.cos(pose.ry),sy=Math.sin(pose.ry),cx=Math.cos(pose.rx),sx=Math.sin(pose.rx),cz=Math.cos(pose.rz),sz=Math.sin(pose.rz);
 const a=x*cy,b=y*cx+x*sy*sx,z=(pose.z||0)+y*sx-x*sy*cx;
 const depth=1200/(1200+z);
 return {x:pose.x+(a*cz-b*sz)*depth,y:pose.y+(a*sz+b*cz)*depth,u:u*image.width,v:v*image.height};
}
export function projectProduct(image,pose){return [[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>point(image,pose,u,v));}

function triangle(ctx,image,a,b,c){
 const du=b.u-a.u,dv=b.v-a.v,eu=c.u-a.u,ev=c.v-a.v,det=du*ev-eu*dv;
 if(Math.abs(det)<.00001)return;
 const ax=((b.x-a.x)*ev-(c.x-a.x)*dv)/det;
 const bx=((b.y-a.y)*ev-(c.y-a.y)*dv)/det;
 const cx=((c.x-a.x)*du-(b.x-a.x)*eu)/det;
 const dx=((c.y-a.y)*du-(b.y-a.y)*eu)/det;
 // Subpixel overlap avoids hairline cracks from independently antialiased clips.
 const center={x:(a.x+b.x+c.x)/3,y:(a.y+b.y+c.y)/3};
 const points=[a,b,c];
 const distance=Math.min(...points.map((p,i)=>{const q=points[(i+1)%3];return Math.abs((q.x-p.x)*(center.y-p.y)-(q.y-p.y)*(center.x-p.x))/Math.hypot(q.x-p.x,q.y-p.y);}));
 const expansion=1+1.25/Math.max(distance,.001);
 const clip=points.map(p=>({x:center.x+(p.x-center.x)*expansion,y:center.y+(p.y-center.y)*expansion}));
 ctx.save();ctx.beginPath();ctx.moveTo(clip[0].x,clip[0].y);ctx.lineTo(clip[1].x,clip[1].y);ctx.lineTo(clip[2].x,clip[2].y);ctx.closePath();ctx.clip();
 ctx.transform(ax,bx,cx,dx,a.x-ax*a.u-cx*a.v,a.y-bx*a.u-dx*a.v);
 ctx.drawImage(image,0,0);ctx.restore();
}
function mesh(ctx,image,pose){
 // A modest mesh retains smooth perspective and real-time preview/export.
 const cells=Math.abs(pose.ry)>.4||Math.abs(pose.rx)>.25?3:2;const vertices=[];
 for(let y=0;y<=cells;y++){vertices[y]=[];for(let x=0;x<=cells;x++)vertices[y][x]=point(image,pose,x/cells,y/cells);}
 for(let y=0;y<cells;y++)for(let x=0;x<cells;x++){
  const a=vertices[y][x],b=vertices[y][x+1],c=vertices[y+1][x+1],d=vertices[y+1][x];
  triangle(ctx,image,a,b,c);triangle(ctx,image,a,c,d);
 }
}

const layers=new WeakMap();
function affineFallback(ctx,image,pose){
 // Older canvas implementations do not preserve alpha reliably with replace-
 // composited rotated mesh clips. One affine plane avoids seams in that path.
 const [a,b,,d]=projectProduct(image,pose);const c={x:b.x+d.x-a.x,y:b.y+d.y-a.y};
 ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.clip();
 ctx.transform((b.x-a.x)/image.width,(b.y-a.y)/image.width,(d.x-a.x)/image.height,(d.y-a.y)/image.height,a.x,a.y);
 ctx.drawImage(image,0,0);ctx.restore();
}
export function drawProjectedProduct(ctx,image,pose){
 if(typeof OffscreenCanvas==='undefined'){affineFallback(ctx,image,pose);return;}
 let layer=layers.get(ctx);
 if(!layer){
  const canvas=new OffscreenCanvas(1280,720);layer={canvas,ctx:canvas.getContext('2d')};layers.set(ctx,layer);
 }
 // An isolated replace-composited layer keeps shared triangle edges from
 // repeatedly blending the source alpha. Composite the finished plane once.
 if(layer?.ctx){layer.ctx.clearRect(0,0,1280,720);layer.ctx.globalCompositeOperation='copy';mesh(layer.ctx,image,pose);ctx.drawImage(layer.canvas,0,0);}
 else affineFallback(ctx,image,pose);
}
