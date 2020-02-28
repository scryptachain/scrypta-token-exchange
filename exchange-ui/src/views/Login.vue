<template>
  <div class="container" style="margin-top:40px">
    <div class="row">
      <div class="col-12">
        <h1>Login</h1>
        <h3>Please enter with your .sid file or use <i>ScryptaID Extension</i>.</h3>
        <hr>
        <b-field>
            <b-upload v-model="file"
                v-on:input="loadWalletFromFile"
                drag-drop>
                <section class="section">
                    <div class="content has-text-centered">
                        <p>
                            <b-icon
                                icon="upload"
                                size="is-large">
                            </b-icon>
                        </p>
                        <p>Drop your .sid file here.</p>
                    </div>
                </section>
            </b-upload>
        </b-field>
      </div>
    </div>
    <div class="node-badge" v-if="connected">{{ connected }}</div>
  </div>
</template>


<script>

export default {
  name: 'Login',
  mounted : function(){
    const app = this
    app.checkUser()
  },
  methods: {
      async checkUser(){
        const app = this
        let user = await app.scrypta.keyExist()
        if(user.length === 34){
          window.location='/#/'
        }
      },
      loadWalletFromFile() {
        const app = this
        const file = app.file;
        const reader = new FileReader();
        reader.onload = function() {
          var dataKey = reader.result;
          app.scrypta.saveKey(dataKey).then(function() {
            location.reload()
          });
        };
        reader.readAsText(file);
      }
  },
  data () {
    return {
      scrypta: window.ScryptaCore,
      nodes: [],
      connected: '',
      isLoading: true,
      file: []
    }
  }
}
</script>

<style>
  .node-badge{
    position:fixed; bottom:-3px; font-size:10px; padding:8px; right:10px; z-index:9999;
  }
</style>