# Admin support

`/admin/support` is protected by manager authentication and shows the support queue.

Read:

- `docs/ADMIN_SETUP.md` for login, sessions and first manager creation;
- `docs/SUPPORT_CHAT.md` for the AI → manager workflow.

States:

- `AI`: assistant may answer;
- `WAITING_OPERATOR`: user requested a manager, AI stops;
- `OPERATOR`: manager owns the dialog;
- `CLOSED`: conversation is archived.
