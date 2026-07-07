// Shared "pressed" feedback token per docs/DESIGN_SYSTEM.md's Motion section
// ("animations should be visible but short") — every tappable control dips
// to this opacity while pressed so the app reads as responsive rather than
// static, rather than each component picking its own ad hoc value.
export const pressedOpacity = 0.7;
