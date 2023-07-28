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
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

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

    updateDistributionFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["acm:DescribeCertificate"],
        resources: [
          `arn:aws:acm:${Stack.of(this).region}:${
            Stack.of(this).account
          }:certificate/*`,
        ],
      })
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

    const cleanupCertificateFn = new NodejsFunction(
      this,
      `${namePrefix}-cleanup-fn`,
      {
        timeout: Duration.minutes(5),
        logRetention: RetentionDays.SIX_MONTHS,
        entry: "./lib/lambda-functions/clean-up-certificate.ts",
        environment: {
          CERTIFICATE_ARN_PARAM: certificateArnParam,
        },
      }
    );

    certificateArn.grantWrite(cleanupCertificateFn);
    certificateArn.grantRead(cleanupCertificateFn);

    cleanupCertificateFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["acm:DescribeCertificate", "acm:DeleteCertificate"],
        resources: [
          `arn:aws:acm:${Stack.of(this).region}:${
            Stack.of(this).account
          }:certificate/*`,
        ],
      })
    );

    cleanupCertificateFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["acm:ListCertificates"],
        resources: ["*"],
      })
    );

    new Rule(this, `${namePrefix}-rule`, {
      schedule: Schedule.rate(Duration.days(1)),
    }).addTarget(new LambdaFunction(cleanupCertificateFn));
  }
}
