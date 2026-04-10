import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ToastAndroid,
  PanResponder,
  type GestureResponderEvent,
} from 'react-native';
import {
  Canvas,
  Path,
  Fill,
  Skia,
  useCanvasRef,
  ImageFormat,
  Image as SkImage,
  useImage,
} from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import { File, Directory, Paths } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import APP_ICONS from '../data/appIconAssets';
import DrawingPickerModal from './DrawingPickerModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrokeData {
  pathSvg: string;
  color: string;
  strokeWidth: number;
}

interface DrawingCanvasProps {
  visible: boolean;
  onSave: (imageUri: string) => void;
  onCancel: () => void;
  initialStrokes?: StrokeData[];
  initialBgColor?: string;
  editingImageUri?: string | null;
  backgroundImageUri?: string | null;
  initialBackgroundImageUri?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PALETTE = [
  '#1A1A2E', // black
  '#FFFFFF', // white
  '#FF4444', // red
  '#4A90D9', // blue
  '#2D9B72', // green
  '#FF9F43', // orange
  '#6C5CE7', // purple
  '#FD79A8', // pink
];

const PALETTE_NAMES: Record<string, string> = {
  '#1A1A2E': 'Black',
  '#FFFFFF': 'White',
  '#FF4444': 'Red',
  '#4A90D9': 'Blue',
  '#2D9B72': 'Green',
  '#FF9F43': 'Orange',
  '#6C5CE7': 'Purple',
  '#FD79A8': 'Pink',
};

const WIDTH_ACCESSIBILITY_LABELS: Record<string, string> = {
  XS: 'Extra small brush',
  S: 'Small brush',
  M: 'Medium brush',
  L: 'Large brush',
};

const WIDTHS: { label: string; value: number }[] = [
  { label: 'XS', value: 1 },
  { label: 'S', value: 3 },
  { label: 'M', value: 6 },
  { label: 'L', value: 12 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DrawingCanvas({
  visible,
  onSave,
  onCancel,
  initialStrokes,
  initialBgColor,
  editingImageUri,
  backgroundImageUri = null,
  initialBackgroundImageUri = null,
}: DrawingCanvasProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const canvasRef = useCanvasRef();

  // Strokes stored as plain serializable data (SVG path strings)
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [activeColor, setActiveColor] = useState('#1A1A2E');
  const [activeWidth, setActiveWidth] = useState(3);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [canvasBgColor, setCanvasBgColor] = useState('#FFFFFF');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const bgImage = useImage(backgroundImageUri || null);

  const canvasReady = canvasSize.width > 1 && canvasSize.height > 1 && (!backgroundImageUri || bgImage !== null);

  // Render-tick forces Canvas to re-draw the in-progress stroke
  const [, setRenderTick] = useState(0);

  // Throttle the move-time renderTick to ~60fps. Pan events arrive faster
  // than the screen can repaint; without this, every event triggers a
  // React render even though the visible result is the same. The grant
  // (stroke-start) tick is NOT throttled — first feedback must be instant.
  const lastTickAtRef = useRef(0);

  // In-progress stroke: coordinate array for finalization + live SkPath for rendering
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const currentSkPathRef = useRef<SkPath | null>(null);
  const currentStrokeWidthRef = useRef(activeWidth);
  const currentColorRef = useRef(activeColor);

  // Refs for values accessed inside PanResponder (avoids stale closures)
  const activeColorRef = useRef(activeColor);
  const activeWidthRef = useRef(activeWidth);
  const activeToolRef = useRef(activeTool);
  const canvasBgColorRef = useRef(canvasBgColor);

  // Keep refs in sync with state
  activeColorRef.current = activeColor;
  activeWidthRef.current = activeWidth;
  activeToolRef.current = activeTool;
  canvasBgColorRef.current = canvasBgColor;

  // -----------------------------------------------------------------------
  // Load initial data when opening for edit
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!visible) return;
    if (initialStrokes && initialStrokes.length > 0) {
      setStrokes(initialStrokes);
    }
    if (initialBgColor) {
      setCanvasBgColor(initialBgColor);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------------------------------------------------
  // PanResponder — captures drawing touches
  // -----------------------------------------------------------------------

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { locationX, locationY, force } = evt.nativeEvent;

          const tool = activeToolRef.current;
          const baseWidth =
            tool === 'eraser'
              ? activeWidthRef.current * 3
              : activeWidthRef.current;

          // S Pen / pressure support: modulate width when pressure is reported
          const pressure =
            typeof force === 'number' && force > 0 ? force : 1;
          const finalWidth = Math.max(
            1,
            tool === 'eraser' ? baseWidth : baseWidth * pressure * 2,
          );

          currentPointsRef.current = [{ x: locationX, y: locationY }];
          const skPath = Skia.Path.Make();
          skPath.moveTo(locationX, locationY);
          currentSkPathRef.current = skPath;
          currentStrokeWidthRef.current = finalWidth;
          currentColorRef.current =
            tool === 'eraser' ? canvasBgColorRef.current : activeColorRef.current;
          lastTickAtRef.current = Date.now();
          setRenderTick((t) => t + 1);
        },

        onPanResponderMove: (evt: GestureResponderEvent) => {
          if (!currentSkPathRef.current) return;
          const { locationX, locationY } = evt.nativeEvent;
          currentPointsRef.current.push({ x: locationX, y: locationY });
          currentSkPathRef.current.lineTo(locationX, locationY);
          // Cap React renders at ~60fps so a fast pan doesn't queue
          // dozens of redundant renders per frame. The path keeps
          // growing in the ref between ticks; the next tick paints all
          // accumulated segments at once.
          const now = Date.now();
          if (now - lastTickAtRef.current >= 16) {
            lastTickAtRef.current = now;
            setRenderTick((t) => t + 1);
          }
        },

        onPanResponderRelease: () => {
          const path = currentSkPathRef.current;
          if (!path) return;

          const svgStr = path.toSVGString();
          setStrokes((prev) => [
            ...prev,
            {
              pathSvg: svgStr,
              color: currentColorRef.current,
              strokeWidth: currentStrokeWidthRef.current,
            },
          ]);
          currentPointsRef.current = [];
          currentSkPathRef.current = null;
        },
      }),
    [],
  );

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const resetCanvas = useCallback(() => {
    setStrokes([]);
    currentPointsRef.current = [];
    currentSkPathRef.current = null;
    setActiveColor('#1A1A2E');
    setActiveWidth(3);
    setActiveTool('pen');
    setCanvasBgColor('#FFFFFF');
  }, []);

  const handleUndo = useCallback(() => {
    hapticLight();
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    Alert.alert('Clear Canvas', 'Erase everything?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          hapticMedium();
          setStrokes([]);
          currentPointsRef.current = [];
          currentSkPathRef.current = null;
        },
      },
    ]);
  }, []);

  const handleDone = useCallback(async () => {
    if (!canvasReady) {
      ToastAndroid.show('Canvas still loading...', ToastAndroid.SHORT);
      return;
    }
    if (strokes.length === 0) {
      ToastAndroid.show("Draw something first. The canvas isn't going to fill itself.", ToastAndroid.SHORT);
      return;
    }
    try {
      const image = canvasRef.current?.makeImageSnapshot();
      if (!image) {
        ToastAndroid.show('Failed to capture drawing', ToastAndroid.SHORT);
        return;
      }

      const bytes = image.encodeToBytes(ImageFormat.PNG);

      let pngUri: string;

      if (editingImageUri) {
        // Write to temp cache — permanent save handled by NotepadScreen
        const dir = new Directory(Paths.cache, 'drawing-temp/');
        if (!dir.exists) {
          dir.create({ intermediates: true });
        }
        const shortId = uuidv4().split('-')[0];
        const baseName = `drawing_${Date.now()}_${shortId}`;
        const pngFile = new File(dir, `${baseName}.png`);
        pngFile.write(bytes);
        pngUri = pngFile.uri;

        const jsonFile = new File(dir, `${baseName}.json`);
        jsonFile.write(JSON.stringify({
          strokes,
          bgColor: canvasBgColor,
          sourceImageUri: backgroundImageUri || initialBackgroundImageUri || null,
        }));

        if (backgroundImageUri && !backgroundImageUri.includes('drawing-temp/')) {
          try {
            const sourceFile = new File(backgroundImageUri);
            if (sourceFile.exists) {
              const ext = backgroundImageUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
              const sourceFilename = `source_${Date.now()}_${uuidv4().split('-')[0]}.${ext}`;
              const sourceCopy = new File(dir, sourceFilename);
              sourceFile.copy(sourceCopy);
              jsonFile.write(JSON.stringify({
                strokes,
                bgColor: canvasBgColor,
                sourceImageUri: sourceCopy.uri,
              }));
            }
          } catch { /* best-effort */ }
        }
      } else {
        // New drawing — write to temp cache
        const dir = new Directory(Paths.cache, 'drawing-temp/');
        if (!dir.exists) {
          dir.create({ intermediates: true });
        }

        const shortId = uuidv4().split('-')[0];
        const baseName = `drawing_${Date.now()}_${shortId}`;
        const pngFile = new File(dir, `${baseName}.png`);
        pngFile.write(bytes);
        pngUri = pngFile.uri;

        // Save companion JSON with stroke data
        const jsonFile = new File(dir, `${baseName}.json`);
        jsonFile.write(JSON.stringify({
          strokes,
          bgColor: canvasBgColor,
          sourceImageUri: backgroundImageUri || initialBackgroundImageUri || null,
        }));

        if (backgroundImageUri && !backgroundImageUri.includes('drawing-temp/')) {
          try {
            const sourceFile = new File(backgroundImageUri);
            if (sourceFile.exists) {
              const ext = backgroundImageUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
              const sourceFilename = `source_${Date.now()}_${uuidv4().split('-')[0]}.${ext}`;
              const sourceCopy = new File(dir, sourceFilename);
              sourceFile.copy(sourceCopy);
              jsonFile.write(JSON.stringify({
                strokes,
                bgColor: canvasBgColor,
                sourceImageUri: sourceCopy.uri,
              }));
            }
          } catch { /* best-effort */ }
        }
      }

      onSave(pngUri);
      resetCanvas();
    } catch (error) {
      console.error('[DrawingCanvas] save failed:', error);
      ToastAndroid.show('Failed to save drawing', ToastAndroid.SHORT);
    }
  }, [canvasRef, onSave, resetCanvas, strokes, canvasBgColor, editingImageUri, backgroundImageUri, initialBackgroundImageUri, canvasReady]);

  const handleCancel = useCallback(() => {
    if (strokes.length > 0 || currentPointsRef.current.length > 0) {
      Alert.alert(
        'Discard Drawing?',
        'Your masterpiece will be lost forever. No pressure.',
        [
          { text: 'Keep Drawing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => { onCancel(); resetCanvas(); } },
        ],
      );
      return;
    }
    onCancel();
    resetCanvas();
  }, [onCancel, resetCanvas, strokes]);

  // -----------------------------------------------------------------------
  // Memoized parsed strokes — only rebuilds when strokes array changes
  // -----------------------------------------------------------------------

  const parsedStrokes = useMemo(
    () =>
      strokes
        .map((stroke) => ({
          ...stroke,
          skPath: Skia.Path.MakeFromSVGString(stroke.pathSvg),
        }))
        .filter((s): s is typeof s & { skPath: SkPath } => s.skPath !== null),
    [strokes],
  );

  // -----------------------------------------------------------------------
  // Derived values for current in-progress stroke rendering
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // Styles (depend on insets)
  // -----------------------------------------------------------------------

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: '#FFFFFF',
        },
        topBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 10,
          backgroundColor: colors.mode === 'dark' ? 'rgba(18, 18, 32, 0.95)' : 'rgba(240, 240, 248, 0.97)',
        },
        topBtn: {
          paddingHorizontal: 18,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1,
          borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        },
        topBtnText: {
          fontSize: 13,
          fontFamily: FONTS.bold,
          color: colors.textPrimary,
        },
        canvasWrapper: {
          flex: 1,
        },
        toolbar: {
          backgroundColor: colors.mode === 'dark' ? 'rgba(18, 18, 32, 0.95)' : 'rgba(240, 240, 248, 0.97)',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          gap: 12,
        },
        toolRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        toolBtn: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1,
          borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        },
        toolBtnActive: {
          borderColor: colors.accent,
          backgroundColor: colors.accent + '40',
        },
        toolBtnText: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
        },
        separator: {
          width: 1,
          height: 24,
          backgroundColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
          marginHorizontal: 4,
        },
        colorRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        colorDot: {
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: 'transparent',
        },
        colorDotActive: {
          borderColor: colors.accent,
        },
        widthBtn: {
          minWidth: 40,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1,
          borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
          alignItems: 'center',
        },
        widthBtnActive: {
          borderColor: colors.accent,
          backgroundColor: colors.accent + '40',
        },
        widthBtnText: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
        },
        bgBtnRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        bgPreview: {
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
        },
      }),
    [insets, colors],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.container} accessibilityViewIsModal={true}>
        {/* ---- Top bar ---- */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cancel drawing"
          >
            <Text style={styles.topBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topBtn}
            onPress={handleDone}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Save drawing"
          >
            <Text style={styles.topBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Canvas ---- */}
        <View
          style={styles.canvasWrapper}
          {...panResponder.panHandlers}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setCanvasSize({ width, height });
          }}
        >
          <Canvas ref={canvasRef} style={{ flex: 1 }}>
            {/* Background — photo or solid color, captured in snapshot */}
            {bgImage ? (
              <SkImage
                image={bgImage}
                x={0}
                y={0}
                width={canvasSize.width}
                height={canvasSize.height}
                fit="cover"
              />
            ) : (
              <Fill color={canvasBgColor} />
            )}

            {/* Completed strokes — memoized SkPath objects */}
            {parsedStrokes.map((stroke, i) => (
              <Path
                key={i}
                path={stroke.skPath}
                color={stroke.color}
                style="stroke"
                strokeWidth={stroke.strokeWidth}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}

            {/* In-progress stroke — incrementally built SkPath from ref */}
            {(() => {
              const path = currentSkPathRef.current;
              if (!path) return null;
              return (
                <Path
                  path={path}
                  color={currentColorRef.current}
                  style="stroke"
                  strokeWidth={currentStrokeWidthRef.current}
                  strokeCap="round"
                  strokeJoin="round"
                />
              );
            })()}
          </Canvas>
        </View>

        {/* ---- Bottom toolbar ---- */}
        <View style={styles.toolbar}>
          {/* Tools row: Pen, Eraser, separator, Undo, Clear */}
          <View style={styles.toolRow}>
            <TouchableOpacity
              style={[
                styles.toolBtn,
                activeTool === 'pen' && styles.toolBtnActive,
              ]}
              onPress={() => {
                hapticLight();
                setActiveTool('pen');
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Pen tool"
              accessibilityState={{ selected: activeTool === 'pen' }}
            >
              <Text style={styles.toolBtnText}>{'\u270F\uFE0F'} Pen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toolBtn,
                activeTool === 'eraser' && styles.toolBtnActive,
                !!backgroundImageUri && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (backgroundImageUri) {
                  ToastAndroid.show('Use undo to erase on photos', ToastAndroid.SHORT);
                  return;
                }
                hapticLight();
                setActiveTool('eraser');
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Eraser tool"
              accessibilityState={{ selected: activeTool === 'eraser' }}
            >
              <Text style={styles.toolBtnText}>
                {'\u{1FA79}'} Eraser
              </Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleUndo}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Undo"
            >
              <Text style={styles.toolBtnText}>{'\u21A9\uFE0F'} Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleClear}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Clear canvas"
            >
              <Text style={styles.toolBtnText}>{'\u{1F5D1}\uFE0F'} Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Color palette row */}
          <View style={styles.colorRow}>
            {PALETTE.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  color === '#FFFFFF' && {
                    borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.25)',
                  },
                  activeColor === color &&
                    activeTool === 'pen' &&
                    styles.colorDotActive,
                ]}
                onPress={() => {
                  hapticLight();
                  setActiveColor(color);
                  setActiveTool('pen');
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${PALETTE_NAMES[color] || color} color`}
                accessibilityState={{ selected: activeColor === color && activeTool === 'pen' }}
              />
            ))}
            {/* Custom color slot */}
            {customColor && (
              <TouchableOpacity
                style={[
                  styles.colorDot,
                  { backgroundColor: customColor },
                  activeColor === customColor &&
                    activeTool === 'pen' &&
                    !PALETTE.includes(activeColor) &&
                    styles.colorDotActive,
                ]}
                onPress={() => {
                  hapticLight();
                  setActiveColor(customColor);
                  setActiveTool('pen');
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Custom color ${customColor}`}
                accessibilityState={{ selected: activeColor === customColor && activeTool === 'pen' && !PALETTE.includes(activeColor) }}
              />
            )}
            {/* "+" picker button */}
            <TouchableOpacity
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.08)',
                borderWidth: 1,
                borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                hapticLight();
                setShowColorPicker(true);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Choose custom color"
            >
              <Image source={APP_ICONS.plus} style={{ width: 20, height: 20 }} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          {/* Stroke width + BG row */}
          <View style={styles.bgBtnRow}>
            {WIDTHS.map((w) => (
              <TouchableOpacity
                key={w.value}
                style={[
                  styles.widthBtn,
                  activeWidth === w.value && styles.widthBtnActive,
                ]}
                onPress={() => {
                  hapticLight();
                  setActiveWidth(w.value);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={WIDTH_ACCESSIBILITY_LABELS[w.label] || `${w.label} brush`}
                accessibilityState={{ selected: activeWidth === w.value }}
              >
                <Text style={styles.widthBtnText}>{w.label}</Text>
              </TouchableOpacity>
            ))}

            {!backgroundImageUri && (
              <>
                <View style={styles.separator} />

                <TouchableOpacity
                  style={[styles.toolBtn, { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 }]}
                  onPress={() => {
                    hapticLight();
                    setShowBgPicker(true);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Change canvas background"
                >
                  <View style={[styles.bgPreview, { backgroundColor: canvasBgColor }]} />
                  <Text style={styles.toolBtnText}>BG</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>

    <DrawingPickerModal
      visible={showColorPicker}
      title="Pick Drawing Color"
      initialColor={customColor || '#FF0000'}
      onApply={(hex) => {
        setCustomColor(hex);
        setActiveColor(hex);
        setActiveTool('pen');
      }}
      onCancel={() => setShowColorPicker(false)}
    />

    <DrawingPickerModal
      visible={showBgPicker}
      title="Canvas Background"
      initialColor={canvasBgColor}
      onApply={(hex) => setCanvasBgColor(hex)}
      onCancel={() => setShowBgPicker(false)}
    />
    </>
  );
}
