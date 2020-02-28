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
                v-on:input="fixInputs"
                expanded>
                <option value="BUY">I want to buy an asset</option>
                <option value="SELL">I want to sell an asset</option>
            </b-select>
        </b-field>
        <b-field>
            <b-select
                placeholder="Select asset"
                size="is-medium"
                v-model="trade.pair"
                v-on:input="fixInputs"
                expanded>
                <option value="">Select an asset</option>
                <option v-for="asset in assets" v-bind:key="asset.address" :value="asset.address">{{ asset.genesis.name }}</option>
            </b-select>
        </b-field>
        <b-field :label="'Amount ' + chains[trade.pair] + ' you mean to ' + trade.type" class="text-center">
            <b-input size="is-large" v-model="amountPair" v-on:input="calculatePrice('pair')" type="is-dark"></b-input>
        </b-field>
        <b-field :label="'Amount LYRA ' + labelAsset" class="text-center">
            <b-input size="is-large" class="text-center" v-model="amountAsset" v-on:input="calculatePrice('asset')" type="is-dark"></b-input>
        </b-field>
        <h3 v-if="price" style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:20px;">You're {{ labelTrading }} at {{ price }} LYRA for 1 {{ chains[trade.pair] }}</h3>
        <div class="text-center" v-if="!isSending">
          <div v-if="valid" v-on:click="openUnlock" class="button is-primary is-large">CREATE TRADE</div>
        </div>
        <div class="text-center" v-if="isSending">
          Creating trade, please wait.
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
        async fixInputs(){
          const app = this
          if(app.trade.type === 'BUY'){
            app.labelAsset = 'you mean to spend'
            app.labelTrading = 'buying'
            let balance = await app.axios.post(app.apiurl + '/wallet/balance', { asset: 'LYRA', address: app.user })
            app.userBalance = balance['data']
          }else if(app.trade.type === 'SELL'){
            app.labelAsset = 'you want to earn'
            app.labelTrading = 'selling'
            let balance = await app.axios.post(app.apiurl + '/wallet/balance', { asset: app.trade.pair, address: app.user })
            app.userBalance = balance['data']
          }
        },
        openUnlock() {
            let valid = true
            const app = this
            let amountAssetWithFees = 0
            if(app.trade.type === 'BUY'){
              amountAssetWithFees = parseFloat(app.amountAsset) + 0.001
              if(parseFloat(app.userBalance) < amountAssetWithFees){
                valid = false
                app.$buefy.toast.open({
                    message: 'Not enough balance, you have '+app.userBalance+' LYRA!',
                    type: 'is-danger'
                })
              }
            }else if(app.trade.type === 'SELL'){
              if(parseFloat(app.userBalance) < parseFloat(app.amountPair)){
                valid = false
                app.$buefy.toast.open({
                    message: 'Not enough assets, you have '+app.userBalance+' '+app.chains[app.trade.pair]+'!',
                    type: 'is-danger'
                })
              }
            }
            if(app.amountAsset === 0 || app.amountPair === 0 || app.trade.pair === ''){
              valid = false
              app.$buefy.toast.open({
                  message: 'Fill all the fields!',
                  type: 'is-danger'
              })
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
                      app.isSending = true
                      let payload = {
                        asset: "LYRA",
                        pair: app.trade.pair,
                        type: app.trade.type,
                        amountAsset: parseFloat(app.amountAsset),
                        amountPair: parseFloat(app.amountPair),
                        senderAddress: app.user
                      }
                      let sign = await app.scrypta.signMessage(wallet.prv, JSON.stringify(payload))
                      payload.insertProof = sign.signature
                      payload.insertPubKey = sign.pubkey
                      payload.insertHash = sign.hash
                      let create = await app.axios.post(app.apiurl + '/trades/create',payload)
                      if(create['data']['success'] === true){
                        if(app.trade.type === 'BUY'){
                          let send = await app.axios.post(app.apiurl + '/wallet/sendlyra',{
                            "from": app.user,
                            "to": create['data']['address'],
                            "amount": amountAssetWithFees,
                            "private_key": wallet.prv
                          })
                          app.isSending = false
                          if(send['data']['success'] === true){
                            app.$buefy.toast.open({
                                message: 'Order placed correctly!',
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
                          }
                        }else if(app.trade.type === 'SELL'){
                          let send = await app.axios.post(app.apiurl + '/wallet/sendtoken',{
                            "from": app.user,
                            "to": create['data']['address'],
                            "amount": app.amountPair,
                            "private_key": wallet.prv,
                            "pubkey": wallet.key,
                            "sidechain_address": app.trade.pair,
                            "fee": 0.001
                          })
                          app.isSending = false
                          if(send['data']['lyra']['success'] === true && send['data']['sidechain']['txs'].length === 1){
                            app.$buefy.toast.open({
                                message: 'Order placed correctly!',
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
                      }else{
                        app.$buefy.toast.open({
                            message: create['data']['message'],
                            type: 'is-danger'
                        })
                        app.isSending = false
                      }
                    }
                  }
              })
            }
        },
        calculatePrice(){
          const app = this
          if(app.amountAsset > 0 && app.amountPair > 0){
            app.price = parseFloat(app.amountAsset) / parseFloat(app.amountPair)
            app.price = parseFloat(app.price.toFixed(8))
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
          labelAsset: 'you mean to spend',
          labelTrading: 'buying',
          assetSelected: '',
          amountPair: 0,
          amountAsset: 0,
          price: 0,
          trade: {
            type: 'BUY',
            pair: '',
            price: 0
          },
          chains: {
            "": ""
          },
          assets: [],
          apiurl: 'https://ex.planum.dev'
        }
    }
  }
</script>