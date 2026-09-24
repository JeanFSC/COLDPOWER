import { createDatabasePool } from "./database-pool.mjs";

const fixture = process.env.CP_VISUAL_FIXTURE ?? "cp-visual-year-2026";
const expectedMonths = Array.from({ length: 12 }, (_, index) => `2026-${String(index + 1).padStart(2, "0")}`);
const pool = await createDatabasePool();

async function query(text) {
  const result = await pool.query(text);
  return result.rows;
}

async function main() {
  const [summary, months, methods, paymentStatuses, integrity, settings, workflowStatuses, margin] = await Promise.all([
    query(`
      select
        (select count(*)::int from quotes where id like '${fixture}-quote-%') as quotes,
        (select count(*)::int from opportunities where id like '${fixture}-opportunity-%') as opportunities,
        (select count(*)::int from sales where id like '${fixture}-sale-%') as sales,
        (select count(*)::int from orders where id like '${fixture}-order-%') as orders,
        (select count(*)::int from payments where id like '${fixture}-payment-%') as payments,
        (select count(*)::int from crm_activities where id like '${fixture}-crm-activity-%') as activities,
        (select count(*)::int from crm_tasks where id like '${fixture}-crm-task-%') as tasks,
        (select count(*)::int from audit_logs where correlation_id = '${fixture}') as audits
    `),
    query(`
      select to_char(date_trunc('month', created_at at time zone 'America/Lima'), 'YYYY-MM') as month, count(*)::int as rows, coalesce(sum(total), 0)::numeric as amount
      from sales where id like '${fixture}-sale-%' group by 1 order by 1
    `),
    query(`
      select method, count(*)::int as rows, coalesce(sum(amount), 0)::numeric as amount
      from payments where id like '${fixture}-payment-%' group by method order by method
    `),
    query(`
      select status, count(*)::int as rows
      from payments where id like '${fixture}-payment-%' group by status order by status
    `),
    query(`
      select
        (select count(*)::int from sales s left join quotes q on q.id = s.quote_id where s.id like '${fixture}-sale-%' and q.id is null) as sales_without_quote,
        (select count(*)::int from sales s left join opportunities o on o.id = s.opportunity_id where s.id like '${fixture}-sale-%' and o.id is null) as sales_without_opportunity,
        (select count(*)::int from sales s left join orders o on o.sale_id = s.id where s.id like '${fixture}-sale-%' and o.id is null) as sales_without_order,
        (select count(*)::int from orders o left join payments p on p.order_id = o.id where o.id like '${fixture}-order-%' and p.id is null) as orders_without_payment,
        (select count(*)::int from payments p inner join orders o on o.id = p.order_id where p.id like '${fixture}-payment-%' and (p.amount <> o.total or p.currency <> o.currency)) as payment_mismatches,
        (select count(*)::int from payments p left join payment_status_history h on h.payment_id = p.id where p.id like '${fixture}-payment-%' and h.id is null) as payments_without_history,
        (select count(*)::int from orders o left join order_status_history h on h.order_id = o.id where o.id like '${fixture}-order-%' and h.id is null) as orders_without_history,
        (select count(*)::int from sales s inner join sale_items i on i.sale_id = s.id where s.id like '${fixture}-sale-%' and (i.currency <> s.currency or i.quantity <= 0 or i.line_total <> s.total)) as sale_item_mismatches,
        (select count(*)::int from orders o inner join order_items i on i.order_id = o.id where o.id like '${fixture}-order-%' and (i.currency <> o.currency or i.quantity <= 0 or i.line_total <> o.total)) as order_item_mismatches
    `),
    query("select payment_methods from company_settings where id = 'default'"),
    query(`
      select workflow_status as status, count(*)::int as rows
      from quotes where id like '${fixture}-quote-%'
      group by workflow_status order by workflow_status
    `),
    query(`
      select
        count(*)::int as lines,
        count(*) filter (where i.cost_snapshot is not null)::int as costed_lines,
        coalesce(sum(i.quantity * i.cost_snapshot) filter (where s.status = 'CONFIRMED'), 0)::numeric as confirmed_cost
      from sale_items i
      inner join sales s on s.id = i.sale_id
      where s.id like '${fixture}-sale-%'
    `),
  ]);

  const observedMonths = months.map((row) => row.month);
  const missingMonths = expectedMonths.filter((month) => !observedMonths.includes(month));
  const allowedMethods = ["CREDIT_CARD", "DEBIT_CARD", "YAPE", "PLIN", "CASH"];
  const unexpectedMethods = methods.map((row) => row.method).filter((method) => !allowedMethods.includes(method));
  const failed = integrity[0] && Object.entries(integrity[0]).filter(([, value]) => Number(value) !== 0);
  const requiredWorkflowStatuses = ["CONVERTED", "REJECTED", "EXPIRED"];
  const observedWorkflowStatuses = workflowStatuses.map((row) => row.status);
  const missingWorkflowStatuses = requiredWorkflowStatuses.filter((status) => !observedWorkflowStatuses.includes(status));
  const marginRow = margin[0] ?? {};
  const marginCoverage = Number(marginRow.lines ?? 0) > 0 ? Number(marginRow.costed_lines ?? 0) / Number(marginRow.lines) : 0;
  if (missingMonths.length || unexpectedMethods.length || failed?.length || missingWorkflowStatuses.length || marginCoverage < 1) {
    throw new Error(JSON.stringify({ missingMonths, unexpectedMethods, missingWorkflowStatuses, marginCoverage, integrity }, null, 2));
  }

  console.log(JSON.stringify({ fixture, expectedMonths, observedMonths, summary: summary[0], months, methods, paymentStatuses, workflowStatuses, margin: marginRow, marginCoverage, integrity: integrity[0], companyPaymentMethods: settings[0]?.payment_methods ?? null }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
