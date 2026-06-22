// i18n.js — Bilingual translations (English + Myanmar)
// Usage: import { t, setLang, getLang } from './js/i18n.js';

const TRANSLATIONS = {
  en: {
    // Common
    appName: "Smart PDF Summarizer",
    appTagline: "Transform lecture PDFs into study notes, key points & flashcards with AI.",
    footer: "Built with ❤️ · Powered by Supabase + AI",
    logOut: "Log out",
    loading: "Loading…",
    backToLibrary: "Back to Library",
    uploadNewPDF: "Upload New PDF",
    newPDF: "New PDF",

    // Login
    loginTitle: "Login",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    logIn: "Log In",
    loggingIn: "Logging in…",
    noAccount: "Don't have an account?",
    signUpLink: "Sign up",
    invalidEmailOrPassword: "Invalid email or password.",
    pleaseEnterEmail: "Please enter your email.",
    pleaseEnterPassword: "Please enter your password.",

    // Signup
    signupTitle: "Create Account",
    signupTagline: "Start turning your lecture PDFs into study materials.",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter your password",
    passwordHint: "Minimum 8 characters",
    createAccount: "Create Account",
    creatingAccount: "Creating account…",
    passwordsNoMatch: "Passwords do not match.",
    passwordTooShort: "Password must be at least 8 characters.",
    signUpFailed: "Sign up failed.",
    accountCreated: "Account created! You can now log in.",
    alreadyHaveAccount: "Already have an account?",
    logInLink: "Log in",

    // Upload
    uploadTitle: "Upload Lecture PDF",
    uploadTagline: "Drop a PDF and let AI turn it into study notes.",
    aiProvider: "AI Provider",
    dropTitle: "Drop your lecture PDF here",
    dropSub: "or click to browse — max 25 MB",
    choosePDF: "Choose PDF",
    analyzePDF: "Analyze PDF",
    uploadingPDF: "Uploading PDF…",
    startingAI: "Starting AI processing…",
    fileTooLarge: "File too large. Maximum size is 25 MB.",
    pleaseChoosePDF: "Please choose a PDF file.",
    noExtractableText: "This PDF has no extractable text. Use a text-based PDF.",
    aiUnavailable: "The AI service is currently unavailable. Try again later.",
    processingTimeout: "Processing took too long. Try a smaller PDF.",
    library: "Library",
    viewFullPage: "View full page →",

    // Progress
    downloadingPDF: "Downloading PDF…",
    extractingText: "Extracting text…",
    callingAI: "Calling AI…",
    retrying: "Retrying…",
    savingFiles: "Saving files…",
    complete: "Complete!",

    // Results
    analysisComplete: "Analysis Complete",
    summary: "Summary",
    keyPoints: "Key Points",
    flashcards: "Flashcards",
    tapToFlip: "Tap a card to reveal the answer",
    clickToFlip: "click to flip",
    card: "Card",
    answerLabel: "Answer",
    pages: "Pages",
    words: "Words",
    date: "Date",

    // Library
    libraryTitle: "Your Library",
    libraryTagline: "All your processed lecture PDFs and their study materials.",
    noDocuments: "No documents yet",
    noDocumentsHint: "Upload your first lecture PDF to get started.",
    loadingLibrary: "Loading your library…",
    done: "Done",
    processing: "Processing",
    error: "Error",

    // View
    documentNotFound: "Document not found. It may have been deleted.",
    stillProcessing: "Still processing. Check back soon.",

    // Theme / Language
    dark: "Dark",
    light: "Light",
    english: "EN",
    myanmar: "မြန်မာ",

    // Errors
    authenticationRequired: "Authentication required",
    somethingWentWrong: "Something went wrong. Please try again.",
    networkError: "Network error. Check your connection.",
  },

  mm: {
    // Common
    appName: "Smart PDF Summarizer",
    appTagline: "PDF သင်ခန်းစာများကို AI ဖြင့် မှတ်စု၊ အရေးကြီးအချက်များ နှင့် Flashcards အဖြစ်ပြောင်းပါ။",
    footer: "❤️ ဖြင့်တည်ဆောက်သည် · Supabase + AI",
    logOut: "ထွက်မည်",
    loading: "ဖွင့်နေသည်…",
    backToLibrary: "Library သို့ပြန်မည်",
    uploadNewPDF: "PDF အသစ်တင်မည်",
    newPDF: "အသစ်",

    // Login
    loginTitle: "အကောင့်ဝင်ရန်",
    email: "အီးမေးလ်",
    emailPlaceholder: "you@example.com",
    password: "စကားဝှက်",
    passwordPlaceholder: "စကားဝှက်ထည့်ပါ",
    showPassword: "စကားဝှက်ပြပါ",
    hidePassword: "စကားဝှက်ဖျောက်ပါ",
    logIn: "အကောင့်ဝင်မည်",
    loggingIn: "ဝင်နေသည်…",
    noAccount: "အကောင့်မရှိသေးဘူးလား။",
    signUpLink: "အကောင့်ဖွင့်မည်",
    invalidEmailOrPassword: "အီးမေးလ် သို့မဟုတ် စကားဝှက်မှားနေသည်။",
    pleaseEnterEmail: "အီးမေးလ်ထည့်ပါ။",
    pleaseEnterPassword: "စကားဝှက်ထည့်ပါ။",

    // Signup
    signupTitle: "အကောင့်ဖွင့်ရန်",
    signupTagline: "သင့် PDF သင်ခန်းစာများကို စာလေ့လာပစ္စည်းများအဖြစ် ပြောင်းလဲပါ။",
    confirmPassword: "စကားဝှက်အတည်ပြုရန်",
    confirmPasswordPlaceholder: "စကားဝှက်ပြန်ထည့်ပါ",
    passwordHint: "အနည်းဆုံး စာလုံး ၈ လုံး",
    createAccount: "အကောင့်ဖွင့်မည်",
    creatingAccount: "အကောင့်ဖွင့်နေသည်…",
    passwordsNoMatch: "စကားဝှက်များမတူညီပါ။",
    passwordTooShort: "စကားဝှက်သည် အနည်းဆုံး စာလုံး ၈ လုံးရှိရမည်။",
    signUpFailed: "အကောင့်ဖွင့်၍မရပါ။",
    accountCreated: "အကောင့်ဖွင့်ပြီးပါပြီ။ ယခုဝင်ရောက်နိုင်ပါပြီ။",
    alreadyHaveAccount: "အကောင့်ရှိပြီးသားလား။",
    logInLink: "အကောင့်ဝင်မည်",

    // Upload
    uploadTitle: "PDF သင်ခန်းစာတင်ရန်",
    uploadTagline: "PDF ဖိုင်တင်ပြီး AI ဖြင့် စာလေ့လာပစ္စည်းများ ထုတ်ယူပါ။",
    aiProvider: "AI ဝန်ဆောင်မှု",
    dropTitle: "PDF ဖိုင်ကို ဤနေရာသို့ဆွဲချပါ",
    dropSub: "သို့မဟုတ် နှိပ်၍ရွေးပါ — အများဆုံး 25 MB",
    choosePDF: "PDF ရွေးမည်",
    analyzePDF: "စစ်ဆေးမည်",
    uploadingPDF: "PDF တင်နေသည်…",
    startingAI: "AI စတင်နေသည်…",
    fileTooLarge: "ဖိုင်ကြီးလွန်းသည်။ အများဆုံး 25 MB သာခွင့်ပြုသည်။",
    pleaseChoosePDF: "PDF ဖိုင်ရွေးပါ။",
    noExtractableText: "ဤ PDF တွင် စာသားမရှိပါ။ စာသားပါသော PDF ကိုသုံးပါ။",
    aiUnavailable: "AI ဝန်ဆောင်မှု ယခုမရရှိနိုင်ပါ။ ခဏကြာပြန်စမ်းပါ။",
    processingTimeout: "အချိန်ကြာလွန်းသည်။ ဖိုင်အသေးကိုသုံးပါ။",
    library: "Library",
    viewFullPage: "စာမျက်နှာအပြည့်ကြည့်မည် →",

    // Progress
    downloadingPDF: "PDF ဒေါင်းလုဒ်လုပ်နေသည်…",
    extractingText: "စာသားထုတ်ယူနေသည်…",
    callingAI: "AI ခေါ်ဆိုနေသည်…",
    retrying: "ပြန်စမ်းနေသည်…",
    savingFiles: "ဖိုင်များသိမ်းနေသည်…",
    complete: "ပြီးပါပြီ။",

    // Results
    analysisComplete: "စစ်ဆေးပြီးပါပြီ",
    summary: "အနှစ်ချုပ်",
    keyPoints: "အရေးကြီးအချက်များ",
    flashcards: "Flashcards",
    tapToFlip: "အဖြေကြည့်ရန် ကတ်ကိုနှိပ်ပါ",
    clickToFlip: "နှိပ်၍အဖြေကြည့်ပါ",
    card: "ကတ်",
    answerLabel: "အဖြေ",
    pages: "စာမျက်နှာ",
    words: "စာလုံးရေ",
    date: "ရက်စွဲ",

    // Library
    libraryTitle: "သင့် Library",
    libraryTagline: "သင်လုပ်ဆောင်ခဲ့သော PDF သင်ခန်းစာများနှင့် စာလေ့လာပစ္စည်းများ။",
    noDocuments: "ဖိုင်မရှိသေးပါ",
    noDocumentsHint: "သင့်ပထမဆုံး PDF သင်ခန်းစာကို စတင်တင်ပါ။",
    loadingLibrary: "Library ဖွင့်နေသည်…",
    done: "ပြီးပြီ",
    processing: "လုပ်ဆောင်ဆဲ",
    error: "အမှား",

    // View
    documentNotFound: "ဖိုင်မတွေ့ပါ။ ဖျက်လိုက်ပြီးဖြစ်နိုင်သည်။",
    stillProcessing: "လုပ်ဆောင်ဆဲဖြစ်သည်။ ခဏစောင့်ပါ။",

    // Theme / Language
    dark: "အမှောင်",
    light: "အလင်း",
    english: "EN",
    myanmar: "မြန်မာ",

    // Errors
    authenticationRequired: "အကောင့်ဝင်ရန်လိုအပ်သည်",
    somethingWentWrong: "တစ်ခုခုမှားယွင်းနေသည်။ ထပ်စမ်းကြည့်ပါ။",
    networkError: "အင်တာနက်ချိတ်ဆက်မှုစစ်ဆေးပါ။",
  }
};

let currentLang = localStorage.getItem('lang') || 'en';

export function t(key) {
  return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.en[key] || key;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
}

export function tAll() {
  return TRANSLATIONS[currentLang] || TRANSLATIONS.en;
}

// Attach to window for use in inline HTML (onclick handlers etc)
window.__t = function(key) { return t(key); };
