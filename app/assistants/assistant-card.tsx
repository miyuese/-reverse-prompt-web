"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Assistant } from "@prisma/client";
import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { deleteAssistant, updateAssistant } from "./actions";
import type { AssistantFormValues } from "./actions";

const assistantSchema = z.object({
  name: z.string().trim().min(1, "请输入助手名称"),
  systemPrompt: z.string().trim().min(1, "请输入系统提示词"),
  outputTemplate: z.string().trim().min(1, "请输入输出格式模板"),
});

export function AssistantCard({ item }: { item: Assistant }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssistantFormValues>({
    resolver: zodResolver(assistantSchema),
    defaultValues: {
      name: item.name,
      systemPrompt: item.systemPrompt,
      outputTemplate: item.outputTemplate,
    },
  });

  function handleEdit() {
    setEditing(true);
    setErrorMsg(null);
  }

  function handleCancel() {
    setEditing(false);
    setErrorMsg(null);
    reset({
      name: item.name,
      systemPrompt: item.systemPrompt,
      outputTemplate: item.outputTemplate,
    });
  }

  function handleDelete() {
    if (!confirm(`确定删除「${item.name}」吗？此操作不可撤销。`)) return;
    startTransition(async () => {
      const result = await deleteAssistant(item.id);
      if (!result.success) setErrorMsg(result.error);
    });
  }

  async function onSubmit(values: AssistantFormValues) {
    setErrorMsg(null);
    const result = await updateAssistant(item.id, values);
    if (result.success) {
      setEditing(false);
    } else {
      setErrorMsg(result.error);
    }
  }

  if (editing) {
    return (
      <article className="rounded-3xl border border-violet-500/40 bg-slate-900/80 p-5 shadow-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <p className="text-sm font-medium text-violet-300">编辑助手设计师</p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">助手名称</label>
            <input
              {...register("name")}
              type="text"
              autoComplete="off"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">系统提示词</label>
            <textarea
              {...register("systemPrompt")}
              rows={5}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
            />
            {errors.systemPrompt && <p className="text-xs text-red-400">{errors.systemPrompt.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">输出格式模板</label>
            <textarea
              {...register("outputTemplate")}
              rows={4}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
            />
            {errors.outputTemplate && <p className="text-xs text-red-400">{errors.outputTemplate.message}</p>}
          </div>
          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || isPending}
              className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
            >
              {isSubmitting || isPending ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              取消
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg transition hover:border-slate-700">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <span className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300">
            已持久化
          </span>
        </div>
        <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-300">
          系统提示词：{item.systemPrompt}
        </p>
        <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-400">
          输出模板：{item.outputTemplate}
        </p>
        <p className="text-xs text-slate-500">
          创建时间：{new Date(item.createdAt).toLocaleString("zh-CN")}
        </p>
        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleEdit}
            className="rounded-full border border-violet-500/50 px-3 py-1 text-xs text-violet-300 hover:bg-violet-500/10 transition"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
          >
            {isPending ? "删除中..." : "删除"}
          </button>
        </div>
      </div>
    </article>
  );
}
