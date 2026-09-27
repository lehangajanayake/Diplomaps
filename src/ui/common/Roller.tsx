/** A scroll's wooden roller with brass knobs at either end, for anything on the table that rolls up. */
/** `flush`: the roller stays within its box instead of overhanging it (where the edge would clip its knobs). */
export function Roller({ flush = false }: { flush?: boolean }) {
  return (
    <div
      className={`relative z-10 h-[1.6vh] min-h-[11px] rounded-full ${flush ? 'mx-[4%]' : 'mx-[-6%]'}`}
      style={{ background: 'linear-gradient(180deg, #2a170a 0%, #7a4c26 35%, #a06a38 50%, #5a341a 75%, #1e1007 100%)', boxShadow: '0 3px 6px rgb(0 0 0 / 0.6)' }}
      aria-hidden
    >
      <span className="absolute -left-[5%] top-1/2 h-[140%] w-[7%] -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #c9a24a, #5a3f14)' }} />
      <span className="absolute -right-[5%] top-1/2 h-[140%] w-[7%] -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #c9a24a, #5a3f14)' }} />
    </div>
  );
}
