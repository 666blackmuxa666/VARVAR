// Початкові дані меню. Запуск: node tools/menu-data.mjs → data/menu.json
// УВАГА: після запуску бота меню живе на сервері (KV) і редагується через Telegram;
// цей файл — лише стартова копія / резерв, якщо сервер недоступний.
// crop: [сторінка PDF, x, y, w, h] у координатах сторінки шириною 1300px
import { writeFileSync } from 'node:fs';

const cats = [];
const cat = (id, uk, en) => { const c = { id, name: { uk, en }, items: [] }; cats.push(c); return c; };
// i(категорія, id, crop, [uk, en], розмір, ціна | [[варіант, ціна]...], [складUk, складEn])
const i = (c, id, crop, [uk, en], size, price, desc) => c.items.push({
  id, name: { uk, en }, size,
  ...(Array.isArray(price) ? { variants: price.map(([v, p]) => ({ v, p })) } : { price }),
  ...(desc ? { desc: { uk: desc[0], en: desc[1] } } : {}),
  ...(crop ? { img: `img/${id}.png`, crop } : {}),
});

let c = cat('minimax', 'Мінімакс', 'Minimax');
i(c, 'kurochka', [1, 147, 485, 295, 455], ['Курочка', 'Kurochka'], '400 г', 370, ['Коржик, куряче філе, листя салату, в\'ялені томати, авокадо, оливки, соус зелений, сир фета', 'Flatbread, chicken fillet, lettuce, sun-dried tomatoes, avocado, olives, green sauce, feta']);
i(c, 'mesko', [1, 874, 110, 316, 455], ['Мєско', 'Mesko'], '450 г', 380, ['Коржик, свинина, картопля фрі, листя салату, перець, кукурудза, соус часниковий', 'Flatbread, pork, fries, lettuce, bell pepper, corn, garlic sauce']);
i(c, 'maxwell', [1, 874, 874, 308, 448], ['Максвел', 'Maxwell'], '420 г', 390, ['Коржик, телятина, картопля фрі, листя салату, цибуля кранч, бекон, в\'ялені томати, соус часниковий, соус айолі', 'Flatbread, veal, fries, lettuce, crispy onion, bacon, sun-dried tomatoes, garlic sauce, aioli']);
i(c, 'grand', [1, 162, 1227, 286, 440], ['Гранд', 'Grand'], '420 г', 320, ['Коржик, куряче філе, листя салату, помідор, картопля фрі, соус часниковий, айолі', 'Flatbread, chicken fillet, lettuce, tomato, fries, garlic sauce, aioli']);
i(c, 'fusion', [2, 145, 120, 300, 460], ['Фюжен', 'Fusion'], '400 г', 410, ['Коржик, креветки, авокадо, помідори чері, кукурудза, листя салату, соус зелений', 'Flatbread, shrimp, avocado, cherry tomatoes, corn, lettuce, green sauce']);
i(c, 'mixi', [2, 870, 395, 310, 490], ['Міксі', 'Mixi'], '350 г', 380, ['Коржик, тунець, сир фета, листя салату, цибуля карамелізована, огірок, помідори чері, соус теріякі', 'Flatbread, tuna, feta, lettuce, caramelized onion, cucumber, cherry tomatoes, teriyaki sauce']);

c = cat('pasta', 'Пасти', 'Pasta');
i(c, 'carbonara', [2, 105, 975, 415, 415], ['Карбонара', 'Carbonara'], '320 г', 290, ['Тальятеле, бекон, жовток яйця, пармезан, вершки, базилік', 'Tagliatelle, bacon, egg yolk, parmesan, cream, basil']);
i(c, 'pasta-shrimp', [2, 780, 1255, 420, 420], ['Паста з креветками', 'Shrimp pasta'], '320 г', 350, ['Тальятеле, креветки, в\'ялені томати, вино біле, базилік, вершки', 'Tagliatelle, shrimp, sun-dried tomatoes, white wine, basil, cream']);

