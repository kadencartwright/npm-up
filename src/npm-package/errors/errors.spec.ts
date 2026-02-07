import { describe, it, expect } from 'vitest';
import { NpmPackageError } from './npm-package.error';
import { PackageNotFoundError } from './package-not-found.error';
import { VersionNotFoundError } from './version-not-found.error';
import { NetworkError } from './network.error';

describe('Error Classes', () => {
  describe('NpmPackageError', () => {
    it('should be defined', () => {
      expect(NpmPackageError).toBeDefined();
    });

    it('should create error with message and status code', () => {
      const error = new NpmPackageError('Test error', 400);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
    });

    it('should default to status code 500', () => {
      const error = new NpmPackageError('Test error');
      expect(error.statusCode).toBe(500);
    });

    it('should be instance of Error', () => {
      const error = new NpmPackageError('Test error');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('PackageNotFoundError', () => {
    it('should be defined', () => {
      expect(PackageNotFoundError).toBeDefined();
    });

    it('should create error with package name and status 404', () => {
      const error = new PackageNotFoundError('lodash');
      expect(error.message).toContain('lodash');
      expect(error.message).toContain('not found');
      expect(error.statusCode).toBe(404);
    });

    it('should be instance of NpmPackageError', () => {
      const error = new PackageNotFoundError('lodash');
      expect(error).toBeInstanceOf(NpmPackageError);
    });
  });

  describe('VersionNotFoundError', () => {
    it('should be defined', () => {
      expect(VersionNotFoundError).toBeDefined();
    });

    it('should create error with package name, version and status 404', () => {
      const error = new VersionNotFoundError('lodash', '99.99.99');
      expect(error.message).toContain('lodash');
      expect(error.message).toContain('99.99.99');
      expect(error.message).toContain('not found');
      expect(error.statusCode).toBe(404);
    });

    it('should be instance of NpmPackageError', () => {
      const error = new VersionNotFoundError('lodash', '1.0.0');
      expect(error).toBeInstanceOf(NpmPackageError);
    });
  });

  describe('NetworkError', () => {
    it('should be defined', () => {
      expect(NetworkError).toBeDefined();
    });

    it('should create error with message and status 503', () => {
      const error = new NetworkError('Connection timeout');
      expect(error.message).toContain('Connection timeout');
      expect(error.statusCode).toBe(503);
    });

    it('should be instance of NpmPackageError', () => {
      const error = new NetworkError('Connection failed');
      expect(error).toBeInstanceOf(NpmPackageError);
    });

    it('should store original error', () => {
      const originalError = new Error('Original error');
      const error = new NetworkError('Network failed', originalError);
      expect(error.cause).toBe(originalError);
    });
  });
});
