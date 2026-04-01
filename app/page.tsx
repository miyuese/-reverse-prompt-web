import { AppShell } from "./app-shell";

export default function Home() {
  return (
    <AppShell
      title="项目首页"
      description="当前已经完成项目初始化，并开始搭建应用导航骨架。你现在可以从这里进入生成页、模型配置页、助手设计师页、历史页和收藏页。"
    >
      <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/50">
        <div className="inline-flex w-fit rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-sm text-slate-300">
          Quest 1.2
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight">图片反推工具项目已进入导航骨架阶段</h2>
          <p className="max-w-3xl text-base leading-7 text-slate-300">
            当前首页已经接入统一导航。接下来可以逐步为每个页面挂接静态布局、表单、数据库和 AI 能力。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-sm text-slate-400">当前完成</p>
            <p className="mt-2 text-lg font-medium">项目初始化 + 导航入口</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-sm text-slate-400">下一步</p>
            <p className="mt-2 text-lg font-medium">生成页与管理页静态布局</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-sm text-slate-400">路由状态</p>
            <p className="mt-2 text-lg font-medium">五个核心页面已可访问</p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
