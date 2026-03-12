"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface GroupInfo {
  jid: string;
  name: string;
  participants: number;
  selected: boolean;
}

type ModalStep = "qr" | "groups";

export function WhatsAppConnection() {
  const [connected, setConnected] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Escape key closes modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalOpen) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [modalOpen]);

  async function checkStatus() {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (!res.ok) return;
      const data = await res.json();
      if (data.connected) {
        setConnected(true);
        setPhone(data.phone || null);
        fetchGroups();
      }
    } catch {
      // Gateway not running
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
      // Ignore
    } finally {
      setLoadingGroups(false);
    }
  }

  function closeModal() {
    stopPolling();
    setModalOpen(false);
    setQrDataUrl(null);
    setError(null);
  }

  // --- Connect flow (opens modal with QR) ---
  async function handleConnect() {
    setModalOpen(true);
    setModalStep("qr");
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
        onConnected(data.phone);
        return;
      }

      if (data.status === "qr" && data.qr) {
        setQrDataUrl(data.qr);
        startPolling();
        return;
      }

      if (data.status === "waiting") {
        setTimeout(async () => {
          try {
            const retry = await fetch("/api/whatsapp/qr");
            if (retry.ok) {
              const retryData = await retry.json();
              if (retryData.status === "qr" && retryData.qr) {
                setQrDataUrl(retryData.qr);
                startPolling();
              } else if (retryData.status === "connected") {
                onConnected(retryData.phone);
              }
            }
          } catch {
            // ignore
          }
        }, 3000);
      }
    } catch (err) {
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
            onConnected(qrData.phone);
            return;
          }
          if (qrData.status === "qr" && qrData.qr) {
            setQrDataUrl(qrData.qr);
          }
        }
      } catch {
        // Ignore
      }
    }, 3000);
  }

  async function onConnected(phoneNumber?: string) {
    stopPolling();
    setConnected(true);
    setPhone(phoneNumber?.split(":")[0] || null);
    setQrDataUrl(null);
    setModalStep("groups");
    await fetchGroups();
  }

  // --- Edit flow (opens modal at group selection) ---
  async function handleEdit() {
    setModalOpen(true);
    setModalStep("groups");
    setError(null);
    await fetchGroups();
  }

  // --- Group selection ---
  function toggleGroup(jid: string) {
    setGroups((prev) =>
      prev.map((g) => (g.jid === jid ? { ...g, selected: !g.selected } : g))
    );
  }

  async function saveAndClose() {
    setSavingGroups(true);
    try {
      const selectedJids = groups.filter((g) => g.selected).map((g) => g.jid);
      const res = await fetch("/api/whatsapp/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: selectedJids }),
      });
      if (!res.ok) throw new Error("Failed to save");
      closeModal();
    } catch {
      setError("Failed to save group selection");
    } finally {
      setSavingGroups(false);
    }
  }

  // --- Disconnect ---
  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect WhatsApp?")) return;

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to disconnect");
      }
      setConnected(false);
      setPhone(null);
      setGroups([]);
    } catch (err) {
      alert((err as Error).message || "Failed to disconnect WhatsApp");
    } finally {
      setIsDisconnecting(false);
    }
  }

  const selectedGroups = groups.filter((g) => g.selected);
  const selectedCount = selectedGroups.length;

  return (
    <>
      {/* --- Page content --- */}
      {connected ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium">WhatsApp</p>
              <p className="text-sm text-muted-foreground">
                {phone ? `Connected: +${phone}` : "Connected"}
                {selectedCount > 0 &&
                  ` · ${selectedCount} group${selectedCount !== 1 ? "s" : ""} monitored`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-secondary text-green-600">
                Active
              </span>
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 text-sm text-primary hover:bg-muted rounded transition"
              >
                Edit
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded transition disabled:opacity-50"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>

          {/* Show selected group names */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {selectedGroups.map((g) => (
                <span
                  key={g.jid}
                  className="px-2.5 py-1 bg-secondary rounded-lg text-xs font-medium text-muted-foreground"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}
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

      {/* --- Modal --- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border shrink-0">
              <h2 className="text-lg font-medium">
                {modalStep === "qr"
                  ? "Connect WhatsApp"
                  : "Select Group Chats"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {modalStep === "qr" ? (
                <div className="p-6 text-center">
                  {error ? (
                    <>
                      <p className="text-sm text-destructive mb-4">{error}</p>
                      <button
                        onClick={() => {
                          setError(null);
                          handleConnect();
                        }}
                        className="px-4 py-2 bg-secondary text-sm font-medium rounded-lg hover:bg-secondary/80 transition"
                      >
                        Try Again
                      </button>
                    </>
                  ) : qrDataUrl ? (
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
                        Open WhatsApp → Settings → Linked Devices → Link a
                        Device
                      </p>
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
              ) : (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose which group chats to monitor. Only messages from
                    selected groups will be captured and parsed.
                  </p>

                  {error && (
                    <p className="text-sm text-destructive mb-3">{error}</p>
                  )}

                  {loadingGroups ? (
                    <div className="py-8 text-center">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Loading groups...
                      </p>
                    </div>
                  ) : groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No group chats found on this WhatsApp account.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {groups.map((group) => (
                        <label
                          key={group.jid}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition"
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
              )}
            </div>

            {/* Footer */}
            {modalStep === "groups" && groups.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary/30 rounded-b-2xl shrink-0">
                <p className="text-xs text-muted-foreground">
                  {selectedCount} group{selectedCount !== 1 ? "s" : ""} selected
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveAndClose}
                    disabled={savingGroups}
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {savingGroups ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
