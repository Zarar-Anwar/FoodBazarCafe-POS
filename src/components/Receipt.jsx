import { money, formatTime, formatPhone } from '../utils/format';

export default function Receipt({ order, settings, id = 'receipt-print' }) {
  const sym = settings?.currency_symbol || 'Rs';
  if (!order) return null;

  const taxAmount = Number(order.tax_amount) || 0;
  const showTax = taxAmount > 0 && Number(order.tax_rate) > 0;

  return (
    <div
      id={id}
      className="receipt-print-root bg-white text-black p-5 font-mono max-w-sm mx-auto"
    >
      <div className="text-center border-b-2 border-dashed border-black pb-3 mb-3">
        <p className="font-black text-xl uppercase tracking-wide">
          {settings?.restaurant_name || 'Food Bazar Cafe'}
        </p>
        {settings?.tagline && <p className="text-sm font-semibold mt-1">{settings.tagline}</p>}
        <p className="text-sm mt-1">{settings?.address || 'Dargai Phattak MKD'}</p>
        <p className="text-sm">
          {formatPhone(settings?.phone || '03173451369')}
        </p>
      </div>
      <p className="text-sm font-bold">Order: {order.order_number}</p>
      <p className="text-sm mb-2">{formatTime(order.created_at)}</p>
      <p className="text-sm capitalize mb-1 font-semibold">
        {order.order_type}
        {order.table_number ? ` · Table ${order.table_number}` : ''}
      </p>
      {(order.customer_name || order.customer_phone) && (
        <p className="text-sm mb-3">
          {order.customer_name}
          {order.customer_phone ? ` · ${formatPhone(order.customer_phone)}` : ''}
        </p>
      )}
      <div className="border-t-2 border-dashed border-black pt-2 space-y-2">
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between gap-3 text-sm font-bold">
            <span>
              {item.product_name} × {item.quantity}
            </span>
            <span className="whitespace-nowrap">{money(item.line_total, sym)}</span>
          </div>
        ))}
      </div>
      <div className="border-t-2 border-dashed border-black mt-3 pt-2 space-y-1 text-sm font-bold">
        {order.discount > 0 && (
          <>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(order.subtotal, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{money(order.discount, sym)}</span>
            </div>
          </>
        )}
        {showTax && (
          <div className="flex justify-between">
            <span>
              {settings?.tax_label || 'Tax'} ({order.tax_rate}%)
            </span>
            <span>{money(order.tax_amount, sym)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-lg pt-2">
          <span>TOTAL</span>
          <span>{money(order.total, sym)}</span>
        </div>
        {order.payment_status === 'unpaid' ? (
          <div className="flex justify-between font-black pt-2">
            <span>STATUS</span>
            <span>UNPAID</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between capitalize pt-1">
              <span>Paid ({order.payment_method})</span>
              <span>{money(order.amount_paid ?? order.total, sym)}</span>
            </div>
            {order.change_due > 0 && (
              <div className="flex justify-between">
                <span>Change</span>
                <span>{money(order.change_due, sym)}</span>
              </div>
            )}
          </>
        )}
      </div>
      <p className="text-center text-sm font-bold mt-5 pt-3 border-t-2 border-dashed border-black">
        {order.payment_status === 'unpaid'
          ? 'Kitchen chit · Bill pending'
          : 'Thank You For Order'}
      </p>
    </div>
  );
}
