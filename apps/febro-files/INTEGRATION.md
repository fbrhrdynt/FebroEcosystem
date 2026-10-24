# CMS document integration

The deployed Files installation is `/opt/febro-files`; its tracked source is
`/opt/febro-ecosystem/apps/febro-files`. Preserve deployment-specific environment
and data when synchronizing application source.

CMS uploads use the existing `/api/integrations/v1/files` service bridge and
`FEBRO_PROFILE_SERVICE_TOKEN`, which can access only the
`service:febro-profile` account. Upload, metadata, preview, download and trash
routes do not expose vault paths or grant access to personal files.

Private document email links retain `https://files.febro.id/access#<token>`.
The browser exchanges the fragment for an HttpOnly, SameSite Strict cookie,
then removes it from browser history. Every listing, preview and download calls
CMS `POST /api/integrations/files/v1/grant` with `{tokenHash}` using the separate
`FILES_CMS_SERVICE_TOKEN`. The CMS response contains request id, expiration and
only currently permitted files. Files additionally enforces its own account
ownership and active/trash state. No direct CMS database access is used.

Set `FEBRO_CMS_API_URL=http://127.0.0.1:3090` and a random secret of at least 48
characters as `FILES_CMS_SERVICE_TOKEN` in both applications' protected environment
files. HTTP authority URLs must use loopback; HTTPS is also supported. Redirects
are rejected. Missing credentials or unavailable CMS authority fail closed.
There is no grant cache; revocation takes effect on the next request. File preview
and download actions are recorded in the Files audit log without tokens.

Existing attachment records and vault objects require no migration. CMS remains
responsible for its existing local attachment fallback and all authorization rules.

Run `npm run check` and `npm test`. The integration suite uses isolated databases
and a mock CMS authority; it never sends production emails or accesses private
production documents.

Febro One uses its own `FEBRO_ONE_FILES_SERVICE_TOKEN` and `service:febro-one`
owner through the same bridge routes. Upload parameters are `kind=attachment`,
`entry=<One record UUID>`, and `name=<filename>`. CMS and One tokens cannot read or
modify one another's objects. One must authorize its own user/record access before
calling the bridge, and retain its local attachment fallback.
