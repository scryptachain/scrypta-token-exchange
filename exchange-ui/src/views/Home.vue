<template>
  <div class="home">
    <b-loading :is-full-page="isFullPage" :active.sync="isLoading" :can-cancel="false"></b-loading>
  </div>
</template>

<script>

export default {
  name: 'Home',
    data() {
      return {
          isLoading: true,
          isFullPage: true
      }
    },
    mounted(){
      const app = this
      setTimeout(function(){
        app.isLoading = false
      },300)
    }
}
</script>
