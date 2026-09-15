const data=window.KCMO_MAP_DATA;
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>typeof n==='number'?'$'+n.toLocaleString('en-US',{maximumFractionDigits:0}):n?escape(n):'Unverified';
const area=n=>n?escape(Number(n).toLocaleString('en-US'))+' sq ft':'Area unverified';
const listingDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s))?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):escape(s);
function unitSummary(p,beds=1){
  const units=(p.units||[]).filter(u=>u.beds===beds);if(!units.length)return null;
  const rents=units.map(u=>u.rent).filter(Number.isFinite),sizes=units.map(u=>u.sqft).filter(Number.isFinite);
  const range=(nums,format)=>Math.min(...nums)===Math.max(...nums)?format(nums[0]):format(Math.min(...nums))+'–'+format(Math.max(...nums));
  return {price:rents.length?range(rents,money):'Rent unverified',size:sizes.length?range(sizes,n=>n.toLocaleString())+' sq ft':'Area unverified',count:units.length};
}
const priceSummary=p=>{const u=unitSummary(p);return u?`${u.price} · ${u.size} (listed options)`:`${money(p.oneBedroom.rent)} · ${area(p.oneBedroom.sqft)} (saved research)`;};
const anchor=(url,label,cls='')=>url?`<a class="${cls}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`:`<span class="unavailable">${escape(label)}<br>Not verified</span>`;
const cores=data.places.filter(p=>p.category==='Core scene');
// Explanatory UI copy only; property facts and decisions still come from the master export.
const placeGuides={
  'in-good-co':{short:'Cocktail lounge',description:'A membership-based cocktail lounge for drinks, music and social gatherings.',source:'https://igckc.com/',checked:'2026-09-14'},
  mod:{short:'Art & music',description:'An art gallery and event space hosting local art, bands and DJs.',source:'https://www.boommod.com/',checked:'2026-09-14'},
  recordbar:{short:'Live music',description:'A live-music venue with a calendar of concerts.',source:'https://www.therecordbar.com/',checked:'2026-09-14'},
  'third-place-lounge':{short:'Lounge',description:'A saved place for going out, with menus and small-event rentals on its website.',source:'https://www.thirdplacekc.com/',checked:'2026-09-14'}
};
const iconPaths={home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',nightlife:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',library:'<path d="M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2v15"/>',coffee:'<path d="M3 8h14v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5ZM17 9h2a3 3 0 1 1 0 6h-2M7 2v3M12 2v3"/>'};
const icon=kind=>`<svg class="place-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[kind]||iconPaths.nightlife}</svg>`;
const placeKind=p=>p.category==='Library'?'library':p.category==='Coffee'?'coffee':'nightlife';
const categoryLabel=p=>({library:'Library',coffee:'Coffee shop',nightlife:'Nightlife / events'})[placeKind(p)];
const friendlyFact=s=>s==='Your overall ZIP rank'?'My preference ranking (not chosen yet)':s==='Exact building coordinates'?'Exact address / map pin':s;
const readableCopy=s=>String(s??'').replace(/core[- ]venue/gi,'nearby nightlife').replace(/core scene/gi,'nearby nightlife').replace(/scene access/gi,'access to nightlife').replace(/\bscenes?\b/gi,'nightlife');
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?0:600;
const state={zips:new Set(['64108','64109']),destination:'in-good-co',sort:'walk',search:'',selected:null,compare:new Set(),draftRanks:new Map(),threeD:false,comparing:false};
let map=null,lib=null,mapReady=false,popup=null,propertyMarkers=[],placeMarkers=[],rankService=false;
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
const visible=()=>data.properties.filter(p=>state.zips.has(p.zip)&&(!state.search||[p.name,p.neighborhood,p.address].join(' ').toLowerCase().includes(state.search))).sort((a,b)=>{
  if(state.sort==='name')return a.name.localeCompare(b.name);
  if(state.sort==='overall')return a.zip.localeCompare(b.zip)||(currentRank(a)??Infinity)-(currentRank(b)??Infinity)||a.name.localeCompare(b.name);
  const ar=state.sort==='cluster'?a.nearest:currentRoute(a),br=state.sort==='cluster'?b.nearest:currentRoute(b);
  return (ar?.minutes??Infinity)-(br?.minutes??Infinity)||(ar?.metres??Infinity)-(br?.metres??Infinity)||a.name.localeCompare(b.name);
});
function photo(p,cls='thumb'){
  return p.photo?`<img class="${cls}" src="${escape(p.photo)}" alt="${escape(p.name)} — building or community photo" loading="lazy" referrerpolicy="no-referrer">`:`<div class="${cls} photo-empty">Photo<br>not verified</div>`;
}
function handleImages(root=document){root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{const box=document.createElement('div');box.className=img.className+' photo-empty';box.textContent='Photo unavailable — open the source gallery';img.replaceWith(box);},{once:true}));}
function renderList(){
  const items=visible(),mapped=items.filter(p=>p.coordinates).length,unmapped=items.length-mapped;
  $('#result-count').textContent=String(items.length);
  $('#coverage-count').textContent=`${items.length} apartments · ${mapped} on map · ${unmapped} need map pins`;
  $('#order-explanation').textContent=state.sort==='overall'?'My preference order within each ZIP':state.sort==='name'?'Alphabetical order':state.sort==='cluster'||state.destination==='nearest'?'Shortest walk to any of my four places first':`Shortest walk to ${cores.find(v=>v.id===state.destination)?.name||'the selected place'} first`;
  $('#list-guidance').hidden=!state.comparing&&!state.compare.size;
  $('#list-guidance').textContent='Choose up to 3 apartments to compare.';
  for(const zip of ['64108','64109'])$('#zip-count-'+zip).textContent='('+data.properties.filter(p=>p.zip===zip).length+')';
  $('#property-list').innerHTML=items.length?items.map(p=>`<article class="property-card ${state.selected===p.id?'selected':''}" data-id="${p.id}">
    <button class="card-select" data-select="${p.id}" aria-label="View ${escape(p.name)}" aria-pressed="${state.selected===p.id}">${photo(p)}<span><span class="card-title">${escape(p.name)}</span><span class="card-address">${escape(p.neighborhood)} · ${p.zip}</span><span class="view-details-label">View details →</span>${!p.coordinates?'<span class="card-pin-note">Map pin unverified</span>':''}</span></button>
    ${state.sort==='overall'?`<span class="badge">My rank in ${p.zip}: ${currentRank(p)??'Not ranked yet'}${state.draftRanks.has(p.id)?' · draft':''}</span>`:''}
    ${state.comparing||state.compare.size||state.selected===p.id?`<div class="card-footer"><label class="compare-check"><input type="checkbox" aria-label="Compare ${escape(p.name)}" data-compare="${p.id}" ${state.compare.has(p.id)?'checked':''}>${state.compare.has(p.id)?'Added to comparison':'Compare'}</label></div>`:''}
  </article>`).join(''):'<div class="empty"><p>No matching apartments. Choose a ZIP or clear your search.</p><button id="reset-results">Show all apartments</button></div>';
  handleImages($('#property-list'));
  $('#property-list').querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>selectProperty(b.dataset.select,true));
  $('#property-list').querySelectorAll('[data-compare]').forEach(c=>c.onchange=()=>{toggleCompare(c.dataset.compare,c.checked);$(`[data-compare="${c.dataset.compare}"]`)?.focus({preventScroll:true});});
  $('#reset-results')?.addEventListener('click',resetApartments);
  renderCompareBar();renderPropertyMarkers();
}
function renderDetails(){
  const p=lookup(state.selected),panel=$('#details');
  if(!p){panel.hidden=true;return;}
  panel.hidden=false;const route=currentRoute(p),destination=activeDestination(p),one=unitSummary(p);
  const transit=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(p.address+', Kansas City, MO '+p.zip)}&destination=${encodeURIComponent((destination?.address||'1518 McGee St')+', Kansas City, MO')}&travelmode=transit`;
  const warning=/UNCONFIRMED BUILDING/.test(p.twoBedroom.evidence||'');
  const short=route&&route.minutes<=12;
  panel.innerHTML=`<div class="detail-hero">${photo(p,'hero-photo')}<button class="detail-close" aria-label="Close property details">×</button></div>
    <p class="photo-caption">${escape(p.photo?p.photoCaption:'No verified building photo. A missing photo does not remove this candidate.')} ${p.photoSource?anchor(p.photoSource,'Photo source'):''}</p>
    <div class="detail-body"><p class="eyebrow">Apartment · ${escape(p.neighborhood)} · ${p.zip}</p><h2 id="selected-apartment-title" tabindex="-1">${escape(p.name)}</h2><p class="small muted">${escape(p.address)}</p><div class="detail-actions"><button class="detail-compare">${state.compare.has(p.id)?'Remove from comparison':'Add to comparison'}</button><button class="show-on-map" ${!p.coordinates?'disabled':''}>Show on map</button></div>
    ${p.band==='PIPELINE'?'<p class="badge warning">Future project — not confirmed ready to lease</p>':''}
    <div class="headline-box"><h3>${escape(headline(p))}</h3><p class="route-meta">${route?`${route.metres.toLocaleString()} m · rounded-up pedestrian estimate · checked ${escape(route.checked)}`:'No measured route stored. Resolve the building address before relying on travel time.'}</p>${route?anchor(route.url,`Walking route to ${route.destination}`,'route-link'):anchor(p.links.googleMaps,'Check address in Maps')}</div>
    <div class="beds"><div class="bed"><h3>1 BEDROOM · ${one?'CHECKED LISTINGS':'SAVED RESEARCH'}</h3><strong>${one?.price||money(p.oneBedroom.rent)}</strong><p>${one?.size||area(p.oneBedroom.sqft)}</p></div><div class="bed"><h3>2 BEDROOM · SAVED RESEARCH</h3><strong>${money(p.twoBedroom.rent)}</strong><p>${area(p.twoBedroom.sqft)}</p>${warning?'<p class="warning">Not confirmed to this building</p>':''}</div></div>
    ${(p.units||[]).length?`<details class="listed-units"><summary>View ${p.units.length} listed ${p.units.length===1?'apartment':'apartments'} &amp; move-in dates</summary>${p.units.map(u=>`<div class="listed-unit"><strong>#${escape(u.unit)} · ${u.beds}BR · ${area(u.sqft)} · ${money(u.rent)}</strong><span>${listingDate(u.available)} · deposit ${money(u.deposit)}</span></div>`).join('')}<p class="small muted">Checked ${escape(p.units[0].checked)}. Future dates are not immediate vacancies. Exact-unit photos have not been verified; the image above is a building photo.</p></details>`:''}
    <div class="link-grid">${anchor(p.links.photos,'Photos')}${anchor(p.links.floorplans,'Floor plans')}${anchor(p.links.units,'Available units')}${anchor(p.links.streetView,'Street View')}${anchor(p.links.appleMaps,'Apple Maps')}${anchor(p.links.website,'Property source')}</div>
    <p class="small muted">Sources checked: ${escape(p.checked||'Not recorded')}. Rents and vacancies can change.</p><details class="source-details"><summary>Listing notes &amp; verification</summary><p class="small muted">${escape(p.linkScope)}</p><p class="evidence">${escape(p.availability)}</p>${p.oneBedroom.evidence?`<p class="evidence">${escape(p.oneBedroom.evidence)}</p>`:''}${p.twoBedroom.evidence?`<p class="evidence ${warning?'warning':''}">${escape(p.twoBedroom.evidence)}</p>`:''}</details>
    <div class="detail-section"><div class="insight strength"><strong>Strengths</strong>${escape(readableCopy(p.strengths||'No confirmed standout features recorded yet.'))} ${route&&route.minutes<=12?escape(`The ${route.minutes}-minute estimate puts ${route.destination} within a short walk.`):''}</div><div class="insight tradeoff"><strong>Tradeoffs</strong>${escape(readableCopy(p.tradeoffs||'Insufficient comparable evidence. No overall verdict yet.'))}</div><details class="confirm-box"><summary>Needs confirmation · ${missing(p).length} items</summary><p>${escape(readableCopy(p.confirmation))}</p><ul>${missing(p).map(x=>`<li>${escape(friendlyFact(x))}</li>`).join('')}</ul></details></div>
    <section class="detail-section"><h3>What matters to me</h3><p class="small muted" style="margin-bottom:10px">Amenities are recorded research, not a fresh inspection of the exact available unit.</p><dl class="facts"><dt>Location</dt><dd>${escape(headline(p))}</dd><dt>Space</dt><dd>1BR ${one?.size||area(p.oneBedroom.sqft)} · 2BR ${area(p.twoBedroom.sqft)}${warning?' (building unconfirmed)':''}</dd>${[['finishes','Modern finishes'],['sunlight','Sunlight'],['entrance','Street entrance'],['laundry','Laundry'],['cooling','Cooling'],['pool','Pool'],['gym','Gym']].map(([key,label])=>`<dt>${label}</dt><dd>${escape(p.amenities[key])}</dd>`).join('')}</dl></section>
    <section class="detail-section"><h3>Walks to places I’d go</h3>${cores.map(v=>{const r=p.walks.find(w=>w.destinationId===v.id);return `<button class="travel-row ${route?.destinationId===v.id?'active':''}" data-destination="${v.id}" aria-pressed="${route?.destinationId===v.id}"><span>${escape(v.name)}<small>${escape(placeGuides[v.id]?.short||'Nightlife')} · ${escape(v.address)}</small></span><strong>${r?r.minutes+' min walk':'Unverified'}</strong></button>`;}).join('')}<details class="route-method"><summary>How walking times are estimated</summary><p class="small muted">The time, highlighted route and distance order use the same saved walking route. Estimates include short entrance connections. Crossings, closures, accessibility and personal pace have not been checked on foot.</p></details>
    <h3 style="margin-top:15px">Getting home late</h3><p class="transit-note">${short?'Walking is likely more practical for this short trip. ':''}Streetcar service ends at midnight Sun–Thu and 1am Fri–Sat. Check the last departure; plan a walk or rideshare after service ends.</p><details class="transit-details"><summary>Streetcar option &amp; live directions</summary><p class="transit-note">${transitExplanation(p,route)}<br><br>Free service starts at 5am. ${anchor(transit,`Check live transit to ${destination?.name||'the selected place'}`)} · ${anchor(data.geography.streetcar.hoursSource,'Official hours')}</p></details></section>
    <details class="detail-section calculation-details"><summary>Voucher estimate &amp; calculations</summary><p class="small muted">${escape(data.meta.voucherCaveat)}</p><dl class="facts"><dt>Acceptance</dt><dd>${escape(p.hcv)}</dd><dt>1-bedroom rent + utility allowance</dt><dd>${money(p.oneBedroom.rent)} + ${money(p.oneBedroom.utilityAllowance)} = ${money(p.oneBedroom.gross)}</dd><dt>1-bedroom standard</dt><dd>${money(p.oneBedroom.standard)}</dd><dt>Recorded 1-bedroom fit</dt><dd>${escape(p.oneBedroom.fit)} — estimate only</dd><dt>2-bedroom total / fit</dt><dd>${money(p.twoBedroom.gross)} / ${escape(p.twoBedroom.fit)}${warning?' — invalid as a Star-specific conclusion until attribution is confirmed.':' — compared with recorded 1-bedroom standard; estimate only.'}</dd></dl></details>
    <section class="detail-section"><h3>My preference, not just distance</h3><p><strong>My rank in ${p.zip}:</strong> ${currentRank(p)??'Not ranked yet'}${state.draftRanks.has(p.id)?' (draft only)':''}.</p><p class="small muted">Distance-only rank in ${p.zip}: ${p.clusterRank??'Unverified'}${p.nearest?' · '+p.nearest.minutes+'-minute walk to '+escape(p.nearest.destination):''}. This compares the nearest of my four nightlife places. It does not pick a winner.</p><details class="ranking-details"><summary>${rankService?'Edit my preference rank':'Try a local draft ranking'}</summary><form class="rank-form"><label class="small" for="rank-input">My rank</label><input id="rank-input" inputmode="numeric" type="number" min="1" max="${data.properties.filter(x=>x.zip===p.zip).length}" value="${currentRank(p)??''}" placeholder="—"><button type="submit">${rankService?'Save to V3':'Try draft rank'}</button></form><p class="rank-status">${rankService?'Saves to V3 and rebuilds this local view. Publication is a separate step.':'Draft only: lasts until this page is reloaded. Does not change V3 or a shared link.'}</p></details></section>
    <section class="detail-section"><p class="small muted">Pin: ${escape(p.coordinateSource)}${p.coordinateChecked?' · checked '+escape(p.coordinateChecked):' · check date not recorded'}. ${!p.coordinates?'This record is listed but not pinned.':''}</p></section></div>`;
  handleImages(panel);panel.querySelector('.detail-close').onclick=closeProperty;
  panel.querySelector('.show-on-map').onclick=()=>{$('.map-frame').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});drawRoutes(true);};
  panel.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>{setDestination(b.dataset.destination);panel.querySelector(`[data-destination="${b.dataset.destination}"]`)?.focus({preventScroll:true});});
  panel.querySelector('.detail-compare').onclick=()=>{const adding=!state.compare.has(p.id);toggleCompare(p.id,adding);if(adding&&state.compare.has(p.id)){closeProperty();browseApartments(true);}else panel.querySelector('.detail-compare').focus({preventScroll:true});};
  panel.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const value=panel.querySelector('#rank-input').value,rank=value===''?null:Number(value),max=data.properties.filter(x=>x.zip===p.zip).length;
    if(rank!==null&&(!Number.isInteger(rank)||rank<1||rank>max)){showToast(`Use a whole-number rank from 1 to ${max}, or leave it blank.`);return;}
    const duplicate=data.properties.find(x=>x.id!==p.id&&x.zip===p.zip&&currentRank(x)===rank&&rank!==null);
    if(duplicate){showToast(`Rank ${rank} is already assigned to ${duplicate.name}. Choose a different rank.`);return;}
    if(rankService){try{const response=await fetch('/api/rank',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id,rank,expectedHash:data.meta.workbookSha256})});const result=await response.json();if(!response.ok)throw Error(result.error||'Save failed');location.reload();}catch(error){showToast(error.message);}}
    else {state.draftRanks.set(p.id,rank);renderList();renderDetails();showToast('Draft rank applied for comparison only. Not saved to V3.');}
  };
}
function closeProperty(){
  const id=state.selected;state.selected=null;renderDetails();renderList();renderPlaceMarkers();drawRoutes();
  $(`[data-select="${id}"]`)?.focus({preventScroll:innerWidth>800});
}
function selectProperty(id,fromList=false){
  popup?.remove();state.selected=id;$('#start-comparison').hidden=false;renderList();renderDetails();renderPlaceMarkers();drawRoutes(true);
  $('#selected-apartment-title')?.focus({preventScroll:true});
  if(innerWidth<=800)$('#details').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});
}
function setDestination(id){state.destination=id;$('#destination').value=id;if(state.sort==='cluster'){state.sort='walk';$('#sort-mode').value='walk';}renderList();renderDetails();renderPlaceMarkers();renderCoreShortcuts();renderDestinationContext();drawRoutes(true);}
function toggleCompare(id,on){if(on&&state.compare.size>=3){showToast('Compare up to three properties. Remove one first.');renderList();return;}if(on){state.compare.add(id);state.comparing=true;}else{state.compare.delete(id);if(!state.compare.size)state.comparing=false;}renderList();renderDetails();}
function renderCompareBar(){$('#compare-bar').hidden=state.compare.size===0;$('#compare-choose').hidden=state.compare.size>=3;$('#compare-open').hidden=state.compare.size<2;$('#compare-count').textContent=state.compare.size===1?'1 selected · choose one more':state.compare.size+' apartments selected';$('#compare-open').disabled=state.compare.size<2;$('#compare-open').textContent=state.compare.size<2?'Compare apartments':`Compare ${state.compare.size} apartments`;}
function renderComparison(){
  const items=[...state.compare].map(lookup),rows=[
    ['Walk to a night out',p=>escape(headline(p))],['1 bedroom',p=>priceSummary(p)],['2 bedrooms',p=>money(p.twoBedroom.rent)+' · '+area(p.twoBedroom.sqft)+(/UNCONFIRMED BUILDING/.test(p.twoBedroom.evidence||'')?'<p class="compare-warning">Not confirmed to this building</p>':'')],
    ['Modern finishes',p=>escape(p.amenities.finishes)],
    ['Sunlight',p=>escape(p.amenities.sunlight)],
    ['Street entrance',p=>escape(p.amenities.entrance)],
    ['Laundry',p=>escape(p.amenities.laundry)],
    ['Pool / gym',p=>escape(p.amenities.pool)+' / '+escape(p.amenities.gym)],
    ['Strengths',p=>escape(readableCopy(p.strengths||'Not enough evidence yet'))],
    ['Tradeoffs',p=>escape(readableCopy(p.tradeoffs||'Unverified'))],
    ['Availability',p=>escape(p.availability)],
    ['Voucher estimate',p=>`${escape(p.hcv)} acceptance; 1-bedroom recorded fit ${escape(p.oneBedroom.fit)}. Utilities / approval unverified.`],
    ['Needs confirmation',p=>escape(missing(p).map(friendlyFact).join('; '))],
    ['My preference rank',p=>`${p.zip}: ${currentRank(p)??'Not ranked yet'}${state.draftRanks.has(p.id)?' (draft only)':''}`],
    ['Distance-only rank',p=>`${p.zip}: ${p.clusterRank??'Unverified'}${p.nearest?' · '+p.nearest.minutes+' min to '+escape(p.nearest.destination):''}<p>Nearest of my four nightlife places; not a preference.</p>`],
    ['Sources',p=>anchor(p.links.website,'Property source')+' · '+anchor(p.links.floorplans,'Floor plans')+'<p>Check: '+escape(p.checked||'Not recorded')+'</p>']
  ];
  $('#comparison').innerHTML=`<table><thead><tr><th scope="col">What matters to me</th>${items.map(p=>`<th scope="col">${photo(p,'compare-photo')}<h3>${escape(p.name)}</h3><p class="small muted">${escape(p.address)} · ${p.zip}</p></th>`).join('')}</tr></thead><tbody>${rows.map(([label,get])=>`<tr><th scope="row">${label}</th>${items.map(p=>`<td>${get(p)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;handleImages($('#comparison'));$('#compare-dialog').showModal();
}
function renderCoreShortcuts(){$('#core-shortcuts').innerHTML=cores.map(v=>`<button class="${state.destination===v.id?'active':''}" data-core="${v.id}" aria-pressed="${state.destination===v.id}">${icon('nightlife')}<span>${escape(v.name)}</span></button>`).join('');$('#core-shortcuts').querySelectorAll('button').forEach(b=>b.onclick=()=>{setDestination(b.dataset.core);$(`[data-core="${b.dataset.core}"]`)?.focus({preventScroll:true});});}
function renderDestinationContext(){
  const p=cores.find(v=>v.id===state.destination),g=placeGuides[state.destination];
  $('#destination-context').innerHTML=p?`${icon('nightlife')}<span>Walks to <strong>${escape(p.name)}</strong> · ${escape(g?.short||'Nightlife')}<small>${escape(g?.description||'A place I want to live near.')}</small></span>`:`${icon('nightlife')}<span>Walks to <strong>my nearest nightlife place</strong><small>In Good Co, MOD, recordBar and Third Place Lounge. Each home’s time names its nearest one.</small></span>`;
}
function renderWelcome(){
  $('#map-legend').innerHTML=[['home','Apartments'],['nightlife','Nightlife & events'],['library','Libraries'],['coffee','Coffee shops']].map(([kind,label])=>`<li><span class="legend-symbol ${kind}">${icon(kind)}</span>${label}</li>`).join('');
  $('#places-guide-content').innerHTML=cores.map(p=>{const g=placeGuides[p.id];return `<article class="guide-place"><div class="guide-place-title">${icon('nightlife')}<div><h3>${escape(p.name)}</h3><p class="small muted">${escape(p.address)} · ${escape(p.neighborhood)}</p></div></div><p>${escape(g.description)}</p><div class="guide-place-actions"><button data-guide-destination="${p.id}">Use ${escape(p.name)} for walking times</button>${anchor(g.source,'Official website')}</div><p class="small muted">Description checked ${escape(g.checked)}. Check current events and entry requirements before visiting.</p></article>`;}).join('')+`<section class="guide-daytime"><h3>Daytime laptop stops</h3><p>${icon('library')} Libraries and ${icon('coffee')} coffee shops are shown separately for daytime visits. Coffee-shop Wi-Fi, outlets and laptop policies still need checking.</p><button id="browse-daytime">Browse libraries &amp; coffee shops</button></section>`;
  $('#places-guide-content').querySelectorAll('[data-guide-destination]').forEach(b=>b.onclick=()=>{setDestination(b.dataset.guideDestination);$('#places-guide-dialog').close();$('#options-dialog').showModal();$('#places-guide-open').focus({preventScroll:true});});
  $('#browse-daytime').onclick=()=>{$('#places-guide-dialog').close();$('#options-dialog').showModal();$('.places-directory').open=true;$('.places-directory').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});$('.places-directory button')?.focus({preventScroll:true});};
  renderDestinationContext();
}
function browseApartments(comparing=false){
  $('#options-dialog').close();state.comparing=comparing||state.compare.size>0;renderList();
  $('.list-pane').scrollTop=0;$('#apartments-heading').focus({preventScroll:true});
  if(innerWidth<=800)$('.list-pane').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});
}
function renderPlaces(){
  $('#place-list').innerHTML=data.places.filter(p=>p.category!=='Core scene').map(p=>`<button class="place-row" data-place="${p.id}">${icon(placeKind(p))}<span>${escape(p.name)}<small>${escape(categoryLabel(p))} · ${escape(p.neighborhood||'Area unverified')}${!p.coordinates?' · Map pin needed':''}</small></span></button>`).join('');
  $('#place-list').querySelectorAll('button').forEach(b=>b.onclick=()=>showPlace(data.places.find(v=>v.id===b.dataset.place)));
}
function showPlace(p){
  $('#options-dialog').close();
  if(!p.coordinates){showToast(`${p.name}: ${p.address}. No confirmed coordinate; no pin invented.`);return;}
  if(!mapReady){showToast('The map is unavailable. Use the source in the places list after reconnecting.');return;}
  state.selected=null;renderDetails();renderList();drawRoutes();
  map.flyTo({center:[p.coordinates[1],p.coordinates[0]],zoom:15,duration:motion()});
  const g=placeGuides[p.id];
  popup?.remove();popup=new lib.Popup({offset:18,maxWidth:'290px'}).setLngLat([p.coordinates[1],p.coordinates[0]]).setHTML(`<div class="place-popup"><h3>${icon(placeKind(p))}${escape(p.name)}</h3><p>${escape(p.address)}</p><p>${escape(categoryLabel(p))} · ${escape(p.neighborhood||'')}</p><p>${escape(g?.description||p.note)}</p><p class="small">${g?'Description checked':'Source check'}: ${escape(g?.checked||p.checked||'Current status not checked')}. Map position: ${escape(p.coordinateSource)}</p>${g?.source||p.source?anchor(g?.source||p.source,'Official / recorded source'):anchor('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name+' '+p.address+' Kansas City MO'),'Look up this saved place')}</div>`).addTo(map);
  if(innerWidth<=800)$('.map-pane').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});
}
const collection=features=>({type:'FeatureCollection',features});
const point=(coordinates,properties={})=>({type:'Feature',geometry:{type:'Point',coordinates:[coordinates[1],coordinates[0]]},properties});
function renderPropertyMarkers(){
  if(!mapReady)return;propertyMarkers.forEach(m=>m.remove());propertyMarkers=[];
  const groups=[];
  for(const p of visible().filter(p=>p.coordinates)){
    const xy=map.project([p.coordinates[1],p.coordinates[0]]);
    const group=groups.find(g=>Math.abs(g.xy.x-xy.x)<46&&Math.abs(g.xy.y-xy.y)<46);
    if(group)group.items.push(p);else groups.push({xy,items:[p]});
  }
  for(const {items:group} of groups){
    const p=group.find(x=>x.id===state.selected)||group[0],button=document.createElement('button');button.className=`property-pin zip-${p.zip} ${group.some(x=>x.id===state.selected)?'selected':''}`;
    button.setAttribute('aria-label',group.length>1?`Choose ${group.length} nearby properties: ${group.map(x=>x.name).join(', ')}`:`Map: ${p.name}`);button.dataset.propertyId=p.id;
    button.innerHTML=`<span class="pin-face ${group.length>1?'group-pin':''}">${icon('home')}${group.length>1?`<span>${group.length}</span>`:''}</span>`;
    button.setAttribute('aria-pressed',String(group.some(x=>x.id===state.selected)));
    button.onclick=event=>{event.stopPropagation();if(group.length===1)selectProperty(p.id);else{popup?.remove();const list=document.createElement('div');list.className='place-popup';const title=document.createElement('h3');title.textContent=new Set(group.map(x=>x.coordinates.join(','))).size===1?'Separate records at one address':`${group.length} nearby properties at this zoom`;list.append(title);for(const candidate of group){const b=document.createElement('button');b.textContent=candidate.name;b.style.marginTop='8px';b.onclick=()=>{popup.remove();selectProperty(candidate.id);};list.append(b);}popup=new lib.Popup({offset:20}).setLngLat([group[0].coordinates[1],group[0].coordinates[0]]).setDOMContent(list).addTo(map);}};
    propertyMarkers.push(new lib.Marker({element:button}).setLngLat([p.coordinates[1],p.coordinates[0]]).addTo(map));
  }
}
function renderPlaceMarkers(){
  if(!mapReady)return;placeMarkers.forEach(m=>m.remove());placeMarkers=[];
  const leftLabels=new Set(['in-good-co','recordbar','mod']);
  for(const p of data.places.filter(p=>p.coordinates)){
    const core=p.category==='Core scene',day=['Coffee','Library'].includes(p.category);
    const active=state.destination==='nearest'?currentRoute(lookup(state.selected)||{walks:[]})?.destinationId:state.destination;
    if(core&&p.id!==active&&!$('#layer-core').checked&&state.destination!=='nearest')continue;
    if(!core&&((day&&!$('#layer-daytime').checked)||(!day&&!$('#layer-scenes').checked)))continue;
    const always=core||/Lowest Ferns/.test(p.name),button=document.createElement('button');button.className=`venue-pin ${day?'daytime':!core?'other-scene':''} ${always?'priority':''} ${state.destination===p.id?'active':''}`;button.dataset.always=always?'true':'false';button.setAttribute('aria-label',`${categoryLabel(p)}: ${p.name}`);button.dataset.placeId=p.id;
    const label=p.name==='In The Lowest Ferns'?'Lowest Ferns · West Bottoms':p.name;
    button.innerHTML=`<span class="place-dot">${icon(placeKind(p))}</span><span class="place-label">${escape(label)}${core?`<small>${escape(placeGuides[p.id]?.short||'Nightlife')}</small>`:''}</span>`;
    if(leftLabels.has(p.id))button.classList.add('label-left');
    button.onclick=event=>{event.stopPropagation();if(core){setDestination(p.id);if(!state.selected)showPlace(p);}else showPlace(p);};
    placeMarkers.push(new lib.Marker({element:button,anchor:'center'}).setLngLat([p.coordinates[1],p.coordinates[0]]).addTo(map));
  }updatePlaceLabels();
}
function updatePlaceLabels(){if(!map)return;for(const m of placeMarkers){const el=m.getElement();el.classList.toggle('labels-hidden',el.dataset.always!=='true'&&map.getZoom()<14);}}
function drawRoutes(fit=false){
  if(!mapReady)return;const p=lookup(state.selected),r=p?currentRoute(p):null;
  const all=p&&($('#layer-core').checked||state.destination==='nearest')?p.walks.filter(w=>w.geometry).map(w=>({type:'Feature',geometry:w.geometry,properties:{destination:w.destinationId}})):[];
  map.getSource('walks').setData(collection(all));map.getSource('selected-walk').setData(collection(r?.geometry?[{type:'Feature',geometry:r.geometry,properties:{}}]:[]));
  if(fit&&p?.coordinates){
    const coords=[p.coordinates,...cores.filter(v=>v.coordinates&&(v.id===r?.destinationId||$('#layer-core').checked)).map(v=>v.coordinates)];const bounds=new lib.LngLatBounds();coords.forEach(c=>bounds.extend([c[1],c[0]]));
    map.fitBounds(bounds,{padding:{top:70,bottom:55,left:45,right:innerWidth>800?Math.min(415,$('.map-pane').clientWidth*.65):55},maxZoom:16,duration:motion(),pitch:state.threeD?50:0});
  }
}
function fitOverview(){
  if(!mapReady)return;
  const coords=visible().filter(p=>p.coordinates).map(p=>p.coordinates);
  cores.filter(c=>c.id===state.destination||state.destination==='nearest'||$('#layer-core').checked).forEach(c=>c.coordinates&&coords.push(c.coordinates));
  if(!coords.length)return;
  const bounds=new lib.LngLatBounds();coords.forEach(c=>bounds.extend([c[1],c[0]]));
  map.fitBounds(bounds,{padding:{top:75,bottom:45,left:42,right:52},maxZoom:14,duration:motion(),pitch:0,bearing:0});
}
function overview(){
  state.selected=null;renderDetails();renderList();renderPlaceMarkers();drawRoutes();popup?.remove();
  if(!mapReady)return;
  state.threeD=false;map.setLayoutProperty('buildings-3d','visibility','none');$('#three-d').setAttribute('aria-pressed','false');$('#map-mode-note').hidden=true;fitOverview();
}
async function startMap(){
  try{
    lib=await import('https://unpkg.com/maplibre-gl@6.9.1/dist/maplibre-gl.mjs');
    map=new lib.Map({container:'map',style:'https://tiles.openfreemap.org/styles/positron',center:[-94.578,39.083],zoom:12.9,attributionControl:{compact:true},canvasContextAttributes:{antialias:true}});
    map.addControl(new lib.ScaleControl({maxWidth:90,unit:'imperial'}),'bottom-left');
    map.on('load',()=>{
      const before=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
      map.addSource('zip-areas',{type:'geojson',data:data.geography.zipAreas.geometry});
      map.addLayer({id:'zip-fill',type:'fill',source:'zip-areas',paint:{'fill-color':['match',['get','ZCTA5'],'64108','#245c9e','#7557a0'],'fill-opacity':.025}},before);
      map.addLayer({id:'zip-lines',type:'line',source:'zip-areas',paint:{'line-color':['match',['get','ZCTA5'],'64108','#245c9e','#7557a0'],'line-width':2,'line-opacity':.7,'line-dasharray':[3,2]}},before);
      map.addSource('streetcar',{type:'geojson',data:data.geography.streetcar.routes});
      map.addLayer({id:'streetcar-line',type:'line',source:'streetcar',paint:{'line-color':'#278377','line-width':3,'line-opacity':.8}},before);
      map.addSource('stops',{type:'geojson',data:collection(data.geography.streetcar.stops.map(s=>point(s.coordinates,{name:s.name,id:s.id})))});
      map.addLayer({id:'streetcar-stops',type:'circle',source:'stops',paint:{'circle-radius':['interpolate',['linear'],['zoom'],11,2,15,5],'circle-color':'#fff','circle-stroke-color':'#23776d','circle-stroke-width':2}});
      map.addLayer({id:'stop-labels',type:'symbol',source:'stops',minzoom:14,layout:{'text-field':['get','name'],'text-size':10,'text-font':['Noto Sans Regular'],'text-offset':[0,1.2],'text-anchor':'top','text-max-width':12},paint:{'text-color':'#2a6860','text-halo-color':'#fff','text-halo-width':2}});
      map.addSource('walks',{type:'geojson',data:collection([])});map.addSource('selected-walk',{type:'geojson',data:collection([])});
      map.addLayer({id:'walk-context',type:'line',source:'walks',paint:{'line-color':'#3c76af','line-width':2,'line-opacity':.35,'line-dasharray':[2,2]}});
      map.addLayer({id:'walk-halo',type:'line',source:'selected-walk',paint:{'line-color':'#fff','line-width':8}});
      map.addLayer({id:'walk-main',type:'line',source:'selected-walk',paint:{'line-color':'#2874bb','line-width':4}});
      const labels=[['CROSSROADS',[39.089,-94.589]],['18TH & VINE',[39.089,-94.5585]],['WESTSIDE',[39.084,-94.601]],['BEACON HILL',[39.078,-94.572]],['MIDTOWN / HYDE PARK',[39.061,-94.574]],['WEST BOTTOMS',[39.106,-94.602]],['64108',[39.081,-94.593]],['64109',[39.066,-94.563]],['I-670',[39.0968,-94.572]],['I-35',[39.088,-94.597]],['US-71',[39.079,-94.552]]];
      map.addSource('area-labels',{type:'geojson',data:collection(labels.map(([name,c])=>point(c,{name})))});
      map.addLayer({id:'area-labels',type:'symbol',source:'area-labels',layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':11,'text-letter-spacing':.08},paint:{'text-color':'#526573','text-halo-color':'#fff','text-halo-width':2}});
      map.addSource('buildings-3d',{type:'vector',url:'https://tiles.openfreemap.org/planet'});
      map.addLayer({id:'buildings-3d',source:'buildings-3d','source-layer':'building',type:'fill-extrusion',minzoom:15,filter:['!=',['get','hide_3d'],true],layout:{visibility:'none'},paint:{'fill-extrusion-color':'#c7d2d9','fill-extrusion-height':['coalesce',['get','render_height'],3],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.85}},before);
      mapReady=true;$('#map-status').hidden=true;applyMapLayers();renderPropertyMarkers();renderPlaceMarkers();if(state.selected)drawRoutes(true);else overview();
      map.on('zoom',updatePlaceLabels);
      map.on('moveend',renderPropertyMarkers);
      map.on('click','streetcar-stops',e=>{const f=e.features?.[0];if(!f)return;popup?.remove();popup=new lib.Popup().setLngLat(e.lngLat).setHTML(`<div class="place-popup"><h3>${escape(f.properties.name)}</h3><p>Published Streetcar platform · route feed ${escape(data.geography.streetcar.feed.feed_version)}</p>${anchor(data.geography.streetcar.source,'Agency route data')}</div>`).addTo(map);});
    });
    map.on('error',event=>{if(!mapReady){$('#map-status').textContent='Map tiles could not load. The complete list, comparison and direct links still work.';}console.warn('Map resource unavailable:',event.error?.message||'unknown resource');});
    new ResizeObserver(()=>{map.resize();if(mapReady&&!state.threeD){if(state.selected)drawRoutes(true);else fitOverview();}}).observe($('#map'));
  }catch(error){$('#map-status').textContent='Map unavailable on this connection or device. All candidates, comparisons and source links still work.';console.warn(error);}
}
function applyMapLayers(){
  if(!mapReady)return;
  for(const [input,layers] of [['#layer-zip',['zip-fill','zip-lines']],['#layer-streetcar',['streetcar-line','streetcar-stops','stop-labels']]]){
    for(const layer of layers)map.setLayoutProperty(layer,'visibility',$(input).checked?'visible':'none');
  }
}
function resetApartments(){
  state.zips=new Set(['64108','64109']);$('.zip-filters').querySelectorAll('input').forEach(c=>c.checked=true);state.search='';$('#search').value='';renderList();overview();
}
$('.zip-filters').querySelectorAll('input').forEach(c=>c.onchange=()=>{
  if(c.checked)state.zips.add(c.value);else state.zips.delete(c.value);
  if(state.selected&&!state.zips.has(lookup(state.selected).zip)){state.selected=null;renderDetails();renderPlaceMarkers();drawRoutes();}
  popup?.remove();renderList();if(!state.selected)overview();
});
$('#destination').onchange=e=>setDestination(e.target.value);
$('#sort-mode').onchange=e=>{state.sort=e.target.value;if(state.sort==='cluster'){state.destination='nearest';$('#destination').value='nearest';renderDetails();renderCoreShortcuts();renderPlaceMarkers();renderDestinationContext();drawRoutes();}renderList();};
$('#search').oninput=e=>{state.search=e.target.value.trim().toLowerCase();if(state.selected&&!visible().some(p=>p.id===state.selected)){state.selected=null;renderDetails();drawRoutes();}renderList();};
$('#overview').onclick=()=>{$('#options-dialog').close();resetApartments();$('.map-frame').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});};
for(const [id,amount] of [['zoom-in',1],['zoom-out',-1]])$('#'+id).onclick=()=>{if(!mapReady){showToast('The map is still loading.');return;}$('#options-dialog').close();$('.map-frame').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});map.zoomTo(map.getZoom()+amount,{duration:motion()});};
$('#three-d').onclick=()=>{if(!mapReady){showToast('The map is still loading. Try again once it appears.');return;}$('#options-dialog').close();$('.map-frame').scrollIntoView({block:'start',behavior:motion()?'smooth':'auto'});state.threeD=!state.threeD;$('#three-d').setAttribute('aria-pressed',String(state.threeD));$('#map-mode-note').hidden=!state.threeD;map.setLayoutProperty('buildings-3d','visibility',state.threeD?'visible':'none');const p=lookup(state.selected),c=p?.coordinates||cores[0]?.coordinates;map.flyTo({center:c?[c[1],c[0]]:map.getCenter(),zoom:state.threeD?16.4:14.3,pitch:state.threeD?55:0,bearing:state.threeD?-18:0,duration:motion()});};
$('#layer-zip').onchange=applyMapLayers;$('#layer-streetcar').onchange=applyMapLayers;
$('#layer-core').onchange=()=>{renderPlaceMarkers();drawRoutes();};
$('#layer-scenes').onchange=renderPlaceMarkers;$('#layer-daytime').onchange=renderPlaceMarkers;
$('#compare-open').onclick=renderComparison;$('#compare-close').onclick=()=>$('#compare-dialog').close();$('#compare-clear').onclick=()=>{state.compare.clear();state.comparing=false;renderList();renderDetails();$('#apartments-heading').focus({preventScroll:true});};
$('#compare-choose').onclick=()=>{if(state.selected)closeProperty();browseApartments(true);};
$('#more-options').onclick=()=>$('#options-dialog').showModal();$('#options-close').onclick=()=>$('#options-dialog').close();
$('#browse-apartments').onclick=()=>browseApartments();$('#start-comparison').onclick=()=>browseApartments(true);
$('#about-open').onclick=()=>{$('#options-dialog').close();$('#about-dialog').showModal();};$('#about-close').onclick=()=>$('#about-dialog').close();
$('#places-guide-open').onclick=()=>{$('#options-dialog').close();$('#places-guide-dialog').showModal();};$('#places-guide-close').onclick=()=>$('#places-guide-dialog').close();
$('#preview-notice').textContent=data.meta.staged?'Local research preview · Not published. Some facts still need checking.':'Research snapshot · Check sources for current rents and availability.';
$('#build-explanation').textContent=data.meta.notice;
$('#generated-at').textContent='Built '+new Date(data.meta.generatedAt).toLocaleString('en-US')+' · source checks are shown separately.';
for(const [dialog,opener] of [['about-dialog','about-open'],['places-guide-dialog','places-guide-open']])$('#'+dialog).addEventListener('close',()=>{if(!$('#options-dialog').open){$('#options-dialog').showModal();$('#'+opener).focus({preventScroll:true});}});
const fitWorkspace=()=>document.documentElement.style.setProperty('--intro-height',`${$('.workspace').getBoundingClientRect().top+scrollY}px`);
const shellObserver=new ResizeObserver(fitWorkspace);document.querySelectorAll('.page-header,.toolbar').forEach(el=>shellObserver.observe(el));
renderWelcome();renderList();renderPlaces();renderCoreShortcuts();startMap();
if(['localhost','127.0.0.1'].includes(location.hostname))fetch('/api/status').then(r=>r.ok?r.json():null).then(status=>{rankService=Boolean(status?.rankEditing)&&data.meta.masterMapFields;}).catch(()=>{});
