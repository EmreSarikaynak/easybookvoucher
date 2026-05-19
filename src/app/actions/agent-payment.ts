"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";
import type { CurrencyType, AgentPayment } from "@/lib/types";

interface AgentPaymentPayload {
  agent_id: string;
  payment_amount: number;
  payment_currency: CurrencyType;
  payment_date: string;
  related_voucher_id?: string | null;
  notes?: string;
}

export async function createAgentPayment(payload: AgentPaymentPayload) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor" };
  }

  const { error } = await supabase.from("agent_payments").insert({
    agent_id: payload.agent_id,
    payment_amount: payload.payment_amount,
    payment_currency: payload.payment_currency,
    payment_date: payload.payment_date,
    related_voucher_id: payload.related_voucher_id || null,
    notes: payload.notes || null,
    created_by: user.id,
  });

  if (error) {
    console.error("Agent payment create error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/agencies");
  return { success: true };
}

export async function getAgentPayments(agencyId: string): Promise<AgentPayment[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("agent_payments")
    .select("*, voucher:vouchers(voucher_no, tour:tours(name))")
    .eq("agent_id", agencyId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Agent payments fetch error:", error);
    return [];
  }

  return data ?? [];
}

export interface AgentAccountingSummary {
  totalDebtEur: number;
  voucherCount: number;
  paymentsByCurrency: Record<string, number>;
  payments: AgentPayment[];
}

export async function getAgentAccountingSummary(
  agencyId: string
): Promise<AgentAccountingSummary> {
  const supabase = await createServerSupabaseClient();

  // Get all vouchers for this agency to sum agent_owes_easybook_eur
  const { data: vouchers } = await supabase
    .from("vouchers")
    .select("agent_owes_easybook_eur")
    .eq("agency_id", agencyId)
    .neq("status", "cancelled");

  const totalDebtEur = (vouchers ?? []).reduce(
    (sum, v) => sum + (v.agent_owes_easybook_eur ?? 0),
    0
  );

  // Get all payments for this agency
  const { data: payments } = await supabase
    .from("agent_payments")
    .select("*, voucher:vouchers(voucher_no, tour:tours(name))")
    .eq("agent_id", agencyId)
    .order("payment_date", { ascending: false });

  const paymentsList = payments ?? [];

  // Group payments by currency
  const paymentsByCurrency: Record<string, number> = {};
  for (const p of paymentsList) {
    const curr = p.payment_currency;
    paymentsByCurrency[curr] = (paymentsByCurrency[curr] ?? 0) + p.payment_amount;
  }

  return {
    totalDebtEur,
    voucherCount: (vouchers ?? []).length,
    paymentsByCurrency,
    payments: paymentsList,
  };
}
