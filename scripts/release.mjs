import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const targets = {
  core: {
    manifest: 'packages/core/package.json',
    changelog: 'CHANGELOG.md',
    tagPrefix: 'v',
    validation: ['npm', ['run', 'check']],
  },
  validator: {
    manifest: 'packages/validator/package.json',
    changelog: 'packages/validator/CHANGELOG.md',
    tagPrefix: 'validator-v',
    validation: ['npm', ['test', '--workspace', '@mcpdesc/validator']],
  },
};

function fail(message) {
  console.error(`release check failed: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
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

const command = process.argv[2];
if (!['check', 'tag'].includes(command)) {
  fail(
    'usage: node scripts/release.mjs <check|tag> --package <core|validator|both> [--version <version>] [--run-validation]',
  );
}

const packageNames = parsePackages();
if (command === 'tag' && packageNames.length !== 1) {
  fail(
    'tag one package at a time so validator publication can be verified before core',
  );
}

checkRepository();
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
