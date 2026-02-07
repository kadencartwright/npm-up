import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UpgradeCandidateModule } from './upgrade-candidate.module';
import { UpgradeCandidateService } from './upgrade-candidate.service';

describe('UpgradeCandidateModule', () => {
  it('compiles and provides UpgradeCandidateService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({})],
        }),
        UpgradeCandidateModule,
      ],
    }).compile();

    expect(moduleRef.get(UpgradeCandidateService)).toBeDefined();
  });
});
