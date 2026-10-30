export const formatTokenNumber = (counterCode: string, n: number) => `${counterCode}-${String(n).padStart(3, '0')}`;

export function formatDuration(secs: number): string {
  const mins = Math.round(secs / 60);
  if (mins < 1) return 'less than a minute';
  return mins === 1 ? '1 minute' : `${mins} minutes`;
}
