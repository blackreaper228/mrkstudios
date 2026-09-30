(() => {
 const overlay=document.querySelector('#page-loader'),letters=[...overlay.querySelectorAll('.loader-letter')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const target='mrk',symbols='abcdefghijklmnopqrstuvwxyz0123456789#$%&*+?';
 let timer,completion,assemblyStart=null;
 function scramble(){
  const elapsed=assemblyStart===null?0:performance.now()-assemblyStart;
  letters.forEach((letter,index)=>{
   letter.textContent=reduced||(assemblyStart!==null&&elapsed>=180+index*220)?target[index]:symbols[Math.floor(Math.random()*symbols.length)];
  });
 }
 scramble();if(!reduced)timer=setInterval(scramble,65);
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 window.mrkLoader={complete(){
  if(completion)return completion;
  completion=(async()=>{
   assemblyStart=performance.now();
   if(!reduced)await wait(700);
   clearInterval(timer);letters.forEach((letter,index)=>letter.textContent=target[index]);
   await wait(2000);
   const hero=document.querySelector('#hero');
   // Await the compositor animation itself, rather than removing on a timer.
   if(!reduced){
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const fade=overlay.animate([{opacity:1},{opacity:0}],{duration:1100,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
    await fade.finished;
   }
   overlay.remove();if(hero){hero.inert=false;hero.removeAttribute('aria-busy')}
  })();
  return completion;
 }};
})();
