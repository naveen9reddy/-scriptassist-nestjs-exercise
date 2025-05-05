import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Task } from '../../modules/tasks/entities/task.entity';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';
import { CustomError } from 'src/common/errors/custom-error';

@Injectable()
export class OverdueTasksService {
  private readonly logger = new Logger(OverdueTasksService.name);

  constructor(
    @InjectQueue('task-processing')
    private taskQueue: Queue,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  /**
   * This method runs every hour and checks for overdue tasks.
   * - Finds overdue tasks (due date is in the past).
   * - Adds them to the processing queue.
   * - Logs the number of overdue tasks found.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks() {
    this.logger.debug('Checking for overdue tasks...');

    try {
      const now = new Date();

      const overdueTasks = await this.tasksRepository.find({
        where: {
          dueDate: LessThan(now), 
          status: TaskStatus.PENDING, 
        },
      });

      if (overdueTasks.length === 0) {
        this.logger.log('No overdue tasks found.');
        return;
      }

      this.logger.log(`Found ${overdueTasks.length} overdue tasks.`);

      const batchSize = 10; // Adjust batch size depending on your system's limits
      for (let i = 0; i < overdueTasks.length; i += batchSize) {
        const batch = overdueTasks.slice(i, i + batchSize);
        
        
        await Promise.all(
          batch.map((task) =>
            this.taskQueue.add('process-overdue-task', { taskId: task.id })
          ),
        );
      }

      this.logger.debug('Overdue tasks check completed.');
    } catch (error) {
      this.logger.error('Error checking overdue tasks:', error);
      throw new CustomError('Error checking overdue tasks.');
    }
  }
}
