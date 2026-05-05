export interface OtpEmailContext {
  name: string;
  otp: string;
  expiresInMinutes: number;
  year: number;
}

export function htmlOtpEmail(ctx: OtpEmailContext): string {
  return `
<div style="background-color:#030712;padding:40px 16px;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:12px;padding:40px;border:1px solid #1e293b;">
    <div style="color:#3b82f6;font-size:22px;font-weight:800;margin-bottom:32px;">Elex</div>
    <div style="color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 12px;">Verify your identity</div>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${ctx.name}, use the code below to complete your verification.
    </p>
    <div style="background-color:#0a1628;border:1px solid #1e293b;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px;">
      <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#3b82f6;font-family:'Courier New',monospace;display:block;">${ctx.otp}</span>
      <span style="color:#94a3b8;font-size:12px;margin-top:8px;display:block;">Expires in ${ctx.expiresInMinutes} minutes</span>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
      If you didn't request this code, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0 20px;" />
    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">
      &copy; ${ctx.year} Elex. All rights reserved.
    </p>
  </div>
</div>`.trim();
}

export function textOtpEmail(ctx: OtpEmailContext): string {
  return [
    'Elex — Verify your identity',
    '',
    `Hi ${ctx.name},`,
    '',
    `Your verification code is: ${ctx.otp}`,
    `This code expires in ${ctx.expiresInMinutes} minutes.`,
    '',
    "If you didn't request this, ignore this email.",
    '',
    `© ${ctx.year} Elex. All rights reserved.`,
  ].join('\n');
}
