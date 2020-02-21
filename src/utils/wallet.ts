var CoinKey = require('coinkey')

module Wallet {

    export class Lyra {
  
        public async createnewaddress() : Promise<Object> {
            return new Promise(response => {
                var ck = new CoinKey.createRandom(global['lyraInfo'])
                var lyrapub = ck.publicAddress;
                var lyraprv = ck.privateWif;
                var lyrakey = ck.publicKey.toString('hex');

                response({
                    address: lyrapub,
                    private_key: lyraprv,
                    pub_key: lyrakey
                })
            })
        }

        public async send(method, params = []) {
            return new Promise(response => {
                response(true)
            })
        }

        public async balance(method, params = []) {
            return new Promise(response => {
                response(true)
            })
        }

    }

    export class Planum {
  
        public async send(method, params = []) {
            return new Promise(response => {
                response(true)
            })
        }

        public async balance(method, params = []) {
            return new Promise(response => {
                response(true)
            })
        }

    }

}

export = Wallet