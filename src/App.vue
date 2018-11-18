<template>
    <div id="app">
        <div>
            Glemo RPC host：
            <i-input v-model.trim="lemoHost" class="tx-count-input"></i-input>
            <i-button v-show="lemoHost" :loading="connectionState===CONNECTING" @click="connectLemo">Connect</i-button>
        </div>
        <Alert v-if="connectionState" :type="connectionState===SUCCESS?'success':'error'" show-icon>
            Glemo connection: {{connectionState}}
            <span v-if="connectionState===FAIL" slot="desc">Please run Glemo with flags: <span>{{rpcFlag}}</span></span>
        </Alert>
        <div>
            Transactions count：
            <i-input v-model.number="txCount" class="tx-count-input" placeholder="10000 cost about 30 seconds"></i-input>
            <i-button v-show="txCount>0" @click="onBtnClick">{{txListIsReady?'Send':'Create'}}</i-button>
        </div>
        <i-progress v-show="startTime>0" :percent="progress" :stroke-width="5">
            <span>{{(endTime - startTime) / 1000}}s</span>
        </i-progress>
    </div>
</template>

<script>
    import LemoClient from 'lemo-client'

    export default {
        name: 'app',
        data() {
            return {
                lemoHost: 'http://127.0.0.1:8001',
                isConnecting: false,
                lemo: null,
                connectionState: '',
                txCount: '',
                signedTxList: [],
                finishCount: 0,
                startTime: 0,
                endTime: 0,

                rpcFlag: `--rpc --rpccorsdomain ${location.origin}`,
                CONNECTING: 'Connecting',
                SUCCESS: 'Success',
                FAIL: 'Fail',
            }
        },
        computed: {
            txListIsReady() {
                return this.signedTxList.length === this.txCount
            },
            progress() {
                return Math.floor(100 * this.finishCount / this.txCount)
            },
        },
        async mounted() {
            this.connectLemo()
        },
        methods: {
            connectLemo() {
                this.lemo = new LemoClient({host: this.lemoHost})

                this.testConnection()
            },
            async testConnection() {
                try {
                    this.connectionState = this.CONNECTING
                    await this.lemo.getNodeVersion()
                    this.connectionState = this.SUCCESS
                } catch (e) {
                    this.connectionState = this.FAIL
                }
            },
            onBtnClick() {
                if (this.txListIsReady) {
                    this.sendTx()
                } else {
                    this.createTx()
                }
            },
            async createTx() {
                this.resetProgress()
                const startTime = this.startTime
                for (let i = this.txCount - 1; i >= 0; i--) {
                    const random = Math.random()
                    const txConfig = await this.lemo.tx.sign('0xc21b6b2fbf230f665b936194d14da67187732bf9d28768aef1a3cbb26608f8aa', {
                        expirationTime: startTime + Math.floor(random * 1800),
                        amount: Math.floor(random * 1000000000),
                        to: `0x${Math.floor(random * 10000)}`,
                    })
                    this.signedTxList.push(txConfig)
                }
                this.endTime = Date.now()
            },
            async sendTx() {
                this.resetProgress()
                for (let i = this.txCount - 1; i >= 0; i--) {
                    await this.lemo.tx.send(this.signedTxList[i])
                    this.finishCount++
                    this.endTime = Date.now()
                }
            },
            resetProgress() {
                this.startTime = Date.now()
                this.finishCount = 0
                this.endTime = Date.now()
            },
        },
        watch: {
            txCount() {
                this.signedTxList = []
                this.finishCount = 0
                this.startTime = 0
                this.endTime = 0
            },
        },
    }

</script>
<style scoped>
    #app {
        padding: 24px;
    }

    .tx-count-input {
        width: 300px;
        margin-right: 16px;
    }
</style>
