import './pointer.js?v=20260930-inversion';
import './text-hover.js?v=20260930-roll';
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
document.querySelectorAll('.navigation a[href$=".html"], .navigation a.credits-menu-link, .site-footer a').forEach(link => link.addEventListener('click', async e => {
 if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
 e.preventDefault(); if (leaving) return; leaving = true; closeMenu();
 const isLogo=link.classList.contains('logo');
 const home = isLogo && document.querySelector('#hero');
 if(isLogo&&!home){
  const blackout=document.createElement('div');blackout.className='home-blackout';blackout.setAttribute('aria-hidden','true');document.body.append(blackout);
  // Separate frames ensure the browser paints the transparent starting state.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  blackout.classList.add('visible');
  await new Promise(resolve=>setTimeout(resolve,reduced?0:420));
  location.assign(link.href);return;
 }
 document.body.classList.add('page-leaving');
 await new Promise(resolve => setTimeout(resolve, reduced ? 0 : 180));
 if (home) {
  document.dispatchEvent(new Event('home:return'));
  document.body.classList.remove('page-leaving'); leaving = false;
 } else location.assign(link.href);
}));
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
