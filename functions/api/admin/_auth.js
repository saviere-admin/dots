import { json } from '../_utils.js';

export async function withAdmin(context, handler) {
  const token = context.request.headers.get('x-admin-token');
  const HARDCODED_PASS = '9885679895P@$$79895w0rd1204002040';
  
  if (token !== HARDCODED_PASS) {
    return json({ ok: false, message: 'Unauthorized access.' }, 401);
  }
  
  return handler(token, context.env);
}