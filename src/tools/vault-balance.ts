import { resolveGithubId } from "../lib/github-id.js";
import { getVaultAddress, getVaultBalances } from "../lib/vault-reader.js";

export async function handleGetVaultBalance(args: { github_username: string }) {
  const githubId = await resolveGithubId(args.github_username);
  const vaultAddress = await getVaultAddress(githubId);

  if (!vaultAddress) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          github_username: args.github_username,
          github_id: githubId,
          vault_address: null,
          message: `No vault deployed for @${args.github_username}. Visit https://gitbank.io to deploy one.`,
        }, null, 2),
      }],
    };
  }

  const balances = await getVaultBalances(vaultAddress);

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        github_username: args.github_username,
        github_id: githubId,
        vault_address: vaultAddress,
        network: "Base Mainnet",
        balances,
        basescan_url: `https://basescan.org/address/${vaultAddress}`,
        dashboard_url: `https://gitbank.io/app/vault`,
      }, null, 2),
    }],
  };
}
