"""
Shared database helpers used by both the MCP server and the FastAPI web backend.
All queries return plain dicts/lists with JSON-safe types (no Decimal, no date objects).
"""

import os
import json
from decimal import Decimal
from datetime import date, datetime
from typing import Any

import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:localdev@localhost/techstore"
)


def get_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def serialize(obj: Any) -> Any:
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
# Read queries
# ---------------------------------------------------------------------------

def get_stats() -> dict:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS n FROM customers")
            customers = cur.fetchone()["n"]
            cur.execute("SELECT COUNT(*) AS n FROM orders")
            orders = cur.fetchone()["n"]
            cur.execute("SELECT COUNT(*) AS n FROM escalation_tickets")
            escalations = cur.fetchone()["n"]
            cur.execute("SELECT COUNT(*) AS n FROM knowledge_base")
            kb = cur.fetchone()["n"]
            cur.execute("SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY n DESC")
            status_dist = {r["status"]: r["n"] for r in cur.fetchall()}
            cur.execute("""
                SELECT ticket_id, priority, reason, created_at, status
                FROM escalation_tickets ORDER BY created_at DESC LIMIT 5
            """)
            recent_esc = [dict(r) for r in cur.fetchall()]
        return serialize({
            "total_customers": customers,
            "total_orders": orders,
            "total_escalations": escalations,
            "kb_articles": kb,
            "order_status_distribution": status_dist,
            "recent_escalations": recent_esc,
        })
    finally:
        conn.close()


def get_all_orders() -> list:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT o.*,
                    c.name AS customer_name,
                    c.tier AS customer_tier,
                    c.email AS customer_email,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'sku', oi.sku, 'name', oi.name,
                                'qty', oi.qty, 'price', oi.price::float
                            )
                        ) FILTER (WHERE oi.id IS NOT NULL),
                        '[]'
                    ) AS items
                FROM orders o
                LEFT JOIN customers c ON c.id = o.customer_id
                LEFT JOIN order_items oi ON oi.order_id = o.id
                GROUP BY o.id, c.name, c.tier, c.email
                ORDER BY o.placed_at DESC
            """)
            return serialize([dict(r) for r in cur.fetchall()])
    finally:
        conn.close()


def get_order(order_id: str) -> dict:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM orders WHERE UPPER(id) = UPPER(%s)", (order_id,))
            order = cur.fetchone()
            if not order:
                return {"found": False, "order_id": order_id}
            cur.execute("SELECT sku, name, qty, price FROM order_items WHERE order_id = %s", (order["id"],))
            items = cur.fetchall()
            cur.execute("SELECT * FROM customers WHERE id = %s", (order["customer_id"],))
            customer = cur.fetchone()
        return serialize({
            "found": True,
            "order": dict(order),
            "items": [dict(i) for i in items],
            "customer": dict(customer) if customer else None,
        })
    finally:
        conn.close()


def get_all_customers() -> list:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.*,
                    COUNT(o.id) AS order_count
                FROM customers c
                LEFT JOIN orders o ON o.customer_id = c.id
                GROUP BY c.id
                ORDER BY c.joined DESC
            """)
            return serialize([dict(r) for r in cur.fetchall()])
    finally:
        conn.close()


def get_orders_by_customer(customer_id: str) -> dict:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT o.*,
                    COALESCE(
                        json_agg(json_build_object(
                            'sku', oi.sku, 'name', oi.name,
                            'qty', oi.qty, 'price', oi.price::float
                        )) FILTER (WHERE oi.id IS NOT NULL),
                        '[]'
                    ) AS items
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE UPPER(o.customer_id) = UPPER(%s)
                GROUP BY o.id
                ORDER BY o.placed_at DESC
            """, (customer_id,))
            rows = cur.fetchall()
        return serialize({"found": bool(rows), "orders": [dict(r) for r in rows]})
    finally:
        conn.close()


def get_all_kb() -> list:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, title, tags, content FROM knowledge_base ORDER BY id")
            return serialize([dict(r) for r in cur.fetchall()])
    finally:
        conn.close()


def search_kb(query: str) -> dict:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, title, content, tags,
                    ts_rank(fts_vector, plainto_tsquery('english', %s)) AS rank
                FROM knowledge_base
                WHERE fts_vector @@ plainto_tsquery('english', %s)
                   OR %s ILIKE ANY(tags)
                ORDER BY rank DESC LIMIT 3
            """, (query, query, query))
            rows = cur.fetchall()
            if not rows:
                cur.execute("""
                    SELECT id, title, content, tags, 0.0 AS rank
                    FROM knowledge_base
                    WHERE title ILIKE %s OR content ILIKE %s
                    ORDER BY id LIMIT 3
                """, (f"%{query}%", f"%{query}%"))
                rows = cur.fetchall()
        return serialize({"found": bool(rows), "query": query, "articles": [dict(r) for r in rows]})
    finally:
        conn.close()


def get_all_escalations() -> list:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM escalation_tickets
                ORDER BY created_at DESC
            """)
            return serialize([dict(r) for r in cur.fetchall()])
    finally:
        conn.close()


def get_all_summaries() -> list:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM ticket_summaries ORDER BY created_at DESC")
            return serialize([dict(r) for r in cur.fetchall()])
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Write queries
# ---------------------------------------------------------------------------

def create_escalation(
    priority: str,
    reason: str,
    conversation_summary: str,
    suggested_actions: list | None = None,
    customer_tier: str | None = None,
) -> dict:
    ticket_id = f"ESC-{int(datetime.now().timestamp())}"
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO escalation_tickets
                    (ticket_id, priority, reason, conversation_summary, suggested_actions, customer_tier)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, ticket_id, created_at
            """, (ticket_id, priority, reason, conversation_summary,
                  json.dumps(suggested_actions or []), customer_tier))
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


def save_ticket_summary(
    issue: str,
    resolution_status: str,
    actions_taken: list | None = None,
    customer_sentiment: str = "neutral",
    follow_up_required: bool = False,
    follow_up_notes: str | None = None,
) -> dict:
    summary_id = f"SUM-{int(datetime.now().timestamp())}"
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ticket_summaries
                    (summary_id, issue, resolution_status, actions_taken,
                     customer_sentiment, follow_up_required, follow_up_notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (summary_id, issue, resolution_status,
                  json.dumps(actions_taken or []), customer_sentiment,
                  follow_up_required, follow_up_notes))
            row = cur.fetchone()
        conn.commit()
        return serialize({"summary_id": summary_id, "db_id": row["id"],
                          "created_at": row["created_at"], "saved": True})
    finally:
        conn.close()
