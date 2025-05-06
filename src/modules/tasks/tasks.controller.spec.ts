import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { BatchTaskDto } from './dto/batch-task.dto';
import { Task } from './entities/task.entity';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { User } from '@modules/users/entities/user.entity';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;


  const mockUser = new User();
  mockUser.id = 'user-id';
  mockUser.email = 'user@example.com';
  mockUser.role = 'user';
  mockUser.password = 'hashed-password';
  mockUser.createdAt = new Date();
  mockUser.updatedAt = new Date();
  
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test',
    status: TaskStatus.PENDING,   
    priority: TaskPriority.MEDIUM,  
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,  
    dueDate: new Date(),  
    userId: 'user-id',
  };
  

  const mockTasksService = {
    createTask: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    batchProcess: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: mockTasksService }],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  describe('create', () => {
    it('should create and return a task', async () => {
        mockTasksService.createTask.mockResolvedValue({ success: true, data: mockTask });
        
        const dto: CreateTaskDto = {
          title: 'Test', 
          description: 'Test', 
          priority: TaskPriority.MEDIUM, 
          userId: 'user-id'  // Add the userId here to satisfy the CreateTaskDto
        };
        
        expect(await controller.create(dto)).toEqual({ success: true, data: mockTask });
      });
      

    it('should throw HttpException on service error', async () => {
      mockTasksService.createTask.mockRejectedValue(new Error('DB Error'));
      await expect(controller.create({} as any)).rejects.toThrow(HttpException);
    });
  });

  describe('findAll', () => {
    it('should return tasks list', async () => {
      mockTasksService.findAll.mockResolvedValue({ success: true, data: [mockTask] });
      expect(await controller.findAll({})).toEqual({ success: true, data: [mockTask] });
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      mockTasksService.getStatistics.mockResolvedValue({ success: true, data: {} });
      expect(await controller.getStats()).toEqual({ success: true, data: {} });
    });
  });

  describe('findOne', () => {
    it('should return a task by ID', async () => {
      mockTasksService.findOne.mockResolvedValue({ success: true, data: mockTask });
      expect(await controller.findOne('1')).toEqual({ success: true, data: mockTask });
    });

    it('should throw NOT_FOUND if task not found', async () => {
        mockTasksService.findOne.mockRejectedValue(new Error('Not found'));
        await expect(controller.findOne('1')).rejects.toThrow(HttpException);
      });
  });

  describe('update', () => {
    it('should update and return task', async () => {
      mockTasksService.update.mockResolvedValue({ success: true, data: mockTask });
      expect(await controller.update('1', {} as UpdateTaskDto)).toEqual({ success: true, data: mockTask });
    });

    it('should throw BAD_REQUEST on failure', async () => {
      mockTasksService.update.mockRejectedValue(new Error('Update failed'));
      await expect(controller.update('1', {} as any)).rejects.toThrow(HttpException);
    });
  });

  describe('remove', () => {
    it('should delete the task', async () => {
      mockTasksService.remove.mockResolvedValue({ success: true });
      expect(await controller.remove('1')).toEqual({ success: true });
    });

    it('should handle deletion error', async () => {
      mockTasksService.remove.mockRejectedValue(new Error('Delete error'));
      await expect(controller.remove('1')).rejects.toThrow(HttpException);
    });
  });

  describe('batchProcess', () => {
    it('should handle batch operation', async () => {
      const dto: BatchTaskDto = { action: 'delete', tasks: ['1'] };
      mockTasksService.batchProcess.mockResolvedValue({ success: true });
      expect(await controller.batchProcess(dto)).toEqual({ success: true });
    });

    it('should handle batch operation errors', async () => {
      mockTasksService.batchProcess.mockRejectedValue(new Error('Batch error'));
      await expect(controller.batchProcess({} as BatchTaskDto)).rejects.toThrow(HttpException);
    });
  });
});
