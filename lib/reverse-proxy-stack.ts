import { Construct } from "constructs";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  Function,
  FunctionCode,
  FunctionEventType,
  OriginRequestPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { DnsValidatedCertificate } from "aws-cdk-lib/aws-certificatemanager";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";

interface ReverseProxyStackProps extends StackProps {
  namePrefix: string;
  domainName: string;
}

export class ReverseProxyStack extends Stack {
  constructor(scope: Construct, id: string, props: ReverseProxyStackProps) {
    super(scope, id, props);

    const { namePrefix, domainName } = props;

    const hostedZone = HostedZone.fromLookup(
      this,
      `${namePrefix}-${domainName}`,
      {
        domainName,
      }
    );

    const certificate = new DnsValidatedCertificate(
      this,
      `${namePrefix}-certificate`,
      {
        region: "us-east-1", // it must be this zone for use the certificate with CloudFormation
        hostedZone,
        domainName: `*.${domainName}`,
      }
    );

    const addSubdomainFn = new Function(this, `${namePrefix}-function`, {
      code: FunctionCode.fromFile({
        filePath: "lib/cloud-functions/add-subdomain.js",
      }),
    });

    const logBucket = new Bucket(this, `${namePrefix}-log-bucket`, {
      encryption: BucketEncryption.S3_MANAGED,
      intelligentTieringConfigurations: [
        {
          name: "default",
          archiveAccessTierTime: Duration.days(90),
          deepArchiveAccessTierTime: Duration.days(180),
        },
      ],
      versioned: true,
    });

    const distribution = new Distribution(
      this,
      `${namePrefix}-cloudfront-distribution`,
      {
        logBucket,
        domainNames: [`*.${domainName}`],
        certificate,
        defaultBehavior: {
          origin: new HttpOrigin("app.explority.com"),
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.AMPLIFY,
          originRequestPolicy:
            OriginRequestPolicy.ALL_VIEWER_AND_CLOUDFRONT_2022,
        },
        additionalBehaviors: {
          "/login": {
            origin: new HttpOrigin("app.explority.com"),
            allowedMethods: AllowedMethods.ALLOW_ALL,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            functionAssociations: [
              {
                function: addSubdomainFn,
                eventType: FunctionEventType.VIEWER_REQUEST,
              },
            ],
          },
          "/": {
            origin: new HttpOrigin("go.explority.com", {
              originPath: "/experience/id",
            }),
            allowedMethods: AllowedMethods.ALLOW_ALL,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            functionAssociations: [
              {
                function: addSubdomainFn,
                eventType: FunctionEventType.VIEWER_REQUEST,
              },
            ],
          },
        },
      }
    );

    new ARecord(this, `${namePrefix}-cf-arecord`, {
      zone: hostedZone,
      recordName: "*",
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
  }
}
