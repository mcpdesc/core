# Releasing

Releases are maintainer-controlled. Creating or pushing a tag and publishing to
npm each require an explicit decision; validation alone does not authorize a
release.

## Prerequisites

- Use Node.js 24 and npm 11.5.1 or later. Trusted publishing requires Node.js
  22.14.0 or later and npm 11.5.1 or later.
- Start from a clean `main` checkout whose required `Validate` check has passed.
- Confirm that `origin` points to `https://github.com/mcpdesc/core` or an
  equivalent SSH URL for that repository.
- Confirm that the package version is unused on npm and matches the intended Git
  tag in the form `v<version>`.
- Record user-visible changes in `CHANGELOG.md` and keep `ROADMAP.md` aligned
  with the work actually delivered.

## Prepare and inspect

From the repository root:

```bash
npm ci
npm run check
npm pack --workspace @mcpdesc/core --dry-run
```

Review the package metadata, dependency versions, packed files, package size,
license, notices, provenance records, and public API. Do not publish if the
packed contents differ from the files enforced by `check:package`.

Commit the release preparation, open a pull request with the required
AI-assistance disclosure when applicable, and merge only after required checks
and review pass.

## Configure npm publishing

The `publish.yml` workflow runs on GitHub-hosted infrastructure and requests an
OIDC identity token. For an existing npm package, configure its trusted
publisher with these exact values:

- organization: `mcpdesc`;
- repository: `core`;
- workflow filename: `publish.yml`;
- allowed action: `npm publish`.

Trusted publishing automatically generates provenance for a public package in a
public repository. After verifying it works, disallow token-based publishing in
the npm package settings.

Version `0.1.0` was published manually to bootstrap the npm package. The package
now trusts the `publish.yml` GitHub Actions workflow; do not configure an npm
token or `NPM_TOKEN` repository secret for later releases.

## Release

After an explicit maintainer decision to tag and publish:

```bash
git tag -s v<version> -m "Release @mcpdesc/core <version>"
git push origin v<version>
```

The tag starts `publish.yml`. The workflow verifies that the tag and package
versions agree and that the tagged commit is the current `origin/main` tip. It
installs from the lockfile without a dependency cache, runs the full check, and
publishes the workspace package publicly with provenance. Never reuse or move a
release tag after publication.

## Verify

After the workflow succeeds:

```bash
npm view @mcpdesc/core@<version> version dist.integrity dist.tarball
npm install --ignore-scripts @mcpdesc/core@<version>
npm audit signatures
```

Confirm the npm provenance links to the expected GitHub repository, workflow,
tag, and commit. Create the corresponding GitHub release from the changelog,
then update `CHANGELOG.md` and `ROADMAP.md` if the published outcome differs
from the release preparation.
