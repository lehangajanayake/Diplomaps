/**
 * The title: a dark war table, candlelight, a rolled map tied with a ribbon, and one wax seal.
 * Breaking the seal unrolls the map into the game and lights the room's sound.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { CONFIG } from '../../engine/config';
import { beginGame, hasSave, resumeGame } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { SealButton } from '../common/SealButton';
import { WaxSeal } from '../common/WaxSeal';
import { TensionCandle } from '../hud/TensionCandle';
import { InkPot } from '../table/Decor';
import { Table } from '../table/Table';

function RolledMap({ unrolling }: { unrolling: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 30, rotate: -4 }}
      animate={unrolling ? { opacity: 1, rotate: 0, y: 0 } : { opacity: 1, y: 0, rotate: -3 }}
      transition={{ duration: reduce ? 0 : 1.1, ease: 'easeOut' }}
    >
      {/* The unrolling sheet grows out of the roll. */}
      <motion.div
        className="parchment absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ width: '2%', height: '86%', opacity: 0 }}
        animate={unrolling ? { width: '118vw', height: '118vh', opacity: 1 } : { width: '2%', height: '86%', opacity: 0 }}
        transition={{ duration: reduce ? 0 : 1.4, ease: [0.7, 0, 0.3, 1] }}
      />
      <motion.svg
        viewBox="0 0 520 150"
        className="relative h-[19vh] min-h-[110px] w-auto overflow-visible drop-shadow-[0_14px_18px_rgb(0_0_0/0.65)]"
        aria-hidden
        animate={{ opacity: unrolling ? 0 : 1, scaleX: unrolling ? 1.6 : 1 }}
        transition={{ duration: 0.7 }}
      >
        <defs>
          <linearGradient id="roll" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a88b58" />
            <stop offset="0.18" stopColor="#e8d6ab" />
            <stop offset="0.45" stopColor="#f3e5c2" />
            <stop offset="0.75" stopColor="#cdb482" />
            <stop offset="1" stopColor="#7a6238" />
          </linearGradient>
          <radialGradient id="rollEnd" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#6a5230" />
            <stop offset="0.35" stopColor="#c9ae7a" />
            <stop offset="0.55" stopColor="#8a7046" />
            <stop offset="0.75" stopColor="#d9c291" />
            <stop offset="1" stopColor="#7a6238" />
          </radialGradient>
        </defs>
        <rect x="40" y="30" width="440" height="90" rx="10" fill="url(#roll)" />
        <path d="M60 36 C160 44 360 30 460 38 M60 112 C170 104 350 116 460 108" stroke="#8a7248" strokeWidth="1" opacity="0.4" fill="none" />
        <ellipse cx="40" cy="75" rx="18" ry="45" fill="url(#rollEnd)" />
        <ellipse cx="480" cy="75" rx="18" ry="45" fill="url(#rollEnd)" />
        <path d="M232 26 C236 60 234 90 236 124 M262 26 C258 60 262 92 258 124" stroke="#7c1f18" strokeWidth="9" fill="none" />
        <path d="M236 124 L220 146 M258 124 L276 146" stroke="#7c1f18" strokeWidth="7" strokeLinecap="round" />
      </motion.svg>
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={unrolling ? { opacity: 0, scale: 0.6, rotate: 40 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.5 }}
      >
        <WaxSeal colour="#7c1f18" size="5.2em" seed={17} />
      </motion.div>
    </motion.div>
  );
}

