"use client";

import { useId } from "react";
import type { MockupKind } from "@/lib/projects";

const C = {
  bright: "#a855f7",
  purple: "#7b2ff7",
  magenta: "#c026d3",
  muted: "#a78bca",
  panel: "#12022a",
  line: "rgba(168,85,247,0.3)",
  soft: "rgba(168,85,247,0.07)",
};

function Window({ url, children }: { url?: boolean; children: React.ReactNode }) {
  return (
    <>
      <rect x="16" y="12" width="288" height="176" rx="12" fill={C.panel} stroke={C.line} />
      <circle cx="32" cy="27" r="3.5" fill={C.bright} opacity="0.8" />
      <circle cx="44" cy="27" r="3.5" fill={C.magenta} opacity="0.6" />
      <circle cx="56" cy="27" r="3.5" fill={C.muted} opacity="0.5" />
      {url && <rect x="80" y="21" width="150" height="12" rx="6" fill={C.muted} opacity="0.14" />}
      <path d="M16 42h288" stroke={C.line} />
      {children}
    </>
  );
}

function Browser({ g }: { g: string }) {
  return (
    <Window url>
      <rect x="32" y="56" width="130" height="10" rx="5" fill={g} />
      <rect x="32" y="74" width="100" height="6" rx="3" fill={C.muted} opacity="0.45" />
      <rect x="32" y="86" width="84" height="6" rx="3" fill={C.muted} opacity="0.3" />
      <rect x="32" y="102" width="56" height="16" rx="8" fill={g} />
      <rect x="188" y="54" width="100" height="68" rx="10" fill={g} opacity="0.28" />
      <circle cx="240" cy="78" r="12" fill={g} opacity="0.7" />
      <path d="M204 112l24-18 14 12 16-14 22 20z" fill={C.bright} opacity="0.4" />
      {[32, 122, 212].map((x) => (
        <g key={x}>
          <rect x={x} y="132" width="76" height="46" rx="8" fill={C.soft} stroke={C.line} />
          <rect x={x + 8} y="140" width="34" height="20" rx="5" fill={g} opacity="0.45" />
          <rect x={x + 8} y="166" width="52" height="5" rx="2.5" fill={C.muted} opacity="0.4" />
        </g>
      ))}
    </Window>
  );
}

function Dashboard({ g }: { g: string }) {
  const bars = [30, 48, 36, 62, 44, 70, 54];
  return (
    <Window>
      {[32, 116, 200].map((x) => (
        <g key={x}>
          <rect x={x} y="52" width="72" height="32" rx="8" fill={C.soft} stroke={C.line} />
          <rect x={x + 8} y="60" width="30" height="5" rx="2.5" fill={C.muted} opacity="0.5" />
          <rect x={x + 8} y="70" width="44" height="8" rx="4" fill={g} />
        </g>
      ))}
      {bars.map((h, i) => (
        <rect key={i} x={36 + i * 24} y={176 - h} width="14" height={h} rx="4" fill={g} opacity={0.4 + i * 0.08} />
      ))}
      <circle cx="252" cy="136" r="26" stroke={C.line} strokeWidth="10" />
      <circle
        cx="252"
        cy="136"
        r="26"
        stroke={g}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="104 164"
        transform="rotate(-90 252 136)"
      />
    </Window>
  );
}

function Table({ g }: { g: string }) {
  return (
    <Window>
      <rect x="32" y="52" width="256" height="14" rx="4" fill={C.purple} opacity="0.35" />
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 76 + i * 20;
        return (
          <g key={i}>
            <circle cx="42" cy={y + 6} r="5" fill={g} opacity="0.85" />
            <rect x="56" y={y + 3} width={70 + (i % 3) * 16} height="6" rx="3" fill={C.muted} opacity="0.5" />
            <rect x="180" y={y + 3} width="34" height="6" rx="3" fill={C.muted} opacity="0.3" />
            <rect x="242" y={y} width="46" height="12" rx="6" fill={i % 2 ? C.magenta : C.bright} opacity="0.45" />
            <path d={`M32 ${y + 16}h256`} stroke={C.line} opacity="0.5" />
          </g>
        );
      })}
    </Window>
  );
}

