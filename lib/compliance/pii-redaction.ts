export function redactPII(data: any, fieldsToRedact: string[]): any {
  const redacted = { ...data };
  fieldsToRedact.forEach(field => {
    if (redacted[field]) {
      const value = String(redacted[field]);
      redacted[field] = value.length > 4 ? value.substring(0, 2) + '***' + value.substring(value.length - 2) : '****';
    }
  });
  return redacted;
}
