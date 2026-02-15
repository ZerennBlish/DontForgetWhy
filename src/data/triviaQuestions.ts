import type { TriviaQuestion, TriviaCategory } from '../types/trivia';

export const TRIVIA_CATEGORIES: { id: TriviaCategory; label: string; icon: string }[] = [
  { id: 'science', label: 'Science & Nature', icon: 'flask' },
  { id: 'history', label: 'History', icon: 'landmark' },
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'movies_tv', label: 'Movies & TV', icon: 'film' },
  { id: 'geography', label: 'Geography', icon: 'globe' },
  { id: 'sports', label: 'Sports', icon: 'trophy' },
  { id: 'technology', label: 'Technology', icon: 'cpu' },
  { id: 'food', label: 'Food & Drink', icon: 'utensils' },
  { id: 'general', label: 'General Knowledge', icon: 'brain' },
];

// 320 questions across 9 categories

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // ═══════════════════════════════════════════
  // GENERAL KNOWLEDGE (general_001 – general_040)
  // ═══════════════════════════════════════════

  // Easy (16)
  { id: 'general_001', category: 'general', type: 'multiple', difficulty: 'easy', question: 'How many sides does a triangle have?', correctAnswer: '3', incorrectAnswers: ['4', '5', '6'] },
  { id: 'general_002', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What color are emeralds?', correctAnswer: 'Green', incorrectAnswers: ['Red', 'Blue', 'Yellow'] },
  { id: 'general_003', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What is the largest ocean on Earth?', correctAnswer: 'Pacific Ocean', incorrectAnswers: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'] },
  { id: 'general_004', category: 'general', type: 'boolean', difficulty: 'easy', question: 'The Great Wall of China is visible from space with the naked eye.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'general_005', category: 'general', type: 'multiple', difficulty: 'easy', question: 'How many continents are there?', correctAnswer: '7', incorrectAnswers: ['5', '6', '8'] },
  { id: 'general_006', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What gas do humans breathe in to survive?', correctAnswer: 'Oxygen', incorrectAnswers: ['Carbon dioxide', 'Nitrogen', 'Helium'] },
  { id: 'general_007', category: 'general', type: 'boolean', difficulty: 'easy', question: 'A year has 365 days.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_008', category: 'general', type: 'multiple', difficulty: 'easy', question: 'Which planet is known as the Red Planet?', correctAnswer: 'Mars', incorrectAnswers: ['Venus', 'Jupiter', 'Saturn'] },
  { id: 'general_009', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What is the hardest natural substance on Earth?', correctAnswer: 'Diamond', incorrectAnswers: ['Gold', 'Iron', 'Quartz'] },
  { id: 'general_010', category: 'general', type: 'boolean', difficulty: 'easy', question: 'Water boils at 100 degrees Celsius at sea level.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_011', category: 'general', type: 'multiple', difficulty: 'easy', question: 'How many letters are in the English alphabet?', correctAnswer: '26', incorrectAnswers: ['24', '28', '30'] },
  { id: 'general_012', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What is the currency of Japan?', correctAnswer: 'Yen', incorrectAnswers: ['Won', 'Yuan', 'Rupee'] },
  { id: 'general_013', category: 'general', type: 'multiple', difficulty: 'easy', question: 'Which animal is known as the King of the Jungle?', correctAnswer: 'Lion', incorrectAnswers: ['Tiger', 'Elephant', 'Gorilla'] },
  { id: 'general_014', category: 'general', type: 'boolean', difficulty: 'easy', question: 'The Sun revolves around the Earth.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'general_015', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What shape is a stop sign?', correctAnswer: 'Octagon', incorrectAnswers: ['Hexagon', 'Pentagon', 'Circle'] },
  { id: 'general_016', category: 'general', type: 'multiple', difficulty: 'easy', question: 'How many minutes are in one hour?', correctAnswer: '60', incorrectAnswers: ['30', '90', '100'] },

  // Medium (14)
  { id: 'general_017', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What is the smallest prime number?', correctAnswer: '2', incorrectAnswers: ['1', '3', '0'] },
  { id: 'general_018', category: 'general', type: 'multiple', difficulty: 'medium', question: 'In what year did the Titanic sink?', correctAnswer: '1912', incorrectAnswers: ['1905', '1920', '1898'] },
  { id: 'general_019', category: 'general', type: 'boolean', difficulty: 'medium', question: 'Humans have four lungs.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'general_020', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What does "www" stand for in a website URL?', correctAnswer: 'World Wide Web', incorrectAnswers: ['Wide World Web', 'Web World Wide', 'World Web Wide'] },
  { id: 'general_021', category: 'general', type: 'multiple', difficulty: 'medium', question: 'Which language has the most native speakers worldwide?', correctAnswer: 'Mandarin Chinese', incorrectAnswers: ['English', 'Spanish', 'Hindi'] },
  { id: 'general_022', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What is the chemical symbol for gold?', correctAnswer: 'Au', incorrectAnswers: ['Ag', 'Go', 'Gd'] },
  { id: 'general_023', category: 'general', type: 'boolean', difficulty: 'medium', question: 'An octopus has three hearts.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_024', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What is the longest river in the world?', correctAnswer: 'Nile', incorrectAnswers: ['Amazon', 'Mississippi', 'Yangtze'] },
  { id: 'general_025', category: 'general', type: 'multiple', difficulty: 'medium', question: 'Which country gifted the Statue of Liberty to the United States?', correctAnswer: 'France', incorrectAnswers: ['England', 'Germany', 'Spain'] },
  { id: 'general_026', category: 'general', type: 'multiple', difficulty: 'medium', question: 'How many bones are in the adult human body?', correctAnswer: '206', incorrectAnswers: ['208', '196', '212'] },
  { id: 'general_027', category: 'general', type: 'boolean', difficulty: 'medium', question: 'Lightning never strikes the same place twice.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'general_028', category: 'general', type: 'multiple', difficulty: 'medium', question: 'Which vitamin is produced when skin is exposed to sunlight?', correctAnswer: 'Vitamin D', incorrectAnswers: ['Vitamin C', 'Vitamin A', 'Vitamin B12'] },
  { id: 'general_029', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What is the tallest mountain in the world?', correctAnswer: 'Mount Everest', incorrectAnswers: ['K2', 'Mount Kilimanjaro', 'Mount McKinley'] },
  { id: 'general_030', category: 'general', type: 'boolean', difficulty: 'medium', question: 'Bananas grow on trees.', correctAnswer: 'False', incorrectAnswers: ['True'] },

  // Hard (10)
  { id: 'general_031', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What is the rarest blood type?', correctAnswer: 'AB negative', incorrectAnswers: ['O negative', 'B negative', 'A negative'] },
  { id: 'general_032', category: 'general', type: 'multiple', difficulty: 'hard', question: 'How many time zones does Russia span?', correctAnswer: '11', incorrectAnswers: ['9', '7', '13'] },
  { id: 'general_033', category: 'general', type: 'boolean', difficulty: 'hard', question: 'A jiffy is an actual unit of time.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_034', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What is the only letter that does not appear in any U.S. state name?', correctAnswer: 'Q', incorrectAnswers: ['X', 'Z', 'J'] },
  { id: 'general_035', category: 'general', type: 'multiple', difficulty: 'hard', question: 'In which year was the United Nations founded?', correctAnswer: '1945', incorrectAnswers: ['1948', '1942', '1950'] },
  { id: 'general_036', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What is the most abundant gas in Earth\'s atmosphere?', correctAnswer: 'Nitrogen', incorrectAnswers: ['Oxygen', 'Carbon dioxide', 'Argon'] },
  { id: 'general_037', category: 'general', type: 'boolean', difficulty: 'hard', question: 'Goldfish have a memory span of only 3 seconds.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'general_038', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What is the smallest country in the world by area?', correctAnswer: 'Vatican City', incorrectAnswers: ['Monaco', 'San Marino', 'Liechtenstein'] },
  { id: 'general_039', category: 'general', type: 'multiple', difficulty: 'hard', question: 'Which element has the highest melting point?', correctAnswer: 'Tungsten', incorrectAnswers: ['Iron', 'Titanium', 'Platinum'] },
  { id: 'general_040', category: 'general', type: 'multiple', difficulty: 'hard', question: 'How many paintings did Vincent van Gogh sell during his lifetime?', correctAnswer: '1', incorrectAnswers: ['0', '5', '12'] },
  { id: 'general_041', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What color is the famous Tiffany & Co. box?', correctAnswer: 'Robin egg blue', incorrectAnswers: ['Red', 'White', 'Gold'] },
  { id: 'general_042', category: 'general', type: 'boolean', difficulty: 'easy', question: 'Mario is a plumber.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_043', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What year was the first iPhone released?', correctAnswer: '2007', incorrectAnswers: ['2005', '2009', '2010'] },
  { id: 'general_044', category: 'general', type: 'boolean', difficulty: 'medium', question: 'Pikachu is an Electric-type Pokemon.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_045', category: 'general', type: 'multiple', difficulty: 'medium', question: 'Which video game franchise features a character named Master Chief?', correctAnswer: 'Halo', incorrectAnswers: ['Call of Duty', 'Gears of War', 'Destiny'] },
  { id: 'general_046', category: 'general', type: 'multiple', difficulty: 'hard', question: 'Which novelist wrote "1984" and "Animal Farm"?', correctAnswer: 'George Orwell', incorrectAnswers: ['Aldous Huxley', 'Ray Bradbury', 'H.G. Wells'] },
  { id: 'general_047', category: 'general', type: 'boolean', difficulty: 'hard', question: 'The character of Sherlock Holmes was inspired by a real person named Dr. Joseph Bell.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_048', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What is the best-selling video game of all time?', correctAnswer: 'Minecraft', incorrectAnswers: ['Tetris', 'GTA V', 'Wii Sports'] },

  // Additional General Knowledge (general_049 – general_084)

  // Easy (14)
  { id: 'general_049', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What is the tallest animal in the world?', correctAnswer: 'Giraffe', incorrectAnswers: ['Elephant', 'Ostrich', 'Camel'] },
  { id: 'general_050', category: 'general', type: 'boolean', difficulty: 'easy', question: 'A leap year has 366 days.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_051', category: 'general', type: 'multiple', difficulty: 'easy', question: 'How many colors are in a standard rainbow?', correctAnswer: '7', incorrectAnswers: ['5', '6', '8'] },
  { id: 'general_052', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What is the currency of the United Kingdom?', correctAnswer: 'Pound sterling', incorrectAnswers: ['Euro', 'Dollar', 'Franc'] },
  { id: 'general_053', category: 'general', type: 'boolean', difficulty: 'easy', question: 'An adult human has 32 teeth.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_054', category: 'general', type: 'multiple', difficulty: 'easy', question: 'Which famous clock tower is located in London?', correctAnswer: 'Big Ben', incorrectAnswers: ['Eiffel Tower', 'Leaning Tower of Pisa', 'Tower of London'] },
  { id: 'general_055', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What does a thermometer measure?', correctAnswer: 'Temperature', incorrectAnswers: ['Pressure', 'Humidity', 'Wind speed'] },
  { id: 'general_056', category: 'general', type: 'boolean', difficulty: 'easy', question: 'Penguins can fly.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'general_057', category: 'general', type: 'multiple', difficulty: 'easy', question: 'How many days are in the month of February in a non-leap year?', correctAnswer: '28', incorrectAnswers: ['29', '30', '27'] },
  { id: 'general_058', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What do you call a baby dog?', correctAnswer: 'Puppy', incorrectAnswers: ['Kitten', 'Cub', 'Foal'] },
  { id: 'general_059', category: 'general', type: 'multiple', difficulty: 'easy', question: 'Which toy was invented first?', correctAnswer: 'Play-Doh', incorrectAnswers: ['LEGO', 'Barbie', 'Hot Wheels'] },
  { id: 'general_060', category: 'general', type: 'boolean', difficulty: 'easy', question: 'The hashtag symbol (#) is also called an octothorpe.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_061', category: 'general', type: 'multiple', difficulty: 'easy', question: 'What is the most common eye color in the world?', correctAnswer: 'Brown', incorrectAnswers: ['Blue', 'Green', 'Hazel'] },
  { id: 'general_062', category: 'general', type: 'multiple', difficulty: 'easy', question: 'Which holiday is celebrated on December 25th?', correctAnswer: 'Christmas', incorrectAnswers: ['Thanksgiving', 'Easter', 'Halloween'] },

  // Medium (12)
  { id: 'general_063', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What is the national animal of Scotland?', correctAnswer: 'Unicorn', incorrectAnswers: ['Lion', 'Stag', 'Eagle'] },
  { id: 'general_064', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What was the first invention to break the sound barrier?', correctAnswer: 'The whip', incorrectAnswers: ['The bullet', 'The jet engine', 'The rocket'] },
  { id: 'general_065', category: 'general', type: 'boolean', difficulty: 'medium', question: 'The ampersand (&) was once the 27th letter of the English alphabet.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_066', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What is the most widely spoken constructed language?', correctAnswer: 'Esperanto', incorrectAnswers: ['Klingon', 'Elvish', 'Dothraki'] },
  { id: 'general_067', category: 'general', type: 'multiple', difficulty: 'medium', question: 'Which country has the most official languages?', correctAnswer: 'South Africa', incorrectAnswers: ['India', 'Switzerland', 'Canada'] },
  { id: 'general_068', category: 'general', type: 'boolean', difficulty: 'medium', question: 'A group of crows is called a murder.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_069', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What color are the stars on the flag of the European Union?', correctAnswer: 'Gold (Yellow)', incorrectAnswers: ['White', 'Silver', 'Blue'] },
  { id: 'general_070', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What was bubble wrap originally invented to be?', correctAnswer: 'Textured wallpaper', incorrectAnswers: ['Packing material', 'Insulation', 'A children\'s toy'] },
  { id: 'general_071', category: 'general', type: 'multiple', difficulty: 'medium', question: 'How many hearts does an earthworm have?', correctAnswer: '5', incorrectAnswers: ['1', '3', '10'] },
  { id: 'general_072', category: 'general', type: 'boolean', difficulty: 'medium', question: 'The shortest war in recorded history lasted 38 minutes.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_073', category: 'general', type: 'multiple', difficulty: 'medium', question: 'What is the only number in English that has its letters in alphabetical order?', correctAnswer: 'Forty', incorrectAnswers: ['Eight', 'Fifty', 'Sixty'] },
  { id: 'general_074', category: 'general', type: 'multiple', difficulty: 'medium', question: 'Which famous structure was originally built as a temporary exhibit for the 1889 World\'s Fair?', correctAnswer: 'Eiffel Tower', incorrectAnswers: ['Statue of Liberty', 'London Eye', 'Arc de Triomphe'] },

  // Hard (10)
  { id: 'general_075', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What is the only organ in the human body that can completely regenerate?', correctAnswer: 'Liver', incorrectAnswers: ['Kidney', 'Skin', 'Lung'] },
  { id: 'general_076', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What country has won the most Nobel Prizes?', correctAnswer: 'United States', incorrectAnswers: ['United Kingdom', 'Germany', 'France'] },
  { id: 'general_077', category: 'general', type: 'boolean', difficulty: 'hard', question: 'Oxford University is older than the Aztec Empire.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_078', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What is the only letter that doesn\'t appear on the periodic table?', correctAnswer: 'J', incorrectAnswers: ['Q', 'X', 'Z'] },
  { id: 'general_079', category: 'general', type: 'multiple', difficulty: 'hard', question: 'How many world records does Guinness World Records hold itself?', correctAnswer: '0', incorrectAnswers: ['1', '3', '5'] },
  { id: 'general_080', category: 'general', type: 'boolean', difficulty: 'hard', question: 'There are more possible iterations of a game of chess than there are atoms in the observable universe.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'general_081', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What everyday object was patented by a funeral home owner in 1903?', correctAnswer: 'Windshield wipers', incorrectAnswers: ['Tissue box', 'Safety pin', 'Rubber gloves'] },
  { id: 'general_082', category: 'general', type: 'multiple', difficulty: 'hard', question: 'Which language has the most words?', correctAnswer: 'English', incorrectAnswers: ['Mandarin Chinese', 'Spanish', 'Arabic'] },
  { id: 'general_083', category: 'general', type: 'multiple', difficulty: 'hard', question: 'What color does octopus blood appear?', correctAnswer: 'Blue', incorrectAnswers: ['Red', 'Green', 'Clear'] },
  { id: 'general_084', category: 'general', type: 'boolean', difficulty: 'hard', question: 'The word "strengths" is the longest word in English with only one vowel.', correctAnswer: 'True', incorrectAnswers: ['False'] },

  // ═══════════════════════════════════════════
  // SCIENCE & NATURE (science_001 – science_040)
  // ═══════════════════════════════════════════

  // Easy (16)
  { id: 'science_001', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What planet is closest to the Sun?', correctAnswer: 'Mercury', incorrectAnswers: ['Venus', 'Earth', 'Mars'] },
  { id: 'science_002', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What is H2O commonly known as?', correctAnswer: 'Water', incorrectAnswers: ['Salt', 'Oxygen', 'Hydrogen'] },
  { id: 'science_003', category: 'science', type: 'boolean', difficulty: 'easy', question: 'The Earth revolves around the Sun.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'science_004', category: 'science', type: 'multiple', difficulty: 'easy', question: 'How many legs does a spider have?', correctAnswer: '8', incorrectAnswers: ['6', '10', '12'] },
  { id: 'science_005', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What force keeps us on the ground?', correctAnswer: 'Gravity', incorrectAnswers: ['Magnetism', 'Friction', 'Inertia'] },
  { id: 'science_006', category: 'science', type: 'boolean', difficulty: 'easy', question: 'Sound travels faster than light.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'science_007', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What is the largest organ in the human body?', correctAnswer: 'Skin', incorrectAnswers: ['Liver', 'Heart', 'Brain'] },
  { id: 'science_008', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What gas do plants absorb from the atmosphere?', correctAnswer: 'Carbon dioxide', incorrectAnswers: ['Oxygen', 'Nitrogen', 'Helium'] },
  { id: 'science_009', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What is the boiling point of water in Fahrenheit?', correctAnswer: '212', incorrectAnswers: ['200', '180', '100'] },
  { id: 'science_010', category: 'science', type: 'boolean', difficulty: 'easy', question: 'Diamonds are made of carbon.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'science_011', category: 'science', type: 'multiple', difficulty: 'easy', question: 'Which planet is the largest in our solar system?', correctAnswer: 'Jupiter', incorrectAnswers: ['Saturn', 'Neptune', 'Uranus'] },
  { id: 'science_012', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What is the center of an atom called?', correctAnswer: 'Nucleus', incorrectAnswers: ['Electron', 'Proton', 'Neutron'] },
  { id: 'science_013', category: 'science', type: 'boolean', difficulty: 'easy', question: 'Bats are blind.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'science_014', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What type of animal is a frog?', correctAnswer: 'Amphibian', incorrectAnswers: ['Reptile', 'Mammal', 'Fish'] },
  { id: 'science_015', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What do caterpillars turn into?', correctAnswer: 'Butterflies', incorrectAnswers: ['Beetles', 'Dragonflies', 'Moths'] },
  { id: 'science_016', category: 'science', type: 'multiple', difficulty: 'easy', question: 'What is the chemical symbol for oxygen?', correctAnswer: 'O', incorrectAnswers: ['Ox', 'Og', 'Om'] },

  // Medium (14)
  { id: 'science_017', category: 'science', type: 'multiple', difficulty: 'medium', question: 'What is the speed of light in kilometers per second (approximately)?', correctAnswer: '300,000', incorrectAnswers: ['150,000', '500,000', '1,000,000'] },
  { id: 'science_018', category: 'science', type: 'multiple', difficulty: 'medium', question: 'What part of the cell contains DNA?', correctAnswer: 'Nucleus', incorrectAnswers: ['Mitochondria', 'Ribosome', 'Cytoplasm'] },
  { id: 'science_019', category: 'science', type: 'boolean', difficulty: 'medium', question: 'Electrons are larger than molecules.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'science_020', category: 'science', type: 'multiple', difficulty: 'medium', question: 'What is the most abundant element in the universe?', correctAnswer: 'Hydrogen', incorrectAnswers: ['Helium', 'Oxygen', 'Carbon'] },
  { id: 'science_021', category: 'science', type: 'multiple', difficulty: 'medium', question: 'How many planets in our solar system have rings?', correctAnswer: '4', incorrectAnswers: ['2', '1', '3'] },
  { id: 'science_022', category: 'science', type: 'multiple', difficulty: 'medium', question: 'What is the powerhouse of the cell?', correctAnswer: 'Mitochondria', incorrectAnswers: ['Nucleus', 'Ribosome', 'Golgi apparatus'] },
  { id: 'science_023', category: 'science', type: 'boolean', difficulty: 'medium', question: 'Venus is the hottest planet in our solar system.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'science_024', category: 'science', type: 'multiple', difficulty: 'medium', question: 'What type of rock is formed by cooling lava?', correctAnswer: 'Igneous', incorrectAnswers: ['Sedimentary', 'Metamorphic', 'Calcium'] },
  { id: 'science_025', category: 'science', type: 'multiple', difficulty: 'medium', question: 'What is the pH value of pure water?', correctAnswer: '7', incorrectAnswers: ['0', '5', '14'] },
  { id: 'science_026', category: 'science', type: 'multiple', difficulty: 'medium', question: 'What animal has the longest lifespan?', correctAnswer: 'Greenland shark', incorrectAnswers: ['Giant tortoise', 'Bowhead whale', 'Blue whale'] },
  { id: 'science_027', category: 'science', type: 'boolean', difficulty: 'medium', question: 'Humans and bananas share about 60% of the same DNA.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'science_028', category: 'science', type: 'multiple', difficulty: 'medium', question: 'What is the main gas found in the air we breathe?', correctAnswer: 'Nitrogen', incorrectAnswers: ['Oxygen', 'Carbon dioxide', 'Argon'] },
  { id: 'science_029', category: 'science', type: 'multiple', difficulty: 'medium', question: 'How long does it take light from the Sun to reach Earth?', correctAnswer: 'About 8 minutes', incorrectAnswers: ['About 1 minute', 'About 30 minutes', 'About 1 second'] },
  { id: 'science_030', category: 'science', type: 'boolean', difficulty: 'medium', question: 'Antibiotics are effective against viruses.', correctAnswer: 'False', incorrectAnswers: ['True'] },

  // Hard (10)
  { id: 'science_031', category: 'science', type: 'multiple', difficulty: 'hard', question: 'What is the Schwarzschild radius associated with?', correctAnswer: 'Black holes', incorrectAnswers: ['Neutron stars', 'White dwarfs', 'Supernovae'] },
  { id: 'science_032', category: 'science', type: 'multiple', difficulty: 'hard', question: 'What is the half-life of Carbon-14?', correctAnswer: '5,730 years', incorrectAnswers: ['1,200 years', '10,500 years', '50,000 years'] },
  { id: 'science_033', category: 'science', type: 'boolean', difficulty: 'hard', question: 'Tardigrades can survive in the vacuum of outer space.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'science_034', category: 'science', type: 'multiple', difficulty: 'hard', question: 'What is the heaviest naturally occurring element?', correctAnswer: 'Uranium', incorrectAnswers: ['Plutonium', 'Lead', 'Osmium'] },
  { id: 'science_035', category: 'science', type: 'multiple', difficulty: 'hard', question: 'What particle is exchanged to mediate the electromagnetic force?', correctAnswer: 'Photon', incorrectAnswers: ['Gluon', 'W boson', 'Graviton'] },
  { id: 'science_036', category: 'science', type: 'multiple', difficulty: 'hard', question: 'What is the Mohs hardness of topaz?', correctAnswer: '8', incorrectAnswers: ['6', '7', '9'] },
  { id: 'science_037', category: 'science', type: 'boolean', difficulty: 'hard', question: 'A group of flamingos is called a "flamboyance."', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'science_038', category: 'science', type: 'multiple', difficulty: 'hard', question: 'Which organ in the human body produces insulin?', correctAnswer: 'Pancreas', incorrectAnswers: ['Liver', 'Kidney', 'Spleen'] },
  { id: 'science_039', category: 'science', type: 'multiple', difficulty: 'hard', question: 'What is the chemical formula for sulfuric acid?', correctAnswer: 'H2SO4', incorrectAnswers: ['HCl', 'H2CO3', 'HNO3'] },
  { id: 'science_040', category: 'science', type: 'multiple', difficulty: 'hard', question: 'What phenomenon causes the apparent bending of light as it passes through different media?', correctAnswer: 'Refraction', incorrectAnswers: ['Diffraction', 'Reflection', 'Dispersion'] },

  // ═══════════════════════════════════════════
  // HISTORY (history_001 – history_040)
  // ═══════════════════════════════════════════

  // Easy (16)
  { id: 'history_001', category: 'history', type: 'multiple', difficulty: 'easy', question: 'Who was the first President of the United States?', correctAnswer: 'George Washington', incorrectAnswers: ['Thomas Jefferson', 'John Adams', 'Abraham Lincoln'] },
  { id: 'history_002', category: 'history', type: 'multiple', difficulty: 'easy', question: 'In which country were the ancient pyramids of Giza built?', correctAnswer: 'Egypt', incorrectAnswers: ['Mexico', 'Greece', 'Iraq'] },
  { id: 'history_003', category: 'history', type: 'boolean', difficulty: 'easy', question: 'World War II ended in 1945.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'history_004', category: 'history', type: 'multiple', difficulty: 'easy', question: 'What ancient civilization built Machu Picchu?', correctAnswer: 'Inca', incorrectAnswers: ['Maya', 'Aztec', 'Olmec'] },
  { id: 'history_005', category: 'history', type: 'multiple', difficulty: 'easy', question: 'What ship sank on its maiden voyage in 1912?', correctAnswer: 'Titanic', incorrectAnswers: ['Lusitania', 'Britannic', 'Olympic'] },
  { id: 'history_006', category: 'history', type: 'boolean', difficulty: 'easy', question: 'The Roman Empire was based in modern-day Italy.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'history_007', category: 'history', type: 'multiple', difficulty: 'easy', question: 'Who discovered America in 1492?', correctAnswer: 'Christopher Columbus', incorrectAnswers: ['Amerigo Vespucci', 'Leif Erikson', 'Ferdinand Magellan'] },
  { id: 'history_008', category: 'history', type: 'multiple', difficulty: 'easy', question: 'What was the name of the period of cultural rebirth in Europe from the 14th to 17th century?', correctAnswer: 'Renaissance', incorrectAnswers: ['Enlightenment', 'Industrial Revolution', 'Reformation'] },
  { id: 'history_009', category: 'history', type: 'multiple', difficulty: 'easy', question: 'Which country did the United States declare independence from?', correctAnswer: 'Great Britain', incorrectAnswers: ['France', 'Spain', 'Netherlands'] },
  { id: 'history_010', category: 'history', type: 'boolean', difficulty: 'easy', question: 'Cleopatra was Egyptian by birth.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'history_011', category: 'history', type: 'multiple', difficulty: 'easy', question: 'Who painted the Mona Lisa?', correctAnswer: 'Leonardo da Vinci', incorrectAnswers: ['Michelangelo', 'Raphael', 'Donatello'] },
  { id: 'history_012', category: 'history', type: 'multiple', difficulty: 'easy', question: 'In which city is the Colosseum located?', correctAnswer: 'Rome', incorrectAnswers: ['Athens', 'Istanbul', 'Cairo'] },
  { id: 'history_013', category: 'history', type: 'multiple', difficulty: 'easy', question: 'What was the name of the first man to walk on the Moon?', correctAnswer: 'Neil Armstrong', incorrectAnswers: ['Buzz Aldrin', 'Yuri Gagarin', 'John Glenn'] },
  { id: 'history_014', category: 'history', type: 'boolean', difficulty: 'easy', question: 'The Great Fire of London happened in 1666.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'history_015', category: 'history', type: 'multiple', difficulty: 'easy', question: 'Which war was fought between the North and South of the United States?', correctAnswer: 'Civil War', incorrectAnswers: ['Revolutionary War', 'War of 1812', 'Spanish-American War'] },
  { id: 'history_016', category: 'history', type: 'multiple', difficulty: 'easy', question: 'Who wrote the Declaration of Independence?', correctAnswer: 'Thomas Jefferson', incorrectAnswers: ['Benjamin Franklin', 'George Washington', 'John Adams'] },

  // Medium (14)
  { id: 'history_017', category: 'history', type: 'multiple', difficulty: 'medium', question: 'In what year did the Berlin Wall fall?', correctAnswer: '1989', incorrectAnswers: ['1991', '1985', '1987'] },
  { id: 'history_018', category: 'history', type: 'multiple', difficulty: 'medium', question: 'Who was the British Prime Minister during most of World War II?', correctAnswer: 'Winston Churchill', incorrectAnswers: ['Neville Chamberlain', 'Clement Attlee', 'Anthony Eden'] },
  { id: 'history_019', category: 'history', type: 'boolean', difficulty: 'medium', question: 'The Hundred Years\' War lasted exactly 100 years.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'history_020', category: 'history', type: 'multiple', difficulty: 'medium', question: 'What empire was ruled by Genghis Khan?', correctAnswer: 'Mongol Empire', incorrectAnswers: ['Ottoman Empire', 'Persian Empire', 'Roman Empire'] },
  { id: 'history_021', category: 'history', type: 'multiple', difficulty: 'medium', question: 'What was the code name for the Allied invasion of Normandy?', correctAnswer: 'D-Day (Operation Overlord)', incorrectAnswers: ['Operation Barbarossa', 'Operation Market Garden', 'Operation Torch'] },
  { id: 'history_022', category: 'history', type: 'multiple', difficulty: 'medium', question: 'Which ancient wonder was located in Alexandria, Egypt?', correctAnswer: 'The Lighthouse (Pharos)', incorrectAnswers: ['The Hanging Gardens', 'The Colossus', 'The Temple of Artemis'] },
  { id: 'history_023', category: 'history', type: 'boolean', difficulty: 'medium', question: 'Napoleon Bonaparte was unusually short for his time.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'history_024', category: 'history', type: 'multiple', difficulty: 'medium', question: 'What treaty ended World War I?', correctAnswer: 'Treaty of Versailles', incorrectAnswers: ['Treaty of Paris', 'Treaty of Ghent', 'Treaty of Tordesillas'] },
  { id: 'history_025', category: 'history', type: 'multiple', difficulty: 'medium', question: 'Who was the first woman to fly solo across the Atlantic?', correctAnswer: 'Amelia Earhart', incorrectAnswers: ['Bessie Coleman', 'Harriet Quimby', 'Jacqueline Cochran'] },
  { id: 'history_026', category: 'history', type: 'multiple', difficulty: 'medium', question: 'What civilization invented the concept of zero?', correctAnswer: 'Maya and Indian civilizations', incorrectAnswers: ['Greek', 'Roman', 'Egyptian'] },
  { id: 'history_027', category: 'history', type: 'boolean', difficulty: 'medium', question: 'The Aztec Empire was located in present-day Peru.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'history_028', category: 'history', type: 'multiple', difficulty: 'medium', question: 'Which U.S. President issued the Emancipation Proclamation?', correctAnswer: 'Abraham Lincoln', incorrectAnswers: ['Andrew Johnson', 'Ulysses S. Grant', 'James Buchanan'] },
  { id: 'history_029', category: 'history', type: 'multiple', difficulty: 'medium', question: 'What event started World War I?', correctAnswer: 'Assassination of Archduke Franz Ferdinand', incorrectAnswers: ['Sinking of the Lusitania', 'Invasion of Poland', 'The Zimmermann Telegram'] },
  { id: 'history_030', category: 'history', type: 'multiple', difficulty: 'medium', question: 'In which decade did the Black Death devastate Europe?', correctAnswer: '1340s', incorrectAnswers: ['1240s', '1440s', '1540s'] },

  // Hard (10)
  { id: 'history_031', category: 'history', type: 'multiple', difficulty: 'hard', question: 'What was the shortest war in history?', correctAnswer: 'Anglo-Zanzibar War', incorrectAnswers: ['Six-Day War', 'Falklands War', 'Football War'] },
  { id: 'history_032', category: 'history', type: 'multiple', difficulty: 'hard', question: 'Which Roman Emperor made Christianity the state religion?', correctAnswer: 'Theodosius I', incorrectAnswers: ['Constantine', 'Augustus', 'Nero'] },
  { id: 'history_033', category: 'history', type: 'boolean', difficulty: 'hard', question: 'The Rosetta Stone was discovered by French soldiers in 1799.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'history_034', category: 'history', type: 'multiple', difficulty: 'hard', question: 'What was the original name of Istanbul?', correctAnswer: 'Constantinople', incorrectAnswers: ['Byzantium', 'Ankara', 'Troy'] },
  { id: 'history_035', category: 'history', type: 'multiple', difficulty: 'hard', question: 'Who was the last Pharaoh of Egypt?', correctAnswer: 'Cleopatra VII', incorrectAnswers: ['Ramesses II', 'Tutankhamun', 'Nefertiti'] },
  { id: 'history_036', category: 'history', type: 'multiple', difficulty: 'hard', question: 'In what year was the Magna Carta signed?', correctAnswer: '1215', incorrectAnswers: ['1066', '1315', '1189'] },
  { id: 'history_037', category: 'history', type: 'boolean', difficulty: 'hard', question: 'Vikings wore horned helmets in battle.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'history_038', category: 'history', type: 'multiple', difficulty: 'hard', question: 'What was the largest contiguous empire in history?', correctAnswer: 'Mongol Empire', incorrectAnswers: ['British Empire', 'Roman Empire', 'Ottoman Empire'] },
  { id: 'history_039', category: 'history', type: 'multiple', difficulty: 'hard', question: 'Which ancient Greek philosopher was sentenced to death by drinking hemlock?', correctAnswer: 'Socrates', incorrectAnswers: ['Plato', 'Aristotle', 'Pythagoras'] },
  { id: 'history_040', category: 'history', type: 'multiple', difficulty: 'hard', question: 'What event in 1054 split Christianity into Eastern Orthodox and Roman Catholic?', correctAnswer: 'The Great Schism', incorrectAnswers: ['The Crusades', 'The Reformation', 'The Council of Nicaea'] },

  // ═══════════════════════════════════════════
  // MUSIC (music_001 – music_006)
  // ═══════════════════════════════════════════

  { id: 'music_001', category: 'music', type: 'multiple', difficulty: 'easy', question: 'What band was John Lennon a member of?', correctAnswer: 'The Beatles', incorrectAnswers: ['The Rolling Stones', 'The Who', 'Led Zeppelin'] },
  { id: 'music_002', category: 'music', type: 'multiple', difficulty: 'easy', question: 'Which pop star is known as the "Queen of Pop"?', correctAnswer: 'Madonna', incorrectAnswers: ['Beyonce', 'Lady Gaga', 'Taylor Swift'] },
  { id: 'music_003', category: 'music', type: 'multiple', difficulty: 'medium', question: 'Which band performed "Bohemian Rhapsody"?', correctAnswer: 'Queen', incorrectAnswers: ['The Beatles', 'Led Zeppelin', 'Pink Floyd'] },
  { id: 'music_004', category: 'music', type: 'multiple', difficulty: 'medium', question: 'What is the real name of Lady Gaga?', correctAnswer: 'Stefani Germanotta', incorrectAnswers: ['Robyn Fenty', 'Destiny Hope Cyrus', 'Alecia Moore'] },
  { id: 'music_005', category: 'music', type: 'multiple', difficulty: 'hard', question: 'What was the first music video played on MTV?', correctAnswer: 'Video Killed the Radio Star', incorrectAnswers: ['Thriller', 'Take On Me', 'Billie Jean'] },
  { id: 'music_006', category: 'music', type: 'multiple', difficulty: 'hard', question: 'What was the name of the band Kurt Cobain fronted before Nirvana?', correctAnswer: 'Fecal Matter', incorrectAnswers: ['Melvins', 'Mudhoney', 'Screaming Trees'] },

  // ═══════════════════════════════════════════
  // MOVIES & TV (movies_tv_001 – movies_tv_026)
  // ═══════════════════════════════════════════

  // Easy (12)
  { id: 'movies_tv_001', category: 'movies_tv', type: 'multiple', difficulty: 'easy', question: 'What movie features a character named Simba?', correctAnswer: 'The Lion King', incorrectAnswers: ['Bambi', 'The Jungle Book', 'Madagascar'] },
  { id: 'movies_tv_002', category: 'movies_tv', type: 'boolean', difficulty: 'easy', question: 'Mickey Mouse\'s original name was Mortimer Mouse.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'movies_tv_003', category: 'movies_tv', type: 'multiple', difficulty: 'easy', question: 'In the Harry Potter series, what house is Harry sorted into?', correctAnswer: 'Gryffindor', incorrectAnswers: ['Slytherin', 'Ravenclaw', 'Hufflepuff'] },
  { id: 'movies_tv_004', category: 'movies_tv', type: 'boolean', difficulty: 'easy', question: 'The TV show "Friends" is set in New York City.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'movies_tv_005', category: 'movies_tv', type: 'multiple', difficulty: 'easy', question: 'Which superhero is known as the Man of Steel?', correctAnswer: 'Superman', incorrectAnswers: ['Iron Man', 'Captain America', 'Batman'] },
  { id: 'movies_tv_006', category: 'movies_tv', type: 'multiple', difficulty: 'easy', question: 'Who played Jack in the movie Titanic?', correctAnswer: 'Leonardo DiCaprio', incorrectAnswers: ['Brad Pitt', 'Matt Damon', 'Tom Hanks'] },
  { id: 'movies_tv_007', category: 'movies_tv', type: 'multiple', difficulty: 'easy', question: 'What is the name of the fictional country in the movie Black Panther?', correctAnswer: 'Wakanda', incorrectAnswers: ['Genovia', 'Zamunda', 'Latveria'] },
  { id: 'movies_tv_008', category: 'movies_tv', type: 'multiple', difficulty: 'easy', question: 'What animated movie features a fish named Nemo?', correctAnswer: 'Finding Nemo', incorrectAnswers: ['Shark Tale', 'The Little Mermaid', 'Moana'] },
  { id: 'movies_tv_009', category: 'movies_tv', type: 'multiple', difficulty: 'easy', question: 'What is the name of the wizard school in Harry Potter?', correctAnswer: 'Hogwarts', incorrectAnswers: ['Beauxbatons', 'Durmstrang', 'Ilvermorny'] },
  { id: 'movies_tv_010', category: 'movies_tv', type: 'boolean', difficulty: 'easy', question: 'Darth Vader says "Luke, I am your father" in Star Wars.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'movies_tv_011', category: 'movies_tv', type: 'multiple', difficulty: 'easy', question: 'What is the highest-grossing film of all time (not adjusted for inflation)?', correctAnswer: 'Avatar', incorrectAnswers: ['Avengers: Endgame', 'Titanic', 'Star Wars: The Force Awakens'] },
  { id: 'movies_tv_012', category: 'movies_tv', type: 'multiple', difficulty: 'easy', question: 'Which Disney princess has ice powers?', correctAnswer: 'Elsa', incorrectAnswers: ['Anna', 'Rapunzel', 'Moana'] },

  // Medium (9)
  { id: 'movies_tv_013', category: 'movies_tv', type: 'multiple', difficulty: 'medium', question: 'What TV series features dragons and the Iron Throne?', correctAnswer: 'Game of Thrones', incorrectAnswers: ['The Witcher', 'Lord of the Rings', 'Vikings'] },
  { id: 'movies_tv_014', category: 'movies_tv', type: 'multiple', difficulty: 'medium', question: 'Which actor played the Joker in The Dark Knight?', correctAnswer: 'Heath Ledger', incorrectAnswers: ['Jack Nicholson', 'Jared Leto', 'Joaquin Phoenix'] },
  { id: 'movies_tv_015', category: 'movies_tv', type: 'boolean', difficulty: 'medium', question: 'The character Gandalf appears in both The Hobbit and The Lord of the Rings.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'movies_tv_016', category: 'movies_tv', type: 'multiple', difficulty: 'medium', question: 'In The Matrix, what color pill does Neo take?', correctAnswer: 'Red', incorrectAnswers: ['Blue', 'Green', 'White'] },
  { id: 'movies_tv_017', category: 'movies_tv', type: 'boolean', difficulty: 'medium', question: 'The Simpsons first aired in the 1980s.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'movies_tv_018', category: 'movies_tv', type: 'multiple', difficulty: 'medium', question: 'What is the name of the fictional metal in the Marvel universe that Captain America\'s shield is made from?', correctAnswer: 'Vibranium', incorrectAnswers: ['Adamantium', 'Uru', 'Carbonadium'] },
  { id: 'movies_tv_019', category: 'movies_tv', type: 'multiple', difficulty: 'medium', question: 'Who directed Jurassic Park?', correctAnswer: 'Steven Spielberg', incorrectAnswers: ['James Cameron', 'George Lucas', 'Ridley Scott'] },
  { id: 'movies_tv_020', category: 'movies_tv', type: 'multiple', difficulty: 'medium', question: 'Which movie won the first Academy Award for Best Picture?', correctAnswer: 'Wings', incorrectAnswers: ['Sunrise', 'The Jazz Singer', 'All Quiet on the Western Front'] },
  { id: 'movies_tv_021', category: 'movies_tv', type: 'multiple', difficulty: 'medium', question: 'What is the name of the coffee shop in the TV show Friends?', correctAnswer: 'Central Perk', incorrectAnswers: ['The Coffee Bean', 'Moondance Diner', 'Java Lava'] },

  // Hard (5)
  { id: 'movies_tv_022', category: 'movies_tv', type: 'multiple', difficulty: 'hard', question: 'What was the first feature-length animated movie ever released?', correctAnswer: 'El Apostol', incorrectAnswers: ['Snow White and the Seven Dwarfs', 'Fantasia', 'Steamboat Willie'] },
  { id: 'movies_tv_023', category: 'movies_tv', type: 'multiple', difficulty: 'hard', question: 'In the TV show Breaking Bad, what is Walter White\'s street address?', correctAnswer: '308 Negra Arroyo Lane', incorrectAnswers: ['742 Evergreen Terrace', '221B Baker Street', '1600 Pennsylvania Ave'] },
  { id: 'movies_tv_024', category: 'movies_tv', type: 'boolean', difficulty: 'hard', question: 'The original Star Wars trilogy was filmed entirely in the United States.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'movies_tv_025', category: 'movies_tv', type: 'multiple', difficulty: 'hard', question: 'What is the name of Quentin Tarantino\'s first film?', correctAnswer: 'Reservoir Dogs', incorrectAnswers: ['Pulp Fiction', 'Kill Bill', 'True Romance'] },
  { id: 'movies_tv_026', category: 'movies_tv', type: 'multiple', difficulty: 'hard', question: 'Which actress has won the most Academy Awards?', correctAnswer: 'Katharine Hepburn', incorrectAnswers: ['Meryl Streep', 'Audrey Hepburn', 'Cate Blanchett'] },

  // ═══════════════════════════════════════════
  // GEOGRAPHY (geography_001 – geography_040)
  // ═══════════════════════════════════════════

  // Easy (16)
  { id: 'geography_001', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'What is the capital of France?', correctAnswer: 'Paris', incorrectAnswers: ['London', 'Berlin', 'Madrid'] },
  { id: 'geography_002', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'Which continent is the Sahara Desert on?', correctAnswer: 'Africa', incorrectAnswers: ['Asia', 'Australia', 'South America'] },
  { id: 'geography_003', category: 'geography', type: 'boolean', difficulty: 'easy', question: 'Australia is both a country and a continent.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'geography_004', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'What is the largest country in the world by area?', correctAnswer: 'Russia', incorrectAnswers: ['Canada', 'China', 'United States'] },
  { id: 'geography_005', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'Which ocean is the largest?', correctAnswer: 'Pacific', incorrectAnswers: ['Atlantic', 'Indian', 'Arctic'] },
  { id: 'geography_006', category: 'geography', type: 'boolean', difficulty: 'easy', question: 'The Amazon River is in South America.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'geography_007', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'What is the capital of Japan?', correctAnswer: 'Tokyo', incorrectAnswers: ['Osaka', 'Kyoto', 'Seoul'] },
  { id: 'geography_008', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'Which country has the most people?', correctAnswer: 'India', incorrectAnswers: ['China', 'United States', 'Indonesia'] },
  { id: 'geography_009', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'On which continent is Brazil located?', correctAnswer: 'South America', incorrectAnswers: ['North America', 'Europe', 'Africa'] },
  { id: 'geography_010', category: 'geography', type: 'boolean', difficulty: 'easy', question: 'Iceland is covered mostly in ice.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'geography_011', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'What is the capital of the United Kingdom?', correctAnswer: 'London', incorrectAnswers: ['Manchester', 'Edinburgh', 'Dublin'] },
  { id: 'geography_012', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'Which river flows through Egypt?', correctAnswer: 'Nile', incorrectAnswers: ['Amazon', 'Tigris', 'Ganges'] },
  { id: 'geography_013', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'What is the tallest mountain in the world?', correctAnswer: 'Mount Everest', incorrectAnswers: ['K2', 'Mount Kilimanjaro', 'Mont Blanc'] },
  { id: 'geography_014', category: 'geography', type: 'boolean', difficulty: 'easy', question: 'Hawaii is part of the United States.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'geography_015', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'Which country is shaped like a boot?', correctAnswer: 'Italy', incorrectAnswers: ['Greece', 'Spain', 'Portugal'] },
  { id: 'geography_016', category: 'geography', type: 'multiple', difficulty: 'easy', question: 'What are the two longest rivers in Africa?', correctAnswer: 'Nile and Congo', incorrectAnswers: ['Nile and Niger', 'Congo and Zambezi', 'Niger and Zambezi'] },

  // Medium (14)
  { id: 'geography_017', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'What is the smallest continent by land area?', correctAnswer: 'Australia', incorrectAnswers: ['Europe', 'Antarctica', 'South America'] },
  { id: 'geography_018', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'Which country has the longest coastline?', correctAnswer: 'Canada', incorrectAnswers: ['Australia', 'Russia', 'Indonesia'] },
  { id: 'geography_019', category: 'geography', type: 'boolean', difficulty: 'medium', question: 'The Dead Sea is actually a lake.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'geography_020', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'What is the capital of Australia?', correctAnswer: 'Canberra', incorrectAnswers: ['Sydney', 'Melbourne', 'Brisbane'] },
  { id: 'geography_021', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'Which African country was formerly known as Abyssinia?', correctAnswer: 'Ethiopia', incorrectAnswers: ['Somalia', 'Eritrea', 'Kenya'] },
  { id: 'geography_022', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'What strait separates Europe from Africa?', correctAnswer: 'Strait of Gibraltar', incorrectAnswers: ['Strait of Hormuz', 'Bosphorus Strait', 'Strait of Malacca'] },
  { id: 'geography_023', category: 'geography', type: 'boolean', difficulty: 'medium', question: 'Mount Kilimanjaro is located in Kenya.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'geography_024', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'How many countries are in the United Kingdom?', correctAnswer: '4', incorrectAnswers: ['2', '3', '5'] },
  { id: 'geography_025', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'Which desert is the largest hot desert in the world?', correctAnswer: 'Sahara', incorrectAnswers: ['Arabian', 'Gobi', 'Kalahari'] },
  { id: 'geography_026', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'What country has the most islands?', correctAnswer: 'Sweden', incorrectAnswers: ['Indonesia', 'Philippines', 'Japan'] },
  { id: 'geography_027', category: 'geography', type: 'boolean', difficulty: 'medium', question: 'The Danube River flows through more countries than any other river in the world.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'geography_028', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'What is the driest continent on Earth?', correctAnswer: 'Antarctica', incorrectAnswers: ['Africa', 'Australia', 'Asia'] },
  { id: 'geography_029', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'Which U.S. state is the largest by area?', correctAnswer: 'Alaska', incorrectAnswers: ['Texas', 'California', 'Montana'] },
  { id: 'geography_030', category: 'geography', type: 'multiple', difficulty: 'medium', question: 'What is the capital of Canada?', correctAnswer: 'Ottawa', incorrectAnswers: ['Toronto', 'Vancouver', 'Montreal'] },

  // Hard (10)
  { id: 'geography_031', category: 'geography', type: 'multiple', difficulty: 'hard', question: 'What is the deepest point in the ocean?', correctAnswer: 'Mariana Trench', incorrectAnswers: ['Tonga Trench', 'Philippine Trench', 'Puerto Rico Trench'] },
  { id: 'geography_032', category: 'geography', type: 'multiple', difficulty: 'hard', question: 'Which country has the most time zones?', correctAnswer: 'France', incorrectAnswers: ['Russia', 'United States', 'United Kingdom'] },
  { id: 'geography_033', category: 'geography', type: 'boolean', difficulty: 'hard', question: 'Lake Baikal in Russia contains about 20% of the world\'s unfrozen freshwater.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'geography_034', category: 'geography', type: 'multiple', difficulty: 'hard', question: 'What is the only country that lies entirely within the Alps?', correctAnswer: 'Liechtenstein', incorrectAnswers: ['Switzerland', 'Austria', 'Andorra'] },
  { id: 'geography_035', category: 'geography', type: 'multiple', difficulty: 'hard', question: 'Which city is located on two continents?', correctAnswer: 'Istanbul', incorrectAnswers: ['Cairo', 'Moscow', 'Dubai'] },
  { id: 'geography_036', category: 'geography', type: 'multiple', difficulty: 'hard', question: 'What is the longest mountain range in the world?', correctAnswer: 'Andes', incorrectAnswers: ['Himalayas', 'Rocky Mountains', 'Alps'] },
  { id: 'geography_037', category: 'geography', type: 'boolean', difficulty: 'hard', question: 'Greenland is a part of North America geographically.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'geography_038', category: 'geography', type: 'multiple', difficulty: 'hard', question: 'What is the least densely populated country in the world?', correctAnswer: 'Mongolia', incorrectAnswers: ['Australia', 'Namibia', 'Iceland'] },
  { id: 'geography_039', category: 'geography', type: 'multiple', difficulty: 'hard', question: 'Which African country has the largest population?', correctAnswer: 'Nigeria', incorrectAnswers: ['Ethiopia', 'Egypt', 'South Africa'] },
  { id: 'geography_040', category: 'geography', type: 'multiple', difficulty: 'hard', question: 'What is the only landlocked country in Southeast Asia?', correctAnswer: 'Laos', incorrectAnswers: ['Cambodia', 'Myanmar', 'Vietnam'] },

  // ═══════════════════════════════════════════
  // SPORTS (sports_001 – sports_040)
  // ═══════════════════════════════════════════

  // Easy (16)
  { id: 'sports_001', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'How many players are on a standard soccer team on the field?', correctAnswer: '11', incorrectAnswers: ['9', '10', '12'] },
  { id: 'sports_002', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'In which sport do you use a racket to hit a shuttlecock?', correctAnswer: 'Badminton', incorrectAnswers: ['Tennis', 'Squash', 'Table Tennis'] },
  { id: 'sports_003', category: 'sports', type: 'boolean', difficulty: 'easy', question: 'The Olympics are held every 4 years.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'sports_004', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'What sport is known as "America\'s pastime"?', correctAnswer: 'Baseball', incorrectAnswers: ['Football', 'Basketball', 'Hockey'] },
  { id: 'sports_005', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'How many points is a touchdown worth in American football?', correctAnswer: '6', incorrectAnswers: ['7', '3', '4'] },
  { id: 'sports_006', category: 'sports', type: 'boolean', difficulty: 'easy', question: 'A marathon is exactly 26.2 miles.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'sports_007', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'What color is the center of an archery target?', correctAnswer: 'Yellow (Gold)', incorrectAnswers: ['Red', 'Blue', 'Black'] },
  { id: 'sports_008', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'In basketball, how many points is a free throw worth?', correctAnswer: '1', incorrectAnswers: ['2', '3', '0'] },
  { id: 'sports_009', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'Which country invented cricket?', correctAnswer: 'England', incorrectAnswers: ['India', 'Australia', 'South Africa'] },
  { id: 'sports_010', category: 'sports', type: 'boolean', difficulty: 'easy', question: 'A golf ball has dimples on it.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'sports_011', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'How many rings are on the Olympic flag?', correctAnswer: '5', incorrectAnswers: ['4', '6', '7'] },
  { id: 'sports_012', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'In tennis, what is a score of zero called?', correctAnswer: 'Love', incorrectAnswers: ['Nil', 'Zero', 'Deuce'] },
  { id: 'sports_013', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'What sport does Tiger Woods play?', correctAnswer: 'Golf', incorrectAnswers: ['Tennis', 'Baseball', 'Cricket'] },
  { id: 'sports_014', category: 'sports', type: 'boolean', difficulty: 'easy', question: 'Soccer is called football in most countries outside the United States.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'sports_015', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'What is the most popular sport in the world?', correctAnswer: 'Soccer (Football)', incorrectAnswers: ['Cricket', 'Basketball', 'Tennis'] },
  { id: 'sports_016', category: 'sports', type: 'multiple', difficulty: 'easy', question: 'In which sport would you perform a slam dunk?', correctAnswer: 'Basketball', incorrectAnswers: ['Volleyball', 'Tennis', 'Football'] },

  // Medium (14)
  { id: 'sports_017', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'Which country has won the most FIFA World Cup titles?', correctAnswer: 'Brazil', incorrectAnswers: ['Germany', 'Italy', 'Argentina'] },
  { id: 'sports_018', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'What is the diameter of a basketball hoop in inches?', correctAnswer: '18', incorrectAnswers: ['16', '20', '15'] },
  { id: 'sports_019', category: 'sports', type: 'boolean', difficulty: 'medium', question: 'Michael Jordan was drafted first overall in the NBA draft.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'sports_020', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'In which city were the first modern Olympic Games held in 1896?', correctAnswer: 'Athens', incorrectAnswers: ['Paris', 'London', 'Rome'] },
  { id: 'sports_021', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'What is the only Grand Slam tennis tournament played on clay?', correctAnswer: 'French Open', incorrectAnswers: ['Australian Open', 'Wimbledon', 'US Open'] },
  { id: 'sports_022', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'How many periods are in a standard ice hockey game?', correctAnswer: '3', incorrectAnswers: ['2', '4', '5'] },
  { id: 'sports_023', category: 'sports', type: 'boolean', difficulty: 'medium', question: 'Usain Bolt\'s 100m world record is under 9.5 seconds.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'sports_024', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'Which boxer was known as "The Greatest"?', correctAnswer: 'Muhammad Ali', incorrectAnswers: ['Mike Tyson', 'Floyd Mayweather', 'Sugar Ray Leonard'] },
  { id: 'sports_025', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'In baseball, how many strikes make an out?', correctAnswer: '3', incorrectAnswers: ['2', '4', '5'] },
  { id: 'sports_026', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'What country is the sport of sumo wrestling from?', correctAnswer: 'Japan', incorrectAnswers: ['China', 'South Korea', 'Mongolia'] },
  { id: 'sports_027', category: 'sports', type: 'boolean', difficulty: 'medium', question: 'The Super Bowl is the championship game for the NHL.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'sports_028', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'How long is an Olympic swimming pool in meters?', correctAnswer: '50', incorrectAnswers: ['25', '100', '75'] },
  { id: 'sports_029', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'Which NBA player holds the record for most career points?', correctAnswer: 'LeBron James', incorrectAnswers: ['Kareem Abdul-Jabbar', 'Michael Jordan', 'Kobe Bryant'] },
  { id: 'sports_030', category: 'sports', type: 'multiple', difficulty: 'medium', question: 'What is the national sport of Canada?', correctAnswer: 'Lacrosse', incorrectAnswers: ['Ice Hockey', 'Curling', 'Baseball'] },

  // Hard (10)
  { id: 'sports_031', category: 'sports', type: 'multiple', difficulty: 'hard', question: 'What is the only country to have played in every FIFA World Cup?', correctAnswer: 'Brazil', incorrectAnswers: ['Germany', 'Argentina', 'Italy'] },
  { id: 'sports_032', category: 'sports', type: 'multiple', difficulty: 'hard', question: 'In cricket, how many runs is a "century"?', correctAnswer: '100', incorrectAnswers: ['50', '200', '150'] },
  { id: 'sports_033', category: 'sports', type: 'boolean', difficulty: 'hard', question: 'Table tennis was once an Olympic sport that was removed and then reinstated.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'sports_034', category: 'sports', type: 'multiple', difficulty: 'hard', question: 'Which athlete has won the most Olympic gold medals?', correctAnswer: 'Michael Phelps', incorrectAnswers: ['Usain Bolt', 'Carl Lewis', 'Mark Spitz'] },
  { id: 'sports_035', category: 'sports', type: 'multiple', difficulty: 'hard', question: 'What is the term for three consecutive strikes in bowling?', correctAnswer: 'Turkey', incorrectAnswers: ['Hat trick', 'Triple', 'Trifecta'] },
  { id: 'sports_036', category: 'sports', type: 'multiple', difficulty: 'hard', question: 'In which year were women first allowed to compete in the Olympic Games?', correctAnswer: '1900', incorrectAnswers: ['1896', '1920', '1912'] },
  { id: 'sports_037', category: 'sports', type: 'boolean', difficulty: 'hard', question: 'A regulation NFL football is made from pigskin.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'sports_038', category: 'sports', type: 'multiple', difficulty: 'hard', question: 'What is the oldest tennis tournament in the world?', correctAnswer: 'Wimbledon', incorrectAnswers: ['US Open', 'French Open', 'Australian Open'] },
  { id: 'sports_039', category: 'sports', type: 'multiple', difficulty: 'hard', question: 'Which Formula 1 driver holds the record for most World Championships?', correctAnswer: 'Michael Schumacher and Lewis Hamilton (tied at 7)', incorrectAnswers: ['Ayrton Senna', 'Sebastian Vettel', 'Alain Prost'] },
  { id: 'sports_040', category: 'sports', type: 'multiple', difficulty: 'hard', question: 'In what sport is the "Fosbury Flop" technique used?', correctAnswer: 'High jump', incorrectAnswers: ['Long jump', 'Pole vault', 'Triple jump'] },

  // ═══════════════════════════════════════════
  // TECHNOLOGY (technology_001 – technology_040)
  // ═══════════════════════════════════════════

  // Easy (16)
  { id: 'technology_001', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What does "CPU" stand for?', correctAnswer: 'Central Processing Unit', incorrectAnswers: ['Central Power Unit', 'Computer Processing Unit', 'Central Program Utility'] },
  { id: 'technology_002', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What company created the iPhone?', correctAnswer: 'Apple', incorrectAnswers: ['Samsung', 'Google', 'Microsoft'] },
  { id: 'technology_003', category: 'technology', type: 'boolean', difficulty: 'easy', question: 'Wi-Fi stands for Wireless Fidelity.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'technology_004', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What does "URL" stand for?', correctAnswer: 'Uniform Resource Locator', incorrectAnswers: ['Universal Resource Link', 'Uniform Reference Locator', 'Universal Resource Locator'] },
  { id: 'technology_005', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'Which company owns YouTube?', correctAnswer: 'Google (Alphabet)', incorrectAnswers: ['Microsoft', 'Amazon', 'Meta'] },
  { id: 'technology_006', category: 'technology', type: 'boolean', difficulty: 'easy', question: 'USB stands for Universal Serial Bus.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'technology_007', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What is the most used search engine in the world?', correctAnswer: 'Google', incorrectAnswers: ['Bing', 'Yahoo', 'DuckDuckGo'] },
  { id: 'technology_008', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What does "PDF" stand for?', correctAnswer: 'Portable Document Format', incorrectAnswers: ['Printed Document File', 'Public Document Format', 'Portable Data File'] },
  { id: 'technology_009', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What social media platform is known for 280-character messages?', correctAnswer: 'X (formerly Twitter)', incorrectAnswers: ['Facebook', 'Instagram', 'TikTok'] },
  { id: 'technology_010', category: 'technology', type: 'boolean', difficulty: 'easy', question: 'Bluetooth technology is named after a Viking king.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'technology_011', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What does "GPS" stand for?', correctAnswer: 'Global Positioning System', incorrectAnswers: ['Global Processing System', 'General Positioning Service', 'Global Program System'] },
  { id: 'technology_012', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What kind of device is Alexa?', correctAnswer: 'Voice assistant', incorrectAnswers: ['Laptop', 'Tablet', 'Smartwatch'] },
  { id: 'technology_013', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What does "HTML" stand for?', correctAnswer: 'HyperText Markup Language', incorrectAnswers: ['HyperTool Multi Language', 'High Tech Modern Language', 'HyperText Machine Language'] },
  { id: 'technology_014', category: 'technology', type: 'boolean', difficulty: 'easy', question: 'Android is an operating system made by Apple.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'technology_015', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'What does "RAM" stand for in computing?', correctAnswer: 'Random Access Memory', incorrectAnswers: ['Read Access Memory', 'Rapid Action Memory', 'Random Allocation Memory'] },
  { id: 'technology_016', category: 'technology', type: 'multiple', difficulty: 'easy', question: 'Which company makes the PlayStation gaming console?', correctAnswer: 'Sony', incorrectAnswers: ['Microsoft', 'Nintendo', 'Sega'] },

  // Medium (14)
  { id: 'technology_017', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'In what year was the World Wide Web invented?', correctAnswer: '1989', incorrectAnswers: ['1991', '1985', '1993'] },
  { id: 'technology_018', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'Who is considered the father of computer science?', correctAnswer: 'Alan Turing', incorrectAnswers: ['Charles Babbage', 'John von Neumann', 'Ada Lovelace'] },
  { id: 'technology_019', category: 'technology', type: 'boolean', difficulty: 'medium', question: 'The first computer mouse was made of wood.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'technology_020', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'What programming language was created by James Gosling?', correctAnswer: 'Java', incorrectAnswers: ['Python', 'C++', 'JavaScript'] },
  { id: 'technology_021', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'What does "IoT" stand for?', correctAnswer: 'Internet of Things', incorrectAnswers: ['Interface of Technology', 'Integration of Tools', 'Internet of Tools'] },
  { id: 'technology_022', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'Which company developed the first commercially successful smartphone?', correctAnswer: 'BlackBerry (RIM)', incorrectAnswers: ['Apple', 'Nokia', 'Samsung'] },
  { id: 'technology_023', category: 'technology', type: 'boolean', difficulty: 'medium', question: 'Linux is an open-source operating system.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'technology_024', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'What does "SSD" stand for?', correctAnswer: 'Solid State Drive', incorrectAnswers: ['Super Speed Disk', 'Solid System Drive', 'Standard Storage Device'] },
  { id: 'technology_025', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'What was the first widely used web browser?', correctAnswer: 'Mosaic', incorrectAnswers: ['Netscape', 'Internet Explorer', 'Firefox'] },
  { id: 'technology_026', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'What company was originally named "BackRub"?', correctAnswer: 'Google', incorrectAnswers: ['Yahoo', 'Amazon', 'eBay'] },
  { id: 'technology_027', category: 'technology', type: 'boolean', difficulty: 'medium', question: 'Moore\'s Law states that the number of transistors on a chip doubles roughly every two years.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'technology_028', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'What is the main function of a firewall in computing?', correctAnswer: 'Network security', incorrectAnswers: ['Data storage', 'Processing speed', 'Display rendering'] },
  { id: 'technology_029', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'Which company created the Kotlin programming language?', correctAnswer: 'JetBrains', incorrectAnswers: ['Google', 'Oracle', 'Microsoft'] },
  { id: 'technology_030', category: 'technology', type: 'multiple', difficulty: 'medium', question: 'What was the first message sent over the internet (ARPANET)?', correctAnswer: '"LO" (intended to be "LOGIN")', incorrectAnswers: ['"HELLO"', '"TEST"', '"HI"'] },

  // Hard (10)
  { id: 'technology_031', category: 'technology', type: 'multiple', difficulty: 'hard', question: 'What year was the first email sent?', correctAnswer: '1971', incorrectAnswers: ['1969', '1975', '1980'] },
  { id: 'technology_032', category: 'technology', type: 'multiple', difficulty: 'hard', question: 'What is the name of the protocol used to send email?', correctAnswer: 'SMTP', incorrectAnswers: ['HTTP', 'FTP', 'SSH'] },
  { id: 'technology_033', category: 'technology', type: 'boolean', difficulty: 'hard', question: 'The first 1 GB hard drive weighed over 500 pounds.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'technology_034', category: 'technology', type: 'multiple', difficulty: 'hard', question: 'What does "CAPTCHA" stand for?', correctAnswer: 'Completely Automated Public Turing test to tell Computers and Humans Apart', incorrectAnswers: ['Computer Automated Process to Tell Computers and Humans Apart', 'Centralized Anti-Phishing Technology for Computer and Human Authentication', 'Complete Authorization Protocol to Counter Hacker Attacks'] },
  { id: 'technology_035', category: 'technology', type: 'multiple', difficulty: 'hard', question: 'Who invented the first mechanical computer called the "Difference Engine"?', correctAnswer: 'Charles Babbage', incorrectAnswers: ['Alan Turing', 'Blaise Pascal', 'Ada Lovelace'] },
  { id: 'technology_036', category: 'technology', type: 'multiple', difficulty: 'hard', question: 'What encryption standard replaced DES?', correctAnswer: 'AES', incorrectAnswers: ['RSA', 'SHA', 'MD5'] },
  { id: 'technology_037', category: 'technology', type: 'boolean', difficulty: 'hard', question: 'The QWERTY keyboard layout was designed to slow typists down.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'technology_038', category: 'technology', type: 'multiple', difficulty: 'hard', question: 'What is the maximum theoretical speed of USB 3.0?', correctAnswer: '5 Gbps', incorrectAnswers: ['1 Gbps', '10 Gbps', '480 Mbps'] },
  { id: 'technology_039', category: 'technology', type: 'multiple', difficulty: 'hard', question: 'Which programming language was used to write the Unix operating system?', correctAnswer: 'C', incorrectAnswers: ['Assembly', 'FORTRAN', 'COBOL'] },
  { id: 'technology_040', category: 'technology', type: 'multiple', difficulty: 'hard', question: 'What was IBM\'s Deep Blue famous for in 1997?', correctAnswer: 'Beating a world chess champion', incorrectAnswers: ['Solving a mathematical theorem', 'Predicting weather patterns', 'Translating languages in real-time'] },

  // ═══════════════════════════════════════════
  // FOOD & DRINK (food_001 – food_040)
  // ═══════════════════════════════════════════

  // Easy (16)
  { id: 'food_001', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What fruit is traditionally used to make wine?', correctAnswer: 'Grapes', incorrectAnswers: ['Apples', 'Oranges', 'Cherries'] },
  { id: 'food_002', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What is the main ingredient in guacamole?', correctAnswer: 'Avocado', incorrectAnswers: ['Tomato', 'Lime', 'Onion'] },
  { id: 'food_003', category: 'food', type: 'boolean', difficulty: 'easy', question: 'Sushi always contains raw fish.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'food_004', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What type of pasta is shaped like a bow tie?', correctAnswer: 'Farfalle', incorrectAnswers: ['Penne', 'Rigatoni', 'Fusilli'] },
  { id: 'food_005', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What country is pizza originally from?', correctAnswer: 'Italy', incorrectAnswers: ['United States', 'Greece', 'France'] },
  { id: 'food_006', category: 'food', type: 'boolean', difficulty: 'easy', question: 'Carrots are naturally orange.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'food_007', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What is the most consumed beverage in the world after water?', correctAnswer: 'Tea', incorrectAnswers: ['Coffee', 'Milk', 'Juice'] },
  { id: 'food_008', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What does "al dente" mean in cooking?', correctAnswer: 'Firm to the bite', incorrectAnswers: ['Well done', 'Raw', 'Overcooked'] },
  { id: 'food_009', category: 'food', type: 'multiple', difficulty: 'easy', question: 'Which nut is used to make marzipan?', correctAnswer: 'Almond', incorrectAnswers: ['Walnut', 'Cashew', 'Peanut'] },
  { id: 'food_010', category: 'food', type: 'boolean', difficulty: 'easy', question: 'Peanuts are technically nuts.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'food_011', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What is the spiciest part of a chili pepper?', correctAnswer: 'The white membrane (pith)', incorrectAnswers: ['The seeds', 'The skin', 'The tip'] },
  { id: 'food_012', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What grain is used to make traditional Japanese sake?', correctAnswer: 'Rice', incorrectAnswers: ['Wheat', 'Barley', 'Corn'] },
  { id: 'food_013', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What vegetable makes your eyes water when you cut it?', correctAnswer: 'Onion', incorrectAnswers: ['Garlic', 'Pepper', 'Potato'] },
  { id: 'food_014', category: 'food', type: 'boolean', difficulty: 'easy', question: 'Honey never spoils.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'food_015', category: 'food', type: 'multiple', difficulty: 'easy', question: 'What is the main ingredient in hummus?', correctAnswer: 'Chickpeas', incorrectAnswers: ['Lentils', 'Black beans', 'Tahini'] },
  { id: 'food_016', category: 'food', type: 'multiple', difficulty: 'easy', question: 'Which fruit is known as the "king of fruits"?', correctAnswer: 'Durian', incorrectAnswers: ['Mango', 'Pineapple', 'Banana'] },

  // Medium (14)
  { id: 'food_017', category: 'food', type: 'multiple', difficulty: 'medium', question: 'What is the most expensive spice in the world by weight?', correctAnswer: 'Saffron', incorrectAnswers: ['Vanilla', 'Cardamom', 'Cinnamon'] },
  { id: 'food_018', category: 'food', type: 'multiple', difficulty: 'medium', question: 'What country does Gouda cheese originate from?', correctAnswer: 'Netherlands', incorrectAnswers: ['France', 'Switzerland', 'Germany'] },
  { id: 'food_019', category: 'food', type: 'boolean', difficulty: 'medium', question: 'White chocolate contains cocoa solids.', correctAnswer: 'False', incorrectAnswers: ['True'] },
  { id: 'food_020', category: 'food', type: 'multiple', difficulty: 'medium', question: 'What is the primary ingredient in a traditional Japanese miso soup?', correctAnswer: 'Fermented soybean paste', incorrectAnswers: ['Fish stock', 'Seaweed', 'Tofu'] },
  { id: 'food_021', category: 'food', type: 'multiple', difficulty: 'medium', question: 'Which vitamin is most commonly found in citrus fruits?', correctAnswer: 'Vitamin C', incorrectAnswers: ['Vitamin A', 'Vitamin B', 'Vitamin D'] },
  { id: 'food_022', category: 'food', type: 'multiple', difficulty: 'medium', question: 'What is the national dish of Spain?', correctAnswer: 'Paella', incorrectAnswers: ['Tapas', 'Gazpacho', 'Tortilla Espanola'] },
  { id: 'food_023', category: 'food', type: 'boolean', difficulty: 'medium', question: 'Wasabi served in most restaurants outside Japan is actually horseradish dyed green.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'food_024', category: 'food', type: 'multiple', difficulty: 'medium', question: 'What type of milk is traditionally used to make mozzarella cheese?', correctAnswer: 'Water buffalo milk', incorrectAnswers: ['Cow milk', 'Goat milk', 'Sheep milk'] },
  { id: 'food_025', category: 'food', type: 'multiple', difficulty: 'medium', question: 'Which bean is used to make tofu?', correctAnswer: 'Soybean', incorrectAnswers: ['Black bean', 'Lima bean', 'Kidney bean'] },
  { id: 'food_026', category: 'food', type: 'multiple', difficulty: 'medium', question: 'What country is the origin of the croissant?', correctAnswer: 'Austria', incorrectAnswers: ['France', 'Italy', 'Belgium'] },
  { id: 'food_027', category: 'food', type: 'boolean', difficulty: 'medium', question: 'Bananas are berries, botanically speaking.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'food_028', category: 'food', type: 'multiple', difficulty: 'medium', question: 'What does "IPA" stand for in beer?', correctAnswer: 'India Pale Ale', incorrectAnswers: ['International Pale Ale', 'Irish Pale Ale', 'Imperial Pale Ale'] },
  { id: 'food_029', category: 'food', type: 'multiple', difficulty: 'medium', question: 'What is the main flavoring in Earl Grey tea?', correctAnswer: 'Bergamot', incorrectAnswers: ['Lavender', 'Lemon', 'Vanilla'] },
  { id: 'food_030', category: 'food', type: 'multiple', difficulty: 'medium', question: 'Which country produces the most coffee in the world?', correctAnswer: 'Brazil', incorrectAnswers: ['Colombia', 'Ethiopia', 'Vietnam'] },

  // Hard (10)
  { id: 'food_031', category: 'food', type: 'multiple', difficulty: 'hard', question: 'What is the Scoville rating of a Carolina Reaper pepper (approximately)?', correctAnswer: '2.2 million SHU', incorrectAnswers: ['500,000 SHU', '1 million SHU', '5 million SHU'] },
  { id: 'food_032', category: 'food', type: 'multiple', difficulty: 'hard', question: 'What is the name for a wine expert?', correctAnswer: 'Sommelier', incorrectAnswers: ['Oenologist', 'Vintner', 'Connoisseur'] },
  { id: 'food_033', category: 'food', type: 'boolean', difficulty: 'hard', question: 'Ketchup was once sold as medicine in the 1830s.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'food_034', category: 'food', type: 'multiple', difficulty: 'hard', question: 'What amino acid is responsible for the "umami" taste?', correctAnswer: 'Glutamate', incorrectAnswers: ['Lysine', 'Tryptophan', 'Glycine'] },
  { id: 'food_035', category: 'food', type: 'multiple', difficulty: 'hard', question: 'Which country consumes the most cheese per capita?', correctAnswer: 'Denmark', incorrectAnswers: ['France', 'Switzerland', 'Italy'] },
  { id: 'food_036', category: 'food', type: 'multiple', difficulty: 'hard', question: 'What is the name of the Japanese art of decorative food carving?', correctAnswer: 'Mukimono', incorrectAnswers: ['Ikebana', 'Origami', 'Sashimi'] },
  { id: 'food_037', category: 'food', type: 'boolean', difficulty: 'hard', question: 'Arachibutyrophobia is the fear of peanut butter sticking to the roof of your mouth.', correctAnswer: 'True', incorrectAnswers: ['False'] },
  { id: 'food_038', category: 'food', type: 'multiple', difficulty: 'hard', question: 'What is the most stolen food in the world?', correctAnswer: 'Cheese', incorrectAnswers: ['Chocolate', 'Meat', 'Bread'] },
  { id: 'food_039', category: 'food', type: 'multiple', difficulty: 'hard', question: 'From which flower does vanilla flavoring come?', correctAnswer: 'Orchid', incorrectAnswers: ['Lily', 'Rose', 'Jasmine'] },
  { id: 'food_040', category: 'food', type: 'multiple', difficulty: 'hard', question: 'What is the traditional base spirit of a caipirinha?', correctAnswer: 'Cachaca', incorrectAnswers: ['Rum', 'Vodka', 'Tequila'] },
];
