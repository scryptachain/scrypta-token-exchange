import { Controller, Get, Post, Render } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  root() {
    return { }
  }

  @Get('/status')
  getInfo(): string {
    return this.appService.getInfo();
  }

}
