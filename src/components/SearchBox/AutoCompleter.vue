<template>
  <div class="cursor-text">
    <autosize-input
      ref="input"
      v-show="focus"
      :value="search"
      :input-style="{ border: 'none', outline: 0, padding: '0 0 0 2px', margin: 0, height: '20px', fontSize: '12px' }"
      @keydown.13="handleInputEnter"
      @keydown.delete="handleInputDelete"
      @input="handleInput" />
    <div class="auto-completer-wrap" v-show="show" :style="completerWrapStyle">
      <ul class="auto-completer-items">
        <li v-show="!isDropdown && !isDate">
          <span class="empty text-weak">{{ $t('common.text00014') }}</span>
        </li>
        <template v-if="isDropdown">
          <!-- 如果有配置项则渲染 -->
          <template v-if="config.items">
            <a-input-search
              id="dropdownSearchInput"
              class="dropdown-search-input"
              :placeholder="$t('common.search')"
              @change="onSearch" />
            <li
              v-for="item of getItems()"
              :key="item.key">
              <span>
                <a-checkbox
                  class="w-100"
                  :checked="selectValue && selectValue.includes(item.key)"
                  :value="item.key"
                  @change="handleValueChange"><span class="text-wrap text-break" :title="item.label">{{ item.label }}</span></a-checkbox>
              </span>
            </li>
          </template>
          <!-- 如果需要渲染时间选择器 -->
          <template v-else-if="isDate">
            <date-select
              @change="handleDateChange"
              :getPopupContainer="getDateSelectPopupContainer" />
          </template>
          <template v-else>
            <!-- 如果需要获取 distinct field -->
            <template v-if="config.distinctField">
              <li class="loading"><loader loading /></li>
            </template>
            <template v-else>
              <li class="no-data"><loader /></li>
            </template>
          </template>
        </template>
        <template v-else v-for="(item, key) of options">
          <li v-show="!value.hasOwnProperty(key) && isKeyClickable(item)" :key="key">
            <span @click="handleKeyClick($event, key, item)" class="text-truncate">{{ item.label }}</span>
          </li>
        </template>
      </ul>
      <div class="actions" v-if="isDropdown">
        <span @click="handleConfirm($event)" class="primary-color" :class="{ disabled: !selectValue || (selectValue && selectValue.length <= 0) }">{{$t('common.ok')}}</span>
        <span @click="handleCancel($event)">{{$t('common.cancel')}}</span>
      </div>
    </div>
  </div>
</template>

<script>
import * as R from 'ramda'
import regexp from '@/utils/regexp'
import DateSelect from './DateSelect'

