# TechStore AI Customer Support — Full Project Report

**Project:** AI-Powered Customer Support System

**Stack:** Python · PostgreSQL · React · Claude AI (Anthropic)

**Core Concepts Demonstrated:** Claude Hooks · Claude Skills (Custom Commands) · MCP (Model Context Protocol)

---

## Table of Contents

1. [What This Project Is](#1-what-this-project-is)
2. [The Problem We Are Solving](#2-the-problem-we-are-solving)
3. [Full Architecture](#3-full-architecture)
4. [Every File and What It Does](#4-every-file-and-what-it-does)
5. [The Three Claude Pillars](#5-the-three-claude-pillars)
   - [Hooks — Automatic Event Listeners](#51-hooks--automatic-event-listeners)
   - [Skills — Custom Slash Commands](#52-skills--custom-slash-commands)
   - [MCP — Live Database Tools](#53-mcp--live-database-tools)
6. [The Complete Flow — Step by Step](#6-the-complete-flow--step-by-step)
7. [The Web Application](#7-the-web-application)
8. [The Streaming Chat Loop](#8-the-streaming-chat-loop)
9. [What Claude Makes Dramatically Easier](#9-what-claude-makes-dramatically-easier)
10. [Summary](#10-summary)

---

## 1. What This Project Is

TechStore AI Support is a **fully working AI-powered customer support system** for a fictional electronics retailer called TechStore.

A customer can:
- Ask about the status of their order
- Get answers about return and refund policies
- Request escalation to a human agent
- Receive a ticket number and estimated wait time

All of this is answered by Claude AI, which has **live access to a real PostgreSQL database**. It does not guess or make things up — it reads the actual order, looks up the real customer, and responds with real data.

The system has two interfaces:
1. **Claude Code CLI** — where developers or support agents type directly into the terminal and Claude responds with tools and slash commands
2. **React Web App** — a modern browser-based dashboard with a chat window, order browser, knowledge base, and escalation queue

---

## 2. The Problem We Are Solving

### The Old Way (Before Claude Tools)

Imagine you needed to build a support system like this traditionally. You would need to:

**For data access:**
- Write a full API layer to expose order data
- Write query functions for every possible question a customer might ask
- Handle edge cases: what if the order doesn't exist? What if the customer ID is wrong?
- Maintain all of this code as the data model changes

**For conversation:**
- Write a rule-based chatbot with decision trees (if they say "refund" → show refund flow, if they say "order" → ask for order ID, etc.)
- OR integrate an LLM and write a complex prompt + parsing layer to extract intent and parameters
- Write code to detect when the AI needs more information and how to ask for it
- Handle multi-turn conversations and context manually

**For safety:**
- Write middleware to block dangerous inputs
- Manually validate every tool call before it executes
- Build an audit logging system from scratch
- Write a transcript archiving system

**For slash commands:**
- Build a command parser
- Map each command to a handler function
- Keep commands in sync with documentation

**Total: Months of engineering. Hundreds of lines of boilerplate per feature.**

### The New Way (With Claude Hooks + Skills + MCP)

With this stack, you describe what you want instead of writing every step:

- A **Hook** is a shell script that runs automatically when something happens. No polling, no middleware registration, no event bus. Just: "when X happens, run this script."
- A **Skill** (Custom Command) is a Markdown file. The filename becomes the `/slash-command`. The content is the instruction. No parser, no router, no function mapping.
- An **MCP Server** is a Python file with functions. Decorate them with `@mcp.tool()` and Claude can call them directly. No API spec, no OpenAPI, no manual routing.

**Total: Hours of setup. Dozens of lines per feature. Claude handles the reasoning, branching, and context automatically.**

---

## 3. Full Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                         │
│                                                                 │
│   ┌──────────────────────┐     ┌──────────────────────────────┐ │
│   │   Claude Code CLI    │     │    React Web App (port 5173) │ │
│   │   (Terminal)         │     │    Dashboard · Chat          │ │
│   │                      │     │    Orders · KB · Escalations │ │
│   └──────────┬───────────┘     └──────────────┬───────────────┘ │
└──────────────┼──────────────────────────────── ┼ ───────────────┘
               │                                  │
               ▼                                  ▼
┌─────────────────────────────┐  ┌─────────────────────────────────┐
│   CLAUDE CODE ENGINE        │  │   FASTAPI BACKEND (port 8000)   │
│                             │  │                                 │
│  Reads: .claude/settings    │  │  /api/orders                    │
│  Loads: CLAUDE.md (persona) │  │  /api/customers                 │
│  Loads: /commands/*.md      │  │  /api/kb                        │
│  Starts: MCP server         │  │  /api/escalations               │
│  Runs: Hooks on events      │  │  /api/chat/stream  ◄── SSE      │
│                             │  │  (Agentic loop + Claude SDK)    │
└──────┬──────────────────────┘  └─────────────────────────────────┘
       │                                          │
       │  stdin/stdout JSON-RPC                   │ psycopg2
       ▼                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP SERVER  (server.py)                      │
│                                                                 │
│   get_order()          get_customer()                           │
│   search_kb()          get_orders_by_customer()                 │
│   create_escalation()  save_ticket_summary()                    │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE  (techstore)                   │
│                                                                 │
│   customers        orders          order_items                  │
│   knowledge_base   escalation_tickets   ticket_summaries        │
└─────────────────────────────────────────────────────────────────┘
       ▲
       │ fired on every event
┌──────┴──────────────────────────────────────────────────────────┐
│                    HOOKS  (shell scripts)                       │
│                                                                 │
│   UserPromptSubmit → log_query.sh      (logs every message)     │
│   PreToolUse(Bash) → guard_tools.py   (blocks dangerous cmds)   │
│   PostToolUse      → audit_tool.sh    (audit trail)             │
│   Stop             → save_session.sh  (archives transcript)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Every File and What It Does

### Configuration Layer
```
.claude/settings.json
```
The single most important file in the project. It is the control panel that:
- Registers the MCP server (tells Claude Code how to start it)
- Registers all four hooks (tells Claude Code which script to run on each event)

Without this file, Claude is just a chat interface. With it, Claude becomes an agent with live tools and automatic event handling.

```
CLAUDE.md
```
Loaded automatically as a system prompt when you run `claude` in this directory. Sets Claude's persona, tells it what tools are available, what the business rules are (30-day return window, 1-year warranty, escalate disputes over $500), and what tone to use. Think of it as a briefing document for the AI.

---

### Database Layer
```
db/schema.sql      — creates all 6 tables, defines FTS index
db/seed.sql        — inserts sample customers, orders, KB articles
db/setup.sh        — one-command: createdb + schema + seed
web/backend/db.py  — all SQL query functions, shared by MCP + FastAPI
```

The database has 6 tables:

| Table | Purpose |
|---|---|
| `customers` | Name, email, tier (standard/premium), phone |
| `orders` | Status, tracking, carrier, delivery dates, return info |
| `order_items` | Individual line items per order |
| `knowledge_base` | Policy articles with a GIN full-text search index |
| `escalation_tickets` | Written by `/escalate` command and `create_escalation` tool |
| `ticket_summaries` | Written by `/ticket-summary` command |

The `fts_vector` generated column on `knowledge_base` is worth explaining separately. PostgreSQL computes a search-optimised version of the article title and content and stores it automatically. When `search_kb` runs, it queries this column with `@@` (the full-text match operator) and gets ranked results back in milliseconds — no Elasticsearch, no external search service needed.

---

### Hooks Layer
```
hooks/log_query.sh     — UserPromptSubmit hook
hooks/guard_tools.py   — PreToolUse hook (Bash only)
hooks/audit_tool.sh    — PostToolUse hook
hooks/save_session.sh  — Stop hook
```

Four shell scripts. Each one reads a JSON blob from stdin, does its job, and exits. They are wired to Claude Code events in `settings.json`. Fully covered in Section 5.1.

---

### Skills Layer (Custom Commands)
```
.claude/commands/lookup-order.md
.claude/commands/kb-search.md
.claude/commands/escalate.md
.claude/commands/ticket-summary.md
```

Four Markdown files. Each filename is a slash command. Each content is an instruction template with `$ARGUMENTS` as a placeholder. Fully covered in Section 5.2.

---

### MCP Server
```
mcp_server/server.py
```

A Python file that runs as a child process of Claude Code. Exposes 6 tools over stdin/stdout JSON-RPC. Fully covered in Section 5.3.

---

### Web Application
```
web/backend/app.py           — FastAPI server with all REST routes
web/backend/db.py            — shared DB functions
web/frontend/src/App.tsx     — root component + page routing
web/frontend/src/pages/      — 6 pages: Dashboard, Chat, Orders, KB, Escalations, Customers
web/frontend/src/components/ — Sidebar
web/frontend/src/types.ts    — TypeScript type definitions
web/start.sh                 — starts both backend and frontend
```

Fully covered in Section 7.

---

## 5. The Three Claude Pillars

### 5.1 Hooks — Automatic Event Listeners

**What is a Hook?**

A Hook is a shell script that Claude Code runs automatically at specific moments in a conversation. You register hooks in `settings.json` by saying: "when this event happens, run this command." Claude Code calls the script, passes context as JSON through stdin, reads the exit code and stdout, and decides what to do next.

**The Four Hook Events Used in This Project**

---

**Hook 1: `UserPromptSubmit` → `log_query.sh`**

*When it fires:* The instant a user hits Enter — before Claude even reads the message.

*What it receives (stdin):*
```json
{
  "session_id": "abc-123",
  "transcript_path": "/tmp/claude-transcripts/abc-123.json",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "Where is my order ORD-1001?"
}
```

*What the script does:* Extracts the prompt, writes a timestamped line to `logs/queries.log`.

*Output in the log:*
```
[2026-06-02T06:06:28Z] session=abc-123 query=Where is my order ORD-1001?
```

*Why this matters:* You now have a full audit trail of every customer query ever made — session ID, timestamp, and the exact question. This is compliance-ready logging with zero extra effort. You would normally build a separate middleware layer, a database table, and a logging service to get this.

*Exit code effect:*
- `exit 0` → Claude proceeds normally
- `exit 2` → Claude blocks the message entirely (you could use this for rate limiting, banned words, or abuse detection)

---

**Hook 2: `PreToolUse` → `guard_tools.py`**

*When it fires:* Just before Claude executes a Bash command. This hook only fires for Bash because of `"matcher": "Bash"` in settings.json. Read, Write, and MCP tools bypass this hook.

*What it receives (stdin):*
```json
{
  "session_id": "abc-123",
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf /tmp/test" }
}
```

*What the script does:* Checks the command against a list of dangerous patterns (`rm -rf`, `dd if=`, `mkfs`, fork bombs, etc.). Outputs a JSON decision to stdout.

*Decision outputs:*
```json
// Block it:
{"decision": "block", "reason": "Recursive force delete is not allowed. Command contained: rm -rf"}

// Allow it:
{"decision": "approve", "reason": "Command approved for execution."}
```

Claude Code reads the stdout, and if it sees `"decision": "block"`, it cancels the tool call and shows the reason to Claude so it can try a different approach.

*Why this matters:* You get a security gate on every shell command, automatically, without writing any middleware. In a traditional setup you would need to intercept tool calls, validate them, maintain a blocklist, and wire it all into your AI pipeline manually. Here it is 70 lines of Python and one entry in settings.json.

---

**Hook 3: `PostToolUse` → `audit_tool.sh`**

*When it fires:* After every tool finishes executing (Bash, Read, Write, and MCP tools all trigger this).

*What it receives (stdin):*
```json
{
  "session_id": "abc-123",
  "tool_name": "Bash",
  "tool_input": { "command": "cat data/orders.json" },
  "tool_response": "...file contents..."
}
```

*What the script does:* Appends a line to `logs/tool_audit.log`.

*Output in the log:*
```
[2026-06-02T06:07:55Z] session=abc-123 tool=Bash cmd=cat data/orders.json
```

*Why this matters:* This cannot block (the tool already ran), but it gives you a complete tool usage audit trail. You can see exactly which tools Claude used in every session, in what order, and what commands it ran. This is invaluable for debugging, security review, and usage analytics.

---

**Hook 4: `Stop` → `save_session.sh`**

*When it fires:* When Claude finishes generating its response (end of turn).

*What it receives (stdin):*
```json
{
  "session_id": "abc-123",
  "transcript_path": "/tmp/claude-transcripts/abc-123.json",
  "stop_reason": "end_turn"
}
```

*What the script does:* Copies the full conversation transcript JSON to `logs/transcripts/` with a timestamped filename.

*Why this matters:* Every conversation is automatically archived. Without this, transcripts exist only in temporary files that Claude Code manages. With this hook, you have a permanent record of every support conversation, automatically, without the developer doing anything. In a traditional system you would build a session storage service, connect it to your chat infrastructure, and implement background jobs to flush conversations to long-term storage.

---

**How Hooks Are Registered**

All four hooks are registered in one place — `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "hooks/log_query.sh", "timeout": 5 }] }],
    "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "python3 hooks/guard_tools.py" }] }],
    "PostToolUse": [{ "hooks": [{ "type": "command", "command": "hooks/audit_tool.sh" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "hooks/save_session.sh" }] }]
  }
}
```

Notice the `"matcher": "Bash"` on `PreToolUse`. This tells Claude Code to only run the security guard when Claude is about to use the Bash tool — not for Read, Write, or MCP tool calls. This is fine-grained event filtering with a single line of JSON.

---

### 5.2 Skills — Custom Slash Commands

**What is a Skill?**

A Skill is a Markdown file placed in `.claude/commands/`. The filename (without `.md`) becomes a `/slash-command`. The content of the file is the instruction Claude receives when you type that command. `$ARGUMENTS` is replaced with whatever you type after the command name.

There is no code, no function, no router, no parser. Just a file.

**The Four Skills in This Project**

---

**Skill 1: `/lookup-order`**
*File:* `.claude/commands/lookup-order.md`

*How to use:* `/lookup-order ORD-1001`

*What it does:* The file tells Claude to call the `get_order` MCP tool with the given ID, then format the result as a friendly support response — translating internal status codes like `return_requested` into "Return in Progress", noting premium customers, showing tracking numbers, etc.

*Without this skill:* Every time a customer asks about an order, you would need to manually describe to Claude what data to look up and how to format it. With the skill, a single command delivers a complete, formatted order summary every time.

---

**Skill 2: `/kb-search`**
*File:* `.claude/commands/kb-search.md`

*How to use:* `/kb-search return policy`

*What it does:* Calls `search_kb` MCP tool, presents the most relevant article in plain language, mentions related articles, and ends with a follow-up prompt.

*Without this skill:* The agent would need to be prompted to search the knowledge base on every relevant question, and the response format would be inconsistent.

---

**Skill 3: `/escalate`**
*File:* `.claude/commands/escalate.md`

*How to use:* `/escalate Customer's keyboard arrived broken`

*What it does:* Determines priority (urgent/high/normal) from context, writes a structured escalation record to the database via the `create_escalation` MCP tool, and tells the customer their ticket ID and expected wait time.

*Without this skill:* Escalation would require a developer to build a form, a backend endpoint, a ticket numbering system, and a notification message — and Claude would have no way to trigger it naturally in a conversation.

---

**Skill 4: `/ticket-summary`**
*File:* `.claude/commands/ticket-summary.md`

*How to use:* `/ticket-summary`

*What it does:* Reviews the entire conversation, extracts key fields (issue, resolution status, sentiment, follow-up needed), saves them to the database via `save_ticket_summary`, and displays a clean summary to the agent.

*Without this skill:* End-of-conversation summaries would require either manual agent effort or a complex post-processing pipeline.

---

**How Skills Are Different From Prompting**

When you just type a question to Claude, you might get a different quality of answer each time. Skills are reproducible. Every time someone types `/lookup-order`, Claude follows the exact same instruction template. The format is consistent, the fields are always present, and the business rules (premium customer note, status translation, etc.) are always applied.

Think of Skills as **documented, repeatable workflows encoded as prompts** — like SOPs (Standard Operating Procedures) that run automatically when invoked.

---

### 5.3 MCP — Live Database Tools

**What is MCP?**

MCP stands for Model Context Protocol. It is an open standard created by Anthropic that defines how an AI model can communicate with external systems. In this project, it is the bridge between Claude's reasoning and the real PostgreSQL database.

**How It Works Mechanically**

When you run `claude` in the project directory, Claude Code reads `settings.json` and finds the `mcpServers` block:

```json
"mcpServers": {
  "techstore": {
    "command": "python3",
    "args": ["/path/to/mcp_server/server.py"],
    "env": { "DATABASE_URL": "postgresql://postgres:localdev@localhost/techstore" }
  }
}
```

Claude Code immediately spawns `server.py` as a **child process**. The two talk via **stdin/stdout using JSON-RPC messages** (a lightweight protocol where every message is a line of JSON). No HTTP server, no ports, no network.

The handshake looks like this:
```
Claude Code → server.py:  {"method": "initialize", ...}
server.py   → Claude Code: {"result": {"serverInfo": {"name": "techstore-support"}, ...}}

Claude Code → server.py:  {"method": "tools/list"}
server.py   → Claude Code: {"result": {"tools": [{"name": "get_order", ...}, ...]}}
```

After this handshake, Claude knows exactly what tools exist, what parameters they take, and what they return. When Claude decides to call `get_order`, the exchange looks like:

```
Claude Code → server.py:  {"method": "tools/call", "params": {"name": "get_order", "arguments": {"order_id": "ORD-1001"}}}
server.py   → Claude Code: {"result": {"content": [{"type": "text", "text": "{\"found\": true, \"order\": {...}}"}]}}
```

The server runs the SQL query, serialises the result to JSON, and sends it back. Claude reads the result and uses it to write its response.

**The Six MCP Tools**

| Tool | What It Queries | Returns |
|---|---|---|
| `get_order(order_id)` | `orders` + `order_items` + `customers` | Order with items and customer profile |
| `get_customer(customer_id)` | `customers` | Customer profile |
| `get_orders_by_customer(customer_id)` | `orders` + `order_items` | All orders for a customer |
| `search_kb(query)` | `knowledge_base` (FTS) | Ranked articles |
| `create_escalation(...)` | INSERT into `escalation_tickets` | Ticket ID, wait time |
| `save_ticket_summary(...)` | INSERT into `ticket_summaries` | Summary ID |

**Why This Is Powerful**

Before MCP, connecting an LLM to a database required you to:
1. Write an API layer on top of your database
2. Write function-calling definitions in the format your LLM provider expects
3. Write a dispatch layer that maps function names to actual code
4. Handle tool results, format them, inject them back into the conversation
5. Handle multi-step tool use (Claude calls tool A, result informs tool B)
6. Maintain all of this as your schema changes

With MCP, you write Python functions with docstrings and the `@mcp.tool()` decorator. Everything else is automatic. The protocol handles serialisation, transport, schema generation (the JSON Schema for each tool is auto-generated from the Python function signature), and routing.

```python
@mcp.tool()
def get_order(order_id: str) -> dict:
    """Look up a single order by ID. Returns order, items, and customer info."""
    # ... SQL query ...
    return result
```

That is the entire definition. Claude Code discovers it, learns its schema, and can call it in any conversation where it is relevant.

---

## 6. The Complete Flow — Step by Step

Here is what happens from the moment a customer types a message to the moment they receive an answer, covering every layer of the project.

### Scenario: Customer types "Where is my order ORD-1001?"

```
STEP 1 — User submits message
───────────────────────────────────────────────────────────
User types: "Where is my order ORD-1001?"

→ UserPromptSubmit Hook fires (log_query.sh)
  Receives JSON with session_id + prompt
  Writes to logs/queries.log:
    [2026-06-02T06:30:00Z] session=abc query=Where is my order ORD-1001?
  Exits 0 → Claude Code continues


STEP 2 — Claude reads and thinks
───────────────────────────────────────────────────────────
Claude Code passes the message to Claude (claude-sonnet-4-6)
Claude reads CLAUDE.md (system prompt / persona / business rules)
Claude sees 6 available tools from the MCP server
Claude decides: "I should call get_order with order_id=ORD-1001"


STEP 3 — MCP tool call
───────────────────────────────────────────────────────────
PreToolUse hook? → NO — matcher is "Bash" only, MCP tools skip it

Claude Code → server.py (via stdin):
  {"method": "tools/call", "params": {"name": "get_order", "arguments": {"order_id": "ORD-1001"}}}

server.py runs SQL:
  SELECT * FROM orders WHERE UPPER(id) = 'ORD-1001'
  SELECT sku, name, qty, price FROM order_items WHERE order_id = 'ORD-1001'
  SELECT * FROM customers WHERE id = 'C001'

server.py → Claude Code (via stdout):
  {"result": {"content": [{"text": "{\"found\": true, \"order\": {\"status\": \"shipped\", \"tracking\": \"1Z999AA10123456784\"}, \"items\": [{\"name\": \"ProBook Laptop 15\\\"\", \"qty\": 1, \"price\": 1299.99}], \"customer\": {\"name\": \"Alice Johnson\", \"tier\": \"premium\"}}"}]}}


STEP 4 — PostToolUse Hook fires (audit_tool.sh)
───────────────────────────────────────────────────────────
Writes to logs/tool_audit.log:
  [2026-06-02T06:30:00Z] session=abc tool=techstore__get_order
Cannot block — tool already ran.


STEP 5 — Claude writes response
───────────────────────────────────────────────────────────
Claude reads the tool result, applies business rules from CLAUDE.md,
and formats a response:

"Hi Alice! 💼 Premium member — thank you for your loyalty!

Your order ORD-1001 is on its way! 🚚

  ProBook Laptop 15" × 1 — $1,299.99

Tracking: 1Z999AA10123456784 (UPS)
Estimated delivery: June 4, 2026

Let me know if you need anything else!"


STEP 6 — Stop Hook fires (save_session.sh)
───────────────────────────────────────────────────────────
Receives JSON with session_id + transcript_path
Copies transcript to logs/transcripts/abc_20260602T063000Z.json
Logs to logs/session.log:
  [2026-06-02T06:30:01Z] session=abc stop_reason=end_turn
  [2026-06-02T06:30:01Z] session=abc transcript archived
```

The customer sees a friendly, accurate, formatted response. Every step in between was automatic.

---

### Scenario: Customer types `/escalate keyboard stopped working`

```
STEP 1 — Hook logs the message (same as above)

STEP 2 — Claude Code sees /escalate
  Reads .claude/commands/escalate.md
  Replaces $ARGUMENTS with "keyboard stopped working"
  This becomes Claude's instruction for the turn

STEP 3 — Claude determines priority
  Reads the conversation history
  Decides: priority = "high" (defective product)
  Writes conversation_summary
  Writes suggested_actions

STEP 4 — Claude calls create_escalation MCP tool
  server.py runs INSERT into escalation_tickets
  Returns: {"ticket_id": "ESC-1748853000", "estimated_wait": "2–4 hours"}

STEP 5 — Claude tells the customer
  "I've connected you with a human agent. Your ticket number is
   ESC-1748853000. A team member will reach out within 2–4 hours."

STEP 6 — Stop hook archives the transcript
```

The escalation ticket now appears in:
- The `escalation_tickets` PostgreSQL table
- The Escalations page of the React web app (immediately, on refresh)
- The logs/session.log

---

## 7. The Web Application

The web app gives a visual interface on top of all the same logic.

### Backend — FastAPI (port 8000)

`web/backend/app.py` is a FastAPI server. It imports `web/backend/db.py` which has the same SQL query functions as the MCP server. This means the web app and the CLI tool query the exact same database with the exact same logic.

**REST Endpoints**

| Endpoint | Returns |
|---|---|
| `GET /api/stats` | Dashboard numbers (order counts, status breakdown) |
| `GET /api/orders` | All orders with customer name and items |
| `GET /api/customers` | All customers with order counts |
| `GET /api/kb` | All knowledge base articles |
| `GET /api/kb/search?q=...` | Full-text search results |
| `GET /api/escalations` | All escalation tickets |
| `POST /api/chat/stream` | Streaming chat with Claude (SSE) |

### Frontend — React + Vite + Tailwind (port 5173)

Six pages, all using data from the FastAPI backend:

| Page | What It Shows |
|---|---|
| Dashboard | Stat cards, order status breakdown bar chart, recent escalations |
| Chat | Full streaming AI chat interface with tool call cards |
| Orders | Filterable/searchable table with expandable order details |
| Knowledge Base | Searchable articles with live full-text search |
| Escalations | Priority ticket queue with collapsible details |
| Customers | Profile cards with order counts |

The Vite dev server proxies all `/api` requests to FastAPI, so there are no CORS issues and no hardcoded URLs in the frontend.

---

## 8. The Streaming Chat Loop

The web chat is where the most interesting engineering happens. When a user sends a message, it does not wait for the full response. Instead, it streams every step in real time.

**Server-Sent Events (SSE)**

The backend returns a `StreamingResponse` from FastAPI. The frontend opens the response body as a stream and reads events line by line. Each event is a JSON object on a line prefixed with `data: `.

**Event types the backend sends:**

```
data: {"type": "tool_call", "name": "get_order"}
→ Frontend shows: "📦 get_order  [running...]"

data: {"type": "tool_result", "name": "get_order", "summary": "Alice Johnson · shipped · ORD-1001"}
→ Frontend updates card: "📦 get_order · Alice Johnson · shipped · ORD-1001 ▼"

data: {"type": "text", "content": "Hi Alice! "}
data: {"type": "text", "content": "Your order is"}
data: {"type": "text", "content": " on its way!"}
→ Frontend appends text character by character — user sees it appear live

data: {"type": "done"}
→ Frontend finalises the message bubble
```

**The Agentic Loop**

Inside `app.py`, the loop handles multi-step tool use:

```
① Send message to Claude with tools defined
② Stream response:
     - If text delta → send to frontend
     - If tool_call → announce to frontend
③ Stream ends. Check stop_reason:
     - "end_turn" → send done, return
     - "tool_use" → execute every tool, send results to frontend
④ Add tool results to message history
⑤ Go back to ① — Claude now has tool results and continues
```

This loop runs up to 6 times, meaning Claude can chain together multiple tool calls in a single response. For example, a customer asking "show me all orders for the same account as ORD-1001" would trigger:
1. `get_order("ORD-1001")` → gets customer_id C001
2. `get_orders_by_customer("C001")` → gets all orders for Alice

The user sees both tool calls appear in real time, then the final formatted response.

---

## 9. What Claude Makes Dramatically Easier

### Removing Code Nobody Wants to Write

| Traditional requirement | What replaces it |
|---|---|
| Intent detection (NLP model or regex rules) | Claude understands natural language natively |
| Command parser for slash commands | A `.md` filename in `.claude/commands/` |
| Tool dispatch layer (map name → function) | `@mcp.tool()` decorator |
| Audit logging middleware | One hook script (33 lines) |
| Security validation middleware | One hook script (70 lines) |
| Conversation transcript archiving | One hook script (35 lines) |
| Multi-turn context management | Claude handles this natively |
| Tool result parsing and re-injection | MCP protocol handles this automatically |
| Response formatting rules | Written in plain English in CLAUDE.md |
| Escalation ticket numbering | One function in the MCP server |

### Automatic Reasoning

In a traditional chatbot, you write rules: "if the user mentions a tracking number, look up the order." With Claude, you never write that rule. Claude reads the knowledge base and conversation, decides what tool to call, calls it, and writes the response — all on its own. If the first tool result is not enough, it calls another tool without being told to.

### Natural Language Business Rules

In CLAUDE.md, the business rules are written like this:
```
- Billing disputes over $500: always escalate
- Premium tier customers get priority handling
- Return window: 30 days from delivery
```

Claude applies these rules consistently in every conversation. You do not write any if/else logic for them. If the rules change, you change one file.

### Everything Is Auditable

Because of the hooks, you know:
- Every question every customer asked (queries.log)
- Every tool Claude used (tool_audit.log)
- When every session started and ended (session.log)
- The full transcript of every conversation (logs/transcripts/)

This would take significant engineering effort to build into a traditional system. Here it was 4 shell scripts.

---

## 10. Summary

This project demonstrates that Claude, when used with Hooks, Skills, and MCP, is not just a chatbot. It is a programmable agent that can be wired into a real production system.

**Hooks** give you automatic event handling — logging, security, archiving — without building middleware.

**Skills** give you reproducible, documented workflows — slash commands that carry business logic encoded as plain English.

**MCP** gives you a live data bridge — Claude can read from and write to a real database, with typed inputs and safe execution, with a few Python functions and a decorator.

**Together**, they replace hundreds of lines of boilerplate, remove entire categories of infrastructure, and let you describe what the system should do rather than writing every step of how it does it.

The result is a production-grade AI support system with:
- 4 automatic hook behaviours (logging, security, audit, archiving)
- 4 custom slash commands (order lookup, KB search, escalation, summary)
- 6 live database tools (query + write to PostgreSQL)
- A modern 6-page React dashboard
- A streaming AI chat with real-time tool visibility

Built in a single session, in a single directory, with 2,124 lines of code.

---

*Report prepared for: TechStore AI Customer Support Project*
*Stack: Python 3.12 · PostgreSQL 16 · FastAPI · React 18 · Vite · Tailwind CSS · Claude claude-sonnet-4-6 · MCP 1.27.2*
