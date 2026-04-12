import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, ScrollView,
  ToastAndroid, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import type { Note } from '../types/note';
import DrawingCanvas from './DrawingCanvas';
import ShareNoteModal from './ShareNoteModal';
import ImageLightbox from './ImageLightbox';
import { renderLinkedText } from '../utils/linkedText';
import { MemoCard, voiceMemoStyles } from './NoteVoiceMemo';
import ColorPickerModal from './ColorPickerModal';
import NoteEditorTopBar from './NoteEditorTopBar';
import NoteEditorToolbar from './NoteEditorToolbar';
import NoteColorPicker from './NoteColorPicker';
import NoteImageStrip from './NoteImageStrip';
import { useNoteEditor } from '../hooks/useNoteEditor';

interface NoteEditorModalProps {
  visible: boolean;  note: Note | null;
  customBgColor: string | null;  customFontColor: string | null;
  onSave: (note: { text: string; color: string; fontColor: string | null; icon: string; isNew: boolean; noteId?: string; images: string[]; voiceMemos: string[] }) => void;
  onDelete: (noteId: string) => void;  onClose: () => void;
  onCustomBgColorChange: (color: string) => void;  onCustomFontColorChange: (color: string) => void;
  dirtyRef?: React.MutableRefObject<boolean>;
}
export default function NoteEditorModal({
  visible, note, customBgColor, customFontColor,
  onSave, onDelete, onClose,
  onCustomBgColorChange, onCustomFontColorChange, dirtyRef,
}: NoteEditorModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const editor = useNoteEditor({
    visible, note, customBgColor, customFontColor,
    onSave, onDelete, onClose,
    onCustomBgColorChange, onCustomFontColorChange, dirtyRef,
  });

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    topBarPad: { height: insets.top + 58 },
    inputArea: { paddingHorizontal: 20, paddingTop: 8 },
    input: { fontSize: 18, color: colors.textPrimary, textAlignVertical: 'top', lineHeight: 28 },
    attachmentsPanel: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
  }), [colors, insets.top]);

  const linkedText = useMemo(() => {
    if (!editor.isViewMode) return null;
    return renderLinkedText(editor.editorText, [styles.input, { color: editor.resolvedFontColor }], editor.linkColor);
  }, [editor.isViewMode, editor.editorText, styles.input, editor.resolvedFontColor, editor.linkColor]);

  const voiceMemoBlock = editor.editorVoiceMemos.length > 0 && (
    <View style={[voiceMemoStyles.memoRow, { paddingBottom: 8 }]}>
      {editor.editorVoiceMemos.map((memoUri, idx) => {
        const isActive = editor.activePlayerUri === memoUri;
        return (
          <MemoCard
            key={`memo-${idx}`}
            isActive={isActive}
            isPlaying={isActive && editor.playerStatus.playing}
            currentTime={isActive ? editor.playerStatus.currentTime : 0}
            duration={isActive && editor.playerStatus.duration > 0 ? editor.playerStatus.duration : 0}
            accentColor={colors.accent}
            isViewMode={editor.isViewMode}
            onPlay={() => editor.handlePlayMemo(memoUri)}
            onSeek={(e, dur) => editor.handleSeek(e, dur)}
            onDelete={() => {
              hapticLight();
              if (editor.activePlayerUri === memoUri) {
                try { editor.player.pause(); } catch { /* */ }
                editor.setActivePlayerUri(null);
              }
              editor.setEditorVoiceMemos((prev) => prev.filter((_, i) => i !== idx));
            }}
            onProgressLayout={(w) => { editor.progressBarWidthRef.current = w; }}
          />
        );
      })}
    </View>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={() => {
        if (editor.showAttachments) { editor.setShowAttachments(false); return; }
        if (editor.showColorPicker) { editor.setShowColorPicker(false); return; }
        editor.confirmClose();
      }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.container, { backgroundColor: editor.editorColor }]}>

            <NoteEditorTopBar
              isViewMode={editor.isViewMode}
              hasChanges={editor.hasUnsavedChanges()}
              hasNote={!!note}
              onBack={editor.confirmClose}
              onHome={editor.handleGoHome}
              onEdit={() => editor.setIsViewMode(false)}
              onSave={editor.handleSave}
              onShare={editor.handleShare}
              onDelete={editor.handleDeleteFromEditor}
            />
            <View style={styles.topBarPad} />

            {/* Content area */}
            <View style={{ flex: 1 }}>
              {editor.isViewMode ? (
                <ScrollView
                  style={styles.inputArea}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {editor.editorIcon ? <Text style={{ fontSize: 28, marginBottom: 8 }}>{editor.editorIcon}</Text> : null}
                  <Text style={[styles.input, { color: editor.resolvedFontColor }]}>{linkedText}</Text>
                  {editor.editorImages.length > 0 && (
                    <NoteImageStrip
                      images={editor.editorImages}
                      isViewMode
                      onRemoveImage={() => {}}
                      onViewImage={(uri) => editor.setLightboxUri(uri)}
                      onEditDrawing={() => {}}
                      onDrawOnPhoto={() => {}}
                    />
                  )}
                  {voiceMemoBlock}
                </ScrollView>
              ) : (
                <View style={[styles.inputArea, { flex: 1 }]}>
                  <TextInput
                    ref={editor.textInputRef}
                    style={[styles.input, { color: editor.resolvedFontColor, flex: 1 }]}
                    value={editor.editorText}
                    onChangeText={editor.setEditorText}
                    placeholder={editor.editorPlaceholder}
                    placeholderTextColor={editor.resolvedFontColor + '80'}
                    multiline
                    textAlignVertical="top"
                    autoFocus={!note}
                    onFocus={() => { editor.dismissColorPicker(); editor.dismissAttachments(); }}
                  />
                </View>
              )}
            </View>

            {/* Attachments panel — edit mode only, above toolbar */}
            {!editor.isViewMode && editor.showAttachments && (
              <View style={styles.attachmentsPanel}>
                {editor.editorImages.length > 0 && (
                  <NoteImageStrip
                    images={editor.editorImages}
                    isViewMode={false}
                    onRemoveImage={(idx) => editor.setEditorImages((imgs) => imgs.filter((_, i) => i !== idx))}
                    onViewImage={(uri) => editor.setLightboxUri(uri)}
                    onEditDrawing={(uri, data) => { editor.setEditingDrawingData(data); editor.setEditingImageUri(uri); editor.setShowDrawing(true); }}
                    onDrawOnPhoto={(uri) => { editor.setEditingDrawingData(null); editor.setEditingImageUri(uri); editor.setShowDrawing(true); }}
                  />
                )}
                {voiceMemoBlock}
              </View>
            )}

            {editor.showColorPicker && (
              <NoteColorPicker
                editorColor={editor.editorColor}
                onSelectBgColor={(c) => editor.setEditorColor(c)}
                editorFontColor={editor.editorFontColor}
                onSelectFontColor={(fc) => editor.setEditorFontColor(fc)}
                customBgColor={customBgColor}
                customFontColor={customFontColor}
                onOpenBgPicker={() => { editor.pickedBgRef.current = customBgColor || '#4A90D9'; editor.setShowBgPicker(true); }}
                onOpenFontPicker={() => { editor.pickedFontRef.current = customFontColor || '#FF6B6B'; editor.setShowFontPicker(true); }}
                onApplyCustomBg={() => { if (customBgColor) editor.setEditorColor(customBgColor); }}
                onApplyCustomFont={() => { if (customFontColor) editor.setEditorFontColor(customFontColor); }}
                noteTextColor={editor.noteTextColor}
                resolvedFontColor={editor.resolvedFontColor}
              />
            )}

            {!editor.isViewMode && (
              <NoteEditorToolbar
                onToggleAttachments={editor.toggleAttachments}
                attachmentsActive={editor.showAttachments}
                onCamera={editor.takePhoto}
                onGallery={editor.pickImage}
                onDraw={editor.handleDraw}
                onToggleColors={editor.handleToggleColors}
                colorsActive={editor.showColorPicker}
                attachmentCount={editor.editorImages.length + editor.editorVoiceMemos.length}
                maxAttachments={5}
              />
            )}

          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ColorPickerModal
        visible={editor.showBgPicker}
        title="Pick Background Color"
        initialColor={editor.pickedBgRef.current}
        onApply={(hex) => { onCustomBgColorChange(hex); editor.setEditorColor(hex); editor.setShowBgPicker(false); }}
        onCancel={() => editor.setShowBgPicker(false)}
      />
      <ColorPickerModal
        visible={editor.showFontPicker}
        title="Pick Text Color"
        initialColor={editor.pickedFontRef.current}
        onApply={(hex) => { onCustomFontColorChange(hex); editor.setEditorFontColor(hex); editor.setShowFontPicker(false); }}
        onCancel={() => editor.setShowFontPicker(false)}
      />
      <ImageLightbox visible={!!editor.lightboxUri} imageUri={editor.lightboxUri} onClose={() => editor.setLightboxUri(null)} />
      <ShareNoteModal
        visible={editor.showShareModal}
        onClose={() => editor.setShowShareModal(false)}
        noteText={editor.editorText}
        noteIcon={editor.editorIcon}
        noteImages={editor.editorImages}
      />
      <DrawingCanvas
        visible={editor.showDrawing}
        backgroundImageUri={editor.editingImageUri && !editor.editingDrawingData ? editor.editingImageUri : (editor.editingDrawingData?.sourceImageUri || null)}
        initialBackgroundImageUri={editor.editingDrawingData?.sourceImageUri || null}
        onSave={(imageUri: string) => {
          if (editor.editingImageUri) {
            editor.setEditorImages((prev) => prev.map((uri) => uri === editor.editingImageUri ? imageUri : uri));
            editor.setShowDrawing(false);
            editor.setEditingDrawingData(null);
            editor.setEditingImageUri(null);
            ToastAndroid.show('Drawing updated!', ToastAndroid.SHORT);
          } else {
            editor.setEditorImages((prev) => [...prev, imageUri]);
            editor.setShowDrawing(false);
            ToastAndroid.show('Drawing saved!', ToastAndroid.SHORT);
          }
        }}
        onCancel={() => { editor.setShowDrawing(false); editor.setEditingDrawingData(null); editor.setEditingImageUri(null); }}
        initialStrokes={editor.editingDrawingData?.strokes}
        initialBgColor={editor.editingDrawingData?.bgColor}
        editingImageUri={editor.editingImageUri}
      />
    </>
  );
}
