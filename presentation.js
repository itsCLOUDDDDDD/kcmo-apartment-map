// Summarize individual claims: uncertainty about one feature must not erase another.
export function amenitySummary(key, value) {
  if(key==='laundry'&&value==='Installed in-unit')return {label:'In-unit W/D · confirmed input',status:'present'};
  if(key==='cooling'&&value==='Central HVAC')return {label:'Central HVAC · confirmed input',status:'present'};

  const raw=String(value||'Unverified'),text=raw.toLowerCase();
  const uncertain=s=>/unverified|unknown|not found|not confirmed|not established|not listed|not advertised|not verified|no (?:public |confirmed )?(?:listing|evidence)|source inaccessible/.test(s);
  const clauses=text.split(/[.;]|\bbut\b/).map(s=>s.trim()).filter(Boolean);
  const positive=pattern=>clauses.some(s=>pattern.test(s)&&!uncertain(s)&&!/^no\b|confirmed absent|historical|\b201[0-9]\b/.test(s));
  if(/conflicting sources|sources conflict/.test(text))return {label:'Conflicting sources',status:'unknown'};
  if(key==='laundry') {
    const shared=positive(/shared|on-site laundry|laundry (?:room|facilities)|each floor|every building|each building/)||/^no\s*[-—]\s*shared laundry/.test(text);
    const hookups=clauses.some(clause=>/hookups?/.test(clause)&&!/not just hookups?/.test(clause)&&!uncertain(clause)&&!/^no\b|historical|\b201[0-9]\b/.test(clause));
    const inUnit=clauses.some(clause=>(!/hookups?/.test(clause)||/not just hookups?/.test(clause))&&!uncertain(clause)&&!/^no\b|historical|\b201[0-9]\b/.test(clause)&&/in-unit (?:and on-site )?laundry|in-unit washer|washer(?: and|\/)dryer|washer and dryer|w\/d|installed machines/.test(clause));
    const selected=/select(?:ed)? (?:apartments|units|homes|properties)|some (?:units|apartments|homes)|varies|unassigned/.test(text);
    if(shared&&hookups&&!inUnit)return {label:selected?'Shared laundry':'Hookups + shared laundry',status:'partial'};
    if(shared&&inUnit)return {label:'Shared + in-unit options',status:'partial'};
    if(shared)return {label:'Shared laundry',status:'partial'};
    if(hookups)return {label:selected?'W/D hookups · select units':'W/D hookups',status:'partial'};
    if(inUnit)return {label:selected?'In-unit W/D · select units':'In-unit W/D · recorded',status:selected?'partial':'present'};
    if(/^yes\b/.test(text))return {label:'Laundry · recorded',status:'present'};
    if(/^no\b|confirmed absent/.test(text))return {label:'No in-unit laundry',status:'absent'};
    return {label:'Laundry needs confirmation',status:'unknown'};
  }
  if(key==='cooling') {
    if(positive(/central air|central a\/c|central.*air conditioning/))return {label:'Central A/C · recorded',status:'present'};
    if(positive(/window.*(?:a\/c|air condition)/))return {label:'Window A/C',status:'present'};
    if(positive(/air.conditioning|\ba\/c\b/))return {label:/central.*(?:unverified|not verified|not confirmed)|central.*not explicitly/.test(text)?'A/C · type unverified':'A/C · recorded',status:'present'};
    if(/^yes\s*$/.test(text))return {label:'Cooling · recorded',status:'present'};
    if(/^no\b|confirmed absent/.test(text))return {label:'No cooling recorded',status:'absent'};
    return {label:'Cooling unverified',status:'unknown'};
  }
  if(/^no\b|confirmed absent/.test(text))return {label:key==='pool'?'No pool':'No gym',status:'absent'};
  if(/access for this address unverified|select .*buildings|property-specific.*not confirmed/.test(text))return {label:'Access unverified',status:'unknown'};
  const found=positive(key==='gym'?/gym|fitness (?:room|center|facilities)|wellness center/:/pool|swimming/);
  if(found||/^yes\s*$/.test(text))return {label:key==='gym'?(/24[- ]hour/.test(text)?'24-hour gym':'Gym'):'Pool',status:'present'};
  return {label:uncertain(text)?'Unverified':raw,status:'unknown'};
}

export const amenityFields=[['laundry','Laundry'],['cooling','Cooling'],['gym','Gym'],['pool','Pool']];
export function visibleAmenities(property) {
  return amenityFields.map(([key,title])=>({key,title,...amenitySummary(key,property.amenities?.[key])}))
    .filter(f=>f.key==='laundry'||f.status==='present'||f.status==='partial');
}

