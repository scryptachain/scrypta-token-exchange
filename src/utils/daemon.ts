
module Daemon {

    export class Watch {
  
      public async trades(method, params = []) {
          return new Promise(response => {
              response(true)
          })
      }
    }

}

export = Daemon