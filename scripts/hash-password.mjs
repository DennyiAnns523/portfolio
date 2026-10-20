// Prints an ADMIN_PASSWORD_HASH for .env. The password is read from a hidden prompt
// (or stdin when piped), so it never lands in shell history.
// Must match src/lib/server/password.ts.
import { randomBytes, scrypt } from 'node:crypto';
import { createInterface } from 'node:readline';

const N = 2 ** 15, r = 8, p = 1, KEY_LENGTH = 64;

async function readPassword() {
  if (!process.stdin.isTTY) {
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    return data.replace(/\r?\n$/, '');
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (s) => { if (s.includes('Admin password')) process.stdout.write(s); };
  const answer = await new Promise((resolve) => rl.question('Admin password (min 12 chars): ', resolve));
  rl.close();
  process.stdout.write('\n');
  return answer;
}

const password = await readPassword();
if (password.length < 12) {
  console.error('Use a password of at least 12 characters.');
  process.exit(1);
}
const salt = randomBytes(16);
const key = await new Promise((resolve, reject) =>
  scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, { N, r, p, maxmem: 256 * N * r }, (e, k) => (e ? reject(e) : resolve(k))),
);
console.log(`ADMIN_PASSWORD_HASH=${['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join(':')}`);
