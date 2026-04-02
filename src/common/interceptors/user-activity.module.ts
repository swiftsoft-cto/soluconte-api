import { Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { UserActivityInterceptor } from './user-activity.interceptor';

const UserActivityInterceptorProvider: Provider = {
  provide: APP_INTERCEPTOR,
  useClass: UserActivityInterceptor,
};

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserActivityInterceptor, UserActivityInterceptorProvider],
})
export class UserActivityModule {}























