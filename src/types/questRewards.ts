export interface QuestReward {
  quest: string;
  act: number;
  rewardType: 'reward' | 'vendor';
  vendor?: string;
  witch: string[];
  shadow: string[];
  ranger: string[];
  duelist: string[];
  marauder: string[];
  templar: string[];
  scion: string[];
}

export interface QuestRewardsData {
  reward: QuestReward[];
  vendor: QuestReward[];
}

export type CharacterClass = 'witch' | 'shadow' | 'ranger' | 'duelist' | 'marauder' | 'templar' | 'scion'; 