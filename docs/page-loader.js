(() => {
 const overlay=document.querySelector('#page-loader'),letters=[...overlay.querySelectorAll('.loader-letter')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const target='mrk',symbols='abcdefghijklmnopqrstuvwxyz0123456789#$%&*+?';
 let timer,finished=false;const start=performance.now();
 let resolveLogo;const logoReady=new Promise(resolve=>resolveLogo=resolve);
 function scramble(){
  const elapsed=performance.now()-start;
  letters.forEach((letter,index)=>letter.textContent=reduced||elapsed>=450+index*220?target[index]:symbols[Math.floor(Math.random()*symbols.length)]);
  if(reduced||elapsed>=890){clearInterval(timer);resolveLogo()}
 }
 scramble();if(!reduced)timer=setInterval(scramble,65);
 window.mrkLoader={async complete(){
  if(finished)return;finished=true;await logoReady;
  const hero=document.querySelector('#hero');
  overlay.classList.add('is-loaded');if(hero){hero.inert=false;hero.removeAttribute('aria-busy')}
  await new Promise(resolve=>setTimeout(resolve,reduced?0:450));overlay.remove();
 }};
})();
