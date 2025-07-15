import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/guards/roles-guard';
import { Roles } from '@/core/auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { UserQueryDto } from './dto/user-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { UserDetailResponseDto } from './dto/user-detail-response.dto';
import { UsersListResponseDto } from './dto/users-list-response.dto';
import { UpdateUserResponseDto } from './dto/update-user-response.dto';
import { DeleteUserResponseDto } from './dto/delete-user-response.dto';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto';
import { UserErrorResponseDto } from './dto/error-response.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(CacheInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new user', description: 'Creates a new user (Admin/Superuser only)' })
  @ApiBody({
    type: CreateUserDto,
    description: 'User creation data',
    examples: {
      validExample: {
        summary: 'Valid User Creation Example',
        value: {
          email: 'newuser@example.com',
          password: 'StrongPassword123!',
          full_name: 'New User',
          role: 'user',
          email_verified: false
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'User created successfully', type: CreateUserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request', type: UserErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: UserErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions', type: UserErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Email already exists', type: UserErrorResponseDto })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users', description: 'Returns a paginated list of users (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: UsersListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: UserErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions', type: UserErrorResponseDto })
  findAll(@Query() queryDto: UserQueryDto) {
    return this.usersService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Returns a single user by ID' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'User found', type: UserDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: UserErrorResponseDto })
  @ApiResponse({ status: 404, description: 'User not found', type: UserErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user', description: 'Updates a user\'s information' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({
    type: UpdateUserDto,
    description: 'User update data',
    examples: {
      validExample: {
        summary: 'Valid User Update Example',
        value: {
          full_name: 'Updated User Name',
          role: 'admin',
          is_active: true,
          email_verified: true
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UpdateUserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request', type: UserErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: UserErrorResponseDto })
  @ApiResponse({ status: 404, description: 'User not found', type: UserErrorResponseDto })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password', description: 'Change the current user\'s password' })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Password change data',
    examples: {
      validExample: {
        summary: 'Valid Password Change Example',
        value: {
          current_password: 'CurrentPassword123!',
          new_password: 'NewStrongPassword456!',
          confirm_password: 'NewStrongPassword456!'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully', type: ChangePasswordResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request (passwords don\'t match or invalid format)', type: UserErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized (wrong current password)', type: UserErrorResponseDto })
  changePassword(@CurrentUser() user: User, @Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Delete user', description: 'Permanently deletes a user (Superuser only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'User deleted successfully', type: DeleteUserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: UserErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions', type: UserErrorResponseDto })
  @ApiResponse({ status: 404, description: 'User not found', type: UserErrorResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request (user has associated devices)', type: UserErrorResponseDto })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
