import {sceneData} from './scene-data.js';
export const CORE_IDS=['in-good-co','recordbar','mod','third-place-lounge'];
export function allFourAccess(property){
  const routes=CORE_IDS.map(id=>property.walks.find(r=>r.destinationId===id&&Number.isFinite(r.minutes)&&r.minutes>0&&r.url&&r.checked&&r.origin?.coordinates&&r.geometry?.coordinates?.length>1));
  if(routes.some(r=>!r))return {minutes:null,withinFive:null,known:routes.filter(Boolean).length};
  const minutes=Math.max(...routes.map(r=>r.minutes));
  return {minutes,withinFive:routes.every(r=>r.minutes<=5),known:4};
}
export function compareAllFour(a,b){return (allFourAccess(a).minutes??Infinity)-(allFourAccess(b).minutes??Infinity)||a.name.localeCompare(b.name);}
export function allFourLabel(p){const a=allFourAccess(p);return a.minutes===null?`Access to all four unknown (${a.known}/4 routes)`:`${a.withinFive?'All four within five minutes · ':''}Longest walk to the four: ${a.minutes} min`;}
export function eventStatus(e,today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'})){
  if(!e.date||e.dateConfidence==='unknown')return 'Date unresolved';
  const qualifier=e.dateConfidence==='inferred'?' · year inferred':e.dateConfidence==='note'?' · note-only, confirm listing':'';
  return ((e.endDate||e.date)<today?'Past event':e.date>today?'Upcoming advertisement':'Current advertised date/range')+qualifier;
}
const text=(parent,tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;parent.append(n);return n;};
const link=(parent,url,label)=>{const a=text(parent,'a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function eventCard(e,suggested=false){
  const card=document.createElement('article');card.className='scene-event';card.dataset.eventId=e.id;
  if(e.image){const a=link(card,e.image,'');a.className='scene-flyer-link';a.setAttribute('aria-label',`Open full crop: ${e.name}`);const img=document.createElement('img');img.src=e.image;img.alt=`${e.name} flyer. Readable event information follows.`;img.loading='lazy';img.className='scene-flyer';a.append(img);}
  const copy=document.createElement('div');copy.className='scene-event-copy';card.append(copy);
  text(copy,'p',(suggested?'Possible venue match · ':'')+eventStatus(e),'scene-status');
  text(copy,'h4',e.name);text(copy,'p',e.dateLabel,'scene-date');
  text(copy,'p',e.lineup);text(copy,'p',e.music);
  if(e.postAudio)text(copy,'p',`Post audio: ${e.postAudio}. Not an additional billed act.`,'small muted');
  text(copy,'p',e.uncertainty,'small scene-uncertainty');
  text(copy,'p',`${e.priority?e.priority+' · ':''}Upload: ${e.uploadDate||'unknown'} · ${e.batches.join(' + ')}${e.postDate?' · Post: '+e.postDate:''}${e.noteDate?' · Note: '+e.noteDate:''}`,'small muted');
  text(copy,'p',`${e.id} · ${e.evidence||'Source note; original flyer unavailable.'}`,'small muted');
  if(e.image)link(copy,e.image,'View source flyer crop');
  return card;
}
export function venueContent(place,guide={}){
  const root=document.createElement('section');root.className='scene-venue';root.dataset.venueId=place.id;
  text(root,'h3',place.name);text(root,'p',`${place.address} · ${place.id==='ul'?'Neighborhood unverified (older Downtown Loop suggestion)':place.neighborhood||'Neighborhood unverified'}`);
  text(root,'p',CORE_IDS.includes(place.id)?'One of the four priority anchors':'Additional destination · not a priority anchor','scene-status');
  const events=sceneData.events.filter(e=>e.venueId===place.id).sort((a,b)=>(a.priority?0:1)-(b.priority?0:1)||(b.date||'').localeCompare(a.date||''));
  const possible=sceneData.events.filter(e=>e.suggestedVenueId===place.id);
  if(events.length){text(root,'h4',`${events.length} saved event${events.length===1?'':'s'} / programs`);root.append(eventCard(events[0]));if(events.length>1){const gallery=document.createElement('details');gallery.className='scene-gallery';text(gallery,'summary',`More events and flyers (${events.length-1})`);for(const e of events.slice(1))gallery.append(eventCard(e));root.append(gallery);}}
  for(const e of possible){text(root,'h4','Unconfirmed event association');root.append(eventCard(e,true));}
  if(!events.length&&!possible.length)text(root,'p','No distinct event flyer in the reviewed Scene material.');
  text(root,'p',sceneData.placeNotes[place.id]||guide.description||place.note||'Saved destination. Check current programming.');
  if(guide.source||place.source)link(root,guide.source||place.source,'Venue source / current information');
  if(place.id==='outsiders-social-club'){link(root,'https://www.theosc.co/membership','24-hour membership details');link(root,'https://www.theosc.co/visit','Visitor hours');}
  text(root,'p',`Locations and Scene evidence checked ${sceneData.checked}. Listings can change; check before visiting.`,'small muted');
  return root;
}
export function appendSceneGuide(container,places,guides,onShow){
  text(container,'p',sceneData.batchNote,'small muted');
  const wanted=new Set([...CORE_IDS,...sceneData.events.flatMap(e=>[e.venueId,e.suggestedVenueId]).filter(Boolean)]);
  for(const place of places.filter(p=>wanted.has(p.id))){
    const section=document.createElement('details');section.className='scene-guide-place';
    text(section,'summary',`${place.name} · ${place.id==='ul'?'Location unresolved':place.neighborhood||'Area unresolved'}${CORE_IDS.includes(place.id)?' · Priority anchor':''}`);
    section.append(venueContent(place,guides[place.id]));
    if(place.coordinates){const b=text(section,'button','Show venue on map');b.type='button';b.onclick=()=>onShow(place);}
    container.append(section);
  }
  const unresolved=document.createElement('details');unresolved.className='scene-guide-place';text(unresolved,'summary','Unresolved locations and source gaps');
  for(const e of sceneData.events.filter(e=>!e.venueId&&!e.suggestedVenueId))unresolved.append(eventCard(e));
  const list=document.createElement('ul');for(const s of sceneData.unresolved)text(list,'li',s);unresolved.append(list);container.append(unresolved);
}
