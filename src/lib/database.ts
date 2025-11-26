import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { getExperienceFilterConditions } from "@/lib/experienceMapping";

// Type definitions
type NotificationType =
  | "application_status"
  | "job_application"
  | "bookmark_added"
  | "profile_view"
  | "message"
  | "SYSTEM"
  | "evaluation_received"
  | "job_posted"
  | "interview_scheduled";

// Import from constants file
import {
  ApplicationStatus as ApplicationStatusEnum,
  mapToLegacyStatus,
  mapFromLegacyStatus,
} from "@/constants/applicationStatus";

// Use the enum values for type safety
type ApplicationStatus = ApplicationStatusEnum;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
});

// Add error handler for the pool
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle database client", err);
});

export const getUserByEmail = async (email: string, userType?: string) => {
  // userType을 대문자로 변환 (hospital -> HOSPITAL, veterinarian -> VETERINARIAN)
  const normalizedUserType = userType ? userType.toUpperCase() : undefined;

  const query = userType
    ? 'SELECT * FROM users WHERE email = $1 AND "userType" = $2'
    : "SELECT * FROM users WHERE email = $1";

  const params = userType ? [email, normalizedUserType] : [email];
  const result = await pool.query(query, params);

  return result.rows[0] || null;
};

export const getUserByLoginId = async (loginId: string, userType?: string) => {
  // userType을 대문자로 변환 (hospital -> HOSPITAL, veterinarian -> VETERINARIAN)
  const normalizedUserType = userType ? userType.toUpperCase() : undefined;

  const query = userType
    ? 'SELECT * FROM users WHERE "loginId" = $1 AND "userType" = $2'
    : 'SELECT * FROM users WHERE "loginId" = $1';

  const params = userType ? [loginId, normalizedUserType] : [loginId];
  const result = await pool.query(query, params);

  return result.rows[0] || null;
};

export const getUserByEmailOrLoginId = async (
  identifier: string,
  userType?: string
) => {
  // userType을 대문자로 변환 (hospital -> HOSPITAL, veterinarian -> VETERINARIAN)
  const normalizedUserType = userType ? userType.toUpperCase() : undefined;

  let query: string;
  if (normalizedUserType === "HOSPITAL") {
    // 병원 계정인 경우 hospitals 테이블을 조인하여 hospitalName을 가져옴
    query = `
      SELECT u.*, h."hospitalName", u."profileImage" as "logoImage"
      FROM users u
      LEFT JOIN hospitals h ON u.id = h."userId"
      WHERE (u.email = $1 OR u."loginId" = $1) AND u."userType" = $2
    `;
  } else if (userType) {
    query =
      'SELECT * FROM users WHERE (email = $1 OR "loginId" = $1) AND "userType" = $2';
  } else {
    query = 'SELECT * FROM users WHERE (email = $1 OR "loginId" = $1)';
  }

  const params = userType ? [identifier, normalizedUserType] : [identifier];
  const result = await pool.query(query, params);

  return result.rows[0] || null;
};

export const createUser = async (userData: any) => {
  // Generate UUID for id field
  const userId = `user_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2)}`;

  const currentDate = new Date();
  const query = `
    INSERT INTO users (id, username, "loginId", nickname, email, "passwordHash", "userType", phone, "realName", "profileImage", 
                      "termsAgreedAt", "privacyAgreedAt", "marketingAgreedAt", "isActive", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `;

  const values = [
    userId,
    userData.username,
    userData.loginId,
    userData.nickname,
    userData.email,
    userData.passwordHash,
    userData.userType,
    userData.phone,
    userData.realName,
    userData.profileImage,
    userData.termsAgreedAt,
    userData.privacyAgreedAt,
    userData.marketingAgreedAt,
    false, // 회원가입 시 기본적으로 비활성화 (관리자 인증 필요)
    currentDate,
    currentDate,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const createVeterinarianProfile = async (profileData: any) => {
  // Since profile data is now stored in the users table, this function
  // updates the existing user record with profile information
  const query = `
    UPDATE users 
    SET nickname = $2, "birthDate" = $3, "licenseImage" = $4, "updatedAt" = NOW()
    WHERE id = $1
    RETURNING id, email, phone, "profileImage", "loginId", nickname, "realName", "birthDate", 
             "licenseImage", "userType", provider, "isActive", "updatedAt", "createdAt"
  `;

  const values = [
    profileData.userId,
    profileData.nickname,
    profileData.birthDate,
    profileData.licenseImage,
  ];

  console.log(
    "[DB] Creating veterinarian profile by updating user record:",
    values
  );
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const createVeterinaryStudentProfile = async (profileData: any) => {
  // Since profile data is now stored in the users table, this function
  // updates the existing user record with veterinary student profile information
  const query = `
    UPDATE users 
    SET nickname = $2, "birthDate" = $3, "licenseImage" = $4, "updatedAt" = NOW()
    WHERE id = $1
    RETURNING id, email, phone, "profileImage", "loginId", nickname, "realName", "birthDate", 
             "licenseImage", "userType", provider, "isActive", "updatedAt", "createdAt"
  `;

  const values = [
    profileData.userId,
    profileData.nickname,
    profileData.birthDate,
    null, // No license image for veterinary students
  ];

  console.log(
    "[DB] Creating veterinary student profile by updating user record:",
    values
  );
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const createHospitalProfile = async (profileData: any) => {
  const query = `
    INSERT INTO hospitals (user_id, hospital_name, business_number, address, detail_address,
                          website, logo_image, facility_images, treatable_animals, medical_fields,
                          business_registration, founded_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const values = [
    profileData.userId,
    profileData.hospitalName,
    profileData.businessNumber,
    profileData.address,
    profileData.detailAddress,
    profileData.website,
    profileData.logoImage,
    profileData.facilityImages,
    profileData.treatableAnimals,
    profileData.medicalFields,
    profileData.businessRegistration,
    profileData.foundedDate,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getJobsWithPagination = async (params: any) => {
  console.log("[DB] getJobsWithPagination called with params:", params);

  // First, check if jobs table exists
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs'
      );
    `);
    console.log("[DB] jobs table exists:", tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.warn("[DB] jobs table does not exist, returning empty result");
      return {
        jobs: [],
        totalCount: 0,
      };
    }
  } catch (error) {
    console.error("[DB] Table check error:", error);
    throw error;
  }

  let query = `
    SELECT j.*, h."hospitalName" as hospital_name, h."hospitalLogo" as hospital_logo, h."hospitalAddress" as hospital_location
    FROM jobs j
    JOIN users u ON j."hospitalId" = u.id
    JOIN hospitals h ON u.id = h."userId"
    WHERE j."isActive" = true AND j."isDraft" = false AND j."deletedAt" IS NULL
  `;

  const queryParams: any[] = [];
  let paramCount = 0;

  // 키워드 검색
  if (params.keyword) {
    paramCount++;
    query += ` AND (j.title ILIKE $${paramCount} OR j.position ILIKE $${paramCount} OR h."hospitalName" ILIKE $${paramCount})`;
    queryParams.push(`%${params.keyword}%`);
  }

  // 근무 형태 필터 (배열에서 검색)
  if (params.workType) {
    const workTypes = Array.isArray(params.workType)
      ? params.workType
      : [params.workType];
    paramCount++;
    query += ` AND j."workType" && $${paramCount}`;
    queryParams.push(workTypes);
  }

  // 경력 필터 (계층적 필터링)
  if (params.experience) {
    const experiences = Array.isArray(params.experience)
      ? params.experience
      : [params.experience];

    console.log("[DB] Original experience filter:", experiences);

    // 계층적으로 확장된 경험 카테고리 생성
    const expandedExperiences = getExperienceFilterConditions(experiences);
    console.log("[DB] Expanded experience filter:", expandedExperiences);

    if (expandedExperiences.length > 0) {
      paramCount++;
      query += ` AND j.experience && $${paramCount}`;
      queryParams.push(expandedExperiences);
      console.log("[DB] Experience filter applied:", expandedExperiences);
    }
  }

  // 지역 필터
  if (params.region && params.region !== "all") {
    const regionMapping: { [key: string]: string } = {
      seoul: "서울",
      busan: "부산",
      daegu: "대구",
      incheon: "인천",
      gwangju: "광주",
      daejeon: "대전",
      ulsan: "울산",
      gyeonggi: "경기",
      gangwon: "강원",
      chungbuk: "충북",
      chungnam: "충남",
      jeonbuk: "전북",
      jeonnam: "전남",
      gyeongbuk: "경북",
      gyeongnam: "경남",
      jeju: "제주",
    };

    const koreanRegion = regionMapping[params.region];
    if (koreanRegion) {
      paramCount++;
      query += ` AND h."hospitalAddress" ILIKE $${paramCount}`;
      queryParams.push(`${koreanRegion}%`);
    }
  }

  // 전공 필터 (배열에서 검색)
  if (params.major) {
    const majors = Array.isArray(params.major) ? params.major : [params.major];
    paramCount++;
    query += ` AND j.major && $${paramCount}`;
    queryParams.push(majors);
  }

  // 내 채용공고 필터
  if (params.myJobs && params.userId) {
    paramCount++;
    query += ` AND j."hospitalId" = $${paramCount}`;
    queryParams.push(params.userId);
  }

  // 정렬
  switch (params.sort) {
    case "recent":
    case "latest":
      query += ` ORDER BY j."createdAt" DESC`;
      break;
    case "oldest":
      query += ` ORDER BY j."createdAt" ASC`;
      break;
    case "deadline":
      query += ` ORDER BY j."recruitEndDate" ASC NULLS LAST, j."createdAt" DESC`;
      break;
    case "popular":
      // 인기순은 일단 최신순으로 처리 (추후 조회수나 지원수 추가 시 변경)
      query += ` ORDER BY j."createdAt" DESC`;
      break;
    default:
      query += ` ORDER BY j."createdAt" DESC`;
  }

  // 페이지네이션
  const offset = (params.page - 1) * params.limit;
  paramCount += 2;
  query += ` LIMIT $${paramCount - 1} OFFSET $${paramCount}`;
  queryParams.push(params.limit, offset);

  console.log("[DB] Executing query:", query);
  console.log("[DB] Query params:", queryParams);

  let result;
  try {
    result = await pool.query(query, queryParams);
    console.log(
      "[DB] Query executed successfully, rows returned:",
      result.rows.length
    );
  } catch (error) {
    console.error("[DB] Query execution error:", error);
    console.error("[DB] Failed query:", query);
    console.error("[DB] Failed params:", queryParams);
    throw error;
  }

  // 전체 개수 조회
  let countQuery = `
    SELECT COUNT(*) as total
    FROM jobs j
    JOIN users u ON j."hospitalId" = u.id
    JOIN hospitals h ON u.id = h."userId"
    WHERE j."isActive" = true AND j."isDraft" = false AND j."deletedAt" IS NULL
  `;

  const countParams: any[] = [];
  let countParamCount = 0;

  if (params.keyword) {
    countParamCount++;
    countQuery += ` AND (j.title ILIKE $${countParamCount} OR j.position ILIKE $${countParamCount} OR h."hospitalName" ILIKE $${countParamCount})`;
    countParams.push(`%${params.keyword}%`);
  }

  if (params.workType) {
    const workTypes = Array.isArray(params.workType)
      ? params.workType
      : [params.workType];
    countParamCount++;
    countQuery += ` AND j."workType" && $${countParamCount}`;
    countParams.push(workTypes);
  }

  if (params.experience) {
    const experiences = Array.isArray(params.experience)
      ? params.experience
      : [params.experience];

    // 계층적으로 확장된 경험 카테고리 생성
    const expandedExperiences = getExperienceFilterConditions(experiences);

    if (expandedExperiences.length > 0) {
      countParamCount++;
      countQuery += ` AND j.experience && $${countParamCount}`;
      countParams.push(expandedExperiences);
    }
  }

  if (params.region && params.region !== "all") {
    const regionMapping: { [key: string]: string } = {
      seoul: "서울",
      busan: "부산",
      daegu: "대구",
      incheon: "인천",
      gwangju: "광주",
      daejeon: "대전",
      ulsan: "울산",
      gyeonggi: "경기",
      gangwon: "강원",
      chungbuk: "충북",
      chungnam: "충남",
      jeonbuk: "전북",
      jeonnam: "전남",
      gyeongbuk: "경북",
      gyeongnam: "경남",
      jeju: "제주",
    };

    const koreanRegion = regionMapping[params.region];
    if (koreanRegion) {
      countParamCount++;
      countQuery += ` AND h."hospitalAddress" ILIKE $${countParamCount}`;
      countParams.push(`${koreanRegion}%`);
    }
  }

  if (params.major) {
    const majors = Array.isArray(params.major) ? params.major : [params.major];
    countParamCount++;
    countQuery += ` AND j.major && $${countParamCount}`;
    countParams.push(majors);
  }

  console.log("[DB] Executing count query:", countQuery);
  console.log("[DB] Count params:", countParams);

  let countResult;
  try {
    countResult = await pool.query(countQuery, countParams);
    console.log(
      "[DB] Count query executed successfully, total:",
      countResult.rows[0]?.total
    );
  } catch (error) {
    console.error("[DB] Count query execution error:", error);
    console.error("[DB] Failed count query:", countQuery);
    console.error("[DB] Failed count params:", countParams);
    throw error;
  }

  const totalCount = parseInt(countResult.rows[0]?.total || "0");

  // Experience 값들을 로그로 출력하여 디버깅
  if (result.rows.length > 0) {
    console.log(
      "[DB] Sample job experience values:",
      result.rows.slice(0, 3).map((job) => ({
        id: job.id,
        title: job.title,
        experience: job.experience,
      }))
    );
  }

  return {
    jobs: result.rows,
    totalCount,
  };
};

export const getJobById = async (jobId: string) => {
  // jobs 테이블 조회
  const query = `
    SELECT * FROM jobs 
    WHERE id = $1 AND "isActive" = true AND "deletedAt" IS NULL
  `;

  console.log("getJobById query:", { jobId, query });
  const result = await pool.query(query, [jobId]);
  console.log("getJobById result:", { found: result.rows.length > 0 });

  if (!result.rows[0]) {
    return null;
  }

  const job = result.rows[0];

  // 병원 정보 추가 조회
  if (job.hospitalId) {
    try {
      const hospitalQuery = `
        SELECT 
          u.id as userId,
          u.email as hospital_email,
          u.phone as hospital_phone,
          h."hospitalName" as hospital_name,
          h."hospitalAddress" as hospital_address,
          h."hospitalWebsite" as hospital_website,
          h."hospitalLogo" as hospital_logo
        FROM users u
        JOIN hospitals h ON u.id = h."userId"
        WHERE u.id = $1 AND u."userType" = 'HOSPITAL'
      `;

      const hospitalResult = await pool.query(hospitalQuery, [job.hospitalId]);

      if (hospitalResult.rows[0]) {
        // 병원 정보를 job 객체에 추가
        Object.assign(job, hospitalResult.rows[0]);
        // hospital 객체도 추가
        job.hospital = {
          userId: hospitalResult.rows[0].userId,
          name: hospitalResult.rows[0].hospital_name,
          email: hospitalResult.rows[0].hospital_email,
          phone: hospitalResult.rows[0].hospital_phone,
          address: hospitalResult.rows[0].hospital_address,
          website: hospitalResult.rows[0].hospital_website,
          logo: hospitalResult.rows[0].hospital_logo,
        };
      }
    } catch (error) {
      console.warn("Hospital data fetch failed:", error);
    }
  }

  return job;
};

// ============================================================================
// 사용자 관련 헬퍼 함수들
// ============================================================================

export const updateLastLogin = async (userId: string): Promise<void> => {
  const query =
    'UPDATE users SET "lastLoginAt" = CURRENT_TIMESTAMP WHERE id = $1';
  await pool.query(query, [userId]);
};

export const checkUserExists = async (
  email: string,
  phone: string,
  username: string
) => {
  const query = `
    SELECT u.id, u.email, u.phone, u.username, u.deleted_at, u.user_type,
           CASE 
             WHEN u.user_type = 'veterinarian' THEN v.nickname
             WHEN u.user_type = 'hospital' THEN h.hospital_name
           END as display_name
    FROM users u
    LEFT JOIN veterinarians v ON u.id = v.user_id
    LEFT JOIN hospitals h ON u.id = h.user_id
    WHERE u.email = $1 OR u.phone = $2 OR u.username = $3
  `;

  const result = await pool.query(query, [email, phone, username]);

  if (result.rows.length === 0) {
    return { exists: false };
  }

  const user = result.rows[0];
  return {
    exists: true,
    isDeleted: !!user.deleted_at,
    account: user.deleted_at
      ? {
          userType: user.user_type,
          username: user.username,
          email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // 이메일 마스킹
          deletedAt: user.deleted_at,
          deletedPeriod: calculatePeriod(user.deleted_at),
          daysUntilPermanentDeletion: calculateDaysUntilPermanentDeletion(
            user.deleted_at
          ),
          newAccountAvailableDate: calculateNewAccountAvailableDate(
            user.deleted_at
          ),
          evaluationSummary: await getEvaluationSummary(
            user.id,
            user.user_type
          ),
        }
      : null,
  };
};

export const checkBusinessNumberExists = async (
  businessNumber: string
): Promise<boolean> => {
  const query =
    "SELECT id FROM hospitals WHERE business_number = $1 AND deleted_at IS NULL";
  const result = await pool.query(query, [businessNumber]);
  return result.rows.length > 0;
};

export const checkPhoneRestriction = async (phone: string) => {
  const query = `
    SELECT deleted_at, deletion_attempt_count
    FROM users 
    WHERE phone = $1 AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [phone]);

  if (result.rows.length === 0) {
    return { isRestricted: false };
  }

  const user = result.rows[0];
  const deletedAt = new Date(user.deleted_at);
  const restrictionEndDate = new Date(deletedAt);
  restrictionEndDate.setDate(restrictionEndDate.getDate() + 90); // 3개월 제한

  const now = new Date();
  const isRestricted = now < restrictionEndDate;

  return {
    isRestricted,
    restriction: isRestricted
      ? {
          deletedAt: user.deleted_at,
          daysRemaining: Math.ceil(
            (restrictionEndDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          canRecoverInstead: true,
          evaluationsWillBeRestored: true,
        }
      : null,
  };
};

// ============================================================================
// 날짜 및 시간 헬퍼 함수들
// ============================================================================

const calculatePeriod = (deletedAt: string): string => {
  const deleted = new Date(deletedAt);
  const now = new Date();
  const diffTime = now.getTime() - deleted.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    return `${diffHours}시간 전`;
  } else if (diffDays < 30) {
    return `${diffDays}일 전`;
  } else if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}개월 전`;
  } else {
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}년 전`;
  }
};

const calculateDaysUntilPermanentDeletion = (deletedAt: string): number => {
  const deleted = new Date(deletedAt);
  const permanentDeletionDate = new Date(deleted);
  permanentDeletionDate.setDate(permanentDeletionDate.getDate() + 90); // 3개월 후 영구 삭제

  const now = new Date();
  const diffTime = permanentDeletionDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

const calculateNewAccountAvailableDate = (deletedAt: string): string => {
  const deleted = new Date(deletedAt);
  const availableDate = new Date(deleted);
  availableDate.setDate(availableDate.getDate() + 90); // 3개월 후 새 계정 생성 가능

  return availableDate.toISOString();
};

// ============================================================================
// 평가 관련 헬퍼 함수들
// ============================================================================

const getEvaluationSummary = async (userId: string, userType: string) => {
  if (userType === "veterinarian") {
    const query = `
      SELECT 
        COUNT(*) as total,
        AVG(overall_rating) as average_rating,
        COUNT(CASE WHEN overall_rating >= 4 THEN 1 END) as positive,
        COUNT(CASE WHEN overall_rating <= 2 THEN 1 END) as negative
      FROM veterinarian_evaluations ve
      JOIN veterinarians v ON ve.veterinarian_id = v.id
      WHERE v.user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      positive: parseInt(row.positive) || 0,
      negative: parseInt(row.negative) || 0,
      total: parseInt(row.total) || 0,
      averageRating: parseFloat(row.average_rating) || 0,
    };
  } else {
    const query = `
      SELECT 
        COUNT(*) as total,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative
      FROM hospital_evaluations he
      JOIN users h ON he."hospitalId" = h.id
      WHERE h.id = $1
    `;

    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      positive: parseInt(row.positive) || 0,
      negative: parseInt(row.negative) || 0,
      total: parseInt(row.total) || 0,
      averageRating: parseFloat(row.average_rating) || 0,
    };
  }
};