export function streetViewAction(property) {
  const c=property.coordinates,valid=Array.isArray(c)&&c.length===2&&c.every(Number.isFinite)&&Math.abs(c[0])<=90&&Math.abs(c[1])<=180;
  if(valid&&property.links?.streetView)return {url:property.links.streetView,label:'Street View'};
  return {url:property.links?.googleMaps||'',label:'Open in Google Maps'};
}

export function recordedUnits(property) {
  // Schema 3 never reparses notes or inherits a building check date/source into an apartment.
  if(property.schemaVersion===3)return (property.units||[]).map(u=>({...u,structured:true,checked:u.checked||null,source:u.source||null}));

  const records=(property.units||[]).map(unit=>({...unit,structured:true,checked:unit.checked||property.checked||'',source:unit.source||property.links?.units||''}));
  if(records.length)return records;
  const raw=String(property.unitOptions||'');
  if(/^Official plan rates checked/.test(raw))return records;
  // Explicit unit mentions stay visible even when their size or rent is missing. Never borrow those facts from another unit.
  const current=raw.split(/Official catalog also|Older indexed|General quoted|Sample floor plans/)[0]
    .replace(/#(\d+?)([0-4]BR)(?=\/)/gi,'#$1 $2').replace(/(\dBA)(?=\d)/gi,'$1 ');
  const checked=property.checked||raw.match(/checked[: ]+(\d{4}-\d{2}-\d{2})/i)?.[1]||'';
  // Pipe-separated rows keep their own prices and qualification clauses. Full rows supersede summary mentions.
  const rowStart=/#([A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)(?:\s*\/\s*physical\s+[A-Za-z0-9-]+)?\s*:/i;
  const delimited=/\|\s*#[A-Za-z0-9-]+(?:\s*\/\s*physical\s+[A-Za-z0-9-]+)?\s*:/.test(current)||/^#[A-Za-z0-9-]+(?:\s*\/\s*physical\s+[A-Za-z0-9-]+)?\s*:/.test(current);
  const parts=delimited?current.split('|').flatMap(part=>{const match=part.match(rowStart);return match?[part.slice(match.index)]:[];}):current.split(/;|\.\s+(?=[A-Z#0-9])|\band\s+(?=#[A-Za-z0-9-]+\s+[\d,]+\s*(?:sf|sq\s*ft))/);
  let beds=null;
  for(const part of parts) {
    if(delimited)beds=null;
    const hasIdentifier=/#(?:[A-Za-z0-9]+)|\bExact Unit\s+[A-Za-z0-9-]+|\b\d{4}-\d{3}\b/i.test(part);
    if(!hasIdentifier||/historical|prior |not (?:shown|treated|found)|catalog entries/.test(part.toLowerCase())){beds=null;continue;}
    const bed=part.match(/\b(\d)BR\b/i);if(bed)beds=Number(bed[1]);
    const bath=part.match(/\b(\d)BA\b/i);
    if(/\bstudio\b/i.test(part))beds=0;
    const size=part.match(/\b([\d,]+(?:[–-][\d,]+)?)\s*(?:sf|sq\s*ft)\b/i),rent=part.match(/\$(\d{1,3}(?:,\d{3})*|\d+)(?!\d)(?:\s*[–-]\s*\$?(\d{1,3}(?:,\d{3})*|\d+)(?!\d))?/);
    let identifiers=[...part.matchAll(/#([A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)/g)].map(m=>m[1]);
    const exact=part.match(/\bExact Unit\s+([A-Za-z]*\d[A-Za-z0-9-]*)/i);if(exact)identifiers=[exact[1]];
    if(!identifiers.length)identifiers=[...part.matchAll(/\b\d{4}-\d{3}\b/g)].map(m=>m[0]);
    // A portal number and physical number refer to one apartment, not separate vacancies.
    if(/physical|portal.*=/.test(part)&&identifiers.length>1)identifiers=[identifiers[0]+' (physical '+identifiers.slice(1).join('/')+')'];
    const evidence=[property.oneBedroom?.evidence,property.twoBedroom?.evidence,property.threeBedroom?.evidence].find(s=>s&&identifiers.some(id=>s.includes('#'+id)));
    const source=part.match(/https?:\/\/[^\s|]+/)?.[0]||evidence?.match(/https?:\/\/[^\s|]+/)?.[0]||property.links?.units||null;
    const availabilityText=part.slice(Math.max(part.search(/#[A-Za-z0-9-]+/),0));
    const availability=/\binquire\b/i.test(part)?'Inquire — availability unconfirmed':availabilityText.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]||availabilityText.match(/\b(now|oct(?:ober)?\s+\d+(?:,\s*\d{4})?|nov(?:ember)?\s+\d+(?:,\s*\d{4})?|dec(?:ember)?\s+\d+(?:,\s*\d{4})?|sep(?:tember)?\s+\d+(?:,\s*\d{4})?|jan(?:uary)?\s+\d+(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}\/\d{4})\b/i)?.[0]||(/\bavailable\b/i.test(part)?'Listed available · no date given':'Date not recorded in this note');
    const priceLabel=/advertised total monthly|prices include required monthly fees|total monthly prices including required fees/i.test(raw)?'Advertised monthly total':'Recorded rent';
    const planSize=part.match(/\b([\d,]+(?:[–-][\d,]+)?)\s+plan\s+(size|range)(?:;\s*exact unit not established)?\s*sf\b/i);
    for(const unit of identifiers)if(!records.some(record=>record.unit.split(' (physical ')[0]===unit.split(' (physical ')[0]))records.push({unit,beds:(!size||!rent)&&!bed&&!/\bstudio\b/i.test(part)?null:beds,baths:bath?Number(bath[1]):null,sqft:planSize?planSize[1]+' sq ft · plan '+planSize[2]+', exact apartment size unverified':size?(/[–-]/.test(size[1])?size[1]:Number(size[1].replaceAll(',',''))):null,rent:rent?(rent[2]?'$'+rent[1]+'–$'+rent[2]:Number(rent[1].replaceAll(',',''))):null,available:availability,priceLabel,checked,source,structured:false,evidence:part.trim()});
  }
  return records;
}

export function floorPlanGroups(property) {
  const text=String(property.unitOptions||'');
  // This source format explicitly identifies plan rates and says vacancy is unconfirmed.
  if(!/^Official plan rates checked/.test(text))return [];
  const checked=text.match(/\d{4}-\d{2}-\d{2}/)?.[0]||property.checked||'';
  const groups=[];let beds=null;
  for(const part of text.replace(/^.*?:\s*/,'').split(/;|\.\s*(?=\dBR)/)) {
    const match=part.trim().match(/^(?:(\d)BR\s+)?([A-Za-z][A-Za-z ]+?)\s+([\d,]+(?:[–-][\d,]+)?)\s*(?:sf\s*)?\$(\d[\d,]*\+?)\.?$/);
    if(!match)continue;
    if(match[1])beds=Number(match[1]);if(beds===null)continue;
    let group=groups.find(g=>g.beds===beds);if(!group){group={beds,label:`${beds}-bedroom floor plans`,plans:[]};groups.push(group);}
    group.plans.push({name:match[2],sqft:match[3],rent:'$'+match[4],checked,source:property.links?.floorplans||'',availability:'Availability unconfirmed'});
  }
  return groups;
}

export function photoScope(property) {
  if (!property.photo) return 'Photo not verified';
  const caption=String(property.photoCaption||'');
  if(/rendering/i.test(caption))return 'Rendering';
  if(/model/i.test(caption))return 'Model apartment photo';
  if(/exterior/i.test(caption))return 'Exterior photo';
  const noExact=/not (?:the |an? )?exact|not (?:an? )?identified[- ]unit|not verified as exact|no (?:identified[- ]|exact[- ])(?:apartment|unit)|exact unit number not identified|exact[- ]unit[^.;]*(?:not found|unverified)/i.test(caption);
  if(/unit association/i.test(caption))return 'Interior photo · unit-associated';
  if(!noExact&&/exact[- ]unit|identified unit|exact (?:\d+ Walnut\s+)?#\d+/i.test(caption))return 'Exact-unit photo';
  if(/amenity/i.test(caption))return 'Amenity photo';
  if(/interior/i.test(caption))return 'Interior photo';
  if (/shared community|shared.*phase|portfolio/.test(String(property.linkScope).toLowerCase())) return 'Shared community photo';
  return /community page/.test(property.photoCaption || '') ? 'Building / community photo' : 'Building photo';
}

export function hasUnconfirmedTwoBedroom(property) {
  return /UNCONFIRMED BUILDING|unconfirmed.*building/i.test(property.twoBedroom.evidence || '');
}

export function selectedZipAreas(geometry, zips) {
  return (geometry?.features || []).filter(feature => zips.has(String(feature.properties?.ZCTA5)) && ['Polygon','MultiPolygon'].includes(feature.geometry?.type));
}

export function zipAreaFilter(zips) {
  return ['in', ['to-string', ['get', 'ZCTA5']], ['literal', [...zips].map(String)]];
}

export function zipAreaCoordinates(features) {
  return features.flatMap(({geometry}) => geometry.coordinates.flat(geometry.type === 'MultiPolygon' ? 2 : 1))
    .filter(coordinate => coordinate.length >= 2 && coordinate.slice(0,2).every(Number.isFinite));
}

export function alternativeBedroom(property) {
  return property.threeBedroom ? {beds:3,research:property.threeBedroom} : {beds:2,research:property.twoBedroom};
}
