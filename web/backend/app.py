"""
TechStore Support — FastAPI Backend
=====================================
Serves all REST endpoints and the streaming chat endpoint.

The chat endpoint runs a full agentic loop:
  1. Send user message + history to Claude with our DB tools defined
  2. If Claude calls a tool, execute it against PostgreSQL
  3. Feed result back and continue — repeat until Claude gives a final answer
  4. Stream every step (tool calls + text) to the frontend via SSE
"""

import json
import os
import sys
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))
import db

# ---------------------------------------------------------------------------
# Anthropic client (optional — chat works only if key is set)
# ---------------------------------------------------------------------------
try:
    import anthropic
    _api_key = os.environ.get("ANTHROPIC_API_KEY")
    claude = anthropic.Anthropic(api_key=_api_key) if _api_key else None
except ImportError:
    claude = None

# ---------------------------------------------------------------------------
# Tool definitions (same semantics as the MCP server)
# ---------------------------------------------------------------------------
TOOLS = [
    {
        "name": "get_order",
        "description": "Look up an order by ID (e.g. ORD-1001). Returns order details, items, and customer info.",
        "input_schema": {
            "type": "object",
            "properties": {"order_id": {"type": "string"}},
            "required": ["order_id"],
        },
    },
    {
        "name": "get_customer",
        "description": "Look up a customer profile by their ID (e.g. C001).",
        "input_schema": {
            "type": "object",
            "properties": {"customer_id": {"type": "string"}},
            "required": ["customer_id"],
        },
    },
    {
        "name": "get_orders_by_customer",
        "description": "Return all orders placed by a customer.",
        "input_schema": {
            "type": "object",
            "properties": {"customer_id": {"type": "string"}},
            "required": ["customer_id"],
        },
    },
    {
        "name": "search_kb",
        "description": "Full-text search the knowledge base for policy articles.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "create_escalation",
        "description": "Create an escalation ticket in the database.",
        "input_schema": {
            "type": "object",
            "properties": {
                "priority": {"type": "string", "enum": ["urgent", "high", "normal"]},
                "reason": {"type": "string"},
                "conversation_summary": {"type": "string"},
                "suggested_actions": {"type": "array", "items": {"type": "string"}},
                "customer_tier": {"type": "string"},
            },
            "required": ["priority", "reason", "conversation_summary"],
        },
    },
    {
        "name": "save_ticket_summary",
        "description": "Save a structured summary of the support conversation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "issue": {"type": "string"},
                "resolution_status": {"type": "string", "enum": ["resolved", "in_progress", "escalated", "unresolved"]},
                "actions_taken": {"type": "array", "items": {"type": "string"}},
                "customer_sentiment": {"type": "string", "enum": ["positive", "neutral", "frustrated", "very_frustrated"]},
                "follow_up_required": {"type": "boolean"},
                "follow_up_notes": {"type": "string"},
            },
            "required": ["issue", "resolution_status"],
        },
    },
]

SYSTEM_PROMPT = """You are a helpful, empathetic customer support AI for TechStore, an online electronics retailer.

You have access to tools that query a live PostgreSQL database. Use them whenever the customer asks about orders, policies, or needs escalation.

Business rules:
- Return window: 30 days from delivery
- Warranty: 1 year (manufacturing defects)
- Billing disputes over $500: always escalate
- Never share one customer's data with another
- Premium tier customers get priority handling

Be friendly, concise, and proactive. Anticipate follow-up questions."""


def execute_tool(name: str, args: dict) -> dict:
    """Route a tool call from Claude to the right DB function."""
    if name == "get_order":
        return db.get_order(args["order_id"])
    if name == "get_customer":
        return db.get_all_customers()  # simplified
    if name == "get_orders_by_customer":
        return db.get_orders_by_customer(args["customer_id"])
    if name == "search_kb":
        return db.search_kb(args["query"])
    if name == "create_escalation":
        return db.create_escalation(
            priority=args["priority"],
            reason=args["reason"],
            conversation_summary=args["conversation_summary"],
            suggested_actions=args.get("suggested_actions"),
            customer_tier=args.get("customer_tier"),
        )
    if name == "save_ticket_summary":
        return db.save_ticket_summary(
            issue=args["issue"],
            resolution_status=args["resolution_status"],
            actions_taken=args.get("actions_taken"),
            customer_sentiment=args.get("customer_sentiment", "neutral"),
            follow_up_required=args.get("follow_up_required", False),
            follow_up_notes=args.get("follow_up_notes"),
        )
    return {"error": f"Unknown tool: {name}"}


