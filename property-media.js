import {photoScope} from './presentation.js?v=detail-gallery-20260915-r1';

const starPhotos = [
  ['kitchen-living', 'Kitchen and living area'],
  ['bedroom-closet', 'Bedroom and closet'],
  ['bathroom', 'Bathroom'],
].map(([file, caption]) => ({
  id: `star-308-${file}`,
  url: `./assets/photos/star-lofts-308/${file}.png`,
  caption,
  scope: 'User-provided · #308',
  unit: '308',
  source: null,
  attribution: 'User-provided September 15, 2026; identified by the user as apartment #308. Not independently verified.',
}));

const oneNineVinePhotos = [
  {
    id: 'one-nine-vine-floor-plan-2br',
    url: './assets/photos/one-nine-vine-302-hud/floor-plan-2br.png',
    caption: 'Published 2BR/2BA floor-plan image',
    scope: 'Published floor plan · 2BR/2BA',
    unit: null,
    source: 'https://www.oneninevine.com/floorplans/2br%2F2ba',
    attribution: 'User-supplied screenshot from the official One Nine Vine floor-plan page; published plan image, not confirmation of Apartment #302-HUD interior.',
  },
  {
    id: 'one-nine-vine-balcony-skyline',
    url: './assets/photos/one-nine-vine-302-hud/balcony-skyline.png',
    caption: 'Representative balcony and skyline view',
    scope: 'Official gallery · representative balcony/exterior view',
    unit: null,
    source: 'https://www.oneninevine.com/photogallery',
    attribution: 'User-supplied screenshot from the official One Nine Vine gallery; representative building image, exact Apartment #302-HUD exposure not confirmed.',
  },
  {
    id: 'one-nine-vine-bathroom-1',
    url: './assets/photos/one-nine-vine-302-hud/bathroom-1.png',
    caption: 'Representative bathroom interior',
    scope: 'Official gallery · representative bathroom interior',
    unit: null,
    source: 'https://www.oneninevine.com/photogallery',
    attribution: 'User-supplied screenshot from the official One Nine Vine gallery; representative/model image, exact Apartment #302-HUD interior not confirmed.',
  },
  {
    id: 'one-nine-vine-bathroom-2',
    url: './assets/photos/one-nine-vine-302-hud/bathroom-2.png',
    caption: 'Representative bathroom vanity',
    scope: 'Official gallery · representative bathroom interior',
    unit: null,
    source: 'https://www.oneninevine.com/photogallery',
    attribution: 'User-supplied screenshot from the official One Nine Vine gallery; representative/model image, exact Apartment #302-HUD interior not confirmed.',
  },
  {
    id: 'one-nine-vine-living-kitchen-1',
    url: './assets/photos/one-nine-vine-302-hud/living-kitchen-1.png',
    caption: 'Representative living and kitchen area',
    scope: 'Official gallery · representative living/kitchen interior',
    unit: null,
    source: 'https://www.oneninevine.com/photogallery',
    attribution: 'User-supplied screenshot from the official One Nine Vine gallery; representative/model image, exact Apartment #302-HUD interior not confirmed.',
  },
  {
    id: 'one-nine-vine-living-kitchen-2',
    url: './assets/photos/one-nine-vine-302-hud/living-kitchen-2.png',
    caption: 'Representative kitchen and living area',
    scope: 'Official gallery · representative living/kitchen interior',
    unit: null,
    source: 'https://www.oneninevine.com/photogallery',
    attribution: 'User-supplied screenshot from the official One Nine Vine gallery; representative/model image, exact Apartment #302-HUD interior not confirmed.',
  },
  {
    id: 'one-nine-vine-kitchen',
    url: './assets/photos/one-nine-vine-302-hud/kitchen.png',
    caption: 'Representative kitchen with stainless appliances',
    scope: 'Official gallery · representative kitchen interior',
    unit: null,
    source: 'https://www.oneninevine.com/photogallery',
    attribution: 'User-supplied screenshot from the official One Nine Vine gallery; representative/model image, exact Apartment #302-HUD interior not confirmed.',
  },
];

export function photoSourceNote(property) {
  if(property.schemaVersion===3)return 'Building, amenity and exact-unit photos are scoped separately. Each photo retains its own source and checked date; a building gallery does not establish an apartment interior.';

  if (property.id === 'old-town-star-lofts') {
    return 'The user supplied ZIP 64100 with the #308 photos. It differs from the existing property record, 64108, which is retained. The photo attribution and ZIP discrepancy have not been independently verified.';
  }
  if (property.id === 'one-nine-vine') {
    return 'Official One Nine Vine gallery and published floor-plan screenshots are included as building/representative media. None is confirmed by the website as a photo of Apartment #302-HUD.';
  }
  return '';
}

export function propertyPhotos(property) {
  if(property.schemaVersion===3){
    const list=[...(property.media||[]).filter(p=>p.kind!=='link').map(p=>({...p,scope:({building:'Building / community',amenity:'Amenity',floorplan:'Published floor plan'})[p.scope]||p.scope,unit:null})),
      ...(property.units||[]).flatMap(u=>(u.photos||[]).filter(p=>p.kind!=='link').map(p=>({...p,unit:u.unit,scope:'Exact-unit association · #'+u.unit})))];
    const seen=new Set();
    return list.filter(p=>{const key=p.url+'|'+(p.unit||'building');if(seen.has(key))return false;seen.add(key);return true;})
      .map(p=>({...p,id:p.id||p.url,attribution:[p.attribution,p.checked?'Photo evidence checked '+p.checked:'Photo check date not recorded'].filter(Boolean).join(' · ')}));
  }

  const result = property.photo ? [{
    id: `${property.id}-saved`, url: property.photo,
    caption: property.photoCaption || photoScope(property), scope: photoScope(property),
    unit: null, source: property.photoSource, attribution: '',
  }] : [];
  for (const unit of property.units || []) {
    if (typeof unit.photo === 'string' && unit.photo && !result.some(photo => photo.url === unit.photo)) {
      result.push({id: `${property.id}-unit-${unit.unit}`, url: unit.photo,
        caption: `Apartment #${unit.unit}`, scope: `Exact-unit photo · #${unit.unit}`,
        unit: unit.unit, source: unit.source, attribution: 'Recorded unit photo; see the listing source.'});
    }
  }
  if (property.id === 'old-town-star-lofts') result.push(...starPhotos.map(photo => ({...photo})));
  if (property.id === 'one-nine-vine') result.push(...oneNineVinePhotos.map(photo => ({...photo})));
  return result;
}

export function preferredPhotoIndex(photos, selectedUnit) {
  if (!selectedUnit) return photos.findIndex(photo=>!photo.unit);
  const index = photos.findIndex(photo => photo.unit === selectedUnit.unit);
  return index < 0 ? photos.findIndex(photo=>!photo.unit) : index;
}
