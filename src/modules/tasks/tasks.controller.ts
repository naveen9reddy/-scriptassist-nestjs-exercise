import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpException,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { AuthGuard } from '@nestjs/passport';
import { BatchTaskDto } from './dto/batch-task.dto';
import * as Types from 'src/types/pagination.interface';
import { HttpResponse } from 'src/types/http-response.interface';
import { Task } from './entities/task.entity';
import { RolesGuard } from '@common/guards/roles.guard';
import { Role } from './enums/roles.enum';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(AuthGuard('jwt'), RateLimitGuard,RolesGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RateLimit({limit:5, windowMs:60000})
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new task' })
  async create(@Body() createTaskDto: CreateTaskDto): Promise<HttpResponse<Task>> {
    try {
      const result = await this.tasksService.createTask(createTaskDto);
      return result; 
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'Failed to create task',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @RateLimit({ limit: 3, windowMs: 60000 })
  @ApiOperation({ summary: 'Find all tasks with optional filtering and pagination' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async findAll(
    @Query() query: Types.PaginationOptions & { status?: TaskStatus; priority?: TaskPriority }
  ): Promise<HttpResponse<Types.PaginatedResponse<Task>>> {
    try {
      return await this.tasksService.findAll(query); 
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'An error occurred while retrieving tasks.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  
  
  @RateLimit({ limit: 10, windowMs: 60000 }) 
  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  async getStats(): Promise<HttpResponse<any>> {
    try {
      return await this.tasksService.getStatistics();
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'An error occurred while retrieving task statistics.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  @RateLimit({limit:3, windowMs:60000})
  @ApiOperation({ summary: 'Find a task by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<HttpResponse<Task>> {
    try {
      return await this.tasksService.findOne(id);  
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'Task not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch(':id')
  @RateLimit({limit:5, windowMs:60000})
  @ApiOperation({ summary: 'Update a task' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<HttpResponse<Task>> {
    try {
      return await this.tasksService.update(id, updateTaskDto); 
      throw new HttpException(
        {
          success: false,
          error: 'Failed to update task',
        },
        HttpStatus.BAD_REQUEST,
      );
    }catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'Failed to update task',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @RateLimit({limit:5, windowMs:60000})
  @ApiOperation({ summary: 'Delete a task by ID' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<HttpResponse<void>> {
    try {
      return await this.tasksService.remove(id);  
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

  @Post('batch')
  @RateLimit({limit:3, windowMs:60000})
  @ApiOperation({ summary: 'Batch process multiple tasks' })
  async batchProcess(@Body() batchTaskDto: BatchTaskDto): Promise<HttpResponse<any>> {
    try {
      return await this.tasksService.batchProcess(batchTaskDto.tasks, batchTaskDto.action);  
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'Batch operation failed.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
