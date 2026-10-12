/**
 * تفقيط - تحويل الأرقام إلى كلمات باللغة العربية
 * Tafqeet Utility for Saudi Riyals & BOQ Totals
 */

const Tafqeet = (() => {
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  const scales = [
    { singular: "ريال", dual: "ريالان", plural: "ريالات", value: 1 },
    { singular: "ألف", dual: "ألفان", plural: "آلاف", value: 1000 },
    { singular: "مليون", dual: "مليونان", plural: "ملايين", value: 1000000 },
    { singular: "مليار", dual: "ملياران", plural: "مليارات", value: 1000000000 }
  ];

  function convertChunk(num) {
    let text = "";
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;

    if (h > 0) {
      text += hundreds[h];
    }

    if (remainder > 0) {
      if (text !== "") text += " و";
      if (remainder >= 11 && remainder <= 19) {
        text += teens[remainder - 10];
      } else {
        if (o > 0) {
          text += ones[o];
          if (t > 0) text += " و" + tens[t];
        } else if (t > 0) {
          text += tens[t];
        }
      }
    }
    return text;
  }

  function convertInteger(number) {
    if (number === 0) return "صفر";

    let n = Math.floor(number);
    let parts = [];
    let scaleIndex = 0;

    while (n > 0) {
      const chunk = n % 1000;
      if (chunk > 0) {
        let chunkText = convertChunk(chunk);
        if (scaleIndex === 1) { // Thousands
          if (chunk === 1) chunkText = "ألف";
          else if (chunk === 2) chunkText = "ألفان";
          else if (chunk >= 3 && chunk <= 10) chunkText = chunkText + " آلاف";
          else chunkText = chunkText + " ألفاً";
        } else if (scaleIndex === 2) { // Millions
          if (chunk === 1) chunkText = "مليون";
          else if (chunk === 2) chunkText = "مليونان";
          else if (chunk >= 3 && chunk <= 10) chunkText = chunkText + " ملايين";
          else chunkText = chunkText + " مليوناً";
        } else if (scaleIndex === 3) { // Billions
          if (chunk === 1) chunkText = "مليار";
          else if (chunk === 2) chunkText = "ملياران";
          else if (chunk >= 3 && chunk <= 10) chunkText = chunkText + " مليارات";
          else chunkText = chunkText + " ملياراً";
        }
        parts.unshift(chunkText);
      }
      n = Math.floor(n / 1000);
      scaleIndex++;
    }

    return parts.join(" و");
  }

  function convertCurrency(num, currency = "ريال سعودي", subCurrency = "هللة") {
    if (isNaN(num) || num === null || num === undefined) return "";
    num = parseFloat(num);
    if (num === 0) return `صفر ${currency} فقط لا غير`;

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let result = "فقط " + convertInteger(integerPart) + " " + currency;

    if (decimalPart > 0) {
      result += " و" + convertInteger(decimalPart) + " " + subCurrency;
    }

    result += " لا غير";
    return result;
  }

  return {
    convert: convertInteger,
    convertCurrency: convertCurrency
  };
})();

if (typeof module !== "undefined") {
  module.exports = Tafqeet;
}
