import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const targets = {
  core: {
    manifest: 'packages/core/package.json',
    changelog: 'packages/core/CHANGELOG.md',
    tagPrefix: 'v',
    workflow: 'publish.yml',
    validation: ['npm', ['run', 'check']],
  },
  validator: {
    manifest: 'packages/validator/package.json',
    changelog: 'packages/validator/CHANGELOG.md',
    tagPrefix: 'validator-v',
    workflow: 'publish-validator.yml',
    validation: ['npm', ['test', '--workspace', '@mcpdesc/validator']],
  },
};

function fail(message) {
  console.error(`release check failed: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
  });
  return typeof output === 'string' ? output.trim() : '';
}

function hasArgument(name) {
  return process.argv.includes(name);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function parsePackages() {
  const value = argument('--package');
  if (!value)
    fail('pass --package core, --package validator, or --package both');
  if (value === 'both') return ['validator', 'core'];
  if (!(value in targets)) fail(`unknown package ${value}`);
  return [value];
}

function parseChannel() {
  const channel = argument('--channel') ?? 'latest';
  if (!['next', 'latest'].includes(channel)) {
    fail('pass --channel next or --channel latest');
  }
  return channel;
}

function isPrerelease(version) {
  return version.includes('-');
}

function checkChannelVersion(channel, packageName, version) {
  if (channel === 'next' && !isPrerelease(version)) {
    fail(
      `${packageName}@${version} must use prerelease SemVer for channel next`,
    );
  }
  if (channel === 'latest' && isPrerelease(version)) {
    fail(`${packageName}@${version} must use stable SemVer for channel latest`);
  }
}

function isNpmVersionUnused(packageName, version) {
  const result = spawnSync(
    'npm',
    ['view', `${packageName}@${version}`, 'version', '--json'],
    {
      encoding: 'utf8',
    },
  );
  if (result.status === 0) return false;
  if (`${result.stderr}\n${result.stdout}`.includes('E404')) return true;
  fail(`could not query npm for ${packageName}@${version}`);
}

function npmMetadata(packageName, version) {
  const result = spawnSync(
    'npm',
    [
      'view',
      `${packageName}@${version}`,
      'version',
      'dependencies',
      'dist.integrity',
      'dist.signatures',
      'dist.attestations',
      '--json',
      '--prefer-online',
    ],
    { encoding: 'utf8' },
  );
  if (result.status === 0) return JSON.parse(result.stdout);
  if (`${result.stderr}\n${result.stdout}`.includes('E404')) return null;
  fail(`could not query npm for ${packageName}@${version}`);
}

function tagExists(tag) {
  if (
    spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`])
      .status === 0
  ) {
    return true;
  }
  return (
    run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]).length > 0
  );
}

function pause(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function tagCommit(tag) {
  try {
    return run('git', ['rev-list', '-n', '1', tag]);
  } catch {
    return null;
  }
}

function waitForWorkflow(release) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const output = run('gh', [
      'run',
      'list',
      '--workflow',
      release.target.workflow,
      '--limit',
      '20',
      '--json',
      'databaseId,headBranch',
    ]);
    const workflow = JSON.parse(output).find(
      (candidate) => candidate.headBranch === release.tag,
    );
    if (workflow) {
      run(
        'gh',
        ['run', 'watch', String(workflow.databaseId), '--exit-status'],
        {
          stdio: 'inherit',
        },
      );
      return;
    }
    pause(2_000);
  }
  fail(`timed out waiting for ${release.target.workflow} for ${release.tag}`);
}

function waitForNpm(release) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const metadata = npmMetadata(release.packageName, release.version);
    if (metadata) return metadata;
    pause(2_000);
  }
  fail(
    `timed out waiting for ${release.packageName}@${release.version} on npm`,
  );
}

function verifyMetadata(release, metadata) {
  if (metadata.version !== release.version) {
    fail(`npm returned unexpected version for ${release.packageName}`);
  }
  if (!(metadata.dist?.integrity ?? metadata['dist.integrity'])) {
    fail(`${release.packageName}@${release.version} has no registry integrity`);
  }
  if (!(metadata.dist?.signatures ?? metadata['dist.signatures'])?.length) {
    fail(`${release.packageName}@${release.version} has no registry signature`);
  }
  if (
    !(metadata.dist?.attestations ?? metadata['dist.attestations'])?.provenance
  ) {
    fail(
      `${release.packageName}@${release.version} has no provenance attestation`,
    );
  }
  if (release.name === 'core') {
    const expectedValidator = JSON.parse(
      readFileSync(release.target.manifest, 'utf8'),
    ).dependencies['@mcpdesc/validator'];
    if (metadata.dependencies?.['@mcpdesc/validator'] !== expectedValidator) {
      fail(
        `published core does not pin @mcpdesc/validator@${expectedValidator}`,
      );
    }
  }
}

