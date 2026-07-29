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
  },

  wallet: {
    title: 'Wallet',
    balance: 'Balance',
    coinBalance: 'IMBA coins',
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
