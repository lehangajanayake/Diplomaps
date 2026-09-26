/** How each ambition looks on the table: its wax and the emblem pressed into it. */
import type { AmbitionId } from '../../engine/types';
import type { SealEmblem } from './Emblem';

export const AMBITION_SEAL: Record<AmbitionId, { colour: string; emblem: SealEmblem; numeral: string }> = {
  merchant: { colour: '#9a7630', emblem: 'coin', numeral: 'I' },
  kingdom: { colour: '#7c1f18', emblem: 'crown', numeral: 'II' },
  spider: { colour: '#3b2f3f', emblem: 'spider', numeral: 'III' },
  peacemaker: { colour: '#46685c', emblem: 'dove', numeral: 'IV' },
};
