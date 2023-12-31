import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import { Cloudfront } from '../constructs/cloudfront';
import { Pipeline } from '../constructs/pipeline';
import { Notification } from '../constructs/notification';

interface Props extends cdk.StackProps {
  buildPath: string;
  repositoryRegion: string;
  repositoryBranch: string;
  repositoryName: string;
  acmCertArn?: string;
  aliases?: string[];
  notificationHookUrl?: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const ns = this.node.tryGetContext('ns') as string;

    new codecommit.Repository(this, 'Repository', {
      repositoryName: props.repositoryName,
    });

    const bucket = new s3.Bucket(this, `${ns}Bucket`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const cf = new Cloudfront(this, `Cloudfront`, {
      bucket,
      acmCertArn: props.acmCertArn,
      aliases: props.aliases,
    });

    const pipeline = new Pipeline(this, `Pipeline`, {
      ...props,
      bucket,
      distributionId: cf.distributionId,
    });

    if (props.notificationHookUrl) {
      new Notification(this, `Notification`, {
        ...props,
        pipeline: pipeline.pipeline,
        notificationHookUrl: props.notificationHookUrl,
      });
    }
  }
}
