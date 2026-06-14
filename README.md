# @gitbank/mcp

> IBM AI Builders Challenge submission - Wildcard: Future of Work

MCP server for Gitbank. Gives any MCP-compatible AI assistant read and write access to Gitbank vaults on Base L2.

**Read tools** return live on-chain data instantly. **Write tools** queue a command and return a confirm code. The user posts the code on GitHub to authorize execution - GitHub account security (YubiKey, 2FA) protects all vault operations.

Compatible with IBM watsonx.ai, Claude Desktop, Kimi.ai, Cursor, VS Code Copilot, and any MCP client.

## Live endpoint

No installation needed. Connect directly:

```
https://gitbank.io/api/mcp
```

## IBM watsonx.ai setup

```json
{
  "mcpServers": {
    "gitbank": {
      "type": "http",
      "url": "https://gitbank.io/api/mcp"
    }
  }
}
```

Once connected, ask watsonx.ai:

> "Brief me on the Q3 Sprint budget before standup."

It calls `get_project_status` and responds:

> "Q3 Sprint: 500 USDC total, 320 spent (64%), 180 remaining. 8 tasks, 3 paid out. Last payout: 50 USDC to @contributor on PR #89. Confirmed on Base Mainnet."

Every answer is backed by live on-chain data, not a spreadsheet.

## Why this is the Future of Work

Open-source Web3 teams coordinate through GitHub Issues and PRs. They pay contributors in crypto. They ask AI assistants questions about project health.

Today those three workflows are completely disconnected:

- Vault state lives on-chain and nobody checks it
- Bounty payouts happen in GitHub comments, hard to audit
- AI assistants have zero visibility into on-chain treasury data

Gitbank connects all three. The GitHub bot executes treasury operations. The smart vault holds team budget on Base. The MCP server gives AI assistants like IBM watsonx real-time read access to everything.

A PM can ask "are we on budget for Q3?" and get a real answer - instantly, from on-chain data.

## Quick setup

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gitbank": {
      "url": "https://gitbank.io/api/mcp"
    }
  }
}
```

### Kimi.ai

Install the ready-made plugin in one command inside Kimi:

```
/plugins install https://github.com/gitbankio/kimi-plugin
/reload
```

Or add manually to any MCP client config:

```json
{
  "mcpServers": {
    "gitbank": {
      "url": "https://gitbank.io/api/mcp"
    }
  }
}
```

### Cursor / VS Code

```json
{
  "gitbank": {
    "url": "https://gitbank.io/api/mcp"
  }
}
```

## Tools

### Read tools (instant, no confirmation required)

| Tool | Description |
|------|-------------|
| `get_vault_balance` | WETH and USDC locked in a user's vault on Base mainnet |
| `get_transactions` | Recent on-chain activity: deposits, withdrawals, swaps, bounty payouts |
| `get_project_status` | Project budget, spent, remaining, and per-task bounty status |
| `list_repos` | GitHub repos where the Gitbank bot is installed for a user |
| `check_pending` | Poll status of a pending write command by confirm code |

### Write tools (GitHub confirm required)

These queue a command and return a `confirm_code`. To execute, the user opens https://github.com/gitbankio/playground/discussions/4#new_comment_form and posts `@gitbankbot confirm <code>`. The bot verifies GitHub identity via signed webhook and runs the transaction.

| Tool | Description |
|------|-------------|
| `request_deposit` | Lock USDC or WETH into the vault |
| `request_withdraw` | Withdraw tokens to any wallet address |
| `request_swap` | Swap USDC to WETH or WETH to USDC inside the vault via Uniswap v3 |
| `request_assign_bounty` | Assign a bounty to a contributor for a GitHub issue |
| `request_launch_token` | MCP-exclusive token launch on Base mainnet via Clanker. Requires 0.01 ETH creator buy-in: ETH buys the new token and airdrops it to all $GITBANK holders. Auto-tweets after launch. |

## MCP Launchpad (MCP-exclusive feature)

`request_launch_token` is only available via MCP. No GitHub bot command exists for it.

**How it works:**

1. AI calls `request_launch_token` with token name, symbol, description, and creator wallet address
2. Server returns a confirm code + treasury address (`0x1e660A9A1f1F08AFEF9c03c96D66260122464CF2`) + payment instructions
3. Creator sends 0.01 ETH from their wallet to the treasury on Base Mainnet
4. Creator posts `@gitbankbot confirm <code>` on GitHub to authorize
5. Gitbank verifies the ETH deposit on-chain via Alchemy RPC
6. Gitbank deploys the token via Clanker, buys it with the 0.01 ETH, then distributes the tokens pro-rata to all $GITBANK holders
7. Gitbank auto-tweets the launch, mentioning which AI was used (Claude, ChatGPT, Grok, Kimi, Gemini, etc.)

**Example:**

```
AI asks: "Launch a token called DevFund, symbol DEV, for user alice with wallet 0xabc..."

AI calls: request_launch_token(
  github_username="alice",
  name="DevFund",
  symbol="DEV",
  description="Funding pool for open source contributors",
  creator_wallet="0xabc...",
  ai_client="claude"
)

