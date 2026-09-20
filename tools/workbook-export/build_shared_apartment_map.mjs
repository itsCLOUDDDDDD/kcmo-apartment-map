// V3 research exporter. Explicit fresh input is mandatory; output remains local.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2);
if(!args.includes('--workbook')&&!args.includes('--snapshot'))throw Error('Pass --workbook fresh.xlsx or --snapshot property-website-snapshot.json.');
const script=fileURLToPath(new URL('../research/build_preview.py',import.meta.url));
const result=spawnSync(process.env.PYTHON||'python3',[script,...args],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
