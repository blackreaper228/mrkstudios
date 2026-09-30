import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
const $=s=>document.querySelector(s),hero=$('#hero'),gallery=$('#gallery'),canvas=$('#tv');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const characterScale=8.5;
let neckBone,headBone,torsoBone,televisionModel;
let homeDistance=9,modelReady=false,screenContext,screenTexture,logoArtwork;
let introProgress=1;
const screenCanvas=document.createElement('canvas');screenCanvas.width=1024;screenCanvas.height=776;
let renderer,scene,camera,tv,mode='hero',progress=0,last=0,raf,targetX=0,targetY=0;
const screenHalf={x:1.54,y:1.45},textHalf={x:.74,y:.33};
const bounce={x:.18,y:.16,vx:.44,vy:.31,limitX:screenHalf.x-textHalf.x,limitY:screenHalf.y-textHalf.y};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),screenFocus=new THREE.Vector3();
function openGallery(){if(mode!=='hero'||(!modelReady&&renderer))return;mode='entering';progress=0;hero.classList.add('entering');if(reduced||!renderer)showGallery();}
function showGallery(){mode='gallery';document.body.classList.add('gallery-open');hero.hidden=true;gallery.hidden=false;requestAnimationFrame(()=>{gallery.classList.add('visible');$('#gallery-title').focus({preventScroll:true})});window.scrollTo(0,0);document.dispatchEvent(new Event('films:open'))}
function back(){if(mode==='hero')return;mode='hero';document.dispatchEvent(new Event('films:close'));document.body.classList.remove('gallery-open');progress=0;gallery.classList.remove('visible');gallery.hidden=true;hero.hidden=false;hero.classList.remove('entering');canvas.style.opacity='1';targetX=targetY=0;if(tv){tv.rotation.set(0,0,0);tv.position.set(0,0,0);for(const bone of [neckBone,headBone,torsoBone])bone?.quaternion.identity()};introProgress=reduced?1:0;hero.animate([{opacity:0},{opacity:1}],{duration:reduced?0:420,easing:'ease-out'});window.scrollTo(0,0);if(camera)camera.position.set(0,0,homeDistance);resize();canvas.focus({preventScroll:true})}
$('#fallback-open').onclick=openGallery;
document.addEventListener('home:return',back);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode==='gallery'&&!document.querySelector('dialog[open]'))back()});
canvas.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGallery()}};
async function loadTelevision(){
 const loader=new GLTFLoader();
 const [person,television]=await Promise.all([
  loader.loadAsync(new URL('assets/person-rig.glb?v=apose-original-1',import.meta.url).href),
  loader.loadAsync(new URL('assets/old_tv.glb',import.meta.url).href)
 ]);
 const body=person.scene,model=television.scene;televisionModel=model;
 neckBone=body.getObjectByName('Neck');headBone=body.getObjectByName('Head');torsoBone=body.getObjectByName('Torso');
 if(!neckBone||!headBone)throw new Error('Character neck rig missing');
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const modelScale=.30/size.x;
 model.scale.multiplyScalar(modelScale);
 model.position.set(-center.x*modelScale,-box.min.y*modelScale,-center.z*modelScale);
 headBone.add(model);
 body.position.y=-(1.625+size.y*modelScale/2);
 tv.add(body);tv.scale.setScalar(characterScale);tv.updateMatrixWorld(true);
 let screen;
 model.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=false;mesh.receiveShadow=false;if(mesh.material?.name==='Glass')screen=mesh}});
 if(!screen)throw new Error('Television screen not found');
 // Original TV geometry and texture data stay intact; only its glass gets the idle artwork.
 const geometry=screen.geometry.clone();geometry.computeBoundingBox();const bounds=geometry.boundingBox;
 const position=geometry.attributes.position,uv=new Float32Array(position.count*2);
 for(let i=0;i<position.count;i++){uv[i*2]=(position.getX(i)-bounds.min.x)/(bounds.max.x-bounds.min.x);uv[i*2+1]=(position.getZ(i)-bounds.min.z)/(bounds.max.z-bounds.min.z)}
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));screen.geometry=geometry;
 const screenBounds=new THREE.Box3().setFromObject(screen);screenBounds.getCenter(screenFocus);tv.worldToLocal(screenFocus);
 screenContext=screenCanvas.getContext('2d');screenTexture=new THREE.CanvasTexture(screenCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;
 screen.material=new THREE.MeshBasicMaterial({map:screenTexture,side:THREE.DoubleSide,toneMapped:false});
 createLogoArtwork();document.fonts.load('96px "Instrument Serif"').then(()=>{createLogoArtwork();updateScreen()});
 updateScreen();
 await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
 modelReady=true;canvas.dataset.model='tv-person-neck-rig';
 const hasLoader=Boolean(document.querySelector('#page-loader'));
 introProgress=hasLoader||reduced?1:0;
 camera.position.set(0,0,homeDistance);renderer.render(scene,camera);
 await window.mrkLoader?.complete();
 if(!hasLoader)hero.animate([{opacity:0},{opacity:1}],{duration:reduced?0:450,easing:'ease-out'});
}
const lookQuaternion=new THREE.Quaternion();
function followCursor(dt,neutral=false){
 if(!headBone)return;
 const smooth=1-Math.exp(-dt*6),x=reduced||neutral?0:targetX;
 // Limit upward pitch independently: the underside must conceal the neck join.
 const cursorY=reduced||neutral?0:targetY;
 const y=cursorY<0?Math.max(cursorY,-1)*.65:Math.min(cursorY,1);
 lookQuaternion.setFromEuler(new THREE.Euler(y*.055,x*.12,-x*.008,'YXZ'));neckBone.quaternion.slerp(lookQuaternion,smooth);
 lookQuaternion.setFromEuler(new THREE.Euler(y*.20,x*.38,-x*.025,'YXZ'));headBone.quaternion.slerp(lookQuaternion,smooth);
 lookQuaternion.setFromEuler(new THREE.Euler(0,x*.009,0,'YXZ'));torsoBone.quaternion.slerp(lookQuaternion,smooth*.5);
}
function createLogoArtwork(){
 logoArtwork=document.createElement('canvas');logoArtwork.width=1024;logoArtwork.height=180;
 const ctx=logoArtwork.getContext('2d');ctx.font='400 96px "Instrument Serif", serif';ctx.fillStyle='#fff';ctx.textBaseline='middle';
 const letters=[...'mrk'],spacing=96*4,width=letters.reduce((sum,c)=>sum+ctx.measureText(c).width,0)+spacing*(letters.length-1);
 let x=(logoArtwork.width-width)/2;
 for(const letter of letters){ctx.fillText(letter,x,90);x+=ctx.measureText(letter).width+spacing}
}
function updateScreen(){
 if(!screenContext)return;const w=screenCanvas.width,h=screenCanvas.height;
 screenContext.fillStyle='#000';screenContext.fillRect(0,0,w,h);
 if(logoArtwork){const tw=w*.70,th=tw*logoArtwork.height/logoArtwork.width,lx=(w-tw)/2,ly=(h-th)/2;
 screenContext.drawImage(logoArtwork,w/2+bounce.x/bounce.limitX*lx-tw/2,h/2-bounce.y/bounce.limitY*ly-th/2,tw,th)}
 screenTexture.needsUpdate=true;
}
function hitsTelevision(){tv.updateMatrixWorld(true);return televisionModel&&raycaster.intersectObject(televisionModel,true).length>0}
function init(){
 renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(0,0,homeDistance);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x858585,2.7));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,7,6);scene.add(key);const rim=new THREE.DirectionalLight(0xffffff,1.2);rim.position.set(5,2,-3);scene.add(rim);
 tv=new THREE.Group();tv.rotation.set(0,0,0);scene.add(tv);
 loadTelevision().catch(error=>{console.error(error);canvas.hidden=true;$('#fallback').hidden=false;window.mrkLoader?.complete();renderer=null});
 canvas.addEventListener('pointermove',e=>{if(mode!=='hero')return;const r=canvas.getBoundingClientRect();targetX=(e.clientX-r.left)/r.width*2-1;targetY=(e.clientY-r.top)/r.height*2-1;pointer.set(targetX,-targetY);raycaster.setFromCamera(pointer,camera);canvas.style.cursor=hitsTelevision()?'pointer':'default'});
 canvas.addEventListener('pointerleave',()=>{targetX=targetY=0});canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));raycaster.setFromCamera(pointer,camera);if(hitsTelevision())openGallery()});
 resize();requestAnimationFrame(animate);
}
function resize(){if(!renderer||hero.hidden)return;const r=canvas.parentElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;homeDistance=Math.max(9,2.45/(2*Math.tan(THREE.MathUtils.degToRad(37/2))*camera.aspect),2.5/(2*Math.tan(THREE.MathUtils.degToRad(37/2))));camera.updateProjectionMatrix()}
function animate(now){raf=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(mode==='gallery'||document.hidden||!renderer)return;if(mode==='hero'){followCursor(dt);tv.rotation.set(0,0,0);tv.position.set(0,0,0);tv.scale.setScalar(characterScale);introProgress=Math.min(1,introProgress+dt/.6);const introEase=1-Math.pow(1-introProgress,3);camera.position.set(0,0,homeDistance*(.90+.10*introEase));camera.lookAt(0,0,0)}else{progress+=dt/1.15;const t=Math.min(progress,1),ease=t*t*t;followCursor(dt,true);const focusY=screenFocus.y*characterScale*ease;camera.position.set(0,focusY,homeDistance-(homeDistance-(screenFocus.z*characterScale+.7))*ease);camera.lookAt(0,focusY,0);canvas.style.opacity=String(1-Math.max(0,(t-.7)/.3));if(t>=1){showGallery();canvas.style.opacity='1'}}if(modelReady&&!reduced){bounce.x+=bounce.vx*dt;bounce.y+=bounce.vy*dt;if(Math.abs(bounce.x)>=bounce.limitX){bounce.x=THREE.MathUtils.clamp(bounce.x,-bounce.limitX,bounce.limitX);bounce.vx*=-1}if(Math.abs(bounce.y)>=bounce.limitY){bounce.y=THREE.MathUtils.clamp(bounce.y,-bounce.limitY,bounce.limitY);bounce.vy*=-1}updateScreen()}renderer.render(scene,camera)}
window.addEventListener('resize',resize);
try{init()}catch(error){console.error(error);canvas.hidden=true;$('#fallback').hidden=false;window.mrkLoader?.complete()}
