import "server-only";
export {
  setAuthCookies,
  clearAuthCookies,
  getAccessTokenFromCookies,
  getAuthenticatedUserFromCookies
} from "@/lib/server/auth";
