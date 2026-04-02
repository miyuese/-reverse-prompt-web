"use client";

import { useState, useTransition } from "react";

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(
    `接口返回了非 JSON 响应（HTTP ${response.status}）。${text ? ` 响应片段：${text.slice(0, 160)}` : ""}`
  );
}

type RevisionResult = {
  id: string;
  version: number;
  instruction: string;
  prompt: string;
  createdAt: string;
  isFavorite: boolean;
};

type BasePromptTarget =
  | {
      imageResultId: string;
      revisionId?: never;
      basePrompt: string;
      baseLabel: string;
    }
  | {
      imageResultId: string;
      revisionId: string;
      basePrompt: string;
      baseLabel: string;
    };

export function PromptRevisePanel({
  target,
  triggerLabel,
  helperText,
  className,
  onCreated,
}: {
  target: BasePromptTarget;
  triggerLabel: string;
  helperText: string;
  className?: string;
  onCreated?: (revision: RevisionResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setError(null);
          if (open) {
            setInstruction("");
          }
        }}
        className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs text-violet-200 transition hover:bg-violet-500/20"
      >
        {triggerLabel}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
          <p className="text-xs leading-6 text-violet-200">{helperText}</p>
          <p className="mt-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs leading-6 text-slate-400">
            当前基底：{target.baseLabel}
          </p>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            rows={3}
            placeholder="例如：保持主体不变，但改成更强的电影感、低饱和冷色调与逆光轮廓光。"
            className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-500"
          />

          {error && (
            <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const trimmedInstruction = instruction.trim();

                if (!trimmedInstruction) {
                  setError("请输入补充修改要求");
                  return;
                }

                setError(null);

                startTransition(async () => {
                  try {
                    const response = await fetch("/api/revisions", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        imageResultId: target.imageResultId,
                        revisionId: target.revisionId,
                        basePrompt: target.basePrompt,
                        instruction: trimmedInstruction,
                      }),
                    });

                    const data = await parseJsonResponse(response);

                    if (!data.ok) {
                      setError(data.error || "生成修订版失败，请稍后重试。");
                      return;
                    }

                    onCreated?.(data.revision);
                    setInstruction("");
                    setOpen(false);
                  } catch (error) {
                    setError(error instanceof Error ? error.message : "生成修订版失败，请检查网络后重试。");
                  }
                });
              }}
              className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "生成修订中..." : "提交修改要求"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setInstruction("");
                setError(null);
              }}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
