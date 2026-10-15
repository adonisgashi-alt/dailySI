#!/usr/bin/env bash
# Keep the static site small for Cloudflare Pages' file limit: story and
# archive-day pages keep only their HTML. (The removed .txt files only speed up
# in-app navigation; links fall back to a normal page load.)
set -euo pipefail
cd "${1:-out}"
for d in story archive; do
  [ -d "$d" ] || continue
  find "$d" -name '*.txt' -delete
  find "$d" -mindepth 1 -type d -empty -delete
done
echo "Static site: $(find . -type f | wc -l) files, $(du -sh . | cut -f1)"
