import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { TaskFilterDto } from './dto/task-filter.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,

    @InjectQueue('task-processing')
    private taskQueue: Queue,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    try {
      const task = this.tasksRepository.create(createTaskDto);
      const savedTask = await this.tasksRepository.save(task);

      await this.taskQueue.add('task-status-update', {
        taskId: savedTask.id,
        status: savedTask.status,
      });

      return savedTask;
    } catch (error) {
      throw new BadRequestException('Failed to create task');
    }
  }

  async findAll(filter: TaskFilterDto): Promise<{ data: Task[]; total: number }> {
    const { status, priority, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tasksRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.user', 'user')
      .skip(skip)
      .take(limit);

    if (status) queryBuilder.andWhere('task.status = :status', { status });
    if (priority) queryBuilder.andWhere('task.priority = :priority', { priority });

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async getStatistics() {
    // Efficient approach: Using SQL aggregation to count tasks directly
    const [totalTasks, completedTasks, inProgressTasks, pendingTasks, highPriorityTasks] = await Promise.all([
      this.tasksRepository.count(), // Total tasks
      this.tasksRepository.count({ where: { status: TaskStatus.COMPLETED } }), // Completed tasks
      this.tasksRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }), // In progress tasks
      this.tasksRepository.count({ where: { status: TaskStatus.PENDING } }), // Pending tasks
      this.tasksRepository.count({ where: { priority: TaskPriority.HIGH } }), // High priority tasks
    ]);

    return {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      pending: pendingTasks,
      highPriority: highPriorityTasks,
    };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    const originalStatus = task.status;

    Object.assign(task, updateTaskDto);
    const updatedTask = await this.tasksRepository.save(task);

    if (originalStatus !== updatedTask.status) {
      try {
        await this.taskQueue.add('task-status-update', {
          taskId: updatedTask.id,
          status: updatedTask.status,
        });
      } catch (err) {
        // Optional: log failure to queue
      }
    }

    return updatedTask;
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    await this.tasksRepository.remove(task);
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    return this.tasksRepository.find({ where: { status } });
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.findOne(id);
    task.status = status;
    return this.tasksRepository.save(task);
  }


  // async batchProcess(taskIds: string[], action: 'complete' | 'delete') {
  //   if (action === 'complete') {
  //     // Efficient bulk update for 'complete' action
  //     const result = await this.tasksRepository
  //       .createQueryBuilder()
  //       .update(Task)
  //       .set({ status: TaskStatus.COMPLETED })
  //       .where("id IN (:...taskIds)", { taskIds })
  //       .execute();

  //     return result;
  //   } else if (action === 'delete') {
  //     // Efficient bulk delete for 'delete' action
  //     const result = await this.tasksRepository
  //       .createQueryBuilder()
  //       .delete()
  //       .where("id IN (:...taskIds)", { taskIds })
  //       .execute();

  //     return result;
  //   } else {
  //     throw new Error(`Unknown action: ${action}`);
  //   }
  // }
  async batchUpdateStatus(taskIds: string[], status: TaskStatus): Promise<number> {
    const updateResult = await this.tasksRepository
      .createQueryBuilder()
      .update(Task)
      .set({ status })
      .whereInIds(taskIds)
      .execute();
  
    return updateResult.affected || 0;
  }
  async batchDelete(taskIds: string[]): Promise<number> {
    const deleteResult = await this.tasksRepository
      .createQueryBuilder()
      .delete()
      .from(Task)
      .whereInIds(taskIds)
      .execute();
  
    return deleteResult.affected || 0;
  }
    
  // tasks.service.ts

async batchProcess(taskIds: string[], action: 'complete' | 'delete') {
  const tasks = await this.tasksRepository.findByIds(taskIds); // NOTE: This avoids N+1 query problem

  const results = [];
  const existingIds = new Set(tasks.map(t => t.id));

  for (const taskId of taskIds) {
    if (!existingIds.has(taskId)) {
      results.push({ taskId, success: false, error: 'Task not found' });
      continue;
    }

    try {
      let result;

      if (action === 'complete') {
        result = await this.tasksRepository.update(taskId, { status: TaskStatus.COMPLETED });
      } else if (action === 'delete') {
        result = await this.tasksRepository.delete(taskId);
      }

      results.push({ taskId, success: true, result });
    } catch (error) {
      results.push({
        taskId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}


}
