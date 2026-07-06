import React from "react";

export function Loading() {
  return (
    <div className="center">
      <div className="spinner" />
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="center" style={{ flexDirection: "column", gap: 10 }}>
      <span>Không tải được dữ liệu 😕</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "8px 20px",
            fontWeight: 600,
          }}
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return <div className="center">{label}</div>;
}
