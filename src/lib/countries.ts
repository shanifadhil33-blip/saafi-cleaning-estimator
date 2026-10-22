/* Country calling codes for the booking phone field.
   Flags are the MIT flag-icons SVGs in public/flags (Copyright 2013 Panayiotis Lipiridis). */
export type PhoneLang = "en" | "es" | "fr" | "ar" | "ur" | "hi";

export type Country = {
  iso: string;
  dial: string;
  name: string;
  min: number;
  max: number;
  groups: number[];
  example: string;
};

type Row = [iso: string, dial: string, name: string, min: number, max: number, example: string];

/** UAE, the rest of the GCC, then the United States, Canada, and the United Kingdom. */
export const PRIORITY_ISOS = ["AE", "SA", "QA", "KW", "BH", "OM", "US", "CA", "GB"] as const;

const NAME_LANGS: PhoneLang[] = ["es", "fr", "ar", "ur", "hi"];

const ALIASES: Record<string, string[]> = {
  AE: ["uae", "emirates"],
  SA: ["ksa", "saudi"],
  US: ["usa", "america"],
  GB: ["uk", "britain", "england", "great britain"],
  CA: ["canada"],
};

const ROWS: Row[] = [
  ["AE", "971", "United Arab Emirates", 8, 9, "50 123 4567"],
  ["SA", "966", "Saudi Arabia", 9, 9, "51 234 5678"],
  ["QA", "974", "Qatar", 8, 8, "3312 3456"],
  ["KW", "965", "Kuwait", 8, 8, "5012 3456"],
  ["BH", "973", "Bahrain", 8, 8, "3600 1234"],
  ["OM", "968", "Oman", 8, 8, "9212 3456"],
  ["US", "1", "United States", 10, 10, "201 555 0123"],
  ["CA", "1", "Canada", 10, 10, "416 555 0199"],
  ["GB", "44", "United Kingdom", 10, 10, "7700 900000"],
  ["AD", "376", "Andorra", 6, 9, "312 345"],
  ["AF", "93", "Afghanistan", 9, 9, "70 123 4567"],
  ["AG", "1", "Antigua and Barbuda", 10, 10, "268 555 0123"],
  ["AI", "1", "Anguilla", 10, 10, "264 555 0123"],
  ["AL", "355", "Albania", 8, 9, "67 212 3456"],
  ["AM", "374", "Armenia", 8, 8, "77 123 456"],
  ["AO", "244", "Angola", 9, 9, "923 123 456"],
  ["AQ", "672", "Antarctica", 5, 6, "12 3456"],
  ["AR", "54", "Argentina", 10, 10, "11 2345 6789"],
  ["AS", "1", "American Samoa", 10, 10, "684 555 0123"],
  ["AT", "43", "Austria", 7, 13, "664 1234567"],
  ["AU", "61", "Australia", 9, 9, "412 345 678"],
  ["AW", "297", "Aruba", 7, 7, "560 1234"],
  ["AX", "358", "Aland Islands", 6, 12, "18 123 4567"],
  ["AZ", "994", "Azerbaijan", 9, 9, "50 123 45 67"],
  ["BA", "387", "Bosnia and Herzegovina", 8, 8, "61 123 456"],
  ["BB", "1", "Barbados", 10, 10, "246 555 0123"],
  ["BD", "880", "Bangladesh", 10, 10, "1712 345678"],
  ["BE", "32", "Belgium", 8, 9, "470 12 34 56"],
  ["BF", "226", "Burkina Faso", 8, 8, "70 12 34 56"],
  ["BG", "359", "Bulgaria", 8, 9, "87 123 4567"],
  ["BI", "257", "Burundi", 8, 8, "79 12 34 56"],
  ["BJ", "229", "Benin", 8, 8, "90 12 34 56"],
  ["BL", "590", "Saint Barthelemy", 9, 9, "690 12 34 56"],
  ["BM", "1", "Bermuda", 10, 10, "441 555 0123"],
  ["BN", "673", "Brunei", 7, 7, "712 3456"],
  ["BO", "591", "Bolivia", 8, 8, "7123 4567"],
  ["BQ", "599", "Caribbean Netherlands", 7, 7, "318 1234"],
  ["BR", "55", "Brazil", 10, 11, "11 91234 5678"],
  ["BS", "1", "Bahamas", 10, 10, "242 555 0123"],
  ["BT", "975", "Bhutan", 8, 8, "17 12 34 56"],
  ["BW", "267", "Botswana", 8, 8, "71 123 456"],
  ["BY", "375", "Belarus", 9, 9, "29 123 45 67"],
  ["BZ", "501", "Belize", 7, 7, "622 1234"],
  ["CC", "61", "Cocos Islands", 9, 9, "412 345 678"],
  ["CD", "243", "Democratic Republic of the Congo", 9, 9, "81 234 5678"],
  ["CF", "236", "Central African Republic", 8, 8, "70 12 34 56"],
  ["CG", "242", "Congo", 9, 9, "06 123 4567"],
  ["CH", "41", "Switzerland", 9, 9, "78 123 45 67"],
  ["CI", "225", "Cote d'Ivoire", 10, 10, "01 23 45 67 89"],
  ["CK", "682", "Cook Islands", 5, 5, "71 234"],
  ["CL", "56", "Chile", 9, 9, "9 1234 5678"],
  ["CM", "237", "Cameroon", 9, 9, "6 71 23 45 67"],
  ["CN", "86", "China", 11, 11, "131 2345 6789"],
  ["CO", "57", "Colombia", 10, 10, "321 123 4567"],
  ["CR", "506", "Costa Rica", 8, 8, "8312 3456"],
  ["CU", "53", "Cuba", 8, 8, "5 123 4567"],
  ["CV", "238", "Cape Verde", 7, 7, "991 1234"],
  ["CW", "599", "Curacao", 7, 7, "9 518 123"],
  ["CX", "61", "Christmas Island", 9, 9, "412 345 678"],
  ["CY", "357", "Cyprus", 8, 8, "96 123456"],
  ["CZ", "420", "Czechia", 9, 9, "601 123 456"],
  ["DE", "49", "Germany", 6, 13, "151 23456789"],
  ["DJ", "253", "Djibouti", 8, 8, "77 12 34 56"],
  ["DK", "45", "Denmark", 8, 8, "32 12 34 56"],
  ["DM", "1", "Dominica", 10, 10, "767 555 0123"],
  ["DO", "1", "Dominican Republic", 10, 10, "809 555 0123"],
  ["DZ", "213", "Algeria", 9, 9, "551 23 45 67"],
  ["EC", "593", "Ecuador", 9, 9, "99 123 4567"],
  ["EE", "372", "Estonia", 7, 8, "5123 4567"],
  ["EG", "20", "Egypt", 9, 10, "100 123 4567"],
  ["EH", "212", "Western Sahara", 9, 9, "650 123456"],
  ["ER", "291", "Eritrea", 7, 7, "7 123 456"],
  ["ES", "34", "Spain", 9, 9, "612 34 56 78"],
  ["ET", "251", "Ethiopia", 9, 9, "91 123 4567"],
  ["FI", "358", "Finland", 6, 12, "41 234 5678"],
  ["FJ", "679", "Fiji", 7, 7, "701 2345"],
  ["FK", "500", "Falkland Islands", 5, 5, "51 234"],
  ["FM", "691", "Micronesia", 7, 7, "350 1234"],
  ["FO", "298", "Faroe Islands", 6, 6, "211 234"],
  ["FR", "33", "France", 9, 9, "6 12 34 56 78"],
  ["GA", "241", "Gabon", 8, 8, "06 12 34 56"],
  ["GD", "1", "Grenada", 10, 10, "473 555 0123"],
  ["GE", "995", "Georgia", 9, 9, "555 12 34 56"],
  ["GF", "594", "French Guiana", 9, 9, "694 12 34 56"],
  ["GG", "44", "Guernsey", 10, 10, "7781 123456"],
  ["GH", "233", "Ghana", 9, 9, "23 123 4567"],
  ["GI", "350", "Gibraltar", 8, 8, "5712 3456"],
  ["GL", "299", "Greenland", 6, 6, "22 12 34"],
  ["GM", "220", "Gambia", 7, 7, "301 2345"],
  ["GN", "224", "Guinea", 9, 9, "601 12 34 56"],
  ["GP", "590", "Guadeloupe", 9, 9, "690 12 34 56"],
  ["GQ", "240", "Equatorial Guinea", 9, 9, "222 123 456"],
  ["GR", "30", "Greece", 10, 10, "691 234 5678"],
  ["GS", "500", "South Georgia", 5, 5, "51 234"],
  ["GT", "502", "Guatemala", 8, 8, "5123 4567"],
  ["GU", "1", "Guam", 10, 10, "671 555 0123"],
  ["GW", "245", "Guinea Bissau", 7, 7, "955 1234"],
  ["GY", "592", "Guyana", 7, 7, "609 1234"],
  ["HK", "852", "Hong Kong", 8, 8, "5123 4567"],
  ["HN", "504", "Honduras", 8, 8, "9123 4567"],
  ["HR", "385", "Croatia", 8, 9, "91 234 5678"],
  ["HT", "509", "Haiti", 8, 8, "34 12 3456"],
  ["HU", "36", "Hungary", 8, 9, "20 123 4567"],
  ["ID", "62", "Indonesia", 9, 12, "812 3456 7890"],
  ["IE", "353", "Ireland", 9, 9, "85 123 4567"],
  ["IL", "972", "Israel", 9, 9, "50 123 4567"],
  ["IM", "44", "Isle of Man", 10, 10, "7924 123456"],
  ["IN", "91", "India", 10, 10, "98765 43210"],
  ["IO", "246", "British Indian Ocean Territory", 7, 7, "370 1234"],
  ["IQ", "964", "Iraq", 10, 10, "791 234 5678"],
  ["IR", "98", "Iran", 10, 10, "912 345 6789"],
  ["IS", "354", "Iceland", 7, 7, "611 1234"],
  ["IT", "39", "Italy", 8, 11, "312 345 6789"],
  ["JE", "44", "Jersey", 10, 10, "7797 123456"],
  ["JM", "1", "Jamaica", 10, 10, "876 555 0123"],
  ["JO", "962", "Jordan", 9, 9, "7 9012 3456"],
  ["JP", "81", "Japan", 10, 10, "90 1234 5678"],
  ["KE", "254", "Kenya", 9, 9, "712 123456"],
  ["KG", "996", "Kyrgyzstan", 9, 9, "700 123 456"],
  ["KH", "855", "Cambodia", 8, 9, "91 234 567"],
  ["KI", "686", "Kiribati", 5, 8, "7200 1234"],
  ["KM", "269", "Comoros", 7, 7, "321 2345"],
  ["KN", "1", "Saint Kitts and Nevis", 10, 10, "869 555 0123"],
  ["KP", "850", "North Korea", 8, 10, "192 123 4567"],
  ["KR", "82", "South Korea", 9, 10, "10 1234 5678"],
  ["KY", "1", "Cayman Islands", 10, 10, "345 555 0123"],
  ["KZ", "7", "Kazakhstan", 10, 10, "701 234 5678"],
  ["LA", "856", "Laos", 8, 10, "20 23 123 456"],
  ["LB", "961", "Lebanon", 7, 8, "71 123 456"],
  ["LC", "1", "Saint Lucia", 10, 10, "758 555 0123"],
  ["LI", "423", "Liechtenstein", 7, 7, "660 1234"],
  ["LK", "94", "Sri Lanka", 9, 9, "71 234 5678"],
  ["LR", "231", "Liberia", 7, 9, "77 123 4567"],
  ["LS", "266", "Lesotho", 8, 8, "5012 3456"],
  ["LT", "370", "Lithuania", 8, 8, "612 34567"],
  ["LU", "352", "Luxembourg", 8, 9, "628 123 456"],
  ["LV", "371", "Latvia", 8, 8, "21 234 567"],
  ["LY", "218", "Libya", 9, 9, "91 234 5678"],
  ["MA", "212", "Morocco", 9, 9, "650 123456"],
  ["MC", "377", "Monaco", 8, 9, "6 12 34 56 78"],
  ["MD", "373", "Moldova", 8, 8, "621 12 345"],
  ["ME", "382", "Montenegro", 8, 8, "67 123 456"],
  ["MF", "590", "Saint Martin", 9, 9, "690 12 34 56"],
  ["MG", "261", "Madagascar", 9, 9, "32 12 345 67"],
  ["MH", "692", "Marshall Islands", 7, 7, "235 1234"],
  ["MK", "389", "North Macedonia", 8, 8, "72 123 456"],
  ["ML", "223", "Mali", 8, 8, "65 12 34 56"],
  ["MM", "95", "Myanmar", 8, 10, "9 123 456 789"],
  ["MN", "976", "Mongolia", 8, 8, "8812 3456"],
  ["MO", "853", "Macau", 8, 8, "6612 3456"],
  ["MP", "1", "Northern Mariana Islands", 10, 10, "670 555 0123"],
  ["MQ", "590", "Martinique", 9, 9, "696 12 34 56"],
  ["MR", "222", "Mauritania", 8, 8, "22 12 34 56"],
  ["MS", "1", "Montserrat", 10, 10, "664 555 0123"],
  ["MT", "356", "Malta", 8, 8, "9696 1234"],
  ["MU", "230", "Mauritius", 8, 8, "5251 2345"],
  ["MV", "960", "Maldives", 7, 7, "771 2345"],
  ["MW", "265", "Malawi", 9, 9, "991 23 45 67"],
  ["MX", "52", "Mexico", 10, 10, "222 123 4567"],
  ["MY", "60", "Malaysia", 9, 10, "12 345 6789"],
  ["MZ", "258", "Mozambique", 9, 9, "82 123 4567"],
  ["NA", "264", "Namibia", 9, 9, "81 123 4567"],
  ["NC", "687", "New Caledonia", 6, 6, "75 12 34"],
  ["NE", "227", "Niger", 8, 8, "93 12 34 56"],
  ["NF", "672", "Norfolk Island", 6, 6, "3 81234"],
  ["NG", "234", "Nigeria", 10, 10, "802 123 4567"],
  ["NI", "505", "Nicaragua", 8, 8, "8123 4567"],
  ["NL", "31", "Netherlands", 9, 9, "6 12345678"],
  ["NO", "47", "Norway", 8, 8, "406 12 345"],
  ["NP", "977", "Nepal", 10, 10, "984 123 4567"],
  ["NR", "674", "Nauru", 7, 7, "555 1234"],
  ["NU", "683", "Niue", 4, 4, "1234"],
  ["NZ", "64", "New Zealand", 8, 10, "21 123 4567"],
  ["PA", "507", "Panama", 8, 8, "6123 4567"],
  ["PE", "51", "Peru", 9, 9, "912 345 678"],
  ["PF", "689", "French Polynesia", 8, 8, "87 12 34 56"],
  ["PG", "675", "Papua New Guinea", 8, 8, "7012 3456"],
  ["PH", "63", "Philippines", 10, 10, "905 123 4567"],
  ["PK", "92", "Pakistan", 10, 10, "301 2345678"],
  ["PL", "48", "Poland", 9, 9, "512 345 678"],
  ["PM", "508", "Saint Pierre and Miquelon", 6, 6, "55 12 34"],
  ["PN", "64", "Pitcairn Islands", 4, 9, "12 3456"],
  ["PR", "1", "Puerto Rico", 10, 10, "787 555 0123"],
  ["PS", "970", "Palestine", 9, 9, "599 123 456"],
  ["PT", "351", "Portugal", 9, 9, "912 345 678"],
  ["PW", "680", "Palau", 7, 7, "620 1234"],
  ["PY", "595", "Paraguay", 9, 9, "961 123456"],
  ["RE", "262", "Reunion", 9, 9, "692 12 34 56"],
  ["RO", "40", "Romania", 9, 9, "712 345 678"],
  ["RS", "381", "Serbia", 8, 9, "60 1234567"],
  ["RU", "7", "Russia", 10, 10, "912 345 67 89"],
  ["RW", "250", "Rwanda", 9, 9, "720 123 456"],
  ["SB", "677", "Solomon Islands", 7, 7, "74 12345"],
  ["SC", "248", "Seychelles", 7, 7, "2 510 123"],
  ["SD", "249", "Sudan", 9, 9, "91 123 4567"],
  ["SE", "46", "Sweden", 9, 9, "70 123 45 67"],
  ["SG", "65", "Singapore", 8, 8, "8123 4567"],
  ["SH", "290", "Saint Helena", 4, 4, "1234"],
  ["SI", "386", "Slovenia", 8, 8, "31 234 567"],
  ["SJ", "47", "Svalbard", 8, 8, "412 34 567"],
  ["SK", "421", "Slovakia", 9, 9, "912 123 456"],
  ["SL", "232", "Sierra Leone", 8, 8, "25 123456"],
  ["SM", "378", "San Marino", 8, 10, "66 66 12 12"],
  ["SN", "221", "Senegal", 9, 9, "70 123 45 67"],
  ["SO", "252", "Somalia", 8, 9, "61 234 5678"],
  ["SR", "597", "Suriname", 7, 7, "741 2345"],
  ["SS", "211", "South Sudan", 9, 9, "977 123 456"],
  ["ST", "239", "Sao Tome and Principe", 7, 7, "981 2345"],
  ["SV", "503", "El Salvador", 8, 8, "7012 3456"],
  ["SX", "1", "Sint Maarten", 10, 10, "721 555 0123"],
  ["SY", "963", "Syria", 9, 9, "944 567 890"],
  ["SZ", "268", "Eswatini", 8, 8, "7612 3456"],
  ["TC", "1", "Turks and Caicos", 10, 10, "649 555 0123"],
  ["TD", "235", "Chad", 8, 8, "63 01 23 45"],
  ["TG", "228", "Togo", 8, 8, "90 12 34 56"],
  ["TH", "66", "Thailand", 9, 9, "81 234 5678"],
  ["TJ", "992", "Tajikistan", 9, 9, "917 12 3456"],
  ["TK", "690", "Tokelau", 4, 4, "7290"],
  ["TL", "670", "Timor Leste", 8, 8, "7721 2345"],
  ["TM", "993", "Turkmenistan", 8, 8, "65 123456"],
  ["TN", "216", "Tunisia", 8, 8, "20 123 456"],
  ["TO", "676", "Tonga", 7, 7, "771 2345"],
  ["TR", "90", "Turkey", 10, 10, "501 234 56 78"],
  ["TT", "1", "Trinidad and Tobago", 10, 10, "868 555 0123"],
  ["TV", "688", "Tuvalu", 5, 6, "90 1234"],
  ["TW", "886", "Taiwan", 9, 9, "912 345 678"],
  ["TZ", "255", "Tanzania", 9, 9, "621 234 567"],
  ["UA", "380", "Ukraine", 9, 9, "50 123 4567"],
  ["UG", "256", "Uganda", 9, 9, "712 345678"],
  ["UY", "598", "Uruguay", 8, 8, "94 123 456"],
  ["UZ", "998", "Uzbekistan", 9, 9, "91 234 56 78"],
  ["VA", "39", "Vatican City", 6, 11, "06 698 12345"],
  ["VC", "1", "Saint Vincent and the Grenadines", 10, 10, "784 555 0123"],
  ["VE", "58", "Venezuela", 10, 10, "412 123 4567"],
  ["VG", "1", "British Virgin Islands", 10, 10, "284 555 0123"],
  ["VI", "1", "US Virgin Islands", 10, 10, "340 555 0123"],
  ["VN", "84", "Vietnam", 9, 9, "91 234 56 78"],
  ["VU", "678", "Vanuatu", 7, 7, "591 2345"],
  ["WF", "681", "Wallis and Futuna", 6, 6, "82 12 34"],
  ["WS", "685", "Samoa", 7, 7, "72 12345"],
  ["XK", "383", "Kosovo", 8, 8, "43 123 456"],
  ["YE", "967", "Yemen", 9, 9, "712 345 678"],
  ["YT", "262", "Mayotte", 9, 9, "639 12 34 56"],
  ["ZA", "27", "South Africa", 9, 9, "71 123 4567"],
  ["ZM", "260", "Zambia", 9, 9, "95 1234567"],
  ["ZW", "263", "Zimbabwe", 9, 9, "71 234 5678"],
];

