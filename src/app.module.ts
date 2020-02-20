import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LyraModule } from './libs/lyra/lyra.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [LyraModule,ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}