c = cat('burgers', 'Бургери', 'Burgers');
i(c, 'bum', [3, 820, 190, 380, 340], ['Бум', 'Boom'], '400 г', 330, ['Куряча котлета, огірок маринований, сир чеддер, соус BBQ, кетчуп, картопля фрі', 'Chicken patty, pickles, cheddar, BBQ sauce, ketchup, fries']);
i(c, 'mumo', [3, 100, 435, 410, 380], ['Мумо', 'Mumo'], '460 г', 420, ['Теляча котлета, бекон, листя салату, помідор, сир чеддер, соус BBQ, маринований огірок, картопля фрі', 'Veal patty, bacon, lettuce, tomato, cheddar, BBQ sauce, pickles, fries']);
i(c, 'b310', [3, 815, 840, 370, 480], ['Б-310', 'B-310'], '570 г', 540, ['2 курячі котлети, листя салату, помідор, сир чеддер, бекон, карамелізована цибуля, соус BBQ, кетчуп, маринований огірок, картопля фрі', '2 chicken patties, lettuce, tomato, cheddar, bacon, caramelized onion, BBQ sauce, ketchup, pickles, fries']);
i(c, 'diablo', [3, 0, 1305, 505, 340], ['Діабло', 'Diablo'], '460 г', 420, ['Свинна котлета, бекон, сир чеддер, листя салату, соус айолі, перець чилі, огірок маринований, картопля фрі, соус BBQ', 'Pork patty, bacon, cheddar, lettuce, aioli, chili pepper, pickles, fries, BBQ sauce']);
i(c, 'shchisti', [4, 0, 205, 490, 330], ['Щісті', 'Shchisti'], '400 г', 350, ['Куряча котлета, листя салату, помідор, соус айолі, кетчуп, сир чеддер, карамелізована цибуля, картопля фрі', 'Chicken patty, lettuce, tomato, aioli, ketchup, cheddar, caramelized onion, fries']);
i(c, 'horunia', [4, 775, 680, 410, 350], ['Горунья', 'Horunia'], '480 г', 440, ['Свинина, листя салату, бекон, яйце, помідор, сир чеддер, соус айолі, кетчуп, маринований огірок, картопля фрі', 'Pork, lettuce, bacon, egg, tomato, cheddar, aioli, ketchup, pickles, fries']);
i(c, 'cheesy', [4, 120, 1045, 355, 440], ['Чізі', 'Cheesy'], '470 г', 470, ['2 телячі котлети, 3 види сиру, соус пармезан, кетчуп, картопля фрі', '2 veal patties, 3 kinds of cheese, parmesan sauce, ketchup, fries']);

c = cat('salads', 'Салати', 'Salads');
i(c, 'khrum', [5, 65, 185, 415, 410], ['Хрум', 'Khrum'], '300 г', 250, ['Огірки, помідори, цибуля, грецькі горіхи, оливкова олія, сік лимона', 'Cucumbers, tomatoes, onion, walnuts, olive oil, lemon juice']);
i(c, 'fantasia', [5, 805, 530, 420, 410], ['Фантазія', 'Fantasia'], '250 г', 380, ['Креветки, листя салату, помідори черрі, груша, сир пармезан, мікс горіхів', 'Shrimp, lettuce, cherry tomatoes, pear, parmesan, mixed nuts']);
i(c, 'gama', [5, 65, 870, 410, 405], ['Гама', 'Gama'], '250 г', 250, ['Листя салату, помідор черрі, сир пармезан, цибуля карамелізована, куряче філе, коржик, соус айолі', 'Lettuce, cherry tomatoes, parmesan, caramelized onion, chicken fillet, flatbread, aioli']);
i(c, 'breezon', [5, 810, 1225, 410, 410], ['Брізон', 'Breezon'], '250 г', 380, ['Тунець, мікс салату, помідори черрі, сир фета, авокадо, перець болгарський', 'Tuna, mixed greens, cherry tomatoes, feta, avocado, bell pepper']);

