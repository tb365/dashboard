<template>
  <div class="system-disk">
    <disk
      :max="max"
      :min="min"
      :form="form"
      :decorator="decorator"
      :hypervisor="hypervisor"
      :types-map="typesMap"
      :elements="elements"
      :disabled="disabled"
      :storageParams="storageParams"
      :schedtagParams="getSchedtagParams()"
      :size-disabled="sizeDisabled || disabled"
      :storage-status-map="storageStatusMap"
      @showStorageChange="showStorageChange"
      @diskTypeChange="setDiskMedium" />
  </div>
</template>

<script>
import _ from 'lodash'
import * as R from 'ramda'
import Disk from '@Compute/sections/Disk'
// import { STORAGE_AUTO } from '@Compute/constants'
import { IMAGES_TYPE_MAP, STORAGE_TYPES } from '@/constants/compute'
import { HYPERVISORS_MAP } from '@/constants'
import { findAndUnshift, findAndPush } from '@/utils/utils'
// 磁盘最小值
export const DISK_MIN_SIZE = 10
// let isFirstSetDefaultSize = true

export default {
  name: 'SystemDisk',
  components: {
    Disk,
  },
  props: {
    form: {
      type: Object,
      required: true,
      validator: val => val.fd && val.fc,
    },
    type: {
      type: String,
      required: true,
      validator: val => ['idc', 'private', 'public'].includes(val),
    },
    hypervisor: {
    },
    sku: {
      type: Object,
    },
    capabilityData: {
      type: Object,
      required: true,
    },
    image: {
      type: Object,
    },
    decorator: {
      type: Object,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    isHostImageType: {
      type: Boolean,
      default: false,
    },
    domain: {
      type: String,
      default: 'default',
    },
    sizeDisabled: {
      type: Boolean,
      default: false,
    },
    defaultSize: {
      type: Number,
    },
    defaultType: {
      type: Object,
    },
    isServertemplate: {
      type: Boolean,
      default: false,
    },
    storageParams: {
      type: Object,
    },
    ignoreStorageStatus: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    isPublic () {
      return this.type === 'public'
    },
    isPrivate () {
      return this.type === 'private'
    },
    isIDC () {
      return this.type === 'idc'
    },
    imageMinDisk () {
      const image = this.image
      let minSize = 0
      if (!image) return 0
      if (this.isHostImageType) {
        if (image.root_image) {
          minSize = (image.root_image.min_disk_mb / 1024) || 0
        }
      } else if (image.info) {
        minSize = ((image.info.min_disk_mb || image.info.min_disk) / 1024) || 0
      } else {
        minSize = ((image.min_disk_mb || image.min_disk) / 1024) || 0
      }
      return Math.ceil(minSize)
    },
    elements () {
      const ret = ['disk-select']
      if (this.isIDC && !this.isServertemplate) {
        ret.push('schedtag')
        if (this.form.fd.hypervisor === HYPERVISORS_MAP.esxi.key) {
          ret.push('storage') // 这里暂时写死，因为目前只是有vmware的系统盘会指定存储
        }
      }
      return ret
    },
    typesMap () {
      const ret = {}
      const hyper = this.getHypervisor()
      if (!hyper) return ret
      const hypervisorDisks = { ...STORAGE_TYPES[hyper] } || {}
      if (!this.capabilityData || !this.capabilityData.storage_types2) return ret
      let currentTypes = this.capabilityData.storage_types2[hyper] || []
      if (!R.isNil(this.sku) && !R.isEmpty(this.sku)) {
        if (this.sku.sys_disk_type && !this.defaultSize) { // 有 defaultSize 表示是调整配置，不需要根据sku信息过滤
          const skuDiskTypes = this.sku.sys_disk_type.split(',')
          if (skuDiskTypes && skuDiskTypes.length) {
            currentTypes = currentTypes.filter(val => {
              const type = val.split('/')[0]
              return skuDiskTypes.includes(type)
            })
          }
        } else {
          for (const obj in hypervisorDisks) {
            if (hypervisorDisks[obj].skuFamily && !hypervisorDisks[obj].skuFamily.includes(this.sku.instance_type_family)) {
              delete hypervisorDisks[obj]
            }
          }
        }
      } else {
        if (this.isPublic) {
          currentTypes = []
        }
      }
      const localIndex = currentTypes.findIndex(item => item.includes('local'))
      const novaIndex = currentTypes.findIndex(item => item.includes('nova'))
      if (localIndex !== -1 && localIndex !== 0) { // 将local放置首位
        currentTypes = findAndUnshift(currentTypes, item => item.includes('local'))
      }
      if (novaIndex !== -1 && novaIndex !== (currentTypes.length - 1)) { // 将nova放置到最后
        currentTypes = findAndPush(currentTypes, item => item.includes('nova'))
      }
      for (let i = 0, len = currentTypes.length; i < len; i++) {
        const typeItemArr = currentTypes[i].split('/')
        const type = typeItemArr[0]
        const medium = typeItemArr[1]
        let opt = hypervisorDisks[type] || this.getExtraDiskOpt(type)
        if ((hyper === HYPERVISORS_MAP.kvm.key || hyper === HYPERVISORS_MAP.cloudpods.key) && type === 'local' && this.isSomeLocal(currentTypes)) {
          opt = hypervisorDisks[`${type}-${medium}`] // kvm 区分多种介质的硬盘
        }
        if (opt && !opt.sysUnusable) {
          // 新建ucloud云服务器时，系统盘类型选择普通本地盘或SSD本地盘，其大小只能是系统镜像min_disk大小
          let max = opt.sysMax
          if (hyper === HYPERVISORS_MAP.ucloud.key && ['LOCAL_NORMAL', 'LOCAL_SSD'].includes(opt.key)) {
            max = this.imageMinDisk
          }
          // 谷歌云共享核心磁盘最多为3072GB
          if (hyper === HYPERVISORS_MAP.google.key && this.sku && ['e2-micro', 'e2-small', 'e2-medium', 'f1-micro', 'g1-small'].includes(this.sku.name)) {
            max = 3072
          }
          ret[opt.key] = {
            ...opt,
            medium,
            sysMin: Math.max(this.imageMinDisk, opt.sysMin, DISK_MIN_SIZE),
            sysMax: max,
            label: opt.key === 'nova' ? this.$t('compute.text_1141') : opt.label,
          }
          if (this.hypervisor === HYPERVISORS_MAP.google.key) {
            ret[opt.key].sysMin = opt.sysMin
          }
        }
      }
      // if (this.isIDC && this.hypervisor !== HYPERVISORS_MAP.kvm.key) {
      //   ret[STORAGE_AUTO.key] = {
      //     ...STORAGE_AUTO,
      //     sysMin: Math.max(this.imageMinDisk, DISK_MIN_SIZE),
      //     sysMax: STORAGE_AUTO.sysMax,
      //   }
      // }
      if (this.hypervisor === HYPERVISORS_MAP.google.key) {
        delete ret['local-ssd']
      }
      if (this.hypervisor === HYPERVISORS_MAP.qcloud.key) {
        delete ret.local_nvme
        delete ret.local_pro
      }
      this.$nextTick(this.setDefaultType)
      return ret
    },
    currentTypeObj () {
      if (R.is(Object, this.typesMap) && this.form.fd[this.decorator.type[0]] && this.form.fd[this.decorator.type[0]].key) {
        return this.typesMap[this.form.fd[this.decorator.type[0]].key] || {}
      }
      return {}
    },
    max () {
      return this.currentTypeObj.sysMax || 0
    },
    min () {
      return this.currentTypeObj.sysMin || 0
    },
    storageStatusMap () {
      var statusMap = {
        type: '',
        tooltip: '',
        isError: false,
      }
      if (this.ignoreStorageStatus || !this.form.fd.systemDiskType || !this.form.fd.systemDiskType.key) return statusMap
      if (this.capabilityData.storage_types3 && this.hypervisor && this.hypervisor === HYPERVISORS_MAP.openstack.hypervisor) {
        const storageTypes3 = this.capabilityData.storage_types3[this.hypervisor] || {}
        const storages = []
        for (const prop in storageTypes3) {
          if (prop.startsWith(this.currentTypeObj.key)) {
            storages.push(storageTypes3[prop])
          }
        }
        const isAllEmpty = storages.every(v => v.capacity === 0)
        if (isAllEmpty) {
          // 没有设置容量：XXX存储的容量没有设置，无法创建虚拟机，请到存储--块存储进行设置，如无法查看请联系管理员设置
          statusMap = { type: 'error', tooltip: this.$t('compute.text_1142', [this.currentTypeObj.key]), isError: true }
          return
        }
        const isNotEnough = storages.every(v => v.free_capacity === 0 || v.free_capacity / 1024 < this.form.fd.systemDiskSize)
        if (isNotEnough) {
          // 选择磁盘容量不足：XXX存储的容量不足，无法创建虚拟机，请到存储--块存储进行查看，如无法查看请联系管理员查看
          statusMap = { type: 'error', tooltip: this.$t('compute.text_1143', [this.currentTypeObj.key]), isError: true }
          return
        }
      }
      this.$bus.$emit('VMCreateDisabled', statusMap.isError)
      return statusMap
    },
  },
  created () {
    this.setDefaultType = _.debounce(this.setDefaultType, 300)
  },
  methods: {
    setDefaultType () {
      if (R.isNil(this.typesMap) || R.isEmpty(this.typesMap)) {
        this.form.fc.setFieldsValue({
          [this.decorator.type[0]]: { key: '', label: '' },
          [this.decorator.size[0]]: 0,
        })
        return
      }
      if ([IMAGES_TYPE_MAP.host.key, IMAGES_TYPE_MAP.snapshot.key].includes(this.form.fd.imageType)) return // 主机镜像和主机快照设置默认值交给外层处理
      const keys = Object.keys(this.typesMap)
      const firstKey = keys[0]
      const diskMsg = this.typesMap[firstKey]
      this.form.fc.setFieldsValue(this.defaultType || {
        [this.decorator.type[0]]: { key: diskMsg.key, label: diskMsg.label },
      })
      this.setDiskMedium(diskMsg)
      this.$nextTick(() => { // 解决磁盘大小 inputNumber 第一次点击变为0 的bug
        const initSize = this.defaultSize && this.defaultSize > this.imageMinDisk ? this.defaultSize : this.imageMinDisk
        this.form.fc.setFieldsValue({
          [this.decorator.size[0]]: initSize || +diskMsg.sysMin,
        })
      })
    },
    getExtraDiskOpt (type) {
      const hyper = this.getHypervisor()
      // 腾讯云过滤掉local_basic和local_ssd类型的盘
      if (hyper === HYPERVISORS_MAP.qcloud.key) {
        if (['local_basic', 'local_ssd'].includes(type)) {
          return
        }
      }
      // VMware过滤掉rbd类型的盘
      if (hyper === HYPERVISORS_MAP.esxi.key) {
        if (['rbd'].includes(type)) {
          return
        }
      }
      return {
        label: `${type}`,
        key: `${type}`,
        min: 1,
        max: 3 * 1024,
        sysMin: 10,
        sysMax: 500,
      }
    },
    getSchedtagParams () {
      const params = {
        with_meta: true,
        cloud_env: 'onpremise',
        resource_type: 'storages',
        limit: 0,
      }
      const scopeParams = {}
      if (this.$store.getters.isAdminMode) {
        scopeParams.project_domain = this.domain
      } else {
        scopeParams.scope = this.$store.getters.scope
      }
      return {
        ...params,
        ...scopeParams,
      }
    },
    getHypervisor () {
      let ret = this.hypervisor
      if (this.isPublic) {
        if (this.sku && this.sku.provider) {
          ret = this.sku.provider.toLowerCase()
        }
      }
      return ret
    },
    showStorageChange (v) {
      if (this.form.fi) {
        this.$set(this.form.fi, 'showStorage', v)
      }
      const decoratorKey = _.get(this.decorator, 'systemDisk.storage[0]') || 'systemDiskStorage'
      if (!v) {
        this.$set(this.form.fd, decoratorKey, undefined)
      }
    },
    setDiskMedium (v) {
      if (this.form.fi) {
        this.$set(this.form.fi, 'systemDiskMedium', _.get(this.typesMap, `[${v.key}].medium`))
      }
    },
    isSomeLocal (types) {
      const localTypes = types.filter(item => item.indexOf('local') !== -1)
      return localTypes.length > 1
    },
  },
}
</script>
