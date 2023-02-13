# Explority Reverse Proxy

## Introduction

- The project creates a reverse proxy, using the CloudFront AWS service.

## Concepts

- Origin
    - The target destination for the user request.
- Behavior
    - The path matching and the corresponding origin to target.
- Cloud Function
    - Custom configuration, using JavaScript to change the request.
    - In this case, to add the `subdomain` query parameter.

## Requirements

- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
    - Allows the creation of AWS infrastructure, using programming languages like TypeScript.
- [NodeJS](https://nodejs.org/en/)
    - Has tools like npm to run scripts.
- admin username for the domain to create the Certificate, like `admin@explorityapp.com`

## AWS services deployed

- [Certicate Manager](https://aws.amazon.com/certificate-manager/)
    - Emit certificates to use with CloudFront.
- [CloudFront](https://aws.amazon.com/cloudfront/)
    - Reverse proxy and CDN, if applicable.
- [S3 Bucket](https://aws.amazon.com/s3/)
    - Stores the log files from CloudFront.

## Configure AWS access

- Get the AWS Key and AWS Secret from IAM credentials
  on [AWS](https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/home)
- `aws configure --profile explority-rp`

## How to deploy

- Edit the `bin/reverse-proxy.ts` file, and change the `domainName` and the `namePrefix`.
- You can also pass these values as Env variables, as `DOMAIN_NAME` and `NAME_PREFIX` respectively.
- `npm install`
- `AWS_PROFILE=explority-rp cdk bootstrap aws://<account number>/us-east-1`
- `AWS_PROFILE=explority-rp cdk deploy CertificateStack`
- copy the output CertificateStack.CertificateArn = <arn>
- `AWS_PROFILE=explority-rp cdk deploy ReverseProxyStack --parameters CertificateArn=<arn>`

## Access to Host header

- Please try `host` and `:authority`
