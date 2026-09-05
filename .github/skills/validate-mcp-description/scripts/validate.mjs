#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import process from 'node:process';

const usage = `Usage:
  validate.mjs [--format yaml|json] [--specification <selector>] [--json] <file>
  validate.mjs --stdin [--format yaml|json] [--specification <selector>] [--json]`;

function failUsage(message) {
  console.error(`${message}\n\n${usage}`);
  process.exitCode = 2;
}

function parseArguments(arguments_) {
  const options = {
    format: undefined,
    specification: undefined,
    json: false,
    stdin: false,
    file: undefined,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--help' || argument === '-h') return { help: true };
    if (argument === '--json') {
      options.json = true;
      continue;
    }
    if (argument === '--stdin' || argument === '-') {
      options.stdin = true;
      continue;
    }
    if (argument === '--format' || argument === '--specification') {
      const value = arguments_[index + 1];
      if (!value) throw new Error(`${argument} requires a value`);
      if (argument === '--format') options.format = value;
      else options.specification = value;
      index += 1;
      continue;
    }
    if (argument.startsWith('-'))
      throw new Error(`Unknown option: ${argument}`);
    if (options.file) throw new Error('Only one input file may be provided');
    options.file = argument;
  }

  if (options.stdin === Boolean(options.file)) {
    throw new Error('Provide exactly one input file or --stdin');
  }
  if (
    options.format !== undefined &&
    options.format !== 'yaml' &&
    options.format !== 'json'
  ) {
    throw new Error('--format must be yaml or json');
  }
  return options;
}

async function readStandardInput() {
  process.stdin.setEncoding('utf8');
  let source = '';
  for await (const chunk of process.stdin) source += chunk;
  return source;
}

function formatPath(path) {
  return path.reduce((result, segment) => {
    if (typeof segment === 'number') return `${result}[${segment}]`;
    if (/^[A-Za-z_$][\w$]*$/.test(segment)) return `${result}.${segment}`;
    return `${result}[${JSON.stringify(segment)}]`;
  }, '$');
}

function printHuman(result) {
  console.log(result.valid ? 'VALID' : 'INVALID');
  console.log(`Source: ${result.source}`);
  console.log(`Specification: ${result.specification ?? 'unresolved'}`);
  console.log(
    `Findings: ${result.summary.errors} error(s), ${result.summary.warnings} warning(s)`,
  );

  for (const diagnostic of result.diagnostics) {
    const location = diagnostic.location
      ? `:${diagnostic.location.line}:${diagnostic.location.column}`
      : '';
    console.log(
      `${diagnostic.severity.toUpperCase()} ${diagnostic.code} ${formatPath(diagnostic.path)}${location}: ${diagnostic.message}`,
    );
  }
}

async function loadApis() {
  try {
    const [core, validator] = await Promise.all([
      import('@mcpdesc/core/documents'),
      import('@mcpdesc/validator'),
    ]);
    return { ...core, ...validator };
  } catch (error) {
    const message = String(error?.message);
    if (
      error?.code === 'ERR_MODULE_NOT_FOUND' &&
      (message.includes('@mcpdesc/core') ||
        message.includes('packages/core/dist/documents.js'))
    ) {
      throw new Error(
        'The core parser is not built. Run: npm run build --workspace @mcpdesc/core -- --force',
      );
    }
    throw error;
  }
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    failUsage(error.message);
    return;
  }

  if (options.help) {
    console.log(usage);
    return;
  }

  const sourceName = options.stdin ? '<stdin>' : options.file;
  let source;
  try {
    source = options.stdin
      ? await readStandardInput()
      : await readFile(options.file, 'utf8');
  } catch (error) {
    console.error(`Unable to read ${sourceName}: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  let apis;
  try {
    apis = await loadApis();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const parsed = apis.parseMcpDescriptionSource(source, {
    ...(options.format ? { format: options.format } : {}),
  });
  let specification = null;
  let diagnostics;

  if (!parsed.ok) {
    diagnostics = parsed.diagnostics;
  } else {
    const resolution = apis.resolveMcpDescriptionSpecification(parsed.value, {
      ...(options.specification
        ? { specification: options.specification }
        : {}),
    });
    if (resolution.status === 'unresolved') {
      diagnostics = resolution.diagnostics;
    } else {
      specification = resolution.specification;
      diagnostics = apis.validateMcpDescription(parsed.value, {
        specification,
      }).diagnostics;
    }
  }

  const summary = {
    errors: diagnostics.filter(({ severity }) => severity === 'error').length,
    warnings: diagnostics.filter(({ severity }) => severity === 'warning')
      .length,
  };
  const result = {
    valid: summary.errors === 0,
    source: sourceName,
    specification,
    summary,
    diagnostics,
  };

  if (options.json) console.log(JSON.stringify(result, undefined, 2));
  else printHuman(result);
  if (!result.valid) process.exitCode = 1;
}

await main();
