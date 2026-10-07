import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  title?: ReactNode;
  onClose: () => void;
  variant?: "full" | "bottom";
  surface?: boolean;
  left?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  animate?: boolean;
}

// iOS-style card sheet: rounded top, grab handle, tap-outside to dismiss.
export function Sheet({ title, onClose, variant = "full", surface, left, footer, children, closeLabel = "Close", animate = true }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className={`overlay ${animate ? "" : "overlay--static"}`} role="dialog" aria-modal="true">
      <div className="overlay__scrim" onClick={onClose} />
      <div className={`sheet sheet--${variant} ${surface ? "sheet--surface" : ""}`}>
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__head">
          <div className="row-flex" style={{ minWidth: 0, gap: 8 }}>
            {left}
            {typeof title === "string" ? <h2 className="h2">{title}</h2> : title}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            <X size={20} strokeWidth={2.25} />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>
  );
}
