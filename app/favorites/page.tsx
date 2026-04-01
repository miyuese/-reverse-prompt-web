import Link from "next/link";

import { AppShell } from "../app-shell";
import { CopyButton } from "../copy-button";
import { FavoriteToggleButton } from "../favorite-toggle-button";
import { PromptRevisePanel } from "../prompt-revise-panel";
import { getFavoritePrompts } from "../history/actions";

export const dynamic = "force-dynamic";

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function FavoritesPage() {
  const favoritePrompts = await getFavoritePrompts();

  return (
    <AppShell
      title="收藏页"
      description="这里只展示已收藏的单条 prompt，可直接复制、取消收藏，或基于旧版本再次编辑。"
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/50 sm:p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-violet-400">收藏概览</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">已收藏 Prompt</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            这里只保留 MVP 需要的核心能力：查看已收藏条目、进入对应历史任务，以及基于旧 prompt 再次编辑。
          </p>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-400">
            当前共收藏 {favoritePrompts.length} 条 prompt。
            <br />
            取消收藏后，条目会在刷新后从本页消失。
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/50 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-400">列表区</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">收藏 Prompt 列表</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                这里只显示已收藏内容，不显示未收藏项。你可以直接复制、取消收藏，或基于任意历史版本再次编辑。
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              Quest 11.3
            </div>
          </div>

          {favoritePrompts.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-sm leading-7 text-slate-400">
              暂无收藏内容。你可以先去生成页或历史页收藏一条 prompt，随后这里会只展示已收藏项目。
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {favoritePrompts.map((item) => (
                <article
                  key={`${item.type}-${item.id}`}
                  className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5"
                >
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">
                            {item.versionLabel} · 图片 {item.imageIndex + 1}
                          </h3>
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                            已收藏
                          </span>
                        </div>
                        <p className="text-xs leading-6 text-slate-400">
                          文件：{item.originalName} · 收藏时间：
                          {formatTime(item.favoritedAt ?? item.createdAt)}
                        </p>
                        <p className="text-xs leading-6 text-slate-500">
                          模型：{item.modelConfigName} / {item.modelName}
                          {item.assistantName ? ` · 助手：${item.assistantName}` : " · 系统默认规则"}
                        </p>
                        <Link
                          href={`/history?taskId=${item.taskId}`}
                          className="inline-flex text-xs text-cyan-400 underline-offset-4 hover:underline"
                        >
                          打开对应历史任务
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CopyButton
                          text={item.prompt}
                          className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
                        />
                        <FavoriteToggleButton
                          target={item.revisionId ? { revisionId: item.revisionId } : { imageResultId: item.imageResultId }}
                          initialIsFavorite={item.isFavorite}
                          className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <PromptRevisePanel
                          target={{
                            imageResultId: item.imageResultId,
                            revisionId: item.revisionId ?? undefined,
                            basePrompt: item.prompt,
                            baseLabel: item.versionLabel,
                          }}
                          triggerLabel="再次编辑"
                          helperText="这里会复制当前收藏的旧 prompt 作为新的编辑基底，继续和 AI 对话生成一个新的独立版本。"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-7 text-slate-200 whitespace-pre-wrap break-words">
                      {item.prompt}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
