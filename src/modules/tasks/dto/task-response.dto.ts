import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

export class TaskResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Unique identifier for the task' })
  id: string;

  @ApiProperty({ example: 'Complete project documentation', description: 'Title of the task' })
  title: string;

  @ApiProperty({ example: 'Add details about API endpoints and data models', description: 'Detailed description of the task' })
  description: string;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.PENDING, description: 'Current status of the task' })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.MEDIUM, description: 'Priority level of the task' })
  priority: TaskPriority;

  @ApiProperty({ example: '2023-12-31T23:59:59Z', description: 'Due date of the task' })
  dueDate: Date;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID who created the task' })
  userId: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Timestamp when the task was created' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Timestamp when the task was last updated' })
  updatedAt: Date;
}
