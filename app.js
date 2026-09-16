import {PRIORITY_AMENITIES, matchesPriorityAmenities} from './priority-amenities.js?v=priority-amenities-20260915-r1';
import {propertyPhotos, preferredPhotoIndex, photoSourceNote} from './property-media.js?v=monthly-fees-20260915-r1';
import {paymentStandardBadge} from './payment-standard.js?v=monthly-fees-20260915-r1';
import {amenitySummary, visibleAmenities, streetViewAction, recordedUnits, floorPlanGroups, photoScope, hasUnconfirmedTwoBedroom, selectedZipAreas, alternativeBedroom} from './presentation.js?v=priority-amenities-20260915-r1';
import {FOCUS_ZIPS, createMapBridge} from './map-bridge.js?v=priority-amenities-20260915-r1';
import {mapConfig} from './map-config.js';
import {communityReviewFor} from './community-reviews.js?v=community-review-20260916-r1';
const data=window.KCMO_MAP_DATA;
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>typeof n==='number'?'$'+n.toLocaleString('en-US',{maximumFractionDigits:0}):n?escape(n):'Unverified';
const rentLabel=n=>/conflict/i.test(String(n))?'Rent conflicting':/unverified|unknown|not found|inaccessible|^n\/a$/i.test(String(n))?'Rent unverified':money(n);
const percentage=n=>typeof n==='number'&&Number.isFinite(n)?(n*100).toFixed(1)+'%':n?escape(n):'Unverified';
const area=n=>!n?'Area unverified':Number.isFinite(Number(n))?escape(Number(n).toLocaleString('en-US'))+' sq ft':/^[\d, .–-]+$/.test(String(n))?escape(n)+' sq ft':escape(n);
const listingDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s))?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):escape(s);
const bathroomLabel=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>0?` · ${escape(value)} ${Number(value)===1?'bathroom':'bathrooms'}`:'';
function unitSummary(p,beds=1){
  const units=(p.units||[]).filter(u=>u.beds===beds);if(!units.length)return null;
  const rents=units.map(u=>u.rent).filter(Number.isFinite),sizes=units.map(u=>u.sqft).filter(Number.isFinite);
  const range=(nums,format)=>Math.min(...nums)===Math.max(...nums)?format(nums[0]):format(Math.min(...nums))+'–'+format(Math.max(...nums));
  return {price:rents.length?range(rents,money):'Rent unverified',size:sizes.length?range(sizes,n=>n.toLocaleString())+' sq ft':'Area unverified',count:units.length};
}
const priceSummary=p=>{const u=unitSummary(p);return u?`${u.price} · ${u.size} (listed options)`:`${money(p.oneBedroom.rent)} · ${area(p.oneBedroom.sqft)} (saved research)`;};
const anchor=(url,label,cls='')=>url?`<a class="${cls}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`:`<span class="unavailable">${escape(label)}<br>Not verified</span>`;
const evidenceHTML=value=>String(value??'').split(/(https?:\/\/[^\s<>|]+)/g).map(part=>/^https?:\/\//.test(part)?anchor(part.replace(/[).,;]+$/, ''),'Source ↗'):escape(part)).join('');
const cores=data.places.filter(p=>p.category==='Core scene');
// Explanatory UI copy only; property facts and decisions still come from the master export.
const placeGuides={
  'in-good-co':{short:'Cocktail lounge',description:'A membership-based cocktail lounge for drinks, music and social gatherings.',source:'https://igckc.com/',checked:'2026-09-14'},
  mod:{short:'Art & music',description:'An art gallery and event space hosting local art, bands and DJs.',source:'https://www.boommod.com/',checked:'2026-09-14'},
  recordbar:{short:'Live music',description:'A live-music venue with a calendar of concerts.',source:'https://www.therecordbar.com/',checked:'2026-09-14'},
  'third-place-lounge':{short:'Lounge',description:'A saved place for going out, with menus and small-event rentals on its website.',source:'https://www.thirdplacekc.com/',checked:'2026-09-14'}
};
const iconPaths={home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',nightlife:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',library:'<path d="M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2v15"/>',coffee:'<path d="M3 8h14v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5ZM17 9h2a3 3 0 1 1 0 6h-2M7 2v3M12 2v3"/>'};
Object.assign(iconPaths,{food:'<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v19M17 3v19M17 3c4 3 4 8 0 9"/>',streetcar:'<rect x="5" y="4" width="14" height="15" rx="3"/><path d="M8 1h8M12 1v3M5 12h14M8 16h.01M16 16h.01M8 19l-2 3m10-3 2 3"/>'});
const icon=kind=>`<svg class="place-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[kind]||iconPaths.nightlife}</svg>`;
const placeKind=p=>p.category==='Library'?'library':p.category==='Coffee'?'coffee':'nightlife';
const categoryLabel=p=>({library:'Library',coffee:'Coffee shop',nightlife:'Nightlife / events'})[placeKind(p)];
const friendlyFact=s=>s==='Your overall ZIP rank'?'My preference ranking (not chosen yet)':s==='Exact building coordinates'?'Exact address / map pin':s;
const readableCopy=s=>String(s??'').replace(/core[- ]venue/gi,'nearby nightlife').replace(/core scene/gi,'nearby nightlife').replace(/scene access/gi,'access to nightlife').replace(/\bscenes?\b/gi,'nightlife');
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?0:600;
const zipColors={'64105':'#886e59','64106':'#636a99','64108':'#225f80','64109':'#536f59'};
const zipCodes=[...FOCUS_ZIPS];
$('.zip-filters').innerHTML='<legend>Show apartments in ZIP</legend>'+zipCodes.map(zip=>`<label><input type="checkbox" value="${escape(zip)}" checked><span class="zip-dot" style="background:${zipColors[zip]||'#225f80'}" aria-hidden="true"></span>${escape(zip)} <small id="zip-count-${escape(zip)}"></small></label>`).join('');
const state={zips:new Set(zipCodes),destination:'in-good-co',sort:'walk',search:'',priorityAmenities:new Set(),selected:null,compare:new Set(),draftRanks:new Map(),threeD:true,comparing:false,view:'map',preview:false,detailOpen:false,unitChoices:new Map(),overlay:null};
const gallery={propertyId:null,index:0,opener:null,openerSelector:null,touch:null};
let carouselPropertyId=null,carouselFrame=0;
let mapReady=false,mountedMap=null,rankService=false,mapSyncPending=false;
const mapAbort=new AbortController();
const lookup=id=>data.properties.find(p=>p.id===id);
const currentRoute=p=>state.destination==='nearest'?p.nearest:p.walks.find(r=>r.destinationId===state.destination)||null;
const activeDestination=p=>cores.find(v=>v.id===(currentRoute(p)?.destinationId||state.destination))||cores[0];
const headline=p=>{const r=currentRoute(p);return r?`${r.minutes}-minute walk to ${r.destination}`:`Walk to ${activeDestination(p)?.name||'nearby nightlife'} unverified`;};
const currentRank=p=>state.draftRanks.has(p.id)?state.draftRanks.get(p.id):p.overallRank;
function transitExplanation(p,route){
  if(route&&route.minutes<=12)return 'This is a short walk. Waiting for a Streetcar can take longer than walking directly.';
  const t=route?.transit;
  if(t)return `<strong>Illustrative ${t.totalBeforeWait}–${t.totalBeforeWait+18} minutes to ${escape(route.destination)}</strong>, including 0–18 minutes waiting.<br>${anchor(t.first.url,t.first.minutes+'-minute walk')} to ${escape(t.boarding)} → shortest published ride ${t.rideMinutes} min → ${escape(t.exit)} → ${anchor(t.last.url,t.last.minutes+'-minute walk to '+route.destination)}.<br>Measured walking legs + agency schedule, checked ${escape(t.checked)}. This is one Streetcar option, not a live or fastest-route promise. Traffic and disruptions can add time. ${anchor(t.source,'Schedule source')}`;
  return p.nearestStop?`Nearest stop by straight-line distance: ${escape(p.nearestStop.name)} (${Math.round(p.nearestStop.straightMetres/10)*10} m). This is not a measured walk to the platform. Door-to-door transit time is unverified.`:'Transit access is unverified until the building address is resolved.';
}
const missing=p=>p.missingFacts.filter(f=>f!=='Your overall ZIP rank'||!currentRank(p));
const showToast=text=>{const el=$('#toast');el.textContent=text;el.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.hidden=true,6500);};
const matchesPropertyFilters=p=>matchesPriorityAmenities(p,state.priorityAmenities)&&(!state.search||[p.name,p.neighborhood,p.address].join(' ').toLowerCase().includes(state.search));
const visible=()=>data.properties.filter(p=>state.zips.has(p.zip)&&matchesPropertyFilters(p)).sort((a,b)=>{
  if(state.sort==='name')return a.name.localeCompare(b.name);
  if(state.sort==='overall')return a.zip.localeCompare(b.zip)||(currentRank(a)??Infinity)-(currentRank(b)??Infinity)||a.name.localeCompare(b.name);
  const ar=state.sort==='cluster'?a.nearest:currentRoute(a),br=state.sort==='cluster'?b.nearest:currentRoute(b);
  return (ar?.minutes??Infinity)-(br?.minutes??Infinity)||(ar?.metres??Infinity)-(br?.metres??Infinity)||a.name.localeCompare(b.name);
});
function photoRecord(p){
  const photos=propertyPhotos(p),record=photos[preferredPhotoIndex(photos,chosenUnit(p))];
  return record?{...p,photo:record.url,photoCaption:record.caption,photoSource:record.source,photoLabel:record.scope}:p;
}
const displayPhotoScope=p=>photoRecord(p).photoLabel||photoScope(photoRecord(p));
function photo(p,cls='thumb'){
  const media=photoRecord(p);
  return media.photo?`<img class="${cls}" src="${escape(media.photo)}" alt="${escape(p.name)} — ${escape(displayPhotoScope(p))}" loading="lazy" referrerpolicy="no-referrer">`:`<div class="${cls} photo-empty">Photo<br>not verified</div>`;
}
function standardBadge(p){
  const badge=paymentStandardBadge(p,chosenUnit(p));
  return `<span class="standard-badge" title="${escape(badge.description)}"><span>% of Std · est.</span><strong>${escape(badge.value)}</strong><small>${escape(badge.shortBasis)}</small><span class="sr-only">${escape(badge.description)}</span></span>`;
}
function handleImages(root=document){root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{const box=document.createElement('div');box.className=img.className+' photo-empty';box.textContent='Photo unavailable — open the source gallery';img.replaceWith(box);},{once:true}));}
const amenityKeys = [['laundry','Laundry'],['cooling','Cooling'],['gym','Gym'],['pool','Pool']];
const extraFacts = [['finishes','Finishes'],['sunlight','Sunlight'],['entrance','Street entrance']];
const chosenUnit = p => (p.units || []).find(u => u.unit === state.unitChoices.get(p.id));
const offer = p => {
  const u = chosenUnit(p), alternative=alternativeBedroom(p), oneAbsent=p.oneBedroom.offered===false,beds=oneAbsent?alternative.beds:1,summary=unitSummary(p,beds);
  if(u) return {price:money(u.rent),facts:`${u.beds} bedroom${bathroomLabel(u.baths)} · ${area(u.sqft)}`,scope:`Apartment #${escape(u.unit)} · listed snapshot`};
  if(summary) return {price:summary.price,facts:`${beds} bedroom · ${summary.size}`,scope:`${summary.count} listed ${summary.count===1?'apartment':'apartment options'}`};
  if(oneAbsent)return {price:alternative.research.rent?rentLabel(alternative.research.rent):'Rent unverified',facts:`${alternative.beds} bedroom · ${area(alternative.research.sqft)}`,scope:'No 1-bedroom option · building research'};
  return {price:p.oneBedroom.rent?rentLabel(p.oneBedroom.rent):'Rent unverified',facts:p.oneBedroom.rent||p.oneBedroom.sqft?`1 bedroom · ${area(p.oneBedroom.sqft)}`:'Bedroom mix & size unverified',scope:'Saved research · availability unverified'};
};
const amenityIcon = key => `<svg viewBox="0 0 24 24" class="place-icon" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
  laundry:'<rect x="4" y="2" width="16" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M7 6h.01M11 6h6m-9 9c3-3 5 3 8-1"/>',
  cooling:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4m10 14-1-4 4-1M4 14l4 1-1 4M17 5l-1 4 4 1"/>',
  gym:'<path d="M6 5v14M3 8v8M18 5v14M21 8v8M6 12h12"/>',
  pool:'<path d="M2 17c3-3 4 3 7 0s4 3 7 0 4 3 6 0M2 21c3-3 4 3 7 0s4 3 7 0 4 3 6 0M7 14V5a3 3 0 0 1 6 0m-1 12V5a3 3 0 0 1 6 0M7 7h5M7 11h5"/>'
}[key]}</svg>`;
function amenities(p, compact=false) {
  const shown=visibleAmenities(p);
  return `<div class="${compact?'amenity-chips':'amenity-grid'}">${shown.map(f=>`<div class="amenity ${f.status}" title="${escape(p.amenities[f.key])}">${amenityIcon(f.key)}<span>${compact?'':`<small>${f.title}</small>`}${escape(f.label)}</span></div>`).join('')}</div>`;
}
function streetViewLink(p,hero=false) {
  const action=streetViewAction(p);
  return action.url?anchor(action.url,action.label+' ↗',hero?'street-view-action glass-action':'street-view-action'):'';
}
function apartmentFacts(p) {
  const o=offer(p),units=recordedUnits(p),selected=chosenUnit(p);
  const unitRows=units.map(unit=>{const baths=bathroomLabel(unit.baths);return `<article class="recorded-unit ${selected?.unit===unit.unit?'active':''}"><${unit.structured?'button':'div'} class="unit-select" ${unit.structured?`data-unit="${escape(unit.unit)}" aria-pressed="${selected?.unit===unit.unit}"`: ''}><span><strong>Apartment #${escape(unit.unit)}</strong><span class="unit-dimensions">${unit.beds===null?'Bedroom count not recorded':unit.beds===0?'Studio':unit.beds+' bedroom'}${baths} · ${area(unit.sqft)}</span></span>${unit.structured?`<span class="unit-selection-label">${selected?.unit===unit.unit?'Selected':'Select apartment'}</span>`:''}</${unit.structured?'button':'div'}><div class="unit-record-details"><p class="unit-secondary-price">${unit.priceLabel?escape(unit.priceLabel)+': ':''}${money(unit.rent)} / month${unit.deposit?' · '+money(unit.deposit)+' deposit':''}</p><p class="small">${/^\d{4}-/.test(unit.available)?'Listed for ':''}${listingDate(unit.available)}</p><p class="small muted">Checked ${escape(unit.checked||'date not recorded')} · confirm availability with leasing.</p>${unit.source?anchor(unit.source,'Unit listing source ↗'):'<span class="small muted">Source attribution: see the recorded options below.</span>'}${!unit.structured?`<p class="small muted unit-evidence">${evidenceHTML(unit.evidence)}</p>`:''}</div></article>`}).join('');

  return `<h3 class="apartment-facts-heading">Apartment facts</h3><div class="apartment-facts-lead"><strong>${o.facts}</strong><p class="small muted">${o.scope}</p>${units.length?'':`<p class="unit-secondary-price">${o.price}${/^\$/.test(o.price)?' / month':''}</p>`}</div>${units.length?`<section class="unit-options"><h4>Recorded apartments · ${units.length}</h4>${unitRows}</section>`:''}${p.oneBedroom.evidence&&/do NOT pair|conflict/i.test(p.oneBedroom.evidence)?'<p class="warning-strip">Older rent/size values conflict with the listed apartments. Keep each apartment’s figures together; see Research for the source notes.</p>':''}<div class="primary-links">${anchor(p.links.floorplans,'Floor plans ↗')}${anchor(p.links.units,'Available units ↗')}</div>`;
}
function supplementalBedroomResearch(p) {
  const units=recordedUnits(p),groups=floorPlanGroups(p);
  const plans=groups.length?`<div class="floor-plan-groups">${groups.map(group=>`<section class="floor-plan-group"><h4>${escape(group.label)}</h4><div class="floor-plan-grid">${group.plans.map(plan=>`<article class="floor-plan-card"><h5>${escape(plan.name)}</h5><p>${area(plan.sqft)}</p><p class="small muted">From ${escape(plan.rent.replace(/\+$/,''))} / month</p></article>`).join('')}</div></section>`).join('')}<p class="small muted">Published floor plans · availability unconfirmed. Checked ${escape(groups[0].plans[0].checked)}.</p></div>`:`<div class="bedroom-research-grid">${[[1,p.oneBedroom],[2,p.twoBedroom],...(p.threeBedroom?[[3,p.threeBedroom]]:[])].filter(([beds,research])=>research.offered!==false&&!units.some(unit=>unit.beds===beds)).map(([beds,research])=>`<section class="bedroom-research"><h4>${beds}-bedroom research</h4><p>${area(research.sqft)}</p><p class="small muted">${rentLabel(research.rent)}</p>${research.evidence?`<p class="small ${beds===2&&hasUnconfirmedTwoBedroom(p)?'warning':'muted'}">${evidenceHTML(research.evidence)}</p>`:''}</section>`).join('')}</div>${p.unitOptions?`<section class="recorded-options"><h4>Recorded apartment &amp; floor-plan options</h4><p class="small muted">Saved source notes; listed units and catalog plans retain their original qualifications.</p><p class="evidence">${evidenceHTML(p.unitOptions)}</p></section>`:''}`;
  return `<section class="detail-section supplemental-bedroom-research"><h3>Bedroom &amp; floor-plan research</h3>${plans}</section>`;
}
function gettingAround(p) {
  const route=currentRoute(p),destination=activeDestination(p);
  const transit=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(p.address+', Kansas City, MO '+p.zip)}&destination=${encodeURIComponent(destination?.address+', Kansas City, MO')}&travelmode=transit`;
  return `<section class="detail-section compact-access"><h3>Getting around</h3><div class="destination-hero"><p class="eyebrow">Selected destination</p><h4>${escape(destination?.name||'Nearby destinations')}</h4><p class="small muted">${escape(placeGuides[destination?.id]?.short||'Saved destination')} · ${escape(destination?.address||'')}</p><div class="destination-walk"><strong>${route?route.minutes+' min walk':'Walking time unverified'}</strong>${route?anchor(route.url,'Walking route ↗','walk-link'):''}</div><p class="small muted">${route?`${route.metres.toLocaleString()} m · checked ${escape(route.checked)}. Crossings and walking pace can change the time. ${route.origin?.source?escape(route.origin.scope):''}`:'No measured route stored for this destination.'}</p><div class="getting-around-actions"><button class="show-on-map" ${p.coordinates?'':'disabled'}>Show on map</button></div></div><details class="other-walks"><summary>Other destinations &amp; Streetcar</summary>${cores.map(v=>{const r=p.walks.find(w=>w.destinationId===v.id);return `<button class="travel-row ${destination?.id===v.id?'active':''}" data-destination="${v.id}" aria-pressed="${destination?.id===v.id}"><span>${escape(v.name)}<small>${escape(placeGuides[v.id]?.short||'Nightlife')} · ${escape(v.address)}</small></span><strong>${r?r.minutes+' min walk':'Unverified'}</strong></button>`;}).join('')}<p class="transit-note">${transitExplanation(p,route)}</p><p class="small">Recorded Streetcar hours: midnight Sun–Thu and 1am Fri–Sat. Check the last departure and plan a walk or rideshare after service ends. ${anchor(data.geography.streetcar.hoursSource,'Check official hours')} · ${anchor(transit,`Live transit to ${destination?.name}`)}</p><details class="route-method"><summary>How walking times are estimated</summary><p class="small muted">${escape(route?.method||'The destination, route button and walking order use the same saved pedestrian route.')} Crossings, closures, accessibility and personal pace have not been checked on foot.</p></details></details></section>`;
}

function walkLine(p, link=false) {
  const route=currentRoute(p);
  return `<div class="walk-line"><span><strong>${escape(headline(p))}</strong>${route?'<small>Pedestrian estimate</small>':''}</span>${link&&route?anchor(route.url,'Route ↗','walk-link'):''}</div>`;
}
const priorityIcons={
  pool:'<path d="M2 17c3-3 4 3 7 0s4 3 7 0 4 3 6 0M2 21c3-3 4 3 7 0s4 3 7 0 4 3 6 0M7 14V5a3 3 0 0 1 6 0m-1 12V5a3 3 0 0 1 6 0M7 7h5M7 11h5"/>',
  rooftop:'<path d="M3 11h18M5 11v10h14V11M8 21v-5h3v5M4 11V7m5 4V7m6 4V7m5 4V7M4 7h16M8 3h8"/>',
  patio:'<path d="M12 3 2 10h20L12 3Zm0 7v11M8 21h8M2 15h5v6m15-6h-5v6M2 12v5m20-5v5"/>',
  gym:'<path d="M6 5v14M3 8v8M18 5v14M21 8v8M6 12h12"/>'
};
$('#priority-amenity-chips').innerHTML=PRIORITY_AMENITIES.map(({key,label})=>`<button type="button" class="priority-chip" data-priority-amenity="${key}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${priorityIcons[key]}</svg>${label}<span class="priority-check" aria-hidden="true">✓</span></button>`).join('');
function syncPriorityControls(){
  document.querySelectorAll('[data-priority-amenity]').forEach(button=>button.setAttribute('aria-pressed',String(state.priorityAmenities.has(button.dataset.priorityAmenity))));
  $('#clear-property-filters').hidden=!state.priorityAmenities.size&&!state.search&&state.zips.size===zipCodes.length;
  const count=state.priorityAmenities.size+Number(Boolean(state.search))+Number(state.zips.size!==zipCodes.length);
  $('#active-filter-count').textContent=String(count);$('#active-filter-count').hidden=count===0;
  $('#more-options').setAttribute('aria-label',`More options${count?`, ${count} active property ${count===1?'filter':'filters'}`:''}`);
  $('#active-filter-summary').textContent=count?`${count} active property ${count===1?'filter':'filters'} · amenities match all`:'No property filters selected';
  $('#options-clear').disabled=count===0;
}
function togglePriorityAmenity(key){
  if(!PRIORITY_AMENITIES.some(item=>item.key===key))return;
  if(state.priorityAmenities.has(key))state.priorityAmenities.delete(key);else state.priorityAmenities.add(key);
  if(state.selected&&!visible().some(p=>p.id===state.selected)){
    state.selected=null;state.preview=false;state.detailOpen=false;renderDetails();drawRoutes();
  }
  mapCommand({type:'dismiss-popup'});renderList();
}
function emptyResults(){
  const labels=PRIORITY_AMENITIES.filter(({key})=>state.priorityAmenities.has(key)).map(({label})=>label).join(' + ');
  const heading=state.zips.size?'No matching apartments':'Choose a ZIP area';
  const message=!state.zips.size?'Choose at least one ZIP area, or clear filters to see all apartments.':labels?`No apartments in this view have recorded ${labels}${state.search?' and match your search':''}. Try fewer amenities or clear filters. Unknown amenities are excluded.`:state.search?'No apartments match your search in these ZIP areas. Clear filters to try again.':'There are no exported apartments for these ZIP areas yet. Their boundaries remain available on the map.';
  return `<div class="empty"><h3>${heading}</h3><p>${escape(message)}</p><button id="reset-results">Clear filters · Show all apartments</button></div>`;
}
function renderList(){
  syncPriorityControls();
  const items=visible(),mapped=items.filter(p=>p.coordinates).length,unmapped=items.length-mapped;
  const list=$('#property-list'),left=list.scrollLeft,top=$('.list-pane').scrollTop;
  $('#result-count').textContent=String(items.length);
  $('#compact-count').textContent=`${items.length} ${items.length===1?'apartment':'apartments'}`;
  $('#options-apply').textContent=`Show ${items.length} ${items.length===1?'apartment':'apartments'}`;
  $('#coverage-count').textContent=`${items.length} ${items.length===1?'apartment':'apartments'} · ${mapped} on map · ${unmapped} need map pins`;
  $('#missing-pin-note').textContent=unmapped?`${unmapped} without confirmed pins · included in List`:'';
  $('#missing-pin-note').hidden=!unmapped;
  $('#order-explanation').textContent=state.sort==='overall'?'My preference order within each ZIP':state.sort==='name'?'Alphabetical order':state.sort==='cluster'||state.destination==='nearest'?'Shortest walk to any of my four places first':`Shortest walk to ${cores.find(v=>v.id===state.destination)?.name||'the selected place'} first`;
  $('#list-guidance').hidden=!state.comparing&&!state.compare.size;
  $('#list-guidance').textContent='Choose 2 or 3 apartments to compare.';
  for(const zip of zipCodes)$('#zip-count-'+zip).textContent='('+data.properties.filter(p=>p.zip===zip&&matchesPropertyFilters(p)).length+')';
  list.innerHTML=items.length?items.map(p=>{const o=offer(p);return `<article class="property-card ${state.selected===p.id?'selected':''}" data-id="${p.id}">
    <div class="card-photo"><button class="card-photo-open" data-photo="${p.id}" aria-label="View photos of ${escape(p.name)}" ${propertyPhotos(p).length?'':'disabled'}>${photo(p)}<span class="photo-scope">${escape(displayPhotoScope(p))}</span>${state.selected===p.id?'<span class="selected-label">Selected</span>':''}</button>${standardBadge(p)}</div>
    <button class="card-select" data-select="${p.id}" aria-label="Preview ${escape(p.name)}" aria-pressed="${state.selected===p.id}">
      <span class="card-copy"><span class="card-address">${escape(p.neighborhood)} · ${p.zip}</span><span class="card-title">${escape(p.name)}</span><span class="card-price">${o.price}<small>${/^\$/.test(o.price)?' / month':''}</small></span><span class="card-unit">${o.facts}</span><span class="card-scope">${o.scope}</span>${amenities(p,true)}${walkLine(p)}<span class="view-details-label">Preview apartment →</span>${!p.coordinates?'<span class="card-pin-note">Map pin unverified</span>':''}${p.band==='PIPELINE'?'<span class="card-pin-note">Future project · leasing unverified</span>':''}</span>
    </button>${state.sort==='overall'?`<span class="badge">My rank in ${p.zip}: ${currentRank(p)??'Not ranked yet'}${state.draftRanks.has(p.id)?' · draft':''}</span>`:''}
    ${state.comparing||state.compare.size||state.selected===p.id?`<div class="card-footer"><label class="compare-check"><input type="checkbox" aria-label="Compare ${escape(p.name)}" data-compare="${p.id}" ${state.compare.has(p.id)?'checked':''}>${state.compare.has(p.id)?'Added to comparison':'Compare'}</label></div>`:''}</article>`;}).join(''):emptyResults();
  handleImages(list);
  list.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>openPhoto(lookup(b.dataset.photo),b));
  list.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>selectProperty(b.dataset.select,true));
  list.querySelectorAll('[data-compare]').forEach(c=>c.onchange=()=>{toggleCompare(c.dataset.compare,c.checked);$(`[data-compare="${c.dataset.compare}"]`)?.focus({preventScroll:true});});
  $('#reset-results')?.addEventListener('click',()=>{resetApartments();document.querySelector('[data-priority-amenity]').focus({preventScroll:true});});
  list.scrollLeft=left;$('.list-pane').scrollTop=top;
  requestAnimationFrame(restoreCarousel);
  renderCompareBar();renderPropertyMarkers();
}
function carouselCards(){return [...$('#property-list').querySelectorAll('.property-card')];}
function carouselIndex(cards=carouselCards()){
  const list=$('#property-list'),start=list.getBoundingClientRect().left+parseFloat(getComputedStyle(list).paddingLeft);
  return cards.reduce((best,card,index)=>Math.abs(card.getBoundingClientRect().left-start)<Math.abs(cards[best].getBoundingClientRect().left-start)?index:best,0);
}
function updateCarousel(){
  if(innerWidth>800||state.view!=='map')return;
  const cards=carouselCards(),index=carouselIndex(cards);
  carouselPropertyId=cards[index]?.dataset.id||null;
  $('#carousel-position').textContent=cards.length?`${index+1} / ${cards.length} apartments`:'';
  $('#card-previous').disabled=!cards.length||index===0;
  $('#card-next').disabled=!cards.length||index===cards.length-1;
  $('.carousel-controls').hidden=!cards.length;
}
function scrollToCard(card,animate=false){
  if(!card)return;
  const list=$('#property-list'),offset=card.getBoundingClientRect().left-list.getBoundingClientRect().left-parseFloat(getComputedStyle(list).paddingLeft);
  list.scrollTo({left:list.scrollLeft+offset,behavior:animate&&motion()?'smooth':'instant'});
}
function restoreCarousel(){
  if(innerWidth>800||state.view!=='map')return;
  const cards=carouselCards();
  scrollToCard(cards.find(card=>card.dataset.id===carouselPropertyId)||cards[0]);updateCarousel();
}
function moveCard(amount,focus=false){
  const cards=carouselCards(),next=Math.max(0,Math.min(cards.length-1,carouselIndex(cards)+amount));
  scrollToCard(cards[next],true);
  if(focus)cards[next]?.querySelector('.card-select').focus({preventScroll:true});
}
function renderDetails(){
  const p=lookup(state.selected),panel=$('#details');
  panel.hidden=!p||!state.preview||state.detailOpen;
  if(!p){if($('#property-dialog').open)$('#property-dialog').close();return;}
  if(!panel.hidden){
    const o=offer(p);
    panel.innerHTML=`<div class="preview-photo"><button class="preview-photo-open" aria-label="View photos of ${escape(p.name)}" ${propertyPhotos(p).length?'':'disabled'}>${photo(p,'preview-image')}<span class="photo-scope">${escape(displayPhotoScope(p))}</span></button>${streetViewLink(p,true)}<button class="preview-close" aria-label="Close apartment preview">×</button></div><div class="preview-body"><p class="card-address">${escape(p.neighborhood)} · ${p.zip}${!p.coordinates?' · Pin unverified':''}</p><h2 id="selected-apartment-title" tabindex="-1">${escape(p.name)}</h2><p class="preview-facts">${o.facts}</p><p class="unit-secondary-price">${o.price}${/^\$/.test(o.price)?' / month':''}</p><p class="card-scope">${o.scope}</p>${amenities(p,true)}${walkLine(p)}<div class="preview-actions"><button id="expand-property" class="primary-action">View details</button><button class="detail-compare">${state.compare.has(p.id)?'Remove comparison':'Add to compare'}</button></div></div>`;
    panel.querySelector('.preview-photo-open').onclick=event=>openPhoto(p,event.currentTarget);
    panel.querySelector('.preview-close').onclick=closeProperty;
    $('#expand-property').onclick=openPropertyDetails;
    panel.querySelector('.detail-compare').onclick=()=>toggleCompare(p.id,!state.compare.has(p.id));
    handleImages(panel);
  }
  if(state.detailOpen)renderExpandedDetails();
}
function communityFeedback(p){
  const review=communityReviewFor(p);if(!review)return '';
  return `<section class="detail-section community-feedback" aria-labelledby="community-feedback-title"><h3 id="community-feedback-title">${escape(review.title)}</h3><p class="small muted">${escape(review.scope)}</p><div class="community-reports">${review.reports.map(report=>`<p>${escape(report)}</p>`).join('')}</div><p class="small muted community-source">${escape(review.source)}</p></section>`;
}
function renderExpandedDetails(){
  const p=lookup(state.selected);if(!p)return;
  const media=photoRecord(p),photos=propertyPhotos(p);
  const panel=$('#property-content'),scroll=panel.scrollTop,route=currentRoute(p),destination=activeDestination(p),o=offer(p),u=chosenUnit(p),warning=hasUnconfirmedTwoBedroom(p);
  const transit=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(p.address+', Kansas City, MO '+p.zip)}&destination=${encodeURIComponent(destination?.address+', Kansas City, MO')}&travelmode=transit`;
  panel.innerHTML=`<section class="detail-gallery" aria-label="Property photos">${streetViewLink(p,true)}<button class="enlarge-photo" ${media.photo?'':'disabled'} aria-label="Enlarge ${escape(displayPhotoScope(p))}">${photo(p,'hero-photo')}<span class="photo-scope">${escape(displayPhotoScope(p))}${media.photo?' · Enlarge ↗':''}</span></button><div class="gallery-note"><span>${photos.length?photos.length+' saved '+(photos.length===1?'photo':'photos'):'Photo needed'} · ${photoSourceNote(p)?(p.id==='old-town-star-lofts'?'Building + user-provided #308 interiors':'Building + representative gallery / floor-plan media'):displayPhotoScope(p).startsWith('Exact-unit')?'Identified apartment photo':'Exact-apartment photos unverified'}</span>${p.links.photos?anchor(p.links.photos,'Shared / model gallery ↗'):''}</div></section>
    <div class="detail-body"><section class="unit-section"><p class="eyebrow">${escape(p.neighborhood)} · ZIP ${p.zip}</p><h2 id="property-title" tabindex="-1">${escape(p.name)}</h2><p class="small muted">${escape(p.address)}</p>
    ${p.band==='PIPELINE'?'<p class="warning-strip">Future project — not confirmed ready to lease</p>':''}
    ${apartmentFacts(p)}</section>
    <section class="detail-section amenities-section"><h3>Everyday comfort</h3><p class="small muted">Recorded building research. Confirm what comes with the exact apartment.</p>${amenities(p)}<dl class="facts amenity-evidence">${visibleAmenities(p).map(({key,title})=>`<dt>${title}</dt><dd>${escape(p.amenities[key])}</dd>`).join('')}</dl><dl class="facts secondary-facts">${extraFacts.map(([key,label])=>`<dt>${label}</dt><dd>${escape(p.amenities[key])}</dd>`).join('')}</dl></section>
    ${gettingAround(p)}
    ${supplementalBedroomResearch(p)}
    <section class="detail-section tradeoffs-section"><div class="insight strength"><h3>Building amenities &amp; features</h3>${p.amenityDetails?`<p>${evidenceHTML(p.amenityDetails)}</p>`:''}<p>${evidenceHTML(readableCopy(p.strengths||'No confirmed standout features recorded yet.'))}</p></div><div class="insight tradeoff"><h3>Tradeoffs</h3><p>${escape(readableCopy(p.tradeoffs||'Insufficient comparable evidence. No overall verdict yet.'))}</p></div></section>
    ${communityFeedback(p)}
    <section class="detail-section preference-section"><details class="ranking-details"><summary>My preference ranking</summary><p><strong>My rank in ${p.zip}:</strong> ${currentRank(p)??'Not ranked yet'}${state.draftRanks.has(p.id)?' (draft only)':''}.</p><p class="small muted">Distance-only rank in ${p.zip}: ${p.clusterRank??'Unverified'}${p.nearest?' · '+p.nearest.minutes+'-minute walk to '+escape(p.nearest.destination):''}. It does not pick a winner.</p><form class="rank-form"><label for="rank-input">My rank</label><input id="rank-input" inputmode="numeric" type="number" min="1" max="${data.properties.filter(x=>x.zip===p.zip).length}" value="${currentRank(p)??''}" placeholder="—"><button type="submit">Try draft rank</button></form><p class="rank-status">Draft only: lasts until reload. Does not change V3 or the shared link.</p></details></section>
    <details class="detail-section source-details"><summary>Research, photos &amp; source checks</summary><h4>Recorded amenity evidence</h4><dl class="facts research-amenities">${amenityKeys.map(([key,label])=>`<dt>${label}</dt><dd>${evidenceHTML(p.amenities[key])}</dd>`).join('')}</dl><p class="availability-note">${escape(p.availability)}</p><p class="small">${escape(p.photoCaption)} ${anchor(p.photoSource,'Photo source')}</p><p class="small">${evidenceHTML(p.linkScope)}</p>${p.photoEvidence?`<p class="evidence">Recorded photo research: ${evidenceHTML(p.photoEvidence)}</p>`:''}${photoSourceNote(p)?`<p class="evidence photo-source-note">User-provided photo note: ${escape(photoSourceNote(p))}</p>`:''}${p.phone?`<p class="small">Leasing phone: ${escape(p.phone)}</p>`:''}<dl class="facts"><dt>Management</dt><dd>${escape(p.management)}</dd><dt>Built / renovated</dt><dd>${escape(p.building?.yearBuilt||'Unverified')} / ${escape(p.building?.yearRenovated||'Unverified')}</dd><dt>Mixed income</dt><dd>${escape(p.building?.mixedIncome||'Unverified')}</dd></dl><p class="small">Sources checked: ${escape(p.checked||'Not recorded')}. Rents and vacancies can change.</p><div class="secondary-links">${anchor(p.links.photos,'Photo gallery')}${anchor(p.links.website,'Property source')}${anchor(p.links.streetView,'Street View')}${anchor(p.links.appleMaps,'Apple Maps')}${anchor(p.links.googleMaps,'Google Maps')}</div>${p.oneBedroom.evidence?`<p class="evidence">1BR evidence: ${evidenceHTML(p.oneBedroom.evidence)}</p>`:''}${p.twoBedroom.evidence?`<p class="evidence ${warning?'warning':''}">2BR evidence: ${evidenceHTML(p.twoBedroom.evidence)}</p>`:''}${p.threeBedroom?.evidence?`<p class="evidence">3BR evidence: ${evidenceHTML(p.threeBedroom.evidence)}</p>`:''}${p.researchSources?`<p class="evidence">Sources / checked: ${evidenceHTML(p.researchSources)}</p>`:''}<p class="small muted">Pin: ${evidenceHTML(p.coordinateSource)} · ${escape(p.coordinateChecked||'check date not recorded')}. ${!p.coordinates?'Listed without a confirmed pin.':''}</p><details class="confirm-box"><summary>Unresolved research · ${missing(p).length} items</summary><p>${escape(readableCopy(p.confirmation))}</p><ul>${missing(p).map(x=>`<li>${escape(friendlyFact(x))}</li>`).join('')}</ul></details></details>
    <details class="detail-section calculation-details"><summary>Voucher estimate &amp; calculations</summary><p class="small muted">${escape(data.meta.voucherCaveat)}</p><p class="small warning">Saved worksheet values below are not a quote for the apartment selected above.</p><dl class="facts"><dt>Acceptance</dt><dd>${escape(p.hcv)}</dd><dt>Program</dt><dd>${escape(p.lihtc)}</dd><dt>Minimum income</dt><dd>${escape(p.eligibility?.minimumIncome||'Unverified')}</dd><dt>Published 1-person limit</dt><dd>${escape(p.eligibility?.onePersonLimit||'Unverified')}</dd><dt>Official utility allowance</dt><dd>${money(p.oneBedroom.utilityAllowance)}</dd><dt>Electricity planning estimate</dt><dd>${money(p.costs?.electricityEstimate)}${typeof p.costs?.electricityEstimate==='number'?(p.costs.electricityEstimate===0?' — advertised housing-utility inclusion, not an authority allowance':' — user estimate, not an authority allowance'):''}</dd><dt>Required monthly fees</dt><dd>${money(p.costs?.requiredMonthlyFees)}</dd><dt>Cost basis</dt><dd>${evidenceHTML(p.costs?.basis||'Utilities and mandatory fees need verification.')}</dd><dt>Recorded 1BR standard</dt><dd>${money(p.oneBedroom.standard)}</dd><dt>1BR estimated gross / % / fit</dt><dd>${money(p.oneBedroom.gross)} / ${percentage(p.oneBedroom.percent)} / ${escape(p.oneBedroom.fit)} — estimate only</dd><dt>${alternativeBedroom(p).beds}BR estimated gross / % / fit</dt><dd>${money(alternativeBedroom(p).research.gross)} / ${percentage(alternativeBedroom(p).research.percent)} / ${escape(alternativeBedroom(p).research.fit)}${warning?' — invalid as a Star-specific conclusion until attribution is confirmed.':' — recorded 1BR standard; estimate only.'}</dd></dl></details>

    <div class="detail-end-actions"><button class="detail-compare">${state.compare.has(p.id)?'Remove from comparison':'Add to comparison'}</button><button class="return-preview">Back to preview</button></div></div>`;
  handleImages(panel);panel.scrollTop=scroll;
  panel.querySelector('.enlarge-photo').onclick=event=>openPhoto(p,event.currentTarget);
  panel.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>chooseUnit(p.id,b.dataset.unit));
  panel.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>{setDestination(b.dataset.destination);$('.other-walks').open=true;panel.querySelector(`[data-destination="${b.dataset.destination}"]`)?.focus({preventScroll:true});});
  panel.querySelector('.show-on-map').onclick=()=>{closeExpandedDetails();setView('map');drawRoutes(true);};
  panel.querySelector('.detail-compare').onclick=()=>toggleCompare(p.id,!state.compare.has(p.id));
  panel.querySelector('.return-preview').onclick=closeExpandedDetails;
  panel.querySelector('form').onsubmit=event=>{
    event.preventDefault();const value=panel.querySelector('#rank-input').value,rank=value===''?null:Number(value),max=data.properties.filter(x=>x.zip===p.zip).length;
    if(rank!==null&&(!Number.isInteger(rank)||rank<1||rank>max)){showToast(`Use a whole-number rank from 1 to ${max}, or leave it blank.`);return;}
    const duplicate=data.properties.find(x=>x.id!==p.id&&x.zip===p.zip&&currentRank(x)===rank&&rank!==null);
    if(duplicate){showToast(`Rank ${rank} is already assigned to ${duplicate.name}. Choose a different rank.`);return;}
    state.draftRanks.set(p.id,rank);renderList();renderDetails();$('.ranking-details').open=true;showToast('Draft rank applied for comparison only. Not saved to V3.');
  };
}
function chooseUnit(id,unit){state.unitChoices.set(id,unit);renderList();renderDetails();$('#property-content [data-unit="'+CSS.escape(unit)+'"]')?.focus({preventScroll:true});}
const historySnapshot=()=>({kcmo:true,selected:state.selected,preview:state.preview,detailOpen:state.detailOpen,view:state.view,overlay:state.overlay,photoProperty:gallery.propertyId,photoIndex:gallery.index});
const remember=(replace=false)=>history[replace?'replaceState':'pushState'](historySnapshot(),'');
function openPropertyDetails(){state.detailOpen=true;renderDetails();$('#property-dialog').showModal();$('#property-content').scrollTop=0;remember();$('#property-title').focus({preventScroll:true});}
function closeExpandedDetails(){state.detailOpen=false;$('#property-dialog').close();state.preview=true;renderDetails();remember(true);$('#expand-property')?.focus({preventScroll:true});}
function closeProperty(){state.preview=false;state.detailOpen=false;$('#property-dialog').close();renderDetails();remember(true);$(`[data-select="${state.selected}"]`)?.focus({preventScroll:true});}
function selectProperty(id,fromList=false){
  if(!lookup(id))return;
  carouselPropertyId=id;
  mapCommand({type:'dismiss-popup'});state.selected=id;state.preview=true;state.detailOpen=false;$('#start-comparison').hidden=false;
  renderList();renderDetails();renderPlaceMarkers();drawRoutes(true);remember();
  if(!fromList){const card=$(`[data-id="${id}"]`);card?.scrollIntoView({block:'nearest',inline:'center'});}
  $('#selected-apartment-title')?.focus({preventScroll:true});
}
function setView(view,push=true){
  if(push&&!$('#options-dialog').open&&state.overlay==='options-dialog')state.overlay=null;
  state.view=view;document.body.dataset.view=view;
  $('#view-map').setAttribute('aria-pressed',String(view==='map'));$('#view-list').setAttribute('aria-pressed',String(view==='list'));
  $('.map-pane').setAttribute('aria-hidden',String(view==='list'));$('.map-pane').inert=view==='list';
  requestAnimationFrame(()=>{syncMap();mapCommand({type:'resize'});restoreCarousel();if(push&&innerWidth<=800)$('.workspace').scrollIntoView({block:'start',behavior:'instant'});});if(push)remember();
}
function setDestination(id){state.destination=id;$('#destination').value=id;if(state.sort==='cluster'){state.sort='walk';$('#sort-mode').value='walk';}renderList();renderDetails();renderPlaceMarkers();renderCoreShortcuts();renderDestinationContext();drawRoutes(true);}
function toggleCompare(id,on){
  if(on&&state.compare.size>=3){showToast('Compare up to three properties. Remove one first.');renderList();return;}
  if(on){state.compare.add(id);state.comparing=true;}else{state.compare.delete(id);if(!state.compare.size)state.comparing=false;}
  const inDetails=$('#property-dialog').open;renderList();renderDetails();if(inDetails)$('#property-content .detail-compare')?.focus({preventScroll:true});else if(state.preview)$('#details .detail-compare')?.focus({preventScroll:true});if($('#compare-dialog').open)renderComparison(false);
}
function renderCompareBar(){
  $('#compare-bar').hidden=state.compare.size===0;document.body.classList.toggle('has-comparison',state.compare.size>0);
  $('#compare-choose').hidden=state.compare.size>=3;$('#compare-open').hidden=state.compare.size<2;
  $('#compare-count').textContent=state.compare.size===1?'1 selected · choose one more':state.compare.size+' apartments selected';
  $('#compare-open').disabled=state.compare.size<2;$('#compare-open').textContent=`Compare ${state.compare.size}`;
}
function renderComparison(open=true){
  const items=[...state.compare].map(lookup),rows=[
    ['Apartment facts',p=>{const u=chosenUnit(p);return u?`#${escape(u.unit)} · ${u.beds}BR · ${money(u.rent)} · ${area(u.sqft)}<p>${listingDate(u.available)}</p>`:p.units.length?p.units.map(u=>`<p>#${escape(u.unit)} · ${u.beds}BR · ${money(u.rent)} · ${area(u.sqft)}<br><small>${listingDate(u.available)}</small></p>`).join(''):priceSummary(p)+'<p>Exact unit unverified</p>';}],
    ...amenityKeys.map(([key,label])=>[label,p=>{const summary=amenitySummary(key,p.amenities[key]),raw=p.amenities[key];const evidence=!/^(yes|no|unverified)$/i.test(raw)&&String(raw).replace(/^yes\s*-?\s*/i,'').toLowerCase()!==summary.label.toLowerCase();return `<strong>${escape(summary.label)}</strong>${evidence?`<p class="small muted">${escape(raw)}</p>`:''}`;}]),
    ...extraFacts.map(([key,label])=>[label,p=>escape(p.amenities[key])]),
    ['Alternative bedroom research',p=>{const a=alternativeBedroom(p);return a.beds+'BR · '+money(a.research.rent)+' · '+area(a.research.sqft)+(hasUnconfirmedTwoBedroom(p)?'<p class="compare-warning">Not confirmed to this building</p>':'');}],
    ['Named walking access',p=>escape(headline(p))+'<p>Pedestrian estimate</p>'],
    ['Availability',p=>escape(p.availability)],['Strengths',p=>escape(readableCopy(p.strengths||'Not enough evidence yet'))],['Tradeoffs',p=>escape(readableCopy(p.tradeoffs||'Unverified'))],
    ['Cost comparison estimates',p=>`1BR: ${money(p.oneBedroom.gross)} · ${percentage(p.oneBedroom.percent)} · ${escape(p.oneBedroom.fit)}<p>${alternativeBedroom(p).beds}BR: ${money(alternativeBedroom(p).research.gross)} · ${percentage(alternativeBedroom(p).research.percent)} · ${escape(alternativeBedroom(p).research.fit)}</p><p>${evidenceHTML(p.costs?.basis||'Utilities / fees unverified.')}</p><p>${escape(p.hcv)} HCV acceptance. Final voucher approval unverified.</p>`],
    ['Needs confirmation',p=>escape(missing(p).map(friendlyFact).join('; '))],
    ['My preference rank',p=>`${p.zip}: ${currentRank(p)??'Not ranked yet'}${state.draftRanks.has(p.id)?' (draft only)':''}`],
    ['Distance-only rank',p=>`${p.zip}: ${p.clusterRank??'Unverified'}${p.nearest?' · '+p.nearest.minutes+' min to '+escape(p.nearest.destination):''}<p>Nearest of my four places; not a preference.</p>`],
    ['Sources',p=>anchor(p.links.website,'Property source')+' · '+anchor(p.links.floorplans,'Floor plans')+'<p>Checked '+escape(p.checked||'Not recorded')+'</p>']
  ];
  $('#comparison').innerHTML=`<table><thead><tr><th scope="col">Compare ${items.length} apartments</th>${items.map(p=>`<th scope="col">${photo(p,'compare-photo')}<p class="small muted">${escape(displayPhotoScope(p))}</p><h3>${escape(p.name)}</h3><p class="small muted">${escape(p.neighborhood)} · ${p.zip}</p></th>`).join('')}</tr></thead><tbody>${rows.map(([label,get])=>`<tr><th scope="row">${label}</th>${items.map(p=>`<td>${get(p)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  handleImages($('#comparison'));if(open&&!$('#compare-dialog').open)openOverlay('compare-dialog');
}
function openPhoto(p,opener=document.activeElement){
  const photos=propertyPhotos(p);if(!photos.length)return;
  gallery.propertyId=p.id;gallery.index=preferredPhotoIndex(photos,chosenUnit(p));gallery.opener=opener;
  gallery.openerSelector=opener?.classList.contains('enlarge-photo')?'#property-content .enlarge-photo':opener?.classList.contains('preview-photo-open')?'#details .preview-photo-open':`[data-photo="${p.id}"]`;
  renderPhotoGallery();openOverlay('photo-dialog');$('#photo-close').focus({preventScroll:true});
}
function renderPhotoGallery(){
  const p=lookup(gallery.propertyId);if(!p)return;
  const photos=propertyPhotos(p);if(!photos.length)return;
  gallery.index=Math.max(0,Math.min(gallery.index,photos.length-1));
  const item=photos[gallery.index];
  $('#photo-title').textContent=p.name;
  $('#photo-content').innerHTML=`<figure><div class="photo-stage"><img class="enlarged-image" src="${escape(item.url)}" alt="${escape(item.caption)} — ${escape(item.scope)}" referrerpolicy="no-referrer" draggable="false"></div><figcaption><p class="gallery-scope">${escape(item.scope)}</p><p class="gallery-caption">${escape(item.caption)}</p>${item.attribution?`<p class="small muted">${escape(item.attribution)}</p>`:''}${item.source?`<p>${anchor(item.source,'Photo source ↗')}</p>`:''}${item.unit==='308'&&photoSourceNote(p)?`<p class="small muted gallery-source-note">${escape(photoSourceNote(p))}</p>`:''}</figcaption></figure>`;
  $('#photo-counter').textContent=`${gallery.index+1} of ${photos.length} · ${item.scope}`;
  $('#photo-prev').hidden=photos.length<2;$('#photo-next').hidden=photos.length<2;
  $('#photo-swipe-hint').hidden=photos.length<2;
  handleImages($('#photo-content'));
}
function movePhoto(delta){
  const photos=propertyPhotos(lookup(gallery.propertyId)||{});if(photos.length<2)return;
  gallery.index=(gallery.index+delta+photos.length)%photos.length;renderPhotoGallery();remember(true);
}
function returnPhotoFocus(){
  const target=gallery.opener?.isConnected?gallery.opener:gallery.openerSelector?$(gallery.openerSelector):null;
  target?.focus({preventScroll:true});gallery.touch=null;
}
function renderCoreShortcuts(){$('#core-shortcuts').innerHTML=cores.map(v=>`<button class="${state.destination===v.id?'active':''}" data-core="${v.id}" aria-pressed="${state.destination===v.id}">${icon('nightlife')}<span>${escape(v.name)}</span></button>`).join('');$('#core-shortcuts').querySelectorAll('button').forEach(b=>b.onclick=()=>{setDestination(b.dataset.core);$(`[data-core="${b.dataset.core}"]`)?.focus({preventScroll:true});});}
function renderDestinationContext(){
  const p=cores.find(v=>v.id===state.destination),g=placeGuides[state.destination];
  $('#destination-context').innerHTML=p?`${icon('nightlife')}<span>Walks to <strong>${escape(p.name)}</strong> · ${escape(g?.short||'Nightlife')}<small>${escape(g?.description||'A place I want to live near.')}</small></span>`:`${icon('nightlife')}<span>Walks to <strong>my nearest nightlife place</strong><small>In Good Co, MOD, recordBar and Third Place Lounge. Each home’s time names its nearest one.</small></span>`;
}
function renderWelcome(){
  $('#map-legend').innerHTML=[['home','Apartments'],['food','Restaurants'],['coffee','Coffee shops'],['nightlife','Nightlife & events'],['library','Libraries'],['streetcar','Streetcar']].map(([kind,label])=>`<li><span class="legend-symbol ${kind}">${icon(kind)}</span>${label}</li>`).join('');
  document.querySelectorAll('.layer-symbol').forEach(el=>{const kind=[...el.classList].find(k=>k!=='layer-symbol');el.innerHTML=icon(kind);});
  $('#places-guide-content').innerHTML=cores.map(p=>{const g=placeGuides[p.id];return `<article class="guide-place"><div class="guide-place-title">${icon('nightlife')}<div><h3>${escape(p.name)}</h3><p class="small muted">${escape(p.address)} · ${escape(p.neighborhood)}</p></div></div><p>${escape(g.description)}</p><div class="guide-place-actions"><button data-guide-destination="${p.id}">Use ${escape(p.name)} for walking times</button>${anchor(g.source,'Official website')}</div><p class="small muted">Description checked ${escape(g.checked)}. Check current events and entry requirements before visiting.</p></article>`;}).join('')+`<section class="guide-daytime"><h3>Daytime laptop stops</h3><p>${icon('library')} Libraries and ${icon('coffee')} coffee shops are shown separately for daytime visits. Coffee-shop Wi-Fi, outlets and laptop policies still need checking.</p><button id="browse-daytime">Browse libraries &amp; coffee shops</button></section>`;
  $('#places-guide-content').querySelectorAll('[data-guide-destination]').forEach(b=>b.onclick=()=>{setDestination(b.dataset.guideDestination);closeOverlay('places-guide-dialog',true);$('#places-guide-open').focus({preventScroll:true});});
  $('#browse-daytime').onclick=()=>{closeOverlay('places-guide-dialog',true);$('.places-directory').open=true;$('.places-directory').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});$('.places-directory button')?.focus({preventScroll:true});};
  renderDestinationContext();
}
function browseApartments(comparing=false){
  $('#options-dialog').close();state.comparing=comparing||state.compare.size>0;state.preview=false;renderDetails();setView('list');renderList();
  $('.list-pane').scrollTop=0;$('#apartments-heading').focus({preventScroll:true});
  if(innerWidth<=800)$('.list-pane').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});
}
function renderPlaces(){
  $('#place-list').innerHTML=data.places.filter(p=>p.category!=='Core scene').map(p=>`<button class="place-row" data-place="${p.id}">${icon(placeKind(p))}<span>${escape(p.name)}<small>${escape(categoryLabel(p))} · ${escape(p.neighborhood||'Area unverified')}${!p.coordinates?' · Map pin needed':''}</small></span></button>`).join('');
  $('#place-list').querySelectorAll('button').forEach(b=>b.onclick=()=>showPlace(data.places.find(v=>v.id===b.dataset.place)));
}
function mapSnapshot(){
  const frame=$('.map-frame').getBoundingClientRect(),preview=$('#details').getBoundingClientRect();
  const active=state.preview&&!state.detailOpen&&!$('#details').hidden;
  const covered=active?Math.max(0,frame.bottom-preview.top):0;
  const vertical=Math.max(20,Math.min(40,frame.height*.18));
  return {zips:[...state.zips],visibleIds:visible().map(p=>p.id),selectedId:state.selected,destinationId:state.destination,threeD:state.threeD,
    layers:{zip:$('#layer-zip').checked,streetcar:$('#layer-streetcar').checked,core:$('#layer-core').checked,scenes:$('#layer-scenes').checked,daytime:$('#layer-daytime').checked,food:$('#layer-food').checked},
    padding:{top:innerWidth<=800?24:Math.max(vertical,110),bottom:innerWidth<=800&&active?Math.min(covered+25,Math.max(vertical,frame.height*.58)):(innerWidth<=800?48:vertical),left:innerWidth<=800?24:40,right:innerWidth<=800?116:active?Math.min(390,frame.width*.46):40},reducedMotion:motion()===0};
}
const bridge=createMapBridge(window,{
  ready(){mapReady=true;$('#map').setAttribute('aria-busy','false');applyZipBoundaries();syncMap();},
  status(detail){
    if(!detail)return;
    mapReady=['ready','fallback'].includes(detail.status);
    $('#map').setAttribute('aria-busy',String(detail.status==='loading'));
    $('#map-status').textContent=detail.message||'';$('#map-status').hidden=detail.status==='ready';
    if(detail.status==='fallback')$('#map-status').classList.add('map-fallback-note');else $('#map-status').classList.remove('map-fallback-note');
    $('#map-provider-status').textContent=detail.message||'';
    applyZipBoundaries();
  },
  intent(detail){
    if(!detail||typeof detail.id!=='string')return;
    if(detail.type==='select-apartment'&&visible().some(p=>p.id===detail.id))selectProperty(detail.id);
    else if(detail.type==='select-destination'&&cores.some(p=>p.id===detail.id)){setDestination(detail.id);if(!state.selected)showPlace(cores.find(p=>p.id===detail.id));}
    else if(detail.type==='show-place'){const p=data.places.find(p=>p.id===detail.id);if(p)showPlace(p);}
  }
});
function syncMap(){
  if(mapSyncPending)return;mapSyncPending=true;
  queueMicrotask(()=>{mapSyncPending=false;bridge.update(mapSnapshot());});
}
function mapCommand(command){bridge.update(mapSnapshot());bridge.command(command);}
function renderPropertyMarkers(){syncMap();}
function renderPlaceMarkers(){syncMap();}
function drawRoutes(fit=false){
  syncMap();
  if(fit&&state.selected){const p=lookup(state.selected);if(p?.coordinates)mapCommand({type:'focus-apartment',id:p.id,lat:p.coordinates[0],lng:p.coordinates[1]});}
}
function showPlace(p){
  $('#options-dialog').close();
  if(!p.coordinates){showToast(`${p.name}: ${p.address}. No confirmed coordinate; no pin invented.`);return;}
  state.preview=false;state.detailOpen=false;renderDetails();setView('map');renderList();drawRoutes();
  mapCommand({type:'show-place',id:p.id});
  if(innerWidth<=800)$('.map-pane').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});
}
function fitOverview(){mapCommand({type:'fit-zips'});}
function overview(){
  syncMap();mapCommand({type:'fit-zips'});
}
function syncMapControls(){
  $('#map-mode-2d').setAttribute('aria-pressed',String(!state.threeD));
  $('#map-mode-3d').setAttribute('aria-pressed',String(state.threeD));
  $('#three-d').setAttribute('aria-pressed',String(state.threeD));
  $('#map-mode-note').textContent=state.threeD?'3D is on. Choose Explore in 3D to see buildings near your selected apartment or In Good Co.':'2D is on. Choose 3D on the map for a tilted view.';
}
function setMapDimension(enabled,explore=false){
  state.threeD=enabled;syncMapControls();setView('map');syncMap();
  mapCommand({type:explore?'explore-3d':'set-pitch'});
}
async function startMap(){
  try{
    const {mountApartmentMap}=await import('./mapcn/apartment-runtime.js?v=mobile-layout-20260915-r1');
    const css=getComputedStyle(document.documentElement);
    const style=mapConfig.apiKey?`https://api.maptiler.com/maps/${encodeURIComponent(mapConfig.styleId)}/style.json?key=${encodeURIComponent(mapConfig.apiKey)}`:mapConfig.fallbackStyle;
    if(mapAbort.signal.aborted)return;
    mountedMap=await mountApartmentMap($('#map'),{signal:mapAbort.signal,workerUrl:new URL('./mapcn/maplibre-gl-worker.mjs',import.meta.url).href,style,fallbackStyle:mapConfig.fallbackStyle,data,initialState:mapSnapshot(),colors:{green:css.getPropertyValue('--pine').trim(),cream:css.getPropertyValue('--map-cream').trim()||'#f6f7f3'},placeGuides});
  }catch{
    mapReady=false;$('#map').setAttribute('aria-busy','false');$('#map-status').hidden=false;$('#map-status').textContent='Map unavailable on this connection or device. All apartments, comparisons and source links still work.';
  }
}
function applyMapLayers(){applyZipBoundaries();syncMap();}
function applyZipBoundaries(){
  const enabled=$('#layer-zip').checked,areas=selectedZipAreas(data.geography.zipAreas.geometry,state.zips).sort((a,b)=>String(a.properties.ZCTA5).localeCompare(String(b.properties.ZCTA5)));
  $('#zip-boundaries-toggle').disabled=false;
  $('#zip-boundaries-toggle').setAttribute('aria-pressed',String(enabled));
  $('#zip-boundaries-state').textContent=enabled?'On':'Off';$('#zip-boundary-legend').hidden=!enabled;
  $('#zip-selection-summary').textContent=state.zips.size===zipCodes.length?'All 13 ZIP areas':state.zips.size?`${state.zips.size} ZIP ${state.zips.size===1?'area':'areas'}`:'Choose ZIP areas';
  const available=new Set(areas.map(f=>String(f.properties.ZCTA5))),unavailable=[...state.zips].filter(zip=>!available.has(zip));
  $('#zip-boundary-labels').innerHTML=(state.zips.size?`<span class="zip-boundary-key"><i aria-hidden="true"></i>Selected: ${state.zips.size===zipCodes.length?'All 13 areas':[...state.zips].sort().join(', ')}</span>`:'<span>No ZIP areas selected.</span>')+(unavailable.length?`<span>Boundary unavailable: ${unavailable.map(escape).join(', ')}</span>`:'');
  syncMap();
}
function toggleZipBoundaries(enabled){
  $('#layer-zip').checked=enabled;applyZipBoundaries();

}
function resetApartments(){
  state.priorityAmenities.clear();state.zips=new Set(zipCodes);$('.zip-filters').querySelectorAll('input').forEach(c=>c.checked=true);state.search='';$('#search').value='';applyZipBoundaries();renderList();overview();
}
document.querySelectorAll('[data-priority-amenity]').forEach(button=>button.onclick=()=>togglePriorityAmenity(button.dataset.priorityAmenity));
$('#clear-property-filters').onclick=()=>{resetApartments();document.querySelector('[data-priority-amenity]').focus({preventScroll:true});};
$('.zip-filters').querySelectorAll('input').forEach(c=>c.onchange=()=>{
  if(c.checked)state.zips.add(c.value);else state.zips.delete(c.value);
  applyZipBoundaries();
  if(state.selected&&!state.zips.has(lookup(state.selected).zip)){state.selected=null;renderDetails();renderPlaceMarkers();drawRoutes();}
  mapCommand({type:'dismiss-popup'});renderList();if(!state.selected)overview();
});
$('#destination').onchange=e=>setDestination(e.target.value);
$('#sort-mode').onchange=e=>{state.sort=e.target.value;if(state.sort==='cluster'){state.destination='nearest';$('#destination').value='nearest';renderDetails();renderCoreShortcuts();renderPlaceMarkers();renderDestinationContext();drawRoutes();}renderList();};
$('#search').oninput=e=>{state.search=e.target.value.trim().toLowerCase();if(state.selected&&!visible().some(p=>p.id===state.selected)){state.selected=null;renderDetails();drawRoutes();}renderList();};
$('#overview').onclick=()=>{$('#options-dialog').close();setView('map');overview();$('.map-frame').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});};
for(const [id,amount] of [['zoom-in',1],['zoom-out',-1]])$('#'+id).onclick=()=>{$('#options-dialog').close();setView('map');$('.map-frame').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});mapCommand({type:'zoom',amount});};
$('#three-d').onclick=()=>{$('#options-dialog').close();setMapDimension(!state.threeD);};
$('#map-mode-2d').onclick=()=>setMapDimension(false);
$('#map-mode-3d').onclick=()=>setMapDimension(true);
$('#explore-3d').onclick=()=>setMapDimension(true,true);
$('#map-layers').onclick=()=>{
  openOverlay('options-dialog');
  const content=$('#options-dialog .guide-content');
  content.scrollTop+=$('#map-options-title').getBoundingClientRect().top-content.getBoundingClientRect().top-16;
  $('#layer-food').focus({preventScroll:true});
};
$('#zip-boundaries-toggle').onclick=()=>toggleZipBoundaries(!$('#layer-zip').checked);
$('#layer-zip').onchange=e=>toggleZipBoundaries(e.target.checked);$('#layer-streetcar').onchange=applyMapLayers;
$('#layer-core').onchange=()=>{renderPlaceMarkers();drawRoutes();};
$('#layer-food').onchange=syncMap;
$('#layer-scenes').onchange=renderPlaceMarkers;$('#layer-daytime').onchange=renderPlaceMarkers;
$('#compare-open').onclick=renderComparison;$('#compare-close').onclick=()=>closeOverlay('compare-dialog');$('#compare-clear').onclick=()=>{state.compare.clear();state.comparing=false;renderList();renderDetails();$('#apartments-heading').focus({preventScroll:true});};
$('#compare-choose').onclick=()=>{if(state.selected)closeProperty();browseApartments(true);};
$('#more-options').onclick=()=>openOverlay('options-dialog');$('#options-close').onclick=()=>closeOverlay('options-dialog');
$('#options-clear').onclick=resetApartments;
$('#options-apply').onclick=()=>closeOverlay('options-dialog');
$('#options-dialog').addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=[...event.currentTarget.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
});
$('#browse-apartments').onclick=()=>browseApartments();$('#start-comparison').onclick=()=>browseApartments(true);
$('#about-open').onclick=()=>{$('#options-dialog').close();openOverlay('about-dialog');};$('#about-close').onclick=()=>closeOverlay('about-dialog',true);
$('#places-guide-open').onclick=()=>{$('#options-dialog').close();openOverlay('places-guide-dialog');};$('#places-guide-close').onclick=()=>closeOverlay('places-guide-dialog',true);
$('#preview-notice').textContent=data.meta.staged?'Local research preview · Not published. Some facts still need checking.':'Research snapshot · Check sources for current rents and availability.';
$('#build-explanation').textContent=data.meta.notice;
$('#generated-at').textContent='Built '+new Date(data.meta.generatedAt).toLocaleString('en-US')+' · source checks are shown separately.';

