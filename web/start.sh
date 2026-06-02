#!/usr/bin/env bash
# Start both servers. Run from the project root:
#   bash web/start.sh
#
# Backend  → http://localhost:8000  (FastAPI + Claude)
# Frontend → http://localhost:5173  (React + Vite)

set -e
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

export DATABASE_URL="postgresql://postgres:localdev@localhost/techstore"
# export ANTHROPIC_API_KEY="sk-ant-..."  ← set this for the chat to work

echo "Starting FastAPI backend on :8000 ..."
cd "$PROJECT/web/backend"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting Vite frontend on :5173 ..."
cd "$PROJECT/web/frontend"
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
echo ""
echo "  Backend  → http://localhost:8000/docs"
echo "  Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."
wait
