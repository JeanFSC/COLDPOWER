import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const queries = {
  counts: `
    select
      (select count(*)::int from customers) as customers,
      (select count(*)::int from opportunities) as opportunities,
      (select count(*)::int from quotes) as quotes,
      (select count(*)::int from sales) as sales,
      (select count(*)::int from sale_items) as sale_items,
      (select count(*)::int from orders) as orders,
      (select count(*)::int from order_items) as order_items,
      (select count(*)::int from payments) as payments,
      (select count(*)::int from payment_refunds) as payment_refunds,
      (select count(*)::int from audit_logs) as audit_logs
  `,
  salesByStatus: "select status::text as status, count(*)::int as total from sales group by status order by status",
  ordersByStatus: "select status::text as status, count(*)::int as total from orders group by status order by status",
  paymentsByStatus: "select status::text as status, count(*)::int as total from payments group by status order by status",
  customersByStatus: "select status::text as status, count(*)::int as total, count(canonical_customer_id)::int as canonical_links from customers group by status order by status",
  currencyMismatches: `
    select
      (select count(*)::int from sale_items si join sales s on s.id = si.sale_id where si.currency <> s.currency) as sale_items_currency_mismatch,
      (select count(*)::int from order_items oi join orders o on o.id = oi.order_id where oi.currency <> o.currency) as order_items_currency_mismatch,
      (select count(*)::int from payments p join orders o on o.id = p.order_id where p.currency <> o.currency) as payments_currency_mismatch
  `,
  relationshipMismatches: `
    select
      (select count(*)::int from orders o join sales s on s.id = o.sale_id where o.customer_id <> s.customer_id) as order_sale_customer_mismatch,
      (select count(*)::int from orders o join sales s on s.id = o.sale_id where o.currency <> s.currency) as order_sale_currency_mismatch,
      (select count(*)::int from orders o where not exists (select 1 from order_items oi where oi.order_id = o.id)) as orders_without_items,
      (select count(*)::int from sales s where not exists (select 1 from sale_items si where si.sale_id = s.id)) as sales_without_items,
      (select count(*)::int from payments p where not exists (select 1 from payment_status_history h where h.payment_id = p.id)) as payments_without_history
  `,
  invalidValues: `
    select
      (select count(*)::int from sales where subtotal < 0 or discount_amount < 0 or total < 0) as sales_negative_amounts,
      (select count(*)::int from sale_items where quantity <= 0 or unit_price < 0 or discount_amount < 0 or line_total < 0) as sale_items_invalid_values,
      (select count(*)::int from orders where subtotal < 0 or discount_amount < 0 or total < 0) as orders_negative_amounts,
      (select count(*)::int from order_items where quantity <= 0 or picked_quantity < 0 or picked_quantity > quantity or unit_price < 0 or line_total < 0) as order_items_invalid_values,
      (select count(*)::int from payments where amount <= 0) as payments_invalid_amounts,
      (select count(*)::int from payment_refunds where amount <= 0) as refunds_invalid_amounts,
      (select count(*)::int from inventory_balances where on_hand < 0 or reserved < 0 or reserved > on_hand) as inventory_invalid_balances,
      (select count(*)::int from inventory_reservations where quantity <= 0) as inventory_invalid_reservations
  `,
  auditByEntity: "select entity_type, count(*)::int as total from audit_logs group by entity_type order by entity_type",
  historyCounts: `
    select
      (select count(*)::int from order_status_history) as order_status_history,
      (select count(*)::int from payment_status_history) as payment_status_history,
      (select count(*)::int from opportunity_stage_history) as opportunity_stage_history
  `,
  migrationTail: "select id, hash from drizzle.__drizzle_migrations order by id desc limit 5",
};

try {
  const result = {};
  for (const [name, statement] of Object.entries(queries)) {
    const response = await pool.query(statement);
    result[name] = response.rows;
  }
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`${error.name}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
