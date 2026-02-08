import { Roles } from '../../enums';

export interface IUser {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Roles;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserCreate = Omit<IUser, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & {
  password: string;
};

export type IUserUpdate = Partial<Omit<IUser, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>> & {
  password?: string;
};

/** Safe user representation without sensitive fields (for API responses) */
export type IUserPublic = Omit<IUser, 'updatedAt'>;
