/**
 * PageHeader — shared page title + optional description + actions slot.
 *
 * DESIGN.md §3: Epilogue display font with tight letter-spacing
 * and heavy weight. Body text uses Inter (--font-body).
 *
 * Shared component — used across all dashboard pages.
 */

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1
          className="text-2xl font-extrabold"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="text-sm mt-1"
            style={{
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-body)",
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
