// Shared ceiling for the "short" animations required by
// docs/DESIGN_SYSTEM.md's Motion section, tightened to the Quiet Atelier
// direction's 250–350ms fade bound ("250–350ms ease-in-out fades; no
// spring/bounce/overshoot"). This is the ceiling; individual animations
// sit inside the 250–350ms range.
export const MAX_SHORT_ANIMATION_DURATION_MS = 350;
