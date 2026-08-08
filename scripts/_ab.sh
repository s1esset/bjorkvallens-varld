#!/bin/bash
# Interleaved A/B över HELA sviten. Växelvis så att maskindrift (termik, GPU-läge,
# ackumulerade Chrome-processer) drabbar båda varianterna lika. Sekventiellt före/efter
# duger INTE för att döma en flaky svit, och en delmängd på 8 spel är inte samma last.
#
#   bash scripts/_ab.sh <fil> [fil...] [--rundor N]
#   bash scripts/_ab.sh src/lib/scene.js
#
# HEAD-varianten = filerna stashade bort. ANDRING = filerna som de ser ut nu.
rundor=3
filer=()
while [ $# -gt 0 ]; do
  case "$1" in
    --rundor) rundor="$2"; shift 2 ;;
    *) filer+=("$1"); shift ;;
  esac
done
if [ ${#filer[@]} -eq 0 ]; then
  echo "usage: bash scripts/_ab.sh <fil> [fil...] [--rundor N]" >&2
  exit 2
fi
echo "A/B över ${filer[*]} · $rundor rundor växelvis"

felraknare() {
  node -e "
const fs=require('fs');let f=[];
for (const x of fs.readdirSync('.test-logs')) { if(!x.endsWith('.json'))continue;
 const j=JSON.parse(fs.readFileSync('.test-logs/'+x,'utf8'));
 for (const y of (j.fynd||[])) if(y.niva==='fel') f.push(x.replace('.json','')+':'+y.kod) }
console.log(f.length?('FYND '+f.join(', ')):'rent');
"
}
for r in $(seq 1 "$rundor"); do
  git stash push -u -- "${filer[@]}" >/dev/null 2>&1
  g=$(npm run test:all 2>&1 | grep -oE '[0-9]+/72 gröna' | tail -1)
  echo "runda $r  HEAD    : $g · $(felraknare)"
  git stash pop >/dev/null 2>&1
  g=$(npm run test:all 2>&1 | grep -oE '[0-9]+/72 gröna' | tail -1)
  echo "runda $r  ANDRING : $g · $(felraknare)"
done
