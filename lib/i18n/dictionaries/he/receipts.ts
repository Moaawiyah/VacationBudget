import type { Dictionary } from "../../types";

export const heReceipts: Pick<Dictionary, "receipts"> = {
  receipts: {
    pageTitle: "סריקת קבלה",
    scanReceipt: "סריקת קבלה",
    chooseFile: "צלמו או בחרו תמונת קבלה",
    takePhoto: "צילום תמונה",
    chooseFromLibrary: "בחירה מהתמונות",
    fileTooLarge: "הקובץ גדול מדי (מקסימום 15MB).",
    analyze: "ניתוח הקבלה",
    analyzeFailed: "לא ניתן היה לקרוא את הקבלה. נסו תמונה ברורה יותר, או הזינו ידנית.",
    reviewNeeded: "יש לבדוק לפני השמירה",
    detectedLanguage: "שפה שזוהתה",
    lineItems: "פריטים",
    tax: "מע\"מ / מס",
    retake: "שימוש בתמונה אחרת",
    receiptPreviewAlt: "תמונת הקבלה שהועלתה",
    createExpense: "יצירת הוצאה",
  },
};
