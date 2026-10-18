#!/bin/sh
# Одна команда: sh _team/video/make.sh → atom-promo-v2.mp4, preview.gif, poster.jpg
set -e; cd "$(dirname "$0")"; F=/opt/homebrew/bin; export PATH="$F:$PATH"
node eleven.mjs                      # якщо є .eleven — докачує voice/lN.mp3 (mp3 мають пріоритет)
node build.mjs                       # голос → timing.json/timing.js + voice.wav
node synth.mjs                       # музика + ефекти за timing.json і cues.json
T=$(node -e "console.log(require('./timing.json').T)")
node render.mjs "$PWD/promo.html" "$PWD/frames" "$T" 30
ffmpeg -y -v error -framerate 30 -i frames/%05d.jpg -i voice.wav -i music.wav -i sfx.wav -filter_complex \
 "[1:a]asplit[v][key];[2:a]volume=0.55[m];[m][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[md];[3:a]volume=0.7[x];[v]volume=1.15[vv];[vv][md][x]amix=inputs=3:normalize=0,loudnorm=I=-15:TP=-1.5,aresample=48000[a]" \
 -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart atom-promo-v2.mp4
# постер — кадр із ціною; GIF — 6 с з ▶️
P=$(node -e "const t=require('./timing.json');console.log((t.s[8]+3).toFixed(2))")
ffmpeg -y -v error -ss "$P" -i atom-promo-v2.mp4 -frames:v 1 -q:v 2 poster.jpg
G=$(node -e "const t=require('./timing.json');console.log((t.s[2]-0.3).toFixed(2))")
ffmpeg -y -v error -f lavfi -i "color=black@0:s=120x120,format=rgba" -frames:v 1 -vf "geq=r='255':g='255':b='255':a='if(lt(hypot(X-60,Y-60),56),if(between(X,46,88)*lt(abs(Y-60),(88-X)*0.62),255,150),0)'" play.png
ffmpeg -y -v error -ss "$G" -t 6 -i atom-promo-v2.mp4 -i play.png -filter_complex \
 "[0:v]fps=12,scale=640:-1:flags=lanczos[v];[1:v]geq=r='if(gt(alpha(X,Y),200),255,0)':g='if(gt(alpha(X,Y),200),255,0)':b='if(gt(alpha(X,Y),200),255,0)':a='alpha(X,Y)',scale=88:88[p];[v][p]overlay=(W-w)/2:(H-h)/2,split[a][b];[a]palettegen=max_colors=96[pl];[b][pl]paletteuse=dither=bayer:bayer_scale=4" preview.gif
rm -f play.png
[ -n "$KEEP" ] || rm -rf frames
ls -lh atom-promo-v2.mp4 preview.gif poster.jpg
