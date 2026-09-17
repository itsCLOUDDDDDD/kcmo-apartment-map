export const safeUrl=value=>{try{const u=new URL(String(value||''));return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
const urlsIn=value=>String(value||'').match(/https?:\/\/[^\s<>\"|]+/g)?.map(v=>safeUrl(v.replace(/[).,;]+$/, ''))).filter(Boolean)||[];
export const sourceLink=value=>safeUrl(value)||urlsIn(value)[0]||null;
export const exactPhotoLink=(value,unit)=>{
  for(const segment of String(value||'').split(/[\n;]/)){
    if(!/exact[- ]unit|identified unit/i.test(segment)||/unverified|unknown|not found|inaccessible|conflict|not (?:verified|confirmed)|not exact/i.test(segment))continue;
    const ids=[...segment.matchAll(/(?:#|\bunit\s*#?\s*)([A-Z]*\d+[A-Z0-9-]*)\b/gi)].map(m=>m[1].toUpperCase());
    if(new Set(ids).size===1&&ids[0]===String(unit).trim().toUpperCase())return sourceLink(segment);
  }
  return null;
};
export const galleryLink=value=>/building|model|interior|amenit|exterior|rendering|gallery/i.test(String(value||''))?sourceLink(value):null;
