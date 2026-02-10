import bcrypt from 'bcryptjs';

const saltRounds = 10;

// Generate salt and hash
export const hashPassword = (password: string): string => {
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
};
