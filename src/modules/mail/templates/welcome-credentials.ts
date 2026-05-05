export interface WelcomeCredentialsEmailContext {
  traderName: string;
  businessName: string;
  email: string;
  password: string;
  loginUrl: string;
  year: number;
}

export function htmlWelcomeCredentialsEmail(ctx: WelcomeCredentialsEmailContext): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f0;padding:48px 16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

      <tr>
        <td style="padding-bottom:36px;text-align:center;">
          <span style="font-size:20px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#0a0a0a;">ELEX</span>
        </td>
      </tr>

      <tr>
        <td style="background-color:#ffffff;border:1px solid #e8e8e4;padding:48px;">

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:36px;border-bottom:1px solid #ebebeb;">
                <p style="color:#9a9a8e;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px;">Welcome</p>
                <h1 style="color:#0a0a0a;font-size:24px;font-weight:300;line-height:1.4;margin:0 0 12px;letter-spacing:-0.3px;">Hello, ${ctx.traderName}</h1>
                <p style="color:#6b6b63;font-size:14px;line-height:1.7;margin:0;">${ctx.businessName} has been registered on Elex Exchange. Your account is ready.</p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;">
            <tr>
              <td style="padding-bottom:28px;">
                <p style="color:#9a9a8e;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Login Credentials</p>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                  <tr>
                    <td style="background-color:#fafaf8;border:1px solid #ebebeb;padding:16px 20px;">
                      <p style="color:#9a9a8e;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 6px;">Email</p>
                      <p style="color:#0a0a0a;font-size:14px;font-family:'Courier New',Courier,monospace;margin:0;">${ctx.email}</p>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#fafaf8;border:1px solid #ebebeb;border-left:3px solid #0a0a0a;padding:16px 20px;">
                      <p style="color:#9a9a8e;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 6px;">Temporary Password</p>
                      <p style="color:#0a0a0a;font-size:16px;font-family:'Courier New',Courier,monospace;font-weight:700;letter-spacing:1px;margin:0;">${ctx.password}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
            <tr>
              <td style="background-color:#fafaf8;border:1px solid #ebebeb;padding:16px 20px;">
                <p style="color:#6b6b63;font-size:12px;line-height:1.6;margin:0;">Change this password after your first login. Keep your credentials private and do not share them with anyone.</p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
            <tr>
              <td>
                <a href="${ctx.loginUrl}" style="display:inline-block;background-color:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Access Dashboard</a>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-top:1px solid #ebebeb;padding-top:24px;">
                <p style="color:#b4b4aa;font-size:11px;margin:0;">&copy; ${ctx.year} Elex. All rights reserved.</p>
              </td>
            </tr>
          </table>

        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`.trim();
}

export function textWelcomeCredentialsEmail(ctx: WelcomeCredentialsEmailContext): string {
  return [
    'ELEX EXCHANGE',
    '',
    `Hello, ${ctx.traderName}`,
    '',
    `${ctx.businessName} has been registered on Elex Exchange. Your account is ready.`,
    '',
    'LOGIN CREDENTIALS',
    `Email:    ${ctx.email}`,
    `Password: ${ctx.password}`,
    '',
    'Change this password after your first login.',
    '',
    `Access your dashboard: ${ctx.loginUrl}`,
    '',
    `© ${ctx.year} Elex. All rights reserved.`,
  ].join('\n');
}
