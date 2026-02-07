import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { PackageJsonService } from './package-json.service';
import { InvalidDependenciesShapeError } from './errors/invalid-dependencies-shape.error';
import { InvalidPackageJsonError } from './errors/invalid-package-json.error';

describe('PackageJsonService', () => {
  async function createService(): Promise<PackageJsonService> {
    const moduleRef = await Test.createTestingModule({
      providers: [PackageJsonService],
    }).compile();

    return moduleRef.get(PackageJsonService);
  }

  it('parses dependencies and devDependencies from JSON string', async () => {
    const service = await createService();
    const content = JSON.stringify({
      dependencies: {
        lodash: '^4.17.21',
      },
      devDependencies: {
        jest: '^30.0.0',
      },
    });

    expect(service.parsePackageJsonString(content)).toEqual([
      {
        name: 'lodash',
        wantedRange: '^4.17.21',
        section: 'dependencies',
      },
      {
        name: 'jest',
        wantedRange: '^30.0.0',
        section: 'devDependencies',
      },
    ]);
  });

  it('parses dependencies from object input', async () => {
    const service = await createService();

    expect(
      service.parsePackageJsonObject({
        dependencies: {
          react: '^19.0.0',
        },
      }),
    ).toEqual([
      {
        name: 'react',
        wantedRange: '^19.0.0',
        section: 'dependencies',
      },
    ]);
  });

  it('includes sourceLabel when provided', async () => {
    const service = await createService();
    const content = JSON.stringify({
      dependencies: {
        express: '^5.1.0',
      },
    });

    expect(
      service.parsePackageJsonString(content, {
        sourceLabel: '/tmp/example/package.json',
      }),
    ).toEqual([
      {
        name: 'express',
        wantedRange: '^5.1.0',
        section: 'dependencies',
        sourceLabel: '/tmp/example/package.json',
      },
    ]);
  });

  it('keeps duplicate package names when listed in both sections', async () => {
    const service = await createService();
    const content = JSON.stringify({
      dependencies: {
        typescript: '^5.9.3',
      },
      devDependencies: {
        typescript: '^5.8.0',
      },
    });

    expect(service.parsePackageJsonString(content)).toEqual([
      {
        name: 'typescript',
        wantedRange: '^5.9.3',
        section: 'dependencies',
      },
      {
        name: 'typescript',
        wantedRange: '^5.8.0',
        section: 'devDependencies',
      },
    ]);
  });

  it('preserves non-semver specifiers as-is', async () => {
    const service = await createService();

    expect(
      service.parsePackageJsonObject({
        dependencies: {
          lib1: 'latest',
          lib2: 'workspace:*',
          lib3: 'github:user/repo#main',
          lib4: 'file:../local-package',
        },
      }),
    ).toEqual([
      { name: 'lib1', wantedRange: 'latest', section: 'dependencies' },
      { name: 'lib2', wantedRange: 'workspace:*', section: 'dependencies' },
      {
        name: 'lib3',
        wantedRange: 'github:user/repo#main',
        section: 'dependencies',
      },
      {
        name: 'lib4',
        wantedRange: 'file:../local-package',
        section: 'dependencies',
      },
    ]);
  });

  it('returns an empty array when dependency sections are missing', async () => {
    const service = await createService();

    expect(service.parsePackageJsonObject({ name: 'example' })).toEqual([]);
  });

  it('throws InvalidPackageJsonError for malformed JSON input', async () => {
    const service = await createService();

    expect(() => service.parsePackageJsonString('{ invalid-json')).toThrow(
      InvalidPackageJsonError,
    );
  });

  it('throws InvalidDependenciesShapeError when dependencies is not an object', async () => {
    const service = await createService();

    expect(() =>
      service.parsePackageJsonObject({
        dependencies: '^1.0.0',
      }),
    ).toThrow(InvalidDependenciesShapeError);
  });

  it('throws InvalidDependenciesShapeError when dependency value is not a string', async () => {
    const service = await createService();

    expect(() =>
      service.parsePackageJsonObject({
        dependencies: {
          react: 19,
        },
      }),
    ).toThrow(InvalidDependenciesShapeError);
  });
});
