import { ImageSourcePropType } from 'react-native';

/**
 * Toon utility-icon registry — character-art versions of the core app
 * glyphs (alarm, bell, stopwatch, etc). Used under the anthropomorphic
 * branch of the three-state icon theme.
 *
 * All assets live under `assets/toon-app-icons/`. Consumed by
 * `iconResolver.ts` when `iconTheme === 'anthropomorphic'`.
 */
const TOON_APP_ICONS = {
  alarm: require('../../assets/toon-app-icons/icon-alarm.webp') as ImageSourcePropType,
  bell: require('../../assets/toon-app-icons/icon-bell.webp') as ImageSourcePropType,
  stopwatch: require('../../assets/toon-app-icons/icon-stopwatch.webp') as ImageSourcePropType,
  notepad: require('../../assets/toon-app-icons/icon-notepad.webp') as ImageSourcePropType,
  microphone: require('../../assets/toon-app-icons/icon-microphone.webp') as ImageSourcePropType,
  calendar: require('../../assets/toon-app-icons/icon-calendar.webp') as ImageSourcePropType,
  gamepad: require('../../assets/toon-app-icons/icon-gamepad.webp') as ImageSourcePropType,
  gear: require('../../assets/toon-app-icons/gear_icon.webp') as ImageSourcePropType,
  trash: require('../../assets/toon-app-icons/icon-trash.webp') as ImageSourcePropType,
  camera: require('../../assets/toon-app-icons/icon-camera.webp') as ImageSourcePropType,
  image: require('../../assets/toon-app-icons/icon-image.webp') as ImageSourcePropType,
  paintbrush: require('../../assets/toon-app-icons/icon-paintbrush.webp') as ImageSourcePropType,
  palette: require('../../assets/toon-app-icons/icon-palette.webp') as ImageSourcePropType,
  share: require('../../assets/toon-app-icons/icon-share.webp') as ImageSourcePropType,
  flame: require('../../assets/toon-app-icons/icon-fire.webp') as ImageSourcePropType,
  warning: require('../../assets/toon-app-icons/icon-warning.webp') as ImageSourcePropType,
  plus: require('../../assets/toon-app-icons/plus.webp') as ImageSourcePropType,
  printer: require('../../assets/toon-app-icons/icon-printer.webp') as ImageSourcePropType,
  pdf: require('../../assets/toon-app-icons/icon-pdf-plain.webp') as ImageSourcePropType,
  vibrate: require('../../assets/toon-app-icons/icon-vibrate.webp') as ImageSourcePropType,
  silent: require('../../assets/toon-app-icons/icon-silent.webp') as ImageSourcePropType,
  paperclip: require('../../assets/toon-app-icons/icon-paperclip.webp') as ImageSourcePropType,
  save: require('../../assets/toon-app-icons/icon-save.webp') as ImageSourcePropType,
  search: require('../../assets/toon-app-icons/icon-search.webp') as ImageSourcePropType,
};

export default TOON_APP_ICONS;
