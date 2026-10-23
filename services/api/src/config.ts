function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  keycloak: {
    issuer: required("KEYCLOAK_ISSUER"),
    jwksUrl: required("KEYCLOAK_JWKS_URL"),
    audience: required("KEYCLOAK_AUDIENCE"),
  },
  assistantUrl: required("ASSISTANT_URL"),
};
