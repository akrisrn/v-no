<template>
    <Vssue :options="options" :title="path"/>
</template>

<script lang="ts">
  import { VssueComponent } from 'vssue';
  import GithubV4 from '@vssue/api-github-v4';
  import { Component, Prop, Vue } from 'vue-property-decorator';

  @Component({ components: { Vssue: VssueComponent } })
  export default class Comment extends Vue {
    @Prop() public path!: string;

    public options = {
      api: GithubV4,
      owner: process.env.VUE_APP_VSSUE_OWNER,
      repo: process.env.VUE_APP_VSSUE_REPO,
      clientId: process.env.VUE_APP_VSSUE_CLIENT_ID,
      clientSecret: process.env.VUE_APP_VSSUE_CLIENT_SECRET,
    };
  }
</script>

<style lang="stylus">@import '../styl/comment.styl'</style>
