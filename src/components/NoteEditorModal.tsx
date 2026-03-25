import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ToastAndroid,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  Share,
} from 'react-native';
import * as Print from 'expo-print';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { NOTE_COLORS, NOTE_FONT_COLORS } from '../types/note';
import type { Note } from '../types/note';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import BackButton from './BackButton';

const MAX_NOTE_LENGTH = 999;

const EDITOR_PLACEHOLDERS = [
  'Type something before you forget... again.',
  'Your brain called. It wants backup.',
  'Future you will thank present you. Maybe.',
  'Quick, write it down before it\'s gone forever.',
  'If you\'re reading this, you already forgot something.',
  'Your memory has left the chat.',
];

function getTextColor(bgHex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(bgHex)) return '#FFFFFF';
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#1A1A2E' : '#FFFFFF';
}

const LINK_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)|([\w.-]+@[\w.-]+\.\w{2,})|((\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;

function renderLinkedText(
  text: string,
  baseStyle: any,
  linkColor: string,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(LINK_REGEX.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`t-${lastIndex}`} style={baseStyle}>
          {text.substring(lastIndex, match.index)}
        </Text>,
      );
    }

    let matched = match[0];
    let url: string;
    if (match[1]) {
      const trimmed = matched.replace(/[.,!?)\]]+$/, '');
      if (trimmed.length < matched.length) {
        regex.lastIndex -= matched.length - trimmed.length;
        matched = trimmed;
      }
      url = /^https?:\/\//i.test(matched) ? matched : `https://${matched}`;
    } else if (match[2]) {
      url = `mailto:${matched}`;
    } else {
      url = `tel:${matched.replace(/[^\d+]/g, '')}`;
    }

    parts.push(
      <Text
        key={`l-${match.index}`}
        style={[baseStyle, { color: linkColor, textDecorationLine: 'underline' as const }]}
        onPress={() => Linking.openURL(url).catch(() => {})}
      >
        {matched}
      </Text>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-${lastIndex}`} style={baseStyle}>
        {text.substring(lastIndex)}
      </Text>,
    );
  }

  return parts.length > 0 ? parts : [<Text key="full" style={baseStyle}>{text}</Text>];
}

interface NoteEditorModalProps {
  visible: boolean;
  note: Note | null;
  customBgColor: string | null;
  customFontColor: string | null;
  onSave: (note: { text: string; color: string; fontColor: string | null; icon: string; isNew: boolean; noteId?: string }) => void;
  onDelete: (noteId: string) => void;
  onClose: () => void;
  onCustomBgColorChange: (color: string) => void;
  onCustomFontColorChange: (color: string) => void;
}

export default function NoteEditorModal({
  visible,
  note,
  customBgColor,
  customFontColor,
  onSave,
  onDelete,
  onClose,
  onCustomBgColorChange,
  onCustomFontColorChange,
}: NoteEditorModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [editorText, setEditorText] = useState('');
  const [editorColor, setEditorColor] = useState(NOTE_COLORS[0]);
  const [editorIcon, setEditorIcon] = useState('');
  const [editorFontColor, setEditorFontColor] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editorPlaceholder, setEditorPlaceholder] = useState(EDITOR_PLACEHOLDERS[0]);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);

  const pickedBgRef = useRef(customBgColor || '#4A90D9');
  const pickedFontRef = useRef(customFontColor || '#FF6B6B');
  const textInputRef = useRef<TextInput>(null);
  const emojiInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      setShowColorPicker(false);
      setShowEmojiPicker(false);
      setShowBgPicker(false);
      setShowFontPicker(false);
      return;
    }
    if (note) {
      setEditorText(note.text);
      setEditorColor(note.color);
      setEditorIcon(note.icon);
      setEditorFontColor(note.fontColor ?? null);
      setIsViewMode(true);
    } else {
      setEditorText('');
      setEditorColor(colors.background);
      setEditorIcon('');
      setEditorFontColor(null);
      setIsViewMode(false);
    }
    setEditorPlaceholder(EDITOR_PLACEHOLDERS[Math.floor(Math.random() * EDITOR_PLACEHOLDERS.length)]);
    pickedBgRef.current = customBgColor || '#4A90D9';
    pickedFontRef.current = customFontColor || '#FF6B6B';
  }, [visible, note]);

  const noteTextColor = getTextColor(editorColor);
  const resolvedFontColor = editorFontColor || noteTextColor;

  const hasUnsavedChanges = (): boolean => {
    if (note) {
      return (
        editorText !== note.text ||
        editorColor !== note.color ||
        editorIcon !== note.icon ||
        editorFontColor !== (note.fontColor ?? null)
      );
    }
    return editorText.trim().length > 0;
  };

  const confirmClose = () => {
    if (!hasUnsavedChanges()) {
      onClose();
      return;
    }
    Keyboard.dismiss();
    Alert.alert(
      'Leaving Already?',
      "You've got unsaved changes. Walk away and they're gone forever. Just like your memory.",
      [
        { text: 'Go Back to Editing', style: 'cancel' },
        { text: 'Abandon Note', style: 'destructive', onPress: onClose },
      ],
    );
  };

  const handleSave = () => {
    hapticMedium();
    const trimmed = editorText.trim();
    if (!trimmed) {
      ToastAndroid.show('Write something down before you forget. Oh wait, too late.', ToastAndroid.LONG);
      return;
    }
    onSave({
      text: trimmed,
      color: editorColor,
      fontColor: editorFontColor,
      icon: editorIcon,
      isNew: !note,
      noteId: note?.id,
    });
  };

  const handleDeleteFromEditor = () => {
    if (!note) return;
    onDelete(note.id);
  };

  const styles = useMemo(() => StyleSheet.create({
    editorContainer: {
      flex: 1,
    },
    editorTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    topBarLeft: {
      flex: 1,
    },
    topBarCenter: {
      flex: 1,
      alignItems: 'center',
    },
    topBarRight: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    topBarContentPad: {
      height: insets.top + 58,
    },
    editorTopBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(30, 30, 40, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    editorTopBtnActive: {
      borderColor: colors.accent,
      backgroundColor: 'rgba(30, 30, 40, 0.85)',
    },
    editorTopBtnEmoji: {
      fontSize: 18,
    },
    editorColorIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    editorTrashBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(30, 30, 40, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.red + '40',
    },
    editorTrashIcon: {
      fontSize: 18,
    },
    editorInputArea: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    editorInput: {
      flex: 1,
      fontSize: 18,
      color: colors.textPrimary,
      textAlignVertical: 'top',
      lineHeight: 28,
    },
    charCount: {
      fontSize: 11,
      color: colors.textTertiary,
      textAlign: 'right',
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    pickerOverlay: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12 + insets.bottom,
      maxHeight: 280,
    },
    pickerTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      marginBottom: 10,
    },
    colorRow: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    },
    colorDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorDotSelected: {
      borderWidth: 3,
      borderColor: colors.textPrimary,
    },
    colorCheck: {
      fontSize: 16,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    fontColorRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
      marginTop: 12,
    },
    fontColorDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fontColorDotSelected: {
      borderWidth: 2.5,
      borderColor: colors.textPrimary,
    },
    fontColorCheck: {
      fontSize: 12,
      fontWeight: '700',
    },
    pickerRowLabel: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 6,
    },
    cpOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    cpCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cpTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 20,
    },
    cpWrapper: {
      gap: 16,
    },
    cpBtns: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    cpCancelBtn: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cpCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    cpSaveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    cpSaveText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  }), [colors, insets.bottom]);

  return (
    <>
      {/* Editor Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={confirmClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView style={[styles.editorContainer, { backgroundColor: editorColor }]} contentContainerStyle={{ flex: 1 }} keyboardShouldPersistTaps="handled" scrollEnabled={false}>

          {/* Top bar */}
          <View style={styles.editorTopBar}>
            <View style={styles.topBarLeft}>
              <BackButton onPress={confirmClose} />
            </View>
            {isViewMode ? (
              <>
                <View style={styles.topBarCenter} />
                <View style={styles.topBarRight}>
                  <TouchableOpacity
                    style={styles.editorTopBtn}
                    onPress={() => { hapticLight(); setIsViewMode(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16 }}>{'\u270F\uFE0F'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editorTopBtn}
                    onPress={() => {
                      hapticLight();
                      Alert.alert('Share Note', '', [
                        {
                          text: 'Share',
                          onPress: () => {
                            if (!editorText.trim()) {
                              ToastAndroid.show('Nothing to share', ToastAndroid.SHORT);
                              return;
                            }
                            const content = editorIcon ? `${editorIcon} ${editorText}` : editorText;
                            Share.share({ message: content });
                          },
                        },
                        {
                          text: 'Print',
                          onPress: () => {
                            if (!editorText.trim()) {
                              ToastAndroid.show('Nothing to print', ToastAndroid.SHORT);
                              return;
                            }
                            const iconHtml = editorIcon ? `<div style="font-size:48px;margin-bottom:16px;">${editorIcon}</div>` : '';
                            const html = `<html><head><style>@page { size: letter; margin: 0.75in; }</style></head><body style="background:${editorColor};color:${noteTextColor};font-family:system-ui;padding:40px;">${iconHtml}<pre style="white-space:pre-wrap;font-family:system-ui;font-size:16px;color:${noteTextColor};margin:0;">${editorText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`;
                            Print.printAsync({ html });
                          },
                        },
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16 }}>{'\u{1F4E4}'}</Text>
                  </TouchableOpacity>
                  {note && (
                    <TouchableOpacity
                      style={styles.editorTrashBtn}
                      onPress={handleDeleteFromEditor}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editorTrashIcon}>{'\u{1F5D1}\uFE0F'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.topBarCenter}>
                  <TouchableOpacity
                    style={{ backgroundColor: 'rgba(30, 30, 40, 0.7)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 6, minWidth: 100, alignItems: 'center', justifyContent: 'center' }}
                    onPress={handleSave}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Save</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.topBarRight}>
                  <TouchableOpacity
                    style={[styles.editorTopBtn, showEmojiPicker && styles.editorTopBtnActive]}
                    onPress={() => {
                      hapticLight();
                      Keyboard.dismiss();
                      setShowColorPicker(false);
                      setShowEmojiPicker((v) => !v);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editorTopBtnEmoji}>{editorIcon || '\u{1F600}'}</Text>
                  </TouchableOpacity>
                  <TextInput
                    ref={emojiInputRef}
                    style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
                    autoCorrect={false}
                    onChangeText={(t) => {
                      if (t) {
                        const graphemes = [...t];
                        setEditorIcon(graphemes[graphemes.length - 1] || '');
                      }
                      setShowEmojiPicker(false);
                      if (emojiInputRef.current) {
                        emojiInputRef.current.setNativeProps({ text: '' });
                        emojiInputRef.current.blur();
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.editorTopBtn, showColorPicker && styles.editorTopBtnActive]}
                    onPress={() => {
                      hapticLight();
                      Keyboard.dismiss();
                      setShowEmojiPicker(false);
                      setShowColorPicker((v) => !v);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.editorColorIndicator, { backgroundColor: editorColor, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.25)' }]} />
                  </TouchableOpacity>
                  {note && (
                    <TouchableOpacity
                      style={styles.editorTrashBtn}
                      onPress={handleDeleteFromEditor}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editorTrashIcon}>{'\u{1F5D1}\uFE0F'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Spacer so content clears the floating top bar */}
          <View style={styles.topBarContentPad} />

          {/* Emoji quick-pick row */}
          {showEmojiPicker && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 8, paddingVertical: 8 }}>
              {['\u{1F4DD}', '\u{1F4CC}', '\u{1F4A1}', '\u2B50', '\u2764\uFE0F', '\u{1F3AF}', '\u{1F4C5}', '\u{1F514}'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    hapticLight();
                    if (editorIcon === emoji) {
                      setEditorIcon('');
                    } else {
                      setEditorIcon(emoji);
                      setShowEmojiPicker(false);
                    }
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: editorIcon === emoji ? 'rgba(30, 30, 40, 0.85)' : 'rgba(30, 30, 40, 0.7)',
                    borderWidth: 1,
                    borderColor: editorIcon === emoji ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => { hapticLight(); emojiInputRef.current?.focus(); }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(30, 30, 40, 0.7)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.6)' }}>+</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Hero text area */}
          {isViewMode ? (
            <ScrollView style={styles.editorInputArea} contentContainerStyle={{ paddingBottom: 20 }}>
              {editorIcon ? <Text style={{ fontSize: 28, marginBottom: 8 }}>{editorIcon}</Text> : null}
              <Text style={[styles.editorInput, { color: resolvedFontColor }]}>
                {renderLinkedText(editorText, [styles.editorInput, { color: resolvedFontColor }], getTextColor(editorColor) === '#FFFFFF' ? '#48DBFB' : '#0066CC')}
              </Text>
            </ScrollView>
          ) : (
            <View style={styles.editorInputArea}>
              <TextInput
                ref={textInputRef}
                style={[styles.editorInput, { color: resolvedFontColor }]}
                value={editorText}
                onChangeText={setEditorText}
                placeholder={editorPlaceholder}
                placeholderTextColor={resolvedFontColor + '80'}
                multiline
                maxLength={MAX_NOTE_LENGTH}
                textAlignVertical="top"
                autoFocus={!note}
                onFocus={() => {
                  setShowColorPicker(false);
                  setShowEmojiPicker(false);
                }}
              />
            </View>
          )}

          {!isViewMode && (
            <Text style={[
              styles.charCount,
              { color: resolvedFontColor + '99' },
              editorText.length >= 490 ? { color: colors.red } :
              editorText.length >= 450 ? { color: colors.orange } : undefined,
            ]}>{editorText.length}/{MAX_NOTE_LENGTH}</Text>
          )}

          {/* Color picker overlay */}
          {showColorPicker && (
            <View style={[styles.pickerOverlay, { backgroundColor: editorColor, borderTopColor: noteTextColor + '20' }]}>
              <Text style={[styles.pickerRowLabel, { color: noteTextColor + '99' }]}>Background</Text>
              <View style={styles.colorRow}>
                {NOTE_COLORS.filter((c) => c !== 'custom').map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      editorColor === c && styles.colorDotSelected,
                    ]}
                    onPress={() => { hapticLight(); setEditorColor(c); }}
                    activeOpacity={0.7}
                  >
                    {editorColor === c && <Text style={[styles.colorCheck, { color: getTextColor(c) }]}>{'\u2713'}</Text>}
                  </TouchableOpacity>
                ))}
                {/* Custom color slot */}
                {(() => {
                  const isCustomBgSelected = !!customBgColor && editorColor === customBgColor && !NOTE_COLORS.slice(0, -1).includes(editorColor);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.colorDot,
                        customBgColor
                          ? { backgroundColor: customBgColor }
                          : { borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.2)', borderStyle: 'dashed' as const, backgroundColor: 'rgba(30, 30, 40, 0.5)' },
                        isCustomBgSelected && styles.colorDotSelected,
                      ]}
                      onPress={() => {
                        hapticLight();
                        if (customBgColor) {
                          setEditorColor(customBgColor);
                        } else {
                          pickedBgRef.current = '#4A90D9';
                          setShowBgPicker(true);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      {isCustomBgSelected && <Text style={[styles.colorCheck, { color: getTextColor(customBgColor!) }]}>{'\u2713'}</Text>}
                    </TouchableOpacity>
                  );
                })()}
                {/* Picker button */}
                <TouchableOpacity
                  style={[styles.colorDot, { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', backgroundColor: 'rgba(30, 30, 40, 0.7)' }]}
                  onPress={() => {
                    hapticLight();
                    pickedBgRef.current = customBgColor || '#4A90D9';
                    setShowBgPicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: 'rgba(255, 255, 255, 0.6)' }}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.pickerRowLabel, { color: resolvedFontColor, marginTop: 14 }]}>A  Text Color</Text>
              <View style={styles.fontColorRow}>
                {NOTE_FONT_COLORS.filter((fc) => fc !== 'custom').map((fc) => {
                  const isAuto = fc === 'auto';
                  const isSelected = isAuto ? !editorFontColor : editorFontColor === fc;
                  const dotBg = isAuto ? undefined : fc;
                  return (
                    <TouchableOpacity
                      key={fc}
                      style={[
                        styles.fontColorDot,
                        isAuto ? { borderWidth: 1.5, borderColor: noteTextColor + '50', overflow: 'hidden' as const } : { backgroundColor: dotBg },
                        isSelected && styles.fontColorDotSelected,
                      ]}
                      onPress={() => { hapticLight(); setEditorFontColor(isAuto ? null : fc); }}
                      activeOpacity={0.7}
                    >
                      {isAuto ? (
                        <View style={{ flexDirection: 'row', flex: 1, width: '100%', height: '100%' }}>
                          <View style={{ flex: 1, backgroundColor: '#1A1A2E' }} />
                          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
                        </View>
                      ) : isSelected ? (
                        <Text style={[styles.fontColorCheck, { color: getTextColor(fc) }]}>{'\u2713'}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
                {/* Custom font color slot */}
                {(() => {
                  const isCustomFcSelected = !!customFontColor && editorFontColor === customFontColor && !NOTE_FONT_COLORS.slice(0, -1).filter(x => x !== 'auto').includes(editorFontColor!);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.fontColorDot,
                        customFontColor
                          ? { backgroundColor: customFontColor }
                          : { borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.2)', borderStyle: 'dashed' as const, backgroundColor: 'rgba(30, 30, 40, 0.5)' },
                        isCustomFcSelected && styles.fontColorDotSelected,
                      ]}
                      onPress={() => {
                        hapticLight();
                        if (customFontColor) {
                          setEditorFontColor(customFontColor);
                        } else {
                          pickedFontRef.current = '#FF6B6B';
                          setShowFontPicker(true);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      {isCustomFcSelected && <Text style={[styles.fontColorCheck, { color: getTextColor(customFontColor!) }]}>{'\u2713'}</Text>}
                    </TouchableOpacity>
                  );
                })()}
                {/* Font picker button */}
                <TouchableOpacity
                  style={[styles.fontColorDot, { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', backgroundColor: 'rgba(30, 30, 40, 0.7)' }]}
                  onPress={() => {
                    hapticLight();
                    pickedFontRef.current = customFontColor || '#FF6B6B';
                    setShowFontPicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255, 255, 255, 0.6)' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}


        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom BG Color Picker Modal */}
      <Modal transparent visible={showBgPicker} animationType="fade">
        <View style={styles.cpOverlay}>
          <View style={styles.cpCard}>
            <Text style={styles.cpTitle}>Pick Background Color</Text>
            <ColorPicker
              value={pickedBgRef.current}
              onCompleteJS={(result: ColorFormatsObject) => { pickedBgRef.current = result.hex; }}
            >
              <View style={styles.cpWrapper}>
                <Preview hideInitialColor />
                <Panel1 />
                <HueSlider />
              </View>
            </ColorPicker>
            <View style={styles.cpBtns}>
              <TouchableOpacity
                onPress={() => { hapticLight(); setShowBgPicker(false); }}
                style={styles.cpCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  hapticMedium();
                  const hex = pickedBgRef.current;
                  onCustomBgColorChange(hex);
                  setEditorColor(hex);
                  setShowBgPicker(false);
                }}
                style={styles.cpSaveBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cpSaveText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Font Color Picker Modal */}
      <Modal transparent visible={showFontPicker} animationType="fade">
        <View style={styles.cpOverlay}>
          <View style={styles.cpCard}>
            <Text style={styles.cpTitle}>Pick Text Color</Text>
            <ColorPicker
              value={pickedFontRef.current}
              onCompleteJS={(result: ColorFormatsObject) => { pickedFontRef.current = result.hex; }}
            >
              <View style={styles.cpWrapper}>
                <Preview hideInitialColor />
                <Panel1 />
                <HueSlider />
              </View>
            </ColorPicker>
            <View style={styles.cpBtns}>
              <TouchableOpacity
                onPress={() => { hapticLight(); setShowFontPicker(false); }}
                style={styles.cpCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  hapticMedium();
                  const hex = pickedFontRef.current;
                  onCustomFontColorChange(hex);
                  setEditorFontColor(hex);
                  setShowFontPicker(false);
                }}
                style={styles.cpSaveBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cpSaveText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
