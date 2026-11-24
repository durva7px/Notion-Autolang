// AWS Lambda entry point. API Gateway (HTTP API) → this handler → the same
// Express app server.js runs locally. Lambda handler setting: `lambda.handler`.
//
// Memory doesn't survive cold starts or reach other instances, so sessions and
// block state live in DynamoDB. The function uses its own region (AWS_REGION).

import serverlessExpress from "@codegenie/serverless-express";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDynamoSessionStore } from "./services/dynamo-session-store.js";
import { createDynamoBlockStateStore } from "./services/dynamo-block-state-store.js";

/** Builds a handler from the given environment; tests pass a fake DynamoDB client. */
export function createLambdaHandler({ env = process.env, documentClient } = {}) {
  const config = loadConfig(env, {
    extraRequired: ["SESSIONS_TABLE", "BLOCK_STATES_TABLE"],
    // API Gateway is the one proxy in front, and it only serves HTTPS.
    defaults: { secureCookies: true, trustProxy: 1 }
  });
  documentClient ??= DynamoDBDocumentClient.from(new DynamoDBClient({}));

  const app = createApp({
    config,
    sessionStore: createDynamoSessionStore({ documentClient, tableName: env.SESSIONS_TABLE }),
    blockStates: createDynamoBlockStateStore({ documentClient, tableName: env.BLOCK_STATES_TABLE })
  });

  return serverlessExpress({ app });
}

// Built on the first request and reused while the instance stays warm.
let cachedHandler;

export async function handler(event, context) {
  cachedHandler ??= createLambdaHandler();
  return cachedHandler(event, context);
}