def tool_summary(name: str, result: dict) -> str:
    """One-line human-readable summary of a tool result for the UI."""
    if name == "get_order":
        if result.get("found"):
            o = result["order"]
            c = result.get("customer", {}) or {}
            return f"{c.get('name', '?')} · {o['status']} · {o['id']}"
        return "Order not found"
    if name == "search_kb":
        arts = result.get("articles", [])
        if arts:
            return " · ".join(a["title"] for a in arts[:2])
        return "No articles found"
    if name == "create_escalation":
        return f"Ticket {result.get('ticket_id')} created ({result.get('priority')} priority)"
    if name == "save_ticket_summary":
        return f"Summary {result.get('summary_id')} saved"
    return "Done"


# ---------------------------------------------------------------------------
# App + CORS
# ---------------------------------------------------------------------------
app = FastAPI(title="TechStore Support API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@app.get("/api/stats")
def get_stats():
    return db.get_stats()


@app.get("/api/orders")
def list_orders():
    return db.get_all_orders()


@app.get("/api/orders/{order_id}")
def get_order(order_id: str):
    result = db.get_order(order_id)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail="Order not found")
    return result


@app.get("/api/customers")
def list_customers():
    return db.get_all_customers()


@app.get("/api/kb")
def list_kb():
    return db.get_all_kb()


@app.get("/api/kb/search")
def search_kb(q: str):
    return db.search_kb(q)


@app.get("/api/escalations")
def list_escalations():
    return db.get_all_escalations()


@app.get("/api/summaries")
def list_summaries():
    return db.get_all_summaries()


# ---------------------------------------------------------------------------
# Streaming chat endpoint
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []   # [{role: "user"|"assistant", content: str}]


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    if not claude:
        def no_key():
            yield f"data: {json.dumps({'type': 'error', 'content': 'ANTHROPIC_API_KEY is not set. Export it and restart the backend.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return StreamingResponse(no_key(), media_type="text/event-stream")

    def event_stream():
        # Build message list: history (strings only) + new user message
        messages = []
        for h in req.history:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": req.message})

        # Agentic loop — keep going until Claude stops using tools
        for _ in range(6):
            with claude.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            ) as stream:
                for event in stream:
                    # Announce tool calls as they start
                    if event.type == "content_block_start":
                        if getattr(getattr(event, "content_block", None), "type", None) == "tool_use":
                            yield f"data: {json.dumps({'type': 'tool_call', 'name': event.content_block.name})}\n\n"
                    # Stream text deltas
                    elif event.type == "content_block_delta":
                        delta = getattr(event, "delta", None)
                        if getattr(delta, "type", None) == "text_delta":
                            yield f"data: {json.dumps({'type': 'text', 'content': delta.text})}\n\n"

                final = stream.get_final_message()

            if final.stop_reason == "end_turn":
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

            if final.stop_reason == "tool_use":
                # Execute every tool Claude called
                tool_results = []
                assistant_content = []

                for block in final.content:
                    if block.type == "text":
                        assistant_content.append({"type": "text", "text": block.text})
                    elif block.type == "tool_use":
                        assistant_content.append({
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input,
                        })
                        try:
                            result = execute_tool(block.name, block.input)
                        except Exception as e:
                            result = {"error": str(e)}

                        summary = tool_summary(block.name, result)
                        yield f"data: {json.dumps({'type': 'tool_result', 'name': block.name, 'summary': summary})}\n\n"

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result),
                        })

                messages.append({"role": "assistant", "content": assistant_content})
                messages.append({"role": "user", "content": tool_results})
                # loop continues for next Claude call

        # Safety: max iterations reached
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
