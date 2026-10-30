import type { MealState } from '../types';
import { Badge } from './ui';

export function MealStateBadge({ state }: { state: MealState }) {
  if (state === 'SERVING') return <Badge tone="green" dot>Serving now</Badge>;
  if (state === 'UPCOMING') return <Badge tone="blue">Upcoming</Badge>;
  return <Badge tone="gray">Closed</Badge>;
}
