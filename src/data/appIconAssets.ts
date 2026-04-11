import { ImageSourcePropType } from 'react-native';

/**
 * App icon registry. Two tiers share one map:
 *   - Chrome icons (`assets/app-icons/`) — silver metallic, no faces, utility
 *   - Game character icons (`assets/icons/`) — full-color, faces, gameplay-only
 * Game icons should render without `tintColor` — they are full-color character art.
 */
const APP_ICONS = {
  alarm: require('../../assets/app-icons/alarm-clock.webp') as ImageSourcePropType,
  bell: require('../../assets/app-icons/bell.webp') as ImageSourcePropType,
  stopwatch: require('../../assets/app-icons/stopwatch.webp') as ImageSourcePropType,
  notepad: require('../../assets/app-icons/notepad.webp') as ImageSourcePropType,
  microphone: require('../../assets/app-icons/microphone.webp') as ImageSourcePropType,
  calendar: require('../../assets/app-icons/calendar.webp') as ImageSourcePropType,
  gamepad: require('../../assets/app-icons/gamepad.webp') as ImageSourcePropType,
  gear: require('../../assets/app-icons/gear.webp') as ImageSourcePropType,
  hammock: require('../../assets/app-icons/hammock.webp') as ImageSourcePropType,
  house: require('../../assets/app-icons/house.webp') as ImageSourcePropType,
  trash: require('../../assets/app-icons/trash.webp') as ImageSourcePropType,
  camera: require('../../assets/app-icons/camera.webp') as ImageSourcePropType,
  couch: require('../../assets/app-icons/couch.webp') as ImageSourcePropType,
  image: require('../../assets/app-icons/image.webp') as ImageSourcePropType,
  paintbrush: require('../../assets/app-icons/paintbrush.webp') as ImageSourcePropType,
  share: require('../../assets/app-icons/share.webp') as ImageSourcePropType,
  flame: require('../../assets/app-icons/flame.webp') as ImageSourcePropType,
  warning: require('../../assets/app-icons/warning.webp') as ImageSourcePropType,
  search: require('../../assets/app-icons/search.webp') as ImageSourcePropType,
  backArrow: require('../../assets/app-icons/back-arrow.webp') as ImageSourcePropType,
  'beach-chair': require('../../assets/app-icons/beach-chair.webp') as ImageSourcePropType,
  palette: require('../../assets/app-icons/painting_palette.webp') as ImageSourcePropType,
  plus: require('../../assets/app-icons/plus.webp') as ImageSourcePropType,
  printer: require('../../assets/app-icons/printer.webp') as ImageSourcePropType,
  pdf: require('../../assets/app-icons/pdf.webp') as ImageSourcePropType,
  vibrate: require('../../assets/app-icons/vibrate.webp') as ImageSourcePropType,
  silent: require('../../assets/app-icons/silent.webp') as ImageSourcePropType,
  closeX: require('../../assets/app-icons/close-x.webp') as ImageSourcePropType,
  checkmark: require('../../assets/app-icons/checkmark.webp') as ImageSourcePropType,

  // Game character icons — full-color, do not tint
  star: require('../../assets/icons/icon-star.webp') as ImageSourcePropType,
  win: require('../../assets/icons/icon-win.webp') as ImageSourcePropType,
  loss: require('../../assets/icons/icon-loss.webp') as ImageSourcePropType,
  hourglass: require('../../assets/icons/icon-hourglass.webp') as ImageSourcePropType,
  pencil: require('../../assets/icons/icon-pencil.webp') as ImageSourcePropType,
  erase: require('../../assets/icons/icon-erase.webp') as ImageSourcePropType,
  chevronLeft: require('../../assets/icons/icon-chevron-left.webp') as ImageSourcePropType,
  chevronRight: require('../../assets/icons/icon-chevron-right.webp') as ImageSourcePropType,
  gameBack: require('../../assets/icons/icon-game-back.webp') as ImageSourcePropType,
  gameHome: require('../../assets/icons/icon-game-home.webp') as ImageSourcePropType,
  smiley: require('../../assets/icons/icon-smiley.webp') as ImageSourcePropType,
};

export default APP_ICONS;
