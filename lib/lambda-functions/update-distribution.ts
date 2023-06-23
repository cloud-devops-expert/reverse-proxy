import { APIGatewayEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import * as AWS from "aws-sdk";

const ssmClient = new AWS.SSM();
const acmClient = new AWS.ACM();
const cfClient = new AWS.CloudFront();

const {
  DOMAIN_NAMES_PARAM: domainNamesParamName,
  CERTIFICATE_ARN_PARAM: certificateArnParamName,
  CLOUDFRONT_DISTRIBUTION_ID_PARAM: cloudfrontDistributionIdParamName,
} = process.env;

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

  const { Parameter: parameter } = await ssmClient
    .getParameter({
      Name: cloudfrontDistributionIdParamName,
    })
    .promise();

  if (!parameter) {
    return badRequest(
      "Missing required parameter: CLOUDFRONT_DISTRIBUTION_ID_PARAM"
    );
  }

  const { ETag: etag, Distribution: distribution } = await cfClient
    .getDistribution({ Id: parameter.Value! })
    .promise();

  if (!distribution) {
    return badRequest("Cloudfront distribution not found");
  }

  const distributionConfig = distribution?.DistributionConfig;

  const { Parameter: certificateArnParameter } = await ssmClient
    .getParameter({
      Name: certificateArnParamName,
    })
    .promise();

  distributionConfig.ViewerCertificate!.ACMCertificateArn =
    certificateArnParameter?.Value?.split(",")[0];

  const { Parameter } = await ssmClient
    .getParameter({
      Name: domainNamesParamName,
    })
    .promise();

  const items = Parameter?.Value?.split(",");

  distributionConfig.Aliases!.Items = items;
  distributionConfig.Aliases!.Quantity = items!.length;

  await cfClient
    .updateDistribution({
      Id: distribution.Id,
      IfMatch: etag,
      DistributionConfig: distributionConfig,
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Distribution ${distribution?.Id} updated.`,
    }),
  };
};

const badRequest = (message: string) => ({
  statusCode: 400,
  body: JSON.stringify({
    message,
  }),
});
