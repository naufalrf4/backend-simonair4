import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  setRefreshToken(res: Response, token: string) {
    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + 7); 

    res.cookie('refresh_token', token, {
      httpOnly: true,
      expires: expiresIn,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
    });
  }

  clearRefreshToken(res: Response) {
    res.clearCookie('refresh_token');
  }
}