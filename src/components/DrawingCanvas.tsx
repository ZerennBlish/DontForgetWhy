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
} from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import { File, Directory, Paths } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '../utils/haptics';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';

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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPathFromPoints(points: { x: number; y: number }[]): SkPath | null {
  if (points.length === 0) return null;
  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }
  return path;
}

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
}: DrawingCanvasProps) {
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

  // Render-tick forces Canvas to re-draw the in-progress stroke
  const [, setRenderTick] = useState(0);

  // In-progress stroke stored as coordinate array (no native SkPath in state)
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const currentStrokeWidthRef = useRef(activeWidth);
  const currentColorRef = useRef(activeColor);

  const pickedColorRef = useRef('#FF0000');
  const pickedBgRef = useRef('#FFFFFF');

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
          currentStrokeWidthRef.current = finalWidth;
          currentColorRef.current =
            tool === 'eraser' ? canvasBgColorRef.current : activeColorRef.current;
          setRenderTick((t) => t + 1);
        },

        onPanResponderMove: (evt: GestureResponderEvent) => {
          if (currentPointsRef.current.length === 0) return;
          const { locationX, locationY } = evt.nativeEvent;
          currentPointsRef.current.push({ x: locationX, y: locationY });
          setRenderTick((t) => t + 1);
        },

        onPanResponderRelease: () => {
          const pts = currentPointsRef.current;
          if (pts.length === 0) return;

          const path = buildPathFromPoints(pts);
          if (path) {
            const svgStr = path.toSVGString();
            setStrokes((prev) => [
              ...prev,
              {
                pathSvg: svgStr,
                color: currentColorRef.current,
                strokeWidth: currentStrokeWidthRef.current,
              },
            ]);
          }
          currentPointsRef.current = [];
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
        },
      },
    ]);
  }, []);

  const handleDone = useCallback(async () => {
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
        jsonFile.write(JSON.stringify({ strokes, bgColor: canvasBgColor }));
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
        jsonFile.write(JSON.stringify({ strokes, bgColor: canvasBgColor }));
      }

      onSave(pngUri);
      resetCanvas();
    } catch (error) {
      console.error('[DrawingCanvas] save failed:', error);
      ToastAndroid.show('Failed to save drawing', ToastAndroid.SHORT);
    }
  }, [canvasRef, onSave, resetCanvas, strokes, canvasBgColor, editingImageUri]);

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

  const currentColor =
    activeTool === 'eraser' ? canvasBgColor : activeColor;

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
          backgroundColor: 'rgba(18, 18, 32, 0.95)',
        },
        topBtn: {
          paddingHorizontal: 18,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: 'rgba(30, 30, 40, 0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        topBtnText: {
          fontSize: 14,
          fontWeight: '700',
          color: '#FFFFFF',
        },
        canvasWrapper: {
          flex: 1,
        },
        toolbar: {
          backgroundColor: 'rgba(18, 18, 32, 0.95)',
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
          backgroundColor: 'rgba(30, 30, 40, 0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        toolBtnActive: {
          borderColor: '#4A90D9',
          backgroundColor: 'rgba(74, 144, 217, 0.25)',
        },
        toolBtnText: {
          fontSize: 13,
          fontWeight: '600',
          color: '#FFFFFF',
        },
        separator: {
          width: 1,
          height: 24,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
          borderColor: '#4A90D9',
        },
        widthRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        widthBtn: {
          minWidth: 40,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: 'rgba(30, 30, 40, 0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          alignItems: 'center',
        },
        widthBtnActive: {
          borderColor: '#4A90D9',
          backgroundColor: 'rgba(74, 144, 217, 0.25)',
        },
        widthBtnText: {
          fontSize: 12,
          fontWeight: '600',
          color: '#FFFFFF',
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
          borderColor: 'rgba(255, 255, 255, 0.3)',
        },
      }),
    [insets],
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
      <View style={styles.container}>
        {/* ---- Top bar ---- */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.topBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topBtn}
            onPress={handleDone}
            activeOpacity={0.7}
          >
            <Text style={styles.topBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Canvas ---- */}
        <View style={styles.canvasWrapper} {...panResponder.panHandlers}>
          <Canvas ref={canvasRef} style={{ flex: 1 }}>
            {/* Background — captured in snapshot */}
            <Fill color={canvasBgColor} />

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

            {/* In-progress stroke — SkPath built at render time from points */}
            {(() => {
              const pts = currentPointsRef.current;
              if (pts.length === 0) return null;
              const path = buildPathFromPoints(pts);
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
            >
              <Text style={styles.toolBtnText}>{'\u270F\uFE0F'} Pen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toolBtn,
                activeTool === 'eraser' && styles.toolBtnActive,
              ]}
              onPress={() => {
                hapticLight();
                setActiveTool('eraser');
              }}
              activeOpacity={0.7}
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
            >
              <Text style={styles.toolBtnText}>{'\u21A9\uFE0F'} Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleClear}
              activeOpacity={0.7}
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
                    borderColor: 'rgba(255, 255, 255, 0.4)',
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
              />
            )}
            {/* "+" picker button */}
            <TouchableOpacity
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: 'rgba(30, 30, 40, 0.7)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                hapticLight();
                pickedColorRef.current = customColor || '#FF0000';
                setShowColorPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: 'rgba(255, 255, 255, 0.6)' }}>+</Text>
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
              >
                <Text style={styles.widthBtnText}>{w.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.separator} />

            <TouchableOpacity
              style={[styles.toolBtn, { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 }]}
              onPress={() => {
                hapticLight();
                pickedBgRef.current = canvasBgColor;
                setShowBgPicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.bgPreview, { backgroundColor: canvasBgColor }]} />
              <Text style={styles.toolBtnText}>BG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Custom Color Picker Modal */}
    <Modal transparent visible={showColorPicker} animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: 'rgba(30, 30, 40, 0.95)', borderRadius: 16, padding: 20, marginHorizontal: 32, width: '85%' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' }}>Pick Drawing Color</Text>
          <ColorPicker
            value={pickedColorRef.current}
            onCompleteJS={(result: ColorFormatsObject) => { pickedColorRef.current = result.hex; }}
          >
            <View style={{ gap: 16 }}>
              <Preview hideInitialColor />
              <Panel1 />
              <HueSlider />
            </View>
          </ColorPicker>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => { hapticLight(); setShowColorPicker(false); }}
              style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                hapticMedium();
                const hex = pickedColorRef.current;
                setCustomColor(hex);
                setActiveColor(hex);
                setActiveTool('pen');
                setShowColorPicker(false);
              }}
              style={{ flex: 1, backgroundColor: '#4A90D9', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Canvas Background Picker Modal */}
    <Modal transparent visible={showBgPicker} animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: 'rgba(30, 30, 40, 0.95)', borderRadius: 16, padding: 20, marginHorizontal: 32, width: '85%' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' }}>Canvas Background</Text>
          <ColorPicker
            value={pickedBgRef.current}
            onCompleteJS={(result: ColorFormatsObject) => { pickedBgRef.current = result.hex; }}
          >
            <View style={{ gap: 16 }}>
              <Preview hideInitialColor />
              <Panel1 />
              <HueSlider />
            </View>
          </ColorPicker>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => { hapticLight(); setShowBgPicker(false); }}
              style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                hapticMedium();
                setCanvasBgColor(pickedBgRef.current);
                setShowBgPicker(false);
              }}
              style={{ flex: 1, backgroundColor: '#4A90D9', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}
