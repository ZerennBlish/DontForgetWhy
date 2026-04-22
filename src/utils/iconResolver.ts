import { ImageSourcePropType } from 'react-native';
import { getIconTheme, type IconTheme } from '../services/iconTheme';
import APP_ICONS from '../data/appIconAssets';
import CHROME_GAME_ICONS from './chromeGameAssets';
import TOON_APP_ICONS from './toonAppIcons';

/**
 * Every icon the app can render goes through this resolver so a single
 * user-facing setting (`iconTheme`) can flip entire classes of icons in
 * one place. Consumed by screens via `useAppIcon(key)` (hook) or by
 * utility modules via `resolveIcon(key)` (non-hook).
 */

export type IconKey =
  // Utility glyphs — differ between chrome (APP_ICONS) and toon (TOON_APP_ICONS)
  | 'alarm' | 'bell' | 'stopwatch' | 'notepad' | 'microphone' | 'calendar'
  | 'gamepad' | 'gear' | 'trash' | 'camera' | 'image' | 'paintbrush'
  | 'palette' | 'share' | 'flame' | 'warning' | 'plus' | 'printer' | 'pdf'
  | 'vibrate' | 'silent' | 'paperclip' | 'save' | 'edit' | 'search'
  // Abstract/structural — chrome vs game-icon siblings under anthropomorphic
  | 'closeX' | 'checkmark' | 'backArrow' | 'home'
  // Decorative — same asset in all themes
  | 'hammock' | 'house' | 'couch' | 'beach-chair'
  // Chess pieces
  | 'chess.king.light' | 'chess.king.dark'
  | 'chess.queen.light' | 'chess.queen.dark'
  | 'chess.rook.light' | 'chess.rook.dark'
  | 'chess.bishop.light' | 'chess.bishop.dark'
  | 'chess.knight.light' | 'chess.knight.dark'
  | 'chess.pawn.light' | 'chess.pawn.dark'
  // Checker pieces
  | 'checker.regular.light' | 'checker.king.light'
  | 'checker.regular.dark' | 'checker.king.dark'
  // Game-card visuals
  | 'card.sudoku' | 'card.chart' | 'card.globe' | 'card.offlineGlobe'
  // Status glyphs
  | 'status.star' | 'status.win' | 'status.loss' | 'status.hourglass'
  | 'status.smiley' | 'status.party' | 'status.quick'
  // UI controls
  | 'ui.chevronLeft' | 'ui.chevronRight' | 'ui.erase' | 'ui.refresh'
  | 'ui.skip' | 'ui.forwardSkip' | 'ui.backSkip'
  // Media controls
  | 'media.play' | 'media.pause' | 'media.stop'
  | 'media.repeat' | 'media.playAll' | 'media.playStop'
  | 'media.skipBack' | 'media.skipForward'
  | 'media.record'
  // Drawing tools (pencil already covered by 'edit', erase by 'ui.erase')
  | 'ui.undo'
  // Trivia (chrome set only — mixed/anthropomorphic use best-match fallbacks)
  | 'trivia.books' | 'trivia.lightbulb' | 'trivia.phone'
  | 'trivia.puzzle' | 'trivia.wordplay'
  // Trivia parent categories
  | 'trivia.popcorn' | 'trivia.recliner' | 'trivia.d20'
  // Trivia subcategories
  | 'trivia.movies' | 'trivia.music' | 'trivia.television' | 'trivia.celebrities'
  | 'trivia.science' | 'trivia.computers' | 'trivia.math'
  | 'trivia.history' | 'trivia.politics' | 'trivia.art'
  | 'trivia.geography' | 'trivia.sports' | 'trivia.boardgames'
  | 'trivia.vehicles' | 'trivia.videogames' | 'trivia.comics';

export function resolveIcon(key: IconKey): ImageSourcePropType {
  return resolveIconWithTheme(key, getIconTheme());
}

