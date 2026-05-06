# Welcome Overlay — Guided Intro with Opening Clip

THINK HARD

**Scope:** `@src/screens/HomeScreen.tsx` only. Replaces the existing opening clip `useEffect` and adds a full-screen welcome overlay.

---

## What this does

First-time users see a full-screen overlay on HomeScreen with 4 auto-advancing slides while Opening.mp3 plays. A "Skip" button is always visible. The overlay blocks interaction with the home screen underneath. When the clip finishes or the user taps Skip, the overlay dismisses and sets `opening_clip_played` so it never shows again.

---

## Step 1 — Add overlay state

Add these state variables inside the `HomeScreen` component, near the existing state declarations (search for `const [emptyLine]`):

```ts
const [showWelcome, setShowWelcome] = useState(false);
const [welcomeSlide, setWelcomeSlide] = useState(0);
```

---

## Step 2 — Replace the existing opening clip useEffect

Find the existing `useEffect` that contains `kvGet('opening_clip_played')` — it's the one that plays Opening.mp3. Replace the ENTIRE useEffect (from `useEffect(() => {` through its closing `}, []);`) with this:

```ts
useEffect(() => {
  // One-time welcome overlay + opening clip
  const alreadyPlayed = kvGet('opening_clip_played');
  if (alreadyPlayed) return;

  setShowWelcome(true);
  let cancelled = false;
  let slideTimer: ReturnType<typeof setInterval> | null = null;

  (async () => {
    try {
      const asset = Asset.fromModule(require('../../assets/voice/Opening.mp3'));
      await asset.downloadAsync();
      if (cancelled) return;
      const uri = asset.localUri;
      if (!uri) return;
      const player = createAudioPlayer({ uri }) as PlayerWithEvents;
      openingPlayerRef.current = player;
      player.volume = 1.0;
      if (cancelled) {
        try { player.remove(); } catch { /* */ }
        openingPlayerRef.current = null;
        return;
      }

      // Auto-advance slides every 13 seconds (4 slides × 13s ≈ 52s clip)
      slideTimer = setInterval(() => {
        setWelcomeSlide((prev) => (prev < 3 ? prev + 1 : prev));
      }, 13000);

      // Listen for playback completion
      const sub = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish && !cancelled) {
          dismissWelcome();
        }
      });

      player.play();

      // Store subscription removal for cleanup
      openingPlayerRef.current = Object.assign(player, { _statusSub: sub });
    } catch (e) {
      console.warn('[HomeScreen] opening clip error:', e);
      // If clip fails, still show overlay — user can skip
    }
  })();

  function dismissWelcome() {
    cancelled = true;
    if (slideTimer) clearInterval(slideTimer);
    kvSet('opening_clip_played', 'true');
    setShowWelcome(false);
    setWelcomeSlide(0);
    if (openingPlayerRef.current) {
      try { openingPlayerRef.current.pause(); } catch { /* */ }
      try {
        const sub = (openingPlayerRef.current as any)._statusSub;
        if (sub?.remove) sub.remove();
      } catch { /* */ }
      try { openingPlayerRef.current.remove(); } catch { /* */ }
      openingPlayerRef.current = null;
    }
  }

  // Expose dismissWelcome for the skip button via ref
  dismissWelcomeRef.current = dismissWelcome;

  return () => {
    dismissWelcome();
  };
}, []);
```

---

## Step 3 — Add dismiss ref

Add this ref near the existing `openingPlayerRef` declaration (search for `const openingPlayerRef`):

```ts
const dismissWelcomeRef = useRef<(() => void) | null>(null);
```

---

## Step 4 — Remove the AppState useEffect for opening clip

Find the second `useEffect` that listens to `AppState.addEventListener('change', ...)` and stops `openingPlayerRef.current` when the app backgrounds. **Delete it entirely.** The new dismissWelcome cleanup handles this case.

---

## Step 5 — Add the welcome overlay slides data

Add this constant OUTSIDE the component, after the `EMPTY_TODAY_LINES` array (search for that string):

```ts
const WELCOME_SLIDES = [
  {
    title: 'Welcome to Don\'t Forget Why',
    subtitle: 'Alarms. Notes. Games. Judgment.',
    icon: null, // Uses the character image
  },
  {
    title: 'More Than Just Alarms',
    subtitle: 'Alarms with attitude, timers, reminders, and calendar sync — all in one place.',
    icons: ['alarm', 'stopwatch', 'bell', 'calendar'] as const,
  },
  {
    title: 'Your Stuff, Your Way',
    subtitle: 'Notepad, voice memos, 6 themes, custom icons. No accounts. No tracking. No ads.',
    icons: ['notepad', 'microphone', 'gear'] as const,
  },
  {
    title: 'Games That Judge You',
    subtitle: 'Chess, checkers, trivia, sudoku, memory match, daily riddle. Brain training with personality.',
    icons: ['gamepad'] as const,
  },
];
```

---

## Step 6 — Add the overlay JSX

Inside the component's return statement, add the overlay as the LAST child of the outermost `<View style={styles.container}>`, right before the closing `</View>`. This ensures it renders on top of everything.

