import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const baseSql = readFileSync(
  join(process.cwd(), "supabase/migrations/202608080000_base_schema.sql"),
  "utf8"
);

const phase1Sql = readFileSync(
  join(process.cwd(), "supabase/migrations/202608080001_phase1_stabilization.sql"),
  "utf8"
);

describe("Base Schema Migration (202608080000_base_schema.sql)", () => {
  it("crea la tabla public.users referenciando auth.users", () => {
    expect(baseSql).toContain("create table if not exists public.users");
    expect(baseSql).toContain("references auth.users");
  });

  it("crea la tabla public.transactions con columnas base", () => {
    expect(baseSql).toContain("create table if not exists public.transactions");
    expect(baseSql).toContain("user_id uuid references public.users(id)");
    expect(baseSql).toContain("credits_granted integer");
    expect(baseSql).toContain("package_name text");
    expect(baseSql).toContain("amount numeric");
  });

  it("define la función handle_new_user y el trigger en auth.users", () => {
    expect(baseSql).toContain("create function public.handle_new_user()");
    expect(baseSql).toContain("security definer set search_path = ''");
    expect(baseSql).toContain("create trigger on_auth_user_created");
    expect(baseSql).toContain("after insert on auth.users");
  });
});

describe("Phase 1 Stabilization Migration (202608080001_phase1_stabilization.sql)", () => {
  it("extiende public.users con campos de perfil y rol", () => {
    expect(phase1Sql).toContain("alter table public.users");
    expect(phase1Sql).toContain("add column if not exists role text");
    expect(phase1Sql).toContain("add column if not exists credits integer");
    expect(phase1Sql).toContain("add column if not exists plan_tier text");
  });

  it("crea las tablas transaccionales wallets, pago_movil_proofs y assets", () => {
    expect(phase1Sql).toContain("create table if not exists public.wallets");
    expect(phase1Sql).toContain("create table if not exists public.pago_movil_proofs");
    expect(phase1Sql).toContain("create table if not exists public.assets");
  });

  it("extiende public.transactions para soporte de contabilidad de saldo", () => {
    expect(phase1Sql).toContain("add column if not exists credit_delta bigint");
    expect(phase1Sql).toContain("add column if not exists balance_after bigint");
    expect(phase1Sql).toContain("add constraint transactions_type_check");
  });

  it("garantiza inmutabilidad del ledger y políticas de retención", () => {
    expect(phase1Sql).toContain("prevent_ledger_mutation");
    expect(phase1Sql).toContain("set_asset_retention");
    expect(phase1Sql).toContain("ensure_wallet_for_user");
  });

  it("habilita RLS en las tablas transaccionales", () => {
    expect(phase1Sql).toContain("alter table public.wallets enable row level security");
    expect(phase1Sql).toContain("alter table public.transactions enable row level security");
    expect(phase1Sql).toContain("alter table public.pago_movil_proofs enable row level security");
    expect(phase1Sql).toContain("alter table public.assets enable row level security");
  });

  it("valida que review_payment() inserta en public.transactions sin columnas inexistentes", () => {
    const reviewPaymentMatch = phase1Sql.match(/create or replace function public\.review_payment[\s\S]*?\$\$;/i);
    expect(reviewPaymentMatch).not.toBeNull();
    const reviewPaymentBody = reviewPaymentMatch![0];

    const insertMatch = reviewPaymentBody.match(/insert into public\.transactions\s*\(([^)]+)\)/i);
    expect(insertMatch).not.toBeNull();
    const insertColumns = insertMatch![1];

    expect(insertColumns).not.toContain("amount_bs");
    expect(insertColumns).not.toContain("reference_number");
    expect(insertColumns).not.toContain("proof_image_url");

    expect(insertColumns).toContain("amount");
    expect(insertColumns).toContain("metadata");
  });

  it("valida que review_payment() coloca los detalles del pago en metadata y amount en USD", () => {
    const reviewPaymentMatch = phase1Sql.match(/create or replace function public\.review_payment[\s\S]*?\$\$;/i);
    expect(reviewPaymentMatch).not.toBeNull();
    const reviewPaymentBody = reviewPaymentMatch![0];

    expect(reviewPaymentBody).toContain("'amount_bs', v_payment.extracted_amount_bs");
    expect(reviewPaymentBody).toContain("'reference_number', v_payment.extracted_reference");
    expect(reviewPaymentBody).toContain("'proof_image_url', v_payment.receipt_key");
    expect(reviewPaymentBody).toContain("'price_usd', v_payment.price_usd");
    expect(reviewPaymentBody).toContain("'payment_rate', v_payment.payment_rate");
  });
});
