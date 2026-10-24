"use client";

import { Bot, Check, Clock3, RotateCcw, X } from "lucide-react";
import { agentEvents } from "@/lib/demo-data";

export function AgentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="agent-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header><div><span className="brand-mark"><Bot size={17} /></span><span><p>AGENT RUN</p><h2 id="drawer-title">招聘工作流记录</h2></span></div><button className="icon-button" onClick={onClose} aria-label="关闭执行记录"><X size={19} /></button></header>
        <div className="drawer-summary"><span className="pulse" /><span><strong>5 个节点已完成</strong><small>运行 ID · demo-0722-01</small></span><em>14.2s</em></div>
        <div className="event-list">
          {agentEvents.map((event) => (
            <div className="event-item" key={event.id}>
              <span className={event.status === "完成" ? "event-icon complete" : "event-icon"}>{event.status === "完成" ? <Check size={14} /> : <Clock3 size={14} />}</span>
              <span className="event-line" />
              <div><span className="event-agent">{event.agent}</span><strong>{event.action}</strong><p>{event.detail}</p><small>{event.duration} · {event.status}</small></div>
            </div>
          ))}
        </div>
        <footer><button className="button button-secondary"><RotateCcw size={16} />重新运行最后节点</button><p>修改上游数据后，受影响的节点会自动标记为过期。</p></footer>
      </aside>
    </div>
  );
}
