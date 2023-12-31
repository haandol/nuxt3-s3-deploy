import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as certmanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

interface Props {
  bucket: s3.IBucket;
  acmCertArn?: string;
  aliases?: string[];
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

    let viewerCertificate = undefined;
    if (props.acmCertArn) {
      const certificate = certmanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        props.acmCertArn
      );
      viewerCertificate = cloudfront.ViewerCertificate.fromAcmCertificate(
        certificate,
        {
          aliases: props.aliases,
        }
      );
    }

    const cfDist = new cloudfront.CloudFrontWebDistribution(this, `${ns}Dist`, {
      comment: ns,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: props.bucket,
            originAccessIdentity,
            originShieldRegion: cdk.Stack.of(this).region,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              minTtl: cdk.Duration.seconds(0),
              maxTtl: cdk.Duration.seconds(86400),
              defaultTtl: cdk.Duration.seconds(3600),
              allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD,
              cachedMethods: cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD,
              viewerProtocolPolicy:
                cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
          ],
        },
      ],
      errorConfigurations: [
        {
          errorCode: 403,
          responseCode: 200,
          responsePagePath: '/index.html',
        },
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html',
        },
      ],
      viewerCertificate,
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
