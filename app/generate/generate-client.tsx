"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { AppShell } from "../app-shell";
import { CopyButton } from "../copy-button";
import { FavoriteToggleButton } from "../favorite-toggle-button";
import { PromptRevisePanel } from "../prompt-revise-panel";

type ModelConfig = {
  id: string;
  name: string;
  modelName: string;
  baseUrl: string;
};

type Assistant = {
  id: string;
  name: string;
};

type PreviewItem = {
  id: string;
  file: File;
  url: string;
};

type ResultItem = {
  previewId: string;
  prompt: string;
  error?: string;
  imageResultId?: string;
  isFavorite?: boolean;
  revisions?: RevisionItem[];
};

type RevisionItem = {
  id: string;
  version: number;
  instruction: string;
  prompt: string;
  createdAt: string;
  isFavorite: boolean;
};

type SaveStatus = {
  type: "success" | "error";
  message: string;
};

const SYSTEM_ASSISTANT_OPTION = "__system_default__";

function getFriendlyGenerateError(error: string) {
  if (error.includes("API Key") || error.includes("鉴权失败")) {
    return "当前模型配置的 API Key 不可用，请前往模型配置页检查后再试。";
  }

  if (error.includes("Base URL") || error.includes("网络连接失败")) {
    return "当前模型配置的 Base URL 不可用，请确认接口地址正确且服务在线。";
  }

  if (error.includes("模型配置异常") || error.includes("模型名称") || error.includes("模型配置不存在")) {
    return "当前模型配置不可用，请检查 Model 名称或重新选择一条有效配置。";
  }

  if (error.includes("超时")) {
    return "第三方接口响应超时，请稍后重试，或更换可用模型配置。";
  }

  return null;
}

