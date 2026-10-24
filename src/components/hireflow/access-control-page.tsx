"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  FileKey2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import {
  type AccessRole,
  type Permission,
  rolePolicies,
} from "@/lib/access-control";

interface AccessControlPageProps {
  role: AccessRole;
  onRoleChange: (role: AccessRole) => void;
}

interface PreviewResponse {
  role: AccessRole;
  candidate: {
    name: string;
    headline: string;
    phone: string;
    email: string;
    matchScore: number | null;
    resumeSummary: string | null;
    resumeOriginal: string | null;
  };
  allowedActions: {
    editJob: boolean;
    makeDecision: boolean;
    recordInterview: boolean;
    exportReport: boolean;
  };
  enforcement: "server";
}

const roles = Object.keys(rolePolicies) as AccessRole[];
const permissionRows: Array<{ permission: Permission; label: string; detail: string }> = [
  { permission: "job:edit", label: "编辑岗位与权重", detail: "修改 JD、能力项和匹配权重" },
  { permission: "candidate:summary", label: "查看候选人摘要", detail: "查看脱敏履历摘要和技能" },
  { permission: "candidate:resume_original", label: "查看完整简历", detail: "查看脱敏后的简历原文" },
  { permission: "candidate:contact", label: "查看联系方式", detail: "手机号、邮箱等直接标识符" },
  { permission: "candidate:match_score", label: "查看匹配分数", detail: "查看排名、分数和证据项" },
  { permission: "candidate:decision", label: "作出招聘决策", detail: "进入下一轮、暂缓或淘汰" },
  { permission: "interview:record", label: "记录面试回答", detail: "录入真实回答并触发 AI 评分" },
  { permission: "report:export", label: "导出招聘报告", detail: "打印或导出 PDF 报告" },
];

export function AccessControlPage({ role, onRoleChange }: AccessControlPageProps) {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState("");
  const loading = preview?.role !== role;

  useEffect(() => {
    let active = true;
    fetch(`/api/access-control/preview?role=${role}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("权限策略读取失败");
        return response.json() as Promise<PreviewResponse>;
      })
      .then((data) => { if (active) { setPreview(data); setError(""); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "权限策略读取失败"); })
    return () => { active = false; };
  }, [role]);

  return <div className="page access-page">
    <div className="topbar">
      <div><p className="eyebrow">SECURITY & GOVERNANCE</p><h1>角色权限与数据可见性</h1><p className="access-page-intro">用服务端权限策略控制“谁能看什么、谁能做什么”，界面隐藏只负责体验，不作为安全边界。</p></div>
      <span className="access-server-badge"><ShieldCheck size={15} />服务端强制校验</span>
    </div>

    <section className="access-role-switcher" aria-label="切换演示角色">
      {roles.map((item) => <button className={role === item ? "active" : ""} type="button" key={item} onClick={() => onRoleChange(item)}>
        <span><UserCog size={18} /></span>
        <strong>{rolePolicies[item].label}</strong>
        <small>{rolePolicies[item].description}</small>
      </button>)}
    </section>

    <div className="access-layout">
      <section className="access-matrix-card">
        <header><span><KeyRound size={18} /></span><div><p>RBAC POLICY</p><h2>权限矩阵</h2></div><em>{rolePolicies[role].label}</em></header>
        <div className="access-matrix-head"><span>能力</span>{roles.map((item) => <strong key={item}>{rolePolicies[item].label}</strong>)}</div>
        {permissionRows.map((row) => <div className="access-matrix-row" key={row.permission}>
          <span><strong>{row.label}</strong><small>{row.detail}</small></span>
          {roles.map((item) => {
            const allowed = rolePolicies[item].permissions.includes(row.permission);
            return <span className={allowed ? "allowed" : "denied"} key={item} aria-label={`${rolePolicies[item].label}：${allowed ? "允许" : "不允许"}`}>
              {allowed ? <Check size={15} /> : <LockKeyhole size={14} />}
            </span>;
          })}
        </div>)}
      </section>

      <aside className="access-preview-card">
        <header><span><FileKey2 size={18} /></span><div><p>FIELD-LEVEL PREVIEW</p><h2>当前角色看到的数据</h2></div></header>
        {loading ? <div className="access-preview-state"><LoaderCircle className="spin" size={18} />服务端正在生成数据视图…</div>
          : error ? <div className="access-preview-state error">{error}</div>
          : preview && <>
            <div className="access-candidate-head"><span className="avatar avatar-large">林</span><span><strong>{preview.candidate.name}</strong><small>{preview.candidate.headline}</small></span></div>
            <dl className="access-field-list">
              <div><dt>手机</dt><dd>{preview.candidate.phone}</dd><em>{role === "hrbp" ? <><Eye size={12} />可见</> : <><EyeOff size={12} />已脱敏</>}</em></div>
              <div><dt>邮箱</dt><dd>{preview.candidate.email}</dd><em>{role === "hrbp" ? <><Eye size={12} />可见</> : <><EyeOff size={12} />已脱敏</>}</em></div>
              <div><dt>匹配分</dt><dd>{preview.candidate.matchScore ?? "无权查看"}</dd><em>{preview.candidate.matchScore === null ? <><EyeOff size={12} />已隐藏</> : <><Eye size={12} />可见</>}</em></div>
              <div><dt>完整简历</dt><dd>{preview.candidate.resumeOriginal ?? "仅显示结构化摘要"}</dd><em>{preview.candidate.resumeOriginal ? <><Eye size={12} />可见</> : <><EyeOff size={12} />已隐藏</>}</em></div>
            </dl>
            <div className="access-action-list">
              <strong>业务操作</strong>
              <span className={preview.allowedActions.editJob ? "allowed" : "denied"}>{preview.allowedActions.editJob ? <Check size={13} /> : <LockKeyhole size={13} />}编辑岗位</span>
              <span className={preview.allowedActions.makeDecision ? "allowed" : "denied"}>{preview.allowedActions.makeDecision ? <Check size={13} /> : <LockKeyhole size={13} />}招聘决策</span>
              <span className={preview.allowedActions.recordInterview ? "allowed" : "denied"}>{preview.allowedActions.recordInterview ? <Check size={13} /> : <LockKeyhole size={13} />}记录面试</span>
              <span className={preview.allowedActions.exportReport ? "allowed" : "denied"}>{preview.allowedActions.exportReport ? <Check size={13} /> : <LockKeyhole size={13} />}导出报告</span>
            </div>
          </>}
      </aside>
    </div>

    <section className="access-governance-note">
      <ShieldCheck size={20} />
      <div><strong>生产环境接入方式</strong><p>角色应来自企业 SSO / JWT 声明，由 API 网关或服务端再次鉴权；所有查看明文、导出报告和修改决策的操作写入审计日志。前端传入的角色值不能作为可信依据。</p></div>
      <span>SSO → 服务端策略 → 字段投影 → 审计日志</span>
    </section>
  </div>;
}
