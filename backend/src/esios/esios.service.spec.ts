import { Test, TestingModule } from '@nestjs/testing';
import { EsiosService } from './esios.service';
import { ConfigService } from '@nestjs/config';

describe('EsiosService', () => {
  let service: EsiosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EsiosService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock_value'),
          },
        },
      ],
    }).compile();

    service = module.get<EsiosService>(EsiosService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });
});