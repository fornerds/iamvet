"use server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";
import { CreateJobRequest, Job } from "@/types/job";
import { randomBytes } from "crypto";

function createId() {
  return randomBytes(12).toString("base64url");
}

export async function createJob(data: CreateJobRequest): Promise<{
  success: boolean;
  job?: Job;
  error?: string;
}> {
  try {
    console.log("Creating job with data:", data);
    
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    if (userResult.user.userType !== "HOSPITAL") {
      return { success: false, error: "병원 계정만 채용공고를 등록할 수 있습니다." };
    }

    const hospitalId = userResult.user.id;
    const jobId = createId();
    const currentDate = new Date();

    const {
      title,
      workType,
      isUnlimitedRecruit,
      recruitEndDate,
      major,
      experience,
      position,
      salaryType,
      salary,
      workDays,
      isWorkDaysNegotiable,
      workStartTime,
      workEndTime,
      isWorkTimeNegotiable,
      benefits,
      education,
      certifications,
      experienceDetails,
      preferences,
      managerName,
      managerPhone,
      managerEmail,
      department,
    } = data;

    console.log("Inserting job with hospitalId:", hospitalId);

    const jobResult = await sql`
      INSERT INTO jobs (
        id, "hospitalId", title, "workType", "isUnlimitedRecruit", "recruitEndDate",
        major, experience, position, "salaryType", salary, "workDays", 
        "isWorkDaysNegotiable", "workStartTime", "workEndTime", "isWorkTimeNegotiable",
        benefits, education, certifications, "experienceDetails", preferences,
        "managerName", "managerPhone", "managerEmail", department, "isActive",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${jobId}, ${hospitalId}, ${title}, ${workType}, ${isUnlimitedRecruit}, 
        ${recruitEndDate}, ${major}, ${experience}, ${position}, ${salaryType}, 
        ${salary}, ${workDays}, ${isWorkDaysNegotiable}, ${workStartTime}, 
        ${workEndTime}, ${isWorkTimeNegotiable}, ${benefits}, ${education}, 
        ${certifications}, ${experienceDetails}, ${preferences}, ${managerName}, 
        ${managerPhone}, ${managerEmail}, ${department}, true, ${currentDate}, ${currentDate}
      )
      RETURNING *
    `;

    const job = jobResult[0];
    console.log("Job created successfully:", job.id);

    // hospitals 테이블에서 hospitalName 조회
    const hospitalResult = await sql`
      SELECT h."hospitalName" 
      FROM hospitals h 
      WHERE h."userId" = ${hospitalId}
    `;
    const hospitalName = hospitalResult[0]?.hospitalName || null;

    return {
      success: true,
      job: {
        id: job.id,
        title: job.title,
        workType: job.workType,
        isUnlimitedRecruit: job.isUnlimitedRecruit,
        recruitEndDate: job.recruitEndDate,
        major: job.major,
        experience: job.experience,
        position: job.position,
        salaryType: job.salaryType,
        salary: job.salary,
        workDays: job.workDays,
        isWorkDaysNegotiable: job.isWorkDaysNegotiable,
        workStartTime: job.workStartTime,
        workEndTime: job.workEndTime,
        isWorkTimeNegotiable: job.isWorkTimeNegotiable,
        benefits: job.benefits,
        education: job.education,
        certifications: job.certifications,
        experienceDetails: job.experienceDetails,
        preferences: job.preferences,
        managerName: job.managerName,
        managerPhone: job.managerPhone,
        managerEmail: job.managerEmail,
        department: job.department,
        hospitalId: job.hospitalId,
        hospitalName: hospitalName,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        isActive: job.isActive,
      },
    };
  } catch (error) {
    console.error("Create job error:", error);
    return {
      success: false,
      error: `채용공고 등록 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function saveDraftJob(data: CreateJobRequest): Promise<{
  success: boolean;
  job?: Job;
  error?: string;
}> {
  try {
    console.log("Saving draft job with data:", data);
    
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    if (userResult.user.userType !== "HOSPITAL") {
      return { success: false, error: "병원 계정만 채용공고를 등록할 수 있습니다." };
    }

    const hospitalId = userResult.user.id;
    const jobId = createId();
    const currentDate = new Date();

    const {
      title,
      workType,
      isUnlimitedRecruit,
      recruitEndDate,
      major,
      experience,
      position,
      salaryType,
      salary,
      workDays,
      isWorkDaysNegotiable,
      workStartTime,
      workEndTime,
      isWorkTimeNegotiable,
      benefits,
      education,
      certifications,
      experienceDetails,
      preferences,
      managerName,
      managerPhone,
      managerEmail,
      department,
    } = data;

    const jobResult = await sql`
      INSERT INTO jobs (
        id, "hospitalId", title, "workType", "isUnlimitedRecruit", "recruitEndDate",
        major, experience, position, "salaryType", salary, "workDays", 
        "isWorkDaysNegotiable", "workStartTime", "workEndTime", "isWorkTimeNegotiable",
        benefits, education, certifications, "experienceDetails", preferences,
        "managerName", "managerPhone", "managerEmail", department, "isActive",
        "isDraft", "createdAt", "updatedAt"
      )
      VALUES (
        ${jobId}, ${hospitalId}, ${title}, ${workType}, ${isUnlimitedRecruit}, 
        ${recruitEndDate}, ${major}, ${experience}, ${position}, ${salaryType}, 
        ${salary}, ${workDays}, ${isWorkDaysNegotiable}, ${workStartTime}, 
        ${workEndTime}, ${isWorkTimeNegotiable}, ${benefits}, ${education}, 
        ${certifications}, ${experienceDetails}, ${preferences}, ${managerName}, 
        ${managerPhone}, ${managerEmail}, ${department}, false, true, ${currentDate}, ${currentDate}
      )
      RETURNING *
    `;

    const job = jobResult[0];
    console.log("Draft job saved successfully:", job.id);

    // hospitals 테이블에서 hospitalName 조회
    const hospitalResult = await sql`
      SELECT h."hospitalName" 
      FROM hospitals h 
      WHERE h."userId" = ${hospitalId}
    `;
    const hospitalName = hospitalResult[0]?.hospitalName || null;

    return {
      success: true,
      job: {
        id: job.id,
        title: job.title,
        workType: job.workType,
        isUnlimitedRecruit: job.isUnlimitedRecruit,
        recruitEndDate: job.recruitEndDate,
        major: job.major,
        experience: job.experience,
        position: job.position,
        salaryType: job.salaryType,
        salary: job.salary,
        workDays: job.workDays,
        isWorkDaysNegotiable: job.isWorkDaysNegotiable,
        workStartTime: job.workStartTime,
        workEndTime: job.workEndTime,
        isWorkTimeNegotiable: job.isWorkTimeNegotiable,
        benefits: job.benefits,
        education: job.education,
        certifications: job.certifications,
        experienceDetails: job.experienceDetails,
        preferences: job.preferences,
        managerName: job.managerName,
        managerPhone: job.managerPhone,
        managerEmail: job.managerEmail,
        department: job.department,
        hospitalId: job.hospitalId,
        hospitalName: hospitalName,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        isActive: job.isActive,
      },
    };
  } catch (error) {
    console.error("Save draft job error:", error);
    return {
      success: false,
      error: `채용공고 임시저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getJobsByHospital(): Promise<{
  success: boolean;
  jobs?: Job[];
  error?: string;
}> {
  try {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    if (userResult.user.userType !== "HOSPITAL") {
      return { success: false, error: "병원 계정만 채용공고를 조회할 수 있습니다." };
    }

    const hospitalId = userResult.user.id;

    const jobResults = await sql`
      SELECT j.*, h."hospitalName" 
      FROM jobs j
      JOIN hospitals h ON j."hospitalId" = h."userId"
      WHERE j."hospitalId" = ${hospitalId} 
      ORDER BY j."createdAt" DESC
    `;

    const jobs: Job[] = jobResults.map((job) => ({
      id: job.id,
      title: job.title,
      workType: job.workType,
      isUnlimitedRecruit: job.isUnlimitedRecruit,
      recruitEndDate: job.recruitEndDate,
      major: job.major,
      experience: job.experience,
      position: job.position,
      salaryType: job.salaryType,
      salary: job.salary,
      workDays: job.workDays,
      isWorkDaysNegotiable: job.isWorkDaysNegotiable,
      workStartTime: job.workStartTime,
      workEndTime: job.workEndTime,
      isWorkTimeNegotiable: job.isWorkTimeNegotiable,
      benefits: job.benefits,
      education: job.education,
      certifications: job.certifications,
      experienceDetails: job.experienceDetails,
      preferences: job.preferences,
      managerName: job.managerName,
      managerPhone: job.managerPhone,
      managerEmail: job.managerEmail,
      department: job.department,
      hospitalId: job.hospitalId,
      hospitalName: job.hospitalName,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      isActive: job.isActive,
      deletedAt: job.deletedAt || null,
    }));

    return {
      success: true,
      jobs,
    };
  } catch (error) {
    console.error("Get jobs by hospital error:", error);
    return {
      success: false,
      error: `채용공고 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}