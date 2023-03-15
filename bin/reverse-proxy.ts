#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ReverseProxyStack } from "../lib/reverse-proxy-stack";
import { ApiGatewayStack } from "../lib/api-gateway-stack";
import { DomainNamesStack } from "../lib/domain-names-stack";

const namePrefix = process.env.NAME_PREFIX as string;

const app = new cdk.App();

new ReverseProxyStack(app, "ReverseProxyStack", {
  namePrefix,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});

new ApiGatewayStack(app, "ApiGatewayStack", {
  namePrefix,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});

new DomainNamesStack(app, "DomainNamesStack", {
  namePrefix,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});
