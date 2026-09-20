import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];

globalThis.window={KCMO_MAP_DATA:{
  meta:{clusterIds:['recordbar','green-lady-lounge','mod','in-good-co']},
  places:[
    {id:'recordbar',name:'recordBar',address:'1520 Grand Blvd',category:'Core scene'},
    {id:'green-lady-lounge',name:'Green Lady Lounge',address:'1809 Grand Blvd',category:'Core scene'},
    {id:'mod',name:'MOD',address:'1809 McGee St',neighborhood:'Crossroads',category:'Core scene'},
    {id:'in-good-co',name:'In Good Co',address:'1518 McGee St',category:'Core scene'},
    {id:'third-place-lounge',name:'Third Place Lounge',address:'1744 Broadway Blvd',category:'Scene'},
    {id:'bad-core',name:'Bad Core',address:'',category:'Core scene'},
  ]
}};

const {recordedUnits}=await import(pathToFileURL(root+'/presentation.js'));
const {paymentStandardBadge}=await import(pathToFileURL(root+'/payment-standard.js'));
const {propertyPhotos,preferredPhotoIndex}=await import(pathToFileURL(root+'/property-media.js'));
const {sceneData}=await import(pathToFileURL(root+'/scene-data.js'));
const {CORE_IDS,HISTORICAL_PRIORITY_IDS,priorityPlaceIds,eventStatus,venueContent}=await import(pathToFileURL(root+'/scene-presentation.js'));

const p={schemaVersion:3,checked:'2026-09-17',oneBedroom:{standard:1500},costs:{planningUtilities:90},media:[],
units:[{unit:'A',beds:1,rent:1000,sqft:700,checked:null,source:null,photos:[{scope:'unit',unit:'A',url:'https://example.org/a.jpg'}],costs:{planningUtilities:90,feeStatus:'Confirmed',requiredMonthlyFees:25,feeSource:'https://example.org/fees',feesChecked:'2026-09-17'}},
{unit:'B',beds:2,rent:1500,sqft:950,photos:[],costs:{planningUtilities:90,feeStatus:'Unknown',requiredMonthlyFees:null}}]};
assert.equal(recordedUnits(p)[0].checked,null);
assert.equal(paymentStandardBadge(p,p.units[0]).value,'74.3%');
assert.equal(paymentStandardBadge(p,p.units[1]).value,'Unverified');
assert.equal(preferredPhotoIndex(propertyPhotos(p),p.units[1]),-1);
assert.equal(preferredPhotoIndex(propertyPhotos(p),p.units[0]),0);

assert.deepEqual(CORE_IDS,['recordbar','green-lady-lounge','mod','in-good-co']);
assert.deepEqual(priorityPlaceIds(),CORE_IDS);
assert.deepEqual(priorityPlaceIds(null),[]);
assert(!CORE_IDS.includes('third-place-lounge'));
assert(!CORE_IDS.includes('bad-core'));
assert(HISTORICAL_PRIORITY_IDS.includes('third-place-lounge'));
assert.deepEqual(sceneData.prioritySet.unmatchedPlaceIds,[]);
assert.equal(Object.hasOwn(sceneData.prioritySet,'placeIds'),false);

const modIds=sceneData.events.filter(e=>e.venueId==='mod').map(e=>e.id).sort();
assert.deepEqual(modIds,['E02','E14','E15']);
const e14=sceneData.events.find(e=>e.id==='E14');
assert.equal(e14.name,'STIMULATE: This Is a Dance Party');
assert.match(e14.lineup,/Tromac/);assert.match(e14.lineup,/Rickyology/);assert.match(e14.lineup,/LOV3/);
assert.match(e14.music,/electronic dance party/i);
assert.equal(e14.image,'assets/scene/2026-09-12_mod_stimulate-this-is-a-dance-party_tromac-rickyology-just-des-daybrk-lov3.png');
assert.equal(e14.date,'2026-09-12');assert.equal(e14.dateConfidence,'explicit');assert(e14.uncertainty);
const e02=sceneData.events.find(e=>e.id==='E02');
assert.match(e02.lineup,/LOV3/);assert.match(e02.music,/Juke/);assert.equal(e02.dateConfidence,'inferred');
assert.equal(sceneData.events.length,19);
assert.equal(eventStatus(e14,'2026-09-18'),'Past event');

class FakeElement {
  constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.className='';this.attributes={};this.dataset={};}
  append(...nodes){this.children.push(...nodes);}
  setAttribute(k,v){this.attributes[k]=String(v);}
}
globalThis.document={createElement:tag=>new FakeElement(tag)};
const modPopup=venueContent(globalThis.window.KCMO_MAP_DATA.places.find(p=>p.id==='mod'),{});
const flatten=node=>[node.textContent,...node.children.flatMap(flatten)].filter(Boolean).join(' | ');
const popupText=flatten(modPopup);
assert.match(popupText,/Selected walking-cluster anchor/);
assert.match(popupText,/STIMULATE: This Is a Dance Party/);
assert.match(popupText,/Date: September 12, 2026/);
assert.match(popupText,/Lineup: Tromac/);
assert.match(popupText,/Music: STIMULATE electronic dance party/);
assert.match(popupText,/Uncertainty:/);
const imageSrcs=[];const collectImages=node=>{if(node.tag==='img')imageSrcs.push(node.src);for(const c of node.children)collectImages(c);};collectImages(modPopup);
assert(imageSrcs.includes('assets/scene/2026-09-12_mod_stimulate-this-is-a-dance-party_tromac-rickyology-just-des-daybrk-lov3.png'));
assert.equal(sceneData.events.filter(e=>['recordbar','green-lady-lounge','in-good-co'].includes(e.venueId)).length,0);
const thirdPopup=venueContent(globalThis.window.KCMO_MAP_DATA.places.find(p=>p.id==='third-place-lounge'),{});
assert.match(flatten(thirdPopup),/Historical priority venue · not a current walking-cluster anchor/);


const appSource=readFileSync(root+'/app.js','utf8'),indexSource=readFileSync(root+'/index.html','utf8');
assert.match(appSource,/data\.meta\?\.clusterIds/);
assert.doesNotMatch(indexSource,/<option value="third-place-lounge">/);
assert.doesNotMatch(indexSource,/Nearest of my four nightlife places/);
assert.match(indexSource,/Sheet-selected, confirmed-address venues drive the walking comparison by Place ID/);

console.log('PASS renderer: unit ownership/cost semantics plus Sheet-driven addressed scene anchors, flyer metadata, and historical priority preservation');
