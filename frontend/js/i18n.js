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

    // Subjects
    subjects: "Subjects",
    manageSubjects: "Manage Subjects",
    newSubject: "New Subject",
    subjectName: "Subject Name",
    subjectColor: "Color",
    noSubject: "No Subject",
    allSubjects: "All",
    searchDocs: "Search your documents…",
    deleteSubjectConfirm: "Delete this subject? Documents will keep their content.",

    // Quiz
    quiz: "Quiz",
    quizScore: "Score",
    quizComplete: "Quiz Complete!",
    quizRetry: "Retry Quiz",
    questions: "Questions",

    // SRS / Review
    review: "Review",
    startReview: "Start Review",
    reviewDue: "due",
    noCardsDue: "No cards due for review",
    rateCard: "How well did you know this?",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
    reviewComplete: "Review Session Complete!",
    cardsReviewed: "Cards reviewed",
    nextReview: "Next review",

    // Chat
    askPDF: "Ask",
    chatPlaceholder: "Ask a question about this PDF…",
    chatSend: "Send",
    chatEmpty: "Ask any question about this lecture PDF.",
    chatEmptyHint: 'Examples: "What is the main topic?", "Explain the key formula"',

    // Language output
    outputLanguage: "Output Language",
    langEnglish: "English",
    langMyanmar: "Myanmar",
    langChinese: "Chinese",
    langJapanese: "Japanese",
    langKorean: "Korean",
    langThai: "Thai",

    // Provider capabilities
    capClaudeProxy: "Custom proxy — English recommended for best speed. Vision mode disabled. May timeout on large PDFs.",
    capGemini: "Direct API — all languages supported, vision mode available",
    langSlowWarning: "Non-English output may take 5–10 minutes with this proxy",
    proxySlowWarning: "Proxy is slow — processing may take 5–8 minutes",
    geminiNotConfigured: "Gemini is not set up yet. Use Claude for now.",
    errProxy502: "Claude proxy is temporarily down (502). Wait a few minutes and retry, or use a smaller PDF.",
    errProxyTimeout: "Processing timed out — the proxy was too slow. Try a smaller PDF or retry later.",
    processingIncomplete: "AI processing did not finish — the proxy timed out before generating content. Please re-upload this PDF.",
    contentMissing: "No content was generated for this section.",

    // Study Rooms
    studyRooms: "Study Rooms",
    createRoom: "Create Room",
    joinRoom: "Join Room",
    roomName: "Room Name",
    inviteCode: "Invite Code",
    enterInviteCode: "Enter invite code",
    members: "Members",
    sharedDocs: "Shared Documents",
    shareDocument: "Share Document",
    noRooms: "No study rooms yet",
    noRoomsHint: "Create a room or join one with an invite code.",
    noSharedDocs: "No documents shared yet",
    roomInviteCode: "Invite Code",
    copyCode: "Copy",
    copied: "Copied!",
    leaveRoom: "Leave Room",
    deleteRoom: "Delete Room",
    removeDoc: "Remove",
    leaveRoomConfirm: "Leave this study room?",
    deleteRoomConfirm: "Delete this study room? This cannot be undone.",
    removeDocConfirm: "Remove this document from the room?",
    alreadyMember: "You are already a member of this room.",
    joinedRoom: "Joined room successfully!",
    roomNotFound: "Room not found.",
    selectDocument: "Select a document to share",
    sharedBy: "Shared by",
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

    // Subjects
    subjects: "ဘာသာရပ်များ",
    manageSubjects: "ဘာသာရပ်များ စီမံခန့်ခွဲရန်",
    newSubject: "ဘာသာရပ်အသစ်",
    subjectName: "ဘာသာရပ်အမည်",
    subjectColor: "အရောင်",
    noSubject: "ဘာသာရပ်မရှိ",
    allSubjects: "အားလုံး",
    searchDocs: "စာရွက်စာတမ်းများ ရှာဖွေပါ…",
    deleteSubjectConfirm: "ဤဘာသာရပ်ကို ဖျက်မှာလား။ စာရွက်များကတော့ ကျန်နေပါမည်။",

    // Quiz
    quiz: "စာမေးပွဲ",
    quizScore: "ရမှတ်",
    quizComplete: "စာမေးပွဲပြီးပါပြီ!",
    quizRetry: "ပြန်ဖြေမည်",
    questions: "မေးခွန်းများ",

    // SRS / Review
    review: "ပြန်လည်သုံးသပ်ရန်",
    startReview: "ပြန်လည်သုံးသပ်မည်",
    reviewDue: "ပြန်ဖြေရန်ရှိသည်",
    noCardsDue: "ပြန်ဖြေရန် ကတ်မရှိပါ",
    rateCard: "ဒီကတ်ကို ဘယ်လောက်သိပါသလဲ?",
    again: "ထပ်",
    hard: "ခက်",
    good: "ကောင်း",
    easy: "လွယ်",
    reviewComplete: "ပြန်လည်သုံးသပ်ခြင်းပြီးပါပြီ!",
    cardsReviewed: "သုံးသပ်ပြီးသောကတ်များ",
    nextReview: "နောက်တစ်ကြိမ်",

    // Chat
    askPDF: "မေးမည်",
    chatPlaceholder: "ဤ PDF အကြောင်း မေးခွန်းမေးပါ…",
    chatSend: "ပို့မည်",
    chatEmpty: "ဤ PDF သင်ခန်းစာအကြောင်း မေးခွန်းမေးပါ။",
    chatEmptyHint: 'ဥပမာ: "အဓိကအကြောင်းအရာက ဘာလဲ?", "အဓိကဖော်မြူလာရှင်းပြပါ"',

    // Language output
    outputLanguage: "ထုတ်ယူမည့်ဘာသာစကား",
    langEnglish: "အင်္ဂလိပ်",
    langMyanmar: "မြန်မာ",
    langChinese: "တရုတ်",
    langJapanese: "ဂျပန်",
    langKorean: "ကိုရီးယား",
    langThai: "ထိုင်း",

    // Provider capabilities
    capClaudeProxy: "Custom proxy — အင်္ဂလိပ်ဖြင့် အမြန်ဆုံး။ Vision mode ပိတ်ထားသည်။ PDF ကြီးများ timeout ဖြစ်နိုင်သည်။",
    capGemini: "တိုက်ရိုက် API — ဘာသာစကားအားလုံး ပံ့ပိုးသည်၊ Vision mode ရနိုင်သည်",
    langSlowWarning: "ဤ proxy ဖြင့် အင်္ဂလိပ်မဟုတ်သော ထုတ်ယူမှုသည် ၅-၁၀ မိနစ် ကြာနိုင်သည်",
    proxySlowWarning: "Proxy နှေးသည် — လုပ်ဆောင်ချက် ၅-၈ မိနစ် ကြာနိုင်သည်",
    geminiNotConfigured: "Gemini မသတ်မှတ်ရသေးပါ။ Claude ကို သုံးပါ။",
    errProxy502: "Claude proxy ယာယီ down ဖြစ်နေသည် (502)။ မိနစ်အနည်းငယ် စောင့်ပြီး ထပ်စမ်းပါ၊ သို့မဟုတ် PDF သေးသေးတစ်ခု သုံးပါ။",
    errProxyTimeout: "Processing timeout — proxy နှေးလွန်းသည်။ PDF သေးသေးတစ်ခု သုံးပါ သို့မဟုတ် နောက်မှ ထပ်စမ်းပါ။",
    processingIncomplete: "AI processing မပြီးမြောက်ပါ — proxy timeout ဖြစ်သွားသည်။ PDF ကို ပြန်တင်ပါ။",
    contentMissing: "ဤ section အတွက် content မထွက်ပါ။",

    // Study Rooms
    studyRooms: "စာလေ့လာခန်းများ",
    createRoom: "ခန်းမဖန်တီးမည်",
    joinRoom: "ခန်းမဝင်မည်",
    roomName: "ခန်းမအမည်",
    inviteCode: "ဖိတ်ကြားကုဒ်",
    enterInviteCode: "ဖိတ်ကြားကုဒ်ထည့်ပါ",
    members: "အဖွဲ့ဝင်များ",
    sharedDocs: "မျှဝေထားသောစာရွက်များ",
    shareDocument: "စာရွက်မျှဝေမည်",
    noRooms: "စာလေ့လာခန်းမရှိသေးပါ",
    noRoomsHint: "ခန်းမဖန်တီးပါ သို့မဟုတ် ဖိတ်ကြားကုဒ်ဖြင့် ဝင်ပါ။",
    noSharedDocs: "မျှဝေထားသောစာရွက်မရှိသေးပါ",
    roomInviteCode: "ဖိတ်ကြားကုဒ်",
    copyCode: "ကူးယူမည်",
    copied: "ကူးပြီးပါပြီ!",
    leaveRoom: "ခန်းမထွက်မည်",
    deleteRoom: "ခန်းမဖျက်မည်",
    removeDoc: "ဖျက်မည်",
    leaveRoomConfirm: "ဤစာလေ့လာခန်းမှ ထွက်မှာလား?",
    deleteRoomConfirm: "ဤစာလေ့လာခန်းကို ဖျက်မှာလား? ပြန်ပြင်၍မရပါ။",
    removeDocConfirm: "ဤစာရွက်ကို ခန်းမှ ဖျက်မှာလား?",
    alreadyMember: "သင်သည် ဤခန်းမ၏ အဖွဲ့ဝင်ဖြစ်ပြီးသားပါ။",
    joinedRoom: "ခန်းမသို့ ဝင်ပြီးပါပြီ!",
    roomNotFound: "ခန်းမမတွေ့ပါ။",
    selectDocument: "မျှဝေမည့်စာရွက်ရွေးပါ",
    sharedBy: "မျှဝေသူ",
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
