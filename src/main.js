import Vue from 'vue'
import iView from 'iview'
import 'iview/dist/styles/iview.css'
import VueWorker from 'vue-worker'
import App from './App.vue'

Vue.use(iView)
Vue.use(VueWorker)

Vue.config.productionTip = false

new Vue({
    render: function(h) {
        return h(App)
    },
}).$mount('#app')
