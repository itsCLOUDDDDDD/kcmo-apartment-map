import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]||process.cwd();
const {locationAccessHTML,walkingMinutes}=await import(pathToFileURL(root+'/walking-access.js'));
const ids=['recordbar','green-lady-lounge','mod','in-good-co'];
globalThis.window={KCMO_MAP_DATA:{meta:{clusterIds:ids},places:ids.map(id=>({id,category:'Core scene',address:'Saved address'}))}};
const {allFourAccess,allFourLabel}=await import(pathToFileURL(root+'/scene-presentation.js'));
const property={walks:ids.map((id,i)=>({destinationId:id,minutes:2+i/60,measurementValid:true,geometry:null})),
  nearestSavedVenue:{destinationId:'saved-other',destination:'A <venue>',minutes:61/60,metres:85,geometryAvailable:false},
  savedVenueCoverage:{count:27,total:27,complete:true},cluster:{coverage:4,total:4,complete:true,minMinutes:2,maxMinutes:2.05,closest:{destination:'recordBar'}}};
assert.equal(allFourAccess(property).known,4);assert.equal(allFourAccess(property).minutes,2.05);assert.match(allFourLabel(property),/Longest cluster walk: 2.1 min/);
const html=locationAccessHTML(property);assert.match(html,/27\/27/);assert.match(html,/4\/4/);assert.match(html,/A &lt;venue&gt;/);assert.match(html,/route lines are unavailable/);
assert.equal(walkingMinutes(61/60),'1');assert.equal(walkingMinutes(65/60),'1.1');
property.walks.pop();assert.equal(allFourAccess(property).minutes,null);
property.savedVenueCoverage.complete=false;property.savedVenueCoverage.count=26;
assert.match(locationAccessHTML(property),/incomplete coverage/);
assert.match(locationAccessHTML({}),/unresolved/);
console.log('PASS walking UI: measure-only all-four, precision, nearest/range/coverage, partial coverage, absent geometry, escaping');
