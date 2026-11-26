import { Fragment } from "react";

/**
 * Renderizador mínimo de Markdown para las respuestas del asistente.
 * Genera elementos de React (sin HTML crudo), así que el texto del modelo
 * nunca se inyecta como HTML en la página.
 */
function renderInline(text, keyPrefix) {
  const out = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let match;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={key}>{token.slice(1, -1)}</code>);
    else out.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function splitTableRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
}

const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function isTableStart(lines, index) {
  const line = lines[index];
  const next = lines[index + 1];
  return Boolean(line && next && line.includes("|") && TABLE_SEPARATOR.test(next));
}

export function renderMarkdown(source) {
  const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const key = `p-${blocks.length}`;
    blocks.push(
      <p key={key}>
        {paragraph.map((line, idx) => (
          <Fragment key={idx}>
            {idx > 0 && <br />}
            {renderInline(line, `${key}-${idx}`)}
          </Fragment>
        ))}
      </p>
    );
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const key = `l-${blocks.length}`;
    const items = list.items.map((item, idx) => <li key={idx}>{renderInline(item, `${key}-${idx}`)}</li>);
    blocks.push(list.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
    list = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trimEnd();

    if (/^\s*```/.test(line)) {
      flushParagraph();
      flushList();
      const code = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <pre key={`pre-${blocks.length}`}>
          <code>{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (isTableStart(lines, index)) {
      flushParagraph();
      flushList();
      const header = splitTableRow(line);
      const aligns = splitTableRow(lines[index + 1]).map((cell) =>
        cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : undefined
      );
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      const key = `t-${blocks.length}`;
      blocks.push(
        <div key={key} className="md-table-wrap">
          <table>
            <thead>
              <tr>
                {header.map((cell, c) => (
                  <th key={c} style={aligns[c] ? { textAlign: aligns[c] } : undefined}>
                    {renderInline(cell, `${key}-h${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {header.map((_, c) => (
                    <td key={c} style={aligns[c] ? { textAlign: aligns[c] } : undefined}>
                      {renderInline(row[c] || "", `${key}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      const quoted = [quote[1]];
      while (index + 1 < lines.length && /^\s*>/.test(lines[index + 1])) {
        index += 1;
        quoted.push(lines[index].replace(/^\s*>\s?/, ""));
      }
      const key = `q-${blocks.length}`;
      blocks.push(
        <blockquote key={key}>
          {quoted.map((q, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {renderInline(q, `${key}-${i}`)}
            </Fragment>
          ))}
        </blockquote>
      );
      continue;
    }

    const heading = line.match(/^\s*(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(<hr key={`hr-${blocks.length}`} />);
      continue;
    }
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length + 2, 5);
      const Tag = `h${level}`;
      blocks.push(<Tag key={`h-${blocks.length}`}>{renderInline(heading[2], `h-${blocks.length}`)}</Tag>);
      continue;
    }
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)[1]);
      continue;
    }
    if (list && /^\s{2,}\S/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}
