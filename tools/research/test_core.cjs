#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('./core.cjs'),clone=x=>JSON.parse(JSON.stringify(x));
const O=require('./outscraper.cjs');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const setting=[{Setting:'Utility planning standard',Value:90},{Setting:'Website ZIP scope',Value:'64108'}];
const row={Property:'Sample building',Address:'100 Sample St','City/State':'Kansas City, MO',Zip:'64108','Property ID':'stable-one','Website visibility':'Yes','Standard agency':'Test authority','Units JSON':'[]','Media JSON':'[]'};
const snap={sheets:{'KCMO Candidates':[row],'Workflow Settings':setting,'Payment Standards 2026':[{Agency:'Test authority',Zip:'64108','1BR':1500}],
'Map Details':[],'Map Places':[{'Place ID':'test-place',Name:'Test venue',Address:'200 Sample St','City/State':'Kansas City, MO',Zip:'64108'}],
'Scene & Anchors':[{'Place ID':'test-place',Name:'Test venue',Address:'200 Sample St','Walking cluster':C.CLUSTER}],'Map Routes':[]}};
const unit={unit:'A1',beds:1,baths:1,sqft:700,rent:1000,available:'Unknown',checked:null,source:null,photos:[],costs:{}};
test('Unknown fees remain unknown and do not block planning total',()=>{
 const u=C.units({...row,'Units JSON':JSON.stringify([unit])},C.settings(setting))[0],c=C.unitCost(u,1500,90);
 assert.equal(c.planningSubtotalExcludingUnresolvedFees,1090);assert.equal(c.planningTotal,1090);assert.equal(c.officialComparisonTotal,null);assert.equal(c.percent,1090/1500);
});
test('Confirmed zero fees and own official allowance remain distinct',()=>{
 const raw=clone(unit);raw.costs={feeStatus:'Confirmed',requiredMonthlyFees:0,feeSource:'https://example.org/fees',feesChecked:'2026-09-17',allowanceStatus:'Confirmed',utilityAllowance:80,allowanceSource:'https://example.org/allowance',allowanceChecked:'2026-09-17'};
 const u=C.units({...row,'Units JSON':JSON.stringify([raw])},C.settings(setting))[0],c=C.unitCost(u,1500,90);
 assert.equal(c.planningTotal,1090);assert.equal(c.officialComparisonTotal,1080);
});
test('A bare fee zero lacks confirmation',()=>{
 const raw=clone(unit);raw.costs.requiredMonthlyFees=0;
 const u=C.units({...row,'Units JSON':JSON.stringify([raw])},C.settings(setting))[0];assert.equal(u.costs.requiredMonthlyFees,null);
});
test('Building fees require explicit all-unit scope and explicit unit opt-in',()=>{
 const r={...row,'Required Monthly Fees':25,'Fee status':'Confirmed','Fee scope':'All units','Fee source':'https://example.org/fees','Costs checked':'2026-09-17'};
 r['Units JSON']=JSON.stringify([unit]);assert.equal(C.units(r,C.settings(setting))[0].costs.requiredMonthlyFees,null);
 const raw=clone(unit);raw.costs.feeStatus='Use building confirmation';r['Units JSON']=JSON.stringify([raw]);
 assert.equal(C.unitCost(C.units(r,C.settings(setting))[0],1500,90).planningTotal,1090);
});
test('Apartments retain independent price, size, date, source and photos',()=>{
 const a=clone(unit),b={...clone(unit),unit:'B2',beds:2,rent:1400,sqft:950};
 a.photos=[{scope:'unit',unit:'A1',url:'https://example.org/a.jpg',checked:'2026-09-16'}];
 const u=C.units({...row,'Property evidence checked':'2026-09-17','Units JSON':JSON.stringify([a,b])},C.settings(setting));
 assert.equal(u[0].rent,1000);assert.equal(u[1].rent,1400);assert.equal(u[1].sqft,950);assert.equal(u[1].checked,null);assert.equal(u[1].source,null);assert.equal(u[1].photos.length,0);
});
test('Duplicate exact images across different apartments are rejected',()=>{
 const a={...clone(unit),photos:[{scope:'unit',unit:'A1',url:'https://example.org/a.jpg'}]},b={...clone(a),unit:'B2'};b.photos[0].unit='B2';
 assert.throws(()=>C.units({...row,'Units JSON':JSON.stringify([a,b])},C.settings(setting)),/different apartments/);
});
test('Missing IDs fail instead of being regenerated from a name',()=>{const x=clone(snap);delete x.sheets['KCMO Candidates'][0]['Property ID'];assert.throws(()=>C.build(x),/Property ID missing/);});
test('Duplicate stable IDs fail instead of silently merging',()=>{const x=clone(snap);x.sheets['KCMO Candidates'].push(clone(row));assert.throws(()=>C.build(x),/Duplicate property ID/);});
test('Reordered headers produce the same property facts',()=>{
 const x=clone(snap),r=x.sheets['KCMO Candidates'][0];x.sheets['KCMO Candidates'][0]=Object.fromEntries(Object.entries(r).reverse());
 assert.deepEqual(C.build(x).payload.properties,C.build(snap).payload.properties);
});
test('Private notes, archives and personal eligibility never enter public output',()=>{
 const x=clone(snap);Object.assign(x.sheets['KCMO Candidates'][0],{Notes:'PRIVATE_SENTINEL','Sources / Checked':'PRIVATE_SENTINEL','Min-Income Rule':'PRIVATE_SENTINEL'});
 assert(!JSON.stringify(C.build(x).payload).includes('PRIVATE_SENTINEL'));
});
test('Invalid JSON fails instead of dropping individual units',()=>{assert.throws(()=>C.units({...row,'Units JSON':'broken'},C.settings(setting)),/invalid JSON/);});
test('Address edits invalidate saved locations',()=>{
 const d={'Location input':C.addressKey(row),'Location status':'Saved address-matched',Latitude:39.1,Longitude:-94.58,'Coordinate source':'Saved source'};
 assert(C.location(row,d));assert.equal(C.location({...row,Address:'101 Sample St'},d),null);
});
test('Map camera URLs are never a source of coordinates',()=>{
 const x=clone(snap);x.sheets['KCMO Candidates'][0]['Street View']='https://www.google.com/maps/@39.1,-94.58,18z';
 assert.equal(C.build(x).payload.properties[0].coordinates,null);
});
const census={result:{addressMatches:[{matchedAddress:'100 SAMPLE ST, KANSAS CITY, MO, 64108',addressComponents:{city:'KANSAS CITY',state:'MO',zip:'64108'},coordinates:{y:39.1,x:-94.58}}]}};
test('Census exact-address interpolation is qualified, not called a rooftop pin',()=>{
 const r=C.validateCensus(row,census);assert(r.status.startsWith('Validated address interpolation'));assert.deepEqual(r.coordinates,[39.1,-94.58]);
 assert(!C.validateCensus({...row,Zip:'64109'},census).coordinates);
 const x=clone(census);x.result.addressMatches.push(clone(x.result.addressMatches[0]));assert(!C.validateCensus(row,x).coordinates);
});
const loc={coordinates:[39.1,-94.58],input:C.addressKey(row),source:'Saved source',sourceUrl:'https://example.org/pin',checked:'2026-09-17'};
const dest={id:'test-place',name:'Test venue',address:'200 Sample St',coordinates:[39.101,-94.58],locationInput:'destination-key'};
const config=C.settings(setting),origin={coordinates:loc.coordinates,scope:'Address location',source:loc.sourceUrl,checked:loc.checked};
const route={'Property ID':'stable-one','Destination ID':dest.id,'Origin address':row.Address,'Destination address':dest.address,
 'Provider seconds':125,'Endpoint offset metres':20,Method:'OSRM/FOSSGIS walking','Source URL':'https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=39.1,-94.58;39.101,-94.58',
 Checked:'2026-09-17',Geometry:JSON.stringify({type:'LineString',coordinates:[[-94.58,39.1],[-94.58,39.101]]}),Metres:150};
