import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as Daemon from './utils/daemon'
import { join } from 'path';
declare const module: any;

global['daemon'] = false
if(process.env.TESTNET !== undefined){
  if(process.env.TESTNET === 'true'){
    // TESTNET BLOCKCHAIN PARAMS
    global['lyraInfo'] = {
      private: 0xae,
      public: 0x7f,
      scripthash: 0x13
    }
  }else{
    // MAINNET BLOCKCHAIN PARAMS
    global['lyraInfo'] = {
      private: 0xae,
      public: 0x30,
      scripthash: 0x0d
    }
  }
}else{
  // MAINNET BLOCKCHAIN PARAMS
  global['lyraInfo'] = {
    private: 0xae,
    public: 0x30,
    scripthash: 0x0d
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
  );
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.enableCors();
  await app.listen(3002);
  
  if(global['daemon'] === false){
    clearInterval(global['daemon'])
    global['daemon'] = setInterval(async function(){
      console.log('CHECKING ALL TRADES')
      let daemon = new Daemon.Watch
      await daemon.expired()
      await daemon.deposits()
      await daemon.matches()
      console.log('CHECKING COMPLETED, WAITING 10s')
    }, 10000)
  }

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();