export function TitleScreen() {
  const health = useStore((s) => s.health);
  const [unrolling, setUnrolling] = useState(false);
  const [saved] = useState(hasSave);
  const reduce = useReducedMotion();

  const begin = (resume = false) => {
    if (unrolling) return;
    setUnrolling(true);
    window.setTimeout(() => (resume ? resumeGame() : beginGame()), reduce ? 50 : 1300);
  };

  return (
    <Table>
      <div className="relative flex h-full flex-col items-center justify-center">
        <InkPot className="pointer-events-none absolute left-[6vw] top-[7vh] h-[14vh] w-auto -rotate-6 opacity-95" />
        <div className="pointer-events-none absolute right-[7vw] top-[6vh]">
          <TensionCandle tension={8} bare />
        </div>

        <AnimatePresence>
          {!unrolling && (
            <motion.div key="title" className="relative z-10 text-center" exit={{ opacity: 0, y: -20, transition: { duration: 0.6 } }}>
              <motion.h1
                className="font-title text-[clamp(3.4rem,10vw,9rem)] leading-none text-parchment-100 candle-text"
                initial={{ opacity: 0, letterSpacing: '0.2em' }}
                animate={{ opacity: 1, letterSpacing: '0.04em' }}
                transition={{ duration: reduce ? 0 : 2, ease: 'easeOut' }}
              >
                Diplomaps
              </motion.h1>
              <motion.p
                className="mt-[0.4em] font-body text-[clamp(1.1rem,2vw,1.6rem)] italic text-parchment-200/90"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : 1, duration: 1.2 }}
              >
                Start a war without firing a shot.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-0 my-[4vh]">
          <RolledMap unrolling={unrolling} />
        </div>

        <AnimatePresence>
          {!unrolling && (
            <motion.div
              key="begin"
              className="relative z-10 flex flex-col items-center gap-[1.4vh]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: reduce ? 0 : 1.6, duration: 0.8 } }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
            >
              <div className="parchment px-[1.4em] py-[0.55em]">
                <SealButton label="Begin" onClick={() => begin(false)} size="3.6em" seed={23} hint="Break the seal and unroll the map." />
              </div>
              {saved && (
                <button type="button" onClick={() => begin(true)} className="font-sc text-[0.95rem] tracking-[0.1em] text-parchment-300 hover:text-gold-bright">
                  or resume the game in progress
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!unrolling && (
            <motion.aside
              key="letter"
              className="absolute bottom-[9vh] right-[5vw] z-10 hidden w-[min(25vw,340px)] rotate-[2.5deg] px-[1.2em] py-[1em] text-ink md:block"
              style={{ background: 'linear-gradient(170deg, #efe1bd, #d9c28f)', boxShadow: '0 10px 22px rgb(0 0 0 / 0.6), inset 0 0 18px rgb(120 80 30 / 0.35)' }}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0, transition: { delay: reduce ? 0 : 2, duration: 0.9 } }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.3 } }}
            >
              <p className="font-hand text-[0.95rem] italic">To the new Warden of the Crossing,</p>
              <p className="mt-[0.4em] font-body text-[0.9rem] leading-snug">
                Every road between the five crowns runs through your little valley. You have no army; you have words, gold, letters and the keys
                to the passes. Choose an ambition and achieve it in {CONFIG.seasons} seasons. Every promise is written down. The courts gossip.
              </p>
              <p className="mt-[0.4em] text-right font-hand text-[0.9rem] italic">— the Keeper of the Tolls</p>
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!unrolling && health.checked && !health.ai && (
            <motion.aside
              key="ravens"
              className="absolute bottom-[9vh] left-[5vw] z-10 w-[min(26vw,360px)] -rotate-[2deg] px-[1.2em] py-[1em] text-ink"
              style={{ background: 'linear-gradient(170deg, #efe1bd, #d9c28f)', boxShadow: '0 10px 22px rgb(0 0 0 / 0.6), inset 0 0 18px rgb(120 80 30 / 0.35)' }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              role="alert"
            >
              <p className="font-sc text-[1rem] tracking-[0.06em] text-wax">The ravens cannot fly: no API key configured.</p>
              <p className="mt-[0.4em] font-body text-[0.86rem] leading-snug">
                The rulers speak through OpenAI. Add <span className="font-sc">OPENAI_API_KEY</span> to a <span className="font-sc">.env.local</span> file in the
                project folder (see <span className="font-sc">.env.example</span>), or set it in your Vercel project settings, then reload.
              </p>
              <p className="mt-[0.3em] font-hand text-[0.85rem] italic text-ink-faded">
                You may begin anyway: the rulers will be called away, and the chronicler will write from memory.
              </p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </Table>
  );
}