c = cat('snacks', 'Закуски', 'Snacks');
i(c, 'board-max', [6, 120, 110, 380, 550], ['Дошка MAX', 'MAX board'], '2000 г', 1950, ['Коржик сирний, 4 види м\'яса (1.2 кг), картопля фрі, 3 види соусів, овочі гриль', 'Cheese flatbread, 4 kinds of meat (1.2 kg), fries, 3 sauces, grilled vegetables']);
i(c, 'meat-plate', [6, 820, 500, 390, 400], ['М\'ясне плато', 'Meat platter'], '230 г', 390, ['Бастурма, кабаноси, копчене філе курки, мисливські ковбаски, гірчиця американська', 'Basturma, kabanosy, smoked chicken fillet, hunter sausages, American mustard']);
i(c, 'beer-board', [6, 75, 860, 425, 430], ['Дошка до пива', 'Beer board'], '150 г', 265, ['Снеки, кабаноси, цибулеві кільця, соус сирний', 'Chips, kabanosy, onion rings, cheese sauce']);
i(c, 'shrimp-grill', [6, 815, 1220, 400, 400], ['Креветки гриль', 'Grilled shrimp'], '100 г м\'яса', 290, ['Креветки, соус кисло-солодкий, листя салату, лимон', 'Shrimp, sweet & sour sauce, lettuce, lemon']);
i(c, 'nuggets', [4, 860, 1470, 230, 170], ['Нагетси', 'Nuggets'], '200 г', 120);
i(c, 'solonyna', [8, 960, 335, 215, 400], ['Солонина', 'Pickles plate'], '150 г', 220, ['Гриби, помідори, огірки', 'Pickled mushrooms, tomatoes, cucumbers']);

c = cat('soups', 'Перші страви', 'Soups');
i(c, 'bograch', [7, 95, 200, 385, 385], ['Бограч', 'Bograch'], '450 г', 270, ['Свинина, телятина, перець чилі, перець болгарський, морква, картопля, цибуля', 'Pork, veal, chili, bell pepper, carrot, potato, onion']);
i(c, 'broth', [7, 815, 540, 385, 385], ['Бульйон', 'Chicken broth'], '450 г', 190, ['Куряче філе, морква, локшина', 'Chicken fillet, carrot, noodles']);

c = cat('pans', 'Пательні', 'Skillets');
i(c, 'pan-sausage', [7, 105, 935, 380, 400], ['Пательня з ковбасками', 'Skillet with sausages'], '420 г', 350, ['Мисливські ковбаски, картопля, перець чилі, печериці, цибуля', 'Hunter sausages, potatoes, chili, mushrooms, onion']);
i(c, 'pan-chicken', [7, 820, 1215, 380, 425], ['Пательня з куркою', 'Skillet with chicken'], '420 г', 330, ['Куряче філе, шпинат, печериці, вершки, пармезан і моцарела, картопля', 'Chicken fillet, spinach, mushrooms, cream, parmesan & mozzarella, potatoes']);
i(c, 'pan-bacon', [8, 115, 135, 355, 420], ['Пательня з беконом', 'Skillet with bacon'], '420 г', 350, ['Бекон, картопля, перець чилі, печериці, цибуля', 'Bacon, potatoes, chili, mushrooms, onion']);

c = cat('extras', 'Додатки до страв', 'Extras');
[['pork', 'Свинне м\'ясо', 'Pork', '100 г', 70], ['chicken', 'Куряче м\'ясо', 'Chicken', '100 г', 60], ['bacon', 'Бекон', 'Bacon', '50 г', 70], ['tomatoes', 'Помідори', 'Tomatoes', '50 г', 35],
 ['cherry', 'Помідор черрі', 'Cherry tomatoes', '50 г', 45], ['mushrooms', 'Печериці', 'Mushrooms', '50 г', 35], ['bread', 'Хліб', 'Bread', '1 шт', 5], ['grill-veg', 'Овочі гриль', 'Grilled vegetables', '100 г', 90],
 ['sausage', 'Ковбаса мисливська', 'Hunter sausage', '100 г', 70], ['pickle', 'Огірок маринований', 'Pickles', '50 г', 40], ['corn', 'Кукурудза', 'Corn', '20 г', 30], ['corn-grill', 'Кукурудза гриль', 'Grilled corn', '100 г', 60],
 ['pepper', 'Перець болгарський', 'Bell pepper', '50 г', 55], ['chili', 'Перець чилі', 'Chili pepper', '50 г', 60], ['chips', 'Снеки', 'Chips', '30 г', 50], ['potato-country', 'Картопля по-селянськи', 'Country potatoes', '200 г', 80],
 ['fries-l', 'Картопля фрі L', 'Fries L', '150 г', 70], ['fries-xl', 'Картопля фрі XL', 'Fries XL', '250 г', 90], ['s-garlic', 'Соус часниковий', 'Garlic sauce', '30 г', 30], ['s-bbq', 'Соус BBQ', 'BBQ sauce', '30 г', 45],
 ['s-aioli', 'Соус айолі', 'Aioli', '30 г', 40], ['s-green', 'Соус зелений', 'Green sauce', '30 г', 40], ['s-cheese', 'Соус сирний', 'Cheese sauce', '30 г', 55], ['s-sweet', 'Соус кисло-солодкий', 'Sweet & sour sauce', '30 г', 40],
 ['flatbread', 'Коржик', 'Flatbread', '1 шт', 40], ['onion-rings', 'Цибулеві кільця', 'Onion rings', '200 г', 95], ['mozzarella', 'Сир моцарела', 'Mozzarella', '50 г', 50], ['feta', 'Сир фета', 'Feta', '50 г', 55],
 ['sour-cream', 'Сметана', 'Sour cream', '30 г', 20], ['nuts', 'Горішки', 'Nuts', '60 г', 80], ['smoked-chicken', 'Копчена курка', 'Smoked chicken', '50 г', 70], ['basturma', 'Бастурма', 'Basturma', '50 г', 85],
].forEach(([id, uk, en, s, p]) => i(c, 'x-' + id, null, [uk, en], s, p));

