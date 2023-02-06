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

## AWS services deployed

- [Certicate Manager](https://aws.amazon.com/certificate-manager/)
    - Emit certificates to use with CloudFront.
- [CloudFront](https://aws.amazon.com/cloudfront/)
    - Reverse proxy and CDN, if applicable.

## How to deploy

- Edit the `bin/reverse-proxy.ts` file, and change the `domainName` and the `namePrefix`.
- You can also pass these values as Env variables, as `DOMAIN_NAME` and `NAME_PREFIX` respectively.
- `npm run cdk deploy`
