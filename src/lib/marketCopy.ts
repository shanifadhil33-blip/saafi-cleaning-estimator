import type { Freq, Lang, Region } from "./marketQuote";

export interface SvcCopy { name: string; items: string[] }
export interface Copy {
  title: string;
  lead: string;
  area: string;
  areaPh: string;
  areaBad: string;
  areaOut: string;
  areaMail: string;
  areaMailPh: string;
  areaSave: string;
  areaNoted: string;
  service: string;
  services: Record<string, SvcCopy>;
  home: string;
  homes: Record<string, string>;
  beds: string;
  baths: string;
  studio: string;
  size: string;
  sizes: Record<string, string>;
  condition: string;
  conditions: Record<string, string>;
  hours: string;
  hoursHint: (beds: number) => string;
  hoursCount: (n: number) => string;
  rooms: string;
  roomNames: Record<string, string>;
  often: string;
  freqs: Record<Freq, string>;
  save: (n: number) => string;
  freqOff: string;
  extras: string;
  each: string;
  extraNames: Record<string, string>;
  pets: string;
  petOpt: Record<string, string>;
  petsAway: string;
  when: string;
  today: string;
  tomorrow: string;
  windowsLabel: string;
  windows: Record<string, string>;
  entry: string;
  entries: Record<string, string>;
  entryPh: string;
  parking: string;
  parks: Record<string, string>;
  supplies: string;
  supplyYes: string;
  supplyNo: string;
  weekend: string;
  contact: string;
  first: string;
  last: string;
  fullName: string;
  email: string;
  mobile: string;
  street: string;
  apt: string;
  city: string;
  state: string;
  line2: string;
  town: string;
  postcode: string;
  notes: string;
  notesPh: string;
  summary: string;
  cleaning: string;
  off: (m: string) => string;
  weekendLine: string;
  productsLine: string;
  tipLine: string;
  total: string;
  perVisit: string;
  oneTime: string;
  thenPer: (m: string) => string;
  from: (m: string) => string;
  confirmed: string;
  tax: string;
  tip: string;
  tipNone: string;
  payTitle: string;
  payBody: string;
  cardName: string;
  cardNumber: string;
  cardExp: string;
  cardCvc: string;
  terms: string;
  request: string;
  doneTitle: string;
  doneBody: string;
  edit: string;
  call: string;
  text: string;
  emailUs: string;
  whatsapp: string;
  errArea: string;
  errName: string;
  errEmail: string;
  errPhone: string;
  errDate: string;
  errWindow: string;
  errTerms: string;
  regionsNav: string;
  regions: Record<Region, string>;
  currency: string;
  language: string;
  optional: string;
  fewer: string;
  more: string;
  msgIntro: string;
  refLabel: string;
  months: string[];
}

const windowsEn = { a: "8am to 10am", b: "10am to 12pm", c: "12pm to 2pm", d: "2pm to 4pm" };
const windowsEs = { a: "8 h a 10 h", b: "10 h a 12 h", c: "12 h a 14 h", d: "14 h a 16 h" };
const windowsFr = { a: "8 h à 10 h", b: "10 h à 12 h", c: "12 h à 14 h", d: "14 h à 16 h" };

const hoursEn = (beds: number) => beds <= 1 ? "Suggested 2 hours" : beds === 2 ? "Suggested 2.5 to 3 hours" : beds === 3 ? "Suggested 3 to 4 hours" : "Suggested 4 hours or more";
const hoursEs = (beds: number) => beds <= 1 ? "Sugerido: 2 horas" : beds === 2 ? "Sugerido: 2.5 a 3 horas" : beds === 3 ? "Sugerido: 3 a 4 horas" : "Sugerido: 4 horas o más";
const hoursFr = (beds: number) => beds <= 1 ? "Suggestion: 2 heures" : beds === 2 ? "Suggestion: 2.5 à 3 heures" : beds === 3 ? "Suggestion: 3 à 4 heures" : "Suggestion: 4 heures ou plus";
const countEn = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;
const countEs = (n: number) => `${n} ${n === 1 ? "hora" : "horas"}`;
const countFr = (n: number) => `${n} ${n >= 2 ? "heures" : "heure"}`;

