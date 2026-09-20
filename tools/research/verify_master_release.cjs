'use strict';
// Read-only acceptance checks against the explicit fresh snapshot and generated website.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('./core.cjs');
const [snapshotPath,websitePath,workbookPath]=process.argv.slice(2);
const snapshot=JSON.parse(fs.readFileSync(snapshotPath)),context={window:{}};
vm.runInNewContext(fs.readFileSync(websitePath,'utf8'),context);
const data=JSON.parse(JSON.stringify(context.window.KCMO_MAP_DATA)),s=snapshot.sheets;
const candidates=s['KCMO Candidates'].filter(r=>r.Property),google=s['Map Routes'].filter(r=>r.Provider==='Google'&&r['Route mode']==='walk');
const mapped=data.properties.filter(p=>p.coordinates),unresolved=data.properties.filter(p=>!p.coordinates);
const expectedIds=['recordbar','green-lady-lounge','mod','in-good-co'];
assert.equal(candidates.length,231);assert.equal(new Set(candidates.map(r=>r['Property ID'])).size,231);
assert.equal(data.properties.length,106);assert.equal(mapped.length,104);assert.equal(unresolved.length,2);
assert.deepEqual(unresolved.map(p=>p.id).sort(),['prop-0d79b919-9d03-4177-82e0-f9efa51454fd','prop-6c1ec09a-92d3-4514-b0c0-4bc13ea29804'].sort());
assert.equal(new Set(data.properties.map(p=>p.id)).size,106);assert.deepEqual(data.meta.clusterIds,expectedIds);
assert.equal(google.length,2808);assert.equal(s['Map Routes'].length-google.length,537);
assert.equal(new Set(google.map(r=>JSON.stringify([r['Property ID'],r['Destination ID']]))).size,2808);
const detailById=new Map(s['Map Details'].map(r=>[r['Property ID'],r])),candidateById=new Map(candidates.map(r=>[r['Property ID'],r]));
const accepted=candidates.filter(r=>C.location(r,detailById.get(r['Property ID'])));
assert.equal(accepted.length,104);assert.equal(accepted.filter(r=>detailById.get(r['Property ID'])['Location import batch']).length,48);
assert.equal(accepted.filter(r=>!detailById.get(r['Property ID'])['Location import batch']).length,56);
const summaryById=new Map(s['Route Summary'].map(r=>[r['Property ID'],r]));
let routes=0,unitImages=0;
for(const p of data.properties){
  const candidate=candidateById.get(p.id);assert(candidate);assert.equal(candidate['Website visibility'],'Yes');
  assert.equal(p.address,String(candidate.Address).trim());assert.equal(p.name,String(candidate.Property).trim());assert.equal(p.zip,String(candidate.Zip).trim());
  const rawUnits=JSON.parse(candidate['Units JSON']||'[]');assert.equal(p.units.length,rawUnits.length);
  for(const unit of p.units){const original=rawUnits.find(u=>u.unit===unit.unit);assert(original);
    for(const field of ['rent','sqft','beds','baths'])if(original[field]!==undefined)assert.equal(unit[field],original[field],p.id+'/'+unit.unit+'/'+field);
    for(const photo of unit.photos){assert.equal(photo.scope,'unit');assert.equal(photo.unit,unit.unit);assert(!p.media.some(m=>m.url===photo.url));unitImages++;}
  }
  if(!p.coordinates){assert.equal(p.walks.length,0);continue;}
  assert.deepEqual(p.coordinates,[detailById.get(p.id).Latitude,detailById.get(p.id).Longitude]);
  assert.equal(p.walks.length,27);assert.equal(p.savedVenueCoverage.count,27);assert.equal(p.savedVenueCoverage.total,27);assert.equal(p.savedVenueCoverage.complete,true);
  assert.equal(p.cluster.coverage,4);assert.equal(p.cluster.complete,true);assert.deepEqual(p.cluster.ids,expectedIds);
  const summary=summaryById.get(p.id);assert(summary);assert.equal(summary['Saved venue coverage'],'27/27');assert.equal(summary.Coverage,'4/4');
  assert.equal(p.nearestSavedVenue.destinationId,summary['Nearest saved venue ID']);
  assert.equal(p.nearestSavedVenue.destination,summary['Nearest addressed saved venue']);
  assert.equal(p.nearestSavedVenue.metres,summary['Nearest saved venue metres']);
  assert.equal(p.nearestSavedVenue.providerSeconds,summary['Nearest saved venue seconds']);
  assert(Math.abs(p.nearestSavedVenue.minutes-summary['Nearest saved venue walk minutes'])<1e-9);
  assert(Math.abs(p.cluster.minMinutes-summary['Cluster min minutes'])<1e-9);
  assert(Math.abs(p.cluster.maxMinutes-summary['Cluster max minutes'])<1e-9);
  assert.equal(p.cluster.closest.destinationId,summary['Closest cluster venue ID']);
  for(const r of p.walks){assert.equal(r.provider,'Google');assert.equal(r.measurementValid,true);assert.equal(r.geometry,null);assert.equal(r.geometryAvailable,false);
    const original=google.find(g=>g['Property ID']===p.id&&g['Destination ID']===r.destinationId);assert(original);
    assert.equal(r.providerSeconds,original['Provider seconds']);assert.equal(r.metres,original.Metres);assert.equal(r.checked,C.date(original.Checked));routes++;
  }
}
assert.equal(routes,2808);
const hash=crypto.createHash('sha256').update(fs.readFileSync(workbookPath)).digest('hex');
assert.equal(hash,snapshot.sha256);assert.equal(data.meta.workbookSha256,hash);
console.log(JSON.stringify({accepted:true,workbookSha256:hash,candidates:231,publicProperties:106,mapped:104,unresolved:unresolved.map(p=>p.name),
  existingAccepted:56,newAccepted:48,currentGoogleMeasurements:routes,olderWorkbookRouteRows:537,completeSavedVenueSummaries:104,completePrioritySummaries:104,
  duplicatePropertyIds:0,duplicateActivePairs:0,geometryInvented:0,exactUnitImagesVerified:unitImages,workbookUnchanged:true},null,2));
