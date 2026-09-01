import React, { useLayoutEffect, useRef, useState } from 'react';

// Shrinks the font until `text` fits its container width, then ellipsises.
// Used for waiter names on resizable table cards so a full name always
// shows when the card is wide enough, and truncates only when too small.
export default function FitText({ text, min = 9, max = 12, color, weight = 600, style }) {
  const ref = useRef(null);
  const [fs, setFs] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = max;
    el.style.fontSize = `${size}px`;
    while (size > min && el.scrollWidth > el.clientWidth) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
    setFs(size);
  }, [text, max, min]);

  return (
    <span
      ref={ref}
      style={{
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: `${fs}px`,
        fontWeight: weight,
        color,
        ...style,
      }}
    >
      {text}
    </span>
  );
}