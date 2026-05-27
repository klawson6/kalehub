const keycloakUrl = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';

export async function createKeycloakUser(email: string, password: string): Promise<void> {
  const adminUser = process.env.KEYCLOAK_ADMIN ?? 'admin';
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';

  const tokenRes = await fetch(`${keycloakUrl}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: adminUser,
      password: adminPassword,
    }).toString(),
  });
  if (!tokenRes.ok) throw new Error(`Admin token request failed: ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const createRes = await fetch(`${keycloakUrl}/admin/realms/kalehub/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      email,
      username: email,
      firstName: 'E2E',
      lastName: 'User',
      emailVerified: true,
      enabled: true,
      credentials: [{ type: 'password', value: password, temporary: false }],
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Create Keycloak user failed: ${createRes.status} ${body}`);
  }
}
