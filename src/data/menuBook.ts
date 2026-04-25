import type { Locale } from "@/i18n/translations";

export type MenuBookItem = { name: string; desc: string; pricesEur: number[] };
export type MenuBookPage = { id: string; title: string; subtitle?: string; content: MenuBookItem[] | null; isCover?: boolean; isBack?: boolean };

type Localized = Record<Locale, string>;
type SourcePage = { id: string; title: Localized; subtitle?: Localized; content: MenuBookItem[] };

const l = (pl: string, it: string, es: string, fr: string, de: string, en: string): Localized => ({ pl, it, es, fr, de, en });
const item = (name: string, desc: string, pricesEur: number[]): MenuBookItem => ({ name, desc, pricesEur });

export const MENU_UI = {
  pl: { yearBadge: "Menu 2025", coverCaption: "Edycja plażowa 2025", backTitle: "Do zobaczenia nad morzem", backCaption: "RENA BIANCA • 2025", previewLabel: "Otwórz czytelny podgląd", popupCloseLabel: "Zamknij", popupPrevLabel: "Poprzednia", popupNextLabel: "Następna", popupSwipeHint: "← Przesuń aby zmienić →" },
  it: { yearBadge: "Menu 2025", coverCaption: "Edizione spiaggia 2025", backTitle: "Ci vediamo sul mare", backCaption: "RENA BIANCA • 2025", previewLabel: "Apri anteprima leggibile", popupCloseLabel: "Chiudi", popupPrevLabel: "Precedente", popupNextLabel: "Successiva", popupSwipeHint: "← Scorri per cambiare →" },
  es: { yearBadge: "Menú 2025", coverCaption: "Edición de playa 2025", backTitle: "Nos vemos junto al mar", backCaption: "RENA BIANCA • 2025", previewLabel: "Abrir vista legible", popupCloseLabel: "Cerrar", popupPrevLabel: "Anterior", popupNextLabel: "Siguiente", popupSwipeHint: "← Desliza para cambiar →" },
  fr: { yearBadge: "Menu 2025", coverCaption: "Édition plage 2025", backTitle: "À bientôt au bord de la mer", backCaption: "RENA BIANCA • 2025", previewLabel: "Ouvrir l'aperçu", popupCloseLabel: "Fermer", popupPrevLabel: "Précédente", popupNextLabel: "Suivante", popupSwipeHint: "← Glissez pour changer →" },
  de: { yearBadge: "Menü 2025", coverCaption: "Strandedition 2025", backTitle: "Bis bald am Meer", backCaption: "RENA BIANCA • 2025", previewLabel: "Vorschau öffnen", popupCloseLabel: "Schließen", popupPrevLabel: "Zurück", popupNextLabel: "Weiter", popupSwipeHint: "← Wischen zum Wechseln →" },
  en: { yearBadge: "Menu 2025", coverCaption: "Beach Edition 2025", backTitle: "See you by the sea", backCaption: "RENA BIANCA • 2025", previewLabel: "Open readable preview", popupCloseLabel: "Close", popupPrevLabel: "Previous", popupNextLabel: "Next", popupSwipeHint: "← Swipe to change →" },
} as const;

export const MENU_APPROX = {
  pl: { currency: "PLN", locale: "pl-PL", rate: 4.28 },
  en: { currency: "USD", locale: "en-US", rate: 1.08 },
} as const;

