import { useMemo, useRef, useState } from 'react';

/** Textarea that suggests project members when you type "@" (FR-COMM-06). */
export default function MentionTextarea({ value, onChange, members, placeholder, maxLength = 1000, rows = 3, id, ...rest }) {
  const ref = useRef(null);
  const [query, setQuery] = useState(null); // text typed after "@", or null when closed
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().startsWith(q)).slice(0, 6);
  }, [query, members]);

  function detect(text, caret) {
    const before = text.slice(0, caret);
    const m = before.match(/(?:^|\s)@([^@\n]{0,30})$/);
    setQuery(m ? m[1] : null);
    setActive(0);
  }

  function handleChange(e) {
    onChange(e.target.value);
    detect(e.target.value, e.target.selectionStart);
  }

  function pick(member) {
    const el = ref.current;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@[^@\n]{0,30}$/, `@${member.name} `);
    const after = value.slice(caret);
    const next = `${before}${after}`;
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  }

  function handleKeyDown(e) {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery(null);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        id={id}
        className="input resize-y"
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setQuery(null)}
        {...rest}
      />
      {suggestions.length > 0 && (
        <ul role="listbox" className="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg">
          {suggestions.map((m, i) => (
            <li
              key={m.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the textarea
                pick(m);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-brand-soft text-brand-dark' : 'hover:bg-page'}`}
            >
              {m.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
