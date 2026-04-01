"use client";

import { useState, useTransition } from "react";

type FavoriteTarget =
  | { imageResultId: string; revisionId?: never }
  | { imageResultId?: never; revisionId: string };

export function FavoriteToggleButton({
  target,
  initialIsFavorite,
  className,
  onToggled,
}: {
  target: FavoriteTarget;
  initialIsFavorite: boolean;
  className?: string;
  onToggled?: (nextIsFavorite: boolean) => void;
}) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);

          startTransition(async () => {
            try {
              const response = await fetch("/api/favorites", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  ...target,
                  isFavorite: !isFavorite,
                }),
              });

              const data = await response.json();

              if (!data.ok) {
                setError(data.error || "收藏状态更新失败，请稍后重试。");
                return;
              }

              setIsFavorite(data.isFavorite);
              onToggled?.(data.isFavorite);
            } catch {
              setError("收藏状态更新失败，请检查网络后重试。");
            }
          });
        }}
        className={className}
      >
        {isPending ? "处理中..." : isFavorite ? "取消收藏" : "收藏"}
      </button>

      {error && <p className="text-xs leading-5 text-red-300">{error}</p>}
    </div>
  );
}
