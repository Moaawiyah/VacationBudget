import type { Dictionary } from "../../types";

export const arCore: Pick<
  Dictionary,
  "common" | "nav" | "landing" | "auth" | "validation"
> = {
  common: {
    cancel: "إلغاء",
    save: "حفظ",
    add: "إضافة",
    delete: "حذف",
    edit: "تعديل",
    back: "رجوع",
    dismiss: "إغلاق",
    loading: "…",
  },
  nav: {
    dashboard: "لوحة التحكم",
    expenses: "المصروفات",
    plan: "الخطة",
    settings: "الإعدادات",
  },
  landing: {
    tagline: "خطّط لإنفاقك في الإجازة وتابعه عبر المدن والعملات المختلفة.",
    getStarted: "ابدأ الآن",
    logIn: "تسجيل الدخول",
  },
  auth: {
    welcomeBack: "مرحبًا بعودتك",
    loginSubtitle: "سجّل الدخول إلى رحلاتك.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    logIn: "تسجيل الدخول",
    loggingIn: "تسجيل الدخول",
    noAccount: "ليس لديك حساب؟",
    registerLink: "إنشاء حساب",
    createAccount: "إنشاء حساب",
    creatingAccount: "إنشاء حساب",
    registerSubtitle: "ابدأ بالتخطيط لرحلتك القادمة.",
    alreadyHaveAccount: "لديك حساب بالفعل؟",
    loginLink: "تسجيل الدخول",
    checkEmailTitle: "تحقق من بريدك الإلكتروني",
    checkEmailBody: "أرسلنا لك رابط تأكيد. افتحه لتفعيل حسابك، ثم سجّل الدخول.",
    backToLogin: "العودة لتسجيل الدخول",
    emailTakenTitle: "هذا البريد الإلكتروني مسجّل بالفعل",
    emailTakenBody:
      "يوجد حساب بالبريد {email} بالفعل. سجّل الدخول بدلًا من ذلك، أو أنشئ حسابًا ببريد آخر.",
    useDifferentEmail: "استخدم بريدًا آخر",
    logOut: "تسجيل الخروج",
  },
  validation: {
    emailInvalid: "أدخل بريدًا إلكترونيًا صحيحًا",
    passwordRequired: "كلمة المرور مطلوبة",
    passwordMin8: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل",
    loginInvalid: "أدخل بريدًا إلكترونيًا وكلمة مرور صحيحين.",
    genericInvalid: "إدخال غير صالح.",

    tripNameRequired: "اسم الرحلة مطلوب",
    descriptionMax500: "يجب ألا يتجاوز الوصف 500 حرف",
    destinationRequired: "الوجهة مطلوبة",
    startDateRequired: "تاريخ البدء مطلوب",
    endDateRequired: "تاريخ الانتهاء مطلوب",
    currencyChoose: "اختر عملة",
    budgetNegative: "لا يمكن أن تكون الميزانية سالبة",
    endDateBeforeStart: "يجب أن يكون تاريخ الانتهاء في نفس تاريخ البدء أو بعده",
    tripInvalid: "تفاصيل الرحلة غير صالحة.",

    amountPositive: "أدخل مبلغًا",
    exchangeRatePositive: "أدخل سعر صرف صحيح",
    exchangeRateRequired: "أدخل سعر الصرف",
    categoryChoose: "اختر فئة",
    descriptionRequired: "الوصف مطلوب",
    descriptionMax200: "يجب ألا يتجاوز الوصف 200 حرف",
    dateRequired: "التاريخ مطلوب",
    expenseInvalid: "المصروف غير صالح.",

    categoryNameRequired: "الاسم مطلوب",
    categoryInvalid: "اسم الفئة غير صالح.",

    amountNegative: "لا يمكن أن يكون المبلغ سالبًا",
    amountInvalid: "مبلغ غير صالح.",
  },
};