// ============================================================================
// 해시태그 생성 함수들
// ============================================================================

export const generateHashtags = (profile: any): string[] => {
  const hashtags: string[] = [];

  if (profile.medical_field) {
    const fieldMap: Record<string, string> = {
      internal: "내과",
      surgery: "외과",
      dermatology: "피부과",
      dental: "치과",
      ophthalmology: "안과",
      emergency: "응급의학과",
    };
    hashtags.push(
      `#${fieldMap[profile.medical_field] || profile.medical_field}`
    );
  }

  if (profile.preferred_work_type) {
    const workTypeMap: Record<string, string> = {
      full_time: "정규직",
      part_time: "파트타임",
      contract: "계약직",
      internship: "인턴십",
    };
    hashtags.push(
      `#${
        workTypeMap[profile.preferred_work_type] || profile.preferred_work_type
      }`
    );
  }

  if (profile.total_experience) {
    hashtags.push(`#경력${profile.total_experience}`);
  }

  if (profile.preferred_regions && profile.preferred_regions.length > 0) {
    hashtags.push(`#${profile.preferred_regions[0]}`);
  }

  return hashtags.slice(0, 4); // 최대 4개 해시태그
};

export const generateHospitalHashtags = (hospital: any): string[] => {
  const hashtags: string[] = [];

  if (hospital.medical_fields && hospital.medical_fields.length > 0) {
    const fieldMap: Record<string, string> = {
      internal: "내과",
      surgery: "외과",
      dermatology: "피부과",
      dental: "치과",
      ophthalmology: "안과",
      emergency: "응급의학과",
    };
    hashtags.push(
      `#${fieldMap[hospital.medical_fields[0]] || hospital.medical_fields[0]}`
    );
  }

  if (hospital.treatable_animals && hospital.treatable_animals.length > 0) {
    const animalMap: Record<string, string> = {
      dog: "개",
      cat: "고양이",
      special: "특수동물",
      large: "대동물",
    };
    hospital.treatable_animals.forEach((animal: string) => {
      if (hashtags.length < 4) {
        hashtags.push(`#${animalMap[animal] || animal}`);
      }
    });
  }

  if (hospital.address) {
    const region = hospital.address.split(" ")[0];
    hashtags.push(`#${region}`);
  }

  return hashtags.slice(0, 4);
};

// ============================================================================
// 채용공고 관련 헬퍼 함수들
// ============================================================================

export const incrementJobViewCount = async (
  jobId: string,
  userIdentifier: string,
  userId?: string
): Promise<boolean> => {
  return incrementViewCount("job", jobId, userIdentifier, userId);
};

export const incrementJobApplicantCount = async (
  jobId: string
): Promise<void> => {
  const query =
    "UPDATE jobs SET applicant_count = applicant_count + 1 WHERE id = $1";
  await pool.query(query, [jobId]);
};

export const getRelatedJobs = async (
  jobId: string,
  medicalField?: string,
  limit: number = 5
) => {
  let query = `
    SELECT 
      jp.*,
      h."hospitalName" as hospital_name,
      h."hospitalLogo" as hospital_logo,
      h."hospitalAddress" as hospital_location
    FROM jobs jp
    LEFT JOIN users u ON jp."hospitalId" = u.id AND u."userType" = 'HOSPITAL'
    LEFT JOIN hospitals h ON u.id = h."userId"
    WHERE jp.id != $1 AND jp."isActive" = true
  `;

  const params = [jobId];

  if (medicalField) {
    query += ` AND jp."medicalField" && ARRAY[$2]::text[]`;
    params.push(medicalField);
    query += ` ORDER BY jp."createdAt" DESC LIMIT $3`;
    params.push(limit.toString());
  } else {
    query += ` ORDER BY jp."createdAt" DESC LIMIT $2`;
    params.push(limit.toString());
  }

  const result = await pool.query(query, params);
  return result.rows;
};

export const getPopularJobs = async (limit: number = 10) => {
  const query = `
    SELECT j.*, h.hospital_name, h.logo_image as hospital_logo, h.address as hospital_location
    FROM jobs j
    JOIN hospitals h ON j.hospital_id = h.id
    WHERE j.is_active = true AND j.is_public = true
    ORDER BY j.view_count DESC, j.applicant_count DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};

export const getRecentJobs = async (limit: number = 10) => {
  const query = `
    SELECT j.*, h.hospital_name, h.logo_image as hospital_logo, h.address as hospital_location
    FROM jobs j
    JOIN hospitals h ON j.hospital_id = h.id
    WHERE j.is_active = true AND j.is_public = true
    ORDER BY j.created_at DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};

// ============================================================================
// 인재정보 관련 헬퍼 함수들
// ============================================================================

export const incrementVeterinarianResumeViewCount = async (
  veterinarianId: string,
  userIdentifier: string,
  userId?: string
): Promise<boolean> => {
  return incrementViewCount("resume", veterinarianId, userIdentifier, userId);
};

export const getResumesWithPagination = async (params: any) => {
  console.log("[getResumesWithPagination] 파라미터:", params);

  // resumes 테이블과 users 테이블을 JOIN하여 조회 (lastLoginAt 포함)
  let query = `
    SELECT 
      dr.id,
      dr.name,
      dr.photo,
      dr.introduction,
      dr."selfIntroduction",
      dr.position,
      dr.specialties,
      dr."preferredRegions",
      dr."workTypes",
      dr."expectedSalary",
      dr."startDate",
      dr."createdAt",
      dr."updatedAt",
      u."lastLoginAt"
    FROM resumes dr
    JOIN users u ON dr."userId" = u.id
    WHERE u."deletedAt" IS NULL AND u."isActive" = true
  `;

  const queryParams: any[] = [];
  let paramCount = 0;

  // 키워드 검색
  if (params.keyword) {
    paramCount++;
    query += ` AND (dr.name ILIKE $${paramCount} OR dr.introduction ILIKE $${paramCount} OR dr."selfIntroduction" ILIKE $${paramCount})`;
    queryParams.push(`%${params.keyword}%`);
  }

  // 지역 필터
  if (params.region) {
    paramCount++;
    query += ` AND $${paramCount} = ANY(dr."preferredRegions")`;
    queryParams.push(params.region);
  }

  // 근무 형태 필터
  if (params.workType) {
    paramCount++;
    query += ` AND $${paramCount} = ANY(dr."workTypes")`;
    queryParams.push(params.workType);
  }

  // 정렬
  switch (params.sort) {
    case "latest":
      query += ' ORDER BY dr."updatedAt" DESC';
      break;
    case "oldest":
      query += ' ORDER BY dr."createdAt" ASC';
      break;
    default:
      query += ' ORDER BY dr."updatedAt" DESC';
  }

  // 전체 개수 조회를 위한 쿼리 (LIMIT/OFFSET 없이)
  const countQuery = query
    .replace(/SELECT[\s\S]*?FROM/, "SELECT COUNT(*) as total FROM")
    .replace(/ORDER BY[\s\S]*$/, "");

  console.log("[getResumesWithPagination] Count 쿼리:", countQuery);
  const countResult = await pool.query(countQuery, queryParams);
  const totalCount = parseInt(countResult.rows[0]?.total || "0");
  console.log("[getResumesWithPagination] 전체 개수:", totalCount);

  // 페이지네이션
  const offset = (params.page - 1) * params.limit;
  paramCount += 2;
  query += ` LIMIT $${paramCount - 1} OFFSET $${paramCount}`;
  queryParams.push(params.limit, offset);

  console.log("[getResumesWithPagination] 최종 쿼리:", query);
  console.log("[getResumesWithPagination] 쿼리 파라미터:", queryParams);

  const result = await pool.query(query, queryParams);
  console.log(
    "[getResumesWithPagination] 조회된 레코드 수:",
    result.rows.length
  );

  return {
    data: result.rows,
    total: totalCount,
    currentPage: params.page,
    totalPages: Math.ceil(totalCount / params.limit),
  };
};

export const getResumeById = async (veterinarianId: string) => {
  const query = `
    SELECT v.*, u.email, u.phone, u.profile_image, u.last_login_at,
           COUNT(DISTINCT ve.id) as evaluation_count,
           AVG(ve.overall_rating) as average_rating
    FROM veterinarians v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN veterinarian_evaluations ve ON v.id = ve.veterinarian_id
    WHERE v.id = $1 AND u.deleted_at IS NULL
    GROUP BY v.id, u.id
  `;

  const result = await pool.query(query, [veterinarianId]);

  if (result.rows.length === 0) {
    return null;
  }

  const resume = result.rows[0];

  // 경력, 학력, 자격증, 기술 정보 조회
  const careers = await getVeterinarianCareers(veterinarianId);
  const educations = await getVeterinarianEducations(veterinarianId);
  const licenses = await getVeterinarianLicenses(veterinarianId);
  const skills = await getVeterinarianSkills(veterinarianId);
  const evaluations = await getVeterinarianEvaluations(veterinarianId);

  return {
    ...resume,
    careers,
    educations,
    licenses,
    skills,
    evaluations,
  };
};

export const getRelatedTalents = async (
  veterinarianId: string,
  medicalField?: string,
  limit: number = 5
) => {
  let query = `
    SELECT v.*, u.profile_image, u.last_login_at
    FROM veterinarians v
    JOIN users u ON v.user_id = u.id
    WHERE v.id != $1 AND v.is_profile_public = true AND u.deleted_at IS NULL
  `;

  const params = [veterinarianId];

  if (medicalField) {
    query += ` AND v.medical_field = $2`;
    params.push(medicalField);
    query += ` ORDER BY v.updated_at DESC LIMIT $3`;
    params.push(limit.toString());
  } else {
    query += ` ORDER BY v.updated_at DESC LIMIT $2`;
    params.push(limit.toString());
  }

  const result = await pool.query(query, params);
  return result.rows;
};

// ============================================================================
// 북마크 관련 헬퍼 함수들
// ============================================================================

export const getJobBookmark = async (userId: string, jobId: string) => {
  const query =
    "SELECT id FROM job_bookmarks WHERE user_id = $1 AND job_id = $2";
  const result = await pool.query(query, [userId, jobId]);
  return result.rows[0] || null;
};

export const createJobBookmark = async (userId: string, jobId: string) => {
  const query =
    "INSERT INTO job_bookmarks (user_id, job_id) VALUES ($1, $2) RETURNING *";
  const result = await pool.query(query, [userId, jobId]);
  return result.rows[0];
};

export const deleteJobBookmark = async (userId: string, jobId: string) => {
  const query = "DELETE FROM job_bookmarks WHERE user_id = $1 AND job_id = $2";
  await pool.query(query, [userId, jobId]);
};

export const getResumeBookmark = async (
  userId: string,
  veterinarianId: string
) => {
  const query =
    "SELECT id FROM resume_bookmarks WHERE user_id = $1 AND veterinarian_id = $2";
  const result = await pool.query(query, [userId, veterinarianId]);
  return result.rows[0] || null;
};

export const createResumeBookmark = async (
  userId: string,
  veterinarianId: string
) => {
  const query =
    "INSERT INTO resume_bookmarks (user_id, veterinarian_id) VALUES ($1, $2) RETURNING *";
  const result = await pool.query(query, [userId, veterinarianId]);
  return result.rows[0];
};

export const deleteResumeBookmark = async (
  userId: string,
  veterinarianId: string
) => {
  const query =
    "DELETE FROM resume_bookmarks WHERE user_id = $1 AND veterinarian_id = $2";
  await pool.query(query, [userId, veterinarianId]);
};

// ============================================================================
// 지원서 관련 헬퍼 함수들
// ============================================================================

export const getApplication = async (jobId: string, veterinarianId: string) => {
  const query = `
    SELECT a.* FROM applications a
    WHERE a."jobId" = $1 AND a."veterinarianId" = $2
  `;
  const result = await pool.query(query, [jobId, veterinarianId]);
  return result.rows[0] || null;
};

export const createApplication = async (applicationData: any) => {
  const { createId } = await import("@paralleldrive/cuid2");
  const applicationId = createId();

  const query = `
    INSERT INTO applications (id, "jobId", "veterinarianId", status, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const values = [
    applicationId,
    applicationData.jobId,
    applicationData.veterinarianId,
    applicationData.status,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const updateApplicationStatus = async (
  applicationId: string,
  status: ApplicationStatus | string
) => {
  // 이제 6개의 상태를 모두 직접 저장 가능
  const query =
    'UPDATE applications SET status = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2';
  await pool.query(query, [status, applicationId]);
};

export const getApplicationStatus = async (userId: string) => {
  const query = `
    SELECT 
      COUNT(*) as total_applications,
      COUNT(CASE WHEN a.status = 'ACCEPTED' THEN 1 END) as accepted,
      COUNT(CASE WHEN a.status = 'REVIEWING' THEN 1 END) as reviewing,
      COUNT(CASE WHEN a.status = 'REJECTED' THEN 1 END) as rejected,
      COUNT(CASE WHEN a.status = 'PENDING' THEN 1 END) as pending
    FROM applications a
    JOIN veterinarians v ON a.veterinarian_id = v.id
    WHERE v.user_id = $1
  `;

  const result = await pool.query(query, [userId]);
  const row = result.rows[0];

  return {
    totalApplications: parseInt(row.total_applications) || 0,
    accepted: parseInt(row.accepted) || 0,
    reviewing: parseInt(row.reviewing) || 0,
    rejected: parseInt(row.rejected) || 0,
    pending: parseInt(row.pending) || 0,
  };
};

// ============================================================================
// 알림 관련 헬퍼 함수들
// ============================================================================

export const createNotification = async (notificationData: {
  userId: string;
  type: NotificationType;
  title: string;
  description?: string;
  content?: string;
  url?: string;
  senderId?: string;
  applicationId?: string;
  applicationStatus?: ApplicationStatus;
}) => {
  try {
    console.log("createNotification called with:", {
      userId: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
    });

    // 사용자 타입 조회
    const userTypeResult = await pool.query(
      'SELECT "userType", email FROM users WHERE id = $1',
      [notificationData.userId]
    );

    console.log("User lookup result:", userTypeResult.rows[0]);

    if (!userTypeResult.rows[0]) {
      console.error("User not found:", notificationData.userId);
      throw new Error(`User not found: ${notificationData.userId}`);
    }

    const recipientType = userTypeResult.rows[0]?.userType || "VETERINARIAN";

    // Generate unique ID for notification
    const notificationId = `notification_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}`;

    const query = `
      INSERT INTO notifications (id, "recipientId", "recipientType", type, title, content, "isRead", "senderId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      notificationId,
      notificationData.userId,
      recipientType,
      notificationData.type,
      notificationData.title,
      notificationData.content,
      false, // isRead
      notificationData.senderId,
    ];

    console.log("Executing notification insert with values:", values);
    const result = await pool.query(query, values);
    console.log("Notification created successfully:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error("createNotification error:", error);
    throw error;
  }
};

