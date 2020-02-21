import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LyraModule } from './routes/lyra/lyra.module';
import { TradesModule } from './routes/trades/trades.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    LyraModule,
    TradesModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot('mongodb://localhost/exchange', { useNewUrlParser: true, useUnifiedTopology: true })
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}