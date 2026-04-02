import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Retorna uma propriedade específica ou todo o objeto do usuário
    return data ? user?.[data] : user;
  },
);
