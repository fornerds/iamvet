// src/lib/db.ts
// AWS RDS PostgreSQL 연결을 위한 pg 라이브러리 사용
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  throw new Error("Database connection string is required");
}

// pg Pool 생성 (SSL 설정 포함)
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Neon의 sql 템플릿 태그와 유사한 인터페이스 제공
// 템플릿 리터럴을 처리하여 pg의 query 메서드와 호환되도록 구현
const sqlFunction = async (
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<any[]> => {
  try {
    // 템플릿 리터럴을 파싱하여 쿼리와 파라미터 분리
    const queryParts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (let i = 0; i < strings.length; i++) {
      queryParts.push(strings[i]);

      // 중첩된 sql 템플릿 처리
      if (i < values.length) {
        const value = values[i];
        
        // sql`` 템플릿이 중첩된 경우 처리
        if (value && typeof value === 'object' && 'query' in value && 'params' in value) {
          // 중첩된 sql 템플릿인 경우
          queryParts.push(value.query.replace(/\$\d+/g, () => `$${paramIndex++}`));
          params.push(...value.params);
        } else if (value === null || value === undefined) {
          queryParts.push('NULL');
        } else {
          queryParts.push(`$${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
    }

    const query = queryParts.join('');
    
    // 빈 쿼리나 공백만 있는 경우 처리
    if (!query.trim()) {
      return [];
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("[sql] Query error:", error);
    throw error;
  }
};

// sql.query 메서드도 지원 (기존 코드 호환성)
sqlFunction.query = async (query: string, params: any[]) => {
  const result = await pool.query(query, params);
  return result.rows;
};

export const sql = sqlFunction as typeof sqlFunction & {
  query: (query: string, params: any[]) => Promise<any[]>;
};
