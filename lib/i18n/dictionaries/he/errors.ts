import type { Dictionary } from "../../types";

export const heErrors: Pick<Dictionary, "errors"> = {
  errors: {
    permissionDenied: "אין לך הרשאה לבצע פעולה זו.",
    expensePermissionDenied: "אין לך הרשאה לשנות הוצאה זו.",
    planOwnerOnly: "רק בעל הטיול יכול לשנות את תכנון התקציב.",
    duplicate: "זה כבר קיים.",
    currencyLocked: "לא ניתן לשנות את מטבע הטיול לאחר שנוספו הוצאות.",
    invalidData: "חלק מהפרטים אינם תקינים. בדקו ונסו שוב.",
    notFound: "לא ניתן היה למצוא את זה.",
    unknown: "משהו השתבש. נסו שוב.",
    receiptUnreadable: "לא ניתן היה לקרוא את הקבלה.",
    receiptUnavailable: "ניתוח קבלות אינו זמין כרגע.",
    receiptUnsupported: "תמונה לא נתמכת. השתמשו בתמונת JPG,‏ PNG או HEIC.",
    receiptTooLarge: "התמונה גדולה מדי.",
    receiptRateLimited: "יותר מדי קבלות בבת אחת. המתינו רגע.",
    totalUndetermined: "לא ניתן היה לקבוע את הסכום הכולל.",
  },
};
