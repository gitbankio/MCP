import { db, installationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function handleListRepos(args: { github_username: string }) {
  const installations = await db
    .select()
    .from(installationsTable)
    .where(eq(installationsTable.accountLogin, args.github_username));

  if (!installations.length) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          github_username: args.github_username,
          message: "No Gitbank bot installations found for this account.",
          install_url: "https://github.com/apps/gitbankbot/installations/new",
          repos: [],
        }),
      }],
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        github_username: args.github_username,
        installation_count: installations.length,
        installations: installations.map((i) => ({
          installation_id: i.installationId,
          account: i.accountLogin,
          account_type: i.accountType,
          bot_active: !i.suspendedAt,
          manage_url: `https://github.com/settings/installations/${i.installationId}`,
        })),
        add_repos_url: "https://github.com/apps/gitbankbot/installations/new",
      }, null, 2),
    }],
  };
}
