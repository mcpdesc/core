# Releasing

Releases are maintainer-controlled. Creating or pushing a tag and publishing to
npm each require an explicit decision; validation alone does not authorize a
release.

Use the `release-assessment` repository skill to determine package scope before
selecting versions. After explicit approval, use the `package-release` skill and
the guarded `release:check` and `release:tag` scripts below.

## Prerequisites

- Use Node.js 24 and npm 11.5.1 or later. Trusted publishing requires Node.js
  22.14.0 or later and npm 11.5.1 or later.
- Authenticate GitHub CLI (`gh`) for the `mcpdesc/core` repository so readiness
  checks can verify required CI jobs.
- Start from a clean `main` checkout whose required `Validate` check has passed.
- Confirm that `origin` points to `https://github.com/mcpdesc/core` or an
  equivalent SSH URL for that repository.
- Confirm that the package version is unused on npm and matches its intended Git
  tag: `v<version>` for core or `validator-v<version>` for validator.
- Record user-visible package behavior and content changes in
  `packages/core/CHANGELOG.md` or `packages/validator/CHANGELOG.md`. Record
  repository structure, maintainer workflow, development script, and release
  infrastructure changes in the root `CHANGELOG.md`. Keep `ROADMAP.md` aligned
  with the work actually delivered.

## Prepare and inspect

From the repository root:

```bash
npm ci
npm run check
npm pack --workspace @mcpdesc/core --dry-run
npm pack --workspace @mcpdesc/validator --dry-run
```

The guarded readiness command checks repository, npm, changelog, and tarball
state for an approved package version. Required CI on the exact `main` commit is
the default behavioral validation gate; use `--run-validation` only to request
an additional local rerun:

```bash
npm run release:check -- --package validator --version <version> --run-validation
npm run release:check -- --package core --version <version> --run-validation
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

Preview the complete ordered release without changing repository or registry
state:

```bash
npm run release:plan -- --package both --channel next
```

After an explicit maintainer decision, run the resumable orchestrator:

```bash
npm run release:run -- --package both --channel next --confirm-publish-via-tag
npm run release:run -- --package both --channel latest \
  --require-specification-tag v0.8.0 --confirm-publish-via-tag
```

`next` requires prerelease package versions and publishes them under the `next`
dist-tag. `latest` requires stable package versions. The optional specification
tag requirement blocks stable publication until that tag is visible in
`mcpdesc/mcpdesc-specification`.

The command tags validator first, waits for trusted publication and npm
propagation, verifies registry signatures, provenance, exact dependencies, and a
clean installation, creates its GitHub release, and then repeats for core. It is
safe to rerun: existing package versions and GitHub releases are verified and
skipped rather than recreated.

The lower-level commands remain available for recovery or a single manual stage:

```bash
npm run release:tag -- --package validator --version <version> --confirm-publish-via-tag
npm run release:tag -- --package core --version <version> --confirm-publish-via-tag
```

Each tag starts only its package workflow. The workflow verifies that the tag
and package version agree, the tagged commit is the current `origin/main` tip,
and required CI succeeded for that exact commit. It then checks package
construction and publishes with provenance. Never reuse or move a published
release tag.

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
tag, and commit. Create the corresponding GitHub release from the package
changelog, then update that changelog and `ROADMAP.md` if the published outcome
differs from the release preparation.
