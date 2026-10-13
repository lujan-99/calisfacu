import { Controller, Get } from '@nestjs/common';
import { Publico } from '../../common/decoradores';

/** Usado por el smoke test (scripts/smoke.sh) y por el monitor de disponibilidad (M13). */
@Controller('salud')
export class SaludController {
  @Publico()
  @Get()
  estado() {
    return {
      estado: 'ok',
      version: process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT ?? 'local',
      fecha: new Date().toISOString(),
    };
  }
}
