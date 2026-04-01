import { AppShell } from "../app-shell";

import { getAssistants } from "./actions";
import { AssistantCard } from "./assistant-card";
import { AssistantForm } from "./assistant-form";

export const dynamic = "force-dynamic";

export default async function AssistantsPage() {
  const assistants = await getAssistants();

  return (
    <AppShell
      title="助手设计师页"
      description="管理可复用的助手设计师配置。支持新增、编辑、删除。"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/50 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-400">助手列表区</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">已保存的助手设计师</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                当前列表数据来自数据库。支持编辑与删除，刷新页面后结果保留。
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              Quest 5.2 已完成
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {assistants.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-400">
                暂无助手设计师。请先在右侧表单新增一条配置。
              </div>
            ) : (
              assistants.map((item) => (
                <AssistantCard key={item.id} item={item} />
              ))
            )}
          </div>
        </section>

        <AssistantForm />
      </div>
    </AppShell>
  );
}
