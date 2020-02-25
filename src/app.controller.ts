import { Controller, Get, Post, Render, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root(@Res() res) {
    res.sendFile("index.html");
  }

  @Get('/status')
  getInfo(): string {
    return this.appService.getInfo();
  }

}