export const getNotifications = async (userId: string, limit: number = 20) => {
  const query = `
    SELECT n.*, 
           u.profile_image as sender_profile_image,
           CASE 
             WHEN u.user_type = 'veterinarian' THEN v.nickname
             WHEN u.user_type = 'hospital' THEN h.hospital_name
           END as sender_name
    FROM notifications n
    LEFT JOIN users u ON n.sender_id = u.id
    LEFT JOIN veterinarians v ON u.id = v.user_id
    LEFT JOIN hospitals h ON u.id = h.user_id
    WHERE n.user_id = $1
    ORDER BY n.created_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [userId, limit]);
  return result.rows;
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
) => {
  const query =
    "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2";
  await pool.query(query, [notificationId, userId]);
};

export const getStatusNotificationTitle = (
  status: ApplicationStatus
): string => {
  const statusMap: Record<ApplicationStatus, string> = {
    [ApplicationStatusEnum.PENDING]: "지원서 접수 완료",
    [ApplicationStatusEnum.REVIEWING]: "서류 검토 중",
    [ApplicationStatusEnum.DOCUMENT_PASS]: "서류 합격 축하드립니다!",
    [ApplicationStatusEnum.INTERVIEW_PASS]: "면접 합격 축하드립니다!",
    [ApplicationStatusEnum.ACCEPTED]: "최종 합격 축하드립니다!",
    [ApplicationStatusEnum.REJECTED]: "지원 결과 안내",
  };

  return statusMap[status] || "지원 상태 업데이트";
};

// ============================================================================
// 프로필 관련 헬퍼 함수들
// ============================================================================

export const getVeterinarianProfile = async (userId: string) => {
  console.log("[DB] getVeterinarianProfile called with userId:", userId);

  // Query the users table directly since veterinarian profile data is now stored there
  const query = `
    SELECT id, email, phone, "profileImage", "loginId", nickname, "realName", "birthDate", 
           "licenseImage", "userType", provider, "isActive", "updatedAt", "createdAt"
    FROM users 
    WHERE id = $1 AND "isActive" = true
  `;

  console.log("[DB] Executing query:", query);
  const result = await pool.query(query, [userId]);
  console.log("[DB] User query result:", result.rows);
  console.log("[DB] Number of rows returned:", result.rows.length);

  if (result.rows.length === 0) {
    console.error("[DB] CRITICAL: No user found with id:", userId);
    console.error(
      "[DB] This suggests JWT token contains invalid userId or user was deleted"
    );
    return null;
  }

  const user = result.rows[0];
  console.log("[DB] Found user:", {
    userType: user.userType,
    nickname: user.nickname,
    email: user.email,
    isActive: user.isActive,
    licenseImage: user.licenseImage,
    hasLicenseImage: !!user.licenseImage,
  });

  const userType = user.userType;
  console.log("[DB] User type:", userType);

  if (userType === "VETERINARIAN" || userType === "VETERINARY_STUDENT") {
    // Return the user data directly as all profile data is now in the users table
    return user;
  }

  console.log("[DB] User type is not VETERINARIAN:", userType);
  return null;
};

export const getHospitalProfile = async (userId: string) => {
  const query = `
    SELECT h.*, u.email, u.phone, u.profile_image, u.username, u.last_login_at
    FROM hospitals h
    JOIN users u ON h.user_id = u.id
    WHERE h.user_id = $1 AND u.deleted_at IS NULL
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

export const getHospitalByUserId = async (userId: string) => {
  const query = `
    SELECT 
      h.id,
      u.id as "userId",
      h."hospitalName",
      h."businessNumber",
      h."hospitalAddress",
      h."hospitalLogo",
      u.email,
      u.phone
    FROM users u
    JOIN hospitals h ON u.id = h."userId"
    WHERE u.id = $1 AND u."userType" = 'HOSPITAL'
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

export const updateVeterinarianProfile = async (
  userId: string,
  profileData: any
) => {
  try {
    console.log("[DB] updateVeterinarianProfile called with:", {
      userId,
      profileData,
    });

    // Update users table - all profile data is now stored here
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (profileData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(profileData.email);
      console.log("[DB] Will update user email");
    }
    if (profileData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(profileData.phone);
      console.log("[DB] Will update user phone");
    }
    if (profileData.profileImage !== undefined) {
      updateFields.push(`"profileImage" = $${paramIndex++}`);
      updateValues.push(profileData.profileImage);
      console.log("[DB] Will update user profileImage");
    }
    if (profileData.realName !== undefined) {
      updateFields.push(`"realName" = $${paramIndex++}`);
      updateValues.push(profileData.realName);
      console.log("[DB] Will update user realName");
    }
    if (profileData.nickname !== undefined) {
      updateFields.push(`nickname = $${paramIndex++}`);
      updateValues.push(profileData.nickname);
      console.log("[DB] Will update user nickname");
    }
    if (profileData.birthDate !== undefined) {
      updateFields.push(`"birthDate" = $${paramIndex++}`);
      updateValues.push(profileData.birthDate);
      console.log("[DB] Will update user birthDate");
    }
    if (profileData.licenseImage !== undefined) {
      updateFields.push(`"licenseImage" = $${paramIndex++}`);
      updateValues.push(profileData.licenseImage);
      console.log("[DB] Will update user licenseImage");
    }

    if (updateFields.length > 0) {
      updateFields.push(`"updatedAt" = NOW()`);
      updateValues.push(userId);

      const query = `UPDATE users SET ${updateFields.join(
        ", "
      )} WHERE id = $${paramIndex}`;
      console.log(
        "[DB] Executing update query:",
        query,
        "with values:",
        updateValues
      );

      await pool.query(query, updateValues);
      console.log("[DB] Updated user profile in users table");
    }

    // licenseImage is now managed only in users table for simplicity

    return { success: true };
  } catch (error) {
    console.error("[DB] Error updating veterinarian profile:", error);
    throw error;
  }
};

// ============================================================================
// 세부 정보 조회 함수들
// ============================================================================

export const getVeterinarianCareers = async (veterinarianId: string) => {
  const query = `
    SELECT * FROM careers 
    WHERE veterinarian_id = $1 
    ORDER BY start_date DESC
  `;
  const result = await pool.query(query, [veterinarianId]);
  return result.rows;
};

export const getVeterinarianEducations = async (veterinarianId: string) => {
  const query = `
    SELECT * FROM educations 
    WHERE veterinarian_id = $1 
    ORDER BY start_date DESC
  `;
  const result = await pool.query(query, [veterinarianId]);
  return result.rows;
};

export const getVeterinarianLicenses = async (veterinarianId: string) => {
  const query = `
    SELECT * FROM licenses 
    WHERE veterinarian_id = $1 
    ORDER BY acquired_date DESC
  `;
  const result = await pool.query(query, [veterinarianId]);
  return result.rows;
};

export const getVeterinarianSkills = async (veterinarianId: string) => {
  const query = `
    SELECT * FROM skills 
    WHERE veterinarian_id = $1 
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [veterinarianId]);
  return result.rows;
};

export const getVeterinarianEvaluations = async (veterinarianId: string) => {
  const query = `
    SELECT ve.*, h.hospital_name, h.logo_image as hospital_logo
    FROM veterinarian_evaluations ve
    JOIN hospitals h ON ve.hospital_id = h.id
    WHERE ve.veterinarian_id = $1
    ORDER BY ve.created_at DESC
  `;
  const result = await pool.query(query, [veterinarianId]);
  return {
    averageRating:
      result.rows.length > 0
        ? result.rows.reduce(
            (acc, evaluation) => acc + evaluation.overall_rating,
            0
          ) / result.rows.length
        : 0,
    evaluations: result.rows,
  };
};

// ============================================================================
// 대시보드 관련 헬퍼 함수들
// ============================================================================

export const getBookmarkedJobs = async (userId: string, limit?: number) => {
  let query = `
    SELECT j.*, h.hospital_name, h.logo_image as hospital_logo, h.address as hospital_location,
           jb.created_at as bookmarked_date
    FROM job_bookmarks jb
    JOIN jobs j ON jb.job_id = j.id
    JOIN hospitals h ON j.hospital_id = h.id
    WHERE jb.user_id = $1 AND j.is_active = true
    ORDER BY jb.created_at DESC
  `;

  const params = [userId];

  if (limit) {
    query += ` LIMIT $2`;
    params.push(limit.toString());
  }

  const result = await pool.query(query, params);
  return result.rows;
};

export const getVeterinarianApplications = async (
  userId: string,
  sort: string = "latest"
) => {
  let orderBy = 'a."appliedAt" DESC';

  if (sort === "oldest") {
    orderBy = 'a."appliedAt" ASC';
  } else if (sort === "status") {
    orderBy = 'a.status, a."appliedAt" DESC';
  }

  const query = `
    SELECT 
      a.id,
      a."jobId",
      a."veterinarianId",
      a.status,
      a."appliedAt",
      a."createdAt",
      a."updatedAt",
      j.title as job_title, 
      j.position, 
      j.salary,
      hosp."hospitalName" as hospital_name, 
      u.phone as contact_phone, 
      u.email as contact_email,
      u."profileImage" as hospital_logo
    FROM applications a
    JOIN jobs j ON a."jobId" = j.id
    JOIN users u ON j."hospitalId" = u.id
    JOIN hospitals hosp ON u.id = hosp."userId"
    WHERE a."veterinarianId" = $1
    ORDER BY ${orderBy}
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const getRecentApplications = async (
  userId: string,
  limit: number = 5
) => {
  const query = `
    SELECT a.*, j.title as job_title, h.hospital_name
    FROM applications a
    JOIN veterinarians v ON a.veterinarian_id = v.id
    JOIN jobs j ON a.job_id = j.id
    JOIN hospitals h ON j.hospital_id = h.id
    WHERE v.user_id = $1
    ORDER BY a.applied_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [userId, limit]);
  return result.rows;
};

export const getRecruitmentStatus = async (userId: string) => {
  const query = `
    SELECT 
      COUNT(CASE WHEN a.status IN ('PENDING', 'REVIEWING') THEN 1 END) as new_applicants,
      COUNT(CASE WHEN a.status = 'REVIEWING' THEN 1 END) as upcoming_interviews,
      COUNT(CASE WHEN a.status = 'ACCEPTED' THEN 1 END) as completed_recruitments
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN hospitals h ON j.hospital_id = h.id
    WHERE h.user_id = $1
  `;

  const result = await pool.query(query, [userId]);
  const row = result.rows[0];

  return {
    newApplicants: parseInt(row.new_applicants) || 0,
    upcomingInterviews: parseInt(row.upcoming_interviews) || 0,
    completedRecruitments: parseInt(row.completed_recruitments) || 0,
  };
};

export const getActiveJobs = async (userId: string, limit?: number) => {
  let query = `
    SELECT j.*, h.hospital_name, h.logo_image as hospital_logo, h.address as hospital_location
    FROM jobs j
    JOIN hospitals h ON j.hospital_id = h.id
    WHERE h.user_id = $1 AND j.is_active = true
    ORDER BY j.created_at DESC
  `;

  const params = [userId];

  if (limit) {
    query += ` LIMIT $2`;
    params.push(limit.toString());
  }

  const result = await pool.query(query, params);
  return result.rows;
};

export const getRecentApplicants = async (
  userId: string,
  limit: number = 5
) => {
  const query = `
    SELECT a.*, v.nickname as veterinarian_name, v.position, u.profile_image, j.title as job_title
    FROM applications a
    JOIN veterinarians v ON a.veterinarian_id = v.id
    JOIN users u ON v.user_id = u.id
    JOIN jobs j ON a.job_id = j.id
    JOIN hospitals h ON j.hospital_id = h.id
    WHERE h.user_id = $1
    ORDER BY a.applied_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [userId, limit]);
  return result.rows;
};

// ============================================================================
// 채용공고 CRUD 헬퍼 함수들
// ============================================================================

export const createJobPosting = async (jobData: any) => {
  const query = `
    INSERT INTO jobs (
      "hospitalId", title, description, position, "medicalField", "workType", "requiredExperience",
      salary, "salaryType", "workDays", "isDaysNegotiable", "workStartTime", "workEndTime", 
      "isTimeNegotiable", benefits, "educationRequirements", "licenseRequirements", 
      "experienceDetails", preferences, "contactName", "contactPhone", "contactEmail", 
      "contactDepartment", "recruitCount", deadline, "isDeadlineUnlimited", "isDraft", "isPublic"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
    RETURNING *
  `;

  const values = [
    jobData.hospitalId,
    jobData.title,
    jobData.description,
    jobData.position,
    jobData.medicalField,
    jobData.workType,
    jobData.requiredExperience,
    jobData.salary,
    jobData.salaryType,
    jobData.workDays,
    jobData.isDaysNegotiable,
    jobData.workStartTime,
    jobData.workEndTime,
    jobData.isTimeNegotiable,
    jobData.benefits,
    jobData.educationRequirements,
    jobData.licenseRequirements,
    jobData.experienceDetails,
    jobData.preferences,
    jobData.contactName,
    jobData.contactPhone,
    jobData.contactEmail,
    jobData.contactDepartment,
    jobData.recruitCount,
    jobData.deadline,
    jobData.isDeadlineUnlimited,
    jobData.isDraft,
    jobData.isPublic,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const updateJobPosting = async (jobId: string, jobData: any) => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 0;

  // 필드명 매핑 (camelCase -> database column name)
  const fieldMapping: Record<string, string> = {
    title: "title",
    workType: '"workType"',
    isUnlimitedRecruit: '"isUnlimitedRecruit"',
    recruitEndDate: '"recruitEndDate"',
    major: "major",
    experience: "experience",
    position: "position",
    salaryType: '"salaryType"',
    salary: "salary",
    workDays: '"workDays"',
    isWorkDaysNegotiable: '"isWorkDaysNegotiable"',
    workStartTime: '"workStartTime"',
    workEndTime: '"workEndTime"',
    isWorkTimeNegotiable: '"isWorkTimeNegotiable"',
    benefits: "benefits",
    education: "education",
    certifications: "certifications",
    experienceDetails: '"experienceDetails"',
    preferences: "preferences",
    managerName: '"managerName"',
    managerPhone: '"managerPhone"',
    managerEmail: '"managerEmail"',
    department: "department",
  };

  // 동적으로 업데이트할 필드 구성
  Object.entries(jobData).forEach(([key, value]) => {
    if (value !== undefined && fieldMapping[key]) {
      paramCount++;
      fields.push(`${fieldMapping[key]} = $${paramCount}`);
      values.push(value);
    }
  });

  if (fields.length === 0) {
    console.log("updateJobPosting: 업데이트할 필드가 없습니다");
    return null;
  }

  const query = `
    UPDATE jobs 
    SET ${fields.join(", ")}, "updatedAt" = CURRENT_TIMESTAMP 
    WHERE id = $${paramCount + 1}
    RETURNING *
  `;

  console.log("updateJobPosting 쿼리:", { query, values: [...values, jobId] });

  const result = await pool.query(query, [...values, jobId]);
  console.log("updateJobPosting 결과:", {
    rowCount: result.rowCount,
    hasResult: !!result.rows[0],
  });

  return result.rows[0];
};

export const getJobByIdWithHospital = async (jobId: string) => {
  const query = `
    SELECT j.*, h.user_id as hospital_user_id, h.hospital_name
    FROM jobs j
    JOIN hospitals h ON j.hospital_id = h.id
    WHERE j.id = $1
  `;

  const result = await pool.query(query, [jobId]);

  if (result.rows.length === 0) return null;

  const job = result.rows[0];
  return {
    ...job,
    hospital: {
      userId: job.hospital_user_id,
      name: job.hospital_name,
    },
  };
};

export const getApplicationWithJobAndHospital = async (
  applicationId: string
) => {
  const query = `
    SELECT a.*, 
           j.title as job_title, j."hospitalId",
           h."userId" as hospital_id, h."hospitalName", h."userId" as hospital_user_id,
           v.id as veterinarian_user_id, vet.nickname as veterinarian_name
    FROM applications a
    JOIN jobs j ON a."jobId" = j.id
    JOIN hospitals h ON h."userId" = j."hospitalId"
    JOIN users v ON a."veterinarianId" = v.id
    LEFT JOIN veterinarians vet ON v.id = vet."userId"
    WHERE a.id = $1
  `;

  const result = await pool.query(query, [applicationId]);

  if (result.rows.length === 0) return null;

  const app = result.rows[0];
  return {
    ...app,
    job: {
      title: app.job_title,
      hospital: {
        userId: app.hospital_user_id,
        name: app.hospitalName,
      },
    },
    veterinarian: {
      userId: app.veterinarian_user_id,
      name: app.veterinarian_name,
    },
  };
};

// ============================================================================
// 강의영상 관련 헬퍼 함수들
// ============================================================================

export const getLecturesWithPagination = async (params: any) => {
  // 총 개수 조회 쿼리
  let countQuery = `
    SELECT COUNT(*) as total FROM lectures 
    WHERE "deletedAt" IS NULL
  `;

  // 데이터 조회 쿼리
  let query = `
    SELECT * FROM lectures 
    WHERE "deletedAt" IS NULL
  `;

  const queryParams: any[] = [];
  const countParams: any[] = [];
  let paramCount = 0;
  let countParamCount = 0;

  // 키워드 검색
  if (params.keyword) {
    paramCount++;
    countParamCount++;
    const searchCondition = ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
    query += searchCondition;
    countQuery += ` AND (title ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`;
    queryParams.push(`%${params.keyword}%`);
    countParams.push(`%${params.keyword}%`);
  }

  // 카테고리 필터 (medicalField를 category로 매핑) - 다중 카테고리 지원
  if (params.medicalField) {
    const medicalFieldMapping: { [key: string]: string } = {
      surgery: "수술 강의",
      behavior: "행동/심리학",
      emergency: "응급의학",
      dermatology: "피부과",
      internal: "내과",
      radiology: "영상진단",
      anesthesia: "마취학",
      dentistry: "치과",
      other: "기타",
    };

    const categories = params.medicalField
      .split(",")
      .map((cat: string) => cat.trim())
      .filter(Boolean)
      .map((cat: string) => medicalFieldMapping[cat] || cat) // 영어 키를 한국어로 변환
      .filter(Boolean);

    if (categories.length === 1) {
      paramCount++;
      countParamCount++;
      query += ` AND category = $${paramCount}`;
      countQuery += ` AND category = $${countParamCount}`;
      queryParams.push(categories[0]);
      countParams.push(categories[0]);
    } else if (categories.length > 1) {
      paramCount++;
      countParamCount++;
      const placeholders = categories
        .map((_: string, index: number) => `$${paramCount + index}`)
        .join(",");
      query += ` AND category IN (${placeholders})`;
      countQuery += ` AND category IN (${placeholders})`;

      // 배열의 모든 요소를 개별적으로 추가
      categories.forEach((category: string) => {
        queryParams.push(category);
        countParams.push(category);
      });

      // paramCount를 올바르게 업데이트
      paramCount += categories.length - 1;
      countParamCount += categories.length - 1;
    }
  }

  // 정렬
  switch (params.sort) {
    case "latest":
      query += ` ORDER BY "createdAt" DESC`;
      break;
    case "oldest":
      query += ` ORDER BY "createdAt" ASC`;
      break;
    case "view":
      query += ` ORDER BY "viewCount" DESC`;
      break;
    default:
      query += ` ORDER BY "createdAt" DESC`;
  }

  // 페이지네이션
  const offset = (params.page - 1) * params.limit;
  paramCount += 2;
  query += ` LIMIT $${paramCount - 1} OFFSET $${paramCount}`;
  queryParams.push(params.limit, offset);

  // 총 개수 조회
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total);

  // 데이터 조회
  const result = await pool.query(query, queryParams);

  return {
    data: result.rows,
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  };
};

export const getLectureById = async (lectureId: string) => {
  const query = `SELECT * FROM lectures WHERE id = $1 AND "deletedAt" IS NULL`;
  const result = await pool.query(query, [lectureId]);
  return result.rows[0] || null;
};

export const incrementLectureViewCount = async (
  lectureId: string,
  userIdentifier: string,
  userId?: string
): Promise<boolean> => {
  return incrementViewCount("lecture", lectureId, userIdentifier, userId);
};

export const getRecommendedLectures = async (
  lectureId: string,
  medicalField?: string,
  limit: number = 1
) => {
  // 먼저 같은 카테고리 강의를 찾기
  let query = `
    SELECT * FROM lectures 
    WHERE id != $1 AND "deletedAt" IS NULL
  `;

  const params = [lectureId];

  if (medicalField) {
    query += ` AND category = $2`;
    params.push(medicalField);
    query += ` ORDER BY "viewCount" DESC, "createdAt" DESC LIMIT $3`;
    params.push(limit.toString());
  } else {
    query += ` ORDER BY "viewCount" DESC, "createdAt" DESC LIMIT $2`;
    params.push(limit.toString());
  }

  let result = await pool.query(query, params);

  // 같은 카테고리 강의가 충분하지 않은 경우 다른 카테고리 강의도 포함
  if (result.rows.length < limit && medicalField) {
    const remainingLimit = limit - result.rows.length;
    const existingIds = result.rows.map((row) => row.id);

    let additionalQuery = `
      SELECT * FROM lectures 
      WHERE id != $1 AND "deletedAt" IS NULL
      AND category != $2
    `;

    const additionalParams = [lectureId, medicalField];

    if (existingIds.length > 0) {
      const placeholders = existingIds
        .map((_, index) => `$${index + 3}`)
        .join(", ");
      additionalQuery += ` AND id NOT IN (${placeholders})`;
      additionalParams.push(...existingIds);
    }

    additionalQuery += ` ORDER BY "viewCount" DESC, "createdAt" DESC LIMIT $${
      additionalParams.length + 1
    }`;
    additionalParams.push(remainingLimit.toString());

    const additionalResult = await pool.query(
      additionalQuery,
      additionalParams
    );
    result.rows = [...result.rows, ...additionalResult.rows];
  }

  return result.rows;
};

export const getLectureComments = async (lectureId: string) => {
  try {
    const query = `
      SELECT 
        lc.*,
        CASE
          WHEN u.provider != 'NORMAL' THEN u.nickname
          ELSE COALESCE(u.nickname, u."realName")
        END as author_name,
        u."profileImage" as author_profile_image
      FROM lecture_comments lc
      LEFT JOIN users u ON lc."userId" = u.id
      WHERE lc."lectureId" = $1 AND lc."deletedAt" IS NULL
      ORDER BY lc."createdAt" DESC
    `;
    const result = await pool.query(query, [lectureId]);

    // 디버깅을 위한 로그 출력
    console.log(`getLectureComments: Found ${result.rows.length} comments`);

    // 댓글을 계층구조로 정리
    const commentMap = new Map();
    const rootComments: any[] = [];

    // 모든 댓글을 맵에 저장
    result.rows.forEach((comment: any) => {
      const mappedComment = {
        id: comment.id,
        lecture_id: comment.lectureId,
        user_id: comment.userId,
        parent_id: comment.parentId,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author_name: comment.author_name,
        author_profile_image: comment.author_profile_image || null,
        replies: [],
      };
      commentMap.set(comment.id, mappedComment);
    });

    // 부모-자식 관계 설정
    result.rows.forEach((comment: any) => {
      const mappedComment = commentMap.get(comment.id);

      if (comment.parentId) {
        // 대댓글인 경우 부모 댓글의 replies에 추가
        const parentComment = commentMap.get(comment.parentId);
        if (parentComment) {
          parentComment.replies.push(mappedComment);
        }
      } else {
        // 최상위 댓글인 경우 rootComments에 추가
        rootComments.push(mappedComment);
      }
    });

    return rootComments;
  } catch (error) {
    console.log(
      "Comments table not found or error:",
      error instanceof Error ? error.message : error
    );
    // 댓글 테이블이 없으면 빈 배열 반환
    return [];
  }
};

export const getPopularLectures = async (limit: number = 10) => {
  const query = `
    SELECT * FROM lectures 
    WHERE is_public = true AND is_active = true
    ORDER BY view_count DESC, rating DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};

// ============================================================================
// 기타 콘텐츠 관련 헬퍼 함수들
// ============================================================================

export const getBanners = async () => {
  const query = `
    SELECT * FROM banners 
    WHERE is_active = true 
    AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
    AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
    ORDER BY position ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

export const getAdvertisements = async (position?: string) => {
  let query = "SELECT * FROM advertisements WHERE is_active = true";
  const params: any[] = [];

  if (position) {
    query += " AND position = $1";
    params.push(position);
  }

  query += " ORDER BY created_at DESC";

  const result = await pool.query(query, params);
  return result.rows;
};

export const getPopularTransfers = async (
  category: string,
  limit: number = 5
) => {
  const query = `
    SELECT * FROM transfers 
    WHERE category = $1 AND is_active = true AND is_public = true
    ORDER BY view_count DESC, created_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [category, limit]);
  return result.rows;
};

// ============================================================================
// 이력서 관련 복합 함수들
// ============================================================================

export const getFullVeterinarianResume = async (userId: string) => {
  const profile = await getVeterinarianProfile(userId);
  if (!profile) return null;

  const careers = await getVeterinarianCareers(profile.id);
  const educations = await getVeterinarianEducations(profile.id);
  const licenses = await getVeterinarianLicenses(profile.id);
  const skills = await getVeterinarianSkills(profile.id);

  return {
    ...profile,
    careers,
    educations,
    licenses,
    skills,
  };
};

export const updateVeterinarianResume = async (
  userId: string,
  resumeData: any
) => {
  await pool.query("BEGIN");

  try {
    // 기본 프로필 업데이트
    await updateVeterinarianProfile(userId, {
      introduction: resumeData.introduction,
      position: resumeData.position,
      medical_field: resumeData.medicalField,
      preferred_regions: resumeData.preferredRegions,
      expected_salary: resumeData.expectedSalary,
      preferred_work_type: resumeData.preferredWorkType,
      available_start_date: resumeData.availableStartDate,
      preferred_work_days: resumeData.preferredWorkDays,
      is_days_negotiable: resumeData.isDaysNegotiable,
      preferred_work_hours: resumeData.preferredWorkHours,
      is_time_negotiable: resumeData.isTimeNegotiable,
      self_introduction: resumeData.selfIntroduction,
      portfolio_files: resumeData.portfolioFiles,
      linkedin_url: resumeData.snsAccounts?.linkedin,
      instagram_url: resumeData.snsAccounts?.instagram,
      blog_url: resumeData.snsAccounts?.blog,
      is_profile_public: resumeData.isPublic,
    });

    // 경력 업데이트 (기존 삭제 후 재생성)
    const veterinarian = await getVeterinarianProfile(userId);
    if (veterinarian) {
      await pool.query("DELETE FROM careers WHERE veterinarian_id = $1", [
        veterinarian.id,
      ]);

      for (const career of resumeData.careers || []) {
        await pool.query(
          "INSERT INTO careers (veterinarian_id, hospital_name, start_date, end_date, main_tasks) VALUES ($1, $2, $3, $4, $5)",
          [
            veterinarian.id,
            career.hospitalName,
            career.startDate,
            career.endDate,
            career.mainTasks,
          ]
        );
      }

      // 학력 업데이트
      await pool.query("DELETE FROM educations WHERE veterinarian_id = $1", [
        veterinarian.id,
      ]);

      for (const education of resumeData.educations || []) {
        await pool.query(
          "INSERT INTO educations (veterinarian_id, degree, is_graduated, school_name, major, gpa, max_gpa, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [
            veterinarian.id,
            education.degree,
            education.isGraduated,
            education.schoolName,
            education.major,
            education.gpa,
            education.maxGpa,
            education.startDate,
            education.endDate,
          ]
        );
      }

      // 자격증 업데이트
      await pool.query("DELETE FROM licenses WHERE veterinarian_id = $1", [
        veterinarian.id,
      ]);

      for (const license of resumeData.licenses || []) {
        await pool.query(
          "INSERT INTO licenses (veterinarian_id, name, level, acquired_date, issuing_organization) VALUES ($1, $2, $3, $4, $5)",
          [
            veterinarian.id,
            license.name,
            license.level,
            license.acquiredDate,
            license.issuingOrganization,
          ]
        );
      }

      // 기술 업데이트
      await pool.query("DELETE FROM skills WHERE veterinarian_id = $1", [
        veterinarian.id,
      ]);

      for (const skill of resumeData.skills || []) {
        await pool.query(
          "INSERT INTO skills (veterinarian_id, field, skill_name, proficiency, description) VALUES ($1, $2, $3, $4, $5)",
          [
            veterinarian.id,
            skill.field,
            skill.skillName,
            skill.proficiency,
            skill.description,
          ]
        );
      }
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
};

// ============================================================================
// 검증 및 유틸리티 함수들
// ============================================================================

export const isJobDeadlinePassed = (deadline: string | null): boolean => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

export const calculateApplicationsStats = (applications: any[]) => {
  return {
    total: applications.length,
    pending: applications.filter((app) =>
      ["PENDING", "REVIEWING"].includes(app.status)
    ).length,
    accepted: applications.filter((app) => app.status === "ACCEPTED").length,
    rejected: applications.filter((app) => app.status === "REJECTED").length,
  };
};

export const sanitizeUserInput = (input: string): string => {
  return input.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
};

export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount);
};