c = cat('coffee', 'Кава і чай', 'Coffee & tea');
i(c, 'espresso', [9, 80, 95, 110, 95], ['Еспресо', 'Espresso'], '', 65);
i(c, 'americano', [9, 140, 200, 140, 130], ['Американо', 'Americano'], '', 65);
i(c, 'cappuccino', [9, 175, 345, 150, 140], ['Капучіно', 'Cappuccino'], '', 75);
i(c, 'latte', [9, 110, 490, 135, 200], ['Лате', 'Latte'], '', 85);
i(c, 'tea', [9, 710, 160, 200, 225], ['Чай в асортименті', 'Tea selection'], '0.7 л', 120, ['Чорний, зелений, фруктовий', 'Black, green, fruit']);
i(c, 'tea-carpathian', [9, 710, 160, 200, 225], ['Чай карпатський з медом', 'Carpathian tea with honey'], '0.7 л', 150);
i(c, 'tea-raspberry', [9, 535, 490, 140, 200], ['Чай малиновий', 'Raspberry tea'], '0.35 л', 95);
i(c, 'tea-buckthorn', [9, 920, 480, 135, 210], ['Чай обліпиховий', 'Sea buckthorn tea'], '0.35 л', 95);

c = cat('soft', 'Безалкогольні напої', 'Soft drinks');
const sizes = [['0.33', 60], ['0.5', 70], ['1.0', 90]];
i(c, 'pepsi', [9, 60, 860, 95, 175], ['Pepsi', 'Pepsi'], 'л', sizes);
i(c, 'sprite', [9, 325, 860, 90, 175], ['Sprite', 'Sprite'], 'л', sizes);
i(c, '7up', [9, 185, 1075, 95, 170], ['7-Up', '7-Up'], 'л', sizes);
i(c, 'mirinda', [9, 475, 1075, 100, 170], ['Mirinda', 'Mirinda'], 'л', sizes);
i(c, 'tonic', [9, 610, 860, 50, 175], ['Тонік', 'Tonic'], '0.33 л', 60);
i(c, 'water', [9, 830, 860, 60, 175], ['Вода', 'Water'], '0.5 л', 60);
i(c, 'redbull', [9, 1060, 860, 65, 170], ['Red Bull', 'Red Bull'], '0.25 л', 105);
i(c, 'sandora', [9, 795, 1075, 280, 170], ['Сік Sandora', 'Sandora juice'], 'л', [['0.33', 80], ['0.5', 110], ['1.0', 220]]);

c = cat('lemonades', 'Безалкогольні коктейлі', 'Mocktails');
i(c, 'lemonade-raspberry', [9, 50, 1450, 160, 260], ['Лимонад малина', 'Raspberry lemonade'], '0.30 л', 150);
i(c, 'cola-cherry', [9, 410, 1450, 140, 260], ['Cola-Cherry', 'Cola-Cherry'], '0.30 л', 150);
i(c, 'lemonade', [9, 745, 1455, 140, 260], ['Лимонад', 'Lemonade'], '0.35 л', 135);
i(c, 'lemonade-passion', [9, 1065, 1460, 150, 260], ['Лимонад маракуя', 'Passion fruit lemonade'], '0.30 л', 160);