function verifyInstall(release) {
  const directory = mkdtempSync(join(tmpdir(), 'mcpdesc-release-'));
  try {
    writeFileSync(
      join(directory, 'package.json'),
      '{"name":"mcpdesc-release-verification","private":true}\n',
    );
    run(
      'npm',
      [
        'install',
        '--ignore-scripts',
        `${release.packageName}@${release.version}`,
      ],
      { cwd: directory },
    );
    run('npm', ['audit', 'signatures'], { cwd: directory, stdio: 'inherit' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function changelogNotes(release) {
  const changelog = readFileSync(release.target.changelog, 'utf8');
  const heading = `## [${release.version}]`;
  const start = changelog.indexOf(heading);
  if (start === -1)
    fail(`${release.target.changelog} has no ${release.version}`);
  const contentStart = changelog.indexOf('\n', start) + 1;
  const next = changelog.indexOf('\n## [', contentStart);
  return changelog.slice(contentStart, next === -1 ? undefined : next).trim();
}

function ensureGitHubRelease(release, channel) {
  const existing = spawnSync('gh', ['release', 'view', release.tag], {
    encoding: 'utf8',
  });
  if (existing.status === 0) return;
  const args = [
    'release',
    'create',
    release.tag,
    '--title',
    `${release.packageName} ${release.version}`,
    '--notes',
    changelogNotes(release),
  ];
  if (channel === 'next') args.push('--prerelease');
  run('gh', args, { stdio: 'inherit' });
}

function ensureSpecificationTag() {
  const tag = argument('--require-specification-tag');
  if (!tag) return;
  const output = run('gh', [
    'api',
    `repos/mcpdesc/mcpdesc-specification/git/ref/tags/${tag}`,
    '--jq',
    '.ref',
  ]);
  if (output !== `refs/tags/${tag}`) {
    fail(`remote specification tag ${tag} is not available`);
  }
}

function checkRequiredChecks(commit) {
  let response;
  try {
    response = JSON.parse(
      run('gh', [
        'api',
        `repos/mcpdesc/core/commits/${commit}/check-runs`,
        '--header',
        'Accept: application/vnd.github+json',
      ]),
    );
  } catch {
    fail('could not query required GitHub checks with gh');
  }

  for (const name of ['validate', 'validator-node-20']) {
    const checks = response.check_runs.filter((check) => check.name === name);
    if (
      checks.length === 0 ||
      checks.every((check) => check.conclusion !== 'success')
    ) {
      fail(`required GitHub check ${name} has not succeeded for ${commit}`);
    }
  }
}

function checkRepository() {
  if (run('git', ['status', '--porcelain'])) fail('the worktree is not clean');
  if (run('git', ['branch', '--show-current']) !== 'main')
    fail('releases must run from main');
  const origin = run('git', ['remote', 'get-url', 'origin']);
  if (
    !origin.includes('github.com') ||
    !/(?:\:|\/)mcpdesc\/core(?:\.git)?$/.test(origin)
  ) {
    fail(`origin does not point to mcpdesc/core: ${origin}`);
  }
  const head = run('git', ['rev-parse', 'HEAD']);
  if (head !== run('git', ['rev-parse', 'origin/main'])) {
    fail('HEAD is not the current origin/main tip; fetch before retrying');
  }
  checkRequiredChecks(head);
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (nodeMajor < 24)
    fail(`Node.js 24 or later is required; found ${process.versions.node}`);
  const npmVersion = run('npm', ['--version']);
  const [npmMajor, npmMinor] = npmVersion.split('.').map(Number);
  if (npmMajor < 11 || (npmMajor === 11 && npmMinor < 5)) {
    fail(`npm 11.5.1 or later is required; found ${npmVersion}`);
  }
}

function checkTarget(name, packageNames) {
  const target = targets[name];
  const manifest = JSON.parse(readFileSync(target.manifest, 'utf8'));
  const expectedVersion = argument('--version');
  if (expectedVersion && expectedVersion !== manifest.version) {
    fail(
      `${name} package version is ${manifest.version}, not ${expectedVersion}`,
    );
  }
  const tag = `${target.tagPrefix}${manifest.version}`;
  if (tagExists(tag)) fail(`tag ${tag} already exists`);
  if (!isNpmVersionUnused(manifest.name, manifest.version)) {
    fail(`${manifest.name}@${manifest.version} already exists on npm`);
  }
  const changelog = readFileSync(target.changelog, 'utf8');
  if (!changelog.includes(`## [${manifest.version}]`)) {
    fail(`${target.changelog} has no ${manifest.version} release section`);
  }
  if (name === 'core') {
    const validatorVersion = manifest.dependencies?.['@mcpdesc/validator'];
    if (!validatorVersion)
      fail('core must declare an exact @mcpdesc/validator dependency');
    if (isNpmVersionUnused('@mcpdesc/validator', validatorVersion)) {
      const preparedValidatorVersion = JSON.parse(
        readFileSync(targets.validator.manifest, 'utf8'),
      ).version;
      if (
        !packageNames.includes('validator') ||
        validatorVersion !== preparedValidatorVersion
      ) {
        fail(
          `@mcpdesc/validator@${validatorVersion} must be published before core`,
        );
      }
    }
  }
  return {
    name,
    packageName: manifest.name,
    version: manifest.version,
    tag,
    target,
  };
}

function plannedTarget(name) {
  const target = targets[name];
  const manifest = JSON.parse(readFileSync(target.manifest, 'utf8'));
  return {
    name,
    packageName: manifest.name,
    version: manifest.version,
    tag: `${target.tagPrefix}${manifest.version}`,
    target,
  };
}

function checkPreparedReleases(releases) {
  for (const release of releases) {
    const changelog = readFileSync(release.target.changelog, 'utf8');
    if (!changelog.includes(`## [${release.version}]`)) {
      fail(
        `${release.target.changelog} has no ${release.version} release section`,
      );
    }
  }
  const core = releases.find((release) => release.name === 'core');
  const validator = releases.find((release) => release.name === 'validator');
  if (core && validator) {
    const dependency = JSON.parse(readFileSync(core.target.manifest, 'utf8'))
      .dependencies?.['@mcpdesc/validator'];
    if (dependency !== validator.version) {
      fail(`core must pin the prepared validator version ${validator.version}`);
    }
  }
}

function runRelease(release, channel, head) {
  checkChannelVersion(channel, release.packageName, release.version);
  let metadata = npmMetadata(release.packageName, release.version);
  if (!metadata) {
    const existingTagCommit = tagCommit(release.tag);
    if (existingTagCommit && existingTagCommit !== head) {
      fail(`${release.tag} does not identify current main`);
    }
    if (!existingTagCommit) {
      run(
        'git',
        [
          'tag',
          '-s',
          release.tag,
          '-m',
          `Release ${release.packageName} ${release.version}`,
        ],
        { stdio: 'inherit' },
      );
      run('git', ['push', 'origin', release.tag], { stdio: 'inherit' });
    }
    waitForWorkflow(release);
    metadata = waitForNpm(release);
  }
  verifyMetadata(release, metadata);
  verifyInstall(release);
  ensureGitHubRelease(release, channel);
  console.log(
    `${release.packageName}@${release.version}: published and verified`,
  );
}

function printPlan(releases) {
  for (const release of releases) {
    console.log(
      `${release.packageName}@${release.version}: ready for ${release.tag}`,
    );
  }
  if (releases.length === 2) {
    console.log(
      'Tag validator first, verify publication, then rerun the core check and tag core.',
    );
  }
}

function printOrchestrationPlan(releases, channel) {
  console.log(`Release channel: ${channel}`);
  for (const release of releases) {
    checkChannelVersion(channel, release.packageName, release.version);
    console.log(`${release.name}:`);
    console.log(`  check ${release.packageName}@${release.version}`);
    console.log(`  tag ${release.tag}`);
    console.log(`  wait for trusted publication`);
    console.log(`  verify registry signatures and provenance`);
    console.log(`  create GitHub release`);
  }
}

const command = process.argv[2];
if (!['check', 'plan', 'run', 'tag'].includes(command)) {
  fail(
    'usage: node scripts/release.mjs <check|plan|run|tag> --package <core|validator|both> [--version <version>] [--channel <next|latest>] [--run-validation]',
  );
}

const packageNames = parsePackages();
if (command === 'tag' && packageNames.length !== 1) {
  fail(
    'tag one package at a time so validator publication can be verified before core',
  );
}

if (command === 'plan') {
  printOrchestrationPlan(packageNames.map(plannedTarget), parseChannel());
  process.exit(0);
}

checkRepository();
if (command === 'run') {
  if (!hasArgument('--confirm-publish-via-tag')) {
    fail('pass --confirm-publish-via-tag after explicit maintainer approval');
  }
  const channel = parseChannel();
  if (channel === 'latest') ensureSpecificationTag();
  const head = run('git', ['rev-parse', 'HEAD']);
  const plannedReleases = packageNames.map(plannedTarget);
  checkPreparedReleases(plannedReleases);
  for (const release of plannedReleases) {
    runRelease(release, channel, head);
  }
  process.exit(0);
}

const releases = packageNames.map((name) => checkTarget(name, packageNames));

if (hasArgument('--run-validation')) {
  for (const release of releases) {
    run(release.target.validation[0], release.target.validation[1], {
      stdio: 'inherit',
    });
    run('npm', ['pack', '--workspace', release.packageName, '--dry-run'], {
      stdio: 'inherit',
    });
  }
}

if (command === 'check') {
  printPlan(releases);
} else {
  if (!hasArgument('--confirm-publish-via-tag')) {
    fail(
      'tagging triggers npm publication; pass --confirm-publish-via-tag after explicit maintainer approval',
    );
  }
  const release = releases[0];
  run(
    'git',
    [
      'tag',
      '-s',
      release.tag,
      '-m',
      `Release ${release.packageName} ${release.version}`,
    ],
    {
      stdio: 'inherit',
    },
  );
  run('git', ['push', 'origin', release.tag], { stdio: 'inherit' });
  console.log(
    `Pushed ${release.tag}; verify its publish workflow and npm provenance before continuing.`,
  );
}
