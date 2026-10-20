export const DAY_COLORS = ['#ad4526', '#2c6459', '#a8761c', '#4b5d8a', '#7a4a6d', '#3f6b45'];

export function dayColor(dayIndex: number): string {
  return DAY_COLORS[(dayIndex - 1) % DAY_COLORS.length];
}
