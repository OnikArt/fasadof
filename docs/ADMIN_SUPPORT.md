# Admin support

`/admin/support` is a hidden route for the support dashboard concept. It is not linked in primary navigation.

## States

- `AI`: assistant may answer.
- `WAITING_FOR_OPERATOR`: user requested a manager; AI stops.
- `OPERATOR`: human operator owns the dialog.
- `CLOSED`: conversation is archived.

## Required production work

- Add real authentication.
- Add operator roles.
- Persist chat sessions and messages.
- Show page URL, source and UTM.
- Store customer contact data separately.
- Add reply, close, takeover and return-to-AI backend actions.

Do not treat the current placeholder page as production-secure.
