<template>
  <page-list
    show-tag-columns
    show-tag-filter
    :list="list"
    :columns="columns"
    :group-actions="groupActions"
    :single-actions="singleActions"
    :export-data-options="exportDataOptions"
    :extra-export-params="extraExportParams"
    :showSearchbox="showSearchbox"
    :defaultSearchKey="defaultSearchKey"
    :showGroupActions="showGroupActions" />
</template>

<script>
import * as R from 'ramda'
import ColumnsMixin from '../mixins/columns'
import ResStatusFilterMixin from '@/mixins/resStatusFilterMixin'
import SingleActionsMixin from '../mixins/singleActions'
import { getNameFilter, getStatusFilter, getEnabledFilter, getBrandFilter, getProjectDomainFilter, getAccountFilter, getOsArchFilter } from '@/utils/common/tableFilter'
import WindowsMixin from '@/mixins/windows'
import GlobalSearchMixin from '@/mixins/globalSearch'
import ListMixin from '@/mixins/list'
import { typeClouds } from '@/utils/common/hypervisor'
import { getDomainChangeOwnerAction, getSetPublicAction, getEnabledSwitchActions } from '@/utils/common/tableActions'
import { HYPERVISORS_MAP, EXTRA_HYPERVISORS } from '@/constants'
import regexp from '@/utils/regexp'

