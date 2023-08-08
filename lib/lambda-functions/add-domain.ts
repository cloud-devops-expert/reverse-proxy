import { APIGatewayEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { ResourceRecord } from "aws-sdk/clients/acm";

const ssmClient = new AWS.SSM();
const acmClient = new AWS.ACM();
const cfClient = new AWS.CloudFront();

const {
  DOMAIN_NAMES_PARAM: domainNamesParamName,
  CERTIFICATE_ARN_PARAM: certificateArnParamName,
  CLOUDFRONT_DISTRIBUTION_ID_PARAM: cloudfrontDistributionIdParamName,
} = process.env;

const createRecord = (
  resourceRecord: ResourceRecord | undefined,
  domainName: string
) => {
  if (!resourceRecord) return;

  const hostName = resourceRecord.Name.replace(
    domainName.replace("*.", ""),
    ""
  ).replace(/\.+$/, "");
  const data = resourceRecord.Value.replace(/\.$/, "");

  return { hostName, type: "CNAME", data };
};

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  if (!domainNamesParamName) {
    return badRequest("Missing required parameter: DOMAIN_NAMES_PARAM");
  }

  if (!certificateArnParamName) {
    return badRequest("Missing required parameter: CERTIFICATE_ARN_PARAM");
  }

  if (!cloudfrontDistributionIdParamName) {
    return badRequest(
      "Missing required parameter: CLOUDFRONT_DISTRIBUTION_ID_PARAM"
    );
  }

  const httpMethod = event.httpMethod;

  let domainName = "";

  if (httpMethod !== "GET") {
    if (!event.body) {
      return badRequest("Missing body");
    }

    ({ domainName } = JSON.parse(event.body));
  }

  const { Parameter } = await ssmClient
    .getParameter({
      Name: domainNamesParamName,
    })
    .promise();

  const parts = Parameter?.Value?.split(",");

  if (!parts) {
    return badRequest("Invalid parameter value");
  }

  console.log({ parts });

  if (httpMethod == "GET") {
    return ok({
      domains: parts,
    });
  }

  let domainList: string[];

  if (httpMethod == "POST") {
    domainList = [...new Set([...parts, domainName])];
  } else {
    domainList = [...new Set([...parts.filter((p) => p !== domainName)])];
  }

  console.log({ domainList });

  await ssmClient
    .putParameter({
      Value: domainList.join(","),
      Name: domainNamesParamName,
      Overwrite: true,
    })
    .promise();

  const { CertificateArn: certificateArn } = await acmClient
    .requestCertificate({
      DomainName: domainList[0],
      SubjectAlternativeNames: domainList,
      ValidationMethod: "DNS",
    })
    .promise();

  if (!certificateArn) {
    return badRequest("Failed to create certificate");
  }

  const { Parameter: certificateArnParam } = await ssmClient
    .getParameter({
      Name: certificateArnParamName,
    })
    .promise();

  await ssmClient
    .putParameter({
      Value: [
        ...new Set([
          certificateArn,
          ...(certificateArnParam?.Value?.split(",") ?? []),
        ]),
      ].join(","),
      Name: certificateArnParamName,
      Overwrite: true,
    })
    .promise();

  if (httpMethod == "DELETE") {
    return ok({
      message: `${domainName} was deleted.`,
    });
  }

  let certificate;
  let tries = 0;

  do {
    await sleep(1_000);

    const { Certificate } = await acmClient
      .describeCertificate({
        CertificateArn: certificateArn!,
      })
      .promise();

    certificate = Certificate;

    console.log("tries", ++tries);
  } while (
    certificate?.DomainValidationOptions?.some(
      (value) => value.ValidationMethod === "EMAIL"
    )
  );

  const { Parameter: parameter } = await ssmClient
    .getParameter({
      Name: cloudfrontDistributionIdParamName,
    })
    .promise();

  const { Distribution: distribution } = await cfClient
    .getDistribution({ Id: parameter?.Value! })
    .promise();

  let record;
  tries = 0;

  do {
    await sleep(1_000);

    record = certificate?.DomainValidationOptions?.find(
      (option) => option.DomainName === domainName
    );

    console.log("DomainValidationOptions - tries", ++tries);
  } while (
    record?.ValidationStatus === "PENDING_VALIDATION" &&
    !record?.ResourceRecord
  );

  console.log(JSON.stringify(record));

  const resourceRecord = record?.ResourceRecord;

  return ok({
    [domainName]: [
      createRecord(resourceRecord, domainName),
      { hostName: "", type: "CNAME", data: distribution?.DomainName },
    ].filter(Boolean),
  });
};

const ok = (message: object) => ({
  statusCode: 200,
  body: JSON.stringify(message),
});

const badRequest = (message: string) => ({
  statusCode: 400,
  body: JSON.stringify({
    message,
  }),
});

const conflict = (message: string) => ({
  statusCode: 409,
  body: JSON.stringify({
    message,
  }),
});

const sleep = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));
