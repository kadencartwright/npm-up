import { Injectable } from '@nestjs/common';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

@Injectable()
export class PackageJsonLocatorService {
  async resolvePackageJsonPath(
    customPath?: string,
    cwd: string = process.cwd(),
  ): Promise<string> {
    const targetPath = customPath
      ? resolve(cwd, customPath)
      : resolve(cwd, 'package.json');
    await this.assertReadablePackageJson(targetPath);
    return targetPath;
  }

  async readPackageJson(path: string): Promise<unknown> {
    const content = await readFile(path, 'utf8');
    try {
      return JSON.parse(content) as unknown;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown parse error';
      throw new Error(`Invalid package.json at '${path}': ${message}`);
    }
  }

  private async assertReadablePackageJson(path: string): Promise<void> {
    try {
      await access(path);
    } catch {
      throw new Error(`Could not find package.json at '${path}'.`);
    }
  }
}
