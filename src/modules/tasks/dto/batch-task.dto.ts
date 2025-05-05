import { IsArray, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchTaskDto {
  @ApiProperty({ type: [String], description: 'IDs of tasks to process' })
  @IsArray()
  @IsString({ each: true })
  tasks: string[];

  @ApiProperty({ enum: ['complete', 'delete'], description: 'Action to perform on tasks' })
  @IsEnum(['complete', 'delete'])
  action: 'complete' | 'delete';
}
