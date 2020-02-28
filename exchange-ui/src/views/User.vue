<template>
  <div class="home">
    <b-loading :is-full-page="isFullPage" :active.sync="isLoading" :can-cancel="false"></b-loading>
    <h2 style="text-align:center; font-size:28px; font-weight:bold; margin-bottom:20px;">Your trades</h2>
    <div class="columns">
      <div class="column is-one-third is-offset-one-third">
        <b-field>
            <b-select
                placeholder="Select asset"
                size="is-medium"
                v-model="assetSelected"
                v-on:input="filterAssets"
                expanded>
                <option value="">Filter by asset</option>
                <option v-for="asset in assets" v-bind:key="asset.address" :value="asset.address">{{ asset.genesis.name }}</option>
            </b-select>
        </b-field>
      </div>
    </div>
    <b-tabs size="is-medium" position="is-centered" type="is-toggle-rounded" :animated="false" class="block">
        <b-tab-item label="Sellling" style="margin-top:20px">
          <div v-if="sells.length === 0">
            <h2 style="text-align:center; font-weight:bold; font-size:24px;">No sell orders.</h2>
          </div>
          <div class="columns">
            <div class="column is-three-fifths is-offset-one-fifth">
              <div v-for="trade in sells" v-bind:key="trade.uuid">
                <div v-if="trade.type === 'SELL'" class="list-trade">
                  <div class="columns">
                    <div class="column">
                      <strong>STATE</strong><br>
                      {{ trade.state }}
                    </div>
                    <div class="column">
                      <strong>SELLING</strong><br>
                      {{ trade.amountPair }} {{ chains[trade.pair] }}
                    </div>
                    <div class="column">
                      <strong>FOR</strong><br>
                      {{ trade.amountAsset }} LYRA
                    </div>
                    <div class="column">
                      <strong>EXPIRES</strong><br>
                      {{ trade.expiration }}
                    </div>
                    <div class="column">
                      <div class="button is-primary is-large" v-on:click="cancelTrade(trade.uuid)" style="float:right">CANCEL</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </b-tab-item>
        <b-tab-item label="Buying" style="margin-top:20px">
          <div v-if="buys.length === 0">
            <h2 style="text-align:center; font-weight:bold; font-size:24px;">No buy orders.</h2>
          </div>
          <div class="columns">
            <div class="column is-three-fifths is-offset-one-fifth">
              <div v-for="trade in buys" v-bind:key="trade.uuid">
                <div v-if="trade.type === 'BUY'" class="list-trade">
                  <div class="columns">
                    <div class="column">
                      <strong>STATE</strong><br>
                      {{ trade.state }}
                    </div>
                    <div class="column">
                      <strong>BUYING</strong><br>
                      {{ trade.amountPair }} {{ chains[trade.pair] }}
                    </div>
                    <div class="column">
                      <strong>FOR</strong><br>
                      {{ trade.amountAsset }} LYRA
                    </div>
                    <div class="column">
                      <strong>EXPIRES</strong><br>
                      {{ trade.expiration }}
                    </div>
                    <div class="column">
                      <div class="button is-primary is-large" v-on:click="cancelTrade(trade.uuid)" style="float:right">CANCEL</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </b-tab-item>
        <b-tab-item label="Completed" style="margin-top:20px">
          <div v-if="completed.length === 0">
            <h2 style="text-align:center; font-weight:bold; font-size:24px;">No completed trades.</h2>
          </div>
          <div class="columns">
            <div class="column is-three-fifths is-offset-one-fifth">
              <div v-for="trade in completed" v-bind:key="trade.uuid">
                <div v-if="trade.type === 'BUY'" class="list-trade">
                  <div class="columns">
                    <div class="column">
                      <strong>{{ trade.type.toUpperCase() }}</strong><br>
                      {{ trade.amountPair }} {{ chains[trade.pair] }}
                    </div>
                    <div class="column">
                      <strong>FOR</strong><br>
                      {{ trade.amountAsset }} LYRA
                    </div>
                    <div class="column">
                      <strong>PRICE</strong><br>
                      {{ trade.amountAsset / trade.amountPair }} LYRA
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </b-tab-item>
    </b-tabs>
  </div>
</template>

