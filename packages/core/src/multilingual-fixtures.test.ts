import { describe, expect, it } from 'vitest';
import { analyzeText, createBidiStream, needsBidiIntervention, planInlineIsolation } from './index.js';

// Candidate prose supplied in PRs 111-118, 128-131 and 145 (excluding 115).
// These are source/range regression checks, NOT UAX #9 conformance, visual
// punctuation-placement tests, or native-speaker validation.
const fixtures = [
  ["PR112 ar 1","قم بتثبيت الحزمة باستخدام الأمر pip install requests في سطر الأوامر.",["pip install requests"],[]],
  ["PR112 ar 2","بلغ عدد المستخدمين النشطين أكثر من ١٠٠٠٠ مستخدم.",[],[]],
  ["PR112 ar 3","أرسل طلب POST إلى https://api.example.com/v1/auth للتحقق.",[],["https://api.example.com"]],
  ["PR112 ar 4","هل تم تشغيل الخادم بنجاح؟",[],[]],
  ["PR117 ckb 5","تکایە فەرمانی git checkout main لە تێرمیناڵ بنووسە.",["git checkout main"],[]],
  ["PR117 ckb 6","ئەم پرۆگرامە زۆر بەسوودە بۆ خوێندکارانی زانکۆ.",[],[]],
  ["PR117 ckb 7","بۆ بینینی دۆکیۆمێنت سەردانی https://example.com/ckb بکە.",["https://example.com/ckb"],[]],
  ["PR117 ckb 8","نرخەکەی بریتییە لە 50,000 دیناری عێراقی.",[],[]],
  ["PR130 emoji 9","👨‍💻 توسعه‌دهندگان گرامی، نسخه آزمایشی آماده تست است.",[],[]],
  ["PR130 emoji 10","با تشکر از همکاری شما در پروژه! 👍🏽",[],[]],
  ["PR130 emoji 11","برای شروع پروژه 🚀 دستور npm start را اجرا کنید.",["npm start"],[]],
  ["PR130 emoji 12","بازخورد تیم: 🎉 ❤️ 👏 🔥 عالی بود!",[],[]],
  ["PR111 fa 13","دستور npm run build را برای کامپایل پروژه اجرا کنید.",["npm run build"],[]],
  ["PR111 fa 14","نسخه جدید با ۱۲٫۵ درصد بهبود کارایی منتشر شد.",[],[]],
  ["PR111 fa 15","تنظیمات در مسیر ./config/settings.json ذخیره شدند.",["./config/settings.json"],[]],
  ["PR111 fa 16","آیا از این کتابخانه استفاده می‌کنید؟ بله، عالی است!",[],[]],
  ["PR111 fa 17","مقدار متغیر NODE_ENV را بر روی production قرار دهید.",["NODE_ENV"],[]],
  ["PR113 he 18","כדי להפעיל את הבדיקות, הרץ את הפקודה pnpm test בטרמינל.",["pnpm test"],[]],
  ["PR113 he 19","לפרטים נוספים בקר בכתובת https://example.com/docs?lang=he&mode=dark בעברית.",[],["https://example.com/docs"]],
  ["PR113 he 20","המחיר הכולל הוא 250 ₪ כולל מע״מ.",[],[]],
  ["PR131 links 21","[^1]: این یک پاورقی توضیحی در مورد معماری پروژه است.",[],[]],
  ["PR131 links 22","برای مشاهده مستندات به [وب‌سایت رسمی](https://example.com) مراجعه فرمایید.",[],["https://example.com"]],
  ["PR131 links 23","- [x] پیاده‌سازی تست‌های واحد برای ماژول core",[],[]],
  ["PR131 links 24","> توانا بود هر که دانا بود / ز دانش دل پیر برنا بود",[],[]],
  ["PR129 math 25","معادله درجه دوم به صورت f(x) = ax^2 + bx + c تعریف می‌شود.",[],["f(x)"]],
  ["PR129 math 26","حساب التكامل المحدد ∫ f(x) dx على الفترة من أ إلى ب.",[],[]],
  ["PR129 math 27","مجموع زوایای داخلی مثلث برابر با 180° یا π رادیان است.",[],[]],
  ["PR129 math 28","آیا مقدار x > 10 در شرط صدق می‌کند؟",[],[]],
  ["PR118 neutral 29","مجموع داده‌ها به صورت ∑ x_i محاسبه می‌شود که در آن x ≥ 0 است.",[],[]],
  ["PR118 neutral 30","🚀 اطلاعیه مهم: نسخه ۲٫۰ با ویژگی‌های جدید منتشر شد! 🎉",[],[]],
  ["PR118 neutral 31","لطفاً فایل پیکربندی (config.json) را باز کرده و بخش [database] را بررسی کنید.",["config.json"],[]],
  ["PR118 neutral 32","دمای پردازنده به ۶۵° سلسیوس رسید که نشان‌دهنده افزایش ۱۰٪ مصرف انرژی است.",[],[]],
  ["PR116 ps 33","د پروژې جوړولو لپاره د pnpm build کمانډ وکاروئ.",["pnpm build"],[]],
  ["PR116 ps 34","دا د ښوونځي کتابتون دی او د زده کوونکو لپاره ګټور دی.",[],[]],
  ["PR116 ps 35","د لا زیاتو لارښوونو لپاره https://example.com/ps وګورئ.",["https://example.com/ps"],[]],
  ["PR116 ps 36","آیا تاسو غواړئ دا بدلونونه ثبت شي؟",[],[]],
  ["PR145 sd 37","هن سافٽ ويئر کي هلائڻ لاءِ npm install ڪمانڊ استعمال ڪريو.",["npm install"],[]],
  ["PR145 sd 38","سنڌي ٻولي هڪ قديم ۽ تاريخي ٻولي آهي جيڪا پاڪستان ۽ هندستان ۾ ڳالهائي وڃي ٿي.",[],[]],
  ["PR145 sd 39","وڌيڪ ڄاڻ لاءِ مهرباني ڪري https://example.com/sd ڏسو.",["https://example.com/sd"],[]],
  ["PR145 sd 40","ڇا توهان هن ڪوڊ کي تبديل ڪرڻ چاهيو ٿا؟",[],[]],
  ["PR128 switching 41","برای احراز هویت از توکن JWT و پروتکل OAuth2 استفاده کنید.",["JWT","OAuth2"],[]],
  ["PR128 switching 42","قم بتحميل التطبيق من App Store أو Google Play للمتابعة.",[],[]],
  ["PR128 switching 43","بسته‌های سازگار با v2.1.0-rc.3 را از مخزن دریافت نمایید.",["v2.1.0-rc.3"],[]],
  ["PR128 switching 44","יש לעדכן את קובץ ה-README לפני שליחת ה-PR לבדיקה.",[],[]],
  ["PR114 ur 45","یہ ایپلیکیشن Python اور React میں تیار کی گئی ہے۔",["Python","React"],[]],
  ["PR114 ur 46","تمام ترتیبات محفوظ کر لی گئی ہیں۔",[],[]],
  ["PR114 ur 47","مزید معلومات کے لیے https://example.com/help دیکھیں",["https://example.com/help"],[]],
] as const;

