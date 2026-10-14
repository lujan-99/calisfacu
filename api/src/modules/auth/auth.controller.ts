import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Publico, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.contrasena);
  }

  /** Token nuevo de 30 minutos para el usuario que sigue trabajando (US-17, criterio 4). */
  @ApiBearerAuth()
  @Post('renovar')
  @HttpCode(200)
  renovar(@UsuarioActual() usuario: UsuarioToken) {
    return this.auth.renovar(usuario.id);
  }
}