function build(row: Row): Country {
  const [iso, dial, name, min, max, example] = row;
  const parts = example.split(" ");
  const groups = parts.map((part) => part.length);
  const count = parts.join("").replace(/\D/g, "").length;
  if (count < min || count > max) throw new Error(`${iso} example is outside its length`);
  if (/[—–-]/.test(name + example)) throw new Error(`${iso} copy has a dash`);
  return { iso, dial, name, min, max, groups, example };
}

export const COUNTRIES: Country[] = ROWS.map(build);
const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

export function countryByIso(iso: string | null | undefined): Country | undefined {
  if (!iso) return undefined;
  return BY_ISO.get(iso.trim().toUpperCase());
}

/** The page market leads, then the other key markets in the standard order. */
export function priorityIsos(lead?: string | null): string[] {
  const iso = (lead || "AE").trim().toUpperCase();
  const rest = PRIORITY_ISOS.filter((id) => id !== iso);
  return iso === "AE" ? [...PRIORITY_ISOS] : [iso, ...rest];
}

/** Company config country, or the United Arab Emirates when it is missing or unknown. */
export function resolveCountry(iso?: string | null): Country {
  return countryByIso(iso) ?? BY_ISO.get("AE")!;
}

export function marketCountry(id: "us" | "ca" | "uk"): Country {
  return resolveCountry(id === "us" ? "US" : id === "ca" ? "CA" : "GB");
}

