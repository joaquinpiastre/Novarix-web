import { Fragment } from "react";

// Render minimo y seguro de Markdown (titulos, listas, negrita, parrafos).
// Nunca usa dangerouslySetInnerHTML: todo se arma como elementos de React.

function inline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={`${keyBase}-${i}`} className="font-semibold text-text-primary">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>
    )
  );
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p${blocks.length}`} className="text-sm text-text-primary">
          {inline(para.join(" "), `p${blocks.length}`)}
        </p>
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, i) => <li key={i}>{inline(it, `l${blocks.length}-${i}`)}</li>);
      blocks.push(
        list.ordered ? (
          <ol key={`l${blocks.length}`} className="list-decimal space-y-1 pl-5 text-sm text-text-primary">{items}</ol>
        ) : (
          <ul key={`l${blocks.length}`} className="list-disc space-y-1 pl-5 text-sm text-text-primary">{items}</ul>
        )
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      flushList();
      const level = heading[1].length;
      blocks.push(
        level <= 2 ? (
          <h3 key={`h${blocks.length}`} className="mt-4 text-base font-semibold text-text-primary first:mt-0">{inline(heading[2], `h${blocks.length}`)}</h3>
        ) : (
          <h4 key={`h${blocks.length}`} className="mt-3 text-sm font-semibold text-text-primary">{inline(heading[2], `h${blocks.length}`)}</h4>
        )
      );
    } else if (bullet || numbered) {
      flushPara();
      const ordered = Boolean(numbered && !bullet);
      const text = (bullet ?? numbered)![1];
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(text);
    } else if (!line.trim() || /^-{3,}$/.test(line.trim())) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return <div className="flex flex-col gap-2">{blocks}</div>;
}
