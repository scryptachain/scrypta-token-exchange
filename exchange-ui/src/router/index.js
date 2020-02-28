import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/trade/:uuid',
    name: 'Trade',
    component: () => import('../views/Trade.vue')
  }
]

const router = new VueRouter({
  routes
})

export default router
