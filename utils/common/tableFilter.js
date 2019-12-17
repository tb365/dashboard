import * as R from 'ramda'
import store from '@/store'
import i18n from '@/locales'

export function getBrandItems (key = 'brands') {
  let brands = store.getters.capability[key] || []
  if (store.getters.capability[`disabled_${key}`]) {
    brands = brands.concat(store.getters.capability[`disabled_${key}`] || [])
  }
  return brands.map(item => ({ key: item, label: item }))
}

export function mapperStatusToItems (items, statusModule) {
  const status = i18n.t(statusModule)
  return items.map(item => {
    let label = item.label
    if (status) {
      if (!R.is(String, status)) {
        label = status[item.key] || item.label
      }
    }
    return {
      key: item.key,
      label,
    }
  })
}

export function getNameFilter () {
  return {
    label: '名称',
    filter: true,
    formatter: val => {
      return `name.contains(${val})`
    },
  }
}

export function getBrandFilter (key) {
  return {
    label: '平台',
    dropdown: true,
    multiple: true,
    items: getBrandItems(key),
  }
}

export function getStatusFilter (statusModule) {
  return {
    label: '状态',
    dropdown: true,
    multiple: true,
    distinctField: {
      type: 'field',
      key: 'status',
    },
    mapper: data => {
      return mapperStatusToItems(data, statusModule)
    },
    filter: true,
    formatter: val => {
      return `status.in(${val.join(',')})`
    },
  }
}

export function getTenantFilter () {
  return {
    label: '项目',
    dropdown: true,
    multiple: true,
    distinctField: {
      type: 'extra_field',
      key: 'tenant',
    },
  }
}

export function getAccountFilter () {
  return {
    label: '云账号',
    dropdown: true,
    multiple: false,
    distinctField: {
      type: 'extra_field',
      key: 'account',
    },
  }
}

export function getIpFilter () {
  return {
    label: 'IP',
    filter: true,
    formatter: val => {
      return `guestnetworks.guest_id(id).ip_addr.contains(${val})`
    },
    jointFilter: true,
  }
}
