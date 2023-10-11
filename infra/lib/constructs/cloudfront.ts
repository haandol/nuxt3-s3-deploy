import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

interface Props {
  bucket: s3.IBucket;
}

export class Cloudfront extends Construct {
  public readonly distributionId: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const ns = this.node.tryGetContext('ns') as string;

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      `${ns}OAI`
    );
    props.bucket.grantRead(originAccessIdentity);

    const origin = new origins.S3Origin(props.bucket, { originAccessIdentity });
    const cfDist = new cloudfront.Distribution(this, `${ns}Dist`, {
      defaultBehavior: {
        origin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: false,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });
    this.distributionId = cfDist.distributionId;

    new cdk.CfnOutput(this, `DistId`, {
      exportName: `${ns}DistId`,
      value: cfDist.distributionId,
    });
    new cdk.CfnOutput(this, `DistDomainName`, {
      exportName: `${ns}DistDomainName`,
      value: cfDist.distributionDomainName,
    });
  }
}
