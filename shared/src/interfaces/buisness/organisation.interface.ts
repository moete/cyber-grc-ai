import type { IUser } from './user.interface';

export interface IOrganisation {
  id: string;
  name: string;
  users?: IUser[];
  createdAt: Date;
  updatedAt: Date;
}

export type IOrganisationCreate = Omit<IOrganisation, 'id' | 'createdAt' | 'updatedAt' | 'users'>;

export type IOrganisationUpdate = Partial<Omit<IOrganisation, 'id' | 'createdAt' | 'updatedAt' | 'users'>>;
