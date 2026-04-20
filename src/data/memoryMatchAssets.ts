import { ImageSourcePropType } from 'react-native';

interface MemoryCard {
  key: string;
  source: ImageSourcePropType;
}

export const CARD_BACK: ImageSourcePropType = require('../../assets/memory-match/card-back.webp');

export const CARD_POOL: MemoryCard[] = [
  { key: 'alarm-clock', source: require('../../assets/memory-match/alarm-clock.webp') },
  { key: 'burnt-toast', source: require('../../assets/memory-match/burnt-toast.webp') },
  { key: 'car', source: require('../../assets/memory-match/car.webp') },
  { key: 'coffee-mug', source: require('../../assets/memory-match/coffee-mug.webp') },
  { key: 'dead-phone', source: require('../../assets/memory-match/dead-phone.webp') },
  { key: 'dirty-toilet', source: require('../../assets/memory-match/dirty-toilet.webp') },
  { key: 'dusty-treadmill', source: require('../../assets/memory-match/dusty-treadmill.webp') },
  { key: 'empty-fridge', source: require('../../assets/memory-match/empty-fridge.webp') },
  { key: 'energy-drink', source: require('../../assets/memory-match/energy-drink.webp') },
  { key: 'expired-milk', source: require('../../assets/memory-match/expired-milk.webp') },
  { key: 'gym-bag', source: require('../../assets/memory-match/gym-bag.webp') },
  { key: 'jock-strap', source: require('../../assets/memory-match/jock-strap.webp') },
  { key: 'keys', source: require('../../assets/memory-match/keys.webp') },
  { key: 'lonely-sock', source: require('../../assets/memory-match/lonely-sock.webp') },
  { key: 'overflowing-trash-can', source: require('../../assets/memory-match/overflowing-trash-can.webp') },
  { key: 'pillow', source: require('../../assets/memory-match/pillow.webp') },
  { key: 'pizza-box', source: require('../../assets/memory-match/pizza-box.webp') },
  { key: 'snooze-button', source: require('../../assets/memory-match/snooze-button.webp') },
  { key: 'tangled-headphones', source: require('../../assets/memory-match/tangled-headphones.webp') },
  { key: 'tupperware', source: require('../../assets/memory-match/tupperware.webp') },
  { key: 'tv-remote', source: require('../../assets/memory-match/tv-remote.webp') },
  { key: 'wallet', source: require('../../assets/memory-match/wallet.webp') },
];
