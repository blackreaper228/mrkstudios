const finePointer=matchMedia('(hover:hover) and (pointer:fine)');
const dot=document.createElement('div');dot.className='pointer-dot';dot.setAttribute('aria-hidden','true');document.body.append(dot);
function setPointerEnabled(){document.body.classList.toggle('dot-cursor',finePointer.matches);dot.classList.remove('visible')}
setPointerEnabled();finePointer.addEventListener('change',setPointerEnabled);
document.addEventListener('pointermove',e=>{
 if(!finePointer.matches||e.pointerType==='touch')return;
 dot.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;
 dot.classList.add('visible');
 const target=e.target instanceof Element?e.target:null;
 const control=target?.closest('a[href],button,[role="button"],input,select,textarea,summary,[data-clickable]');
 const inactive=control?.matches(':disabled,[aria-disabled="true"],.film,.carousel-title[data-slot="0"]');
 const clickable=control&&!inactive&&(control.id!=='tv'||control.style.cursor==='pointer');
 dot.classList.toggle('clickable',Boolean(clickable));
 const special=document.querySelector('#custom-cursor.active');
 dot.classList.toggle('suppressed',Boolean(special));
});
const special=document.querySelector('#custom-cursor');
if(special)new MutationObserver(()=>dot.classList.toggle('suppressed',special.classList.contains('active'))).observe(special,{attributes:true,attributeFilter:['class']});
document.addEventListener('pointerleave',()=>dot.classList.remove('visible'));
window.addEventListener('blur',()=>dot.classList.remove('visible'));
