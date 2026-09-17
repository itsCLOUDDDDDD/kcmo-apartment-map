import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'runtime-dist');
const target = path.resolve(root, '../../.local-preview/mapcn');
await build({ root, configFile: path.join(root, 'vite.runtime.config.ts') });
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  await fs.copyFile(path.join(root, 'node_modules/maplibre-gl/dist', name), path.join(out, name));
}
await fs.appendFile(path.join(out, 'THIRD-PARTY-LICENSES.txt'), '\n\nmapcn\n\n' + await fs.readFile(path.join(root, 'licenses/mapcn-LICENSE.txt'), 'utf8'));
await fs.copyFile(path.join(root, 'docs/runtime-README.md'), path.join(out, 'README.md'));
const files = (await fs.readdir(out)).filter(name => !name.startsWith('.'));
const hashes = {};
await fs.mkdir(target, { recursive: true });
for (const name of files) {
  const content = await fs.readFile(path.join(out, name));
  hashes[name] = crypto.createHash('sha256').update(content).digest('hex');
  await fs.writeFile(path.join(target, name), content);
}
await fs.writeFile(path.join(target, 'manifest.json'), JSON.stringify({ engine: 'mapcn', maplibre: JSON.parse(await fs.readFile(path.join(root, 'node_modules/maplibre-gl/package.json'), 'utf8')).version, files: hashes }, null, 2) + '\n');
console.log('Built the runtime into .local-preview/mapcn; no public files or apartment data were replaced.');
