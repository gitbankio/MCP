import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { handleGetVaultBalance } from "./tools/vault-balance.js";
import { handleGetTransactions } from "./tools/transactions.js";
import { handleGetProjectStatus } from "./tools/project-status.js";
import { handleListRepos } from "./tools/repos.js";
import {
  handleRequestDeposit,
  handleRequestWithdraw,
  handleRequestSwap,
  handleRequestTransfer,
  handleRequestAssignBounty,
  handleRequestLaunchToken,
  handleRequestBuyStock,
  handleRequestSellStock,
  handleCheckPending,
} from "./tools/write-tools.js";
import {
  handleListStocks,
  handleGetStockPrice,
  handleGetRwaPortfolio,
} from "./tools/rwa-tools.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "gitbank",
    version: "0.2.0",
  });

  // ── Read-only tools ────────────────────────────────────────────────────────

  server.tool(
    "get_vault_balance",
    "Get WETH and USDC locked balance of a Gitbank vault on Base mainnet. Returns vault address and per-token balances.",
    { github_username: z.string().describe("GitHub username of the vault owner") },
    { title: "Get Vault Balance", readOnlyHint: true },
    handleGetVaultBalance,
  );

  server.tool(
    "get_transactions",
    "Get recent on-chain transactions (deposits, withdrawals, swaps, bounty payouts) for a Gitbank vault.",
    {
      github_username: z.string().describe("GitHub username of the vault owner"),
      limit: z.number().int().min(1).max(50).optional().describe("Number of transactions to return (default 10, max 50)"),
    },
    { title: "Get Transactions", readOnlyHint: true },
    handleGetTransactions,
  );

  server.tool(
    "get_project_status",
    "Get budget and task status for a Gitbank project. Shows total budget, spent amount, remaining, and all tasks with bounty info.",
    {
      github_username: z.string().describe("GitHub username of the project owner"),
      project_name: z.string().describe("Name of the project (as created with @gitbankbot create project)"),
    },
    { title: "Get Project Status", readOnlyHint: true },
    handleGetProjectStatus,
  );

  server.tool(
    "list_repos",
    "List GitHub accounts where the Gitbank bot is installed for a user.",
    { github_username: z.string().describe("GitHub username to look up") },
    { title: "List Connected Repos", readOnlyHint: true },
    handleListRepos,
  );

  // ── Write tools (require GitHub confirmation) ──────────────────────────────
  // All write tools return a confirm_code. The user must post
  // "@gitbankbot confirm <code>" in any GitHub issue/PR where the bot is
  // installed. The bot verifies GitHub identity and executes the command.
  // This means GitHub account security (YubiKey etc.) protects all writes.

  server.tool(
    "request_deposit",
    "Request a deposit into a Gitbank vault. Returns a confirm_code the user must post on GitHub to authorize execution. Supported tokens: USDC, WETH.",
    {
      github_username: z.string().describe("GitHub username of the vault owner"),
      amount: z.number().positive().describe("Amount to deposit"),
      token: z.string().describe("Token symbol: USDC or WETH"),
    },
    { title: "Request Deposit" },
    handleRequestDeposit,
  );

  server.tool(
    "request_withdraw",
    "Request a withdrawal from a Gitbank vault to an external wallet address. Returns a confirm_code the user must post on GitHub to authorize execution.",
    {
      github_username: z.string().describe("GitHub username of the vault owner"),
      amount: z.number().positive().describe("Amount to withdraw"),
      token: z.string().describe("Token symbol: USDC or WETH"),
      to_address: z.string().describe("Destination wallet address (0x...)"),
    },
    { title: "Request Withdraw" },
    handleRequestWithdraw,
  );

  server.tool(
    "request_swap",
    "Request a token swap inside a Gitbank vault (e.g. USDC to WETH). Returns a confirm_code the user must post on GitHub to authorize execution.",
    {
      github_username: z.string().describe("GitHub username of the vault owner"),
      amount: z.number().positive().describe("Amount to swap"),
      from_token: z.string().describe("Source token: USDC or WETH"),
      to_token: z.string().describe("Destination token: USDC or WETH"),
    },
    { title: "Request Swap" },
    handleRequestSwap,
  );

  server.tool(
    "request_transfer",
    "Queue a vault-to-vault token transfer to another GitHub user on Base Mainnet. Both sender and recipient must have a Gitbank vault. Returns a confirm_code the user must post on GitHub to authorize. The GitHub account identity is verified on-chain at confirmation time — only the vault owner can authorize. Supported tokens: USDC, WETH.",
    {
      github_username: z.string().describe("GitHub username of the sender (vault owner)"),
      to_github_username: z.string().describe("GitHub username of the recipient"),
      amount: z.number().positive().describe("Amount to transfer"),
      token: z.string().describe("Token symbol: USDC or WETH"),
    },
    { title: "Request Transfer" },
    handleRequestTransfer,
  );

  server.tool(
    "request_assign_bounty",
    "Request a bounty assignment to a contributor for a GitHub issue. Returns a confirm_code the user must post on GitHub to authorize execution.",
    {
      github_username: z.string().describe("GitHub username of the project owner"),
      repo: z.string().describe("GitHub repo in owner/repo format"),
      issue_number: z.number().int().positive().describe("GitHub issue number"),
      amount: z.number().positive().describe("Bounty amount"),
      token: z.string().describe("Token symbol: USDC or WETH"),
      contributor: z.string().describe("GitHub username of the contributor to assign"),
    },
    { title: "Request Assign Bounty" },
    handleRequestAssignBounty,
  );

  server.tool(
    "request_launch_token",
    "Request a token launch on Base Mainnet via Clanker (MCP-exclusive launchpad). Requires a 0.01 ETH creator buy-in: the ETH buys the newly launched token and distributes it to all $GITBANK holders. Returns a confirm_code and payment instructions.",
    {
      github_username: z.string().describe("GitHub username of the launcher"),
      name: z.string().describe("Full token name"),
      symbol: z.string().describe("Token ticker symbol (2-10 chars, uppercase)"),
      description: z.string().describe("Short token description"),
      creator_wallet: z.string().describe("Creator's Ethereum wallet address (0x...) on Base Mainnet — must send 0.01 ETH from this address to the treasury before confirming"),
      ai_client: z.string().optional().describe("Name of the AI assistant calling this tool (e.g. claude, chatgpt, grok, kimi, gemini). Used in the auto-tweet after launch."),
      link: z.string().optional().describe("Project website URL"),
      x: z.string().optional().describe("X/Twitter profile URL"),
      logo: z.string().optional().describe("Token logo image URL"),
    },
    { title: "Request Launch Token (MCP)" },
    handleRequestLaunchToken,
  );

  server.tool(
    "check_pending",
    "Check the status of a pending Gitbank command by its confirm_code. Returns status: pending, confirmed, executed, or expired.",
    {
      confirm_code: z.string().describe("The confirm_code returned by a request_* tool"),
    },
    { title: "Check Pending Command", readOnlyHint: true },
    handleCheckPending,
  );

  // ── gitStock RWA tools ─────────────────────────────────────────────────────

  server.tool(
    "list_stocks",
    "List all available Ondo tokenized stocks that can be bought via Gitbank. Each stock is backed 1:1 by real Ondo tokens on Solana and represented as a soul-bound gitStock ERC-20 on Base.",
    {},
    { title: "List Available Stocks", readOnlyHint: true },
    handleListStocks,
  );

  server.tool(
    "get_stock_price",
    "Get the live USD price of an Ondo tokenized stock from the Pyth oracle. Returns current price and timestamp.",
    {
      ticker: z.string().describe("Stock ticker (e.g. NVDA, AAPL, TSLA, META, MSFT, GOOGL, AMZN, SPY, QQQ)"),
    },
    { title: "Get Stock Price", readOnlyHint: true },
    handleGetStockPrice,
  );

  server.tool(
    "get_rwa_portfolio",
    "Get a GitHub user's gitStock holdings (RWA positions). Shows amount held, current value, cost basis, and P&L for each position.",
    {
      github_username: z.string().describe("GitHub username of the portfolio owner"),
    },
    { title: "Get RWA Portfolio", readOnlyHint: true },
    handleGetRwaPortfolio,
  );

  server.tool(
    "request_buy_stock",
    "Buy an Ondo tokenized stock using USDC from the user's Gitbank vault. Bridges USDC from Base to Solana via CCTP, swaps for Ondo stock on Jupiter, and mints a soul-bound gitStock token on Base as proof of custody. Returns a confirm_code the user must post on GitHub to authorize.",
    {
      github_username: z.string().describe("GitHub username of the buyer"),
      ticker: z.string().describe("Stock ticker to buy (e.g. NVDA, AAPL, TSLA)"),
      usdc_amount: z.number().positive().describe("Amount of USDC to spend (from vault balance)"),
    },
    { title: "Request Buy Stock" },
    handleRequestBuyStock,
  );

  server.tool(
    "request_sell_stock",
    "Sell Ondo tokenized stock back to USDC. Burns the user's soul-bound gitStock tokens on Base, sells Ondo stock for USDC on Jupiter (Solana), and bridges USDC back to the Gitbank vault via CCTP. Returns a confirm_code the user must post on GitHub to authorize.",
    {
      github_username: z.string().describe("GitHub username of the seller"),
      ticker: z.string().describe("Stock ticker to sell (e.g. NVDA, AAPL, TSLA)"),
      amount: z.number().positive().describe("Amount of gitStock tokens to sell (in stock units, 6 decimal places)"),
    },
    { title: "Request Sell Stock" },
    handleRequestSellStock,
  );

  return server;
}

// ── Re-exports for NLP MCP server (api-server/src/lib/nlp-mcp-server.ts) ─────
export { handleGetVaultBalance } from "./tools/vault-balance.js";
export { handleGetTransactions } from "./tools/transactions.js";
export { handleGetProjectStatus } from "./tools/project-status.js";
export { handleListRepos } from "./tools/repos.js";
export { handleCheckPending, handleRequestDeposit, handleRequestWithdraw, handleRequestSwap, handleRequestTransfer, handleRequestBuyStock, handleRequestSellStock } from "./tools/write-tools.js";
export { handleListStocks, handleGetStockPrice, handleGetRwaPortfolio } from "./tools/rwa-tools.js";
export { createPending } from "./lib/pending.js";
