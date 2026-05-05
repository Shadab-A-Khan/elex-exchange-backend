export interface AccountStatusEmailContext {
  name: string;
  companyName: string;
  status: 'ACTIVE' | 'SUSPENDED';
  dashboardUrl: string;
  year: number;
}

export function htmlAccountStatusEmail(ctx: AccountStatusEmailContext): string {
  const isActive = ctx.status === 'ACTIVE';
  const heading = isActive
    ? 'Your trader account is now active'
    : 'Your trader account has been suspended';
  const message = isActive
    ? `${ctx.companyName} has been approved and is now active on Elex Exchange. You can post WTS and WTB listings, connect with other traders via WhatsApp, and manage your trader dashboard.`
    : `${ctx.companyName} has been suspended on Elex Exchange. If you believe this is an error, please contact our support team.`;
  const statusColor = isActive ? '#10b981' : '#ef4444';
  const statusLabel = isActive ? 'ACTIVE' : 'SUSPENDED';

  return `
<div style="background-color:#030712;padding:40px 16px;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:12px;padding:40px;border:1px solid #1e293b;">
    <div style="color:#3b82f6;font-size:22px;font-weight:800;margin-bottom:32px;">Elex</div>
    <div style="color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 12px;">${heading}</div>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px;">${message}</p>
    <div style="background-color:#0a1628;border:1px solid #1e293b;border-radius:8px;padding:16px;margin:0 0 24px;">
      <span style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:6px;">Account Status</span>
      <span style="color:${statusColor};font-size:16px;font-weight:700;display:block;">${statusLabel}</span>
    </div>${isActive ? `
    <a href="${ctx.dashboardUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:14px;">Go to Dashboard</a>` : ''}
    <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0 20px;" />
    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">
      &copy; ${ctx.year} Elex. All rights reserved.
    </p>
  </div>
</div>`.trim();
}

export function textAccountStatusEmail(ctx: AccountStatusEmailContext): string {
  const isActive = ctx.status === 'ACTIVE';
  const lines = [
    `Elex Exchange — Account ${isActive ? 'Activated' : 'Suspended'}`,
    '',
    `Hi ${ctx.name},`,
    '',
    isActive
      ? `${ctx.companyName} has been approved and is now active on Elex Exchange.`
      : `${ctx.companyName} has been suspended on Elex Exchange. If you believe this is an error, please contact our support team.`,
    '',
    `Account Status: ${ctx.status}`,
  ];
  if (isActive) {
    lines.push('', `Go to your dashboard: ${ctx.dashboardUrl}`);
  }
  lines.push('', `© ${ctx.year} Elex. All rights reserved.`);
  return lines.join('\n');
}
