import { BarChart3, Bot, BriefcaseBusiness, Gauge, GraduationCap, Settings2, Sparkles, UsersRound } from "lucide-react";

import type { AccessRole } from "@/lib/access-control";
import { rolePolicies } from "@/lib/access-control";

interface SidebarProps {
  active: "dashboard" | "jobs" | "training" | "training-dashboard" | "access";
  role: AccessRole;
  onDashboard: () => void;
  onJobs: () => void;
  onAgent: () => void;
  onTraining: () => void;
  onTrainingDashboard: () => void;
  onAccess: () => void;
}

export function Sidebar({ active, role, onDashboard, onJobs, onAgent, onTraining, onTrainingDashboard, onAccess }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="主导航">
      <button className="brand" onClick={onDashboard} aria-label="返回首页">
        <span className="brand-mark"><Sparkles size={17} aria-hidden="true" /></span>
        <span>HireFlow</span>
      </button>

      <nav className="side-nav">
        <p className="nav-label">工作台</p>
        <button className={active === "dashboard" ? "nav-item active" : "nav-item"} onClick={onDashboard}>
          <Gauge size={18} aria-hidden="true" />总览
        </button>
        <button className={active === "jobs" ? "nav-item active" : "nav-item"} onClick={onJobs}>
          <BriefcaseBusiness size={18} aria-hidden="true" />职位
        </button>
        <button className="nav-item" disabled>
          <UsersRound size={18} aria-hidden="true" />人才库
          <span className="soon">稍后</span>
        </button>

        <p className="nav-label nav-label-spaced">Agent</p>
        <button className={active === "training" ? "nav-item active" : "nav-item"} onClick={onTraining}>
          <GraduationCap size={18} aria-hidden="true" />培训陪练
        </button>
        <button className={active === "training-dashboard" ? "nav-item active" : "nav-item"} onClick={onTrainingDashboard}>
          <BarChart3 size={18} aria-hidden="true" />培训看板
        </button>
        <button className="nav-item" onClick={onAgent}>
          <Bot size={18} aria-hidden="true" />执行记录
          <span className="live-dot" aria-label="有运行记录" />
        </button>
      </nav>

      <div className="side-footer">
        <button className={active === "access" ? "nav-item active" : "nav-item"} onClick={onAccess}><Settings2 size={18} aria-hidden="true" />权限中心</button>
        <div className="profile-row">
          <span className="avatar avatar-small">HR</span>
          <span><strong>{rolePolicies[role].label}</strong><small>权限演示账号</small></span>
        </div>
      </div>
    </aside>
  );
}
