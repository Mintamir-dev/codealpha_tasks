import { Fragment } from 'react';

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;

/**
 * Shows plain text with clickable web links (FR-COMM-07) and highlighted @mentions.
 * Text is rendered as React text nodes, so HTML in a comment is shown as text and never run (NFR-SEC-04).
 */
export default function RichText({ text, memberNames = [] }) {
  const names = [...memberNames].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const mention = names.length ? `|(?<![\\p{L}\\p{N}_])@(?:${names.join('|')})(?![\\p{L}\\p{N}_])` : '';
  const pattern = new RegExp(`(https?:\\/\\/[^\\s<]+)${mention}`, 'giu');

  const parts = [];
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
    let value = match[0];
    if (/^https?:/i.test(value)) {
      const trailing = (value.match(TRAILING_PUNCTUATION) || [''])[0];
      value = value.slice(0, value.length - trailing.length);
      parts.push({ type: 'link', value });
      if (trailing) parts.push({ type: 'text', value: trailing });
    } else {
      parts.push({ type: 'mention', value });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p.type === 'link' ? (
            <a href={p.value} target="_blank" rel="noopener noreferrer" className="link">
              {p.value}
            </a>
          ) : p.type === 'mention' ? (
            <span className="mention">{p.value}</span>
          ) : (
            p.value
          )}
        </Fragment>
      ))}
    </span>
  );
}
