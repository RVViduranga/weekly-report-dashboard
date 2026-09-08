import { z } from "zod";

/**
 * The role is restricted to user and assistant on purpose. A client that could
 * send a system message could rewrite the assistant's instructions, so the two
 * system messages are built on the server and never accepted from the browser.
 */
export const askAssistantSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Ask a question of at least 3 characters")
    .max(500, "Keep the question under 500 characters"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(20, "Conversation is too long")
    .optional(),
  weekStart: z.coerce.date().optional(),
});
