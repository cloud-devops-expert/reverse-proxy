#!/usr/bin/env bash

#export AWS_PROFILE=explority-rp
export AWS_PROFILE=cloud4hotel

cdk bootstrap

#cdk deploy ReverseProxyStack
cdk deploy ApiGatewayStack
