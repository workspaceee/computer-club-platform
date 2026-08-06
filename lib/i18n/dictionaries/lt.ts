import type { Dictionary } from '@/lib/i18n/types'

/**
 * Lithuanian dictionary (F2.2).
 *
 * Typed as `Dictionary`, so TypeScript fails the build if a key from `en.ts`
 * is missing or misspelled here.
 *
 * Plural strings use the Lithuanian order: one | few | other
 * (1 minutė | 2 minutės | 11 minučių).
 */
export const lt: Dictionary = {
  common: {
    appName: 'IMBA Cyber Club',
    shell: 'IMBA-SHELL',
    cancel: 'Atšaukti',
    confirm: 'Patvirtinti',
    save: 'Išsaugoti',
    close: 'Uždaryti',
    done: 'Baigta',
    back: 'Atgal',
    next: 'Toliau',
    retry: 'Bandyti dar kartą',
    loading: 'Kraunama',
    search: 'Paieška',
    all: 'Visi',
    yes: 'Taip',
    no: 'Ne',
    on: 'Įjungta',
    off: 'Išjungta',
    language: 'Kalba',
    settings: 'Nustatymai',
    logout: 'Atsijungti',
    online: 'Prisijungęs',
    offline: 'Atsijungęs',
    comingSoon: 'Jau greitai',
    nothingHere: 'Kol kas nieko nėra',
    // `DateField` (C1.11): segmentų užuominos — vietinis datos rašymas, todėl
    // verčiamos, o ne naudojamos bendros.
    dateDay: 'DD',
    dateMonth: 'MM',
    dateYear: 'MMMM',
    datePicker: 'Kalendorius',
    datePrev: 'Anksčiau',
    dateNext: 'Vėliau',
    datePickDay: 'Pasirinkite dieną',
    datePickYear: 'Pradėkite nuo metų',
    dateClear: 'Išvalyti',
    minutes: '{n} minutė|{n} minutės|{n} minučių',
    hours: '{n} valanda|{n} valandos|{n} valandų',
    seconds: '{n} sekundė|{n} sekundės|{n} sekundžių',
    days: '{n} diena|{n} dienos|{n} dienų',
    coins: '{n} moneta|{n} monetos|{n} monetų',
    players: '{n} žaidėjas|{n} žaidėjai|{n} žaidėjų',
    items: '{n} prekė|{n} prekės|{n} prekių',
    friends: '{n} draugas|{n} draugai|{n} draugų',
    slots: 'liko {n} vieta|liko {n} vietos|liko {n} vietų',
  },

  nav: {
    home: 'Pradžia',
    games: 'Žaidimai',
    shop: 'Baras',
    rewards: 'Apdovanojimai',
    tournaments: 'Turnyrai',
    social: 'Draugai',
    wallet: 'Piniginė',
    profile: 'Profilis',
    help: 'Pagalba',
    more: 'Daugiau',
    landmark: 'Paleidyklės skyriai',
    mainLandmark: 'Skyriaus turinys',
    skipToContent: 'Pereiti prie turinio',
    accountMenu: 'Profilio meniu, {name}',
    accountMenuLevel: 'Profilio meniu, {name}, {level} lygis',
    openSection: 'Atidaryti „{section}“',
    pendingTitle: 'Šis skyrius dar neparuoštas',
    pendingBody: 'Jis atsiras su 1 etapo darbu {task}. Geriau tuščia nei išgalvoti skaičiai.',
    guestLimited:
      'Svečiams prieinami žaidimai, baras ir pagalba. Sukurk profilį, kad atrakintum kitus skyrius.',
  },

  auth: {
    localTime: 'Vietos laikas',
    accessTerminal: 'Prieigos terminalas',
    welcome: 'Sveiki sugrįžę',
    welcomeHi: '',
    join: 'Prisijunk prie',
    joinHi: 'klubo',
    loginSub: 'Prisijunkite, kad atrakintumėte stotį ir pradėtumėte sesiją.',
    registerSub: 'Sukurkite IMBA žaidėjo profilį greičiau nei per minutę.',
    signIn: 'Prisijungti',
    register: 'Registruotis',
    userOrEmail: 'Vartotojo vardas arba el. paštas',
    userOrEmailPlaceholder: 'player@imba.club',
    password: 'Slaptažodis',
    passwordPlaceholder: 'Įrašykite „fail“, kad išbandytumėte klaidas',
    username: 'Vartotojo vardas',
    usernamePlaceholder: 'ProGamer',
    email: 'El. paštas',
    emailPlaceholder: 'you@imba.club',
    confirmPassword: 'Pakartokite slaptažodį',
    repeat: 'Pakartokite slaptažodį',
    minChars: 'Mažiausiai 6 simboliai',
    unlock: 'Atrakinti stotį',
    createAccount: 'Sukurti paskyrą',
    qrLogin: 'QR prisijungimas',
    // Tik kūrimo aplinkai (C1.9): demo prisijungimas gyvena už `DEV_SHORTCUTS`.
    demo: 'Demo',
    encrypted: 'Šifruota sesija',
    showPassword: 'Rodyti slaptažodį',
    hidePassword: 'Slėpti slaptažodį',
    scanWithApp: 'Nuskaitykite su IMBA programėle',
    waitingConfirmation: 'Laukiama patvirtinimo...',
    qrVerified: 'QR patvirtintas per IMBA programėlę!',
    welcomeBackToast: 'Sveiki sugrįžę, {name}!',
    accountCreated: 'Paskyra sukurta! Prijungiame...',
    enteringDemo: 'Įjungiamas demo režimas',
    // Stoties skydas (C1.6).
    stationPanel: 'Stoties būsena',
    zone: 'Zona',
    ping: 'Pingas',
    display: 'Ekranas',
    gpu: 'GPU',
    status: 'Būsena',
    optimal: 'Optimali',
    stationFree: 'Laisva',
    stationFreeUntil: 'Laisva iki {time}',
    stationOccupied: 'Užimta',
    stationBooked: 'Rezervuota',
    stationBookedFrom: 'Rezervuota nuo {time}',
    stationMaintenance: 'Techninė priežiūra',
    stationOffline: 'Nėra ryšio',
    stationHot: 'Kaista',
    telemetryOff: 'Nėra duomenų',
    stationUnusable: 'Neveikia',
    agentOffline: 'Nėra agento',
    // Vietą laiko kito žmogaus gyva sesija (C1.7). Tai ne prisijungimo klaida:
    // slaptažodis teisingas, paskyra tvarkinga — užimta vieta. Todėl antraštė
    // apie stotį, o tekste — kas sėdi ir vienintelis veiksmas, kuris atblokuoja:
    // pamainos administratoriaus raktas.
    seatTaken: 'Stotis',
    seatTakenHi: 'užimta',
    seatTakenBody: '{name} sesija aktyvi. Paprašykite administratoriaus rakto.',
    seatTakenGuestBody:
      'Šioje stotyje vyksta svečio vizitas ({name}). Paprašykite administratoriaus rakto.',
    seatTakenPausedBody:
      '{name} sesija šioje stotyje pristabdyta, o ne baigta. Paprašykite administratoriaus rakto.',
    seatTakenSince: 'Pradėta {time}',
    seatTakenRecheck: 'Tikrinti dar kartą',
    seatTakenStillHeld: 'Stotis vis dar užimta: {name}.',
    seatTakenFreedToast: 'Stotis laisva — prijungiame.',
    // Vienas kompiuteris — viena sesija (C1.12). `seatTaken` veidrodis, ir turi
    // skaitytis kitaip: čia niekas neužimta ir niekas nekliudo — paskyra jau
    // žaidžia kitame salės gale. Todėl antraštė apie *sesiją*, ne apie stotį, o
    // sprendimas pasiūlomas, o ne atimamas: šis vizitas priklauso tam, kas skaito
    // kortelę, tad jis gali paprašyti jį perkelti.
    //
    // Kodėl prašymas, o ne mygtukas „perkelti“. Ant tos vietos liko daiktai, o
    // kėdėje gali sėdėti draugas, todėl įrašą, baigiantį vizitą kitame klubo
    // gale, daro pamainos administratorius — dėl tos pačios priežasties
    // `seatTaken` neturi „baigti jų sesiją“.
    activeElsewhere: 'Sesija aktyvi',
    activeElsewhereHi: 'kitur',
    activeElsewhereBody:
      'Jūsų sesija vyksta stotyje {machine}. Perkelkite ją čia — arba grįžkite prie jos.',
    // Vieta, kurioje vyksta vizitas — faktas, pasakytas kortelės viduje.
    activeElsewhereSeat: 'Žaidžiama: {machine}',
    transferHere: 'Perkelti čia',
    // Paprašyta, o ne padaryta: seną vietą atlaisvina pamainos administratorius.
    transferPending: 'Laukiame pamainos administratoriaus patvirtinimo…',
    transferPendingNote:
      'Pasiimkite savo daiktus iš {machine} — stotis atlaisvinama vos patvirtinus perkėlimą.',
    transferRequestedToast: 'Pamainos administratoriaus paprašyta perkelti jūsų sesiją.',
    transferDoneToast: 'Sesija perkelta — sveiki šioje stotyje.',
    // Vizitas baigėsi arba jį perėmė kitur, kol prašymas laukė atsakymo.
    transferGone: 'Tos sesijos čia nebėra — nėra ko perkelti.',
    // TIK MAKETAS — administratoriaus programos nėra, todėl būdas atsakyti į
    // prašymą įvardytas atvirai, kaip QR dialogo „suvaidinti telefoną“ mygtukas.
    // Neverčiama: šios eilutės žaidėjo nepasiekia.
    transferDemoTitle: 'No admin app yet',
    transferDemoNote:
      'The prototype has no admin screen, so approve the move from here. The frame travels the real bus and this card picks it up through its normal subscription.',
    transferDemoApprove: 'Approve as admin',
    // Du launcher langai viename kompiuteryje (C1.12). Tai ne klaida ir ne
    // atsisakymas: klubas tvarkoje, vieta žaidėjo — launcher tiesiog jau atidarytas
    // šioje mašinoje. Todėl tekstas pasako, kuris langas tikras, ir pažada
    // perėmimą: antras langas tikrai atgyja pats, o ekranas, kuris to nepasakytų,
    // atrodytų užstrigęs.
    duplicateWindow: 'Launcher jau',
    duplicateWindowHi: 'atidarytas',
    duplicateWindowBody:
      'Šis launcher jau veikia kitame šio kompiuterio lange. Perjunkite į tą langą — arba uždarykite jį, ir šis perims stotį pats.',
    duplicateWindowWaiting: 'Laukiame, kol užsidarys kitas langas…',
    // Pristabdytas vizitas šioje vietoje yra savas (C1.10). Tai ne prisijungimas:
    // niekas neišsiregistravo, tik sustojo laikrodis, o apmokėtas laikas liko
    // šioje mašinoje. Antraštė — viena frazė, o paantraštėje likutis kaip klubo
    // faktas: būtent dėl jo įvedami keturi skaitmenys, o ne slaptažodis.
    sessionPaused: 'Sesija pristabdyta',
    sessionPausedHi: '',
    sessionPausedSub: '{name}, stotyje liko {time}. Įveskite PIN, kad tęstumėte.',
    // Ta pati antraštė, bet bandymai išnaudoti: PIN klaviatūros nebėra, todėl
    // prašymas jį įvesti pašalintas — kitaip kortelė prašo to, ko nerodo.
    // Vizitas vis dar įvardytas, o ką daryti toliau pasakyta žemiau vieną kartą
    // (`pinLocked` ir mygtukas po juo).
    sessionPausedSubLocked: '{name}, stotyje vis dar yra {time}.',
    pin: 'Žaidėjo PIN',
    pinUnlock: 'Atrakinti su PIN',
    // formos: viena | kelios | kita
    pinAttemptsLeft: 'liko {n} bandymas|liko {n} bandymai|liko {n} bandymų',
    pinWrong:
      'Neteisingas PIN — liko {n} bandymas|Neteisingas PIN — liko {n} bandymai|Neteisingas PIN — liko {n} bandymų',
    pinLocked: 'Per daug neteisingų PIN. Prisijunkite su slaptažodžiu, kad tęstumėte sesiją.',
    pinIncomplete: 'Įveskite visus {n} skaitmenis',
    pinUsePassword: 'Prisijungti su slaptažodžiu',
    pinVisitGone: 'Tos pristabdytos sesijos čia jau nebėra.',
    // Slaptažodžio atkūrimas — kodas el. paštu (C1.3).
    forgotPassword: 'Pamiršote slaptažodį?',
    recover: 'Prieigos atkūrimas',
    // Antraštė — viena frazė, be akcentuoto žodžio (kaip `welcome`).
    recoverHi: '',
    recoverSub: 'Kodą išsiųsime klubo paskyroje nurodytu adresu.',
    recoverEmail: 'Paskyros el. paštas',
    sendCode: 'Siųsti kodą',
    codeSentToast: 'Kodas išsiųstas adresu {email}',
    codeStep: 'Patikrinkite',
    codeStepHi: 'paštą',
    codeStepSub: 'Įveskite {n} skaitmenų kodą, išsiųstą adresu {email}.',
    code: 'Patvirtinimo kodas',
    codeExpiresIn: 'Kodas galioja dar {time}',
    codeDead: 'Kodo laikas baigėsi — išsiųskite naują.',
    confirmCode: 'Patvirtinti kodą',
    resendCode: 'Siųsti naują kodą',
    resendIn: 'Naujas kodas po {time}',
    codeResentToast: 'Naujas kodas išsiųstas',
    changeEmail: 'Keisti el. paštą',
    backToSignIn: 'Atgal į prisijungimą',
    newPasswordStep: 'Naujas',
    newPasswordStepHi: 'slaptažodis',
    newPasswordSub: 'Sukurkite naują slaptažodį — stotis iškart prijungs.',
    newPassword: 'Naujas slaptažodis',
    saveAndSignIn: 'Išsaugoti ir prisijungti',
    passwordChangedToast: 'Slaptažodis atnaujintas. Sveiki sugrįžę, {name}!',
    demoCode: 'Demo kodas',
    demoCodeNote: 'Prototipas laiškų nesiunčia, todėl kodas parodytas čia.',
    // Registracija — el. pašto patvirtinimas kodu, klubo taisyklės, vardo patikra (C1.4).
    nickHint: 'Lotyniškos raidės, skaitmenys ir _ · {min}–{max} simboliai',
    nickChecking: 'Tikriname, ar vardas laisvas…',
    nickFree: 'Vardas {nick} laisvas',
    nickTaken: 'Vardas {nick} užimtas — pasirinkite kitą',
    nickReserved: 'Šis vardas rezervuotas klubui',
    nickBadChars: 'Tik lotyniškos raidės, skaitmenys ir _',
    nickTooShort: 'Bent {min} simboliai',
    nickTooLong: 'Ne daugiau kaip {max} simboliai',
    nickSuggestions: 'Laisvi dabar',
    emailTaken: 'Šiuo adresu paskyra jau sukurta',
    rulesAccept: 'Perskaičiau ir sutinku su klubo taisyklėmis',
    rulesRead: 'Skaityti taisykles',
    rulesRequired: 'Sutikite su klubo taisyklėmis, kad sukurtumėte paskyrą',
    rulesTitle: 'Klubo taisyklės',
    rule1: 'Paskyra tik jūsų — niekam neduokite jos ir PIN kodo.',
    rule2: 'Laikas ir užsakymai atvirame sąskaitoje apmokami prieš išeinant.',
    rule3: 'Sukčiavimo programos, piratiniai klientai ir atidaryta įranga baigia sesiją.',
    rule4: 'Maistas ir gėrimai lieka prie stalų, ne prie stočių.',
    rule5: 'Paskutinis žodis — pamainos administratoriaus.',
    rulesNote: 'Visas tekstas kabo prie baro ir yra imba.club/rules.',
    rulesGotIt: 'Supratau',
    sendSignupCode: 'Patvirtinti el. paštą',
    editDetails: 'Keisti duomenis',
    signupCodeSub: 'Įveskite {n} skaitmenų kodą, išsiųstą adresu {email}, kad baigtumėte registraciją.',
    accountCreatedToast: 'Sveiki prisijungę prie klubo, {name}!',
    // Gimimo data (C1.11): jos prašoma pirmame žingsnyje, nes ją naudoja du
    // dalykai — PIN taisyklė po dviejų ekranų ir gimtadienio bonusas.
    birthday: 'Gimimo data',
    birthdayHint: 'Klubo gimtadienio bonusui — ir PIN kodas negali jos pakartoti',
    birthdayInvalid: 'Tokios datos nėra',
    birthdayTooYoung: 'Klubo paskyros — nuo {n} metų. Ateikite su pilnamečiu ir paklauskite prie baro',
    pinStep: 'Pasirinkite',
    pinStepHi: 'PIN kodą',
    pinStepSub: 'Keturi skaitmenys, kuriais bet kurioje klubo stotyje tęsite savo vizitą.',
    choosePin: 'Naujas PIN kodas',
    repeatPin: 'Pakartokite PIN kodą',
    pinTooShort: 'Įveskite visus {n} skaitmenis',
    pinAllSame: 'Keturi vienodi skaitmenys — ne PIN kodas. Pakeiskite',
    pinIsBirthday: 'Gimimo data — pirmas dalykas, kurį kas nors pabandytų',
    pinMismatch: 'PIN kodai nesutampa',
    pinNote:
      'Jo paprašysime, kai vizitas pristabdytas ir kai stotis užsirakina. Klubas jo nepamato — tik atstato.',
    // QR prisijungimas — stotis parodo kodą, telefonas jį patvirtina (C1.5).
    qrSub: 'Nėra kameros? Įveskite stoties kodą programėlėje ranka.',
    qrStationCode: 'Stoties kodas',
    qrExpired: 'Kodo laikas baigėsi.',
    qrNewCode: 'Rodyti naują kodą',
    qrConfirmedBy: 'Patvirtino {name} — atrakiname…',
    qrOffline: 'Stotis neprisijungusi: telefonas negalės patvirtinti, kol ryšys neatsinaujins.',
    qrDemoTitle: 'Demo patvirtinimas',
    qrDemoNote:
      'Prototipas neturi telefono programėlės, todėl telefoną atlieka šis mygtukas: jis patvirtina kodą ir paskelbia įvykį magistralėje, o dialogas jį apdoroja kaip bet kurį kitą.',
    qrDemoConfirm: 'Patvirtinti telefonu',
  },

  attract: {
    screenLabel: 'Laukimo ekranas. Pajudinkite pelę arba paspauskite bet kurį klavišą.',
    nowOpen: 'Atidaryta · 24/7',
    unlockHint: 'Pajudinkite pelę',
    fallbackHours: 'Atidaryta 24/7, kasdien',
    fallbackSpecs: 'RTX 4080 ir 240 Hz kiekvienoje stotyje',
    fallbackMembership: 'Klubo narystės teiraukitės prie baro',
    tournamentKicker: 'Šįvakar klube',
    tournamentStartsIn: 'Startas po {when}',
    tournamentLive: 'Vyksta dabar',
    tournamentPrize: 'Prizas',
    tournamentEntry: 'Startinis',
    tournamentFree: 'Nemokamai',
    seatsKicker: 'Laisva dabar',
    // plural: one | few | other
    seatsTitle: 'Laisva {n} stotis|Laisvos {n} stotys|Laisva {n} stoties',
    seatsSubtitle: 'Iš {total} klube. Sėskite — visa kita padarys administratorius.',
    seatsFull: 'Visos stotys užimtos',
    seatsFullBody: 'Užeikite prie baro: vietos atsilaisvina kas kelias minutes.',
    seatsZoneFree: '{free} iš {total}',
    barKicker: 'Iš baro',
    barTitle: 'Kuras sesijai',
    barSubtitle: 'Užsakoma iš stoties, atnešame į vietą.',
    ladderKicker: 'Sezono įskaita',
    ladderTitle: 'Klubo topas',
    ladderHours: '{n} h',
    passKicker: 'Battle Pass',
    // plural: one | few | other
    passDaysLeft: 'Iki sezono galo liko {n} diena|Iki sezono galo liko {n} dienos|Iki sezono galo liko {n} dienos',
    passSubtitle: 'Žaiskite, kelkite lygį, atsiimkite. Nemokama juosta nieko nekainuoja.',
    passLevels: '{n} lygiai',
  },

  session: {
    title: 'Sesija',
    timeLeft: 'Liko laiko',
    sessionTime: 'Sesijos laikas',
    sourcePass: 'Pasas',
    sourceWallet: 'Piniginė',
    sourceStaff: 'Skirta',
    sourcePostpaid: 'PostPaid',
    timeSource: 'Laiko šaltinis: {source}',
    timeBalance: 'Laiko balansas',
    running: 'Vyksta',
    paused: 'Pristabdyta',
    resume: 'Tęsti sesiją',
    lockStation: 'Užrakinti stotį',
    endSession: 'Baigti sesiją',
    endSessionConfirm: 'Baigti sesiją ir atsijungti nuo šios stoties?',
    extend: 'Pratęsti sesiją',
    addTime: 'Pridėti laiko',
    expired: 'Sesija baigėsi',
    expiredBody:
      'Apmokėtas laikas baigėsi. Papildykite prie baro arba programėlėje, kad galėtumėte žaisti toliau.',
    // C2.10 — „stotis“, ne „kompiuteris“. Penkios eilutės aplink šią vietą yra
    // vienas srautas: meniu punktas (`lockStation`), klausimas, pranešimas ir
    // ekranas, į kurį jis nuveda (`lockedTitle`). Antraštė ir pranešimas sakė
    // „kompiuteris“, o mygtukas tame pačiame dialoge — „Užrakinti stotį“: vienas
    // dialogas tą patį dalyką vadino dviem žodžiais.
    lockConfirmTitle: 'Užrakinti šią stotį?',
    lockConfirmBody: 'Sesija bus pristabdyta. Prisijunk vėl ir tęsk su likusiu laiku.',
    lockedToast: 'Stotis užrakinta. Sesija pristabdyta.',
    logoutConfirmTitle: 'Atsijungti?',
    logoutConfirmBody: 'Sesija bus baigta, stotis grįš į užrakto ekraną.',
    lockedTitle: 'Stotis užrakinta',
    lockedBody: 'Laikmatis pristabdytas. Prisijunkite dar kartą ir tęskite nuo tos vietos.',
    minutesLeft: 'liko {n} minutė|liko {n} minutės|liko {n} minučių',
    warningLowTime: 'Liko mažiau nei {n} min. sesijos laiko.',

    /* ---------------------------------------------------------------- *
     * Laikas baigiasi (C2.6)
     * ---------------------------------------------------------------- */
    warnTitle: 'liko {n} minutė|liko {n} minutės|liko {n} minučių',
    warnBody: 'Pratęskite sesijos skydelyje arba ramiai baikite.',
    warnBodyUrgent: 'Pratęskite dabar, kad išsaugotumėte vietą, arba išsaugokite progresą.',
    warnFinal: 'Šioje stotyje liko viena minutė.',
    warnAction: 'Pratęsti',
    lastCallTitle: 'Liko viena minutė',
    lastCallBody:
      'Sesija baigsis greičiau nei po minutės. Pridėkite laiko, kad tęstumėte, pašaukite administratorių, jei kažkas ne taip, arba išsaugokite žaidimą ir atlaisvinkite stotį.',
    lastCallClock: 'Iki pabaigos',
    lastCallExtend: 'Pratęsti',
    lastCallAdmin: 'Pašaukti administratorių',
    lastCallSaveExit: 'Išsaugoti ir baigti',
    lastCallExtendHint: 'Abonemente nėra minučių — laiko paketų yra parduotuvėje.',
    lastCallShop: 'Atidaryti parduotuvę',
    lastCallDismiss: 'Tęsti žaidimą',
    lastCallDismissHint: 'Pasibaigus laikui stotis vis tiek užsirakins.',

    /* ---------------------------------------------------------------- *
     * Administratoriaus pauzė (C2.7)
     * ---------------------------------------------------------------- */
    pauseTitle: 'Sesija pristabdyta',
    pauseBody: 'Laikmatis sustabdytas — šios minutės jums neskaičiuojamos.',
    pauseReasonLabel: 'Priežastis',
    pauseReasonStaff: 'Administratorius pristabdė jūsų sesiją.',
    pauseReasonBreak: 'Jūsų sesijoje pertrauka.',
    pauseReasonPaymentRequired: 'Prieš laikmačio paleidimą reikia apmokėti prie baro.',
    pauseReasonMaintenance: 'Šios stoties techninė priežiūra.',
    pauseReasonUnknown: 'Klubas pristabdė šią stotį.',
    pauseRemaining: 'Laikas išsaugotas',
    pauseWaitHint:
      'Niekas neprarasta. Žaidimai ir langai lieka tokie, kokie buvo — leidyklė grįš vos administratoriui nuėmus pauzę.',
    pauseCallAdmin: 'Pašaukti administratorių',
    pauseResumedToast: 'Pauzė nuimta — grįžtame į žaidimą.',

    /* ---------------------------------------------------------------- *
     * Sesijos perkėlimas į kitą kompiuterį (C2.8)
     * ---------------------------------------------------------------- */
    movedTitle: 'Sesija perkelta',
    movedBody: 'Jūsų sesija perkelta į {seat}, {zone} zona.',
    movedBodyNoZone: 'Jūsų sesija perkelta į {seat}.',
    movedSeatLabel: 'Nauja stotis',
    movedZoneLabel: 'Zona',
    // plural: one | few | other
    movedDeadline:
      'Persikelkite per {n} minutę — laikas saugomas, kol nueisite.|Persikelkite per {n} minutes — laikas saugomas, kol nueisite.|Persikelkite per {n} minučių — laikas saugomas, kol nueisite.',
    movedHint:
      'Už perėjimą nieko neskaičiuojame ir niekas neprarandama: likęs laikas, sąskaita ir paskyra keliauja su jumis. Prie naujos stoties prisijunkite iš naujo.',
    movedAck: 'Supratau',

    /* ---------------------------------------------------------------- *
     * „Mano sesija“ — skydelis už HUD (C2.3)
     * ---------------------------------------------------------------- */
    mine: 'Mano sesija',
    openMine: 'Sesijos informacija',
    seat: 'Stotis',
    startedAt: 'Pradžia',
    playedSoFar: 'Jau žaista',
    spending: 'Kas naudojama',
    spendingPass:
      'Minutės iš jau apmokėto paso. Kai jos pasibaigs, laikrodis tiesiog sustos — daugiau nieko nenuskaitysime.',
    spendingWallet: 'Valandos nupirktos iš piniginės. Pratęsimas vėl nuskaitys pinigus.',
    spendingStaff:
      'Minutės, kurias administratorius skyrė šiai vietai. Už jas niekas nemoka, todėl pačios nepasipildys — užeikite prie baro, kol jos nepasibaigė.',
    spendingPostpaid:
      'Kiekviena minutė keliauja į atvirą sąskaitą ir apmokama prie baro išeinant.',
    onTabNow: 'Sąskaitoje dabar',
    history: 'Pridėtas laikas',
    historyEmpty: 'Kol kas nieko nepridėta',
    historyEmptyBody:
      'Kiekvienas pratęsimas — jūsų ar administratoriaus — atsiras čia su minute, kada jis atėjo.',
    historyExtend: 'Jūs pratęsėte',
    historyStaff: 'Administratorius pridėjo laiko',
    historyCorrection: 'Administratoriaus pataisa',
    historyMinutes: '+{n} min',
    historyMinutesNegative: '−{n} min',
    banked: 'pase turite {n} min',
    extendBy: '+{n} min',
    extendedToast: 'Sesija pratęsta {n} min.',
    // Eilutė po neaktyviu pratęsimu, kai klubas uždarytas (C2.11, C2.12). Svarbu
    // pasakyti, kad minutės niekur nedingo: neveikiantis „+15 min“ skaitomas kaip
    // „paso nebėra“.
    extendClosedHint: 'Sukauptos minutės lieka — laiko pirkimas atsidaro kartu su klubu.',
    buyTime: 'Pirkti laiko',
    buyTimeHint: 'Pase minučių nėra. Laiko pasai — parduotuvėje.',
    postpaidNoExtend:
      'PostPaid vietos nėra ko pratęsti: žaiskite kiek norite ir apmokėkite sąskaitą prie baro.',
    callAdmin: 'Kviesti administratorių',
    callAdminSent: 'Administratorius pakviestas — jau eina prie jūsų.',
    callAdminAgain: 'Administratorius jau gavo jūsų kvietimą.',

    /* Klubo uždarymas (C2.11) — kitas laikrodis nei C2.6: uždarymo pratęsti negalima. */
    // plural: one | few | other
    closingTitle:
      'Klubas užsidaro po {n} minutės|Klubas užsidaro po {n} minučių|Klubas užsidaro po {n} minutės',
    closingBody:
      'Jūsų laikas eina toliau — uždarymas sesijos nenutraukia. Parduotuvė ir baras nebepriima užsakymų.',
    closingBodyUrgent: 'Laikas išsaugoti žaidimą ir susiruošti. Nepanaudotos minutės pasiliks jums.',
    closedTitle: 'Klubas uždarytas',
    closedBody:
      'Pradėtą žaidimą galite baigti — laikrodis eina, niekas nenutraukiama. Laiko pirkimas ir užsakymai bare uždaryti iki atidarymo.',
    closedClockLabel: 'Jūsų laikas vis dar eina',
    closedOpensLabel: 'Vėl atidaroma',
    closedOpensUnknown: 'Pasiteiraukite prie baro',
    closedSaveExit: 'Išsaugoti ir išeiti',
    closedSaveExitHint: 'Likusios minutės grįžta į paskyrą ir lauks kito apsilankymo.',
    closedGuestHint: 'Sąskaitą apmokėkite prie baro, kai baigsite.',
    closedCallAdmin: 'Kviesti administratorių',
    closedDismiss: 'Žaisti toliau',
    closedDismissHint: 'Stotį išjungs administratorius asmeniškai — ne paleidyklė.',
  },

  home: {
    greetMorning: 'Labas rytas, {name}',
    greetAfternoon: 'Laba diena, {name}',
    greetEvening: 'Labas vakaras, {name}',
    greetNight: 'Vis dar žaidi, {name}',
    level: '{level} lygis',
    levelProgress: '{xp} iš {max} XP iki {next} lygio',
    levelProgressShort: '{xp} / {max} XP',
    playingFor: 'Žaidžiama {duration}',
    justArrived: 'Ką tik atsisėdai',
    // plurals lt: one | few | other
    streakDays: '{n} diena iš eilės|{n} dienos iš eilės|{n} dienų iš eilės',
    streakStart: 'Serija pradedama šiandien',
    streakLabel: 'Apsilankymų serija',

    // „Tęsti“ — trys paskutiniai žaidimai, kiekvienas vienu paspaudimu (C3.2).
    // Antraštė yra veiksmas, o ne bibliotekos „Neseniai žaisti“: tai ne istorija,
    // o kelias atgal į tą partiją, iš kurios žaidėjas išėjo.
    continueTitle: 'Tęsti',
    continueLaunch: 'Paleisti {name} — {when}',
    continueRunning: 'Jau veikia',
    continueLaunching: 'Paleidžiama…',
    continueEmpty: 'Žaidimų kol kas nėra',
    continueEmptyBody:
      'Paleisk ką nors iš bibliotekos — žaidimas lauks čia, ir nuo kito apsilankymo į jį grįši vienu paspaudimu.',
    // Praėjęs laikas, o ne kalendorius: 23:50 palikta partija ryte yra „prieš
    // 8 valandas“, ir būtent tai žaidėjui rūpi.
    // plurals lt: one | few | other
    playedJustNow: 'Žaista ką tik',
    playedMinutesAgo:
      'Žaista prieš {n} minutę|Žaista prieš {n} minutes|Žaista prieš {n} minučių',
    playedHoursAgo: 'Žaista prieš {n} valandą|Žaista prieš {n} valandas|Žaista prieš {n} valandų',
    playedDaysAgo: 'Žaista prieš {n} dieną|Žaista prieš {n} dienas|Žaista prieš {n} dienų',

    // „Mano sesija“ — HUD plokštelė, išskleista pradžios ekrane (C3.3). Ta pati
    // tema kaip panelėje už plokštelės (`session.mine`), tik trečiu dydžiu:
    // kortelė veda į tą panelę, o ne perrašo jos turinį.
    sessionTitle: 'Mano sesija',
    // Nuoroda į panelę, kurioje laukia vieta, zona ir kiekvienas pridėtas laikas.
    sessionDetails: 'Detalės',
    // Išnaudoto laiko juostos pavadinimas. Kitur jis nenaudojamas.
    sessionSpentLabel: 'Išnaudota laiko',
    // Užrašas virš juostos; abi reikšmės jau suformatuotos kaip laikrodis.
    // Vardiklis — išnaudota plius likutis, t. y. *šio* apsilankymo trukmė, o ne
    // parduotas blokas: pratęsimas vizitą pailgina, o fiksuotos dvi valandos
    // leistų juostai pereiti 100 %.
    sessionSpentOf: '{spent} iš {total}',
    // Užrakinta stotis: skaičiai viršuje vienu metu ir tikri, ir klaidinantys —
    // stovėdami jie nieko neišnaudoja.
    sessionPaused: 'Laikrodis pristabdytas',

    // „Dienos užduotys“ — vienintelė pradžios ekrano kortelė, kuri prašo žaidėjo
    // ką nors *nuveikti* (C3.4). Pačių užduočių tekstus rašo administratorius ir
    // jie spausdinami tokie, kokie yra, todėl čia tik rėmas aplink juos (F2.2).
    questsTitle: 'Dienos užduotys',
    // Kiek diena dar verta — per visą aktyvų rinkinį, įskaitant užduotį, kuri
    // nepakliuvo į tris eilutes ekrane. Abi reikšmės atkeliauja jau suformatuotos.
    questsPending: 'Šiandien dar nepasiimta: {coins} monetų ir {xp} XP',
    // Skaičiuojama iki kito klubo atidarymo, o ne iki vidurnakčio: žaidėjas prie
    // stoties 03:00 vis dar yra tame rinkinyje, su kuriuo sėdo vakare.
    // `{duration}` atkeliauja kaip frazė („4 valandos“), todėl klubo diena gali
    // pasikeisti bet kurią valandą.
    questsResetIn: 'Atsinaujins po {duration}',
    // Paskutinė minutė prieš pasikeitimą, kur skaičiuoklė rodytų „0 minučių“.
    questsResetNow: 'Atsinaujina',
    // Prieinamas eilutės mygtuko pavadinimas: ekrane vienas žodis „Pasiimti“, o
    // trys vienodi pavadinimai sąraše — trys mygtukai be vardo.
    questClaim: 'Pasiimti atlygį už užduotį: {title}',
    // Vieno pasiėmimo kvitas. Abi reikšmės jau suformatuotos.
    questClaimedToast: 'Gauta: {coins} monetų ir {xp} XP',
    // Klubas nepaskyrė nė vienos užduoties. Tai ne klaida ir ne žaidėjo darbas,
    // todėl pasakoma, ko laukiama.
    questsEmpty: 'Šiandien užduočių nėra',
    questsEmptyBody:
      'Klubas dar nepaskyrė dienos užduočių — naujos atsiras iki kito atidarymo.',
  },

  games: {
    title: 'Žaidimai',
    subtitle: 'Viskas, kas įdiegta šioje stotyje, paruošta paleisti.',
    searchPlaceholder: 'Ieškoti žaidimų',
    favorites: 'Mėgstami',
    recent: 'Neseniai žaisti',
    allGames: 'Visi žaidimai',
    launch: 'Paleisti',
    launching: 'Paleidžiama {name}',
    launchBody: 'Neišjunkite stoties. Žaidimo langas atsidarys po kelių sekundžių.',
    installed: 'Įdiegta',
    rating: 'Reitingas',
    playersOnline: '{n} žaidžia|{n} žaidžia|{n} žaidžia',
    noResults: 'Žaidimų nerasta',
    noResultsBody: 'Pabandykite kitą pavadinimą arba nuimkite kategorijos filtrą.',
    clearFilters: 'Išvalyti filtrus',
    noFeatured: 'Rekomendacijų kol kas nėra',
    noFeaturedBody: 'Klubas dar neišrinko favoritų — atidarykite visą biblioteką.',
    openLibrary: 'Atidaryti biblioteką',
    noAccounts: 'Laisvų paskyrų nėra',
    noAccountsBody: 'Visos klubo paskyros šiam žaidimui užimtos. Paprašykite administratoriaus laisvos vietos.',

    // Paleidimo dialogo vardas (C3.2): matoma antraštė nupiešta ant viršelio,
    // todėl ekrano skaitytuvui pavadinimas duodamas atskirai.
    launchDialog: 'Paleisti {name}',
    launchDialogPending: 'Paleisti žaidimą',

    // Agento žingsniai — vienintelis dalykas, kurį žaidėjas mato tas sekundes (F2.4).
    launchStepAccount: 'Ruošiama paskyra…',
    launchStepSession: 'Įterpiama sesija…',
    launchStepStart: 'Startuoja žaidimas…',

    // Abu paleidimo baigties variantus rodo pats kabliukas, todėl greitas
    // paleidimas iš „Tęsti“ kortelės sako tais pačiais žodžiais — be dialogo.
    launchedToast: '{name} paleistas — paleidyklė nuleidžiama',
    launchFailed: 'Paleisti nepavyko ({code})',

    // Klubo paskyrų sąrašas (F3.4) — pasiūlytas pasirinkimas, o ne paleidimo
    // parametras: užimtumą tvarko serveris. Todėl vienas paspaudimas jį praleidžia.
    selectAccount: 'Pasirinkite paskyrą',
    accountLinked: 'Priskirta: {name}',
    // Parašyta žodžiais prie spalvoto taškelio: pats taškelis nieko nepasako nei
    // skaitytuvui, nei tam, kas tų dviejų atspalvių neatskiria (F6.6).
    accountAvailable: 'Laisva',
    accountInUse: 'Užimta',
    rememberAccount: 'Įsiminti pasirinkimą šiam žaidimui',

    inGame: 'Žaidime',
    inGameNow: 'Veikia {name}',
    inGameQuiet:
      'Paleidyklės garsai pristabdyti. Laiko įspėjimai ir administratoriaus žinutės vis tiek skambės.',
    backToLauncher: 'Žaidimas uždarytas',
  },

  shop: {
    title: 'Prekės',
    subtitle: 'Užkandžiai, gėrimai ir papildomas laikas — tiesiai į stotį.',
    addToCart: 'Į krepšelį',
    cart: 'Krepšelis',
    cartEmpty: 'Krepšelis tuščias',
    cartEmptyBody: 'Pasirinkite ką nors iš prekių — tai atsiras čia.',
    checkout: 'Apmokėti',
    total: 'Iš viso',
    remove: 'Pašalinti',
    quantity: 'Kiekis',
    payWithCoins: 'Mokėti monetomis',
    payAtCounter: 'Mokėti prie baro',
    orderPlaced: 'Užsakymas priimtas! Darbuotojas atneš jį į stotį.',
    catSnacks: 'Užkandžiai',
    catDrinks: 'Gėrimai',
    catTime: 'Laikas',
    catGear: 'Įranga',
    sectionEmpty: 'Šiame skyriuje nieko nėra',
    sectionEmptyBody: 'Klubas pildo atsargas. Pabandykite kitą skirtuką arba paklauskite prie baro.',
    openCartEmpty: 'Krepšelis tuščias',
    // plural: one | few | other
    openCart: 'Krepšelis, {n} prekė|Krepšelis, {n} prekės|Krepšelis, {n} prekių',

    /* Uždarymas parduotuvėje (C2.11): closed* — atsisakymas, closing* — tik pastaba. */
    closedTitle: 'Klubas uždarytas',
    closedBody: 'Pirkimas ir užsakymai bare vėl veiks {time}.',
    closedBodyNoTime: 'Pirkimas ir užsakymai bare vėl veiks kartu su klubu.',
    closedCheckoutHint: 'Apmokėjimas vėl veiks kartu su klubu.',
    closingPassNote: 'Ilgiau, nei šiandien dirbame — {n} min pasiliks kitam apsilankymui.',
  },

  wallet: {
    title: 'Piniginė',
    balance: 'Balansas',
    openWallet: 'Piniginė, balansas {amount}',
    coinBalance: 'IMBA monetos',
    openCoins: 'Piniginė, {amount} IMBA monetų',
    balanceUnknown: 'Balansas neįkeltas, spauskite, kad pakartotumėte',
    topUp: 'Papildyti',
    history: 'Istorija',
    deposit: 'Papildymas',
    spent: 'Išleista',
    debt: 'Skola',
    noTransactions: 'Operacijų dar nėra',
    noTransactionsBody: 'Pirkimai ir papildymai atsiras čia.',
  },

  loyalty: {
    title: 'Lojalumas',
    level: 'Lygis',
    xp: 'Patirtis',
    xpToNext: '{n} patirties iki {level} lygio',
    battlePass: 'Battle Pass',
    season: 'Sezonas',
    rewards: 'Apdovanojimai',
    claim: 'Pasiimti',
    claimed: 'Pasiimta',
    locked: 'Užrakinta',
    progress: 'Progresas',
    tierRookie: 'Naujokas',
    tierRegular: 'Nuolatinis',
    tierVeteran: 'Veteranas',
    tierElite: 'Elitas',
    achievements: 'Pasiekimai',
    noAchievements: 'Pasiekimų dar nėra',
    noAchievementsBody: 'Sužaiskite sesiją — pirmieji ženkleliai prad��s atsirakinti.',
    activity: 'Naujausia veikla',
    noActivity: 'Veiklos dar nėra',
    noActivityBody: 'Sesijos, pirkimai ir atrakinimai atsiras čia.',
    prizeLadder: 'Prizų kopėčios',
    noRewards: 'Kopėčiose prizų nėra',
    noRewardsBody: 'Klubas rengia naujas prizų kopėčias — užsukite vėliau.',
    leaderboard: 'Lyderių lentelė',
    noLeaderboard: 'Lyderių lentelė tuščia',
    noLeaderboardBody: 'Būkite pirmas, surinkęs valandų šią savaitę.',
    unlocked: 'Atrakinta',
    prizesUnlocked: 'Atrakinta prizų',
  },

  social: {
    title: 'Draugai',
    friends: 'Draugai',
    addFriend: 'Pridėti draugą',
    invite: 'Pakviesti',
    party: 'Komanda',
    chat: 'Pokalbis',
    requests: 'Užklausos',
    accept: 'Priimti',
    decline: 'Atmesti',
    noFriends: 'Draugų dar nėra',
    noFriendsBody: 'Pridėkite žaidėjus iš klubo ir matysite, kada jie prisijungę.',
    playingNow: 'Žaidžia {name}',
  },

  tournaments: {
    title: 'Turnyrai',
    upcoming: 'Būsimi',
    live: 'Vyksta',
    finished: 'Baigti',
    register: 'Registruotis',
    registered: 'Užregistruota',
    prizePool: 'Prizų fondas',
    bracket: 'Tinklelis',
    startsAt: 'Pradžia {time}',
    noTournaments: 'Turnyrų nesuplanuota',
    noTournamentsBody: 'Nauji tinkleliai skelbiami kas savaitę — užsukite vėliau.',
  },

  help: {
    title: 'Pagalba',
    callStaff: 'Kviesti darbuotoją',
    staffCalled: 'Darbuotojas informuotas — jau eina pas jus.',
    faq: 'DUK',
    rules: 'Klubo taisyklės',
    contact: 'Kontaktai',
    reportIssue: 'Pranešti apie problemą',
    issueSent: 'Dėkojame! Pranešimas išsiųstas administratoriui.',
    describeIssue: 'Aprašykite problemą',
  },

  inbox: {
    title: 'Pranešimai',
    openNone: 'Pranešimai, nieko naujo',
    // formos: viena | kelios | kita — dviejų formų neužteko („3 neperskaitytų“)
    openUnread:
      'Pranešimai, {n} neperskaityta žinutė|Pranešimai, {n} neperskaitytos žinutės|Pranešimai, {n} neperskaitytų žinučių',
    unreadCount: '{n} neperskaityta|{n} neperskaitytos|{n} neperskaitytų',
    overflow: '9+',
    markAllRead: 'Skaityti visus',
    markedAllToast: 'Visi pažymėti kaip perskaityti.',
    allRead: 'Viskas perskaityta',
    unread: 'Neperskaityta',
    empty: 'Čia nieko nėra',
    emptyBody: 'Klubo naujienos, užsakymų atnaujinimai ir laiko įspėjimai atsiranda čia.',
    // Dienų antraštės (C2.5): „šiandien“ ir „vakar“ — žodžiais, senesnės dienos —
    // per formatFullDate, nes datos dalių tvarką sprendžia lokalė.
    today: 'Šiandien',
    yesterday: 'Vakar',
    dayGroup: 'Pranešimai, {day}',
    acceptInvite: 'Priimti pakvietimą',
    declineInvite: 'Atmesti',
    inviteAccepted: 'Pakvietimas priimtas',
    inviteDeclined: 'Pakvietimas atmestas',
    joinedToast: 'Prisijungėte prie komandos.',
    declinedToast: 'Pakvietimas atmestas.',
    rateOrder: 'Įvertinti užsakymą',
    // formos: viena | kelios | kita
    rateStar: '{n} žvaigždė|{n} žvaigždės|{n} žvaigždžių',
    rated: 'Įvertinta {n}/5',
    ratedToast: 'Dėkojame už įvertinimą.',
    actionFailed: 'Nepavyko. Bandykite dar kartą.',
    actionStale: 'Į tai jau atsakyta.',
  },

  booking: {
    title: 'Rezervacija',
    selectZone: 'Zona',
    selectStation: 'Stotis',
    date: 'Data',
    time: 'Laikas',
    duration: 'Trukmė',
    book: 'Rezervuoti',
    booked: 'Stotis rezervuota',
    bookedBody: 'Rezervavome {station} jums {date}.',
    cancelBooking: 'Atšaukti rezervaciją',
    noSlots: 'Laisvų vietų nėra',
    noSlotsBody: 'Pasirinkite kitą laiką arba kitą zoną.',
    zoneVip: 'VIP',
    zoneStandard: 'Standartinė',
    zonePs5: 'PS5',
  },

  settings: {
    title: 'Nustatymai',
    close: 'Uždaryti nustatymus',
    display: 'Ekranas',
    audio: 'Garsas',
    controls: 'Valdymas',
    region: 'Regionas',
    resolution: 'Rezoliucija',
    brightness: 'Šviesumas',
    reduceAnimations: 'Mažiau animacijų',
    masterVolume: 'Bendras garsas',
    gameVolume: 'Žaidimo garsas',
    chatVolume: 'Pokalbio garsas',
    outputDevice: 'Išvesties įrenginys',
    interfaceGroup: 'Paleidyklė',
    interfaceSounds: 'Sąsajos garsai',
    interfaceSoundsHint:
      'Tik paleidyklės signalai: pranešimai, patvirtinimai, laiko įspėjimai. Žaidimų ir pokalbių garsas nekeičiamas.',
    interfaceVolume: 'Sąsajos garsas',
    mouseSensitivity: 'Pelės jautrumas',
    serverRegion: 'Serverio regionas',
    language: 'Sąsajos kalba',
    languageHint: 'Pritaikoma stotyje iš karto ir išsaugoma profilyje.',
    languageHintGuest: 'Veikia iki šio seanso pabaigos. Svečias neturi profilio, kuriame būtų išsaugota.',
    languageSaved: 'Sąsajos kalba išsaugota profilyje.',
    languageSaveFailed: 'Kalba pakeista šiam seansui, bet išsaugoti profilyje nepavyko.',
  },

  guest: {
    title: 'Svečio režimas',
    subtitle: 'Žaiskite dabar, profilį sukursite vėliau.',
    continueAsGuest: 'Tęsti kaip svečias',
    badge: 'Svečias',
    limits: 'Svečiai negauna patirties, monetų ir Battle Pass apdovanojimų.',
    createAccount: 'Sukurti profilį',
    startedToast: 'Prisiregistravote kaip {label}. Užsakymai keliauja į sąskaitą.',
    tab: 'Atvira sąskaita',
    endSession: 'Baigti svečio seansą',
    endConfirmTitle: 'Baigti svečio seansą?',
    endConfirmBody: 'Atviras sąskaitą apmokėkite bare. Seanso duomenys nesaugomi.',
    // Užrakto ekrano „Svečias“ skirtukas — įėjimas į 2 etapo PostPaid srautą (C1.2).
    lockTitle: 'Svečio',
    lockTitleHi: 'įėjimas',
    lockSub: 'Užeikite ir žaiskite iškart — sąskaitą apmokėsite kasoje po seanso.',
    flowTitle: 'Kaip veikia atvira sąskaita',
    flowStep1: 'Administratorius atrakina stotį ir pradeda jūsų vizitą.',
    flowStep2: 'Žaidimo laikas ir visi užsakymai keliauja į vieną sąskaitą.',
    flowStep3: 'Visą sąskaitą apmokate kasoje išeidami.',
    startVisit: 'Pradėti svečio vizitą',
    soon: 'Greitai',
    soonNote: 'Savarankiška registracija šioje stotyje dar neveikia. Paprašykite pamainos administratoriaus atidaryti svečio vizitą.',
  },

  agent: {
    title: 'Šis kompiuteris',
    subtitle: 'Windows ir tvarkyklių skydeliai šiai stotiai.',
    statusChecking: 'Ieškome stoties agento…',
    statusConnected: 'Stoties agentas prijungtas',
    statusUnavailable: 'Stoties agento nėra',
    version: 'Agentas {version}',
    unavailable: 'Šiame kompiuteryje negalima',
    unavailableBody:
      'Stoties agentas neveikia, todėl paleidyklė negali atverti Windows skydelių ar keisti įrangos nustatymų.',
    unavailableHint: 'Paprašykite darbuotojo perkrauti stoties agentą.',
    unsupported: 'Šiai įrangai negalima',
    recheck: 'Tikrinti dar kartą',
    open: 'Atverti',
    opening: 'Atveriama…',
    openedToast: '{panel} atvertas darbalaukyje',
    panelNvidia: 'NVIDIA valdymo skydas',
    panelNvidiaHint: 'Aštrumas, delsos režimas, spalvos.',
    panelWindowsDisplay: 'Ekrano nustatymai',
    panelWindowsDisplayHint: 'Raiška, atnaujinimo dažnis, mastelis.',
    panelAudioOutput: 'Garsiakalbiai ir ausinės',
    panelAudioOutputHint: 'Išvesties įrenginys ir lygiai.',
    panelAudioInput: 'Mikrofonas',
    panelAudioInputHint: 'Įvesties įrenginys ir stiprinimas.',
    panelMouse: 'Pelė',
    panelMouseHint: 'Žymeklio greitis ir klavišai.',
    panelKeyboard: 'Klaviatūra',
    panelKeyboardHint: 'Pakartojimo delsa ir išdėstymai.',
  },

  realtime: {
    offlineTitle: 'Nėra ryšio su klubo serveriu',
    offlineBody: 'Laikas toliau eina — niekas neprarandama. Automatiškai bandome prisijungti.',
    reconnecting: 'Bandome prisijungti…',
    retryIn: 'Kitas bandymas po {n} s',
    retryNow: 'Bandyti dabar',
    attempt: '{n} bandymas',
    restored: 'Ryšys atkurtas',
    // formos: vienas | keli | daug
    pendingUpdates: 'Laukia {n} atnaujinimas|Laukia {n} atnaujinimai|Laukia {n} atnaujinimų',

    // Pinigai be ryšio (C2.12): atsisakymas, o ne žaidėjo klaida.
    salesTitle: 'Pirkimai pristabdyti',
    salesBody:
      'Klubo serveris dabar negali patvirtinti mokėjimo. Seansui tai neturi įtakos: laikas toliau eina, žaidimas nenutrūksta.',
    salesHint: 'Pirkimai vėl veiks patys, kai ryšys atsinaujins.',
    salesRefused: 'Nėra ryšio su klubo serveriu — niekas nenuskaityta.',

    timeAdded: '+{minutes} min prie sesijos',
    timeAddedByStaff: '+{minutes} min nuo administratoriaus',
    sessionPaused: 'Sesija pristabdyta',
    sessionPausedStaff: 'Administratorius pristabdė sesiją',
    sessionResumed: 'Sesija tęsiama — galite žaisti',
    sessionEnded: 'Sesija baigta',
    sessionMoved: 'Persikelkite į vietą {seat}',
    sessionMovedBody: 'Persikelkite per {n} min. Sesija ir laikas keliauja su jumis.',
    orderNew: 'Užsakymas gautas',
    orderAccepted: 'Užsakymas patvirtintas bare',
    orderPreparing: 'Užsakymas ruošiamas',
    orderDelivering: 'Užsakymas pakeliui',
    orderDelivered: 'Užsakymas atneštas — gero apetito',
    orderCancelled: 'Užsakymas atšauktas',
    tabUpdated: 'Jūsų sąskaita: {total}',
    tabSettled: 'Sąskaita apmokėta — dėkojame',
    passGranted: '{name} pridėtas: {minutes} min balanse',
    walletTopUp: 'Balansas papildytas {amount}',
    walletSpent: 'Nurašyta {amount}',
    coinsEarned: '+{n} monetų',
    messageReceived: 'Atsakymas iš klubo',
    questCompleted: 'Užduotis atlikta: {title}',
    battlePassTier: 'Atvertas {n} Battle Pass lygis',
    tournamentCall: '{name}: jus kviečia į mačą',
    bookingReminder: 'Jūsų rezervacija tuoj prasideda',
    friendRequest: '{name} nori draugauti',
    partyInvite: '{name} pakvietė į grupę',
  },

  errors: {
    generic: 'Kažkas nepavyko',
    genericBody: 'Veiksmas neįvyko. Po akimirkos bandykite dar kartą.',
    network: 'Nėra ryšio su klubo serveriu',
    networkBody: 'Patikrinkite stoties kabelį arba kvieskite darbuotoją.',
    notFound: 'Nerasta',
    unauthorized: 'Prieiga uždrausta',
    sessionLost: 'Sesija nutrūko — prisijunkite dar kartą',
    invalidCredentials: 'Neteisingas vartotojo vardas arba slaptažodis',
    invalidCode: 'Neteisingas kodas — patikrinkite laišką ir pakartokite',
    rateLimited: 'Per daug bandymų — naujo kodo prašykite po minutės',
    forbidden: 'Jūsų paskyrai neleidžiama',
    conflict: 'Duomenys jau pasikeitė — atnaujinkite ir pakartokite',
    validation: 'Patikrinkite pažymėtus laukus',
    timeout: 'Klubo serveris atsakė per ilgai',
    sessionExpired: 'Jūsų sesija baigėsi',
    // C1.12 — tostas tiems keliams, kurie neturi kortelės: panelė tą patį pasako
    // tiksliau ir įvardija stotį.
    activeElsewhere: 'Jūsų sesija jau vyksta kitame kompiuteryje',
    insufficientFunds: 'Balanse nepakanka pinigų',
    insufficientCoins: 'Nepakanka monetų',
    outOfStock: 'Šiuo metu neturime',
    creditLimit: 'Sąskaitos limitas išnaudotas — apmokėkite prie baro',
    invalidEmail: 'Įveskite tinkamą el. pašto adresą',
    required: 'Šis laukas privalomas',
    tooShort: 'Mažiausiai {min} simboliai',
    passwordsMismatch: 'Slaptažodžiai nesutampa',
    agentUnavailable: 'Šiame kompiuteryje nėra stoties agento',
    unsupported: 'Šis kompiuteris to negali',
    agentTimeout: 'Stoties agentas neatsakė',
    gameNotInstalled: 'Šis žaidimas čia neįdiegtas',
    gameAlreadyRunning: 'Žaidimas jau paleistas',
    gameNotRunning: 'Šis žaidimas nepaleistas',
    launcherFailed: 'Žaidimo paleidyklė nepasileido',
    permissionDenied: 'Windows užblokavo šį veiksmą',
    invalidValue: 'Įranga nepalaiko šios reikšmės',
    blockedByPolicy: 'Negalima apmokėtos sesijos metu',
    agentFailed: 'Stoties agentas pranešė apie klaidą',
  },

  // Avarijos ekranas (F6.5). Tonas — ramus ir operatyvinis: žaidėjas sumokėjo
  // už minutes, todėl pirmiausia turi perskaityti, kad laikas neprarastas.
  crash: {
    eyebrow: 'Aplinkos klaida',
    title: 'Sąsaja',
    titleAccent: 'sustojo',
    body: 'Netikėta klaida nutraukė paleidyklės darbą. Užsakymas nepateiktas, pinigai nenuskaityti.',
    timeSafe: 'Sesijos laiką skaičiuoja klubo serveris ir jis toliau eina — sąsajos perkrovimas neatima jūsų minučių.',
    callStaff: 'Jei tai kartojasi, pakvieskite administratorių prie baro ir pasakykite žemiau esantį kodą.',
    retry: 'Bandyti dar kartą',
    reload: 'Perkrauti sąsają',
    autoRecover: 'Automatinis atkūrimas po {seconds} s',
    autoRecoverGaveUp: 'Automatinis atkūrimas nepadėjo — pakvieskite administratorių.',
    reference: 'Klaidos kodas',
    details: 'Techninė informacija',
    sectionTitle: 'Šis skyrius neįsikėlė',
    sectionBody: 'Likusi paleidyklės dalis veikia kaip įprasta. Atnaujinkite skyrių arba atidarykite kitą.',
  },
}
