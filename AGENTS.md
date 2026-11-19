<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
## Architecture rules
- Casemix formulas, aggregation, insights and CSV live as pure functions in `src/lib/casemix.ts` (tested in `casemix.test.ts`); UI never re-implements a formula. Why: one source of truth for numbers shown in dashboard, report and exports.
- Login is username-based: usernames map to internal `<username>@casemix.local` auth emails; public signup is disabled and accounts are created only by Admin via server functions in `src/lib/accounts.functions.ts`. Why: hospital staff log in with handles, not emails.
- Roles live in `user_roles`, per-account checkboxes in `user_permissions`; field-level input rights are enforced by the `enforce_patient_permissions` DB trigger, not only by hiding inputs. Why: hidden inputs alone can be bypassed.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate redirects to `/`, the login page). Why: session is in browser storage.
- Patient list refreshes live via a realtime subscription (`usePatientsLive`). Why: team members on other devices see changes immediately.
<!-- AGENT-MEMORY:END -->
