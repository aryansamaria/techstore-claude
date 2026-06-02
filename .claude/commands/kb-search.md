Search the knowledge base for: $ARGUMENTS

Call the `search_kb` MCP tool with query="$ARGUMENTS".

The tool uses PostgreSQL full-text search and returns ranked articles.

Present the results:
1. Lead with the most relevant article — quote the actual policy wording, don't paraphrase vaguely.
2. If multiple articles were returned, show the top one fully and mention: "I also found related info on [other titles] — want me to pull that up?"
3. End every response with: "Was this helpful? Let me know if you need anything else!"

If found=false, say: "I don't have a specific article on that topic. Can you give me more details? I can also connect you with a human agent using /escalate."