test('Walking minutes use provider duration, not straight entrance offsets',()=>{const r=C.route(route,'stable-one',row,loc,dest,config);assert.equal(r.minutes,3);assert.equal(r.providerSeconds,125);assert(r.method.includes('excluded'));});
test('Cache fingerprints, destination edits and car profiles invalidate a route',()=>{
 const r={...route,'Cache key':C.routeKey('stable-one',loc,dest,origin,config),'Route origin JSON':JSON.stringify(origin)};
 assert(C.route(r,'stable-one',row,loc,dest,config));
 assert.equal(C.route(r,'stable-one',row,loc,{...dest,address:'201 Sample St'},config),null);
 assert.equal(C.route({...route,'Source URL':route['Source URL'].replace('osrm_foot','osrm_car')},'stable-one',row,loc,dest,config),null);
});
test('Unknown endpoint gaps and remote entrance points remain unresolved',()=>{
 assert.equal(C.route({...route,'Endpoint offset metres':null},'stable-one',row,loc,dest,config),null);
 assert.equal(C.routeOrigin({'Route origin JSON':JSON.stringify({...origin,coordinates:[38,-93]})},loc),null);
});
test('Scene membership comes from the named Sheet cluster by addressed Place ID match',()=>{
 const x=clone(snap);
 x.sheets['Scene & Anchors'].push({'Place ID':'green-lady-lounge',Name:'Old display name ignored',Address:'wrong scene address','Walking cluster':C.CLUSTER});
 x.sheets['Map Places'].push({'Place ID':'green-lady-lounge',Name:'Green Lady Lounge',Address:'1809 Grand Blvd','City/State':'Kansas City, MO',Zip:'64108'});
 const built=C.build(x);
 assert.deepEqual(built.report.clusterIds,['test-place','green-lady-lounge']);
 assert.equal(built.payload.places.find(p=>p.id==='green-lady-lounge').name,'Green Lady Lounge');
 assert.equal(built.payload.places.find(p=>p.id==='green-lady-lounge').address,'1809 Grand Blvd');
});
test('Unmatched or unaddressed cluster rows remain unresolved instead of becoming guessed venues',()=>{
 const x=clone(snap);
 x.sheets['Scene & Anchors'].push({'Place ID':'missing-place',Name:'Guess me',Address:'999 Guess St','Walking cluster':C.CLUSTER});
 x.sheets['Scene & Anchors'].push({'Place ID':'unaddressed-place',Name:'No address',Address:'123 Scene St','Walking cluster':C.CLUSTER});
 x.sheets['Map Places'].push({'Place ID':'unaddressed-place',Name:'No address',Address:'','City/State':'Kansas City, MO'});
 const built=C.build(x);
 assert.deepEqual(built.report.clusterIds,['test-place']);
 assert.deepEqual(built.report.unresolvedClusterPlaces.map(v=>v.id),['missing-place','unaddressed-place']);
 assert.equal(built.payload.places.some(p=>p.id==='missing-place'),false);
});
test('Unsafe media URLs are rejected',()=>{assert.equal(C.url('javascript:alert(1)'),null);assert.equal(C.url('https://user:pass@example.org/a'),null);});
test('Two buildings with the same name remain separate by stable ID',()=>{
 const x=clone(snap);x.sheets['KCMO Candidates'].push({...clone(row),'Property ID':'stable-two',Address:'101 Sample St'});
 assert.equal(C.build(x).payload.properties.length,2);assert.equal(C.build(x).payload.properties[1].id,'stable-two');
});

