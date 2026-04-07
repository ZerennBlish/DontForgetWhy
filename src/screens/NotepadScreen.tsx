import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import { useNotepad } from '../hooks/useNotepad';
import NoteCard from '../components/NoteCard';
import DeletedNoteCard from '../components/DeletedNoteCard';
import UndoToast from '../components/UndoToast';
import NoteEditorModal from '../components/NoteEditorModal';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import APP_ICONS from '../data/appIconAssets';
import type { Note } from '../types/note';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notepad'>;

export default function NotepadScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const notepad = useNotepad({ routeParams: route.params });

  const styles = useMemo(() => StyleSheet.create({
    outerContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    watermark: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
      opacity: colors.mode === 'dark' ? 0.15 : 0.06,
    },
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top + 10,
      paddingHorizontal: 20,
      paddingBottom: 2,
    },
    headerBack: {
      position: 'absolute',
      left: 20,
      top: insets.top + 10,
    },
    headerHome: {
      position: 'absolute',
      left: 64,
      top: insets.top + 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    filterToggleRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 0,
    },
    filterToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
    },
    filterToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    filterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 6,
      gap: 6,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    pillTextActive: {
      color: colors.textPrimary,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 100 + insets.bottom,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 80 + insets.bottom,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textTertiary,
      marginBottom: 4,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 22,
    },
    fab: {
      position: 'absolute',
      bottom: 36 + insets.bottom,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
  }), [colors, insets.bottom, insets.top]);

  const renderItem = ({ item }: { item: Note }) => {
    if (item.deletedAt) {
      return (
        <DeletedNoteCard
          note={item}
          onRestore={() => notepad.handleRestore(item.id)}
          onPermanentDelete={() => notepad.handlePermanentDelete(item.id)}
        />
      );
    }
    return (
      <NoteCard
        note={item}
        isPinned={notepad.pinnedIds.includes(item.id)}
        onPress={() => notepad.openEditorWithNote(item)}
        onDelete={() => notepad.handleDeleteFromList(item.id)}
        onTogglePin={() => notepad.handleTogglePin(item.id)}
      />
    );
  };

  const renderEmpty = () => {
    if (notepad.filter === 'deleted') {
      return (
        <View style={styles.empty}>
          <View style={{ marginBottom: 12 }}><Image source={APP_ICONS.trash} style={{ width: 40, height: 40 }} resizeMode="contain" /></View>
          <Text style={[styles.emptyTitle, notepad.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>Nothing in the trash</Text>
          <Text style={[styles.emptyText, notepad.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>How responsible of you.</Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <View style={{ marginBottom: 12 }}><Image source={APP_ICONS.notepad} style={{ width: 40, height: 40 }} resizeMode="contain" /></View>
        <Text style={[styles.emptyTitle, notepad.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>No notes yet</Text>
        <Text style={[styles.emptyText, notepad.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
          Tap the notepad to create one.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {notepad.bgUri ? (
          <>
            <Image source={{ uri: notepad.bgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => notepad.setBgUri(null)} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${notepad.bgOpacity})` }]} />
          </>
        ) : (
          <Image
            source={require('../../assets/fullscreenicon.webp')}
            style={styles.watermark}
            resizeMode="cover"
          />
        )}
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerBack}>
            <BackButton onPress={() => navigation.goBack()} forceDark={!!notepad.bgUri} />
          </View>
          <View style={styles.headerHome}>
            <HomeButton forceDark={!!notepad.bgUri} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Image source={APP_ICONS.notepad} style={{ width: 36, height: 36, marginBottom: 2 }} resizeMode="contain" />
            <Text style={[styles.title, notepad.bgUri && { color: colors.overlayText }]}>Notes</Text>
          </View>
        </View>

        <View style={styles.filterToggleRow}>
          <TouchableOpacity
            style={styles.filterToggleBtn}
            onPress={() => {
              hapticLight();
              notepad.setShowFilter((prev) => {
                if (prev) notepad.setFilter('active');
                return !prev;
              });
            }}
            activeOpacity={0.7}
            accessibilityLabel={`Filter${notepad.showFilter ? ', expanded' : ''}`}
            accessibilityRole="button"
          >
            {notepad.filter !== 'active' && <View style={styles.filterDot} />}
            <Text style={[styles.filterToggleText, notepad.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
              Filter {notepad.showFilter ? '\u25B4' : '\u25BE'}
            </Text>
          </TouchableOpacity>
        </View>

        {notepad.showFilter && (
          <View style={styles.filterRow}>
            {(['active', 'deleted'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, notepad.filter === f && styles.pillActive]}
                onPress={() => { hapticLight(); notepad.setFilter(f); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: notepad.filter === f }}
              >
                <Text style={[styles.pillText, notepad.filter === f && styles.pillTextActive]}>
                  {f === 'active' ? 'Active' : 'Deleted'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {notepad.sorted.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            data={notepad.sorted}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            windowSize={5}
            maxToRenderPerBatch={8}
            initialNumToRender={8}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => { hapticLight(); notepad.openNewEditor(); }}
          activeOpacity={0.8}
          accessibilityLabel="Create new note"
          accessibilityRole="button"
        >
          <Image source={APP_ICONS.plus} style={{ width: 28, height: 28 }} resizeMode="contain" />
        </TouchableOpacity>

        <UndoToast
          key={notepad.undoKey}
          visible={notepad.showUndo}
          message="Note deleted"
          onUndo={notepad.handleUndoDelete}
          onDismiss={notepad.handleUndoDismiss}
        />
      </View>

      <NoteEditorModal
        visible={notepad.editorVisible}
        note={notepad.editingNote}
        customBgColor={notepad.customBgColor}
        customFontColor={notepad.customFontColor}
        onSave={notepad.handleEditorSave}
        onDelete={notepad.handleEditorDelete}
        onClose={notepad.closeEditor}
        onCustomBgColorChange={notepad.onCustomBgColorChange}
        onCustomFontColorChange={notepad.onCustomFontColorChange}
      />
    </View>
  );
}
