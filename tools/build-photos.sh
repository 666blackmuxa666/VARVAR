#!/bin/zsh
# Повний цикл фото: вирізання з PDF і власних фото (tools/src/photos) → колір (страви і напої окремо) → тіні → стиснення
set -e; cd "$(dirname $0)/.."
T=$(mktemp -d); mkdir -p $T/cut $T/cc
swift tools/cutout.swift "../Все разом-1.pdf" tools/crops.json $T/cut
swift tools/hookah.swift $T/cut     # чаші кальяну з tools/src/hookah.jpg
# власні фото (надіслані в чат): tools/src/photos/food|drink/<id>.jpg — замінюють/доповнюють фото з PDF
PF=(tools/src/photos/food/*(N)); PD=(tools/src/photos/drink/*(N))
[ ${#PF} -gt 0 ] && swift tools/cutout-file.swift $T/cut $PF
[ ${#PD} -gt 0 ] && swift tools/cutout-file.swift $T/cut $PD
L(){ node -e "const m=require('./data/menu.json');const f=['minimax','pasta','burgers','salads','snacks','soups','pans'];console.log(m.categories.filter(c=>c.id!=='hookah'&&f.includes(c.id)===$1).flatMap(c=>c.items.filter(i=>i.img).map(i=>'$T/cut/'+i.id+'.png')).join(' '))"; }
FOOD=$(L true); DR=$(L false)
for f in $PF; do FOOD="$FOOD $T/cut/${${f:t}:r}.png"; done
for f in $PD; do DR="$DR $T/cut/${${f:t}:r}.png"; done
FOOD=$(echo $FOOD | tr ' ' '\n' | sort -u | tr '\n' ' '); DR=$(echo $DR | tr ' ' '\n' | sort -u | tr '\n' ' ')
swift tools/colorfix.swift $T/cc 0.7 ${=FOOD} >/dev/null
cp ${=DR} $T/cc/   # напої без корекції кольору — інакше скло сіріє
cp $T/cut/hookah-*.png $T/cc/   # кальяни без корекції кольору (темна чаша)
swift tools/shadow.swift img $T/cc/*.png
pngquant --force --ext .png --quality 50-90 --speed 1 --skip-if-larger img/*.png || true
rm -rf $T; echo "готово: $(ls img/*.png | wc -l) фото"
