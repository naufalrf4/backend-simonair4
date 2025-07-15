import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Password } from '@/core/auth/utils/password.util';
import { v4 as uuidv4 } from 'uuid';

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    let hashedPassword: string | null = null;
    if (createUserDto.password) {
      hashedPassword = await Password.toHash(createUserDto.password);
    }

    const verificationToken = uuidv4();

    const user = this.userRepository.create({
      ...createUserDto,
      password_hash: hashedPassword,
      verification_token: verificationToken,
      email: createUserDto.email.toLowerCase().trim(),
      full_name: createUserDto.full_name.trim(),
    });

    const savedUser = await this.userRepository.save(user);

    const { password_hash, verification_token: vt, reset_token, reset_token_expires, ...result } = savedUser;
    return result as User;
  }

  async findAll(queryDto: UserQueryDto): Promise<PaginatedUsers> {
    const { page = 1, limit = 10, search, role, email_verified, is_active, sortBy, sortOrder, created_at_from, created_at_to, last_login_from, last_login_to } = queryDto;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.full_name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (email_verified !== undefined) {
      queryBuilder.andWhere('user.email_verified = :email_verified', { email_verified });
    }

    if (is_active !== undefined) {
      queryBuilder.andWhere('user.is_active = :is_active', { is_active });
    }

    if (created_at_from) {
      queryBuilder.andWhere('user.created_at >= :created_at_from', { created_at_from });
    }

    if (created_at_to) {
      queryBuilder.andWhere('user.created_at <= :created_at_to', { created_at_to });
    }

    if (last_login_from) {
      queryBuilder.andWhere('user.last_login >= :last_login_from', { last_login_from });
    }

    if (last_login_to) {
      queryBuilder.andWhere('user.last_login <= :last_login_to', { last_login_to });
    }

    const allowedSortFields = ['created_at', 'updated_at', 'email', 'full_name', 'last_login'];
    const sortField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    queryBuilder.orderBy(`user.${sortField}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    queryBuilder.leftJoinAndSelect('user.devices', 'devices');

    const [users, total] = await queryBuilder.getManyAndCount();

    const sanitizedUsers = users.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, verification_token, reset_token, reset_token_expires, ...result } = user;
      return result as User;
    });

    return {
      users: sanitizedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, includeRelations: boolean = true): Promise<User> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    queryBuilder.where('user.id = :id', { id });

    if (includeRelations) {
      queryBuilder.leftJoinAndSelect('user.devices', 'devices');
    }

    const user = await queryBuilder.getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, verification_token, reset_token, reset_token_expires, ...result } = user;
    return result as User;
  }

  async findByEmail(email: string, includeSensitive: boolean = false): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['devices'],
    });

    if (user && !includeSensitive) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, verification_token, reset_token, reset_token_expires, ...result } = user;
      return result as User;
    }

    return user;
  }

  async findBySocialId(provider: string, socialId: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: {
        social_provider: provider,
        social_id: socialId
      },
      relations: ['devices'],
    });

    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, verification_token, reset_token, reset_token_expires, ...result } = user;
      return result as User;
    }

    return user;
  }

  async findByResetToken(token: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { reset_token: token },
      select: ['id', 'email', 'reset_token', 'reset_token_expires'],
    });

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.full_name) {
      user.full_name = updateUserDto.full_name.trim();
    }

    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }

    if (updateUserDto.is_active !== undefined) {
      user.is_active = updateUserDto.is_active;
    }

    if (updateUserDto.email_verified !== undefined) {
      user.email_verified = updateUserDto.email_verified;
    }

    const updatedUser = await this.userRepository.save(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, verification_token, reset_token, reset_token_expires, ...result } = updatedUser;
    return result as User;
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { current_password, new_password, confirm_password } = changePasswordDto;

    if (new_password !== confirm_password) {
      throw new BadRequestException('New password and confirm password do not match');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'password_hash']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password_hash) {
      throw new BadRequestException('Cannot change password for social login users');
    }

    const isCurrentPasswordValid = await Password.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (await Password.compare(new_password, user.password_hash)) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const hashedNewPassword = await Password.toHash(new_password);
    await this.userRepository.update(id, { password_hash: hashedNewPassword });
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['devices']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.devices && user.devices.length > 0) {
      throw new BadRequestException('Cannot delete user with associated devices');
    }

    await this.userRepository.remove(user);
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.userRepository.update(id, { is_active: false });
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password_hash) {
      return false;
    }
    return Password.compare(password, user.password_hash);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { last_login: new Date() });
  }

  async verifyEmail(token: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { verification_token: token }
    });

    if (!user) {
      throw new NotFoundException('Invalid verification token');
    }

    user.email_verified = true;
    user.verification_token = null;

    const updatedUser = await this.userRepository.save(user);
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, verification_token: vt, reset_token, reset_token_expires, ...result } = updatedUser;
    return result as User;
  }

  async generateResetToken(email: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.update(user.id, {
      reset_token: resetToken,
      reset_token_expires: resetTokenExpires
    });

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { reset_token: token }
    });

    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await Password.toHash(newPassword);

    await this.userRepository.update(user.id, {
      password_hash: hashedPassword,
      reset_token: null,
      reset_token_expires: null
    });
  }

  async getUserStats(): Promise<any> {
    const stats = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'COUNT(*) as total_users',
        'COUNT(CASE WHEN user.role = :superuser THEN 1 END) as superuser_count',
        'COUNT(CASE WHEN user.role = :admin THEN 1 END) as admin_count',
        'COUNT(CASE WHEN user.role = :user THEN 1 END) as user_count',
        'COUNT(CASE WHEN user.email_verified = true THEN 1 END) as verified_users',
        'COUNT(CASE WHEN user.is_active = true THEN 1 END) as active_users',
        'COUNT(CASE WHEN user.social_provider IS NOT NULL THEN 1 END) as social_users',
      ])
      .setParameters({
        superuser: UserRole.SUPERUSER,
        admin: UserRole.ADMIN,
        user: UserRole.USER,
      })
      .getRawOne();

    return {
      total_users: parseInt(stats.total_users),
      superuser_count: parseInt(stats.superuser_count),
      admin_count: parseInt(stats.admin_count),
      user_count: parseInt(stats.user_count),
      verified_users: parseInt(stats.verified_users),
      active_users: parseInt(stats.active_users),
      social_users: parseInt(stats.social_users),
    };
  }
}
