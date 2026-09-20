#!/usr/bin/env python3
"""Build a local preview only. Never commits, pushes, publishes, or changes the live Sheet."""
from __future__ import annotations
import argparse,hashlib,json,re,shutil,subprocess,sys
from pathlib import Path
from read_xlsx import read_workbook

PUBLIC_ROOT={".nojekyll","index.html","app.js","styles.css","presentation.js","payment-standard.js",
 "property-media.js","priority-amenities.js","scene-presentation.js","scene-data.js","community-reviews.js",
 "map-bridge.js","map-config.js","kc-zctas.geojson","kc-zctas.metadata.json","README.md",
 "walking-access.js","candidate-summary.js","shortlist.js"}

def strict_json(text):
    return json.loads(text,parse_constant=lambda s:(_ for _ in ()).throw(ValueError("Invalid JSON number "+s)))

def read_site_data(path):
    text=path.read_text(encoding="utf-8")
    return strict_json(re.sub(r";\s*$","",re.sub(r"^\s*window\.KCMO_MAP_DATA\s*=\s*","",text)))

def atomic(path:Path,text:str):
    path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_suffix(path.suffix+".tmp");temp.write_text(text,encoding="utf-8");temp.replace(path)

def _identity(p):
    clean=lambda v:re.sub(r"\s+"," ",str(v or "").strip().lower())
    return (clean(p.get("name")),clean(p.get("address")),clean(p.get("zip")))

def _unique_by_identity(records,label):
    out={}
    for p in records:
        key=_identity(p)
        if key in out:
            raise ValueError(f"{label} contains duplicate property identity {key}; stable-ID reconciliation is ambiguous.")
        out[key]=p
    return out

def validate_public(p):
    if p.get("meta",{}).get("schemaVersion")!=3:raise ValueError("Expected a schema-3 snapshot exported by the Research menu.")
    forbidden={"Notes","Private notes","privateNotes","Units JSON","Media JSON","Prior cost inputs — archive","Original sheet","sheets"}
    def scan(obj):
        if isinstance(obj,dict):
            if forbidden & obj.keys():raise ValueError("A private/source field was found in the snapshot.")
            for v in obj.values():scan(v)
        elif isinstance(obj,list):
            for v in obj:scan(v)
    scan(p)
    ids=set();place_ids=set();violations=[]
    for place in p.get("places",[]):
        pid=place.get("id")
        if not pid or pid in place_ids:raise ValueError("Missing or duplicate Place ID in public snapshot.")
        place_ids.add(pid)
    for prop in p.get("properties",[]):
        if not prop.get("id") or prop["id"] in ids:raise ValueError("Missing or duplicate property ID.")
        ids.add(prop["id"]);units=set();owners={}
        for unit in prop.get("units",[]):
            if not unit.get("unit") or unit["unit"] in units:raise ValueError("Missing/duplicate apartment identifier.")
            units.add(unit["unit"])
            c=unit.get("costs",{})
            if c.get("requiredMonthlyFees") is not None and (c.get("feeStatus")!="Confirmed" or not c.get("feeSource") or not c.get("feesChecked")):raise ValueError("An apartment fee lacks confirmation/source/date.")
            if c.get("utilityAllowance") is not None and (c.get("allowanceStatus")!="Confirmed" or not c.get("allowanceSource") or not c.get("allowanceChecked")):raise ValueError("An official allowance lacks its own confirmation/source/date.")
            for ph in unit.get("photos",[]):
                if ph.get("unit")!=unit["unit"] or ph.get("scope")!="unit":raise ValueError("Photo ownership mismatch.")
                if ph["url"] in owners and owners[ph["url"]]!=unit["unit"]:raise ValueError("Exact image shared between different apartments.")
                owners[ph["url"]]=unit["unit"]
        for ph in prop.get("media",[]):
            if ph.get("unit") or ph.get("scope")=="unit":raise ValueError("Unit image found in the building gallery.")
            if ph.get("url") in owners:
                violations.append({"propertyId":prop["id"],"url":ph.get("url"),"unit":owners[ph.get("url")],"reason":"Exact-unit image also exported as generic media"})
            if re.match(r"^exact\b",str(ph.get("caption") or ""),re.I) and re.search(r"#[A-Za-z0-9-]+",str(ph.get("caption") or "")):
                violations.append({"propertyId":prop["id"],"url":ph.get("url"),"reason":"Explicit exact-unit caption exported as generic media"})
    if violations:raise ValueError("Exact-unit photo ownership error: "+json.dumps(violations[:3],ensure_ascii=False))
    return p

