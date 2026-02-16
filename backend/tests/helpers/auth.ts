/**
 * Shared test helper: log in via the API and return the JWT token.
 */
export async function login(client: any, email: string, password = 'password123'): Promise<string> {
  const response = await client.post('/api/auth/login').json({ email, password });
  response.assertStatus(200);
  return response.body().data.token as string;
}
