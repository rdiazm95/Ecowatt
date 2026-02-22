import { Test, TestingModule } from '@nestjs/testing';
import { EsiosService } from './esios.service';

describe('EsiosService', () => {
  let service: EsiosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EsiosService],
    }).compile();

    service = module.get<EsiosService>(EsiosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
