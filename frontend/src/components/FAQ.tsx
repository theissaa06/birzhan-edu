import { useState } from "react";

interface FAQItem {
  q: string;
  a: string;
}

export default function FAQ({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            borderRadius: 12,
            border: "1px solid var(--gray-border)",
            marginBottom: 12,
            overflow: "hidden",
            transition: "box-shadow 0.2s",
            boxShadow: open === i ? "var(--shadow)" : "none",
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "18px 24px",
              background: open === i ? "var(--purple-light)" : "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: 600,
              fontSize: 15,
              color: open === i ? "var(--purple)" : "var(--black)",
              transition: "all 0.2s",
            }}
          >
            {item.q}
            <span
              style={{
                fontSize: 20,
                fontWeight: 300,
                transform: open === i ? "rotate(45deg)" : "rotate(0)",
                transition: "transform 0.3s",
                color: "var(--purple)",
              }}
            >
              +
            </span>
          </button>
          {open === i && (
            <div
              style={{
                padding: "0 24px 20px",
                fontSize: 15,
                color: "var(--gray)",
                lineHeight: 1.7,
              }}
            >
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
