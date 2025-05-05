import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
import { PaginatedResponse, PaginationOptions } from 'src/types/pagination.interface';
import { BatchOperationResult, HttpResponse } from 'src/types/http-response.interface';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,

    @InjectQueue('task-processing')
    private taskQueue: Queue,
  ) {}

  async createTask(createTaskDto: CreateTaskDto): Promise<HttpResponse<Task>> {
    try {
      const task = this.tasksRepository.create(createTaskDto);
      const savedTask = await this.tasksRepository.save(task);
      return {
        success: true,
        data: savedTask,
        message: 'Task created successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        error: 'Failed to create task',
      });
    }
  }

  async findAll(
    options: PaginationOptions & { status?: TaskStatus; priority?: TaskPriority }
  ): Promise<HttpResponse<PaginatedResponse<Task>>> {
    try {
      const { status, priority, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = options;
      const skip = (page - 1) * limit;
  
      const queryBuilder = this.tasksRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.user', 'user')
        .skip(skip)
        .take(limit)
        .orderBy(`task.${sortBy}`, sortOrder as any);
  
      if (status) queryBuilder.andWhere('task.status = :status', { status });
      if (priority) queryBuilder.andWhere('task.priority = :priority', { priority });
  
      const [data, total] = await queryBuilder.getManyAndCount();
  
      const paginatedResponse: PaginatedResponse<Task> = {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
  
      return {
        success: true,
        data: paginatedResponse,
        message: 'Tasks retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        error: 'An error occurred while retrieving tasks.',
      });
    }
  }

  async getStatistics(): Promise<HttpResponse<any>> {
    try {
      const [totalTasks, completedTasks, inProgressTasks, pendingTasks, highPriorityTasks] = await Promise.all([
        this.tasksRepository.count(),
        this.tasksRepository.count({ where: { status: TaskStatus.COMPLETED } }), 
        this.tasksRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
        this.tasksRepository.count({ where: { status: TaskStatus.PENDING } }), 
        this.tasksRepository.count({ where: { priority: TaskPriority.HIGH } }), 
      ]);
  
      return {
        success: true,
        data: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          pending: pendingTasks,
          highPriority: highPriorityTasks,
        },
        message: 'Task statistics retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        error: 'Failed to retrieve task statistics',
      });
    }
  }

  async findOne(id: string): Promise<HttpResponse<Task>> {
    try {
      const task = await this.tasksRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      return {
        success: true,
        data: task,
        message: 'Task retrieved successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; 
      }
      throw new BadRequestException({
        success: false,
        error: 'Failed to retrieve task',
      });
    }
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<HttpResponse<Task>> {
    try {
      const task = await this.tasksRepository.findOne({
        where: { id }, 
      });
      
      if (!task) {
        throw new NotFoundException('Task not found');
      }

      Object.assign(task, updateTaskDto);
      const updatedTask = await this.tasksRepository.save(task);
      
      return {
        success: true,
        data: updatedTask,
        message: 'Task updated successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; 
      }
      throw new BadRequestException({
        success: false,
        error: 'Failed to update task',
      });
    }
  }

  async remove(id: string): Promise<HttpResponse<void>> {
    try {
      const taskResponse = await this.findOne(id); 
    
      if (!taskResponse.data) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
      
      const task = taskResponse.data;  
    
      await this.tasksRepository.remove(task); 
    
      return {
        success: true,
        message: 'Task deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'An error occurred while deleting the task.',
        },
        HttpStatus.BAD_REQUEST, 
      );
    }
  }
  

  async updateStatus(id: string, status: TaskStatus): Promise<HttpResponse<Task>> {
    try {
      const taskResponse = await this.findOne(id); 
      
      if (!taskResponse.data) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
  
      const task = taskResponse.data;  
  
      task.status = status;  
      
      const updatedTask = await this.tasksRepository.save(task);  
  
      return {
        success: true,
        data: updatedTask,
        message: 'Task status updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'An error occurred while updating the task status.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  

  async batchProcess(taskIds: string[], action: 'complete' | 'delete'): Promise<HttpResponse<BatchOperationResult>> {
    try {
      const tasks = await this.tasksRepository.findBy({
        id: In(taskIds),
      });
    
      const existingIds = tasks.map(t => t.id);
      const notFound = taskIds.filter(id => !existingIds.includes(id));
    
      const batchOperationResult: BatchOperationResult = {
        successCount: existingIds.length,
        failedCount: notFound.length,
        failedIds: notFound,
      };
    
      if (action === 'complete') {
        await this.tasksRepository
          .createQueryBuilder()
          .update()
          .set({ status: TaskStatus.COMPLETED })
          .whereInIds(existingIds)
          .execute();
      } else if (action === 'delete') {
        await this.tasksRepository
          .createQueryBuilder()
          .delete()
          .whereInIds(existingIds)
          .execute();
      }
    
      return {
        success: true,
        data: batchOperationResult,
        message: `${action} operation executed successfully.`,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        error: 'Batch process failed',
      });
    }
  }

}
