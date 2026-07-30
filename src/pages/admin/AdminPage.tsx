import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { authFetch, API_BASE } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

type BackupRun = {
  run_id: string;
  shop_id: string;
  backup_type: string;
  status: string;
  file_path?: string;
  offsite_path?: string;
  bytes?: number;
  integrity_status?: string;
  restore_test_status?: string;
  message?: string;
  created_at: string;
  completed_at?: string;
};

type AdminAlert = {
  alert_id: string;
  severity: string;
  category: string;
  title: string;
  body: string;
  shop_id?: string;
  created_at: string;
};

type SupportConversation = {
  conversation_id: string;
  shop_id?: string;
  user_email?: string;
  user_name?: string;
  subject?: string;
  status: string;
  priority: string;
  updated_at: string;
};

type SupportMessage = {
  message_id: string;
  sender_type: "merchant" | "admin";
  sender_email?: string;
  message: string;
  created_at: string;
};

type AdminStatus = {
  rto: string;
  rpo: string;
  backupGenerations: number;
  backupDirectory: string;
  offsiteConfigured: boolean;
  offsiteDirectory?: string | null;
  disk: { freeBytes: number | null; totalBytes: number | null; usedPercent: number | null };
  shops: Array<{ shopId: string; fileName: string; bytes: number; integrity: string }>;
  backups: BackupRun[];
  alerts: AdminAlert[];
  support: SupportConversation[];
  runbook: string[];
};

