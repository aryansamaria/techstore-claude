-- TechStore Support Database Schema
-- Run once to create all tables.

CREATE TABLE IF NOT EXISTS customers (
    id          VARCHAR(10)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    tier        VARCHAR(20)  DEFAULT 'standard',
    joined      DATE,
    phone       VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS orders (
    id                   VARCHAR(20) PRIMARY KEY,
    customer_id          VARCHAR(10) REFERENCES customers(id),
    status               VARCHAR(30) NOT NULL,
    placed_at            DATE,
    tracking             VARCHAR(50),
    carrier              VARCHAR(20),
    estimated_delivery   DATE,
    delivered_at         DATE,
    cancelled_at         DATE,
    return_reason        TEXT,
    return_requested_at  DATE,
    refund_status        VARCHAR(20),
    refund_eta           DATE
);

CREATE TABLE IF NOT EXISTS order_items (
    id        SERIAL      PRIMARY KEY,
    order_id  VARCHAR(20) REFERENCES orders(id) ON DELETE CASCADE,
    sku       VARCHAR(50),
    name      VARCHAR(100),
    qty       INTEGER,
    price     NUMERIC(10, 2)
);

-- Full-text search index on the knowledge base
CREATE TABLE IF NOT EXISTS knowledge_base (
    id         VARCHAR(10)   PRIMARY KEY,
    title      VARCHAR(200)  NOT NULL,
    tags       TEXT[],
    content    TEXT NOT NULL,
    -- fts_vector is a generated column: PostgreSQL recomputes it automatically
    -- whenever title or content changes, and we can index it efficiently.
    -- We exclude tags here because array_to_string is STABLE not IMMUTABLE,
    -- which PostgreSQL requires for index expressions.
    fts_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || content)
    ) STORED,
    created_at TIMESTAMP DEFAULT NOW()
);

-- GIN index on the pre-computed tsvector column — fast FTS lookups
CREATE INDEX IF NOT EXISTS kb_fts_idx ON knowledge_base USING GIN (fts_vector);

-- Written by the /escalate command via create_escalation MCP tool
CREATE TABLE IF NOT EXISTS escalation_tickets (
    id                   SERIAL PRIMARY KEY,
    ticket_id            VARCHAR(20) UNIQUE,
    created_at           TIMESTAMP DEFAULT NOW(),
    priority             VARCHAR(10),
    reason               TEXT,
    conversation_summary TEXT,
    suggested_actions    JSONB,
    customer_tier        VARCHAR(20),
    status               VARCHAR(20) DEFAULT 'open'
);

-- Written by the /ticket-summary command via save_ticket_summary MCP tool
CREATE TABLE IF NOT EXISTS ticket_summaries (
    id                 SERIAL PRIMARY KEY,
    summary_id         VARCHAR(20) UNIQUE,
    created_at         TIMESTAMP DEFAULT NOW(),
    issue              TEXT,
    resolution_status  VARCHAR(20),
    actions_taken      JSONB,
    customer_sentiment VARCHAR(20),
    follow_up_required BOOLEAN,
    follow_up_notes    TEXT
);
