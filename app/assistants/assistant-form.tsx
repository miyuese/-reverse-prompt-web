"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  createAssistant,
  type AssistantFormValues as ServerAssistantFormValues,
} from "./actions";

const assistantSchema = z.object({
  name: z.string().trim().min(1, "请输入助手名称"),
  systemPrompt: z.string().trim().min(1, "请输入系统提示词"),
  outputTemplate: z.string().trim().min(1, "请输入输出格式模板"),
});

type AssistantFormValues = z.infer<typeof assistantSchema>;

const defaultValues: AssistantFormValues = {
  name: "",
  systemPrompt: "",
  outputTemplate: "",
};

const formFields: Array<{
  name: keyof AssistantFormValues;
  label: string;
  placeholder: string;
  type: "input" | "textarea";
  rows?: number;
}> = [
  {
    name: "name",
    label: "助手名称",
    placeholder: "例如：电影感镜头增强助手",
    type: "input",
  },
  {
    name: "systemPrompt",
    label: "系统提示词",
    placeholder: "请输入该助手用于约束输出风格与结构的系统提示词",
    type: "textarea",
    rows: 6,
  },
  {
    name: "outputTemplate",
    label: "输出格式模板",
    placeholder: "请输入输出模板，例如按主体 / 构图 / 光线 / 色彩分段输出",
    type: "textarea",
    rows: 5,
  },
];

export function AssistantForm() {
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<AssistantFormValues | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<AssistantFormValues>({
    resolver: zodResolver(assistantSchema),
    defaultValues,
    mode: "onSubmit",
  });

  const statusText = useMemo(() => {
    if (submittedData && isSubmitSuccessful) {
      return "当前状态：已保存到数据库";
    }

    return "当前状态：等待保存";
  }, [isSubmitSuccessful, submittedData]);

  const onSubmit = (values: AssistantFormValues) => {
    setSubmitMessage(null);

    startTransition(async () => {
      const result = await createAssistant({
        name: values.name,
        systemPrompt: values.systemPrompt,
        outputTemplate: values.outputTemplate,
      } satisfies ServerAssistantFormValues);

      if (!result.success) {
        setSubmitMessage(result.error);
        return;
      }

      setSubmittedData(values);
      setSubmitMessage(`助手“${values.name}”已成功保存到数据库。`);
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
          <h2 className="text-2xl font-semibold tracking-tight">助手设计师表单</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            当前阶段已接入数据库保存。提交成功后，刷新页面仍可在左侧列表看到持久化结果。
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {statusText}
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formFields.map((field: (typeof formFields)[number]) => {
          const errorMessage = errors[field.name]?.message;
          const commonProps = {
            ...register(field.name),
            placeholder: field.placeholder,
            "aria-invalid": errorMessage ? true : false,
            className: `w-full rounded-2xl border bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 ${
              errorMessage ? "border-rose-500/80" : "border-slate-800"
            }`,
          };

          return (
            <label key={field.name} className="block space-y-2">
              <span className="text-sm text-slate-200">{field.label}</span>
              {field.type === "textarea" ? (
                <textarea {...commonProps} rows={field.rows ?? 5} />
              ) : (
                <input {...commonProps} type="text" autoComplete="off" />
              )}
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
            <ul className="mt-3 space-y-3">
              <li>
                <span className="text-slate-400">助手名称：</span>
                {submittedData.name}
              </li>
              <li>
                <p className="text-slate-400">系统提示词：</p>
                <p className="mt-1 whitespace-pre-wrap break-words">{submittedData.systemPrompt}</p>
              </li>
              <li>
                <p className="text-slate-400">输出格式模板：</p>
                <p className="mt-1 whitespace-pre-wrap break-words">{submittedData.outputTemplate}</p>
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
            清空内容
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isPending}
            className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/60"
          >
            {isSubmitting || isPending ? "保存中..." : "保存助手"}
          </button>
        </div>
      </form>
    </aside>
  );
}
