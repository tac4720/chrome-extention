#!/usr/bin/env bash
set -euo pipefail
echo "Downloading MP3 encoder library..."
curl -L https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js -o mp3-encoder.min.js
echo "Downloaded mp3-encoder.min.js (size: $(stat -c '%s' mp3-encoder.min.js) bytes)"