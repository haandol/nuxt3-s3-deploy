#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/stacks/pipeline-stack';
import { Config } from '../config/loader';

const app = new cdk.App({
  context: {
    ns: Config.app.ns,
  },
});

new PipelineStack(app, `${Config.app.ns}PipelineStack`, {
  buildPath: Config.build.path,
  repositoryName: Config.repository.name,
  repositoryBranch: Config.repository.branch,
  repositoryRegion: Config.repository.region,
  acmCertArn: Config.domain?.acmCertArn,
  aliases: Config.domain?.altDomains,
  notificationHookUrl: Config.notification?.hookUrl,
});
