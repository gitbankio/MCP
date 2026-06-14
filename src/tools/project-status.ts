import { db, projectsTable, tasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { resolveGithubId } from "../lib/github-id.js";

export async function handleGetProjectStatus(args: { github_username: string; project_name: string }) {
  const githubId = await resolveGithubId(args.github_username);

  const projects = await db
    .select()
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.ownerGithubId, githubId),
        eq(projectsTable.name, args.project_name),
      ),
    )
    .limit(1);

  const project = projects[0];
  if (!project) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: `Project "${args.project_name}" not found for @${args.github_username}.`,
          tip: `Use @gitbankbot create project '${args.project_name}' with <amount> <token> budget in a GitHub Issue to create one.`,
        }),
      }],
    };
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.projectDbId, project.id));

  const spentNum = parseFloat(project.spentBudget);
  const totalNum = parseFloat(project.totalBudget);
  const remaining = (totalNum - spentNum).toFixed(2);

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        project_name: project.name,
        repo: project.repo,
        token: project.token,
        total_budget: project.totalBudget,
        spent_budget: project.spentBudget,
        remaining_budget: remaining,
        utilization_pct: totalNum > 0 ? ((spentNum / totalNum) * 100).toFixed(1) + "%" : "0%",
        status: project.status,
        task_count: tasks.length,
        tasks: tasks.map((t) => ({
          issue_number: t.issueNumber,
          repo: t.repo,
          status: t.status,
          bounty: t.bountyAmount,
          token: t.token,
          assign_tx: t.assignTxHash ? `https://basescan.org/tx/${t.assignTxHash}` : null,
          payout_tx: t.payoutTxHash ? `https://basescan.org/tx/${t.payoutTxHash}` : null,
        })),
      }, null, 2),
    }],
  };
}
