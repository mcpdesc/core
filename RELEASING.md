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
- Confirm that the package version is unused on npm and matches its intended Git
  tag: `v<version>` for core or `validator-v<version>` for validator.
- Record user-visible changes in `CHANGELOG.md` and keep `ROADMAP.md` aligned
  with the work actually delivered.

## Prepare and inspect

From the repository root:

```bash
npm ci
npm run check
npm pack --workspace @mcpdesc/core --dry-run
npm pack --workspace @mcpdesc/validator --dry-run
```

Review the package metadata, dependency versions, packed files, package size,
license, notices, provenance records, and public API. Do not publish if the
packed contents differ from the files enforced by `check:package`.

Commit the release preparation, open a pull request with the required
AI-assistance disclosure when applicable, and merge only after required checks
and review pass.

## Configure npm publishing

The `publish.yml` and `publish-validator.yml` workflows run on GitHub-hosted
infrastructure and request OIDC identity tokens. Configure each npm package's
trusted publisher for organization `mcpdesc`, repository `core`, allowed action
`npm publish`, and its corresponding workflow filename.

- `@mcpdesc/core`: `publish.yml`;
- `@mcpdesc/validator`: `publish-validator.yml`.

Trusted publishing automatically generates provenance for a public package in a
public repository. After verifying it works, disallow token-based publishing in
the npm package settings.

Core `0.1.0` was published manually to bootstrap that package. Validator
versions through `0.6.0` were published from the specification repository;
`0.7.0` is the first release maintained here. Do not configure an npm token or
`NPM_TOKEN` repository secret for either package.

## Release

After an explicit maintainer decision to tag and publish:

```bash
git tag -s v<version> -m "Release @mcpdesc/core <version>"
git push origin v<version>

git tag -s validator-v<version> -m "Release @mcpdesc/validator <version>"
git push origin validator-v<version>
```

Each tag starts only its package workflow. The workflow verifies that the tag
and package version agree and that the tagged commit is the current
`origin/main` tip. Core publication runs the full repository check; validator
publication runs the complete validator package suite. Both publish publicly
with provenance. Never reuse or move a release tag after publication.

## Verify

After the workflow succeeds:

```bash
npm view @mcpdesc/core@<version> version dist.integrity dist.tarball
npm install --ignore-scripts @mcpdesc/core@<version>
npm audit signatures

npm view @mcpdesc/validator@<version> version dist.integrity dist.tarball
npm install --ignore-scripts @mcpdesc/validator@<version>
npm audit signatures
```

Confirm the npm provenance links to the expected GitHub repository, workflow,
tag, and commit. Create the corresponding GitHub release from the changelog,
then update `CHANGELOG.md` and `ROADMAP.md` if the published outcome differs
from the release preparation.
