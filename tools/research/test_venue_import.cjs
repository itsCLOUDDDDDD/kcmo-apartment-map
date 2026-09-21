const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const folder=process.argv[2];if(!folder)throw Error('Pass private prepared venue directory.');
const clone=x=>JSON.parse(JSON.stringify(x)),input=JSON.parse(fs.readFileSync(folder+'/venue-import-input.json')),before=JSON.parse(fs.readFileSync(folder+'/master-before.json'));
const ctx={module:{exports:{}},console:{log(){}},Utilities:{base64Encode:x=>Buffer.from(x).toString('base64'),computeDigest:(_,s)=>crypto.createHash('sha256').update(s).digest(),DigestAlgorithm:{SHA_256:'SHA256'}},LockService:{getDocumentLock:()=>({tryLock:()=>true,releaseLock(){}})},SpreadsheetApp:{flush(){}},UrlFetchApp:{fetch(){throw Error('Network forbidden');}},ScriptApp:new Proxy({},{get(){throw Error('Triggers forbidden');}})};
vm.runInNewContext(fs.readFileSync('apps-script/VenueCatalogImport.gs','utf8'),ctx);const I=ctx.module.exports;
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
function bookFrom(snapshot){
 const tables={};let backups=0,writes=0;
 for(const [name,rows]of Object.entries(snapshot.sheets)){
  const headers=[...new Set(rows.flatMap(r=>Object.keys(r).filter(k=>k!=='_row')))];
  const matrix=Array.from({length:Math.max(1,...rows.map(r=>r._row||0))},()=>Array(headers.length).fill(''));matrix[0]=headers;
  for(const r of rows)matrix[(r._row||matrix.length+1)-1]=headers.map(h=>r[h]??'');
  const sheet={getDataRange:()=>({getValues:()=>clone(matrix),getFormulas:()=>matrix.map(r=>r.map(()=>''))}),getLastRow:()=>matrix.length,getMaxRows:()=>10000,getMaxColumns:()=>1000,
   getRange:(row,col,height=1,width=1)=>({setValue:v=>{writes++;while(matrix.length<row)matrix.push([]);matrix[row-1][col-1]=v;},setValues:values=>{assert.equal(values.length,height);for(let i=0;i<height;i++){assert.equal(values[i].length,width);while(matrix.length<row+i)matrix.push([]);for(let j=0;j<width;j++)matrix[row+i-1][col+j-1]=values[i][j];}writes++;}})};
  tables[name]={sheet,matrix};
 }
 return {tables,getId:()=>input.masterId,getName:()=> 'Test master',getSheetByName:n=>tables[n]?.sheet,copy(){backups++;return {getUrl:()=> 'backup://test'};},get backups(){return backups;},get writes(){return writes;}};
}
const p=I.plan(before,input);
test('all 36 rows accounted for',()=>{assert.deepEqual(clone(p.counts),{added:31,alreadyAdded:0,matched:1,pending:4});assert.equal(p.results.length,36);});
test('Messenger reuses exact ID, with conflicting coordinates retained as evidence',()=>{const r=p.results.find(r=>r.inputRow===11);assert.equal(r.placeId,'messenger-coffee-ibis');assert.equal(r.coordinateConflict,true);assert.deepEqual(Object.keys(p.updates[0].values).sort(),['Venue import evidence','Venue review status']);});
test('gas shared-address cases stay as four pending evidence rows without new IDs',()=>{const pending=p.additions['Scene & Anchors'].filter(r=>r.Type==='Venue pending review');assert.equal(pending.length,4);assert.ok(pending.every(r=>!r['Place ID']));for(const n of [16,17,20,22])assert.ok(pending.some(r=>r.Note.includes('"inputRow":'+n)));});
test('Hy-Vee Arena and KC Crew get separate persistent IDs and supplied points',()=>{const rows=p.results.filter(r=>[29,32].includes(r.inputRow));assert.equal(rows.length,2);assert.notEqual(rows[0].placeId,rows[1].placeId);});
test('exact categories, coordinates, provenance; no invented dates or IDs',()=>{for(const row of p.additions['Map Places']){const original=input.rows.find(r=>r.newId===row['Place ID']);assert.equal(row.Name,original.name);assert.equal(row.Address,original.address);assert.equal(row.Category,original.category);assert.equal(row.Latitude,original.latitude);assert.equal(row.Longitude,original.longitude);assert.equal(row['Coordinate checked'],'');assert.equal(row['Source checked'],'');assert.equal(row['Coordinate source'],I.PROVENANCE);assert.equal(row['Google Place ID'],undefined);}});
test('routing cohort remains exactly original 27 and priority is untouched',()=>{assert.equal(p.cohortIds.length,27);assert.ok(p.additions['Scene & Anchors'].every(r=>!r['Walking cluster']));assert.equal(p.additions['Workflow Settings'].length,1);});
const book=bookFrom(before),protectedBefore=clone(Object.fromEntries(Object.entries(book.tables).filter(([n])=>!['Map Places','Scene & Anchors','Workflow Settings'].includes(n)).map(([n,t])=>[n,t.matrix])));
test('apply backs up, writes only venue metadata and cohort, and reads back',()=>{I.apply(book,input);assert.equal(book.backups,1);assert.ok(book.writes>0);assert.deepEqual(Object.fromEntries(Object.entries(book.tables).filter(([n])=>!['Map Places','Scene & Anchors','Workflow Settings'].includes(n)).map(([n,t])=>[n,t.matrix])),protectedBefore);});
test('second complete run is zero-write and creates no backup or duplicate',()=>{const writes=book.writes;I.apply(book,input);assert.equal(book.writes,writes);assert.equal(book.backups,1);assert.equal(I.plan(I.snapshot(book),input).writeCount,0);});
test('partial prior run recovers without duplicate venue rows',()=>{const b=bookFrom(before);const t=b.tables['Map Places'];const headers=t.matrix[0];for(const r of p.additions['Map Places'])t.matrix.push(headers.map(h=>r[h]??''));I.apply(b,input);assert.equal(I.snapshot(b).sheets['Map Places'].length,59);});
test('wrong master, duplicate identities/IDs, changed route cohort and changed priority fail',()=>{assert.throws(()=>I.apply({...book,getId:()=> 'wrong'},input),/Wrong Sheet/);const dup=clone(input);dup.rows[1]={...dup.rows[0],inputRow:2};assert.throws(()=>I.plan(before,dup),/Duplicate supplied/);const x=clone(before);x.sheets['Map Places'].push(clone(x.sheets['Map Places'][0]));assert.throws(()=>I.plan(x,input),/duplicate/);const y=clone(before);y.sheets['Map Routes']=y.sheets['Map Routes'].filter(r=>r['Destination ID']!=='recordbar');assert.throws(()=>I.plan(y,input),/2,808/);const z=clone(before);z.sheets['Scene & Anchors'].find(r=>r['Place ID']==='mod')['Walking cluster']='';assert.throws(()=>I.plan(z,input),/priority/);});
const after=clone(before);after.sheets={...after.sheets,...I.snapshot(book).sheets};fs.writeFileSync(folder+'/mock-master-after.json',JSON.stringify(after));
console.log(JSON.stringify({passed,added:31,matched:1,pending:4,secondRunWrites:0,networkCalls:0,triggers:0}));
