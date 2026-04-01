import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "../app-shell";
import { CopyButton } from "../copy-button";
import { FavoriteToggleButton } from "../favorite-toggle-button";
import { PromptRevisePanel } from "../prompt-revise-panel";
import { getGenerateTaskById, getGenerateTasks } from "./actions";

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

function formatRevisionCount(count: number) {
  if (count === 0) return "仅原始版";
  return `含 ${count} 个修订版`;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ taskId?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const selectedTaskId = resolved.taskId;

  const tasks = await getGenerateTasks();
  const selectedTask = selectedTaskId
    ? await getGenerateTaskById(selectedTaskId)
    : tasks[0] ?? null;

  if (selectedTaskId && !selectedTask) {
    notFound();
  }

  return (
    <AppShell
      title="历史页"
      description="查看过往生成任务，以及任务下每张图片对应的 prompt 结果。"
    >
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/50 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-violet-400">任务列表</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">历史任务</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                按时间倒序展示过往生成任务，可点击查看任务详情。
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              Quest 9.2
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-400">
                暂无历史任务。请先去生成页完成一次单图或多图生成。
              </div>
            ) : (
              tasks.map((task: Awaited<ReturnType<typeof getGenerateTasks>>[number]) => {
                const isActive = selectedTask?.id === task.id;
                return (
                  <Link
                    key={task.id}
                    href={`/history?taskId=${task.id}`}
                    className={`block rounded-3xl border p-4 transition ${
                      isActive
                        ? "border-cyan-500/50 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-950/50 hover:bg-slate-900"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>任务 {task.id.slice(0, 8)}</span>
                        <span>·</span>
                        <span>{formatTime(task.createdAt)}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        {task.imageCount} 张图片 · {task.modelConfigName}
                      </h3>
                      <p className="text-xs leading-6 text-slate-400">
                        模型：{task.modelName}
                        {task.assistantName ? ` · 助手：${task.assistantName}` : " · 系统默认规则"}
                      </p>
                      <p className="text-xs leading-6 text-slate-500">
                        {formatRevisionCount(
                          task.imageResults.reduce(
                            (
                              sum: number,
                              item: Awaited<ReturnType<typeof getGenerateTasks>>[number]["imageResults"][number]
                            ) => sum + item.revisions.length,
                            0
                          )
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/50 sm:p-8">
          {!selectedTask ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-sm leading-7 text-slate-400">
              暂无可查看的任务详情。完成一次生成后，这里会展示该任务下每张图对应的 prompt 记录。
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-cyan-400">任务详情</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    任务 {selectedTask.id.slice(0, 8)}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    生成时间：{formatTime(selectedTask.createdAt)}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    模型：{selectedTask.modelConfigName} / {selectedTask.modelName}
                    {selectedTask.assistantName
                      ? ` · 助手：${selectedTask.assistantName}`
                      : " · 使用系统默认规则"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-slate-300">
                  共 {selectedTask.imageResults.length} 条结果
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {selectedTask.imageResults.map(
                  (item: NonNullable<Awaited<ReturnType<typeof getGenerateTaskById>>>["imageResults"][number]) => (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5"
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          图片 {item.imageIndex + 1}：{item.originalName}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">类型：{item.mimeType}</p>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                              原始提示词
                            </p>
                            <CopyButton
                              text={item.prompt}
                              className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
                            />
                            <FavoriteToggleButton
                              target={{ imageResultId: item.id }}
                              initialIsFavorite={item.isFavorite}
                              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <PromptRevisePanel
                              target={{
                                imageResultId: item.id,
                                basePrompt: item.prompt,
                                baseLabel: "原始版",
                              }}
                              triggerLabel="再次编辑"
                              helperText="从历史页直接复用这条旧 prompt，复制为新的编辑基底，再生成一个新的修订版本。"
                            />
                          </div>
                          <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                            {item.prompt}
                          </div>
                        </div>

                        {item.revisions.length > 0 && (
                          <div className="space-y-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-violet-300">
                              修订版本
                            </p>
                            {item.revisions.map(
                              (
                                revision: NonNullable<Awaited<ReturnType<typeof getGenerateTaskById>>>["imageResults"][number]["revisions"][number]
                              ) => (
                              <div
                                key={revision.id}
                                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <p className="text-xs leading-6 text-slate-400">
                                    V{revision.version} · {formatTime(revision.createdAt)}
                                  </p>
                                  <CopyButton
                                    text={revision.prompt}
                                    className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
                                  />
                                  <FavoriteToggleButton
                                    target={{ revisionId: revision.id }}
                                    initialIsFavorite={revision.isFavorite}
                                    className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                  />
                                  <PromptRevisePanel
                                    target={{
                                      imageResultId: item.id,
                                      revisionId: revision.id,
                                      basePrompt: revision.prompt,
                                      baseLabel: `V${revision.version}`,
                                    }}
                                    triggerLabel="再次编辑"
                                    helperText="这里会基于当前选中的历史版本继续和 AI 对话，新结果会作为新的独立版本保存。"
                                  />
                                </div>
                                <p className="mt-1 text-xs leading-6 text-slate-500">
                                  修改要求：{revision.instruction}
                                </p>
                                <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                                  {revision.prompt}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
