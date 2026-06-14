import { createPending, getPending } from "../lib/pending.js";

const CONFIRM_INSTRUCTIONS = (code: string, username: string) =>
  `Pending command created.\n\n` +
  `Step 1 — Open this link:\n` +
  `https://github.com/gitbankio/playground/discussions/4#new_comment_form\n\n` +
  `Step 2 — Paste this exact comment in the box at the bottom and submit:\n\n` +
  `\`\`\`\n@gitbankbot confirm ${code}\n\`\`\`\n\n` +
  `This expires in 10 minutes. Only @${username} can confirm it.`;

export async function handleRequestDeposit(args: {
  github_username: string;
  amount: number;
  token: string;
}) {
  const code = await createPending(args.github_username, "deposit", {
    amount: args.amount,
    token: args.token.toUpperCase(),
  });

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        status: "pending_confirmation",
        confirm_code: code,
        command: `deposit ${args.amount} ${args.token.toUpperCase()}`,
        instructions: CONFIRM_INSTRUCTIONS(code, args.github_username),
        expires_in_minutes: 10,
      }, null, 2),
    }],
  };
}

export async function handleRequestWithdraw(args: {
  github_username: string;
  amount: number;
  token: string;
  to_address: string;
}) {
  const code = await createPending(args.github_username, "withdraw", {
    amount: args.amount,
    token: args.token.toUpperCase(),
    to_address: args.to_address,
  });

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        status: "pending_confirmation",
        confirm_code: code,
        command: `withdraw ${args.amount} ${args.token.toUpperCase()} to ${args.to_address}`,
        instructions: CONFIRM_INSTRUCTIONS(code, args.github_username),
        expires_in_minutes: 10,
      }, null, 2),
    }],
  };
}

export async function handleRequestSwap(args: {
  github_username: string;
  amount: number;
  from_token: string;
  to_token: string;
}) {
  const code = await createPending(args.github_username, "swap", {
    amount: args.amount,
    from_token: args.from_token.toUpperCase(),
    to_token: args.to_token.toUpperCase(),
  });

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        status: "pending_confirmation",
        confirm_code: code,
        command: `swap ${args.amount} ${args.from_token.toUpperCase()} to ${args.to_token.toUpperCase()}`,
        instructions: CONFIRM_INSTRUCTIONS(code, args.github_username),
        expires_in_minutes: 10,
      }, null, 2),
    }],
  };
}

export async function handleRequestAssignBounty(args: {
  github_username: string;
  repo: string;
  issue_number: number;
  amount: number;
  token: string;
  contributor: string;
}) {
  const code = await createPending(args.github_username, "assign_bounty", {
    repo: args.repo,
    issue_number: args.issue_number,
    amount: args.amount,
    token: args.token.toUpperCase(),
    contributor: args.contributor.startsWith("@") ? args.contributor : `@${args.contributor}`,
  });

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        status: "pending_confirmation",
        confirm_code: code,
        command: `assign ${args.amount} ${args.token.toUpperCase()} bounty on ${args.repo}#${args.issue_number} to ${args.contributor}`,
        instructions: CONFIRM_INSTRUCTIONS(code, args.github_username),
        expires_in_minutes: 10,
      }, null, 2),
    }],
  };
}

export async function handleRequestTransfer(args: {
  github_username: string;
  to_github_username: string;
  amount: number;
  token: string;
}) {
  const recipient = args.to_github_username.replace(/^@/, "");
  if (!recipient) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ error: "to_github_username is required." }, null, 2),
      }],
    };
  }
  const code = await createPending(args.github_username, "transfer", {
    amount: args.amount,
    token: args.token.toUpperCase(),
    to_github_username: recipient,
  });

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        status: "pending_confirmation",
        confirm_code: code,
        command: `send ${args.amount} ${args.token.toUpperCase()} to @${recipient}`,
        security_note: "Only the GitHub account @" + args.github_username + " can authorize this. Vault ownership is verified on-chain at confirmation time.",
        instructions: CONFIRM_INSTRUCTIONS(code, args.github_username),
        expires_in_minutes: 10,
      }, null, 2),
    }],
  };
}

const TREASURY_ADDRESS = "0x1e660A9A1f1F08AFEF9c03c96D66260122464CF2";
const MCP_LAUNCH_ETH = "0.01";

