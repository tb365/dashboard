<template>
  <div class="status-wrapper">
    <div class="d-flex" :title="statusText">
      <div class="status-icon d-flex justify-content-center align-items-center flex-grow-0 flex-shrink-0">
        <a-icon v-if="!statusClass" type="sync" spin />
        <span v-else class="status-dot" :class="statusClass" />
      </div>
      <div class="status-text flex-fill text-truncate">
        {{ statusText }}
        <span v-if="showProcess">({{curProcess}}%)</span>
      </div>
    </div>
    <slot />
  </div>
</template>

<script>
import * as R from 'ramda'
import expectStatusMap from '@/constants/expectStatus'
import { status as statusMap } from '@/locales/zh-CN'

export default {
  name: 'Status',
  props: {
    status: {
      type: [String, Boolean],
      required: true,
    },
    statusModule: { // 映射 expectStatusMap 里面的 key 值
      type: String,
      required: true,
    },
    dangerStatusBase: {
      type: Array,
      default: () => [new RegExp('fail')],
    },
    process: {
      type: Number,
    },
  },
  computed: {
    statusClass () {
      const currentStatusMap = expectStatusMap[this.statusModule]
      if (currentStatusMap) {
        if (this.isStatus(currentStatusMap.success) || this.isStatus(expectStatusMap.common.success)) {
          return ['status-success']
        }
        const dangerStatus = this.dangerStatusBase.concat(currentStatusMap.danger || [])
        if (this.isStatus(dangerStatus) || this.isStatus(expectStatusMap.common.danger)) {
          return ['status-danger']
        }
        if (this.isStatus(currentStatusMap.info) || this.isStatus(expectStatusMap.common.info)) {
          return ['status-info']
        }
        if (this.isStatus(currentStatusMap.warning)) {
          return ['status-warning']
        }
      }
      return ''
    },
    statusText () {
      const moduleStatusMap = statusMap[this.statusModule]
      if (moduleStatusMap) {
        if (moduleStatusMap[this.status]) {
          return this.$t(`status.${this.statusModule}.${this.status}`)
        }
      }
      if (statusMap.common[this.status]) {
        return this.$t(`status.common.${this.status}`)
      }
      return this.status
    },
    curProcess () {
      return parseInt(this.process)
    },
    showProcess () {
      return this.curProcess > 0 && this.curProcess < 100
    },
  },
  methods: {
    // 判断是否为预期状态
    isStatus (statusList) {
      if (R.is(Array, statusList)) {
        return statusList.some(status => {
          if (R.is(RegExp, status)) return status.test(this.status)
          if (R.is(String, status) || R.is(Boolean, status)) return status === this.status
          return false
        })
      }
      return false
    },
  },
}
</script>

<style scoped lang="less">
@import '../../styles/less/theme';

.status-wrapper {
  .status-icon {
    width: 20px;
    .status-success.status-dot {
      background-color: @success-color;
      // &::after {
      //   position: absolute;
      //   top: 0;
      //   left: 0;
      //   width: 100%;
      //   height: 100%;
      //   border: 1px solid #1890ff;
      //   border-radius: 50%;
      //   animation: antStatusProcessing 1.2s ease-in-out infinite;
      //   content: "";
      // }
    }
    .status-danger.status-dot {
      background-color: @error-color;
    }
    .status-info.status-dot {
      background-color: @normal-color;
    }
    .status-warning.status-dot {
      background-color: @warning-color;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      position: relative;
    }
    .oc-status-process {
      width: 10px;
      height: 10px;
    }
  }
}
</style>
