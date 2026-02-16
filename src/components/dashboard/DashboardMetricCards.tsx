"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import type { Deal } from "@/lib/supabase/types";

interface PendingWire {
  dealId: string;
  lpName: string;
  dealName: string;
  wireStatus: string;
  amount: number | null;
}

interface UnansweredQuestion {
  dealId: string;
  fromEmail: string;
  question: string;
  dealName: string;
}

interface PendingKyc {
  dealId: string;
  lpName: string;
  dealName: string;
  kycStatus: string;
}

interface DashboardMetricCardsProps {
  deals: Deal[];
  totalAllocated: number;
  totalCommitted: number;
  totalInterested: number;
  totalTarget: number;
  allocatedByDeal: Record<string, number>;
  pendingWires: PendingWire[];
  unansweredQuestions: UnansweredQuestion[];
  pendingKyc: PendingKyc[];
}

type ModalType = "deals" | "capital" | "pending" | "progress" | null;

function formatCurrency(amount: number) {
  if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toLocaleString()}`;
}

function formatFullCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DashboardMetricCards({
  deals,
  totalAllocated,
  totalCommitted,
  totalInterested,
  totalTarget,
  allocatedByDeal,
  pendingWires,
  unansweredQuestions,
  pendingKyc,
}: DashboardMetricCardsProps) {
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const activeDeals = deals.filter((d) => d.status === "active");
  const otherDeals = deals.filter((d) => d.status !== "active");
  const totalPendingActions = pendingWires.length + unansweredQuestions.length + pendingKyc.length;
  const commitmentProgress = totalTarget > 0 ? Math.round((totalCommitted / totalTarget) * 100) : 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Deals */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Active Deals</p>
            <button
              onClick={() => setOpenModal("deals")}
              className="p-1 hover:bg-secondary rounded transition-colors"
            >
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <h3 className="metric-number text-4xl mb-1">{activeDeals.length}</h3>
          <p className="text-sm text-muted-foreground">Deals</p>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-foreground"></span>
                Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30"></span>
                Total: {deals.length}
              </span>
            </div>
          </div>
        </div>

        {/* Capital Allocated */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Capital Allocated</p>
            <button
              onClick={() => setOpenModal("capital")}
              className="p-1 hover:bg-secondary rounded transition-colors"
            >
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <h3 className="metric-number text-4xl mb-1">{formatCurrency(totalAllocated)}</h3>
          <p className="text-sm text-muted-foreground">Across active deals</p>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]"></span>
                Interested: {formatCurrency(totalInterested)}
              </span>
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Pending Actions</p>
            <button
              onClick={() => setOpenModal("pending")}
              className="p-1 hover:bg-secondary rounded transition-colors"
            >
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <h3 className="metric-number text-4xl mb-1">{totalPendingActions}</h3>
          <p className="text-sm text-muted-foreground">Items need attention</p>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3 text-xs">
              {pendingWires.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  {pendingWires.length} wires
                </span>
              )}
              {unansweredQuestions.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {unansweredQuestions.length} questions
                </span>
              )}
              {pendingKyc.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  {pendingKyc.length} KYC
                </span>
              )}
              {totalPendingActions === 0 && (
                <span className="text-muted-foreground">All clear</span>
              )}
            </div>
          </div>
        </div>

        {/* Target Progress */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Target Progress</p>
            <button
              onClick={() => setOpenModal("progress")}
              className="p-1 hover:bg-secondary rounded transition-colors"
            >
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <h3 className="metric-number text-4xl mb-1">{formatCurrency(totalTarget)}</h3>
          <p className="text-sm text-muted-foreground">Total target</p>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{commitmentProgress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all"
                style={{ width: `${Math.min(commitmentProgress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modals ===== */}

      {/* Active Deals Modal */}
      {openModal === "deals" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenModal(null)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">Active Deals</h2>
              <button onClick={() => setOpenModal(null)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeDeals.length > 0 ? (
              <div className="space-y-3">
                {activeDeals.map((deal) => {
                  const progress = deal.target_raise ? Math.round((deal.total_committed / deal.target_raise) * 100) : 0;
                  return (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="block p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{deal.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-secondary text-green-600">Active</span>
                      </div>
                      {deal.company_name && (
                        <p className="text-xs text-muted-foreground mb-2">{deal.company_name}</p>
                      )}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Target: {formatCurrency(deal.target_raise || 0)}</span>
                        <span>Committed: {formatCurrency(deal.total_committed || 0)}</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No active deals.</p>
            )}

            {otherDeals.length > 0 && (
              <>
                <div className="mt-6 mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Other Deals</p>
                </div>
                <div className="space-y-2">
                  {otherDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{deal.name}</p>
                        {deal.company_name && (
                          <p className="text-xs text-muted-foreground">{deal.company_name}</p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground capitalize">
                        {deal.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Capital Allocated Modal */}
      {openModal === "capital" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenModal(null)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">Capital Allocated</h2>
              <button onClick={() => setOpenModal(null)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Allocated</p>
                <p className="font-medium">{formatCurrency(totalAllocated)}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Interested</p>
                <p className="font-medium">{formatCurrency(totalInterested)}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Target</p>
                <p className="font-medium">{formatCurrency(totalTarget)}</p>
              </div>
            </div>

            {/* Per-deal breakdown */}
            <p className="text-sm font-medium text-muted-foreground mb-3">By Deal</p>
            {activeDeals.length > 0 ? (
              <div className="space-y-3">
                {activeDeals.map((deal) => {
                  const target = deal.target_raise || 0;
                  const allocated = allocatedByDeal[deal.id] || 0;
                  const progress = target > 0 ? Math.round((allocated / target) * 100) : 0;
                  return (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="block p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{deal.name}</p>
                        <p className="text-sm font-medium">{formatFullCurrency(allocated)}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Interested: {formatCurrency(deal.total_interested || 0)}</span>
                        <span>Target: {formatCurrency(target)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{progress}%</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No active deals.</p>
            )}
          </div>
        </div>
      )}

      {/* Pending Actions Modal */}
      {openModal === "pending" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenModal(null)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">Pending Actions</h2>
              <button onClick={() => setOpenModal(null)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {totalPendingActions === 0 ? (
              <p className="text-muted-foreground text-sm">No pending actions. All clear!</p>
            ) : (
              <div className="space-y-6">
                {/* Pending Wires */}
                {pendingWires.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <p className="text-sm font-medium">Pending Wires ({pendingWires.length})</p>
                    </div>
                    <div className="space-y-2">
                      {pendingWires.map((wire, i) => (
                        <Link
                          key={i}
                          href={`/deals/${wire.dealId}`}
                          className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-sm">{wire.lpName}</p>
                            <p className="text-xs text-muted-foreground">{wire.dealName}</p>
                          </div>
                          {wire.amount && <p className="text-sm font-medium">{formatFullCurrency(wire.amount)}</p>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unanswered Questions */}
                {unansweredQuestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <p className="text-sm font-medium">Unanswered Questions ({unansweredQuestions.length})</p>
                    </div>
                    <div className="space-y-2">
                      {unansweredQuestions.map((q, i) => (
                        <Link
                          key={i}
                          href={`/deals/${q.dealId}`}
                          className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-sm">{q.fromEmail}</p>
                            <p className="text-xs text-muted-foreground">{q.dealName}</p>
                          </div>
                          <p className="text-sm text-muted-foreground truncate ml-4 max-w-[200px]">{q.question}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending KYC */}
                {pendingKyc.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <p className="text-sm font-medium">Pending KYC ({pendingKyc.length})</p>
                    </div>
                    <div className="space-y-2">
                      {pendingKyc.map((kyc, i) => (
                        <Link
                          key={i}
                          href={`/deals/${kyc.dealId}`}
                          className="flex items-center p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-sm">{kyc.lpName}</p>
                            <p className="text-xs text-muted-foreground">{kyc.dealName}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Target Progress Modal */}
      {openModal === "progress" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenModal(null)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">Target Progress</h2>
              <button onClick={() => setOpenModal(null)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall progress */}
            <div className="p-4 rounded-xl bg-secondary/50 mb-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Overall</p>
                <p className="text-sm font-medium">{commitmentProgress}%</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{formatCurrency(totalCommitted)} committed</span>
                <span>{formatCurrency(totalTarget)} target</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full"
                  style={{ width: `${Math.min(commitmentProgress, 100)}%` }}
                />
              </div>
            </div>

            {/* Per-deal progress */}
            <p className="text-sm font-medium text-muted-foreground mb-3">By Deal</p>
            {activeDeals.length > 0 ? (
              <div className="space-y-3">
                {activeDeals.map((deal) => {
                  const target = deal.target_raise || 0;
                  const committed = deal.total_committed || 0;
                  const progress = target > 0 ? Math.round((committed / target) * 100) : 0;
                  const remaining = Math.max(target - committed, 0);
                  return (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="block p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{deal.name}</p>
                        <p className="text-sm font-medium">{progress}%</p>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(committed)} / {formatCurrency(target)}</span>
                        <span>{formatCurrency(remaining)} remaining</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No active deals.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
