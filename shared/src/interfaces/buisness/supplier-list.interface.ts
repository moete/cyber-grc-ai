import { Category, RiskLevel, Status } from '../../enums';
import type { ISupplier } from './supplier.interface';

export interface ISupplierListParams {
    page: number;
    limit: number;
    /** Filter by name or domain or category or riskLevel or status (partial match) */
    name?: string;
    category?: Category;
    riskLevel?: RiskLevel;
    status?: Status;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ISupplierListResult<T extends ISupplier> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
