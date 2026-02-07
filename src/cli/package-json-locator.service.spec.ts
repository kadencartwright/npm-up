import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PackageJsonLocatorService } from './package-json-locator.service';

describe('PackageJsonLocatorService', () => {
  const service = new PackageJsonLocatorService();

  it('resolves cwd package.json by default', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'npm-up-locate-'));
    const packagePath = join(dir, 'package.json');
    await fs.writeFile(packagePath, '{"name":"demo"}', 'utf8');

    await expect(service.resolvePackageJsonPath(undefined, dir)).resolves.toBe(
      packagePath,
    );
  });

  it('throws when default cwd package.json is missing', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'npm-up-locate-'));

    await expect(
      service.resolvePackageJsonPath(undefined, dir),
    ).rejects.toThrow(/Could not find package.json/);
  });

  it('resolves explicit package path relative to cwd', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'npm-up-locate-'));
    const packagePath = join(dir, 'configs', 'project.package.json');
    await fs.mkdir(join(dir, 'configs'), { recursive: true });
    await fs.writeFile(packagePath, '{"name":"demo"}', 'utf8');

    await expect(
      service.resolvePackageJsonPath('./configs/project.package.json', dir),
    ).resolves.toBe(resolve(dir, 'configs/project.package.json'));
  });
});
