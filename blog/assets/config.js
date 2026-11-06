export const config = {
  tenantId: "cbde7f64-df4e-45f5-80c4-ca6689b6afa9",
  clientId: "af0b115a-5daa-4574-ad66-a36209418fa0",
  apiBaseUrl: "https://blog-api.dvigezzi.com",
  redirectUri: "https://dvigezzi.com/blog/admin/",
  postLogoutRedirectUri: "https://dvigezzi.com/",
};

export const apiScope = `api://${config.clientId}/blog.access`;
export const isConfigured = ![
  config.tenantId,
  config.clientId,
  config.apiBaseUrl,
].some(value => value.includes("YOUR_"));
