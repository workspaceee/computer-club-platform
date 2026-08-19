/**
 * English dictionary — the **reference** dictionary (F2.2).
 *
 * This file is the source of truth for the dictionary *shape*: `lib/i18n/types.ts`
 * derives `Dictionary` from `typeof en`, and `ru.ts` / `lt.ts` are typed as
 * `Dictionary`, so a missing or misspelled key in any language is a TypeScript
 * error rather than a silent English fallback at runtime.
 *
 * Conventions
 * - Keys are grouped by namespace and addressed as `namespace.key` (`t('auth.signIn')`).
 * - `{name}` placeholders are filled by `t(key, { name })`.
 * - Plural strings hold the language's forms separated by `|` and are read with
 *   `tp(key, n)`. English order: one | other.
 */
export const en = {
  common: {
    appName: 'IMBA Cyber Club',
    shell: 'IMBA-SHELL',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    close: 'Close',
    done: 'Done',
    back: 'Back',
    next: 'Next',
    retry: 'Retry',
    loading: 'Loading',
    search: 'Search',
    all: 'All',
    yes: 'Yes',
    no: 'No',
    on: 'On',
    off: 'Off',
    language: 'Language',
    settings: 'Settings',
    logout: 'Log out',
    online: 'Online',
    offline: 'Offline',
    comingSoon: 'Coming soon',
    nothingHere: 'Nothing here yet',
    // `DateField` (C1.11). The segment placeholders are written in the local
    // order, so they are translated rather than shared: RU writes ДД.ММ.ГГГГ.
    dateDay: 'DD',
    dateMonth: 'MM',
    dateYear: 'YYYY',
    datePicker: 'Calendar',
    /** The header pages months, years or decades, so the arrows say direction. */
    datePrev: 'Earlier',
    dateNext: 'Later',
    /** Footer line while nothing is chosen — it names the step, not the state. */
    datePickDay: 'Pick a day',
    datePickYear: 'Start with the year',
    dateClear: 'Clear',
    // plurals: one | other
    minutes: '{n} minute|{n} minutes',
    hours: '{n} hour|{n} hours',
    seconds: '{n} second|{n} seconds',
    days: '{n} day|{n} days',
    coins: '{n} coin|{n} coins',
    players: '{n} player|{n} players',
    items: '{n} item|{n} items',
    friends: '{n} friend|{n} friends',
    slots: '{n} slot left|{n} slots left',
  },

  // Section names of the launcher — the only label source for the top bar, the
  // avatar menu and the mobile bar (F6.2, see lib/launcher-nav.ts).
  nav: {
    home: 'Home',
    games: 'Games',
    shop: 'Shop',
    rewards: 'Rewards',
    tournaments: 'Tournaments',
    social: 'Friends',
    wallet: 'Wallet',
    profile: 'Profile',
    help: 'Help',
    more: 'More',
    landmark: 'Launcher sections',
    // Landmarks and the skip link (F6.7).
    mainLandmark: 'Section content',
    skipToContent: 'Skip to content',
    accountMenu: 'Account menu, {name}',
    /**
     * The avatar trigger's name, with the level in it (C2.4).
     *
     * The chip on the avatar is a *badge* — decorative by definition — so the
     * number has to reach a screen reader through the button's own name or not
     * at all. Level is not a second HUD reading and gets no plate of its own:
     * it changes a few times a season, and a capsule in the bar competes with
     * the two numbers that change every minute.
     */
    accountMenuLevel: 'Account menu, {name}, level {level}',
    openSection: 'Open {section}',
    pendingTitle: 'This section is not live yet',
    pendingBody: 'It ships with task {task} of stage 1. Empty beats fake numbers.',
    guestLimited: 'Guests get games, the bar and help. Create a profile to unlock the rest.',
  },

  auth: {
    localTime: 'Local time',
    accessTerminal: 'Access Terminal',
    welcome: 'Welcome',
    welcomeHi: 'back',
    join: 'Join the',
    joinHi: 'club',
    loginSub: 'Authenticate to unlock your station and start the session.',
    registerSub: 'Create your IMBA player profile in under a minute.',
    signIn: 'Sign in',
    register: 'Register',
    userOrEmail: 'Username or email',
    userOrEmailPlaceholder: 'player@imba.club',
    password: 'Password',
    passwordPlaceholder: "Type 'fail' to test errors",
    username: 'Username',
    usernamePlaceholder: 'ProGamer',
    email: 'Email',
    emailPlaceholder: 'you@imba.club',
    confirmPassword: 'Confirm password',
    repeat: 'Repeat password',
    minChars: 'Min 6 characters',
    unlock: 'Unlock Station',
    createAccount: 'Create Account',
    qrLogin: 'QR Login',
    /**
     * Dev-only label (C1.9): the demo account is a review shortcut, so it is
     * only rendered behind `DEV_SHORTCUTS`. The string stays translated because
     * the *tile* is the same tertiary control as `qrLogin` next to it, and a
     * half-English row would look like a missing key rather than a fenced-off
     * one. Its neighbour "Admin" is gone entirely — the admin panel is a
     * separate application, and a tile whose only job was to say so was a door
     * painted on a wall.
     */
    demo: 'Demo',
    encrypted: 'Encrypted session',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    scanWithApp: 'Scan with IMBA app',
    waitingConfirmation: 'Waiting for confirmation...',
    qrVerified: 'QR verified via IMBA app!',
    welcomeBackToast: 'Welcome back, {name}!',
    accountCreated: 'Account created! Signing you in...',
    enteringDemo: 'Entering demo mode',
    // Station panel (C1.6). The seat's own readout: identity and availability
    // from the club, live readings from the station agent.
    stationPanel: 'Station status',
    zone: 'Zone',
    ping: 'Ping',
    display: 'Display',
    gpu: 'GPU',
    status: 'Status',
    optimal: 'Optimal',
    stationFree: 'Free',
    /** Free now, but only until the booking on it starts. */
    stationFreeUntil: 'Free until {time}',
    stationOccupied: 'In use',
    stationBooked: 'Reserved',
    stationBookedFrom: 'Booked from {time}',
    stationMaintenance: 'Maintenance',
    stationOffline: 'Offline',
    /** GPU is running hot — the seat works, it is just not at its best. */
    stationHot: 'Running hot',
    /** Agent is reachable but reporting nothing: readings unknown, not bad. */
    telemetryOff: 'No readings',
    /**
     * The club has taken the seat out of service, so the hardware reading is
     * moot: a cool GPU on a machine nobody may sit at is not "Optimal".
     */
    stationUnusable: 'Not in service',
    agentOffline: 'No agent',
    /**
     * The seat is held by somebody else's live session (C1.7).
     *
     * This is not an authentication failure and must not read like one: the
     * password was right, the account is fine, the *chair* is taken. So the
     * headline names the seat rather than the login, and the body names the
     * person and the one thing that actually unblocks the player — the admin's
     * key. There is no self-service repair here on purpose: a client that could
     * evict a live session from the lock screen would be a way to end a
     * stranger's paid visit.
     */
    seatTaken: 'Station is',
    seatTakenHi: 'in use',
    seatTakenBody: "{name}'s session is active. Ask the shift admin for the key.",
    /** A walk-in holds it: there is a name, but no account behind the name. */
    seatTakenGuestBody: 'A guest visit ({name}) is running on this station. Ask the shift admin for the key.',
    /** Paused, not gone: "Lock PC" keeps the seat, which is why it looks free. */
    seatTakenPausedBody:
      "{name}'s session is paused on this station, not finished. Ask the shift admin for the key.",
    seatTakenSince: 'Started at {time}',
    seatTakenRecheck: 'Check again',
    seatTakenStillHeld: 'The station is still held by {name}.',
    /** The hold is gone, so the arrival that was held back goes straight in. */
    seatTakenFreedToast: 'The station is free — signing you in.',
    /**
     * One PC, one session (C1.12).
     *
     * The mirror image of `seatTaken`, and it must not read like it: nothing is
     * occupied here and nobody is in the way — the account is simply already
     * playing across the room. So the headline is about the *session*, not the
     * station, and the repair is offered instead of withheld: this visit belongs
     * to the person reading the card, so they may ask for it to be moved.
     *
     * Why an ask and not a button that moves it. The other seat still has their
     * bag on it and possibly a friend in the chair, so the write that ends a visit
     * somewhere else in the club belongs to the admin on shift — the same reason
     * `seatTaken` has no "end their session".
     */
    activeElsewhere: 'Session active',
    activeElsewhereHi: 'elsewhere',
    activeElsewhereBody:
      'Your session is running on {machine}. Move it to this station, or go back to that one.',
    /** The seat the visit is on, stated as a fact inside the card. */
    activeElsewhereSeat: 'Playing on {machine}',
    transferHere: 'Move it here',
    /** Asked, not done: the admin on shift is the one who releases the old seat. */
    transferPending: 'Waiting for the shift admin to approve the move…',
    transferPendingNote:
      'Collect your things from {machine} — the station is released as soon as the move is approved.',
    transferRequestedToast: 'The shift admin has been asked to move your session.',
    transferDoneToast: 'Session moved — welcome to this station.',
    /** The visit ended, or was picked up somewhere else, while the ask waited. */
    transferGone: 'That session is no longer there to move.',
    /**
     * MOCK ONLY — there is no admin app, so the way to answer the ask is named
     * rather than hidden, exactly like the QR dialog's "play the phone" button.
     * Never translated: it never reaches a player.
     */
    transferDemoTitle: 'No admin app yet',
    transferDemoNote:
      'The prototype has no admin screen, so approve the move from here. The frame travels the real bus and this card picks it up through its normal subscription.',
    transferDemoApprove: 'Approve as admin',
    /**
     * Two launcher windows on one PC (C1.12).
     *
     * Not an error and not a refusal of anything the player asked for: the club is
     * fine, the seat is theirs, there is simply already a launcher open on this
     * machine. So the copy states which window is real and how to get back to it,
     * and promises the takeover — because the second window *does* come alive on
     * its own once the first is gone, and a screen that did not say so would look
     * stuck.
     */
    duplicateWindow: 'Launcher already',
    duplicateWindowHi: 'open',
    duplicateWindowBody:
      'This launcher is already running in another window on this PC. Switch to that window — or close it, and this one takes over by itself.',
    duplicateWindowWaiting: 'Waiting for the other window to close…',
    /**
     * The paused visit on this seat is *yours* — the fast way back (C1.10).
     *
     * Not a login, and it must not read like one: nobody signed out, the clock is
     * simply stopped and the paid time is still on this machine. So the headline
     * names the state of the *visit*, and the subline states the remainder as a
     * fact of the club — that number is the reason to type four digits instead of
     * an email and a password.
     */
    sessionPaused: 'Session on',
    sessionPausedHi: 'pause',
    sessionPausedSub: '{name}, {time} left on this station. Enter your PIN to pick it up.',
    /**
     * Same headline, budget spent. The instruction has to go: the keypad is gone
     * with it, and a card that still says "enter your PIN" over a row of nothing
     * reads as a broken screen rather than a closed door. The visit is still
     * stated — it did not go anywhere — and *what to do instead* is said once,
     * below, by `pinLocked` and the button under it.
     */
    sessionPausedSubLocked: '{name}, {time} is still on this station.',
    pin: 'Player PIN',
    pinUnlock: 'Unlock with PIN',
    /** The budget belongs to the club, so the screen counts it out loud. */
    // plural: one | other
    pinAttemptsLeft: '{n} try left|{n} tries left',
    // plural: one | other
    pinWrong: 'Wrong PIN — {n} try left|Wrong PIN — {n} tries left',
    /** This door closed, the account did not: the password one is still open. */
    pinLocked: 'Too many wrong PINs. Sign in with your password to pick up the session.',
    pinIncomplete: 'Enter all {n} digits',
    pinUsePassword: 'Use password instead',
    /** The visit ended or was picked up elsewhere while this screen was open. */
    pinVisitGone: 'That paused session is no longer here.',
    // Password recovery — email OTP (C1.3).
    forgotPassword: 'Forgot password?',
    recover: 'Reset',
    recoverHi: 'access',
    recoverSub: 'We email a code to the address on your club account.',
    recoverEmail: 'Account email',
    sendCode: 'Send code',
    codeSentToast: 'Code sent to {email}',
    codeStep: 'Check your',
    codeStepHi: 'email',
    codeStepSub: 'Enter the {n}-digit code sent to {email}.',
    code: 'Confirmation code',
    codeExpiresIn: 'The code works for another {time}',
    codeDead: 'The code has expired — send a new one.',
    confirmCode: 'Confirm code',
    resendCode: 'Send a new code',
    resendIn: 'New code in {time}',
    codeResentToast: 'New code sent',
    changeEmail: 'Change email',
    backToSignIn: 'Back to sign in',
    newPasswordStep: 'New',
    newPasswordStepHi: 'password',
    newPasswordSub: 'Pick a new password — this station signs you in right away.',
    newPassword: 'New password',
    saveAndSignIn: 'Save and sign in',
    passwordChangedToast: 'Password updated. Welcome back, {name}!',
    demoCode: 'Demo code',
    demoCodeNote: 'The prototype sends no mail, so the code is printed here.',
    // Registration — email confirmed by code, club rules, live nickname check (C1.4).
    nickHint: 'Latin letters, digits and _ · {min}–{max} characters',
    nickChecking: 'Checking availability…',
    nickFree: '{nick} is free',
    nickTaken: '{nick} is taken — pick another name',
    nickReserved: 'That name is kept by the club',
    nickBadChars: 'Latin letters, digits and _ only',
    nickTooShort: 'At least {min} characters',
    nickTooLong: 'At most {max} characters',
    nickSuggestions: 'Free right now',
    emailTaken: 'That address already has a club account',
    rulesAccept: 'I have read and accept the club rules',
    rulesRead: 'Read the rules',
    rulesRequired: 'Accept the club rules to create an account',
    rulesTitle: 'Club rules',
    rule1: 'Your account is yours alone — never hand it or your PIN to anyone.',
    rule2: 'Time and orders on an open tab are settled before you leave.',
    rule3: 'Cheats, pirated clients and opened hardware end the session.',
    rule4: 'Food and drinks stay at the tables, away from the stations.',
    rule5: 'The shift admin has the last word — bring any dispute there.',
    rulesNote: 'The full text hangs at the counter and lives on imba.club/rules.',
    rulesGotIt: 'Got it',
    sendSignupCode: 'Confirm email',
    editDetails: 'Change details',
    // The code step of signup reuses the recovery headline pair but needs its
    // own subline: nothing exists to recover, the account is being *created*.
    signupCodeSub: 'Enter the {n}-digit code sent to {email} to finish signing up.',
    accountCreatedToast: 'Welcome to the club, {name}!',
    // Date of birth (C1.11). Asked for on the details step because two features
    // read it — the PIN rule two screens later and the birthday bonus — and the
    // hint says so: a form that asks for a birthday without a reason reads as
    // data collection for its own sake.
    birthday: 'Date of birth',
    birthdayHint: 'For your club birthday bonus — and your PIN may not repeat it',
    birthdayInvalid: 'That is not a real date',
    /** The rule is the club's, so the screen states the number instead of "too young". */
    birthdayTooYoung: 'Club accounts start at {n} — come with an adult and ask at the counter',
    // The PIN step of signup (C1.11). Its own headline pair: the email is proven
    // by now and the account is one tap away, so the card is no longer about mail.
    pinStep: 'Choose your',
    pinStepHi: 'PIN',
    /**
     * Says *where the PIN is used* before asking for it. Four digits look like a
     * formality until the player learns they are what stands between a paused
     * visit and the next person in the chair.
     */
    pinStepSub: 'Four digits that pick your visit back up at any station in the club.',
    choosePin: 'New PIN',
    repeatPin: 'Repeat PIN',
    /** Each refusal names one rule, because each has a different repair. */
    pinTooShort: 'Enter all {n} digits',
    pinAllSame: 'Four of the same digit is not a PIN — mix them up',
    pinIsBirthday: 'Your birthday is the first thing anyone would try',
    pinMismatch: 'The two PINs do not match',
    /** The one rule the player has to keep after leaving: nobody can look it up. */
    pinNote:
      'You will be asked for it when a visit is paused and when the station locks itself. The club cannot look it up — only reset it.',
    // QR sign-in — the station shows a code, the phone confirms it (C1.5).
    qrSub: 'No camera? Type the station code into the app instead.',
    qrStationCode: 'Station code',
    qrExpired: 'The code has expired.',
    qrNewCode: 'Show a new code',
    qrConfirmedBy: 'Confirmed by {name} — unlocking…',
    qrOffline: 'This station is offline: your phone cannot confirm until the link is back.',
    qrDemoTitle: 'Demo confirmation',
    qrDemoNote:
      'The prototype has no phone app, so this button plays the phone: it approves the code and pushes the confirmation onto the bus, which this dialog then handles like any other.',
    qrDemoConfirm: 'Confirm from the phone',

    /* ---------------------------------------------------------------- *
     * The door while the link is down (C2.13)
     *
     * Three lines, one refusal, split by where it is read:
     *
     *   offlineEntryTitle    the headline over the card and the panel's own
     *                        heading — it names the club's state, not the
     *                        player's mistake.
     *   offlineEntryBody     why a station may not decide this by itself, plus
     *                        the reassurance a locked-out player actually needs:
     *                        nothing was lost, and the form returns on its own.
     *   offlineEntryRefused  the toast if a door is fired anyway (an `Enter` on a
     *                        form that was already open). Deliberately *not*
     *                        `realtime.salesRefused`: no money was involved, so
     *                        "nothing was charged" would answer a question the
     *                        player never asked.
     *
     * Never "try again later": the shell reconnects by itself.
     * ---------------------------------------------------------------- */
    offlineEntryTitle: 'No connection to the club server',
    offlineEntryBody:
      'Signing in needs the club server: only it can confirm who you are and that this seat is free. Nothing is lost — the form comes back by itself once the link is up.',
    offlineEntryRefused: 'Sign-in needs a connection to the club server.',
    /** The one live door of an offline lock screen: the admin on shift. */
    callAdmin: 'Call admin',
    adminCalled: 'Admin notified',
  },

  // The idle screen (C1.8). Its own namespace and not `auth`, because this copy
  // sells the club to somebody in the doorway rather than helping a member sign
  // in — and because it is the one screen whose every line is read from four
  // metres away, which is why nothing here is longer than it has to be.
  attract: {
    screenLabel: 'Idle screen. Move the mouse or press any key to unlock.',
    nowOpen: 'Now open · 24/7',
    unlockHint: 'Move mouse to unlock',
    // Crawl of last resort: evergreen club fact only, never a dated offer — a
    // stale "prize pool tonight" is worse than no line at all.
    fallbackHours: 'Open 24/7, every day',
    fallbackSpecs: 'RTX 4080 + 240 Hz on every station',
    fallbackMembership: 'Ask the counter about membership',
    // Tonight's event.
    tournamentKicker: 'Tonight at the club',
    tournamentStartsIn: 'Starts in {when}',
    tournamentLive: 'Under way right now',
    tournamentPrize: 'Prize',
    tournamentEntry: 'Entry',
    tournamentFree: 'Free',
    // Free seats per zone.
    seatsKicker: 'Free right now',
    // plural: one | other
    seatsTitle: '{n} station free|{n} stations free',
    seatsSubtitle: 'Out of {total} in the club. Take one — the counter does the rest.',
    seatsFull: 'Every station is taken',
    seatsFullBody: 'Ask at the counter: seats free up every few minutes.',
    seatsZoneFree: '{free} of {total}',
    // Bar and kitchen.
    barKicker: 'From the bar',
    barTitle: 'Fuel for the session',
    barSubtitle: 'Ordered from your station, brought to your seat.',
    // Season ladder.
    ladderKicker: 'Season ladder',
    ladderTitle: 'Top of the club',
    ladderHours: '{n} h',
    // Battle pass.
    passKicker: 'Battle pass',
    // plural: one | other
    passDaysLeft: '{n} day left in the season|{n} days left in the season',
    passSubtitle: 'Play, level up, collect. The free track costs nothing.',
    passLevels: '{n} levels',
  },

  session: {
    title: 'Session',
    timeLeft: 'Time left',
    sessionTime: 'Session time',
    /**
     * Where the minutes on the clock came from (C2.2).
     *
     * One word each, because they ride in the top bar's micro-label next to the
     * digits — and because the player only needs the *difference*: pass minutes
     * are already paid for, wallet minutes keep spending money, granted minutes
     * were a favour that will not renew, and a PostPaid seat is not counting down
     * at all. `sourceStaff` says "Granted" rather than "Admin": what matters is
     * that the time was given, not which key opened the drawer.
     */
    sourcePass: 'Pass',
    sourceWallet: 'Wallet',
    sourceStaff: 'Granted',
    sourcePostpaid: 'PostPaid',
    /** Screen-reader phrasing — the visual plate says it with layout instead. */
    timeSource: 'Time source: {source}',
    timeBalance: 'Time balance',
    running: 'Running',
    paused: 'Paused',
    resume: 'Resume session',
    lockStation: 'Lock station',
    endSession: 'End session',
    endSessionConfirm: 'End the session and log out of this station?',
    extend: 'Extend session',
    addTime: 'Add time',
    expired: 'Session expired',
    expiredBody: 'Your paid time has run out. Top up at the counter or in the app to keep playing.',
    lockedTitle: 'Station locked',
    lockedBody: 'The timer is paused. Sign in again to continue where you left off.',
    lockConfirmTitle: 'Lock this station?',
    lockConfirmBody: 'Your session pauses. Sign back in to pick up your remaining time.',
    lockedToast: 'Station locked. Session paused.',
    logoutConfirmTitle: 'Log out?',
    logoutConfirmBody: 'This ends your session and returns the station to the lock screen.',
    // plural: one | other
    minutesLeft: '{n} minute left|{n} minutes left',
    warningLowTime: 'Less than {n} min of session time left.',

    /* ---------------------------------------------------------------- *
     * Running out of time (C2.6)
     *
     * Four toasts and one takeover. The toasts state the *number* and one thing
     * to do about it; the takeover, at 60 seconds, states the number and offers
     * the three ways a visit can actually end — buy more, ask a human, or stop
     * on your own terms. Nothing here says "hurry": a player one minute from
     * losing an unsaved match needs the fact and the exits, not urgency.
     * ---------------------------------------------------------------- */
    /**
     * The 15- and 10-minute marks. Plural on the minutes because Russian and
     * Lithuanian inflect them, and the number is the whole message.
     */
    // plural: one | other
    warnTitle: '{n} minute left|{n} minutes left',
    /** What to do about it, without deciding for the player. */
    warnBody: 'Extend from your session panel, or wrap up when you are ready.',
    /** The 5-minute mark: the same fact, and the one action worth taking now. */
    warnBodyUrgent: 'Extend now to keep your seat, or save your progress.',
    /** The 1-minute mark, spoken as a toast for a screen reader before the takeover. */
    warnFinal: 'One minute left on this station.',
    /** Opens "My session" straight from the toast — the panel is where extending lives. */
    warnAction: 'Extend',
    /**
     * The takeover heading. Deliberately not "Time is up": it is not, and a
     * player who reads it as the end will stop playing 60 seconds early.
     */
    lastCallTitle: 'One minute left',
    lastCallBody:
      'Your session ends in under a minute. Add time to carry on, call an admin if something is wrong, or save your game and hand the station back.',
    /** The live digits inside the takeover, labelled. */
    lastCallClock: 'Ending in',
    /** Three exits, in the order a player is most likely to want them. */
    lastCallExtend: 'Extend',
    lastCallAdmin: 'Call the admin',
    lastCallSaveExit: 'Save and exit',
    /** Extending is only honest when there is something banked to extend from. */
    lastCallExtendHint: 'No pass minutes banked — the shop has time passes.',
    lastCallShop: 'Open shop',
    /**
     * Dismissal, and what it does *not* do. The takeover can be put away — a
     * player mid-round must be able to see their game — but the clock does not
     * care, so the button says so rather than promising a reprieve.
     */
    lastCallDismiss: 'Keep playing',
    lastCallDismissHint: 'The station still locks when the time runs out.',

    /* ---------------------------------------------------------------- *
     * The offline ceiling on a postpaid tab (C2.17)
     *
     * Postpaid only, and not a deadline: a walk-in's tab has no wall, so a long
     * outage is a bill first seen when it is already large. Every line here has
     * to keep three promises the panel cannot break — the clock has not stopped,
     * nothing has been charged by the shell, and pausing a station is the club's
     * decision. So the copy states a *reading* ("not yet reported"), never a
     * total owed, and the only action it offers is a human.
     * ---------------------------------------------------------------- */
    tabCapTitle: 'This tab has been growing offline',
    /** The whole argument in three sentences: what happened, what it means, what can be done. */
    tabCapBody:
      'The club server has been out of reach for a while and the clock kept running. Nothing is lost — these minutes reach the club as soon as the link is back. If you would rather the meter stopped, call an admin: only the club can pause a station.',
    /** Labels for the two readings. Both say *unreported*, never "owed". */
    tabCapElapsed: 'Not yet reported',
    tabCapCharge: 'At the club rate',
    /**
     * The line that keeps the number honest: it is what the shell can see, not a
     * bill anybody has issued.
     */
    // plural: one | other
    tabCapUnbilled:
      '{n} minute the club has not been told about yet — the counter has the final say.|{n} minutes the club has not been told about yet — the counter has the final say.',
    /** The held toast, so the fact survives dismissing the panel. */
    // plural: one | other
    tabCapToast: 'Offline for {n} minute — the tab keeps running|Offline for {n} minutes — the tab keeps running',
    tabCapDismiss: 'Keep playing',
    /** What dismissal does *not* do, said out loud rather than implied. */
    tabCapDismissHint: 'The clock keeps running either way — pausing it is the club’s call.',

    /* ---------------------------------------------------------------- *
     * Paused by an admin (C2.7)
     *
     * Not a lock screen and not an error: the visit is still on this machine,
     * the launcher is still behind the scrim, and the only thing that changed is
     * that the clock stopped. So the copy answers the three questions a player
     * stares at this overlay with — why, is this costing me, what do I do — and
     * nothing else. The reason is named out loud because "paused" with no cause
     * reads as a malfunction the player has to solve themselves.
     * ---------------------------------------------------------------- */
    pauseTitle: 'Session paused',
    /** The load-bearing sentence: a stopped clock is not a spent one. */
    pauseBody: 'The clock is stopped — these minutes are not charged to you.',
    pauseReasonLabel: 'Reason',
    pauseReasonStaff: 'An admin paused your session.',
    pauseReasonBreak: 'Your session is on a break.',
    pauseReasonPaymentRequired: 'Payment is needed at the counter before the clock restarts.',
    pauseReasonMaintenance: 'Maintenance on this station.',
    /** Stands in for a reason this build has no sentence for. */
    pauseReasonUnknown: 'The club paused this station.',
    pauseRemaining: 'Time held for you',
    /** Nothing here dismisses the overlay, and pretending otherwise is worse. */
    pauseWaitHint:
      'Nothing is lost. Your games and windows stay exactly as they are — the launcher comes back the moment an admin lifts the pause.',
    pauseCallAdmin: 'Call the admin',
    pauseResumedToast: 'Pause lifted — back in the game.',

    /* ---------------------------------------------------------------- *
     * Moved to another PC (C2.8)
     *
     * The one fact the player has to walk away with is *where*, so the seat
     * label and the zone are the loudest thing on the overlay and everything
     * else is reassurance around them. The seat is club-authored data (`PC-24`)
     * and the zone is a club-authored name (`VIP`), so both travel through the
     * sentence as variables and are never translated.
     * ---------------------------------------------------------------- */
    movedTitle: 'Session moved',
    /** With the zone, which is the version the player almost always gets. */
    movedBody: 'Your session has been moved to {seat}, {zone} zone.',
    /** A seat whose zone this build could not name — the seat alone still works. */
    movedBodyNoZone: 'Your session has been moved to {seat}.',
    movedSeatLabel: 'New station',
    movedZoneLabel: 'Zone',
    /** The deadline as a fact, not a threat. Staff step in after it, not the app. */
    // plural: one | other
    movedDeadline:
      'Please move within {n} minute — your time is held until you get there.|Please move within {n} minutes — your time is held until you get there.',
    /** What is *not* lost, because that is the fear this overlay creates. */
    movedHint:
      'Nothing is charged for the walk and nothing is lost: your remaining time, your tab and your account move with you. Sign in again at the new station.',
    /** Acknowledgement, not a dismissal of the move itself. */
    movedAck: 'Got it',

    /* ---------------------------------------------------------------- *
     * "My session" — the panel behind the HUD (C2.3)
     * ---------------------------------------------------------------- */
    mine: 'My session',
    /** Sits on the HUD trigger, so it says what opens rather than what it is. */
    openMine: 'Session details',
    seat: 'Station',
    startedAt: 'Started',
    playedSoFar: 'Played so far',
    /**
     * The heading over the source line. "What is being spent" and not "Time
     * source" — the panel has room for the question the player is actually
     * asking, and the four answers below are the *consequence*, not the label.
     */
    spending: 'What is being spent',
    spendingPass: 'Minutes from a pass you already paid for. When they run out the clock simply stops — nothing further is charged.',
    spendingWallet: 'Hours bought against your wallet. Extending spends money again.',
    spendingStaff: 'Minutes an admin put on this seat. Nobody is paying for them, so they will not renew themselves — ask at the counter before they run out.',
    spendingPostpaid: 'Every minute is billed onto your open tab and settled at the counter when you leave.',
    /** The tab is a *reading* here, next to the time it is accruing from. */
    onTabNow: 'On the tab now',
    history: 'Time added',
    historyEmpty: 'Nothing added yet',
    historyEmptyBody: 'Every extension — yours or the admin\u2019s — is listed here with the minute it landed.',
    /** One line per act, so a purchase never reads as a favour. */
    historyExtend: 'You extended',
    historyStaff: 'Admin added time',
    historyCorrection: 'Admin correction',
    /**
     * Signed, and the sign is in the *copy* rather than computed at the point of
     * use: a minus rendered by string concatenation on a negative number prints
     * "+-30 min" the first time somebody forgets, and an admin correction is the
     * one line in this list where the direction is the whole meaning.
     *
     * Not plural forms: the unit is an abbreviation in all three languages
     * ("min" / "мин" / "min"), so there is nothing to inflect.
     */
    historyMinutes: '+{n} min',
    historyMinutesNegative: '−{n} min',
    /** Banked pass minutes an extend can draw from. */
    banked: '{n} min banked on your pass',
    extendBy: '+{n} min',
    extendedToast: 'Session extended by {n} min.',
    /**
     * The line under a disabled extend while the club is shut (C2.11, C2.12).
     *
     * Three surfaces offer the extend and all three used to caption only the
     * *offline* refusal, which left the closed club — the commoner of the two, and
     * the one with a reopening time attached — as three dead buttons and no
     * sentence. That is the exact failure `useSalesGate()` was written to stop:
     * a greyed-out money button with nothing on screen saying why.
     *
     * Its own line rather than `shop.closedCheckoutHint`, which names checkout;
     * the fact here is that the minutes stay banked, because a dead "+15 min" is
     * read as "my pass is gone".
     */
    extendClosedHint: 'Your banked minutes keep — buying time opens again with the club.',
    /** No banked minutes: the honest button is the shop, not a failing extend. */
    buyTime: 'Buy time',
    buyTimeHint: 'No pass minutes banked. Time passes are in the shop.',
    /** A walk-in cannot extend — there is nothing to extend *to* (F6.3). */
    postpaidNoExtend: 'A PostPaid seat has no time to extend: play as long as you like and settle the tab at the counter.',
    callAdmin: 'Call the admin',
    callAdminSent: 'The admin has been called — someone is on the way to your seat.',
    callAdminAgain: 'The admin already has your call.',

    /* ---------------------------------------------------------------- *
     * The club's day ending (C2.11)
     *
     * A different clock from C2.6 above, and the copy has to keep them apart:
     * "your paid time is ending" can be answered by extending, "the club is
     * closing" cannot. So nothing in this block offers more minutes, and every
     * line is written against the one misreading that would cost a player a
     * match — that closing time cuts the session off. It does not: the game is
     * never interrupted (MVP §0.2), the minutes are already paid for, and it is
     * an admin who turns the station off in person.
     * ---------------------------------------------------------------- */
    /** The 60 / 30 / 10-minute marks. Plural because RU and LT inflect minutes. */
    // plural: one | other
    closingTitle: 'The club closes in {n} minute|The club closes in {n} minutes',
    /** The 60- and 30-minute marks: a fact, and no demand attached to it. */
    closingBody:
      'Your time keeps running — closing does not cut a session off. The shop and the bar stop serving.',
    /** The 10-minute mark: the same fact plus the one thing worth starting now. */
    closingBodyUrgent: 'Time to save your game and pack up. Your unused minutes keep for next time.',
    /** The overlay after closing. Not "Time is up" — the player's time is not. */
    closedTitle: 'The club is closed',
    closedBody:
      'You can finish what you are playing — the clock keeps running and nothing is cut off. Buying time and ordering at the bar are shut until we open again.',
    /** Proof of the sentence above: the same digits as the HUD, still moving. */
    closedClockLabel: 'Your time is still running',
    closedOpensLabel: 'Open again',
    /** A schedule this build cannot name the next opening from. */
    closedOpensUnknown: 'Ask at the counter',
    /** A member's own way out: the remainder is banked, the station locks. */
    closedSaveExit: 'Save and exit',
    closedSaveExitHint: 'Your remaining minutes are banked and wait for your next visit.',
    /** A walk-in has a tab, not a balance, so the counter is the honest exit. */
    closedGuestHint: 'Settle your tab at the counter when you finish.',
    closedCallAdmin: 'Call the admin',
    /**
     * Dismissal, and the fact it must not be read as. The launcher does not shut
     * the station down; a human does, and saying so is what keeps a dismissed
     * overlay from reading as permission to stay all night.
     */
    closedDismiss: 'Keep playing',
    closedDismissHint: 'An admin will come round to close the station down in person.',
  },

  // The home surface (C3). The greeting lives here rather than in `session`
  // because it is the one place that speaks to the *person* — every other
  // namespace names a thing the club sells.
  home: {
    /**
     * Time-of-day greeting (C3.1).
     *
     * Four bands and not one "Hello", because a club is busiest at the hours a
     * generic greeting reads worst: someone sitting down at 02:00 is not being
     * wished a good morning. The bands are copy, not logic — a language that
     * splits the evening differently changes these strings, not the component.
     */
    greetMorning: 'Good morning, {name}',
    greetAfternoon: 'Good afternoon, {name}',
    greetEvening: 'Good evening, {name}',
    greetNight: 'Still going, {name}',
    /** Level as a rank, next to the name. */
    level: 'Level {level}',
    /** Screen-reader name for the XP bar — the bar itself is decoration. */
    levelProgress: '{xp} of {max} XP towards level {next}',
    levelProgressShort: '{xp} / {max} XP',
    /** How long this visit has been running. `{duration}` is already formatted. */
    playingFor: 'Playing for {duration}',
    /**
     * The first minute of a visit, which has no honest number yet.
     *
     * "Playing for 0 minutes" is the sentence this key exists to avoid: it reads
     * as a broken counter on the one screen a player sees before anything else.
     */
    justArrived: 'Just sat down',
    /** Visit streak. plurals: one | other */
    streakDays: '{n} day in a row|{n} days in a row',
    /** A streak that is not running — a first visit, or one that lapsed. */
    streakStart: 'Streak starts today',
    streakLabel: 'Visit streak',

    /**
     * "Continue" — the last three titles, one click each (C3.2).
     *
     * A verb, and deliberately not the library's own "Recently played" label: the
     * row under the greeting is not a history list, it is the way back into the
     * match the player walked away from, and the heading should say what clicking
     * it does.
     */
    continueTitle: 'Continue',
    /**
     * Accessible name of the card.
     *
     * The whole tile is the button, so the verb never appears on screen — but a
     * reader announcing only the game name would present an action as a label.
     * `{when}` repeats whichever status the tile is showing, so what is announced
     * and what is read are the same sentence.
     */
    continueLaunch: 'Launch {name} — {when}',
    /** Already on this machine: the tile is inert, and says why. */
    continueRunning: 'Running now',
    continueLaunching: 'Starting…',
    continueEmpty: 'No games yet',
    continueEmptyBody:
      'Start something from the library and it waits for you here — one click back in on every visit after this one.',
    /**
     * The same empty row, for somebody who has never played here at all (C3.13).
     *
     * A separate pair rather than one polite sentence for both, because the two
     * are different facts about the evening: a member whose history has rolled
     * off is being told the row will fill up again, and a first-time player is
     * being told what the first move *is*. "No games yet" said to someone on
     * their first visit reads as a report on an account that should not have one.
     */
    continueFirstGame: 'Pick your first game',
    continueFirstGameBody:
      'Nothing has been launched on this account yet. Open the library and start anything — from your next visit it is one click away, right here.',
    /**
     * When the title was last started, as elapsed time.
     *
     * Elapsed rather than calendar-relative ("Yesterday"), because a single row
     * reads as a distance: a match abandoned at 23:50 is "8 hours ago" the next
     * morning, and that is the fact the player is deciding on.
     *
     * plurals: one | other
     */
    playedJustNow: 'Played just now',
    playedMinutesAgo: 'Played {n} minute ago|Played {n} minutes ago',
    playedHoursAgo: 'Played {n} hour ago|Played {n} hours ago',
    playedDaysAgo: 'Played {n} day ago|Played {n} days ago',

    /**
     * "My session" — the HUD plate opened out, on the home screen (C3.3).
     *
     * The same subject as the panel behind the plate (`session.mine`) at a third
     * size, so the card links to that panel rather than restating any of it.
     */
    sessionTitle: 'My session',
    /** The link to the panel, where the seat, the zone and every grant live. */
    sessionDetails: 'Details',
    /** Name of the spent-time bar. It appears nowhere else. */
    sessionSpentLabel: 'Time spent',
    /**
     * Caption over that bar; both values arrive already formatted as clock faces.
     *
     * The denominator is played-plus-remaining — the arc of *this visit*, not the
     * block it was sold as. Extending makes the visit longer, and a fixed two
     * hours would let the bar read past 100 %.
     */
    sessionSpentOf: '{spent} of {total}',
    /**
     * A locked station: the digits above are true and misleading at once, because
     * nothing is being spent while they sit there.
     */
    sessionPaused: 'Clock paused',

    /**
     * "Daily quests" — the one card on home that asks the player to *do* something
     * (C3.4).
     *
     * The quest lines themselves are admin-authored and printed as the club wrote
     * them, so everything here is the frame around them, which is ours (F2.2).
     */
    questsTitle: 'Daily quests',
    /**
     * What the rest of the day is still worth, across the whole active set —
     * including a daily that did not make the three rows on screen.
     *
     * Both values arrive already formatted. It is the header's subtitle and not a
     * row, because it is the one number no single quest can state.
     */
    questsPending: '{coins} coins and {xp} XP still unclaimed today',
    /**
     * The same slot on a first evening, when nothing has been earned yet (C3.13).
     *
     * "Still unclaimed today" is a sentence about a day that has already been
     * played: it tells a returning member what is left of what they started. Said
     * to a player who has done nothing at all it reports a debt the club owes them
     * for an evening that has not happened, so the newcomer gets the same two
     * numbers with the sentence pointing forward instead of back.
     */
    questsFirstQuest: 'Do your first quest — the set pays {coins} coins and {xp} XP',
    /**
     * The countdown to the club's next opening, not to midnight: a member playing
     * at 03:00 is still inside the set they started the evening with.
     *
     * `{duration}` arrives as a phrase ("4 hours"), so the club's day may roll over
     * at any hour without this sentence caring which.
     */
    questsResetIn: 'Resets in {duration}',
    /** The last minute before the roll, where a countdown would read "0 minutes". */
    questsResetNow: 'Resetting now',
    /**
     * Accessible name of a row's collect button.
     *
     * The visible word is "Claim", which is the right label on screen and three
     * identical names in a list — so the reader is given the quest it pays for.
     */
    questClaim: 'Claim reward for: {title}',
    /** The receipt for one claim. Both values are already formatted. */
    questClaimedToast: 'Claimed {coins} coins and {xp} XP',
    /**
     * A club running no dailies at all. Not a failure and not the player's doing,
     * so it says who it is waiting on.
     */
    questsEmpty: 'No quests today',
    questsEmptyBody:
      'The club has not set any dailies yet — new ones land with the next opening.',

    /**
     * "Battle Pass" — the season at teaser size (C3.5).
     *
     * The card answers four questions and stops: which tier the player stands on,
     * how far the next one is, what that next one pays, and where the whole ladder
     * lives. The heading itself is `loyalty.battlePass` — the pass is one subject
     * across the product and must not be named twice.
     *
     * Note the vocabulary split. The greeting above says "Level", which is the
     * *account* rank; everything here says "Tier", which is the *season* standing.
     * Two numbers, two words: sharing one would make the greeting and this card
     * look like a single counter disagreeing with itself.
     */
    passTier: 'Tier {level}',
    /** Name of the XP bar — where it is going, since the ring already says where it is. */
    passToNextTier: 'To tier {level}',
    /** Bar caption. Both values arrive grouped for the reader's locale. */
    passXpOf: '{xp} / {max} XP',
    /** Heads the reward the next tier pays — the "what do I get" line. */
    passNextGives: 'Tier {level} gives',
    /** A tier paid in play time. `{duration}` arrives as a phrase ("30 minutes"). */
    passRewardTime: '{duration} of play time',
    /**
     * Tiers reached but never collected. A reason to press the button, not a number
     * the card can act on: collecting happens on the pass screen, where the reward
     * is shown being opened (C8.6).
     *
     * plurals: one | other
     */
    passReady: '{n} tier ready to claim|{n} tiers ready to claim',
    /** How long the season has left. `{duration}` arrives as a phrase ("12 days"). */
    passSeasonEndsIn: 'Season ends in {duration}',
    /** The last day, where a day counter would read "0 days". */
    passSeasonEndsToday: 'Season ends today',
    /** The ladder is finished: there is no tier above the last one to promise. */
    passTopTier: 'Top tier of the season',
    passTopTierBody: 'Tier {level} is the last one — collect what is left before the season ends.',
    /**
     * The way into the full ladder. One word on screen, so the reader is told which
     * pass it opens.
     */
    passOpen: 'Open',
    passOpenLabel: 'Open the Battle Pass — {season}',

    /**
     * "The bar" — three rows and a basket, on the home screen (C3.6).
     *
     * The card is a shortcut, not a menu: the club's most-ordered rows with the
     * one button that matters, so a player who wants a cola does not cross the
     * shop's three tabs and 37 cards to get one. Product names, descriptions and
     * the campaign copy are all admin-authored and printed as the club wrote them
     * — everything here is the frame around them (F2.2).
     */
    barTitle: 'The bar',
    /** Says where the ranking comes from, so "popular" is not the app's opinion. */
    barSubtitle: 'What the club orders most — straight to your seat.',
    /** The way to the full menu, for everything these three rows are not. */
    barMenu: 'Whole menu',
    barMenuLabel: 'Open the shop — the whole bar menu',
    /**
     * The visible label on a row's button. One word, because four of them share a
     * card with prices and photographs and there is no room for a sentence.
     */
    barAdd: 'Add',
    /**
     * …which makes it four identical names in one card, so the accessible name is
     * given the row it fills the basket with.
     */
    barAddLabel: 'Add to the basket: {name}',
    /** The receipt for one tap. The drawer opens with it, so this only confirms which row. */
    barAddedToast: '{name} added to the basket',
    /**
     * A row the counter has run out of never reaches this card, so this is the
     * whole card having nothing to offer — a club with an empty bar list.
     */
    barEmpty: 'Nothing on the bar tonight',
    barEmptyBody: 'The counter has not put anything on the menu yet — ask the staff what is around.',
    /**
     * Under the disabled add buttons while the club is shut (C2.11).
     *
     * The prices above stay true — there is simply nobody to pour it — so this is
     * a "not yet", with the hour attached, rather than an error.
     */
    barClosedHint: 'The bar takes orders again when the club opens.',

    /**
     * "The club now" — free seats by zone, and who of your friends is on the floor
     * (C3.7).
     *
     * The one card on this screen about the *room* rather than about the account.
     * Zone names and seat labels are club data and printed as they come; everything
     * here is the frame (F2.2).
     */
    clubNowTitle: 'The club now',
    /**
     * Club-wide free seats, as a fraction — the headline the zone rows break down.
     *
     * A fraction and not a percentage: "8 of 40 free" is a decision, "20 % free" is
     * a statistic, and the player is deciding whether to move a friend next to them.
     */
    clubNowFree: '{free} of {total} seats free',
    /** A genuinely full club. Not an error — the counter will say the same thing. */
    clubNowFull: 'Every seat taken',
    /** Heads the per-zone breakdown, which is the "where" of that headline. */
    clubNowZones: 'Free seats by zone',
    /**
     * A zone with nothing free. Said in words next to the zone name, because a `0`
     * in a row of numbers is read as a number and not as a closed door.
     */
    clubNowZoneFull: 'Full',
    /** Free seats in one zone. plurals: one | other */
    clubNowZoneFree: '{n} free|{n} free',
    /** Accessible name of a zone row: the count is a fraction on screen. */
    clubNowZoneLabel: '{zone}: {free} of {total} seats free',
    /**
     * Heads the friend list. plurals: one | other
     *
     * "Here now" and not "Online": this card counts seats in this building, and a
     * friend online from home is precisely the person it must not point at.
     */
    clubNowFriends: '{n} friend here now|{n} friends here now',
    /**
     * Which seat a friend is on. `{seat}` is the club's own label ("PC #17"), so
     * the sentence works for a hall numbered any way the club likes.
     */
    clubNowFriendSeat: 'On {seat}',
    /** …and what they are in. `{game}` is the title, printed as the library has it. */
    clubNowFriendPlaying: 'Playing {game}',
    /** A seated friend who has not launched anything yet. */
    clubNowFriendIdle: 'Not in a game yet',
    /**
     * The button. A verb aimed at a person, because that is what pressing it does —
     * it does not "create a party", it calls someone into the one you are in.
     */
    clubNowCall: 'Call to party',
    /** The visible label is two words shared by every row, so the name carries who. */
    clubNowCallLabel: 'Call {name} into the party',
    /** The receipt. One line, because the action has no panel of its own to answer in. */
    clubNowCalledToast: '{name} has been invited to the party',
    /** Already asked — the invite is out and the answer is theirs to give. */
    clubNowInvited: 'Invited',
    /** Already in. Nothing to press, and the row says why. */
    clubNowJoined: 'In your party',
    /**
     * The viewer has no title running and owns no party, so there is nothing to
     * invite anyone *into*. Stated once under the list rather than as five disabled
     * buttons with no explanation.
     */
    clubNowNeedGame: 'Start a game and you can pull friends into it from here.',
    /**
     * A friend who has switched party invites off in their own settings. Their
     * choice, so the row states it plainly instead of offering a button that fails.
     */
    clubNowNoInvites: 'Not accepting invites',
    /**
     * What the party would form around, in the header. Present only when there is
     * one — it is the answer to "invited to what".
     */
    clubNowPartyGame: 'Party in {game}',
    /**
     * Friends who are not in the club tonight — a count, never a roster.
     *
     * A greyed-out list of absent people would bury the two who are actually here,
     * which is the only thing this card is for. plurals: one | other
     */
    clubNowAway: '{n} more friend is not in the club|{n} more friends are not in the club',
    /** No friends seated, but the club is still worth describing — the zones remain. */
    clubNowNoFriends: 'None of your friends are here yet',
    clubNowNoFriendsBody:
      'Add the players you meet at the club and this card will show which PC they are on.',
    /**
     * Nobody on the list at all — not "none of them tonight" (C3.13).
     *
     * The distinction is the whole point of a second pair of strings: a member with
     * eleven friends and an empty floor is told the card will name their PCs, while
     * a player with no friend list is told what the club pays for making one. `{n}`
     * is the club's own `referralBonusMinutes`, so a club running fifteen minutes —
     * or none, in which case this never renders — is never contradicted by a
     * translation.
     *
     * plurals: one | other
     */
    clubNowReferral: 'Bring a friend in — {n} free minute|Bring a friend in — {n} free minutes',
    clubNowReferralBody:
      'The club adds the time once someone you brought registers and sits down. Ask the staff for your invite.',
    /** A club with no zones configured at all: the whole card has nothing to report. */
    clubNowEmpty: 'Nothing to report yet',
    clubNowEmptyBody: 'The club has not mapped its zones — ask the staff which seats are open.',

    /**
     * "The tournament" — the next bracket and the clock to its start (C3.8).
     *
     * One event, not a list: the card answers "is there something tonight and am I
     * in it", and the whole schedule is its own screen. Tournament names, formats
     * and prize lines are admin-authored and printed as the club wrote them (F2.2);
     * everything here is the frame around them.
     */
    tournamentTitle: 'The tournament',
    /** Says what the card is: the nearest one, not a schedule. */
    tournamentSubtitle: 'The next bracket at the club — and the clock to it.',
    /** Way to the full schedule, for everything this one event is not. */
    tournamentAll: 'All tournaments',
    tournamentAllLabel: 'Open the tournaments section',
    /** Above the digits. The card's whole reason for existing is this number. */
    tournamentStartsIn: 'Starts in',
    /**
     * The clock has run out but the bracket has not been started yet — a real
     * minute in the life of an event, and not the same thing as "under way".
     */
    tournamentStartingNow: 'Starting now',
    /** Wall-clock start, under the timer: a duration is not a plan, a time is. */
    tournamentStartsAt: 'Starts at {time}',
    /** Free seats in the bracket. plurals: one | other */
    tournamentSlots: '{n} of {total} slot left|{n} of {total} slots left',
    /** A full bracket. Words, not a `0` in a row of numbers. */
    tournamentNoSlots: 'Bracket full',
    /**
     * Caption over the seat strip — the row of pips that draws the bracket as
     * many seats, taken and free. "Slots" is already spoken by
     * `tournamentSlots` beside it, so the caption names the *thing* filling up
     * rather than repeating the noun.
     */
    tournamentSeats: 'Bracket',
    /** What first place pays. The club's own wording for the prize (F2.2). */
    tournamentPrize: 'First place',
    /** Entry fee. Either currency may be the whole price, or both may be charged. */
    tournamentEntry: 'Entry',
    /** …and a bracket the club is not charging for. */
    tournamentFree: 'Free entry',
    /** Named format of the bracket, so the player knows what they are signing into. */
    tournamentFormat: 'Format',
    tournamentFormatSingleElim: 'Single elimination',
    tournamentFormatDoubleElim: 'Double elimination',
    tournamentFormatRoundRobin: 'Round robin',
    tournamentFormatSwiss: 'Swiss',
    /**
     * The button. "Join", not "Register": the player is signing into tonight, and
     * the fee beside it already says what it costs.
     */
    tournamentJoin: 'Join',
    /** The name carries the event, since the visible label is one word. */
    tournamentJoinLabel: 'Join {name}',
    /** The receipt for one tap, with the fee already taken. */
    tournamentJoinedToast: 'You are in: {name}',
    /**
     * Registered, and check-in has opened: the club is asking for a confirmation
     * that the seat is warm. A different button, because it is a different promise.
     */
    tournamentCheckIn: 'Check in',
    tournamentCheckInLabel: 'Check in for {name}',
    tournamentCheckedInToast: 'Checked in — {name}',
    /** Confirmed and waiting. Nothing to press, and the row says so. */
    tournamentCheckedIn: 'Checked in',
    /** In, but check-in has not opened yet — the club will call. */
    tournamentRegistered: 'You are in',
    /**
     * A bracket with no seat left for this player. Stated as a badge rather than a
     * dead button: there is nothing to try.
     */
    tournamentFull: 'No slots left',
    /**
     * The entry fee is more than the wallet holds — money, coins, or both. The
     * server answers this, so the sentence and the disabled button always agree.
     */
    tournamentCantAfford: 'Not enough on your balance for the entry fee.',
    /** Under the button while the club is shut or unreachable (C2.11, C2.12). */
    tournamentClosedHint: 'Sign-ups open again when the club opens.',
    /** Nothing scheduled that has not already started. */
    tournamentEmpty: 'No bracket scheduled yet',
    tournamentEmptyBody:
      'The club announces new tournaments every week — the staff will know what is next.',

    /* ---------------------------------------------------------------- *
     * The hero carousel (C3.9)
     *
     * Everything here is the frame the club's own copy sits inside. Campaign
     * headlines, tournament names and the staff's note on a new title are
     * admin-authored and printed as written (F2.2) — the keys below name the
     * *kinds* of slide, the controls, and what the carousel is doing.
     * ---------------------------------------------------------------- */

    /** Accessible name of the whole carousel region. */
    heroLabel: 'Club highlights',
    /**
     * Screen-reader name of the slide group, and of the dots that walk it.
     *
     * "Highlight", not "slide": the number is only meaningful as a position in a
     * list of things the club is highlighting, and "slide 3 of 5" describes the
     * widget rather than its content.
     */
    heroSlides: 'Highlights',
    heroPrev: 'Previous highlight',
    heroNext: 'Next highlight',
    /** Dot label. `{title}` is the slide's own headline, so the target is named. */
    heroGoTo: 'Show highlight {n}: {title}',
    /**
     * Live-region sentence on every advance.
     *
     * Rotation moves no focus, so without this a screen reader is never told the
     * content under the unchanged heading has been replaced. `{body}` is the
     * slide's own copy — one sentence, not the whole card.
     */
    heroAnnounce: 'Highlight {n} of {total}. {body}',
    /**
     * The pause control, which is also the state readout.
     *
     * An auto-advancing carousel needs a way to stop that does not require holding
     * the mouse still (WCAG 2.2.2), and the same button says which state it is in.
     */
    heroPause: 'Pause the highlights',
    heroPlay: 'Resume the highlights',
    /** Shown while rotation is held, so a stopped carousel does not look broken. */
    heroPaused: 'Paused',

    /** Eyebrow on a new-arrival slide. The shelf, in two words. */
    heroNewLabel: 'New at the club',
    /** Eyebrow on a bracket slide that is not tonight's card. */
    heroTournamentLabel: 'Tournament',
    /** Launches the title the slide is about. */
    heroPlayNow: 'Play now',
    heroPlayLabel: 'Play {name}',
    /** Way to the schedule from a bracket slide — the hero does not take entries. */
    heroSeeTournaments: 'All tournaments',
    /**
     * How many are playing it, under a game slide.
     *
     * plurals: one | other
     */
    heroPlayers: '{n} player at the club|{n} players at the club',

    /* ── The week's board (C3.10) ─────────────────────────────────────── */
    leaderboardTitle: 'Leaderboard of the week',
    /** Says what bounds the list, so ten rows are not read as "the club". */
    leaderboardSubtitle: 'The top ten this week — and where you stand in it.',
    /**
     * Accessible name of the metric switcher.
     *
     * Three one-word segments say what they measure but not what pressing them
     * does — and the control re-ranks the whole club rather than re-sorting the
     * ten rows on screen, so the group's name is the verb.
     */
    leaderboardMetricLabel: 'Rank the board by',
    /**
     * The three orderings. Each doubles as the value column's heading, which is
     * what gives every bare number under it a unit when read aloud.
     */
    leaderboardHours: 'Hours',
    leaderboardCoins: 'Coins',
    leaderboardWins: 'Wins',
    /** Column heading for the position: a bare "#" has no spoken name. */
    leaderboardRank: 'Position',
    leaderboardPlayer: 'Player',
    /** Marks the reader's own row among the ten. */
    leaderboardYou: 'You',
    /** Under the board when the reader is on it — the row is already highlighted. */
    leaderboardYouRanked: 'You are {rank} of {total} this week',
    /** Caption on the pinned row, for a reader who is off the page. */
    leaderboardYourPlace: 'Your place: {rank} of {total}',
    /** Nobody's row to point at: a walk-in, or a member who opted out (F2.5). */
    leaderboardTotal: 'Ranking {total} members this week',
    /**
     * The dashed break above the pinned row, for readers who cannot see it.
     *
     * Without it a jump from tenth to twelfth reads as a board that lost a
     * player — the one thing this table must never appear to do.
     */
    leaderboardSkipped: 'Positions {from} to {to} are not shown',
    /**
     * The gap to the top, spoken.
     *
     * The bar behind each value is the card's one piece of decoration that is
     * load-bearing — it shows *how far* first place is, which no column of
     * numbers states — so the same fact is given to assistive tech in words.
     */
    leaderboardShare: '{percent}% of the leader',
    /** The leader has no gap to state; the row still needs a name for its bar. */
    leaderboardLeader: 'Leads the board',
  },

  games: {
    title: 'Games',
    subtitle: 'Everything installed on this station, ready to launch.',
    searchPlaceholder: 'Search games',
    /**
     * The reset control inside the search field (C4.3).
     *
     * An icon-only button, so this string exists for the screen reader and the
     * tooltip and nowhere on the glass. "Clear search" and not "Clear" — the
     * empty state a few rows down offers "Clear filters", and two unlabelled
     * clears in one region is the pair a player has to guess between.
     */
    searchClear: 'Clear search',

    /* ---------------------------------------------------------------- *
     * Library grid chrome (C4.1)
     *
     * The category chips are keyed here rather than printed from the
     * `GameCategory` union, because that union is a *data* value the endpoint
     * filters on — rendering it straight into the buttons is exactly what left
     * nine English words standing on a Russian screen. Genre names travel well
     * ("MOBA" is "MOBA" everywhere), but the row still has to route through the
     * dictionary or the next category added to the catalogue ships
     * untranslated again, silently.
     * ---------------------------------------------------------------- */
    // plural: one | other
    libraryCount: '{n} title ready to launch|{n} titles ready to launch',
    sortLabel: 'Sort library',
    sortPopularity: 'Popularity',
    sortAz: 'A–Z',
    sortRating: 'Rating',
    sortOnline: 'Players online',
    sortRecent: 'Recently played',
    categoryFilter: 'Category',

    /* ---------------------------------------------------------------- *
     * The three state filters beside the genres (C4.2)
     *
     * Named by the question the player is asking, not by the field behind them:
     * "Ready to play" is what "installed and not mid-patch" means to someone
     * standing at the seat, and it is the only one of the three the club server
     * cannot answer — it comes from the station agent, so on a seat without one
     * the chip is not offered at all rather than shown filtering nothing.
     * The hints are `title` text: three chips in one row have no space for the
     * sentence that makes each unambiguous.
     * ---------------------------------------------------------------- */
    stateFilter: 'Availability',
    filterInstalled: 'Ready to play',
    filterInstalledHint: 'Installed on this PC and not updating',
    filterHouseAccount: 'Needs club account',
    filterHouseAccountHint: 'Starts through a shared club login',
    filterFriends: 'Friends playing',
    filterFriendsHint: 'A friend is in this game right now',
    catAll: 'All',
    catShooter: 'Shooter',
    catMoba: 'MOBA',
    catBattleRoyale: 'Battle royale',
    catSports: 'Sports',
    catRacing: 'Racing',
    catStrategy: 'Strategy',
    catMmo: 'MMO',
    catRpg: 'RPG',

    /* ---------------------------------------------------------------- *
     * The card itself (C4.4)
     *
     * Three strings that exist because the tile prints glyphs. The launcher name
     * is *not* here and never will be — "Steam", "Epic", "Battle.net" are product
     * names, printed verbatim from the catalogue (F2.2); what the dictionary owns
     * is the word that says what kind of thing that name is, for the `title` on a
     * badge a two-column phone truncates.
     *
     * The other two are for a reader with no glyphs at all: a star beside "4.8"
     * is a rating only if you can see the star, and a green dot beside "2" is
     * "in the club now" only if you can see the dot. Both are `sr-only`
     * sentences, so both carry their own number rather than leaning on the digit
     * next to them.
     * ---------------------------------------------------------------- */
    launcherLabel: 'Launcher',
    ratingOutOf: 'Rating {v} out of 5',
    // plural: one | other
    inClubNow: '{n} player in this game in the club now|{n} players in this game in the club now',
    /**
     * The words printed *inside* the badge, next to the digit.
     *
     * Not a plural string on purpose: it labels what is being counted rather than
     * making a sentence about the count, so it never has to agree with the number
     * beside it — which is what keeps the badge the same width in all three
     * languages on a two-column phone. The sentence is `inClubNow` above, and it
     * is the one a screen reader gets.
     */
    inClubShort: 'in club',

    favorites: 'Favorites',
    recent: 'Recently played',
    allGames: 'All games',
    launch: 'Launch',
    launching: 'Launching {name}',
    launchBody: 'Do not turn off the station. The game window opens in a few seconds.',
    installed: 'Installed',
    rating: 'Rating',
    playersOnline: '{n} playing|{n} playing',
    noResults: 'No games found',
    noResultsBody: 'Try a different name or clear the category filter.',
    clearFilters: 'Clear filters',
    openLibrary: 'Open library',
    noAccounts: 'No accounts available',
    noAccountsBody: 'Every club account for this game is in use. Ask an admin for a free seat.',

    /**
     * The same pool, refused for a different reason: no link (C4.7/C4.8).
     *
     * Reserved here alongside the block-list entry it belongs to
     * (`catalog.grantHouseAccount` in `lib/mock/api/client.ts`), so the copy and
     * the rule were decided in one breath rather than rediscovered later. The
     * distinction *is* the message: the game still starts offline, only handing
     * over a shared club login has to wait — and the way past it is a human, not
     * a retry. An account already attached to this visit is untouched. The UI
     * branch lands with C4.7/C4.8.
     */
    houseAccountOfflineTitle: 'Account needs a connection',
    houseAccountOfflineBody:
      'Launching the game works offline, but handing over a club account needs the club server. Call an admin.',

    /**
     * The launch dialog's own name (C3.2).
     *
     * The visible title is painted into the cover art, so the dialog is named
     * here instead — a reader must open with "Launch Civilization VII" and not
     * with an unnamed dialog. `launchDialogPending` covers the frame before the
     * game has arrived, which is short but not zero.
     */
    launchDialog: 'Launch {name}',
    launchDialogPending: 'Launch game',

    /**
     * The agent's checklist, in order (see hooks/use-game-launch.ts).
     *
     * These three lines are the *only* thing on screen for the seconds a start
     * takes, so they were the last place in the product that could afford a
     * hardcoded English string (F2.4).
     */
    launchStepAccount: 'Preparing account…',
    launchStepSession: 'Injecting session…',
    launchStepStart: 'Starting game…',

    /**
     * Both outcomes of a start, raised as toasts by the hook — which is why they
     * live in `games` and not in the dialog: quick launch from the "Continue"
     * card produces the same two sentences without a dialog ever opening.
     *
     * The failure carries the API's code rather than its message: the wording is
     * ours, the code is what an admin can act on (F2.2).
     */
    launchedToast: '{name} launched — minimizing the launcher',
    launchFailed: 'Launch failed ({code})',

    /**
     * The house-account list (F3.4).
     *
     * A *choice offered* to the player, not a parameter the launch needs — the
     * endpoint takes a game id and the server owns availability. That is exactly
     * why one click from the "Continue" card is allowed to skip this list.
     */
    selectAccount: 'Select account',
    accountLinked: 'Linked: {name}',
    /**
     * Written out next to every row, because the other half of this signal is a
     * red or green disc — and a coloured dot announces nothing to a reader and
     * nothing at all to a player who cannot tell the two hues apart (F6.6).
     */
    accountAvailable: 'Available',
    accountInUse: 'In use',
    rememberAccount: 'Remember my choice for this game',

    // F8.4 — the strip that *names* the silence. A launcher that simply stops
    // making sounds is indistinguishable from a broken one, and the player has
    // no way to learn the rule or to end the state.
    inGame: 'In game',
    inGameNow: 'Playing {name}',
    inGameQuiet: 'Launcher sounds are paused. Time warnings and admin messages still come through.',
    backToLauncher: 'Game closed',
  },

  shop: {
    title: 'Shop',
    subtitle: 'Snacks, drinks and extra time — delivered to your station.',
    addToCart: 'Add to cart',
    cart: 'Cart',
    cartEmpty: 'Your cart is empty',
    cartEmptyBody: 'Pick something from the shop and it will show up here.',
    checkout: 'Checkout',
    total: 'Total',
    remove: 'Remove',
    quantity: 'Quantity',
    payWithCoins: 'Pay with coins',
    payAtCounter: 'Pay at the counter',
    orderPlaced: 'Order placed! Staff will bring it to your station.',
    catSnacks: 'Snacks',
    catDrinks: 'Drinks',
    catTime: 'Time',
    catGear: 'Gear',
    sectionEmpty: 'Nothing in this section',
    sectionEmptyBody: 'The club is restocking. Try another tab or ask at the counter.',
    /**
     * The cart button in the top bar (C2.4), in two shapes.
     *
     * The count is the reason to press it, so it lives *in* the accessible name
     * rather than only in the badge: a red disc reading "2" announces nothing.
     */
    openCartEmpty: 'Cart, empty',
    // plural: one | other
    openCart: 'Cart, {n} item|Cart, {n} items',

    /* ---------------------------------------------------------------- *
     * Closing hours in the shop (C2.11)
     *
     * Two different statements, and mixing them up would be the bug:
     *
     *   closed*   the club is shut, so nothing can be bought or brought to a
     *             station. A refusal, and it names when that ends.
     *   closing*  the pass is longer than what is left of today. **Not** a
     *             refusal — the player may legitimately buy minutes that will
     *             tick on their next visit, so this is a note on the card, not a
     *             disabled button.
     * ---------------------------------------------------------------- */
    closedTitle: 'The club is closed',
    closedBody: 'Buying and bar orders open again at {time}.',
    /** Same refusal, for a schedule with no next opening to print. */
    closedBodyNoTime: 'Buying and bar orders open again when the club does.',
    /** On the checkout button, where a full sentence does not fit. */
    closedCheckoutHint: 'Checkout opens again with the club.',
    /** On a time-pass card that outlasts today. `{n}` is the part that spills. */
    closingPassNote: 'Longer than we are open today — {n} min of it keeps for your next visit.',
  },

  wallet: {
    title: 'Wallet',
    balance: 'Balance',
    /** The balance plate's name in the bar, amount included (C2.4). */
    openWallet: 'Wallet, balance {amount}',
    coinBalance: 'IMBA coins',
    /**
     * The coin plate's name in the bar (C2.4). Coins and euros are two pockets of
     * one wallet, so both plates open the same section and both carry their
     * reading in the name.
     */
    openCoins: 'Wallet, {amount} IMBA coins',
    /**
     * Printed in the balance plate when the read failed (C2.4). The plate stays
     * in the row rather than vanishing: a missing plate reads as "no balance",
     * which is a different and wrong statement.
     */
    balanceUnknown: 'Balance unavailable, tap to retry',
    topUp: 'Top up',
    history: 'History',
    deposit: 'Deposit',
    spent: 'Spent',
    debt: 'Debt',
    noTransactions: 'No transactions yet',
    noTransactionsBody: 'Purchases and top-ups will appear here.',
  },

  loyalty: {
    title: 'Loyalty',
    level: 'Level',
    xp: 'XP',
    xpToNext: '{n} XP to level {level}',
    battlePass: 'Battle Pass',
    season: 'Season',
    rewards: 'Rewards',
    claim: 'Claim',
    claimed: 'Claimed',
    locked: 'Locked',
    progress: 'Progress',
    tierRookie: 'Rookie',
    tierRegular: 'Regular',
    tierVeteran: 'Veteran',
    tierElite: 'Elite',
    achievements: 'Achievements',
    noAchievements: 'No achievements yet',
    noAchievementsBody: 'Play a session and the first badges start unlocking.',
    activity: 'Recent activity',
    noActivity: 'No activity yet',
    noActivityBody: 'Sessions, purchases and unlocks show up here.',
    prizeLadder: 'Prize Ladder',
    noRewards: 'No rewards on the ladder',
    noRewardsBody: 'The club is preparing a new prize ladder — check back soon.',
    leaderboard: 'Leaderboard',
    noLeaderboard: 'Leaderboard is empty',
    noLeaderboardBody: 'Be the first to log hours this week.',
    unlocked: 'Unlocked',
    prizesUnlocked: 'Prizes unlocked',
  },

  social: {
    title: 'Friends',
    friends: 'Friends',
    addFriend: 'Add friend',
    invite: 'Invite',
    party: 'Party',
    chat: 'Chat',
    requests: 'Requests',
    accept: 'Accept',
    decline: 'Decline',
    noFriends: 'No friends yet',
    noFriendsBody: 'Add players you met at the club to see when they are online.',
    playingNow: 'Playing {name}',
  },

  tournaments: {
    title: 'Tournaments',
    upcoming: 'Upcoming',
    live: 'Live',
    finished: 'Finished',
    register: 'Register',
    registered: 'Registered',
    prizePool: 'Prize pool',
    bracket: 'Bracket',
    startsAt: 'Starts at {time}',
    noTournaments: 'No tournaments scheduled',
    noTournamentsBody: 'New brackets are announced every week — check back soon.',
  },

  help: {
    title: 'Help',
    callStaff: 'Call staff',
    staffCalled: 'Staff notified — someone is on the way.',
    faq: 'FAQ',
    rules: 'Club rules',
    contact: 'Contact',
    reportIssue: 'Report an issue',
    issueSent: 'Thanks! Your report has been sent to the admin.',
    describeIssue: 'Describe the issue',

    /**
     * The first-run tour (C3.12).
     *
     * It lives in `help` rather than in `home` because it is the same thing the
     * Help section offers as "How this works": the walk is offered once by itself
     * and stays available on demand, and one namespace is what keeps both doors
     * saying the same five things.
     *
     * Each step names a *place* and then the one thing that place is for — a
     * caption that only repeated the label under the spotlight would be a tour
     * that teaches nothing.
     */
    tourTitle: 'How this works',
    /** The dialog's own name, read before the first step's heading. */
    tourLabel: 'A quick walk around the launcher',
    tourStep: 'Step {step} of {total}',
    tourSkip: 'Skip',
    tourBack: 'Back',
    tourNext: 'Next',
    tourDone: 'Got it',
    tourTimeTitle: 'Your time lives here',
    tourTimeBody:
      'The plate counts down what is left of this seat. Press it for the whole picture — what is being spent, and how to add more.',
    tourGamesTitle: 'Games start here',
    tourGamesBody:
      'The library holds everything installed on this station. One click launches a title — nothing to download, nothing to log into twice.',
    tourBarTitle: 'Drinks come to your seat',
    tourBarBody:
      'Pick from the bar board and it lands in the basket up here. Pay once, and staff bring the order to this PC.',
    tourLoyaltyTitle: 'Playing earns something',
    tourLoyaltyBody:
      'Daily tasks pay coins and XP, and the season pass turns that XP into rewards. Both are on this screen — nothing has to be claimed at the counter.',
    tourHelpTitle: 'Staff are one press away',
    tourHelpBody:
      'Anything wrong with the seat — a dead headset, a game that will not start — goes through Help, and the admin sees which station it came from.',
  },

  /**
   * The bell in the top bar and the panel behind it (C2.4).
   *
   * Its own namespace rather than a corner of `help`: an inbox is what the club
   * says to the player, help is what the player says to the club, and C2.5 grows
   * this one with grouping and per-card actions.
   */
  inbox: {
    title: 'Notifications',
    /**
     * The trigger's accessible name, in two shapes. The count is the whole
     * reason to open the panel, so it belongs *in* the name rather than in a
     * coloured dot beside it — a badge nobody can read announces nothing.
     */
    openNone: 'Notifications, nothing new',
    // plural: one | other
    openUnread: 'Notifications, {n} unread message|Notifications, {n} unread messages',
    /**
     * The panel's subtitle. Deliberately shorter than the trigger's name: it sits
     * on one line beside "Mark all as read" in a 22 rem popover, and the noun it
     * would repeat is already the panel's own title.
     */
    unreadCount: '{n} unread',
    /** Printed in the badge once the count no longer fits two digits. */
    overflow: '9+',
    markAllRead: 'Mark all as read',
    markedAllToast: 'Everything marked as read.',
    allRead: 'All caught up',
    unread: 'Unread',
    empty: 'Nothing here yet',
    emptyBody: 'Club news, order updates and time warnings arrive here.',
    /**
     * Day headings (C2.5). "Today" and "Yesterday" are words, not dates: that is
     * how a player reads a two-hour-old message. Anything older is printed by
     * `formatFullDate`, which is locale-aware — a date assembled from strings
     * here would put the month first in Lithuanian.
     */
    today: 'Today',
    yesterday: 'Yesterday',
    /** The group's spoken name, so a reader hears which day it entered. */
    dayGroup: 'Notifications, {day}',
    /**
     * In-card actions. The two invite answers, then the lines that replace them
     * once the server has recorded one: a card still offering "Accept" after the
     * invite was accepted is lying about state.
     */
    acceptInvite: 'Accept invite',
    declineInvite: 'Decline',
    inviteAccepted: 'Invite accepted',
    inviteDeclined: 'Invite declined',
    joinedToast: 'You joined the party.',
    declinedToast: 'Invite declined.',
    /** The stars' group label — five bare stars ask nothing on their own. */
    rateOrder: 'Rate order',
    // plural: one | other
    rateStar: '{n} star|{n} stars',
    rated: 'Rated {n}/5',
    ratedToast: 'Thanks for rating your order.',
    /** The answer failed, so the card says so instead of pretending it took. */
    actionFailed: 'That did not go through. Try again.',
    /** Someone else answered first — a reopened panel, not a new decision. */
    actionStale: 'This one was already answered.',
  },

  booking: {
    title: 'Booking',
    selectZone: 'Zone',
    selectStation: 'Station',
    date: 'Date',
    time: 'Time',
    duration: 'Duration',
    book: 'Book',
    booked: 'Station booked',
    bookedBody: 'We saved {station} for you on {date}.',
    cancelBooking: 'Cancel booking',
    noSlots: 'No free slots',
    noSlotsBody: 'Pick another time or a different zone.',
    zoneVip: 'VIP',
    zoneStandard: 'Standard',
    zonePs5: 'PS5',
  },

  settings: {
    title: 'Settings',
    close: 'Close settings',
    display: 'Display',
    audio: 'Audio',
    controls: 'Controls',
    region: 'Region',
    resolution: 'Resolution',
    brightness: 'Brightness',
    reduceAnimations: 'Reduce animations',
    masterVolume: 'Master volume',
    gameVolume: 'Game volume',
    chatVolume: 'Chat volume',
    outputDevice: 'Output device',
    interfaceGroup: 'Launcher',
    interfaceSounds: 'Interface sounds',
    interfaceSoundsHint: 'Launcher cues only: notifications, confirmations, time warnings. Games and voice chat are untouched.',
    interfaceVolume: 'Interface volume',
    mouseSensitivity: 'Mouse sensitivity',
    serverRegion: 'Server region',
    language: 'Interface language',
    languageHint: 'Applies to this station right away and is saved to your profile.',
    languageHintGuest: 'Applies until the end of this session. Guests have no profile to save it to.',
    languageSaved: 'Interface language saved to your profile.',
    languageSaveFailed: 'Language changed for this session, but saving to your profile failed.',
  },

  guest: {
    title: 'Guest mode',
    subtitle: 'Play now, create the profile later.',
    continueAsGuest: 'Continue as guest',
    badge: 'Guest',
    limits: 'Guests cannot collect XP, coins or Battle Pass rewards.',
    createAccount: 'Create a profile',
    startedToast: 'Checked in as {label}. Anything you order goes on your tab.',
    tab: 'Open tab',
    endSession: 'End guest session',
    endConfirmTitle: 'End the guest session?',
    endConfirmBody: 'Settle the open tab at the bar. Nothing from this session is saved.',
    // Lock-screen "Guest" tab — the door into the stage-2 post-paid flow (C1.2).
    lockTitle: 'Guest',
    lockTitleHi: 'check-in',
    lockSub: 'Walk in, play now, settle the tab at the counter afterwards.',
    flowTitle: 'How the open tab works',
    flowStep1: 'An admin unlocks this station and starts your visit.',
    flowStep2: 'Playtime and anything you order go onto one open tab.',
    flowStep3: 'You pay the whole tab at the counter when you leave.',
    startVisit: 'Start a guest visit',
    soon: 'Soon',
    soonNote: 'Self check-in is not live on this station yet. Ask the admin on shift to start a guest visit for you.',
  },

  // PC-side surfaces served by the station agent (F5.4). Every string here
  // describes hardware, so it must also cover the "no agent" seat.
  agent: {
    title: 'This PC',
    subtitle: 'Windows and driver panels for this station.',
    statusChecking: 'Looking for the station agent…',
    statusConnected: 'Station agent connected',
    statusUnavailable: 'No station agent',
    version: 'Agent {version}',
    unavailable: 'Unavailable on this PC',
    unavailableBody:
      'The station agent is not running, so the launcher cannot open Windows panels or change hardware here.',
    unavailableHint: 'Ask staff to restart the station agent.',
    unsupported: 'Not available on this hardware',
    recheck: 'Check again',
    open: 'Open',
    opening: 'Opening…',
    openedToast: '{panel} opened on the desktop',
    panelNvidia: 'NVIDIA Control Panel',
    panelNvidiaHint: 'Sharpening, latency mode, colour.',
    panelWindowsDisplay: 'Display settings',
    panelWindowsDisplayHint: 'Resolution, refresh rate, scaling.',
    panelAudioOutput: 'Speakers and headphones',
    panelAudioOutputHint: 'Output device and levels.',
    panelAudioInput: 'Microphone',
    panelAudioInputHint: 'Input device and gain.',
    panelMouse: 'Mouse',
    panelMouseHint: 'Pointer speed and buttons.',
    panelKeyboard: 'Keyboard',
    panelKeyboardHint: 'Repeat delay and layouts.',
  },

  // Copy for pushed events (F4). Payloads carry ids and numbers only, so every
  // line a player reads about a server event lives here and gets translated.
  realtime: {
    // Connection banner (F4.5). The reassurance matters: club time is server
    // time, so a dropped link never costs the player a minute.
    offlineTitle: 'No connection to the club server',
    offlineBody: 'Your time keeps running — nothing is lost. Reconnecting automatically.',
    reconnecting: 'Reconnecting…',
    retryIn: 'Next try in {n} s',
    retryNow: 'Try now',
    attempt: 'Attempt {n}',
    restored: 'Connection restored',
    // plural: one | other
    pendingUpdates: '{n} update waiting|{n} updates waiting',

    /* ---------------------------------------------------------------- *
     * Money while the link is down (C2.12)
     *
     * Three shapes of one refusal, because it has to be stated wherever the
     * player reaches for their money and a sentence that fits a section banner
     * does not fit under a button:
     *
     *   salesTitle/salesBody  the banner in the shop — a refusal, and it repeats
     *                         the promise that the clock is unaffected, because
     *                         "you cannot buy" is exactly when a player starts
     *                         wondering whether their minutes are burning.
     *   salesHint             the line under a disabled Checkout / Extend.
     *   salesRefused          the toast if a request is fired anyway (a click
     *                         that beat the state, a form that was already open).
     *                         It says *nothing was charged* — that is the only
     *                         thing the player actually needs to know.
     *
     * Never "try again later": the shell retries the link by itself, and the
     * buttons come back on their own the moment it is up.
     * ---------------------------------------------------------------- */
    salesTitle: 'Purchases are paused',
    salesBody:
      'The club server cannot confirm a payment right now. Your session is unaffected — the clock keeps running and your game is not interrupted.',
    salesHint: 'Purchases resume by themselves once the link is back.',
    salesRefused: 'No connection to the club server — nothing was charged.',

    timeAdded: '+{minutes} min added to your session',
    timeAddedByStaff: '+{minutes} min from the admin',
    sessionPaused: 'Session paused',
    sessionPausedStaff: 'An admin paused your session',
    sessionResumed: 'Session resumed — go ahead',
    sessionEnded: 'Session ended',
    sessionMoved: 'Move to seat {seat}',
    sessionMovedBody: 'Please move within {n} min. Your session and time move with you.',
    orderNew: 'Order received',
    orderAccepted: 'Order accepted at the bar',
    orderPreparing: 'Your order is being prepared',
    orderDelivering: 'Your order is on the way',
    orderDelivered: 'Order delivered — enjoy',
    orderCancelled: 'Order cancelled',
    tabUpdated: 'Your tab is now {total}',
    tabSettled: 'Tab settled — thank you',
    passGranted: '{name} added: {minutes} min banked',
    walletTopUp: 'Balance topped up by {amount}',
    walletSpent: '{amount} spent',
    coinsEarned: '+{n} coins',
    messageReceived: 'Reply from the club',
    questCompleted: 'Quest done: {title}',
    battlePassTier: 'Battle Pass tier {n} unlocked',
    tournamentCall: '{name}: you are called to a match',
    bookingReminder: 'Your booking starts soon',
    friendRequest: '{name} wants to be friends',
    partyInvite: '{name} invited you to a party',
  },

  errors: {
    generic: 'Something went wrong',
    genericBody: 'The action did not go through. Try again in a moment.',
    network: 'No connection to the club server',
    networkBody: 'Check the station cable or call staff for help.',
    notFound: 'Not found',
    unauthorized: 'Access denied',
    sessionLost: 'Session lost — please sign in again',
    invalidCredentials: 'Wrong username or password',
    invalidCode: 'Wrong code — check the email and try again',
    rateLimited: 'Too many tries — request a new code in a minute',
    forbidden: 'Not allowed for your account',
    conflict: 'That has already changed — refresh and try again',
    validation: 'Check the highlighted fields',
    timeout: 'The club server took too long to answer',
    sessionExpired: 'Your session has ended',
    /**
     * C1.12. The toast form, for the paths that have no card to open — the panel
     * says it properly, with the seat named.
     */
    activeElsewhere: 'Your session is already running on another PC',
    insufficientFunds: 'Not enough money on your balance',
    insufficientCoins: 'Not enough coins',
    outOfStock: 'Out of stock right now',
    creditLimit: 'Tab limit reached — settle it at the counter',
    invalidEmail: 'Enter a valid email address',
    required: 'This field is required',
    tooShort: 'Minimum {min} characters',
    passwordsMismatch: 'Passwords do not match',
    // AgentErrorCode — one key per code, so `errors.<code>` always resolves.
    agentUnavailable: 'No station agent on this PC',
    unsupported: 'This PC cannot do that',
    agentTimeout: 'The station agent did not answer',
    gameNotInstalled: 'That game is not installed here',
    gameAlreadyRunning: 'A game is already running',
    gameNotRunning: 'That game is not running',
    launcherFailed: 'The game launcher failed to start',
    permissionDenied: 'Windows blocked that action',
    invalidValue: 'That value is not supported by the hardware',
    blockedByPolicy: 'Not allowed during a paid session',
    agentFailed: 'The station agent reported an error',
  },

  /**
   * Crash screen (F6.5) — the copy shown when the shell itself throws, not when
   * a request fails. `errors.*` describes a failed *action* and lives next to a
   * retry button; these strings describe a broken *interface* and must answer
   * three questions in the first two seconds: what happened, is my money and
   * time safe, what do I press.
   *
   * Reassurance is not decoration here. The player paid for minutes that are
   * still ticking on the server, so the screen says so explicitly — otherwise a
   * crash reads as "I just lost my session".
   */
  crash: {
    eyebrow: 'Shell fault',
    title: 'Interface',
    titleAccent: 'stopped',
    body: 'An unexpected error interrupted the launcher. No order was placed and nothing was charged.',
    timeSafe: 'Your session time is counted by the club server and keeps running — restarting the interface costs you no minutes.',
    callStaff: 'If this keeps coming back, call the admin at the counter and read them the code below.',
    retry: 'Try again',
    reload: 'Restart interface',
    // The kiosk recovers on its own every few seconds — nobody may be standing
    // in front of it. The countdown is stated so the guest understands the
    // screen is about to change by itself rather than pressing at random.
    // `{seconds} s` avoids a plural form on the failure path, where the crash
    // screen translates without the provider's plural rules.
    autoRecover: 'Recovering automatically in {seconds} s',
    autoRecoverGaveUp: 'Automatic recovery did not help — please call the admin.',
    reference: 'Fault code',
    details: 'Technical details',
    // A single failed section inside a working shell — the frame, the clock and
    // the navigation are all still alive, so the copy must not imply a restart.
    sectionTitle: 'This section failed to load',
    sectionBody: 'The rest of the launcher works as usual. Reload the section or open another one.',
  },
} as const
