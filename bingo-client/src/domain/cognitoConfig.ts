import { CognitoUserPool } from "amazon-cognito-identity-js";

const poolData = {
  UserPoolId: "ap-northeast-1_3KXuF3PFo",
  ClientId: "30ibgvm2osej49f2ds43go4143",
};

export const userPool = new CognitoUserPool(poolData);