def reconcile(published,payload,report):
    old_records=published.get("properties",[]);new_records=payload.get("properties",[])
    old_ids={p["id"] for p in old_records};new_ids={p["id"] for p in new_records}
    prior=_unique_by_identity(old_records,"Published reference");fresh=_unique_by_identity(new_records,"Fresh export")
    migrations=[]
    for key,p in fresh.items():
        if key in prior and prior[key]["id"]!=p["id"]:
            migrations.append({"name":p.get("name"),"address":p.get("address"),"zip":p.get("zip"),"publishedId":prior[key]["id"],"stableId":p["id"]})
    added=[{"id":p["id"],"name":p.get("name"),"address":p.get("address"),"zip":p.get("zip"),"mapped":bool(p.get("coordinates"))} for k,p in fresh.items() if k not in prior]
    removed=[{"id":p["id"],"name":p.get("name"),"address":p.get("address"),"zip":p.get("zip")} for k,p in prior.items() if k not in fresh]
    expected=len(old_records)+len(added)-len(removed)
    if expected!=len(new_records):raise ValueError("Property-count reconciliation failed; identity comparison does not explain the new total.")
    report.update({
        "publishedReferenceProperties":len(old_records),"currentPublicProperties":len(new_records),
        "presentInBothStableIds":sorted(old_ids&new_ids),"currentOnlyIds":sorted(new_ids-old_ids),"publishedOnlyIds":sorted(old_ids-new_ids),
        "idMigrations":migrations,"newPropertyIdentities":added,"removedPropertyIdentities":removed,
        "expectedWebsiteCount":expected,
        "countReconciliation":{"published":len(old_records),"current":len(new_records),"trueAdded":len(added),"trueRemoved":len(removed),"stableIdMigrations":len(migrations),"expected":expected,
          "explanation":f"Current {len(new_records)} = published {len(old_records)} + {len(added)} true added identity - {len(removed)} true removed identities; {len(migrations)} shared identities changed from legacy website IDs to stable Sheet Property IDs."}
    })

def enrich_report(payload,report):
    props=payload.get("properties",[]);cluster=list(payload.get("meta",{}).get("clusterIds",[]))
    mapped=[p for p in props if p.get("coordinates")];list_only=[p for p in props if not p.get("coordinates")]
    report["publicCandidates"]=len(props);report["mappedPins"]=len(mapped);report["mappedIds"]=[p["id"] for p in mapped]
    report["listOnly"]=len(list_only);report["listOnlyIds"]=[p["id"] for p in list_only]
    report["priorityPlaceIds"]=cluster
    missing={pid:sum(not any(w.get("destinationId")==pid for w in p.get("walks",[])) for p in mapped) for pid in cluster}
    coverage={}
    for p in mapped:
        n=sum(any(w.get("destinationId")==pid for w in p.get("walks",[])) for pid in cluster);coverage[str(n)]=coverage.get(str(n),0)+1
    route={"mappedProperties":len(mapped),"complete":sum(all(any(w.get("destinationId")==pid for w in p.get("walks",[])) for pid in cluster) for p in mapped),
           "incomplete":sum(not all(any(w.get("destinationId")==pid for w in p.get("walks",[])) for pid in cluster) for p in mapped),
           "coverageDistribution":coverage,"missingByPlaceId":missing,"missingGreenLadyRoutes":missing.get("green-lady-lounge",0),
           "historicalThirdPlaceRoutes":sum(any(w.get("destinationId")=="third-place-lounge" for w in p.get("walks",[])) for p in props)}
    report["priorityRouteCoverage"]=route
    report["savedVenueCoverage"]={"complete":sum(p.get("savedVenueCoverage",{}).get("complete",False) for p in mapped),
        "distribution":{label:sum(f'{p.get("savedVenueCoverage",{}).get("count",0)}/{p.get("savedVenueCoverage",{}).get("total",0)}'==label for p in mapped)
          for label in {f'{p.get("savedVenueCoverage",{}).get("count",0)}/{p.get("savedVenueCoverage",{}).get("total",0)}' for p in mapped}}}
    report.setdefault("unitPhotoOwnershipViolations",[])
    report["unitPhotoOwnershipViolationCount"]=len(report["unitPhotoOwnershipViolations"])
    report["unresolvedRequiredFees"]={
        "properties":sum(p.get("costs",{}).get("requiredMonthlyFees") is None for p in props),
        "units":sum(u.get("costs",{}).get("requiredMonthlyFees") is None for p in props for u in p.get("units",[]))}
    report["excludedByReason"]={}
    for item in report.get("excluded",[]):report["excludedByReason"][item.get("reason","Unknown")]=report["excludedByReason"].get(item.get("reason","Unknown"),0)+1

