<template>
  <div>
    <base-chart
      :id="this.id"
      :chartType="chartType"
      :chartData="chartData"
      :chartConfig="chartConfig"
      :chartSettings="chartSettings"
      :chartExtend="chartExtend"
      :loading="loading"
      :chartEvents="chartEvents"
      :extraToolbox="extraToolbox" />
    <download-excel v-show="false" ref="excel" :data="chartData.rows" :fields="excelColumnMap" :name="`export.xls`" />
  </div>
</template>

<script>
import * as R from 'ramda'
import commonChartProps from './common'
// eslint-disable-next-line no-unused-vars
import numerify from './formatters'

export default {
  name: 'OverviewLine',
  props: Object.assign({
    id: {
      type: String,
      default: 'overview-line',
    },
    isHistogram: {
      type: String,
      default: false,
    },
    loading: {
      type: Boolean,
    },
  }, commonChartProps()),
  computed: {
    excelColumnMap () {
      const columnMap = {}
      this.chartData.columns.map(item => {
        columnMap[item] = { field: item }
      })
      return columnMap
    },
    extraToolbox () {
      return {
        pdf: {
          name: 'export',
          target: `#${this.id}`,
        },
        excel: {
          export: this.exportExcel,
        },
      }
    },
    predictExcelData () {
      if (this.seriesArr.length) {
        const dataList = []
        const dataMap = {}
        this.seriesArr.map(item => {
          if (!dataMap[item.time]) {
            dataMap[item.time] = R.clone(item)
          } else {
            if (!dataMap[item.time].predict) {
              dataMap[item.time].predict = item.predict
            }
          }
        })
        for (const key in dataMap) {
          dataList.push(dataMap[key])
        }
        dataList.sort((a, b) => {
          return a.time - b.time
        })
        return dataList
      }
      return []
    },
    chartType () {
      return this.isHistogram ? 've-histogram' : 've-line'
    },
    chartExtend () {
      /* 当属性为对象时，如果在options中对应的属性为对象(eg: tooltip)或包含对象的数组(eg: series)
       * 对应的配置会被合并，否则将直接覆盖对应的配置
       * **/
      return {
        series (v) {
          /* smooth数据平滑， connectNulls 是否连接空数据 **/
          return v ? v.map(i => { i.smooth = true; i.connectNulls = true; return i }) : []
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
            shadowStyle: { color: 'rgb(77, 161, 255)', opacity: 0.1 },
          },
        },
        dataZoom: {
          type: 'inside', /* 数据缩放 **/
        },
      }
    },
    chartConfig () {
      /*  在这里配置属性，会导致原配置被覆盖，而不是被合并 */
      return {
        height: this.chartHeigth,
        width: '100%',
        legend: { show: this.showLegend },
        toolbox: {
          show: true,
          feature: {
            magicType: {
              type: ['line', 'bar'],
              title: { line: this.$t('monitor.chart.toolbar.line'), bar: this.$t('monitor.chart.toolbar.bar') },
            },
          },
        },
      }
    },
    chartSettings () {
      const cs = {}
      if (this.chartData && this.chartData.columns && this.chartData.columns.length > 0) {
        cs.yAxisType = [this.yAxisFormat]
      }
      return Object.assign(cs, this.chartSetting)
    },
  },
  methods: {
    exportExcel () {
      this.$refs.excel.generate()
    },
  },
}
</script>
