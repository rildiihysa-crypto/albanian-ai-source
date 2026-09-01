import { getSql } from "@/lib/db";
import { titleFromText } from "@/lib/utils";
import { DEFAULT_PREFS, type ChatRole, type ConversationRow, type FileRow, type MemoryRow, type MessageRow, type Prefs } from "./types";

export async function listConversations(userId: string, search?: string) {
  const sql = await getSql();
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    return sql<ConversationRow>`
      select id, user_id, title, created_at::text, updated_at::text
      from conversations
      where user_id = ${userId} and title ilike ${q}
      order by updated_at desc
      limit 100
    `;
  }
  return sql<ConversationRow>`
    select id, user_id, title, created_at::text, updated_at::text
    from conversations
    where user_id = ${userId}
    order by updated_at desc
    limit 100
  `;
}

export async function getConversation(userId: string, id: string) {
  const sql = await getSql();
  const rows = await sql<ConversationRow>`
    select id, user_id, title, created_at::text, updated_at::text
    from conversations
    where id = ${id} and user_id = ${userId}
    limit 1
  `;
  const conversation = rows[0];
  if (!conversation) return null;
  const messages = await sql<MessageRow>`
    select id, conversation_id, role, content, created_at::text
    from messages
    where conversation_id = ${id}
    order by created_at asc
  `;
  const files = await sql<FileRow>`
    select id, user_id, conversation_id, message_id, file_name, mime_type, size, extracted_text, created_at::text
    from files
    where conversation_id = ${id} and user_id = ${userId}
    order by created_at desc
  `;
  return { ...conversation, messages, files };
}

export async function createConversation(userId: string, title = "Bisedë e re") {
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql`
    insert into conversations (id, user_id, title)
    values (${id}, ${userId}, ${title})
  `;
  return getConversation(userId, id);
}

export async function renameConversation(userId: string, id: string, title: string) {
  const sql = await getSql();
  await sql`
    update conversations
    set title = ${title}, updated_at = now()
    where id = ${id} and user_id = ${userId}
  `;
}

export async function deleteConversation(userId: string, id: string) {
  const sql = await getSql();
  await sql`delete from files where conversation_id = ${id} and user_id = ${userId}`;
  await sql`delete from messages where conversation_id = ${id}`;
  await sql`delete from conversations where id = ${id} and user_id = ${userId}`;
}

export async function addMessage(
  conversationId: string,
  role: ChatRole,
  content: string,
) {
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql`
    insert into messages (id, conversation_id, role, content)
    values (${id}, ${conversationId}, ${role}, ${content})
  `;
  await sql`update conversations set updated_at = now() where id = ${conversationId}`;
  return id;
}

export async function replaceMessage(id: string, content: string) {
  const sql = await getSql();
  await sql`update messages set content = ${content} where id = ${id}`;
}

export async function deleteMessagesAfter(conversationId: string, createdAt: string) {
  const sql = await getSql();
  await sql`
    delete from messages
    where conversation_id = ${conversationId} and created_at > ${createdAt}::timestamptz
  `;
}

export async function listMemories(userId: string) {
  const sql = await getSql();
  return sql<MemoryRow>`
    select id, user_id, content, category, created_at::text, updated_at::text
    from memories
    where user_id = ${userId}
    order by updated_at desc
  `;
}

export async function createMemory(userId: string, content: string, category = "preference") {
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql`
    insert into memories (id, user_id, content, category)
    values (${id}, ${userId}, ${content}, ${category})
  `;
  return id;
}

export async function deleteMemory(userId: string, id: string) {
  const sql = await getSql();
  await sql`delete from memories where id = ${id} and user_id = ${userId}`;
}

export async function clearMemories(userId: string) {
  const sql = await getSql();
  await sql`delete from memories where user_id = ${userId}`;
}

export async function getSettings(userId: string): Promise<Prefs> {
  const sql = await getSql();
  const rows = await sql<{ key: string; value: string }>`
    select key, value from settings where user_id = ${userId}
  `;
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...DEFAULT_PREFS, ...map } as Prefs;
}

export async function saveSettings(userId: string, values: Record<string, string>) {
  const sql = await getSql();
  const allowed = new Set(Object.keys(DEFAULT_PREFS));
  for (const [key, value] of Object.entries(values)) {
    if (!allowed.has(key)) continue;
    const id = crypto.randomUUID();
    await sql`
      insert into settings (id, user_id, key, value)
      values (${id}, ${userId}, ${key}, ${value})
      on conflict (user_id, key)
      do update set value = excluded.value, updated_at = now()
    `;
  }
}

export async function createFile(data: {
  userId: string;
  conversationId: string;
  fileName: string;
  mimeType: string;
  size: number;
  extractedText?: string;
}) {
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql`
    insert into files (id, user_id, conversation_id, file_name, mime_type, size, extracted_text)
    values (${id}, ${data.userId}, ${data.conversationId}, ${data.fileName}, ${data.mimeType}, ${data.size}, ${data.extractedText ?? null})
  `;
  return { id, fileName: data.fileName };
}

export async function exportPersonalData(userId: string) {
  const [conversationList, memoryList, preferenceMap] = await Promise.all([
    listConversations(userId),
    listMemories(userId),
    getSettings(userId),
  ]);
  const fullConversations = await Promise.all(
    conversationList.map((row) => getConversation(userId, row.id)),
  );
  return {
    exportedAt: new Date().toISOString(),
    conversations: fullConversations.filter(Boolean),
    memories: memoryList,
    settings: preferenceMap,
  };
}

export async function maybeRenameFromFirstMessage(
  userId: string,
  conversationId: string,
  content: string,
) {
  const current = await getConversation(userId, conversationId);
  if (!current) return;
  if (current.title === "Bisedë e re" || current.title === "New conversation") {
    await renameConversation(userId, conversationId, titleFromText(content));
  }
}
