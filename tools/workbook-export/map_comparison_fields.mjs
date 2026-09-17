const value = v => v === undefined || v === null || v === '' ? null : v;
export const publicResearchSources = v => typeof v==='string' ? v.split(/\r?\n/).map(line=>line.replace(/(?:memory\/[^\s|]+|\/Users\/[^|\n]+|file:\/\/[^\s|]+)/g,'Local reference omitted; user confirmation retained')).join('\n') : value(v);
const positiveValue = v => v === 0 ? null : value(v);
export function comparisonFields(candidate, detail = {}) {
  const bedroom = (beds, headers) => ({beds, sqft:positiveValue(candidate[headers[0]]), rent:positiveValue(candidate[headers[1]]), gross:value(candidate[headers[2]]), percent:value(candidate[headers[3]]), fit:value(candidate[headers[4]]) || 'Unverified', evidence:detail[`${beds}BR evidence`] || null});
  const threeKeys = ['3BR Sq Ft','3BR Rent','3BR Estimated Gross','3BR % of Std','3BR Fit (Estimate)'];
  return {
    oneBedroom:{...bedroom(1,['1BR Sq Ft','1BR Rent','1BR Gross','% of Std','Fits?']), utilityAllowance:value(candidate['Util. Allow.']), standard:value(candidate['1BR Std'])},
    twoBedroom:bedroom(2,['2BR Sq Ft','2BR Rent','2BR Gross','2BR % of Std','2BR Fits 1BR Std?']),
    threeBedroom:threeKeys.some(k => value(candidate[k]) !== null) ? bedroom(3,threeKeys) : null,
    costs:{electricityEstimate:value(candidate['Electricity Estimate']), requiredMonthlyFees:value(candidate['Required Monthly Fees']), basis:value(candidate['Cost Basis'])},
    amenityDetails:value(candidate['Amenities / Parking']), researchSources:publicResearchSources(candidate['Sources / Checked'])
  };
}
export function routeOrigin(row, buildingCoordinates) {
  if (!row['Route origin JSON']) return buildingCoordinates ? {coordinates:buildingCoordinates, scope:'Saved building pin; entrance unverified', source:null, checked:null} : null;
  // An explicit invalid origin must invalidate the route, not silently fall back.
  try {
    const o=JSON.parse(row['Route origin JSON']), c=o.coordinates;
    const source=new URL(o.source);
    if(!Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)||c[0]<=38.9||c[0]>=39.3||c[1]<=-94.8||c[1]>=-94.3||!o.scope||!/^https?:$/.test(source.protocol)||!/^\d{4}-\d{2}-\d{2}$/.test(o.checked))return null;
    return {coordinates:c,scope:String(o.scope),source:source.href,checked:o.checked};
  } catch { return null; }
}

export function bedroomNotOffered(research,beds) {
  const description=[research.rent,research.sqft].filter(v=>typeof v==='string').join(' ');
  if(/confirmed absent|not offered|not applicable|^N\/A\b/i.test(description))return true;
  const evidence=String(research.evidence||'');
  return new RegExp(`(?:${beds}BR[^.;]*not offered|confirmed absent[^.;]*${beds}BR|no ${beds}BR (?:options|plans)(?:[.;]|$))`,'i').test(evidence);
}