c = cat('cocktails', 'Коктейлі', 'Cocktails');
i(c, 'tequila-sunrise', [12, 45, 25, 150, 300], ['Текіла Санрайз', 'Tequila Sunrise'], '0.35 л', 240, ['Casco Viejo, апельсиновий сік, гренадін', 'Casco Viejo, orange juice, grenadine']);
i(c, 'blue-lagoon', [12, 1110, 25, 145, 290], ['Блакитна лагуна', 'Blue Lagoon'], '0.40 л', 200, ['Спрайт, горілка, Blue Curacao, лимон, ананасовий сік', 'Sprite, vodka, Blue Curacao, lemon, pineapple juice']);
i(c, 'sex-beach', [12, 485, 290, 140, 280], ['Секс на пісочку', 'Sex on the Beach'], '0.40 л', 230, ['Горілка, сицилійський манговий, апельсиновий сік, гренадін', 'Vodka, Sicilian mango, orange juice, grenadine']);
i(c, 'sokyra', [12, 680, 240, 130, 320], ['Сокира', 'Sokyra'], '0.35 л', 250, ['Bombay Sapphire, Blue Curacao, малинове пюре, ананасовий сік, білок', 'Bombay Sapphire, Blue Curacao, raspberry purée, pineapple juice, egg white']);
i(c, 'bukhas', [12, 25, 560, 180, 290], ['Бухас', 'Bukhas'], '0.30 л', 240, ['Bacardi Spiced, Becherovka, Amaretto, сироп маракуя, яблучний сік', 'Bacardi Spiced, Becherovka, Amaretto, passion fruit syrup, apple juice']);
i(c, 'mojito', [12, 1080, 580, 180, 270], ['Бакарді Мохіто', 'Bacardi Mojito'], '0.30 л', 230, ['Bacardi Carta Blanca, спрайт, лайм, м\'ята', 'Bacardi Carta Blanca, Sprite, lime, mint']);
i(c, 'spice-cola', [12, 470, 860, 190, 290], ['Спайс Кола', 'Spice Cola'], '0.30 л', 240, ['Bacardi Spiced, сік лайма, лайм, Pepsi', 'Bacardi Spiced, lime juice, lime, Pepsi']);
i(c, 'blue-islands', [12, 690, 845, 130, 320], ['Блакитні острови', 'Blue Islands'], '0.40 л', 280, ['Малібу, сік ананасовий, Blue Curacao, Bacardi Carta Blanca, Carta Negra', 'Malibu, pineapple juice, Blue Curacao, Bacardi Carta Blanca, Carta Negra']);
i(c, 'long-island', [12, 30, 1180, 175, 290], ['Лонг-Айленд', 'Long Island'], '0.30 л', 250, ['Bacardi Carta Negra, горілка, Casco Viejo, Triple Sec, лайм, Pepsi', 'Bacardi Carta Negra, vodka, Casco Viejo, Triple Sec, lime, Pepsi']);
i(c, 'rum-kiwi', [12, 1035, 1150, 245, 310], ['Ром ківі', 'Rum Kiwi'], '0.30 л', 230, ['Bacardi Carta Blanca, ківі, спрайт, лимон, полуничний сироп, банановий лікер', 'Bacardi Carta Blanca, kiwi, Sprite, lemon, strawberry syrup, banana liqueur']);
i(c, 'bombay-tonic', [12, 500, 1545, 155, 160], ['Бомбей тонік', 'Bombay Tonic'], '0.18 л', 250, ['Bombay Sapphire, Schweppes Tonic, лайм', 'Bombay Sapphire, Schweppes Tonic, lime']);
i(c, 'negroni', [12, 690, 1525, 160, 180], ['Негроні', 'Negroni'], '0.20 л', 240, ['Bombay Sapphire, Martini Bitter, Martini Rosso, апельсин', 'Bombay Sapphire, Martini Bitter, Martini Rosso, orange']);
i(c, 'red-sky', [13, 40, 30, 180, 340], ['Ред Скай', 'Red Sky'], '0.25 л', 260, ['Aperol, Bombay Sapphire, сироп грейпфрут, апельсиновий сік, лимонний фреш, цукровий сироп', 'Aperol, Bombay Sapphire, grapefruit syrup, orange juice, fresh lemon, sugar syrup']);
i(c, 'redbull-can', [13, 1040, 30, 190, 475], ['Баночка Редбула', 'Red Bull Can'], '0.35 л', 340, ['Горілка, Triple Sec, Beefeater, Espolon, Captain Morgan, Red Bull, Blue Curacao', 'Vodka, Triple Sec, Beefeater, Espolon, Captain Morgan, Red Bull, Blue Curacao']);
i(c, 'fiero-tonic', [13, 485, 390, 135, 315], ['Фієро тонік', 'Fiero Tonic'], '0.35 л', 230, ['Martini Fiero, Schweppes Tonic, апельсин', 'Martini Fiero, Schweppes Tonic, orange']);
i(c, 'tropic-sour', [13, 645, 370, 145, 330], ['Тропік саувер', 'Tropic Sour'], '0.18 л', 250, ['Ром Bacardi Coconut, лікер м\'ята, сироп кокосовий, ананасовий сік', 'Bacardi Coconut rum, mint liqueur, coconut syrup, pineapple juice']);
i(c, 'aperol', [13, 85, 730, 155, 320], ['Апероль Шпріц', 'Aperol Spritz'], '0.45 л', 250, ['Aperol, шампанське, спрайт, апельсин', 'Aperol, sparkling wine, Sprite, orange']);
i(c, 'mulled-wine', [13, 1010, 730, 275, 330], ['Глінтвейн', 'Mulled wine'], '0.35 л', 150, ['Червоне вино, апельсин, сік вишня, кориця, лимон', 'Red wine, orange, cherry juice, cinnamon, lemon']);
i(c, 'angel', [13, 500, 1020, 90, 330], ['Ангел', 'Angel'], '0.20 л', 230, ['Triple Sec, Бейліс, лікер банановий, сік ананасовий, вершки', 'Triple Sec, Baileys, banana liqueur, pineapple juice, cream']);
i(c, 'tiramisu', [13, 615, 1045, 200, 305], ['Тірамісу', 'Tiramisu'], '0.24 л', 280, ['Бейліс, кавовий лікер, вершки, кокосове молоко', 'Baileys, coffee liqueur, cream, coconut milk']);
i(c, 'dewars-sour', [13, 20, 1405, 240, 240], ['Dewars Саувер', 'Dewar\'s Sour'], '0.12 л', 280, ['Dewars, ангостура, білок, сироп, вишня, лимонний сік', 'Dewar\'s, Angostura, egg white, syrup, cherry, lemon juice']);
i(c, 'jagerbull', [13, 1075, 1330, 145, 320], ['Єгербул', 'Jägerbull'], '0.35 л', 270, ['Jägermeister, Red Bull, гренадін, апельсин', 'Jägermeister, Red Bull, grenadine, orange']);

