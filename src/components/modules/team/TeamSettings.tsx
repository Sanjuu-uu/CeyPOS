import React, { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Crown, Loader2, Shield, UserCheck, UserX } from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { useApp } from "../../../context/AppContext";
import { getJSON, patchJSON } from "../../../lib/api";

type TeamMemberRow = {
  member_id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  pro_team_seat: number;
};

export const TeamSettings: React.FC = () => {
  const { activeShopId, memberScope } = useApp();
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const isOwner = memberScope?.role === "owner";
  const proSeatLimit = memberScope?.plan?.proTeamSeats ?? 0;

  const loadMembers = useCallback(async () => {
    if (!activeShopId || !userEmail) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getJSON<{ ok: boolean; members: TeamMemberRow[] }>(
        `/api/team/members?shopId=${encodeURIComponent(activeShopId)}&userEmail=${encodeURIComponent(userEmail)}`,
      );
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [activeShopId, userEmail]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const patchMember = async (
    memberId: string,
    patch: Record<string, unknown>,
  ) => {
    if (!activeShopId || !userEmail) return;
    setSavingId(memberId);
    setError(null);
    try {
      await patchJSON(`/api/team/members/${memberId}`, {
        shopId: activeShopId,
        userEmail,
        ...patch,
      });
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  const proSeatsUsed = members.filter(
    (m) => m.role !== "owner" && Number(m.pro_team_seat) === 1 && m.status !== "suspended",
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading employees…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Employees" className="border border-gray-100">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Manage roles, Pro Team seats, and employee access for this shop.
          </p>
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            Pro Team seats: {proSeatsUsed} / {proSeatLimit} assigned
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pro seat</th>
                {isOwner && (
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const busy = savingId === member.member_id;
                const isMemberOwner = member.role === "owner";
                const hasProSeat = Number(member.pro_team_seat) === 1;
                const isSuspended = member.status === "suspended";

                return (
                  <tr key={member.member_id} className={isSuspended ? "opacity-60" : ""}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{member.display_name}</div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </td>
                    <td className="px-3 py-3 capitalize">
                      <span className="inline-flex items-center gap-1">
                        {isMemberOwner ? <Crown size={14} className="text-amber-500" /> : null}
                        {member.role}
                      </span>
                    </td>
                    <td className="px-3 py-3 capitalize">{member.status}</td>
                    <td className="px-3 py-3">
                      {isMemberOwner ? (
                        <span className="text-xs text-gray-500">Included</span>
                      ) : isOwner ? (
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasProSeat}
                            disabled={busy || (!hasProSeat && proSeatsUsed >= proSeatLimit)}
                            onChange={(e) =>
                              void patchMember(member.member_id, { proTeamSeat: e.target.checked })
                            }
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-600">Pro AI seat</span>
                        </label>
                      ) : hasProSeat ? (
                        <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">Assigned</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          {!isMemberOwner && member.role === "cashier" && !isSuspended && (
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void patchMember(member.member_id, { role: "manager" })}
                              className="text-xs px-2 py-1"
                            >
                              <Shield size={14} className="mr-1" />
                              Promote
                            </Button>
                          )}
                          {!isMemberOwner && member.role === "manager" && (
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void patchMember(member.member_id, { role: "cashier" })}
                              className="text-xs px-2 py-1"
                            >
                              Demote
                            </Button>
                          )}
                          {!isMemberOwner && !isSuspended && (
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void patchMember(member.member_id, { status: "suspended" })}
                              className="text-xs px-2 py-1 text-red-600"
                            >
                              <UserX size={14} className="mr-1" />
                              Suspend
                            </Button>
                          )}
                          {!isMemberOwner && isSuspended && (
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void patchMember(member.member_id, { status: "active" })}
                              className="text-xs px-2 py-1"
                            >
                              <UserCheck size={14} className="mr-1" />
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
