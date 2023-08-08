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

### First run

- Edit cdk-deploy.sh script to adapt the initial values.
- `npm install`
- `./cdk-deploy.sh`
    - if the script stucks (initial domain requires CNAME creation):
        - go https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/list
        - search for Pending state
        - open the certificate
        - go to Domains
            - create the CNAME records according to the list
- Search for `restapiEndpoint` as `<domainNamesEndpoint>`, and copy the value to clipboard.
- Search for `DomainName`. It corresponses to the distribution domain name.
    - go to your DNS server for the initial domain, and create a CNAME pointing to <domainName>

### New customers

#### Add new domain

- `curl <domainNamesEndpoint>/domains -d '{"domainName": "<new domain>"}' -H "x-api-key: f6f33e38-16e2-451a-830e-aa41731852f6"`
    - it will return the list of CNAMEs to create
        - **hostName**: value to fill on Host Name field, if empty, create a CNAME record with hostName field empty
        - **data**: value to fill on Data field
    - this call is now idempotent, and should be retried if it timeouts for some reason

#### Delete domain

- `curl -XDELETE <domainNamesEndpoint>/domains -d '{"domainName": "<new domain>"}' -H "x-api-key: f6f33e38-16e2-451a-830e-aa41731852f6"`
    - it will delete the domain from distribution

#### List domains

- `curl <domainNamesEndpoint>/domains -H "x-api-key: f6f33e38-16e2-451a-830e-aa41731852f6"`
    - list the current domains

#### Update CloudFront distribution

- `curl -XPATCH <domainNamesEndpoint>/distribution -H "x-api-key: f6f33e38-16e2-451a-830e-aa41731852f6"`
    - it will update the CloudFront distribution to include the new domains
    - it should be run after the CNAMEs are created
    - if the certificate is not ready, the API returns an error explaining why
