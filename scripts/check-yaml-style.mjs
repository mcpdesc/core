import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { isMap, isSeq, LineCounter, parseAllDocuments } from 'yaml';

const root = fileURLToPath(new URL('..', import.meta.url));

export function isStyleCheckedFile(filename) {
  return (
    /\.(?:ya?ml|md|ts|js|mjs)$/i.test(filename) &&
    filename !== 'scripts/check-yaml-style.test.mjs' &&
    !/^packages\/validator\/(?:src|test)\/snapshots\//.test(filename)
  );
}

export function checkYamlSource(source, { line = 1, literal = false } = {}) {
  const lineCounter = new LineCounter();
  const documents = parseAllDocuments(source, { lineCounter });
  const errors = documents.flatMap((document) => document.errors);
  // Malformed YAML literals are intentional parser-test inputs, not examples.
  if (literal && errors.length > 0) return [];
  const findings = errors.map((error) => ({
    line: line + lineCounter.linePos(error.pos[0]).line - 1,
    message: error.message,
  }));

  function visit(node, key) {
    if (isSeq(node)) {
      if (!node.flow && key?.range && node.range) {
        const keyPosition = lineCounter.linePos(key.range[0]);
        const position = lineCounter.linePos(node.range[0]);
        if (position.col !== keyPosition.col + 2) {
          findings.push({
            line: line + position.line - 1,
            message:
              'Block sequences must be indented two spaces beyond their mapping key',
          });
        }
      }
      node.items.forEach((item) => visit(item));
    } else if (isMap(node)) {
      node.items.forEach((pair) => visit(pair.value, pair.key));
    }
  }

  documents.forEach((document) => visit(document.contents));
  return findings;
}

function checkCode(source, line = 1) {
  const tree = ts.createSourceFile(
    'examples.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const findings = [];
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      let statement = node;
      while (statement.parent && !ts.isStatement(statement)) {
        statement = statement.parent;
      }
      const intentionalInput = (
        ts.getLeadingCommentRanges(source, statement.pos) ?? []
      ).some((comment) =>
        source
          .slice(comment.pos, comment.end)
          .includes('yaml-style: intentional-input'),
      );
      const text = node.text;
      if (
        !intentionalInput &&
        text.includes('\n') &&
        /(?:^|\n)\s*[\w$][\w$.-]*:\s/.test(text) &&
        !text.trimStart().startsWith('{')
      ) {
        const position = tree.getLineAndCharacterOfPosition(
          node.getStart(tree),
        );
        const literalFindings = checkYamlSource(text, {
          line: line + position.line,
          literal: true,
        });
        findings.push(
          ...literalFindings.map((finding) => ({
            ...finding,
            line: ts.isStringLiteral(node)
              ? line + position.line
              : finding.line,
          })),
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return findings;
}

export function checkFileSource(filename, source) {
  if (!isStyleCheckedFile(filename)) return [];
  if (/\.ya?ml$/i.test(filename)) return checkYamlSource(source);
  if (!/\.md$/i.test(filename)) return checkCode(source);
  const findings = [];
  for (const match of source.matchAll(
    /^([ \t]*)```([^\n]*)\n([\s\S]*?)^\1```/gm,
  )) {
    const language = match[2].trim();
    const line = source.slice(0, match.index).split('\n').length + 1;
    if (/^ya?ml\b/i.test(language)) {
      findings.push(...checkYamlSource(match[3], { line }));
    } else if (/^(?:ts|typescript|js|javascript)\b/.test(language)) {
      findings.push(...checkCode(match[3], line));
    }
  }
  return findings;
}

function main() {
  const files = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean);
  let count = 0;
  for (const filename of new Set(files)) {
    if (!isStyleCheckedFile(filename)) continue;
    const source = fs.readFileSync(path.join(root, filename), 'utf8');
    for (const finding of checkFileSource(filename, source)) {
      console.error(`${filename}:${finding.line}: ${finding.message}`);
      count += 1;
    }
  }
  if (count > 0) process.exitCode = 1;
  else console.log('Mutable YAML files and examples use indented sequences.');
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main();
}
