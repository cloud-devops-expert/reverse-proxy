#!/usr/bin/env bash

set -e

export JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1

export AWS_PROFILE=explority-rp

export NAME_PREFIX=prod

INITIAL_DOMAIN_NAME="*.explority.com"

cdk bootstrap

logger -s "Creating initial domain names..."

cdk deploy DomainNamesStack${NAME_PREFIX} \
  --parameters "${NAME_PREFIX}domainnamesinitialvalues=${INITIAL_DOMAIN_NAME}" \
  --require-approval never

logger -s "Creating Reverse Proxy..."

cdk deploy ReverseProxyStack${NAME_PREFIX} \
  --require-approval never

logger -s "Creating Support API..."

cdk deploy ApiGatewayStack${NAME_PREFIX} \
  --require-approval never
