import { Injectable } from '@nestjs/common';
import { InvalidDependenciesShapeError } from './errors/invalid-dependencies-shape.error';
import { InvalidPackageJsonError } from './errors/invalid-package-json.error';
import { DependencySection, ParseOptions, ParsedDependency } from './types';

interface PackageJsonLike {
  dependencies?: unknown;
  devDependencies?: unknown;
}

@Injectable()
export class PackageJsonService {
  parsePackageJsonString(
    content: string,
    options: ParseOptions = {},
  ): ParsedDependency[] {
    try {
      const parsed = JSON.parse(content) as unknown;
      return this.parsePackageJsonObject(parsed, options);
    } catch (error) {
      if (error instanceof InvalidDependenciesShapeError) {
        throw error;
      }
      throw new InvalidPackageJsonError(options.sourceLabel, error);
    }
  }

  parsePackageJsonObject(
    input: unknown,
    options: ParseOptions = {},
  ): ParsedDependency[] {
    if (!this.isObject(input)) {
      throw new InvalidDependenciesShapeError(
        'package.json root',
        options.sourceLabel,
      );
    }

    const packageJson = input as PackageJsonLike;
    const dependencies = this.parseSection(
      packageJson.dependencies,
      'dependencies',
      options.sourceLabel,
    );
    const devDependencies = this.parseSection(
      packageJson.devDependencies,
      'devDependencies',
      options.sourceLabel,
    );

    return [...dependencies, ...devDependencies];
  }

  private parseSection(
    value: unknown,
    section: DependencySection,
    sourceLabel?: string,
  ): ParsedDependency[] {
    if (value === undefined) {
      return [];
    }

    if (!this.isObject(value)) {
      throw new InvalidDependenciesShapeError(section, sourceLabel);
    }

    const entries = Object.entries(value);
    return entries.map(([name, wantedRange]) => {
      if (typeof wantedRange !== 'string') {
        throw new InvalidDependenciesShapeError(section, sourceLabel);
      }

      return {
        name,
        wantedRange,
        section,
        ...(sourceLabel ? { sourceLabel } : {}),
      };
    });
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
