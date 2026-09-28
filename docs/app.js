import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const $=s=>document.querySelector(s),hero=$('#hero'),gallery=$('#gallery'),canvas=$('#tv');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let homeDistance=9;
let renderer,scene,camera,tv,bouncingText,mode='hero',progress=0,last=0,raf,targetX=0,targetY=0;
const screenHalf={x:1.54,y:1.45},textHalf={x:.74,y:.33};
const bounce={x:.18,y:.16,vx:.44,vy:.31,limitX:screenHalf.x-textHalf.x,limitY:screenHalf.y-textHalf.y};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function openGallery(){if(mode!=='hero')return;mode='entering';progress=0;hero.classList.add('entering');if(reduced||!renderer)showGallery();}
function showGallery(){mode='gallery';document.body.classList.add('gallery-open');hero.hidden=true;gallery.hidden=false;requestAnimationFrame(()=>{gallery.classList.add('visible');$('#gallery-title').focus({preventScroll:true})});window.scrollTo(0,0);document.dispatchEvent(new Event('films:open'))}
function back(){if(mode==='hero')return;mode='hero';document.dispatchEvent(new Event('films:close'));document.body.classList.remove('gallery-open');progress=0;gallery.classList.remove('visible');gallery.hidden=true;hero.hidden=false;hero.classList.remove('entering');window.scrollTo(0,0);if(camera)camera.position.set(0,0,homeDistance);resize();canvas.focus({preventScroll:true})}
$('#fallback-open').onclick=openGallery;
document.querySelectorAll('.logo').forEach(a=>a.onclick=e=>{e.preventDefault();back()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode==='gallery'&&!document.querySelector('dialog[open]'))back()});
canvas.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGallery()}};
function material(color,metalness=0,roughness=.6){return new THREE.MeshStandardMaterial({color,metalness,roughness})}
function rounded(w,h,d,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:3,steps:1,curveSegments:12});g.translate(0,0,-d/2);return g}
function part(g,m,x=0,y=0,z=0,parent=tv){const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function box(w,h,d,m,x,y,z,r=.08){return part(rounded(w,h,d,r),m,x,y,z)}
function label(text,w,h,color='#20251d',bg=null){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,512,128)}ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 50px monospace';ctx.fillText(text,256,64);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true}))}
function init(){
 renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(0,0,homeDistance);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x858585,2.7));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,7,6);scene.add(key);const rim=new THREE.DirectionalLight(0xffffff,1.2);rim.position.set(5,2,-3);scene.add(rim);
 tv=new THREE.Group();tv.rotation.set(0,0,0);scene.add(tv);
 const metal=material(0x383b3e,.35,.48),edge=material(0x222528,.25,.58),black=material(0x101214,.1,.8),dark=material(0x2c3033,.3,.5);
 box(4.1,4.1,1.6,edge,0,0,-.25,.25);box(4.14,4.12,.19,metal,0,0,.58,.24);
 box(3.56,3.38,.15,dark,0,.14,.74,.3);box(3.32,3.14,.1,black,0,.14,.86,.34);
 // Curved, nearly square CRT glass with a dark idle screen.
 const sg=new THREE.PlaneGeometry(3.08,2.9,48,48);const p=sg.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),u=x/1.54,v=y/1.45;p.setXYZ(i,x*(1-.045*Math.pow(Math.abs(v),8)),y*(1-.045*Math.pow(Math.abs(u),8)),.13*(1-u*u)*(1-v*v))}sg.computeVertexNormals();
 part(sg,new THREE.MeshBasicMaterial({color:0x15181b}),0,.14,.965);
 const clickTexture=new THREE.TextureLoader().load('assets/click-to-play.png');clickTexture.colorSpace=THREE.SRGBColorSpace;
 bouncingText=part(new THREE.PlaneGeometry(textHalf.x*2,textHalf.y*2),new THREE.MeshBasicMaterial({map:clickTexture,transparent:true,depthWrite:false,toneMapped:false}),bounce.x,bounce.y+.14,1.14);
 for(const x of [-.48,-.16,.16,.48]){const base=part(new THREE.CylinderGeometry(.105,.105,.035,32),black,x,-1.77,.76);base.rotation.x=Math.PI/2;const button=part(new THREE.CylinderGeometry(.067,.067,.075,32),metal,x,-1.77,.79);button.rotation.x=Math.PI/2}

 for(const x of [-1.4,1.4])box(.55,.2,1,black,x,-2.16,-.18,.06);
 canvas.addEventListener('pointermove',e=>{if(mode!=='hero')return;const r=canvas.getBoundingClientRect();targetX=(e.clientX-r.left)/r.width*2-1;targetY=(e.clientY-r.top)/r.height*2-1;pointer.set(targetX,-targetY);raycaster.setFromCamera(pointer,camera);canvas.style.cursor=raycaster.intersectObjects(tv.children).length?'pointer':'default'});
 canvas.addEventListener('pointerleave',()=>{targetX=targetY=0});canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));raycaster.setFromCamera(pointer,camera);if(raycaster.intersectObjects(tv.children).length)openGallery()});
 resize();requestAnimationFrame(animate);
}
function resize(){if(!renderer||hero.hidden)return;const r=canvas.parentElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;homeDistance=Math.max(9,2.45/(2*Math.tan(THREE.MathUtils.degToRad(37/2))*camera.aspect),2.5/(2*Math.tan(THREE.MathUtils.degToRad(37/2))));camera.updateProjectionMatrix()}
function animate(now){raf=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(mode==='gallery'||document.hidden)return;if(mode==='hero'){const smooth=1-Math.exp(-dt*5);tv.rotation.y+=((reduced?0:targetX*.5)-tv.rotation.y)*smooth;tv.rotation.x+=((reduced?0:targetY*.32)-tv.rotation.x)*smooth;tv.position.x+=((reduced?0:targetX*.38)-tv.position.x)*smooth;tv.position.y+=((reduced?0:-targetY*.25)-tv.position.y)*smooth;tv.scale.setScalar(.5);camera.position.set(0,0,homeDistance);camera.lookAt(0,0,0)}else{progress+=dt/1.15;const t=Math.min(progress,1),ease=t*t*t;tv.rotation.y*=1-dt*5;tv.rotation.x*=1-dt*5;tv.position.multiplyScalar(1-dt*5);camera.position.set(0,0,homeDistance-(homeDistance-1.1)*ease);camera.lookAt(0,0,0);canvas.style.opacity=String(1-Math.max(0,(t-.7)/.3));if(t>=1){showGallery();canvas.style.opacity='1'}}if(bouncingText&&!reduced){bounce.x+=bounce.vx*dt;bounce.y+=bounce.vy*dt;if(Math.abs(bounce.x)>=bounce.limitX){bounce.x=THREE.MathUtils.clamp(bounce.x,-bounce.limitX,bounce.limitX);bounce.vx*=-1}if(Math.abs(bounce.y)>=bounce.limitY){bounce.y=THREE.MathUtils.clamp(bounce.y,-bounce.limitY,bounce.limitY);bounce.vy*=-1}bouncingText.position.set(bounce.x,bounce.y+.14,1.14)}renderer.render(scene,camera)}
window.addEventListener('resize',resize);
try{init()}catch(error){console.error(error);canvas.hidden=true;$('#fallback').hidden=false}
