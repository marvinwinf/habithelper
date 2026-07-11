// Corner radius scale per docs/DESIGN_SYSTEM.md's Soft Momentum direction:
// consistently soft geometry. `sm` compact controls/tags, `md` buttons and
// input fields, `lg` cards and sheets, `full` pills/toggles/circular icons.

export const radius = {
  sm: 10,
  md: 18,
  lg: 26,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radius;