export default {
  name: 'AutoCompleter',
  components: {
    DateSelect,
  },
  props: {
    focus: {
      type: Boolean,
      required: true,
    },
    options: {
      type: Object,
      required: true,
    },
    value: {
      type: Object,
      required: true,
    },
    show: {
      type: Boolean,
      required: true,
    },
    keySeparator: {
      type: String,
      required: true,
    },
    valueSeparator: {
      type: String,
      required: true,
    },
    defaultSearchKey: {
      type: [String, Function],
    },
    fetchDistinctField: Function,
  },
  data () {
    return {
      // 当前选中的筛选key
      selectKey: null,
      // 选中的筛选值
      selectValue: [],
      // input 输入的值
      search: '',
      completerWrapStyle: {},
      dropdownSearch: '',
    }
  },
  computed: {
    // 获取当前选择的key的配置
    config () {
      return this.selectKey && this.options[this.selectKey]
    },
    // 配置项是否使用了dropdown模式
    isDropdown () {
      return this.config && this.config.dropdown
    },
    // 是否为时间选择模式
    isDate () {
      return this.config && this.config.date
    },
  },
  watch: {
    search (val) {
      this.$emit('update:search', val)
    },
  },
  methods: {
    clear () {
      this.$emit('update-show', false)
      this.completerWrapStyle = {}
      this.search = ''
      this.selectKey = null
      this.selectValue = []
    },
    /**
     * @description key选中事件
     * @param {Object} event
     * @param {String} key
     * @param {Object} config
     */
    async handleKeyClick (e, key, item) {
      e.stopPropagation()
      if (item.date) {
        this.completerWrapStyle = { width: '360px', right: '-300px' }
      }
      this.selectKey = key
      const prefix = `${item.label}${this.keySeparator}`
      if (!this.search.startsWith(prefix) && !prefix.startsWith(this.search)) {
        this.search = prefix + this.search
      } else if (prefix.startsWith(this.search)) {
        this.search = prefix
      }
      if (!this.isDropdown) {
        this.$emit('update-show', false)
        this.completerWrapStyle = {}
      } else {
        this.dropdownSearch = ''
        if (this.config.distinctField) {
          try {
            const values = await this.fetchDistinctField(item)
            this.$set(item, 'items', values)
          } catch (error) {
            throw error
          }
        }
      }
      this.$emit('focus-input')
    },
    /**
     * @description 判断item所否可以点击，只有完成了输入之后才能点击
     */
    isKeyClickable (curItem) {
      for (var key in this.options) {
        const item = this.options[key]
        if (this.search.startsWith(`${item.label}${this.keySeparator}`)) {
          if (item.label === curItem.label) {
            return true
          } else {
            return false
          }
        }
      }
      return true
    },
    /**
     * @description value选中事件
     * @param {Object} event
     */
    handleValueChange (e) {
      e.stopPropagation()
      const value = e.target.value
      const index = this.selectValue.indexOf(value)
      const hasValue = index !== -1
      const multiple = this.config.multiple
      if (hasValue) {
        if (multiple) {
          this.selectValue.splice(index, 1)
        }
      } else {
        if (multiple) {
          this.selectValue.push(value)
        } else {
          this.selectValue = [value]
        }
      }
      let labels = this.selectValue
      if (this.isDropdown) {
        labels = labels.map(item => {
          const op = R.find(R.propEq('key', item))(this.config.items)
          if (op) return op.label
          return item
        })
      }
      this.search = `${this.config.label}${this.keySeparator}${labels.join(this.valueSeparator)}`
    },
    /**
     * @description date类型的修改
     */
    handleDateChange (val) {
      this.selectValue = val
      const values = val[0]
      let labelStr
      if (values[0] && values[1]) {
        labelStr = values.map(item => item.local().format('YYYY-MM-DD HH:mm:ss')).join('~')
      } else if (values[0]) {
        labelStr = `<${values[0].local().format('YYYY-MM-DD HH:mm:ss')}`
      } else if (values[1]) {
        labelStr = `>${values[1].local().format('YYYY-MM-DD HH:mm:ss')}`
      }
      this.search = `${this.config.label}${this.keySeparator}${labelStr}`
    },
    /**
     * @description 拼装参数，调用搜索
     */
    handleOk () {
      const selectKeyEmpty = R.isNil(this.selectKey) || R.isEmpty(this.selectKey)
      if (selectKeyEmpty) {
        if (this.search) {
          var key = ''
          if (!R.isNil(this.defaultSearchKey)) {
            if (R.is(String, this.defaultSearchKey)) {
              key = this.defaultSearchKey
            } else if (R.is(Function, this.defaultSearchKey)) {
              key = this.defaultSearchKey(this.search)
            }
          }
          if (!key) {
            if (regexp.isUUID(this.search) && this.options.id) {
              key = 'id'
            } else {
              key = 'name'
            }
          }
          if (this.options[key]) {
            this.selectValue = [this.search]
            this.selectKey = key
            this.search = `${this.options[key].label}${this.keySeparator}${this.search}`
          } else {
            console.log('key', key, 'not exist in options', this.options)
            return
          }
        } else {
          const newValue = {
            ...this.value,
          }
          this.$emit('confirm', newValue)
          return
        }
      }
      const selectValueEmpty = R.isNil(this.selectValue) || R.isEmpty(this.selectValue)
      if (selectValueEmpty) {
        return
      }
      let value = this.search.split(this.keySeparator)[1]
      if (this.isDate) {
        if (value.startsWith('<')) {
          value = value.split('<')
          value = [value[1], null]
        } else if (value.startsWith('>')) {
          value = value.split('>')
          value = [null, value[1]]
        } else if (value.includes('~')) {
          value = value.split('~')
          value = [value[0], value[1]]
        }
      } else {
        value = value.split(this.valueSeparator)
      }
      if (R.isNil(value) || R.isEmpty(value)) {
        return
      }
      const newValue = {
        ...this.value,
      }
      newValue[this.selectKey] = value
      this.$emit('confirm', newValue)
      this.clear()
    },
    /**
     * @description 确定事件
     * @param {Object} event
     */
    handleConfirm (e) {
      e.stopPropagation()
      this.handleOk()
    },
    /**
     * @description 取消事件
     * @param {Object} event
     */
    handleCancel (e) {
      e.stopPropagation()
      this.clear()
      this.$emit('focus-input')
      this.$emit('update-show', true)
      this.completerWrapStyle = {}
    },
    /**
     * @description 输入框回车按键事件
     */
    handleInputEnter (e) {
      e.stopPropagation()
      this.handleOk()
    },
    /**
     * @description 输入删除按键事件
     */
    handleInputDelete (e) {
      e.stopPropagation()
      if (this.search.length === 0) {
        const keys = Object.keys(this.value)
        if (keys.length === 0) return
        const lastKey = keys[keys.length - 1]
        this.$emit('remove-tag', lastKey)
      }
    },
    /**
     * @description 输入事件
     */
    handleInput (e) {
      e.stopPropagation()
      this.search = e.target.value
      let value = (e.target.value && e.target.value.split(this.keySeparator)) || []
      value = value[1] && value[1].split(this.valueSeparator)
      if (this.isDropdown && !this.isDate) {
        if (!value) {
          this.selectKey = null
          return
        }
        this.selectValue = value.map(item => {
          const op = R.find(R.propEq('label', item))(this.config.items)
          if (op) return op.key
        }).filter(item => !!item)
        if (!this.config.multiple && this.selectValue.length) this.selectValue = this.selectValue[0]
      } else {
        this.selectValue = value || []
      }
    },
    getDateSelectPopupContainer (trigger) {
      return this.$parent.$refs['search-box-wrap']
    },
    onSearch (e) {
      this.dropdownSearch = e.target.value
    },
    getItems () {
      return this.config.items.filter(v => {
        if (!v.label) return true
        const label = v.label.toLowerCase()
        return label.includes(this.dropdownSearch.toLowerCase())
      })
    },
  },
}
</script>

