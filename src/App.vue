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
        <i-progress v-show="txCount>0" class="tx-progress" :percent="progress" :stroke-width="5">
            <span v-show="finishCount!==txCount">{{finishCount}}/{{txCount}}</span>
            <span v-show="finishCount===txCount">{{(endTime - startTime) / 1000}}s</span>
        </i-progress>
    </div>
</template>

<script>
    import LemoClient from 'lemo-client'
    import parallelLimit from 'async/parallelLimit';

    const PRIVATE_KEY = '0xc21b6b2fbf230f665b936194d14da67187732bf9d28768aef1a3cbb26608f8aa'

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
                const unsignedConfigs = []
                let totalAmount = 0
                for (let i = this.txCount - 1; i >= 0; i--) {
                    const random = Math.random()
                    const amount = Math.floor(random * 1000000000)
                    totalAmount += amount
                    unsignedConfigs.push({
                        expirationTime: startTime + Math.floor(random * 1800),
                        amount,
                        to: `0x${Math.floor(random * 10000)}`,
                    })
                }
                // use time out to make sure the UI updated in time
                const signFn = txConfig => timeoutPromise(0).then(() => this.lemo.tx.sign(PRIVATE_KEY, txConfig))
                this.signedTxList = await runConcurrently(unsignedConfigs, signFn, 1000, () => this.finishCount++)
                this.endTime = Date.now()
                console.log('total amount', totalAmount)
            },
            async sendTx() {
                this.resetProgress()
                const sendFn = txConfig => this.lemo.tx.send(txConfig)
                await runConcurrently(this.signedTxList, sendFn, 1000, () => this.finishCount++)
                this.endTime = Date.now()
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

    async function runConcurrently(dataList, fn, concurrencyCount, onProgress) {
        let finish = 0
        const total = dataList.length
        const asyncFunctions = dataList.map(item => {
            return callback => {
                fn(item).then(result => {
                    onProgress(++finish, total)
                    callback(null, result)
                }, callback)
            }
        })
        return new Promise((resolve, reject) => {
            parallelLimit(asyncFunctions, concurrencyCount, (err, results) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(results)
                }
            })
        })
    }

    function timeoutPromise(timeout) {
        return new Promise(resolve => setTimeout(resolve, timeout))
    }
</script>
<style>
    #app {
        padding: 24px;
    }

    .tx-count-input {
        width: 300px;
        margin-right: 16px;
    }

    .tx-progress.ivu-progress-show-info .ivu-progress-outer {
        padding-right: 80px;
        margin-right: -80px;
    }
</style>
