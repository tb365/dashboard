<template>
  <notification-base-list :ExtraListParams="ExtraListParams" :extra-columns="ExtraColumns" :ExtraExportDataOptions="ExtraExportDataOptions" :id="id" />
</template>

<script>
import NotificationBaseList from '@IAM/sections/NotificationBaseList'
import { getTimeTableColumn } from '@/utils/common/tableColumn'

export default {
  name: 'SecurityAlertList',
  components: {
    NotificationBaseList,
  },
  props: {
    id: String,
  },
  data () {
    return {
      ExtraListParams: {
        tag: 'alert',
        contact_type: 'webconsole',
      },
      ExtraColumns: [
        getTimeTableColumn({
          field: 'metadata.trigger_time',
          title: this.$t('system.text_590'),
        }),
        {
          title: this.$t('system.text_308'),
          field: 'content',
        },
      ],
      ExtraExportDataOptions: [
        { label: this.$t('system.text_308'), key: 'content' },
      ],
    }
  },
}
</script>
