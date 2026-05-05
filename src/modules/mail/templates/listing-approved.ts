export interface ListingApprovedEmailContext {
  traderName: string;
  productName: string;
  listingUrl: string;
  year: number;
}

export function htmlListingApprovedEmail(ctx: ListingApprovedEmailContext): string {
  return `
<div style="background-color:#030712;padding:40px 16px;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:12px;padding:40px;border:1px solid #1e293b;">
    <div style="color:#3b82f6;font-size:22px;font-weight:800;margin-bottom:32px;">Elex</div>
    <div style="color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 12px;">Your listing is live!</div>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Hi ${ctx.traderName}, your listing is now visible to verified traders on Elex Exchange.
    </p>
    <div style="background-color:#0a1628;border-left:3px solid #3b82f6;border-radius:0 6px 6px 0;padding:14px 16px;margin:0 0 24px;">
      <span style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;display:block;">Listing</span>
      <span style="color:#f1f5f9;font-size:16px;font-weight:600;margin:0;display:block;">${ctx.productName}</span>
    </div>
    <a href="${ctx.listingUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:14px;">View Listing</a>
    <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0 20px;" />
    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">
      &copy; ${ctx.year} Elex. All rights reserved.
    </p>
  </div>
</div>`.trim();
}

export function textListingApprovedEmail(ctx: ListingApprovedEmailContext): string {
  return [
    'Elex Exchange — Your listing is live!',
    '',
    `Hi ${ctx.traderName},`,
    '',
    'Your listing is now visible to verified traders on Elex Exchange.',
    '',
    `Listing: ${ctx.productName}`,
    '',
    `View your listing: ${ctx.listingUrl}`,
    '',
    `© ${ctx.year} Elex. All rights reserved.`,
  ].join('\n');
}
