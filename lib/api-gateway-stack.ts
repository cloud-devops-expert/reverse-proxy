import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  ApiKeySourceType,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StringListParameter } from "aws-cdk-lib/aws-ssm";

interface ApiGatewayStackProps extends StackProps {
  namePrefix: string;
}

export class ApiGatewayStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    const { namePrefix } = props;

    const domainNamesParam = `/${namePrefix}/domains/list`;

    const addDomainFn = new NodejsFunction(this, `${namePrefix}-add-domain`, {
      architecture: Architecture.ARM_64,
      logRetention: RetentionDays.SIX_MONTHS,
      entry: "./lib/lambda-functions/add-domain.ts",
      environment: {
        DOMAIN_NAMES_PARAM: domainNamesParam,
      },
    });

    const domainList = StringListParameter.fromListParameterAttributes(
      this,
      `${namePrefix}-domain-list-param`,
      {
        parameterName: domainNamesParam,
      }
    );

    domainList.grantRead(addDomainFn);
    domainList.grantWrite(addDomainFn);

    const getCNameFn = new NodejsFunction(this, `${namePrefix}-get-cname`, {
      architecture: Architecture.ARM_64,
      logRetention: RetentionDays.SIX_MONTHS,
      entry: "./lib/lambda-functions/get-cname.ts",
    });

    getCNameFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["acm:DescribeCertificate"],
        resources: [
          `arn:aws:acm:${Stack.of(this).region}:${
            Stack.of(this).account
          }:certificate/*`,
        ],
      })
    );

    getCNameFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["acm:ListCertificates"],
        resources: ["*"],
      })
    );

    const restApi = new RestApi(this, `${namePrefix}-rest-api`, {
      apiKeySourceType: ApiKeySourceType.HEADER,
    });

    const apiKey = restApi.addApiKey(`${namePrefix}-api-key`, {
      value: "f6f33e38-16e2-451a-830e-aa41731852f6",
    });

    const usagePlan = restApi.addUsagePlan(`${namePrefix}-usage-plan`, {});

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: restApi.deploymentStage,
    });

    const domainsResource = restApi.root.addResource("domains");

    domainsResource.addMethod("POST", new LambdaIntegration(addDomainFn), {
      apiKeyRequired: true,
    });

    domainsResource
      .addResource("{domainName}")
      .addMethod("GET", new LambdaIntegration(getCNameFn), {
        apiKeyRequired: true,
      });
  }
}