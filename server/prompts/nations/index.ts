import type { NationId } from '../../../src/engine/types.js';
import { kelm } from './kelm.js';
import { ostrin } from './ostrin.js';
import { sael } from './sael.js';
import { tarn } from './tarn.js';
import type { NationVoice } from './types.js';
import { varrow } from './varrow.js';

export const VOICES: Record<NationId, NationVoice> = { varrow, kelm, sael, tarn, ostrin };
export type { NationVoice };
