-- Pot Stories — order finalisation
--
-- public.finalize_order(p_order_id, p_payment) atomically:
--   1. locks the order row;
--   2. returns early if it is already finalised (idempotent);
--   3. locks the inventory rows for the order's variants (in variant_id order,
--      so concurrent finalisations cannot deadlock);
--   4. if any variant lacks stock, records the payment but leaves
--      orders.status unchanged and decrements nothing;
--   5. otherwise decrements stock, marks the order processing + paid /
--      demo_not_charged, records the payment and counts the discount
--      redemption.
--
-- p_payment keys:
--   payment_status       (required) 'paid' | 'demo_not_charged'  -> orders.payment_status
--   payment_id           (optional) uuid of an existing public.payments row to update
--   provider             (optional) 'razorpay' | 'demo'; defaults to orders.payment_method
--   provider_order_id    (optional) e.g. Razorpay order_id; also used to find the payments row
--   provider_payment_id  (optional) e.g. Razorpay payment_id
--   status               (optional) payments.status; defaults to 'captured' for paid,
--                        'demo_not_charged' for demo orders
--   amount               (optional) integer rupees; defaults to orders.total
--   currency             (optional) defaults to orders.currency
--   raw                  (optional) provider payload (jsonb)
--
-- Returns one of:
--   {"status":"finalized"}
--   {"status":"already_finalized"}
--   {"status":"insufficient_stock","variant_ids":["<uuid>", ...]}
-- Raises if the order does not exist or payment_status is invalid.
--
-- Executable by service_role only.

create or replace function public.finalize_order(p_order_id uuid, p_payment jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order               public.orders%rowtype;
  v_payment_status      text := p_payment ->> 'payment_status';
  v_payment_id          uuid := nullif(p_payment ->> 'payment_id', '')::uuid;
  v_provider            text;
  v_provider_order_id   text := nullif(p_payment ->> 'provider_order_id', '');
  v_provider_payment_id text := nullif(p_payment ->> 'provider_payment_id', '');
  v_row_status          text;
  v_amount              int;
  v_currency            text;
  v_raw                 jsonb := p_payment -> 'raw';
  v_short               uuid[];
  v_found               boolean := false;
begin
  if p_payment is null or v_payment_status is null
     or v_payment_status not in ('paid', 'demo_not_charged') then
    raise exception 'finalize_order: payment_status must be ''paid'' or ''demo_not_charged'' (got %)',
      coalesce(v_payment_status, 'null')
      using errcode = '22023';
  end if;

  -- 1. lock the order
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'finalize_order: order % not found', p_order_id
      using errcode = 'P0002';
  end if;

  -- 2. idempotency
  if v_order.payment_status in ('paid', 'demo_not_charged') then
    return jsonb_build_object('status', 'already_finalized');
  end if;

  v_provider   := coalesce(nullif(p_payment ->> 'provider', ''), v_order.payment_method);
  v_row_status := coalesce(
                    nullif(p_payment ->> 'status', ''),
                    case when v_payment_status = 'paid' then 'captured' else 'demo_not_charged' end
                  );
  v_amount     := coalesce((p_payment ->> 'amount')::int, v_order.total);
  v_currency   := coalesce(nullif(p_payment ->> 'currency', ''), v_order.currency);

  -- 3. lock inventory rows in a stable order
  perform 1
  from public.inventory i
  where i.variant_id in (
    select oi.variant_id
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.variant_id is not null
  )
  order by i.variant_id
  for update;

  -- 4. stock check (quantities aggregated per variant; a missing inventory
  --    row counts as zero stock)
  select array_agg(need.variant_id order by need.variant_id)
  into v_short
  from (
    select oi.variant_id, sum(oi.quantity)::int as qty
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.variant_id is not null
    group by oi.variant_id
  ) need
  left join public.inventory i on i.variant_id = need.variant_id
  where coalesce(i.quantity, 0) < need.qty;

  -- record the payment (both outcomes): update the matching row, else insert
  if v_payment_id is not null then
    update public.payments p
    set provider_payment_id = coalesce(v_provider_payment_id, p.provider_payment_id),
        provider_order_id   = coalesce(v_provider_order_id, p.provider_order_id),
        status              = v_row_status,
        raw                 = coalesce(v_raw, p.raw)
    where p.id = v_payment_id
      and p.order_id = p_order_id;
    v_found := found;
  elsif v_provider_order_id is not null then
    update public.payments p
    set provider_payment_id = coalesce(v_provider_payment_id, p.provider_payment_id),
        status              = v_row_status,
        raw                 = coalesce(v_raw, p.raw)
    where p.provider_order_id = v_provider_order_id
      and p.order_id = p_order_id;
    v_found := found;
  end if;

  if not v_found then
    insert into public.payments (
      id, order_id, provider, provider_order_id, provider_payment_id,
      amount, currency, status, raw
    )
    values (
      coalesce(v_payment_id, gen_random_uuid()), p_order_id, v_provider, v_provider_order_id,
      v_provider_payment_id, v_amount, v_currency, v_row_status, v_raw
    );
  end if;

  if v_short is not null then
    -- money was taken (or demo confirmed) but stock ran out: record payment
    -- state, keep orders.status as-is for manual follow-up / refund.
    update public.orders
    set payment_status = v_payment_status
    where id = p_order_id;

    return jsonb_build_object('status', 'insufficient_stock', 'variant_ids', to_jsonb(v_short));
  end if;

  -- 5. decrement stock
  update public.inventory i
  set quantity = i.quantity - need.qty
  from (
    select oi.variant_id, sum(oi.quantity)::int as qty
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.variant_id is not null
    group by oi.variant_id
  ) need
  where i.variant_id = need.variant_id;

  update public.orders
  set status = 'processing',
      payment_status = v_payment_status
  where id = p_order_id;

  if v_order.discount_code is not null then
    update public.discount_codes
    set redemptions = redemptions + 1
    where code = upper(v_order.discount_code);
  end if;

  return jsonb_build_object('status', 'finalized');
end;
$$;

revoke execute on function public.finalize_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_order(uuid, jsonb) to service_role;
