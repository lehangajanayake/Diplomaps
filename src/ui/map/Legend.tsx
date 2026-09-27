/**
 * The legend: a small annotated note pinned in the corner of the map. It lists the map's permanent
 * features, then only the marks drawn on the map right now (war fronts, cut roads, closed passes,
 * armies marching on you, fires, the relations strings), so it always matches what is drawn.
 */
import type { ReactNode } from "react";
import { roadState } from "../../engine/economy";
import { favourThisSeason } from "../../engine/favours";
import { PROFILES } from "../../engine/nations";
import { NATION_IDS, type WorldState } from "../../engine/types";
import {
  GOLD,
  INK,
  INK_RED,
  LAND,
  RELATION_ORDER,
  RIVER,
  ROAD,
  STRING,
  SWORDS,
} from "./palette";
import { RelationSample } from "./RelationMarks";

const row = "flex items-center gap-[0.35em] leading-[1.15]";

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className={row}>
      <span className="flex w-[20px] shrink-0 justify-center">{icon}</span>
      {children}
    </div>
  );
}

export function Legend({
  world,
  relations,
}: {
  world: WorldState;
  relations: boolean;
}) {
  const roads = NATION_IDS.map((n) => roadState(world, n));
  const burning = Object.values(world.burning).some(
    (until) => until >= world.season,
  );
  const marching = world.intents.some((i) => i.kind === "attack");
  const favour = favourThisSeason(world);
  return (
    <div
      className="pointer-events-none absolute bottom-[3.2%] left-[2.4%] w-[25%] min-w-[220px] max-w-[330px] -rotate-1 select-none px-[0.7em] py-[0.45em] text-[0.7rem] text-ink"
      style={{
        background: "linear-gradient(170deg, #f1e4c2, #e2cfa3)",
        boxShadow:
          "0 2px 5px rgb(0 0 0 / 0.35), inset 0 0 12px rgb(120 80 30 / 0.3)",
        fontFamily: "'IM Fell English', serif",
      }}
      aria-label="Map legend"
    >
      <div className="mb-[0.2em] text-center font-sc text-[0.72rem] tracking-[0.12em]">
        Legend
      </div>
      <div className="grid grid-cols-2 gap-x-[0.6em] gap-y-[0.1em]">
        <Row
          icon={
            <svg width="18" height="12" viewBox="-10 -13 20 16">
              <use href="#castle" />
            </svg>
          }
        >
          Capital
        </Row>
        <Row
          icon={
            <svg width="18" height="12" viewBox="-7 -8 14 12">
              <use href="#gate" />
            </svg>
          }
        >
          Pass
        </Row>
        <Row
          icon={
            <svg width="18" height="8" viewBox="0 0 18 8">
              <path
                d="M0 4 H18"
                stroke={ROAD}
                strokeWidth={1.4}
                strokeDasharray="4 2.5"
              />
            </svg>
          }
        >
          Road
        </Row>
        <Row
          icon={
            <svg width="18" height="8" viewBox="0 0 18 8">
              <path
                d="M0 5 C5 1 10 7 18 3"
                stroke={RIVER}
                strokeWidth={2.2}
                fill="none"
              />
            </svg>
          }
        >
          River
        </Row>
        <Row
          icon={
            <svg width="18" height="12" viewBox="-12 -13 24 16">
              <use href="#mtn-1" />
            </svg>
          }
        >
          Mountains
        </Row>
        <Row
          icon={
            <svg width="18" height="8" viewBox="0 0 18 8">
              <path d="M0 4 H18" stroke={GOLD} strokeWidth={2.4} />
              <path d="M0 4 H18" stroke={INK} strokeWidth={0.6} />
            </svg>
          }
        >
          The Crossing
        </Row>

        {world.wars.length > 0 && (
          <Row
            icon={
              <svg width="22" height="12" viewBox="0 -7 26 14">
                <path
                  d="M0 0 H26"
                  stroke={STRING.war.colour}
                  strokeWidth={2.4}
                />
                <circle
                  cx={13}
                  r={5.5}
                  fill="#f1e2bd"
                  stroke={STRING.war.colour}
                  strokeWidth={1}
                />
                <path
                  d={SWORDS}
                  transform="translate(13 0) scale(0.8)"
                  stroke={STRING.war.colour}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            }
          >
            War front
          </Row>
        )}
        {roads.includes("broken") && (
          <Row
            icon={
              <svg width="18" height="10" viewBox="0 0 18 10">
                <path
                  d="M0 5 H18"
                  stroke={ROAD}
                  strokeWidth={1.4}
                  strokeDasharray="4 2.5"
                />
                <path
                  d="M5 1 L13 9 M13 1 L5 9"
                  stroke={INK_RED}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </svg>
            }
          >
            Road cut by war
          </Row>
        )}
        {roads.includes("closed") && (
          <Row
            icon={
              <svg width="18" height="10" viewBox="-10 -5 20 10">
                <path
                  d="M-9 -1.8 H9 V1.8 H-9 Z"
                  fill={LAND}
                  stroke={INK}
                  strokeWidth={0.9}
                />
                <path
                  d="M-5 -1.8 L-7.5 1.8 M0 -1.8 L-2.5 1.8 M5 -1.8 L2.5 1.8"
                  stroke={INK_RED}
                  strokeWidth={2}
                />
                <path
                  d="M-9 -4.5 V4.5 M9 -4.5 V4.5"
                  stroke={INK}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </svg>
            }
          >
            Pass you closed
          </Row>
        )}
        {marching && (
          <Row
            icon={
              <svg width="18" height="16" viewBox="-11 -14 22 26">
                <circle r={9} fill="none" stroke={INK_RED} strokeWidth={2} />
                <path d="M5 -12 V2" stroke={INK} strokeWidth={1.2} />
                <path d="M5 -12 H12 L9.5 -9 L12 -6 H5 Z" fill={INK_RED} />
              </svg>
            }
          >
            An army marches on you
          </Row>
        )}
        {burning && (
          <Row
            icon={
              <svg width="18" height="12" viewBox="0 0 18 12">
                <ellipse
                  cx={9}
                  cy={8}
                  rx={8}
                  ry={3.5}
                  fill="#ff7a2e"
                  opacity={0.5}
                />
                <circle cx={6} cy={5} r={3.5} fill="#2e2620" opacity={0.7} />
                <circle cx={11} cy={4} r={3.5} fill="#2e2620" opacity={0.6} />
              </svg>
            }
          >
            Burning: no tax
          </Row>
        )}
        {favour && (
          <Row
            icon={
              <svg width="14" height="14" viewBox="-2 -14 16 16">
                <path d="M0 2 V-13" stroke={INK} strokeWidth={1.3} />
                <path
                  d="M0.6 -12.5 H11 L8 -9.5 L11 -6.5 H0.6 Z"
                  fill={PROFILES[favour.nation].colour}
                  stroke={INK}
                  strokeWidth={0.5}
                />
              </svg>
            }
          >
            Your favour's army
          </Row>
        )}
      </div>

      {relations && (
        <>
          <div className="mb-[0.1em] mt-[0.3em] text-center font-sc text-[0.66rem] tracking-[0.1em]">
            Relations
          </div>
          <div className="grid grid-cols-2 gap-x-[0.6em] gap-y-[0.1em]">
            {RELATION_ORDER.map((k) => (
              <Row
                key={k}
                icon={<RelationSample kind={k} className="h-[10px] w-[20px]" />}
              >
                {STRING[k].label}
              </Row>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
