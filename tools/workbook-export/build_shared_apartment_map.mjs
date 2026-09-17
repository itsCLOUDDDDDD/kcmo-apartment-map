import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {FileBlob, SpreadsheetFile} from '@oai/artifact-tool';
import {safeUrl,sourceLink,exactPhotoLink,galleryLink} from './map_public_links.mjs';
import {comparisonFields,routeOrigin,bedroomNotOffered} from './map_comparison_fields.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../..');
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
if(!arg('--workbook'))throw Error('Pass --workbook with an explicitly selected XLSX export. The live sheet is the master.');
const workbookPath=path.resolve(arg('--workbook'));
const output=path.resolve(arg('--output')||path.join(root,'.local-preview/map-data.js'));
const bytes=await fs.readFile(workbookPath),hash=crypto.createHash('sha256').update(bytes).digest('hex');
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const reviewedZips=['64105','64106','64108','64109'];
const requiredCandidateHeaders=['Property','Address','Zip','1BR Rent','Util. Allow.','1BR Gross','1BR Std','% of Std','Fits?','Electricity Estimate','Required Monthly Fees','Cost Basis'];
const unknown=v=>v===null||v===undefined||v===''||v===0?null:v;
const asText=v=>unknown(v)??'Unverified';
const masterUnits=(candidate,detail)=>String(candidate['Unit Options']||'').split(/\r?\n/).map(line=>{
	const match=line.match(/^#([^|]+)\s*\|\s*(\d+)BR(?:\s*\/\s*(\d+)BA)?\s*\|\s*([\d,]+) sq ft\s*\|\s*\$([\d,]+)\/mo\s*\|\s*(.+?)(?:\s*\|\s*\$([\d,]+) deposit)?$/i);
  if(!match||/historical|not currently listed|not in current inventory|no longer available|not currently available/i.test(line))return null;
	return {unit:match[1].trim(),beds:Number(match[2]),baths:match[3]?Number(match[3]):null,sqft:Number(match[4].replaceAll(',','')),rent:Number(match[5].replaceAll(',','')),available:match[6].split(/\s*\|\s*(?:https?:\/\/|Source:)/i)[0].trim(),deposit:match[7]?Number(match[7].replaceAll(',','')):null,checked:detail['Source checked']||null,source:sourceLink(match[6])||sourceLink(candidate['Floor Plans / Availability'])||safeUrl(detail['Available units URL']),photo:exactPhotoLink(candidate['Unit Photos'],match[1].trim())};
}).filter(Boolean);
const draftUnits=detail=>{try{return JSON.parse(detail['Listed units JSON']||'[]').filter(u=>u.unit&&[1,2].includes(u.beds)).map(u=>({unit:String(u.unit),beds:u.beds,baths:unknown(u.baths),sqft:unknown(u.sqft),rent:unknown(u.rent),available:String(u.available||'Unverified'),deposit:unknown(u.deposit),checked:u.checked||null,source:safeUrl(u.source),photo:safeUrl(u.photo)}));}catch{return [];}};
function rows(name){
  const sheet=wb.worksheets.items.find(s=>s.name===name);if(!sheet)return [];
  const table=sheet.tables.items.find(t=>name==='KCMO Candidates'?t.name==='KcmoCandidates':t.name===({'Map Details':'MapDetailsTable','Map Places':'MapPlacesTable','Map Routes':'MapRoutesTable'})[name]);
  const range=table?table.getRange():sheet.getUsedRange(),startRow=Number((table?.address||'A1').match(/\$?[A-Z]+\$?(\d+)/)?.[1]||1);
  const values=range.values,formulas=range.formulas;
  const headers=values[0].map(v=>String(v??'').trim());
  if(name==='KCMO Candidates'){
    const missing=requiredCandidateHeaders.filter(header=>!headers.includes(header));
    if(missing.length)throw Error(`KCMO Candidates used range is missing required headers: ${missing.join(', ')}`);
  }
  return values.slice(1).map((row,i)=>Object.fromEntries([['_row',i+startRow+1],...headers.filter(Boolean).map(h=>{
    const col=headers.indexOf(h),f=formulas[i+1]?.[col];let value=row[col]??null;
    if(typeof f==='string'&&/HYPERLINK/i.test(f)){const url=f.match(/HYPERLINK\(\s*"([^"]+)"/i)?.[1];if(url)value=h==='Unit Photos'&&value&&value!==url?`${value} | ${url}`:url;}
    return [h,value];
  })]));
}
let details=rows('Map Details'),places=rows('Map Places'),routes=rows('Map Routes');
let staged=false;
if(!arg('--staged')&&(!details.length||!places.length||!routes.length))throw Error('Approved Map Details, Map Places and Map Routes tabs are required in V3. Use --staged only for an explicitly local proposal preview; do not publish it.');
if(arg('--staged')){
  if(details.length)throw Error('V3 already has Map Details. Refusing a competing staged source.');
  const draft=JSON.parse(await fs.readFile(arg('--staged'),'utf8'));
  if(draft.workbookSha256!==hash)throw Error('V3 changed after research staging. Reconcile it before rebuilding.');
  ({details,places,routes}=draft);staged=true;
}
// Reuse already-public geography; retrieving new geography is a separate operation.
const geo=arg('--geography')
  ?JSON.parse(await fs.readFile(path.resolve(arg('--geography')),'utf8'))
  :JSON.parse((await fs.readFile(path.join(root,'map-data.js'),'utf8')).replace(/^window.KCMO_MAP_DATA\s*=\s*/,'').replace(/;\s*$/,'')).geography;
if(!geo?.streetcar?.stops)throw Error('Saved public geography is missing or invalid.');
const coordinates=r=>Number.isFinite(r?.Latitude)&&Number.isFinite(r?.Longitude)&&r.Latitude>38.9&&r.Latitude<39.3&&r.Longitude> -94.8&&r.Longitude< -94.3?[r.Latitude,r.Longitude]:null;
const placeCoordinates=p=>p.Category==='Regional scene'&&Number.isFinite(p.Latitude)&&Number.isFinite(p.Longitude)&&p.Latitude>38.8&&p.Latitude<39.3&&p.Longitude> -95.4&&p.Longitude< -94.3?[p.Latitude,p.Longitude]:coordinates(p);
const publicPlaces=places.filter(p=>p.Name).map(p=>({id:p['Place ID']||slug(p.Name),name:p.Name,address:p.Address||'Unresolved address',category:p.Category,neighborhood:p.Neighborhood,coordinates:placeCoordinates(p),source:safeUrl(p['Source URL']),checked:p['Source checked']||null,note:p.Note||'Current opening status not checked.',coordinateSource:p['Coordinate source']||'Unverified'}));
const cores=publicPlaces.filter(p=>p.category==='Core scene');
const extraByName=new Map(details.map(p=>[p.Property,p]));
const distance=(a,b)=>{const rad=Math.PI/180;const v=Math.sin((b[0]-a[0])*rad/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin((b[1]-a[1])*rad/2)**2;return 6371000*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v));};
const candidateRows=rows('KCMO Candidates').filter(p=>p.Property&&reviewedZips.includes(String(p.Zip).trim()));
const nameCounts=new Map();for(const p of candidateRows)nameCounts.set(p.Property,(nameCounts.get(p.Property)||0)+1);
const properties=candidateRows.map(p=>{
  const uniqueName=nameCounts.get(p.Property)===1;
  // A same-name support row cannot identify which address it describes.
  const d=uniqueName?(extraByName.get(p.Property)||{}):{},id=d['Property ID']||slug(uniqueName?p.Property:`${p.Property}-${p.Address}-${p.Zip}`),coords=coordinates(d),address=String(p.Address||'Unverified');
  const walks=routes.filter(r=>r['Property ID']===id).filter(r=>{
    const dest=publicPlaces.find(v=>v.id===r['Destination ID']);
    // Address edits invalidate old routes instead of retaining an unrelated time.
    const origin=routeOrigin(r,coords),endpointText=`${origin?.coordinates?.join(',')};${dest?.coordinates?.join(',')}`;
    let sourceEndpoints='';try{sourceEndpoints=new URL(r['Source URL']).searchParams.get('route');}catch{}
    return origin&&dest&&dest.address===r['Destination address']&&address===r['Origin address']&&sourceEndpoints===endpointText;
  }).map(r=>({destinationId:r['Destination ID'],destination:r.Destination,origin:routeOrigin(r,coords),minutes:Number(r.Minutes),metres:Number(r.Metres),method:r.Method,checked:r.Checked,url:safeUrl(r['Source URL']),geometry:(()=>{try{return JSON.parse(r.Geometry);}catch{return null;}})(),transit:(()=>{try{const t=JSON.parse(r['Transit JSON']);return {boarding:t.boarding,exit:t.exit,first:{minutes:t.first.minutes,metres:t.first.metres||null,url:safeUrl(t.first.url),scope:t.first.scope||null},last:{minutes:t.last.minutes,metres:t.last.metres||null,url:safeUrl(t.last.url),scope:t.last.scope||null},rideMinutes:t.rideMinutes,totalBeforeWait:t.totalBeforeWait,waitRange:t.waitRange,method:t.method,source:safeUrl(t.source),checked:t.checked};}catch{return null;}})()})).filter(r=>Number.isFinite(r.minutes)&&r.minutes>0);
  const nearest=walks.filter(r=>cores.some(c=>c.id===r.destinationId)).sort((a,b)=>a.minutes-b.minutes||a.metres-b.metres)[0]||null;
  const nearestStop=coords?geo.streetcar.stops.map(s=>({...s,straightMetres:Math.round(distance(coords,s.coordinates))})).sort((a,b)=>a.straightMetres-b.straightMetres)[0]:null;
  const overall=unknown(p['Overall ZIP Rank'])??unknown(d['Overall ZIP Rank']);
  const result={id,workbookRow:p._row,name:p.Property,address,zip:String(p.Zip),neighborhood:asText(p.Area),band:asText(p.Band),coordinates:coords,coordinateSource:d['Coordinate source']||'Unverified',coordinateChecked:d['Coordinate checked']||null,management:asText(p.Management),hcv:asText(p['Accepts HCV']),lihtc:asText(p['Tax Credit / LIHTC']),
    ...comparisonFields(p,d),
    amenities:{laundry:d['Laundry detail']||asText(p['In-Unit W/D']),cooling:asText(p['Central HVAC']),gym:asText(p.Gym),pool:asText(p.Pool),finishes:d['Modern finishes']||'Unverified for exact unit',sunlight:d.Sunlight||'Unverified',entrance:d['Street entrance']||'Unverified'},
    units:staged?draftUnits(d):masterUnits(p,d),
    photo:safeUrl(d['Photo URL']),photoSource:safeUrl(d['Photo source']),photoCaption:d['Photo caption']||'Building/community image, not the exact available unit.',
    unitOptions:unknown(p['Unit Options']),photoEvidence:unknown(p['Unit Photos']),phone:unknown(p.Phone),building:{yearBuilt:unknown(p['Year Built']),yearRenovated:unknown(p['Year Renov']),mixedIncome:asText(p['Mixed-Income'])},eligibility:{minimumIncome:asText(p['Min-Income Rule']),onePersonLimit:asText(p['1-Person Limit'])},access:{description:asText(p['Walk/Bike to Scene']),crossroads:asText(p['Crossroads Cluster Access'])},
    links:{website:sourceLink(p.Website)||safeUrl(d['Source URL']),photos:safeUrl(d['Gallery URL'])||galleryLink(p['Unit Photos']),floorplans:safeUrl(d['Floor plan URL'])||safeUrl(p['Floor Plans / Availability']),units:safeUrl(d['Available units URL'])||safeUrl(p['Floor Plans / Availability']),streetView:coords?`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coords.join(',')}`:null,appleMaps:`https://maps.apple.com/?q=${encodeURIComponent(p.Property)}&address=${encodeURIComponent(address+', Kansas City, MO '+p.Zip)}`,googleMaps:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address+', Kansas City, MO '+p.Zip)}`},
    linkScope:d['Link scope']||'Recorded source; page identity and unit links not verified.',checked:d['Source checked']||null,availability:d['Availability note']||'Current availability unverified.',strengths:d.Strengths||null,tradeoffs:d.Tradeoffs||null,confirmation:d['Needs confirmation']||'Current unit, eligibility and amenities need confirmation.',walks,nearest,nearestStop,routeOrigin:walks.find(r=>r.origin?.source)?.origin||null,overallRank:Number.isFinite(Number(overall))&&Number(overall)>0?Number(overall):null,clusterRank:null};
  // The same comprehensive list drives card counts and the detail warning.
  const missing=[];const add=(test,label)=>{if(test)missing.push(label);};
  const uncertain=v=>/unverified|unknown|not found|inaccessible|conflict|not confirmed|not listed|need|hookup|confirm|select(?:ed)?[- ]unit|^\?$|^n\/a$/i.test(String(v));
  add(!coords,'Exact building coordinates');add(!result.photo,'Building photo');add(!result.links.floorplans,'Building floor plan link');add(!result.links.units||(/shared|third-party|historic|not.*live/i.test(result.linkScope)&&!/building-specific floor plans/i.test(result.linkScope)),'Building-specific live units');
  for(const [key,label] of [['oneBedroom','1BR'],['twoBedroom','2BR'],['threeBedroom','3BR']]){const v=result[key];if(!v)continue;const description=[v.rent,v.sqft].filter(Boolean).join(' ');v.offered=bedroomNotOffered(v,v.beds)?false:null;add(v.offered!==false&&(!v.rent||uncertain(v.rent)),`${label} rent`);add(v.offered!==false&&(!v.sqft||uncertain(v.sqft)),`${label} area`);}
  add(/unconfirmed building/i.test(result.twoBedroom.evidence||''),'2BR attribution to this building');
  add(!result.units.length,result.unitOptions?'Additional unit verification':'Exact available unit and move-in date');add(!result.units.some(u=>u.photo),'Exact-unit photos');add(true,'Final voucher approval / applicable authority allowance');add(uncertain(result.hcv)||!/^(yes|y)$/i.test(String(result.hcv)),'Current voucher acceptance / eligibility');
  for(const [key,label] of [['laundry','Installed laundry'],['cooling','Central cooling'],['gym','Gym'],['finishes','Exact-unit finishes'],['entrance','Street-facing entrance']])add(uncertain(result.amenities[key]),label);
  add(!result.checked,'Dated source check');add(!result.overallRank,'Your overall ZIP rank');add(!nearest,'Verified route estimate');
  result.missingFacts=[...new Set(missing)];return result;
});
for(const zip of reviewedZips)properties.filter(p=>p.zip===zip&&p.nearest).sort((a,b)=>a.nearest.minutes-b.nearest.minutes||a.nearest.metres-b.nearest.metres||a.name.localeCompare(b.name)).forEach((p,i)=>p.clusterRank=i+1);
const payload={meta:{title:'Kansas City apartments',generatedAt:new Date().toISOString(),workbook:'V3.xlsx',workbookSha256:hash,staged,masterMapFields:details.length>0&&!staged,reviewedZips,sourceChecked:details.map(d=>d['Source checked']).filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))).sort().at(-1)||null,notice:staged?'Local research preview — new map fields await approval to be saved in V3. No publication.':'Generated from V3. Rebuild and republish to update a shared static link.',privacy:'Public property facts only. Private paperwork, income, identifiers and application documents are not exported.',voucherCaveat:'Recorded worksheet calculations are estimates, not voucher approval. When documented utilities include everything except electricity, the user’s $100 electricity planning estimate may be used; it is not an official utility allowance. Known mandatory monthly fees are separate. Read each cost basis for unknown fees and other utilities. All bedroom comparisons use the recorded 1BR standard; a 3BR comparison does not assume a larger voucher. HAKC must confirm the applicable allowance, rent reasonableness and eligibility.'},properties,places:publicPlaces,geography:geo};
const serialized=JSON.stringify(payload).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
if(crypto.createHash('sha256').update(await fs.readFile(workbookPath)).digest('hex')!==hash)throw Error('V3 changed during the build. Output not replaced.');
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output+'.tmp',`window.KCMO_MAP_DATA = ${serialized};\n`);await fs.rename(output+'.tmp',output);
console.log(JSON.stringify({total:properties.length,mapped:properties.filter(p=>p.coordinates).length,awaitingCoordinates:properties.filter(p=>!p.coordinates).length,staged,output}));
