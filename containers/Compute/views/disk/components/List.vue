
<template>
  <page-list
    show-tag-columns
    show-tag-filter
    :list="list"
    :columns="columns"
    :group-actions="groupActions"
    :single-actions="singleActions"
    :export-data-options="exportDataOptions"
    :showSearchbox="showSearchbox"
    :showGroupActions="showGroupActions"
    :before-show-menu="beforeShowMenu" />
</template>

<script>
import * as R from 'ramda'
import { mapGetters } from 'vuex'
import { MEDIUM_MAP } from '../../../constants'
import ColumnsMixin from '../mixins/columns'
import SingleActionsMixin from '../mixins/singleActions'
import {
  getTenantFilter,
  getStatusFilter,
  getBrandFilter,
  getNameFilter,
  getDomainFilter,
  getAccountFilter,
  getRegionFilter,
} from '@/utils/common/tableFilter'
import expectStatus from '@/constants/expectStatus'
import WindowsMixin from '@/mixins/windows'
import GlobalSearchMixin from '@/mixins/globalSearch'
import ListMixin from '@/mixins/list'
import { PROVIDER_MAP } from '@/constants'

export default {
  name: 'DiskList',
  mixins: [WindowsMixin, ListMixin, GlobalSearchMixin, ColumnsMixin, SingleActionsMixin],
  props: {
    id: String,
    getParams: {
      type: [Function, Object],
    },
    cloudEnv: String,
    cloudEnvOptions: {
      type: Array,
    },
    showCreateAction: {
      type: Boolean,
      default: true,
    },
    hiddenColumns: {
      type: Array,
      default: () => ([]),
    },
    hiddenFilterOptions: {
      type: Array,
      default: () => ([]),
    },
  },
  data () {
    const createAction = {
      label: this.$t('compute.perform_create'),
      permission: 'disks_create',
      action: () => {
        this.$router.push({
          path: '/disk/create',
          query: {
            type: this.cloudEnv,
          },
        })
        // return [
        //   {
        //     label: 'IDC',
        //     permission: 'disks_create',
        //     action: () => {
        //       this.createDialog('DiskCreateDialog', {
        //         title: this.$t('compute.perform_create'),
        //         onManager: this.onManager,
        //         diskType: 'idc',
        //       })
        //     },
        //   },
        //   {
        //     label: this.$t('compute.text_400'),
        //     permission: 'disks_create',
        //     action: () => {
        //       this.createDialog('DiskCreateDialog', {
        //         title: this.$t('compute.perform_create'),
        //         onManager: this.onManager,
        //         diskType: 'private',
        //       })
        //     },
        //   },
        //   {
        //     label: this.$t('compute.text_401'),
        //     permission: 'disks_create',
        //     action: () => {
        //       this.createDialog('DiskCreateDialog', {
        //         title: this.$t('compute.perform_create'),
        //         onManager: this.onManager,
        //         diskType: 'public',
        //       })
        //     },
        //   },
        // ]
      },
      meta: () => ({
        buttonType: 'primary',
        validate: !this.cloudEnvEmpty,
        tooltip: this.cloudEnvEmpty ? this.$t('common.no_platform_available') : '',
      }),
      hidden: () => this.$isScopedPolicyMenuHidden('disk_hidden_menus.disk_create'),
    }
    const groupActions = [
      {
        label: this.$t('compute.text_275'),
        actions: () => {
          return [
            {
              label: this.$t('compute.perform_sync_status'),
              permission: 'disks_perform_syncstatus',
              action: () => {
                this.onManager('batchPerformAction', {
                  steadyStatus: ['running', 'ready'],
                  managerArgs: {
                    action: 'syncstatus',
                  },
                })
              },
              meta: () => {
                var ret = {
                  validate: true,
                  tooltip: '',
                }
                const isSomeVMware = this.list.selectedItems.some(v => v.provider === PROVIDER_MAP.VMware.key)
                if (isSomeVMware) {
                  ret.validate = false
                  ret.tooltip = this.$t('compute.text_450')
                  return ret
                }
                return ret
              },
              hidden: () => this.$isScopedPolicyMenuHidden('disk_hidden_menus.disk_perform_syncstatus'),
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
                    resources: 'disk',
                  },
                  tipName: this.$t('compute.text_100'),
                })
              },
              // hidden: () => this.$isScopedPolicyMenuHidden('disk_hidden_menus.disk_perform_set_tags'),
            },
            {
              label: this.$t('compute.perform_delete'),
              permission: 'disks_delete',
              action: () => {
                this.createDialog('DiskDeleteDialog', {
                  data: this.list.selectedItems,
                  columns: this.columns,
                  title: this.$t('compute.perform_delete'),
                  onManager: this.onManager,
                })
              },
              meta: () => this.$getDeleteResult(this.list.selectedItems),
              hidden: () => this.$isScopedPolicyMenuHidden('disk_hidden_menus.disk_delete'),
            },
          ]
        },
        meta: () => {
          return {
            validate: this.list.selected.length,
          }
        },
      },
    ]
    if (this.showCreateAction) {
      groupActions.unshift(createAction)
    }
    const filterOptions = {
      id: {
        label: this.$t('table.title.id'),
      },
      name: getNameFilter(),
      status: getStatusFilter('disk'),
      storage: {
        label: this.$t('table.title.disk_storage'),
        jointFilter: true,
      },
      guest_id: {
        label: this.$t('res.server'),
      },
      disk_type: {
        label: this.$t('table.title.disk_type'),
        dropdown: true,
        // multiple: true,
        items: [
          { label: this.$t('compute.text_50'), key: 'data' },
          { label: this.$t('compute.text_49'), key: 'sys' },
        ],
      },
      unused: {
        label: this.$t('table.title.disk_mounted'),
        dropdown: true,
        items: [
          { label: this.$t('compute.text_394'), key: false },
          { label: this.$t('compute.text_395'), key: true },
        ],
      },
      brand: getBrandFilter(),
      projects: getTenantFilter(),
      project_domains: getDomainFilter(),
      account: getAccountFilter(),
      region: getRegionFilter(),
      medium_type: {
        label: this.$t('table.title.disk_medium_type'),
        dropdown: true,
        multiple: true,
        jointFilter: true,
        filter: true,
        formatter: val => {
          return `storages.id(storage_id).medium_type.equals(${val})`
        },
        items: Object.keys(MEDIUM_MAP).map((k) => {
          return { label: MEDIUM_MAP[k], key: k }
        }),
      },
    }
    for (let i = 0, len = this.hiddenFilterOptions.length; i < len; i++) {
      delete filterOptions[this.hiddenFilterOptions[i]]
    }
    return {
      list: this.$list.createList(this, {
        id: this.id,
        resource: 'disks',
        getParams: this.getParam,
        filterOptions,
        steadyStatus: {
          status: Object.values(expectStatus.disk).flat(),
          guest_status: [...Object.values(expectStatus.server).flat(), '', undefined],
        },
        responseData: this.responseData,
        hiddenColumns: this.hiddenColumns, // ['metadata', 'disk_format', 'storage', 'medium_type', 'created_at'],
      }),
      exportDataOptions: {
        items: [
          { label: 'ID', key: 'id' },
          { label: this.$t('table.title.name'), key: 'name' },
          { label: this.$t('table.title.disk_size'), key: 'disk_size' },
          { label: this.$t('table.title.disk_format'), key: 'disk_format' },
          { label: this.$t('storage.text_38'), key: 'storage_type' },
          { label: this.$t('table.title.disk_type'), key: 'disk_type' },
          { label: this.$t('table.title.disk_guest_count'), key: 'guest_count' },
          { label: this.$t('table.title.disk_guest'), key: 'guest' },
          { label: this.$t('table.title.disk_storage'), key: 'storage' },
          { label: this.$t('table.title.create_time'), key: 'created_at' },
          { label: this.$t('common.status'), key: 'status' },
          { label: this.$t('res.project'), key: 'tenant' },
          { label: this.$t('table.title.brand'), key: 'provider' },
          { label: this.$t('res.region'), key: 'region' },
          { label: this.$t('res.zone'), key: 'zone' },
          { label: this.$t('table.title.disk_medium_type'), key: 'medium_type' },
          { label: this.$t('table.title.user_tag'), key: 'user_tags' },
        ],
      },
      groupActions,
    }
  },
  computed: {
    ...mapGetters(['isProjectMode']),
  },
  watch: {
    cloudEnv (val) {
      this.$nextTick(() => {
        this.list.fetchData(0)
      })
    },
  },
  created () {
    this.initSidePageTab('disk-detail')
    this.list.fetchData()
  },
  methods: {
    getParam () {
      const ret = { ...(R.is(Function, this.getParams) ? this.getParams() : this.getParams) }
      if (this.cloudEnv) ret.cloud_env = this.cloudEnv
      return ret
    },
    handleOpenSidepage (row) {
      this.initSidePageTab('disk-detail')
      this.sidePageTriggerHandle(this, 'DiskSidePage', {
        id: row.id,
        resource: 'disks',
        getParams: this.getParam,
        steadyStatus: {
          status: Object.values(expectStatus.disk).flat(),
          guest_status: [...Object.values(expectStatus.server).flat(), '', undefined],
        },
      }, {
        list: this.list,
        hiddenColumns: this.hiddenColumns,
      })
    },
    beforeShowMenu () {
      return this.$store.dispatch('scopedPolicy/get', {
        category: ['disk_hidden_menus'],
      })
    },
  },
}
</script>
