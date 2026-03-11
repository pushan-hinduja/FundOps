"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type ConnectionState = "idle" | "scanning" | "connected" | "error";

interface GroupInfo {
  jid: string;
  name: string;
  participants: number;
  selected: boolean;
}

export function WhatsAppConnection() {
  const [state, setState] = useState<ConnectionState>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Check initial status on mount
  useEffect(() => {
    checkStatus();
    return () => stopPolling();
  }, [stopPolling]);

  async function checkStatus() {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (!res.ok) {
        if (res.status === 503) {
          setState("idle");
          return;
        }
        throw new Error("Failed to check status");
      }
      const data = await res.json();
      if (data.connected) {
        setState("connected");
        setPhone(data.phone || null);
        stopPolling();
        fetchGroups();
      }
    } catch {
      setState("idle");
    }
  }

  async function fetchGroups() {
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/whatsapp/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch {
      // Ignore — groups section just won't show
    } finally {
      setLoadingGroups(false);
    }
  }

  async function handleConnect() {
    setState("scanning");
    setError(null);
    setQrDataUrl(null);

    try {
      const res = await fetch("/api/whatsapp/qr");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get QR code");
      }

      const data = await res.json();

      if (data.status === "connected") {
        setState("connected");
        setPhone(data.phone || null);
        fetchGroups();
        return;
      }

      if (data.status === "qr" && data.qr) {
        setQrDataUrl(data.qr);
        startPolling();
        return;
      }

      // QR not ready yet — wait and retry
      if (data.status === "waiting") {
        setTimeout(async () => {
          const retry = await fetch("/api/whatsapp/qr");
          if (retry.ok) {
            const retryData = await retry.json();
            if (retryData.status === "qr" && retryData.qr) {
              setQrDataUrl(retryData.qr);
              startPolling();
            } else if (retryData.status === "connected") {
              setState("connected");
              setPhone(retryData.phone || null);
              fetchGroups();
            }
          }
        }, 3000);
        return;
      }
    } catch (err) {
      setState("error");
      setError((err as Error).message);
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const qrRes = await fetch("/api/whatsapp/qr");
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          if (qrData.status === "connected") {
            setState("connected");
            setPhone(qrData.phone || null);
            setQrDataUrl(null);
            stopPolling();
            fetchGroups();
            return;
          }
          if (qrData.status === "qr" && qrData.qr) {
            setQrDataUrl(qrData.qr);
          }
        }
      } catch {
        // Ignore poll errors
      }
    }, 3000);
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect WhatsApp?")) return;

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to disconnect");
      }
      setState("idle");
      setPhone(null);
      setQrDataUrl(null);
      setGroups([]);
    } catch (err) {
      alert((err as Error).message || "Failed to disconnect WhatsApp");
    } finally {
      setIsDisconnecting(false);
    }
  }

  function toggleGroup(jid: string) {
    setGroups((prev) =>
      prev.map((g) => (g.jid === jid ? { ...g, selected: !g.selected } : g))
    );
  }

  async function saveGroupSelection() {
    setSavingGroups(true);
    try {
      const selectedJids = groups.filter((g) => g.selected).map((g) => g.jid);
      const res = await fetch("/api/whatsapp/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: selectedJids }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      alert("Failed to save group selection");
    } finally {
      setSavingGroups(false);
    }
  }

  const selectedCount = groups.filter((g) => g.selected).length;

  return (
    <div className="space-y-4">
      {state === "connected" ? (
        <>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium">WhatsApp</p>
              <p className="text-sm text-muted-foreground">
                {phone ? `Connected: +${phone}` : "Connected"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-secondary text-green-600">
                Active
              </span>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded transition disabled:opacity-50"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>

          {/* Group selection */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Monitored Groups</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCount === 0
                    ? "No groups selected — select groups to start capturing messages"
                    : `${selectedCount} group${selectedCount !== 1 ? "s" : ""} selected`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchGroups}
                  disabled={loadingGroups}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                >
                  {loadingGroups ? "Loading..." : "Refresh"}
                </button>
                <button
                  onClick={saveGroupSelection}
                  disabled={savingGroups}
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {savingGroups ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {loadingGroups && groups.length === 0 ? (
              <div className="py-4 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Loading groups...
                </p>
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No group chats found.
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {groups.map((group) => (
                  <label
                    key={group.jid}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={group.selected}
                      onChange={() => toggleGroup(group.jid)}
                      className="rounded border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {group.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.participants} members
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      ) : state === "scanning" ? (
        <div className="border border-border rounded-lg p-6 text-center">
          {qrDataUrl ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with WhatsApp on your phone
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="WhatsApp QR Code"
                className="mx-auto rounded-lg"
                width={256}
                height={256}
              />
              <p className="text-xs text-muted-foreground mt-4">
                Open WhatsApp → Settings → Linked Devices → Link a Device
              </p>
              <button
                onClick={() => {
                  stopPolling();
                  setState("idle");
                  setQrDataUrl(null);
                }}
                className="mt-4 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Generating QR code...
              </p>
            </>
          )}
        </div>
      ) : state === "error" ? (
        <div className="border border-border rounded-lg p-4">
          <p className="text-sm text-destructive mb-3">
            {error || "Failed to connect WhatsApp"}
          </p>
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-secondary text-sm font-medium rounded-lg hover:bg-secondary/80 transition"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <p className="font-medium">WhatsApp</p>
            <p className="text-sm text-muted-foreground">Not connected</p>
          </div>
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition"
          >
            Connect WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
