#!/usr/bin/env bash
# Usage: scripts/qa/compare-shots.sh <baselineDir> <currentDir>  -> prints files whose pixels differ (AE metric)
set -u
fail=0
for f in "$1"/*.png; do
  n=$(basename "$f")
  d=$(magick compare -metric AE "$f" "$2/$n" null: 2>&1 | awk '{print $1}')
  if [ "$d" != "0" ]; then echo "DIFF $n $d px"; fail=1; fi
done
[ $fail -eq 0 ] && echo "mobile identical"
exit $fail