const fitWorkspace=()=>{
  document.documentElement.style.setProperty('--intro-height',`${$('.workspace').getBoundingClientRect().top+scrollY}px`);
  document.documentElement.style.setProperty('--toolbar-height',`${$('.toolbar').getBoundingClientRect().height}px`);
  requestAnimationFrame(()=>{restoreCarousel();syncMap();});
};
const shellObserver=new ResizeObserver(fitWorkspace);document.querySelectorAll('.page-header,.toolbar').forEach(el=>shellObserver.observe(el));
$('#card-previous').onclick=()=>moveCard(-1);$('#card-next').onclick=()=>moveCard(1);
$('#property-list').addEventListener('scroll',()=>{cancelAnimationFrame(carouselFrame);carouselFrame=requestAnimationFrame(updateCarousel);},{passive:true});
$('#property-list').addEventListener('keydown',event=>{
  if(innerWidth>800||state.view!=='map'||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.target.matches('input'))return;
  event.preventDefault();
  if(event.key==='Home'||event.key==='End'){const cards=carouselCards(),card=event.key==='Home'?cards[0]:cards.at(-1);scrollToCard(card,true);if(event.target!==event.currentTarget)card?.querySelector('.card-select').focus({preventScroll:true});}
  else moveCard(event.key==='ArrowLeft'?-1:1,event.target!==event.currentTarget);
});
renderWelcome();renderList();renderPlaces();renderCoreShortcuts();applyZipBoundaries();syncMapControls();remember(true);startMap();
if(['localhost','127.0.0.1'].includes(location.hostname))fetch('/api/status').then(r=>r.ok?r.json():null).then(status=>{rankService=Boolean(status?.rankEditing)&&data.meta.masterMapFields;}).catch(()=>{});

