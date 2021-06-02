<template>
  <div>
    <page-header :title="headerTitle" :tabs="cloudEnvOptions" :current-tab.sync="cloudEnv" />
    <page-body>
      <component :is="component" :type="type" ref="formRef" />
    </page-body>
    <page-footer>
      <template v-slot:right>
        <div v-if="type==='public'" class="mr-4 d-flex align-items-center">
          <div class="text-truncate">{{$t('compute.text_286')}}</div>
          <div class="ml-2 prices">
            <div class="hour error-color d-flex">
              <template v-if="price">
                <m-animated-number :value="price" :formatValue="formatToPrice" />
                <discount-price class="ml-2 mini-text" :discount="priceData.discount" :origin="originPrice" />
              </template>
              <template v-else>---</template>
            </div>
            <div class="tips text-truncate">
              <span v-html="priceTips" />
            </div>
          </div>
        </div>
        <a-button type="primary" class="mr-2" @click="submit" :loading="loading">{{ $t('common.create') }}</a-button>
        <a-button @click="cancel">{{$t('network.text_31')}}</a-button>
      </template>
    </page-footer>
  </div>
</template>

<script>
import _ from 'lodash'
import * as R from 'ramda'
import IDC from './form/IDC'
import Public from './form/Public'
import Private from './form/Private'
import { numerify } from '@/filters'
import { getCloudEnvOptions } from '@/utils/common/hypervisor'

export default {
  name: 'LbCreate',
  components: {
    IDC,
    Public,
    Private,
  },
  data () {
    const cloudEnvOptions = getCloudEnvOptions('compute_engine_brands', true)
    const queryType = this.$route.query.type
    let cloudEnv = queryType === 'idc' ? 'onpremise' : this.$route.query.type
    let routerQuery = this.$route.query.type
    if (!cloudEnvOptions.find(val => val.key === cloudEnv)) {
      cloudEnv = cloudEnvOptions[0].key
      routerQuery = cloudEnv === 'onpremise' ? 'idc' : cloudEnv
    }
    return {
      loading: false,
      cloudEnvOptions,
      cloudEnv,
      routerQuery,
      pricesList: [],
    }
  },
  computed: {
    type () {
      const { type = 'idc' } = this.$route.query
      switch (type) {
        case 'private':
          return 'private'
        case 'public':
          return 'public'
        default:
          return 'idc'
      }
    },
    component () {
      const { type = 'idc' } = this.$route.query
      switch (type) {
        case 'private':
          return 'Private'
        case 'public':
          return 'Public'
        default:
          return 'IDC'
      }
    },
    headerTitle () {
      const res = this.$t('network.text_137')
      return this.$t('compute.text_1161', [res])
    },
    formatToPrice (val) {
      let unit = this.$t('network.unit.hour')
      const price = numerify(val, '0,0.00')
      if (this.isPackage) {
        unit = this.$t('network.unit.month')
      }
      return `${this.currency} ${price}/${unit}`
    },
    price () {
      const count = this.count
      if (count && this.pricesList && this.pricesList.length > 0) {
        const { month_price: month, sum_price: sum } = this.pricesList[0]
        let _price = parseFloat(sum)
        if (this.isPackage && this.durationNum) {
          _price = parseFloat(month) * this.durationNum
        }
        return _price * parseFloat(count)
      }
      return null
    },
    priceData () {
      const data = _.get(this.pricesList, '[0]', { discount: 1 })
      return data
    },
    originPrice () {
      if (this.pricesList && this.pricesList.length > 0) {
        const { month_gross_price: month, hour_gross_price: sum } = this.pricesList[0]
        let _price = parseFloat(sum)
        if (this.isPackage && this.durationNum) {
          _price = parseFloat(month) * this.durationNum
        }

        return _price
      }

      return null
    },
  },
  watch: {
    cloudEnv (val) {
      this.$nextTick(() => {
        const query = this.getQuery(this.$router.history.current.query)
        const path = this.$router.history.current.path
        const newQuery = JSON.parse(JSON.stringify(query))
        newQuery.type = val === 'onpremise' ? 'idc' : val
        this.$router.push({ path, query: newQuery })
      })
    },
  },
  created () {
    if (this.routerQuery !== this.$route.query.type) {
      this.$router.push({
        path: this.$router.history.current.path,
        query: {
          type: this.routerQuery,
        },
      })
    }
  },
  beforeDestroy () {
    window.removeEventListener('popstate', this.popstate)
  },
  methods: {
    getQuery (query) {
      if (query.sence === 'image') {
        return { type: query.type }
      }
      return query
    },
    async getPrice () {
      try {
        if (!this.hasMeterService) return // 如果没有 meter 服务则取消调用
        const fd = await this.$refs.formRef.submit()
        if (R.isEmpty(fd.sku) || R.isNil(fd.sku)) return
        const params = {}
        const { data: { data = [] } } = await new this.$Manager('price_infos', 'v1').get({ id: '', params })
        this.pricesList = data
      } catch (error) {
        throw error
      }
    },
    async submit () {
      this.loading = true
      try {
        const data = await this.$refs.formRef.submit()
        await new this.$Manager('loadbalancers').create({ data })
        this.loading = false
        this.$message.success(this.$t('network.text_290'))
        this.cancel()
      } catch (error) {
        this.loading = false
        throw error
      }
    },
    cancel () {
      this.$router.push('/lb')
    },
  },
}
</script>
