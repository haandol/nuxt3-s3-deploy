import * as path from 'path';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as cpactions from 'aws-cdk-lib/aws-codepipeline-actions';

interface Props {
  buildPath: string;
  repositoryRegion: string;
  repositoryBranch: string;
  repositoryName: string;
  distributionId: string;
  bucket: s3.IBucket;
}

export class Pipeline extends Construct {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const ns = this.node.tryGetContext('ns') as string;

    const pipeline = new codepipeline.Pipeline(this, `Pipeline`, {
      pipelineName: `${ns}Pipeline`,
      crossAccountKeys: false,
    });

    // SourceStage - clone source
    const codeRepo = codecommit.Repository.fromRepositoryName(
      this,
      `CodeRepo`,
      props.repositoryName
    );
    const sourceStage = pipeline.addStage({ stageName: 'Source' });
    const sourceOutput = new codepipeline.Artifact('source');
    sourceStage.addAction(
      new cpactions.CodeCommitSourceAction({
        actionName: 'CodeCommitSource',
        output: sourceOutput,
        branch: props.repositoryBranch,
        repository: codeRepo,
      })
    );

    // NuxtStage - build
    const nuxtOutput = new codepipeline.Artifact('nuxt');
    const nuxtStage = pipeline.addStage({ stageName: 'Nuxt' });
    const nuxtProject = new codebuild.Project(this, `${ns}NuxtProject`, {
      projectName: `${ns}NuxtProject`,
      buildSpec: this.createNuxtBuildspec(props.buildPath),
      environment: {
        buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
      },
    });
    nuxtProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['codecommit:*', 's3:*'],
        effect: iam.Effect.ALLOW,
        resources: ['*'],
      })
    );
    nuxtStage.addAction(
      new cpactions.CodeBuildAction({
        runOrder: 10,
        actionName: 'NuxtAction',
        input: sourceOutput,
        project: nuxtProject,
        outputs: [nuxtOutput],
      })
    );
    nuxtStage.addAction(
      new cpactions.S3DeployAction({
        runOrder: 20,
        actionName: 'DeployAction',
        input: nuxtOutput,
        bucket: props.bucket,
        accessControl: s3.BucketAccessControl.PRIVATE,
      })
    );

    // CfStage - invalid cloudfront
    const cfStage = pipeline.addStage({ stageName: 'Cloudfront' });
    const cfProject = new codebuild.Project(this, `${ns}CloudfrontProject`, {
      projectName: `${ns}CloudfrontProject`,
      buildSpec: this.createCfBuildspec(props.distributionId),
      environment: {
        buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
      },
    });
    cfProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudfront:*'],
        effect: iam.Effect.ALLOW,
        resources: ['*'],
      })
    );
    cfStage.addAction(
      new cpactions.CodeBuildAction({
        runOrder: 10,
        input: sourceOutput,
        actionName: 'CfAction',
        project: cfProject,
      })
    );
  }

  createNuxtBuildspec(buildPath: string): codebuild.BuildSpec {
    const buildCommands: string[] = [
      `cd ${buildPath}`,
      `npm i -g yarn`,
      `yarn install`,
      `yarn generate`,
      `ls -al`,
    ];

    return codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        build: {
          commands: buildCommands,
        },
      },
      artifacts: {
        name: 'nuxt',
        files: ['**/*'],
        'base-directory': path.resolve(buildPath, 'dist'),
      },
    });
  }

  createCfBuildspec(distId: string): codebuild.BuildSpec {
    const buildCommands: string[] = [
      `aws cloudfront create-invalidation --distribution-id ${distId} --paths "/*"`,
    ];

    return codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        build: {
          commands: buildCommands,
        },
      },
    });
  }
}
