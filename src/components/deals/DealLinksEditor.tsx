"use client";

import { Plus, Trash2 } from "lucide-react";

export interface DealLinkEntry {
  link_type: string;
  url: string;
}

interface DealLinksEditorProps {
  links: DealLinkEntry[];
  onChange: (links: DealLinkEntry[]) => void;
}

const LINK_TYPES = [
  { value: "data_room", label: "Data Room" },
  { value: "deal_folder", label: "Deal Folder" },
];

export function DealLinksEditor({ links, onChange }: DealLinksEditorProps) {
  const addLink = () => {
    onChange([...links, { link_type: "data_room", url: "" }]);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: keyof DealLinkEntry, value: string) => {
    const updated = links.map((link, i) =>
      i === index ? { ...link, [field]: value } : link
    );
    onChange(updated);
  };

  return (
    <div>
      {links.map((link, index) => (
        <div key={index} className="flex items-start gap-2 mb-2">
          <select
            value={link.link_type}
            onChange={(e) => updateLink(index, "link_type", e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm w-40 flex-shrink-0"
          >
            {LINK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="url"
            value={link.url}
            onChange={(e) => updateLink(index, "url", e.target.value)}
            placeholder="https://..."
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
          />
          <button
            type="button"
            onClick={() => removeLink(index)}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addLink}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors mt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add a deal link
      </button>
    </div>
  );
}
