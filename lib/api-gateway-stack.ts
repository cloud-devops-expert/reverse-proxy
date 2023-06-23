import { Duration, Fn, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  ApiKeySourceType,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StringListParameter, StringParameter } from "aws-cdk-lib/aws-ssm";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";

interface ApiGatewayStackProps extends StackProps {
  namePrefix: string;
}

export class ApiGatewayStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    const { namePrefix } = props;

    const domainNamesParam = `/${namePrefix}/domains/list`;
    const certificateArnParam = `/${namePrefix}/certificate-arn`;
    const distributionIdParam = `/${namePrefix}/cloudfront-distribution-id`;

    const addDomainFn = new NodejsFunction(this, `${namePrefix}-add-domain`, {
      logRetention: RetentionDays.SIX_MONTHS,
      timeout: Duration.seconds(30),
      entry: "./lib/lambda-functions/add-domain.ts",
      environment: {
        DOMAIN_NAMES_PARAM: domainNamesParam,
        CERTIFICATE_ARN_PARAM: certificateArnParam,
        CLOUDFRONT_DISTRIBUTION_ID_PARAM: distributionIdParam,
      },
    });

    const updateDistributionFn = new NodejsFunction(
      this,
      `${namePrefix}-update-distribution`,
      {
        logRetention: RetentionDays.SIX_MONTHS,
        timeout: Duration.seconds(30),
        entry: "./lib/lambda-functions/update-distribution.ts",
        environment: {
          DOMAIN_NAMES_PARAM: domainNamesParam,
          CERTIFICATE_ARN_PARAM: certificateArnParam,
          CLOUDFRONT_DISTRIBUTION_ID_PARAM: distributionIdParam,
        },
      }
    );

    const domainList = StringListParameter.fromListParameterAttributes(
      this,
      `${namePrefix}-domain-list-param`,
      {
        parameterName: domainNamesParam,
      }
    );

    domainList.grantRead(updateDistributionFn);

    domainList.grantRead(addDomainFn);
    domainList.grantWrite(addDomainFn);

    const certificateArn = StringListParameter.fromListParameterAttributes(
      this,
      `${namePrefix}-certificate-arn-param`,
      {
        parameterName: certificateArnParam,
      }
    );

    certificateArn.grantWrite(updateDistributionFn);
    certificateArn.grantRead(updateDistributionFn);

    certificateArn.grantWrite(addDomainFn);
    certificateArn.grantRead(addDomainFn);

    const distributionId = StringParameter.fromStringParameterAttributes(
      this,
      `${namePrefix}-cloudfront-distribution-id-param`,
      {
        parameterName: distributionIdParam,
      }
    );

    distributionId.grantRead(addDomainFn);
    distributionId.grantRead(updateDistributionFn);

    const distribution = Distribution.fromDistributionAttributes(
      this,
      `${namePrefix}-distribution`,
      {
        distributionId: distributionId.stringValue,
        domainName: Fn.select(0, domainList.stringListValue),
      }
    );

    distribution.grant(
      updateDistributionFn,
      "cloudfront:UpdateDistribution",
      "cloudfront:GetDistribution"
    );

    distribution.grant(addDomainFn, "cloudfront:GetDistribution");

    addDomainFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["acm:DescribeCertificate", "acm:RequestCertificate"],
        resources: [
          `arn:aws:acm:${Stack.of(this).region}:${
            Stack.of(this).account
          }:certificate/*`,
        ],
      })
    );

    addDomainFn.addToRolePolicy(
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

    const distributionResource = restApi.root.addResource("distribution");

    distributionResource.addMethod(
      "PATCH",
      new LambdaIntegration(updateDistributionFn),
      {
        apiKeyRequired: true,
      }
    );
  }
}
