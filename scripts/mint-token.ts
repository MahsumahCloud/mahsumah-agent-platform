import "@/db/env";
import { signUserToken } from "@/lib/tenancy/user-token";

const [productId, apiKey, tenantId, userId, role = "customer", ttl = "900"] = process.argv.slice(2);
if (!productId || !apiKey || !tenantId || !userId) {
  console.error("usage: npm run token -- <productId> <mak_apiKey> <tenantId> <userId> [role] [ttlSeconds]");
  process.exit(1);
}
console.log(signUserToken({ productId, tenantId, userId, role, ttlSeconds: Number(ttl) }, apiKey));
