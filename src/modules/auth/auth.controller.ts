import { Body, Controller, Post, HttpCode, HttpStatus, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in, returns access token.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password.',
  })
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        data: result,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'Successfully registered, returns user details and access token.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g., email already exists).',
  })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'User registered successfully',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException('Email already exists');
    }
  }
}