describe('reviewed multilingual source and isolation fixtures', () => {
  it.each(fixtures)('%s: retains source, RTL evidence and valid isolation offsets', (_id, text, tokens, fragments) => {
    // The emoji prefix also checks UTF-16 offsets versus Unicode code points.
    for (const source of [text, `👋 ${text}`]) {
      const analysis = analyzeText(source);
      expect(analysis.text).toBe(source);
      expect(analysis.direction).toBe('rtl');
      for (const paragraph of analysis.paragraphs) {
        expect(source.slice(paragraph.start, paragraph.end)).toBe(paragraph.text);
      }
      const ranges = planInlineIsolation(source, 'rtl');
      let previousEnd = 0;
      for (const range of ranges) {
        expect(range.start).toBeGreaterThanOrEqual(previousEnd);
        expect(range.end).toBeGreaterThan(range.start);
        expect(source.slice(range.start, range.end)).toBe(range.text);
        expect(range.sourceRange.utf16).toEqual({ start: range.start, end: range.end });
        expect(range.sourceRange.codePoint).toEqual({
          start: [...source.slice(0, range.start)].length,
          end: [...source.slice(0, range.end)].length
        });
        previousEnd = range.end;
      }
      for (const token of tokens) expect(ranges.some((range) => range.text === token)).toBe(true);
      for (const fragment of fragments) expect(ranges.some((range) => range.text.includes(fragment))).toBe(true);
      // Feed UTF-16 units separately, including split surrogate pairs.
      const stream = createBidiStream();
      for (let index = 0; index < source.length; index++) stream.push(source[index]!);
      expect(stream.finish()).toMatchObject({ text: source, direction: analysis.direction, finished: true });
    }
  });

  it.each([
    'React is a popular JavaScript library.',
    'A bun and a cup of tea are ready.',
    'The azure sky is clear today.',
    'Visit https://example.com/docs?lang=en&mode=dark.',
    'Run npm install and then pnpm test.',
    'The price is $10 and the range is 10-20.',
    '👨‍💻 Nice work! 👍🏽'
  ])('leaves ordinary LTR input free of unnecessary isolation: %s', (source) => {
    expect(needsBidiIntervention(source)).toBe(false);
    expect(planInlineIsolation(source, 'ltr')).toEqual([]);
    expect(analyzeText(source).text).toBe(source);
  });
});
