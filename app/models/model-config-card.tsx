"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { deleteModelConfig, updateModelConfig } from "./actions";
import type { ModelConfigFormValues } from "./actions";

const modelConfigSchema = z.object({
  name: z.string().trim().min(1, "请输入配置名称"),
  apiKey: z.string().trim().min(1, "请输入 API Key"),
  baseUrl: z
    .string()
    .trim()
    .min(1, "请输入 Base URL")
    .url("请输入合法的 Base URL"),
  modelName: z.string().trim().min(1, "请输入 Model 名称"),
});

type ModelConfigCardItem = {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  createdAt: Date;
};

export function ModelConfigCard({ item }: { item: ModelConfigCardItem }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModelConfigFormValues>({
    resolver: zodResolver(modelConfigSchema),
    defaultValues: {
      name: item.name,
      apiKey: item.apiKey,
      baseUrl: item.baseUrl,
      modelName: item.modelName,
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
      apiKey: item.apiKey,
      baseUrl: item.baseUrl,
      modelName: item.modelName,
    });
  }

  function handleDelete() {
    if (!confirm(`确定删除「${item.name}」吗？此操作不可撤销。`)) return;
    startTransition(async () => {
      const result = await deleteModelConfig(item.id);
      if (!result.success) setErrorMsg(result.error);
    });
  }

  async function onSubmit(values: ModelConfigFormValues) {
    setErrorMsg(null);
    const result = await updateModelConfig(item.id, values);
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
          <p className="text-sm font-medium text-violet-300">编辑模型配置</p>
          {([
            { name: "name" as const, label: "配置名称", type: "text" },
            { name: "apiKey" as const, label: "API Key", type: "password" },
            { name: "baseUrl" as const, label: "Base URL", type: "url" },
            { name: "modelName" as const, label: "Model 名称", type: "text" },
          ]).map((f) => (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">{f.label}</label>
              <input
                {...register(f.name)}
                type={f.type}
                autoComplete="off"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
              {errors[f.name] && (
                <p className="text-xs text-red-400">{errors[f.name]?.message}</p>
              )}
            </div>
          ))}
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
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <span className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300">
              已持久化
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-300">Model：{item.modelName}</p>
        <p className="break-all text-sm text-slate-400">Base URL：{item.baseUrl}</p>
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
