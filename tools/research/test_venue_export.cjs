'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('./core.cjs');
const folder=process.argv[2];if(!folder)throw Error('Pass the private before/after snapshot directory.');
const before=JSON.parse(fs.readFileSync(folder+'/master-before.json')),after=JSON.parse(fs.readFileSync(folder+'/master-after.json'));
const input=JSON.parse(fs.readFileSync(folder+'/venue-import-input.json'));
const old=C.build(before),fresh=C.build(after),data=fresh.payload;
assert.deepEqual(data.properties,old.payload.properties);
assert.equal(data.places.length,59);assert.equal(data.places.filter(p=>p.coordinates).length,58);
assert.equal(fresh.report.currentGoogleMeasurements,2808);assert.equal(data.meta.savedWalkingCohortIds.length,27);
assert.deepEqual([...data.meta.savedWalkingCohortIds].sort(),old.payload.places.filter(p=>p.coordinates).map(p=>p.id).sort());
for(const r of input.rows.filter(r=>r.newId)){
 const p=data.places.find(p=>p.id===r.newId);assert(p);
 assert.equal(p.name,r.name);assert.equal(p.address,r.address);assert.equal(p.category,r.category);assert.deepEqual(p.coordinates,[r.latitude,r.longitude]);
 assert.equal(p.provenance,'User-supplied; not independently verified');assert.equal(p.checked,null);assert.equal(p.coordinateChecked,null);assert.equal(p.priority,false);
 assert.equal(new URL(p.mapUrl).searchParams.get('query'),p.coordinates.join(','));
 assert.equal(new URL(p.directionsUrl).searchParams.get('destination'),p.coordinates.join(','));
 assert(!data.meta.savedWalkingCohortIds.includes(p.id));
}
assert.equal(input.rows.filter(r=>r.holdReason).length,4);
for(const p of old.payload.places){const n=data.places.find(v=>v.id===p.id);for(const key of ['id','name','address','category','coordinates','locationInput','checked','coordinateChecked'])assert.deepEqual(n[key],p[key]);}
for(const p of data.properties){assert.equal(p.savedVenueCoverage.total,27);if(p.coordinates){assert.equal(p.cluster.coverage,4);assert.equal(p.savedVenueCoverage.count,27);}}
const missing=structuredClone(after);missing.sheets['Workflow Settings']=missing.sheets['Workflow Settings'].filter(r=>r.Setting!=='Saved walking cohort IDs');assert.throws(()=>C.build(missing),/requires a saved walking cohort/);
const bad=structuredClone(after);const newPlace=bad.sheets['Map Places'].find(p=>p['Place ID']===input.rows[0].newId);newPlace.Address='Changed address';assert.equal(C.build(bad).payload.places.find(p=>p.id===newPlace['Place ID']).coordinates,null);
console.log('PASS: fresh Sheet export, 31 exact additions, 4 pending, original property facts and 2808 walks unchanged, 27 frozen routing venues, no new priority/category inference, correct links, missing cohort and changed addresses fail closed.');
