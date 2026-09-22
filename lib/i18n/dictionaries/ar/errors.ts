import type { Dictionary } from "../../types";

export const arErrors: Pick<Dictionary, "errors"> = {
  errors: {
    permissionDenied: "ليس لديك إذن للقيام بذلك.",
    expensePermissionDenied: "ليس لديك إذن لتعديل هذا المصروف.",
    planOwnerOnly: "يمكن لمالك الرحلة فقط تغيير خطة الميزانية.",
    duplicate: "هذا موجود بالفعل.",
    currencyLocked: "لا يمكن تغيير عملة الرحلة بعد إضافة مصروفات.",
    invalidData: "بعض التفاصيل غير صالحة. يرجى المراجعة والمحاولة مجددًا.",
    notFound: "تعذّر العثور على ذلك.",
    unknown: "حدث خطأ ما. يرجى المحاولة مجددًا.",
    receiptUnreadable: "تعذّرت قراءة الإيصال.",
    receiptUnavailable: "تحليل الإيصالات غير متاح مؤقتًا.",
    receiptUnsupported: "صورة غير مدعومة. استخدم صورة JPG أو PNG أو HEIC.",
    receiptTooLarge: "الصورة كبيرة جدًا.",
    receiptRateLimited: "إيصالات كثيرة في وقت واحد. يرجى الانتظار قليلًا.",
    totalUndetermined: "تعذّر تحديد المبلغ الإجمالي.",
  },
};