export const parseWorkDays = (workDays: string[]): string => {
  const dayMap: Record<string, string> = {
    monday: "월",
    tuesday: "화",
    wednesday: "수",
    thursday: "목",
    friday: "금",
    saturday: "토",
    sunday: "일",
  };

  return workDays.map((day) => dayMap[day] || day).join(", ");
};

export const calculateExperienceYears = (
  startDate: string,
  endDate?: string
): number => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(diffYears * 10) / 10; // 소수점 첫째자리까지
};

// ============================================================================
// 이메일 및 알림 발송 관련 함수들
// ============================================================================

export const sendNotificationEmail = async (
  to: string,
  subject: string,
  content: string,
  type: "application" | "status_update" | "interview" | "general" = "general"
) => {
  // 실제 구현에서는 SendGrid, AWS SES 등을 사용
  try {
    console.log(`Email sent to ${to}: ${subject}`);

    // 개발 환경에서는 콘솔 로그로 대체
    if (process.env.NODE_ENV === "development") {
      console.log("=== EMAIL NOTIFICATION ===");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Type: ${type}`);
      console.log(`Content: ${content}`);
      console.log("========================");
      return true;
    }

    // 프로덕션에서는 실제 이메일 발송 로직
    // await emailService.send({ to, subject, content, type });

    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
};

export const sendSMSNotification = async (
  to: string,
  message: string,
  type: "verification" | "notification" = "notification"
) => {
  try {
    console.log(`SMS sent to ${to}: ${message}`);

    if (process.env.NODE_ENV === "development") {
      console.log("=== SMS NOTIFICATION ===");
      console.log(`To: ${to}`);
      console.log(`Type: ${type}`);
      console.log(`Message: ${message}`);
      console.log("=======================");
      return true;
    }

    // 프로덕션에서는 실제 SMS 발송 로직 (AWS SNS, Twilio 등)
    // await smsService.send({ to, message, type });

    return true;
  } catch (error) {
    console.error("SMS sending failed:", error);
    return false;
  }
};

// ============================================================================
// 캐싱 관련 함수들
// ============================================================================

const cache = new Map<string, { data: any; expiry: number }>();

export const getCachedData = <T>(key: string): T | null => {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
};

export const setCachedData = <T>(
  key: string,
  data: T,
  ttlSeconds: number = 300
): void => {
  const expiry = Date.now() + ttlSeconds * 1000;
  cache.set(key, { data, expiry });
};

export const clearCache = (pattern?: string): void => {
  if (pattern) {
    for (const key of Array.from(cache.keys())) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// ============================================================================
// 로깅 및 모니터링 함수들
// ============================================================================

export const logUserActivity = async (
  userId: string,
  action: string,
  details?: any,
  ipAddress?: string
) => {
  try {
    const query = `
      INSERT INTO user_activity_logs (user_id, action, details, ip_address)
      VALUES ($1, $2, $3, $4)
    `;

    await pool.query(query, [
      userId,
      action,
      JSON.stringify(details),
      ipAddress,
    ]);
  } catch (error) {
    console.error("Failed to log user activity:", error);
  }
};

export const logApiRequest = async (
  method: string,
  endpoint: string,
  userId?: string,
  responseTime?: number,
  statusCode?: number,
  errorMessage?: string
) => {
  try {
    const query = `
      INSERT INTO api_request_logs (method, endpoint, user_id, response_time, status_code, error_message)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await pool.query(query, [
      method,
      endpoint,
      userId,
      responseTime,
      statusCode,
      errorMessage,
    ]);
  } catch (error) {
    console.error("Failed to log API request:", error);
  }
};

// ============================================================================
// 보안 관련 함수들
// ============================================================================

export const validateFileUpload = (
  file: File,
  allowedTypes: string[],
  maxSize: number
): { isValid: boolean; error?: string } => {
  // 파일 크기 검증
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `파일 크기가 ${Math.round(maxSize / 1024 / 1024)}MB를 초과합니다`,
    };
  }

  // 파일 타입 검증
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "허용되지 않는 파일 형식입니다",
    };
  }

  // 파일명 검증 (특수문자 제한)
  const fileName = file.name;
  if (!/^[a-zA-Z0-9가-힣._-]+$/.test(fileName)) {
    return {
      isValid: false,
      error: "파일명에 특수문자가 포함되어 있습니다",
    };
  }

  return { isValid: true };
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "").substring(0, 100); // 최대 100자
};

export const generateSecureToken = (): string => {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
};

export const hashSensitiveData = (data: string): string => {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(data).digest("hex");
};

// ============================================================================
// 데이터 변환 및 포맷팅 함수들
// ============================================================================

export const formatJobForAPI = (job: any): any => {
  return {
    id: job.id,
    title: job.title,
    hospitalName: job.hospital_name,
    deadline: job.deadline,
    isBookmarked: false, // 실제로는 사용자별로 확인 필요
    position: job.position,
    workType: job.work_type,
    hospitalLocation: job.hospital_location || job.address,
    requiredExperience: job.required_experience,
    hashtags: generateJobHashtags(job),
    isPublic: job.is_public,
    isNew: isNewContent(job.created_at),
    applicantCount: job.applicant_count || 0,
    viewCount: job.view_count || 0,
    // 상세 정보 (상세 조회시에만)
    ...(job.description && {
      description: job.description,
      workConditions: {
        workType: job.work_type,
        workDays: job.work_days || [],
        workHours: formatWorkHours(job.work_start_time, job.work_end_time),
        salary: job.salary,
        benefits: job.benefits,
      },
      requirements: {
        education: job.education_requirements || [],
        licenses: job.license_requirements || [],
        experience: job.required_experience,
      },
      preferences: job.preferences || [],
      hospitalInfo: {
        id: job.hospital_id,
        logo: job.hospital_logo,
        name: job.hospital_name,
        address: job.address,
        detailAddress: job.detail_address,
        website: job.website,
        phone: job.hospital_phone,
      },
    }),
  };
};

export const formatResumeForAPI = (resume: any): any => {
  return {
    id: resume.id,
    name: resume.nickname || resume.name,
    profileImage: resume.profile_image,
    isBookmarked: false, // 실제로는 사용자별로 확인 필요
    preferredPosition: resume.position,
    preferredWorkType: resume.preferred_work_type,
    experienceLevel: resume.total_experience,
    hashtags: generateHashtags(resume),
    isPublic: resume.is_profile_public,
    lastLogin: resume.last_login_at,
    preferredRegions: resume.preferred_regions || [],
    // 상세 정보 (상세 조회시에만)
    ...(resume.introduction !== undefined && {
      introduction: resume.introduction,
      phone: resume.is_phone_public ? resume.phone : null,
      email: resume.is_email_public ? resume.email : null,
      currentHospital: resume.current_hospital,
      totalExperience: resume.total_experience,
      availableStartDate: resume.available_start_date,
      birthDate: resume.birth_date,
      medicalField: resume.medical_field,
      workPreferences: {
        workType: resume.preferred_work_type,
        salary: resume.expected_salary,
        workDays: resume.preferred_work_days || [],
        isDaysNegotiable: resume.is_days_negotiable,
        workHours: resume.preferred_work_hours,
        isTimeNegotiable: resume.is_time_negotiable,
        regions: resume.preferred_regions || [],
        availableStartDate: resume.available_start_date,
      },
      careers: resume.careers || [],
      educations: resume.educations || [],
      licenses: resume.licenses || [],
      skills: resume.skills || [],
      evaluations: resume.evaluations || { averageRating: 0, evaluations: [] },
      selfIntroduction: resume.self_introduction,
    }),
  };
};

const generateJobHashtags = (job: any): string[] => {
  const hashtags: string[] = [];

  if (job.medical_field) {
    const fieldMap: Record<string, string> = {
      internal: "내과",
      surgery: "외과",
      dermatology: "피부과",
      dental: "치과",
    };
    hashtags.push(`#${fieldMap[job.medical_field] || job.medical_field}`);
  }

  if (job.work_type) {
    const workTypeMap: Record<string, string> = {
      full_time: "정규직",
      part_time: "파트타임",
    };
    hashtags.push(`#${workTypeMap[job.work_type] || job.work_type}`);
  }

  if (job.required_experience) {
    hashtags.push(`#${job.required_experience}`);
  }

  return hashtags.slice(0, 3);
};

const isNewContent = (createdAt: string): boolean => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7; // 7일 이내를 '새 글'로 간주
};

const formatWorkHours = (startTime?: string, endTime?: string): string => {
  if (!startTime || !endTime) return "";
  return `${startTime} - ${endTime}`;
};

// ============================================================================
// 검색 및 필터링 고급 함수들
// ============================================================================

export const buildAdvancedSearchQuery = (
  baseQuery: string,
  filters: Record<string, any>,
  searchableFields: string[]
): { query: string; params: any[] } => {
  let query = baseQuery;
  const params: any[] = [];
  let paramCount = 0;

  // 키워드 검색 (여러 필드에 대해)
  if (filters.keyword && searchableFields.length > 0) {
    paramCount++;
    const searchConditions = searchableFields
      .map((field) => `${field} ILIKE ${paramCount}`)
      .join(" OR ");
    query += ` AND (${searchConditions})`;
    params.push(`%${filters.keyword}%`);
  }

  // 날짜 범위 필터
  if (filters.dateFrom) {
    paramCount++;
    query += ` AND created_at >= ${paramCount}`;
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    paramCount++;
    query += ` AND created_at <= ${paramCount}`;
    params.push(filters.dateTo);
  }

  // 배열 필터 (예: 지역, 기술 등)
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      paramCount++;
      query += ` AND ${key} = ANY(${paramCount})`;
      params.push(value);
    }
  });

  // 범위 필터 (예: 급여, 경력 등)
  if (filters.salaryMin) {
    paramCount++;
    query += ` AND salary_numeric >= ${paramCount}`;
    params.push(filters.salaryMin);
  }

  if (filters.salaryMax) {
    paramCount++;
    query += ` AND salary_numeric <= ${paramCount}`;
    params.push(filters.salaryMax);
  }

  return { query, params };
};

export const applySorting = (
  query: string,
  sortField: string,
  sortDirection: "ASC" | "DESC" = "DESC"
): string => {
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "view_count",
    "applicant_count",
    "rating",
  ];

  if (!allowedSortFields.includes(sortField)) {
    sortField = "created_at";
  }

  return `${query} ORDER BY ${sortField} ${sortDirection}`;
};

