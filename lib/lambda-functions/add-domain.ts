import { APIGatewayEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import * as AWS from "aws-sdk";

const ssmClient = new AWS.SSM();

const paramName = process.env.DOMAIN_NAMES_PARAM as string;

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing body",
      }),
    };
  }

  console.log(event.body);

  const { domainName } = JSON.parse(event.body);

  console.log({ domainName });

  const { Parameter } = await ssmClient
    .getParameter({
      Name: paramName,
    })
    .promise();

  let parts = Parameter?.Value?.split(",");

  console.log({ parts });

  let newValue = "";

  if (parts) {
    if (parts.includes(domainName)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Domain already exists",
        }),
      };
    }

    newValue = [...parts, domainName].join(",");
  }

  await ssmClient
    .putParameter({
      Value: newValue,
      Name: paramName,
      Overwrite: true,
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Domain ${domainName} inserted.`,
    }),
  };
};
