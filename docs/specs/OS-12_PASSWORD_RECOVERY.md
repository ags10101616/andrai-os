# OS-12 — Password Recovery, Supabase Auth SSR

**Issue:** A recovery email opened http://localhost:3000 and Chrome showed ERR_CONNECTION_REFUSED. The Supabase project Site URL was not configured for a deployed app.

## Code implemented
- /recuperar-acceso accepts an email and calls Supabase resetPasswordForEmail, with account-enumeration-safe feedback.
- /auth/confirm?token_hash=...&type=recovery exchanges the one-time token via verifyOtp, sets SSR Auth cookies, then redirects to /restablecer-contrasena without forwarding the token.
- /restablecer-contrasena accepts 12–128 character matching passwords from a verified session, calls updateUser, signs out and redirects to /login.
- No passwords or tokens are stored in GitHub or logs, and no service-role key is used.

## Required Supabase Dashboard updates (owner action)
These Auth settings are not editable through the linked Supabase tools.
1. Open the ANDRAI OS project at https://supabase.com/dashboard/project/zzpmjuzwoshxibknyopi/auth/url-configuration
2. Under Authentication → URL Configuration, set Site URL, with NO trailing slash:
   https://andrai-os-git-feature-os-12-ags10101616s-projects.vercel.app
   WARNING: This applies to ALL emails in the ANDRAI OS Supabase project that lack a redirect override.
3. Add a Redirect URL for:
   https://andrai-os-git-feature-os-12-ags10101616s-projects.vercel.app/auth/confirm
4. Open Authentication → Email Templates → Reset Password:
   https://supabase.com/dashboard/project/zzpmjuzwoshxibknyopi/auth/templates
5. Edit the Reset Password template button link to exactly:
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
   Preserve the double-brace variables exactly; this is Supabase's documented server-side token-hash method.
6. Save Auth settings. Request a NEW email using ANDRAI OS /recuperar-acceso; the old localhost link is not suitable.
7. The ANDRAI OS preview is protected by Vercel Authentication. Open its authorized share link FIRST in the same browser/profile that will open the recovery email. Only then click the new email link.
8. Enter the new password on the confirmed recovery page. It will sign out so the new password can be used by José Luis in his OWN browser.
9. Use browser takeover for the dot's login; never disclose the password, reset link or OTP via chat.

## Verification limits
- CI lint, tests, typecheck and build must pass on the final branch commit.
- Protected preview signed-out page and invalid token should show safe UI / redirect; real reset cannot be automatically tested without a private email token.
- No Auth URL change or email-template mutation was performed via the assistant; explicit human dashboard action is required.
- OS10 global kill switch and all commercial write flags remain disabled.
- Draft PR; no production promotion.