const nameCache = new Map<string, string>();
const displayers = new Map<PhoneLang, Intl.DisplayNames>();

function soften(name: string): string {
  return name.replace(/[—–-]/g, " ").replace(/\s+/g, " ").trim();
}

/** Translated country name. English stays the table name. Other languages come from Intl, with hyphens turned into spaces. */
export function displayName(c: Country, lang: PhoneLang): string {
  if (lang === "en") return c.name;
  const key = `${lang}:${c.iso}`;
  const cached = nameCache.get(key);
  if (cached) return cached;
  let name = c.name;
  try {
    let fmt = displayers.get(lang);
    if (!fmt) {
      fmt = new Intl.DisplayNames([lang], { type: "region" });
      displayers.set(lang, fmt);
    }
    const raw = fmt.of(c.iso);
    if (raw && raw.toUpperCase() !== c.iso) name = soften(raw);
  } catch {
    name = c.name;
  }
  nameCache.set(key, name);
  return name;
}

export function flagSrc(iso: string): string {
  return `/flags/${iso.toLowerCase()}.svg`;
}

const FOLD = /\p{M}/gu;

function fold(value: string): string {
  return soften(value.toLowerCase().normalize("NFD").replace(FOLD, ""));
}

function searchNames(c: Country): string[] {
  return [c.name, ...NAME_LANGS.map((lang) => displayName(c, lang)), ...(ALIASES[c.iso] || [])];
}

