import { ArrowRight, Bot, CheckCircle2, Clock3, ListChecks } from "lucide-react";
import type { TrainingPlan } from "@/lib/training/schemas";

export function TrainingContent({ plan, onStart }: { plan: TrainingPlan; onStart: () => void }) {
  return <div className="training-content-stack">
    <section className="real-card training-plan-card">
      <header className="training-plan-header"><div><p>STEP 02 · TRAINING CONTENT</p><h2>{plan.title}</h2><span>{plan.objective}</span></div><em><Clock3 size={14} />{plan.durationMinutes} 分钟</em></header>
      <div className="training-modules">{plan.modules.map((module, index) => <article key={module.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{module.title}</h3><small>{module.purpose}</small><p>{module.content}</p><ul>{module.talkingPoints.map((item) => <li key={item}><CheckCircle2 size={13} />{item}</li>)}</ul></div></article>)}</div>
      <section className="training-takeaways"><h3><ListChecks size={16} />培训关键结论</h3>{plan.keyTakeaways.map((item) => <p key={item}>{item}</p>)}</section>
    </section>
    <section className="real-card scenario-preview"><span className="real-card-icon"><Bot size={19} /></span><div><p>AI 角色陪练场景</p><h3>{plan.scenario.roleName}</h3><small>{plan.scenario.roleProfile}</small><strong>学员目标：{plan.scenario.learnerGoal}</strong></div><button className="button button-primary" type="button" onClick={onStart}>开始陪练<ArrowRight size={16} /></button></section>
  </div>;
}