const usServices: Record<string, SvcCopy> = {
  standard: { name: "Standard clean", items: ["Dusting and floors", "Kitchen surfaces", "Bathrooms"] },
  deep: { name: "Deep clean", items: ["Everything in a standard clean", "Inside cabinets", "Baseboards and behind furniture"] },
  move: { name: "Move in or move out", items: ["Empty home", "Inside cabinets and appliances", "Ready for handover"] },
  post: { name: "Post construction", items: ["Dust after building work", "Floors and surfaces", "Debris in the rooms we clean"] },
  airbnb: { name: "Airbnb turnover", items: ["Beds and linens", "Kitchen and bathrooms", "Ready for the next guests"] },
  hourly: { name: "Hourly clean", items: ["You choose the hours", "We start with your priorities", "Minimum 2 hours"] },
};
const usHomes: Record<string, string> = { house: "House", apartment: "Apartment", condo: "Condo", townhouse: "Townhouse" };
const usExtras: Record<string, string> = {
  oven: "Inside oven", fridge: "Inside fridge", cabinets: "Inside cabinets", windows: "Interior windows",
  baseboards: "Baseboards", laundry: "Laundry wash and fold", linens: "Change bed linens", dishes: "Sink of dishes",
  garage: "Garage", blinds: "Blinds", pethair: "Pet hair",
};
const usEntries: Record<string, string> = {
  home: "I'll be home", hidden: "Key under the mat", lockbox: "Lockbox or door code", doorman: "Doorman or concierge", other: "Other",
};
const usParks: Record<string, string> = { free: "Free driveway or street", paid: "Paid or permit" };

