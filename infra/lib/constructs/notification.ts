import * as path from 'path';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as notifications from 'aws-cdk-lib/aws-codestarnotifications';

interface Props {
  pipeline: codepipeline.IPipeline;
  notificationHookUrl: string;
}

export class Notification extends Construct {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const ns = this.node.tryGetContext('ns') as string;

    const topic = new sns.Topic(this, 'PipelineNotificationTopic', {
      displayName: `${ns}PipelineNotification`,
    });

    const fn = new lambdaNodejs.NodejsFunction(this, 'Notifier', {
      functionName: `${ns}PipelineNotification`,
      entry: path.resolve(__dirname, '..', 'functions', 'notify.ts'),
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        HOOK_URL: props.notificationHookUrl || '',
      },
    });
    topic.addSubscription(new subscriptions.LambdaSubscription(fn));

    const rule = new notifications.NotificationRule(this, 'NotificationRule', {
      source: props.pipeline,
      events: [
        codepipeline.PipelineNotificationEvents.PIPELINE_EXECUTION_STARTED,
        codepipeline.PipelineNotificationEvents.PIPELINE_EXECUTION_SUCCEEDED,
        codepipeline.PipelineNotificationEvents.PIPELINE_EXECUTION_FAILED,
      ],
    });
    rule.addTarget(topic);
  }
}
