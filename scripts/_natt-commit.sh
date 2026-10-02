#!/bin/sh
# _natt-commit.sh <id> "<amne utan version>" "<brodtext>" "<order>" "<klart-mening>" [extra sokvagar...]
id=$1; amne=$2; brod=$3; order=$4; klart=$5; shift 5
v=$(npm version minor --no-git-tag-version | tr -d 'v\r')
git add package.json package-lock.json src/games/$id docs/games/$id.md "$@"
printf '%s (v%s)\n\n%s\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n' "$amne" "$v" "$brod" > .git/NATT_MSG
git commit -q -F .git/NATT_MSG || exit 1
sha=$(git rev-parse --short HEAD)
node scripts/natt.mjs spel $id committad --commit $sha --version $v >/dev/null
echo "- $id · $order · $klart · v$v · $sha" >> .claude/state/natt/fysikplan-klart.md
echo "$id $v $sha"
