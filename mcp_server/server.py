#!/usr/bin/env python3
"""
TechStore MCP Server
====================
This file IS the MCP server. Claude Code starts it as a subprocess
and talks to it over stdin/stdout using the Model Context Protocol.

Every @mcp.tool() function below becomes a tool Claude can call directly —
just like Read, Write, or Bash, but backed by a real PostgreSQL database.

Transport: stdio (Claude Code <-> this process via stdin/stdout JSON-RPC)
"""

import os
import json
from decimal import Decimal
from datetime import date, datetime

import psycopg2
import psycopg2.extras
from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Server setup
# ---------------------------------------------------------------------------

mcp = FastMCP("techstore-support")

# DATABASE_URL is injected by Claude Code via the env block in settings.json.
# Default falls back to a local socket connection (no password needed on Ubuntu).
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:localdev@localhost/techstore")


def get_conn():
    """Open a fresh psycopg2 connection. Caller must close it."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def serialize(obj):
    """
    Make psycopg2 results JSON-safe.
    psycopg2 returns Decimal for NUMERIC columns and date/datetime for DATE/TIMESTAMP.
    Neither is JSON-serializable by default — this converts them.
    """
    if isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize(v) for v in obj]
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    return obj


# ---------------------------------------------------------------------------
# Tools — each one maps to a real DB query
# ---------------------------------------------------------------------------

@mcp.tool()
def get_order(order_id: str) -> dict:
    """
    Look up a single order by ID (e.g. 'ORD-1001').
    Returns the order row, all its items, and the linked customer profile.

    Returns {"found": false} if no order matches.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM orders WHERE UPPER(id) = UPPER(%s)",
                (order_id,)
            )
            order = cur.fetchone()
            if not order:
                return {"found": False, "order_id": order_id}

            cur.execute(
                "SELECT sku, name, qty, price FROM order_items WHERE order_id = %s",
                (order["id"],)
            )
            items = cur.fetchall()

            cur.execute(
                "SELECT * FROM customers WHERE id = %s",
                (order["customer_id"],)
            )
            customer = cur.fetchone()

        return serialize({
            "found": True,
            "order": dict(order),
            "items": [dict(i) for i in items],
            "customer": dict(customer) if customer else None,
        })
    finally:
        conn.close()


@mcp.tool()
def get_customer(customer_id: str) -> dict:
    """
    Look up a customer profile by their ID (e.g. 'C001').
    Returns {"found": false} if not found.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM customers WHERE UPPER(id) = UPPER(%s)",
                (customer_id,)
            )
            row = cur.fetchone()
        if not row:
            return {"found": False, "customer_id": customer_id}
        return serialize({"found": True, "customer": dict(row)})
    finally:
        conn.close()


@mcp.tool()
def get_orders_by_customer(customer_id: str) -> dict:
    """
    Return all orders placed by a given customer, newest first.
    Each order includes its line items as a nested list.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    o.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'sku', oi.sku,
                                'name', oi.name,
                                'qty', oi.qty,
                                'price', oi.price
                            )
                        ) FILTER (WHERE oi.id IS NOT NULL),
                        '[]'
                    ) AS items
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE UPPER(o.customer_id) = UPPER(%s)
                GROUP BY o.id
                ORDER BY o.placed_at DESC
                """,
                (customer_id,)
            )
            rows = cur.fetchall()
        return serialize({"found": bool(rows), "orders": [dict(r) for r in rows]})
    finally:
        conn.close()


@mcp.tool()
def search_kb(query: str) -> dict:
    """
    Full-text search the knowledge base.

    Uses PostgreSQL's to_tsvector / plainto_tsquery for ranked results.
    Falls back to ILIKE if the query contains no recognisable English tokens
    (e.g. a single special character or very short term).

    Returns up to 3 articles, ranked by relevance.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Primary: use the pre-computed fts_vector generated column + GIN index.
            # Tags are matched separately via the ANY operator (no array_to_string needed).
            cur.execute(
                """
                SELECT id, title, content, tags,
                    ts_rank(fts_vector, plainto_tsquery('english', %s)) AS rank
                FROM knowledge_base
                WHERE fts_vector @@ plainto_tsquery('english', %s)
                   OR %s ILIKE ANY(tags)
                ORDER BY rank DESC
                LIMIT 3
                """,
                (query, query, query)
            )
            rows = cur.fetchall()

            # Fallback: ILIKE substring match on title/content when FTS finds nothing
            if not rows:
                cur.execute(
                    """
                    SELECT id, title, content, tags, 0.0 AS rank
                    FROM knowledge_base
                    WHERE title   ILIKE %s
                       OR content ILIKE %s
                    ORDER BY id
                    LIMIT 3
                    """,
                    (f"%{query}%", f"%{query}%")
                )
                rows = cur.fetchall()

        return serialize({
            "found": bool(rows),
            "query": query,
            "articles": [dict(r) for r in rows],
        })
    finally:
        conn.close()


@mcp.tool()
def create_escalation(
    priority: str,
    reason: str,
    conversation_summary: str,
    suggested_actions: list[str] | None = None,
    customer_tier: str | None = None,
) -> dict:
    """
    Persist an escalation ticket to the database.

    priority must be one of: "urgent", "high", "normal"

    Returns the new ticket_id and the expected wait time for the customer.
    """
    ticket_id = f"ESC-{int(datetime.now().timestamp())}"
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO escalation_tickets
                    (ticket_id, priority, reason, conversation_summary, suggested_actions, customer_tier)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, ticket_id, created_at
                """,
                (
                    ticket_id,
                    priority,
                    reason,
                    conversation_summary,
                    json.dumps(suggested_actions or []),
                    customer_tier,
                )
            )
            row = cur.fetchone()
        conn.commit()

        wait = {"urgent": "within 1 hour", "high": "2–4 hours", "normal": "next business day"}
        return serialize({
            "ticket_id": ticket_id,
            "db_id": row["id"],
            "created_at": row["created_at"],
            "priority": priority,
            "estimated_wait": wait.get(priority, "unknown"),
        })
    finally:
        conn.close()


@mcp.tool()
def save_ticket_summary(
    issue: str,
    resolution_status: str,
    actions_taken: list[str] | None = None,
    customer_sentiment: str = "neutral",
    follow_up_required: bool = False,
    follow_up_notes: str | None = None,
) -> dict:
    """
    Save a structured end-of-conversation summary to the database.

    resolution_status: "resolved" | "in_progress" | "escalated" | "unresolved"
    customer_sentiment: "positive" | "neutral" | "frustrated" | "very_frustrated"
    """
    summary_id = f"SUM-{int(datetime.now().timestamp())}"
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ticket_summaries
                    (summary_id, issue, resolution_status, actions_taken,
                     customer_sentiment, follow_up_required, follow_up_notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
                """,
                (
                    summary_id,
                    issue,
                    resolution_status,
                    json.dumps(actions_taken or []),
                    customer_sentiment,
                    follow_up_required,
                    follow_up_notes,
                )
            )
            row = cur.fetchone()
        conn.commit()

        return serialize({
            "summary_id": summary_id,
            "db_id": row["id"],
            "created_at": row["created_at"],
            "saved": True,
        })
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # transport="stdio" means Claude Code talks to us via stdin/stdout.
    # This is the default for local MCP servers registered in settings.json.
    mcp.run(transport="stdio")
