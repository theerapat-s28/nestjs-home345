// Create utils function here

export function validatePassword(password: string): boolean {
  const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_\-+=\[{\]};:'",.<>/?\\|`~]).+$/;
  return regex.test(password);
}
