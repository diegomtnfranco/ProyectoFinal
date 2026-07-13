import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';

/**
 * Decorador para obtener el usuario autenticado actual
 * Uso: @CurrentUser() user o @CurrentUser('id') userId
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new InternalServerErrorException('No se pudo obtener el usuario autenticado (request).');

    return data ? user[data] : user;
  },
);