export const usesDeviceTilt=matchMedia('(pointer: coarse)').matches;
const listeners=new Set();
let baseline=null,started=false,button;
const clamp=value=>Math.max(-1,Math.min(1,value));
export function orientationOffset(beta,gamma,base,angle=0){
 const pitch=((beta-base.beta+540)%360)-180,roll=gamma-base.gamma;
 const radians=angle*Math.PI/180;
 return {x:clamp((roll*Math.cos(radians)+pitch*Math.sin(radians))/25),y:clamp((pitch*Math.cos(radians)-roll*Math.sin(radians))/25)};
}
function emit(value){for(const listener of listeners)listener(value)}
function start(){
 if(started)return;started=true;
 window.addEventListener('deviceorientation',event=>{
  if(document.hidden||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
  baseline??={beta:event.beta,gamma:event.gamma};
  emit(orientationOffset(event.beta,event.gamma,baseline,screen.orientation?.angle??window.orientation??0));
 },{passive:true});
 const reset=()=>{baseline=null;emit({x:0,y:0})};
 screen.orientation?.addEventListener('change',reset);
 window.addEventListener('orientationchange',reset);
 document.addEventListener('visibilitychange',reset);
}
export function subscribeDeviceTilt(listener){
 listeners.add(listener);
 if(!usesDeviceTilt||matchMedia('(prefers-reduced-motion: reduce)').matches||!window.isSecureContext||!window.DeviceOrientationEvent)return;
 if(typeof DeviceOrientationEvent.requestPermission!=='function'){start();return}
 if(button||started)return;
 button=document.createElement('button');button.type='button';button.className='device-tilt-enable';button.textContent='Enable motion';button.setAttribute('aria-label','Enable tilt using device motion');document.body.append(button);
 button.addEventListener('click',async event=>{
  event.stopPropagation();
  try{const permission=await DeviceOrientationEvent.requestPermission();
   if(permission==='granted'){baseline=null;start();button.remove()}
   else{button.textContent='Motion disabled';button.disabled=true}
  }catch(error){console.warn('Device tilt unavailable',error);button.textContent='Motion unavailable';button.disabled=true}
 });
}