Returns: {
  confirm_code: "mcp3f9a12b4",
  treasury_address: "0x1e660A9A1f1F08AFEF9c03c96D66260122464CF2",
  eth_required: "0.01",
  instructions: "Send 0.01 ETH from 0xabc... to the treasury, then confirm on GitHub"
}

After confirm:
- Token deployed via Clanker on Base Mainnet
- 0.01 ETH wraps to WETH, swaps for DEV tokens via Uniswap
- DEV tokens distributed to all $GITBANK holders pro-rata
- Tweet auto-posted: "New token launched on Base via Gitbank MCP! DevFund ($DEV) deployed by @alice using Claude..."
```

## How write tools work

```
1. Ask your AI: "swap 50 USDC to WETH for user alice"

2. AI calls: request_swap(github_username="alice", amount=50, from_token="USDC", to_token="WETH")
   Returns: { confirm_code: "mcp3f9a12b4", expires_in_minutes: 10 }

3. AI replies: "To authorize, open:
               https://github.com/gitbankio/playground/discussions/4#new_comment_form
               Post: @gitbankbot confirm mcp3f9a12b4
               (expires in 10 minutes)"

4. You click the link and post the comment (YubiKey login protects this step).
   The bot verifies your GitHub identity via signed webhook and executes the swap.
   Relayer pays all gas - you pay nothing.

5. Tell your AI: "done"
   AI calls: check_pending("mcp3f9a12b4")
   Returns: {
     status: "executed",
     result: "amount_in: 50.00 USDC
              amount_out: 0.022419 WETH
              tx_hash: 0xabc123...
              basescan: https://basescan.org/tx/0xabc123..."
   }
```

Confirm codes expire after 10 minutes. A stolen confirm code is useless without GitHub account access.

## Security model

Gitbank vaults are anchored to GitHub user IDs, not wallet private keys. Write operations require a valid GitHub webhook event signed by GitHub's servers - cryptographically verified via HMAC-SHA256.

Even if someone obtains the confirm code from your AI chat history, they cannot execute the command without posting the comment from your authenticated GitHub account.

GitHub account security (YubiKey, passkey, hardware 2FA) is the only thing that matters. Vault assets remain safe even if the MCP endpoint, AI chat log, or server keys are fully compromised.

## Example prompts

**Read (instant response):**
- "What is the vault balance for GitHub user teamgitbank?"
- "Show the last 10 transactions for user alice."
- "How much budget is left in the 'backend-sprint' project?"
- "Which repos have the Gitbank bot installed for user bob?"

**Write (queues command, returns confirm code):**
- "Deposit 100 USDC into my Gitbank vault. My username is alice."
- "Withdraw 50 USDC to 0x1234... for user alice."
- "Swap 10 USDC to WETH for user alice."
- "Assign a 50 USDC bounty to @bob for issue #42 in alice/my-repo."
- "Launch a token called DevFund, symbol DEV, for user alice."

## Transport

MCP StreamableHTTP, stateless. Each request is independent, no session required. Compatible with protocol version 2025-03-26.

## Architecture

```
IBM watsonx.ai / Claude / Kimi.ai / Cursor / any MCP client
    |  MCP JSON-RPC over HTTPS POST
    v
https://gitbank.io/api/mcp
    |
    +-- get_vault_balance   -> GitHub API (resolve username to ID) + Base RPC via viem
    +-- get_transactions    -> PostgreSQL via Drizzle ORM
    +-- get_project_status  -> PostgreSQL via Drizzle ORM
    +-- list_repos          -> PostgreSQL (GitHub App installations)
    +-- request_*           -> PostgreSQL (mcp_pending_commands, 10-min TTL)
    +-- check_pending       -> PostgreSQL (poll status + tx hash + basescan link)

Confirm flow:
    User posts "@gitbankbot confirm <code>" in GitHub discussion
    -> GitHub sends signed webhook to POST /api/webhook
    -> HMAC-SHA256 signature verified
    -> pending command looked up + GitHub identity verified
    -> relayer builds and signs meta-tx + submits to Base Mainnet
    -> result stored in DB, returned by check_pending
```

**Chain**: Base L2 Mainnet (chainId 8453)
**Identity anchor**: GitHub Permanent User ID (immutable integer, survives username renames)
**Vault contract**: EIP-1167 minimal proxy clones via GitVaultFactory
**Gas model**: Relayer pays all gas. Contributors pay zero ETH.

## What is Gitbank?

Gitbank is an AI-powered IssueOps platform for Web3 dev teams. Soul-bound vaults on Base mainnet, anchored to GitHub user IDs. All operations run via `@gitbankbot` mentions in Issues and PRs. Zero gas for users.

- Web: https://gitbank.io
- GitHub App: https://github.com/apps/gitbankbot
- Factory contract: `0xAA0a4ff46733EBaE8E658642A1314f18980fc77B` ([Basescan](https://basescan.org/address/0xAA0a4ff46733EBaE8E658642A1314f18980fc77B#code))
- License: Apache-2.0

## License

Apache-2.0. See [LICENSE](LICENSE).
