// Plain, natural wording for each language. English is the key.
export type Lang = "en" | "ur" | "ar";
export const LANGS: { id: Lang; label: string }[] = [{ id: "en", label: "EN" }, { id: "ur", label: "اردو" }, { id: "ar", label: "العربية" }];

const UR: Record<string, string> = {
  "Price your home cleaning": "اپنے گھر کی صفائی کی قیمت جانیں",
  "Tell us about your home. The price and the model change as you go.": "اپنے گھر کے بارے میں بتائیں۔ قیمت اور ماڈل ساتھ ساتھ بدلتے جائیں گے۔",
  "Square footage": "رقبہ", "Floors": "منزلیں", "Bedrooms": "بیڈ روم", "Bathrooms": "باتھ روم", "Cleaning type": "صفائی کی قسم",
  "Standard": "عام صفائی", "Deep": "گہری صفائی", "Move out": "گھر خالی کرنے پر",
  "Dusting, floors, kitchen and bathrooms": "جھاڑ پونچھ، فرش، کچن اور باتھ روم",
  "Inside cupboards, grout, behind appliances": "الماریوں کے اندر، ٹائلوں کی درزیں، مشینوں کے پیچھے",
  "Empty home, every surface, ready to hand over": "خالی گھر، ہر سطح صاف، حوالگی کے لیے تیار",
  "Add extras": "اضافی خدمات", "Maid's room, majlis, sofa and more": "میڈ روم، مجلس، صوفہ اور مزید",
  "Maid's room": "میڈ روم", "Balcony": "بالکونی", "Majlis": "مجلس", "Sofa": "صوفہ", "Carpet": "قالین", "Windows": "کھڑکیاں", "Oven": "اوون", "Fridge": "فریج",
  "Weekly": "ہفتہ وار", "See details": "تفصیل دیکھیں", "Book this cleaning": "یہ صفائی بُک کریں", "Estimated total": "اندازاً کل",
  "Open floors": "منزلیں الگ کریں", "Roof": "چھت",
  "Living room": "لیونگ روم", "Kitchen": "کچن", "Bedroom": "بیڈ روم", "Bathroom": "باتھ روم", "Hall": "راہداری",
  "Drag to turn · scroll to zoom": "گھمانے کے لیے کھینچیں · زوم کے لیے اسکرول کریں", "Drag to turn": "گھمانے کے لیے کھینچیں",
  "Minimum visit": "کم از کم وزٹ", "Extra floors": "اضافی منزلیں",
  "Pick a day and tell us where to go.": "دن چنیں اور بتائیں کہاں آنا ہے۔",
  "Full name": "پورا نام", "Phone": "فون", "Date": "تاریخ", "More details (optional)": "مزید تفصیل (اختیاری)", "Time": "وقت", "Email": "ای میل", "Address": "پتہ",
  "Villa or flat, building, area, emirate": "ولا یا فلیٹ، عمارت، علاقہ، امارت",
  "Notes for the crew": "ٹیم کے لیے ہدایات", "Gate code, parking, rooms to skip": "گیٹ کوڈ، پارکنگ، کون سے کمرے چھوڑنے ہیں",
  "Send booking on WhatsApp": "واٹس ایپ پر بکنگ بھیجیں",
  "This opens WhatsApp with your booking written out. Nothing is sent until you press send there.": "واٹس ایپ میں آپ کی بکنگ لکھی ہوئی کھلے گی۔ جب تک آپ وہاں بھیجیں نہیں دبائیں گے، کچھ نہیں جائے گا۔",
  "Please fill this in": "یہ خانہ بھریں", "Please check the number": "نمبر دوبارہ دیکھیں",
  "Opening WhatsApp": "واٹس ایپ کھل رہا ہے", "Done": "ٹھیک ہے", "Close": "بند کریں", "Language": "زبان",
};
const AR: Record<string, string> = {
  "Price your home cleaning": "احسب تكلفة تنظيف منزلك",
  "Tell us about your home. The price and the model change as you go.": "أخبرنا عن منزلك، ويتغيّر السعر والمجسّم مع كل اختيار.",
  "Square footage": "المساحة", "Floors": "الطوابق", "Bedrooms": "غرف النوم", "Bathrooms": "الحمّامات", "Cleaning type": "نوع التنظيف",
  "Standard": "تنظيف عادي", "Deep": "تنظيف عميق", "Move out": "تنظيف عند الإخلاء",
  "Dusting, floors, kitchen and bathrooms": "إزالة الغبار، الأرضيات، المطبخ والحمّامات",
  "Inside cupboards, grout, behind appliances": "داخل الخزائن، فواصل البلاط، خلف الأجهزة",
  "Empty home, every surface, ready to hand over": "منزل فارغ، كل الأسطح، جاهز للتسليم",
  "Add extras": "إضافات", "Maid's room, majlis, sofa and more": "غرفة الخادمة، المجلس، الكنب والمزيد",
  "Maid's room": "غرفة الخادمة", "Balcony": "الشرفة", "Majlis": "المجلس", "Sofa": "الكنب", "Carpet": "السجاد", "Windows": "النوافذ", "Oven": "الفرن", "Fridge": "الثلاجة",
  "Weekly": "أسبوعي", "See details": "عرض التفاصيل", "Book this cleaning": "احجز هذا التنظيف", "Estimated total": "الإجمالي التقديري",
  "Open floors": "فصل الطوابق", "Roof": "السقف",
  "Living room": "الصالة", "Kitchen": "المطبخ", "Bedroom": "غرفة النوم", "Bathroom": "الحمّام", "Hall": "الممر",
  "Drag to turn · scroll to zoom": "اسحب للتدوير · مرّر للتكبير", "Drag to turn": "اسحب للتدوير",
  "Minimum visit": "الحد الأدنى للزيارة", "Extra floors": "طوابق إضافية",
  "Pick a day and tell us where to go.": "اختر اليوم وأخبرنا بالعنوان.",
  "Full name": "الاسم الكامل", "Phone": "الهاتف", "Date": "التاريخ", "More details (optional)": "تفاصيل إضافية (اختياري)", "Time": "الوقت", "Email": "البريد الإلكتروني", "Address": "العنوان",
  "Villa or flat, building, area, emirate": "فيلا أو شقة، المبنى، المنطقة، الإمارة",
  "Notes for the crew": "ملاحظات للفريق", "Gate code, parking, rooms to skip": "رمز البوابة، المواقف، غرف لا تحتاج تنظيف",
  "Send booking on WhatsApp": "أرسل الحجز عبر واتساب",
  "This opens WhatsApp with your booking written out. Nothing is sent until you press send there.": "سيفتح واتساب ورسالة الحجز جاهزة. لن يُرسل شيء حتى تضغط إرسال هناك.",
  "Please fill this in": "يرجى تعبئة هذا الحقل", "Please check the number": "يرجى التأكد من الرقم",
  "Opening WhatsApp": "جارٍ فتح واتساب", "Done": "تم", "Close": "إغلاق", "Language": "اللغة",
};
const D: Record<Lang, Record<string, string>> = { en: {}, ur: UR, ar: AR };
export const tr = (lang: Lang) => (s: string) => D[lang][s] ?? s;

