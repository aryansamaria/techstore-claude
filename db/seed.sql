-- Seed data — mirrors what was in the JSON files.
-- Safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO customers (id, name, email, tier, joined, phone) VALUES
    ('C001', 'Alice Johnson', 'alice@example.com', 'premium',  '2023-01-15', '+1-555-0101'),
    ('C002', 'Bob Smith',     'bob@example.com',   'standard', '2024-03-22', '+1-555-0102'),
    ('C003', 'Carol White',   'carol@example.com', 'premium',  '2022-11-08', '+1-555-0103'),
    ('C004', 'Dan Brown',     'dan@example.com',   'standard', '2025-06-01', '+1-555-0104')
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, customer_id, status, placed_at, tracking, carrier, estimated_delivery, delivered_at, cancelled_at, return_reason, return_requested_at, refund_status, refund_eta) VALUES
    ('ORD-1001', 'C001', 'shipped',          '2026-05-28', '1Z999AA10123456784', 'UPS', '2026-06-04', NULL,         NULL,         NULL,                     NULL,         NULL,      NULL),
    ('ORD-1002', 'C002', 'processing',       '2026-06-01', NULL,                 NULL,  '2026-06-05', NULL,         NULL,         NULL,                     NULL,         NULL,      NULL),
    ('ORD-1003', 'C003', 'delivered',        '2026-05-20', '1Z999AA10987654321', 'UPS', '2026-05-25', '2026-05-24', NULL,         NULL,                     NULL,         NULL,      NULL),
    ('ORD-1004', 'C001', 'return_requested', '2026-05-10', '1Z999AA10555666777', 'UPS', NULL,         NULL,         NULL,         'Defective — keys sticking', '2026-06-01', NULL,   NULL),
    ('ORD-1005', 'C004', 'cancelled',        '2026-05-30', NULL,                 NULL,  NULL,         NULL,         '2026-05-31', NULL,                     NULL,         'pending', '2026-06-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (order_id, sku, name, qty, price) VALUES
    ('ORD-1001', 'LAPTOP-PRO-15',  'ProBook Laptop 15"',           1, 1299.99),
    ('ORD-1002', 'HEADPHONES-BT',  'SoundMax Bluetooth Headphones', 1,   89.99),
    ('ORD-1002', 'CABLE-USB-C',    'USB-C Charging Cable 2m',       2,   12.99),
    ('ORD-1003', 'MONITOR-4K-27',  'UltraView 27" 4K Monitor',      1,  549.00),
    ('ORD-1004', 'KEYBOARD-MECH',  'MechaType Pro Keyboard',        1,  149.00),
    ('ORD-1005', 'TABLET-10',      'SlateTab 10" Tablet',           1,  399.00);

INSERT INTO knowledge_base (id, title, tags, content) VALUES
    ('KB001', 'Return & Refund Policy',
     ARRAY['returns', 'refund', 'policy', 'money back'],
     'TechStore accepts returns within 30 days of delivery for most items. Items must be in original packaging and undamaged. To initiate a return: (1) Use /escalate or contact support, (2) Receive a prepaid return label via email within 24 hours, (3) Ship the item back, (4) Refund processed within 5-7 business days of receiving the item. Exceptions: Software licenses and opened consumables are non-refundable. Defective items can be returned at any time within the 1-year warranty period.'),

    ('KB002', 'Shipping & Delivery Information',
     ARRAY['shipping', 'delivery', 'tracking', 'fedex', 'ups'],
     'Standard shipping (5-7 business days): Free on orders over $50, $4.99 otherwise. Expedited shipping (2-3 business days): $9.99. Overnight (1 business day): $24.99. Tracking numbers are emailed once the order ships, typically within 1-2 business days of placing the order. Orders placed before 2pm ET on business days ship same day. We ship via UPS and FedEx.'),

    ('KB003', 'Warranty Claims',
     ARRAY['warranty', 'defective', 'repair', 'broken', 'malfunction'],
     'All TechStore products carry a 1-year limited warranty against manufacturing defects. To file a warranty claim: (1) Have your order number and proof of purchase ready, (2) Describe the defect clearly, (3) Support will issue an RMA number, (4) Ship the defective item to our service center, (5) Repaired or replacement unit ships within 10 business days. Extended warranty (2 additional years) available for $29.99 per item.'),

    ('KB004', 'Account & Payment Issues',
     ARRAY['account', 'payment', 'billing', 'charge', 'credit card'],
     'Accepted payment methods: Visa, Mastercard, Amex, Discover, PayPal, and TechStore Gift Cards. For unauthorized charges, contact your bank first, then reach out to us with the transaction ID. Order charges appear on your statement as TECHSTORE INC. If your card was declined, check: sufficient funds, billing address matches card, card is not expired. For billing disputes over $500, our billing team will contact you within 48 hours.'),

    ('KB005', 'Password Reset & Login Help',
     ARRAY['password', 'login', 'account', 'access', 'locked'],
     'To reset your password: visit techstore.com/reset and enter your email. You will receive a reset link within 5 minutes (check spam folder). If your account is locked after 5 failed attempts, it unlocks automatically after 30 minutes. For email address changes, contact support with your current email, new email, and order number as verification.'),

    ('KB006', 'Product Compatibility',
     ARRAY['compatible', 'compatibility', 'works with', 'support', 'requirements'],
     'Before purchasing accessories, check the product page for compatibility notes. For laptops: chargers are model-specific unless listed as universal. For cables: we sell both USB-A and USB-C variants — check your device ports. Headphones with 3.5mm jack work on any device with a headphone port; Bluetooth headphones support A2DP and work with any Bluetooth 4.0+ device.')
ON CONFLICT (id) DO NOTHING;
