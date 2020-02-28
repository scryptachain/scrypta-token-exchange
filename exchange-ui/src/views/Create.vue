<template>
  <div class="home">
    <b-loading :is-full-page="isFullPage" :active.sync="isLoading" :can-cancel="false"></b-loading>
    <h2 style="text-align:center; font-size:28px; font-weight:bold; margin-bottom:20px;">Create new trade</h2>
    <div class="columns">
      <div class="column is-three-fifths is-offset-one-fifth">
        <b-field>
            <b-select
                placeholder="Select type"
                size="is-medium"
                v-model="trade.type"
                expanded>
                <option value="">Select a trade type</option>
                <option value="buy">I want to buy an asset</option>
                <option value="sell">I want to sell an asset</option>
            </b-select>
        </b-field>
        <b-field>
            <b-select
                placeholder="Select asset"
                size="is-medium"
                v-model="trade.pair"
                expanded>
                <option value="">Select an asset</option>
                <option v-for="asset in assets" v-bind:key="asset.address" :value="asset.address">{{ asset.genesis.name }}</option>
            </b-select>
        </b-field>
        <b-field :label="'Amount you mean to ' + trade.type" class="text-center">
            <b-input size="is-large" :controls="false" v-model="amountPair" v-on:input="fixAmounts('pair')" type="is-dark"></b-input>
        </b-field>
        <b-field :label="'Amount LYRA'" class="text-center">
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
    </div>
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
        app.isLoading = false
    },
    methods: {
        async checkUser(){
            const app = this
            let user = await app.scrypta.keyExist()
            if(user.length === 34){
              app.user = user
            }
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
                  message: `Enter your wallet password`,
                  inputAttrs: {
                      placeholder: 'Enter password',
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
                        }
                      }else{
                        app.$buefy.toast.open({
                              message: 'Somthing goes wrong please retry.',
                              type: 'is-danger'
                          })
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
            type: '',
            pair: '',
          },
          chains: [],
          assets: [],
          apiurl: 'http://localhost:3002'
        }
    }
  }
</script>