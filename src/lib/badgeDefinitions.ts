// Badge definitions for the badge collection system

export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  requirementType: 'total_solves' | 'streak' | 'subject_solves' | 'speed_solves' | 'early_solves';
  isPremiumOnly: boolean;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Free user badges
  {
    key: 'first_solve',
    name: 'First Solve',
    description: 'Complete your first homework problem',
    icon: '🎯',
    requirement: 1,
    requirementType: 'total_solves',
    isPremiumOnly: false,
  },
  {
    key: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    requirement: 7,
    requirementType: 'streak',
    isPremiumOnly: false,
  },
  {
    key: 'century_club',
    name: 'Century Club',
    description: 'Solve 100 problems total',
    icon: '🧠',
    requirement: 100,
    requirementType: 'total_solves',
    isPremiumOnly: false,
  },
  // Premium user badges
  {
    key: 'month_master',
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '💪',
    requirement: 30,
    requirementType: 'streak',
    isPremiumOnly: true,
  },
  {
    key: 'subject_pro',
    name: 'Subject Pro',
    description: 'Solve 50 problems in one subject',
    icon: '🎓',
    requirement: 50,
    requirementType: 'subject_solves',
    isPremiumOnly: true,
  },
  {
    key: 'speed_solver',
    name: 'Speed Solver',
    description: 'Solve 5 problems in under 2 minutes each',
    icon: '⚡',
    requirement: 5,
    requirementType: 'speed_solves',
    isPremiumOnly: true,
  },
  // Early Bird - free badge
  {
    key: 'early_bird',
    name: 'Early Bird',
    description: 'Solve a problem before 8 AM',
    icon: '🌅',
    requirement: 1,
    requirementType: 'early_solves',
    isPremiumOnly: false,
  },
];

export const getBadgeByKey = (key: string): BadgeDefinition | undefined => {
  return BADGE_DEFINITIONS.find(badge => badge.key === key);
};
