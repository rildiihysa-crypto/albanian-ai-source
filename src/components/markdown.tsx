function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="md-body">
      {blocks.map((block, i) => {
        if (block.startsWith("```")) {
          const inner = block.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "");
          return (
            <pre key={i}>
              <code>{inner}</code>
            </pre>
          );
        }
        if (/^[-*]\s/m.test(block)) {
          const items = block.split("\n").filter((line) => /^[-*]\s/.test(line));
          return (
            <ul key={i}>
              {items.map((item, j) => (
                <li key={j}>{renderInline(item.replace(/^[-*]\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
}
