<template>
  <base-dialog @cancel="cancelDialog">
    <div slot="header">{{$t('compute.text_247')}}</div>
    <div slot="body">
      <dialog-selected-tips :name="$t('dictionary.server')" :count="params.data.length" :action="$t('compute.text_247')" />
      <dialog-table :data="params.data" :columns="params.columns.slice(0, 3)" />
      <a-form
        :form="form.fc">
        <!-- <a-form-item :label="$t('common.text00076')" v-bind="formItemLayout">
          <a-radio-group v-decorator="decorators.disable_delete">
            <a-radio-button
              v-for="item of disableDeleteOptions"
              :key="item.key"
              :value="item.key">{{ item.label }}</a-radio-button>
          </a-radio-group>
        </a-form-item> -->
        <template v-if="isKvm">
          <a-form-item :label="$t('compute.text_1269')" v-bind="formItemLayout">
            <a-radio-group v-decorator="decorators.boot_order">
              <a-radio-button
                v-for="item of bootOrderOptions"
                :key="item.key"
                :value="item.key">{{ item.label }}</a-radio-button>
            </a-radio-group>
          </a-form-item>
          <a-form-item :label="$t('compute.text_1155')" v-bind="formItemLayout">
            <bios :decorator="decorators.bios" :isArm="isArm" />
          </a-form-item>
          <a-form-item :label="$t('compute.vdi_protocol')" v-bind="formItemLayout">
            <vdi :decorator="decorators.vdi" @change="handleVdiChange" />
          </a-form-item>
          <a-form-item :label="$t('compute.vga')" v-bind="formItemLayout">
            <vga :decorator="decorators.vga" :vdi="vdi" />
          </a-form-item>
          <a-form-item :label="$t('compute.machine')" v-bind="formItemLayout">
            <machine :decorator="decorators.machine" :isArm="isArm" />
          </a-form-item>
        </template>
      </a-form>
      <a-alert :message="$t('compute.need_reboot_prompt')" banner />
    </div>
    <div slot="footer">
      <a-button type="primary" @click="handleConfirm" :loading="loading">{{ $t('dialog.ok') }}</a-button>
      <a-button @click="cancelDialog">{{ $t('dialog.cancel') }}</a-button>
    </div>
  </base-dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialog'
import WindowsMixin from '@/mixins/windows'
import Bios from '@Compute/sections/BIOS'
import Vdi from '@Compute/sections/VDI'
import Vga from '@Compute/sections/VGA'
import Machine from '@Compute/sections/Machine'

export default {
  name: 'VmUpdateDialog',
  components: {
    Bios,
    Vdi,
    Vga,
    Machine,
  },
  mixins: [DialogMixin, WindowsMixin],
  data () {
    return {
      loading: false,
      form: {
        fc: this.$form.createForm(this),
      },
      vdi: 'vnc',
      decorators: {
        disable_delete: [
          'disable_delete',
          {
            rules: [
              { required: true, message: this.$t('compute.text_1270') },
            ],
          },
        ],
        boot_order: [
          'boot_order',
          {
            rules: [
              { required: true, message: this.$t('compute.text_1271') },
            ],
          },
        ],
        bios: [
          'bios',
          {
            rules: [
              { required: true, message: this.$t('compute.text_1272') },
            ],
          },
        ],
        vdi: [
          'vdi',
          {
            rules: [
              { required: true, message: this.$t('compute.prompt_vdi') },
            ],
          },
        ],
        vga: [
          'vga',
          {
            rules: [
              { required: true, message: this.$t('compute.prompt_vga') },
            ],
          },
        ],
        machine: [
          'machine',
          {
            rules: [
              { required: true, message: this.$t('compute.prompt_machine') },
            ],
          },
        ],
      },
      bootOrderOptions: [
        {
          label: this.$t('compute.text_100'),
          key: 'cdn',
        },
        {
          label: this.$t('compute.text_1273'),
          key: 'dcn',
        },
        {
          label: this.$t('compute.text_104'),
          key: 'ncd',
        },
      ],
      disableDeleteOptions: [
        {
          label: this.$t('compute.text_656'),
          key: true,
        },
        {
          label: this.$t('compute.text_569'),
          key: false,
        },
      ],
      formItemLayout: {
        wrapperCol: {
          span: 20,
        },
        labelCol: {
          span: 4,
        },
      },
    }
  },
  computed: {
    isKvm () {
      return this.params.data.length >= 1 && this.params.data[0].hypervisor === 'kvm'
    },
    isArm () {
      return this.params.data.length >= 1 && this.params.data[0].os_arch === 'arm'
    },
  },
  created () {
    this.initFormValue(this.params.data[0])
  },
  methods: {
    async handleConfirm () {
      this.loading = true
      try {
        const values = await this.form.fc.validateFields()
        const ids = this.params.data.map(item => item.id)
        await this.params.onManager('batchUpdate', {
          id: ids,
          managerArgs: {
            data: values,
          },
        })
        this.loading = false
        this.cancelDialog()
      } catch (error) {
        this.loading = false
      }
    },
    initFormValue (data) {
      this.$nextTick(() => {
        const updateObj = {
          disable_delete: data.disable_delete,
        }
        if (this.isKvm) {
          updateObj.boot_order = data.boot_order
          updateObj.bios = data.bios || (this.isArm ? 'UEFI' : 'BIOS')
          updateObj.vdi = data.vdi ? data.vdi : 'vnc'
          updateObj.vga = data.vga ? data.vga : 'std'
          this.vdi = updateObj.vdi
          updateObj.machine = data.machine ? data.machine : (this.isArm ? 'virt' : 'pc')
        }
        this.form.fc.setFieldsValue(updateObj)
      })
    },
    handleVdiChange (data) {
      this.vdi = data.value
    },
  },
}
</script>
