#!/usr/bin/env bash

export AWS_PROFILE=explority-rp

cdk bootstrap

logger -s "Creating Support API..."

cdk deploy ApiGatewayStack

logger -s "Creating Reverse Proxy..."

cdk deploy ReverseProxyStack