<style lang="less" scoped>
.auto-completer-wrap {
  height: auto;
  right: -200px;
  position: absolute;
  top: 28px;
  text-align: left;
  width: 200px;
  box-shadow: 1px 1.73px 3px 0 rgba(0,0,0,.1);
  border: 1px solid #ddd;
  background-color: #fff;
  z-index: 88;
}
.search-input {
  border: none;
  outline: 0;
  padding: 0 0 0 2px;
  margin: 0;
  height: 20px;
  font-size: 12px;
}
.auto-completer-items {
  font-size: 12px;
  overflow: hidden;
  overflow-y: auto;
  background-color: #fff;
  max-height: 400px;
  list-style: none;
  margin: 0;
  padding: 0;
  > li {
    > span {
      // height: 30px;
      display: block;
      padding: 6px 10px;
      cursor: pointer;
      &.empty {
        cursor: default;
      }
    }
    &:hover {
      background-color: #f2f2f2;
      > span {
        &.empty {
          background-color: #fff;
        }
      }
    }
    &.actions {
      &:hover {
        background-color: #fff;
      }
    }
  }
  .loading {
    &:hover {
      background-color: #fff;
    }
  }
  .no-data {
    &:hover {
      background-color: #fff;
    }
  }
}
.cursor-text {
  cursor: text;
}

.actions {
  border-top: 1px solid #ddd;
  > span {
    cursor: pointer;
    height: 30px;
    line-height: 30px;
    text-align: center;
    font-size: 12px;
    display: inline-block;
    box-sizing: border-box;
    width: 50%;
    &:first-child {
      border-right: 1px solid #ddd;
    }
    &:hover {
      background-color: #f2f2f2;
    }
    &.disabled {
      cursor: not-allowed;
      background-color: #f5f5f5;
      color: rgba(0, 0, 0, 0.25);
    }
  }
}

.dropdown-search-input ::v-deep .ant-input {
  border: none;
  border-bottom: 1px solid #d9d9d9;
}

@media only screen and (max-height: 720px) {
  .auto-completer-items {
    max-height: 300px;
  }
}
</style>
