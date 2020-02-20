import { Controller, Get } from '@nestjs/common';
import { LyraService } from './lyra.service';

@Controller('lyra')
export class LyraController {
  constructor(private readonly lyra: LyraService) {}

  @Get('getinfo')
  async getInfo(): Promise<string> {
    return await this.lyra.getInfo()
  }
}