import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageDefinitions = {
  core: {
    manifest: 'packages/core/package.json',
    tagPattern: 'v[0-9]*',
    tagPrefix: 'v',
    releasePaths: [
      'packages/core/src/',
      'packages/core/package.json',
      'packages/core/README.md',
      'packages/core/LICENSE',
      'packages/core/NOTICE',
      'packages/core/ORIGIN.md',
      'packages/core/MODIFICATIONS.md',
    ],
    supportPaths: ['packages/core/scripts/', 'packages/core/test/'],
  },
  validator: {
    manifest: 'packages/validator/package.json',
    tagPattern: 'validator-v[0-9]*',
    tagPrefix: 'validator-v',
    releasePaths: [
      'packages/validator/src/',
      'packages/validator/standalone.js',
      'packages/validator/index.d.ts',
      'packages/validator/package.json',
      'packages/validator/README.md',
      'packages/validator/CHANGELOG.md',
      'packages/validator/snapshot-integrity.json',
      'packages/validator/LICENSE',
      'packages/validator/NOTICE',
      'packages/validator/ORIGIN.md',
      'packages/validator/MODIFICATIONS.md',
    ],
    supportPaths: [
      'packages/validator/scripts/',
      'packages/validator/test/',
      'packages/validator/snapshot-imports/',
    ],
  },
};

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function matchesPath(path, candidates) {
  return candidates.some((candidate) =>
    candidate.endsWith('/') ? path.startsWith(candidate) : path === candidate,
  );
}

function latestTag(pattern) {
  return (
    git('tag', '--list', pattern, '--sort=-v:refname')
      .split('\n')
      .filter(Boolean)[0] ?? null
  );
}

function assess(name, definition) {
  const baseTag = latestTag(definition.tagPattern);
  const changedFiles = [
    ...git(
      'diff',
      '--name-only',
      baseTag ?? git('hash-object', '-t', 'tree', '/dev/null'),
    ).split('\n'),
    ...git('ls-files', '--others', '--exclude-standard').split('\n'),
  ].filter(Boolean);
  const releaseFiles = changedFiles.filter((path) =>
    matchesPath(path, definition.releasePaths),
  );
  const supportFiles = changedFiles.filter((path) =>
    matchesPath(path, definition.supportPaths),
  );
  const manifest = readJson(definition.manifest);
  const latestVersion = baseTag?.slice(definition.tagPrefix.length) ?? null;

  return {
    package: name,
    packageName: manifest.name,
    currentVersion: manifest.version,
    baseTag,
    latestVersion,
    releaseRequired: releaseFiles.length > 0,
    versionPrepared:
      latestVersion === null || manifest.version !== latestVersion,
    releaseFiles,
    supportFiles,
  };
}

const json = process.argv.includes('--json');
const results = Object.entries(packageDefinitions).map(([name, definition]) =>
  assess(name, definition),
);

if (json) {
  console.log(JSON.stringify({ packages: results }, null, 2));
} else {
  for (const result of results) {
    console.log(
      `${result.packageName} (since ${result.baseTag ?? 'repository start'})`,
    );
    console.log(`  release needed: ${result.releaseRequired ? 'yes' : 'no'}`);
    console.log(`  current version: ${result.currentVersion}`);
    console.log(`  version prepared: ${result.versionPrepared ? 'yes' : 'no'}`);
    if (result.releaseFiles.length > 0) {
      console.log(`  package-affecting files: ${result.releaseFiles.length}`);
    }
    if (result.supportFiles.length > 0) {
      console.log(`  supporting files: ${result.supportFiles.length}`);
    }
  }

  if (
    results.find((result) => result.package === 'validator')?.releaseRequired &&
    results.find((result) => result.package === 'core')?.releaseRequired
  ) {
    console.log(
      'Release order: validator, then core after validator publication is verified.',
    );
  }
}
