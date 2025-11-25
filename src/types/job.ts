export interface Job {
  id: string;
  title: string;
  workType: string[];
  isUnlimitedRecruit: boolean;
  recruitEndDate: Date | null;
  major: string[];
  experience: string[];
  position: string;
  salaryType: string;
  salary: string;
  workDays: string[];
  isWorkDaysNegotiable: boolean;
  workStartTime: string | null;
  workEndTime: string | null;
  isWorkTimeNegotiable: boolean;
  benefits: string;
  education: string[];
  certifications: string[];
  experienceDetails: string[];
  preferences: string[];
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  department: string;
  hospitalId: string;
  hospitalName?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  deletedAt?: Date | null;
}

export interface JobFormData {
  title: string;
  workType: string[];
  isUnlimitedRecruit: boolean;
  recruitEndDate: Date | null;
  major: string[];
  experience: string[];
  position: string;
  salaryType: string;
  salary: string;
  workDays: string[];
  isWorkDaysNegotiable: boolean;
  workStartTime: any;
  workEndTime: any;
  isWorkTimeNegotiable: boolean;
  benefits: string;
  education: string[];
  certifications: string[];
  experienceDetails: string[];
  preferences: string[];
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  department: string;
}

export interface CreateJobRequest {
  title: string;
  workType: string[];
  isUnlimitedRecruit: boolean;
  recruitEndDate: Date | null;
  major: string[];
  experience: string[];
  position: string;
  salaryType: string;
  salary: string;
  workDays: string[];
  isWorkDaysNegotiable: boolean;
  workStartTime: string | null;
  workEndTime: string | null;
  isWorkTimeNegotiable: boolean;
  benefits: string;
  education: string[];
  certifications: string[];
  experienceDetails: string[];
  preferences: string[];
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  department: string;
}