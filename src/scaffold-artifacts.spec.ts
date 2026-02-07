import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('scaffold artifact cleanup', () => {
  const root = path.resolve(__dirname, '..');

  it('keeps CLI entrypoints and removes scaffold artifacts', () => {
    const scaffoldFiles = [
      path.join(root, 'src/main.ts'),
      path.join(root, 'src/app.module.ts'),
      path.join(root, 'src/app.controller.ts'),
      path.join(root, 'src/app.service.ts'),
      path.join(root, 'src/app.controller.spec.ts'),
      path.join(root, 'test/app.e2e-spec.ts'),
      path.join(root, 'test/jest-e2e.json'),
    ];

    const expectedFiles = [path.join(root, 'src/cli.ts')];

    for (const file of scaffoldFiles) {
      expect(existsSync(file)).toBe(false);
    }

    for (const file of expectedFiles) {
      expect(existsSync(file)).toBe(true);
    }
  });

  it('removes scaffold scripts while keeping CLI script', () => {
    const packageJsonPath = path.join(root, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts ?? {};

    const removedScripts = [
      'start',
      'start:dev',
      'start:debug',
      'start:prod',
      'test:e2e',
    ];

    for (const scriptName of removedScripts) {
      expect(scripts[scriptName]).toBeUndefined();
    }

    expect(scripts['start:cli']).toBeDefined();
  });
});
