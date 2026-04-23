import { PrivyClient } from "@privy-io/node";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

if (!appId) {
  throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID");
}

if (!appSecret) {
  throw new Error("Missing PRIVY_APP_SECRET");
}

export const privyServer = new PrivyClient({
  appId,
  appSecret,
});