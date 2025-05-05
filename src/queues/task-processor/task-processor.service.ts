import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TasksService } from '../../modules/tasks/tasks.service';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';
import { CustomError } from 'src/common/errors/custom-error'; 

@Injectable()
@Processor('task-processing')
export class TaskProcessorService extends WorkerHost {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(private readonly tasksService: TasksService) {
    super();
  }

  /**
   * Main job processing handler.
   * Handles job types like task-status-update and overdue-tasks-notification.
   * @param job Job to process
   * @returns Result of the job processing
   */
  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'task-status-update':
          return await this.handleStatusUpdate(job);
        case 'overdue-tasks-notification':
          return await this.handleOverdueTasks(job);
          case 'process-overdue-task':
            return await this.handleProcessOverdueTask(job);
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          throw new CustomError('Unknown job type');
      }
    } catch (error) {
      this.handleError(job, error);
      throw error;
    }
  }

  /**
   * Handles status updates for a specific task.
   * @param job Job containing taskId and status to update
   * @returns The updated task status
   */
  private async handleStatusUpdate(job: Job) {
    const { taskId, status } = job.data;

    if (!taskId || !status) {
      throw new CustomError('Missing required data for status update');
    }

    if (!Object.values(TaskStatus).includes(status)) {
      throw new CustomError('Invalid task status');
    }

    try {
      const task = await this.tasksService.updateStatus(taskId, status);
      return { success: true, taskId: task.data?.id, newStatus: task.data?.status };
    } catch (error) {
      this.logger.error(`Error updating task status for taskId ${taskId}`);
      throw new CustomError('Error updating task status');
    }
  }

  /**
   * Handles overdue tasks notifications.
   * Supports batching for processing large datasets efficiently.
   * @param job Job containing overdue task data
   * @returns Success message
   */
  private async handleOverdueTasks(job: Job) {
    const { overdueTasks } = job.data;

    if (!overdueTasks || !Array.isArray(overdueTasks) || overdueTasks.length === 0) {
      throw new CustomError('No overdue tasks to process');
    }

    // Batch processing for large datasets
    const batchSize = 50; // Define a batch size (adjust based on expected task size)
    const batches = this.chunkTasks(overdueTasks, batchSize);

    try {
      for (const batch of batches) {
        await this.processBatch(batch); 
        this.logger.debug(`Processed batch of ${batch.length} overdue tasks`);
      }
      return { success: true, message: 'Overdue tasks processed successfully' };
    } catch (error) {
      this.logger.error('Error processing overdue tasks', error);
      throw new CustomError('Error processing overdue tasks');
    }
  }

  private async handleProcessOverdueTask(job: Job) {
    const { taskId } = job.data;
    this.logger.debug(`Handling process-overdue-task for taskId: ${taskId}`);
  
    if (!taskId) {
      return { success: false, error: 'Missing taskId' };
    }
  
    try {
      const updatedTask = await this.tasksService.updateStatus(taskId, TaskStatus.IN_PROGRESS);
  
      return {
        success: true,
        taskId: updatedTask.data?.id,
        newStatus: updatedTask.data?.status,
      };
    } catch (error) {
      this.logger.error(`Failed to process overdue task: ${taskId}`, error);
      return { success: false, error: 'Failed to process overdue task' };
    }
  }
  

  /**
   * Splits tasks into smaller batches for processing.
   * @param tasks List of overdue tasks
   * @param batchSize Size of each batch
   * @returns List of batches
   */
  private chunkTasks(tasks: any[], batchSize: number) {
    const batches = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
      batches.push(tasks.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Processes a batch of overdue tasks.
   * Can be further optimized for each task type in the batch.
   * @param batch Batch of overdue tasks
   */
  private async processBatch(batch: any[]) {
    for (const task of batch) {
      this.logger.debug(`Processing overdue task with ID: ${task.id}`);
    }
  }

  /**
   * Custom error handling for failed jobs.
   * @param job Job that failed
   * @param error Error that occurred
   */
  private handleError(job: Job, error: any) {
    this.logger.error(`Error processing job ${job.id}: ${error.message || error}`);
    
    if (error instanceof CustomError) {
      this.logger.debug('Retrying failed job...');
      job.retry();
    }
  }

}
