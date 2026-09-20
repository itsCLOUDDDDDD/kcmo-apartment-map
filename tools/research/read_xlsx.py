"""Read-only XLSX adapter. Uses names, stable IDs and complete hyperlink targets."""
from __future__ import annotations
import hashlib,json,posixpath,re,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
NS={"s":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL="{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
REQUIRED={"KCMO Candidates":("Property","Address","City/State","Zip","Property ID","Units JSON","Media JSON","Fee status","Website visibility"),
          "Map Details":("Property ID","Latitude","Longitude","Location input","Location status"),
          "Map Places":("Place ID","Address","Latitude","Longitude"),
          "Map Routes":("Property ID","Destination ID","Provider seconds","Geometry"),
          "Scene & Anchors":("Place ID","Walking cluster","Address"),
          "Payment Standards 2026":("Agency","Zip","1BR"),"Workflow Settings":("Setting","Value")}
URL_FIELDS={"Website","Floor Plans / Availability","Source URL","Photo URL","Photo source","Gallery URL","Floor plan URL","Available units URL"}
def column_index(a:str)->int:
    n=0
    for c in re.match(r"[A-Z]+",a).group(): n=n*26+ord(c)-64
    return n-1
def read_workbook(filename:str|Path)->dict:
    path=Path(filename).expanduser().resolve()
    if not path.is_file():raise ValueError(f"Workbook not found: {path}")
    with zipfile.ZipFile(path) as z:
        shared=[]
        if "xl/sharedStrings.xml" in z.namelist():
            shared=["".join(t.itertext()) for t in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("s:si",NS)]
        rels={r.attrib["Id"]:r.attrib["Target"] for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
        sheets={}
        for info in ET.fromstring(z.read("xl/workbook.xml")).findall("s:sheets/s:sheet",NS):
            name=info.attrib["name"]
            if name not in REQUIRED and name!="Route Summary":continue
            target=rels[info.attrib[REL]]
            target=target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/"+target)
            root=ET.fromstring(z.read(target));cells={};formula={};links={}
            relpath=posixpath.dirname(target)+"/_rels/"+posixpath.basename(target)+".rels"
            if relpath in z.namelist():
                lr={r.attrib["Id"]:r.attrib["Target"] for r in ET.fromstring(z.read(relpath))}
                for hl in root.findall("s:hyperlinks/s:hyperlink",NS):
                    if hl.attrib.get(REL) in lr: links[hl.attrib["ref"]]=lr[hl.attrib[REL]]
            for c in root.findall("s:sheetData/s:row/s:c",NS):
                ref=c.attrib["r"];typ=c.attrib.get("t");v=c.find("s:v",NS);f=c.find("s:f",NS)
                if typ=="inlineStr":value="".join(c.find("s:is",NS).itertext()) if c.find("s:is",NS) is not None else ""
                elif typ=="s":value=shared[int(v.text)] if v is not None and v.text else ""
                elif v is None or v.text is None:value=None
                elif typ=="b":value=v.text=="1"
                elif typ in ("str","e"):value=v.text
                else:
                    try:
                        n=float(v.text);value=int(n) if n.is_integer() else n
                    except ValueError:value=v.text
                cells[ref]=value
                if f is not None and f.text:formula[ref]=f.text
            hr=4 if name=="Payment Standards 2026" else 1
            hs={column_index(a):str(v).strip() for a,v in cells.items() if int(re.search(r"\d+",a).group())==hr and v not in (None,"")}
            if len(set(hs.values()))!=len(hs):raise ValueError(f"Duplicate headers in {name}")
            missing=set(REQUIRED.get(name,("Property ID",)))-set(hs.values())
            if missing:raise ValueError(f"{name}: missing upgraded headers {sorted(missing)}. Use a fresh upgraded Sheet export; the original V3 is not silently migrated.")
            rows={}
            for ref,v in cells.items():
                ri=int(re.search(r"\d+",ref).group())
                if ri<=hr or column_index(ref) not in hs:continue
                h=hs[column_index(ref)]
                if h in URL_FIELDS:
                    if ref in links:v=links[ref]
                    elif ref in formula:
                        # Reject a truncated concatenated URL; only complete literal first arguments qualify.
                        m=re.match(r'HYPERLINK\(\s*"([^"]+)"\s*[,;]',formula[ref],re.I)
                        if m:v=m.group(1)
                rows.setdefault(ri,{"_row":ri})[h]=v
            data=[r for _,r in sorted(rows.items()) if any(v not in ("",None) for k,v in r.items() if k!="_row")]
            for r in data:
                if "Zip" in r and r["Zip"] is not None:r["Zip"]=str(r["Zip"])
            sheets[name]=data
        if set(REQUIRED)-set(sheets):raise ValueError("Missing required sheets: "+", ".join(sorted(set(REQUIRED)-set(sheets))))
    return {"sheets":sheets,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
if __name__=="__main__":
    import sys
    try:print(json.dumps(read_workbook(sys.argv[1]),ensure_ascii=False))
    except Exception as exc:print(str(exc),file=sys.stderr);sys.exit(1)
