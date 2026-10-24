# SSO risk assessment

Production rollout is blocked until the controls below pass in isolated application copies.

| Severity | Evidence / risk | Required control |
|---|---|---|
| Critical | VoltLab Google callback attaches subject to matching-email user; Lamariva trusts Google linking | Explicit recent local reauthentication + fresh central login, consent, CSRF and transactional unique identity link. Disable implicit linking in isolated adapters |
| Critical | Files account primary key is legacy subject; issuer change can orphan files | Never rewrite accounts.sub or node/share ownership. Link (issuer,subject) to existing accounts.sub after both ownership proofs |
| High | Current central issuer differs from requested eco /profile; host-only sessions differ | New issuer is https://eco.febro.id/profile; mount provider alongside profile. Keep legacy provider operational during migration; no cookie Domain widening |
| High | Handwritten OIDC/JWT implementations; no revocation/end-session | Use maintained provider and RP library, validate issuer/audience/nonce/signature/expiry/PKCE, rotate persistent keys and cookie signing keys |
| High | Itinerary local login already disabled | Restore original password login with CSRF/rate limit and session regeneration in isolated copy; preserve bcrypt hashes, never reset passwords |
| High | New issuer could grant admin based on central email/claims | Resolve to existing local ID and preserve local policy. No role/permissions mapping from external claims; new accounts get existing least-privilege defaults and reserved-admin protections |
| High | Profile/Google cross-host return handling | Same-host provider interaction using real central session; no URL bearer ticket bridge added. Bound safe return destination, interaction lifetime and CSRF |
| High | Source schemas may differ from live DB | Read-only metadata comparison and consistency-verified encrypted backups before migrations; no production-row tests |
| Medium | Play anonymous cookie is long-lived credential | Fresh central login plus explicit current guest-cookie proof for optional claim; identity conflicts never overwrite/merge runs. Preserve old player IDs and run history |
| Medium | Logout from IdP does not automatically end local sessions | Local logout always revokes local session; explicit central logout option; short session/revalidation policy and later authenticated backchannel logout |
| Medium | Global Nginx request logging includes query values | Disable/sanitize auth callback logs and referers per app before rollout; never log token responses, codes, secrets, full request URLs |

No live migrations, destructive tests or authentication changes are authorized by this document. Stop migration on ID mismatch, unexpected ownership changes, conflicting identity links, backup verification failure, or role drift. Diagnose offline with synthetic data.
