#!/usr/bin/env bash

set -e

#export AWS_PROFILE=explority-rp
export AWS_PROFILE=cloud4hotel

export NAME_PREFIX=dev

INITIAL_DOMAIN_NAME="*.explority.com"

cdk bootstrap

logger -s "Creating initial domain names..."

cdk deploy DomainNamesStack \
  --parameters "${NAME_PREFIX}domainnamesinitialvalues=${INITIAL_DOMAIN_NAME}" \
  --require-approval never

logger -s "Creating Support API..."

cdk deploy ApiGatewayStack \
  --require-approval never

logger -s "Creating Reverse Proxy..."

cdk deploy ReverseProxyStack \
  --require-approval never
