<template>
  <div>
    <a-form :form="form.fc" v-if="decorators" v-bind="formLayout">
      <a-form-item :label="$t('cloudenv.text_95')">
        <a-input v-decorator="decorators.name" :placeholder="$t('cloudenv.text_190')" />
      </a-form-item>
      <a-form-item :label="keySecretField.label.k">
        <a-input v-decorator="decorators.username" :placeholder="keySecretField.placeholder.k" />
        <div slot="extra">
          {{$t('cloudenv.text_236', [keySecretField.text, keySecretField.label.k])}}
          <help-link :href="docs[provider.toLowerCase()]">{{$t('cloudenv.text_237')}}</help-link>
        </div>
      </a-form-item>
      <a-form-item :label="keySecretField.label.s">
        <a-input-password v-decorator="decorators.password" :placeholder="keySecretField.placeholder.s" />
      </a-form-item>
      <a-form-item :label="$t('cloudenv.cloudaccount.apsara.default_region')">
        <a-input v-decorator="decorators.default_region" :placeholder="$t('common.tips.input', [$t('cloudenv.cloudaccount.apsara.default_region')])" />
      </a-form-item>
      <a-form-item :label="$t('cloudenv.cloudaccount.apsara.endpoint')">
        <a-input v-decorator="decorators.endpoint" :placeholder="$t('common.tips.input', [$t('cloudenv.cloudaccount.apsara.endpoint')])" />
        <div slot="extra">
          {{$t('cloudenv.text_574', [keySecretField.text])}}
          <help-link :href="`https://help.aliyun.com/apsara/enterprise/v_3_12_0_20200630/apsara_stack_platform/enterprise-developer-guide/obtain-the-endpoint-of-api-operations.html`">{{$t('cloudenv.text_575')}}</help-link>
        </div>
      </a-form-item>
      <a-collapse :bordered="false">
        <a-collapse-panel :header="$t('cloudenv.cloudaccount.apsara.other.endpoints')">
        <a-form-item :label="$t('cloudenv.cloudaccount.apsara.ecs_endpoint')">
          <a-input v-decorator="decorators.ecs_endpoint" :placeholder="$t('common.tips.input', [$t('cloudenv.cloudaccount.apsara.ecs_endpoint')])" />
        </a-form-item>
        <a-form-item :label="$t('cloudenv.cloudaccount.apsara.vpc_endpoint')">
          <a-input v-decorator="decorators.vpc_endpoint" :placeholder="$t('common.tips.input', [$t('cloudenv.cloudaccount.apsara.vpc_endpoint')])" />
        </a-form-item>
        <a-form-item :label="$t('cloudenv.cloudaccount.apsara.slb_endpoint')">
          <a-input v-decorator="decorators.slb_endpoint" :placeholder="$t('common.tips.optional_input', [$t('cloudenv.cloudaccount.apsara.slb_endpoint')])" />
        </a-form-item>
        <a-form-item :label="$t('cloudenv.cloudaccount.apsara.oss_endpoint')">
          <a-input v-decorator="decorators.oss_endpoint" :placeholder="$t('common.tips.optional_input', [$t('cloudenv.cloudaccount.apsara.oss_endpoint')])" />
        </a-form-item>
        <a-form-item :label="$t('cloudenv.cloudaccount.apsara.rds_endpoint')">
          <a-input v-decorator="decorators.rds_endpoint" :placeholder="$t('common.tips.optional_input', [$t('cloudenv.cloudaccount.apsara.rds_endpoint')])" />
        </a-form-item>
        <a-form-item :label="$t('cloudenv.cloudaccount.apsara.kvs_endpoint')">
          <a-input v-decorator="decorators.kvs_endpoint" :placeholder="$t('common.tips.optional_input', [$t('cloudenv.cloudaccount.apsara.kvs_endpoint')])" />
        </a-form-item>
        <a-form-item :label="$t('cloudenv.cloudaccount.apsara.metrics_endpoint')">
          <a-input v-decorator="decorators.metrics_endpoint" :placeholder="$t('common.tips.optional_input', [$t('cloudenv.cloudaccount.apsara.metrics_endpoint')])" />
        </a-form-item>
        <a-form-item :label="$t('cloudenv.cloudaccount.apsara.action_trail_endpoint')">
          <a-input v-decorator="decorators.action_trail_endpoint" :placeholder="$t('common.tips.optional_input', [$t('cloudenv.cloudaccount.apsara.action_trail_endpoint')])" />
        </a-form-item>
        </a-collapse-panel>
      </a-collapse>
      <domain-project :fc="form.fc" :form-layout="formLayout" :decorators="{ project: decorators.project, domain: decorators.domain, auto_create_project: decorators.auto_create_project }" />
      <proxy-setting :fc="form.fc" :fd="form.fd" ref="proxySetting" />
      <auto-sync :fc="form.fc" />
      <share-mode :fd="form.fd" />
    </a-form>
  </div>
