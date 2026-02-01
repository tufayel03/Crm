export const maskValue = (value: string, type: 'email' | 'phone', revealed: boolean) => {
  if (revealed) return value;
  if (!value) return '';
  if (type === 'email') {
    const [user, domain] = value.split('@');
    if (!domain) return value;
    return `${user.substring(0, 2)}***@${domain}`;
  }
  return value.substring(0, 5) + '***';
};
