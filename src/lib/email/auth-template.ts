type AuthAction = 'signup' | 'magiclink' | 'invite' | 'recovery' | 'email_change' | 'reauthentication';
const copy: Record<AuthAction, { label: string; title: string; body: string; button: string }> = {
 signup: { label: 'YOUR WORKSPACE STARTS HERE', title: 'A clearer perspective.\nStarts with you.', body: 'Confirm your email to create your RELAY account. Enter the code below in the window you left open.', button: 'Confirm your email' },
 magiclink: { label: 'YOUR SECURE SIGN-IN', title: 'Back to your network.', body: 'Your suppliers. Your documents. Your next step. Enter this code in RELAY to sign in.', button: 'Sign in to RELAY' },
 invite: { label: 'A NEW CONNECTION', title: 'Good information.\nBetter together.', body: 'You have been invited to RELAY. Confirm your email to continue to your invitation.', button: 'Continue to RELAY' },
 recovery: { label: 'YOUR SECURE SIGN-IN', title: 'Back to your workspace.', body: 'Use this code to regain access to your RELAY account. Enter it in the window you left open.', button: 'Continue securely' },
 email_change: { label: 'ACCOUNT SECURITY', title: 'Your email.\nConfirmed.', body: 'Confirm this email address for your RELAY account using the code below.', button: 'Confirm email address' },
 reauthentication: { label: 'ACCOUNT SECURITY', title: 'One more step.\nMade secure.', body: 'Enter this verification code in RELAY to confirm it is you and continue.', button: '' },
};
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Table layout and inline styles keep the hierarchy intact in Outlook and Gmail. */
export function renderAuthEmail({ action, code, url }: { action: AuthAction; code: string; url?: string }) {
 const content = copy[action];
 const ink = '#101113';
 return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>RELAY — ${escape(content.label)}</title><style>
 body{margin:0!important;padding:0!important}table{border-collapse:collapse}a{color:inherit}a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
 @media(max-width:600px){.content{padding:32px 24px!important}.headline{font-size:36px!important}.code{font-size:30px!important;letter-spacing:3px!important}.top-space{height:42px!important}.footer-space{height:40px!important}}
 </style></head><body style="margin:0;padding:0;background:#ffffff;color:${ink};font-family:Helvetica Neue,Helvetica,Arial,sans-serif">
 <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escape(content.body)} Your one-time verification code is inside.</div>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff"><tr><td align="center">
 <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px"><tr><td class="content" style="padding:48px 40px">
 <table role="presentation" width="100%"><tr><td><a href="https://relay.vovere-studios.com" style="color:${ink};text-decoration:none;font-size:32px;font-weight:600;letter-spacing:-1.8px;line-height:1">relay<span style="font-size:22px;letter-spacing:0"> ↗</span></a></td><td align="right" style="font-size:10px;line-height:1.5;letter-spacing:1px;color:#6b6c70">THE CONNECTED<br>WORKSPACE</td></tr></table>
 <table role="presentation" width="100%"><tr><td class="top-space" height="64" style="height:64px"></td></tr></table>
 <p style="margin:0 0 18px;color:#686a70;font-size:10px;line-height:1.5;font-weight:500;letter-spacing:1.5px">${escape(content.label)}</p>
 <h1 class="headline" style="margin:0 0 24px;color:${ink};font-size:44px;line-height:1.08;font-weight:500;letter-spacing:-1.8px">${escape(content.title).replace(/\n/g, '<br>')}</h1>
 <p style="margin:0 0 32px;color:#575a60;font-size:16px;line-height:1.65;max-width:440px">${escape(content.body)}</p>
 <table role="presentation" width="100%" style="border-top:1px solid ${ink};border-bottom:1px solid ${ink}"><tr><td style="padding:20px 0 8px;font-size:10px;letter-spacing:1.2px;color:#686a70">YOUR VERIFICATION CODE</td></tr><tr><td class="code" style="padding:0 0 20px;color:${ink};font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:${code.length > 8 ? '32' : '40'}px;font-weight:500;letter-spacing:5px;line-height:1.3;font-variant-numeric:tabular-nums">${escape(code)}</td></tr></table>
 <p style="margin:16px 0 28px;color:#686a70;font-size:12px;line-height:1.6">One-time use. Valid for a short time.<br>Keep this code private. RELAY will never ask you to share it.</p>
 ${url ? `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="${ink}" style="background:${ink};border-radius:8px;text-align:center;mso-padding-alt:16px 24px"><a href="${escape(url)}" style="display:inline-block;background:${ink};border:1px solid ${ink};border-radius:8px;padding:16px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;line-height:20px">${escape(content.button)}&nbsp; ↗</a></td></tr></table><p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#686a70">Or continue using the secure link above.</p>` : ''}
 <p style="margin:28px 0 0;color:#686a70;font-size:12px;line-height:1.6">If you did not request this email, you can safely ignore it.</p>
 <table role="presentation" width="100%"><tr><td class="footer-space" height="56" style="height:56px"></td></tr><tr><td style="border-top:1px solid #dedfe1;padding-top:22px">
 <table role="presentation" width="100%"><tr><td style="font-size:12px;color:#575a60;line-height:1.6"><a href="https://relay.vovere-studios.com" style="color:${ink};text-decoration:none">relay.vovere-studios.com ↗</a><br><a href="mailto:admin@vovere-studios.com" style="color:#575a60;text-decoration:none">Need help? Reply to this email.</a></td></tr></table>
 <p style="margin:32px 0 12px;color:#686a70;font-size:10px;letter-spacing:1px;line-height:1.5">A PRODUCT OF</p>
 <a href="https://vovere-studios.com" style="text-decoration:none"><img src="https://relay.vovere-studios.com/brand/vovere-wordmark-email.png" width="152" alt="VOVERE Studios" style="display:block;width:152px;max-width:100%;height:auto;border:0"></a>
 </td></tr></table></td></tr></table></td></tr></table></body></html>`;
}
