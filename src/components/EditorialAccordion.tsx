import { useId, useState } from "react";
import { Plus } from "lucide-react";

/** Always-mounted answers allow opening and closing to share one transition. */
export function EditorialAccordion({ items }: { items: string[][] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const id = useId();
  return (
    <div className="editorial-accordion">
      {items.map(([title, answer], index) => (
        <div
          className="editorial-question"
          key={title}
          data-expanded={expanded === index}
        >
          <h3>
            <button
              aria-expanded={expanded === index}
              aria-controls={`${id}-${index}`}
              id={`${id}-trigger-${index}`}
              onClick={() => setExpanded(expanded === index ? null : index)}
            >
              {title}
              <Plus size={19} />
            </button>
          </h3>
          <div
            className="editorial-answer"
            id={`${id}-${index}`}
            role="region"
            aria-labelledby={`${id}-trigger-${index}`}
            inert={expanded !== index}
            aria-hidden={expanded !== index}
          >
            <div>
              <p>{answer}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
