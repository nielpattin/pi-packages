/**
 * Strip injected `§N§` tag prefixes AND defensively strip any cargo-cult
 * `§` characters from assistant text before Pi persists the message.
 *
 * # Why this exists
 *
 * Magic Context tags every visible message part with a `§N§` prefix in
 * the transform pipeline so the agent can reference parts by tag id
 * (`ctx_reduce(§3§)`). LLMs frequently mimic that prefix in their own
 * generated text — emitting `§4§ Yes...` at the start of an assistant
 * response. This is harmless for cache (the agent emitting the prefix
 * doesn't bust prefix cache; it's the same content shape we already
 * inject) and the next transform pass strips/re-injects with the
 * correct tag id.
 *
 * BUT: Pi persists the raw assistant text from `message_end` events
 * directly into the session jsonl, and the Pi UI renders from that
 * stored text. So while Host hides the prefix from its own UI via
 * `experimental.text.complete` (which mutates `output.text` before
 * persistence), Pi's UI shows the raw mimicked prefix to the user
 * because nothing scrubs it on the way to disk.
 *
 * This module mirrors Host's `text-complete.ts` for Pi by hooking
 * `pi.on("message_end", ...)`. The event fires synchronously before
 * `agent-session.ts:appendMessage()` persists the message — the event
 * runner emits to extensions FIRST, then persists by reference, so
 * mutating `event.message.content[i].text` is visible to the
 * persistence call.
 *
 * # Two-step strip (matches Host `text-complete.ts`)
 *
 * 1. `^(§N§\s*)+` removes well-formed leading prefix runs (the canonical
 *    case where the model correctly mimics MC's tag prefix at the start
 *    of a response). Digit-aware: removes the whole `§N§ ` pair cleanly,
 *    leaving no digit residue.
 *
 * 2. Global `§` strip removes ANY remaining `§` character anywhere in
 *    the text. Defends against cargo-cult patterns observed when execute
 *    passes drop most tool structure:
 *      - `§40827§` mid-text (well-formed cargo-cult pair)
 *      - `§40827"&gt;` (malformed partial — hybrid of MC tag and XML)
 *      - stray `§` anywhere
 *
 *    Only the MC transform layer is authorized to write `§N§` prefixes.
 *    Any `§` reaching this hook from the model is by definition wrong.
 *    Cost: legitimate `§5.1` section refs become `5.1`; models adapt
 *    naturally to alternative notation.
 *
 * # Scope
 *
 * Only `assistant` messages need stripping. User messages are
 * user-typed text (no LLM mimicking). Tool result messages keep their
 * tagger-injected prefix because that prefix is intentional context.
 */

const LEADING_TAG_PREFIX_REGEX = /^(\u00a7\d+\u00a7\s*)+/;
const SECTION_CHAR_REGEX = /\u00a7/g;

/**
 * Mutate the given assistant message's text parts in place to strip
 * any leading `§N§` tag prefixes.
 *
 * Returns true if any text was modified, false otherwise. The return
 * value is informational; the actual mutation happens on the passed
 * message reference.
 *
 * Exported for testing. Production callers should use `registerStripTagPrefix`.
 */
export function stripTagPrefixFromAssistantMessage(message: { role: string; content: unknown }): boolean {
   if (message.role !== "assistant") return false;
   if (!Array.isArray(message.content)) return false;

   let mutated = false;
   for (const part of message.content) {
      if (part === null || typeof part !== "object" || (part as { type?: unknown }).type !== "text") {
         continue;
      }
      const textPart = part as { type: "text"; text: unknown };
      if (typeof textPart.text !== "string") continue;
      const stripped = textPart.text.replace(LEADING_TAG_PREFIX_REGEX, "").replace(SECTION_CHAR_REGEX, "");
      if (stripped !== textPart.text) {
         textPart.text = stripped;
         mutated = true;
      }
   }
   return mutated;
}
