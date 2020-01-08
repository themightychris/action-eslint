import * as path from 'path';

import { CHECK_NAME, EXTENSIONS_TO_LINT } from './constants';

const ESLINT_TO_GITHUB_LEVELS: import('@octokit/rest').ChecksUpdateParamsOutputAnnotations['annotation_level'][] = [
  'notice',
  'warning',
  'failure'
];

export async function eslint(filesList: string[]) {
  const { CLIEngine } = (await import(
    path.join(process.cwd(), 'node_modules/eslint')
  )) as typeof import('eslint');

  const cli = new CLIEngine({ extensions: [...EXTENSIONS_TO_LINT] });
  const report = cli.executeOnFiles(filesList);
  // fixableErrorCount, fixableWarningCount are available too
  const { results, errorCount, warningCount } = report;

  const annotations: import('@octokit/rest').ChecksUpdateParamsOutputAnnotations[] = [];
  for (const result of results) {
    const { filePath, messages } = result;
    const filename = filesList.find(file => filePath.endsWith(file));
    if (!filename) continue;
    for (const msg of messages) {
      const {
        line,
        severity,
        ruleId,
        message,
        endLine,
        column,
        endColumn
      } = msg;
      annotations.push({
        path: filename,
        start_line: line,
        end_line: endLine || line,
        start_column: column,
        end_column: endColumn || column,
        annotation_level: ESLINT_TO_GITHUB_LEVELS[severity],
        title: ruleId || 'ESLint',
        message
      });
    }
  }

  return {
    conclusion: (errorCount > 0
      ? 'failure'
      : 'success') as import('@octokit/rest').ChecksCreateParams['conclusion'],
    output: {
      title: CHECK_NAME,
      summary: `${errorCount} error(s), ${warningCount} warning(s) found`,
      annotations: annotations.slice(0, 50)
    }
  };
}