const pages: SourcePage[] = [
  {
    id: "caffetteria",
    title: l("Kawiarnia i śniadania", "Caffetteria", "Cafetería y desayunos", "Cafétéria & petits-déjeuners", "Cafeteria & Frühstück", "Coffee bar & breakfast"),
    subtitle: l("Kawa • Cappuccino • Croissant", "Caffè • Cappuccino • Croissant", "Café • Cappuccino • Croissant", "Café • Cappuccino • Croissant", "Kaffee • Cappuccino • Croissant", "Coffee • Cappuccino • Croissant"),
    content: [
      item("Caffè / Caffè americano", "Classic espresso or americano", [1.5, 1.7]),
      item("Caffè Dek", "Decaffeinated espresso", [1.7]),
      item("Caffè corretto", "Espresso with liquor", [2]),
      item("Caffè d'orzo / Ginseng", "Barley or ginseng coffee", [2]),
      item("Cappuccino / Cappuccino soia", "Classic cappuccino or soy version", [2, 2.5]),
      item("Marocchino", "Espresso with cocoa and milk foam", [2.5]),
      item("Latte macchiato o caffellatte / soia", "Milk coffee, classic or soy", [3, 3.5]),
      item("Latte bianco / soia", "Hot milk or soy milk", [1.5, 2]),
      item("The o camomilla", "Tea or chamomile", [2.5]),
      item("Caffè shakerato", "Shaken iced coffee", [4]),
      item("Crema caffè", "Cold coffee cream", [4]),
      item("Cioccolata calda / Panna", "Hot chocolate / with whipped cream", [4, 5]),
      item("Croissant (cioccolato, marmellata, vuoto, crema, vegano mora)", "Chocolate, jam, plain, cream or vegan blackberry", [1.5]),
      item("Croissant Pistacchio", "Pistachio croissant", [2, 2.5]),
      item("Cornetti senza glutine / Brioches in confezione", "Gluten-free croissant / packaged brioche", [1, 1]),
    ],
  },
  {
    id: "analcolico-bibite",
    title: l("Napoje bezalkoholowe", "Analcolico / Bibite", "Bebidas sin alcohol", "Sans alcool / boissons", "Alkoholfreie Getränke", "Non-alcoholic drinks"),
    subtitle: l("Soda • Soki • Woda", "Soda • Succhi • Acqua", "Soda • Zumos • Agua", "Soda • Jus • Eau", "Soda • Saft • Wasser", "Soda • Juices • Water"),
    content: [
      item("Crodino", "Italian non-alcoholic aperitivo", [3.5]),
      item("Bitter", "Non-alcoholic bitter", [3.5]),
      item("Cocktail San Pellegrino", "Sparkling bitter drink", [3.5]),
      item("Chinotto", "Italian dark citrus soda", [3.5]),
      item("Aranciata amara", "Bitter orange soda", [3.5]),
      item("Tonica / Schweppes al limone", "Tonic or lemon Schweppes", [3.5]),
      item("Succo di pomodoro", "Tomato juice", [3.5]),
      item("Limonata Lurisia", "Italian lemonade", [4]),
      item("Bibita in lattina", "Coca-Cola, Sprite, Fanta, tea, Lemon Soda", [3.5]),
      item("Red Bull", "Energy drink", [4]),
      item("Succhi di frutta", "Fruit juices - assorted flavors", [3.5]),
      item("Frullati", "Smoothies", [7]),
      item("Sciroppi", "Syrup-based drinks", [2.5]),
      item("Acqua Min. 1/2 lt.", "Mineral water 0.5L", [1.5]),
      item("Acqua Min. 1 lt.", "Mineral water 1L", [2]),
      item("Acqua Min. Bicchiere", "Water by the glass", [0.5]),
      item("Spremuta di agrumi", "Fresh citrus juice", [4]),
    ],
  },
  {
    id: "alcolici",
    title: l("Alkohole", "Alcolici", "Bebidas alcohólicas", "Boissons alcoolisées", "Alkoholische Getränke", "Alcoholic drinks"),
    subtitle: l("Piwo • Wino • Koktajle", "Birra • Vino • Cocktail", "Cerveza • Vino • Cócteles", "Bière • Vin • Cocktails", "Bier • Wein • Cocktails", "Beer • Wine • Cocktails"),
    content: [
      item("Campari soda / Aperol soda", "Classic soda aperitifs", [3.5]),
      item("Vini DOC a bicchiere", "DOC wine by the glass", [4]),
      item("Bicchiere di prosecco", "Glass of prosecco", [4]),
      item("Bottiglia di vino bianco / rosso", "Bottle of white or red wine", [25]),
      item("Bottiglia di prosecco / Bottiglia di Rosé", "Bottle of prosecco or rosé", [25]),
      item("Birra Sarda 33 cl. (Ichnusa, Rudler)", "Sardinian beer", [4]),
      item("Birra Rossa Poretti 6 33 cl.", "Red beer Poretti 6", [4]),
      item("Birra estera 33 cl. (Heineken, Corona, Tennent's)", "Imported beer", [5]),
      item("Birra alla spina Tuborg 30 cl. / 50 cl.", "Tuborg draft", [4.5, 7]),
      item("Birra analcolica / senza glutine 33 cl.", "Alcohol-free or gluten-free beer", [4]),
      item("Amari e liquori", "Digestifs and liqueurs", [3.5, 4]),
      item("Wiskey, Rum e Vodka", "Whisky, rum and vodka", [4, 5, 7]),
      item("Aperol o Campari Spritz", "Classic Spritz", [7]),
      item("Spritz Hugo o Spritz Hugo con Saint Germain", "Hugo Spritz / with Saint Germain", [7, 12]),
      item("Gin Lemon e Gin Tonic", "Gin long drinks", [8, 10, 12]),
      item("Rum e Cola", "Rum with cola", [8, 9]),
      item("Americano", "Classic Americano cocktail", [8]),
      item("Negroni / Sbagliato", "Classic or Sbagliato", [10]),
      item("Piña Colada frozen / Daiquiri frozen / Mojito", "Frozen or classic cocktails", [10]),
      item("Moscow Mule", "Vodka, ginger beer and lime", [8]),
      item("Vodka Lemon e Vodka Tonic", "Vodka long drinks", [8]),
      item("Vodka Grey Goose", "Grey Goose serve", [12]),
      item("Long Island", "Long Island Iced Tea", [10]),
      item("Bloody Mary", "Vodka and tomato cocktail", [8]),
    ],
  },
  {
    id: "piatti-composti",
    title: l("Dania główne", "Piatti composti", "Platos combinados", "Plats composés", "Kombinierte Hauptgerichte", "Main dishes"),
    subtitle: l("Podawane z frytkami lub warzywami grillowanymi", "Serviti con patatine o verdure grigliate", "Servidos con patatas fritas o verduras a la parrilla", "Servis avec frites ou légumes grillés", "Serviert mit Pommes oder gegrilltem Gemüse", "Served with fries or grilled vegetables"),
    content: [
      item("Cotoletta", "Breaded cutlet", [14]),
      item("Hamburger di carne", "Beef burger", [14]),
      item("Hamburger vegetariano", "Vegetarian burger", [14]),
      item("Hot Dog", "Hot dog plate", [14]),
      item("Petto di pollo grigliato", "Grilled chicken breast", [14]),
    ],
  },
  {
    id: "piatti-freddi-snack",
    title: l("Przekąski i dania zimne", "Piatti freddi / Snack", "Snacks y platos fríos", "Snacks & plats froids", "Snacks & kalte Gerichte", "Snacks & cold dishes"),
    subtitle: l("Sałatki • Tosty • Panini", "Insalata • Toast • Panini", "Ensaladas • Tostadas • Panini", "Salades • Toasts • Panini", "Salate • Toasts • Panini", "Salads • Toast • Panini"),
    content: [
      item("Insalata mista (mozzarella, tonno, olive)", "Mixed salad", [12]),
      item("Insalata di pollo", "Chicken salad", [12]),
      item("Caprese", "Caprese / with tuna option", [12, 14]),
      item("Bresaola, rucola e grana", "Bresaola, rocket and grana", [14]),
      item("Prosciutto e melone", "Ham and melon", [14]),
      item("Crudo e mozzarella", "Cured ham and mozzarella", [14]),
      item("Tagliere salumi e formaggi", "Cold cuts and cheese platter", [18]),
      item("Melone / Anguria", "Melon / watermelon", [3.5, 3]),
      item("Pizza piccola Margherita", "Small Margherita", [3.5]),
      item("Toast con prosciutto cotto e formaggio", "Ham and cheese toast", [5]),
      item("Patatine fritte", "French fries", [4]),
      item("Pomodoro e mozzarella", "Tomato and mozzarella sandwich", [6.5]),
      item("Tonno e pomodoro", "Tuna and tomato sandwich", [7]),
      item("Cotoletta e insalata / Hamburger e insalata", "Cutlet or burger with salad", [7]),
      item("Hot Dog", "Snack version", [7]),
      item("Affettati", "Cold cuts", [6]),
      item("Bresaola, rucola e grana (porzione piccola)", "Smaller portion", [8]),
      item("Petto di pollo, pomodoro e insalata", "Chicken breast, tomato and salad", [8]),
      item("Salmone affumicato, rucola e brie", "Smoked salmon, rocket and brie", [8]),
      item("Polpo", "Octopus", [10]),
      item("Verdure grigliate", "Grilled vegetables", [8]),
    ],
  },
  {
    id: "fatti-per-te",
    title: l("Makarony", "Fatti per te", "Pasta hecha para ti", "Pâtes faites pour vous", "Pasta für dich", "Pasta dishes"),
    subtitle: l("Pierwsze dania", "Primi piatti", "Primeros platos", "Entrées", "Erste Gänge", "First courses"),
    content: [
      item("Spaghetti alla carbonara", "Carbonara", [10]),
      item("Spaghetti cacio e pepe", "Cacio e pepe", [10]),
      item("Pennette al salmone", "Penne with salmon", [10]),
      item("Risotto alla pescatora", "Seafood risotto", [10]),
      item("Tortellini con panna e prosciutto", "Tortellini with cream and ham", [10]),
      item("Spaghetti al pomodoro", "Spaghetti with tomato sauce", [10]),
      item("Trofie al pesto", "Trofie with pesto", [10]),
      item("Lasagna alla bolognese", "Bolognese lasagna", [10]),
    ],
  },
  {
    id: "pizzella",
    title: l("Pizzella", "Pizzella", "Pizzella", "Pizzella", "Pizzella", "Pizzella"),
    subtitle: l("Mały wybór pizzy", "Piccola selezione di pizza", "Pequeña selección de pizza", "Petite sélection de pizzas", "Kleine Pizza-Auswahl", "Small pizza selection"),
    content: [
      item("Pizzella Margherita", "Margherita", [5]),
      item("Pizzella Prosciutto Cotto", "With cooked ham", [8]),
      item("Pizzella Salame Piccante", "With spicy salami", [8]),
      item("Pizzella Verdure", "With vegetables", [8]),
    ],
  },
  {
    id: "dessert-bindi",
    title: l("Desery", "Dessert bindi", "Postres bindi", "Desserts bindi", "Desserts bindi", "Bindi desserts"),
    subtitle: l("Lody • Pucharki", "Gelato • Coppe", "Helado • Copas", "Glaces • Coupes", "Eis • Becher", "Gelato • Cups"),
    content: [
      item("Coppa Spagnola", "Spanish-style ice cream cup", [6]),
      item("Tartufo Pistacchio", "Pistachio tartufo", [5]),
      item("Coppa Tiramisù", "Tiramisu cup", [6]),
      item("Coppa al Limone di Sorrento IGP", "Sorrento lemon cup", [6]),
      item("Coppa Mousse Chantilly e Caffè", "Chantilly and coffee mousse cup", [6]),
      item("Pan Dan Gelato al gusto vaniglia", "Vanilla ice cream dessert", [6]),
    ],
  },
  {
    id: "note-menu",
    title: l("Informacje dodatkowe", "Note aggiuntive", "Notas adicionales", "Notes supplémentaires", "Zusätzliche Hinweise", "Additional notes"),
    subtitle: l("Obsługa • Produkty mrożone", "Servizio • Prodotti surgelati", "Servicio • Productos congelados", "Service • Produits surgelés", "Service • Tiefkühlprodukte", "Service • Frozen products"),
    content: [
      item("Servizio al tavolo", "Table service per person", [0.5]),
      item("(*) Prodotti surgelati", "Items marked with * may be frozen products", [0]),
    ],
  },
];

export function getMenuBook(locale: Locale): MenuBookPage[] {
  return [
    { id: "cover", title: "Rena Bianca", subtitle: MENU_UI[locale].coverCaption, content: null, isCover: true },
    ...pages.map((page) => ({ id: page.id, title: page.title[locale], subtitle: page.subtitle?.[locale], content: page.content })),
    { id: "back", title: MENU_UI[locale].backTitle, subtitle: MENU_UI[locale].backCaption, content: null, isBack: true },
  ];
}
