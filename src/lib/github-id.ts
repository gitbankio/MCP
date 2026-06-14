import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function resolveGithubId(username: string): Promise<number> {
  const [user] = await db
    .select({ githubId: usersTable.githubId })
    .from(usersTable)
    .where(eq(usersTable.githubLogin, username))
    .limit(1);

  if (user) return user.githubId;

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Gitbank-MCP/1.0",
    ...(process.env["GITHUB_TOKEN"]
      ? { "Authorization": `Bearer ${process.env["GITHUB_TOKEN"]}` }
      : {}),
  };

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}`,
    { headers, signal: AbortSignal.timeout(5000) },
  );

  if (res.status === 404) throw new Error(`GitHub user "${username}" not found.`);
  if (!res.ok) throw new Error(`GitHub API error ${res.status} looking up "${username}".`);

  const data = await res.json() as { id?: number };
  if (!data.id) throw new Error(`Unexpected GitHub API response for "${username}".`);
  return data.id;
}