test('Duplicate Place IDs fail instead of silently merging destinations',()=>{
 const x=clone(snap);x.sheets['Map Places'].push(clone(x.sheets['Map Places'][0]));assert.throws(()=>C.build(x),/Duplicate place ID/);
});
test('Orphan Map Details IDs are reported without name fallback',()=>{
 const x=clone(snap);x.sheets['Map Details'].push({'Property ID':'orphan-support',Property:'Sample building'});
 const built=C.build(x);assert.deepEqual(built.report.orphanDetails,['orphan-support']);
});
test('List-only candidates remain exported and are classified explicitly',()=>{
 const built=C.build(clone(snap));assert.equal(built.payload.properties.length,1);assert.equal(built.payload.properties[0].coordinates,null);
 assert.equal(built.report.mappedPins,0);assert.equal(built.report.listOnly,1);assert.deepEqual(built.report.listOnlyIds,['stable-one']);
});
test('Finance-style exact #604 interior is reassigned to its structured apartment and withheld from building media',()=>{
 const x=clone(snap),r=x.sheets['KCMO Candidates'][0],photoUrl='https://example.org/finance-604.jpg';
 r['Property ID']='finance-building-lofts';r.Property='FINANCE BUILDING LOFTS';
 r['Units JSON']=JSON.stringify([{...clone(unit),unit:'0604 / physical 604',photos:[]},{...clone(unit),unit:'0302 / physical 302',rent:800,photos:[]}]);
 r['Media JSON']=JSON.stringify([{url:photoUrl,scope:'building',caption:'Exact #0604/#604 interior from its official apartment gallery.',source:'https://example.org/unit604'}]);
 r['Building Photos']=photoUrl+' | Exact #0604/#604 interior from its official apartment gallery. | https://example.org/unit604 | 2026-09-17';
 x.sheets['Map Details']=[];
 const built=C.build(x),p=built.payload.properties[0],u604=p.units.find(u=>u.unit.includes('0604'));
 assert(u604.photos.some(ph=>ph.url===photoUrl));assert(!p.media.some(ph=>ph.url===photoUrl));assert.equal(p.photo,null);
 assert(built.report.mediaScopeRepairs.some(v=>v.propertyId==='finance-building-lofts'&&v.unit==='0604 / physical 604'));
});
test('Exact apartment image isolation survives a multi-unit building',()=>{
 const x=clone(snap),r=x.sheets['KCMO Candidates'][0],photoUrl='https://example.org/a1-exact.jpg';
 r['Units JSON']=JSON.stringify([{...clone(unit),photos:[]},{...clone(unit),unit:'B2',rent:1200,photos:[]}]);
 r['Media JSON']=JSON.stringify([{url:photoUrl,scope:'building',caption:'Exact #A1 apartment interior.',source:'https://example.org/a1'}]);
 const p=C.build(x).payload.properties[0];assert.equal(p.units[0].photos[0].url,photoUrl);assert.equal(p.units[1].photos.length,0);assert(!p.media.some(ph=>ph.url===photoUrl));
});
function clusterSnapshot(){
 const x=clone(snap),r=x.sheets['KCMO Candidates'][0];
 const pLoc={Latitude:39.1,Longitude:-94.58,'Location input':C.addressKey(r),'Location status':'Saved address-matched','Coordinate source':'Saved source','Coordinate source URL':'https://example.org/property-pin','Coordinate checked':'2026-09-17'};
 x.sheets['Map Details']=[{'Property ID':'stable-one',...pLoc}];
 const defs=[['recordbar','recordBar','1520 Grand Blvd',39.0950,-94.5815],['green-lady-lounge','Green Lady Lounge','1809 Grand Blvd',39.0914,-94.5815],['mod','MOD','1809 McGee St',39.0913,-94.5798],['in-good-co','In Good Co','1518 McGee St',39.0951,-94.5803],['third-place-lounge','Third Place Lounge','1744 Broadway Blvd',39.0912,-94.5890]];
 x.sheets['Map Places']=defs.map(([id,name,address,lat,lon])=>{const pr={'Place ID':id,Name:name,Address:address,'City/State':'Kansas City, MO',Zip:'64108',Latitude:lat,Longitude:lon,'Location status':'Saved address-matched','Coordinate source':'Saved place source','Coordinate source URL':'https://example.org/'+id,'Coordinate checked':'2026-09-17'};pr['Location input']=C.addressKey(pr);return pr;});
 x.sheets['Scene & Anchors']=defs.slice(0,4).map(([id,name,address])=>({'Place ID':id,Name:name,Address:address,'Walking cluster':C.CLUSTER}));
 const routeFor=id=>{const d=x.sheets['Map Places'].find(p=>p['Place ID']===id),origin=[39.1,-94.58],dest=[d.Latitude,d.Longitude];return {'Property ID':'stable-one','Destination ID':id,'Origin address':r.Address,'Destination address':d.Address,'Provider seconds':300,'Endpoint offset metres':5,Method:'OSRM/FOSSGIS walking','Source URL':`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${origin.join(',')};${dest.join(',')}`,Checked:'2026-09-17',Geometry:JSON.stringify({type:'LineString',coordinates:[[origin[1],origin[0]],[dest[1],dest[0]]]}),Metres:400};};
 x.sheets['Map Routes']=['recordbar','mod','in-good-co','third-place-lounge'].map(routeFor);return x;
}
test('Historical Third Place route is preserved but excluded from current priority coverage',()=>{
 const built=C.build(clusterSnapshot()),p=built.payload.properties[0];assert(p.walks.some(w=>w.destinationId==='third-place-lounge'));
 assert.deepEqual(p.cluster.ids,['recordbar','green-lady-lounge','mod','in-good-co']);assert.equal(p.cluster.coverage,3);assert.equal(p.cluster.complete,false);
 assert.equal(built.report.priorityRouteCoverage.historicalThirdPlaceRoutes,1);
});
test('Missing Green Lady remains incomplete and Third Place never substitutes for it',()=>{
 const built=C.build(clusterSnapshot());assert.equal(built.report.priorityRouteCoverage.complete,0);assert.equal(built.report.priorityRouteCoverage.incomplete,1);
 assert.equal(built.report.priorityRouteCoverage.missingGreenLadyRoutes,1);assert.equal(built.payload.properties[0].access.crossroads,'3/4 destinations routed');
});
test('Property-ID-only live draft route rows are preserved but never count as routes',()=>{
 const x=clusterSnapshot();x.sheets['Map Routes'].push({'Property ID':'stable-one'});
 const built=C.build(x);assert.equal(built.report.draftRouteRows,1);assert.equal(built.report.retainedRoutes,4);
 assert.equal(built.report.priorityRouteCoverage.missingGreenLadyRoutes,1);
});
test('A route row with evidence but a missing destination still fails',()=>{
 const x=clone(snap);x.sheets['Map Routes'].push({'Property ID':'stable-one',Minutes:10});
 assert.throws(()=>C.build(x),/missing Property ID or Destination ID/);
});
test('Outscraper measure-only and transit records remain separate support, not drawable walks',()=>{
 const x=clusterSnapshot(),base={'Property ID':'stable-one','Destination ID':'green-lady-lounge','Origin address':'100 Sample St','Destination address':'1809 Grand Blvd',Provider:'Outscraper',Minutes:12,Metres:900,'Route status':'Walking measures saved; geometry unresolved'};
 x.sheets['Map Routes'].push({...base,'Route mode':'walk'},{...base,'Route mode':'transit',Minutes:10});
 const built=C.build(x);assert.equal(built.report.providerSupportRoutes,2);assert.equal(built.report.discardedOrStaleRoutes,0);
 assert.equal(built.report.priorityRouteCoverage.missingGreenLadyRoutes,1);assert(!built.payload.properties[0].walks.some(w=>w.destinationId==='green-lady-lounge'));
});
test('A genuine Outscraper path is drawable only with matching address keys and endpoints',()=>{
 const x=clusterSnapshot(),candidate=x.sheets['KCMO Candidates'][0],destination=C.build(x).payload.places.find(p=>p.id==='green-lady-lounge');
 const geometry={type:'LineString',coordinates:[[-94.58,39.1],[destination.coordinates[1],destination.coordinates[0]]]};
 const route={'Property ID':candidate['Property ID'],'Destination ID':destination.id,'Origin address':candidate.Address,'Destination address':destination.address,
  Provider:'Outscraper','Route mode':'walk','Route status':'Current walking route','Geometry status':'Verified provider path',
  'Origin input':O.addressKey(candidate),'Destination input':O.addressKey(destination),'Cache key':O.routeKey(candidate,destination,'walk'),
  'Provider origin coordinates':JSON.stringify([39.1,-94.58]),'Provider destination coordinates':JSON.stringify(destination.coordinates),
  Minutes:12,Metres:900,Checked:'2026-09-17','Source URL':'https://api.outscraper.cloud/google-maps-directions?origin=100%20Sample%20St',Geometry:JSON.stringify(geometry)};
 x.sheets['Map Routes'].push(route);
 const built=C.build(x);assert.equal(built.report.priorityRouteCoverage.complete,1);assert.equal(built.report.providerSupportRoutes,0);
 assert(built.payload.properties[0].walks.some(w=>w.destinationId==='green-lady-lounge'&&w.geometry.type==='LineString'));
 const bad={...route,Geometry:JSON.stringify({...geometry,coordinates:[[-94.1,39.1],geometry.coordinates[1]]})};
 const loc={coordinates:[39.1,-94.58],input:C.addressKey(candidate)};
 assert.equal(C.route(bad,candidate['Property ID'],candidate,loc,destination,C.settings(setting)),null);
 assert.equal(C.route({...route,'Cache key':'stale'},candidate['Property ID'],candidate,loc,destination,C.settings(setting)),null);
});

console.log(JSON.stringify({passed,networkCalls:0,scope:'Pure contract tests; no Google authorization or live provider test'}));
