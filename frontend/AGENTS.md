<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Authentication uses Lovable Cloud auth (email/password) via `AuthProvider` in `src/lib/auth-context.tsx`; n8n never handles passwords or sessions. Protected pages wrap in `ProtectedRoute`.
- App data goes to n8n over REST via native fetch (`src/api/client.ts`, base `VITE_API_BASE_URL`); every call sends the auth access token as Bearer and `auth_user_id` (auth user.id) so n8n can scope data.
- The shared visual system is dark Crimson Night with Sora headings and Manrope body text, supporting CareerAgent's learning-first identity.
