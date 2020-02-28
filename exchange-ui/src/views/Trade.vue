<template>
  <div class="home">
    <b-loading :is-full-page="isFullPage" :active.sync="isLoading" :can-cancel="false"></b-loading>
    <div class="columns" v-if="trade.owner !== user">
      <div class="column is-three-fifths is-offset-one-fifth" v-if="trade.type === 'SELL'">
        <h2 style="text-align:center; font-size:28px; font-weight:bold; margin-bottom:20px;">Buy {{ sidechain.data.genesis.symbol }} for LYRA</h2>
        <h3 style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:20px;">Price is {{ trade.price }} LYRA for 1 {{ sidechain.data.genesis.symbol}}</h3>

        <b-field :label="'Amount you mean to buy (Max is '+ trade.amountPair +' ' + sidechain.data.genesis.symbol +')'" class="text-center">
            <b-input size="is-large" :controls="false" v-model="amountPair" v-on:input="fixAmounts('pair')" type="is-dark"></b-input>
        </b-field> 
        <b-field :label="'Amount you will spend (Max is '+ trade.amountAsset +' LYRA)'" class="text-center">
            <b-input size="is-large" class="text-center" :controls="false" v-model="amountAsset" v-on:input="fixAmounts('asset')" type="is-dark"></b-input>
        </b-field>
        <div style="text-align:right; font-size:14px">You have {{ userBalance }} LYRA</div>

        <div class="text-center" v-if="!isSending">
          <div v-if="valid" v-on:click="openUnlock" class="button is-primary is-large">BUY</div>
          <div v-if="!valid">Amount is invalid.</div>
        </div>
        <div class="text-center" v-if="isSending">
          Sending LYRA, please wait.
        </div>
      </div>
      <div class="column is-three-fifths is-offset-one-fifth" v-if="trade.type === 'BUY'">
        <h2 style="text-align:center; font-size:28px; font-weight:bold; margin-bottom:20px;">Sell {{ sidechain.data.genesis.symbol }} for LYRA</h2>
        <h3 style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:20px;">Price is {{ trade.price }} LYRA for 1 {{ sidechain.data.genesis.symbol}}</h3>

        <b-field :label="'Amount you mean to sell (Max is '+ trade.amountPair +' ' + sidechain.data.genesis.symbol +')'" class="text-center">
            <b-input size="is-large" :controls="false" v-model="amountPair" v-on:input="fixAmounts('pair')" type="is-dark"></b-input>
        </b-field> 
        <div style="text-align:right; font-size:14px">You have {{ userBalance }} {{ sidechain.data.genesis.symbol }}</div>
        <b-field :label="'Amount you will earn (Max is '+ trade.amountAsset +' LYRA)'" class="text-center">
            <b-input size="is-large" class="text-center" :controls="false" v-model="amountAsset" v-on:input="fixAmounts('asset')" type="is-dark"></b-input>
        </b-field>

        <div class="text-center" v-if="!isSending">
          <div v-if="valid" v-on:click="openUnlock" class="button is-primary is-large">SELL</div>
          <div v-if="!valid">Amount is invalid.</div>
        </div>
        <div class="text-center" v-if="isSending">
          Sending {{ sidechain.data.genesis.symbol }}, please wait.
        </div>
      </div>
    </div>
    <div class="columns" v-if="trade.owner === user">
      <div class="column is-three-fifths is-offset-one-fifth">
        <h2 style="text-align:center; font-size:28px; font-weight:bold; margin-bottom:20px;">You're selling {{ sidechain.data.genesis.symbol }} for LYRA</h2>
        <h3 style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:20px;">Price is {{ trade.price }} LYRA for 1 {{ sidechain.data.genesis.symbol}}</h3>
      </div>
    </div>
  </div>
</template>

