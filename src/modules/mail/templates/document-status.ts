export interface DocumentStatusEmailContext {
  name: string;
  documentType: string;
  status: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  year: number;
}

export function htmlDocumentStatusEmail(ctx: DocumentStatusEmailContext): string {
  const isVerified = ctx.status === 'VERIFIED';
  const heading = isVerified ? 'Document verified' : 'Document requires attention';
  const statusColor = isVerified ? '#10b981' : '#ef4444';
  const statusLabel = isVerified ? 'VERIFIED' : 'REJECTED';
  const message = isVerified
    ? `Your document "${ctx.documentType}" has been reviewed and verified.`
    : `Your document "${ctx.documentType}" has been reviewed and could not be verified.`;

  return `
<div style="background-color:#030712;padding:40px 16px;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:12px;padding:40px;border:1px solid #1e293b;">
    <div style="color:#3b82f6;font-size:22px;font-weight:800;margin-bottom:32px;">Elex</div>
    <div style="color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 12px;">${heading}</div>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px;">Hi ${ctx.name}, ${message}</p>
    <div style="background-color:#0a1628;border-left:3px solid ${statusColor};border-radius:0 6px 6px 0;padding:14px 16px;margin:0 0 24px;">
      <span style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px;">Document</span>
      <span style="color:#f1f5f9;font-size:16px;font-weight:600;display:block;margin-bottom:8px;">${ctx.documentType}</span>
      <span style="color:${statusColor};font-size:13px;font-weight:600;display:block;">Status: ${statusLabel}</span>${ctx.rejectionReason ? `
      <span style="color:#94a3b8;font-size:13px;display:block;margin-top:6px;">Reason: ${ctx.rejectionReason}</span>` : ''}
    </div>${!isVerified ? `
    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">Please upload a new document from your account page.</p>` : ''}
    <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0 20px;" />
    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">
      &copy; ${ctx.year} Elex. All rights reserved.
    </p>
  </div>
</div>`.trim();
}

export function textDocumentStatusEmail(ctx: DocumentStatusEmailContext): string {
  const isVerified = ctx.status === 'VERIFIED';
  const lines = [
    `Elex Exchange — Document ${isVerified ? 'Verified' : 'Rejected'}`,
    '',
    `Hi ${ctx.name},`,
    '',
    `Your document "${ctx.documentType}" has been ${isVerified ? 'verified' : 'rejected'}.`,
  ];
  if (!isVerified && ctx.rejectionReason) {
    lines.push(`Reason: ${ctx.rejectionReason}`);
  }
  if (!isVerified) {
    lines.push('', 'Please upload a new document from your account page.');
  }
  lines.push('', `© ${ctx.year} Elex. All rights reserved.`);
  return lines.join('\n');
}