const en: Copy = {
  title: "Price your home cleaning",
  lead: "Choose the home and the clean. The price updates as you go. Call, text, or email when it looks right.",
  area: "ZIP code",
  areaPh: "10001",
  areaBad: "Enter a 5 digit ZIP code.",
  areaOut: "We do not cover your area yet. Leave your email.",
  areaMail: "Email",
  areaMailPh: "you@example.com",
  areaSave: "Save my email",
  areaNoted: "Noted. Nothing was sent.",
  service: "Type of clean",
  services: usServices,
  home: "Home type",
  homes: usHomes,
  beds: "Bedrooms",
  baths: "Bathrooms",
  studio: "Studio",
  size: "Square feet",
  sizes: { s: "Under 1,000 sq ft", m: "1,000 to 1,999 sq ft", l: "2,000 to 2,999 sq ft", xl: "3,000 sq ft or more" },
  condition: "Home condition",
  conditions: { kept: "Well kept", average: "Average", extra: "Needs extra care" },
  hours: "Hours",
  hoursHint: hoursEn,
  hoursCount: countEn,
  rooms: "Extra rooms",
  roomNames: { conservatory: "Conservatory", utility: "Utility room" },
  often: "How often",
  freqs: { once: "One time", weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly" },
  save: (n) => `save ${n}%`,
  freqOff: "This clean is priced once, with no recurring saving.",
  extras: "Extras",
  each: "each",
  extraNames: usExtras,
  pets: "Pets",
  petOpt: { none: "None", dog: "Dog", cat: "Cat", other: "Other" },
  petsAway: "Pets will be put away",
  when: "Date",
  today: "Today",
  tomorrow: "Tomorrow",
  windowsLabel: "Arrival window",
  windows: windowsEn,
  entry: "Entry",
  entries: usEntries,
  entryPh: "Code or other detail",
  parking: "Parking",
  parks: usParks,
  supplies: "Supplies",
  supplyYes: "We bring everything",
  supplyNo: "Use my products",
  weekend: "Weekend visit",
  contact: "Your details",
  first: "First name",
  last: "Last name",
  fullName: "Name",
  email: "Email",
  mobile: "Mobile",
  street: "Street address",
  apt: "Apt or unit",
  city: "City",
  state: "State",
  line2: "Address line 2",
  town: "Town or city",
  postcode: "Postcode",
  notes: "Notes",
  notesPh: "Parking, pets, priorities",
  summary: "Price",
  cleaning: "Cleaning",
  off: (m) => `${m} off`,
  weekendLine: "Weekend hours",
  productsLine: "Products we bring",
  tipLine: "Tip",
  total: "Total",
  perVisit: "per visit",
  oneTime: "one time",
  thenPer: (m) => `Then ${m} per visit`,
  from: (m) => `From ${m}`,
  confirmed: "Final price confirmed after we see the home.",
  tax: "Plus tax",
  tip: "Tip optional. The full tip goes to your cleaner.",
  tipNone: "No tip",
  payTitle: "Card",
  payBody: "Charged after the clean. Nothing is charged on this page.",
  cardName: "Name on card",
  cardNumber: "Card number",
  cardExp: "Expiry",
  cardCvc: "Security code",
  terms: "I agree to the booking terms. You can reschedule or cancel free of charge up to 24 hours before. If something we cleaned is not right, tell us and we will come back.",
  request: "Request clean",
  doneTitle: "Booking request received",
  doneBody: "Call, text, or email and we will confirm the time.",
  edit: "Edit request",
  call: "Call",
  text: "Text",
  emailUs: "Email",
  whatsapp: "WhatsApp",
  errArea: "Choose a covered area to request a clean.",
  errName: "Add your name",
  errEmail: "Add a valid email",
  errPhone: "Add a mobile number",
  errDate: "Pick a date",
  errWindow: "Pick an arrival window",
  errTerms: "Agree to the terms to continue",
  regionsNav: "Country",
  regions: { us: "United States", ca: "Canada", uk: "United Kingdom" },
  currency: "Currency",
  language: "Language",
  optional: "Optional",
  fewer: "Fewer",
  more: "More",
  msgIntro: "New cleaning request",
  refLabel: "Ref",
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

const es: Copy = {
  ...en,
  title: "Calcula el precio de la limpieza",
  lead: "Elige la vivienda y la limpieza. El precio se actualiza al momento. Llama, escribe o envía un correo cuando el precio te encaje.",
  area: "Código postal",
  areaBad: "Escribe un código postal de 5 dígitos.",
  areaOut: "Todavía no cubrimos tu zona. Deja tu correo.",
  areaMail: "Correo",
  areaSave: "Guardar mi correo",
  areaNoted: "Anotado. No se envió nada.",
  service: "Tipo de limpieza",
  services: {
    standard: { name: "Limpieza normal", items: ["Polvo y suelos", "Superficies de la cocina", "Baños"] },
    deep: { name: "Limpieza profunda", items: ["Todo lo de la limpieza normal", "Interior de armarios", "Zócalos y detrás de los muebles"] },
    move: { name: "Entrada o salida", items: ["Vivienda vacía", "Interior de armarios y electrodomésticos", "Lista para entregar"] },
    post: { name: "Después de obra", items: ["Polvo después de la obra", "Suelos y superficies", "Restos en las habitaciones que limpiamos"] },
    airbnb: { name: "Cambio de Airbnb", items: ["Camas y ropa de cama", "Cocina y baños", "Listo para los siguientes huéspedes"] },
    hourly: { name: "Por horas", items: ["Tú eliges las horas", "Empezamos por lo que más importa", "Mínimo 2 horas"] },
  },
  home: "Tipo de vivienda",
  homes: { house: "Casa", apartment: "Apartamento", condo: "Condominio", townhouse: "Casa adosada" },
  beds: "Dormitorios",
  baths: "Baños",
  studio: "Estudio",
  size: "Pies cuadrados",
  sizes: { s: "Menos de 1,000 pies", m: "1,000 a 1,999 pies", l: "2,000 a 2,999 pies", xl: "3,000 pies o más" },
  condition: "Estado de la vivienda",
  conditions: { kept: "Bien cuidada", average: "Normal", extra: "Necesita más cuidado" },
  hours: "Horas",
  hoursHint: hoursEs,
  hoursCount: countEs,
  rooms: "Habitaciones extra",
  roomNames: { conservatory: "Invernadero", utility: "Cuarto de servicio" },
  often: "Frecuencia",
  freqs: { once: "Una vez", weekly: "Cada semana", biweekly: "Cada 2 semanas", monthly: "Cada mes" },
  save: (n) => `ahorra ${n}%`,
  freqOff: "Este servicio se cobra una vez, sin ahorro por repetición.",
  extras: "Extras",
  each: "cada uno",
  extraNames: {
    oven: "Interior del horno", fridge: "Interior de la nevera", cabinets: "Interior de armarios", windows: "Ventanas interiores",
    baseboards: "Zócalos", laundry: "Lavado y doblado", linens: "Cambio de sábanas", dishes: "Fregadero con platos",
    garage: "Garaje", blinds: "Persianas", pethair: "Pelo de mascota",
  },
  pets: "Mascotas",
  petOpt: { none: "Ninguna", dog: "Perro", cat: "Gato", other: "Otra" },
  petsAway: "Las mascotas estarán guardadas",
  when: "Fecha",
  today: "Hoy",
  tomorrow: "Mañana",
  windowsLabel: "Franja de llegada",
  windows: windowsEs,
  entry: "Entrada",
  entries: {
    home: "Estaré en casa", hidden: "Llave bajo el felpudo", lockbox: "Caja de llaves o código", doorman: "Portero o conserje", other: "Otro",
  },
  entryPh: "Código u otro detalle",
  parking: "Estacionamiento",
  parks: { free: "Entrada o calle gratis", paid: "De pago o con permiso" },
  supplies: "Productos",
  supplyYes: "Llevamos todo",
  supplyNo: "Usar mis productos",
  weekend: "Visita de fin de semana",
  contact: "Tus datos",
  first: "Nombre",
  last: "Apellido",
  fullName: "Nombre",
  email: "Correo",
  mobile: "Móvil",
  street: "Calle",
  apt: "Apto o unidad",
  city: "Ciudad",
  state: "Estado",
  line2: "Dirección línea 2",
  town: "Ciudad",
  postcode: "Código postal",
  notes: "Notas",
  notesPh: "Estacionamiento, mascotas, prioridades",
  summary: "Precio",
  cleaning: "Limpieza",
  off: (m) => `${m} de descuento`,
  weekendLine: "Horas de fin de semana",
  productsLine: "Productos que llevamos",
  tipLine: "Propina",
  total: "Total",
  perVisit: "por visita",
  oneTime: "una vez",
  thenPer: (m) => `Luego ${m} por visita`,
  from: (m) => `Desde ${m}`,
  confirmed: "El precio final se confirma cuando vemos la vivienda.",
  tax: "Más impuestos",
  tip: "La propina es opcional. Va completa a la persona que limpia.",
  tipNone: "Sin propina",
  payTitle: "Tarjeta",
  payBody: "Se cobra después de la limpieza. En esta página no se cobra nada.",
  cardName: "Nombre en la tarjeta",
  cardNumber: "Número de tarjeta",
  cardExp: "Vencimiento",
  cardCvc: "Código de seguridad",
  terms: "Acepto las condiciones. Puedes cambiar la fecha o cancelar sin cargo hasta 24 horas antes. Si algo que limpiamos no quedó bien, avísanos y volvemos.",
  request: "Pedir limpieza",
  doneTitle: "Solicitud de reserva recibida",
  doneBody: "Llama, escribe o envía un correo y confirmaremos la hora.",
  edit: "Editar solicitud",
  call: "Llamar",
  text: "Mensaje",
  emailUs: "Correo",
  whatsapp: "WhatsApp",
  errArea: "Elige una zona cubierta para pedir la limpieza.",
  errName: "Añade tu nombre",
  errEmail: "Añade un correo válido",
  errPhone: "Añade un móvil",
  errDate: "Elige una fecha",
  errWindow: "Elige una franja de llegada",
  errTerms: "Acepta las condiciones para seguir",
  regionsNav: "País",
  regions: { us: "Estados Unidos", ca: "Canadá", uk: "Reino Unido" },
  currency: "Moneda",
  language: "Idioma",
  optional: "Opcional",
  fewer: "Menos",
  more: "Más",
  msgIntro: "Nueva solicitud de limpieza",
  refLabel: "Ref",
  months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
};

const fr: Copy = {
  ...en,
  title: "Estimez le prix du ménage",
  lead: "Choisissez le logement et le ménage. Le prix se met à jour tout de suite. Appelez, textez ou envoyez un courriel quand le prix vous convient.",
  area: "Code postal",
  areaPh: "H2Y 1C6",
  areaBad: "Écrivez un code postal comme H2Y 1C6.",
  areaOut: "Nous ne couvrons pas encore votre secteur. Laissez votre courriel.",
  areaMail: "Courriel",
  areaSave: "Enregistrer mon courriel",
  areaNoted: "Noté. Rien n'a été envoyé.",
  service: "Type de ménage",
  services: {
    standard: { name: "Ménage régulier", items: ["Poussière et planchers", "Surfaces de la cuisine", "Salles de bain"] },
    deep: { name: "Grand ménage", items: ["Tout le ménage régulier", "Intérieur des armoires", "Plinthes et derrière les meubles"] },
    move: { name: "Entrée ou sortie", items: ["Logement vide", "Intérieur des armoires et des électros", "Prêt pour la remise"] },
    post: { name: "Après travaux", items: ["Poussière après les travaux", "Planchers et surfaces", "Débris dans les pièces que nous nettoyons"] },
    airbnb: { name: "Roulement Airbnb", items: ["Lits et draps", "Cuisine et salles de bain", "Prêt pour les prochains invités"] },
    hourly: { name: "À l'heure", items: ["Vous choisissez les heures", "Nous commençons par vos priorités", "Minimum 2 heures"] },
  },
  home: "Type de logement",
  homes: { house: "Maison", apartment: "Appartement", condo: "Condo", townhouse: "Maison de ville" },
  beds: "Chambres",
  baths: "Salles de bain",
  studio: "Studio",
  size: "Pieds carrés",
  sizes: { s: "Moins de 1 000 pieds carrés", m: "1 000 à 1 999 pieds carrés", l: "2 000 à 2 999 pieds carrés", xl: "3 000 pieds carrés ou plus" },
  condition: "État du logement",
  conditions: { kept: "Bien entretenu", average: "Moyen", extra: "Besoin de plus de soin" },
  hours: "Heures",
  hoursHint: hoursFr,
  hoursCount: countFr,
  rooms: "Pièces en plus",
  roomNames: { conservatory: "Véranda", utility: "Salle de lavage" },
  often: "Fréquence",
  freqs: { once: "Une fois", weekly: "Chaque semaine", biweekly: "Aux 2 semaines", monthly: "Chaque mois" },
  save: (n) => `économisez ${n} %`,
  freqOff: "Ce ménage est facturé une fois, sans rabais de visite régulière.",
  extras: "Extras",
  each: "chaque",
  extraNames: {
    oven: "Intérieur du four", fridge: "Intérieur du frigo", cabinets: "Intérieur des armoires", windows: "Fenêtres intérieures",
    baseboards: "Plinthes", laundry: "Lavage et pliage", linens: "Changement des draps", dishes: "Évier avec vaisselle",
    garage: "Garage", blinds: "Stores", pethair: "Poils d'animaux",
  },
  pets: "Animaux",
  petOpt: { none: "Aucun", dog: "Chien", cat: "Chat", other: "Autre" },
  petsAway: "Les animaux seront à l'écart",
  when: "Date",
  today: "Aujourd'hui",
  tomorrow: "Demain",
  windowsLabel: "Plage d'arrivée",
  windows: windowsFr,
  entry: "Accès",
  entries: {
    home: "Je serai à la maison", hidden: "Clé sous le paillasson", lockbox: "Boîte à clé ou code", doorman: "Portier ou concierge", other: "Autre",
  },
  entryPh: "Code ou autre détail",
  parking: "Stationnement",
  parks: { free: "Entrée ou rue gratuite", paid: "Payant ou avec permis" },
  supplies: "Produits",
  supplyYes: "Nous apportons tout",
  supplyNo: "Utiliser mes produits",
  weekend: "Visite de fin de semaine",
  contact: "Vos coordonnées",
  first: "Prénom",
  last: "Nom",
  fullName: "Nom",
  email: "Courriel",
  mobile: "Mobile",
  street: "Adresse",
  apt: "Appartement ou unité",
  city: "Ville",
  state: "Province",
  line2: "Adresse ligne 2",
  town: "Ville",
  postcode: "Code postal",
  notes: "Notes",
  notesPh: "Stationnement, animaux, priorités",
  summary: "Prix",
  cleaning: "Ménage",
  off: (m) => `${m} de rabais`,
  weekendLine: "Heures de fin de semaine",
  productsLine: "Produits fournis",
  tipLine: "Pourboire",
  total: "Total",
  perVisit: "par visite",
  oneTime: "une fois",
  thenPer: (m) => `Puis ${m} par visite`,
  from: (m) => `À partir de ${m}`,
  confirmed: "Le prix final est confirmé après avoir vu le logement.",
  tax: "Taxes en sus",
  tip: "Le pourboire est facultatif. Il va en entier à la personne qui fait le ménage.",
  tipNone: "Sans pourboire",
  payTitle: "Carte",
  payBody: "Facturé après le ménage. Rien n'est facturé sur cette page.",
  cardName: "Nom sur la carte",
  cardNumber: "Numéro de carte",
  cardExp: "Expiration",
  cardCvc: "Code de sécurité",
  terms: "J'accepte les conditions. Vous pouvez reporter ou annuler sans frais jusqu'à 24 heures avant. Si un point que nous avons nettoyé ne convient pas, nous reviendrons.",
  request: "Envoyer",
  doneTitle: "Demande reçue",
  doneBody: "Appelez, textez ou envoyez un courriel et nous confirmerons l'heure.",
  edit: "Modifier la demande",
  call: "Appeler",
  text: "Texto",
  emailUs: "Courriel",
  whatsapp: "WhatsApp",
  errArea: "Choisissez un secteur couvert pour demander le ménage.",
  errName: "Ajoutez votre nom",
  errEmail: "Ajoutez un courriel valide",
  errPhone: "Ajoutez un mobile",
  errDate: "Choisissez une date",
  errWindow: "Choisissez une plage d'arrivée",
  errTerms: "Acceptez les conditions pour continuer",
  regionsNav: "Pays",
  regions: { us: "États Unis", ca: "Canada", uk: "Royaume Uni" },
  currency: "Devise",
  language: "Langue",
  optional: "Facultatif",
  fewer: "Moins",
  more: "Plus",
  msgIntro: "Nouvelle demande de ménage",
  refLabel: "Réf",
  months: ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"],
};

const STR: Record<Lang, Copy> = { en, es, fr };

const ukServices: Record<string, SvcCopy> = {
  regular: { name: "Regular clean", items: ["Dusting and floors", "Kitchen and bathroom", "A regular visit"] },
  oneoff: { name: "One off clean", items: ["Same tasks as a regular clean", "Booked for one visit", "Minimum 2 hours"] },
  deep: { name: "Deep clean", items: ["Inside cupboards", "Skirting boards and worktops", "Behind furniture"] },
  tenancy: { name: "End of tenancy clean", items: ["A fixed price at the end of a tenancy", "Kitchen, bathrooms, and inside cupboards", "If the inventory check flags something we cleaned, ask us to come back"] },
  builders: { name: "After builders clean", items: ["Dust and debris after building work", "Floors, surfaces, and skirting", "A heavier clean than a regular visit"] },
  airbnb: { name: "Airbnb turnaround", items: ["Beds and kitchen", "Bathrooms", "Ready for the next guests"] },
};

export function getCopy(lang: Lang, region: Region): Copy {
  const base = STR[lang] ?? STR.en;
  if (region === "ca") {
    const frCa = lang === "fr";
    const copy = frCa ? STR.fr : STR.en;
    return {
      ...copy,
      area: frCa ? copy.area : "Postal code",
      areaPh: frCa ? "H2Y 1C6" : "A1A 1A1",
      areaBad: frCa ? copy.areaBad : "Enter a postal code like A1A 1A1.",
      state: frCa ? copy.state : "Province",
    };
  }
  if (region === "uk") {
    return {
      ...STR.en,
      lead: "Choose the home and the clean. The price updates as you go. Call, text, email, or WhatsApp when it looks right.",
      area: "Postcode",
      areaPh: "SW1A 1AA",
      areaBad: "Enter a postcode like SW1A 1AA.",
      services: ukServices,
      homes: {
        studioflat: "Studio flat", flat: "Flat", maisonette: "Maisonette", terraced: "Terraced house",
        semi: "Semi detached house", detached: "Detached house", bungalow: "Bungalow",
      },
      extraNames: {
        oven: "Inside oven", doubleoven: "Double oven", fridge: "Inside fridge or freezer", windows: "Inside windows",
        carpet: "Carpet steam clean", ironing: "Ironing", laundry: "Laundry", cupboards: "Inside cupboards",
        balcony: "Balcony", pethair: "Pet hair",
      },
      freqs: { ...STR.en.freqs, biweekly: "Fortnightly" },
      entries: {
        in: "I'll be in", keysafe: "Key safe", agent: "Collect keys from the agent", concierge: "Concierge", other: "Other",
      },
      parks: { free: "Free", permit: "Permit or pay and display", congestion: "Congestion charge" },
      supplyYes: "Cleaner brings products",
      supplyNo: "I have products and equipment",
      street: "Address line 1",
      payTitle: "Payment",
      payBody: "No payment now. Pay after the clean by card or bank transfer.",
      doneBody: "Call, text, email, or WhatsApp and we will confirm the time.",
    };
  }
  return base;
}
