import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { NpmPackageModule } from './npm-package.module';
import { NpmPackageService } from './npm-package.service';
import { PackageNotFoundError } from './errors/package-not-found.error';

describe('NpmPackageService Integration', () => {
  let server: Server;
  let baseUrl: string;
  let responseStatus = 200;
  let responseBody: unknown = {};

  beforeAll(async () => {
    server = createServer((_req, res) => {
      res.statusCode = responseStatus;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(responseBody));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  beforeEach(() => {
    responseStatus = 200;
    responseBody = {};
  });

  async function createService(): Promise<NpmPackageService> {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NPM_REGISTRY_URL: baseUrl,
              NPM_TIMEOUT: 1000,
            }),
          ],
        }),
        NpmPackageModule,
      ],
    }).compile();

    return moduleRef.get(NpmPackageService);
  }

  it('fetches package metadata from the mocked registry', async () => {
    responseBody = {
      name: 'example-pkg',
      versions: { '1.0.0': {} },
      time: { '1.0.0': '2025-01-10T00:00:00.000Z' },
    };

    const service = await createService();
    await expect(service.fetchPackageMetadata('example-pkg')).resolves.toEqual(
      responseBody,
    );
  });

  it('computes latest version from mocked registry payload', async () => {
    responseBody = {
      name: 'example-pkg',
      versions: { '1.0.0': {}, '1.1.0': {}, '2.0.0-beta.1': {} },
      time: {
        '1.0.0': '2025-01-01T00:00:00.000Z',
        '1.1.0': '2025-01-10T00:00:00.000Z',
        '2.0.0-beta.1': '2025-01-20T00:00:00.000Z',
      },
    };

    jest.useFakeTimers().setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
    const service = await createService();

    await expect(service.getLatestVersion('example-pkg')).resolves.toEqual({
      version: '1.1.0',
      publishedAt: new Date('2025-01-10T00:00:00.000Z'),
      ageInDays: 15,
    });
    jest.useRealTimers();
  });

  it('maps 404 responses to PackageNotFoundError', async () => {
    responseStatus = 404;
    responseBody = { error: 'not found' };
    const service = await createService();

    await expect(service.fetchPackageMetadata('missing')).rejects.toBeInstanceOf(
      PackageNotFoundError,
    );
  });
});
