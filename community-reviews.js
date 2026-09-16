const oldTownProperties = new Set([
  'chase-apts', 'finance-building-lofts', 'graphic-art-lofts', 'lofts-917',
  'old-town-hanover-lofts', 'old-town-lofts-119-walnut', 'old-town-lofts-207-walnut',
  'old-town-lofts-213-walnut', 'chambers-lofts', 'waltower-lofts',
  'old-town-carriage-lofts', 'old-town-star-lofts', 'old-town-columbia-lofts'
]);

// Portfolio context only: these reports never feed amenity matches or cost calculations.
const oldTownReview = {
  title: 'Community feedback · Old Town Lofts',
  scope: 'Comments on an Old Town Lofts post; the exact building and unit are not identified. These individual reports are unverified and may not describe this property.',
  reports: [
    'One commenter initially praised the space but reported difficult parking and high summer and winter energy bills. In a later reply, they said they had moved, described needing repeated follow-up with office staff, and reported continued unauthorized entry despite security improvements.',
    'A second commenter raised concerns about tall ceilings, insulation and heating costs.'
  ],
  source: 'Source: user-supplied comment screenshot, added September 16, 2026. Original post link and full comment dates were not provided.'
};

export function communityReviewFor(property) {
  return oldTownProperties.has(property?.id) ? oldTownReview : null;
}
