# Tab Audio & Microphone Streaming via WebSocket Chrome Extension

This Chrome extension captures audio from the current tab and the microphone, encodes it as MP3 in real time, and streams the audio data via WebSocket.

## Setup

1. Download the MP3 encoder library:

   ```bash
   bash download_lame.sh
   ```

2. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this extension folder.

3. Click the extension icon to operate recording:
   - "Start Recording" to begin capturing tab audio + microphone and start streaming via WebSocket (初回利用時にマイクのアクセス許可が求められますので「許可」を選択してください)
   - マイクのアクセスをブロックしてしまった場合は、Chrome の設定（chrome://settings/content/microphone）からマイク使用を許可し、再度「Start Recording」を押してください
   - ポップアップを閉じてもストリーミングは継続されます。環境によっては非表示のウィンドウ(offscreen.html)を自動起動して録音処理を実行します。停止するには再度ポップアップを開いて「Stop Streaming」をクリックしてください。
   - "Stop Streaming" to flush remaining MP3 data and close the WebSocket connection.

## Files
- `manifest.json`: Extension manifest (Manifest V3)
- `popup.html`: Popup UI with recording controls
- `popup.js`: Popup UI logic for starting/stopping recording (requests microphone permission and sends commands to background)
- `background.js`: Service worker for managing offscreen document and relaying start/stop commands
- `offscreen.html`: Offscreen document page for audio processing
- `offscreen.js`: Audio capture (tab + mic), MP3 encoding, and WebSocket streaming logic running in offscreen document (keeps AudioContext alive with a silent oscillator, auto-resumes on suspend, and plays a hidden audio element)
- `lame.min.js`: MP3 encoder library (download via `download_lame.sh`)
- `download_lame.sh`: Script to fetch `lame.min.js`