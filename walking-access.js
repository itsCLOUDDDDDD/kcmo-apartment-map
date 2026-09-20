const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const walkingMinutes=value=>Number.isFinite(value)?String(Math.round(value*10)/10):'Unverified';
export function locationAccessHTML(property){
  const nearest=property.nearestSavedVenue,coverage=property.savedVenueCoverage,cluster=property.cluster;
  if(!nearest)return '<div class="saved-walking-summary"><p>Saved-venue walking access unresolved.</p></div>';
  const full=coverage?.complete,range=Number.isFinite(cluster?.minMinutes)&&Number.isFinite(cluster?.maxMinutes)?
    `${walkingMinutes(cluster.minMinutes)}–${walkingMinutes(cluster.maxMinutes)} min`:'Unresolved';
  return `<div class="saved-walking-summary" data-nearest-venue-id="${escape(nearest.destinationId)}"><p><strong>${full?'Nearest saved venue':'Nearest among measured venues'}: ${escape(nearest.destination)}</strong><br>${walkingMinutes(nearest.minutes)} min walk · ${escape(nearest.metres.toLocaleString())} m · ${coverage?.count??0}/${coverage?.total??0} saved venues measured${full?'':' · incomplete coverage'}</p><p><strong>Priority cluster: ${range}</strong> · ${cluster?.coverage??0}/${cluster?.total??4} measured${cluster?.complete?'':' · incomplete coverage'}<br>Closest: ${escape(cluster?.closest?.destination||'Unresolved')}</p><p class="small muted">${nearest.geometryAvailable?'Saved route line available.':'Walking times are available; route lines are unavailable.'}</p></div>`;
}