<script>
  const axios = require('axios')
  export default {
    name: 'Home',
    mounted : async function(){
        const app = this
        app.checkUser()
        await app.getAllAssets()
        app.getActiveTrades()
    },
    methods: {
        async checkUser(){
            const app = this
            let user = await app.scrypta.keyExist()
            if(user.length === 34){
              app.user = user
            }else{
              window.location = '/#/'
            }
        },
        convertTime(time){
          let unix_timestamp = time
          var date = new Date(unix_timestamp * 1000);
          
          var day = date.getUTCDate();
          var month = date.getUTCMonth() + 1;
          var year = date.getUTCFullYear();
          var hours = date.getHours();
          var minutes = "0" + date.getMinutes();
          var seconds = "0" + date.getSeconds();

          var formattedTime = day + '/' + month + '/' + year + ' at ' + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
          return formattedTime
        },
        async getAllAssets(){
          const app = this
          let idanode = await app.scrypta.connectNode()
          let assets = await app.axios.get(idanode + '/sidechain/list')
          app.assets = assets['data']['data']
          for(let x in app.assets){
            let asset = app.assets[x]
            app.chains[asset.address] = asset.genesis.symbol
          }
        },
        async filterAssets(){
          const app = this
          app.isLoading = true
          app.buys = []
          app.sells = []
          app.completed = []
          
          for(let x in app.trades){
            if(app.trades[x].state !== 'Completed' && app.trades[x].state !== 'Canceled'){
              if(app.trades[x].type === 'BUY'){
                if(app.trades[x].pair === app.assetSelected || app.assetSelected === ''){
                  app.buys.push(app.trades[x])
                }
              }else if(app.trades[x].type === 'SELL'){
                if(app.trades[x].pair === app.assetSelected || app.assetSelected === ''){
                  app.sells.push(app.trades[x])
                }
              }
            }else if(app.trades[x].state === 'Completed'){
              if(app.trades[x].pair === app.assetSelected || app.assetSelected === ''){
                app.completed.push(app.trades[x])
              }
            }
          }
          app.isLoading = false
        },
        async getActiveTrades(){
          const app = this
          app.buys = []
          app.sells = []
          app.completed = []
          let trades = await app.axios.post(app.apiurl + '/trades/active', { address: app.user })
          app.trades = trades['data']
          for(let x in app.trades){
            app.trades[x].timestamp = app.convertTime(app.trades[x].timestamp)
            app.trades[x].expiration = app.convertTime(app.trades[x].expiration)
            if(app.trades[x].state !== 'Completed' && app.trades[x].state !== 'Canceled'){
              if(app.trades[x].type === 'BUY'){
                app.buys.push(app.trades[x])
              }else if(app.trades[x].type === 'SELL'){
                app.sells.push(app.trades[x])
              }
            }else if(app.trades[x].state === 'Completed'){
              app.completed.push(app.trades[x])
            }
          }
          app.isLoading = false
        },
        cancelTrade(uuid) {
            let valid = true
            const app = this
            if(valid === true){
              app.$buefy.dialog.prompt({
                  message: `Enter your wallet password to cancel trade.`,
                  inputAttrs: {
                      placeholder: 'Enter password here',
                      type: 'password'
                  },
                  trapFocus: true,
                  onConfirm: async (value) => {
                    let wallet = await app.scrypta.readKey(value)
                    if(wallet === false){
                      app.$buefy.toast.open({
                          message: 'Wrong password!',
                          type: 'is-danger'
                      })
                    }else{
                      app.isSending = true
                      let proof = {
                        uuid: uuid,
                        action: 'cancelTrade'
                      }
                      let sign = await app.scrypta.signMessage(wallet.prv, JSON.stringify(proof))
                      let payload = {}
                      payload.tradeUUID = uuid
                      payload.cancelProof = sign.signature
                      payload.cancelPubKey = sign.pubkey
                      let buy = await app.axios.post(app.apiurl + '/trades/cancel',payload)
                      if(buy['data']['success'] === true){
                        app.$buefy.toast.open({
                            message: 'Trade cancelled correctly!',
                            type: 'is-success'
                        })
                        setTimeout(async function(){
                          await app.getActiveTrades()
                          app.isSending = false
                        },1000)
                      }else{
                        app.$buefy.toast.open({
                            message: 'Somthing goes wrong please retry.',
                            type: 'is-danger'
                        })
                        app.isSending = false
                      }
                    }
                  }
              })
            }
        },
        async logout() {
            const app = this;
            await app.scrypta.forgetKey();
            location.reload();
        }
    },
    data () {
        return {
          scrypta: window.ScryptaCore,
          axios: axios,
          user: '',
          isLoading: true,
          isFullPage: true,
          assetSelected: '',
          chains: {},
          trades: [],
          assets: [],
          sells: [],
          buys: [],
          completed: [],
          apiurl: 'https://ex.planum.dev'
        }
    }
  }
</script>