$('#view-map').onclick=()=>setView('map');$('#view-list').onclick=()=>setView('list');
$('#property-back').onclick=closeExpandedDetails;$('#property-close').onclick=closeExpandedDetails;
$('#property-dialog').addEventListener('cancel',e=>{e.preventDefault();closeExpandedDetails();});
$('#photo-close').onclick=()=>closeOverlay('photo-dialog');
$('#photo-prev').onclick=()=>movePhoto(-1);$('#photo-next').onclick=()=>movePhoto(1);
$('#photo-dialog').addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();movePhoto(event.key==='ArrowLeft'?-1:1);}
});
$('#photo-content').addEventListener('touchstart',event=>{
  if(event.touches.length!==1||!event.target.closest('.photo-stage')){gallery.touch=null;return;}
  const point=event.touches[0];gallery.touch={x:point.clientX,y:point.clientY};
},{passive:true});
$('#photo-content').addEventListener('touchend',event=>{
  const start=gallery.touch;gallery.touch=null;if(!start||event.changedTouches.length!==1)return;
  const point=event.changedTouches[0],dx=point.clientX-start.x,dy=point.clientY-start.y;
  if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.25)movePhoto(dx<0?1:-1);
},{passive:true});
$('#photo-content').addEventListener('touchcancel',()=>{gallery.touch=null;},{passive:true});
addEventListener('popstate',event=>{
  const saved=event.state?.kcmo?event.state:{},wasPhoto=$('#photo-dialog').open;
  state.selected=saved.selected&&visible().some(p=>p.id===saved.selected)?saved.selected:state.selected;
  state.preview=Boolean(saved.preview&&state.selected);state.detailOpen=Boolean(saved.detailOpen&&state.selected);
  state.overlay=saved.overlay||null;
  for(const id of ['photo-dialog','options-dialog','compare-dialog','about-dialog','places-guide-dialog'])$('#'+id).close();
  if(!state.detailOpen)$('#property-dialog').close();setView(saved.view||'map',false);renderList();renderDetails();renderPlaceMarkers();drawRoutes();
  if(state.detailOpen&&!$('#property-dialog').open)$('#property-dialog').showModal();
  if(state.overlay==='photo-dialog'){gallery.propertyId=saved.photoProperty||gallery.propertyId;gallery.index=saved.photoIndex||0;renderPhotoGallery();}
  if(state.overlay)$('#'+state.overlay).showModal();
  if(wasPhoto&&state.overlay!=='photo-dialog')returnPhotoFocus();
});

