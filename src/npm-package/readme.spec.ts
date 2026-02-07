// TODO: Delete this test
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('README npm package docs', () => {
  it('documents npm package service API and usage examples', () => {
    const readmePath = join(__dirname, '..', '..', 'README.md');
    const readme = readFileSync(readmePath, 'utf8');

    expect(readme).toContain('NpmPackageService');
    expect(readme).toContain('getVersionAge');
    expect(readme).toContain('getLatestVersion');
    expect(readme).toContain('getLatestVersionAtLeastNDaysOld');
    expect(readme).toContain('NPM_REGISTRY_URL');
  });
});
