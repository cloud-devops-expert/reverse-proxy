import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const acmClient = new AWS.ACM();

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const domainName = event.pathParameters?.["domainName"];

  if (!domainName) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing domain name",
      }),
    };
  }

  const certificates = await acmClient
    .listCertificates({
      CertificateStatuses: ["ISSUED"],
    })
    .promise();

  const certificateArns = certificates.CertificateSummaryList?.map(
    (c) => c.CertificateArn
  );

  if (certificateArns) {
    for (const certificateArn of certificateArns) {
      const { Certificate } = await acmClient
        .describeCertificate({
          CertificateArn: certificateArn!,
        })
        .promise();

      if (
        Certificate?.SubjectAlternativeNames?.some(
          (subject) => subject === domainName
        )
      ) {
        const records = Certificate?.DomainValidationOptions?.find(
          (option) => option.DomainName === domainName
        );

        return {
          statusCode: 200,
          body: JSON.stringify({
            [domainName]: records?.ResourceRecord,
          }),
        };
      }
    }
  }

  return {
    statusCode: 404,
    body: JSON.stringify({
      message: `Certificate not found for domain name ${domainName}`,
    }),
  };
};
