<template>
  <div class="home">
    <b-loading :is-full-page="isFullPage" :active.sync="isLoading" :can-cancel="false"></b-loading>
    <h2 style="text-align:center; font-size:28px; font-weight:bold; margin-bottom:20px;">Buy and Sell assets with LYRA</h2>
    <div class="columns">
      <div class="column is-one-third is-offset-one-third">
        <b-field>
            <b-select
                placeholder="Select asset"
                size="is-medium"
                v-model="assetSelected"
                v-on:input="filterAssets"
                expanded>
                <option value="">Show all offers</option>
                <option v-for="asset in assets" v-bind:key="asset.address" :value="asset.address">{{ asset.genesis.name }}</option>
            </b-select>
        </b-field>
      </div>
    </div>
    <b-tabs size="is-medium" position="is-centered" type="is-toggle-rounded" :animated="false" class="block">
        <b-tab-item label="Sell" style="margin-top:20px">
          <div v-if="sells.length === 0">
            <h2 style="text-align:center; font-weight:bold; font-size:24px;">No sell orders.</h2>
          </div>
          <div class="columns">
            <div class="column is-three-fifths is-offset-one-fifth">
              <div v-for="trade in sells" v-bind:key="trade.uuid">
                <div v-if="trade.type === 'SELL'" class="list-trade">
                  <div class="columns">
                    <div class="column">
                      <strong>SELLS</strong><br>
                      {{ trade.amountPair }} {{ chains[trade.pair] }}
                    </div>
                    <div class="column">
                      <strong>FOR</strong><br>
                      {{ trade.amountAsset }} LYRA
                    </div>
                    <div class="column">
                      <strong>CREATED</strong><br>
                      {{ trade.timestamp }}
                    </div>
                    <div class="column">
                      <strong>EXPIRES</strong><br>
                      {{ trade.expiration }}
                    </div>
                    <div class="column">
                      <a :href="'/#/trade/' + trade.uuid">
                          <div class="button is-primary is-large" style="float:right">BUY</div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </b-tab-item>
        <b-tab-item label="Buy" style="margin-top:20px">
          <div v-if="buys.length === 0">
            <h2 style="text-align:center; font-weight:bold; font-size:24px;">No buy orders.</h2>
          </div>
          <div class="columns">
            <div class="column is-three-fifths is-offset-one-fifth">
              <div v-for="trade in buys" v-bind:key="trade.uuid">
                <div v-if="trade.type === 'BUY'" class="list-trade">
                  <div class="columns">
                    <div class="column">
                      <strong>BUYS</strong><br>
                      {{ trade.amountPair }} {{ chains[trade.pair] }}
                    </div>
                    <div class="column">
                      <strong>FOR</strong><br>
                      {{ trade.amountAsset }} LYRA
                    </div>
                    <div class="column">
                      <strong>CREATED</strong><br>
                      {{ trade.timestamp }}
                    </div>
                    <div class="column">
                      <strong>EXPIRES</strong><br>
                      {{ trade.expiration }}
                    </div>
                    <div class="column">
                      <a :href="'/#/trade/' + trade.uuid">
                        <div class="button is-primary is-large" style="float:right">SELL</div>
                      </a>
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
          
          for(let x in app.trades){
            if(app.trades[x].type === 'BUY'){
              if(app.trades[x].pair === app.assetSelected || app.assetSelected === ''){
                app.buys.push(app.trades[x])
              }
            }else if(app.trades[x].type === 'SELL'){
              if(app.trades[x].pair === app.assetSelected || app.assetSelected === ''){
                app.sells.push(app.trades[x])
              }
            }
          }
          app.isLoading = false
        },
        async getActiveTrades(){
          const app = this
          let trades = await app.axios.post(app.apiurl + '/trades/active')
          app.trades = trades['data']
          for(let x in app.trades){
            app.trades[x].timestamp = app.convertTime(app.trades[x].timestamp)
            app.trades[x].expiration = app.convertTime(app.trades[x].expiration)
            if(app.trades[x].type === 'BUY'){
              app.buys.push(app.trades[x])
            }else if(app.trades[x].type === 'SELL'){
              app.sells.push(app.trades[x])
            }
          }
          app.isLoading = false
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
          apiurl: 'http://localhost:3002'
        }
    }
  }
</script>