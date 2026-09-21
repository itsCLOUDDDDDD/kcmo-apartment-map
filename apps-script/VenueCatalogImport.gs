/* Venue-only, repeatable import. No research refresh, geocoding, routing or triggers. */
const VenueCatalogImport = (() => {
 'use strict';
 const PRIORITY=['recordbar','green-lady-lounge','mod','in-good-co'];
 const PROVENANCE='User-supplied; not independently verified';
 const COHORT_SETTING='Saved walking cohort IDs';
 const text=v=>v==null?'':String(v).trim();
 const norm=v=>text(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const coords=v=>Array.isArray(v)&&v.length===2&&v.every(x=>typeof x==='number'&&Number.isFinite(x))&&Math.abs(v[0])<=90&&Math.abs(v[1])<=180;
 function check(ok,message){if(!ok)throw Error(message);}
 function address(value,city='',zip=''){
  const m=text(value).match(/^(.*),\s*([^,]+),\s*(MO|KS)\s+(\d{5})$/);
  return m?{street:m[1],city:m[2]+', '+m[3],zip:m[4]}:{street:text(value),city:text(city),zip:text(zip)};
 }
 const addressKey=r=>{const a=address(r.Address,r['City/State'],r.Zip);return norm(a.street)+'|'+norm(a.city);};
 const binding=r=>JSON.stringify(['address-v1',text(r.Address).toLowerCase().replace(/\s+/g,' '),text(r['City/State']).toLowerCase().replace(/\s+/g,' '),text(r.Zip)]);
 const rowData=r=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=='_row'));
 function plan(snapshot,input){
  check(input.version===1&&input.rows.length===36,'Expected the reviewed 36-row input.');
  const sh=snapshot.sheets,places=sh['Map Places'],scene=sh['Scene & Anchors'],settings=sh['Workflow Settings'],routes=sh['Map Routes'];
  check(places&&scene&&settings&&routes,'Required venue/settings/route tables missing.');
  const ids=new Map();for(const p of places){check(text(p['Place ID'])&&!ids.has(text(p['Place ID'])),'Missing/duplicate Map Places ID');ids.set(text(p['Place ID']),p);}
  const priority=scene.filter(r=>r['Walking cluster']==='Crossroads walk cluster').map(r=>r['Place ID']).sort();
  check(JSON.stringify(priority)===JSON.stringify([...PRIORITY].sort()),'Current four priority IDs changed; review required.');
  const google=routes.filter(r=>r.Provider==='Google'&&r['Route mode']==='walk');
  const cohort=[...new Set(google.map(r=>text(r['Destination ID'])))].sort();
  check(google.length===2808&&cohort.length===27&&cohort.every(id=>ids.has(id)),'Expected the unchanged 2,808 saved Google walks and 27-venue cohort.');
  const saved=settings.filter(r=>r.Setting===COHORT_SETTING);
  check(saved.length<=1,'Duplicate routing-cohort setting.');
  if(saved.length)check(JSON.stringify(JSON.parse(saved[0].Value).slice().sort())===JSON.stringify(cohort),'Recorded routing cohort differs; no expansion allowed.');
  const additions={'Map Places':[],'Scene & Anchors':[],'Workflow Settings':[]},updates=[],results=[],seen=new Set(),inputIdentities=new Set();
  function patch(sheet,row,values){const changes=Object.fromEntries(Object.entries(values).filter(([k,v])=>text(row[k])!==text(v)));if(Object.keys(changes).length)updates.push({sheet,row:row._row,expected:rowData(row),values:changes});}
  function addScene(row,placeId,pending=false){
   const token='Venue import '+input.batch+' / row '+row.inputRow;
   const existing=scene.find(r=>text(r.Note).includes(token));
   if(existing)return;
   if(placeId&&scene.some(r=>r['Place ID']===placeId))return;
   additions['Scene & Anchors'].push({Type:pending?'Venue pending review':'Venue',Name:row.name,Address:row.address,Note:token+' · '+PROVENANCE+' · '+JSON.stringify(row),'Place ID':placeId||'','Walking cluster':''});
  }
  for(const row of input.rows){
   check(!seen.has(row.inputRow),'Duplicate input row');seen.add(row.inputRow);
   const identity=norm(row.name)+'|'+addressKey({Address:row.address});check(!inputIdentities.has(identity),'Duplicate supplied name + address');inputIdentities.add(identity);
   check(text(row.name)&&text(row.address)&&text(row.category)&&coords([row.latitude,row.longitude]),'Invalid supplied venue row '+row.inputRow);
   if(row.holdReason){addScene(row,null,true);results.push({inputRow:row.inputRow,name:row.name,status:'pending-review',reason:row.holdReason});continue;}
   const a=address(row.address),candidate={Address:a.street,'City/State':a.city,Zip:a.zip};
   const allowedNames=[norm(row.name),...(row.reviewedAliases||[]).map(norm)];
   const matches=places.filter(p=>allowedNames.includes(norm(p.Name))&&addressKey(p)===addressKey(candidate));
   check(matches.length<=1,'Multiple name + address matches: '+row.name);
   const existing=matches[0];
   const evidence=JSON.stringify({batch:input.batch,inputRow:row.inputRow,name:row.name,address:row.address,latitude:row.latitude,longitude:row.longitude,category:row.category,provenance:PROVENANCE,review:row.review||null});
   if(existing){
    const id=existing['Place ID'],conflict=coords([existing.Latitude,existing.Longitude])&&[existing.Latitude,existing.Longitude].some((v,i)=>Math.abs(v-[row.latitude,row.longitude][i])>0.0000001);
    patch('Map Places',existing,{'Venue import evidence':evidence,'Venue review status':conflict?'Supplied coordinates conflict; existing coordinates retained':PROVENANCE});
    addScene(row,id);results.push({inputRow:row.inputRow,name:row.name,status:id===row.newId?'already-added':'matched-existing',placeId:id,coordinateConflict:conflict});continue;
   }
   check(text(row.newId)&&!ids.has(row.newId),'Missing/colliding prepared stable ID: '+row.name);
   const p={Name:row.name,'Place ID':row.newId,Address:row.address,Category:row.category,Note:PROVENANCE,
    Latitude:row.latitude,Longitude:row.longitude,'Coordinate source':PROVENANCE,'Coordinate checked':'','Source checked':'',
    'City/State':a.city,Zip:a.zip,'Location status':PROVENANCE,'Venue import evidence':evidence,'Venue review status':PROVENANCE};
   p['Location input']=binding(p);ids.set(row.newId,p);additions['Map Places'].push(p);addScene(row,row.newId);
   results.push({inputRow:row.inputRow,name:row.name,status:'added',placeId:row.newId});
  }
  if(!saved.length)additions['Workflow Settings'].push({Setting:COHORT_SETTING,Value:JSON.stringify(cohort),'Units / type':'JSON Place IDs','Basis / instructions':'Original 27 saved walking destinations. Expanded browsing venues do not expand this cohort or trigger routing.'});
  return {version:1,batch:input.batch,cohortIds:cohort,results,updates,additions,writeCount:updates.reduce((n,r)=>n+Object.keys(r.values).length,0)+Object.values(additions).reduce((n,rs)=>n+rs.length,0),counts:{added:results.filter(r=>r.status==='added').length,alreadyAdded:results.filter(r=>r.status==='already-added').length,matched:results.filter(r=>r.status==='matched-existing').length,pending:results.filter(r=>r.status==='pending-review').length}};
 }
 function read(book,name){
  const s=book.getSheetByName(name);check(s,'Missing sheet '+name);const values=s.getDataRange().getValues(),headers=values[0].map(text);
  check(headers.filter(Boolean).length===new Set(headers.filter(Boolean)).size,'Duplicate headers in '+name);
  const required={'Map Places':['Name','Place ID','Address','Category','Latitude','Longitude','Coordinate source','Location input','Location status'],'Scene & Anchors':['Type','Name','Address','Note','Place ID','Walking cluster'],'Workflow Settings':['Setting','Value','Units / type','Basis / instructions'],'Map Routes':['Property ID','Destination ID','Provider','Route mode']};
  check((required[name]||[]).every(h=>headers.includes(h)),'Required headers missing in '+name);
  return {sheet:s,headers,rows:values.slice(1).map((r,i)=>({...Object.fromEntries(headers.map((h,j)=>[h,r[j]]).filter(([h])=>h)),_row:i+2})).filter(r=>Object.entries(r).some(([k,v])=>k!=='_row'&&text(v)))};
 }
 function snapshot(book){return {sheets:Object.fromEntries(['Map Places','Scene & Anchors','Workflow Settings','Map Routes'].map(n=>[n,read(book,n).rows]))};}
 function fingerprint(book){
  const value=['KCMO Candidates','Map Details','Map Routes','Links','Payment Standards 2026'].map(n=>{const s=book.getSheetByName(n);if(!s)return [n,null];const r=s.getDataRange();return [n,r.getValues(),r.getFormulas()];});
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(value)));
 }
 function apply(book,input){
  check(book&&book.getId()===input.masterId,'Wrong Sheet: the current master must be active.');
  const lock=LockService.getDocumentLock()||LockService.getScriptLock();check(lock.tryLock(20000),'Another update is running.');
  try{
   const before=snapshot(book),p=plan(before,input);if(!p.writeCount){console.log(JSON.stringify({status:'no-op',...p.counts,writes:0}));return p;}
   const protectedBefore=fingerprint(book),backup=book.copy(book.getName()+' — before venue import '+input.batch+' — '+new Date().toISOString());
   check(JSON.stringify(snapshot(book))===JSON.stringify(before),'Sheet changed during backup; no import writes made.');
   for(const name of ['Map Places','Scene & Anchors','Workflow Settings']){
    const table=read(book,name),add=p.additions[name],patches=p.updates.filter(r=>r.sheet===name);
    const needed=[...new Set([...add.flatMap(r=>Object.keys(r)),...patches.flatMap(r=>Object.keys(r.values))])].filter(h=>!table.headers.includes(h));
    if(needed.length){const end=table.headers.length+needed.length;if(end>table.sheet.getMaxColumns())table.sheet.insertColumnsAfter(table.sheet.getMaxColumns(),end-table.sheet.getMaxColumns());table.sheet.getRange(1,table.headers.length+1,1,needed.length).setValues([needed]);table.headers.push(...needed);}
    for(const patch of patches)for(const [field,value] of Object.entries(patch.values))table.sheet.getRange(patch.row,table.headers.indexOf(field)+1).setValue(value);
    if(add.length){const first=table.sheet.getLastRow()+1,end=first+add.length-1;if(end>table.sheet.getMaxRows())table.sheet.insertRowsAfter(table.sheet.getMaxRows(),end-table.sheet.getMaxRows());table.sheet.getRange(first,1,add.length,table.headers.length).setValues(add.map(r=>table.headers.map(h=>r[h]??'')));}
   }
   SpreadsheetApp.flush();check(fingerprint(book)===protectedBefore,'Protected data changed; stop and use the backup '+backup.getUrl());
   const again=plan(snapshot(book),input);check(again.writeCount===0,'Read-back did not produce a no-op; review backup '+backup.getUrl());
   console.log(JSON.stringify({status:'updated',...p.counts,readBack:'passed',secondRunWrites:again.writeCount,backup:backup.getUrl()}));return p;
  }finally{lock.releaseLock();}
 }
 return {plan,apply,snapshot,PROVENANCE,COHORT_SETTING};
})();
function previewSuppliedVenues(){const p=VenueCatalogImport.plan(VenueCatalogImport.snapshot(SpreadsheetApp.getActiveSpreadsheet()),VENUE_IMPORT_INPUT);console.log(JSON.stringify({counts:p.counts,writeCount:p.writeCount,results:p.results}));return p;}
function importSuppliedVenues(){return VenueCatalogImport.apply(SpreadsheetApp.getActiveSpreadsheet(),VENUE_IMPORT_INPUT);}
if(typeof module!=='undefined')module.exports=VenueCatalogImport;
