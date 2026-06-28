import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { postJSON } from "../../lib/api";
import { clearTerminalSession } from "../../lib/shopContext";

const TEAM_SETUP_CACHE_KEY = "ceypos::teamSetup";

const TeamOnboard: React.FC = () => {
  const { user } = useUser();
  const [displayName, setDisplayName] = useState("");
  const [mainTerminalEmail, setMainTerminalEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !mainTerminalEmail.trim() || !userEmail) return;
    setLoading(true);
    setError(null);
    try {
      const result = await postJSON<{
        ok: boolean;
        shopId: string;
        dbFileName: string;
      }>("/api/team/register", {
        ownerEmail: mainTerminalEmail.trim(),
        userEmail,
        displayName: displayName.trim(),
        clerkUserId: user?.id,
        accountType: "team",
      });
      localStorage.setItem(
        TEAM_SETUP_CACHE_KEY,
        JSON.stringify({
          accountType: "team",
          teamOnboarded: true,
          userEmail,
          mainTerminalEmail: mainTerminalEmail.trim(),
          displayName: displayName.trim(),
          shopId: result.shopId,
          dbFileName: result.dbFileName,
        }),
      );
      await user?.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata || {}),
          mainTerminalEmail: mainTerminalEmail.trim(),
          accountType: "team",
          teamOnboarded: true,
          displayName: displayName.trim(),
          shopId: result.shopId,
          dbFileName: result.dbFileName,
          shopCompleted: true,
        },
      });
      clearTerminalSession();
      window.location.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Member Setup</h1>
          <p className="text-sm text-gray-600 mt-1">
            Enter your name and the main terminal email. After setup, the dashboard will ask for the pairing code shown on the primary terminal.
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Your name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Main terminal email</span>
          <input
            value={mainTerminalEmail}
            onChange={(e) => setMainTerminalEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm"
            placeholder="owner@example.com"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#c5f542] text-black font-semibold py-3 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Continue to Pairing"}
        </button>
      </form>
    </div>
  );
};

export default TeamOnboard;
