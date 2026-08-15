/**
 * The client chooses the Blob pathname it uploads to, so it can never be
 * trusted for authorization on its own — every route that accepts one
 * (upload/authorize, finalize) must independently confirm it falls under
 * the *session's own* server-derived user id before doing anything with it.
 */
export function isOwnUploadPathname(pathname: string, userId: string): boolean {
  const expectedPrefix = `resumes/${userId}/`;
  return pathname.startsWith(expectedPrefix) && pathname.length > expectedPrefix.length;
}
