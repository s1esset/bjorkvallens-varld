#!/bin/bash
# Interleaved A/B över HELA sviten. Växelvis så att maskindrift (termik, GPU-läge,
# ackumulerade Chrome-processer) drabbar båda varianterna lika.
felraknare() {
  node -e "
const fs=require('fs');let f=[];
for (const x of fs.readdirSync('.test-logs')) { if(!x.endsWith('.json'))continue;
 const j=JSON.parse(fs.readFileSync('.test-logs/'+x,'utf8'));
 for (const y of (j.fynd||[])) if(y.niva==='fel') f.push(x.replace('.json','')+':'+y.kod) }
console.log(f.length?('FYND '+f.join(', ')):'rent');
"
}
for r in 1 2 3; do
  git stash push -u -- src/lib/partiklar.js src/lib/feedback.js >/dev/null 2>&1
  g=$(npm run test:all 2>&1 | grep -oE '[0-9]+/72 gröna' | tail -1)
  echo "runda $r  HEAD      : $g · $(felraknare)"
  git stash pop >/dev/null 2>&1
  g=$(npm run test:all 2>&1 | grep -oE '[0-9]+/72 gröna' | tail -1)
  echo "runda $r  PARTIKLAR : $g · $(felraknare)"
done