export function listCountries(query: string, lang: PhoneLang, lead?: string | null): { countries: Country[]; priorityCount: number } {
  const q = fold(query.trim());
  const dialQ = q.replace(/^\+/, "").replace(/^00/, "");
  const order = priorityIsos(lead).filter((iso) => BY_ISO.has(iso));
  const priority = new Set(order);
  const match = (c: Country) => {
    if (!q) return true;
    if (searchNames(c).some((name) => fold(name).includes(q))) return true;
    if (c.iso.toLowerCase().includes(q)) return true;
    return Boolean(dialQ) && c.dial.startsWith(dialQ);
  };
  const picked = COUNTRIES.filter(match);
  const top = order.map((iso) => picked.find((c) => c.iso === iso)).filter((c): c is Country => Boolean(c));
  const rest = picked.filter((c) => !priority.has(c.iso)).sort((a, b) => displayName(a, lang).localeCompare(displayName(b, lang), lang === "ar" || lang === "ur" || lang === "hi" ? "en" : lang));
  return { countries: [...top, ...rest], priorityCount: q ? 0 : top.length };
}

/** Digits to send. A single leading 0 is the trunk prefix and is removed, except where the country's own placeholder starts with 0. A pasted calling code is removed when it is not itself a valid national length. */
export function nationalDigits(raw: string, country?: Country): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  const trunk = !country?.example.startsWith("0");
  if (trunk && d.startsWith("0")) d = d.slice(1);
  if (country && d.startsWith(country.dial)) {
    const rest = d.slice(country.dial.length);
    const fullOk = d.length >= country.min && d.length <= country.max;
    const restOk = rest.length >= country.min && rest.length <= country.max;
    if (restOk && !fullOk) d = rest;
  }
  return d;
}

export function formatNational(digits: string, groups: number[]): string {
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  while (i < digits.length) {
    parts.push(digits.slice(i, i + 3));
    i += 3;
  }
  return parts.join(" ");
}

/** International form such as +44 7700 900000. Empty when there are no digits. */
export function formatInternational(iso: string, raw: string): string {
  const country = countryByIso(iso);
  if (!country) return "";
  const digits = nationalDigits(raw, country);
  if (!digits) return "";
  return `+${country.dial} ${formatNational(digits, country.groups)}`;
}

export function phoneIssue(iso: string, raw: string): "empty" | "invalid" | null {
  const country = countryByIso(iso);
  if (!country) return "invalid";
  const digits = nationalDigits(raw, country);
  if (!digits) return raw.trim() ? "invalid" : "empty";
  if (digits.length < country.min || digits.length > country.max) return "invalid";
  return null;
}