export function resolveIconWithTheme(
  key: IconKey,
  theme: IconTheme,
): ImageSourcePropType {
  // 1) Decorative keys — theme-independent.
  switch (key) {
    case 'hammock':
      return APP_ICONS.hammock;
    case 'house':
      return APP_ICONS.house;
    case 'couch':
      return APP_ICONS.couch;
    case 'beach-chair':
      return APP_ICONS['beach-chair'];
  }

  // 2) Anthropomorphic theme — override utility + abstract. Game keys fall
  //    through to mixed (anthropomorphic art is already the mixed-mode default).
  if (theme === 'anthropomorphic') {
    switch (key) {
      case 'alarm':
        return TOON_APP_ICONS.alarm;
      case 'bell':
        return TOON_APP_ICONS.bell;
      case 'stopwatch':
        return TOON_APP_ICONS.stopwatch;
      case 'notepad':
        return TOON_APP_ICONS.notepad;
      case 'microphone':
        return TOON_APP_ICONS.microphone;
      case 'calendar':
        return TOON_APP_ICONS.calendar;
      case 'gamepad':
        return TOON_APP_ICONS.gamepad;
      case 'gear':
        return TOON_APP_ICONS.gear;
      case 'trash':
        return TOON_APP_ICONS.trash;
      case 'camera':
        return TOON_APP_ICONS.camera;
      case 'image':
        return TOON_APP_ICONS.image;
      case 'paintbrush':
        return TOON_APP_ICONS.paintbrush;
      case 'palette':
        return TOON_APP_ICONS.palette;
      case 'share':
        return TOON_APP_ICONS.share;
      case 'flame':
        return TOON_APP_ICONS.flame;
      case 'warning':
        return TOON_APP_ICONS.warning;
      case 'plus':
        return TOON_APP_ICONS.plus;
      case 'printer':
        return TOON_APP_ICONS.printer;
      case 'pdf':
        return TOON_APP_ICONS.pdf;
      case 'vibrate':
        return TOON_APP_ICONS.vibrate;
      case 'silent':
        return TOON_APP_ICONS.silent;
      case 'paperclip':
        return TOON_APP_ICONS.paperclip;
      case 'save':
        return TOON_APP_ICONS.save;
      case 'search':
        return TOON_APP_ICONS.search;
      // Character-art pencil — chrome bank has its own, anthropomorphic
      // borrows the existing game-icon pencil.
      case 'edit':
        return require('../../assets/icons/icon-pencil.webp');
      // Abstract structural glyphs → anthropomorphic game-icon siblings.
      case 'closeX':
        return require('../../assets/icons/icon-loss.webp');
      case 'checkmark':
        return require('../../assets/icons/icon-win.webp');
      case 'backArrow':
        return require('../../assets/icons/icon-game-back.webp');
      case 'home':
        return require('../../assets/icons/icon-game-home.webp');
      // `status.quick` reuses the stopwatch under mixed (chrome). Under
      // anthropomorphic, use the toon stopwatch to stay on-theme.
      case 'status.quick':
        return TOON_APP_ICONS.stopwatch;
      // Media controls — toon variants
      case 'media.play':
        return require('../../assets/toon-app-icons/icon-play-app.webp');
      case 'media.pause':
        return require('../../assets/toon-app-icons/icon-pause.webp');
      case 'media.stop':
        return require('../../assets/toon-app-icons/icon-stop.webp');
      case 'media.repeat':
        return require('../../assets/toon-app-icons/icon-repeat.webp');
      case 'media.playAll':
        return require('../../assets/toon-app-icons/icon-play-all.webp');
      case 'media.playStop':
        return require('../../assets/toon-app-icons/icon-play-stop.webp');
      case 'media.skipBack':
        return require('../../assets/toon-app-icons/icon-skip-back-5.webp');
      case 'media.skipForward':
        return require('../../assets/toon-app-icons/icon-skip-forward-5.webp');
      case 'media.record':
        return require('../../assets/icons/icon-record.webp');
      case 'ui.undo':
        return require('../../assets/icons/icon-undo.webp');
      // Trivia — same toon fallbacks as mixed mode
      case 'trivia.popcorn':
        return require('../../assets/trivia/popcorn_bucket.webp');
      case 'trivia.recliner':
        return require('../../assets/trivia/recliner_512.webp');
      case 'trivia.d20':
        return require('../../assets/trivia/d20_die.webp');
      case 'trivia.movies':
        return require('../../assets/trivia/trivia-movies.webp');
      case 'trivia.music':
        return require('../../assets/trivia/trivia-music.webp');
      case 'trivia.television':
        return require('../../assets/trivia/crt_tv_icon.webp');
      case 'trivia.celebrities':
        return require('../../assets/trivia/walk_of_fame_star.webp');
      case 'trivia.science':
        return require('../../assets/trivia/trivia-science.webp');
      case 'trivia.computers':
        return require('../../assets/trivia/trivia-technology.webp');
      case 'trivia.math':
        return require('../../assets/trivia/chalkboard_icon.webp');
      case 'trivia.history':
        return require('../../assets/trivia/trivia-history.webp');
      case 'trivia.politics':
        return require('../../assets/trivia/gavel_icon.webp');
      case 'trivia.art':
        return require('../../assets/trivia/paint_palette.webp');
      case 'trivia.geography':
        return require('../../assets/trivia/trivia-geography.webp');
      case 'trivia.sports':
        return require('../../assets/trivia/trivia-sports.webp');
      case 'trivia.boardgames':
        return require('../../assets/trivia/board_game_pawn_monocle.webp');
      case 'trivia.vehicles':
        return require('../../assets/trivia/beat_up_car.webp');
      case 'trivia.videogames':
        return require('../../assets/trivia/game_controller.webp');
      case 'trivia.comics':
        return require('../../assets/trivia/explosion_speech_bubble.webp');
    }
    // Game keys fall through to mixed handling below.
  }

  // 3) Chrome theme — override game surfaces with chrome registry. Utility
  //    + abstract fall through (chrome utility == mixed utility == APP_ICONS).
  if (theme === 'chrome') {
    switch (key) {
      case 'chess.king.light':
        return CHROME_GAME_ICONS.kingLight;
      case 'chess.king.dark':
        return CHROME_GAME_ICONS.kingDark;
      case 'chess.queen.light':
        return CHROME_GAME_ICONS.queenLight;
      case 'chess.queen.dark':
        return CHROME_GAME_ICONS.queenDark;
      case 'chess.rook.light':
        return CHROME_GAME_ICONS.rookLight;
      case 'chess.rook.dark':
        return CHROME_GAME_ICONS.rookDark;
      case 'chess.bishop.light':
        return CHROME_GAME_ICONS.bishopLight;
      case 'chess.bishop.dark':
        return CHROME_GAME_ICONS.bishopDark;
      case 'chess.knight.light':
        return CHROME_GAME_ICONS.knightLight;
      case 'chess.knight.dark':
        return CHROME_GAME_ICONS.knightDark;
      case 'chess.pawn.light':
        return CHROME_GAME_ICONS.pawnLight;
      case 'chess.pawn.dark':
        return CHROME_GAME_ICONS.pawnDark;
      case 'checker.regular.light':
        return CHROME_GAME_ICONS.checkerLight;
      case 'checker.king.light':
        return CHROME_GAME_ICONS.checkerLightKing;
      case 'checker.regular.dark':
        return CHROME_GAME_ICONS.checkerDark;
      case 'checker.king.dark':
        return CHROME_GAME_ICONS.checkerDarkKing;
      case 'card.sudoku':
        return CHROME_GAME_ICONS.sudoku;
      case 'card.chart':
        return CHROME_GAME_ICONS.chart;
      case 'card.globe':
        return CHROME_GAME_ICONS.globe;
      case 'card.offlineGlobe':
        return CHROME_GAME_ICONS.offlineGlobe;
      case 'status.star':
        return CHROME_GAME_ICONS.star;
      case 'status.win':
        return CHROME_GAME_ICONS.win;
      case 'status.loss':
        return CHROME_GAME_ICONS.loss;
      case 'status.hourglass':
        return CHROME_GAME_ICONS.hourglass;
      case 'status.smiley':
        return CHROME_GAME_ICONS.smiley;
      case 'status.party':
        return CHROME_GAME_ICONS.party;
      case 'status.quick':
        return CHROME_GAME_ICONS.quick;
      case 'ui.chevronLeft':
        return CHROME_GAME_ICONS.chevronLeft;
      case 'ui.chevronRight':
        return CHROME_GAME_ICONS.chevronRight;
      case 'ui.erase':
        return CHROME_GAME_ICONS.erase;
      case 'ui.refresh':
        return CHROME_GAME_ICONS.refresh;
      case 'ui.skip':
        return CHROME_GAME_ICONS.skip;
      case 'ui.forwardSkip':
        return CHROME_GAME_ICONS.forwardSkip;
      case 'ui.backSkip':
        return CHROME_GAME_ICONS.backSkip;
      case 'trivia.books':
        return CHROME_GAME_ICONS.books;
      case 'trivia.lightbulb':
        return CHROME_GAME_ICONS.lightbulb;
      case 'trivia.phone':
        return CHROME_GAME_ICONS.phone;
      case 'trivia.puzzle':
        return CHROME_GAME_ICONS.puzzle;
      case 'trivia.wordplay':
        return CHROME_GAME_ICONS.wordplay;
      case 'trivia.popcorn':
        return CHROME_GAME_ICONS.triviaPopcorn;
      case 'trivia.recliner':
        return CHROME_GAME_ICONS.triviaRecliner;
      case 'trivia.d20':
        return CHROME_GAME_ICONS.triviaD20;
      case 'trivia.movies':
        return CHROME_GAME_ICONS.triviaMovies;
      case 'trivia.music':
        return CHROME_GAME_ICONS.triviaMusic;
      case 'trivia.television':
        return CHROME_GAME_ICONS.triviaTelevision;
      case 'trivia.celebrities':
        return CHROME_GAME_ICONS.triviaCelebrities;
      case 'trivia.science':
        return CHROME_GAME_ICONS.triviaScience;
      case 'trivia.computers':
        return CHROME_GAME_ICONS.triviaComputers;
      case 'trivia.math':
        return CHROME_GAME_ICONS.triviaMath;
      case 'trivia.history':
        return CHROME_GAME_ICONS.triviaHistory;
      case 'trivia.politics':
        return CHROME_GAME_ICONS.triviaPolitics;
      case 'trivia.art':
        return CHROME_GAME_ICONS.triviaArt;
      case 'trivia.geography':
        return CHROME_GAME_ICONS.triviaGeography;
      case 'trivia.sports':
        return CHROME_GAME_ICONS.triviaSports;
      case 'trivia.boardgames':
        return CHROME_GAME_ICONS.triviaBoardgames;
      case 'trivia.vehicles':
        return CHROME_GAME_ICONS.triviaVehicles;
      case 'trivia.videogames':
        return CHROME_GAME_ICONS.triviaVideogames;
      case 'trivia.comics':
        return CHROME_GAME_ICONS.triviaComics;
    }
    // Utility/abstract fall through to mixed handling below.
  }

  // 4) Mixed (default) — covers every remaining IconKey. Utility + abstract
  //    use APP_ICONS; game pieces use anthropomorphic art (current app look).
  switch (key) {
    // Utility
    case 'alarm':
      return APP_ICONS.alarm;
    case 'bell':
      return APP_ICONS.bell;
    case 'stopwatch':
      return APP_ICONS.stopwatch;
    case 'notepad':
      return APP_ICONS.notepad;
    case 'microphone':
      return APP_ICONS.microphone;
    case 'calendar':
      return APP_ICONS.calendar;
    case 'gamepad':
      return APP_ICONS.gamepad;
    case 'gear':
      return APP_ICONS.gear;
    case 'trash':
      return APP_ICONS.trash;
    case 'camera':
      return APP_ICONS.camera;
    case 'image':
      return APP_ICONS.image;
    case 'paintbrush':
      return APP_ICONS.paintbrush;
    case 'palette':
      return APP_ICONS.palette;
    case 'share':
      return APP_ICONS.share;
    case 'flame':
      return APP_ICONS.flame;
    case 'warning':
      return APP_ICONS.warning;
    case 'plus':
      return APP_ICONS.plus;
    case 'printer':
      return APP_ICONS.printer;
    case 'pdf':
      return APP_ICONS.pdf;
    case 'vibrate':
      return APP_ICONS.vibrate;
    case 'silent':
      return APP_ICONS.silent;
    case 'paperclip':
      return APP_ICONS.paperclip;
    case 'save':
      return APP_ICONS.save;
    case 'edit':
      return APP_ICONS.edit;
    case 'search':
      return APP_ICONS.search;

    // Abstract / structural
    case 'closeX':
      return APP_ICONS.closeX;
    case 'checkmark':
      return APP_ICONS.checkmark;
    case 'backArrow':
      return APP_ICONS.backArrow;
    case 'home':
      return APP_ICONS.house;

    // Chess pieces (anthropomorphic art under mixed)
    case 'chess.king.light':
      return require('../../assets/chess/wK.webp');
    case 'chess.king.dark':
      return require('../../assets/chess/bK.webp');
    case 'chess.queen.light':
      return require('../../assets/chess/wQ.webp');
    case 'chess.queen.dark':
      return require('../../assets/chess/bQ.webp');
    case 'chess.rook.light':
      return require('../../assets/chess/wR.webp');
    case 'chess.rook.dark':
      return require('../../assets/chess/bR.webp');
    case 'chess.bishop.light':
      return require('../../assets/chess/wB.webp');
    case 'chess.bishop.dark':
      return require('../../assets/chess/bB.webp');
    case 'chess.knight.light':
      return require('../../assets/chess/wN.webp');
    case 'chess.knight.dark':
      return require('../../assets/chess/bN.webp');
    case 'chess.pawn.light':
      return require('../../assets/chess/wP.webp');
    case 'chess.pawn.dark':
      return require('../../assets/chess/bP.webp');

    // Checker pieces
    case 'checker.regular.light':
      return require('../../assets/checkers/checker-red.webp');
    case 'checker.king.light':
      return require('../../assets/checkers/checker-red-king.webp');
    case 'checker.regular.dark':
      return require('../../assets/checkers/checker-black.webp');
    case 'checker.king.dark':
      return require('../../assets/checkers/checker-black-king.webp');

    // Game-card visuals
    case 'card.sudoku':
      return require('../../assets/icons/icon-sudoku.webp');
    case 'card.chart':
      return require('../../assets/icons/icon-chart.webp');
    case 'card.globe':
      return require('../../assets/icons/icon-globe.webp');
    case 'card.offlineGlobe':
      return require('../../assets/icons/offline_globe.webp');

    // Status glyphs
    case 'status.star':
      return require('../../assets/icons/icon-star.webp');
    case 'status.win':
      return require('../../assets/icons/icon-win.webp');
    case 'status.loss':
      return require('../../assets/icons/icon-loss.webp');
    case 'status.hourglass':
      return require('../../assets/icons/icon-hourglass.webp');
    case 'status.smiley':
      return require('../../assets/icons/icon-smiley.webp');
    case 'status.party':
      return require('../../assets/icons/icon-party.webp');
    // `status.quick` intentionally points at the chrome stopwatch under
    // mixed — matches how the current app renders "quick" timers.
    case 'status.quick':
      return APP_ICONS.stopwatch;

    // UI controls
    case 'ui.chevronLeft':
      return require('../../assets/icons/icon-chevron-left.webp');
    case 'ui.chevronRight':
      return require('../../assets/icons/icon-chevron-right.webp');
    case 'ui.erase':
      return require('../../assets/icons/icon-erase.webp');
    case 'ui.refresh':
      return require('../../assets/icons/icon-refresh.webp');
    case 'ui.skip':
      return require('../../assets/icons/icon-skip.webp');
    case 'ui.forwardSkip':
      return require('../../assets/icons/icon-forward-skip.webp');
    case 'ui.backSkip':
      return require('../../assets/icons/icon-back-skip.webp');

    // Media controls — chrome variants (no icon- prefix, live in assets/icons/)
    case 'media.play':
      return require('../../assets/icons/play-app.webp');
    case 'media.pause':
      return require('../../assets/icons/pause.webp');
    case 'media.stop':
      return require('../../assets/icons/stop.webp');
    case 'media.repeat':
      return require('../../assets/icons/repeat.webp');
    case 'media.playAll':
      return require('../../assets/icons/play-all.webp');
    case 'media.playStop':
      return require('../../assets/icons/play-stop.webp');
    case 'media.skipBack':
      return require('../../assets/icons/skip-back.webp');
    case 'media.skipForward':
      return require('../../assets/icons/skip-forward.webp');
    // Media record + undo — chrome variants in assets/TriviaChrome/
    case 'media.record':
      return require('../../assets/TriviaChrome/chrome-record.webp');
    case 'ui.undo':
      return require('../../assets/TriviaChrome/chrome-undo.webp');

    // Trivia — chrome has dedicated art; mixed/anthropomorphic use the
    // closest existing anthropomorphic icon or a universal lightbulb
    // fallback when no meaningful sibling exists.
    case 'trivia.books':
      return require('../../assets/icons/icon-books.webp');
    case 'trivia.lightbulb':
      return require('../../assets/icons/icon-lightbulb.webp');
    case 'trivia.phone':
      return require('../../assets/icons/icon-lightbulb.webp');
    case 'trivia.puzzle':
      return require('../../assets/icons/icon-lightbulb.webp');
    case 'trivia.wordplay':
      return require('../../assets/icons/icon-books.webp');
    case 'trivia.popcorn':
      return require('../../assets/trivia/popcorn_bucket.webp');
    case 'trivia.recliner':
      return require('../../assets/trivia/recliner_512.webp');
    case 'trivia.d20':
      return require('../../assets/trivia/d20_die.webp');
    case 'trivia.movies':
      return require('../../assets/trivia/trivia-movies.webp');
    case 'trivia.music':
      return require('../../assets/trivia/trivia-music.webp');
    case 'trivia.television':
      return require('../../assets/trivia/crt_tv_icon.webp');
    case 'trivia.celebrities':
      return require('../../assets/trivia/walk_of_fame_star.webp');
    case 'trivia.science':
      return require('../../assets/trivia/trivia-science.webp');
    case 'trivia.computers':
      return require('../../assets/trivia/trivia-technology.webp');
    case 'trivia.math':
      return require('../../assets/trivia/chalkboard_icon.webp');
    case 'trivia.history':
      return require('../../assets/trivia/trivia-history.webp');
    case 'trivia.politics':
      return require('../../assets/trivia/gavel_icon.webp');
    case 'trivia.art':
      return require('../../assets/trivia/paint_palette.webp');
    case 'trivia.geography':
      return require('../../assets/trivia/trivia-geography.webp');
    case 'trivia.sports':
      return require('../../assets/trivia/trivia-sports.webp');
    case 'trivia.boardgames':
      return require('../../assets/trivia/board_game_pawn_monocle.webp');
    case 'trivia.vehicles':
      return require('../../assets/trivia/beat_up_car.webp');
    case 'trivia.videogames':
      return require('../../assets/trivia/game_controller.webp');
    case 'trivia.comics':
      return require('../../assets/trivia/explosion_speech_bubble.webp');
  }

  // Compile-time exhaustiveness check — TypeScript errors here if any
  // IconKey value escapes the switches above.
  const _exhaustive: never = key;
  throw new Error(`Unknown icon key: ${String(_exhaustive)}`);
}
