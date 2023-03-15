import { CfnParameter, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { StringListParameter } from "aws-cdk-lib/aws-ssm";

interface DomainNamesStackProps extends StackProps {
  namePrefix: string;
}

export class DomainNamesStack extends Stack {
  constructor(scope: Construct, id: string, props: DomainNamesStackProps) {
    super(scope, id, props);

    const { namePrefix } = props;

    const initialDomainNamesParam = new CfnParameter(
      this,
      `${namePrefix}-domain-names-initial-values`,
      {
        description: "Comma-separated list of initial domain names",
      }
    );

    new StringListParameter(this, `${namePrefix}-domain-names-param`, {
      parameterName: `/${namePrefix}/domains/list`,
      stringListValue: initialDomainNamesParam.valueAsString.split(","),
    });
  }
}