export const applyPagination = (
  query: string,
  page: number,
  limit: number
): { query: string; offset: number } => {
  const offset = Math.max(0, (page - 1) * limit);
  const paginatedQuery = `${query} LIMIT ${limit} OFFSET ${offset}`;

  return { query: paginatedQuery, offset };
};

// ============================================================================
// 데이터 검증 및 정제 함수들
// ============================================================================

export const validateJobData = (
  jobData: any
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 필수 필드 검증
  if (!jobData.title?.trim()) {
    errors.push("제목을 입력해주세요");
  }

  if (!jobData.description?.trim()) {
    errors.push("상세 설명을 입력해주세요");
  }

  if (!jobData.position?.trim()) {
    errors.push("모집 직책을 입력해주세요");
  }

  // 마감일 검증
  if (jobData.deadline) {
    const deadline = new Date(jobData.deadline);
    const now = new Date();

    if (deadline <= now) {
      errors.push("마감일은 현재 시간보다 이후여야 합니다");
    }
  }

  // 모집 인원 검증
  if (
    jobData.recruitCount &&
    (jobData.recruitCount < 1 || jobData.recruitCount > 100)
  ) {
    errors.push("모집 인원은 1명 이상 100명 이하여야 합니다");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+82|0)?[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone);
};

export const validateResumeData = (
  resumeData: any
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 필수 필드 검증
  if (!resumeData.name?.trim()) {
    errors.push("이름을 입력해주세요");
  }

  // 이메일 형식 검증
  if (resumeData.email && !validateEmail(resumeData.email)) {
    errors.push("올바른 이메일 형식을 입력해주세요");
  }

  // 전화번호 형식 검증
  if (resumeData.phone && !validatePhone(resumeData.phone)) {
    errors.push("올바른 전화번호 형식을 입력해주세요");
  }

  // 생년월일 검증
  if (resumeData.birthDate) {
    const birthDate = new Date(resumeData.birthDate);
    const now = new Date();
    const age = now.getFullYear() - birthDate.getFullYear();

    if (age < 18 || age > 100) {
      errors.push("생년월일을 다시 확인해주세요");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// 통계 및 분석 함수들
// ============================================================================

export const getJobStatistics = async (hospitalId?: string) => {
  let query = `
    SELECT 
      COUNT(*) as total_jobs,
      COUNT(CASE WHEN is_active = true THEN 1 END) as active_jobs,
      AVG(view_count) as avg_view_count,
      AVG(applicant_count) as avg_applicant_count
    FROM jobs
  `;

  const params: any[] = [];

  if (hospitalId) {
    query += ` WHERE hospital_id = $1`;
    params.push(hospitalId);
  }

  const result = await pool.query(query, params);
  return result.rows[0];
};

export const getUserEngagementStats = async (
  userId: string,
  userType: "veterinarian" | "hospital"
) => {
  const queries = {
    veterinarian: `
      SELECT 
        COUNT(DISTINCT a.id) as total_applications,
        COUNT(DISTINCT jb.id) as total_bookmarks,
        COUNT(DISTINCT vl.id) as total_views
      FROM users u
      LEFT JOIN veterinarians v ON u.id = v.user_id
      LEFT JOIN applications a ON v.id = a.veterinarian_id
      LEFT JOIN job_bookmarks jb ON u.id = jb.user_id
      LEFT JOIN view_logs vl ON u.id = vl.user_id
      WHERE u.id = $1
    `,
    hospital: `
      SELECT 
        COUNT(DISTINCT j.id) as total_jobs,
        COUNT(DISTINCT a.id) as total_applicants,
        COUNT(DISTINCT rb.id) as total_bookmarks
      FROM users u
      LEFT JOIN hospitals h ON u.id = h.user_id
      LEFT JOIN jobs j ON h.id = j.hospital_id
      LEFT JOIN applications a ON j.id = a.job_id
      LEFT JOIN resume_bookmarks rb ON u.id = rb.user_id
      WHERE u.id = $1
    `,
  };

  const result = await pool.query(queries[userType], [userId]);
  return result.rows[0];
};

export const getTrendingSearchTerms = async (limit: number = 10) => {
  const query = `
    SELECT search_term, COUNT(*) as search_count
    FROM search_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY search_term
    ORDER BY search_count DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};

// ============================================================================
// 클린업 및 유지보수 함수들
// ============================================================================

export const cleanupExpiredSessions = async (): Promise<number> => {
  const query = `
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP
  `;

  const result = await pool.query(query);
  return result.rowCount || 0;
};

export const cleanupOldLogs = async (
  daysToKeep: number = 30
): Promise<number> => {
  const query = `
    DELETE FROM view_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'
  `;

  const result = await pool.query(query);
  return result.rowCount || 0;
};

export const updateJobStatistics = async (): Promise<void> => {
  await pool.query(`
    UPDATE jobs 
    SET applicant_count = (
      SELECT COUNT(*) FROM applications 
      WHERE job_id = jobs.id
    )
  `);
};

export const archiveOldData = async (
  tableName: string,
  daysToKeep: number = 365
): Promise<number> => {
  // 실제 구현에서는 백업 후 삭제하는 로직
  const query = `
    DELETE FROM ${tableName} 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'
    AND deleted_at IS NOT NULL
  `;

  const result = await pool.query(query);
  return result.rowCount || 0;
};

// ============================================================================
// 데이터베이스 연결 관리
// ============================================================================

export const closeDatabase = async (): Promise<void> => {
  await pool.end();
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
};

// ============================================================================
// 추천 시스템 헬퍼 함수들
// ============================================================================

export const getRecommendedJobs = async (
  userId?: string,
  limit: number = 5
) => {
  // 실제로는 머신러닝 모델을 사용하여 개인화된 추천
  // 여기서는 간단한 규칙 기반 추천

  if (userId) {
    // 사용자의 프로필 정보를 기반으로 추천
    const userProfile = await getVeterinarianProfile(userId);

    let query = `
      SELECT j.*, h.hospital_name, h.logo_image as hospital_logo, h.address as hospital_location
      FROM jobs j
      JOIN hospitals h ON j.hospital_id = h.id
      WHERE j.is_active = true AND j.is_public = true
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (userProfile?.medical_field) {
      paramCount++;
      query += ` AND j.medical_field = $${paramCount}`;
      params.push(userProfile.medical_field);
    }

    if (userProfile?.preferred_regions?.length > 0) {
      paramCount++;
      query += ` AND h.address ILIKE ${paramCount}`;
      params.push(`%${userProfile.preferred_regions[0]}%`);
    }

    query += ` ORDER BY j.created_at DESC, j.view_count DESC LIMIT ${
      paramCount + 1
    }`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  } else {
    // 로그인하지 않은 사용자에게는 인기 공고 추천
    return await getPopularJobs(limit);
  }
};

export const getRecommendedTalents = async (
  userId?: string,
  limit: number = 5
) => {
  if (userId) {
    // 병원의 요구사항을 기반으로 추천
    const hospitalProfile = await getHospitalProfile(userId);

    let query = `
      SELECT v.*, u.profile_image, u.last_login_at
      FROM veterinarians v
      JOIN users u ON v.user_id = u.id
      WHERE v.is_profile_public = true AND u.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (hospitalProfile?.medical_fields?.length > 0) {
      paramCount++;
      query += ` AND v.medical_field = ANY(${paramCount})`;
      params.push(hospitalProfile.medical_fields);
    }

    query += ` ORDER BY v.updated_at DESC LIMIT ${paramCount + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  } else {
    // 로그인하지 않은 사용자에게는 최신 인재 추천
    return await getRecentTalents(limit);
  }
};

export const getRecentTalents = async (limit: number = 10) => {
  const query = `
    SELECT v.*, u.profile_image, u.last_login_at
    FROM veterinarians v
    JOIN users u ON v.user_id = u.id
    WHERE v.is_profile_public = true AND u.deleted_at IS NULL
    ORDER BY v.updated_at DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};

// ============================================================================
// 내보내기 - 모든 함수들은 individual named exports로 제공됩니다
// ============================================================================

// 누락된 함수들 구현
export const getUserBySocialProvider = async (
  provider: string,
  providerId: string
) => {
  console.log("[getUserBySocialProvider] Querying with:", {
    provider,
    providerId,
  });

  const query = `
    SELECT 
      u.id,
      u."loginId",
      u.email,
      u.phone,
      u.nickname,
      u."realName",
      u."birthDate",
      u."userType",
      u."profileImage",
      u.provider,
      u."universityEmail",
      u."termsAgreedAt",
      u."privacyAgreedAt",
      u."marketingAgreedAt",
      u."isActive",
      u."createdAt",
      u."updatedAt",
      u."hospitalName",
      u."hospitalLogo",
      u."licenseImage",
      u."passwordHash" as password
    FROM users u 
    JOIN social_accounts sa ON u.id = sa."userId" 
    WHERE sa.provider = $1 AND sa."providerId" = $2 AND (u."isActive" = true OR u."isActive" IS NULL)
  `;

  try {
    const result = await pool.query(query, [provider, providerId]);
    console.log(
      "[getUserBySocialProvider] Query result rows:",
      result.rows.length
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("[getUserBySocialProvider] Database error:", error);
    throw error;
  }
};

export const getUserSocialAccounts = async (userId: string) => {
  const query = `
    SELECT provider, "providerId", "createdAt" 
    FROM social_accounts 
    WHERE "userId" = $1
    ORDER BY "createdAt" DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const linkSocialAccount = async (userId: string, socialData: any) => {
  console.log("[linkSocialAccount] Called with:", { userId, socialData });

  const query = `
    INSERT INTO social_accounts (id, "userId", provider, "providerId", "accessToken", "refreshToken", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (provider, "providerId") 
    DO UPDATE SET 
      "userId" = $2,
      "accessToken" = $5,
      "refreshToken" = $6,
      "updatedAt" = NOW()
    RETURNING *
  `;
  const values = [
    uuidv4(), // ID를 명시적으로 생성
    userId,
    socialData.provider,
    socialData.providerId,
    socialData.accessToken || null,
    socialData.refreshToken || null,
  ];

  console.log("[linkSocialAccount] Query values:", values);

  try {
    const result = await pool.query(query, values);
    console.log("[linkSocialAccount] Success:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error("[linkSocialAccount] Error:", error);
    throw error;
  }
};

export const createSocialUser = async (userData: any) => {
  const user = await createUser({
    username: userData.name || userData.email,
    email: userData.email,
    passwordHash: null, // SNS 로그인은 패스워드 없음
    userType: userData.userType.toUpperCase(),
    phone: userData.phone || null,
    profileImage: userData.profileImage || null,
    termsAgreedAt: new Date(),
    privacyAgreedAt: new Date(),
    marketingAgreedAt: null,
  });

  // 소셜 계정 연결
  await linkSocialAccount(user.id, {
    provider: userData.provider,
    providerId: userData.providerId,
    accessToken: userData.accessToken,
    refreshToken: userData.refreshToken,
  });

  // 마지막 로그인 시간 업데이트
  await updateLastLogin(user.id);

  return user;
};

export const isUserProfileComplete = async (
  userId: string,
  userType: string
) => {
  if (
    userType === "VETERINARIAN" ||
    userType === "VETERINARY_STUDENT" ||
    userType === "veterinary-student"
  ) {
    // Check if the user has basic profile information in the users table
    const profileQuery = `
      SELECT id, nickname, "birthDate", "realName" 
      FROM users 
      WHERE id = $1 AND "isActive" = true
    `;

    const profileResult = await pool.query(profileQuery, [userId]);

    if (profileResult.rows.length === 0) {
      return false;
    }

    const user = profileResult.rows[0];
    // Profile is complete if user has nickname and realName (birthDate is optional)
    return !!(user.nickname && user.realName);
  } else if (userType === "HOSPITAL" || userType === "hospital") {
    const query = `SELECT id FROM hospitals WHERE user_id = $1 OR "userId" = $1`;
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0;
  }
  return false;
};

export const getSocialUserInfo = async (
  provider: string,
  accessToken: string
) => {
  // 소셜 로그인 제공자별 사용자 정보 조회 로직
  return { provider, id: "sample_id", email: "sample@email.com" };
};

export const unlinkSocialAccount = async (userId: string, provider: string) => {
  const query = `DELETE FROM social_accounts WHERE "userId" = $1 AND provider = $2`;
  const result = await pool.query(query, [userId, provider]);
  return (result.rowCount ?? 0) > 0;
};

export const getUserById = async (userId: string) => {
  const query = `SELECT * FROM users WHERE id = $1 AND "deletedAt" IS NULL AND "isActive" = true`;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

export const getApplicationById = async (applicationId: string) => {
  const query = `
    SELECT 
      a.*,
      j.title as job_title,
      j.position as job_position,
      j."hospitalId",
      h."hospitalName" as hospital_name,
      v.nickname as veterinarian_nickname,
      u.email as veterinarian_email,
      u.phone as veterinarian_phone,
      v."realName" as veterinarian_realName,
      dr.id as resume_id
    FROM applications a
    JOIN jobs j ON a."jobId" = j.id
    JOIN users hu ON j."hospitalId" = hu.id
    JOIN hospitals h ON hu.id = h."userId"
    JOIN users u ON a."veterinarianId" = u.id
    LEFT JOIN veterinarians v ON u.id = v."userId"
    LEFT JOIN resumes dr ON dr."userId" = u.id
    WHERE a.id = $1
  `;
  const result = await pool.query(query, [applicationId]);

  if (result.rows.length === 0) {
    return null;
  }

  const application = result.rows[0];

  // 구조를 맞춰서 반환
  return {
    id: application.id,
    status: application.status,
    appliedAt: application.appliedAt,
    veterinarianId: application.veterinarianId,
    jobId: application.jobId,
    job: {
      id: application.jobId,
      title: application.job_title,
      position: application.job_position,
      hospitalId: application.hospitalId,
      hospital: {
        id: application.hospitalId,
        name: application.hospital_name,
      },
    },
    veterinarian: {
      id: application.veterinarianId,
      nickname: application.veterinarian_nickname,
      email: application.veterinarian_email,
      phone: application.veterinarian_phone,
      realName: application.veterinarian_realName,
      resumeId: application.resume_id,
    },
  };
};

export const getHospitalApplicants = async (
  hospitalId: string,
  filters?: {
    status?: string;
    jobId?: string;
    page?: number;
    limit?: number;
  }
) => {
  const { status = "all", jobId, page = 1, limit = 20 } = filters || {};
  const offset = (page - 1) * limit;

  console.log("[DB] getHospitalApplicants called with:", {
    hospitalId,
    filters,
  });

  // First, let's check what jobs exist for this hospital
  const jobsCheckQuery = `
    SELECT j.id, j.title, j."hospitalId", h."userId", h.id as hospital_id
    FROM jobs j
    LEFT JOIN hospitals h ON j."hospitalId" = h."userId"
    WHERE h.id = $1
  `;
  const jobsCheck = await pool.query(jobsCheckQuery, [hospitalId]);
  console.log("[DB] Jobs for hospital:", jobsCheck.rows);

  // Also check if there are any applications
  const appsCheckQuery = `
    SELECT a.id, a."jobId", a."veterinarianId", j.title
    FROM applications a
    JOIN jobs j ON a."jobId" = j.id
    WHERE j."hospitalId" IN (
      SELECT "userId" FROM hospitals WHERE id = $1
    )
  `;
  const appsCheck = await pool.query(appsCheckQuery, [hospitalId]);
  console.log(
    "[DB] Applications found:",
    appsCheck.rows.length,
    appsCheck.rows
  );

  // Build WHERE conditions
  // Since hospitalId from getHospitalByUserId is the hospitals.id, we need to join through hospitals table
  const conditions = [`h.id = $1`];
  const params: any[] = [hospitalId];
  let paramIndex = 2;

  if (status && status !== "all") {
    conditions.push(`a.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (jobId) {
    conditions.push(`a."jobId" = $${paramIndex}`);
    params.push(jobId);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  // Count query for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM applications a
    JOIN users u ON a."veterinarianId" = u.id
    JOIN jobs j ON a."jobId" = j.id
    JOIN hospitals h ON j."hospitalId" = h."userId"
    LEFT JOIN resumes dr ON dr."userId" = u.id
    WHERE ${whereClause}
  `;
  console.log("[DB] Count query:", countQuery);
  console.log("[DB] Query params:", params);

  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0]?.total || 0);
  console.log("[DB] Total applicants found:", total);

  // Main query with pagination
  params.push(limit);
  params.push(offset);

  const query = `
    SELECT 
      a.*,
      u.email,
      u.phone,
      u."profileImage",
      COALESCE(dr.name, u."realName", u.nickname) as applicant_name,
      j.title as job_title,
      j.position as job_position,
      dr.id as resume_id
    FROM applications a
    JOIN users u ON a."veterinarianId" = u.id
    JOIN jobs j ON a."jobId" = j.id
    JOIN hospitals h ON j."hospitalId" = h."userId"
    LEFT JOIN resumes dr ON dr."userId" = u.id
    WHERE ${whereClause}
    ORDER BY a."appliedAt" DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  console.log("[DB] Main query:", query);
  console.log("[DB] Query params:", params);

  const result = await pool.query(query, params);
  console.log("[DB] Query result rows:", result.rows.length);

  return {
    applicants: result.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getHospitalJobPostings = async (hospitalId: string) => {
  // 삭제된 채용공고도 포함하여 조회 (my-jobs 페이지에서 관리하기 위해)
  const query = `SELECT * FROM jobs WHERE "hospitalId" = $1 ORDER BY "createdAt" DESC`;
  const result = await pool.query(query, [hospitalId]);
  return result.rows;
};

export const verifyPassword = async (password: string, hash: string) => {
  // 실제로는 bcrypt.compare 사용
  return password === hash;
};

export const updateUserPassword = async (
  userId: string,
  newPasswordHash: string
) => {
  const query = `UPDATE users SET "passwordHash" = $1 WHERE id = $2`;
  const result = await pool.query(query, [newPasswordHash, userId]);
  return (result.rowCount ?? 0) > 0;
};

export const getUserBookmarks = async (userId: string) => {
  const query = `
    SELECT 'job' as type, j.* FROM job_bookmarks jb
    JOIN jobs j ON jb.job_id = j.id
    WHERE jb.user_id = $1 AND jb.deleted_at IS NULL
    UNION
    SELECT 'resume' as type, r.* FROM resume_bookmarks rb
    JOIN resumes r ON rb.resume_id = r.id
    WHERE rb.user_id = $1 AND rb.deleted_at IS NULL
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const checkJobBookmarkExists = async (userId: string, jobId: string) => {
  const query = `SELECT id FROM job_bookmarks WHERE "userId" = $1 AND "jobId" = $2 AND "deletedAt" IS NULL`;
  const result = await pool.query(query, [userId, jobId]);
  return result.rows.length > 0;
};

export const removeJobBookmark = async (userId: string, jobId: string) => {
  const query = `UPDATE job_bookmarks SET "deletedAt" = NOW() WHERE "userId" = $1 AND "jobId" = $2`;
  const result = await pool.query(query, [userId, jobId]);
  return (result.rowCount ?? 0) > 0;
};

export const checkLectureBookmarkExists = async (
  userId: string,
  lectureId: string
) => {
  const query = `SELECT id FROM lecture_bookmarks WHERE user_id = $1 AND lecture_id = $2 AND deleted_at IS NULL`;
  const result = await pool.query(query, [userId, lectureId]);
  return result.rows.length > 0;
};

export const createLectureBookmark = async (
  userId: string,
  lectureId: string
) => {
  const query = `INSERT INTO lecture_bookmarks (user_id, lecture_id) VALUES ($1, $2) RETURNING *`;
  const result = await pool.query(query, [userId, lectureId]);
  return result.rows[0];
};

export const removeLectureBookmark = async (
  userId: string,
  lectureId: string
) => {
  const query = `UPDATE lecture_bookmarks SET deleted_at = NOW() WHERE user_id = $1 AND lecture_id = $2`;
  const result = await pool.query(query, [userId, lectureId]);
  return (result.rowCount ?? 0) > 0;
};

export const getLectureCommentById = async (commentId: string) => {
  const query = `
    SELECT 
      lc.*,
      COALESCE(v.nickname, vs.nickname, h."hospitalName") as author_name,
      u."profileImage" as author_profile_image,
      COALESCE(v."realName", vs."realName", h."representativeName", h."hospitalName") as author_display_name
    FROM lecture_comments lc
    LEFT JOIN users u ON lc."userId" = u.id
    LEFT JOIN veterinarians v ON u.id = v."userId"
    LEFT JOIN veterinary_students vs ON u.id = vs."userId"
    LEFT JOIN hospitals h ON u.id = h."userId"
    WHERE lc.id = $1 AND lc."deletedAt" IS NULL
  `;
  const result = await pool.query(query, [commentId]);
  return result.rows[0] || null;
};

export const getLectureCommentReplies = async (commentId: string) => {
  const query = `
    SELECT 
      lc.*,
      u."profileImage" as author_profile_image,
      u."userType",
      v."nickname" as vet_nickname,
      vs."nickname" as vs_nickname,
      h."hospitalName",
      h."hospitalLogo",
      h."representativeName"
    FROM lecture_comments lc
    LEFT JOIN users u ON lc."userId" = u.id
    LEFT JOIN veterinarians v ON u.id = v."userId"
    LEFT JOIN veterinary_students vs ON u.id = vs."userId"
    LEFT JOIN hospitals h ON u.id = h."userId"
    WHERE lc."parentId" = $1 AND lc."deletedAt" IS NULL
    ORDER BY lc."createdAt" ASC
  `;
  const result = await pool.query(query, [commentId]);

  // 답글도 병원명 우선 표시 로직 적용
  return result.rows.map((reply: any) => {
    let displayName;
    if (reply.userType === "HOSPITAL") {
      displayName = reply.hospitalName || "병원명 미설정";
      console.log(`Reply - Using hospitalName: ${displayName}`);
    } else if (reply.userType === "VETERINARIAN") {
      displayName = reply.vet_nickname;
    } else if (reply.userType === "VETERINARY_STUDENT") {
      displayName = reply.vs_nickname;
    } else {
      displayName = "익명 사용자";
    }

    const profileImage =
      reply.userType === "HOSPITAL" && reply.hospitalLogo
        ? reply.hospitalLogo
        : reply.author_profile_image || null;

    return {
      ...reply,
      author_name: displayName,
      author_display_name: displayName,
      author_profile_image: profileImage,
    };
  });
};

export const createLectureComment = async (commentData: {
  lectureId: string;
  userId: string;
  content: string;
  parentId?: string;
}) => {
  const commentId = `comment_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2)}`;

  const query = `
    INSERT INTO lecture_comments (id, "lectureId", "userId", "parentId", content, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `;
  const values = [
    commentId,
    commentData.lectureId,
    commentData.userId,
    commentData.parentId || null,
    commentData.content,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const updateLectureComment = async (
  commentId: string,
  content: string
) => {
  const query = `
    UPDATE lecture_comments 
    SET content = $1, "updatedAt" = NOW() 
    WHERE id = $2 AND "deletedAt" IS NULL
    RETURNING *
  `;
  const result = await pool.query(query, [content, commentId]);
  return result.rows[0] || null;
};

export const deleteLectureComment = async (commentId: string) => {
  const query = `
    UPDATE lecture_comments 
    SET "deletedAt" = NOW() 
    WHERE id = $1 AND "deletedAt" IS NULL
    RETURNING id
  `;
  const result = await pool.query(query, [commentId]);
  return (result.rowCount ?? 0) > 0;
};

export const getForumById = async (forumId: string) => {
  const query = `
    SELECT 
      fp.*,
      COALESCE(v.nickname, vs.nickname, h."hospitalName") as author_name,
      u."profileImage" as author_profile_image,
      u."userType",
      v."nickname" as vet_nickname,
      vs."nickname" as vs_nickname,
      h."hospitalName",
      h."representativeName",
      h."hospitalLogo"
    FROM forum_posts fp
    LEFT JOIN users u ON fp."userId" = u.id
    LEFT JOIN veterinarians v ON u.id = v."userId"
    LEFT JOIN veterinary_students vs ON u.id = vs."userId"
    LEFT JOIN hospitals h ON u.id = h."userId"
    WHERE fp.id = $1 AND fp."deletedAt" IS NULL
  `;
  const result = await pool.query(query, [forumId]);

  if (!result.rows[0]) return null;

  const post = result.rows[0];
  let displayName;
  let profileImage = post.author_profile_image;

  if (post.userType === "HOSPITAL") {
    // 병원 계정: hospitalName을 무조건 우선 사용
    displayName = post.hospitalName || "병원명 미설정";
    profileImage = post.hospitalLogo || post.author_profile_image;
    console.log(`Forum post - Using hospitalName: ${displayName}`);
  } else if (post.userType === "VETERINARIAN") {
    displayName = post.vet_nickname;
  } else if (post.userType === "VETERINARY_STUDENT") {
    displayName = post.vs_nickname;
  } else {
    displayName = "익명 사용자";
  }

  return {
    ...post,
    author_display_name: displayName,
    author_profile_image: profileImage,
  };
};

// 범용 조회수 증가 함수
export const incrementViewCount = async (
  contentType:
    | "forum"
    | "job"
    | "lecture"
    | "resume"
    | "transfer"
    | "detailed_resume",
  contentId: string,
  userIdentifier: string,
  userId?: string
) => {
  try {
    // 조회 기록 확인 (24시간 내 중복 조회 방지)
    const checkQuery = `
      SELECT id FROM view_logs 
      WHERE content_type = $1 
      AND content_id = $2 
      AND (user_id = $3 OR user_identifier = $4)
      AND created_at > NOW() - INTERVAL '24 hours'
    `;

    const existingView = await pool.query(checkQuery, [
      contentType,
      contentId,
      userId || null,
      userIdentifier,
    ]);

    // 이미 24시간 내에 조회한 기록이 있으면 조회수 증가하지 않음
    if (existingView.rows.length > 0) {
      return false;
    }

    // 트랜잭션 시작
    await pool.query("BEGIN");

    // 콘텐츠 유형에 따른 테이블명과 컬럼명 매핑
    const tableMap = {
      forum: "forum_posts",
      job: "jobs",
      lecture: "lectures",
      resume: "users", // Changed from veterinarian_profiles to users
      transfer: "transfers",
      detailed_resume: "resumes",
    };

    const tableName = tableMap[contentType];

    // 조회수 증가 (테이블에 따라 컬럼명 다르게 처리)
    let updateQuery: string;
    if (contentType === "forum") {
      updateQuery = `UPDATE ${tableName} SET "viewCount" = "viewCount" + 1 WHERE id = $1`;
    } else if (contentType === "detailed_resume") {
      updateQuery = `UPDATE ${tableName} SET "viewCount" = "viewCount" + 1 WHERE id = $1`;
    } else if (contentType === "transfer") {
      updateQuery = `UPDATE ${tableName} SET views = views + 1 WHERE id = $1`;
    } else if (contentType === "job") {
      updateQuery = `UPDATE ${tableName} SET "viewCount" = "viewCount" + 1 WHERE id = $1`;
    } else if (contentType === "lecture") {
      updateQuery = `UPDATE ${tableName} SET "viewCount" = "viewCount" + 1 WHERE id = $1`;
    } else {
      updateQuery = `UPDATE ${tableName} SET view_count = view_count + 1 WHERE id = $1`;
    }
    await pool.query(updateQuery, [contentId]);

    // 조회 기록 저장 (ID는 Prisma의 cuid() 기본값을 사용)
    const { createId } = await import("@paralleldrive/cuid2");
    const logId = createId();
    const logQuery = `
      INSERT INTO view_logs (id, content_type, content_id, user_id, user_identifier, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
    await pool.query(logQuery, [
      logId,
      contentType,
      contentId,
      userId || null,
      userIdentifier,
      userIdentifier,
    ]);

    await pool.query("COMMIT");
    return true;
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error(`Error incrementing ${contentType} view count:`, error);
    return false;
  }
};

// 기존 함수들은 새로운 범용 함수를 사용하도록 수정
export const incrementForumViewCount = async (
  forumId: string,
  userIdentifier: string,
  userId?: string
) => {
  return incrementViewCount("forum", forumId, userIdentifier, userId);
};

export const incrementResumeViewCount = async (
  resumeId: string,
  userIdentifier: string,
  userId?: string
): Promise<boolean> => {
  return incrementViewCount(
    "detailed_resume",
    resumeId,
    userIdentifier,
    userId
  );
};

export const getForumComments = async (forumId: string) => {
  const query = `
    SELECT 
      fc.*,
      CASE
        WHEN u.provider != 'NORMAL' THEN u.nickname
        ELSE COALESCE(u.nickname, u."realName")
      END as author_name,
      u."profileImage" as author_profile_image
    FROM forum_comments fc
    LEFT JOIN users u ON fc.user_id = u.id
    WHERE fc.forum_id = $1 AND fc."deletedAt" IS NULL
    ORDER BY fc."createdAt" ASC
  `;
  const result = await pool.query(query, [forumId]);

  // 디버깅을 위한 로그 출력
  console.log(
    `getForumComments: Found ${result.rows.length} comments for forum ${forumId}`
  );
  console.log(
    "Raw comments data:",
    result.rows.map((row) => ({
      id: row.id,
      parent_id: row.parent_id,
      content: row.content.substring(0, 50) + "...",
    }))
  );

  // 댓글을 계층구조로 정리
  const commentMap = new Map();
  const rootComments: any[] = [];

  // 모든 댓글을 맵에 저장
  result.rows.forEach((comment: any) => {
    const mappedComment = {
      id: comment.id,
      forum_id: comment.forum_id,
      user_id: comment.user_id,
      parent_id: comment.parent_id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author_name: comment.author_name,
      author_profile_image: comment.author_profile_image || null,
      replies: [],
    };
    commentMap.set(comment.id, mappedComment);
  });

  // 부모-자식 관계 설정
  result.rows.forEach((comment: any) => {
    const mappedComment = commentMap.get(comment.id);

    if (comment.parent_id) {
      // 대댓글인 경우 부모 댓글의 replies에 추가
      const parentComment = commentMap.get(comment.parent_id);
      if (parentComment) {
        parentComment.replies.push(mappedComment);
        console.log(`Added reply ${comment.id} to parent ${comment.parent_id}`);
      } else {
        console.log(
          `Parent comment ${comment.parent_id} not found for reply ${comment.id}`
        );
      }
    } else {
      // 최상위 댓글인 경우 rootComments에 추가
      rootComments.push(mappedComment);
    }
  });

  console.log(
    `getForumComments: Returning ${rootComments.length} root comments`
  );
  console.log(
    "Root comments with replies:",
    rootComments.map((c) => ({
      id: c.id,
      repliesCount: c.replies.length,
    }))
  );

  return rootComments;
};

// 댓글 생성
export const createForumComment = async (commentData: {
  forumId: string;
  userId: string;
  content: string;
  parentId?: string;
}) => {
  const commentId = `comment_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2)}`;

  const query = `
    INSERT INTO forum_comments (id, forum_id, user_id, parent_id, content, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `;

  const values = [
    commentId,
    commentData.forumId,
    commentData.userId,
    commentData.parentId || null,
    commentData.content,
  ];

  console.log("createForumComment: Creating comment with data:", {
    commentId,
    forumId: commentData.forumId,
    userId: commentData.userId,
    parentId: commentData.parentId || null,
    content: commentData.content.substring(0, 50) + "...",
  });

  const result = await pool.query(query, values);

  console.log("createForumComment: Created comment:", {
    id: result.rows[0].id,
    parent_id: result.rows[0].parent_id,
  });

  return result.rows[0];
};

// 댓글 수정
export const updateForumComment = async (
  commentId: string,
  content: string
) => {
  const query = `
    UPDATE forum_comments 
    SET content = $1, "updatedAt" = NOW() 
    WHERE id = $2 AND "deletedAt" IS NULL
    RETURNING *
  `;

  const result = await pool.query(query, [content, commentId]);
  return result.rows[0] || null;
};

// 댓글 삭제 (soft delete)
export const deleteForumComment = async (commentId: string) => {
  const query = `
    UPDATE forum_comments 
    SET "deletedAt" = NOW() 
    WHERE id = $1 AND "deletedAt" IS NULL
    RETURNING id
  `;

  const result = await pool.query(query, [commentId]);
  return (result.rowCount ?? 0) > 0;
};

// 특정 댓글 조회 (권한 확인용)
export const getForumCommentById = async (commentId: string) => {
  const query = `
    SELECT 
      fc.*,
      COALESCE(v.nickname, vs.nickname, h."hospitalName") as author_name,
      u."profileImage" as author_profile_image,
      COALESCE(v."realName", vs."realName", h."representativeName", h."hospitalName") as author_display_name
    FROM forum_comments fc
    LEFT JOIN users u ON fc.user_id = u.id
    LEFT JOIN veterinarians v ON u.id = v."userId"
    LEFT JOIN veterinary_students vs ON u.id = vs."userId"
    LEFT JOIN hospitals h ON u.id = h."userId"
    WHERE fc.id = $1 AND fc."deletedAt" IS NULL
  `;

  const result = await pool.query(query, [commentId]);
  return result.rows[0];
};

export const updateForum = async (forumId: string, updateData: any) => {
  const query = `
    UPDATE forum_posts 
    SET title = $1, content = $2, "animalType" = $3, "medicalField" = $4, "updatedAt" = NOW() 
    WHERE id = $5
  `;
  const result = await pool.query(query, [
    updateData.title,
    updateData.content,
    updateData.animalType,
    updateData.medicalField,
    forumId,
  ]);
  return (result.rowCount ?? 0) > 0;
};

export const deleteForum = async (forumId: string) => {
  const query = `UPDATE forum_posts SET "deletedAt" = NOW() WHERE id = $1`;
  const result = await pool.query(query, [forumId]);
  return (result.rowCount ?? 0) > 0;
};

export const getForumsWithPagination = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const query = `
    SELECT 
      fp.id,
      fp.title,
      fp.content,
      fp."userId",
      fp."animalType",
      fp."medicalField", 
      fp."createdAt",
      fp."updatedAt",
      fp."deletedAt",
      fp."viewCount",
      COALESCE(v.nickname, vs.nickname, h."hospitalName") as author_name,
      u."profileImage" as author_profile_image,
      COALESCE(v."realName", vs."realName", h."representativeName") as author_display_name,
      COUNT(fc.id) as "commentCount"
    FROM forum_posts fp
    LEFT JOIN users u ON fp."userId" = u.id
    LEFT JOIN veterinarians v ON u.id = v."userId"
    LEFT JOIN veterinary_students vs ON u.id = vs."userId"
    LEFT JOIN hospitals h ON u.id = h."userId"
    LEFT JOIN forum_comments fc ON fp.id = fc.forum_id AND fc."deletedAt" IS NULL
    WHERE fp."deletedAt" IS NULL 
    GROUP BY fp.id, fp.title, fp.content, fp."userId", fp."animalType", fp."medicalField", fp."createdAt", fp."updatedAt", fp."deletedAt", fp."viewCount", 
             u.id, u."profileImage", 
             v.id, v.nickname, v."realName",
             vs.id, vs.nickname, vs."realName",
             h.id, h."hospitalName", h."representativeName"
    ORDER BY fp."createdAt" DESC 
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
};

export const createForum = async (forumData: any) => {
  const forumId = `forum_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2)}`;

  const query = `
    INSERT INTO forum_posts (id, "userId", title, content, "animalType", "medicalField", "viewCount", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING *
  `;

  const values = [
    forumId,
    forumData.userId,
    forumData.title,
    forumData.content,
    forumData.animalType,
    forumData.medicalField,
    0,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getRecentLectures = async (limit = 5) => {
  const query = `SELECT * FROM lectures WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1`;
  const result = await pool.query(query, [limit]);
  return result.rows;
};

export const getRecentResumes = async (limit = 5) => {
  const query = `SELECT * FROM resumes WHERE "deletedAt" IS NULL ORDER BY "createdAt" DESC LIMIT $1`;
  const result = await pool.query(query, [limit]);
  return result.rows;
};

export const getRecentTransfers = async (limit = 5) => {
  const query = `SELECT * FROM transfers WHERE "deletedAt" IS NULL AND status != 'DISABLED' ORDER BY "createdAt" DESC LIMIT $1`;
  const result = await pool.query(query, [limit]);
  return result.rows;
};

export const getHomepageBanners = async () => {
  return []; // 배너 데이터 반환
};

export const getHospitalEvaluationById = async (evaluationId: string) => {
  const query = `SELECT * FROM hospital_evaluations WHERE id = $1 AND "deletedAt" IS NULL`;
  const result = await pool.query(query, [evaluationId]);
  return result.rows[0] || null;
};

export const updateHospitalEvaluation = async (
  evaluationId: string,
  updateData: any
) => {
  // Prepare the combined comment field with ratings and comments data (same format as resume evaluation)
  let combinedComment = "";

  if (updateData.ratings && updateData.comments) {
    // Convert ratings to integers for storage if they're in decimal format
    const ratingsForStorage = {
      facilities:
        parseFloat(updateData.ratings.facilities) <= 5
          ? Math.round(parseFloat(updateData.ratings.facilities) * 10)
          : Math.round(parseFloat(updateData.ratings.facilities)),
      staff:
        parseFloat(updateData.ratings.staff) <= 5
          ? Math.round(parseFloat(updateData.ratings.staff) * 10)
          : Math.round(parseFloat(updateData.ratings.staff)),
      service:
        parseFloat(updateData.ratings.service) <= 5
          ? Math.round(parseFloat(updateData.ratings.service) * 10)
          : Math.round(parseFloat(updateData.ratings.service)),
    };

    const ratingsJson = JSON.stringify(ratingsForStorage);
    const commentsJson = JSON.stringify(updateData.comments);
    combinedComment = `평가: ${ratingsJson} | 코멘트: ${commentsJson}`;
  } else if (updateData.comment) {
    combinedComment = updateData.comment;
  }

  const query = `UPDATE hospital_evaluations SET rating = $1, comment = $2, "updatedAt" = NOW() WHERE id = $3 RETURNING *`;
  // Convert rating to integer for storage if it's in decimal format
  const ratingVal = parseFloat(updateData.rating);
  const ratingAsInteger =
    ratingVal <= 5 ? Math.round(ratingVal * 10) : Math.round(ratingVal);
  const result = await pool.query(query, [
    ratingAsInteger,
    combinedComment,
    evaluationId,
  ]);
  return result.rows[0];
};

export const deleteHospitalEvaluation = async (evaluationId: string) => {
  const query = `UPDATE hospital_evaluations SET "deletedAt" = NOW() WHERE id = $1`;
  const result = await pool.query(query, [evaluationId]);
  return (result.rowCount ?? 0) > 0;
};

export const getHospitalEvaluations = async (hospitalId: string) => {
  const query = `
    SELECT 
      he.*,
      COALESCE(v.nickname, vs.nickname, v."realName", vs."realName") as "evaluatorName",
      u.id as "evaluatorId"
    FROM hospital_evaluations he
    LEFT JOIN users u ON he."userId" = u.id
    LEFT JOIN veterinarians v ON u.id = v."userId"
    LEFT JOIN veterinary_students vs ON u.id = vs."userId"
    WHERE he."hospitalId" = $1 AND he."deletedAt" IS NULL
    ORDER BY he."createdAt" DESC
  `;
  const result = await pool.query(query, [hospitalId]);

  return result.rows.map((row) => {
    // Parse JSON data from combined comment field
    let ratings = { facilities: 0, staff: 0, service: 0 };
    let comments = { facilities: "", staff: "", service: "" };

    try {
      if (
        row.comment &&
        row.comment.includes("평가: ") &&
        row.comment.includes(" | 코멘트: ")
      ) {
        // Parse structured comment in same format as resume evaluation
        const parts = row.comment.split(" | 코멘트: ");
        if (parts.length === 2) {
          const ratingsStr = parts[0].replace("평가: ", "");
          const commentsStr = parts[1];

          try {
            // Clean the strings before parsing to remove control characters
            const cleanRatingsStr = ratingsStr.replace(
              /[\u0000-\u001F\u007F]/g,
              ""
            );
            const cleanCommentsStr = commentsStr.replace(
              /[\u0000-\u001F\u007F]/g,
              ""
            );

            const parsedRatings = JSON.parse(cleanRatingsStr);
            const parsedComments = JSON.parse(cleanCommentsStr);

            // Map the parsed data to expected structure
            if (parsedRatings && typeof parsedRatings === "object") {
              // Check if values are already in correct format (1-5) or need conversion (10-50)
              const facilitiesVal = parseFloat(parsedRatings.facilities) || 0;
              const staffVal = parseFloat(parsedRatings.staff) || 0;
              const serviceVal = parseFloat(parsedRatings.service) || 0;

              ratings = {
                facilities:
                  facilitiesVal > 5 ? facilitiesVal / 10 : facilitiesVal,
                staff: staffVal > 5 ? staffVal / 10 : staffVal,
                service: serviceVal > 5 ? serviceVal / 10 : serviceVal,
              };
            }

            if (parsedComments && typeof parsedComments === "object") {
              comments = {
                facilities: parsedComments.facilities || "",
                staff: parsedComments.staff || "",
                service: parsedComments.service || "",
              };
            }
          } catch (jsonError) {
            console.log("JSON 파싱 실패:", jsonError);
            console.log("Original ratingsStr:", ratingsStr);
            console.log("Original commentsStr:", commentsStr);

            // Fallback: try to extract data manually if JSON parsing fails
            try {
              if (ratingsStr.includes("{") && ratingsStr.includes("}")) {
                const facilityMatch = ratingsStr.match(
                  /"facilities"?\s*:\s*([0-9.]+)/
                );
                const staffMatch = ratingsStr.match(/"staff"?\s*:\s*([0-9.]+)/);
                const serviceMatch = ratingsStr.match(
                  /"service"?\s*:\s*([0-9.]+)/
                );

                if (facilityMatch || staffMatch || serviceMatch) {
                  const facilitiesVal = facilityMatch
                    ? parseFloat(facilityMatch[1])
                    : 0;
                  const staffVal = staffMatch ? parseFloat(staffMatch[1]) : 0;
                  const serviceVal = serviceMatch
                    ? parseFloat(serviceMatch[1])
                    : 0;

                  ratings = {
                    facilities:
                      facilitiesVal > 5 ? facilitiesVal / 10 : facilitiesVal,
                    staff: staffVal > 5 ? staffVal / 10 : staffVal,
                    service: serviceVal > 5 ? serviceVal / 10 : serviceVal,
                  };
                }
              }

              if (commentsStr.includes("{") && commentsStr.includes("}")) {
                const facilityCommentMatch = commentsStr.match(
                  /"facilities"?\s*:\s*"([^"]*?)"/
                );
                const staffCommentMatch = commentsStr.match(
                  /"staff"?\s*:\s*"([^"]*?)"/
                );
                const serviceCommentMatch = commentsStr.match(
                  /"service"?\s*:\s*"([^"]*?)"/
                );

                if (
                  facilityCommentMatch ||
                  staffCommentMatch ||
                  serviceCommentMatch
                ) {
                  comments = {
                    facilities: facilityCommentMatch
                      ? facilityCommentMatch[1]
                      : "",
                    staff: staffCommentMatch ? staffCommentMatch[1] : "",
                    service: serviceCommentMatch ? serviceCommentMatch[1] : "",
                  };
                }
              }
            } catch (fallbackError) {
              console.log("Fallback parsing also failed:", fallbackError);
            }
          }
        }
      }
    } catch (error) {
      console.log("평가 데이터 파싱 오류:", error);
    }

    return {
      id: row.id,
      hospitalId: row.hospitalId,
      evaluatorId: row.evaluatorId,
      evaluatorName: row.evaluatorName || "익명",
      rating: (() => {
        const ratingVal = parseFloat(row.rating) || 0;
        return ratingVal > 5 ? ratingVal / 10 : ratingVal; // Only convert if it's > 5 (stored as integer)
      })(),
      ratings,
      comments,
      comment: row.comment,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
};

export const createHospitalEvaluation = async (evaluationData: any) => {
  // Check if there's an existing evaluation (including soft-deleted ones)
  const existingEvaluationQuery = `
    SELECT id FROM hospital_evaluations 
    WHERE "hospitalId" = $1 AND "userId" = $2
  `;
  const existingResult = await pool.query(existingEvaluationQuery, [
    evaluationData.hospitalId,
    evaluationData.evaluatorId,
  ]);

  // Prepare the combined comment field with ratings and comments data (same format as resume evaluation)
  let combinedComment = "";

  if (evaluationData.ratings && evaluationData.comments) {
    // Convert ratings to integers for storage if they're in decimal format
    const ratingsForStorage = {
      facilities:
        parseFloat(evaluationData.ratings.facilities) <= 5
          ? Math.round(parseFloat(evaluationData.ratings.facilities) * 10)
          : Math.round(parseFloat(evaluationData.ratings.facilities)),
      staff:
        parseFloat(evaluationData.ratings.staff) <= 5
          ? Math.round(parseFloat(evaluationData.ratings.staff) * 10)
          : Math.round(parseFloat(evaluationData.ratings.staff)),
      service:
        parseFloat(evaluationData.ratings.service) <= 5
          ? Math.round(parseFloat(evaluationData.ratings.service) * 10)
          : Math.round(parseFloat(evaluationData.ratings.service)),
    };

    const ratingsJson = JSON.stringify(ratingsForStorage);
    const commentsJson = JSON.stringify(evaluationData.comments);
    combinedComment = `평가: ${ratingsJson} | 코멘트: ${commentsJson}`;
  } else if (evaluationData.comment) {
    combinedComment = evaluationData.comment;
  }

  // Convert rating to integer for storage if it's in decimal format
  const ratingVal = parseFloat(evaluationData.rating);
  const ratingAsInteger =
    ratingVal <= 5 ? Math.round(ratingVal * 10) : Math.round(ratingVal);

  if (existingResult.rows.length > 0) {
    // Update existing evaluation (restore if deleted)
    const existingId = existingResult.rows[0].id;
    const updateQuery = `
      UPDATE hospital_evaluations 
      SET rating = $1, comment = $2, "updatedAt" = NOW(), "deletedAt" = NULL
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [
      ratingAsInteger,
      combinedComment,
      existingId,
    ]);
    return result.rows[0];
  } else {
    // Create new evaluation
    const evaluationId = `evaluation_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}`;
    const insertQuery = `
      INSERT INTO hospital_evaluations (id, "hospitalId", "userId", rating, comment, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    const values = [
      evaluationId,
      evaluationData.hospitalId,
      evaluationData.evaluatorId,
      ratingAsInteger,
      combinedComment,
    ];
    const result = await pool.query(insertQuery, values);
    return result.rows[0];
  }
};

export const getHospitalById = async (hospitalId: string) => {
  const query = `
    SELECT u.*, h.* FROM users u
    LEFT JOIN hospitals h ON u.id = h."userId"
    WHERE u.id = $1 AND u."deletedAt" IS NULL AND u."userType" = 'HOSPITAL'
  `;
  const result = await pool.query(query, [hospitalId]);

  if (!result.rows[0]) return null;

  // Get hospital images
  const imagesQuery = `
    SELECT id, "imageUrl"
    FROM hospital_images
    WHERE "hospitalId" = $1
    ORDER BY "createdAt" ASC
  `;
  const imagesResult = await pool.query(imagesQuery, [result.rows[0].id]);

  return {
    ...result.rows[0],
    images: imagesResult.rows,
  };
};

export const updateHospitalProfile = async (
  hospitalId: string,
  updateData: any
) => {
  const query = `UPDATE hospital_profiles SET hospital_name = $1, description = $2 WHERE user_id = $3`;
  const result = await pool.query(query, [
    updateData.hospitalName,
    updateData.description,
    hospitalId,
  ]);
  return (result.rowCount ?? 0) > 0;
};

export const getHospitalsWithPagination = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const query = `
    SELECT u.*, hp.* FROM users u
    JOIN hospital_profiles hp ON u.id = hp.user_id
    WHERE u.deleted_at IS NULL
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
};

export const deleteJobPosting = async (jobId: string) => {
  try {
    console.log("deleteJobPosting called with jobId:", jobId);
    // 먼저 isActive를 false로 설정하고 deletedAt도 설정
    const query = `UPDATE jobs SET "isActive" = false, "deletedAt" = NOW() WHERE id = $1`;
    const result = await pool.query(query, [jobId]);
    console.log("deleteJobPosting result:", { rowCount: result.rowCount });
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("deleteJobPosting error:", error);
    throw error;
  }
};

export const getResumeEvaluationById = async (evaluationId: string) => {
  const query = `SELECT * FROM resume_evaluations WHERE id = $1 AND "deletedAt" IS NULL`;
  const result = await pool.query(query, [evaluationId]);

  if (result.rows[0]) {
    // userId를 evaluatorId로도 반환하여 일관성 유지
    return {
      ...result.rows[0],
      evaluatorId: result.rows[0].userId,
    };
  }
  return null;
};

export const updateResumeEvaluation = async (
  evaluationId: string,
  updateData: any
) => {
  // JSON 형태로 데이터 저장
  const ratingsJson = JSON.stringify(updateData.ratings || {});
  const commentsJson = JSON.stringify(updateData.comments || {});
  const combinedComment = `평가: ${ratingsJson} | 코멘트: ${commentsJson}`;

  const query = `
    UPDATE resume_evaluations SET 
      "rating" = $1,
      "comment" = $2,
      "updatedAt" = NOW()
    WHERE id = $3 AND "deletedAt" IS NULL
    RETURNING *
  `;

  const values = [
    Math.round(updateData.overallRating || 0),
    combinedComment,
    evaluationId,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const deleteResumeEvaluation = async (evaluationId: string) => {
  const query = `UPDATE resume_evaluations SET "deletedAt" = NOW() WHERE id = $1`;
  const result = await pool.query(query, [evaluationId]);
  return (result.rowCount ?? 0) > 0;
};

export const getResumeEvaluations = async (resumeId: string) => {
  const query = `
    SELECT 
      re.*,
      h."hospitalName",
      u.id as hospital_id
    FROM resume_evaluations re
    LEFT JOIN users u ON re."userId" = u.id
    LEFT JOIN hospitals h ON u.id = h."userId"
    WHERE re."resumeId" = $1 AND re."deletedAt" IS NULL
    ORDER BY re."createdAt" DESC
  `;
  const result = await pool.query(query, [resumeId]);

  // Transform the data to match the expected format
  return result.rows.map((row) => {
    let ratings = {
      stressManagement: 0,
      growth: 0,
      care: 0,
      documentation: 0,
      contribution: 0,
    };
    let comments = {
      stressManagement: "",
      growth: "",
      care: "",
      documentation: "",
      contribution: "",
    };

    // JSON에서 평가 데이터 파싱 시도
    try {
      if (row.comment && row.comment.includes("평가: ")) {
        const parts = row.comment.split(" | 코멘트: ");
        if (parts.length === 2) {
          const ratingsStr = parts[0].replace("평가: ", "");
          const commentsStr = parts[1];
          ratings = JSON.parse(ratingsStr);
          comments = JSON.parse(commentsStr);
        }
      }
    } catch (error) {
      console.log("평가 데이터 파싱 오류:", error);
    }

    // 평가 항목별 기본값 설정
    const defaultRating = row.rating || 0;
    ratings = {
      stressManagement: ratings.stressManagement || defaultRating,
      growth: ratings.growth || defaultRating,
      care: ratings.care || defaultRating,
      documentation: ratings.documentation || defaultRating,
      contribution: ratings.contribution || defaultRating,
    };

    return {
      id: row.id,
      hospitalId: row.hospital_id,
      hospitalName: row.hospitalName,
      veterinarianId: row.userId,
      evaluatorId: row.userId, // 평가자 ID 추가
      ratings,
      comments,
      overallRating: row.rating || 0,
      evaluationDate: row.createdAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      detailedEvaluations: [
        {
          category: "스트레스 관리",
          rating: ratings.stressManagement,
          comment: comments.stressManagement || "",
        },
        {
          category: "성장 잠재력",
          rating: ratings.growth,
          comment: comments.growth || "",
        },
        {
          category: "소통 능력",
          rating: ratings.care,
          comment: comments.care || "",
        },
        {
          category: "업무 역량",
          rating: ratings.documentation,
          comment: comments.documentation || "",
        },
        {
          category: "협업 능력",
          rating: ratings.contribution,
          comment: comments.contribution || "",
        },
      ],
    };
  });
};

export const createResumeEvaluation = async (evaluationData: any) => {
  // JSON 형태로 평가 데이터 저장
  const ratingsJson = JSON.stringify(evaluationData.ratings || {});
  const commentsJson = JSON.stringify(evaluationData.comments || {});
  const combinedComment = `평가: ${ratingsJson} | 코멘트: ${commentsJson}`;

  // 기존 평가가 있는지 확인 (삭제된 것 포함)
  const checkQuery = `
    SELECT id, "deletedAt" FROM resume_evaluations 
    WHERE "resumeId" = $1 AND "userId" = $2
  `;
  const checkResult = await pool.query(checkQuery, [
    evaluationData.resumeId,
    evaluationData.evaluatorId,
  ]);

  if (checkResult.rows.length > 0) {
    const existingEval = checkResult.rows[0];

    // 삭제된 평가가 있다면 기존 ID로 업데이트
    const updateQuery = `
      UPDATE resume_evaluations SET 
        "rating" = $1,
        "comment" = $2,
        "updatedAt" = NOW(),
        "deletedAt" = NULL,
        "createdAt" = CASE WHEN "deletedAt" IS NOT NULL THEN NOW() ELSE "createdAt" END
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      Math.round(evaluationData.overallRating || 0),
      combinedComment,
      existingEval.id,
    ]);
    return result.rows[0];
  } else {
    // 새로운 평가 생성
    const evaluationId = `eval_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}`;

    const query = `
      INSERT INTO resume_evaluations (
        "id",
        "resumeId",
        "userId", 
        "rating",
        "comment",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      evaluationId,
      evaluationData.resumeId,
      evaluationData.evaluatorId,
      Math.round(evaluationData.overallRating || 0),
      combinedComment,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }
};

export const getTransferById = async (transferId: string) => {
  const query = `
    SELECT 
      t.*,
      u.id as "userId",
      u."userType",
      u."profileImage",
      CASE 
        WHEN u."userType" = 'VETERINARIAN' THEN COALESCE(v.nickname, v."realName", u."realName")
        WHEN u."userType" = 'VETERINARY_STUDENT' THEN COALESCE(vs.nickname, vs."realName", u."realName")
        WHEN u."userType" = 'HOSPITAL' THEN h."hospitalName"
        ELSE u."realName"
      END as user_name,
      v.nickname as veterinarian_nickname,
      vs.nickname as student_nickname,
      h."hospitalName",
      h."hospitalAddress"
    FROM transfers t
    LEFT JOIN users u ON t."userId" = u.id
    LEFT JOIN veterinarians v ON u.id = v."userId" AND u."userType" = 'VETERINARIAN'
    LEFT JOIN veterinary_students vs ON u.id = vs."userId" AND u."userType" = 'VETERINARY_STUDENT'
    LEFT JOIN hospitals h ON u.id = h."userId" AND u."userType" = 'HOSPITAL'
    WHERE t.id = $1 AND t."deletedAt" IS NULL
  `;
  const result = await pool.query(query, [transferId]);
  if (!result.rows[0]) return null;

  const transfer = result.rows[0];
  return {
    ...transfer,
    images: transfer.images
      ? typeof transfer.images === "string"
        ? JSON.parse(transfer.images)
        : transfer.images
      : [],
    documents: transfer.documents
      ? typeof transfer.documents === "string"
        ? JSON.parse(transfer.documents)
        : transfer.documents
      : [],
    user: {
      id: transfer.userId,
      userType: transfer.userType,
      name: transfer.user_name,
      nickname: transfer.veterinarian_nickname || transfer.student_nickname,
      hospitalName: transfer.hospitalName,
      profileImage: transfer.profileImage,
      hospitalAddress: transfer.hospitalAddress,
    },
    latitude: transfer.latitude,
    longitude: transfer.longitude,
  };
};

export const incrementTransferViewCount = async (
  transferId: string,
  userIdentifier: string,
  userId?: string
): Promise<boolean> => {
  return incrementViewCount("transfer", transferId, userIdentifier, userId);
};

export const getRelatedTransfers = async (transferId: string, limit = 5) => {
  const query = `
    SELECT * FROM transfers 
    WHERE id != $1 AND "deletedAt" IS NULL AND status != 'DISABLED' AND "isDraft" = false
    ORDER BY "createdAt" DESC 
    LIMIT $2
  `;
  const result = await pool.query(query, [transferId, limit]);
  return result.rows;
};

export const updateTransfer = async (transferId: string, updateData: any) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Build dynamic query based on provided fields
  if (updateData.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updateData.title);
  }
  if (updateData.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updateData.description);
  }
  if (updateData.price !== undefined) {
    fields.push(`price = $${paramIndex++}`);
    values.push(updateData.price);
  }
  if (updateData.category !== undefined) {
    fields.push(`category = $${paramIndex++}`);
    values.push(updateData.category);
  }
  if (updateData.baseAddress !== undefined) {
    fields.push(`base_address = $${paramIndex++}`);
    values.push(updateData.baseAddress);
  }
  if (updateData.detailAddress !== undefined) {
    fields.push(`detail_address = $${paramIndex++}`);
    values.push(updateData.detailAddress);
  }
  if (updateData.sido !== undefined) {
    fields.push(`sido = $${paramIndex++}`);
    values.push(updateData.sido);
  }
  if (updateData.sigungu !== undefined) {
    fields.push(`sigungu = $${paramIndex++}`);
    values.push(updateData.sigungu);
  }
  if (updateData.latitude !== undefined) {
    fields.push(`latitude = $${paramIndex++}`);
    values.push(updateData.latitude);
  }
  if (updateData.longitude !== undefined) {
    fields.push(`longitude = $${paramIndex++}`);
    values.push(updateData.longitude);
  }
  if (updateData.area !== undefined) {
    fields.push(`area = $${paramIndex++}`);
    values.push(updateData.area);
  }
  if (updateData.images !== undefined) {
    fields.push(`images = $${paramIndex++}`);
    values.push(updateData.images);
  }
  if (updateData.documents !== undefined) {
    fields.push(`documents = $${paramIndex++}`);
    values.push(JSON.stringify(updateData.documents));
  }
  if (updateData.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updateData.status);
  }
  if (updateData.location !== undefined) {
    fields.push(`location = $${paramIndex++}`);
    values.push(updateData.location);
  }
  if (updateData.isDraft !== undefined) {
    fields.push(`"isDraft" = $${paramIndex++}`);
    values.push(updateData.isDraft);
  }

  // Always update updatedAt
  fields.push(`"updatedAt" = NOW()`);

  if (fields.length === 1) {
    // Only updatedAt field
    return false;
  }

  values.push(transferId);
  const query = `UPDATE transfers SET ${fields.join(
    ", "
  )} WHERE id = $${paramIndex}`;
  const result = await pool.query(query, values);
  return (result.rowCount ?? 0) > 0;
};

export const deleteTransfer = async (transferId: string) => {
  const query = `UPDATE transfers SET "deletedAt" = NOW() WHERE id = $1`;
  const result = await pool.query(query, [transferId]);
  return (result.rowCount ?? 0) > 0;
};

export const getTransfersWithPagination = async (page = 1, limit = 10, sort: string = "latest") => {
  try {
    const offset = (page - 1) * limit;

    console.log(`[getTransfersWithPagination] Starting query - page: ${page}, limit: ${limit}, offset: ${offset}, sort: ${sort}`);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transfers 
      WHERE "deletedAt" IS NULL AND status != 'DISABLED' AND "isDraft" = false
    `;
    console.log(`[getTransfersWithPagination] Executing count query`);
    const countResult = await pool.query(countQuery);
    const total = Number(countResult.rows[0]?.total || 0); // Ensure it's a Number
    console.log(`[getTransfersWithPagination] Total count: ${total}`);

    // Sort order 결정 (안전한 값만 허용)
    let orderByColumn = '"createdAt"';
    let orderByDirection = 'DESC';
    
    if (sort === "oldest") {
      orderByColumn = '"createdAt"';
      orderByDirection = 'ASC';
    } else if (sort === "price_high") {
      orderByColumn = 'price';
      orderByDirection = 'DESC';
    } else if (sort === "price_low") {
      orderByColumn = 'price';
      orderByDirection = 'ASC';
    } else if (sort === "views") {
      orderByColumn = 'views';
      orderByDirection = 'DESC';
    }
    // 기본값: latest (createdAt DESC)

    // Data query (ORDER BY는 안전한 값만 사용)
    const query = `
      SELECT id, "userId", title, description, location, base_address, detail_address, sido, sigungu, 
             price, category, images, documents, status, area, views, "isDraft", "createdAt", "updatedAt"
      FROM transfers 
      WHERE "deletedAt" IS NULL AND status != 'DISABLED' AND "isDraft" = false
      ORDER BY ${orderByColumn} ${orderByDirection}
      LIMIT $1 OFFSET $2
    `;
    console.log(`[getTransfersWithPagination] Executing data query with limit: ${limit}, offset: ${offset}, orderBy: ${orderByColumn} ${orderByDirection}`);
    
    const result = await pool.query(query, [limit, offset]);
    console.log(`[getTransfersWithPagination] Retrieved ${result.rows.length} transfers`);

    const transfers = result.rows.map((transfer) => {
      let images = [];
      let documents = [];
      
      try {
        if (transfer.images) {
          images = typeof transfer.images === "string"
            ? JSON.parse(transfer.images)
            : transfer.images;
        }
      } catch (error) {
        console.error("Error parsing images for transfer:", transfer.id, error);
        images = [];
      }
      
      try {
        if (transfer.documents) {
          documents = typeof transfer.documents === "string"
            ? JSON.parse(transfer.documents)
            : transfer.documents;
        }
      } catch (error) {
        console.error("Error parsing documents for transfer:", transfer.id, error);
        documents = [];
      }
      
      return {
        ...transfer,
        images,
        documents,
      };
    });

    console.log(`[getTransfersWithPagination] Successfully processed ${transfers.length} transfers`);

    return {
      data: transfers,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("=== getTransfersWithPagination Error ===");
    console.error("Error:", error);
    console.error("Error name:", error instanceof Error ? error.name : "Unknown");
    console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    
    // 데이터베이스 연결 상태 확인
    if (error instanceof Error) {
      if (error.message.includes("connect") || error.message.includes("timeout")) {
        console.error("Database connection issue detected");
      }
      if (error.message.includes("relation") || error.message.includes("does not exist")) {
        console.error("Database table/column issue detected");
      }
    }
    
    throw error; // Re-throw to be handled by caller
  }
};

export const createLecture = async (lectureData: any) => {
  // Generate unique ID for the lecture
  const lectureId = `lecture_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2)}`;

  const query = `
    INSERT INTO lectures (id, title, description, "videoUrl", thumbnail, duration, category, tags, "viewCount", instructor, "referenceMaterials", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    RETURNING *
  `;
  const values = [
    lectureId,
    lectureData.title,
    lectureData.description,
    lectureData.videoUrl || "", // 빈 문자열을 기본값으로 설정
    lectureData.thumbnail || null,
    lectureData.duration || null,
    lectureData.category,
    lectureData.tags || [],
    0, // 초기 조회수
    lectureData.instructor || "강사명", // instructor 필드 추가
    JSON.stringify(lectureData.referenceMaterials || []), // 참고자료 JSON으로 저장
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const createTransfer = async (transferData: any) => {
  // Generate unique ID for the transfer
  const transferId = `transfer_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2)}`;

  const query = `
    INSERT INTO transfers (id, "userId", title, description, location, base_address, detail_address, sido, sigungu, latitude, longitude, price, category, images, documents, status, area, views, "isDraft", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
    RETURNING *
  `;
  const values = [
    transferId,
    transferData.userId,
    transferData.title,
    transferData.description,
    transferData.location, // 호환성을 위해 유지
    transferData.baseAddress, // 기본주소
    transferData.detailAddress, // 상세주소
    transferData.sido, // 시도
    transferData.sigungu, // 시군구
    transferData.latitude || null, // 위도
    transferData.longitude || null, // 경도
    transferData.price,
    transferData.category,
    transferData.images,
    JSON.stringify(transferData.documents || []), // 문서 파일 URL 배열을 JSON 문자열로 변환
    transferData.status || "ACTIVE",
    transferData.area || null, // 평수 (병원양도일 때만)
    0, // views 초기값
    transferData.isDraft || false, // isDraft 필드 추가
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// 편집을 위한 양도양수 조회 (disabled 포함)
export const getTransferByIdForEdit = async (transferId: string) => {
  const query = `
    SELECT t.*, h."hospitalName", u."profileImage", h."hospitalAddress"
    FROM transfers t
    LEFT JOIN users u ON t."userId" = u.id
    LEFT JOIN hospitals h ON u.id = h."userId" AND u."userType" = 'HOSPITAL'
    WHERE t.id = $1 AND t."deletedAt" IS NULL
  `;
  const result = await pool.query(query, [transferId]);
  if (!result.rows[0]) return null;

  const transfer = result.rows[0];
  return {
    ...transfer,
    documents: transfer.documents
      ? typeof transfer.documents === "string"
        ? JSON.parse(transfer.documents)
        : transfer.documents
      : [],
  };
};

// 사용자의 임시저장된 양도양수 조회
export const getDraftTransferByUserId = async (userId: string) => {
  const query = `
    SELECT * FROM transfers 
    WHERE "userId" = $1 
    AND "isDraft" = true
    AND "deletedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [userId]);

  return result.rows[0] || null;
};

// 사용자의 모든 임시저장 양도양수 목록 조회
export const getDraftTransfersByUserId = async (userId: string) => {
  const query = `
    SELECT t.*, u.nickname, u."profileImage"
    FROM transfers t
    JOIN users u ON t."userId" = u.id
    WHERE t."userId" = $1 
    AND t."isDraft" = true
    AND t."deletedAt" IS NULL
    ORDER BY t."updatedAt" DESC
  `;
  const result = await pool.query(query, [userId]);

  return result.rows.map((row) => ({
    ...row,
    documents: row.documents
      ? typeof row.documents === "string"
        ? JSON.parse(row.documents)
        : row.documents
      : [],
  }));
};

// ============================================================================
// 회원 탈퇴 및 복구 관련 함수들
// ============================================================================

export const softDeleteUser = async (userId: string, reason?: string) => {
  const deletedAt = new Date();

  const query = `
    UPDATE users 
    SET deleted_at = $1, withdraw_reason = $2, is_active = false
    WHERE id = $3
    RETURNING *
  `;

  const result = await pool.query(query, [deletedAt, reason, userId]);
  return result.rows[0];
};

export const softDeleteUserData = async (userId: string) => {
  const deletedAt = new Date();

  await pool.query("BEGIN");

  try {
    // 수의사 프로필 관련 데이터 soft delete
    await pool.query(
      `
      UPDATE veterinarians 
      SET deleted_at = $1 
      WHERE user_id = $2
    `,
      [deletedAt, userId]
    );

    // 병원 프로필 관련 데이터 soft delete
    await pool.query(
      `
      UPDATE hospitals 
      SET deleted_at = $1 
      WHERE user_id = $2
    `,
      [deletedAt, userId]
    );

    // 채용공고 soft delete
    await pool.query(
      `
      UPDATE jobs 
      SET deleted_at = $1 
      WHERE hospital_id IN (SELECT id FROM hospitals WHERE user_id = $2)
    `,
      [deletedAt, userId]
    );

    // 북마크 soft delete
    await pool.query(
      `
      UPDATE job_bookmarks 
      SET deleted_at = $1 
      WHERE user_id = $2
    `,
      [deletedAt, userId]
    );

    await pool.query(
      `
      UPDATE resume_bookmarks 
      SET deleted_at = $1 
      WHERE user_id = $2
    `,
      [deletedAt, userId]
    );

    // 지원서 soft delete
    await pool.query(
      `
      UPDATE applications 
      SET deleted_at = $1 
      WHERE veterinarian_id IN (SELECT id FROM veterinarians WHERE user_id = $2)
    `,
      [deletedAt, userId]
    );

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
};

export const findDeletedAccount = async (phone: string) => {
  const query = `
    SELECT * FROM users 
    WHERE phone = $1 AND deleted_at IS NOT NULL AND is_active = false
    ORDER BY deleted_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [phone]);
  return result.rows[0] || null;
};

export const restoreAccount = async (userId: string) => {
  const restoredAt = new Date();

  const query = `
    UPDATE users 
    SET deleted_at = NULL, withdraw_reason = NULL, is_active = true, restored_at = $1
    WHERE id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [restoredAt, userId]);
  return result.rows[0];
};

export const restoreUserData = async (userId: string) => {
  await pool.query("BEGIN");

  try {
    // 수의사 프로필 복구
    await pool.query(
      `
      UPDATE veterinarians 
      SET deleted_at = NULL 
      WHERE user_id = $1 AND deleted_at IS NOT NULL
    `,
      [userId]
    );

    // 병원 프로필 복구
    await pool.query(
      `
      UPDATE hospitals 
      SET deleted_at = NULL 
      WHERE user_id = $1 AND deleted_at IS NOT NULL
    `,
      [userId]
    );

    // 채용공고 복구
    await pool.query(
      `
      UPDATE jobs 
      SET deleted_at = NULL 
      WHERE hospital_id IN (SELECT id FROM hospitals WHERE user_id = $1) 
      AND deleted_at IS NOT NULL
    `,
      [userId]
    );

    // 북마크 복구
    await pool.query(
      `
      UPDATE job_bookmarks 
      SET deleted_at = NULL 
      WHERE user_id = $1 AND deleted_at IS NOT NULL
    `,
      [userId]
    );

    await pool.query(
      `
      UPDATE resume_bookmarks 
      SET deleted_at = NULL 
      WHERE user_id = $1 AND deleted_at IS NOT NULL
    `,
      [userId]
    );

    // 지원서 복구
    await pool.query(
      `
      UPDATE applications 
      SET deleted_at = NULL 
      WHERE veterinarian_id IN (SELECT id FROM veterinarians WHERE user_id = $1) 
      AND deleted_at IS NOT NULL
    `,
      [userId]
    );

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
};

// 타입 정의
interface UserForToken {
  id: string; // 반드시 users.id여야 함
  email: string;
  userType: "VETERINARIAN" | "HOSPITAL" | "VETERINARY_STUDENT";
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = async (
  user: UserForToken
): Promise<TokenPair> => {
  const jwt = require("jsonwebtoken");
  const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

  // 입력 검증
  if (!user.id) {
    throw new Error("토큰 생성을 위한 user.id가 없습니다.");
  }
  if (!user.email) {
    throw new Error("토큰 생성을 위한 user.email이 없습니다.");
  }
  if (!user.userType) {
    throw new Error("토큰 생성을 위한 user.userType이 없습니다.");
  }

  // 데이터베이스의 대문자 userType을 JWT용 소문자로 변환
  let normalizedUserType: string;
  switch (user.userType) {
    case "HOSPITAL":
      normalizedUserType = "hospital";
      break;
    case "VETERINARIAN":
    case "VETERINARY_STUDENT":
      normalizedUserType = "veterinarian";
      break;
    default:
      normalizedUserType = "veterinarian"; // fallback
  }

  const payload = {
    userId: user.id, // 반드시 users.id
    userType: normalizedUserType,
    email: user.email,
  };

  console.log(
    "토큰 생성 - userId:",
    user.id,
    ", userType:",
    user.userType,
    ", email:",
    user.email
  );

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

  return {
    accessToken,
    refreshToken,
  };
};

// Forum bookmark functions
export const checkForumBookmarkExists = async (
  userId: string,
  forumId: string
) => {
  const query = `SELECT id FROM forum_bookmarks WHERE user_id = $1 AND forum_id = $2 AND deleted_at IS NULL`;
  const result = await pool.query(query, [userId, forumId]);
  return result.rows.length > 0;
};

export const createForumBookmark = async (userId: string, forumId: string) => {
  // First, try to restore a soft-deleted bookmark
  const restoreQuery = `
    UPDATE forum_bookmarks 
    SET deleted_at = NULL, created_at = NOW() 
    WHERE user_id = $1 AND forum_id = $2 AND deleted_at IS NOT NULL 
    RETURNING *
  `;
  const restoreResult = await pool.query(restoreQuery, [userId, forumId]);

  if (restoreResult.rows.length > 0) {
    return restoreResult.rows[0];
  }

  // If no soft-deleted bookmark exists, create a new one
  const insertQuery = `INSERT INTO forum_bookmarks (user_id, forum_id) VALUES ($1, $2) RETURNING *`;
  const result = await pool.query(insertQuery, [userId, forumId]);
  return result.rows[0];
};

export const removeForumBookmark = async (userId: string, forumId: string) => {
  const query = `UPDATE forum_bookmarks SET deleted_at = NOW() WHERE user_id = $1 AND forum_id = $2`;
  const result = await pool.query(query, [userId, forumId]);
  return (result.rowCount ?? 0) > 0;
};

export const getForumBookmarks = async (userId: string) => {
  const query = `
    SELECT 
      f.*,
      u."profileImage" as author_profile_image,
      COALESCE(v.nickname, vs.nickname, h."hospitalName") as author_name,
      COALESCE(v."realName", vs."realName", h."representativeName", h."hospitalName") as author_display_name,
      fb.created_at as bookmarked_date,
      COALESCE((SELECT COUNT(*)::int FROM forum_comments WHERE forum_id = f.id AND "deletedAt" IS NULL), 0) as "commentCount"
    FROM forum_bookmarks fb
    JOIN forum_posts f ON fb.forum_id = f.id
    LEFT JOIN users u ON f."userId" = u.id
    LEFT JOIN veterinarians v ON u.id = v."userId"
    LEFT JOIN veterinary_students vs ON u.id = vs."userId"
    LEFT JOIN hospitals h ON u.id = h."userId"
    WHERE fb.user_id = $1 AND fb.deleted_at IS NULL AND f."deletedAt" IS NULL
    ORDER BY fb.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const getMyForumComments = async (userId: string) => {
  const query = `
    SELECT
      fc.*,
      CASE
        WHEN u.provider != 'NORMAL' THEN u.nickname
        ELSE COALESCE(u.nickname, u."realName")
      END as author_name,
      u."profileImage" as author_profile_image
    FROM forum_comments fc
    LEFT JOIN users u ON fc.user_id = u.id
    WHERE fc.user_id = $1 AND fc."deletedAt" IS NULL
    ORDER BY fc."createdAt" DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Export query function for direct database access
export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result.rows;
};
