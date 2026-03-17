// Database variables are always required
const dbRequired = [
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
  "GOOGLE_MAPS_API_KEY",
];

// NextAuth variables are only required at runtime, not during build
const runtimeRequired = [
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

export function getEnv(requireAuth = false) {
  const required = requireAuth ? [...dbRequired, ...runtimeRequired] : dbRequired;
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    dbHost: process.env.DB_HOST,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD || "",
    dbName: process.env.DB_NAME,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
