#!/usr/bin/env bash
set -euo pipefail
echo "Downloading lame.min.js..."
curl -L https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js -o lame.min.js
echo "Downloaded lame.min.js (size: $(stat -c '%s' lame.min.js) bytes)"