// src/modules/auth/utils/password.util.ts
import * as bcrypt from 'bcrypt';

export class Password {
  static async toHash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}