function Chat({ g }: { g: string }) {
  return (
    <Window>
      <rect x="32" y="54" width="132" height="24" rx="12" fill={C.muted} opacity="0.22" />
      <rect x="44" y="63" width="86" height="5" rx="2.5" fill="#fff" opacity="0.5" />
      <rect x="150" y="86" width="138" height="24" rx="12" fill={g} />
      <rect x="162" y="95" width="94" height="5" rx="2.5" fill="#fff" opacity="0.7" />
      <rect x="32" y="118" width="104" height="24" rx="12" fill={C.muted} opacity="0.22" />
      <rect x="44" y="127" width="62" height="5" rx="2.5" fill="#fff" opacity="0.5" />
      <rect x="176" y="150" width="112" height="24" rx="12" fill={g} opacity="0.85" />
      <rect x="188" y="159" width="70" height="5" rx="2.5" fill="#fff" opacity="0.7" />
      <circle cx="40" cy="160" r="3" fill={C.muted} opacity="0.5" />
      <circle cx="51" cy="160" r="3" fill={C.muted} opacity="0.5" />
      <circle cx="62" cy="160" r="3" fill={C.muted} opacity="0.5" />
    </Window>
  );
}

function Route({ g }: { g: string }) {
  return (
    <Window>
      {[70, 100, 130, 160].map((y) => (
        <path key={y} d={`M16 ${y}h288`} stroke={C.line} opacity="0.35" />
      ))}
      {[80, 128, 176, 224, 272].map((x) => (
        <path key={x} d={`M${x} 43v144`} stroke={C.line} opacity="0.35" />
      ))}
      <path
        d="M52 156C90 150 96 110 140 116S210 140 226 92 262 78 274 66"
        stroke={g}
        strokeWidth="3"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <circle cx="52" cy="156" r="6" fill={C.bright} />
      <circle cx="140" cy="116" r="5" fill={C.bright} opacity="0.8" />
      <circle cx="226" cy="92" r="5" fill={C.bright} opacity="0.8" />
      <circle cx="274" cy="66" r="14" fill={C.magenta} opacity="0.25" />
      <circle cx="274" cy="66" r="7" fill={C.magenta} />
      <rect x="30" y="52" width="88" height="32" rx="8" fill={C.panel} stroke={C.line} />
      <circle cx="44" cy="68" r="6" fill={g} />
      <rect x="56" y="62" width="50" height="5" rx="2.5" fill={C.muted} opacity="0.6" />
      <rect x="56" y="72" width="34" height="5" rx="2.5" fill={C.muted} opacity="0.35" />
    </Window>
  );
}

function Phone({ g }: { g: string }) {
  return (
    <>
      <rect
        x="40"
        y="58"
        width="64"
        height="46"
        rx="10"
        fill={g}
        opacity="0.18"
        transform="rotate(-8 72 81)"
      />
      <rect
        x="216"
        y="92"
        width="64"
        height="46"
        rx="10"
        fill={g}
        opacity="0.18"
        transform="rotate(8 248 115)"
      />
      <rect x="108" y="6" width="104" height="188" rx="18" fill={C.panel} stroke={C.line} strokeWidth="1.5" />
      <rect x="146" y="13" width="28" height="5" rx="2.5" fill={C.line} />
      <rect x="120" y="28" width="80" height="26" rx="8" fill={g} opacity="0.9" />
      <rect x="128" y="36" width="38" height="5" rx="2.5" fill="#fff" opacity="0.8" />
      <rect x="128" y="44" width="24" height="4" rx="2" fill="#fff" opacity="0.5" />
      {[62, 88, 114, 140].map((y, i) => (
        <g key={y}>
          <rect x="120" y={y} width="80" height="22" rx="7" fill={C.soft} stroke={C.line} />
          <circle cx="132" cy={y + 11} r="5" fill={g} opacity={0.9 - i * 0.12} />
          <rect x="142" y={y + 6} width="40" height="4" rx="2" fill={C.muted} opacity="0.55" />
          <rect x="142" y={y + 13} width="26" height="3" rx="1.5" fill={C.muted} opacity="0.3" />
        </g>
      ))}
      <path d="M108 168h104" stroke={C.line} />
      {[128, 152, 176, 200].map((x, i) => (
        <circle key={x} cx={x} cy="181" r="4" fill={i === 0 ? C.bright : C.muted} opacity={i === 0 ? 1 : 0.4} />
      ))}
    </>
  );
}

export function ProjectMockup({ kind, className }: { kind: MockupKind; className?: string }) {
  const gradId = `mock-${useId().replace(/:/g, "")}`;
  const g = `url(#${gradId})`;

  return (
    <svg
      viewBox="0 0 320 200"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={C.bright} />
          <stop offset="1" stopColor={C.magenta} />
        </linearGradient>
      </defs>
      {kind === "browser" && <Browser g={g} />}
      {kind === "dashboard" && <Dashboard g={g} />}
      {kind === "table" && <Table g={g} />}
      {kind === "chat" && <Chat g={g} />}
      {kind === "route" && <Route g={g} />}
      {kind === "phone" && <Phone g={g} />}
    </svg>
  );
}
