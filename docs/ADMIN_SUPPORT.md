# Admin support

`/admin/support` is protected by manager authentication and shows the support queue.

Read:

- `docs/ADMIN_SETUP.md` for login, sessions and first manager creation;
- `docs/SUPPORT_CHAT.md` for the automatic responder → manager workflow.

States:

- `AUTO`: the local knowledge-base responder may answer;
- `WAITING_OPERATOR`: the user requested a manager, automatic replies stop;
- `OPERATOR`: manager owns the dialog;
- `CLOSED`: conversation is archived.
