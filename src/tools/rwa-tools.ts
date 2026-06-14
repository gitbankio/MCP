import { db, rwaPositions, gitStockContracts } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getLivePrice, getAllPrices, listTickers, getAsset, isValidTicker } from "@workspace/rwa";

// ── list_stocks ───────────────────────────────────────────────────────────────

export async function handleListStocks() {
  const tickers = listTickers();
  const deployedContracts = await db.select().from(gitStockContracts);
  const contractMap = Object.fromEntries(deployedContracts.map((c) => [c.ticker, c.contractAddress]));

  const stocks = tickers.map((ticker) => {
    const asset = getAsset(ticker);
    return {
      ticker,
      name: asset.name,
      gitStockSymbol: `git${ticker}`,
      gitStockContract: contractMap[ticker] ?? null,
      available: true,
    };
  });

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({ stocks }, null, 2),
    }],
  };
}

// ── get_stock_price ───────────────────────────────────────────────────────────

export async function handleGetStockPrice(args: { ticker: string }) {
  const ticker = args.ticker.toUpperCase();

  if (!isValidTicker(ticker)) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: `Unknown ticker: ${ticker}. Use list_stocks to see available tickers.`,
        }, null, 2),
      }],
    };
  }

  try {
    const priceUsd = await getLivePrice(ticker);
    const asset = getAsset(ticker);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          ticker,
          name: asset.name,
          priceUsd,
          priceDisplay: `$${priceUsd.toFixed(2)} USD`,
          updatedAt: new Date().toISOString(),
        }, null, 2),
      }],
    };
  } catch (err) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: `Price unavailable for ${ticker}: ${err instanceof Error ? err.message : String(err)}`,
        }, null, 2),
      }],
    };
  }
}

// ── get_rwa_portfolio ─────────────────────────────────────────────────────────

export async function handleGetRwaPortfolio(args: { github_username: string }) {
  const positions = await db
    .select()
    .from(rwaPositions)
    .where(eq(rwaPositions.githubId, args.github_username));

  if (positions.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          github_username: args.github_username,
          positions: [],
          totalValueUsd: 0,
          message: "No gitStock holdings. Use @gitbankbot buy NVDA 100 USDC to buy your first stock.",
        }, null, 2),
      }],
    };
  }

  const tickers = positions.map((p) => p.ticker);
  let prices: Record<string, number> = {};
  try {
    prices = await getAllPrices(tickers);
  } catch {
    // Return without prices if Pyth unavailable
  }

  const enriched = positions.map((p) => {
    const amount = Number(BigInt(p.amount)) / 1_000_000;
    const priceUsd = prices[p.ticker] ?? 0;
    const valueUsd = amount * priceUsd;
    const costBasis = Number(BigInt(p.costBasisUsdc)) / 1_000_000;
    const pnlUsd = valueUsd - costBasis;
    const pnlPct = costBasis > 0 ? (pnlUsd / costBasis) * 100 : 0;

    return {
      ticker: p.ticker,
      gitStockSymbol: `git${p.ticker}`,
      amount: amount.toFixed(6),
      priceUsd,
      valueUsd: valueUsd.toFixed(2),
      costBasisUsd: costBasis.toFixed(2),
      pnlUsd: pnlUsd.toFixed(2),
      pnlPct: pnlPct.toFixed(2) + "%",
      gitStockContract: p.gitStockContract,
      solanaWalletPubkey: p.solanaWalletPubkey,
    };
  });

  const totalValueUsd = enriched.reduce((sum, p) => sum + parseFloat(p.valueUsd), 0);

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        github_username: args.github_username,
        positions: enriched,
        totalValueUsd: totalValueUsd.toFixed(2),
      }, null, 2),
    }],
  };
}
