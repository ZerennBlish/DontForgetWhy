import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ToastAndroid,
  Share,
} from 'react-native';
import * as Print from 'expo-print';
import { useAppIcon } from '../hooks/useAppIcon';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { hapticLight } from '../utils/haptics';
import { FONTS } from '../theme/fonts';

interface ShareNoteModalProps {
  visible: boolean;
  onClose: () => void;
  noteTitle: string;
  noteText: string;
  noteIcon: string;
  noteImages: string[];
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function buildNoteHtml(
  title: string,
  text: string,
  icon: string,
  images: string[],
): Promise<string> {
  const iconHtml = icon ? `<div style="font-size:48px;margin-bottom:16px;">${icon}</div>` : '';
  const titleHtml = title.trim() ? `<h2 style="font-family:system-ui;font-size:24px;color:#1A1A2E;margin:0 0 12px 0;">${escapeHtml(title)}</h2>` : '';
  const escapedText = escapeHtml(text);
  let imagesHtml = '';
  for (const uri of images) {
    try {
      const b64 = await new FileSystem.File(uri).base64();
      const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      imagesHtml += `<img src="data:${mimeType};base64,${b64}" style="display:block;width:100%;max-height:83vh;object-fit:contain;margin-top:24px;border-radius:8px;" />`;
    } catch { /* skip failed image */ }
  }
  return `<html><head><style>@page { size: letter; margin: 0.75in; } img { page-break-inside: avoid; }</style></head><body style="background:#FFFFFF;color:#1A1A2E;font-family:system-ui;padding:32px;">${iconHtml}${titleHtml}<pre style="white-space:pre-wrap;font-family:system-ui;font-size:16px;color:#1A1A2E;margin:0;">${escapedText}</pre>${imagesHtml}</body></html>`;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(24, 24, 38, 0.95)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginHorizontal: 32,
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default function ShareNoteModal({
  visible,
  onClose,
  noteTitle,
  noteText,
  noteIcon,
  noteImages,
}: ShareNoteModalProps) {
  const notepadIcon = useAppIcon('notepad');
  const cameraIcon = useAppIcon('camera');
  const pdfIcon = useAppIcon('pdf');
  const printerIcon = useAppIcon('printer');

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close share menu">
        <View style={styles.card} onStartShouldSetResponder={() => true} accessibilityViewIsModal={true}>
          <Text style={styles.title}>Share Note</Text>

          <TouchableOpacity style={styles.option} onPress={async () => {
            onClose();
            hapticLight();
            const trimmedTitle = noteTitle.trim();
            const body = noteIcon ? `${noteIcon} ${noteText}` : noteText;
            const content = trimmedTitle
              ? (noteText ? `${trimmedTitle}\n\n${body}` : trimmedTitle)
              : body;
            if (!content.trim()) { ToastAndroid.show('Nothing to share', ToastAndroid.SHORT); return; }
            Share.share({ message: content });
          }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Share note as text">
            <Image source={notepadIcon} style={{ width: 28, height: 28, marginRight: 14 }} resizeMode="contain" />
            <Text style={styles.optionText}>Share Text</Text>
          </TouchableOpacity>

          {noteImages.length > 0 && (
            <TouchableOpacity style={styles.option} onPress={async () => {
              onClose();
              hapticLight();
              try {
                const available = await Sharing.isAvailableAsync();
                if (!available) { ToastAndroid.show('Sharing not available', ToastAndroid.SHORT); return; }
                for (const uri of noteImages) {
                  const mime = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                  await Sharing.shareAsync(uri, { mimeType: mime });
                }
              } catch {
                ToastAndroid.show("Couldn't share photos.", ToastAndroid.SHORT);
              }
            }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Share photos">
              <Image source={cameraIcon} style={{ width: 28, height: 28, marginRight: 14 }} resizeMode="contain" />
              <Text style={styles.optionText}>{noteImages.length === 1 ? 'Share Photo' : 'Share Photos'}</Text>
            </TouchableOpacity>
          )}

          {noteImages.length > 0 && (
            <TouchableOpacity style={styles.option} onPress={async () => {
              onClose();
              hapticLight();
              try {
                const html = await buildNoteHtml(noteTitle, noteText, noteIcon, noteImages);
                const pdf = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf' });
              } catch {
                ToastAndroid.show("Couldn't share PDF.", ToastAndroid.SHORT);
              }
            }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Share as PDF">
              <Image source={pdfIcon} style={{ width: 38, height: 38, marginRight: 14, marginLeft: -5 }} resizeMode="contain" />
              <Text style={styles.optionText}>Share as PDF</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.option} onPress={async () => {
            onClose();
            hapticLight();
            try {
              const hasImages = noteImages.length > 0;
              const html = hasImages
                ? await buildNoteHtml(noteTitle, noteText, noteIcon, noteImages)
                : (() => {
                    const iconHtml = noteIcon ? `<div style="font-size:48px;margin-bottom:16px;">${noteIcon}</div>` : '';
                    const titleHtml = noteTitle.trim() ? `<h2 style="font-family:system-ui;font-size:24px;color:#1A1A2E;margin:0 0 12px 0;">${escapeHtml(noteTitle)}</h2>` : '';
                    const escapedText = escapeHtml(noteText);
                    return `<html><head><style>@page{size:letter;margin:0.75in;}img{page-break-inside:avoid;}</style></head><body style="background:#FFFFFF;color:#1A1A2E;font-family:system-ui;padding:32px;">${iconHtml}${titleHtml}<pre style="white-space:pre-wrap;font-family:system-ui;font-size:16px;color:#1A1A2E;margin:0;">${escapedText}</pre></body></html>`;
                  })();
              await Print.printAsync({ html });
            } catch {
              ToastAndroid.show("Couldn't print.", ToastAndroid.SHORT);
            }
          }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Print note">
            <Image source={printerIcon} style={{ width: 28, height: 28, marginRight: 14 }} resizeMode="contain" />
            <Text style={styles.optionText}>Print</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => { hapticLight(); onClose(); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
