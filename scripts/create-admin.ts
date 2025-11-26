// 관리자 계정 생성 스크립트
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

async function createAdmin() {
  try {
    const email = "admin@iamvet.co.kr";
    const password = "admin123!@#";
    const name = "관리자";
    const role = "SUPER_ADMIN";

    console.log("관리자 계정 생성 중...");
    console.log(`이메일: ${email}`);
    console.log(`이름: ${name}`);
    console.log(`권한: ${role}`);

    // 비밀번호 해싱
    const passwordHash = await hashPassword(password);
    console.log("비밀번호 해싱 완료");

    // 기존 관리자 계정 확인
    const existingAdmin = await (prisma as any).admin_users.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log("이미 존재하는 관리자 계정입니다. 업데이트합니다...");
      
      // 기존 계정 업데이트
      const updated = await (prisma as any).admin_users.update({
        where: { email },
        data: {
          passwordHash,
          name,
          role,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      
      console.log("✅ 관리자 계정이 업데이트되었습니다!");
      console.log(`ID: ${updated.id}`);
      console.log(`이메일: ${updated.email}`);
      console.log(`이름: ${updated.name}`);
      console.log(`권한: ${updated.role}`);
    } else {
      // 새 관리자 계정 생성
      const adminId = `admin_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      const admin = await (prisma as any).admin_users.create({
        data: {
          id: adminId,
          email,
          passwordHash,
          name,
          role,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log("✅ 관리자 계정이 생성되었습니다!");
      console.log(`ID: ${admin.id}`);
      console.log(`이메일: ${admin.email}`);
      console.log(`이름: ${admin.name}`);
      console.log(`권한: ${admin.role}`);
    }

    console.log("\n로그인 정보:");
    console.log(`이메일: ${email}`);
    console.log(`비밀번호: ${password}`);
  } catch (error) {
    console.error("❌ 관리자 계정 생성 실패:", error);
    if (error instanceof Error) {
      console.error("에러 메시지:", error.message);
      console.error("에러 스택:", error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

