Look up the order with ID: $ARGUMENTS

Call the `get_order` MCP tool with order_id="$ARGUMENTS".

The tool returns a JSON object with three keys: order, items, customer.

Present the result in a friendly customer-support tone:

1. Greet by customer name. If tier is "premium", add "💼 Premium member — prioritising your request."
2. Show order status using these friendly labels:
   - shipped           → "On Its Way 🚚"
   - processing        → "Being Prepared"
   - delivered         → "Delivered ✓"
   - return_requested  → "Return in Progress"
   - cancelled         → "Cancelled"
3. List each item: name × qty @ $price
4. Show tracking number + carrier, or "Not yet assigned" if null
5. Show estimated delivery or delivered date
6. If status is return_requested, show return_reason and return_requested_at
7. If status is cancelled, show refund_status and refund_eta

If found=false, say: "I couldn't find an order with that ID. Could you double-check? It should look like ORD-1001."
