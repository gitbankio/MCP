import { db, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { resolveGithubId } from "../lib/github-id.js";

export async function handleGetTransactions(args: { github_username: string; limit?: number }) {
  const githubId = await resolveGithubId(args.github_username);
  const limit = Math.min(args.limit ?? 10, 50);

  const txs = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.githubId, githubId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);

  const formatted = txs.map((tx) => ({
    type: tx.type,
    amount_in: tx.amountIn,
    token_in: tx.tokenIn,
    amount_out: tx.amountOut,
    token_out: tx.tokenOut,
    status: tx.status,
    tx_hash: tx.txHash,
    basescan_url: tx.txHash ? `https://basescan.org/tx/${tx.txHash}` : null,
    created_at: tx.createdAt,
  }));

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        github_username: args.github_username,
        github_id: githubId,
        count: formatted.length,
        transactions: formatted,
      }, null, 2),
    }],
  };
}