function openOverlay(id){state.overlay=id;$('#zip-picker').open=false;$('#'+id).showModal();if(id==='options-dialog'){$('#options-dialog').scrollTop=0;$('#options-dialog .guide-content').scrollTop=0;}remember();}
function closeOverlay(id,returnOptions=false){
  $('#'+id).close();state.overlay=returnOptions?'options-dialog':null;
  if(returnOptions){$('#options-dialog').showModal();$(id==='about-dialog'?'#about-open':'#places-guide-open').focus({preventScroll:true});}
  remember(true);if(id==='photo-dialog')returnPhotoFocus();
}
for(const id of ['options-dialog','compare-dialog','photo-dialog','about-dialog','places-guide-dialog'])$('#'+id).addEventListener('cancel',e=>{e.preventDefault();closeOverlay(id,['about-dialog','places-guide-dialog'].includes(id));});

$('#all-areas').onclick=()=>{$('#options-dialog').close();setView('map');mapCommand({type:'fit-all'});};
$('#zip-select-all').onclick=()=>{state.zips=new Set(zipCodes);updateZipChoices();};
$('#zip-select-none').onclick=()=>{state.zips.clear();updateZipChoices();};
function updateZipChoices(){
  $('.zip-filters').querySelectorAll('input').forEach(input=>input.checked=state.zips.has(input.value));
  if(state.selected&&!state.zips.has(lookup(state.selected)?.zip)){state.selected=null;state.preview=false;state.detailOpen=false;}
  applyZipBoundaries();renderList();renderDetails();syncMap();if(state.zips.size)fitOverview();
}
const previewObserver=new ResizeObserver(()=>syncMap());previewObserver.observe($('#details'));
addEventListener('pagehide',event=>{if(event.persisted)return;bridge.destroy();mapAbort.abort();mountedMap?.destroy();shellObserver.disconnect();previewObserver.disconnect();});

$('#zip-picker-done').onclick=()=>{$('#zip-picker').open=false;$('#zip-picker summary').focus();};
document.addEventListener('click',event=>{if(!$('#zip-picker').contains(event.target))$('#zip-picker').open=false;});
$('#zip-picker').addEventListener('keydown',event=>{if(event.key==='Escape'){$('#zip-picker').open=false;$('#zip-picker summary').focus();}});
