import { ImageSourcePropType } from 'react-native';

/**
 * Chrome game-surface icon registry. Silver/metallic art used on game
 * screens (boards, scoreboards, nav overlays). Mirror of the tiered
 * approach in `src/data/appIconAssets.ts` — all assets live under
 * `assets/chrome-game/<subfolder>/`. Consumed by `iconResolver.ts`
 * when `iconTheme === 'chrome'`.
 */
const CHROME_GAME_ICONS = {
  // Chess pieces
  kingLight: require('../../assets/chrome-game/chess/king-light.webp') as ImageSourcePropType,
  kingDark: require('../../assets/chrome-game/chess/king-dark.webp') as ImageSourcePropType,
  queenLight: require('../../assets/chrome-game/chess/queen-light.webp') as ImageSourcePropType,
  queenDark: require('../../assets/chrome-game/chess/queen-dark.webp') as ImageSourcePropType,
  rookLight: require('../../assets/chrome-game/chess/rook-light.webp') as ImageSourcePropType,
  rookDark: require('../../assets/chrome-game/chess/rook-dark.webp') as ImageSourcePropType,
  bishopLight: require('../../assets/chrome-game/chess/bishop-light.webp') as ImageSourcePropType,
  bishopDark: require('../../assets/chrome-game/chess/bishop-dark.webp') as ImageSourcePropType,
  knightLight: require('../../assets/chrome-game/chess/knight-light.webp') as ImageSourcePropType,
  knightDark: require('../../assets/chrome-game/chess/knight-dark.webp') as ImageSourcePropType,
  pawnLight: require('../../assets/chrome-game/chess/pawn-light.webp') as ImageSourcePropType,
  pawnDark: require('../../assets/chrome-game/chess/pawn-dark.webp') as ImageSourcePropType,

  // Checkers pieces
  checkerLight: require('../../assets/chrome-game/checkers/checker-light.webp') as ImageSourcePropType,
  checkerLightKing: require('../../assets/chrome-game/checkers/checker-light-king.webp') as ImageSourcePropType,
  checkerDark: require('../../assets/chrome-game/checkers/checker-dark.webp') as ImageSourcePropType,
  checkerDarkKing: require('../../assets/chrome-game/checkers/checker-dark-king.webp') as ImageSourcePropType,

  // Card art (game-card visuals)
  sudoku: require('../../assets/chrome-game/cards/sudoku.webp') as ImageSourcePropType,
  chart: require('../../assets/chrome-game/cards/chart.webp') as ImageSourcePropType,
  globe: require('../../assets/chrome-game/cards/globe.webp') as ImageSourcePropType,
  offlineGlobe: require('../../assets/chrome-game/cards/offline-globe.webp') as ImageSourcePropType,

  // Status glyphs
  star: require('../../assets/chrome-game/status/star.webp') as ImageSourcePropType,
  win: require('../../assets/chrome-game/status/win.webp') as ImageSourcePropType,
  loss: require('../../assets/chrome-game/status/loss.webp') as ImageSourcePropType,
  hourglass: require('../../assets/chrome-game/status/hourglass.webp') as ImageSourcePropType,
  smiley: require('../../assets/chrome-game/status/smiley.webp') as ImageSourcePropType,
  party: require('../../assets/chrome-game/status/party.webp') as ImageSourcePropType,
  quick: require('../../assets/chrome-game/status/quick.webp') as ImageSourcePropType,

  // UI controls (nav, review, game actions)
  chevronLeft: require('../../assets/chrome-game/ui/chevron-left.webp') as ImageSourcePropType,
  chevronRight: require('../../assets/chrome-game/ui/chevron-right.webp') as ImageSourcePropType,
  erase: require('../../assets/chrome-game/ui/erase.webp') as ImageSourcePropType,
  refresh: require('../../assets/chrome-game/ui/refresh.webp') as ImageSourcePropType,
  // `skip` and `forwardSkip` are aliases for the same asset — callers can pick
  // whichever name reads better at the use site.
  skip: require('../../assets/chrome-game/ui/forward-skip.webp') as ImageSourcePropType,
  forwardSkip: require('../../assets/chrome-game/ui/forward-skip.webp') as ImageSourcePropType,
  backSkip: require('../../assets/chrome-game/ui/back-skip.webp') as ImageSourcePropType,

  // Trivia category art
  books: require('../../assets/chrome-game/trivia/books.webp') as ImageSourcePropType,
  lightbulb: require('../../assets/chrome-game/trivia/lightbulb.webp') as ImageSourcePropType,
  phone: require('../../assets/chrome-game/trivia/phone.webp') as ImageSourcePropType,
  puzzle: require('../../assets/chrome-game/trivia/puzzle.webp') as ImageSourcePropType,
  wordplay: require('../../assets/chrome-game/trivia/wordplay.webp') as ImageSourcePropType,

  // Trivia parent category icons
  triviaPopcorn: require('../../assets/TriviaChrome/chrome-popcorn.webp') as ImageSourcePropType,
  triviaRecliner: require('../../assets/TriviaChrome/chrome-recliner.webp') as ImageSourcePropType,
  triviaD20: require('../../assets/TriviaChrome/chrome-d20.webp') as ImageSourcePropType,

  // Trivia subcategory icons
  triviaMovies: require('../../assets/TriviaChrome/chrome-movies.webp') as ImageSourcePropType,
  triviaMusic: require('../../assets/TriviaChrome/chrome-music.webp') as ImageSourcePropType,
  triviaTelevision: require('../../assets/TriviaChrome/chrome-television.webp') as ImageSourcePropType,
  triviaCelebrities: require('../../assets/TriviaChrome/chrome-celebrities.webp') as ImageSourcePropType,
  triviaScience: require('../../assets/TriviaChrome/chrome-science.webp') as ImageSourcePropType,
  triviaComputers: require('../../assets/TriviaChrome/chrome-computers.webp') as ImageSourcePropType,
  triviaMath: require('../../assets/TriviaChrome/chrome-math.webp') as ImageSourcePropType,
  triviaHistory: require('../../assets/TriviaChrome/chrome-history.webp') as ImageSourcePropType,
  triviaPolitics: require('../../assets/TriviaChrome/chrome-politics.webp') as ImageSourcePropType,
  triviaArt: require('../../assets/TriviaChrome/chrome-art.webp') as ImageSourcePropType,
  triviaGeography: require('../../assets/TriviaChrome/chrome-geography.webp') as ImageSourcePropType,
  triviaSports: require('../../assets/TriviaChrome/chrome-sports.webp') as ImageSourcePropType,
  triviaBoardgames: require('../../assets/TriviaChrome/chrome-boardgames.webp') as ImageSourcePropType,
  triviaVehicles: require('../../assets/TriviaChrome/chrome-vehicles.webp') as ImageSourcePropType,
  triviaVideogames: require('../../assets/TriviaChrome/chrome-videogames.webp') as ImageSourcePropType,
  triviaComics: require('../../assets/TriviaChrome/chrome-comics.webp') as ImageSourcePropType,
};

export default CHROME_GAME_ICONS;
