// 🎨 Конструктор сайту-візитки (кабінет власника → Заклади → 🌐 Сайт → «🎨 Конструктор»). Повноекранний редактор:
// зліва вкладки з налаштуваннями, справа живий перегляд (about.html?preview=1 — чернетка через postMessage, без запитів).
// Публікація — один запит siteSet{k:'siteDesign'}. Сервер перевіряє кожне поле (worker/src/sitedesign.js).
window.OWNSITE = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEYS = ['theme', 'heroCfg', 'blocks', 'dock', 'ann', 'hours', 'seo', 'soc', 'season', 'addrs', 'events', 'langs', 'chat'];
  const DEF = { mode: 'dark', bg: '#121212', card: '#1c1c1c', text: '#f1f1f1', accent: '#f2c14e', ink: '#1a1400', bgfx: 'solid', bg2: '#2a1f0a', ang: 160, bgImg: '', fh: 'Rubik Dirt', fb: 'Rubik', fs: 'm', caps: 0, r: 18, btn: 'fill', cards: 'line', nav: 'glass', anim: 'none', par: 0, menu: 0, shp: '' };
  const HDEF = { lay: 'full', h: 62, dim: 40, al: 'l', badge: 1, addr: 1, logo: 0, btns: ['order', 'book', 'call', 'route'], own: { t: '', u: '' } };
  const FONTS = ['Rubik', 'Rubik Dirt', 'Montserrat', 'Playfair Display', 'Lora', 'Unbounded', 'Comfortaa', 'Oswald', 'Nunito', 'Merriweather', 'Russo One', 'Caveat', 'Manrope', 'Exo 2', 'Cormorant Garamond', 'Prata', 'Forum', 'Tenor Sans', 'Yeseva One', 'Old Standard TT', 'Spectral', 'Alice', 'Philosopher', 'Poiret One', 'Inter', 'Jost', 'Raleway', 'Golos Text', 'Onest', 'Tektur', 'Dela Gothic One', 'Pacifico', 'Lobster', 'Marck Script', 'Amatic SC', 'Bad Script', 'Press Start 2P'];
  const DISP = ['Rubik Dirt', 'Russo One', 'Caveat', 'Unbounded', 'Yeseva One', 'Poiret One', 'Dela Gothic One', 'Pacifico', 'Lobster', 'Marck Script', 'Amatic SC', 'Bad Script', 'Press Start 2P', 'Tektur']; /* лише для заголовків */
  const STD = { about: '📝 Про нас', promos: '🎉 Акції', menu: '🍽 Хіти меню', events: '🎵 Афіша', gallery: '📷 Галерея', hookah: '💨 Кальяни', banquet: '🥂 Банкети', book: '📅 Бронювання', cert: '🎟 Сертифікати', reviews: '⭐ Відгуки', contacts: '📍 Контакти й карта' };
  const CT = { text: '📝 Текст', media: '🖼 Текст + фото', feats: '✨ Переваги-плитки', links: '🔗 Кнопки-посилання', quote: '💬 Цитата', sep: '➖ Розділювач', soc: '📲 Соцмережі' };
  const TPL = {
    varvar: ['🌙 Темний класичний', { ...DEF }, { lay: 'full' }],
    light: ['☀️ Світлий мінімал', { ...DEF, shp: 'bubble', mode: 'light', bg: '#f6f5f2', card: '#ffffff', text: '#1d1d1f', accent: '#1f6feb', ink: '#ffffff', fh: 'Manrope', fb: 'Manrope', r: 14, cards: 'shadow', nav: 'solid', anim: 'fade' }, { lay: 'split', h: 70 }],
    cafe: ['☕ Кав\'ярня', { ...DEF, shp: 'arch', mode: 'light', bg: '#f3ebe1', card: '#fffaf3', text: '#3b2a1e', accent: '#a0522d', ink: '#ffffff', fh: 'Playfair Display', fb: 'Lora', r: 20, cards: 'shadow', bgfx: 'noise', anim: 'up' }, { lay: 'full', dim: 30, al: 'c' }],
    neon: ['🍸 Бар / неон', { ...DEF, shp: 'neon', bg: '#0b0b14', card: '#151526', text: '#eeeeff', accent: '#ff2fb3', ink: '#ffffff', fh: 'Unbounded', fb: 'Manrope', bgfx: 'grid', btn: 'pill', r: 16, anim: 'up', caps: 1 }, { lay: 'full', dim: 55, al: 'c' }],
    pizza: ['🍕 Піцерія', { ...DEF, shp: 'ticket', mode: 'light', bg: '#fff8ee', card: '#ffffff', text: '#2a1a0f', accent: '#e63b2e', ink: '#ffffff', fh: 'Russo One', fb: 'Nunito', r: 24, btn: 'pill', cards: 'shadow', bgfx: 'dots', anim: 'up' }, { lay: 'split', h: 66 }],
    premium: ['🥂 Преміум', { ...DEF, shp: 'deco', bg: '#0c0c0c', card: '#161512', text: '#f3eee3', accent: '#c9a45c', ink: '#120e05', fh: 'Playfair Display', fb: 'Montserrat', caps: 1, r: 4, btn: 'line', cards: 'flat', anim: 'fade', par: 1 }, { lay: 'full', h: 90, dim: 50, al: 'c' }],
    // ✨ преміальні: [назва, тема, головний екран, меню]. Фото фонів — img/site/ (CC0, див. CREDITS.md)
    noir: ['🖤 Нуар і золото', { ...DEF, shp: 'brackets', bg: '#0a0a0a', card: '#141210', text: '#efe7d6', accent: '#d4af37', ink: '#0a0800', bgfx: 'photo', bgImg: 'img/site/goldleaf.webp', fh: 'Cormorant Garamond', fb: 'Jost', caps: 1, r: 2, btn: 'line', cards: 'flat', anim: 'fade', par: 1 }, { lay: 'full', h: 100, dim: 58, al: 'c' }, 'fine'],
    malachite: ['💚 Малахіт', { ...DEF, shp: 'arch', bg: '#06150f', card: '#0d2219', text: '#e8f1ea', accent: '#c8a96a', ink: '#0b0b05', bgfx: 'photo', bgImg: 'img/site/malachite.webp', fh: 'Prata', fb: 'Raleway', r: 6, btn: 'line', cards: 'line', anim: 'up', par: 1 }, { lay: 'full', h: 88, dim: 50, al: 'c' }, 'fine'],
    whiskey: ['🥃 Віскі-бар', { ...DEF, shp: 'folder', bg: '#120c08', card: '#1d140e', text: '#f2e6d6', accent: '#d08a3c', ink: '#140a02', bgfx: 'photo', bgImg: 'img/site/leather.webp', fh: 'Old Standard TT', fb: 'Jost', r: 8, btn: 'fill', cards: 'shadow', anim: 'fade', par: 1 }, { lay: 'full', h: 90, dim: 52, al: 'l' }, 'bar'],
    speakeasy: ['🎩 Speakeasy', { ...DEF, shp: 'frame', bg: '#0d0b08', card: '#17130e', text: '#ecdcc0', accent: '#b9975b', ink: '#0d0b08', bgfx: 'photo', bgImg: 'img/site/darkwood.webp', fh: 'Poiret One', fb: 'Jost', caps: 1, r: 0, btn: 'line', cards: 'flat', anim: 'fade', par: 1 }, { lay: 'full', h: 100, dim: 62, al: 'c' }, 'fine'],
    vino: ['🍷 Винотека', { ...DEF, shp: 'leaf', bg: '#14070b', card: '#210d13', text: '#f4e6e8', accent: '#c4935f', ink: '#140a02', bgfx: 'photo', bgImg: 'img/site/wine.webp', fh: 'Cormorant Garamond', fb: 'Raleway', caps: 1, r: 4, btn: 'line', cards: 'line', anim: 'fade', par: 1 }, { lay: 'full', h: 95, dim: 55, al: 'c' }, 'fine'],
    champagne: ['🥂 Шампань', { ...DEF, shp: 'scallop', mode: 'light', bg: '#f7f1e8', card: '#fffaf2', text: '#2b2118', accent: '#a8834e', ink: '#ffffff', bgfx: 'noise', fh: 'Cormorant Garamond', fb: 'Tenor Sans', caps: 1, r: 0, btn: 'line', cards: 'flat', nav: 'solid', anim: 'fade' }, { lay: 'split', h: 82 }, 'fine'],
    omakase: ['🎋 Омакасе', { ...DEF, shp: 'cut', bg: '#0f0f0c', card: '#181814', text: '#efe9da', accent: '#c9a45c', ink: '#0f0f0c', bgfx: 'photo', bgImg: 'img/site/darklinen.webp', fh: 'Forum', fb: 'Jost', caps: 1, r: 2, btn: 'line', cards: 'line', anim: 'fade' }, { lay: 'full', h: 90, dim: 50, al: 'c' }, 'fine'],
    tokyo: ['🍣 Токіо', { ...DEF, shp: 'slant', bg: '#0b0b0d', card: '#15151a', text: '#f1ede6', accent: '#e23d28', ink: '#ffffff', bgfx: 'vign', fh: 'Dela Gothic One', fb: 'Onest', caps: 1, r: 0, btn: 'fill', cards: 'line', nav: 'solid', anim: 'up' }, { lay: 'full', h: 82, dim: 45, al: 'l' }, 'bold'],
    cyber: ['🌃 Кіберпанк', { ...DEF, shp: 'notch', bg: '#07060f', card: '#120f22', text: '#e9e6ff', accent: '#00e5ff', ink: '#001014', bg2: '#ff2fb3', bgfx: 'aurora', fh: 'Tektur', fb: 'Onest', caps: 1, r: 10, btn: 'pill', cards: 'line', anim: 'up' }, { lay: 'full', h: 100, dim: 60, al: 'c' }, 'bar'],
    cocktail: ['🍹 Коктейль-бар', { ...DEF, shp: 'glass', bg: '#0d0610', card: '#190b1d', text: '#fde9f6', accent: '#ff4fa3', ink: '#ffffff', bg2: '#5b2bff', bgfx: 'photo', bgImg: 'img/site/cocktail.webp', fh: 'Unbounded', fb: 'Manrope', r: 18, btn: 'pill', cards: 'shadow', anim: 'up' }, { lay: 'full', h: 100, dim: 45, al: 'c' }, 'bar'],
    retro: ['🕹 Ретро-аркада', { ...DEF, shp: 'brutal', bg: '#120a24', card: '#1e1238', text: '#f8f0ff', accent: '#ffd23f', ink: '#120a24', bg2: '#ff3d7f', bgfx: 'aurora', fh: 'Press Start 2P', fb: 'Onest', r: 0, btn: 'fill', cards: 'line', anim: 'up' }, { lay: 'full', h: 80, dim: 50, al: 'c' }, 'bold'],
    gallery: ['◼ Галерея', { ...DEF, shp: 'line', bg: '#000000', card: '#0d0d0d', text: '#fafafa', accent: '#ffffff', ink: '#000000', bgfx: 'vign', fh: 'Tenor Sans', fb: 'Inter', caps: 1, r: 0, btn: 'line', cards: 'flat', nav: 'none', anim: 'fade', par: 1 }, { lay: 'full', h: 100, dim: 35, al: 'l' }, 'fine'],
    grill: ['🔥 Гриль-хаус', { ...DEF, shp: 'notch', bg: '#110c08', card: '#1b140e', text: '#f1e5d5', accent: '#e0a050', ink: '#140a02', bgfx: 'photo', bgImg: 'img/site/oven.webp', fh: 'Oswald', fb: 'Nunito', caps: 1, r: 10, btn: 'fill', cards: 'shadow', anim: 'up', par: 1 }, { lay: 'full', h: 90, dim: 55, al: 'l' }, 'bold'],
    napoli: ['🍕 Дровʼяна піч', { ...DEF, shp: 'pill', bg: '#140b07', card: '#20130c', text: '#fbeee0', accent: '#ff6a2a', ink: '#1a0800', bgfx: 'photo', bgImg: 'img/site/embers.webp', fh: 'Oswald', fb: 'Nunito', caps: 1, r: 16, btn: 'pill', cards: 'shadow', anim: 'up' }, { lay: 'full', h: 90, dim: 45, al: 'c' }, 'food'],
    burger: ['🍔 Бургерна', { ...DEF, shp: 'brutal', bg: '#111111', card: '#1b1b1b', text: '#ffffff', accent: '#ffc400', ink: '#111111', bgfx: 'photo', bgImg: 'img/site/charcoal.webp', fh: 'Dela Gothic One', fb: 'Golos Text', caps: 1, r: 14, btn: 'fill', cards: 'shadow', anim: 'up' }, { lay: 'full', h: 85, dim: 50, al: 'l' }, 'food'],
    espresso: ['☕ Еспресо-бар', { ...DEF, shp: 'folder', bg: '#15100c', card: '#201812', text: '#f1e7dc', accent: '#c89b6d', ink: '#15100c', bgfx: 'photo', bgImg: 'img/site/coffee.webp', fh: 'Playfair Display', fb: 'Manrope', r: 14, btn: 'fill', cards: 'line', anim: 'fade' }, { lay: 'full', h: 80, dim: 55, al: 'l' }, 'cafe'],
    specialty: ['🤎 Specialty кава', { ...DEF, shp: 'pill', mode: 'light', bg: '#efe9e1', card: '#f8f4ee', text: '#24201c', accent: '#6f4e37', ink: '#ffffff', bgfx: 'noise', fh: 'Jost', fb: 'Inter', r: 28, btn: 'pill', cards: 'flat', nav: 'glass', anim: 'fade' }, { lay: 'split', h: 72 }, 'cafe'],
    bistro: ['🥖 Паризьке бістро', { ...DEF, shp: 'frame', mode: 'light', bg: '#f5efe2', card: '#fbf7ee', text: '#1f2a24', accent: '#1f4d3a', ink: '#ffffff', bgfx: 'noise', fh: 'Forum', fb: 'Spectral', caps: 1, r: 4, btn: 'line', cards: 'line', nav: 'solid', anim: 'fade' }, { lay: 'split', h: 72 }, 'print'],
    trattoria: ['🍝 Траторія', { ...DEF, shp: 'ticket', mode: 'light', bg: '#f6efe4', card: '#fffaf2', text: '#2d1b12', accent: '#b3261e', ink: '#ffffff', bgfx: 'noise', fh: 'Playfair Display', fb: 'Alice', r: 12, btn: 'fill', cards: 'shadow', anim: 'up' }, { lay: 'split', h: 75 }, 'print'],
    bakery: ['🥐 Пекарня', { ...DEF, shp: 'scallop', mode: 'light', bg: '#f7efe3', card: '#fffaf2', text: '#3a2a1a', accent: '#c27b2c', ink: '#ffffff', bgfx: 'photo', bgImg: 'img/site/linen.webp', fh: 'Philosopher', fb: 'Nunito', r: 20, btn: 'pill', cards: 'shadow', anim: 'up' }, { lay: 'split', h: 72 }, 'cafe'],
    patisserie: ['🌸 Кондитерська', { ...DEF, shp: 'bubble', mode: 'light', bg: '#fbf1f1', card: '#fffafa', text: '#3a2328', accent: '#c75b7a', ink: '#ffffff', bgfx: 'photo', bgImg: 'img/site/blush.webp', fh: 'Marck Script', fb: 'Raleway', r: 24, btn: 'pill', cards: 'shadow', anim: 'fade' }, { lay: 'split', h: 75 }, 'cafe'],
    marble: ['🤍 Білий мармур', { ...DEF, shp: 'deco', mode: 'light', bg: '#f2f0ec', card: '#ffffff', text: '#222222', accent: '#9a7b4f', ink: '#ffffff', bgfx: 'photo', bgImg: 'img/site/marble.webp', fh: 'Prata', fb: 'Tenor Sans', r: 6, btn: 'line', cards: 'line', nav: 'solid', anim: 'fade' }, { lay: 'split', h: 78 }, 'fine'],
    riviera: ['🌊 Ривʼєра', { ...DEF, shp: 'leaf', mode: 'light', bg: '#f4f1ea', card: '#ffffff', text: '#10263b', accent: '#1e5a8c', ink: '#ffffff', bgfx: 'solid', fh: 'Yeseva One', fb: 'Raleway', r: 22, btn: 'pill', cards: 'shadow', anim: 'up' }, { lay: 'full', h: 82, dim: 25, al: 'c' }, 'light'],
    tropic: ['🌴 Тропіки', { ...DEF, shp: 'leaf', bg: '#07150f', card: '#0e2219', text: '#eaf6ec', accent: '#ffb347', ink: '#1b0d00', bgfx: 'photo', bgImg: 'img/site/tropic.webp', fh: 'Pacifico', fb: 'Nunito', r: 22, btn: 'pill', cards: 'shadow', anim: 'up' }, { lay: 'full', h: 85, dim: 45, al: 'c' }, 'food'],
    mexico: ['🌵 Мексика', { ...DEF, shp: 'sketch', mode: 'light', bg: '#f6ead8', card: '#fff6ea', text: '#2a1609', accent: '#d2452b', ink: '#ffffff', bgfx: 'dots', fh: 'Amatic SC', fb: 'Nunito', fs: 'l', r: 18, btn: 'pill', cards: 'shadow', anim: 'up' }, { lay: 'full', h: 80, dim: 35, al: 'c' }, 'food'],
    artcafe: ['🎨 Арт-кафе', { ...DEF, shp: 'polaroid', mode: 'light', bg: '#fbf7f1', card: '#ffffff', text: '#1c1a2e', accent: '#e2553f', ink: '#ffffff', bgfx: 'photo', bgImg: 'img/site/marbling.webp', fh: 'Yeseva One', fb: 'Jost', r: 18, btn: 'fill', cards: 'shadow', anim: 'up' }, { lay: 'split', h: 75 }, 'cafe'],
    scandi: ['🕊 Сканді', { ...DEF, shp: 'line', mode: 'light', bg: '#fafaf8', card: '#ffffff', text: '#1a1a1a', accent: '#111111', ink: '#ffffff', bgfx: 'solid', fh: 'Inter', fb: 'Inter', r: 10, btn: 'fill', cards: 'line', nav: 'solid', anim: 'fade' }, { lay: 'split', h: 62 }, 'light'],
    brutal: ['⬛ Бруталізм', { ...DEF, shp: 'brutal', mode: 'light', bg: '#e9e7e1', card: '#f4f3ef', text: '#0f0f0f', accent: '#ff4f00', ink: '#ffffff', bgfx: 'grid', fh: 'Unbounded', fb: 'Golos Text', caps: 1, r: 0, btn: 'fill', cards: 'flat', nav: 'solid', anim: 'up' }, { lay: 'split', h: 72 }, 'bold'],
    // 🔷 різні за формою: інші вікна, сітка, шрифти й фон
    hutsul: ['🏔 Гуцульщина', { ...DEF, mode: 'light', bg: '#f4ede1', card: '#fffaf1', text: '#2a1610', accent: '#b3261e', ink: '#ffffff', bg2: '#1f3d2b', bgfx: 'dots', fh: 'Philosopher', fb: 'Nunito', r: 10, btn: 'fill', cards: 'line', nav: 'solid', anim: 'up', shp: 'scallop' }, { lay: 'split', h: 78 }, 'cafe'],
    chalet: ['⛷ Шале', { ...DEF, bg: '#14100c', card: '#211912', text: '#f4e9dc', accent: '#e8b25c', ink: '#1a1000', bgfx: 'photo', bgImg: 'img/site/walnut.webp', fh: 'Yeseva One', fb: 'Raleway', r: 20, btn: 'pill', cards: 'shadow', anim: 'fade', par: 1, shp: 'arch' }, { lay: 'full', h: 100, dim: 48, al: 'c' }, 'bar'],
    chalk: ['🖍 Крейдяна дошка', { ...DEF, bg: '#1d2421', card: '#252e2a', text: '#f2f2ea', accent: '#f6e27a', ink: '#1d2421', bgfx: 'photo', bgImg: 'img/site/slate.webp', fh: 'Amatic SC', fb: 'Bad Script', fs: 'l', r: 8, btn: 'line', cards: 'flat', nav: 'solid', anim: 'fade', shp: 'sketch' }, { lay: 'plain', h: 60 }, 'print'],
    gazette: ['📰 Газета', { ...DEF, mode: 'light', bg: '#efebe1', card: '#efebe1', text: '#111111', accent: '#111111', ink: '#efebe1', bgfx: 'noise', fh: 'Old Standard TT', fb: 'Spectral', caps: 1, r: 0, btn: 'line', cards: 'flat', nav: 'solid', anim: 'none', shp: 'line' }, { lay: 'plain', h: 55 }, 'print'],
    memphis: ['🔺 Мемфіс', { ...DEF, mode: 'light', bg: '#fff3c4', card: '#ffffff', text: '#1b1b1b', accent: '#ff4f9a', ink: '#ffffff', bg2: '#38c6f4', bgfx: 'dots', fh: 'Dela Gothic One', fb: 'Golos Text', r: 0, btn: 'fill', cards: 'flat', nav: 'solid', anim: 'up', shp: 'brutal' }, { lay: 'split', h: 70 }, 'bold'],
    polaroid: ['📸 Полароїд', { ...DEF, mode: 'light', bg: '#e8e4dc', card: '#fbfaf6', text: '#222222', accent: '#e2553f', ink: '#ffffff', bgfx: 'photo', bgImg: 'img/site/concrete.webp', fh: 'Caveat', fb: 'Jost', fs: 'l', r: 4, btn: 'pill', cards: 'shadow', anim: 'up', shp: 'polaroid' }, { lay: 'full', h: 75, dim: 30, al: 'c' }, 'cafe'],
    sakura: ['🌸 Сакура', { ...DEF, mode: 'light', bg: '#fbf0f2', card: '#ffffff', text: '#3b1e2a', accent: '#d64f7c', ink: '#ffffff', bg2: '#ffd9e3', bgfx: 'grad', ang: 200, fh: 'Yeseva One', fb: 'Raleway', r: 26, btn: 'pill', cards: 'shadow', nav: 'glass', anim: 'fade', shp: 'leaf' }, { lay: 'split', h: 80 }, 'light'],
    arctic: ['❄️ Зима', { ...DEF, mode: 'light', bg: '#eaf2f8', card: '#ffffff', text: '#0f2433', accent: '#1f7ac2', ink: '#ffffff', bg2: '#9fd4ff', bgfx: 'aurora', fh: 'Unbounded', fb: 'Manrope', r: 22, btn: 'fill', cards: 'flat', nav: 'glass', anim: 'up', shp: 'glass' }, { lay: 'full', h: 85, dim: 20, al: 'c' }, 'light'],
    forest: ['🌲 Карпатський ліс', { ...DEF, bg: '#0b140e', card: '#132017', text: '#e7efe5', accent: '#9bd27a', ink: '#0b140e', bgfx: 'photo', bgImg: 'img/site/forest.webp', fh: 'Forum', fb: 'Onest', caps: 1, r: 4, btn: 'line', cards: 'line', anim: 'fade', par: 1, shp: 'notch' }, { lay: 'full', h: 95, dim: 50, al: 'l' }, 'fine'],
    vinyl: ['🎶 Вініл-бар', { ...DEF, bg: '#0a0a0a', card: '#141414', text: '#f5f5f5', accent: '#ff3b30', ink: '#ffffff', bgfx: 'vign', fh: 'Unbounded', fb: 'Inter', caps: 1, r: 30, btn: 'pill', cards: 'flat', nav: 'none', anim: 'up', shp: 'pill' }, { lay: 'logo', h: 70 }, 'bar'],
    gatsby: ['🏛 Гетсбі', { ...DEF, bg: '#0b0b0b', card: '#121212', text: '#f3e9d2', accent: '#d9b45a', ink: '#0b0b0b', bgfx: 'grid', fh: 'Poiret One', fb: 'Tenor Sans', caps: 1, r: 0, btn: 'line', cards: 'flat', nav: 'solid', anim: 'fade', shp: 'deco' }, { lay: 'logo', h: 80 }, 'fine'],
    street: ['🌯 Стріт-фуд', { ...DEF, mode: 'light', bg: '#ffd23f', card: '#fff8dc', text: '#141414', accent: '#141414', ink: '#ffd23f', bgfx: 'solid', fh: 'Russo One', fb: 'Golos Text', caps: 1, r: 0, btn: 'fill', cards: 'flat', nav: 'solid', anim: 'up', shp: 'cut' }, { lay: 'split', h: 66 }, 'bold'],
    asia: ['🥢 Азійська кухня', { ...DEF, bg: '#160707', card: '#220c0c', text: '#f8ece4', accent: '#e8b04a', ink: '#160707', bg2: '#b8211b', bgfx: 'photo', bgImg: 'img/site/sushi.webp', fh: 'Dela Gothic One', fb: 'Onest', r: 2, btn: 'fill', cards: 'line', anim: 'up', shp: 'frame' }, { lay: 'full', h: 90, dim: 55, al: 'l' }, 'food'],
    comic: ['💥 Комікс', { ...DEF, mode: 'light', bg: '#ffffff', card: '#fff7d6', text: '#111111', accent: '#ff2d2d', ink: '#ffffff', bg2: '#2d7dff', bgfx: 'dots', fh: 'Russo One', fb: 'Nunito', r: 18, btn: 'fill', cards: 'line', nav: 'solid', anim: 'up', shp: 'bubble' }, { lay: 'split', h: 70 }, 'food'],
    terminal: ['💻 Термінал', { ...DEF, bg: '#050805', card: '#0b120b', text: '#c9f7c9', accent: '#3ddc84', ink: '#041004', bgfx: 'grid', fh: 'Press Start 2P', fb: 'Tektur', r: 0, btn: 'line', cards: 'flat', nav: 'solid', anim: 'fade', shp: 'brackets' }, { lay: 'plain', h: 60 }, 'bold'],
    boho: ['🌾 Бохо', { ...DEF, mode: 'light', bg: '#f1e7da', card: '#f8f1e7', text: '#3a2a20', accent: '#c0643f', ink: '#ffffff', bgfx: 'photo', bgImg: 'img/site/linen.webp', fh: 'Cormorant Garamond', fb: 'Jost', r: 16, btn: 'line', cards: 'flat', anim: 'fade', par: 1, shp: 'arch' }, { lay: 'split', h: 82 }, 'cafe'],
    liquid: ['🫧 Рідке скло', { ...DEF, bg: '#0d0820', card: '#1b1238', text: '#f4f0ff', accent: '#8cf1ff', ink: '#0d0820', bg2: '#ff4fd8', bgfx: 'grad', ang: 135, fh: 'Unbounded', fb: 'Manrope', r: 28, btn: 'pill', cards: 'flat', nav: 'glass', anim: 'up', shp: 'glass' }, { lay: 'full', h: 100, dim: 30, al: 'c' }, 'bar'],
    cinema: ['🎟 Кіно-бар', { ...DEF, bg: '#120607', card: '#1f0b0d', text: '#fbe9d0', accent: '#f5c04a', ink: '#120607', bgfx: 'vign', fh: 'Russo One', fb: 'Jost', caps: 1, r: 10, btn: 'fill', cards: 'flat', nav: 'solid', anim: 'up', shp: 'ticket' }, { lay: 'full', h: 85, dim: 60, al: 'c' }, 'bar'],
    ink: ['🖋 Каліграфія', { ...DEF, mode: 'light', bg: '#f7f4ee', card: '#fffdf8', text: '#141414', accent: '#9c1c1c', ink: '#ffffff', bgfx: 'photo', bgImg: 'img/site/paper.webp', fh: 'Marck Script', fb: 'Spectral', fs: 'l', r: 0, btn: 'line', cards: 'flat', nav: 'none', anim: 'fade', shp: 'brackets' }, { lay: 'logo', h: 75 }, 'print'],
  };
  const PAL = [['#121212', '#1c1c1c', '#f1f1f1', '#f2c14e', '#1a1400'], ['#0f1a14', '#16261d', '#e9f3ec', '#4cd38a', '#04170c'], ['#101522', '#182036', '#e8ecf7', '#5b8cff', '#ffffff'], ['#1a0f14', '#2a1820', '#f6e9ee', '#ff5c8a', '#ffffff'], ['#f6f5f2', '#ffffff', '#1d1d1f', '#1f6feb', '#ffffff'], ['#f3ebe1', '#fffaf3', '#3b2a1e', '#a0522d', '#ffffff'], ['#fff8ee', '#ffffff', '#2a1a0f', '#e63b2e', '#ffffff'], ['#eef3ef', '#ffffff', '#16251b', '#2f8f5b', '#ffffff']];
  const BGLIB = ['goldleaf', 'malachite', 'leather', 'blackleather', 'darkwood', 'walnut', 'charcoal', 'darklinen', 'stucco', 'blush', 'marbling', 'tropic', 'coffee', 'champagne', 'cocktail', 'mixology', 'barnight', 'neonsign', 'embers', 'oven', 'pizzafire', 'sushi', 'paper', 'linen', 'marble', 'concrete', 'slate', 'wood', 'night', 'bokeh', 'sunset', 'forest', 'ocean', 'wine'];
  const TABS = [['tpl', '🧩 Шаблон'], ['col', '🎨 Кольори й фон'], ['font', '🔤 Шрифти'], ['form', '🔘 Форма й рух'], ['hero', '🏠 Головний екран'], ['blk', '🧱 Блоки'], ['ev', '🎵 Афіша'], ['dock', '🧲 Панель і оголошення'], ['hrs', '🕐 Години й адреси'], ['soc', '📲 Соцмережі й QR'], ['seo', '🔍 SEO й мови'], ['sea', '🎉 Сезон'], ['ver', '🕰 Версії й код'], ['st', '📊 Відвідування']];
  let C, D, O, tab = 'tpl', sub = null, dirty = false, frame, pv = false, tmr, M = 'site';
  const TK = () => (M === 'menu' ? 'menuTheme' : 'theme');
  const al = p => (M === 'menu' && /^theme(\.|$)/.test(p) ? 'menuTheme' + p.slice(5) : p); /* у меню «theme.*» = menuTheme */
  const MDEF = { ...DEF, bg: '#141414', card: '#1d1d1d', text: '#eeeeee', r: 14, caps: 1, lay: 'grid', cols: 2, ratio: '1', fit: 'contain', phbg: 'tex', phC: '#222222', phImg: '', cats: 'pill', catsSticky: 1, ttl: 'l', ttlLine: 0, ttlSz: 30, desc: 1, size: 1, add: 'round', price: 'accent', logo: 0, note: { t: '', c: '#f2c14e' } };
  const MTPL = {
    varvar: ['🌙 Темний класичний', {}],
    light: ['☀️ Світле', { ...TPL.light[1], lay: 'list', phbg: 'card', cats: 'line', add: 'plus', ttlLine: 1 }],
    cafe: ['☕ Кав\'ярня', { ...TPL.cafe[1], lay: 'grid', phbg: 'color', phC: '#efe3d3', fit: 'contain', cats: 'pill', ttl: 'c', ttlLine: 1, caps: 0 }],
    neon: ['🍸 Бар / неон', { ...TPL.neon[1], lay: 'big', ratio: '16/9', fit: 'cover', phbg: 'none', cats: 'box', add: 'wide' }],
    pizza: ['🍕 Піцерія', { ...TPL.pizza[1], lay: 'grid', phbg: 'accent', cats: 'pill', add: 'plus', price: 'accent' }],
    premium: ['🥂 Преміум', { ...TPL.premium[1], lay: 'text', cats: 'line', ttl: 'c', ttlLine: 1, add: 'plus', price: 'text', desc: 1 }],
    print: ['📜 Як друковане', { ...DEF, mode: 'light', bg: '#fbf8f1', card: '#fbf8f1', text: '#222222', accent: '#8a1c1c', ink: '#ffffff', fh: 'Playfair Display', fb: 'Lora', lay: 'text', cats: 'line', ttl: 'c', ttlLine: 1, caps: 0, add: 'plus', price: 'text', bgfx: 'noise' }],
  };
  // ✨ меню до кожного преміального шаблону сайту: рід → вигляд карток, вкладок, кнопок
  const MKIND = {
    fine: { lay: 'text', cats: 'line', ttl: 'c', ttlLine: 1, add: 'plus', price: 'text', desc: 1, phbg: 'card' },
    bar: { lay: 'big', ratio: '16/9', fit: 'cover', phbg: 'none', cats: 'box', add: 'wide' },
    bold: { lay: 'grid', cats: 'box', add: 'wide', price: 'accent', phbg: 'card', ttlSz: 34 },
    food: { lay: 'grid', cats: 'pill', add: 'round', price: 'accent', phbg: 'accent' },
    cafe: { lay: 'list', cats: 'pill', add: 'plus', phbg: 'card', ttl: 'c', ttlLine: 1, caps: 0 },
    print: { lay: 'text', cats: 'line', ttl: 'c', ttlLine: 1, add: 'plus', price: 'text', caps: 0 },
    light: { lay: 'list', cats: 'line', add: 'plus', phbg: 'card', ttlLine: 1 },
  };
  for (const [k, [l, t, , m]] of Object.entries(TPL)) if (m && !MTPL[k]) MTPL[k] = [l, { ...t, ...MKIND[m] }];
  const clone = x => JSON.parse(JSON.stringify(x ?? null));
  const get = (p, o = D) => al(p).split('.').reduce((a, k) => a?.[k], o);
  const set = (p, v) => { const k = al(p).split('.'), last = k.pop(); let o = D; for (const x of k) { if (o[x] == null || typeof o[x] !== 'object') o[x] = /^\d+$/.test(x) ? [] : {}; o = o[x]; } o[last] = v; };
  const need = k => { if (M === 'menu' && (k === 'theme' || k === 'menuTheme')) { if (!D.menuTheme) D.menuTheme = clone(MDEF); return; } if (k === 'theme' && !D.theme) D.theme = { ...DEF }; if (k === 'heroCfg' && !D.heroCfg) D.heroCfg = clone(HDEF); };
  const rid = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' });

  // ---------- поля ----------
  const chips = (p, opts) => `<div class="sb-chips">${opts.map(([v, l]) => `<button type="button" data-sb="pick" data-p="${p}" data-v="${esc(v)}" class="${String(get(p) ?? '') === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const color = (p, l) => `<label class="sb-col"><input type="color" data-p="${p}" value="${esc(get(p) || '#000000')}"><span>${l}</span></label>`;
  const range = (p, l, a, b, u = '') => `<label class="sb-f">${l} <b data-o="${p}">${get(p) ?? ''}${u}</b><input type="range" data-p="${p}" data-u="${u}" min="${a}" max="${b}" value="${get(p) ?? a}"></label>`;
  const text = (p, l, ph = '', max = 200, area) => `<label class="sb-f">${l}${area ? `<textarea data-p="${p}" maxlength="${max}" rows="4" placeholder="${esc(ph)}">${esc(get(p) || '')}</textarea>` : `<input data-p="${p}" maxlength="${max}" placeholder="${esc(ph)}" value="${esc(get(p) || '')}">`}</label>`;
  const tr2 = (p, l, max = 200, area) => `<div class="sb-tr">${text(p + '.uk', l + ' · UA', '', max, area)}${D.langs !== 0 ? text(p + '.en', l + ' · EN', 'необовʼязково', max, area) : ''}</div>`;
  const tgl = (p, l) => `<label class="sb-tg"><input type="checkbox" data-p="${p}" ${get(p) ? 'checked' : ''}><span>${l}</span></label>`;
  const imgf = (p, l) => { const u = get(p); return `<div class="sb-f">${l}<div class="sb-img"${u ? ` style="background-image:url('${esc(u)}')"` : ''}><button type="button" class="btn sm" data-sb="img" data-p="${p}">${u ? '🔄 Замінити' : '🖼 Завантажити'}</button>${u ? `<button type="button" class="btn sm" data-sb="imgDel" data-p="${p}">✕</button>` : ''}</div></div>`; };
  const rgba = (h, a) => `rgba(${[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',')},${a})`;
  const tile = (k, l, t) => `<button type="button" data-sb="tpl" data-k="${k}" style="background:${/^(img|photo)$/.test(t.bgfx) && t.bgImg ? `linear-gradient(${rgba(t.bg, .45)}, ${rgba(t.bg, .8)}), url('${t.bgImg}') center/cover` : t.bgfx === 'aurora' ? `radial-gradient(80% 80% at 0 0, ${rgba(t.accent, .45)}, transparent), radial-gradient(70% 70% at 100% 100%, ${rgba(t.bg2 || t.accent, .45)}, transparent), ${t.bg}` : t.bg};color:${t.text};border-color:${t.accent};font-family:'${t.fh}',serif;border-radius:${Math.min(t.r, 16)}px"><i style="background:${t.accent}"></i><span><b${t.caps ? ' style="text-transform:uppercase;letter-spacing:.06em"' : ''}>${l.replace(/^\S+\s/, '')}</b><small style="font-family:'${t.fb}',sans-serif">${l.split(' ')[0]} Аа · ${t.fh}</small></span></button>`;
  const fontsCss = () => { if (document.getElementById('sbFonts')) return; const ONE = ['Rubik Dirt', 'Russo One', 'Prata', 'Forum', 'Tenor Sans', 'Yeseva One', 'Alice', 'Poiret One', 'Dela Gothic One', 'Pacifico', 'Lobster', 'Marck Script', 'Bad Script', 'Press Start 2P']; document.head.insertAdjacentHTML('beforeend', `<link id="sbFonts" rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONTS.map(f => 'family=' + f.replace(/ /g, '+') + (ONE.includes(f) ? '' : ':wght@400;700')).join('&')}&display=swap">`); };
  const card = (h, body, note) => `<div class="sb-card"><h4>${h}</h4>${note ? `<div class="sb-note">${note}</div>` : ''}${body}</div>`;
  const preTheme = () => D[TK()] ? '' : `<div class="sb-note">Зараз сайт має стандартний вигляд. Будь-яка зміна тут створить власну тему.</div>`;

  // ---------- вкладки ----------
  const V = {
    tpl: () => card('🧩 Готовий стиль', `<div class="sb-tpls">${Object.entries(TPL).map(([k, [l, t]]) => tile(k, l, t)).join('')}</div>`, 'Змінює кольори, шрифти, форму й головний екран. Тексти, фото й блоки лишаються.')
      + card('🧹 З нуля', `<div class="sb-row"><button type="button" class="btn sm" data-sb="zero">🧹 Почати з нуля</button><button type="button" class="btn sm" data-sb="std">↩️ Стандартний вигляд</button></div>`, '«З нуля» — порожній головний екран і лише блок «Контакти», далі додаєте свої блоки. «Стандартний» — прибрати власну тему.'),
    col: () => preTheme() + card('🌗 Тема', chips('theme.mode', [['dark', '🌙 Темна'], ['light', '☀️ Світла']]))
      + card('🎨 Готові палітри', `<div class="sb-pal">${PAL.map((p, i) => `<button type="button" data-sb="pal" data-i="${i}">${p.slice(0, 4).map(c => `<i style="background:${c}"></i>`).join('')}</button>`).join('')}</div><div class="sb-row"><button type="button" class="btn sm" data-sb="logoPal">🪄 Кольори з логотипа / головного фото</button></div>`)
      + card('🖌 Свої кольори', `<div class="sb-cols">${color('theme.bg', 'Фон')}${color('theme.card', 'Картки')}${color('theme.text', 'Текст')}${color('theme.accent', 'Акцент')}${color('theme.ink', 'Текст на кнопці')}</div>`)
      + card('🖼 Фон сторінки', chips('theme.bgfx', [['solid', 'Суцільний'], ['grad', 'Градієнт'], ['aurora', '✨ Сяйво'], ['vign', '🌑 Віньєтка'], ['photo', '📸 Фото яскраве'], ['img', 'Фото приглушене'], ['dots', 'Крапки'], ['grid', 'Сітка'], ['noise', 'Текстура']])
        + (/^(grad|aurora)$/.test(get('theme.bgfx')) ? `<div class="sb-cols">${color('theme.bg2', 'Другий колір')}</div>${range('theme.ang', 'Кут', 0, 360, '°')}` : '')
        + (/^(img|photo)$/.test(get('theme.bgfx')) ? imgf('theme.bgImg', 'Фото фону') + `<div class="sb-note">Або з бібліотеки:</div><div class="sb-lib">${BGLIB.map(n => `<button type="button" data-sb="lib" data-u="img/site/${n}.webp" style="background-image:url('img/site/${n}.webp')"></button>`).join('')}</div>` : '')),
    font: () => preTheme() + card('🔤 Заголовки', `<div class="sb-fonts">${FONTS.map(f => `<button type="button" data-sb="pick" data-p="theme.fh" data-v="${f}" class="${get('theme.fh') === f ? 'on' : ''}" style="font-family:'${f}',sans-serif">${f}</button>`).join('')}</div>`)
      + card('📄 Текст', `<div class="sb-fonts">${FONTS.filter(f => !DISP.includes(f)).map(f => `<button type="button" data-sb="pick" data-p="theme.fb" data-v="${f}" class="${get('theme.fb') === f ? 'on' : ''}" style="font-family:'${f}',sans-serif">${f}</button>`).join('')}</div>`)
      + card('🔠 Розмір і регістр', chips('theme.fs', [['s', 'Дрібний'], ['m', 'Звичайний'], ['l', 'Великий']]) + tgl('theme.caps', 'ЗАГОЛОВКИ ВЕЛИКИМИ')),
    form: () => preTheme() + card('🔘 Кнопки', chips('theme.btn', [['fill', 'Заливка'], ['line', 'Контур'], ['pill', 'Таблетка']]) + range('theme.r', 'Заокруглення', 0, 28, 'px'))
      + card('🗂 Картки', chips('theme.cards', [['line', 'З рамкою'], ['shadow', 'З тінню'], ['flat', 'Плоскі']]) + '<div class="muted" style="font-size:12px;margin:10px 0 4px">🔷 Форма вікон</div>' + chips('theme.shp', [['', 'Звичайні'], ['arch', 'Арка'], ['ticket', 'Квиток'], ['cut', 'Зрізані кути'], ['notch', 'Загнутий кут'], ['slant', 'Скіс'], ['leaf', 'Листок'], ['bubble', 'Бульбашка'], ['pill', 'Капсула'], ['sketch', 'Від руки'], ['brutal', 'Брутал'], ['deco', 'Ар-деко'], ['neon', 'Неон'], ['glass', 'Скло'], ['scallop', 'Хвиля знизу'], ['frame', 'Рамка з відступом'], ['folder', 'Папка'], ['line', 'Лише лінія'], ['brackets', 'Кутики'], ['polaroid', 'Полароїд']]))
      + card('🧭 Шапка', chips('theme.nav', [['glass', 'Скло'], ['solid', 'Суцільна'], ['none', 'Прозора']]))
      + card('✨ Анімації', chips('theme.anim', [['none', 'Без'], ['fade', 'Плавна поява'], ['up', 'Поява знизу']]) + tgl('theme.par', 'Паралакс фото головного екрана'), 'Гості з увімкненим «менше руху» в телефоні анімацій не побачать.')
      + card('🍽 Онлайн-меню', tgl('theme.menu', 'Застосувати цей стиль і до меню (замовлення з собою / за столом)')),
    hero: () => { const h = D.heroCfg || HDEF, on = k => (h.btns || []).includes(k);
      return card('🏠 Вигляд', chips('heroCfg.lay', [['full', '🖼 Фото на весь екран'], ['split', '◧ Фото збоку'], ['plain', '▭ Без фото'], ['logo', '◎ Логотип по центру']]) + chips('heroCfg.al', [['l', '⬅ Ліворуч'], ['c', '⬌ По центру']]) + range('heroCfg.h', 'Висота', 30, 100, '% екрана') + range('heroCfg.dim', 'Затемнення фото', 0, 85, '%'))
        + card('📷 Головне фото', `<div class="sb-note">Головне фото й логотип змінюються в розділі «🌐 Сайт» → 📷 Фото (поза конструктором — одразу).</div>`)
        + card('👁 Що показувати', tgl('heroCfg.badge', '🟢 Відчинено / Зачинено') + tgl('heroCfg.addr', '📍 Адреса') + tgl('heroCfg.logo', '🏷 Логотип над назвою'))
        + card('🔘 Кнопки', `<div class="sb-list">${(h.btns || []).map((k, i) => `<div class="sb-li"><span>${{ order: '🛵 Замовити', book: '📅 Забронювати', call: '📞 Подзвонити', route: '🧭 Маршрут', own: '⭐ Своя кнопка' }[k]}</span><span><button type="button" data-sb="mv" data-p="heroCfg.btns" data-i="${i}" data-m="-1">▲</button><button type="button" data-sb="mv" data-p="heroCfg.btns" data-i="${i}" data-m="1">▼</button><button type="button" data-sb="rm" data-p="heroCfg.btns" data-i="${i}">✕</button></span></div>`).join('')}</div>
          <div class="sb-chips">${['order', 'book', 'call', 'route', 'own'].filter(k => !on(k)).map(k => `<button type="button" data-sb="add" data-p="heroCfg.btns" data-v="${k}">➕ ${{ order: 'Замовити', book: 'Бронь', call: 'Подзвонити', route: 'Маршрут', own: 'Своя' }[k]}</button>`).join('')}</div>
          ${on('own') ? text('heroCfg.own.t', 'Текст своєї кнопки', 'напр. 🎉 Банкети', 30) + text('heroCfg.own.u', 'Посилання', 'https://… або #banquet або tel:+380…', 300) : ''}`); },
    blk: () => { const l = blocks(); return card('🧱 Порядок і показ', `<div class="sb-list">${l.map((b, i) => `<div class="sb-li${b.on ? '' : ' off'}"><span>${b.type ? CT[b.type] : STD[b.id]}${b.t?.uk ? ` <small>«${esc(b.t.uk)}»</small>` : ''}</span><span><button type="button" data-sb="bmv" data-i="${i}" data-m="-1">▲</button><button type="button" data-sb="bmv" data-i="${i}" data-m="1">▼</button><button type="button" data-sb="bon" data-i="${i}">${b.on ? '👁' : '🚫'}</button><button type="button" data-sb="bed" data-i="${i}">✏️</button>${b.type ? `<button type="button" data-sb="bdel" data-i="${i}">🗑</button>` : ''}</span></div>`).join('')}</div>`, 'Акції, галерея, кальяни, банкети й відгуки показуються, лише коли в них є вміст (редагується в «🌐 Сайт» і в касі).')
      + card('➕ Свій блок', `<div class="sb-chips">${Object.entries(CT).map(([k, l]) => `<button type="button" data-sb="badd" data-v="${k}">${l}</button>`).join('')}</div>`); },
    ev: () => card('🎵 Афіша', `<div class="sb-list">${(D.events || []).map((e, i) => `<div class="sb-li${e.d < today() ? ' off' : ''}"><span><b>${e.d.slice(8)}.${e.d.slice(5, 7)}</b>${e.tm ? ' ' + e.tm : ''} · ${esc(e.t?.uk || '')}${e.d < today() ? ' <small>минула</small>' : ''}</span><span><button type="button" data-sb="eed" data-i="${i}">✏️</button><button type="button" data-sb="rm" data-p="events" data-i="${i}">🗑</button></span></div>`).join('') || '<div class="sb-note">Подій ще немає</div>'}</div><button type="button" class="btn sm" data-sb="eed" data-i="-1">➕ Подія</button>`, 'Минулі події зникають із сайту самі. Блок «🎵 Афіша» можна пересунути у вкладці «Блоки».'),
    dock: () => card('🧲 Панель на телефоні', tgl('dock.on', 'Показувати кнопки внизу екрана (лише телефон)') + (D.dock?.on ? `<div class="sb-chips">${[['order', '🛵 Замовити'], ['call', '📞'], ['book', '📅'], ['route', '🧭']].map(([k, l]) => `<button type="button" data-sb="dbtn" data-v="${k}" class="${(D.dock.btns || []).includes(k) ? 'on' : ''}">${l}</button>`).join('')}</div><div class="sb-note">До 3 кнопок.</div>` : ''))
      + card('📣 Оголошення вгорі', tgl('ann.on', 'Показувати стрічку') + (D.ann?.on ? tr2('ann.t', 'Текст', 140) + text('ann.u', 'Посилання (необовʼязково)', '#book або https://…', 300) + `<div class="sb-cols">${color('ann.c', 'Колір')}</div><label class="sb-f">Показувати до (включно)<input type="date" data-p="ann.till" value="${esc(D.ann.till || '')}"></label>` : ''))
      + card('💬 «Написати нам»', tgl('chat', 'Кнопка в контактах: гість пише → повідомлення в стрічці каси й у групі'), 'Відповідь піде гостю в Telegram, якщо він заходив у бот гостей; інакше — зателефонуйте.'),
    hrs: () => card('🕐 Години по днях', D.hours ? `<div class="sb-hrs">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((d, i) => `<div><b>${d}</b><input type="time" data-p="hours.${i}.f" value="${esc(D.hours[i]?.f || '')}"><input type="time" data-p="hours.${i}.t" value="${esc(D.hours[i]?.t || '')}"><label class="sb-tg"><input type="checkbox" data-p="hours.${i}.off" ${D.hours[i]?.off ? 'checked' : ''}><span>вихідний</span></label></div>`).join('')}</div><button type="button" class="btn sm" data-sb="hrsOff">✕ Однакові щодня</button>` : `<div class="sb-note">Зараз щодня ${esc(C.site.from)}–${esc(C.site.to)}.</div><button type="button" class="btn sm" data-sb="hrsOn">🗓 Задати по днях</button>`, 'Порожні години дня = загальні. «Відчинено / Зачинено» на сайті рахується за сьогоднішнім днем.')
      + card('📍 Кілька адрес', `<div class="sb-list">${(D.addrs || []).map((a, i) => `<div class="sb-li"><span>${esc(a.n || a.a)}</span><span><button type="button" data-sb="aed" data-i="${i}">✏️</button><button type="button" data-sb="rm" data-p="addrs" data-i="${i}">🗑</button></span></div>`).join('') || '<div class="sb-note">Основна адреса — у розділі «🌐 Сайт». Тут — додаткові точки мережі.</div>'}</div>${(D.addrs || []).length < 5 ? '<button type="button" class="btn sm" data-sb="aed" data-i="-1">➕ Адреса</button>' : ''}`),
    soc: () => card('📲 Соцмережі', [['insta', '📸 Instagram'], ['tg', '✈️ Telegram'], ['tiktok', '🎵 TikTok'], ['fb', '📘 Facebook'], ['viber', '💜 Viber (viber://…)'], ['yt', '▶️ YouTube']].map(([k, l]) => text('soc.' + k, l, k === 'viber' ? 'viber://chat?number=%2B380…' : 'https://…', 300)).join(''), 'Показуються в контактах і в блоці «📲 Соцмережі». Посилання мають починатися з https://')
      + card('🔳 QR-код сайту', `<div class="sb-qr" id="sbQr"></div><div class="sb-row"><button type="button" class="btn sm" data-sb="qrDl">⬇️ Завантажити PNG</button></div>`, 'Для друку на столи, флаєри й вітрину. Веде на вашу візитку.'),
    seo: () => card('🔍 Google і соцмережі', text('seo.title', 'Назва вкладки / в пошуку', C.site.name, 70) + text('seo.desc', 'Опис у пошуку (до 180 символів)', 'Що ви за заклад, де, чим особливі', 180, true), 'Іконка вкладки береться з логотипа.')
      + card('🌍 Мови', `<label class="sb-tg"><input type="checkbox" data-sb="langs" ${D.langs !== 0 ? 'checked' : ''}><span>Перемикач UA / EN на сайті</span></label>${D.langs !== 0 ? '<div class="sb-row"><button type="button" class="btn sm" data-sb="aiTr">🤖 Перекласти мої тексти на EN</button></div>' : ''}`, 'Переклад — безкоштовним ШІ, до 5 разів на день. Перекладає лише порожні EN-поля.')
      + card('🤖 Текст «Про нас»', '<div class="sb-row"><button type="button" class="btn sm" data-sb="aiAbout">🤖 Написати чернетку</button></div>', 'ШІ складе 3–4 речення з назви, адреси й меню. Ви побачите текст і вирішите, чи зберегти.'),
    sea: () => card('🎉 Сезонне оформлення', chips('season.k', [['', 'Без'], ['ny', '🎄 Новий рік'], ['hw', '🎃 Хелловін'], ['summer', '☀️ Літо'], ['easter', '🌷 Великдень'], ['love', '💘 14 лютого']]) + `<label class="sb-f">Вимкнути саме після<input type="date" data-p="season.till" value="${esc(D.season?.till || '')}"></label>`, 'Акцентний колір і декор, що падає. Після дати вимикається само.'),
    ver: () => card('🕰 Попередні версії', '<div id="sbVer" class="sb-list"><div class="sb-note">…</div></div>', 'Зберігаються 5 останніх публікацій. «Повернути» кладе версію в чернетку — далі «💾 Опублікувати».')
      + card('📋 Код стилю', `<div class="sb-row"><button type="button" class="btn sm" data-sb="code">📋 Скопіювати код</button><button type="button" class="btn sm" data-sb="codeIn">📥 Вставити код</button></div>`, 'Тема й головний екран одним рядком — щоб перенести дизайн в інший заклад.'),
    st: () => card('📊 За 30 днів', '<div id="sbSt"><div class="sb-note">…</div></div>', 'Перегляд рахується раз за візит гостя; натискання — раз на кнопку.'),
  };
  const MTABS = [['tpl', '🧩 Шаблон'], ['col', '🎨 Кольори й фон'], ['font', '🔤 Шрифти'], ['card', '🗂 Картки страв'], ['ph', '🖼 Фото страв'], ['cats', '📑 Розділи'], ['btn', '➕ Кнопки й ціни'], ['top', '🏷 Шапка'], ['ver', '🕰 Версії й код']];
  const MV = {
    tpl: () => card('🧩 Готовий стиль меню', `<div class="sb-tpls">${Object.entries(MTPL).map(([k, [l, t]]) => { const x = { ...MDEF, ...t }; return tile(k, l, x); }).join('')}</div>`, 'Змінює все оформлення меню. Страви, ціни й фото не чіпає — вони редагуються в розділі «🍽 Меню».')
      + card('🔗 Інше', `<div class="sb-row"><button type="button" class="btn sm" data-sb="mFromSite">🌐 Як на сайті-візитці</button><button type="button" class="btn sm" data-sb="std">↩️ Стандартний вигляд</button></div>`),
    col: () => V.col(), font: () => V.font(),
    card: () => preTheme() + card('🗂 Вигляд страв', chips('theme.lay', [['grid', '▦ Сітка'], ['list', '☰ Список з фото'], ['big', '▭ Великі фото'], ['text', '📜 Без фото']]) + (get('theme.lay') === 'grid' ? range('theme.cols', 'Карток у ряд на телефоні', 1, 3) : ''), 'Напої й додатки лишаються компактними, щоб меню не розтягувалось.')
      + card('🔲 Картки', chips('theme.cards', [['line', 'З рамкою'], ['shadow', 'З тінню'], ['flat', 'Плоскі']]) + '<div class="muted" style="font-size:12px;margin:10px 0 4px">🔷 Форма вікон</div>' + chips('theme.shp', [['', 'Звичайні'], ['arch', 'Арка'], ['ticket', 'Квиток'], ['cut', 'Зрізані кути'], ['notch', 'Загнутий кут'], ['slant', 'Скіс'], ['leaf', 'Листок'], ['bubble', 'Бульбашка'], ['pill', 'Капсула'], ['sketch', 'Від руки'], ['brutal', 'Брутал'], ['deco', 'Ар-деко'], ['neon', 'Неон'], ['glass', 'Скло'], ['scallop', 'Хвиля знизу'], ['frame', 'Рамка з відступом'], ['folder', 'Папка'], ['line', 'Лише лінія'], ['brackets', 'Кутики'], ['polaroid', 'Полароїд']]) + range('theme.r', 'Заокруглення', 0, 28, 'px'))
      + card('📝 Що показувати', tgl('theme.desc', 'Опис страви') + tgl('theme.size', 'Вага / обʼєм') + tgl('theme.caps', 'НАЗВИ СТРАВ ВЕЛИКИМИ')),
    ph: () => preTheme() + card('🖼 Фон під фото страв', '<div class="sb-ph">' + chips('theme.phbg', [['tex', 'Текстура (класика)'], ['card', 'Колір картки'], ['accent', 'Відтінок акценту'], ['color', 'Свій колір'], ['img', 'Фото / текстура'], ['none', 'Прозорий']])
        + (get('theme.phbg') === 'color' ? `<div class="sb-cols">${color('theme.phC', 'Колір фону')}</div>` : '')
        + (get('theme.phbg') === 'img' ? imgf('theme.phImg', 'Фон під фото') + `<div class="sb-lib">${BGLIB.map(n => `<button type="button" data-sb="libPh" data-u="img/site/${n}.webp" style="background-image:url('img/site/${n}.webp')"></button>`).join('')}</div>` : '') + '</div>', 'Фото страв з прозорим фоном (PNG) лежать на цьому фоні.')
      + card('📐 Форма фото', '<div class="sb-ph"><div class="sb-lbl">Пропорції</div>' + chips('theme.ratio', [['1', '◻ Квадрат'], ['4/3', '▭ 4:3'], ['16/9', '▬ 16:9'], ['3/4', '▯ 3:4']]) + '<div class="sb-lbl">Як вміщати фото</div>' + chips('theme.fit', [['contain', 'Вписати цілком'], ['cover', 'Заповнити (обрізати)']]) + '</div>'),
    cats: () => preTheme() + card('📑 Вкладки розділів', chips('theme.cats', [['pill', 'Таблетки'], ['line', 'Підкреслення'], ['box', 'Квадратні']]) + tgl('theme.catsSticky', 'Прилипають угорі при прокрутці'))
      + card('🔠 Заголовки розділів', chips('theme.ttl', [['l', '⬅ Ліворуч'], ['c', '⬌ По центру']]) + tgl('theme.ttlLine', 'Лінія біля заголовка') + range('theme.ttlSz', 'Розмір', 18, 44, 'px')),
    btn: () => preTheme() + card('➕ Кнопка «додати»', chips('theme.add', [['round', 'Кнопка'], ['plus', 'Лише +'], ['wide', 'На всю ширину']]) + chips('theme.btn', [['fill', 'Заливка'], ['line', 'Контур'], ['pill', 'Таблетка']]))
      + card('💰 Ціна', chips('theme.price', [['accent', 'Кольором акценту'], ['text', 'Кольором тексту']])),
    top: () => preTheme() + card('🏷 Шапка', tgl('theme.logo', 'Логотип біля назви') + '<div class="sb-note">Логотип і назва — у розділі «🏪 Заклад».</div>')
      + card('📣 Стрічка над меню', text('theme.note.t', 'Текст (порожньо — не показувати)', 'напр. Кухня працює до 22:00', 120) + `<div class="sb-cols">${color('theme.note.c', 'Колір')}</div>`),
    ver: () => card('🕰 Попередні версії', '<div id="sbVer" class="sb-list"><div class="sb-note">…</div></div>', 'Зберігаються 5 останніх публікацій.')
      + card('📋 Код стилю', `<div class="sb-row"><button type="button" class="btn sm" data-sb="code">📋 Скопіювати код</button><button type="button" class="btn sm" data-sb="codeIn">📥 Вставити код</button></div>`),
  };
  const blocks = () => { const l = D.blocks?.length ? D.blocks : []; for (const id of Object.keys(STD)) if (!l.some(b => b.id === id)) l.push({ id, on: 1 }); D.blocks = l; return l; };

  // ---------- малювання ----------
  function draw() {
    const box = document.getElementById('sbP'); if (!box) return; const sy = box.scrollTop;
    box.innerHTML = sub ? sub.html() : (M === 'menu' ? MV : V)[tab]();
    box.scrollTop = sub ? 0 : sy;
    document.querySelectorAll('#sb .sb-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    document.getElementById('sbPub').classList.toggle('dirty', dirty);
    if (!sub && tab === 'soc' && M === 'site') qr(); if (!sub && tab === 'ver') ver(); if (!sub && tab === 'st') stats();
  }
  function push() { clearTimeout(tmr); tmr = setTimeout(() => { try { frame?.contentWindow?.postMessage(M === 'menu' ? { vvMenu: D.menuTheme || null, brand: { logo: C.site.logo, name: C.site.name } } : { vvSite: D }, location.origin); } catch {} }, 90); }
  const touch = () => { dirty = true; document.getElementById('sbPub')?.classList.add('dirty'); push(); };

  const keys = () => (M === 'menu' ? ['menuTheme'] : KEYS);
  function open(ctx, mode = 'site') {
    fontsCss(); M = mode; C = ctx; O = {}; for (const k of keys()) O[k] = clone(ctx.site[k]); D = clone(O); dirty = false; tab = 'tpl'; sub = null; pv = false;
    const url = (M === 'menu' ? ctx.url.replace('about.html', 'index.html') : ctx.url) + (ctx.url.includes('?') ? '&' : '?') + 'preview=1';
    document.body.insertAdjacentHTML('beforeend', `<div id="sb"><div class="sb-top"><button type="button" class="btn sm" data-sb="close">✕</button><b>${M === 'menu' ? '🍽 Конструктор меню' : '🎨 Конструктор сайту'}</b><span class="sb-sp"></span><button type="button" class="btn sm sb-pvb" data-sb="pv">👁 Перегляд</button><button type="button" class="btn sm" data-sb="undo" title="Скасувати зміни">↩️<span class="sb-lbl"> Скасувати</span></button><button type="button" class="btn sm primary" id="sbPub" data-sb="pub">💾<span class="sb-lbl"> Опублікувати</span></button></div>
      <div class="sb-body"><div class="sb-side"><div class="sb-tabs">${(M === 'menu' ? MTABS : TABS).map(([k, l]) => `<button type="button" data-sb="tab" data-t="${k}">${l}</button>`).join('')}</div><div class="sb-p" id="sbP"></div></div>
      <div class="sb-view"><div class="sb-dev"><button type="button" data-sb="dev" data-w="390" class="on">📱</button><button type="button" data-sb="dev" data-w="0">💻</button></div><div class="sb-fw"><iframe id="sbF" src="${esc(url)}" title="Перегляд"></iframe></div></div></div></div>`);
    frame = document.getElementById('sbF'); document.body.style.overflow = 'hidden';
    draw();
  }
  function close(force) {
    if (!force && dirty && !confirm('Закрити без публікації? Зміни пропадуть.')) return;
    document.getElementById('sb')?.remove(); document.body.style.overflow = ''; C = null;
  }
  addEventListener('message', e => { if (C && e.origin === location.origin && e.data?.vvReady) push(); });

  // ---------- картинки ----------
  const pickImg = (max = 1600) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => { const f = i.files[0]; if (!f) return res(null); const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .82)); }; im.src = URL.createObjectURL(f); }; i.click(); });
  async function upload() { const data = await pickImg(); if (!data) return null; C.toast('⏳ Завантажую фото…'); try { return (await C.vapi('sitePhoto', { data, raw: 1 })).url; } catch (e) { C.toast('⚠️ ' + e.message); return null; } }
  // 🪄 палітра з картинки (у браузері, без ШІ)
  function palette(src) {
    return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { try {
      const c = document.createElement('canvas'), n = 48; c.width = n; c.height = n; const x = c.getContext('2d'); x.drawImage(im, 0, 0, n, n); const d = x.getImageData(0, 0, n, n).data, B = {};
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const k = [d[i], d[i + 1], d[i + 2]].map(v => v >> 5).join(); (B[k] ||= { n: 0, r: 0, g: 0, b: 0 }); const o = B[k]; o.n++; o.r += d[i]; o.g += d[i + 1]; o.b += d[i + 2]; }
      const cs = Object.values(B).map(o => { const r = o.r / o.n, g = o.g / o.n, b = o.b / o.n, mx = Math.max(r, g, b), mn = Math.min(r, g, b); return { n: o.n, r, g, b, sat: mx ? (mx - mn) / mx : 0, lum: .299 * r + .587 * g + .114 * b }; });
      const acc = cs.filter(c => c.sat > .35 && c.lum > 60 && c.lum < 220).sort((a, b) => b.n * b.sat - a.n * a.sat)[0] || cs.sort((a, b) => b.n - a.n)[0];
      res(acc); } catch (e) { rej(e); } }; im.onerror = rej; im.src = src; });
  }
  const h2 = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const shade = (c, k) => '#' + [c.r, c.g, c.b].map(v => Math.round(v * k).toString(16).padStart(2, '0')).join('');

  // ---------- QR ----------
  let qrLib;
  async function qr() {
    const box = document.getElementById('sbQr'); if (!box) return;
    if (!window.QRCode) { qrLib ||= new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; s.onload = res; s.onerror = rej; document.head.append(s); }); try { await qrLib; } catch { box.textContent = '⚠️ Не вдалося завантажити генератор QR'; return; } }
    box.innerHTML = ''; new QRCode(box, { text: C.pub || C.url, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
  }

  async function ver() {
    const box = document.getElementById('sbVer'); if (!box) return;
    try { const l = (await C.vapi(M === 'menu' ? 'siteMenuVer' : 'siteVer')).list; C._ver = l; box.innerHTML = l.length ? l.map((x, i) => `<div class="sb-li"><span>${new Date(x.at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${(x.d.theme || x.d.menuTheme) ? ` <i class="sb-dot" style="background:${(x.d.theme || x.d.menuTheme).accent}"></i>` : ' · стандартний'}</span><span><button type="button" class="btn sm" data-sb="verBack" data-i="${i}">↩️ Повернути</button></span></div>`).join('') : '<div class="sb-note">Ще не публікували</div>'; } catch (e) { box.textContent = '⚠️ ' + e.message; }
  }
  async function stats() {
    const box = document.getElementById('sbSt'); if (!box) return;
    try { const r = await C.vapi('siteStats'), days = Object.entries(r.days).sort(), mx = Math.max(1, ...days.map(d => d[1]));
      box.innerHTML = `<div class="sb-kpi">${[['👁 Перегляди', r.v], ['🛵 Замовити', r.order], ['📞 Дзвінки', r.call], ['📅 Бронь', r.book], ['🧭 Маршрут', r.route]].map(([l, n]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>${days.length ? `<div class="sb-bars">${days.map(([d, n]) => `<i title="${d.slice(8)}.${d.slice(5, 7)}: ${n}" style="height:${Math.max(3, n / mx * 100)}%"></i>`).join('')}</div>` : '<div class="sb-note">Даних ще немає — лічильник щойно увімкнено.</div>'}`; } catch (e) { box.textContent = '⚠️ ' + e.message; }
  }

  // ---------- форми-підвікна (свій блок, подія, адреса) ----------
  function subForm(title, p, body) { sub = { html: () => `<div class="sb-subh"><button type="button" class="btn sm" data-sb="subBack">← Назад</button><b>${title}</b></div>${body()}<div class="sb-row"><button type="button" class="btn sm primary" data-sb="subBack">✅ Готово</button></div>` }; draw(); }
  function editBlock(i) {
    const b = blocks()[i], p = `blocks.${i}`;
    if (!b.type) return subForm(STD[b.id], p, () => card('✏️ Свій заголовок', tr2(p + '.t', 'Заголовок', 60), 'Порожньо — стандартний заголовок.'));
    subForm(CT[b.type], p, () => {
      let h = b.type === 'sep' ? '<div class="sb-note">Розділювач без налаштувань.</div>' : b.type === 'quote' ? '' : tr2(p + '.t', 'Заголовок', 60);
      if (['text', 'media', 'quote'].includes(b.type)) h += tr2(p + '.txt', b.type === 'quote' ? 'Цитата' : 'Текст', 1500, true);
      if (b.type === 'quote') h += text(p + '.by', 'Автор', 'напр. Олена, гість', 60);
      if (b.type === 'media') h += imgf(p + '.img', 'Фото') + chips(p + '.side', [['l', 'Фото ліворуч'], ['r', 'Фото праворуч']]);
      if (b.type === 'feats') h += `<div class="sb-list">${(b.items || []).map((x, j) => `<div class="sb-it"><input data-p="${p}.items.${j}.e" maxlength="4" value="${esc(x.e || '')}" placeholder="🍕"><input data-p="${p}.items.${j}.l.uk" maxlength="50" value="${esc(x.l?.uk || '')}" placeholder="Підпис"><button type="button" data-sb="rm" data-p="${p}.items" data-i="${j}">✕</button></div>`).join('')}</div>${(b.items || []).length < 8 ? `<button type="button" class="btn sm" data-sb="push" data-p="${p}.items">➕ Плитка</button>` : ''}`;
      if (b.type === 'links') h += `<div class="sb-list">${(b.links || []).map((x, j) => `<div class="sb-it"><input data-p="${p}.links.${j}.l.uk" maxlength="30" value="${esc(x.l?.uk || '')}" placeholder="Текст"><input data-p="${p}.links.${j}.u" maxlength="300" value="${esc(x.u || '')}" placeholder="https://… / #book / tel:"><button type="button" data-sb="rm" data-p="${p}.links" data-i="${j}">✕</button></div>`).join('')}</div>${(b.links || []).length < 6 ? `<button type="button" class="btn sm" data-sb="push" data-p="${p}.links">➕ Кнопка</button>` : ''}`;
      if (b.type === 'soc') h += '<div class="sb-note">Посилання беруться з вкладки «📲 Соцмережі й QR».</div>';
      return card('✏️ Вміст', h);
    });
  }
  function editEvent(i) {
    if (i < 0) { (D.events ||= []).push({ id: rid(), d: today(), tm: '19:00', t: { uk: '', en: '' }, txt: { uk: '', en: '' }, img: '', book: 1 }); i = D.events.length - 1; touch(); }
    const p = `events.${i}`;
    subForm('🎵 Подія', p, () => card('✏️ Подія', `<div class="sb-tr"><label class="sb-f">Дата<input type="date" data-p="${p}.d" value="${esc(get(p + '.d'))}"></label><label class="sb-f">Час<input type="time" data-p="${p}.tm" value="${esc(get(p + '.tm') || '')}"></label></div>${tr2(p + '.t', 'Назва', 80)}${tr2(p + '.txt', 'Опис', 400, true)}${imgf(p + '.img', 'Фото / афіша')}${tgl(p + '.book', '📅 Кнопка «Забронювати» на цю дату')}`));
  }
  function editAddr(i) {
    if (i < 0) { (D.addrs ||= []).push({ n: '', a: '', h: '', p: '', m: '' }); i = D.addrs.length - 1; touch(); }
    const p = `addrs.${i}`;
    subForm('📍 Адреса', p, () => card('✏️ Точка', text(p + '.n', 'Назва', 'напр. Центр', 60) + text(p + '.a', 'Адреса', 'вул. …', 200) + text(p + '.h', 'Години', '10:00–22:00', 60) + text(p + '.p', 'Телефон', '+380…', 30) + text(p + '.m', 'Посилання на Google Maps', 'https://maps.app.goo.gl/…', 300)));
  }

  // ---------- дії ----------
  document.addEventListener('click', async e => {
    const el = e.target.closest('#sb [data-sb]'); if (!el || !C) return; const a = el.dataset.sb, d = el.dataset;
    if (a === 'close') return close();
    if (a === 'tab') { tab = d.t; sub = null; document.getElementById('sb').classList.remove('pv'); return draw(); }
    if (a === 'pv') { pv = !pv; document.getElementById('sb').classList.toggle('pv', pv); el.textContent = pv ? '✏️ Редагувати' : '👁 Перегляд'; return; }
    if (a === 'dev') { document.querySelectorAll('#sb .sb-dev button').forEach(b => b.classList.toggle('on', b === el)); document.querySelector('#sb .sb-fw').style.maxWidth = +d.w ? d.w + 'px' : ''; return; }
    if (a === 'undo') { if (dirty && !confirm('Скасувати всі зміни в чернетці?')) return; D = clone(O); dirty = false; sub = null; push(); return draw(); }
    if (a === 'pub') {
      el.disabled = true; el.textContent = '⏳';
      try { const r = await C.vapi('siteSet', { k: M === 'menu' ? 'menuDesign' : 'siteDesign', v: D }); C.site = r.site; O = {}; for (const k of keys()) O[k] = clone(r.site[k]); D = clone(O); dirty = false; C.toast(M === 'menu' ? '✅ Опубліковано — меню оновиться за хвилину' : '✅ Опубліковано — сайт оновиться за хвилину'); push(); C.onSave?.(r.site); }
      catch (x) { C.toast('⚠️ ' + x.message); }
      el.disabled = false; el.innerHTML = '💾<span class="sb-lbl"> Опублікувати</span>'; return draw();
    }
    if (a === 'subBack') { sub = null; return draw(); }
    if (a === 'pick') { const top = d.p.split('.')[0]; need(top); set(d.p, d.v); touch(); return draw(); }
    if (a === 'tpl' && M === 'menu') { D.menuTheme = { ...clone(MDEF), ...clone(MTPL[d.k][1]) }; touch(); C.toast('🧩 ' + MTPL[d.k][0]); return draw(); }
    if (a === 'mFromSite') { if (!C.site.theme) return C.toast('На сайті стандартний вигляд — спершу оформіть сайт'); D.menuTheme = { ...clone(MDEF), ...clone(C.site.theme), r: Math.max(6, C.site.theme.r - 4) }; touch(); return draw(); }
    if (a === 'libPh') { need('theme'); D.menuTheme.phImg = d.u; touch(); return draw(); }
    if (a === 'tpl') { const [, t, h] = TPL[d.k]; D.theme = { ...t, menu: D.theme?.menu || 0 }; D.heroCfg = { ...(D.heroCfg || clone(HDEF)), ...h }; touch(); C.toast('🧩 ' + TPL[d.k][0]); return draw(); }
    if (a === 'zero') { if (!confirm('Почати з нуля? Усі блоки, крім «Контакти», буде приховано (тексти не видаляються).')) return; D.heroCfg = { ...clone(HDEF), lay: 'plain', btns: ['call'], badge: 1, addr: 1 }; D.blocks = Object.keys(STD).map(id => ({ id, on: id === 'contacts' ? 1 : 0 })); D.dock = { on: 0, btns: [] }; D.ann = { on: 0 }; touch(); tab = 'blk'; return draw(); }
    if (a === 'std') { if (M === 'menu') D.menuTheme = null; else { D.theme = null; D.heroCfg = null; } touch(); return draw(); }
    if (a === 'pal') { need('theme'); const [bg, cd, tx, ac, ink] = PAL[+d.i]; Object.assign(D[TK()], { bg, card: cd, text: tx, accent: ac, ink, mode: ['#f', '#e'].some(x => bg.startsWith(x)) ? 'light' : 'dark' }); touch(); return draw(); }
    if (a === 'logoPal') { const src = C.site.logo || C.site.hero; if (!src) return C.toast('Спершу додайте логотип або головне фото в «🌐 Сайт»'); try { const c = await palette(src); need('theme'); const dark = D[TK()].mode !== 'light'; Object.assign(D[TK()], { accent: h2(c), ink: c.lum > 150 ? '#141414' : '#ffffff', ...(dark ? { bg: shade(c, .08), card: shade(c, .14) } : { bg: '#' + [c.r, c.g, c.b].map(v => Math.round(245 + (v - 245) * .06).toString(16).padStart(2, '0')).join(''), card: '#ffffff' }) }); touch(); C.toast('🪄 Кольори підібрано'); return draw(); } catch { return C.toast('⚠️ Не вдалося прочитати картинку'); } }
    if (a === 'lib') { need('theme'); D[TK()].bgImg = d.u; touch(); return draw(); }
    if (a === 'img') { const u = await upload(); if (!u) return; const top = d.p.split('.')[0]; need(top); set(d.p, u); touch(); return draw(); }
    if (a === 'imgDel') { set(d.p, ''); touch(); return draw(); }
    if (a === 'mv' || a === 'rm' || a === 'add' || a === 'push') {
      const top = d.p.split('.')[0]; need(top); let l = get(d.p); if (!Array.isArray(l)) { l = []; set(d.p, l); } const i = +d.i;
      if (a === 'mv') { const j = i + +d.m; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; }
      if (a === 'rm') l.splice(i, 1);
      if (a === 'add') l.push(d.v);
      if (a === 'push') l.push(d.p.endsWith('.items') ? { e: '', l: { uk: '' } } : { l: { uk: '' }, u: '' });
      touch(); return draw();
    }
    if (a === 'bmv') { const l = blocks(), i = +d.i, j = i + +d.m; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; touch(); return draw(); }
    if (a === 'bon') { const b = blocks()[+d.i]; b.on = b.on ? 0 : 1; touch(); return draw(); }
    if (a === 'bed') return editBlock(+d.i);
    if (a === 'bdel') { if (!confirm('Видалити блок?')) return; blocks().splice(+d.i, 1); touch(); return draw(); }
    if (a === 'badd') { const l = blocks(); if (l.filter(b => b.type).length >= 10) return C.toast('До 10 своїх блоків'); const b = { id: 'c_' + rid(), type: d.v, on: 1, t: { uk: '', en: '' } }; if (['text', 'media', 'quote'].includes(d.v)) b.txt = { uk: '', en: '' }; if (d.v === 'feats') b.items = [{ e: '🍽', l: { uk: 'Власні рецепти' } }, { e: '🛵', l: { uk: 'Доставка' } }, { e: '🎉', l: { uk: 'Банкети' } }]; if (d.v === 'links') b.links = [{ l: { uk: '📅 Забронювати' }, u: '#book' }]; if (d.v === 'media') b.side = 'l'; const ci = l.findIndex(x => x.id === 'contacts'); l.splice(ci < 0 ? l.length : ci, 0, b); touch(); return editBlock(l.indexOf(b)); }
    if (a === 'eed') return editEvent(+d.i);
    if (a === 'aed') return editAddr(+d.i);
    if (a === 'dbtn') { D.dock ||= { on: 1, btns: [] }; const l = D.dock.btns ||= []; const i = l.indexOf(d.v); if (i >= 0) l.splice(i, 1); else { if (l.length >= 3) return C.toast('До 3 кнопок'); l.push(d.v); } touch(); return draw(); }
    if (a === 'hrsOn') { D.hours = Array.from({ length: 7 }, () => ({ f: C.site.from, t: C.site.to, off: 0 })); touch(); return draw(); }
    if (a === 'hrsOff') { D.hours = null; touch(); return draw(); }
    if (a === 'qrDl') { const c = document.querySelector('#sbQr canvas'), im = document.querySelector('#sbQr img'); const src = c ? c.toDataURL('image/png') : im?.src; if (!src) return; const l = document.createElement('a'); l.href = src; l.download = 'qr-site.png'; l.click(); return; }
    if (a === 'verBack') { const x = C._ver?.[+d.i]; if (!x) return; for (const k of keys()) if (k in x.d) D[k] = clone(x.d[k]); else if (['theme', 'heroCfg', 'menuTheme'].includes(k)) D[k] = null; touch(); C.toast('↩️ Версію в чернетці — перегляньте й опублікуйте'); return draw(); }
    if (a === 'code') { const s = M === 'menu' ? 'VARVAR-MENU ' + JSON.stringify({ menuTheme: D.menuTheme }) : 'VARVAR-SITE ' + JSON.stringify({ theme: D.theme, heroCfg: D.heroCfg }); try { await navigator.clipboard.writeText(s); C.toast('📋 Код скопійовано'); } catch { prompt('Скопіюйте код:', s); } return; }
    if (a === 'codeIn') { const s = prompt('Вставте код стилю (VARVAR-SITE {…})'); if (!s) return; try { const j = JSON.parse(s.replace(/^\s*VARVAR-(SITE|MENU)\s*/, '')); if (M === 'menu') { if (j.menuTheme !== undefined) D.menuTheme = j.menuTheme; else if (j.theme) D.menuTheme = { ...clone(MDEF), ...j.theme }; } else if (j.theme !== undefined) D.theme = j.theme; if (j.heroCfg !== undefined) D.heroCfg = j.heroCfg; touch(); C.toast('📥 Стиль у чернетці'); return draw(); } catch { return C.toast('⚠️ Невірний код'); } }
    if (a === 'aiTr') {
      const F = []; const add = (o, k) => { if (o?.[k]?.uk && !o[k].en) F.push([o[k], o[k].uk]); };
      for (const b of blocks()) { add(b, 't'); add(b, 'txt'); (b.items || []).forEach(x => add(x, 'l')); (b.links || []).forEach(x => add(x, 'l')); }
      (D.events || []).forEach(e => { add(e, 't'); add(e, 'txt'); }); add(D.ann, 't');
      if (!F.length) return C.toast('Немає що перекладати — усі EN-поля заповнені');
      el.disabled = true; el.textContent = '⏳ Перекладаю…';
      try { const r = await C.vapi('siteAi', { do: 'tr', texts: F.map(f => f[1]) }); r.list.forEach((x, i) => { if (x) F[i][0].en = x; }); touch(); C.toast(`🌍 Перекладено ${r.list.filter(Boolean).length} (залишилось сьогодні: ${r.left})`); } catch (x) { C.toast('⚠️ ' + x.message); }
      return draw();
    }
    if (a === 'aiAbout') {
      el.disabled = true; el.textContent = '⏳ Пишу…';
      try { const r = await C.vapi('siteAi', { do: 'about', name: C.site.name, addr: C.site.addr, tag: C.site.tagline, cats: C.cats || '' }); el.disabled = false; el.textContent = '🤖 Написати чернетку';
        const v = prompt(`Чернетка «Про нас» (можна виправити). OK — зберегти на сайті одразу. Залишилось сьогодні: ${r.left}`, r.text); if (v) { await C.vapi('siteSet', { k: 'about', v }); C.site.about = v; C.toast('💾 «Про нас» збережено'); frame?.contentWindow?.location.reload(); } }
      catch (x) { el.disabled = false; el.textContent = '🤖 Написати чернетку'; C.toast('⚠️ ' + x.message); }
      return;
    }
  });
  document.addEventListener('change', e => {
    const el = e.target; if (!C || !el.closest('#sb')) return;
    if (el.dataset.sb === 'langs') { D.langs = el.checked ? 1 : 0; touch(); return draw(); }
    if (!el.dataset.p) return; const top = el.dataset.p.split('.')[0];
    if (el.type === 'checkbox') { need(top); set(el.dataset.p, el.checked ? 1 : 0); touch(); if (['dock.on', 'ann.on'].includes(el.dataset.p)) { if (el.dataset.p === 'dock.on' && el.checked && !D.dock.btns?.length) D.dock.btns = ['call', 'order', 'book']; if (el.dataset.p === 'ann.on' && !D.ann.c) D.ann.c = '#f2c14e'; draw(); } return; }
    if (el.type === 'date' || el.type === 'time' || el.type === 'color') { need(top); set(el.dataset.p, el.value); touch(); }
  });
  document.addEventListener('input', e => {
    const el = e.target; if (!C || !el.closest('#sb') || !el.dataset.p || el.type === 'checkbox') return; const top = el.dataset.p.split('.')[0]; need(top);
    set(el.dataset.p, el.type === 'range' ? +el.value : el.value); if (el.type === 'range') { const o = document.querySelector(`#sb [data-o="${el.dataset.p}"]`); if (o) o.textContent = el.value + (el.dataset.u || ''); }
    touch();
  });
  addEventListener('beforeunload', e => { if (C && dirty) { e.preventDefault(); e.returnValue = ''; } });
  return { open };
})();