def build(args):
    repo=Path(args.repo).expanduser().resolve()
    if not (repo/"app.js").is_file() or not (repo/"map-data.js").is_file():raise ValueError("--repo must be the inspected apartment website folder.")
    output=Path(args.output).expanduser().resolve() if args.output else repo/".local-preview"/"site"
    if output==repo or repo in output.parents and ".local-preview" not in output.relative_to(repo).parts:raise ValueError("Output must be outside public root or under .local-preview; publication is a separate reviewed action.")
    if output.exists() and not (output/".research-preview").exists():raise ValueError("Output directory exists without a preview marker. Choose a new preview directory.")
    published=read_site_data(repo/"map-data.js")
    source=Path(args.workbook or args.snapshot).expanduser()
    if args.workbook:
        snap=read_workbook(args.workbook);snap["geography"]=published.get("geography",{})
        cmd=["node",str(Path(__file__).with_name("build.cjs"))]+(["--all"] if args.all else [])
        proc=subprocess.run(cmd,input=json.dumps(snap),text=True,capture_output=True,check=False)
        if proc.returncode:raise ValueError(proc.stderr.strip() or "Export validator failed")
        result=strict_json(proc.stdout);payload=result["payload"];report=result["report"]
    else:
        payload=validate_public(strict_json(source.read_text(encoding="utf-8")))
        payload["geography"]=published.get("geography",{})
        report={"exportedProperties":len(payload.get("properties",[])),"snapshotInput":True,"excluded":[]}
    validate_public(payload);enrich_report(payload,report);reconcile(published,payload,report)
    report.update(unitRecords=sum(len(p.get("units",[])) for p in payload.get("properties",[])),validatedPins=report["mappedPins"],
                  inputSha256=hashlib.sha256(source.read_bytes()).hexdigest(),published=False,liveSheetEdited=False,freshNetworkCalls=False)
    if report.get("unitPhotoOwnershipViolationCount"):raise ValueError("Build stopped: exact-unit photo ownership violations remain.")
    # Keep geography from the already-public site; never copy workbook/evidence/input directories.
    output.mkdir(parents=True,exist_ok=True);(output/".research-preview").write_text("Local preview only\n")
    template=Path(args.site_template).expanduser().resolve() if args.site_template else repo
    for name in PUBLIC_ROOT:
        if (template/name).is_file():shutil.copy2(template/name,output/name)
    for name in ["assets","mapcn"]:
        if (template/name).is_dir():shutil.copytree(template/name,output/name,dirs_exist_ok=True)
    data="window.KCMO_MAP_DATA = "+json.dumps(payload,ensure_ascii=False,indent=2).replace("<","\\u003c")+";\n"
    atomic(output/"map-data.js",data)
    report["publicDataSha256"]=hashlib.sha256(data.encode()).hexdigest()
    atomic(output.parent/"validation-report.json",json.dumps(report,ensure_ascii=False,indent=2))
    index=(output/"index.html").read_text()
    banner='<div role="status" style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#17324d;color:white;padding:4px 10px;font:12px system-ui">LOCAL PREVIEW · $90 utility planning standard · Unknown fees remain unresolved · No publication</div>'
    index=index.replace("</body>",banner+"</body>");atomic(output/"index.html",index)
    print(json.dumps({"preview":str(output),"report":str(output.parent/"validation-report.json"),"properties":len(payload.get("properties",[])),
      "units":report["unitRecords"],"pins":report["mappedPins"],"listOnly":report["listOnly"],"held":report.get("heldRecords",len(report.get("excluded",[]))),
      "trueAdded":len(report["newPropertyIdentities"]),"trueRemoved":len(report["removedPropertyIdentities"]),"idMigrations":len(report["idMigrations"]),
      "priority4of4":report["priorityRouteCoverage"]["complete"],"missingGreenLady":report["priorityRouteCoverage"]["missingGreenLadyRoutes"]},indent=2))
    return report

def main():
    p=argparse.ArgumentParser(description=__doc__)
    i=p.add_mutually_exclusive_group(required=True);i.add_argument("--workbook");i.add_argument("--snapshot")
    p.add_argument("--repo",default=str(Path(__file__).resolve().parents[2]));p.add_argument("--output",help="Local preview directory, never the public repository root.")
    p.add_argument("--site-template",help="Reviewed public UI files for this preview, when unrelated local redesigns must remain unpublished.")
    p.add_argument("--all",action="store_true",help="Private preview of all properties, including held/out-of-scope rows.")
    args=p.parse_args()
    try:build(args)
    except (ValueError,OSError) as exc:print("PREVIEW STOPPED:",exc,file=sys.stderr);return 1
    return 0
if __name__=="__main__":sys.exit(main())
