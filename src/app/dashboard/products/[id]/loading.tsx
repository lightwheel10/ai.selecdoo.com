export default function ProductDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Back button skeleton */}
      <div
        className="h-5 w-36 mb-6"
        style={{ backgroundColor: "var(--input)" }}
      />

      {/* Hero skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Image */}
        <div
          className="aspect-square w-full"
          style={{ backgroundColor: "var(--input)" }}
        />
        {/* Info */}
        <div className="space-y-4">
          <div
            className="h-4 w-24"
            style={{ backgroundColor: "var(--input)" }}
          />
          <div
            className="h-6 w-3/4"
            style={{ backgroundColor: "var(--input)" }}
          />
          <div
            className="h-4 w-1/2"
            style={{ backgroundColor: "var(--input)" }}
          />
          <div
            className="h-8 w-40"
            style={{ backgroundColor: "var(--input)" }}
          />
          <div
            className="h-4 w-32"
            style={{ backgroundColor: "var(--input)" }}
          />
        </div>
      </div>

      {/* Table skeleton — matches variant-table: border-strong + hard-shadow */}
      <div
        className="h-48 w-full mb-6"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      />

      {/* Metadata skeleton — matches product-metadata: border-strong + hard-shadow */}
      <div
        className="h-64 w-full"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      />
    </div>
  );
}
