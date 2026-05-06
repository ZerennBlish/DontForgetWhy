# Update Welcome Overlay — Swipeable Slides + 26s Timing

**Scope:** `@src/screens/HomeScreen.tsx` only.

---

## Change 1 — Update auto-advance interval

Find the `setInterval` call inside the opening clip useEffect (search for `slideTimer = setInterval`). Change the interval value from `13000` to `6500` (26s clip ÷ 4 slides = 6.5s each). Update the comment above it to say `// Auto-advance slides every 6.5 seconds (4 slides × 6.5s = 26s clip)`.

---

## Change 2 — Add Dimensions import and scroll ref

Add `Dimensions` to the existing `react-native` import line (search for `from 'react-native'`) if it's not already there.

Near the existing `const dismissWelcomeRef` declaration, add:

```ts
const welcomeScrollRef = useRef<ScrollView>(null);
const screenWidth = Dimensions.get('window').width;
```

`ScrollView` is already imported from `react-native` as a component — the type reference will resolve.

---

## Change 3 — Sync auto-advance with scroll position

Replace the `setInterval` callback so it also scrolls the ScrollView. Find the current:

```ts
slideTimer = setInterval(() => {
  setWelcomeSlide((prev) => (prev < 3 ? prev + 1 : prev));
}, 13000);
```

Replace with:

```ts
slideTimer = setInterval(() => {
  setWelcomeSlide((prev) => {
    const next = prev < 3 ? prev + 1 : prev;
    if (next !== prev) {
      welcomeScrollRef.current?.scrollTo({ x: next * screenWidth, animated: true });
    }
    return next;
  });
}, 6500);
```

---

## Change 4 — Replace overlay content with horizontal ScrollView

Find the `{showWelcome && (` block in the JSX return. Replace EVERYTHING between `<View style={styles.welcomeOverlay}>` and the Skip button `<TouchableOpacity` (keep the skip button and closing tags) with:

```tsx
    <ScrollView
      ref={welcomeScrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onMomentumScrollEnd={(e) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
        setWelcomeSlide(index);
      }}
      style={StyleSheet.absoluteFill}
      contentContainerStyle={styles.welcomeScrollContent}
    >
      {WELCOME_SLIDES.map((slide, i) => (
        <View key={i} style={[styles.welcomeSlide, { width: screenWidth }]}>
          {/* Character image on slide 0 */}
          {i === 0 && (
            <Image
              source={require('../../assets/adaptive-icon.png')}
              style={styles.welcomeCharacter}
              resizeMode="contain"
            />
          )}

          {/* Icon row for slides 1-3 */}
          {i > 0 && (slide as any).icons && (
            <View style={styles.welcomeIconRow}>
              {((slide as any).icons as string[]).map((key: string) => {
                const iconSource: Record<string, any> = {
                  alarm: alarmIcon,
                  stopwatch: stopwatchIcon,
                  bell: bellIcon,
                  calendar: calendarIcon,
                  notepad: notepadIcon,
                  microphone: microphoneIcon,
                  gear: gearIcon,
                  gamepad: gamepadIcon,
                };
                return iconSource[key] ? (
                  <Image
                    key={key}
                    source={iconSource[key]}
                    style={styles.welcomeIcon}
                    resizeMode="contain"
                  />
                ) : null;
              })}
            </View>
          )}

          <Text style={styles.welcomeTitle}>{slide.title}</Text>
          <Text style={styles.welcomeSubtitle}>{slide.subtitle}</Text>
        </View>
      ))}
    </ScrollView>

    {/* Dot indicators — positioned absolutely over the scroll */}
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
```

---

## Change 5 — Update styles

In the StyleSheet, make these changes:

**Replace `welcomeOverlay`** — remove `justifyContent` and `alignItems` (the ScrollView handles layout now):
```ts
welcomeOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0, 0, 0, 0.92)',
  zIndex: 100,
},
```

**Replace `welcomeContent`** with these two new styles:
```ts
welcomeScrollContent: {
  alignItems: 'stretch',
},
welcomeSlide: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 40,
},
```

**Replace `welcomeDots`** — make it absolutely positioned:
```ts
welcomeDots: {
  position: 'absolute',
  bottom: 120,
  alignSelf: 'center',
  flexDirection: 'row',
  gap: 8,
},
```

All other welcome styles (`welcomeCharacter`, `welcomeIconRow`, `welcomeIcon`, `welcomeTitle`, `welcomeSubtitle`, `welcomeDot`, `welcomeDotActive`, `welcomeSkip`, `welcomeSkipText`) stay unchanged.

---

## Verification

1. `npx tsc --noEmit` — 0 errors
2. Grep confirms ScrollView ref:
```bash
grep -n "welcomeScrollRef" src/screens/HomeScreen.tsx
```
Should return 3+ matches (declaration, ref prop, scrollTo call).

3. Grep confirms new interval:
```bash
grep -n "6500" src/screens/HomeScreen.tsx
```
Should return 1 match (the setInterval call).

If any verification fails, STOP and report.
