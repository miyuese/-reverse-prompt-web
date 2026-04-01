"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  createModelConfig,
  type ModelConfigFormValues as ServerModelConfigFormValues,
} from "./actions";

const modelConfigSchema = z.object({
  name: z.string().trim().min(1, "请输入配置名称"),
  apiKey: z.string().trim().min(1, "请输入 API Key"),
  baseUrl: z
    .string()
    .trim()
    .min(1, "请输入 Base URL")
    .url("请输入合法的 Base URL，例如 https://api.openai.com/v1"),
  model: z.string().trim().min(1, "请输入 Model 名称"),
});

type ModelConfigFormValues = z.infer<typeof modelConfigSchema>;

const defaultValues: ModelConfigFormValues = {
  name: "",
  apiKey: "",
  baseUrl: "",
  model: "",
};

const formFields: Array<{
  name: keyof ModelConfigFormValues;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "url";
  autoComplete?: string;
}> = [
  {
    name: "name",
    label: "配置名称",
    placeholder: "例如：OpenAI 官方主配置",
    type: "text",
    autoComplete: "off",
  },
  {
    name: "apiKey",
    label: "API Key",
    placeholder: "请输入 sk-... 或兼容平台密钥",
    type: "password",
    autoComplete: "off",
  },
  {
    name: "baseUrl",
    label: "Base URL",
    placeholder: "例如：https://api.openai.com/v1",
    type: "url",
    autoComplete: "url",
  },
  {
    name: "model",
    label: "Model 名称",
    placeholder: "例如：gpt-4o-mini",
    type: "text",
    autoComplete: "off",
  },
];

export function ModelConfigForm() {
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<ModelConfigFormValues | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ModelConfigFormValues>({
    resolver: zodResolver(modelConfigSchema),
    defaultValues,
    mode: "onSubmit",
  });

  const statusText = useMemo(() => {
    if (submittedData && isSubmitSuccessful) {
      return "当前状态：已保存到数据库";
    }

    return "当前状态：等待保存";
  }, [isSubmitSuccessful, submittedData]);

  const onSubmit = (values: ModelConfigFormValues) => {
    setSubmitMessage(null);

    startTransition(async () => {
      const result = await createModelConfig({
        name: values.name,
        apiKey: values.apiKey,
        baseUrl: values.baseUrl,
        modelName: values.model,
      } satisfies ServerModelConfigFormValues);

      if (!result.success) {
        setSubmitMessage(result.error);
        return;
      }

      setSubmittedData(values);
      setSubmitMessage(`模型配置“${values.name}”已成功保存到数据库。`);
      reset(defaultValues);
    });
  };

  const handleReset = () => {
    reset(defaultValues);
    setSubmitMessage(null);
    setSubmittedData(null);
  };

  return (
    <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/50 sm:p-8">
      <p className="text-sm uppercase tracking-[0.28em] text-violet-400">表单区</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">模型配置表单</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            当前阶段已接入数据库保存。提交成功后，刷新页面仍可在左侧列表看到持久化结果。
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {statusText}
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formFields.map((field) => {
          const errorMessage = errors[field.name]?.message;

          return (
            <label key={field.name} className="block space-y-2">
              <span className="text-sm text-slate-200">{field.label}</span>
              <input
                {...register(field.name)}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                aria-invalid={errorMessage ? "true" : "false"}
                className={`w-full rounded-2xl border bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 ${
                  errorMessage ? "border-rose-500/80" : "border-slate-800"
                }`}
              />
              {errorMessage ? <p className="text-sm text-rose-300">{String(errorMessage)}</p> : null}
            </label>
          );
        })}

        {submitMessage ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {submitMessage}
          </div>
        ) : null}

        {submittedData ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
            <p className="font-medium text-slate-100">最近一次成功保存的数据摘要</p>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-slate-400">配置名称：</span>
                {submittedData.name}
              </li>
              <li>
                <span className="text-slate-400">API Key：</span>
                已输入（已遮罩展示）
              </li>
              <li className="break-all">
                <span className="text-slate-400">Base URL：</span>
                {submittedData.baseUrl}
              </li>
              <li>
                <span className="text-slate-400">Model 名称：</span>
                {submittedData.model}
              </li>
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            重置表单
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isPending}
            className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/60"
          >
            {isSubmitting || isPending ? "保存中..." : "保存配置"}
          </button>
        </div>
      </form>
    </aside>
  );
}
