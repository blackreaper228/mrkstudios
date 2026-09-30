import {loadMenu} from './menu-content.js?v=20260930-cms';
import {fadeToWhite} from './page-transition.js?v=20260930-keep-navigation';
import './pointer.js?v=20260930-gallery-links';
import './text-hover.js?v=20260930-static-titles';
const menu = document.querySelector('.menu-toggle');
const dropdown = document.querySelector('#category-menu');
const menuGroup=menu.closest('.menu-group');
function openMenu(){menu.setAttribute('aria-expanded','true');dropdown.hidden=false}
function closeMenu(){menu.setAttribute('aria-expanded','false');dropdown.hidden=true}
menuGroup.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')openMenu()});
menuGroup.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')closeMenu()});
menuGroup.addEventListener('focusin',()=>{if(matchMedia('(hover:hover) and (pointer:fine)').matches)openMenu()});
menuGroup.addEventListener('focusout',e=>{if(!menuGroup.contains(e.relatedTarget))closeMenu()});
menu.addEventListener('click',()=>{
 if(matchMedia('(hover:hover) and (pointer:fine)').matches){openMenu();return}
 if(dropdown.hidden)openMenu();else closeMenu();
});

document.addEventListener('click', e => { if (!e.target.closest('nav')) closeMenu(); });
document.addEventListener('keydown', e => {
 if (e.key === 'Escape' && !dropdown.hidden) { e.stopImmediatePropagation(); closeMenu(); menu.focus(); }
}, true);
for (const link of dropdown.querySelectorAll('a')) {
 if (link.getAttribute('href') === `${document.body.dataset.category}.html`) link.setAttribute('aria-current', 'page');
}
function clock() {
 const now = new Date(); const time = document.querySelector('#local-time');
 time.textContent = now.toLocaleTimeString('en-GB', {hour12: false}); time.dateTime = now.toISOString();
}
document.querySelector('#location').textContent = (Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop() || 'local').replaceAll('_', ' ');
clock(); setInterval(clock, 1000);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let leaving = false;
const logoHome=Boolean(document.querySelector('#hero'));
document.querySelector('.navigation .logo').href=new URL(logoHome?'index.html':'index.html#photos',import.meta.url).href;
document.querySelector('.navigation .logo').setAttribute('aria-label',logoHome?'mrk — back to television':'mrk — selected photographs');
document.addEventListener('click',async e=>{
 if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 const link=e.target.closest('a[href]');if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
 const destination=new URL(link.href,location.href);
 if(!['http:','https:'].includes(destination.protocol)||destination.origin!==location.origin)return;
 const restartsHome=link.classList.contains('logo')&&document.body.classList.contains('gallery-open');
 if(destination.pathname===location.pathname&&destination.search===location.search&&destination.hash===location.hash&&!restartsHome)return;
 if(destination.pathname===location.pathname&&destination.search===location.search&&destination.hash&& !link.classList.contains('logo'))return;
 e.preventDefault();if(leaving)return;leaving=true;closeMenu();
 const loaderPage=new URL('index.html',import.meta.url);
 const returnsToLoader=Boolean(document.querySelector('#gallery'))&&destination.pathname===loaderPage.pathname&&destination.hash!=='#photos';
 await fadeToWhite(returnsToLoader?'#000':'#fff');
 if(restartsHome&&destination.href===location.href)location.reload();else location.assign(destination.href);
});
window.addEventListener('pageshow', () => { document.body.classList.remove('page-leaving');document.querySelectorAll('.home-blackout').forEach(overlay=>overlay.remove()); leaving = false; });

const header=document.querySelector('.navigation');
if(document.body.classList.contains('category-page')){
 let anchorY=Math.max(0,window.scrollY),scrollFrame=0;
 function updateScrollNavigation(){
  scrollFrame=0;
  const maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  const y=Math.max(0,Math.min(window.scrollY,maxY)),delta=y-anchorY;
  if(y<=12){header.classList.remove('is-scroll-hidden');anchorY=y;return}
  if(Math.abs(delta)<8)return;
  const hide=delta>0;
  header.classList.toggle('is-scroll-hidden',hide);
  if(hide)closeMenu();
  anchorY=y;
 }
 window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScrollNavigation)},{passive:true});
 header.addEventListener('focusin',()=>{header.classList.remove('is-scroll-hidden');anchorY=Math.max(0,window.scrollY)});
 window.addEventListener('pageshow',()=>{header.classList.remove('is-scroll-hidden');anchorY=Math.max(0,window.scrollY)});
}

loadMenu().then(items=>{
 const existing=new Map([...dropdown.querySelectorAll('a')].map(link=>[new URL(link.href).pathname.split('/').pop().replace(/\.html$/,''),link]));
 const main=document.createDocumentFragment(),secondary=document.createElement('div');secondary.className='menu-secondary';
 for(const item of items){
  const link=existing.get(item.page);if(!link)continue;
  link.textContent=item.label;link.href=new URL(item.page+'.html',import.meta.url).href;
  (item.secondary?secondary:main).append(link);
  const current=location.pathname.split('/').pop().replace(/\.html$/,'');
  if(current===item.page){
   const heading=document.querySelector('.category-content>h1,.placeholder-content>h1');if(heading)heading.textContent=item.label;
   document.title=item.label+' — mrk';
   document.querySelector('.media-grid')?.setAttribute('aria-label',item.label+' gallery');
  }
 }
 if(secondary.children.length)main.append(secondary);dropdown.replaceChildren(main);
}).catch(error=>console.warn('Menu content unavailable; using default navigation.',error));
