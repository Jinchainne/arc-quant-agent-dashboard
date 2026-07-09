const SECRET_PATTERNS = [
  /(sk-[a-z0-9]{16,})/gi,
  /(gsk_[a-z0-9]{16,})/gi,
  /(0x[a-f0-9]{64})/gi,
  /(bearer\s+[a-z0-9._-]{12,})/gi,
  /((?:seed|mnemonic|private key)\s*[:=]\s*[^\n]+)/gi
];

export function redactSecrets(input: string) {
  return SECRET_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, "[REDACTED_SECRET]"),
    input
  );
}
