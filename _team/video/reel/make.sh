#!/bin/sh
# Instagram Reels 1080×1920 у двох голосах: sh _team/video/reel/make.sh → atom-reel-andriy.mp4, atom-reel-kateryna.mp4 (+ cover.jpg)
# Один голос: ONLY=kateryna sh make.sh
set -e; cd "$(dirname "$0")"; export PATH="/opt/homebrew/bin:$PATH" D="$PWD"
for p in andriy:hWHihsTve3RbzG4PHDBQ kateryna:Xx7Usst6zGAQKLjgeyV7; do
  n=${p%%:*}; [ -z "$ONLY" ] || [ "$ONLY" = "$n" ] || continue
  export VD="voice-$n" VID="${p#*:}"
  node ../eleven.mjs; node ../build.mjs; node ../synth.mjs
  T=$(node -e "console.log(require('./timing.json').T)")
  W=1080 H=1920 node ../render.mjs "$PWD/reel.html" "$PWD/frames" "$T" 30
  ffmpeg -y -v error -framerate 30 -i frames/%05d.jpg -i voice.wav -i music.wav -i sfx.wav -filter_complex \
   "[1:a]asplit[v][key];[2:a]volume=0.6[m];[m][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[md];[3:a]volume=0.8[x];[v]volume=1.15[vv];[vv][md][x]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5,aresample=48000[a]" \
   -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "atom-reel-$n.mp4"
  C=$(node -e "const t=require('./timing.json');console.log((t.s[2]+1.6).toFixed(2))")
  ffmpeg -y -v error -ss "$C" -i "atom-reel-$n.mp4" -frames:v 1 -q:v 2 cover.jpg
  [ -n "$KEEP" ] || rm -rf frames
done
rm -f voice.wav music.wav sfx.wav atom-reel.mp4; rm -rf voice
ls -lh atom-reel-*.mp4 cover.jpg