c = cat('shots', 'Шоти', 'Shots');
i(c, 'rozryad', [14, 80, 115, 140, 230], ['Розряд', 'Rozryad'], '0.05 л', 150, ['Єгермейстер, апельсиновий сік, лікер диня', 'Jägermeister, orange juice, melon liqueur']);
i(c, 'napalm', [14, 1095, 120, 135, 225], ['Напал', 'Napalm'], '0.05 л', 170, ['Самбука, вершки, Бейліс, гренадін, Блю Курасао', 'Sambuca, cream, Baileys, grenadine, Blue Curacao']);
i(c, 'melon', [14, 530, 395, 130, 225], ['Диня', 'Melon'], '0.05 л', 160, ['Бейліс, гренадін, лікер диня', 'Baileys, grenadine, melon liqueur']);
i(c, 'rastafari', [14, 685, 375, 150, 245], ['Растафарі', 'Rastafari'], '0.05 л', 170, ['Абсент, Martini Fiero, сироп банановий, горілка', 'Absinthe, Martini Fiero, banana syrup, vodka']);
i(c, 'medusa', [14, 85, 785, 140, 225], ['Медуза', 'Medusa'], '0.05 л', 190, ['Малібу, Бейліс, ром Бакарді, Куантро, Блю Курасао', 'Malibu, Baileys, Bacardi rum, Cointreau, Blue Curacao']);
i(c, 'matrix', [14, 1065, 665, 195, 400], ['Матриця', 'Matrix'], '0.25 л', 190, ['Самбука, Блю Курасао, сироп гренадін, лікер Тріпл Сек, спрайт, горілка', 'Sambuca, Blue Curacao, grenadine, Triple Sec, Sprite, vodka']);
i(c, 'bronepoizd', [14, 340, 1125, 630, 290], ['Бронепоїзд', 'Armored Train'], '0.75 л', 480, ['Абсент, самбука, Тріпл Сек, сироп, Єгермейстер, горілка, спрайт', 'Absinthe, sambuca, Triple Sec, syrup, Jägermeister, vodka, Sprite']);
i(c, 'b52', [14, 70, 1460, 150, 250], ['B-52', 'B-52'], '0.05 л', 195, ['Куантро, Бейліс, Калуа', 'Cointreau, Baileys, Kahlúa']);
i(c, 'death', [14, 1110, 1450, 160, 260], ['Смерть на місці', 'Instant Death'], '0.05 л', 190, ['Абсент, самбука, горілка, гренадін, Бейліс', 'Absinthe, sambuca, vodka, grenadine, Baileys']);

