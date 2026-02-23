"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EditDealModal } from "./EditDealModal";

interface Deal {
  id: string;
  name: string;
  company_name: string | null;
  description: string | null;
  target_raise: number | null;
  min_check_size: number | null;
  max_check_size: number | null;
  fee_percent: number | null;
  carry_percent: number | null;
  status: string;
  memo_url: string | null;
  created_date: string | null;
  close_date: string | null;
  investment_stage: string | null;
  investment_type: string | null;
  founder_email: string | null;
  investor_update_frequency: string | null;
}

interface EditDealButtonProps {
  deal: Deal;
}

export function EditDealButton({ deal }: EditDealButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
      >
        <Pencil className="w-4 h-4" />
        Edit Deal
      </button>

      <EditDealModal
        deal={deal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