export default {
  name: 'HostList',
  mixins: [WindowsMixin, ListMixin, GlobalSearchMixin, ColumnsMixin, SingleActionsMixin, ResStatusFilterMixin],
  props: {
    id: String,
    getParams: {
      type: [Function, Object],
    },
    frontGroupActions: {
      type: Function,
    },
    frontSingleActions: {
      type: Function,
    },
    filterParams: {
      type: Object,
      default: () => ({}),
    },
    hiddenFilterOptions: {
      type: Array,
      default: () => ([]),
    },
  },
  data () {
    const brandFilter = getBrandFilter()
    const notSupportBrand = [
      ...Object.values(HYPERVISORS_MAP).filter(item => item.cloud_env === 'public').map(item => item.brand),
      ...Object.values(EXTRA_HYPERVISORS).map(item => item.brand),
    ]
    const filterOptions = {
      id: {
        label: this.$t('table.title.id'),
      },
      name: getNameFilter(),
      status: getStatusFilter('host'),
      enabled: getEnabledFilter(),
      host_status: {
        label: this.$t('compute.text_502'),
        dropdown: true,
        items: Object.keys(this.$t('status.host_status')).map(key => {
          return { label: this.$t('status.host_status')[key], key }
        }),
      },
      sn: {
        label: 'SN',
        distinctField: {
          type: 'extra_field',
          key: 'sn',
        },
      },
      any_mac: {
        label: 'MAC',
      },
      any_ip: {
        label: 'IP',
      },
      access_ip: {
        label: this.$t('compute.host_access_ip'),
        filter: true,
        formatter: val => {
          return `access_ip.contains("${val}")`
        },
      },
      region: {
        label: this.$t('compute.text_177'),
      },
      zone: {
        label: this.$t('compute.text_270'),
      },
      brand: {
        ...brandFilter,
        items: brandFilter.items.filter(val => !notSupportBrand.includes(val.key)),
      },
      project_domains: getProjectDomainFilter(),
      account: getAccountFilter(),
      cpu_architecture: getOsArchFilter(true),
    }
    this.hiddenFilterOptions.forEach(key => {
      delete filterOptions[key]
    })
    return {
      list: this.$list.createList(this, {
        id: this.id,
        resource: 'hosts',
        getParams: this.getParam,
        filterOptions,
        responseData: this.responseData,
        hiddenColumns: ['metadata', 'id', 'server_id', 'sn', 'manufacture', 'model', 'schedtag', 'nonsystem_guests', 'public_scope', 'project_domain', 'region', 'os_arch'],
      }),
      exportDataOptions: {
        items: [
          { label: 'ID', key: 'id' },
          { label: this.$t('compute.text_228'), key: 'name' },
          { label: this.$t('compute.text_241'), key: 'enabled' },
          { label: this.$t('compute.text_268'), key: 'status' },
          { label: this.$t('compute.text_503'), key: 'access_ip' },
          { label: this.$t('compute.text_504'), key: 'ipmi_ip' },
          { label: this.$t('compute.text_502'), key: 'host_status' },
          { label: '#VM', key: 'nonsystem_guests' },
          { label: this.$t('compute.text_563'), key: 'cpu_count' },
          { label: this.$t('compute.text_523'), key: 'cpu_commit_rate' },
          { label: this.$t('compute.text_369'), key: 'mem_size' },
          { label: this.$t('compute.text_518'), key: 'mem_commit_rate' },
          { label: this.$t('compute.text_99'), key: 'storage_size' },
          { label: this.$t('compute.storage_commit_rate'), key: 'storage_commit_rate' },
          { label: this.$t('compute.text_847'), key: 'sys_info.manufacture' },
          { label: this.$t('compute.text_580'), key: 'sys_info.model' },
          { label: 'SN', key: 'sn' },
          { label: this.$t('dictionary.project'), key: 'tenant' },
          { label: this.$t('compute.text_177'), key: 'region' },
          { label: this.$t('compute.text_270'), key: 'zone' },
          {
            label: this.$t('compute.text_505'),
            key: 'public_scope',
            hidden: () => {
              return !this.$store.getters.l3PermissionEnable && (this.$store.getters.scopeResource && this.$store.getters.scopeResource.domain.includes('cloudaccounts'))
            },
          },
          { label: this.$t('compute.text_506', [this.$t('dictionary.domain')]), key: 'project_domain' },
          { label: this.$t('compute.text_271'), key: 'user_tags' },
          { label: this.$t('table.title.os_arch'), key: 'os_arch' },
          { label: this.$t('table.title.brand'), key: 'brand' },
        ],
      },
    }
  },
  computed: {
    groupActions () {
      const _frontGroupActions = this.frontGroupActions ? this.frontGroupActions.bind(this)() || [] : []
      const ownerDomain = this.$store.getters.isAdminMode || this.list.selectedItems.every(obj => obj.domain_id === this.$store.getters.userInfo.projectDomainId)
      return _frontGroupActions.concat(
        [
          ...getEnabledSwitchActions(this, undefined, undefined, {
            actions: [
              async (obj) => {
                const ids = this.list.selectedItems.map(item => item.id)
                await this.onManager('batchPerformAction', {
                  id: ids,
                  managerArgs: {
                    action: 'enable',
                  },
                })
                this.$store.dispatch('auth/getCapabilities')
              },
              async (obj) => {
                const ids = this.list.selectedItems.map(item => item.id)
                await this.onManager('batchPerformAction', {
                  id: ids,
                  managerArgs: {
                    action: 'disable',
                  },
                })
                this.$store.dispatch('auth/getCapabilities')
              },
            ],
            metas: [
              () => {
                const isDisable = !!this.list.selectedItems.find(item => !item.enabled)
                return {
                  validate: this.list.selectedItems.length && ownerDomain && isDisable,
                }
              },
              () => {
                const isEnable = !!this.list.selectedItems.find(item => item.enabled)
                return {
                  validate: this.list.selectedItems.length && ownerDomain && isEnable,
                }
              },
            ],
          }),
          {
            label: this.$t('common.batchAction'),
            actions: () => {
              return [
                getDomainChangeOwnerAction(this, {
                  name: this.$t('dictionary.host'),
                  resource: 'hosts',
                }, {
                  meta: function () {
                    return {
                      validate: ownerDomain,
                    }
                  },
                }),
                getSetPublicAction(this, {
                  name: this.$t('dictionary.host'),
                  scope: 'domain',
                  resource: 'hosts',
                }),
                {
                  label: this.$t('compute.text_540'),
                  action: (obj) => {
                    this.createDialog('HostsAdjustLabelDialog', {
                      data: this.list.selectedItems,
                      columns: this.columns,
                      name: this.$t('dictionary.host'),
                      onManager: this.onManager,
                    })
                  },
                  meta: () => ({
                    validate: this.list.selectedItems.length && ownerDomain,
                  }),
                },
                {
                  label: this.$t('compute.text_508'),
                  action: (obj) => {
                    // this.list.batchPerformAction('disable', null)
                    this.createDialog('HostUnconvertDialog', {
                      data: this.list.selectedItems,
                      columns: this.columns,
                      onManager: this.onManager,
                      name: this.$t('dictionary.host'),
                      refresh: this.refresh,
                    })
                  },
                  meta: () => {
                    if (!this.list.selectedItems.length) {
                      return {
                        validate: false,
                        tooltip: this.$t('compute.text_509'),
                      }
                    }
                    for (let i = 0; i < this.list.selectedItems.length; i++) {
                      const obj = this.list.selectedItems[i]
                      if (obj.host_type !== 'hypervisor') {
                        return {
                          validate: false,
                          tooltip: this.$t('compute.text_510'),
                        }
                      } else if (obj.nonsystem_guests > 0) {
                        return {
                          validate: false,
                          tooltip: this.$t('compute.text_511'),
                        }
                      } else if (obj.enabled) {
                        return {
                          validate: false,
                          tooltip: this.$t('compute.text_512'),
                        }
                      } else if (!obj.is_baremetal) {
                        return {
                          validate: false,
                          tooltip: '',
                        }
                      } else if (!ownerDomain) {
                        return {
                          validate: false,
                          tooltip: '',
                        }
                      }
                    }
                    return {
                      validate: true,
                      tooltip: '',
                    }
                  },
                },
                {
                  label: this.$t('compute.text_513'),
                  action: () => {
                    this.createDialog('HostAdjustOversoldRatioDialog', {
                      data: this.list.selectedItems,
                      columns: this.columns,
                      onManager: this.onManager,
                      name: this.$t('dictionary.host'),
                      refresh: this.refresh,
                    })
                  },
                  meta: () => ({
                    validate: this.list.selectedItems.every(item => { return item.brand.toLowerCase() !== 'zstack' }) && ownerDomain,
                  }),
                },
                {
                  label: this.$t('compute.text_514'),
                  action: () => {
                    this.createDialog('SetHostReserveResourceDialog', {
                      onManager: this.onManager,
                      data: this.list.selectedItems,
                      columns: this.columns,
                      refresh: this.refresh,
                    })
                  },
                  meta: () => {
                    const ret = {
                      validate: false,
                      tooltip: null,
                    }
                    const isAllOneCloud = this.list.selectedItems.every((item) => { return item.provider === typeClouds.providerMap.OneCloud.key })
                    if (!isAllOneCloud) {
                      ret.tooltip = this.$t('compute.text_515')
                      return ret
                    }
                    const isAllReservedResource = this.list.selectedItems.every((item) => { return item.reserved_resource_for_gpu })
                    if (!isAllReservedResource) {
                      ret.tooltip = this.$t('compute.text_516')
                      return ret
                    }
                    return {
                      validate: ownerDomain,
                    }
                  },
                },
                {
                  label: this.$t('table.action.set_tag'),
                  action: () => {
                    this.createDialog('SetTagDialog', {
                      data: this.list.selectedItems,
                      columns: this.columns,
                      onManager: this.onManager,
                      mode: 'add',
                      params: {
                        resources: 'host',
                      },
                      tipName: this.$t('dictionary.host'),
                    })
                  },
                },
                {
                  label: this.$t('compute.perform_delete'),
                  permission: 'hosts_delete',
                  action: () => {
                    this.createDialog('DeleteResDialog', {
                      vm: this,
                      data: this.list.selectedItems,
                      columns: this.columns,
                      title: this.$t('compute.perform_delete'),
                      name: this.$t('dictionary.host'),
                      onManager: this.onManager,
                      success: () => {
                        this.$store.dispatch('auth/getCapabilities')
                      },
                    })
                  },
                  meta: () => {
                    const deleteResult = this.$getDeleteResult(this.list.selectedItems)
                    if (!deleteResult.validate) {
                      return deleteResult
                    }
                    return {
                      validate: ownerDomain,
                    }
                  },
                },
              ]
            },
            meta: () => {
              return {
                validate: this.list.selected.length,
              }
            },
          },
        ],
      )
    },
  },
  watch: {
    filterParams: {
      handler: function (val) {
        if (!val.isFirstLoad) {
          const filterStatus = this.list.filter.status || []
          val.statusCheckArr.forEach((item) => {
            if (!filterStatus.includes(item)) {
              filterStatus.push(item)
            }
          })
          if (val.statusCheckArr && val.statusCheckArr.length > 0) {
            this.list.changeFilter({ ...this.list.filter, status: val.statusCheckArr })
            this.list.filterOptions.status.items = []
            const statusArrTem = this.list.filterOptions.status.items || []
            val.statusArr.forEach((item) => {
              const isExist = statusArrTem.some((obj) => { return obj.key === item })
              if (!isExist) {
                statusArrTem.push({
                  key: item,
                  label: this.$t(`status.host.${item}`),
                })
              }
            })
            this.list.filterOptions.status.items = statusArrTem
          } else {
            delete this.list.filter.status
            this.list.changeFilter({ ...this.list.filter })
          }
        }
      },
      deep: true,
    },
    'list.filter' (val) {
      this.$bus.$emit('ServerFilterChange', val)
    },
  },
  created () {
    this.initSidePageTab('host-detail')
    this.list.fetchData()
  },
  methods: {
    refresh () {
      console.log('refresh')
    },
    extraExportParams ({ currentExportType }) {
      if (currentExportType === 'all') return { baremetal: false }
      return {}
    },
    getParam () {
      const ret = {
        ...(R.is(Function, this.getParams) ? this.getParams() : this.getParams),
      }
      return ret
    },
    handleOpenSidepage (row) {
      this.sidePageTriggerHandle(this, 'HostSidePage', {
        id: row.id,
        resource: 'hosts',
        getParams: this.getParam,
      }, {
        list: this.list,
      })
    },
    defaultSearchKey (search) {
      if (regexp.isIPv4(search)) {
        return 'any_ip'
      }
      if (regexp.isMAC(search)) {
        return 'any_mac'
      }
    },
  },
}
</script>