</template>

<script>
import DomainProject from '../../../components/DomainProject'
import createMixin from './createMixin'
import AutoSync from '@Cloudenv/views/cloudaccount/components/AutoSync'
import ProxySetting from '@Cloudenv/views/cloudaccount/components/ProxySetting'
import ShareMode from '@Cloudenv/views/cloudaccount/components/ShareMode'
import { getCloudaccountDocs, keySecretFields } from '@Cloudenv/views/cloudaccount/constants'
import { isRequired } from '@/utils/validate'

export default {
  name: 'Apsara',
  components: {
    AutoSync,
    DomainProject,
    ProxySetting,
    ShareMode,
  },
  mixins: [createMixin],
  data () {
    const keySecretField = keySecretFields[this.provider.toLowerCase()]
    return {
      docs: getCloudaccountDocs(this.$store.getters.scope),
      decorators: this.getDecorators(keySecretField),
    }
  },
  methods: {
    getDecorators (initKeySecretFields) {
      const keySecretField = this.keySecretField || initKeySecretFields
      const decorators = {
        name: [
          'name',
          {
            validateFirst: true,
            rules: [
              { required: true, message: this.$t('cloudenv.text_190') },
              { validator: this.$validate('resourceName') },
            ],
          },
        ],
        username: [
          keySecretField.k,
          {
            rules: [
              { required: true, message: keySecretField.placeholder.k },
            ],
          },
        ],
        password: [
          keySecretField.s,
          {
            rules: [
              { required: true, message: keySecretField.placeholder.s },
            ],
          },
        ],
        domain: [
          'domain',
          {
            initialValue: this.$store.getters.userInfo.projectDomainId,
            rules: [
              { validator: isRequired(), message: this.$t('rules.domain'), trigger: 'change' },
            ],
          },
        ],
        auto_create_project: [
          'auto_create_project',
          {
            initialValue: false,
            valuePropName: 'checked',
          },
        ],
        endpoint: [
          'endpoint',
          {
            rules: [
              { required: true, message: this.$t('common.tips.input', [this.$t('cloudenv.cloudaccount.apsara.endpoint')]) },
            ],
          },
        ],
        default_region: [
          'default_region',
          {
            rules: [
              { required: true, message: this.$t('common.tips.input', [this.$t('cloudenv.cloudaccount.apsara.default_region')]) },
            ],
          },
        ],
        ecs_endpoint: [
          'ecs_endpoint',
        ],
        rds_endpoint: [
          'rds_endpoint',
        ],
        vpc_endpoint: [
          'vpc_endpoint',
        ],
        kvs_endpoint: [
          'kvs_endpoint',
        ],
        slb_endpoint: [
          'slb_endpoint',
        ],
        oss_endpoint: [
          'oss_endpoint',
        ],
        sts_endpoint: [
          'sts_endpoint',
        ],
        action_trail_endpoint: [
          'action_trail_endpoint',
        ],
        ram_endpoint: [
          'ram_endpoint',
        ],
        metrics_endpoint: [
          'metrics_endpoint',
        ],
        resourcemanager_endpoint: [
          'resourcemanager_endpoint',
        ],
      }
      return decorators
    },
  },
}
</script>
