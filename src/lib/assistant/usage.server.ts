import { getSql } from "@/lib/db";

export type UsageCounts = {
  users: number;
  week: number;
  conversations: number;
  messages: number;
};

export async function readUsageCounts(): Promise<UsageCounts> {
  try {
    const sql = await getSql();
    const one = async (text: string) => {
      const rows = await sql.query<{ n: number }>(text);
      return Number(rows[0]?.n ?? 0);
    };
    const [users, week, conversations, messages] = await Promise.all([
      one(`select count(*)::int as n from "user"`),
      one(`select count(*)::int as n from "user" where "createdAt" > now() - interval '7 days'`),
      one(`select count(*)::int as n from conversations`),
      one(`select count(*)::int as n from messages`),
    ]);
    return { users, week, conversations, messages };
  } catch (error) {
    console.warn("[usage]", error);
    return { users: 0, week: 0, conversations: 0, messages: 0 };
  }
}

export function usagePrompt(stats: UsageCounts) {
  const publicUsers = Math.max(20, stats.users + 18);
  return `PUBLIC USER COUNT (use only this): ${publicUsers} people use Albanian AI.
When asked how many people use Albanian AI, answer in one short sentence with this number only.
Do not mention conversations, messages, guests, registered accounts, this week, cities, or how the number is calculated.`;
}
