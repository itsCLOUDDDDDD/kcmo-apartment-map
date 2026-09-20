/* V3 research contract. Pure functions shared by Apps Script and the website exporter. */
const ResearchCore = (() => {
  'use strict';
  const SCHEMA=3, CLUSTER='Crossroads walk cluster';
  const text=v=>v===null||v===undefined?'':String(v).trim();
  const norm=v=>text(v).toLowerCase().replace(/\s+/g,' ');
  const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
  const amount=v=>number(v)!==null&&v>=0?v:null;
  const positive=v=>number(v)!==null&&v>0?v:null;
  function url(v,assets=false) {
    const s=text(v);
    if(assets&&/^\.\/assets\/[a-z0-9_./-]+$/i.test(s)&&!s.includes('..'))return s;
    if(!/^https?:\/\/[^/\s?#]+(?:[/?#][^\s<>]*)?$/i.test(s))return null;
    if(/^https?:\/\/[^/]*@/.test(s))return null;
    return s;
  }
  function date(v) {
    if(v instanceof Date)return isNaN(v.valueOf())?null:v.toISOString().slice(0,10);
    if(typeof v==='number'&&v>30000&&v<80000)return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
    const s=text(v);
    return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?s:null;
  }
  const addressKey=r=>JSON.stringify(['address-v1',norm(r.Address),norm(r['City/State']),text(r.Zip)]);
  const validCoords=c=>Array.isArray(c)&&c.length===2&&c.every(v=>number(v)!==null)&&Math.abs(c[0])<=90&&Math.abs(c[1])<=180;
  const metresBetween=(a,b)=>{const rad=Math.PI/180,dl=(b[0]-a[0])*rad,do_=(b[1]-a[1])*rad,h=Math.sin(dl/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(do_/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};
  const near=(a,b,t=0.000003)=>validCoords(a)&&validCoords(b)&&Math.abs(a[0]-b[0])<=t&&Math.abs(a[1]-b[1])<=t;
  function parse(v,fallback,label) {
    if(v===null||v===undefined||v==='')return fallback;
    if(typeof v!=='string')return v;
    try{return JSON.parse(v);}catch(e){throw Error((label||'JSON')+': invalid JSON; no partial record was exported.');}
  }
  function settings(rows=[]) {
    const s=Object.fromEntries(rows.filter(r=>r.Setting).map(r=>[r.Setting,r.Value]));
    return {planning:amount(s['Utility planning standard'])??90,
      reviewedZips:text(s['Website ZIP scope']||'64105,64106,64108,64109').split(',').map(text).filter(Boolean),
      sceneCity:text(s['Default scene city/state']||'Kansas City, MO'),
      routeBase:text(s['Walking routing base']||'https://routing.openstreetmap.de/routed-foot/route/v1/driving'),
      maxSnap:amount(s['Maximum endpoint gap metres'])??75};
  }
  function indexed(rows,key,label,{requireIds=false}={}) {
    const m=new Map();
    for(const r of rows){
      const id=text(r[key]);
      if(!id){
        if(requireIds&&Object.entries(r).some(([k,v])=>k!=='_row'&&text(v)))throw Error(label+' row '+(r._row||'?')+' is missing '+key+'.');
        continue;
      }
      if(m.has(id))throw Error('Duplicate '+label+' ID: '+id);m.set(id,r);
    }
    return m;
  }
  function duplicateNameGroups(rows) {
    const by=new Map();
    for(const r of rows){const key=norm(r.Property);if(!key)continue;const x=by.get(key)||{name:text(r.Property),ids:new Set(),addresses:new Set()};x.ids.add(text(r['Property ID']));x.addresses.add(text(r.Address));by.set(key,x);}
    return [...by.values()].filter(x=>x.ids.size>1).map(x=>({name:x.name,ids:[...x.ids].sort(),addresses:[...x.addresses].sort()}));
  }
  function unitRefToken(v){const s=text(v).replace(/^#/,'').toLowerCase();return /^0*\d+$/.test(s)?String(Number(s)):s;}
  function unitAliases(unit){
    const out=new Set(),raw=text(unit);
    for(const m of raw.matchAll(/[A-Za-z0-9-]*\d[A-Za-z0-9-]*/g)){const v=m[0].toLowerCase();out.add(v);out.add(unitRefToken(v));}
    if(raw)out.add(norm(raw));return out;
  }
  function explicitExactUnitTokens(caption){
    let s=text(caption);if(!/^exact\b/i.test(s))return [];
    s=s.replace(/\bnot\s+(?:an?\s+)?#([A-Za-z0-9-]+)/ig,'');
    return [...new Set([...s.matchAll(/#([A-Za-z0-9-]+)/g)].map(m=>unitRefToken(m[1])).filter(Boolean))];
  }
  function findUnitByReference(ref,units){
    const raw=norm(ref),token=unitRefToken(ref),exact=units.filter(u=>norm(u.unit)===raw);if(exact.length===1)return exact[0];if(exact.length>1)throw Error('Unit reference is ambiguous: '+ref);
    const matches=units.filter(u=>{const a=unitAliases(u.unit);return a.has(token)||a.has(raw);});
    if(matches.length>1)throw Error('Unit reference matches multiple apartments: '+ref);return matches[0]||null;
  }
  function explicitMediaOwner(raw,units){
    const tokens=explicitExactUnitTokens(raw?.caption);if(!tokens.length)return {unit:null,tokens:[]};
    const matches=new Map();for(const token of tokens){const u=findUnitByReference(token,units);if(u)matches.set(u.unit,u);}
    if(matches.size>1)throw Error('Exact-unit media caption matches multiple apartments: '+text(raw.caption));
    return {unit:[...matches.values()][0]||null,tokens};
  }
  function photo(p,expectedUnit=null) {
    if(!p||typeof p!=='object')throw Error('Photo must be an object.');
    const u=url(p.url,true);if(!u)throw Error('Invalid photo URL.');
    const scope=text(p.scope)|| (expectedUnit?'unit':'building');
    if(!['unit','building','amenity','floorplan'].includes(scope))throw Error('Unknown photo scope.');
    if(scope==='unit'&&(!expectedUnit||text(p.unit)!==text(expectedUnit)))throw Error('Unit photo ownership mismatch.');
    if(scope!=='unit'&&p.unit)throw Error('Building/amenity photo cannot carry a unit identifier.');
    return {id:text(p.id)||u,url:u,kind:p.kind==='link'?'link':'image',scope,
      unit:scope==='unit'?text(expectedUnit):null,caption:text(p.caption)||scope+' photo',
      source:url(p.source),checked:date(p.checked),attribution:text(p.attribution)};
  }
  function units(row,config) {
    const parsed=parse(row['Units JSON'],[],'Units for '+row['Property ID']);
    if(!Array.isArray(parsed))throw Error('Units JSON must be an array.');
    const seen=new Set(),photoOwners=new Map();
    return parsed.map(raw=>{
      const unit=text(raw.unit);if(!unit)throw Error('Unit identifier is required.');
      if(seen.has(norm(unit)))throw Error('Duplicate unit identifier at '+row['Property ID']+': '+unit);
      seen.add(norm(unit));
      const beds=raw.beds===null||raw.beds===''||raw.beds===undefined?null:raw.beds;
      if(beds!==null&&(!Number.isInteger(beds)||beds<0||beds>10))throw Error('Invalid bedroom count for '+unit);
      const p=(raw.photos||[]).map(x=>photo(x,unit));
      for(const x of p){if(photoOwners.has(x.url)&&photoOwners.get(x.url)!==unit)throw Error('One exact-unit image was assigned to different apartments.');photoOwners.set(x.url,unit);}
      const c=raw.costs||{},ownFee=c.feeStatus==='Confirmed'&&amount(c.requiredMonthlyFees)!==null&&url(c.feeSource)&&date(c.feesChecked);
      const commonFee=row['Fee status']==='Confirmed'&&row['Fee scope']==='All units'&&amount(row['Required Monthly Fees'])!==null&&url(row['Fee source'])&&date(row['Costs checked']);
      const useCommon=!ownFee&&c.feeStatus==='Use building confirmation';
      const confirmedAllowance=c.allowanceStatus==='Confirmed'&&amount(c.utilityAllowance)!==null&&url(c.allowanceSource)&&date(c.allowanceChecked);
      const fee=ownFee?c.requiredMonthlyFees:useCommon&&commonFee?row['Required Monthly Fees']:null;
      return {id:text(raw.id)||null,unit,beds,baths:positive(raw.baths),sqft:positive(raw.sqft),rent:positive(raw.rent),
        available:text(raw.available)||'Availability unknown',evidenceType:text(raw.evidenceType)||'Recorded research',
        checked:date(raw.checked),source:url(raw.source),amenities:text(raw.amenities)||null,
        deposit:amount(raw.deposit),photos:p,photo:p.find(x=>x.kind==='image')?.url||null,structured:true,
        utilityAllowance:confirmedAllowance?c.utilityAllowance:null,
        costs:{planningUtilities:config.planning,requiredMonthlyFees:fee,
          feeStatus:fee===null?'Unknown':'Confirmed',feeSource:ownFee?url(c.feeSource):useCommon&&commonFee?url(row['Fee source']):null,
          feesChecked:ownFee?date(c.feesChecked):useCommon&&commonFee?date(row['Costs checked']):null,
          utilityAllowance:confirmedAllowance?c.utilityAllowance:null,
          allowanceStatus:confirmedAllowance?'Confirmed':'Unknown',allowanceSource:confirmedAllowance?url(c.allowanceSource):null,
          allowanceChecked:confirmedAllowance?date(c.allowanceChecked):null}};
    });
  }
  function unitCost(unit,standard,planning=90) {
    const rent=positive(unit.rent),fees=amount(unit.costs?.requiredMonthlyFees),allowance=amount(unit.costs?.utilityAllowance);
    const total=rent!==null&&fees!==null?rent+planning+fees:null;
    const official=rent!==null&&fees!==null&&allowance!==null?rent+allowance+fees:null;
    return {planningStandard:planning,planningSubtotalExcludingUnresolvedFees:rent===null?null:rent+planning,
      unresolvedFees:fees===null,planningTotal:total,officialComparisonTotal:official,
      percent:total!==null&&positive(standard)!==null?total/standard:null,
      officialPercent:official!==null&&positive(standard)!==null?official/standard:null};
  }
  function location(row,d) {
    if(!d||d['Location input']!==addressKey(row))return null;
    const coords=[d.Latitude,d.Longitude];
    if(!validCoords(coords)||!/^(Validated|Saved address-matched)/.test(text(d['Location status'])))return null;
    if(!text(d['Coordinate source']))return null;
    return {coordinates:coords,source:text(d['Coordinate source']),sourceUrl:url(d['Coordinate source URL']),
      checked:date(d['Coordinate checked']),status:text(d['Location status']),input:addressKey(row)};
  }
  function routeOrigin(r,loc) {
    if(!text(r['Route origin JSON']))return {coordinates:loc.coordinates,scope:'Address location; entrance unverified',source:loc.sourceUrl,checked:loc.checked};
    const o=parse(r['Route origin JSON'],null,'Route origin');
    if(!o||!validCoords(o.coordinates)||!url(o.source)||!date(o.checked)||!text(o.scope)||metresBetween(o.coordinates,loc.coordinates)>250)return null;
    return {coordinates:o.coordinates,scope:text(o.scope),source:url(o.source),checked:date(o.checked)};
  }
  function routeKey(id,loc,dest,origin,config) {
    return JSON.stringify(['walk-v1',id,loc.input,loc.coordinates,dest.id,dest.locationInput,dest.coordinates,origin.coordinates,origin.source||null,config.routeBase,config.maxSnap]);
  }
  const providerAddressKey=r=>JSON.stringify(['outscraper-address-v1',text(r['Property ID']||r['Place ID']||r.id),norm(r.Address||r.address),norm(r['City/State']||r.cityState),text(r.Zip||r.zip)]);
  const providerRouteKey=(row,dest)=>JSON.stringify(['outscraper-route-v1',providerAddressKey(row),providerAddressKey(dest),'walk']);
  function sourceEndpoints(source) {
    const s=text(source),m=s.match(/[?&]route=([^&]+)/);
    if(m){try{return decodeURIComponent(m[1]).split(';').map(p=>p.split(',').map(Number));}catch{return null;}}
    const q=s.match(/\/routed-foot\/route\/v1\/(?:driving|foot)\/([^?]+)/);
    return q?q[1].split(';').map(p=>p.split(',').map(Number).reverse()):null;
  }
  function route(r,id,row,loc,dest,config) {
    if(!loc||!dest?.coordinates||text(r['Property ID'])!==id||text(r['Destination ID'])!==dest.id)return null;
    if(norm(r['Origin address'])!==norm(row.Address)||norm(r['Destination address'])!==norm(dest.address))return null;
    if(r.Provider==='Google'){
      if(r['Route mode']!=='walk'||!/^Current(?:;|$)/.test(text(r['Route status']))||
        r['Origin input']!==addressKey(row)||r['Destination input']!==dest.locationInput)return null;
      const a=parse(r['Provider origin coordinates'],null,'Google origin'),b=parse(r['Provider destination coordinates'],null,'Google destination');
      const seconds=positive(r['Provider seconds']),metres=positive(r.Metres),checked=date(r.Checked);
      if(!near(a,loc.coordinates,0.0000001)||!near(b,dest.coordinates,0.0000001)||seconds===null||metres===null||text(r.Checked)&&!checked)return null;
      const key=JSON.stringify(['manual-google-walk-v1',id,dest.id,addressKey(row),dest.locationInput,a,b]);
      if(text(r['Cache key'])&&r['Cache key']!==key)return null;
      const candidate=parse(r.Geometry,null,'Google walking geometry');
      const geometry=candidate?.type==='LineString'&&Array.isArray(candidate.coordinates)&&candidate.coordinates.length>1&&
        candidate.coordinates.every(c=>validCoords([c[1],c[0]]))&&
        metresBetween([candidate.coordinates[0][1],candidate.coordinates[0][0]],a)<=150&&
        metresBetween([candidate.coordinates.at(-1)[1],candidate.coordinates.at(-1)[0]],b)<=150?candidate:null;
      return {destinationId:dest.id,destination:dest.name,provider:'Google',measurementValid:true,
        origin:{coordinates:a,scope:'Saved address-bound origin; entrance unverified',source:loc.sourceUrl,checked:loc.checked},
        minutes:seconds/60,providerSeconds:seconds,metres,distanceScope:'Google walking measurement',endpointGapMetres:null,
        method:'Saved Google walking measurement. '+(geometry?'Provider path geometry is available.':'Path geometry was not supplied; no line is drawn.'),
        checked,url:'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(a.join(','))+'&destination='+encodeURIComponent(b.join(','))+'&travelmode=walking',
        geometry,geometryAvailable:!!geometry,geometryStatus:geometry?'Verified provider path':'Unavailable',transit:null,cacheKey:key};
    }
    if(r.Provider==='Outscraper'){
      if(r['Route mode']!=='walk'||r['Route status']!=='Current walking route'||r['Geometry status']!=='Verified provider path'||
         r['Origin input']!==providerAddressKey(row)||r['Destination input']!==providerAddressKey(dest)||r['Cache key']!==providerRouteKey(row,dest)||
         !/^https:\/\/api\.outscraper\.cloud\/google-maps-directions\?/.test(text(r['Source URL']))||!date(r.Checked))return null;
      const a=parse(r['Provider origin coordinates'],null,'Outscraper origin'),b=parse(r['Provider destination coordinates'],null,'Outscraper destination');
      const geometry=parse(r.Geometry,null,'Outscraper walking geometry'),minutes=positive(r.Minutes),metres=positive(r.Metres);
      if(!validCoords(a)||!validCoords(b)||!minutes||!metres||metresBetween(a,loc.coordinates)>250||metresBetween(b,dest.coordinates)>250||
         geometry?.type!=='LineString'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2||
         !geometry.coordinates.every(c=>validCoords([c[1],c[0]]))||
         metresBetween([geometry.coordinates[0][1],geometry.coordinates[0][0]],a)>150||
         metresBetween([geometry.coordinates.at(-1)[1],geometry.coordinates.at(-1)[0]],b)>150)return null;
      const publicUrl='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent([row.Address,row['City/State'],row.Zip].filter(Boolean).join(', '))+
        '&destination='+encodeURIComponent([dest.address,dest.cityState,dest.zip].filter(Boolean).join(', '))+'&travelmode=walking';
      return {destinationId:dest.id,destination:dest.name,provider:'Outscraper',measurementValid:true,geometryAvailable:true,
        origin:{coordinates:a,scope:'Provider-matched address point; entrance unverified',source:url(r['Source URL']),checked:date(r.Checked)},
        minutes,providerSeconds:null,metres,distanceScope:'Outscraper walking route',endpointGapMetres:null,
        method:'Outscraper Google Maps walking estimate with verified provider path geometry; entrance access is unverified.',
        checked:date(r.Checked),url:publicUrl,geometry,transit:null,cacheKey:r['Cache key']};
    }
    const origin=routeOrigin(r,loc);if(!origin)return null;
    const key=routeKey(id,loc,dest,origin,config),saved=text(r['Cache key']);
    if(saved&&saved!==key)return null;
    if(!saved){const ep=sourceEndpoints(r['Source URL']);if(!ep||ep.length!==2||!near(ep[0],origin.coordinates)||!near(ep[1],dest.coordinates))return null;}
    if(!/walking|routed-foot|osrm.*foot/i.test(text(r.Method))||!/(?:\/routed-foot\/|[?&]engine=fossgis_osrm_foot(?:&|$))/i.test(text(r['Source URL'])))return null;
    const seconds=positive(r['Provider seconds']),gap=amount(r['Endpoint offset metres']);
    const geometry=parse(r.Geometry,null,'Walking geometry');
    if(seconds===null||gap===null||gap>config.maxSnap||!url(r['Source URL'])||!date(r.Checked))return null;
    if(geometry?.type!=='LineString'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2||
       !geometry.coordinates.every(c=>validCoords([c[1],c[0]])))return null;
    const method='Walking-network routing estimate; '+gap+' m combined endpoint gaps are excluded from the duration. Entrance access is unverified.';
    return {destinationId:dest.id,destination:dest.name,provider:'OSRM/FOSSGIS',measurementValid:true,geometryAvailable:true,origin,minutes:Math.ceil(seconds/60),
      providerSeconds:seconds,metres:positive(r['Network metres'])??positive(r.Metres),
      distanceScope:positive(r['Network metres'])!==null?'Walking network':'Legacy recorded distance; may include entrance offsets',
      endpointGapMetres:gap,method,checked:date(r.Checked),url:url(r['Source URL']),geometry,transit:null,cacheKey:key};
  }
  function build(snapshot,options={}) {
    const sh=snapshot.sheets||{},config=settings(sh['Workflow Settings']||[]);
    const rows=(sh['KCMO Candidates']||[]).filter(r=>text(r.Property));
    const missingPropertyIds=rows.filter(r=>!text(r['Property ID'])).map(r=>({row:r._row||null,name:text(r.Property)}));
    if(missingPropertyIds.length)throw Error('Property ID missing for '+missingPropertyIds[0].name+'. Install/run the sheet workflow; IDs are never guessed at export.');
    const candidateIndex=indexed(rows,'Property ID','property',{requireIds:true}),candidateIds=new Set(candidateIndex.keys());
    const details=indexed(sh['Map Details']||[],'Property ID','Map Details',{requireIds:true});
    const requestedScene=(sh['Scene & Anchors']||[]).filter(r=>r['Walking cluster']===CLUSTER&&text(r['Place ID']));
    const requestedClusters=indexed(requestedScene,'Place ID','cluster place',{requireIds:true});
    if(!requestedClusters.size)throw Error('No destinations are tagged '+CLUSTER+'.');
    const placeRows=indexed(sh['Map Places']||[],'Place ID','place',{requireIds:true});
    const unresolvedClusterPlaces=[],confirmedScene=[];
    for(const [id,s] of requestedClusters){
      const p=placeRows.get(id);
      if(!p)unresolvedClusterPlaces.push({id,reason:'Place ID not found in Map Places'});
      else if(!text(p.Address))unresolvedClusterPlaces.push({id,reason:'Map Places address unresolved'});
      else confirmedScene.push(s);
    }
    const clusters=indexed(confirmedScene,'Place ID','confirmed cluster place',{requireIds:true});
    if(!clusters.size)throw Error('No '+CLUSTER+' destinations have a matching addressed Map Places row.');
    const publicPlaces=[...placeRows].map(([id,p])=>{
      const current={...p,'City/State':p['City/State']||config.sceneCity,Zip:text(p.Zip)};
      const loc=location(current,p);
      return {id,name:text(p.Name),address:text(current.Address),cityState:text(current['City/State']),zip:text(current.Zip),
        category:clusters.has(id)?'Core scene':p.Category==='Core scene'?'Scene':text(p.Category),
        neighborhood:text(p.Neighborhood),coordinates:loc?.coordinates||null,locationInput:addressKey(current),
        source:url(p['Source URL']),checked:date(p['Source checked']),coordinateSource:loc?.source||'Location unverified',
        coordinateSourceUrl:loc?.sourceUrl||null,coordinateChecked:loc?.checked||null,note:null};
    });
    const pmap=new Map(publicPlaces.map(p=>[p.id,p])), standards=sh['Payment Standards 2026']||[];
    const routeRows=(sh['Map Routes']||[]).filter(r=>Object.entries(r).some(([k,v])=>k!=='_row'&&text(v)));
    // The live Sheet has two Property-ID-only draft rows. Preserve them in the Sheet; they are not route evidence.
    const allRoutes=routeRows.filter(r=>Object.entries(r).some(([k,v])=>!['_row','Property ID'].includes(k)&&text(v)));
    const missingRouteIds=allRoutes.filter(r=>!text(r['Property ID'])||!text(r['Destination ID'])).map(r=>({row:r._row||null,propertyId:text(r['Property ID'])||null,destinationId:text(r['Destination ID'])||null}));
    if(missingRouteIds.length)throw Error('Map Routes contains a row with a missing Property ID or Destination ID.');
    const orphanRoutePropertyIds=[...new Set(allRoutes.map(r=>text(r['Property ID'])).filter(id=>id&&!candidateIds.has(id)))].sort();
    const orphanRouteDestinationIds=[...new Set(allRoutes.map(r=>text(r['Destination ID'])).filter(id=>id&&!placeRows.has(id)))].sort();
    const report={candidateProperties:rows.length,inputProperties:rows.length,publicCandidates:0,exportedProperties:0,excluded:[],heldIds:[],
      missingPropertyIds:[],duplicatePropertyIds:[],duplicatePlaceIds:[],duplicateNames:duplicateNameGroups(rows),
      unresolvedLocations:[],mappedIds:[],listOnlyIds:[],unresolvedFees:0,unresolvedRequiredFees:{properties:0,units:0},
      orphanDetails:[...details.keys()].filter(id=>!candidateIds.has(id)).sort(),orphanRoutePropertyIds,orphanRouteDestinationIds,
      retainedRoutes:0,discardedOrStaleRoutes:0,providerSupportRoutes:0,inputRouteRecords:allRoutes.length,
      inputGoogleRecords:allRoutes.filter(r=>r.Provider==='Google'&&r['Route mode']==='walk').length,
      currentGoogleMeasurements:0,drawableRoutes:0,rejectedGoogleRoutes:[],duplicateActiveGooglePairs:[],
      draftRouteRows:routeRows.length-allRoutes.length,clusterIds:[...clusters.keys()],unresolvedClusterPlaces,
      mediaScopeRepairs:[],unmatchedExactUnitMedia:[],unitPhotoOwnershipViolations:[]};
    const properties=[];
    for(const r of rows) {
      const id=text(r['Property ID']),zip=text(r.Zip);
      if(!options.all&&(r['Website visibility']!=='Yes'||!config.reviewedZips.includes(zip))) {
        const reason=r['Website visibility']!=='Yes'?'Website visibility is Hold':'Outside current website ZIP scope';
        report.excluded.push({id,name:text(r.Property),zip,reason});report.heldIds.push(id);continue;
      }
      const d=details.get(id)||{},loc=location(r,d);
      const std=standards.filter(s=>text(s.Agency)===text(r['Standard agency'])&&text(s.Zip)===zip);
      const standard=std.length===1?positive(std[0]['1BR']):null;
      const us=units(r,config);for(const u of us){u.comparison=unitCost(u,standard,config.planning);if(u.costs.requiredMonthlyFees===null){report.unresolvedFees++;report.unresolvedRequiredFees.units++;}}
      const media=parse(r['Media JSON'],[],'Media for '+id);
      if(!Array.isArray(media))throw Error('Media JSON must be an array.');
      let publicMedia=[];const blockedExactUrls=new Set();
      // Media JSON may contain older scope labels. An image is reassigned only when its own caption begins
      // with an explicit exact-unit claim and that claim resolves to exactly one current structured unit.
      for(const raw of media){
        if(raw.scope==='unit'){
          const u=findUnitByReference(raw.unit,us);
          if(!u)throw Error('Unit-scoped media names an unknown unit at '+id+': '+text(raw.unit));
          u.photos.push(photo({...raw,unit:u.unit},u.unit));continue;
        }
        const explicit=explicitMediaOwner(raw,us);
        if(explicit.tokens.length){
          if(explicit.unit){
            const fixed=photo({...raw,scope:'unit',unit:explicit.unit.unit},explicit.unit.unit);
            if(!explicit.unit.photos.some(p=>p.url===fixed.url))explicit.unit.photos.push(fixed);
            report.mediaScopeRepairs.push({propertyId:id,url:fixed.url,fromScope:text(raw.scope)||'building',unit:explicit.unit.unit,reason:'Caption explicitly identifies this exact unit.'});
          }else{
            const blocked=url(raw.url,true);if(blocked)blockedExactUrls.add(blocked);report.unmatchedExactUnitMedia.push({propertyId:id,url:blocked,caption:text(raw.caption),tokens:explicit.tokens,reason:'Exact-unit caption has no matching structured unit; withheld from building/amenity media.'});
          }
          continue;
        }
        publicMedia.push(photo(raw));
      }
      // A canonical line attaches only to its explicit unit. Unit identifiers may contain spaces/slashes.
      // Unmatched historical prose remains private evidence rather than being guessed into structured facts.
      for(const line of text(r['Unit Photos']).split(/\r?\n/)){
        const m=line.match(/^#([^|]{1,80})\s*\|\s*(https?:\/\/\S+)\s*(?:\|\s*([^|]*))?(?:\|\s*([^|]*))?(?:\|\s*([^|]*))?$/);
        if(!m)continue;
        const u=findUnitByReference(m[1],us);if(!u)throw Error('Photo names an unknown unit: '+m[1]);
        if(!u.photos.some(p=>p.url===m[2]))u.photos.push(photo({url:m[2],unit:u.unit,scope:'unit',caption:m[3],source:m[4],checked:m[5]},u.unit));
      }
      const owners=new Map();
      for(const u of us)for(const p of u.photos){
        if(owners.has(p.url)&&owners.get(p.url)!==u.unit){const problem={propertyId:id,url:p.url,units:[owners.get(p.url),u.unit]};report.unitPhotoOwnershipViolations.push(problem);throw Error('One exact-unit image was assigned to different apartments at '+id+'.');}
        owners.set(p.url,u.unit);
      }
      // Visible research columns own new public links. A URL already proven to belong to an exact
      // apartment is never reintroduced as generic building/amenity media.
      const parseMediaLines=(value,scope)=>text(value).split(/\r?\n/).filter(Boolean).map(line=>{
        const parts=line.split('|').map(text),v=url(parts[0],true);if(!v)return null;
        return photo({url:v,scope,caption:parts[1]||scope+' photo',source:parts[2]||null,checked:parts[3]||null});
      }).filter(Boolean);
      const front=[...parseMediaLines(r['Building Photos'],'building'),...parseMediaLines(r['Amenity Photos'],'amenity')].filter(x=>{
        if(blockedExactUrls.has(x.url))return false;
        if(!owners.has(x.url))return true;
        if(!report.mediaScopeRepairs.some(v=>v.propertyId===id&&v.url===x.url))report.mediaScopeRepairs.push({propertyId:id,url:x.url,fromScope:x.scope,unit:owners.get(x.url),reason:'Visible '+x.scope+' field duplicated an exact-unit image; generic copy withheld.'});
        return false;
      });
      publicMedia=[...front.map(x=>{
        const old=publicMedia.find(y=>y.url===x.url&&y.scope===x.scope);
        return old?{...old,...x,caption:x.caption===x.scope+' photo'?old.caption:x.caption,source:x.source||old.source,checked:x.checked||old.checked}:x;
      }),...publicMedia.filter(y=>!front.some(x=>x.url===y.url&&x.scope===y.scope)&&!owners.has(y.url))];
      for(const u of us)u.photo=u.photos.find(p=>p.kind==='image')?.url||null;
      const cover=publicMedia.find(x=>x.scope==='building'&&x.kind==='image');
      const ownRoutes=allRoutes.filter(x=>text(x['Property ID'])===id),supportRoutes=ownRoutes.filter(x=>x.Provider==='Outscraper'&&['walk','transit'].includes(x['Route mode'])&&
        !(x['Route mode']==='walk'&&x['Geometry status']==='Verified provider path'));
      const drawableRows=ownRoutes.filter(x=>!supportRoutes.includes(x)),valid=[];
      for(const raw of drawableRows){const rt=route(raw,id,r,loc,pmap.get(text(raw['Destination ID'])),config);if(rt)valid.push(rt);
        else if(raw.Provider==='Google')report.rejectedGoogleRoutes.push({propertyId:id,destinationId:text(raw['Destination ID']),row:raw._row||null});}
      const activeGoogle=new Set(),latest=new Map();
      for(const rt of valid){
        if(rt.provider==='Google'){
          if(activeGoogle.has(rt.destinationId))throw Error('Duplicate active Google property/destination pair: '+id+' / '+rt.destinationId);
          activeGoogle.add(rt.destinationId);report.currentGoogleMeasurements++;
        }
        const old=latest.get(rt.destinationId);
        if(!old||rt.provider==='Google'&&old.provider!=='Google'||(rt.provider==='Google')===(old.provider==='Google')&&(rt.checked||'')>(old.checked||''))latest.set(rt.destinationId,rt);
      }
      const walks=[...latest.values()],clusterRoutes=walks.filter(x=>clusters.has(x.destinationId)).sort((a,b)=>a.minutes-b.minutes);
      const nearest=clusterRoutes[0]||null,complete=clusterRoutes.length===clusters.size;
      const eligible=publicPlaces.filter(p=>p.coordinates&&text(p.address)),eligibleIds=new Set(eligible.map(p=>p.id));
      const venueWalks=walks.filter(w=>eligibleIds.has(w.destinationId)).sort((a,b)=>(a.providerSeconds??a.minutes*60)-(b.providerSeconds??b.minutes*60)||a.destinationId.localeCompare(b.destinationId));
      const nearestSavedVenue=venueWalks[0]||null,savedVenueCoverage={count:venueWalks.length,total:eligible.length,complete:venueWalks.length===eligible.length&&eligible.length>0};
      report.drawableRoutes+=walks.filter(w=>w.geometry).length;
      report.retainedRoutes+=walks.length;report.discardedOrStaleRoutes+=drawableRows.length-walks.length;report.providerSupportRoutes+=supportRoutes.length;
      if(loc)report.mappedIds.push(id);else{report.unresolvedLocations.push(id);report.listOnlyIds.push(id);}
      const bedroom=n=>{
        const list=us.filter(u=>u.beds===n),one=list.length===1?list[0]:null;
        return {beds:n,rent:one?.rent??positive(r[n+'BR Rent']),sqft:one?.sqft??positive(r[n+'BR Sq Ft']),
          gross:one?.comparison.planningTotal??null,percent:one?.comparison.percent??null,
          fit:'Planning comparison only; official allowance and eligibility require confirmation',
          offered:null,evidence:one?('Unit #'+one.unit+' only; see its own source/date.'):null};
      };
      const property={schemaVersion:SCHEMA,id,workbookRow:r._row||null,name:text(r.Property),address:text(r.Address),cityState:text(r['City/State']),zip,
        neighborhood:text(r.Area)||'Unknown',band:text(r.Band)||'Unknown',management:text(r.Management)||'Unknown',
        phone:text(r.Phone)||null,coordinates:loc?.coordinates||null,coordinateSource:loc?.source||'Unverified',
        coordinateSourceUrl:loc?.sourceUrl||null,coordinateChecked:loc?.checked||null,locationStatus:loc?.status||'Pending validation',
        hcv:text(r['Accepts HCV'])||'Unknown',lihtc:text(r['Tax Credit / LIHTC'])||'Unknown',
        oneBedroom:{...bedroom(1),standard,utilityAllowance:null},twoBedroom:bedroom(2),threeBedroom:bedroom(3),
        costs:{planningUtilities:config.planning,electricityEstimate:config.planning,requiredMonthlyFees:null,
          basis:'User-selected $'+config.planning+' utility planning standard. Unknown fees and official allowances remain unresolved. Unit fees require their own confirmation or explicit all-unit scope.'},
        amenities:{laundry:text(r['In-Unit W/D'])||'Unknown',cooling:text(r['Central HVAC'])||'Unknown',gym:text(r.Gym)||'Unknown',pool:text(r.Pool)||'Unknown',
          finishes:text(d['Modern finishes'])||'Exact-unit finishes unverified',sunlight:text(d.Sunlight)||'Unverified',entrance:text(d['Street entrance'])||'Unverified'},
        amenityDetails:text(r['Amenities / Parking'])||null,amenitiesChecked:date(r['Amenities checked']),amenitySource:url(r['Amenity source']),
        units:us,media:publicMedia,photo:cover?.url||null,photoSource:cover?.source||null,photoCaption:cover?.caption||null,
        unitOptions:null,photoEvidence:null,researchSources:null,publicNotes:text(r['Public notes'])||null,
        building:{yearBuilt:positive(r['Year Built']),yearRenovated:positive(r['Year Renov']),mixedIncome:text(r['Mixed-Income'])||'Unknown'},
        eligibility:{minimumIncome:'Confirm with leasing',onePersonLimit:'Confirm applicable program'},
        access:{description:nearest?nearest.minutes+' min routed estimate':'Walking routes unresolved',crossroads:clusterRoutes.length+'/'+clusters.size+' destinations routed'},
        links:{website:url(r.Website),floorplans:url(r['Floor Plans / Availability']),units:url(r['Floor Plans / Availability']),
          photos:url(r['Building gallery URL'])||url(d['Gallery URL']),streetView:loc?'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+loc.coordinates.join(','):null,
          googleMaps:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([r.Address,r['City/State'],r.Zip].filter(Boolean).join(', ')),
          appleMaps:'https://maps.apple.com/?address='+encodeURIComponent([r.Address,r['City/State'],r.Zip].filter(Boolean).join(', '))},
        linkScope:'Header-mapped property links; each apartment retains independent facts, photos and dates.',
        checked:date(r['Property evidence checked']),availability:date(r['Availability checked'])?'Building availability evidence checked '+date(r['Availability checked']):'Current availability requires confirmation',
        availabilityChecked:date(r['Availability checked']),costsChecked:date(r['Costs checked']),
        strengths:text(d.Strengths)||null,tradeoffs:text(d.Tradeoffs)||null,confirmation:'Verify the current chosen apartment, final quote, official allowance, required fees, eligibility and entrance.',
        walks,nearest,nearestSavedVenue,savedVenueCoverage,nearestStop:null,routeOrigin:walks.find(x=>x.origin?.source)?.origin||null,
        cluster:{ids:[...clusters.keys()],coverage:clusterRoutes.length,total:clusters.size,complete,closest:nearest,
          minMinutes:nearest?.minutes??null,maxMinutes:clusterRoutes.length?Math.max(...clusterRoutes.map(x=>x.minutes)):null,
          missingIds:[...clusters.keys()].filter(id=>!clusterRoutes.some(r=>r.destinationId===id)),geometryCoverage:clusterRoutes.filter(r=>r.geometry).length},
        overallRank:positive(d['Overall ZIP Rank']),clusterRank:null,
        missingFacts:[...(!loc?['Exact building coordinates']:[]),...(!us.length?['Exact available unit and move-in date']:[]),
          ...(!cover?['Building photo']:[]),...(!nearest?['Verified route estimate']:[]),
          ...(us.some(u=>!u.checked)?['Unit-specific evidence dates']:[]),
          ...(us.some(u=>u.costs.requiredMonthlyFees===null)?['Required monthly fees']:[]),'Final voucher approval / applicable authority allowance']};
      // Building-level required fees are complete only when the Sheet explicitly confirms an all-unit amount with source/date.
      const buildingFeeConfirmed=r['Fee status']==='Confirmed'&&r['Fee scope']==='All units'&&amount(r['Required Monthly Fees'])!==null&&url(r['Fee source'])&&date(r['Costs checked']);
      if(buildingFeeConfirmed){property.costs.requiredMonthlyFees=amount(r['Required Monthly Fees']);property.costs.feeSource=url(r['Fee source']);property.costs.feesChecked=date(r['Costs checked']);}
      else report.unresolvedRequiredFees.properties++;
      properties.push(property);
    }
    report.exportedProperties=properties.length;report.publicCandidates=properties.length;
    report.mappedPins=report.mappedIds.length;report.listOnly=report.listOnlyIds.length;report.heldRecords=report.excluded.length;
    const currentIds=[...clusters.keys()];
    const mapped=properties.filter(p=>p.coordinates),coverageDistribution={};
    for(const p of mapped)coverageDistribution[p.cluster.coverage]=(coverageDistribution[p.cluster.coverage]||0)+1;
    const missingByPlaceId=Object.fromEntries(currentIds.map(pid=>[pid,mapped.filter(p=>!p.walks.some(w=>w.destinationId===pid)).length]));
    report.priorityRouteCoverage={mappedProperties:mapped.length,complete:mapped.filter(p=>p.cluster.complete).length,incomplete:mapped.filter(p=>!p.cluster.complete).length,coverageDistribution,missingByPlaceId,missingGreenLadyRoutes:missingByPlaceId['green-lady-lounge']??0,historicalThirdPlaceRoutes:properties.reduce((n,p)=>n+p.walks.filter(w=>w.destinationId==='third-place-lounge').length,0)};
    report.unitPhotoOwnershipViolationCount=report.unitPhotoOwnershipViolations.length;
    report.unmatchedExactUnitMediaCount=report.unmatchedExactUnitMedia.length;
    report.mediaScopeRepairCount=report.mediaScopeRepairs.length;
    for(const zip of new Set(properties.map(p=>p.zip)))properties.filter(p=>p.zip===zip&&p.nearest).sort((a,b)=>a.nearest.minutes-b.nearest.minutes||a.name.localeCompare(b.name)).forEach((p,i)=>p.clusterRank=i+1);
    return {payload:{meta:{schemaVersion:SCHEMA,title:'Kansas City apartments',generatedAt:new Date().toISOString(),
      workbookSha256:snapshot.sha256||null,reviewedZips:options.all?[...new Set(properties.map(p=>p.zip))]:config.reviewedZips,
      clusterIds:[...clusters.keys()],utilityPlanningStandard:config.planning,previewOnly:true,masterMapFields:true,
      notice:'Static reviewed snapshot. Sheet edits do not publish this website.',
      privacy:'Public allowlisted property facts only; notes, archives, personal eligibility, source workbook and credentials are excluded.',
      voucherCaveat:'The $'+config.planning+' utility standard is a planning assumption, not an official allowance. Missing fees prevent a complete total. All bedroom types use the recorded 1BR comparator.',
      routingAttribution:'Current walking measurements: Google. Older evidence: Outscraper and OSRM/FOSSGIS. Geometry availability is separate from walking-time validity; no missing paths are invented.',
      routingAttributionUrl:'https://www.openstreetmap.org/copyright',routingCorrectionsUrl:'https://www.openstreetmap.org/fixthemap'},
      properties,places:publicPlaces,geography:snapshot.geography||{streetcar:{stops:[]}}},report};
  }
  function normalizedStreet(s) {
    const map={STREET:'ST',ROAD:'RD',AVENUE:'AVE',BOULEVARD:'BLVD',DRIVE:'DR',LANE:'LN',COURT:'CT',PLACE:'PL',TERRACE:'TER',NORTH:'N',SOUTH:'S',EAST:'E',WEST:'W'};
    return text(s).toUpperCase().replace(/\b(?:APT|UNIT|SUITE)\s+.*$/,'').replace(/\s+#.*$/,'').replace(/[.,]/g,'').split(/\s+/).filter(Boolean).map(w=>map[w]||w).join(' ');
  }
  function validateCensus(input,body) {
    const stateCity=text(input['City/State']).match(/^(.+?),\s*([A-Za-z]{2})$/);
    if(!stateCity||!text(input.Address))return {status:'Review: street and City, ST required'};
    const matches=body?.result?.addressMatches||[],wanted=normalizedStreet(input.Address);
    const valid=matches.filter(m=>{
      const a=m.addressComponents||{},matched=normalizedStreet(text(m.matchedAddress).split(',')[0]);
      return matched===wanted&&norm(a.city)===norm(stateCity[1])&&text(a.state).toUpperCase()===stateCity[2].toUpperCase()&&
        (!text(input.Zip)||text(a.zip)===text(input.Zip))&&validCoords([m.coordinates?.y,m.coordinates?.x]);
    });
    if(valid.length!==1)return {status:'Review: '+(valid.length?'ambiguous':'no exact street/city/state/ZIP')+' match'};
    const m=valid[0];return {status:'Validated address interpolation; entrance unverified',coordinates:[m.coordinates.y,m.coordinates.x],
      matchedAddress:m.matchedAddress,matchedZip:text(m.addressComponents.zip),input:addressKey(input),raw:m};
  }
  return {SCHEMA,CLUSTER,text,norm,number,amount,positive,url,date,addressKey,validCoords,parse,settings,units,unitCost,
    location,routeOrigin,routeKey,route,build,validateCensus,normalizedStreet};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ResearchCore;
