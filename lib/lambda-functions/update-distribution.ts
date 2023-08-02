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
  try {
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

    if (!certificateArnParameter) {
      return badRequest("Missing required parameter: CERTIFICATE_ARN_PARAM");
    }

    const certificateArn = certificateArnParameter.Value?.split(",")[0];

    if (!certificateArn) {
      return badRequest("Missing required parameter: CERTIFICATE_ARN_PARAM");
    }

    const { Certificate: certificate } = await acmClient
      .describeCertificate({
        CertificateArn: certificateArn,
      })
      .promise();

    if (!certificate) {
      return badRequest("Certificate not found");
    }

    if (certificate.Status == "FAILED") {
      return badRequest(
        "Certificate creation failed. Please re-add a domain again to restart the process."
      );
    }

    if (certificate.Status != "ISSUED") {
      const pendingValidationDomains =
        certificate.DomainValidationOptions?.filter(
          (cert) => cert.ValidationStatus === "PENDING_VALIDATION"
        ).map((cert) => cert.DomainName);

      return badRequest({
        message:
          "Certificate not issued. Please check if customers already updated their own DNS infrastructure.",
        status: certificate.Status,
        reason: certificate.FailureReason,
        domains: pendingValidationDomains,
      });
    }

    distributionConfig.ViewerCertificate!.ACMCertificateArn = certificateArn;

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
  } catch ({ message }) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message,
      }),
    };
  }
};

const badRequest = (message: string | object) => ({
  statusCode: 400,
  body: JSON.stringify(
    typeof message == "object"
      ? message
      : {
          message,
        }
  ),
});
