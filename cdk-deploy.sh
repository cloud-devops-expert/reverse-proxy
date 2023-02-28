#!/usr/bin/env bash

export AWS_PROFILE=explority-rp

cdk bootstrap

cdk deploy ReverseProxyStack
