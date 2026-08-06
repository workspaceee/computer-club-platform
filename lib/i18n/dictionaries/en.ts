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
  },

  games: {
    title: 'Games',
    subtitle: 'Everything installed on this station, ready to launch.',
    searchPlaceholder: 'Search games',
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
    noFeatured: 'No featured games',
    noFeaturedBody: 'The club has not picked highlights yet — browse the full library.',
    openLibrary: 'Open library',
    noAccounts: 'No accounts available',
    noAccountsBody: 'Every club account for this game is in use. Ask an admin for a free seat.',

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
