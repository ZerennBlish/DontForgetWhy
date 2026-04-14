import type { ImageSourcePropType } from 'react-native';

const TIMER_PRESET_IMAGES: Record<string, ImageSourcePropType> = {
  pizza:     require('../../assets/timer-presets/pizza_slice.webp'),
  laundry:   require('../../assets/timer-presets/folded_tshirt.webp'),
  stove:     require('../../assets/timer-presets/stove.webp'),
  break:     require('../../assets/timer-presets/coffee_mug.webp'),
  lunch:     require('../../assets/timer-presets/dinner_plate.webp'),
  nap:       require('../../assets/timer-presets/pillow.webp'),
  workout:   require('../../assets/timer-presets/dumbbell.webp'),
  meds:      require('../../assets/timer-presets/capsule_pill.webp'),
  tea:       require('../../assets/timer-presets/teacup.webp'),
  eggs:      require('../../assets/timer-presets/egg.webp'),
  microwave: require('../../assets/timer-presets/microwave.webp'),
  parking:   require('../../assets/timer-presets/parking_meter.webp'),
  meeting:   require('../../assets/timer-presets/meeting_table.webp'),
  work:      require('../../assets/timer-presets/briefcase.webp'),
  cleaning:  require('../../assets/timer-presets/broom.webp'),
  grill:     require('../../assets/timer-presets/steak.webp'),
  pet:       require('../../assets/timer-presets/paw_print.webp'),
  kids:      require('../../assets/timer-presets/alphabet_blocks.webp'),
  crying:    require('../../assets/timer-presets/crying_pillow.webp'),
  revenge:   require('../../assets/timer-presets/straight_razor.webp'),
};

export default TIMER_PRESET_IMAGES;
