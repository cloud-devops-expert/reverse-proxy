import { Context, ScheduledEvent } from "aws-lambda";
import * as AWS from "aws-sdk";

const ssmClient = new AWS.SSM();
const acmClient = new AWS.ACM();

const { CERTIFICATE_ARN_PARAM: certificateArnParamName } = process.env;

export const handler = async (event: ScheduledEvent, context: Context) => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  if (!certificateArnParamName) {
    throw new Error("Missing required parameter: CERTIFICATE_ARN_PARAM");
  }

  const { Parameter: certificateArnParam } = await ssmClient
    .getParameter({
      Name: certificateArnParamName,
    })
    .promise();

  let savedCertificateArns = certificateArnParam?.Value?.split(",");

  if (!savedCertificateArns) {
    console.log("No saved certificate arns found");

    return;
  }

  console.log({ savedCertificateArns });

  const { CertificateSummaryList: certificateList } = await acmClient
    .listCertificates({
      CertificateStatuses: ["FAILED", "VALIDATION_TIMED_OUT"],
    })
    .promise();

  const invalidCertificateArns = certificateList?.map(
    (cert) => cert.CertificateArn!
  );

  if (invalidCertificateArns) {
    for (const invalidCertificateArn of invalidCertificateArns) {
      try {
        await acmClient
          .deleteCertificate({
            CertificateArn: invalidCertificateArn,
          })
          .promise();
      } catch ({ message }) {
        console.log(
          `Ignored: Failed to delete certificate ${invalidCertificateArn} - ${message}`
        );
      }
    }

    savedCertificateArns = savedCertificateArns.filter(
      (arn) => !invalidCertificateArns.includes(arn)
    );
  }

  for (const certificateArn of savedCertificateArns) {
    try {
      await acmClient
        .describeCertificate({
          CertificateArn: certificateArn,
        })
        .promise();
    } catch (e) {
      console.log(
        `Certificate ${certificateArn} not found, removing from saved list`
      );

      savedCertificateArns = savedCertificateArns.filter(
        (arn) => arn !== certificateArn
      );
    }
  }

  await ssmClient
    .putParameter({
      Name: certificateArnParamName,
      Value: savedCertificateArns.join(","),
      Overwrite: true,
    })
    .promise();
};