// Алкоголь: [id, назва, сторінка, x, y, w, h, обʼєм, ціна]
const bottles = (id, uk, en, rows) => { const k = cat(id, uk, en); rows.forEach(([bid, n, pg, x, y, w, h, v, p]) => i(k, bid, [pg, x, y, w, h], [n, n], v + ' л', p)); };
bottles('whisky', 'Віскі', 'Whisky', [
  ['jack', 'Jack Daniel\'s', 10, 75, 190, 90, 265, '0.05', 195], ['red-label', 'Red Label', 10, 230, 190, 75, 265, '0.05', 150],
  ['jim-beam', 'Jim Beam', 10, 380, 190, 80, 265, '0.05', 170], ['jameson', 'Jameson', 10, 525, 190, 85, 265, '0.05', 195],
  ['dewars-wl', 'Dewar\'s White Label', 10, 690, 185, 80, 270, '0.05', 135], ['dewars-8', 'Dewar\'s 8 YO', 10, 845, 185, 80, 270, '0.05', 180],
  ['dewars-12', 'Dewar\'s 12 YO', 10, 1000, 185, 80, 270, '0.05', 195], ['aberfeldy', 'Aberfeldy 12 YO', 10, 1140, 185, 130, 270, '0.05', 350]]);
bottles('rum', 'Ром', 'Rum', [
  ['bacardi-spiced', 'Bacardi Spiced', 10, 230, 700, 80, 315, '0.05', 150], ['bacardi-blanca', 'Bacardi Carta Blanca', 10, 385, 700, 85, 315, '0.05', 150],
  ['bacardi-negra', 'Bacardi Carta Negra', 10, 535, 700, 80, 315, '0.05', 150], ['bacardi-8', 'Bacardi 8 YO', 10, 695, 700, 115, 315, '0.05', 170],
  ['oakheart', 'Oakheart', 10, 880, 700, 85, 315, '0.05', 140], ['bacardi-coconut', 'Bacardi Coconut', 10, 1035, 700, 95, 315, '0.05', 150]]);
bottles('vermouth', 'Вермут', 'Vermouth', [
  ['martini-dry', 'Martini Extra Dry', 10, 285, 1255, 95, 315, '0.05', 95], ['martini-bianco', 'Martini Bianco', 10, 465, 1255, 95, 315, '0.05', 95],
  ['martini-rosso', 'Martini Rosso', 10, 635, 1255, 95, 315, '0.05', 95], ['martini-fiero', 'Martini Fiero', 10, 815, 1255, 95, 315, '0.05', 95],
  ['martini-bitter', 'Martini Bitter', 10, 995, 1255, 85, 315, '0.05', 110]]);
bottles('liqueur', 'Лікер', 'Liqueur', [
  ['jager', 'Jägermeister', 11, 100, 125, 135, 320, '0.05', 150], ['becherovka', 'Becherovka', 11, 290, 125, 115, 320, '0.05', 135],
  ['sambuca', 'Sambuca Molinari', 11, 505, 125, 75, 320, '0.025', 130]]);
