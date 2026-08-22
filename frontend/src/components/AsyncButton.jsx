import React from "react";
import { LoaderCircle } from "lucide-react";

export default function AsyncButton({
  loading = false,
  loadingLabel = "处理中…",
  disabled = false,
  children,
  className = "",
  ...props
}) {
  const contentStackStyle = {
    display: "inline-grid",
    gridTemplateColumns: "max-content",
    alignItems: "center",
    verticalAlign: "middle",
  };
  const contentLayerStyle = {
    gridArea: "1 / 1",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : "false"}
      className={className}
    >
      <span data-testid="async-button-content-stack" style={contentStackStyle}>
        <span
          data-testid="async-button-idle-content"
          aria-hidden={loading ? "true" : undefined}
          style={{
            ...contentLayerStyle,
            visibility: loading ? "hidden" : "visible",
          }}
        >
          {children}
        </span>
        <span
          data-testid="async-button-loading-content"
          aria-hidden={loading ? undefined : "true"}
          style={{
            ...contentLayerStyle,
            visibility: loading ? "visible" : "hidden",
          }}
        >
          <LoaderCircle
            data-testid={loading ? "loading-spinner" : undefined}
            aria-hidden="true"
            className="animate-spin"
            size={16}
          />
          <span>{loadingLabel}</span>
        </span>
      </span>
    </button>
  );
}