export function GenerateClient({
  modelConfigs,
  assistants,
}: {
  modelConfigs: ModelConfig[];
  assistants: Assistant[];
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);

  useEffect(() => {
    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previews]);

  const previewSummary = useMemo(() => {
    if (previews.length === 0) return "尚未选择图片";
    if (previews.length === 1) return "已选择 1 张图片";
    return `已选择 ${previews.length} 张图片`;
  }, [previews.length]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    setResults([]);
    setGlobalError(null);
    setSaveStatus(null);
    setPreviews((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return nextFiles.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        file,
        url: URL.createObjectURL(file),
      }));
    });
  };

  const clearSelectedImages = () => {
    setPreviews((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setResults([]);
    setGlobalError(null);
    setSaveStatus(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleGenerate = () => {
    if (previews.length === 0) {
      setGlobalError("请先选择至少一张图片");
      return;
    }
    if (!selectedConfigId) {
      setGlobalError("请选择模型配置");
      return;
    }

    if (!selectedAssistantId) {
      setGlobalError("请选择助手设计师，或明确选择“使用系统默认规则”后再生成");
      return;
    }

    setGlobalError(null);
    setResults([]);
    setSaveStatus(null);

    startTransition(async () => {
      // 逐张生成（Quest 7.1 只需单图，此处已为多图做好基础）
      const newResults: ResultItem[] = [];
      for (const item of previews) {
        const fd = new FormData();
        fd.append("image", item.file);
        fd.append("configId", selectedConfigId);
        if (selectedAssistantId && selectedAssistantId !== SYSTEM_ASSISTANT_OPTION) {
          fd.append("assistantId", selectedAssistantId);
        }

        try {
          const res = await fetch("/api/generate", { method: "POST", body: fd });
          const data = await res.json();
          if (data.ok) {
            newResults.push({ previewId: item.id, prompt: data.prompt });
          } else {
            newResults.push({ previewId: item.id, prompt: "", error: data.error });
          }
        } catch {
          newResults.push({ previewId: item.id, prompt: "", error: "网络请求失败，请稍后重试" });
        }
      }

      const successfulResults = previews
        .map((item, index) => {
          const result = newResults.find((entry) => entry.previewId === item.id);
          if (!result?.prompt) {
            return null;
          }

          return {
            imageIndex: index,
            originalName: item.file.name,
            mimeType: item.file.type || "image/jpeg",
            prompt: result.prompt,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (successfulResults.length > 0) {
        try {
          const saveResponse = await fetch("/api/history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              modelConfigId: selectedConfigId,
              assistantId:
                selectedAssistantId && selectedAssistantId !== SYSTEM_ASSISTANT_OPTION
                  ? selectedAssistantId
                  : undefined,
              imageResults: successfulResults,
            }),
          });

          const saveData = await saveResponse.json();

          if (saveData.ok) {
            const imageResultIdMap = new Map<number, string>(
              (saveData.imageResults ?? []).map((item: { id: string; imageIndex: number }) => [
                item.imageIndex,
                item.id,
              ])
            );

            newResults.forEach((result, index) => {
              result.imageResultId = imageResultIdMap.get(index);
              result.isFavorite = false;
              result.revisions = [];
            });

            const hasFailures = successfulResults.length !== previews.length;
            setSaveStatus({
              type: "success",
              message: hasFailures
                ? `已保存 ${successfulResults.length} 条成功结果到历史记录。`
                : "本次生成结果已保存到历史记录。",
            });
          } else {
            setSaveStatus({
              type: "error",
              message: saveData.error || "历史保存失败，请稍后重试。",
            });
          }
        } catch {
          setSaveStatus({
            type: "error",
            message: "历史保存失败，请检查网络后重试。",
          });
        }
      } else {
        setSaveStatus({
          type: "error",
          message: "本次生成没有可保存的成功结果。",
        });
      }

      setResults(newResults);
    });
  };

  return (
    <AppShell
      title="生成页"
      description="上传图片，选择模型与助手，点击生成获得结构化反推 prompt。"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        {/* 左侧：图片上传 + 结果区 */}
        <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/50 sm:p-8">
          {/* 上传区 */}
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-400">图片上传区</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">选择图片</h2>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              选择图片
            </button>
            {previews.length > 0 && (
              <button
                type="button"
                onClick={clearSelectedImages}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
              >
                清除全部
              </button>
            )}
            <span className="self-center text-sm text-slate-400">{previewSummary}</span>
          </div>

          {/* 图片预览网格 */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {previews.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-slate-900"
                >
                  <Image src={item.url} alt={item.file.name} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}

          {/* 全局错误 */}
          {globalError && (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {globalError}
            </p>
          )}

          {/* 生成结果区 */}
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">生成结果</h3>
                {saveStatus && (
                  <p
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      saveStatus.type === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    {saveStatus.message}
                  </p>
                )}
              </div>
              {previews.map((item, index) => {
                const result = results.find((r) => r.previewId === item.id);
                return (
                  <section
                    key={item.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5"
                  >
                    <div className="flex w-full flex-col gap-4 sm:flex-row">
                      {/* 图片缩略图 */}
                      <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                        <Image src={item.url} alt={item.file.name} fill className="object-cover" unoptimized />
                      </div>
                      {/* prompt 内容 */}
                        <div className="flex min-w-0 flex-1 flex-col gap-3">

                        <p className="text-xs text-slate-500">图片 {index + 1}：{item.file.name}</p>
                        {result?.error ? (
                          <div className="space-y-2">
                            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                              生成失败：{result.error}
                            </p>
                            {getFriendlyGenerateError(result.error) && (
                              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                                {getFriendlyGenerateError(result.error)}
                              </p>
                            )}
                            {(result.error.includes("不支持图片输入") ||
                              result.error.includes("不支持此图片消息格式") ||
                              result.error.includes("Responses 图片能力不可用")) && (
                              <p className="text-xs leading-6 text-slate-400">
                                当前验收阻塞点在第三方兼容平台：文本调用可用，但图片分析能力、Responses 图片入口或图片消息格式不兼容。
                              </p>
                            )}
                          </div>
                        ) : result?.prompt ? (
                          <>
                            <p className="w-full whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm leading-7 text-slate-200">
                              {result.prompt}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <CopyButton
                                text={result.prompt}
                                className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
                              />
                              {result.imageResultId && (
                                <FavoriteToggleButton
                                  target={{ imageResultId: result.imageResultId }}
                                  initialIsFavorite={result.isFavorite ?? false}
                                  onToggled={(nextIsFavorite) => {
                                    setResults((current) =>
                                      current.map((entry) =>
                                        entry.previewId === result.previewId
                                          ? { ...entry, isFavorite: nextIsFavorite }
                                          : entry
                                      )
                                    );
                                  }}
                                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              )}
                              {result.imageResultId && (
                                <PromptRevisePanel
                                  target={{
                                    imageResultId: result.imageResultId,
                                    basePrompt: result.prompt,
                                    baseLabel:
                                      (result.revisions?.length ?? 0) > 0 ? "当前最新版本" : "原始版",
                                  }}
                                  triggerLabel="继续修改"
                                  helperText="和 Quest 7.1/10 已验证的稳定链路一致：基于当前这张图的已有 prompt 继续向 AI 提要求，生成新的完整版本。"
                                  onCreated={(revision) => {
                                    setResults((current) =>
                                      current.map((entry) => {
                                        if (entry.previewId !== result.previewId) {
                                          return entry;
                                        }

                                        const revisions = [...(entry.revisions ?? []), revision];
                                        return {
                                          ...entry,
                                          prompt: revision.prompt,
                                          revisions,
                                        };
                                      })
                                    );
                                  }}
                                />
                              )}
                            </div>

                            {(result.revisions?.length ?? 0) > 0 && (
                              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                                <p className="text-xs uppercase tracking-[0.24em] text-violet-300">
                                  修订版本
                                </p>
                                {result.revisions?.map((revision) => (
                                  <div
                                    key={revision.id}
                                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <p className="text-xs text-slate-400">
                                        V{revision.version} · 修改要求：{revision.instruction}
                                      </p>
                                       <CopyButton
                                         text={revision.prompt}
                                         className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
                                       />
                                       <FavoriteToggleButton
                                         target={{ revisionId: revision.id }}
                                         initialIsFavorite={revision.isFavorite}
                                         onToggled={(nextIsFavorite) => {
                                           setResults((current) =>
                                             current.map((entry) => {
                                               if (entry.previewId !== result.previewId) {
                                                 return entry;
                                               }

                                               return {
                                                 ...entry,
                                                 revisions: entry.revisions?.map((entryRevision) =>
                                                   entryRevision.id === revision.id
                                                     ? { ...entryRevision, isFavorite: nextIsFavorite }
                                                     : entryRevision
                                                 ),
                                               };
                                             })
                                           );
                                         }}
                                         className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                       />
                                     </div>
                                     <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                                       {revision.prompt}
                                     </p>
                                     {result.imageResultId && (
                                       <div className="mt-3 border-t border-slate-800 pt-3">
                                         <PromptRevisePanel
                                           target={{
                                             imageResultId: result.imageResultId,
                                             revisionId: revision.id,
                                             basePrompt: revision.prompt,
                                             baseLabel: `V${revision.version}`,
                                           }}
                                           triggerLabel={`基于 V${revision.version} 再次编辑`}
                                           helperText="这里会复制当前选中的旧版本作为新的编辑基底，再生成一个新的修订版本，原记录不会被覆盖。"
                                           onCreated={(createdRevision) => {
                                             setResults((current) =>
                                               current.map((entry) => {
                                                 if (entry.previewId !== result.previewId) {
                                                   return entry;
                                                 }

                                                 return {
                                                   ...entry,
                                                   prompt: createdRevision.prompt,
                                                   revisions: [...(entry.revisions ?? []), createdRevision],
                                                 };
                                               })
                                             );
                                           }}
                                         />
                                       </div>
                                     )}
                                   </div>
                                 ))}
                                <p className="border-t border-slate-800 pt-3 text-xs text-slate-500">
                                  下一次“继续修改”默认基于当前显示的最新 prompt；如果要复用旧版本，请直接点击对应版本下方的“再次编辑”。
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">等待生成...</p>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        {/* 右侧：模型选择 + 助手选择 + 生成按钮 */}
        <aside className="space-y-6">
          {/* 模型选择 */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold">选择模型配置</h3>
            {modelConfigs.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                暂无模型配置，请先前往{" "}
                <a href="/models" className="text-cyan-400 underline">模型配置页</a>
                {" "}新增。
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-400">请先明确选择一条模型配置后再生成。</p>
                {modelConfigs.map((cfg) => (
                  <label
                    key={cfg.id}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                      selectedConfigId === cfg.id
                        ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-100"
                        : "border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span>
                      <span className="font-medium">{cfg.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{cfg.modelName}</span>
                    </span>
                    <input
                      type="radio"
                      name="configId"
                      value={cfg.id}
                      checked={selectedConfigId === cfg.id}
                      onChange={() => setSelectedConfigId(cfg.id)}
                      className="accent-cyan-400"
                    />
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* 助手选择 */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold">选择助手设计师</h3>
            <p className="mt-1 text-xs text-slate-400">
              请选择一个助手设计师，或明确选择“使用系统默认规则”。
            </p>
            <div className="mt-4 space-y-2">
              <label
                className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                  selectedAssistantId === SYSTEM_ASSISTANT_OPTION
                    ? "border-violet-500/60 bg-violet-500/10 text-violet-100"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span>使用系统默认规则</span>
                <input
                  type="radio"
                  name="assistantId"
                  value={SYSTEM_ASSISTANT_OPTION}
                  checked={selectedAssistantId === SYSTEM_ASSISTANT_OPTION}
                  onChange={() => setSelectedAssistantId(SYSTEM_ASSISTANT_OPTION)}
                  className="accent-violet-400"
                />
              </label>
              {assistants.map((ast) => (
                <label
                  key={ast.id}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                    selectedAssistantId === ast.id
                      ? "border-violet-500/60 bg-violet-500/10 text-violet-100"
                      : "border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span>{ast.name}</span>
                  <input
                    type="radio"
                    name="assistantId"
                    value={ast.id}
                    checked={selectedAssistantId === ast.id}
                    onChange={() => setSelectedAssistantId(ast.id)}
                    className="accent-violet-400"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* 生成按钮 */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending || modelConfigs.length === 0}
            className="w-full rounded-3xl bg-violet-500 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/50"
          >
            {isPending ? "生成中，请稍候..." : `生成反推 Prompt${previews.length > 1 ? `（${previews.length} 张）` : ""}`}
          </button>
        </aside>
      </div>
    </AppShell>
  );
}
