import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Le decimos que el token vendrá en la cabecera (Header) como un Bearer Token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // IMPORTANTE: Debe ser EXACTAMENTE la misma clave que pusimos en auth.module.ts, la real se guarda en render
      secretOrKey: process.env.JWT_SECRET || 'mi_clave_secreta_super_segura_ecowatt',
    });
  }

  // Si el token es válido, NestJS ejecutará esta función y guardará al usuario en la Request
  async validate(payload: any) {
    return { id: payload.sub, email: payload.email };
  }
}