const fmtBytes = (bytes?: number | null) => {
  const value = Number(bytes || 0);
  if (value > 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GB`;
  if (value > 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  if (value > 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
};

const badgeClass = (status?: string) => {
  const s = String(status || "").toLowerCase();
  if (["ok", "success", "resolved"].includes(s)) return "bg-lime-100 text-lime-800";
  if (["running", "open", "medium", "warning"].includes(s)) return "bg-amber-100 text-amber-800";
  if (["failed", "critical", "high"].includes(s)) return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

export const AdminPage: React.FC = () => {
  const { user } = useUser();
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [actionState, setActionState] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE}/api/admin/status`);
      const body = await res.json();
      if (!res.ok || body?.ok === false) throw new Error(body?.error || "Failed to load admin status");
      setStatus(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin status unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    setSelectedConversation(conversationId);
    const res = await authFetch(`${API_BASE}/api/admin/support/conversations/${encodeURIComponent(conversationId)}`);
    const body = await res.json();
    if (res.ok && body?.messages) setMessages(body.messages);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(id);
  }, [load]);

  const kpis = useMemo(() => {
    const latestOk = status?.backups?.find((backup) => backup.status === "ok");
    return [
      ["Protected shops", String(status?.shops.length ?? 0)],
      ["Open alerts", String(status?.alerts.length ?? 0)],
      ["Latest backup", latestOk ? new Date(latestOk.created_at).toLocaleString() : "None"],
      ["Disk used", status?.disk.usedPercent === null ? "Unknown" : `${status?.disk.usedPercent ?? 0}%`],
    ];
  }, [status]);

  const runBackup = async (shopId?: string) => {
    setActionState("Running backup...");
    try {
      await authFetch(`${API_BASE}/api/admin/backups/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shopId || null, backupType: "manual" }),
      });
      await load();
      setActionState("Backup run completed.");
    } catch (err) {
      setActionState(err instanceof Error ? err.message : "Backup failed");
    }
  };

  const recover = async (runId: string) => {
    if (!window.confirm("Recover this backup into a separate recovered shop database? Existing merchant DBs will not be overwritten.")) return;
    setActionState("Recovering backup...");
    const res = await authFetch(`${API_BASE}/api/admin/backups/recover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    });
    const body = await res.json().catch(() => ({}));
    setActionState(res.ok ? `Recovered as ${body?.result?.shopId}` : body?.error || "Recovery failed");
    await load();
  };

  const exportShop = async (shopId: string) => {
    setActionState("Preparing shop export...");
    try {
      const res = await authFetch(`${API_BASE}/api/admin/shops/${encodeURIComponent(shopId)}/export`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Export failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${shopId}.db`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setActionState("Shop export downloaded.");
    } catch (err) {
      setActionState(err instanceof Error ? err.message : "Export failed");
    }
  };

  const sendReply = async () => {
    if (!selectedConversation || !reply.trim()) return;
    const res = await authFetch(`${API_BASE}/api/admin/support/conversations/${encodeURIComponent(selectedConversation)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply }),
    });
    const body = await res.json();
    if (res.ok && body?.messages) {
      setMessages(body.messages);
      setReply("");
      await load();
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 rounded-3xl border border-[#e4e4e0] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">CeyPOS Administration</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-gray-950">Merchant data protection & service operations</h1>
            <p className="mt-1 text-sm text-gray-500">Signed in as {user?.primaryEmailAddress?.emailAddress || "admin"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>
            <Button onClick={() => void runBackup()} disabled={loading}>Run All Backups</Button>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {actionState && <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">{actionState}</div>}

        <div className="grid gap-3 md:grid-cols-4">
          {kpis.map(([label, value]) => (
            <Card key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-2 text-xl font-semibold text-gray-950">{value}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
          <Card title="Backup & recovery posture" subtitle={`RTO ${status?.rto || "-"} - RPO ${status?.rpo || "-"} - ${status?.backupGenerations || 0} generations`}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">Storage</p>
                <p className="mt-1 text-xs text-gray-500">Local: {status?.backupDirectory || "-"}</p>
                <p className="mt-1 text-xs text-gray-500">Off-site: {status?.offsiteConfigured ? status?.offsiteDirectory : "Not configured"}</p>
                <p className="mt-3 text-2xl font-semibold">{status?.disk.usedPercent ?? "-"}%</p>
                <p className="text-xs text-gray-500">Disk used - {fmtBytes(status?.disk.freeBytes)} free</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">Disaster-recovery runbook</p>
                <ol className="mt-2 space-y-1 text-xs text-gray-600">
                  {(status?.runbook || []).slice(0, 6).map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
            </div>
          </Card>

          <Card title="Active admin alerts" subtitle="Backup, integrity and disk-space failures">
            <div className="space-y-2">
              {status?.alerts.length ? status.alerts.map((alert) => (
                <div key={alert.alert_id} className="rounded-2xl border border-gray-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${badgeClass(alert.severity)}`}>{alert.severity}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{alert.body}</p>
                </div>
              )) : <p className="py-8 text-center text-sm text-gray-500">No active alerts.</p>}
            </div>
          </Card>
        </div>

        <Card title="Protected shop databases" subtitle="Integrity status, per-shop export and manual backup">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr><th className="py-2">Shop</th><th>Size</th><th>Integrity</th><th>Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {status?.shops.map((shop) => (
                  <tr key={shop.shopId}>
                    <td className="py-3 font-medium text-gray-900">{shop.shopId}</td>
                    <td>{fmtBytes(shop.bytes)}</td>
                    <td><span className={`rounded-full px-2 py-1 text-xs ${badgeClass(shop.integrity)}`}>{shop.integrity}</span></td>
                    <td className="flex gap-2 py-2">
                      <button className="rounded-full border border-gray-200 px-3 py-1.5 text-xs" onClick={() => void runBackup(shop.shopId)}>Backup</button>
                      <button className="rounded-full border border-gray-200 px-3 py-1.5 text-xs" onClick={() => void exportShop(shop.shopId)}>Export</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
          <Card title="Backup generations" subtitle="Encrypted restore-tested backup history">
            <div className="space-y-2">
              {status?.backups.slice(0, 10).map((backup) => (
                <div key={backup.run_id} className="rounded-2xl border border-gray-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{backup.shop_id || "all shops"} - {backup.backup_type}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${badgeClass(backup.status)}`}>{backup.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{new Date(backup.created_at).toLocaleString()} - {fmtBytes(backup.bytes)} - restore {backup.restore_test_status || "-"}</p>
                  <div className="mt-2 flex gap-2">
                    {backup.status === "ok" && <button className="rounded-full border border-gray-200 px-3 py-1.5 text-xs" onClick={() => void recover(backup.run_id)}>Recover to file</button>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Live merchant support" subtitle="Conversations from in-app Support live chat">
            <div className="grid gap-3 md:grid-cols-[240px,1fr]">
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {(status?.support || []).map((item) => (
                  <button key={item.conversation_id} onClick={() => void loadConversation(item.conversation_id)} className={`w-full rounded-2xl border p-3 text-left text-sm ${selectedConversation === item.conversation_id ? "border-gray-900 bg-gray-50" : "border-gray-100 bg-white"}`}>
                    <p className="font-semibold text-gray-900">{item.subject || "Support request"}</p>
                    <p className="truncate text-xs text-gray-500">{item.user_email}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] ${badgeClass(item.priority)}`}>{item.priority}</span>
                  </button>
                ))}
              </div>
              <div className="flex min-h-[420px] flex-col rounded-2xl border border-gray-100 bg-gray-50">
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {messages.length ? messages.map((message) => (
                    <div key={message.message_id} className={`rounded-2xl px-3 py-2 text-sm ${message.sender_type === "admin" ? "ml-8 bg-gray-900 text-white" : "mr-8 bg-white text-gray-800"}`}>
                      <p>{message.message}</p>
                      <p className={`mt-1 text-[10px] ${message.sender_type === "admin" ? "text-gray-300" : "text-gray-400"}`}>{message.sender_email} - {new Date(message.created_at).toLocaleString()}</p>
                    </div>
                  )) : <p className="py-20 text-center text-sm text-gray-500">Select a conversation.</p>}
                </div>
                <div className="border-t border-gray-200 p-3">
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as CeyPOS support..." className="h-20 w-full resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900" />
                  <Button className="mt-2" disabled={!selectedConversation || !reply.trim()} onClick={() => void sendReply()}>Send Reply</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
