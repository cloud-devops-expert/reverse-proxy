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
- Docker installed

## AWS services deployed

- [Certicate Manager](https://aws.amazon.com/certificate-manager/)
    - Emit certificates to use with CloudFront.
- [CloudFront](https://aws.amazon.com/cloudfront/)
    - Reverse proxy and CDN, if applicable.
- [S3 Bucket](https://aws.amazon.com/s3/)
    - Stores the log files from CloudFront.
- API Gateway
    - Endpoints to support the domain names management.

## Configure AWS access

- Get the AWS Key and AWS Secret from IAM credentials
  on [AWS](https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/home)
- `aws configure --profile explority-rp`

## How to deploy

- Edit cdk-deploy.sh script to adapt the initial values.
- `npm install`
- `./cdk-deploy.sh`
- Search for `restapiEndpoint` as `<domainNamesEndpoint>`, and copy the value o clipboard.
- Open a new terminal, replace `<domainNamesEndpoint>` with the clipboard value, and run:
    - `curl <domainNamesEndpoint>/domains/<domain name> -H "x-api-key: 0c12527c-638e-49e7-a7da-c630a384b909"`
    - this can be coded as Http client to automate this request
- It will return the CNAME record information to be created on the domain's owner system.

## Add new domain

- `curl <domainNamesEndpoint>/domains -d '{"domainName": "<new domain>"}' -H "x-api-key:
  0c12527c-638e-49e7-a7da-c630a384b909"`
- It will update the `/domains/list` with the new domain
- Rerun the `./cdk-deploy.sh` to update the certificate and the CloudFront distribution

### Update wildcard domain

- go to https://us-east-1.console.aws.amazon.com/cloudfront/v3/home#/distributions to get the `Distribution domain name`
- copy the value
- go to Google Domains
- create a CNAME for *
- paste the domain

## Access to Host header

- Please try `host` and `:authority`
