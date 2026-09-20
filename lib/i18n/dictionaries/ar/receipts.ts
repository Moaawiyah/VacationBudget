import type { Dictionary } from "../../types";

export const arReceipts: Pick<Dictionary, "receipts"> = {
  receipts: {
    pageTitle: "مسح الإيصال",
    scanReceipt: "مسح إيصال",
    chooseFile: "التقط صورة أو اختر صورة إيصال",
    takePhoto: "التقاط صورة",
    chooseFromLibrary: "الاختيار من الصور",
    fileTooLarge: "الملف كبير جدًا (الحد الأقصى 15 ميجابايت).",
    analyze: "تحليل الإيصال",
    analyzeFailed: "تعذّرت قراءة الإيصال. جرّب صورة أوضح، أو أدخل البيانات يدويًا.",
    reviewNeeded: "يرجى المراجعة قبل الحفظ",
    detectedLanguage: "اللغة المكتشفة",
    lineItems: "عناصر الفاتورة",
    tax: "الضريبة / ضريبة القيمة المضافة",
    retake: "استخدام صورة مختلفة",
    receiptPreviewAlt: "صورة الإيصال المرفوعة",
    createExpense: "إنشاء مصروف",
  },
};
