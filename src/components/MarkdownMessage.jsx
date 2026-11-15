import React from 'react';

export const isSafeExternalUrl = (url) =>
  typeof url === 'string' && /^https?:\/\//i.test(url.trim());

/**
 * Parse inline markdown tokens ([label](url), `code`, **bold**, *italic*)
 * into safe React nodes without dangerouslySetInnerHTML.
 */
function renderInline(text, keyPrefix = 'in') {
  if (!text) return null;

  const nodes = [];
  let cursor = 0;
  let tokenIndex = 0;

  while (cursor < text.length) {
    const remaining = text.slice(cursor);

    // 1. Markdown link: [label](url)
    if (remaining[0] === '[') {
      const closeBracket = remaining.indexOf(']');
      if (closeBracket > 0 && remaining[closeBracket + 1] === '(') {
        const closeParen = remaining.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const label = remaining.slice(1, closeBracket);
          const url = remaining.slice(closeBracket + 2, closeParen).trim();
          const key = `${keyPrefix}-link-${tokenIndex++}`;

          if (isSafeExternalUrl(url)) {
            nodes.push(
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#CCFF00] underline underline-offset-2 hover:opacity-80 break-all"
              >
                {renderInline(label, `${key}-lbl`)}
              </a>
            );
          } else {
            nodes.push(
              <React.Fragment key={key}>
                {renderInline(label, `${key}-lbl`)}
              </React.Fragment>
            );
          }

          cursor += closeParen + 1;
          continue;
        }
      }
    }

    // 2. Inline code: `code`
    if (remaining[0] === '`') {
      const closeTick = remaining.indexOf('`', 1);
      if (closeTick > 0) {
        const codeText = remaining.slice(1, closeTick);
        nodes.push(
          <code
            key={`${keyPrefix}-code-${tokenIndex++}`}
            className="px-1 py-0.5 rounded bg-black/50 text-[#CCFF00] font-mono text-[11px]"
          >
            {codeText}
          </code>
        );
        cursor += closeTick + 1;
        continue;
      }
    }

    // 3. Bold: **text**
    if (remaining.startsWith('**')) {
      const closeBold = remaining.indexOf('**', 2);
      if (closeBold > 2) {
        const inner = remaining.slice(2, closeBold);
        const key = `${keyPrefix}-b-${tokenIndex++}`;
        nodes.push(
          <strong key={key} className="font-semibold text-white">
            {renderInline(inner, `${key}-in`)}
          </strong>
        );
        cursor += closeBold + 2;
        continue;
      }
    }

    // 4. Italic: *text* (single asterisk not followed by space)
    if (remaining[0] === '*' && remaining[1] && remaining[1] !== '*' && remaining[1] !== ' ') {
      const closeItalic = remaining.indexOf('*', 1);
      if (closeItalic > 1 && remaining[closeItalic - 1] !== ' ') {
        const inner = remaining.slice(1, closeItalic);
        const key = `${keyPrefix}-em-${tokenIndex++}`;
        nodes.push(
          <em key={key} className="italic text-gray-200">
            {renderInline(inner, `${key}-in`)}
          </em>
        );
        cursor += closeItalic + 1;
        continue;
      }
    }

    // 5. Consume plain text up to next special delimiter
    let nextSpecial = remaining.slice(1).search(/[[`*]/);
    if (nextSpecial === -1) {
      nodes.push(remaining);
      break;
    }
    nodes.push(remaining.slice(0, nextSpecial + 1));
    cursor += nextSpecial + 1;
  }

  return nodes;
}

const HEADING_CLASSES = {
  1: 'text-sm font-bold text-white pt-1',
  2: 'text-[13px] font-bold text-white pt-1',
  3: 'text-xs font-semibold text-white pt-1',
  4: 'text-xs font-semibold text-gray-200 pt-0.5'
};

export function MarkdownMessage({ text }) {
  if (typeof text !== 'string' || !text.trim()) {
    return null;
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} className="border-neutral-800 my-1.5" />);
      i += 1;
      continue;
    }

    // Heading (# to ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = level <= 2 ? 'h3' : 'h4';
      blocks.push(
        <Tag key={`h-${i}`} className={HEADING_CLASSES[level] || HEADING_CLASSES[3]}>
          {renderInline(headingMatch[2], `h-${i}`)}
        </Tag>
      );
      i += 1;
      continue;
    }

    // Unordered list (* or -)
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      const startIndex = i;
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*[-*]\s+/, '');
        items.push(
          <li key={`ul-li-${i}`} className="leading-relaxed">
            {renderInline(content, `ul-${i}`)}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${startIndex}`} className="list-disc pl-4 space-y-1 text-gray-100">
          {items}
        </ul>
      );
      continue;
    }

    // Ordered list (1. 2. ...)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      const startIndex = i;
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*\d+\.\s+/, '');
        items.push(
          <li key={`ol-li-${i}`} className="leading-relaxed">
            {renderInline(content, `ol-${i}`)}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${startIndex}`} className="list-decimal pl-4 space-y-1 text-gray-100">
          {items}
        </ol>
      );
      continue;
    }

    // Paragraph: collect contiguous regular text lines
    const paraLines = [];
    const startIndex = i;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }

    blocks.push(
      <p key={`p-${startIndex}`} className="leading-relaxed">
        {renderInline(paraLines.join(' '), `p-${startIndex}`)}
      </p>
    );
  }

  return <div className="space-y-1.5">{blocks}</div>;
}

export default MarkdownMessage;
