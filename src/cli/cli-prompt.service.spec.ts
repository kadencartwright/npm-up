import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CliPromptService source', () => {
  it('sets inquirer checkbox loop to false to prevent wrap-around navigation', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/cli/cli-prompt.service.ts'),
      'utf8',
    );

    expect(source).toContain('loop: false');
  });
});
