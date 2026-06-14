import { db, mcpPendingTable } from "@workspace/db";
import { and, eq, lte } from "drizzle-orm";
import crypto from "crypto";

export type McpCommand =
  | "deposit"
  | "withdraw"
  | "swap"
  | "assign_bounty"
  | "launch_token"
  | "transfer"
  | "buy_stock"
  | "sell_stock";

export type McpPendingParams = {
  deposit: { amount: number; token: string };
  withdraw: { amount: number; token: string; to_address: string };
  swap: { amount: number; from_token: string; to_token: string };
  transfer: { amount: number; token: string; to_github_username: string };
  assign_bounty: {
    repo: string;
    issue_number: number;
    amount: number;
    token: string;
    contributor: string;
  };
  launch_token: {
    name: string;
    symbol: string;
    description: string;
    creator_wallet: string;
    ai_client: string;
    link?: string;
    x?: string;
    logo?: string;
  };
  buy_stock: { ticker: string; usdc_amount: number };
  sell_stock: { ticker: string; amount: number };
};

export function generateConfirmCode(): string {
  return "mcp" + crypto.randomBytes(4).toString("hex");
}

export async function createPending<C extends McpCommand>(
  github_username: string,
  command: C,
  params: McpPendingParams[C],
): Promise<string> {
  const confirmCode = generateConfirmCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(mcpPendingTable).values({
    githubUsername: github_username,
    command,
    params,
    confirmCode,
    status: "pending",
    expiresAt,
  });

  return confirmCode;
}

export async function getPending(confirmCode: string) {
  const [row] = await db
    .select()
    .from(mcpPendingTable)
    .where(eq(mcpPendingTable.confirmCode, confirmCode))
    .limit(1);
  return row ?? null;
}

export async function markExpiredPending(): Promise<void> {
  const now = new Date();
  await db
    .update(mcpPendingTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(mcpPendingTable.status, "pending"),
        lte(mcpPendingTable.expiresAt, now),
      ),
    );
}
