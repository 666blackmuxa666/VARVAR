// Переклад меню на інші мови. Основа — англійська версія з меню (name.en / desc.en).
// Склад перекладається по словах із TERMS; назви — з NAMES (бренди й власні назви лишаються як є).
// Нові страви, додані через бота, показуються англійською, доки їх не додано сюди.
(() => {
  const TERMS = `2 chicken patties|2 veal patties|3 kinds of cheese|3 sauces|4 kinds of meat (1.2 kg)|american mustard|bbq sauce|bacon|basturma|black
cheese flatbread|chicken fillet|chicken patty|chips|cucumbers|cucumber|flatbread|hunter sausages|lettuce|pickled mushrooms
pork|pork patty|red wine|shrimp|sicilian mango|tuna|veal patty|vodka|apple juice|avocado
banana liqueur|banana syrup|basil|bell pepper|caramelized onion|carrot|cheese sauce|cherry|cherry juice|cherry tomatoes
chili|chili pepper|cinnamon|coconut milk|coconut syrup|coffee liqueur|corn|cream|crispy onion|egg
egg white|egg yolk|fresh lemon|fries|fruit|garlic sauce|grapefruit syrup|green|green sauce|grilled vegetables
kiwi|lemon|lemon juice|lime|lime juice|melon liqueur|mint|mint liqueur|mixed greens|mixed nuts
mushrooms|noodles|olive oil|olives|onion|onion rings|orange|orange juice|parmesan & mozzarella|parmesan sauce
passion fruit syrup|pear|pickles|pineapple juice|potato|potatoes|raspberry purée|smoked chicken fillet|sparkling wine|spinach
strawberry syrup|sugar syrup|sun-dried tomatoes|sweet & sour sauce|syrup|teriyaki sauce|tomato|tomatoes|veal|walnuts
white wine`;
  const NAMES = `pasta-shrimp|board-max|meat-plate|beer-board|shrimp-grill|nuggets|solonyna|broth|pan-sausage|pan-chicken|pan-bacon
x-pork|x-chicken|x-bacon|x-tomatoes|x-cherry|x-mushrooms|x-bread|x-grill-veg|x-sausage|x-pickle
x-corn|x-corn-grill|x-pepper|x-chili|x-chips|x-potato-country|x-fries-l|x-fries-xl|x-s-garlic|x-s-bbq
x-s-green|x-s-cheese|x-s-sweet|x-flatbread|x-onion-rings|x-sour-cream|x-nuts|x-smoked-chicken
tea|tea-carpathian|tea-raspberry|tea-buckthorn|tonic|water|sandora|lemonade-raspberry|lemonade|lemonade-passion
mulled-wine|bronepoizd|death|nastoyanky|beer|blanc-draft|grimbergen`;
  const CATS = `minimax|pasta|burgers|salads|snacks|soups|pans|extras
coffee|soft|lemonades|cocktails|shots|whisky|rum|vermouth
liqueur|cognac|vodka|tequila|gin|wine|beer|hookah`;

  const L = {
    pl: {
      t: `2 kotlety z kurczaka|2 kotlety cielęce|3 rodzaje sera|3 sosy|4 rodzaje mięsa (1,2 kg)|musztarda amerykańska|sos BBQ|boczek|basturma|czarna
placek z serem|filet z kurczaka|kotlet z kurczaka|chipsy|ogórki|ogórek|placek|kiełbaski myśliwskie|sałata|marynowane grzyby
wieprzowina|kotlet wieprzowy|czerwone wino|krewetki|mango sycylijskie|tuńczyk|kotlet cielęcy|wódka|sok jabłkowy|awokado
likier bananowy|syrop bananowy|bazylia|papryka|karmelizowana cebula|marchew|sos serowy|wiśnia|sok wiśniowy|pomidorki koktajlowe
chili|papryczka chili|cynamon|mleko kokosowe|syrop kokosowy|likier kawowy|kukurydza|śmietanka|chrupiąca cebula|jajko
białko|żółtko|świeża cytryna|frytki|owocowa|sos czosnkowy|syrop grejpfrutowy|zielona|zielony sos|grillowane warzywa
kiwi|cytryna|sok z cytryny|limonka|sok z limonki|likier melonowy|mięta|likier miętowy|mix sałat|mix orzechów
grzyby|makaron|oliwa z oliwek|oliwki|cebula|krążki cebulowe|pomarańcza|sok pomarańczowy|parmezan i mozzarella|sos parmezanowy
syrop z marakui|gruszka|ogórki kiszone|sok ananasowy|ziemniaki|ziemniaki|puree malinowe|wędzony filet z kurczaka|wino musujące|szpinak
syrop truskawkowy|syrop cukrowy|suszone pomidory|sos słodko-kwaśny|syrop|sos teriyaki|pomidor|pomidory|cielęcina|orzechy włoskie
białe wino`,
      n: `Makaron z krewetkami|Deska MAX|Talerz wędlin|Deska do piwa|Krewetki z grilla|Nuggetsy|Kiszonki|Rosół z kurczaka|Patelnia z kiełbaskami|Patelnia z kurczakiem|Patelnia z boczkiem
Wieprzowina|Kurczak|Boczek|Pomidory|Pomidorki koktajlowe|Grzyby|Chleb|Grillowane warzywa|Kiełbaska myśliwska|Ogórki kiszone
Kukurydza|Kukurydza z grilla|Papryka|Papryczka chili|Chipsy|Ziemniaki po wiejsku|Frytki L|Frytki XL|Sos czosnkowy|Sos BBQ
Zielony sos|Sos serowy|Sos słodko-kwaśny|Placek|Krążki cebulowe|Śmietana|Orzechy|Wędzony kurczak
Herbata do wyboru|Herbata karpacka z miodem|Herbata malinowa|Herbata z rokitnika|Tonik|Woda|Sok Sandora|Lemoniada malinowa|Lemoniada|Lemoniada z marakui
Grzane wino|Pociąg pancerny|Natychmiastowa śmierć|Domowe nalewki|Piwo do wyboru (Opillia)|Blanc 1664 (z beczki)|Grimbergen (z beczki)`,
      c: `Minimax|Makarony|Burgery|Sałatki|Przekąski|Zupy|Patelnie|Dodatki
Kawa i herbata|Napoje|Koktajle bezalkoholowe|Koktajle|Shoty|Whisky|Rum|Wermut
Likier|Koniak i brandy|Wódka|Tequila|Gin|Wino i nalewki|Piwo|Fajka wodna`,
    },
    de: {
      t: `2 Hähnchen-Patties|2 Kalbs-Patties|3 Käsesorten|3 Saucen|4 Fleischsorten (1,2 kg)|amerikanischer Senf|BBQ-Sauce|Speck|Basturma|schwarz
Käsefladen|Hähnchenfilet|Hähnchen-Patty|Chips|Gurken|Gurke|Fladenbrot|Jägerwürstchen|Salat|eingelegte Pilze
Schweinefleisch|Schweine-Patty|Rotwein|Garnelen|sizilianische Mango|Thunfisch|Kalbs-Patty|Wodka|Apfelsaft|Avocado
Bananenlikör|Bananensirup|Basilikum|Paprika|karamellisierte Zwiebeln|Karotte|Käsesauce|Kirsche|Kirschsaft|Kirschtomaten
Chili|Chilischote|Zimt|Kokosmilch|Kokossirup|Kaffeelikör|Mais|Sahne|Röstzwiebeln|Ei
Eiweiß|Eigelb|frische Zitrone|Pommes|Frucht|Knoblauchsauce|Grapefruitsirup|grün|grüne Sauce|Grillgemüse
Kiwi|Zitrone|Zitronensaft|Limette|Limettensaft|Melonenlikör|Minze|Minzlikör|gemischter Salat|Nussmischung
Pilze|Nudeln|Olivenöl|Oliven|Zwiebel|Zwiebelringe|Orange|Orangensaft|Parmesan & Mozzarella|Parmesansauce
Maracujasirup|Birne|Essiggurken|Ananassaft|Kartoffeln|Kartoffeln|Himbeerpüree|geräuchertes Hähnchenfilet|Schaumwein|Spinat
Erdbeersirup|Zuckersirup|getrocknete Tomaten|Süß-Sauer-Sauce|Sirup|Teriyaki-Sauce|Tomate|Tomaten|Kalbfleisch|Walnüsse
Weißwein`,
      n: `Pasta mit Garnelen|MAX-Brett|Fleischplatte|Bierbrett|Gegrillte Garnelen|Nuggets|Eingelegtes|Hühnerbrühe|Pfanne mit Würstchen|Pfanne mit Hähnchen|Pfanne mit Speck
Schweinefleisch|Hähnchen|Speck|Tomaten|Kirschtomaten|Pilze|Brot|Grillgemüse|Jägerwürstchen|Essiggurken
Mais|Gegrillter Mais|Paprika|Chilischote|Chips|Landkartoffeln|Pommes L|Pommes XL|Knoblauchsauce|BBQ-Sauce
Grüne Sauce|Käsesauce|Süß-Sauer-Sauce|Fladenbrot|Zwiebelringe|Saure Sahne|Nüsse|Geräuchertes Hähnchen
Teeauswahl|Karpaten-Tee mit Honig|Himbeertee|Sanddorntee|Tonic|Wasser|Sandora-Saft|Himbeerlimonade|Limonade|Maracuja-Limonade
Glühwein|Panzerzug|Sofortiger Tod|Hausgemachte Liköre|Bierauswahl (Opillia)|Blanc 1664 (vom Fass)|Grimbergen (vom Fass)`,
      c: `Minimax|Pasta|Burger|Salate|Snacks|Suppen|Pfannen|Beilagen
Kaffee & Tee|Softdrinks|Alkoholfreie Cocktails|Cocktails|Shots|Whisky|Rum|Wermut
Likör|Cognac & Brandy|Wodka|Tequila|Gin|Wein & Liköre|Bier|Shisha`,
    },
    fr: {
      t: `2 steaks de poulet|2 steaks de veau|3 sortes de fromage|3 sauces|4 sortes de viande (1,2 kg)|moutarde américaine|sauce barbecue|bacon|basturma|noir
galette au fromage|filet de poulet|steak de poulet|chips|concombres|concombre|galette|saucisses de chasseur|laitue|champignons marinés
porc|steak de porc|vin rouge|crevettes|mangue de Sicile|thon|steak de veau|vodka|jus de pomme|avocat
liqueur de banane|sirop de banane|basilic|poivron|oignon caramélisé|carotte|sauce fromage|cerise|jus de cerise|tomates cerises
piment|piment rouge|cannelle|lait de coco|sirop de coco|liqueur de café|maïs|crème|oignon frit|œuf
blanc d'œuf|jaune d'œuf|citron frais|frites|fruits|sauce à l'ail|sirop de pamplemousse|vert|sauce verte|légumes grillés
kiwi|citron|jus de citron|citron vert|jus de citron vert|liqueur de melon|menthe|liqueur de menthe|mesclun|mélange de noix
champignons|nouilles|huile d'olive|olives|oignon|rondelles d'oignon|orange|jus d'orange|parmesan & mozzarella|sauce parmesan
sirop de fruit de la passion|poire|cornichons|jus d'ananas|pommes de terre|pommes de terre|purée de framboise|filet de poulet fumé|vin pétillant|épinards
sirop de fraise|sirop de sucre|tomates séchées|sauce aigre-douce|sirop|sauce teriyaki|tomate|tomates|veau|noix
vin blanc`,
      n: `Pâtes aux crevettes|Planche MAX|Assiette de charcuterie|Planche à bière|Crevettes grillées|Nuggets|Assiette de légumes marinés|Bouillon de poulet|Poêlée aux saucisses|Poêlée au poulet|Poêlée au bacon
Porc|Poulet|Bacon|Tomates|Tomates cerises|Champignons|Pain|Légumes grillés|Saucisse de chasseur|Cornichons
Maïs|Maïs grillé|Poivron|Piment|Chips|Pommes de terre rustiques|Frites L|Frites XL|Sauce à l'ail|Sauce barbecue
Sauce verte|Sauce fromage|Sauce aigre-douce|Galette|Rondelles d'oignon|Crème aigre|Noix|Poulet fumé
Thés au choix|Thé des Carpates au miel|Thé à la framboise|Thé à l'argousier|Tonic|Eau|Jus Sandora|Limonade à la framboise|Limonade|Limonade au fruit de la passion
Vin chaud|Train blindé|Mort instantanée|Liqueurs maison|Bières au choix (Opillia)|Blanc 1664 (pression)|Grimbergen (pression)`,
      c: `Minimax|Pâtes|Burgers|Salades|Snacks|Soupes|Poêlées|Accompagnements
Café & thé|Boissons|Cocktails sans alcool|Cocktails|Shots|Whisky|Rhum|Vermouth
Liqueur|Cognac & brandy|Vodka|Tequila|Gin|Vin & liqueurs|Bière|Chicha`,
    },
    es: {
      t: `2 hamburguesas de pollo|2 hamburguesas de ternera|3 tipos de queso|3 salsas|4 tipos de carne (1,2 kg)|mostaza americana|salsa barbacoa|beicon|basturma|negro
pan plano con queso|filete de pollo|hamburguesa de pollo|patatas chips|pepinos|pepino|pan plano|salchichas de cazador|lechuga|setas en vinagre
cerdo|hamburguesa de cerdo|vino tinto|gambas|mango siciliano|atún|hamburguesa de ternera|vodka|zumo de manzana|aguacate
licor de plátano|sirope de plátano|albahaca|pimiento|cebolla caramelizada|zanahoria|salsa de queso|cereza|zumo de cereza|tomates cherry
chile|guindilla|canela|leche de coco|sirope de coco|licor de café|maíz|nata|cebolla crujiente|huevo
clara de huevo|yema de huevo|limón fresco|patatas fritas|de frutas|salsa de ajo|sirope de pomelo|verde|salsa verde|verduras a la parrilla
kiwi|limón|zumo de limón|lima|zumo de lima|licor de melón|menta|licor de menta|mezcla de hojas verdes|frutos secos variados
setas|fideos|aceite de oliva|aceitunas|cebolla|aros de cebolla|naranja|zumo de naranja|parmesano y mozzarella|salsa de parmesano
sirope de maracuyá|pera|pepinillos|zumo de piña|patatas|patatas|puré de frambuesa|filete de pollo ahumado|vino espumoso|espinacas
sirope de fresa|almíbar|tomates secos|salsa agridulce|sirope|salsa teriyaki|tomate|tomates|ternera|nueces
vino blanco`,
      n: `Pasta con gambas|Tabla MAX|Plato de embutidos|Tabla para cerveza|Gambas a la parrilla|Nuggets|Encurtidos|Caldo de pollo|Sartén con salchichas|Sartén con pollo|Sartén con beicon
Cerdo|Pollo|Beicon|Tomates|Tomates cherry|Setas|Pan|Verduras a la parrilla|Salchicha de cazador|Pepinillos
Maíz|Maíz a la parrilla|Pimiento|Guindilla|Patatas chips|Patatas rústicas|Patatas fritas L|Patatas fritas XL|Salsa de ajo|Salsa barbacoa
Salsa verde|Salsa de queso|Salsa agridulce|Pan plano|Aros de cebolla|Nata agria|Frutos secos|Pollo ahumado
Selección de tés|Té de los Cárpatos con miel|Té de frambuesa|Té de espino amarillo|Tónica|Agua|Zumo Sandora|Limonada de frambuesa|Limonada|Limonada de maracuyá
Vino caliente|Tren blindado|Muerte instantánea|Licores caseros|Cervezas (Opillia)|Blanc 1664 (de barril)|Grimbergen (de barril)`,
      c: `Minimax|Pasta|Hamburguesas|Ensaladas|Aperitivos|Sopas|Sartenes|Guarniciones
Café y té|Refrescos|Cócteles sin alcohol|Cócteles|Chupitos|Whisky|Ron|Vermut
Licor|Coñac y brandy|Vodka|Tequila|Ginebra|Vino y licores|Cerveza|Cachimba`,
    },
    it: {
      t: `2 hamburger di pollo|2 hamburger di vitello|3 tipi di formaggio|3 salse|4 tipi di carne (1,2 kg)|senape americana|salsa barbecue|bacon|basturma|nero
piadina al formaggio|filetto di pollo|hamburger di pollo|patatine|cetrioli|cetriolo|piadina|salsicce del cacciatore|lattuga|funghi marinati
maiale|hamburger di maiale|vino rosso|gamberi|mango siciliano|tonno|hamburger di vitello|vodka|succo di mela|avocado
liquore alla banana|sciroppo di banana|basilico|peperone|cipolla caramellata|carota|salsa al formaggio|ciliegia|succo di ciliegia|pomodorini
peperoncino|peperoncino|cannella|latte di cocco|sciroppo di cocco|liquore al caffè|mais|panna|cipolla croccante|uovo
albume|tuorlo|limone fresco|patatine fritte|alla frutta|salsa all'aglio|sciroppo di pompelmo|verde|salsa verde|verdure grigliate
kiwi|limone|succo di limone|lime|succo di lime|liquore al melone|menta|liquore alla menta|misticanza|frutta secca mista
funghi|noodles|olio d'oliva|olive|cipolla|anelli di cipolla|arancia|succo d'arancia|parmigiano e mozzarella|salsa al parmigiano
sciroppo di frutto della passione|pera|cetriolini sottaceto|succo d'ananas|patate|patate|purea di lamponi|filetto di pollo affumicato|spumante|spinaci
sciroppo di fragola|sciroppo di zucchero|pomodori secchi|salsa agrodolce|sciroppo|salsa teriyaki|pomodoro|pomodori|vitello|noci
vino bianco`,
      n: `Pasta ai gamberi|Tagliere MAX|Piatto di salumi|Tagliere per birra|Gamberi alla griglia|Nuggets|Sottaceti|Brodo di pollo|Padella con salsicce|Padella con pollo|Padella con bacon
Maiale|Pollo|Bacon|Pomodori|Pomodorini|Funghi|Pane|Verdure grigliate|Salsiccia del cacciatore|Cetriolini sottaceto
Mais|Mais alla griglia|Peperone|Peperoncino|Patatine|Patate rustiche|Patatine fritte L|Patatine fritte XL|Salsa all'aglio|Salsa barbecue
Salsa verde|Salsa al formaggio|Salsa agrodolce|Piadina|Anelli di cipolla|Panna acida|Frutta secca|Pollo affumicato
Tè a scelta|Tè dei Carpazi con miele|Tè al lampone|Tè all'olivello spinoso|Tonica|Acqua|Succo Sandora|Limonata al lampone|Limonata|Limonata al frutto della passione
Vin brulé|Treno blindato|Morte istantanea|Liquori della casa|Birre a scelta (Opillia)|Blanc 1664 (alla spina)|Grimbergen (alla spina)`,
      c: `Minimax|Pasta|Hamburger|Insalate|Stuzzichini|Zuppe|Padelle|Contorni
Caffè e tè|Bibite|Cocktail analcolici|Cocktail|Shot|Whisky|Rum|Vermut
Liquore|Cognac e brandy|Vodka|Tequila|Gin|Vino e liquori|Birra|Narghilè`,
    },
    cs: {
      t: `2 kuřecí placky|2 telecí placky|3 druhy sýra|3 omáčky|4 druhy masa (1,2 kg)|americká hořčice|BBQ omáčka|slanina|basturma|černý
sýrová placka|kuřecí filet|kuřecí placka|chipsy|okurky|okurka|placka|myslivecké klobásky|hlávkový salát|nakládané houby
vepřové|vepřová placka|červené víno|krevety|sicilské mango|tuňák|telecí placka|vodka|jablečný džus|avokádo
banánový likér|banánový sirup|bazalka|paprika|karamelizovaná cibule|mrkev|sýrová omáčka|třešeň|třešňový džus|cherry rajčata
chilli|chilli paprička|skořice|kokosové mléko|kokosový sirup|kávový likér|kukuřice|smetana|křupavá cibulka|vejce
bílek|žloutek|čerstvý citron|hranolky|ovocný|česneková omáčka|grepový sirup|zelený|zelená omáčka|grilovaná zelenina
kiwi|citron|citronová šťáva|limetka|limetková šťáva|melounový likér|máta|mátový likér|mix salátů|mix ořechů
houby|nudle|olivový olej|olivy|cibule|cibulové kroužky|pomeranč|pomerančový džus|parmazán a mozzarella|parmazánová omáčka
sirup z mučenky|hruška|kyselé okurky|ananasový džus|brambory|brambory|malinové pyré|uzený kuřecí filet|šumivé víno|špenát
jahodový sirup|cukrový sirup|sušená rajčata|sladkokyselá omáčka|sirup|omáčka teriyaki|rajče|rajčata|telecí|vlašské ořechy
bílé víno`,
      n: `Těstoviny s krevetami|Prkénko MAX|Masový talíř|Pivní prkénko|Grilované krevety|Nugety|Nakládaná zelenina|Kuřecí vývar|Pánev s klobáskami|Pánev s kuřetem|Pánev se slaninou
Vepřové|Kuře|Slanina|Rajčata|Cherry rajčata|Houby|Chléb|Grilovaná zelenina|Myslivecká klobáska|Kyselé okurky
Kukuřice|Grilovaná kukuřice|Paprika|Chilli paprička|Chipsy|Americké brambory|Hranolky L|Hranolky XL|Česneková omáčka|BBQ omáčka
Zelená omáčka|Sýrová omáčka|Sladkokyselá omáčka|Placka|Cibulové kroužky|Zakysaná smetana|Ořechy|Uzené kuře
Výběr čajů|Karpatský čaj s medem|Malinový čaj|Rakytníkový čaj|Tonik|Voda|Džus Sandora|Malinová limonáda|Limonáda|Limonáda z mučenky
Svařené víno|Obrněný vlak|Okamžitá smrt|Domácí likéry|Výběr piv (Opillia)|Blanc 1664 (čepované)|Grimbergen (čepované)`,
      c: `Minimax|Těstoviny|Burgery|Saláty|Předkrmy|Polévky|Pánve|Přílohy
Káva a čaj|Nealko nápoje|Nealko koktejly|Koktejly|Panáky|Whisky|Rum|Vermut
Likér|Koňak a brandy|Vodka|Tequila|Gin|Víno a likéry|Pivo|Vodní dýmka`,
    },
    ro: {
      t: `2 chiftele de pui|2 chiftele de vițel|3 tipuri de brânză|3 sosuri|4 tipuri de carne (1,2 kg)|muștar american|sos BBQ|bacon|basturma|negru
lipie cu brânză|file de pui|chiftea de pui|chipsuri|castraveți|castravete|lipie|cârnăciori vânătorești|salată verde|ciuperci marinate
porc|chiftea de porc|vin roșu|creveți|mango sicilian|ton|chiftea de vițel|vodcă|suc de mere|avocado
lichior de banane|sirop de banane|busuioc|ardei gras|ceapă caramelizată|morcov|sos de brânză|cireașă|suc de cireșe|roșii cherry
chili|ardei iute|scorțișoară|lapte de cocos|sirop de cocos|lichior de cafea|porumb|smântână|ceapă crocantă|ou
albuș|gălbenuș|lămâie proaspătă|cartofi prăjiți|de fructe|sos de usturoi|sirop de grepfrut|verde|sos verde|legume la grătar
kiwi|lămâie|suc de lămâie|lime|suc de lime|lichior de pepene|mentă|lichior de mentă|mix de salate|mix de nuci
ciuperci|tăiței|ulei de măsline|măsline|ceapă|inele de ceapă|portocală|suc de portocale|parmezan și mozzarella|sos de parmezan
sirop de fructul pasiunii|pară|castraveți murați|suc de ananas|cartofi|cartofi|piure de zmeură|file de pui afumat|vin spumant|spanac
sirop de căpșuni|sirop de zahăr|roșii uscate|sos dulce-acrișor|sirop|sos teriyaki|roșie|roșii|vițel|nuci
vin alb`,
      n: `Paste cu creveți|Platou MAX|Platou de mezeluri|Platou pentru bere|Creveți la grătar|Nuggets|Murături|Supă de pui|Tigaie cu cârnăciori|Tigaie cu pui|Tigaie cu bacon
Porc|Pui|Bacon|Roșii|Roșii cherry|Ciuperci|Pâine|Legume la grătar|Cârnăcior vânătoresc|Castraveți murați
Porumb|Porumb la grătar|Ardei gras|Ardei iute|Chipsuri|Cartofi țărănești|Cartofi prăjiți L|Cartofi prăjiți XL|Sos de usturoi|Sos BBQ
Sos verde|Sos de brânză|Sos dulce-acrișor|Lipie|Inele de ceapă|Smântână|Nuci|Pui afumat
Ceaiuri la alegere|Ceai carpatin cu miere|Ceai de zmeură|Ceai de cătină|Apă tonică|Apă|Suc Sandora|Limonadă cu zmeură|Limonadă|Limonadă cu fructul pasiunii
Vin fiert|Trenul blindat|Moarte instantanee|Lichioruri de casă|Bere la alegere (Opillia)|Blanc 1664 (la halbă)|Grimbergen (la halbă)`,
      c: `Minimax|Paste|Burgeri|Salate|Gustări|Supe|Tigăi|Garnituri
Cafea și ceai|Răcoritoare|Cocktailuri fără alcool|Cocktailuri|Shoturi|Whisky|Rom|Vermut
Lichior|Coniac și brandy|Vodcă|Tequila|Gin|Vin și lichioruri|Bere|Narghilea`,
    },
    tr: {
      t: `2 tavuk köfte|2 dana köfte|3 çeşit peynir|3 sos|4 çeşit et (1,2 kg)|Amerikan hardalı|barbekü sos|bacon|pastırma|siyah
peynirli lavaş|tavuk fileto|tavuk köfte|cips|salatalık|salatalık|lavaş|avcı sosisi|marul|mantar turşusu
domuz eti|domuz köfte|kırmızı şarap|karides|Sicilya mangosu|ton balığı|dana köfte|votka|elma suyu|avokado
muz likörü|muz şurubu|fesleğen|dolmalık biber|karamelize soğan|havuç|peynir sosu|kiraz|vişne suyu|çeri domates
acı biber|acı biber|tarçın|hindistan cevizi sütü|hindistan cevizi şurubu|kahve likörü|mısır|krema|çıtır soğan|yumurta
yumurta akı|yumurta sarısı|taze limon|patates kızartması|meyve|sarımsaklı sos|greyfurt şurubu|yeşil|yeşil sos|ızgara sebze
kivi|limon|limon suyu|misket limonu|misket limonu suyu|kavun likörü|nane|nane likörü|karışık yeşillik|karışık kuruyemiş
mantar|erişte|zeytinyağı|zeytin|soğan|soğan halkası|portakal|portakal suyu|parmesan ve mozzarella|parmesan sos
çarkıfelek şurubu|armut|turşu|ananas suyu|patates|patates|ahududu püresi|füme tavuk fileto|köpüklü şarap|ıspanak
çilek şurubu|şeker şurubu|kurutulmuş domates|tatlı ekşi sos|şurup|teriyaki sos|domates|domates|dana eti|ceviz
beyaz şarap`,
      n: `Karidesli makarna|MAX tabağı|Şarküteri tabağı|Bira tabağı|Izgara karides|Nugget|Turşu tabağı|Tavuk suyu çorbası|Sosisli tava|Tavuklu tava|Pastırmalı tava
Domuz eti|Tavuk|Bacon|Domates|Çeri domates|Mantar|Ekmek|Izgara sebze|Avcı sosisi|Turşu
Mısır|Izgara mısır|Dolmalık biber|Acı biber|Cips|Köy patatesi|Patates kızartması L|Patates kızartması XL|Sarımsaklı sos|Barbekü sos
Yeşil sos|Peynir sosu|Tatlı ekşi sos|Lavaş|Soğan halkası|Ekşi krema|Kuruyemiş|Füme tavuk
Çay çeşitleri|Ballı Karpat çayı|Ahududu çayı|Yabani iğde çayı|Tonik|Su|Sandora meyve suyu|Ahududulu limonata|Limonata|Çarkıfelekli limonata
Sıcak şarap|Zırhlı tren|Ani ölüm|Ev yapımı likörler|Bira çeşitleri (Opillia)|Blanc 1664 (fıçı)|Grimbergen (fıçı)`,
      c: `Minimax|Makarnalar|Burgerler|Salatalar|Atıştırmalıklar|Çorbalar|Tavalar|Ekstralar
Kahve ve çay|Alkolsüz içecekler|Alkolsüz kokteyller|Kokteyller|Shotlar|Viski|Rom|Vermut
Likör|Konyak ve brendi|Votka|Tekila|Cin|Şarap ve likörler|Bira|Nargile`,
    },
    zh: {
      t: `2块鸡肉饼|2块小牛肉饼|3种奶酪|3种酱汁|4种肉 (1.2公斤)|美式芥末|烧烤酱|培根|巴斯图尔玛风干牛肉|红茶
奶酪薄饼|鸡胸肉|鸡肉饼|薯片|黄瓜|黄瓜|薄饼|猎人香肠|生菜|腌蘑菇
猪肉|猪肉饼|红葡萄酒|虾|西西里芒果|金枪鱼|小牛肉饼|伏特加|苹果汁|牛油果
香蕉利口酒|香蕉糖浆|罗勒|甜椒|焦糖洋葱|胡萝卜|奶酪酱|樱桃|樱桃汁|圣女果
辣椒|辣椒|肉桂|椰奶|椰子糖浆|咖啡利口酒|玉米|奶油|脆洋葱|鸡蛋
蛋清|蛋黄|新鲜柠檬|薯条|水果茶|蒜香酱|西柚糖浆|绿茶|青酱|烤蔬菜
猕猴桃|柠檬|柠檬汁|青柠|青柠汁|蜜瓜利口酒|薄荷|薄荷利口酒|混合生菜|混合坚果
蘑菇|面条|橄榄油|橄榄|洋葱|洋葱圈|橙子|橙汁|帕玛森和马苏里拉奶酪|帕玛森酱
百香果糖浆|梨|酸黄瓜|菠萝汁|土豆|土豆|覆盆子果泥|烟熏鸡胸肉|起泡酒|菠菜
草莓糖浆|糖浆|油浸番茄干|糖醋酱|糖浆|照烧酱|番茄|番茄|小牛肉|核桃
白葡萄酒`,
      n: `鲜虾意面|MAX拼盘|肉类拼盘|啤酒小食拼盘|烤虾|鸡块|腌菜拼盘|鸡汤|香肠铁锅|鸡肉铁锅|培根铁锅
猪肉|鸡肉|培根|番茄|圣女果|蘑菇|面包|烤蔬菜|猎人香肠|酸黄瓜
玉米|烤玉米|甜椒|辣椒|薯片|乡村土豆|薯条 L|薯条 XL|蒜香酱|烧烤酱
青酱|奶酪酱|糖醋酱|薄饼|洋葱圈|酸奶油|坚果|烟熏鸡肉
茶（可选）|喀尔巴阡蜂蜜茶|覆盆子茶|沙棘茶|汤力水|水|Sandora果汁|覆盆子柠檬水|柠檬水|百香果柠檬水
热红酒|装甲列车|瞬间倒下|自制果酒|啤酒（Opillia）|Blanc 1664（生啤）|Grimbergen（生啤）`,
      c: `Minimax卷饼|意面|汉堡|沙拉|小食|汤|铁锅|配菜
咖啡和茶|软饮|无酒精鸡尾酒|鸡尾酒|一口酒|威士忌|朗姆酒|味美思
利口酒|干邑和白兰地|伏特加|龙舌兰|金酒|葡萄酒和果酒|啤酒|水烟`,
    },
  };

  const split = s => s.split(/\||\n/).map(x => x.trim());
  const terms = split(TERMS), names = split(NAMES), cats = split(CATS);
  const out = {};
  for (const [lang, d] of Object.entries(L)) {
    const t = split(d.t), n = split(d.n), c = split(d.c);
    if (t.length !== terms.length || n.length !== names.length || c.length !== cats.length) console.warn('menu-i18n: wrong count', lang, t.length, n.length, c.length);
    out[lang] = {
      t: Object.fromEntries(terms.map((k, i) => [k, t[i]])),
      n: Object.fromEntries(names.map((k, i) => [k, n[i]])),
      c: Object.fromEntries(cats.map((k, i) => [k, c[i]])),
    };
  }
  window.MENU_I18N = out;
})();
