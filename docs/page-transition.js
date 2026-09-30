const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let transition;
export function fadeToWhite(color='#fff'){
 if(transition)return transition;
 document.body.classList.toggle('white-page-transition',color==='#fff');
 const overlay=document.createElement('div');overlay.className='home-blackout';overlay.style.background=color;overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
 transition=overlay.animate([{opacity:0},{opacity:1}],{duration:reduced?0:350,easing:'ease-in-out',fill:'forwards'}).finished;
 return transition;
}
window.addEventListener('pageshow',()=>{document.querySelectorAll('.home-blackout').forEach(overlay=>overlay.remove());document.body.classList.remove('white-page-transition');transition=null});
