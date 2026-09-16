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

export function photoSourceNote(property) {
  return property.id === 'old-town-star-lofts'
    ? 'The user supplied ZIP 64100 with the #308 photos. It differs from the existing property record, 64108, which is retained. The photo attribution and ZIP discrepancy have not been independently verified.'
    : '';
}

export function propertyPhotos(property) {
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
  return result;
}

export function preferredPhotoIndex(photos, selectedUnit) {
  if (!selectedUnit) return 0;
  const index = photos.findIndex(photo => photo.unit === selectedUnit.unit);
  return index < 0 ? 0 : index;
}
