export function generateReceiptHTML(params: {
  receiptNumber: string
  professionalName: string
  specialty: string
  professionalPhone?: string
  patientName: string
  patientEmail?: string
  appointmentDate: string
  appointmentTime: string
  amount: number
  currency: string
  paymentMethod: string
  paymentMethodLabel: string
  notes?: string
  generatedAt: string
}): string {
  const currencySymbol = params.currency === 'USD' ? 'U$S' : '$'
  const amountFormatted = params.amount.toLocaleString('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo ${params.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background: white;
      padding: 40px;
      font-size: 14px;
      line-height: 1.5;
    }

    .receipt {
      max-width: 560px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid #1a1a1a;
    }

    .brand {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #1a1a1a;
    }

    .receipt-meta {
      text-align: right;
    }

    .receipt-number {
      font-size: 13px;
      font-weight: 600;
      color: #1a1a1a;
      letter-spacing: 0.5px;
    }

    .receipt-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 40px;
    }

    .party-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #999;
      margin-bottom: 8px;
    }

    .party-name {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .party-detail {
      font-size: 13px;
      color: #555;
      line-height: 1.6;
    }

    .concept-section {
      background: #f7f7f7;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 32px;
    }

    .concept-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e8e8e8;
    }

    .concept-row:last-child {
      border-bottom: none;
    }

    .concept-label {
      font-size: 13px;
      color: #555;
    }

    .concept-value {
      font-size: 13px;
      font-weight: 500;
      color: #1a1a1a;
    }

    .total-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      background: #1a1a1a;
      border-radius: 8px;
      margin-bottom: 32px;
    }

    .total-label {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .total-amount {
      font-size: 28px;
      font-weight: 700;
      color: white;
      letter-spacing: -0.5px;
    }

    .total-currency {
      font-size: 14px;
      font-weight: 400;
      color: rgba(255,255,255,0.6);
      margin-right: 6px;
    }

    .payment-badge {
      display: inline-block;
      padding: 6px 14px;
      border: 1px solid #e0e0e0;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      color: #444;
      margin-bottom: 32px;
    }

    .notes-section {
      padding: 16px;
      border-left: 3px solid #e0e0e0;
      margin-bottom: 32px;
    }

    .notes-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #999;
      margin-bottom: 6px;
    }

    .notes-text {
      font-size: 13px;
      color: #555;
      line-height: 1.6;
    }

    .footer {
      border-top: 1px solid #e8e8e8;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-brand {
      font-size: 12px;
      color: #999;
    }

    .footer-date {
      font-size: 11px;
      color: #bbb;
    }

    .validity-note {
      font-size: 11px;
      color: #bbb;
      text-align: center;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="receipt">

    <div class="header">
      <div class="brand">Vydre</div>
      <div class="receipt-meta">
        <div class="receipt-label">Comprobante de pago</div>
        <div class="receipt-number">${params.receiptNumber}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-label">Emisor</div>
        <div class="party-name">${escapeHtml(params.professionalName)}</div>
        <div class="party-detail">
          ${escapeHtml(params.specialty)}
          ${params.professionalPhone ? `<br>${escapeHtml(params.professionalPhone)}` : ''}
        </div>
      </div>
      <div class="party">
        <div class="party-label">Paciente</div>
        <div class="party-name">${escapeHtml(params.patientName)}</div>
        <div class="party-detail">
          ${params.patientEmail ? escapeHtml(params.patientEmail) : ''}
        </div>
      </div>
    </div>

    <div class="concept-section">
      <div class="concept-row">
        <span class="concept-label">Concepto</span>
        <span class="concept-value">Consulta médica</span>
      </div>
      <div class="concept-row">
        <span class="concept-label">Fecha de consulta</span>
        <span class="concept-value">${escapeHtml(params.appointmentDate)}</span>
      </div>
      <div class="concept-row">
        <span class="concept-label">Hora</span>
        <span class="concept-value">${escapeHtml(params.appointmentTime)}</span>
      </div>
    </div>

    <div class="total-section">
      <span class="total-label">Total</span>
      <div>
        <span class="total-currency">${currencySymbol}</span>
        <span class="total-amount">${amountFormatted}</span>
      </div>
    </div>

    <div>
      <span class="payment-badge">
        Forma de pago: ${escapeHtml(params.paymentMethodLabel)}
      </span>
    </div>

    ${params.notes ? `
    <div class="notes-section">
      <div class="notes-label">Notas</div>
      <div class="notes-text">${escapeHtml(params.notes)}</div>
    </div>
    ` : ''}

    <div class="footer">
      <span class="footer-brand">Vydre · vydre.com</span>
      <span class="footer-date">Emitido el ${escapeHtml(params.generatedAt)}</span>
    </div>

    <div class="validity-note">
      Este comprobante fue generado digitalmente por Vydre.
    </div>

  </div>
</body>
</html>
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
