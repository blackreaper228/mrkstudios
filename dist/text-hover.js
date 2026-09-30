function addTextRoll(root=document){
 for(const element of root.querySelectorAll('a,button')){
  if(element.classList.contains('logo')||element.classList.contains('carousel-title')||element.children.length||!element.textContent.trim())continue;
  if(!getComputedStyle(element).fontFamily.toLowerCase().includes('ibm plex mono'))continue;
  const text=element.textContent,label=document.createElement('span'),track=document.createElement('span'),copy=document.createElement('span');
  label.className='roll-label';track.className='roll-label-track';copy.className='roll-label-copy';copy.setAttribute('aria-hidden','true');
  track.append(document.createTextNode(text));copy.textContent=text;track.append(copy);label.append(track);element.replaceChildren(label);
 }
}
addTextRoll();
new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&!node.classList?.contains('roll-label'))))addTextRoll()}).observe(document.body,{childList:true,subtree:true});
