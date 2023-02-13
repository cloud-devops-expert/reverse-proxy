import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

interface CertificateStackProps extends StackProps {
  namePrefix: string;
  domainName: string;
}

export class CertificateStack extends Stack {
  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    const { namePrefix, domainName } = props;

    const certificate = new Certificate(this, `${namePrefix}-certificate`, {
      domainName: `*.${domainName}`,
    });

    new CfnOutput(this, "CertificateArn", {
      value: certificate.certificateArn,
    });
  }
}
