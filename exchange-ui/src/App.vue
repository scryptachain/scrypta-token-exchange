<template>
  <div id="app">
    <b-navbar>
      <template slot="brand">
          <b-navbar-item tag="router-link" :to="{ path: '/' }">
              <img src="./assets/planum.png" height="40">
          </b-navbar-item>
      </template>
      <template slot="start">
          <b-navbar-item href="#">
              Home
          </b-navbar-item>
          <b-navbar-item href="#">
              Documentation
          </b-navbar-item>
          <b-navbar-dropdown label="Info">
              <b-navbar-item href="#">
                  About
              </b-navbar-item>
              <b-navbar-item href="#">
                  Contact
              </b-navbar-item>
          </b-navbar-dropdown>
      </template>

      <template slot="end">
          <b-navbar-item tag="div">
              <div class="buttons">
                  <a class="button is-primary">
                      <strong>Sign up</strong>
                  </a>
                  <a class="button is-light">
                      Log in
                  </a>
              </div>
          </b-navbar-item>
      </template>
    </b-navbar>
    <router-view/>
  </div>
</template>

<style lang="scss">
    @import "~bulma/sass/utilities/_all";
    $primary: #D8213B;
    $primary-invert: findColorInvert($primary);
    $twitter: #4099FF;
    $twitter-invert: findColorInvert($twitter);

    $colors: (
        "white": ($white, $black),
        "black": ($black, $white),
        "light": ($light, $light-invert),
        "dark": ($dark, $dark-invert),
        "primary": ($primary, $primary-invert),
        "info": ($info, $info-invert),
        "success": ($success, $success-invert),
        "warning": ($warning, $warning-invert),
        "danger": ($danger, $danger-invert),
        "twitter": ($twitter, $twitter-invert)
    );

    $link: $primary;
    $link-invert: $primary-invert;
    $link-focus-border: $primary;

    @import "~bulma";
    @import "~buefy/src/scss/buefy";

    body, html{
        font-family: "Work Sans"!important;
    }
</style>