# Contributing to gitbankio/mcp

## Getting started

```bash
git clone https://github.com/gitbankio/mcp
cd mcp
pnpm install
pnpm run typecheck
```

## Guidelines

- Read tools (get_vault_balance, get_transactions, get_project_status, list_repos, check_pending) must never write to DB or chain
- Write tools (request_*) only write to the mcp_pending_commands table and return a confirm_code - they never directly touch the chain
- No em dash in any file
- GitHub username lookup uses public GitHub API (no auth required for public users)
- Vault reads use Base mainnet RPC via viem

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
