/* Pure Outscraper response checks. Keep the identical block in ResearchWorkflow.gs. */
const ResearchOutscraper = (() => {
  'use strict';
  const text=v=>v===null||v===undefined?'':String(v).trim();
  const norm=v=>text(v).toLowerCase().replace(/\s+/g,' ');
  const stateNames={missouri:'mo',kansas:'ks'};
  const streetWords={street:'st',avenue:'ave',boulevard:'blvd',road:'rd',drive:'dr',lane:'ln',court:'ct',place:'pl',terrace:'ter',north:'n',south:'s',east:'e',west:'w'};
  function street(v) {
    const first=text(v).replace(/\s+/g,' ').split(',')[0].replace(/\b(?:apt|apartment|unit|suite|ste)\s*#?[\w-]+.*$/i,'');
    return first.toLowerCase().replace(/[.#]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).map(w=>streetWords[w]||w).join(' ');
  }
  function cityState(row) {
    const m=text(row['City/State']).match(/^(.+?),\s*([a-z]{2})$/i);
    return m?{city:norm(m[1]),state:m[2].toLowerCase()}:null;
  }
  function state(v){const s=norm(v);return stateNames[s]||s;}
  function name(v) {
    return norm(v).replace(/\b(second)\b/g,'2nd').replace(/\s*\+\s*|\s*&\s*|\s+and\s+/g,' and ')
      .replace(/[^a-z0-9 ]/g,' ').replace(/\b(apartments?|apts?)$/,'').replace(/\s+/g,' ').trim();
  }
  function addressMatches(row,found) {
    const cs=cityState(row),s=street(row.Address),f=street(found.street||found.full_address);
    if(!cs||!s||!f||s!==f)return false;
    if(norm(found.city)!==cs.city||state(found.state||found.us_state)!==cs.state)return false;
    const zip=text(row.Zip);return !zip||text(found.postal_code)===zip;
  }
  function labelMatches(row,label) {
    const expected=street(row.Address),pieces=text(label).split(',');
    if(!expected||!pieces.some(p=>street(p)===expected))return false;
    const cs=cityState(row),full=norm(label);if(!cs||!full.includes(cs.city))return false;
    if(!new RegExp('\\b(?:'+cs.state+'|'+(cs.state==='mo'?'missouri':'kansas')+')\\b','i').test(label))return false;
    return !text(row.Zip)||new RegExp('\\b'+text(row.Zip)+'\\b').test(label);
  }
  function coords(lat,lon){return typeof lat==='number'&&typeof lon==='number'&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?[lat,lon]:null;}
  function distance(a,b){
    if(!a||!b)return Infinity;
    const r=Math.PI/180,x=(b[0]-a[0])*r,y=(b[1]-a[1])*r,h=Math.sin(x/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(y/2)**2;
    return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }
  function place(row,body) {
    if(body?.status!=='Success')return {status:'Provider response unresolved'};
    const hits=Array.isArray(body.data?.[0])?body.data[0]:[];
    const addressed=hits.filter(x=>addressMatches(row,x));
    const matches=addressed.filter(x=>name(x.name)===name(row.Property||row.Name)&&coords(x.latitude,x.longitude)&&text(x.place_id)&&text(x.google_id));
    const ids=new Set(matches.map(x=>x.place_id+'|'+x.google_id));
    if(ids.size!==1||matches.length!==1)return {status:matches.length?'Review: ambiguous place identity':addressed.length?'Review: place name or ID mismatch':'Review: no exact place address match',hits:hits.length};
    const x=matches[0];return {status:'Validated Outscraper place and address',coordinates:[x.latitude,x.longitude],street:text(x.street),zip:text(x.postal_code),placeId:text(x.place_id),googleId:text(x.google_id),name:text(x.name),hits:hits.length};
  }
  function geocode(row,body) {
    if(body?.status!=='Success')return {status:'Provider response unresolved'};
    const hits=Array.isArray(body.data)?body.data:[];
    const matches=hits.filter(x=>addressMatches(row,x)&&coords(x.latitude,x.longitude));
    if(matches.length!==1)return {status:matches.length?'Review: ambiguous geocode':'Review: no exact geocode',hits:hits.length};
    const x=matches[0];return {status:'Validated Outscraper address point; place identity unresolved',coordinates:[x.latitude,x.longitude],street:text(x.street),zip:text(x.postal_code),hits:hits.length};
  }
  function responseCoords(v){const p=text(v).split(',').map(Number);return p.length===2&&p.every(Number.isFinite)?coords(p[0],p[1]):null;}
  function geometry(raw,a,b){
    const g=raw?.geometry;
    if(g?.type!=='LineString'||!Array.isArray(g.coordinates)||g.coordinates.length<2||!g.coordinates.every(x=>Array.isArray(x)&&coords(x[1],x[0])))return null;
    const start=[g.coordinates[0][1],g.coordinates[0][0]],end=[g.coordinates.at(-1)[1],g.coordinates.at(-1)[0]];
    return distance(start,a)<=150&&distance(end,b)<=150?g:null;
  }
  function direction(origin,destination,body,mode) {
    if(!['walk','transit'].includes(mode)||body?.status!=='Success')return {status:'Provider response unresolved'};
    const options=Array.isArray(body.data?.[0])?body.data[0]:[];
    const valid=options.filter(x=>labelMatches(origin,x.origin)&&labelMatches(destination,x.destination)&&
      Number.isFinite(x['duration(minutes)'])&&x['duration(minutes)']>0&&Number.isFinite(x['distance(meters)'])&&x['distance(meters)']>0&&
      responseCoords(x.origin_coordinates)&&responseCoords(x.destination_coordinates)&&
      (!origin.coordinates||distance(origin.coordinates,responseCoords(x.origin_coordinates))<=250)&&
      (!destination.coordinates||distance(destination.coordinates,responseCoords(x.destination_coordinates))<=250));
    if(!valid.length)return {status:options.length?'Review: route endpoints or measures unresolved':'No route available',options:options.length};
    valid.sort((a,b)=>a['duration(minutes)']-b['duration(minutes)']||a['distance(meters)']-b['distance(meters)']);
    const x=valid[0],a=responseCoords(x.origin_coordinates),b=responseCoords(x.destination_coordinates),path=geometry(x,a,b);
    return {status:mode==='transit'?'Transit estimate saved; departure time may change':path?'Current walking route':'Walking measures saved; geometry unresolved',
      mode,minutes:x['duration(minutes)'],metres:x['distance(meters)'],originCoordinates:a,destinationCoordinates:b,
      geometry:path,geometryStatus:path?'Verified provider path':'Unresolved; provider supplied no usable path',options:options.length,
      checkedTimestamp:Number.isFinite(x.timestamp)?x.timestamp:null};
  }
  const addressKey=row=>JSON.stringify(['outscraper-address-v1',text(row['Property ID']||row['Place ID']||row.id),norm(row.Address||row.address),norm(row['City/State']||row.cityState),text(row.Zip||row.zip)]);
  const routeKey=(property,destination,mode)=>JSON.stringify(['outscraper-route-v1',addressKey(property),addressKey(destination),mode]);
  function fullAddress(row) {
    const address=text(row.Address||row.address).replace(/\s+/g,' '),city=text(row['City/State']||row.cityState),zip=text(row.Zip||row.zip);
    let full=address;
    if(city&&!norm(full).includes(norm(city)))full+=(full?', ':'')+city;
    if(zip&&!new RegExp('\\b'+zip.replace(/[^0-9]/g,'')+'\\b').test(full))full+=(full?' ':'')+zip;
    return full;
  }
  function nearestAddressed(origin,places) {
    const a=origin.coordinates;if(!a)return null;
    return places.filter(p=>p.coordinates&&p.address&&p.id).map(p=>({...p,straightMetres:distance(a,p.coordinates)}))
      .sort((x,y)=>x.straightMetres-y.straightMetres||x.id.localeCompare(y.id))[0]||null;
  }
  function reserveFreeUsage(balance,prior,kind,cap) {
    if(!['places','geocodes','directions'].includes(kind)||!Number.isFinite(cap)||cap>500||cap<1)throw Error('Invalid Outscraper free-only budget.');
    if(balance?.account_status!=='valid'||!balance.upcoming_invoice?.period_start)throw Error('Outscraper balance unavailable; no paid request sent.');
    const invoice=balance.upcoming_invoice;
    if(Number(invoice.amount_due)||Number(invoice.total))throw Error('Outscraper invoice is nonzero; free-only workflow stopped.');
    const quantity={places:0,geocodes:0,directions:0};
    for(const line of invoice.products_lines||[]){
      const n=norm(line.product_name),q=Number(line.quantity)||0;
      if(n.includes('google maps data'))quantity.places+=q;
      if(n.includes('geocoding'))quantity.geocodes+=q;
      if(n.includes('google maps traffic'))quantity.directions+=q;
    }
    const state=prior?.period===invoice.period_start?{...prior}:{period:invoice.period_start,places:0,geocodes:0,directions:0};
    const cost=kind==='places'?3:1,used=Math.max(quantity[kind],Number(state[kind])||0);
    if(used+cost>cap)throw Error('OUTSCRAPER_FREE_LIMIT: '+kind+' usage '+used+' plus '+cost+' would exceed '+cap+'.');
    state[kind]=used+cost;return state;
  }
  return {street,name,addressMatches,labelMatches,place,geocode,direction,distance,addressKey,routeKey,fullAddress,nearestAddressed,reserveFreeUsage};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ResearchOutscraper;