<script>
  const axios = require('axios')
  export default {
    name: 'Trade',
    mounted : async function(){
        const app = this
        app.checkUser()
        await app.getTrade()
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
        openUnlock() {
            let valid = true
            const app = this
            let amountAssetWithFees = 0
            if(app.trade.type === 'SELL'){
              amountAssetWithFees = parseFloat(app.amountAsset) + 0.002
              if(parseFloat(app.userBalance) < amountAssetWithFees){
                valid = false
                app.$buefy.toast.open({
                    message: 'Not enough LYRA!',
                    type: 'is-danger'
                })
              }
            }else if(app.trade.type === 'BUY'){
              if( parseFloat(app.userBalance) < parseFloat(app.amountPair)){
                valid = false
                app.$buefy.toast.open({
                    message: 'Not enough assets!',
                    type: 'is-danger'
                })
              }
            }
            if(valid === true){
              app.$buefy.dialog.prompt({
                  message: `Enter your wallet password to complete trade.`,
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
                      if(app.trade.type === 'SELL'){
                        app.isSending = true
                        let buy = await app.axios.post(app.apiurl + '/wallet/sendlyra',{
                          "from": app.user,
                          "to": app.trade.address,
                          "amount": amountAssetWithFees,
                          "private_key": wallet.prv
                        })
                        app.isSending = false
                        if(buy['data']['success'] === true){
                          app.$buefy.toast.open({
                              message: 'LYRA sent correctly!',
                              type: 'is-success'
                          })
                          app.getTrade()
                        }else{
                          app.$buefy.toast.open({
                              message: 'Somthing goes wrong please retry.',
                              type: 'is-danger'
                          })
                          app.isSending = false
                        }
                      }else if(app.trade.type === 'BUY'){
                        let send = await app.axios.post(app.apiurl + '/wallet/sendtoken',{
                          "from": app.user,
                          "to": app.trade.address,
                          "amount": app.amountPair,
                          "private_key": wallet.prv,
                          "pubkey": wallet.key,
                          "sidechain_address": app.trade.pair,
                          "fee": 0.002
                        })
                        app.isSending = false
                        if(send['data']['lyra']['success'] === true && send['data']['sidechain']['txs'].length === 1){
                          app.$buefy.toast.open({
                              message: app.sidechain.data.genesis.symbol + ' sent correctly!',
                              type: 'is-success'
                          })
                          setTimeout(function(){
                            window.location = '/#/user'
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
                  }
              })
            }
        },
        async fixAmounts(what){
          const app = this
          let valid = true
          let decimals = parseInt(app.sidechain.data.genesis.decimals)
          if(app.amountAsset === ''){
            app.amountAsset = 0
          }
          if(app.amountPair === ''){
            app.amountPair = 0
          }
          if(app.amountAsset > 0){
            app.amountAsset = parseFloat(parseFloat(app.amountAsset).toFixed(8))
          }
          if(app.amountPair > 0){
            app.amountPair = parseFloat(parseFloat(app.amountPair).toFixed(decimals))
          }
          if(app.amountAsset > app.trade.amountAsset){
            valid = false
          }
          if(app.amountPair > app.trade.amountPair){
            valid = false
          }
          app.valid = valid
          if(valid === true){
            if(what === 'pair'){
              app.amountAsset = parseFloat(app.amountPair) * parseFloat(app.trade.price)
            }else{
              app.amountPair = parseFloat(app.amountAsset) / parseFloat(app.trade.price)
            }

            app.amountAsset = parseFloat(parseFloat(app.amountAsset).toFixed(8))
            app.amountPair = parseFloat(parseFloat(app.amountPair).toFixed(decimals))
          }
        },
        async getTrade(){
          const app = this
          let trade = await app.axios.post(app.apiurl + '/trades/get', { uuid: app.$route.params.uuid })
          app.trade = trade['data']['trade']
          app.sidechain = trade['data']['sidechain']
          app.amountPair = app.trade.amountPair
          app.amountAsset = app.trade.amountAsset
          if(app.trade.type === 'SELL'){
            let balance = await app.axios.post(app.apiurl + '/wallet/balance', { asset: 'LYRA', address: app.user })
            app.userBalance = balance['data']
          }else if(app.trade.type === 'BUY'){
            let balance = await app.axios.post(app.apiurl + '/wallet/balance', { asset: app.trade.pair, address: app.user })
            app.userBalance = balance['data']
          }
          app.isLoading = false
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
          userBalance: 0,
          valid: true,
          focus: '',
          isLoading: true,
          isFullPage: true,
          isSending: false,
          assetSelected: '',
          amountPair: 0,
          amountAsset: 0,
          trade: {
            type: '-'
          },
          sidechain: {
            data: {
              genesis: {
                symbol: '-'
              }
            }
          },
          apiurl: 'https://ex.planum.dev'
        }
    }
  }
</script>