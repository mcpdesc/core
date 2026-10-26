// Typecheck README code blocks against the built public package entry points.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tsc = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
);

const coreExports = {
  '@mcpdesc/core': [
    'mergeEffectiveProtocolViews',
    'migrateMcpDescription07To08',
    'projectEffectiveProtocolView',
    'projectMcpNativeValue',
    'serializeMcpDescriptionMigrationReport',
  ],
  '@mcpdesc/core/documents': [
    'parseMcpDescriptionSource',
    'serializeMcpDescription',
  ],
  '@mcpdesc/core/selection': ['selectMcpDescriptionDeclarations'],
  '@mcpdesc/core/components': ['resolveMcpDescriptionComponentReferences'],
  '@mcpdesc/validator': ['validateMcpDescription'],
};
const validatorExports = {
  '@mcpdesc/validator': [
    'resolveMcpDescriptionComponentReferences',
    'resolveMcpDescriptionSpecification',
    'validateMcpDescription',
  ],
};
// Values README snippets refer to without defining.
const placeholders = [
  'document',
  'draftDocument',
  'legacyDocument',
  'options',
  'report',
  'text',
  'use',
  'view2025',
  'view2026',
  'yamlText',
];

const readmes = [
  ['README.md', coreExports],
  ['packages/core/README.md', coreExports],
  ['packages/validator/README.md', validatorExports],
];

const workspace = fs.mkdtempSync(path.join(root, '.readme-examples-'));
try {
  const files = [];
  for (const [readme, exportsByModule] of readmes) {
    const markdown = fs.readFileSync(path.join(root, readme), 'utf8');
    let index = 0;
    for (const [, body] of markdown.matchAll(/```(?:ts|js)\n([\s\S]*?)```/g)) {
      index += 1;
      const imported = new Set(
        [...body.matchAll(/import\s*\{([^}]*)\}/g)].flatMap(([, names]) =>
          names
            .split(',')
            .map((name) => name.replace(/^\s*type\s+/, '').trim())
            .filter(Boolean),
        ),
      );
      const declared = new Set(
        [
          ...body.matchAll(/\b(?:const|let|function)\s+([A-Za-z_$][\w$]*)/g),
        ].map(([, name]) => name),
      );
      const prelude = Object.entries(exportsByModule)
        .map(([module, names]) => [
          module,
          names.filter((name) => !imported.has(name)),
        ])
        .filter(([, names]) => names.length > 0)
        .map(
          ([module, names]) =>
            `import { ${names.join(', ')} } from '${module}';`,
        );
      prelude.push(
        ...placeholders
          .filter((name) => !declared.has(name) && !imported.has(name))
          .map((name) => `declare const ${name}: any;`),
      );
      const filename = path.join(
        workspace,
        `${readme.replaceAll(/[/.]/g, '-')}-${index}.ts`,
      );
      fs.writeFileSync(
        filename,
        `${prelude.join('\n')}\n${body}\nexport {};\n`,
      );
      files.push(filename);
    }
  }

  fs.writeFileSync(
    path.join(workspace, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        target: 'ES2023',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
      },
      include: ['*.ts'],
    }),
  );
  fs.writeFileSync(
    path.join(workspace, 'package.json'),
    JSON.stringify({ type: 'module' }),
  );
  try {
    execFileSync(tsc, ['--project', workspace], { stdio: 'pipe' });
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    throw new Error(`README examples failed to typecheck:\n${output}`);
  }
  console.log(`README examples typecheck passed (${files.length} blocks).`);
} finally {
  fs.rmSync(workspace, { force: true, recursive: true });
}
