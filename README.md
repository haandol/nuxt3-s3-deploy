# Nuxt3 Deploy using S3 and Cloudfront

This repository is for deploying Nuxt3 project to Cloudfront with Origin Access Identity.

Cloudfront with Origin Access Identity(OAI) allows you to hosting static web-site on S3 keep blocking direct access from public.

<img src="/img/architecture.png" />

# Prerequisites

- Nodejs 16.x
- AWS Account and Locally configured AWS credential

# Installation

Install project dependencies

```bash
$ cd infra
$ npm i -g cdk@2.100.0
$ npm i
$ cdk bootstrap
```

# Usage

## Setup git repository for CI/CD trigger

> Set your generate folder to `dist`. ref [stackoverflow](https://stackoverflow.com/questions/75794580/nuxt-3-nuxt-generate-change-static-output-directory)

```bash
$ git clone YOUR_NUXT3_SPA_PROJECT
$ cd nuxt3-deploy
$ git remote set-url origin codecommit::ap-northeast-2://nuxt3-deploy
$ git push origin
```

## Setup config

if you want to use your own repository, edit `repository` variable at [**/infra/config/dev.toml**](/infra/config/dev.toml)

```bash
$ cp config/dev.toml .toml
```

```ini
if you want to use alternative domains with AWS Certificate Manager, add following config to your toml

[domain]
acmCertArn="CERT_ARN"
altDomains=["www.ALTDOMAIN.com"]
```

the repository should be Codecommit git repository

## Deploy CDK Stacks on AWS

```bash
$ cdk deploy "*" --require-approval never
```

## Visit site

After every commit on your NextJs web repository, CodePipeline will build and deploy your CSR app on CloudFront.

```bash
$ aws cloudformation describe-stacks --stack-name Nuxt3DeployInfraStack --query "Stacks[0].Outputs[?ExportName=='Nuxt3DeployDistDomainName'].OutputValue" --output text
xxx.cloudfront.net

$ open http://xxx.cloudfront.net
```

# Cleanup

destroy provisioned cloud resources

```bash
$ cdk destroy "*"
```