```tsx
{showWelcome && (
  <View style={styles.welcomeOverlay}>
    <View style={styles.welcomeContent}>
      {/* Character image on slide 0 */}
      {welcomeSlide === 0 && (
        <Image
          source={require('../../assets/adaptive-icon.png')}
          style={styles.welcomeCharacter}
          resizeMode="contain"
        />
      )}

      {/* Icon row for slides 1-3 */}
      {welcomeSlide > 0 && WELCOME_SLIDES[welcomeSlide].icons && (
        <View style={styles.welcomeIconRow}>
          {(WELCOME_SLIDES[welcomeSlide] as { icons: readonly string[] }).icons.map((key) => (
            <Image
              key={key}
              source={sectionIconSources[key === 'calendar' ? 'calendar' : key] || sectionIconSources.alarms}
              style={styles.welcomeIcon}
              resizeMode="contain"
            />
          ))}
        </View>
      )}

      <Text style={styles.welcomeTitle}>
        {WELCOME_SLIDES[welcomeSlide].title}
      </Text>
      <Text style={styles.welcomeSubtitle}>
        {WELCOME_SLIDES[welcomeSlide].subtitle}
      </Text>

      {/* Dot indicators */}
      <View style={styles.welcomeDots}>
        {WELCOME_SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.welcomeDot,
              i === welcomeSlide && styles.welcomeDotActive,
            ]}
          />
        ))}
      </View>
    </View>

    {/* Skip button — always visible */}
    <TouchableOpacity
      style={styles.welcomeSkip}
      onPress={() => dismissWelcomeRef.current?.()}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Skip introduction"
    >
      <Text style={styles.welcomeSkipText}>Skip</Text>
    </TouchableOpacity>
  </View>
)}
```

---

## Step 7 — Add overlay styles

Add these to the `StyleSheet.create` call inside the existing `useMemo` that creates `styles`. Place them after the last existing style (search for the closing `}), [colors, insets]);` to find the end — add these BEFORE that closing):

```ts
// Welcome overlay
welcomeOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0, 0, 0, 0.92)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 100,
},
welcomeContent: {
  alignItems: 'center',
  paddingHorizontal: 40,
},
welcomeCharacter: {
  width: 160,
  height: 160,
  marginBottom: 24,
},
welcomeIconRow: {
  flexDirection: 'row',
  gap: 20,
  marginBottom: 24,
},
welcomeIcon: {
  width: 48,
  height: 48,
},
welcomeTitle: {
  fontSize: 22,
  fontFamily: FONTS.bold,
  color: '#FFFFFF',
  textAlign: 'center',
  marginBottom: 12,
},
welcomeSubtitle: {
  fontSize: 14,
  fontFamily: FONTS.regular,
  color: 'rgba(255, 255, 255, 0.7)',
  textAlign: 'center',
  lineHeight: 20,
  marginBottom: 32,
},
welcomeDots: {
  flexDirection: 'row',
  gap: 8,
},
welcomeDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
},
welcomeDotActive: {
  backgroundColor: '#FFFFFF',
  width: 24,
},
welcomeSkip: {
  position: 'absolute',
  bottom: 60,
  paddingHorizontal: 24,
  paddingVertical: 12,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.3)',
},
welcomeSkipText: {
  fontSize: 14,
  fontFamily: FONTS.semiBold,
  color: '#FFFFFF',
},
```

---

## Step 8 — Fix the icon lookup for slides 1-3

The `sectionIconSources` map uses keys like `alarms`, `timers`, `reminders`, `voice`, `calendar`, `games`, `settings`. But `WELCOME_SLIDES` uses the `appIconAssets` keys (`alarm`, `stopwatch`, `bell`, `calendar`, `notepad`, `microphone`, `gear`, `gamepad`). Replace the icon rendering in the overlay (the `welcomeSlide > 0` block from Step 6) with this instead:

```tsx
{welcomeSlide > 0 && WELCOME_SLIDES[welcomeSlide].icons && (
  <View style={styles.welcomeIconRow}>
    {(WELCOME_SLIDES[welcomeSlide] as { icons: readonly string[] }).icons.map((key) => {
      const iconSource = {
        alarm: alarmIcon,
        stopwatch: stopwatchIcon,
        bell: bellIcon,
        calendar: calendarIcon,
        notepad: notepadIcon,
        microphone: microphoneIcon,
        gear: gearIcon,
        gamepad: gamepadIcon,
      }[key];
      return iconSource ? (
        <Image
          key={key}
          source={iconSource}
          style={styles.welcomeIcon}
          resizeMode="contain"
        />
      ) : null;
    })}
  </View>
)}
```

This reuses the already-resolved themed icon variables (`alarmIcon`, `stopwatchIcon`, etc.) from the `useAppIcon` calls at the top of the component.

---

## Verification

1. `npx tsc --noEmit` — 0 errors
2. Grep to confirm the overlay renders:
```bash
grep -n "showWelcome" src/screens/HomeScreen.tsx
```
Should return multiple matches (state declaration, setShowWelcome calls, JSX conditional).

3. Grep to confirm the old AppState listener for opening clip is gone:
```bash
grep -n "AppState.addEventListener" src/screens/HomeScreen.tsx
```
Should return 0 matches (it was the only AppState listener in this file).

4. Grep to confirm the flag is still used:
```bash
grep -n "opening_clip_played" src/screens/HomeScreen.tsx
```
Should return exactly 2 matches (the kvGet check and the kvSet in dismissWelcome).

If any verification fails, STOP and report.
