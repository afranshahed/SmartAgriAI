"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Pencil } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { apiPatch } from "@/lib/api-client";
import { Input } from "@/components/Input";

interface Profile {
  email: string;
  userName: string | null;
}

export default function SettingsPage() {
  const { data, mutate } = useSWR<Profile>("/api/profile");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [editingAccount, setEditingAccount] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (!data) return;
    // Populate the editable account fields once the profile has loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserName(data.userName ?? "");
    setEmail(data.email);
  }, [data]);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved("");
    try {
      await apiPatch("/api/profile", { userName, email });
      await mutate();
      setEditingAccount(false);
      setSaved("Account details saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save account details.");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved("");
    if (newPassword !== confirmNewPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    try {
      await apiPatch("/api/profile", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setChangingPassword(false);
      setSaved("Password changed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account details and password." />

      <div className="grid max-w-2xl gap-6">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Account details</h2>
            <button
              type="button"
              onClick={() => {
                if (editingAccount) {
                  setUserName(data?.userName ?? "");
                  setEmail(data?.email ?? "");
                }
                setEditingAccount((editing) => !editing);
                setError("");
                setSaved("");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <Pencil size={14} /> {editingAccount ? "Cancel" : "Edit"}
            </button>
          </div>
          {editingAccount ? (
            <form onSubmit={saveAccount} className="space-y-4">
              <Input label="User name" value={userName} onChange={setUserName} required />
              <Input label="Email" type="email" value={email} onChange={setEmail} required />
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                Save account details
              </button>
            </form>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">User name</dt>
                <dd className="mt-1 font-bold">{data?.userName ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Email</dt>
                <dd className="mt-1 font-bold">{data?.email ?? "Loading…"}</dd>
              </div>
            </dl>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-500">Password</h2>
          {changingPassword ? (
            <form onSubmit={changePassword} className="space-y-4">
              <Input label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} required />
              <Input label="New password" type="password" value={newPassword} onChange={setNewPassword} placeholder="At least 6 characters" required />
              <Input label="Confirm new password" type="password" value={confirmNewPassword} onChange={setConfirmNewPassword} required />
              <div className="flex gap-2">
                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                  Save new password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setError("");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => { setChangingPassword(true); setError(""); setSaved(""); }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Change password
            </button>
          )}
        </Card>
      </div>

      {error ? <p className="mt-4 text-sm font-bold text-rose-600">{error}</p> : null}
      {saved ? <p className="mt-4 text-sm font-bold text-emerald-600">{saved}</p> : null}
    </div>
  );
}
