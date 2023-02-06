#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ReverseProxyStack } from "../lib/reverse-proxy-stack";

const domainName = process.env.DOMAIN_NAME || "explorityapp.com";
const namePrefix = process.env.NAME_PREFIX || "dev";

const app = new cdk.App();

new ReverseProxyStack(app, "ReverseProxyStack", {
  domainName,
  namePrefix,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
