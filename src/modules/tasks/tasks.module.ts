import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { CommonModule } from '@common/module/common.module';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({
      name: 'task-processing',
    }),
    CommonModule,
  ],
  controllers: [TasksController],
  providers: [TasksService,RateLimitGuard],
  exports: [TasksService,TypeOrmModule,],
})
export class TasksModule {} 