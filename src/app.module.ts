import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LyraModule } from './routes/lyra/lyra.module';
import { TradesModule } from './routes/trades/trades.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [LyraModule,TradesModule,ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}