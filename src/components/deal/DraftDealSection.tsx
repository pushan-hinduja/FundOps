"use client";

import { useState, useEffect, useCallback } from "react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";

interface DraftData {
  valuation: string;
  round_size: string;
  revenue_current_year: string;
  revenue_previous_year: string;
  yoy_growth: string;
  ebitda: string;
  is_profitable: boolean;
  team_notes: string;
}

interface DraftDealSectionProps {
  dealId: string;
  readOnly?: boolean;
}

export function DraftDealSection({ dealId, readOnly = false }: DraftDealSectionProps) {
  const [data, setData] = useState<DraftData>({
    valuation: "",
    round_size: "",
    revenue_current_year: "",
    revenue_previous_year: "",
    yoy_growth: "",
    ebitda: "",
    is_profitable: false,
    team_notes: "",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/deals/${dealId}/draft`);
      if (res.ok) {
        const { draft } = await res.json();
        if (draft) {
          setData({
            valuation: draft.valuation?.toString() || "",
            round_size: draft.round_size?.toString() || "",
            revenue_current_year: draft.revenue_current_year?.toString() || "",
            revenue_previous_year: draft.revenue_previous_year?.toString() || "",
            yoy_growth: draft.yoy_growth?.toString() || "",
            ebitda: draft.ebitda?.toString() || "",
            is_profitable: draft.is_profitable || false,
            team_notes: draft.team_notes || "",
          });
        }
      }
      setLoaded(true);
    }
    load();
  }, [dealId]);

  const save = useCallback(
    async (updates: Partial<Record<string, unknown>>) => {
      if (readOnly) return;
      await fetch(`/api/deals/${dealId}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    },
    [dealId, readOnly]
  );

  const handleFieldBlur = (field: string, rawValue: string, isNumber = true) => {
    const value = isNumber ? (rawValue ? parseFloat(rawValue) : null) : (rawValue || null);
    save({ [field]: value });
  };

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      {/* Financial Details */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h3 className="text-sm font-semibold mb-4">Deal Financials</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Round Size ($)</label>
            <CurrencyInput
              value={data.round_size}
              onChange={(val) => setData((d) => ({ ...d, round_size: val }))}
              onBlur={() => handleFieldBlur("round_size", data.round_size)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              placeholder="e.g. 10,000,000"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Valuation ($)</label>
            <CurrencyInput
              value={data.valuation}
              onChange={(val) => setData((d) => ({ ...d, valuation: val }))}
              onBlur={() => handleFieldBlur("valuation", data.valuation)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              placeholder="e.g. 50,000,000"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Revenue — Current Year ($)</label>
            <CurrencyInput
              value={data.revenue_current_year}
              onChange={(val) => setData((d) => ({ ...d, revenue_current_year: val }))}
              onBlur={() => handleFieldBlur("revenue_current_year", data.revenue_current_year)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              placeholder="e.g. 5,000,000"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Revenue — Previous Year ($)</label>
            <CurrencyInput
              value={data.revenue_previous_year}
              onChange={(val) => setData((d) => ({ ...d, revenue_previous_year: val }))}
              onBlur={() => handleFieldBlur("revenue_previous_year", data.revenue_previous_year)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              placeholder="e.g. 3,000,000"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">YoY Growth (%)</label>
            <input
              type="number"
              step="0.1"
              value={data.yoy_growth}
              onChange={(e) => setData((d) => ({ ...d, yoy_growth: e.target.value }))}
              onBlur={() => handleFieldBlur("yoy_growth", data.yoy_growth)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              placeholder="e.g. 67"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">EBITDA ($)</label>
            <CurrencyInput
              value={data.ebitda}
              onChange={(val) => setData((d) => ({ ...d, ebitda: val }))}
              onBlur={() => handleFieldBlur("ebitda", data.ebitda)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              placeholder="e.g. 1,000,000"
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center gap-3 col-span-2">
            <label className="text-xs text-muted-foreground">Profitable?</label>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                const next = !data.is_profitable;
                setData((d) => ({ ...d, is_profitable: next }));
                save({ is_profitable: next });
              }}
              className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                data.is_profitable ? "bg-green-500" : "bg-gray-300"
              } ${readOnly ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  data.is_profitable ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-xs text-foreground">{data.is_profitable ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>

      {/* Team Notes */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h3 className="text-sm font-semibold mb-4">Team Notes</h3>
        <textarea
          rows={5}
          value={data.team_notes}
          onChange={(e) => setData((d) => ({ ...d, team_notes: e.target.value }))}
          onBlur={() => handleFieldBlur("team_notes", data.team_notes, false)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none"
          placeholder="Add notes about this deal for the team..."
          disabled={readOnly}
        />
      </div>
    </div>
  );
}
