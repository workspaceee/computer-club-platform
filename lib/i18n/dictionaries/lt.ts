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

    // Klubo durys, kol nėra ryšio (C2.13). Trijų eilučių paaiškinimas — `en.ts`.
    offlineEntryTitle: 'Nėra ryšio su klubu',
    offlineEntryBody:
      'Prisijungimui reikia ryšio su klubu: tik serveris patvirtina, kas jūs esate ir ar vieta laisva. Niekas neprarasta — forma grįš pati, kai ryšys atsinaujins.',
    offlineEntryRefused: 'Prisijungimui reikia ryšio su klubo serveriu.',
    callAdmin: 'Kviesti administratorių',
    adminCalled: 'Administratorius iškviestas',
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
     * Neprisijungus augantis postpaid sąskaitos laikas (C2.17)
     * ---------------------------------------------------------------- */
    tabCapTitle: 'Sąskaita auga be ryšio',
    tabCapBody:
      'Klubo serveris jau kurį laiką nepasiekiamas, o laikmatis visą tą laiką ėjo. Niekas neprapuolė — šios minutės pasieks klubą vos ryšys atsinaujins. Jei norite, kad skaitiklis sustotų, pašaukite administratorių: pristabdyti stotį gali tik klubas.',
    tabCapElapsed: 'Dar neatsiskaityta',
    tabCapCharge: 'Pagal klubo tarifą',
    tabCapUnbilled:
      'Apie {n} minutę klubas dar nežino — galutinį žodį turi registratūra.|Apie {n} minutes klubas dar nežino — galutinį žodį turi registratūra.|Apie {n} minučių klubas dar nežino — galutinį žodį turi registratūra.',
    tabCapToast:
      'Be ryšio {n} minutę — sąskaita vis dar auga|Be ryšio {n} minutes — sąskaita vis dar auga|Be ryšio {n} minučių — sąskaita vis dar auga',
    tabCapDismiss: 'Tęsti žaidimą',
    tabCapDismissHint: 'Laikmatis eina bet kuriuo atveju — sustabdyti jį gali tik klubas.',

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
    // Ta pati tuščia eilutė, bet žaidėjui, kuris čia dar nė karto nežaidė (C3.13).
    // Dvi eilučių poros, o ne viena mandagi abiem: nuolatiniam žaidėjui istorija
    // tiesiog atsistatė, o naujam reikia pasakyti, nuo ko pradėti.
    continueFirstGame: 'Pasirink pirmą žaidimą',
    continueFirstGameBody:
      'Šioje paskyroje dar nieko nepaleista. Atidaryk biblioteką ir pradėk nuo bet ko — nuo kito apsilankymo žaidimas lauks čia.',
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
    // Tas pats laukas pirmą vakarą, kai dar nieko neuždirbta (C3.13): tie patys du
    // skaičiai, tik frazė žiūri į priekį, o ne atgal.
    questsFirstQuest: 'Atlik pirmą užduotį — rinkinys duoda {coins} monetų ir {xp} XP',
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

    // „Battle Pass“ — sezonas kortelės dydžiu (C3.5). Keturi atsakymai ir tiek:
    // kuriame lygyje žaidėjas stovi, kiek iki kito, ką duos kitas ir kur gyvena
    // visos kopėčios. Antraštė imama iš `loyalty.battlePass` — praleidimas yra
    // vienas visame produkte ir neturi būti pavadintas dukart.
    //
    // Žodynas sąmoningai perskirtas: pasisveikinimas viršuje sako „lygis“ (paskyros
    // rangas), o čia viskas sako „pakopa“ (vieta sezone). Du skaičiai — du žodžiai,
    // kitaip tai atrodytų kaip vienas skaitiklis, prieštaraujantis sau.
    passTier: '{level} pakopa',
    // Patirties juostos pavadinimas: kur ji eina — kur stovi, jau pasakė žiedas.
    passToNextTier: 'Iki {level} pakopos',
    // Antraštė virš juostos; abi reikšmės atkeliauja sugrupuotos pagal lokalę.
    passXpOf: '{xp} / {max} XP',
    // Antraštė virš kitos pakopos atlygio — eilutė „ką už tai gausiu“.
    passNextGives: '{level} pakopa duoda',
    // Pakopa, kuri atsilygina ����aidimo laiku. `{duration}` atkeliauja kaip frazė.
    passRewardTime: '{duration} žaidimo laiko',
    // Pasiektos, bet nepasiimtos pakopos. Tai priežastis paspausti mygtuką, o ne
    // skaičius, su kuriuo kortelė gali ką nors padaryti: pasiimama praleidimo
    // ekrane, kur atlygis parodomas atidarymo metu (C8.6).
    passReady:
      '{n} pakopa paruošta pasiimti|{n} pakopos paruoštos pasiimti|{n} pakopų paruošta pasiimti',
    // Kiek sezonui liko. `{duration}` atkeliauja kaip frazė („12 dienų“).
    passSeasonEndsIn: 'Sezonas baigsis po {duration}',
    // Paskutinė diena, kur dienų skaitiklis rodytų „0 dienų“.
    passSeasonEndsToday: 'Sezonas baigiasi šiandien',
    // Kopėčios pereitos: aukščiau paskutinės pakopos nėra ko žadėti.
    passTopTier: 'Paskutinė sezono pakopa',
    passTopTierBody: '{level} pakopa yra paskutinė — pasiimk, kas liko, iki sezono galo.',
    // Kelias į visas kopėčias. Ekrane vienas žodis, todėl skaitytojui pasakoma,
    // kurį praleidimą jis atidaro.
    passOpen: 'Atidaryti',
    passOpenLabel: 'Atidaryti Battle Pass — {season}',

    // „Baras“ — trys pozicijos ir krepšelis pačiame pradžios ekrane (C3.6).
    // Prekių pavadinimai ir akcijos tekstas — klubo, spausdinami kaip parašyta;
    // čia tik rėmas aplink juos (F2.2).
    barTitle: 'Baras',
    barSubtitle: 'Ko klube užsisakoma daugiausia — tiesiai į tavo vietą.',
    barMenu: 'Visas meniu',
    barMenuLabel: 'Atidaryti parduotuvę — visas baro meniu',
    barAdd: 'Įdėti',
    barAddLabel: 'Įdėti į krepšelį: {name}',
    barAddedToast: '{name} — krepšelyje',
    barEmpty: 'Šįvakar bare nieko nėra',
    barEmptyBody: 'Baras dar neišdėjo meniu — pasitikslinkite pas darbuotojus.',
    barClosedHint: 'Baras priims užsakymą, kai klubas atsidarys.',

    // „Klubas dabar“ — kiek vietų laisva pagal zonas ir kas iš draugų salėje
    // (C3.7). Vienintelė šio ekrano kortelė apie pačią salę, o ne apie paskyrą.
    // Zonų pavadinimai ir vietų numeriai — klubo duomenys, spausdinami kaip yra
    // (F2.2).
    clubNowTitle: 'Klubas dabar',
    clubNowFree: 'Laisva {free} iš {total} vietų',
    clubNowFull: 'Laisvų vietų nėra',
    clubNowZones: 'Laisvos vietos pagal zonas',
    clubNowZoneFull: 'Užimta',
    // formos: viena | kelios | kita
    clubNowZoneFree: 'laisva {n}|laisva {n}|laisva {n}',
    clubNowZoneLabel: '{zone}: laisva {free} iš {total} vietų',
    // formos: viena | kelios | kita
    clubNowFriends: '{n} draugas klube|{n} draugai klube|{n} draugų klube',
    clubNowFriendSeat: 'Vieta {seat}',
    clubNowFriendPlaying: 'Žaidžia {game}',
    clubNowFriendIdle: 'Dar ne žaidime',
    clubNowCall: 'Pakviesti',
    clubNowCallLabel: 'Pakviesti {name} į grupę',
    clubNowCalledToast: '{name} — pakvietimas į grupę išsiųstas',
    clubNowInvited: 'Pakviestas',
    clubNowJoined: 'Tavo grupėje',
    clubNowNeedGame: 'Paleisk žaidimą — tada galėsi pakviesti draugus tiesiai iš čia.',
    clubNowNoInvites: 'Nepriima pakvietimų',
    clubNowPartyGame: 'Grupė žaidime {game}',
    // formos: viena | kelios | kita
    clubNowAway: 'dar {n} draugas ne klube|dar {n} draugai ne klube|dar {n} draugų ne klube',
    clubNowNoFriends: 'Draugų kol kas nėra',
    clubNowNoFriendsBody:
      'Pridėk tuos, su kuriais žaidi klube, ir kortelė parodys, prie kurio kompiuterio jie sėdi.',
    // Draugų sąrašas visiškai tuščias — tai ne „šiandien nieko“ (C3.13). `{n}` yra
    // klubo `referralBonusMinutes`, todėl vertimas niekada nesiginčija su klubu.
    // formos: viena | kelios | kita
    clubNowReferral:
      'Atvesk draugą — {n} nemokama minutė|Atvesk draugą — {n} nemokamos minutės|Atvesk draugą — {n} nemokamų minučių',
    clubNowReferralBody:
      'Klubas pridės laiką, kai tavo atvestas žaidėjas užsiregistruos ir atsisės prie stoties. Pakvietimo paklausk darbuotojų.',
    clubNowEmpty: 'Kol kas nėra ką parodyti',
    clubNowEmptyBody: 'Klubas dar nesužymėjo zonų — pasitikslink pas darbuotojus.',

    // „Turnyras“ — artimiausias tinklelis ir laikas iki starto (C3.8).
    tournamentTitle: 'Turnyras',
    tournamentSubtitle: 'Artimiausias klubo tinklelis — ir laikas iki jo.',
    tournamentAll: 'Visi turnyrai',
    tournamentAllLabel: 'Atidaryti turnyrų skyrių',
    tournamentStartsIn: 'Iki starto',
    tournamentStartingNow: 'Startuoja dabar',
    tournamentStartsAt: 'Startas {time}',
    // formos: viena | kelios | kita
    tournamentSlots:
      'liko {n} vieta iš {total}|liko {n} vietos iš {total}|liko {n} vietų iš {total}',
    tournamentNoSlots: 'Vietų nėra',
    tournamentSeats: 'Tinklelis',
    tournamentPrize: 'Pirma vieta',
    tournamentEntry: 'Startinis mokestis',
    tournamentFree: 'Dalyvavimas nemokamas',
    tournamentFormat: 'Formatas',
    tournamentFormatSingleElim: 'Vienguba eliminacija',
    tournamentFormatDoubleElim: 'Dviguba eliminacija',
    tournamentFormatRoundRobin: 'Ratų sistema',
    tournamentFormatSwiss: 'Šveicariška sistema',
    tournamentJoin: 'Dalyvauti',
    tournamentJoinLabel: 'Dalyvauti {name}',
    tournamentJoinedToast: 'Tu tinklelyje: {name}',
    tournamentCheckIn: 'Registruotis',
    tournamentCheckInLabel: 'Registruotis į {name}',
    tournamentCheckedInToast: 'Registracija priimta — {name}',
    tournamentCheckedIn: 'Užsiregistravai',
    tournamentRegistered: 'Tu dalyvauji',
    tournamentFull: 'Vietų nėra',
    tournamentCantAfford: 'Balanse nepakanka startiniam mokesčiui.',
    tournamentClosedHint: 'Registracija atsidarys kartu su klubu.',
    tournamentEmpty: 'Turnyrų dar nepaskelbta',
    tournamentEmptyBody:
      'Klubas skelbia naujus turnyrus kas savaitę — darbuotojai žinos, kas bus toliau.',

    /* ---------------------------------------------------------------- *
     * Herojaus karuselė (C3.9)
     *
     * Čia tik rėmas, į kurį atsistoja klubo tekstai: akcijų antraštės, turnyrų
     * pavadinimai ir darbuotojų pastaba apie naujoką — jie administraciniai ir
     * spausdinami taip, kaip parašyti (F2.2). Žemiau — slaidų *rūšys*,
     * valdymo elementai ir tai, ką karuselė šiuo metu daro.
     * ---------------------------------------------------------------- */

    heroLabel: 'Svarbiausia klube',
    // „Svarbiausia“, o ne „slaidas“: numeris turi prasmę tik kaip vieta klubo
    // iškeltų dalykų sąraše — „slaidas 3 iš 5“ aprašo valdiklį, ne turinį.
    heroSlides: 'Svarbiausia',
    heroPrev: 'Ankstesnis',
    heroNext: 'Kitas',
    heroGoTo: 'Rodyti {n}: {title}',
    // Sukimas nekeičia fokuso, todėl turinio pasikeitimą po ta pačia antrašte
    // ekrano skaitytuvui reikia pasakyti atskirai.
    heroAnnounce: '{n} iš {total}. {body}',
    // Sustabdymas, kuriam nereikia laikyti pelės vietoje (WCAG 2.2.2). Tas pats
    // mygtukas pasako, kokioje būsenoje karuselė.
    heroPause: 'Sustabdyti sukimą',
    heroPlay: 'Tęsti sukimą',
    heroPaused: 'Sustabdyta',

    heroNewLabel: 'Nauja klube',
    heroTournamentLabel: 'Turnyras',
    heroPlayNow: 'Žaisti',
    heroPlayLabel: 'Paleisti {name}',
    heroSeeTournaments: 'Visi turnyrai',
    // plurals lt: one | few | other
    heroPlayers: 'klube {n} žaidėjas|klube {n} žaidėjai|klube {n} žaidėjų',

    /* ── Savaitės lentelė (C3.10) ─────────────────────────────────────── */
    leaderboardTitle: 'Savaitės lyderių lentelė',
    leaderboardSubtitle: 'Klubo dešimtukas šią savaitę — ir jūsų vieta jame.',
    // Trys vienažodžiai segmentai pasako, ką jie matuoja, bet ne ką daro
    // paspaudimas — o perjungiklis perrikiuoja visą klubą, ne dešimt eilučių
    // ekrane. Todėl grupės pavadinimas yra veiksmas.
    leaderboardMetricLabel: 'Rikiuoti lentelę pagal',
    leaderboardHours: 'Valandos',
    leaderboardCoins: 'Monetos',
    leaderboardWins: 'Pergalės',
    leaderboardRank: 'Vieta',
    leaderboardPlayer: 'Žaidėjas',
    leaderboardYou: 'Jūs',
    leaderboardYouRanked: 'Šią savaitę esate {rank} iš {total}',
    leaderboardYourPlace: 'Jūsų vieta: {rank} iš {total}',
    leaderboardTotal: 'Šią savaitę rikiuojama narių: {total}',
    // Be šios frazės šuolis iš dešimtos vietos į dvyliktą skaitosi kaip lentelė,
    // pametusi žaidėją, — vienintelis dalykas, kuriuo ji negali atrodyti.
    leaderboardSkipped: 'Vietos nuo {from} iki {to} nerodomos',
    // Juosta už skaičiaus — vienintelis kortelės akcentas, nešantis faktą: kaip
    // toli pirmoji vieta. Ekrano skaitytuvui tas pats faktas pasakomas žodžiais.
    leaderboardShare: '{percent}% lyderio rezultato',
    leaderboardLeader: 'Pirma vieta',
  },

  games: {
    title: 'Žaidimai',
    subtitle: 'Viskas, kas įdiegta šioje stotyje, paruošta paleisti.',
    searchPlaceholder: 'Ieškoti žaidimų',
    // Išvalymo mygtukas paieškos lauke (C4.3). Paaiškinimas — `en.ts`. „Išvalyti
    // paiešką“, o ne „Išvalyti“: žemiau tuščioje būsenoje jau yra „Išvalyti
    // filtrus“, o du nepavadinti valymai viename bloke lieka spėliojimu.
    searchClear: 'Išvalyti paiešką',

    // Bibliotekos tinklelis (C4.1). Paaiškinimas — `en.ts`. Žanrai turi savo
    // raktus, o ne `GameCategory` reikšmę: kitaip filtrai lieka angliški, o kiekviena
    // nauja katalogo kategorija vėl atkeliauja neišversta.
    // formos: one | few | other
    libraryCount:
      '{n} žaidimas paruoštas paleisti|{n} žaidimai paruošti paleisti|{n} žaidimų paruošta paleisti',
    sortLabel: 'Bibliotekos rikiavimas',
    sortPopularity: 'Pagal populiarumą',
    sortAz: 'A–Ž',
    sortRating: 'Pagal reitingą',
    sortOnline: 'Pagal žaidėjus',
    sortRecent: 'Pagal paskutinius paleidimus',
    categoryFilter: 'Kategorija',

    // Trys būsenos filtrai prie žanrų (C4.2). Paaiškinimas — `en.ts`. Pavadinti
    // žaidėjo klausimu, o ne duomenų lauku: „Paruoštas paleisti“ žmogui prie
    // stoties reiškia „įdiegtas ir neatnaujinamas“. Vienintelis iš trijų, į kurį
    // klubo serveris atsakyti negali — atsako stoties agentas, todėl vietoje be
    // agento šis filtras nerodomas visai. Paaiškinimai keliauja į `title`: trims
    // ženkleliams vienoje eilėje frazei vietos nėra.
    stateFilter: 'Pasiekiamumas',
    filterInstalled: 'Paruoštas paleisti',
    filterInstalledHint: 'Įdiegtas šiame kompiuteryje ir neatnaujinamas',
    filterHouseAccount: 'Reikia klubo paskyros',
    filterHouseAccountHint: 'Paleidžiamas per bendrą klubo paskyrą',
    filterFriends: 'Žaidžia draugai',
    filterFriendsHint: 'Draugas šiuo metu yra šiame žaidime',
    catAll: 'Visi',
    catShooter: 'Šaudymo',
    catMoba: 'MOBA',
    catBattleRoyale: 'Karališkos kautynės',
    catSports: 'Sportas',
    catRacing: 'Lenktynės',
    catStrategy: 'Strategijos',
    catMmo: 'MMO',
    catRpg: 'RPG',

    // Pati kortelė (C4.4). Paaiškinimas — `en.ts`. Paleidyklės pavadinimas į
    // žodyną nekeliauja: „Steam“, „Epic“, „Battle.net“ yra produktų pavadinimai ir
    // spausdinami taip, kaip yra (F2.2); žodynas turi tik žodį, paaiškinantį, kas
    // tai už eilutė, — kortelėje dabar stovi firminis ženklas, ir `launcherLabel`
    // yra vienintelis dalykas, pasakantis, kieno tas ženklas: ir `title`, ir
    // ekrano skaitytojui.
    // `ratingOutOf` ir `inClubNow` — skaitytojui be ikonų: žvaigždė prie „4,8“
    // nieko nereiškia, jei jos nematai.
    launcherLabel: 'Paleidyklė',
    ratingOutOf: 'Reitingas {v} iš 5',
    // formos: one | few | other
    inClubNow:
      'Šiame žaidime klube dabar {n} žaidėjas|Šiame žaidime klube dabar {n} žaidėjai|Šiame žaidime klube dabar {n} žaidėjų',
    // Užrašas ženklelio viduje, prie skaitmens. Sąmoningai nelinksniuojamas ir
    // nesiderina su skaičiumi: tai paaiškinimas, kas skaičiuojama, o ne frazė apie
    // kiekį, — „2 klube“ vienodai teisinga ir prie 1, ir prie 5, o ženklelio plotis
    // nekinta.
    inClubShort: 'klube',

    // ---------------------------------------------------------------- //
    // Detali žaidimo plokštė (C4.5). Išsamus paaiškinimas — `en.ts`.
    //
    // „Vieta“, o ne „kompiuteris“: vietos užrašą nustato pats klubas („PC #17“,
    // „A1“), ir eilutė jį tik įrėmina, o ne perrašo. Verdiktas — viena frazė, ir
    // antras sakinys yra tik prie „žemiau reikalavimų“: tai vienintelis atvejis,
    // kai žaidėjui reikia pasakyti, ką su tuo daryti.
    // ---------------------------------------------------------------- //
    detailOpen: 'Daugiau',
    detailOpenLabel: 'Daugiau apie „{name}“',
    detailPending: 'Apie žaidimą',
    detailAbout: 'Apie žaidimą',
    detailNoDescription: 'Aprašymo dar nėra',
    detailNoDescriptionBody: 'Klube dar niekas neparašė šio žaidimo aprašymo.',
    detailHouseAccount: 'Klubo paskyra',
    detailRequirements: 'Reikalavimai',
    detailSeat: 'Ši vieta: {seat}',
    detailSeatHas: 'Šioje vietoje: {v}',
    detailReqCpu: 'Procesorius',
    detailReqGpu: 'Vaizdo kortelė',
    detailReqRam: 'Atmintis',
    detailReqStorage: 'Laisva vieta diske',
    detailGb: '{n} GB',
    detailFitAbove: 'Ši vieta pranoksta žaidimo reikalavimus',
    detailFitMeets: 'Ši vieta atitinka žaidimo reikalavimus',
    detailFitBelow: 'Ši vieta nepasiekia žaidimo reikalavimų',
    detailFitBelowBody:
      'Žaidimas pasileis, bet nustatymus teks sumažinti. Administratorius gali perkelti jus į VIP vietą.',
    detailStats: 'Jūsų statistika',
    detailStatPlaytime: 'Žaista',
    detailStatLaunches: 'Paleidimų',
    detailStatLast: 'Paskutinis paleidimas',
    detailNeverPlayed: 'Čia dar nežaidėte šio žaidimo',
    detailNeverPlayedBody: 'Paleiskite — ir klubas nuo šiol skaičiuos valandas.',
    detailFriends: 'Draugai šiame žaidime',
    detailFriendsEmpty: 'Šiuo metu šiame žaidime nėra nė vieno jūsų draugo.',
    detailFriendSeat: 'Vieta {seat}',

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
    openLibrary: 'Atidaryti biblioteką',
    // Fondas išnaudotas (C4.7) — klubo faktas, o ne žaidėjo klaida. „Paprašykite
    // administratoriaus“ pašalinta: paleidyklė turi savo atsakymą — eilę žemiau.
    noAccounts: 'Laisvų paskyrų nėra',
    noAccountsBody: 'Visos klubo paskyros šiam žaidimui šiuo metu užimtos.',

    // Eilė tam fondui (C4.7): tai paraiška, o ne prenumerata — pranešimas apie
    // atsilaisvinusią paskyrą ateis vėliau, todėl pažadas suformuluotas paleidyklės
    // vardu. `houseAccountBusy` — greitojo paleidimo pusė: „Tęsti“ kortelėje nėra
    // vietos panelei, todėl pranešimas pasako, kas nutiko, o eilė gyvena dialoge.
    houseAccountBusy: 'Nėra laisvos klubo paskyros šiam žaidimui',
    houseAccountQueueBody: 'Užimk eilę — atsilaisvinusi paskyra bus priskirta tau.',
    houseAccountQueueJoin: 'Užimti eilę',
    houseAccountQueuePosition: 'Tu {n} eilėje',
    houseAccountQueueLeave: 'Palikti eilę',
    houseAccountQueueJoined: 'Eilė užimta — paleidyklė pranešis, kai paskyra atsilaisvins',

    // Ką klubas parašo priskyręs paskyrą šiam apsilankymui (C4.7). Etiketė ir yra
    // visa žinia: „paskyra priskirta“ žaidėjui nepatikrinama, o „IMBA_01“ jis
    // perskaito ekrane. Rodoma ir dialoge, ir „Žaidime“ juostoje.
    houseAccountAssigned: 'Paskyra {label} priskirta tau šiai sesijai',

    // Tas pats paskyrų fondas, bet atsisakymas dėl kitos priežasties — nėra ryšio
    // (C4.7). Paaiškinimas — `en.ts`.
    houseAccountOfflineTitle: 'Paskyrai reikia ryšio',
    houseAccountOfflineBody:
      'Žaidimas paleidžiamas ir be ryšio, bet klubo paskyrą išduoti gali tik klubo serveris. Pakvieskite administratorių.',

    // Paleidimo dialogo vardas (C3.2): matoma antraštė nupiešta ant viršelio,
    // todėl ekrano skaitytuvui pavadinimas duodamas atskirai.
    launchDialog: 'Paleisti {name}',
    launchDialogPending: 'Paleisti žaidimą',

    // Keturios eilutės — septynių agento žingsnių grupės (C4.6), o ne laikmačio
    // užrašai; vienintelis dalykas, kurį žaidėjas mato tas sekundes (F2.4).
    // „Priskiriama paskyra“ — ne agento žingsnis, o klubo paskyros išdavimas
    // (`grantHouseAccount`); Steam žaidimams ši eilutė nerodoma — jų trys (C4.7).
    launchStepUpdates: 'Tikrinami atnaujinimai…',
    launchStepAccount: 'Priskiriama paskyra…',
    launchStepLauncher: 'Prisijungiama prie paleidyklės…',
    launchStepStart: 'Startuoja žaidimas…',

    // Juostos vardas ekrano skaitytuvui: procentas nupieštas, o ne parašytas.
    launchProgress: 'Paleidimo eiga',

    // Abu paleidimo baigties variantus rodo pats kabliukas, todėl greitas
    // paleidimas iš „Tęsti“ kortelės sako tais pačiais žodžiais — be dialogo.
    launchedToast: '{name} paleistas — paleidyklė nuleidžiama',
    launchFailed: 'Paleisti nepavyko ({code})',

    // Trečia baigtis, sąmoningai neutrali (C4.6): žaidėjas pats sustabdė paleidimą,
    // todėl raudonas pranešimas jo sprendimą paskelbtų paleidyklės klaida.
    launchCancelled: 'Paleidimas atšauktas',

    // Klubo paskyrų sąrašas (F3.4) — dabar fondo būsena, o ne pasirinkimas (C4.7):
    // laisvą įrašą pasirenka klubas, o endpointas priima tik žaidimo id.
    selectAccount: 'Klubo paskyros',
    accountLinked: 'Priskirta: {name}',
    // Parašyta žodžiais prie spalvoto taškelio: pats taškelis nieko nepasako nei
    // skaitytuvui, nei tam, kas tų dviejų atspalvių neatskiria (F6.6).
    accountAvailable: 'Laisva',
    accountInUse: 'Užimta',

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
    noAchievementsBody: 'Sužaiskite sesiją — pirmieji ženkleliai pradės atsirakinti.',
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

    // Pirmojo apsilankymo apžvalga (C3.12). Gyvena `help`, ne `home`: tai tas
    // pats, ką pagalbos skyrius siūlo kaip „Kaip visa tai veikia“.
    tourTitle: 'Kaip visa tai veikia',
    tourLabel: 'Trumpas pasivaikščiojimas po paleidyklę',
    tourStep: '{step} žingsnis iš {total}',
    tourSkip: 'Praleisti',
    tourBack: 'Atgal',
    tourNext: 'Toliau',
    tourDone: 'Supratau',
    tourTimeTitle: 'Čia tavo laikas',
    tourTimeBody:
      'Plokštelė skaičiuoja, kiek liko šios vietos. Paspausk — pamatysi, kas tiksliai išleidžiama ir kaip pridėti daugiau.',
    tourGamesTitle: 'Žaidimai startuoja iš čia',
    tourGamesBody:
      'Bibliotekoje viskas, kas jau įdiegta šioje stotyje. Vienas spustelėjimas paleidžia žaidimą — nieko nereikia siųstis ar prisijungti antrą kartą.',
    tourBarTitle: 'Gėrimai atkeliauja į vietą',
    tourBarBody:
      'Pasirink iš baro lentos — prekė atsiras krepšelyje viršuje. Sumoki vieną kartą, o užsakymą atneša prie šio kompiuterio.',
    tourLoyaltyTitle: 'Žaidimas atsiperka',
    tourLoyaltyBody:
      'Užduotys moka monetomis ir XP, o sezono leidimas tą XP verčia apdovanojimais. Abu yra šiame ekrane — prie kasos eiti nereikia.',
    tourHelpTitle: 'Darbuotojas — vienu paspaudimu',
    tourHelpBody:
      'Kai kas nors ne taip su vieta — neveikia ausinės, nestartuoja žaidimas — rašyk per „Pagalbą“: administratorius mato, iš kurios stoties atėjo.',
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
    // C4.7: klubo paskyrų neužteko — ta pati prasmė kaip „neturime“. Kaip sakinys
    // beveik nematomas: paleidimo dialogas į šį kodą atsako eilės panele.
    noFreeAccount: 'Nėra laisvos klubo paskyros',
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
  // už minutes, tod��l pirmiausia turi perskaityti, kad laikas neprarastas.
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
