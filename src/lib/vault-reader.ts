import { createPublicClient, http, parseAbi, type Address } from "viem";
import { base } from "viem/chains";

const FACTORY_ADDRESS = (
  process.env["GIT_VAULT_FACTORY_ADDRESS"] ?? "0xAA0a4ff46733EBaE8E658642A1314f18980fc77B"
) as Address;

const WETH = "0x4200000000000000000000000000000000000006" as Address;
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as Address;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const FACTORY_ABI = parseAbi([
  "function getVaultByGithubId(uint256 githubUserId) view returns (address)",
]);

const VAULT_ABI = parseAbi([
  "function getGitLockedBalance(address token) view returns (uint256)",
]);

const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env["BASE_MAINNET_RPC_URL"] ?? "https://mainnet.base.org",
  ),
});

export async function getVaultAddress(githubId: number): Promise<Address | null> {
  const addr = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getVaultByGithubId",
    args: [BigInt(githubId)],
  }) as Address;
  return addr.toLowerCase() === ZERO_ADDRESS ? null : addr;
}

export interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
}

export async function getVaultBalances(vaultAddress: Address): Promise<TokenBalance[]> {
  const tokens = [
    { symbol: "WETH", address: WETH, decimals: 18 },
    { symbol: "USDC", address: USDC, decimals: 6 },
  ];

  const results = await Promise.all(
    tokens.map(async (token) => {
      const raw = await publicClient.readContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "getGitLockedBalance",
        args: [token.address],
      }) as bigint;
      const balance = (Number(raw) / 10 ** token.decimals).toFixed(
        token.decimals === 18 ? 6 : 2,
      );
      return { symbol: token.symbol, address: token.address, balance };
    }),
  );

  return results;
}
