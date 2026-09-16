export const PRIORITY_AMENITIES = Object.freeze([
  {key:'pool',label:'Pool'},
  {key:'rooftop',label:'Rooftop'},
  {key:'patio',label:'Patio'},
  {key:'gym',label:'Gym'},
].map(Object.freeze));

const patterns = {
  pool:/\b(?:swimming\s+)?pools?\b(?!\s+(?:tables?|billiards?|equipment|covers?))/i,
  rooftop:/\b(?:roof[ -]?top|roof)\s+(?:(?:resident|common|outdoor|recreation)\s+)*(?:decks?|gardens?|lounges?|terraces?|patios?|pools?|dining|seating|access)\b|\b(?:accessible|resident[- ]accessible)\s+rooftop\b/i,
  patio:/\bpatios?\b(?!\s+(?:doors?|furniture|sets?|windows?))/i,
  gym:/\bgyms?\b|\b(?:fitness|wellness)\s+(?:cent(?:er|re)s?|rooms?|areas?|facilities|studios?)\b/i,
};
const uncertainty = /\b(?:unverified|unconfirmed|unknown|unpublished|uncertain|unresolved|inaccessible|unavailable|absent|closed|removed|proposed|planned|future|historical|formerly|previously|conflicting|conflict|needs? confirmation|requires? (?:confirmation|qualification)|require qualification)\b|\bnot\b|\bno\b|\bwithout\b|\b(?:doesn['’]t|isn['’]t|wasn['’]t|aren['’]t|cannot|can['’]t)\b/i;
const otherProperty = /\b(?:portfolio|select(?:ed)?\s+(?:buildings|properties)|sister\s+(?:building|property)|nearby|off[- ]site|neighbor(?:ing)?|next door|jointly)\b/i;
const accessQualification = /\b(?:operational|readiness|this (?:building|address)|access|applicability|available to residents|these amenities|those amenities|these facilities)\b/i;
const anyAmenity = /\b(?:pools?|gyms?|fitness|wellness|roof(?:top)?|patios?)\b/i;
const dedicatedRestriction = /\b(?:operational|readiness|access|this (?:building|address)|property[- ]specific)\b/i;
const unavailable = /\b(?:unavailable|inaccessible|absent|closed|removed|discontinued|demolished|conflicting|conflict)\b|\bno longer\b|\b(?:does not|doesn['’]t)\s+(?:have|offer|include|provide|feature)\b|\bnot\s+(?:currently\s+)?(?:available|offered|provided|present|open)\b|\b(?:no|without)\s+(?:(?:a|an|any|on[- ]site|resident)\s+)*(?:pools?|gyms?|fitness|wellness|patios?|roof(?:top)?\s+(?:access|deck|garden|lounge|terrace|patio|pool))\b/i;

function clauses(value) {
  return String(value || '').replace(/https?:\/\/\S+/g,'').split(/[.;!?\n]|\bbut\b/i).map(text=>text.trim()).filter(Boolean);
}

function hasClaim(value,key,{dedicated=false}={}) {
  if (dedicated && value === true) return true;
  if (typeof value !== 'string') return false;
  const parts = clauses(value);
  return parts.some((part,index)=>{
    const impliedYes = dedicated && /^yes\b/i.test(part) && (!anyAmenity.test(part) || patterns[key].test(part));
    const found = patterns[key].test(part) || impliedYes ||
      (dedicated && key==='gym' && /\bfitness\s+advertised\b/i.test(part));
    if (!found || uncertainty.test(part) || otherProperty.test(part)) return false;
    // A following qualification can apply to the advertised feature before the semicolon.
    const next = parts[index+1] || '';
    if (uncertainty.test(next) && accessQualification.test(next) && !anyAmenity.test(next)) return false;
    return true;
  });
}

function blocksDedicatedClaim(value) {
  if (value === false) return true;
  const text = String(value || '');
  // Explicit absence or property-access restrictions take precedence over generic prose.
  return /^\s*no(?:\s|$|[.;,])/i.test(text) || unavailable.test(text) ||
    otherProperty.test(text) || (uncertainty.test(text) && dedicatedRestriction.test(text));
}

export function supportsPriorityAmenity(property,key) {
  if (!property || !Object.hasOwn(patterns,key)) return false;
  const dedicated = property.amenities?.[key];
  if (blocksDedicatedClaim(dedicated)) return false;
  if (hasClaim(dedicated,key,{dedicated:true})) return true;
  // Only amenity research fields count; names, photos, links and nearby destinations do not.
  const evidence = [property.amenityDetails, property.strengths];
  if (key==='rooftop') evidence.push(property.amenities?.pool);
  return evidence.some(value=>hasClaim(value,key));
}

export function matchesPriorityAmenities(property,keys=[]) {
  return Array.from(keys).every(key=>supportsPriorityAmenity(property,key));
}
