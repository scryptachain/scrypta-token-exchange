<template>
  <div id="app">
    <b-navbar>
      <template slot="brand">
          <b-navbar-item tag="router-link" :to="{ path: '/' }">
              <img src="./assets/planum.png" height="40">
          </b-navbar-item>
      </template>
      <template slot="start">
          <b-navbar-item href="/#/">
              Exchange
          </b-navbar-item>
          <b-navbar-item href="https://planum.dev/#/explorer" target="_blank">
              Explorer
          </b-navbar-item>
          <b-navbar-item href="https://planum.dev/#/create" target="_blank">
              Create asset
          </b-navbar-item>
      </template>

      <template slot="end">
          <b-navbar-item tag="div">
              <div class="buttons">
                  <a class="button is-primary" v-if="!user" href="/#/login">
                      <strong>Login</strong>
                  </a>
                  <a class="button is-primary" href="/#/create" v-if="user">
                      <strong><b-icon icon="plus"></b-icon></strong>
                  </a>
                  <a class="button is-primary" href="/#/user" v-if="user">
                      <strong><b-icon icon="account"></b-icon></strong>
                  </a>
                  <a class="button" v-if="user" v-on:click="logout">
                      <strong>Logout</strong>
                  </a>
              </div>
          </b-navbar-item>
      </template>
    </b-navbar>
    <router-view/>
    <hr>
    <div class="text-center" style="font-size:11px;">
        Open source project by <a href="https://scrypta.foundation" target="_blank">Scrypta Foundation</a>
    </div>
  </div>
</template>

<script>
    export default {
    name: 'home',
    mounted : function(){
        const app = this
        app.checkUser()
    },
    methods: {
        async checkUser(){
            const app = this
            let user = await app.scrypta.keyExist()
            if(user.length === 34){
            app.user = user
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
        axios: window.axios,
        user: ''
        }
    }
    }
</script>
