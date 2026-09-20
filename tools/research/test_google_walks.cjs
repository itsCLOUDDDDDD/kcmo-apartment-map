'use strict';
const assert=require('node:assert/strict'),C=require('./core.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
const ids=['recordbar','green-lady-lounge','mod','in-good-co','third-place-lounge'];
function fixture(){
  const candidate={'Property ID':'stable-home',Property:'Same display name',Address:'100 Sample St','City/State':'Kansas City, MO',Zip:'64108','Website visibility':'Yes','Units JSON':'[]','Media JSON':'[]'};
  const detail={'Property ID':'stable-home',Latitude:39.1,Longitude:-94.58,'Location input':C.addressKey(candidate),'Location status':'Validated address','Coordinate source':'Supplied accepted coordinates','Coordinate checked':'2026-09-20'};
  const places=ids.map((id,i)=>{const p={'Place ID':id,Name:id,Address:(200+i)+' Sample St','City/State':'Kansas City, MO',Zip:'64108',Latitude:39.09+i/10000,Longitude:-94.57,'Location status':'Saved address-matched','Coordinate source':'Saved source'};p['Location input']=C.addressKey(p);return p;});
  const routes=places.map((p,i)=>({'Property ID':candidate['Property ID'],'Destination ID':p['Place ID'],Provider:'Google','Route mode':'walk','Route status':'Current; walking measures only',
    'Origin address':candidate.Address,'Destination address':p.Address,'Origin input':C.addressKey(candidate),'Destination input':C.addressKey(p),
    'Provider origin coordinates':JSON.stringify([detail.Latitude,detail.Longitude]),'Provider destination coordinates':JSON.stringify([p.Latitude,p.Longitude]),
    'Provider seconds':i===4?61:600+i,Minutes:Math.ceil((600+i)/60),Metres:1000+i,Checked:'2026-09-20',Geometry:''}));
  return {sheets:{'KCMO Candidates':[candidate],'Map Details':[detail],'Map Places':places,'Map Routes':routes,
    'Scene & Anchors':places.slice(0,4).map(p=>({...p,'Walking cluster':C.CLUSTER})),
    'Workflow Settings':[{Setting:'Website ZIP scope',Value:'64108'}],'Payment Standards 2026':[]}};
}
test('Google seconds are valid with no geometry and remain separate from the four-place cluster',()=>{
  const s=fixture(),before=clone(s),b=C.build(s),p=b.payload.properties[0];assert.deepEqual(s,before);
  assert.equal(b.report.currentGoogleMeasurements,5);assert.equal(b.report.drawableRoutes,0);
  assert(p.walks.every(r=>r.measurementValid&&r.geometry===null&&r.geometryAvailable===false));
  assert.equal(p.nearestSavedVenue.destinationId,'third-place-lounge');assert.equal(p.nearestSavedVenue.minutes,61/60);
  assert.equal(p.nearest.destinationId,'recordbar');assert.deepEqual(p.cluster.ids,ids.slice(0,4));
  assert.equal(p.cluster.coverage,4);assert.equal(p.cluster.minMinutes,10);assert.equal(p.cluster.maxMinutes,603/60);
  assert.equal(p.savedVenueCoverage.count,5);assert.equal(p.savedVenueCoverage.complete,true);
});
test('Duplicate active Google pairs stop the build',()=>{const s=fixture();s.sheets['Map Routes'].push(clone(s.sheets['Map Routes'][0]));assert.throws(()=>C.build(s),/Duplicate active Google/);});
test('Stable IDs keep two identically named buildings separate',()=>{
  const s=fixture();s.sheets['KCMO Candidates'].push({...s.sheets['KCMO Candidates'][0],'Property ID':'other-home',Address:'999 Sample St'});
  const b=C.build(s);assert.equal(b.payload.properties.length,2);assert.equal(b.payload.properties[1].walks.length,0);assert.equal(b.payload.properties[1].coordinates,null);
});
for(const [name,change]of [
  ['origin address',s=>s.sheets['KCMO Candidates'][0].Address='Changed'],
  ['origin coordinates',s=>s.sheets['Map Details'][0].Latitude+=0.01],
  ['destination address',s=>s.sheets['Map Places'][0].Address='Changed'],
  ['destination coordinates',s=>s.sheets['Map Places'][0].Latitude+=0.01],
  ['invalid duration',s=>s.sheets['Map Routes'][0]['Provider seconds']=-1],
  ['invalid metres',s=>s.sheets['Map Routes'][0].Metres=0],
  ['stale cache',s=>s.sheets['Map Routes'][0]['Cache key']='stale'],
  ['transit mode',s=>s.sheets['Map Routes'][0]['Route mode']='transit'],
])test('Rejects changed or invalid '+name,()=>{const s=fixture();change(s);const p=C.build(s).payload.properties[0];assert(!p.walks.some(r=>r.destinationId==='recordbar'));assert.equal(p.cluster.complete,false);});
test('Google measures outrank a newer OSRM route without deleting source evidence',()=>{
  const s=fixture(),r=s.sheets['Map Routes'][0],a=JSON.parse(r['Provider origin coordinates']),b=JSON.parse(r['Provider destination coordinates']);
  s.sheets['Map Routes'].push({...r,Provider:'OSRM','Provider seconds':1,'Endpoint offset metres':0,Method:'OSRM walking',Checked:'2026-09-21',
    'Source URL':`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${a.join(',')};${b.join(',')}`,Geometry:JSON.stringify({type:'LineString',coordinates:[[a[1],a[0]],[b[1],b[0]]]})});
  const before=clone(s),p=C.build(s).payload.properties[0];assert.equal(p.walks.find(r=>r.destinationId==='recordbar').provider,'Google');assert.deepEqual(s,before);
});
test('Bad geometry is withheld independently of valid time; blank evidence date stays unknown',()=>{
  const s=fixture();s.sheets['Map Routes'][0].Geometry=JSON.stringify({type:'Point',coordinates:[0,0]});s.sheets['Map Routes'][0].Checked='';
  const r=C.build(s).payload.properties[0].walks[0];assert.equal(r.geometry,null);assert.equal(r.measurementValid,true);assert.equal(r.checked,null);
});
test('Duplicate candidate IDs still stop export',()=>{const s=fixture();s.sheets['KCMO Candidates'].push(clone(s.sheets['KCMO Candidates'][0]));assert.throws(()=>C.build(s),/Duplicate property ID/);});
console.log(JSON.stringify({passed,networkCalls:0}));
