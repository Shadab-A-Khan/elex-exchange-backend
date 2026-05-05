export interface WelcomeEmailContext {
  traderName: string;
  businessName: string;
  loginUrl: string;
  year: number;
}

export function htmlWelcomeEmail(ctx: WelcomeEmailContext): string {
  return `
<div style="background-color:#030712;padding:40px 16px;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:12px;padding:40px;border:1px solid #1e293b;">
    <div style="color:#3b82f6;font-size:22px;font-weight:800;margin-bottom:32px;">Elex</div>
    <div style="color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 12px;">Welcome to Elex Exchange, ${ctx.traderName}!</div>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${ctx.businessName} is now registered on Elex Exchange.
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.8;margin:0;">&bull; Post WTS (want-to-sell) and WTB (want-to-buy) listings</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.8;margin:0;">&bull; Connect with verified traders via WhatsApp</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.8;margin:0 0 24px;">&bull; Manage your trader dashboard from anywhere</p>
    <a href="${ctx.loginUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:14px;">Go to Dashboard</a>
    <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0 20px;" />
    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">
      &copy; ${ctx.year} Elex. All rights reserved.
    </p>
  </div>
</div>`.trim();
}

export function textWelcomeEmail(ctx: WelcomeEmailContext): string {
  return [
    `Welcome to Elex Exchange, ${ctx.traderName}!`,
    '',
    `${ctx.businessName} is now registered on Elex Exchange.`,
    '',
    'What you can do:',
    '• Post WTS (want-to-sell) and WTB (want-to-buy) listings',
    '• Connect with verified traders via WhatsApp',
    '• Manage your trader dashboard from anywhere',
    '',
    `Go to your dashboard: ${ctx.loginUrl}`,
    '',
    `© ${ctx.year} Elex. All rights reserved.`,
  ].join('\n');
}
