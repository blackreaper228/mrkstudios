const finePointer=matchMedia('(hover:hover) and (pointer:fine)');
const dot=document.createElement('div');dot.className='pointer-dot';dot.setAttribute('aria-hidden','true');document.body.append(dot);
function hidePointer(){dot.classList.remove('visible','clickable');document.querySelector('#custom-cursor')?.classList.remove('active')}
function setPointerEnabled(){document.body.classList.toggle('dot-cursor',finePointer.matches);dot.classList.remove('visible')}
setPointerEnabled();finePointer.addEventListener('change',setPointerEnabled);
document.addEventListener('pointermove',e=>{
 if(!finePointer.matches||e.pointerType==='touch')return;
 if(e.target instanceof HTMLIFrameElement){hidePointer();return;}
 dot.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;
 dot.classList.add('visible');
 const target=e.target instanceof Element?e.target:null;
 const control=target?.closest('a[href],button,[role="button"],input,select,textarea,summary,[data-clickable]');
 const inactive=control?.matches(':disabled,[aria-disabled="true"]');
 const clickable=control&&!inactive&&(control.id!=='tv'||control.style.cursor==='pointer');
 dot.classList.toggle('clickable',Boolean(clickable));
 const special=document.querySelector('#custom-cursor.active');
 dot.classList.toggle('suppressed',Boolean(special));
});
const special=document.querySelector('#custom-cursor');
if(special)new MutationObserver(()=>dot.classList.toggle('suppressed',special.classList.contains('active'))).observe(special,{attributes:true,attributeFilter:['class']});
document.addEventListener('pointerleave',()=>dot.classList.remove('visible'));
window.addEventListener('blur',()=>dot.classList.remove('visible'));

// Cross-origin players do not forward pointer movement to the parent page.
// Hide the custom circle over them; restore it on the next movement outside.
function watchPlayer(frame){
 frame.addEventListener('pointerenter',hidePointer);
 frame.addEventListener('load',()=>{if(frame.matches(':hover'))hidePointer()});
 if(frame.matches(':hover'))hidePointer();
}
document.querySelectorAll('iframe').forEach(watchPlayer);
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(!(node instanceof Element))continue;if(node.matches('iframe'))watchPlayer(node);node.querySelectorAll('iframe').forEach(watchPlayer)}}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('pointerout',event=>{if(event.relatedTarget===null||event.relatedTarget instanceof HTMLIFrameElement)hidePointer()});
