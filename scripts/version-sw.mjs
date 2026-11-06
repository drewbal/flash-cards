import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash=createHash('sha256');
for(const name of ['index.html','dictionary.json',...readdirSync('dist/assets').sort().map(f=>`assets/${f}`)])hash.update(readFileSync(`dist/${name}`));
hash.update(readFileSync('dist/sw.js'));
const version=hash.digest('hex').slice(0,12);
writeFileSync('dist/sw.js',readFileSync('dist/sw.js','utf8').replace("const CACHE='slovo-v1'",`const CACHE='slovo-${version}'`));
console.log(`Offline cache: slovo-${version}`);