bottles('cognac', 'Коньяк', 'Cognac & brandy', [
  ['metaxa', 'Metaxa', 11, 800, 125, 85, 320, '0.05', 150], ['hennessy', 'Hennessy', 11, 940, 125, 120, 320, '0.05', 350],
  ['askaneli', 'Askaneli', 11, 1135, 125, 85, 320, '0.05', 140]]);
bottles('vodka', 'Горілка', 'Vodka', [
  ['hetman', 'Гетьман', 11, 65, 620, 80, 315, '0.05', 70], ['finlandia', 'Finlandia', 11, 215, 620, 75, 315, '0.05', 120],
  ['grey-goose', 'Grey Goose', 11, 360, 620, 75, 315, '0.05', 190]]);
bottles('tequila', 'Текіла', 'Tequila', [
  ['casco-viejo', 'Casco Viejo', 11, 555, 620, 110, 310, '0.05', 155], ['patron', 'Patrón Silver', 11, 725, 620, 190, 310, '0.05', 350]]);
bottles('gin', 'Джин', 'Gin', [
  ['larios', 'Larios 12', 11, 1010, 620, 100, 310, '0.05', 160], ['bombay', 'Bombay Sapphire', 11, 1150, 620, 105, 310, '0.05', 195]]);
bottles('wine', 'Вино і настоянки', 'Wine & liqueurs', [
  ['nastoyanky', 'Настоянки', 11, 170, 1060, 75, 280, '0.05', 70], ['botticello', 'Botticello', 11, 435, 1060, 80, 280, '0.10', 120],
  ['jp-chenet', 'J.P. Chenet', 11, 605, 1065, 85, 275, '0.10', 130], ['martini-asti', 'Martini Asti', 11, 775, 1065, 90, 275, '0.75', 1200],
  ['alazani', 'Алазанська долина', 11, 955, 1065, 60, 275, '0.10', 120], ['kindzmarauli', 'Кіндзмараулі', 11, 1115, 1065, 60, 275, '0.10', 130]]);
bottles('beer', 'Пиво', 'Beer', [
  ['beer', 'Опілля', 11, 190, 1470, 60, 240, '0.5', 110], ['kronenbourg', 'Kronenbourg 1664', 11, 395, 1470, 65, 240, '0.46', 140],
  ['corona', 'Corona Extra', 11, 580, 1470, 60, 240, '0.33', 170], ['blanc-draft', 'Blanc 1664 (розлив)', 11, 745, 1470, 170, 240, '0.50', 150],
  ['grimbergen', 'Grimbergen (розлив)', 11, 1030, 1470, 170, 240, '0.50', 170]]);
// англійські назви, що відрізняються
const en = { hetman: 'Hetman', nastoyanky: 'House infusions', alazani: 'Alazani Valley', kindzmarauli: 'Kindzmarauli', beer: 'Beer selection (Opillia)', 'blanc-draft': 'Blanc 1664 (draft)', 'grimbergen': 'Grimbergen (draft)' };
cats.forEach(k => k.items.forEach(it => { if (en[it.id]) it.name.en = en[it.id]; }));

c = cat('hookah', 'Кальян', 'Hookah');
i(c, 'hookah-silver', [15, 215, 245, 130, 110], ['Кальян Silver', 'Hookah Silver'], '', 700);
i(c, 'hookah-gold', [15, 85, 470, 145, 155], ['Кальян Gold', 'Hookah Gold'], '', 750);
i(c, 'hookah-platinum', [15, 15, 715, 140, 130], ['Кальян Platinum', 'Hookah Platinum'], '', 800);

const menu = { currency: 'грн', categories: cats.map(k => ({ ...k, items: k.items.map(({ crop, ...r }) => r) })) };
writeFileSync(new URL('../data/menu.json', import.meta.url), JSON.stringify(menu));
writeFileSync(new URL('../tools/crops.json', import.meta.url), JSON.stringify(cats.flatMap(k => k.items.filter(x => x.crop).map(x => [x.id, ...x.crop]))));
console.log(cats.reduce((s, k) => s + k.items.length, 0), 'items');
