#!/bin/sh
# Серія 5 відео 9:16: sh _team/video/series/make.sh → series/atom-1-…mp4 … atom-5-…mp4 (+ cover-N.jpg)
# Одне відео: ONLY=3 sh make.sh · кадри лишити: KEEP=1
set -e; cd "$(dirname "$0")"; export PATH="/opt/homebrew/bin:$PATH"; S="$PWD"
A=hWHihsTve3RbzG4PHDBQ; K=Xx7Usst6zGAQKLjgeyV7
for p in 1:$A:groshi 2:$K:sklad 3:$A:vidpustka 4:$K:gist 5:$A:dostavka; do
  n=${p%%:*}; r=${p#*:}; vid=${r%%:*}; name=${r#*:}
  [ -z "$ONLY" ] || [ "$ONLY" = "$n" ] || continue
  export D="$S/v$n" VD=voice VID="$vid"; cd "$D"
  node ../../eleven.mjs; node ../../build.mjs; node ../cues.mjs
  INTRO=$(grep -o 'data-l="[0-9]*" data-brk' index.html | head -1 | grep -o '[0-9][0-9]*') node ../../synth.mjs
  T=$(node -e "console.log(require('./timing.json').T)")
  W=1080 H=1920 node ../../render.mjs "$D/index.html" "$D/frames" "$T" 30
  ffmpeg -y -v error -framerate 30 -i frames/%05d.jpg -i voice.wav -i music.wav -i sfx.wav -filter_complex \
   "[1:a]asplit[v][key];[2:a]volume=0.6[m];[m][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[md];[3:a]volume=0.8[x];[v]volume=1.15[vv];[vv][md][x]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5,aresample=48000[a]" \
   -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$S/atom-$n-$name.mp4"
  ffmpeg -y -v error -ss 1.3 -i "$S/atom-$n-$name.mp4" -frames:v 1 -q:v 2 "$S/cover-$n.jpg"
  [ -n "$KEEP" ] || rm -rf frames; rm -f voice.wav music.wav sfx.wav; cd "$S"
done
ls -lh "$S"/atom-*.mp4
