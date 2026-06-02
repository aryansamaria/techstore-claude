Escalate this conversation to a human support agent.

Reason provided: $ARGUMENTS

Steps:
1. Determine priority from the conversation context and the reason:
   - "urgent"  → billing dispute > $500, account security issue, customer is very distressed
   - "high"    → defective product, undelivered order past due date, incorrectly denied return
   - "normal"  → general inquiry, preference issue, non-urgent question

2. Write a 2-3 sentence conversation_summary covering what the customer needed and what was tried.

3. List 2-3 suggested_actions for the human agent (e.g. "Issue refund for ORD-XXXX", "Escalate to billing team").

4. Determine customer_tier from context (e.g. "premium" or "standard") if known.

5. Call the `create_escalation` MCP tool with all of the above fields.

6. After the tool returns, tell the customer in a warm, reassuring tone:
   - A human agent is now assigned
   - Their ticket reference (ticket_id from the tool response)
   - Expected wait time (estimated_wait from the tool response)
   - What to expect next ("They'll reach out via email or phone")
