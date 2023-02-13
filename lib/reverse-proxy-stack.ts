import { Construct } from "constructs";
import {
  AllowedMethods,
  Distribution,
  Function,
  FunctionCode,
  FunctionEventType,
  OriginRequestPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { CfnParameter, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";

interface ReverseProxyStackProps extends StackProps {
  namePrefix: string;
  domainName: string;
}

export class ReverseProxyStack extends Stack {
  constructor(scope: Construct, id: string, props: ReverseProxyStackProps) {
    super(scope, id, props);

    const { namePrefix, domainName } = props;

    const certificateArn = new CfnParameter(this, "CertificateArn", {});

    const certificate = Certificate.fromCertificateArn(
      this,
      `${namePrefix}-${domainName}-cert`,
      certificateArn.valueAsString
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
          "/experience": {
            origin: new HttpOrigin("go.explority.com"),
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
  }
}