export const cur = (lang: Lang, c: string) => (lang === "en" ? c : lang === "ur" ? "درہم" : "درهم");
export const money = (lang: Lang, c: string, n: string) => `${cur(lang, c)} ${n}`;

/** Sentences with numbers, written naturally per language. */
export function phr(lang: Lang) {
  return {
    range: (a: string, b: string) => lang === "ur" ? `${a} سے ${b} مربع فٹ` : lang === "ar" ? `من ${a} إلى ${b} قدم مربع` : `${a} to ${b} sq ft`,
    perSqft: (m: string) => lang === "ur" ? `${m} فی مربع فٹ` : lang === "ar" ? `${m} للقدم المربع` : `${m} / sq ft`,
    added: (n: number) => lang === "ur" ? `${n} شامل` : lang === "ar" ? `${n} مضافة` : `${n} added`,
    crew: (h: number, c: number) => lang === "ur" ? `تقریباً ${h} گھنٹے، ${c} افراد کی ٹیم` : lang === "ar" ? `حوالي ${h} ساعات مع فريق من ${c}` : `About ${h} hours with a crew of ${c}`,
    save: (p: number) => lang === "ur" ? `${p}% بچت` : lang === "ar" ? `وفّر ${p}%` : `save ${p}%`,
    saved: (m: string) => lang === "ur" ? `آپ کی بچت ${m}` : lang === "ar" ? `توفّر ${m}` : `you save ${m}`,
    weeklyLine: (p: number) => lang === "ur" ? `ہفتہ وار پلان، ${p}% رعایت` : lang === "ar" ? `الخطة الأسبوعية، خصم ${p}%` : `Weekly plan, ${p}% off`,
    vat: (p: number) => lang === "ur" ? `ٹیکس (VAT) ${p}%` : lang === "ar" ? `ضريبة القيمة المضافة ${p}%` : `VAT ${p}%`,
    title: (f: number) => lang === "ur" ? `${f} منزلہ گھر` : lang === "ar" ? (f === 1 ? "منزل من طابق واحد" : f === 2 ? "منزل من طابقين" : `منزل من ${f} طوابق`) : `A ${f} floor home`,
    sqft: (s: string) => lang === "ur" ? `${s} مربع فٹ` : lang === "ar" ? `${s} قدم مربع` : `${s} sq ft`,
    bed: (n: number) => lang === "ur" ? `${n} بیڈ` : lang === "ar" ? `${n} نوم` : `${n} bed`,
    bath: (n: number) => lang === "ur" ? `${n} باتھ` : lang === "ar" ? `${n} حمّام` : `${n} bath`,
    clean: (t: string) => lang === "en" ? `${t.toLowerCase()} cleaning` : t,
    fewer: (l: string) => lang === "en" ? `Fewer ${l.toLowerCase()}` : `− ${l}`,
    more: (l: string) => lang === "en" ? `More ${l.toLowerCase()}` : `+ ${l}`,
    sent: (b: string) => lang === "ur" ? `آپ کی بکنگ لکھ دی گئی ہے۔ ${b} کے ساتھ تصدیق کے لیے واٹس ایپ میں بھیجیں دبائیں۔` : lang === "ar" ? `تمت كتابة حجزك. اضغط إرسال في واتساب لتأكيده مع ${b}.` : `Your booking is written out. Press send in WhatsApp to confirm it with ${b}.`,
  };
}
