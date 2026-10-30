import type { Priority, ReportStatus } from '@banana/api-client';

export interface ReportFilterValues {
  search: string;
  categoryId: string;
  status: ReportStatus | '';
  priority: Priority | '';
  from: string;
  to: string;
}

export const EMPTY_FILTERS: ReportFilterValues = {
  search: '',
  categoryId: '',
  status: '',
  priority: '',
  from: '',
  to: '',
};
