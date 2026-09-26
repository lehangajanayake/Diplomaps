/** Hand-tuned voice notes for each ruler. Edit these freely: they only shape prompts, never game rules. */
export interface NationVoice {
  /** How the ruler talks, in a short paragraph. */
  voice: string;
  /** Things that warm this ruler toward the Warden. */
  pleases: string[];
  /** Things that anger or bore this ruler. */
  offends: string[];
  /** Veiled ways to hint at the secret aim, used only once trust is high enough. */
  hints: string[];
  /** A few lines in character, to anchor the voice. */
  examples: string[];
}
