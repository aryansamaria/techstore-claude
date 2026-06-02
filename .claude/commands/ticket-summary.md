Generate and save a structured summary of this support conversation.

Additional notes: $ARGUMENTS

Steps:
1. Review the full conversation and extract:
   - issue: one sentence — what was the customer's core problem?
   - resolution_status: "resolved" | "in_progress" | "escalated" | "unresolved"
   - actions_taken: list of things that were done (e.g. ["Looked up ORD-1001", "Found order shipped on time"])
   - customer_sentiment: "positive" | "neutral" | "frustrated" | "very_frustrated"
   - follow_up_required: true or false
   - follow_up_notes: what still needs to happen (or null)

2. Call the `save_ticket_summary` MCP tool with those values.

3. After the tool confirms saved=true, display the summary to the user in a clean readable format (not raw JSON):

   **Ticket Summary** (SUM-XXXXXXXX)
   Issue: ...
   Status: ...
   Actions taken: ...
   Customer sentiment: ...
   Follow-up: ...

4. If resolution_status is "unresolved" or "escalated", offer: "Would you like me to escalate this now? Just type /escalate and I'll set that up."
