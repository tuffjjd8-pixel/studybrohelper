export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
];

export function isValidEmailDomain(email: string): boolean {
  const emailRegex = /^[^\s@]+@([^\s@]+)$/;
  const match = email.toLowerCase().trim().match(emailRegex);
  
  if (!match) return false;
  
  const domain = match[1];
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function getEmailDomainError(email: string): string | null {
  const emailRegex = /^[^\s@]+@([^\s@]+)$/;
  const match = email.toLowerCase().trim().match(emailRegex);
  
  if (!match) {
    return "Invalid email format";
  }
  
  const domain = match[1];
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return `Please use an email from: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`;
  }
  
  return null;
}