const MCP_LAUNCH_INSTRUCTIONS = (code: string, username: string, creatorWallet: string) =>
  `Token launch queued. MCP launches require a 0.01 ETH creator buy-in.\n\n` +
  `STEP 1 — Send exactly ${MCP_LAUNCH_ETH} ETH on Base Mainnet:\n` +
  `  From: ${creatorWallet}\n` +
  `  To:   ${TREASURY_ADDRESS} (Gitbank Treasury)\n\n` +
  `Important: send from the exact wallet address you provided above. The system verifies the sender.\n\n` +
  `STEP 2 — Confirm on GitHub within 10 minutes of sending:\n\n` +
  `  https://github.com/gitbankio/playground/discussions/4#new_comment_form\n\n` +
  `  In one comment, paste the confirm code AND optionally attach your token logo:\n` +
  `  - Drag-drop or paste your logo image directly into the comment box (GitHub will host it)\n` +
  `  - Then type the confirm code below it\n\n` +
  `  Example comment:\n\n` +
  `  ![logo](paste-or-drag-drop-your-image-here)\n` +
  `  @gitbankbot confirm ${code}\n\n` +
  `  No logo? Just post the confirm code — the token will launch without an image.\n\n` +
  `Only @${username} can confirm this request.\n\n` +
  `What happens next: 0.01 ETH buys your newly launched token at the moment of deploy and distributes it to all $GITBANK holders. Your token will appear on gitbank.io/ecosystem.`;

export async function handleRequestLaunchToken(args: {
  github_username: string;
  name: string;
  symbol: string;
  description: string;
  creator_wallet: string;
  ai_client?: string;
  link?: string;
  x?: string;
  logo?: string;
}) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(args.creator_wallet)) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "Invalid creator_wallet. Must be a valid Ethereum address (0x followed by 40 hex chars).",
        }, null, 2),
      }],
    };
  }

  const code = await createPending(args.github_username, "launch_token", {
    name: args.name,
    symbol: args.symbol.toUpperCase(),
    description: args.description,
    creator_wallet: args.creator_wallet.toLowerCase(),
    ai_client: (args.ai_client ?? "mcp").toLowerCase(),
    link: args.link,
    x: args.x,
    logo: args.logo,
  });

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        status: "pending_confirmation",
        confirm_code: code,
        command: `launch token "${args.name}" (${args.symbol.toUpperCase()})`,
        treasury_address: TREASURY_ADDRESS,
        eth_required: MCP_LAUNCH_ETH,
        creator_wallet: args.creator_wallet,
        instructions: MCP_LAUNCH_INSTRUCTIONS(code, args.github_username, args.creator_wallet),
        expires_in_minutes: 10,
      }, null, 2),
    }],
  };
}

export async function handleRequestBuyStock(args: {
  github_username: string;
  ticker: string;
  usdc_amount: number;
}) {
  const ticker = args.ticker.toUpperCase();
  const code = await createPending(args.github_username, "buy_stock", {
    ticker,
    usdc_amount: args.usdc_amount,
  });

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        status: "pending_confirmation",
        confirm_code: code,
        command: `buy ${ticker} stock with ${args.usdc_amount} USDC`,
        ticker,
        usdc_amount: args.usdc_amount,
        instructions: CONFIRM_INSTRUCTIONS(code, args.github_username),
        expires_in_minutes: 10,
        note: "This will: (1) bridge USDC from your Gitbank vault to Solana via Circle CCTP, (2) buy Ondo tokenized stock on Jupiter, (3) mint git" + ticker + " tokens on Base as proof-of-custody.",
      }, null, 2),
    }],
  };
}

export async function handleRequestSellStock(args: {
  github_username: string;
  ticker: string;
  amount: number;
}) {
  const ticker = args.ticker.toUpperCase();
  const code = await createPending(args.github_username, "sell_stock", {
    ticker,
    amount: args.amount,
  });

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        status: "pending_confirmation",
        confirm_code: code,
        command: `sell ${args.amount} git${ticker} stock`,
        ticker,
        amount: args.amount,
        instructions: CONFIRM_INSTRUCTIONS(code, args.github_username),
        expires_in_minutes: 10,
        note: "This will: (1) burn your git" + ticker + " tokens on Base, (2) sell Ondo stock for USDC on Jupiter (Solana), (3) bridge USDC back to your Gitbank vault via Circle CCTP.",
      }, null, 2),
    }],
  };
}

export async function handleCheckPending(args: { confirm_code: string }) {
  const row = await getPending(args.confirm_code);

  if (!row) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ error: "Confirm code not found." }, null, 2),
      }],
    };
  }

  const isExpired = row.status === "pending" && new Date() > row.expiresAt;
  const status = isExpired ? "expired" : row.status;

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        confirm_code: row.confirmCode,
        github_username: row.githubUsername,
        command: row.command,
        params: row.params,
        status,
        result: row.resultText ?? null,
        expires_at: row.expiresAt.toISOString(),
        created_at: row.createdAt.toISOString(),
      }, null, 2),
    }],
  };
}
