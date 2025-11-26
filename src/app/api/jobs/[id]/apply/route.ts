import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApplication, query } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { nanoid } from "nanoid";
import { getVeterinarianResumeAction } from "@/actions/resume";
import { getTokenFromStorage } from "@/utils/auth";

export const POST = withAdminVerification(
  async (request: NextRequest, context: any) => {
    try {
      const params = await context.params;
      const jobId = params.id;
      const user = (request as any).user;
    
      console.log('=== Apply route called ===');
      console.log('Job ID:', jobId);
      console.log('User:', { userId: user.userId, userType: user.userType });
      
      // 이력서 존재 여부 확인
      const authHeader = request.headers.get('authorization');
      let token: string | null = null;
      
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
      
      if (!token) {
        // 쿠키에서 토큰 확인
        const authTokenCookie = request.cookies.get('auth-token')?.value;
        if (authTokenCookie) {
          token = authTokenCookie;
        }
      }
      
      if (!token) {
        return NextResponse.json({
          status: 'error',
          message: '인증 토큰이 필요합니다'
        }, { status: 401 });
      }
      
      // 이력서 존재 여부 실시간 확인
      console.log('=== Checking resume existence ===');
      const resumeResult = await getVeterinarianResumeAction(token);
      
      if (!resumeResult.success) {
        console.log('Resume check failed:', resumeResult.error);
        return NextResponse.json({
          status: 'error',
          message: '이력서 정보를 확인할 수 없습니다. 다시 시도해주세요.',
          code: 'RESUME_CHECK_FAILED'
        }, { status: 500 });
      }
      
      if (!resumeResult.data) {
        console.log('No resume found for user:', user.userId);
        return NextResponse.json({
          status: 'error',
          message: '지원하기 전에 이력서를 먼저 작성해주세요.',
          code: 'RESUME_REQUIRED',
          redirectUrl: '/dashboard/veterinarian/resume'
        }, { status: 400 });
      }
      
      console.log('Resume found:', {
        resumeId: resumeResult.data.id,
        name: resumeResult.data.name,
        updatedAt: resumeResult.data.updatedAt
      });
      
      // Check if already applied
      const existingApplication = await query(
        `SELECT id FROM applications 
         WHERE "jobId" = $1 AND "veterinarianId" = $2`,
        [jobId, user.userId]
      );
      
      if (existingApplication && existingApplication.length > 0) {
        return NextResponse.json({
          status: 'error',
          message: '이미 지원한 채용공고입니다'
        }, { status: 400 });
      }
      
      // Create application in database
      const application = await createApplication({
        jobId,
        veterinarianId: user.userId,
        status: "PENDING",
      });
      
      console.log('Application created:', !!application, 'ID:', application?.id);
      
      // Get job and hospital information for notification
      const jobInfo = await query(
        `SELECT j.title, j."hospitalId", h."hospitalName" as hospital_name 
         FROM jobs j 
         LEFT JOIN hospitals h ON j."hospitalId" = h."userId"
         WHERE j.id = $1`,
        [jobId]
      );
      
      if (jobInfo && jobInfo.length > 0) {
        const job = jobInfo[0];
        const hospitalName = job.hospital_name || '병원';
        
        try {
          // Create notification for the applicant (confirmation)
          await prisma.notifications.create({
            data: {
              id: nanoid(),
              type: NotificationType.APPLICATION_NEW,
              recipientId: user.userId,
              recipientType: user.userType,
              senderId: job.hospitalId,
              title: '지원 완료',
              content: `${hospitalName}의 "${job.title}" 공고를 정상적으로 지원했습니다.`,
              isRead: false,
              updatedAt: new Date(),
            }
          });
          
          // Create notification for the hospital (new application alert)
          await prisma.notifications.create({
            data: {
              id: nanoid(),
              type: NotificationType.APPLICATION_NEW,
              recipientId: job.hospitalId,
              recipientType: 'HOSPITAL',
              senderId: user.userId,
              title: '새로운 지원자',
              content: `"${job.title}" 공고에 새로운 지원자가 있습니다.`,
              isRead: false,
              updatedAt: new Date(),
            }
          });
          
          console.log('Notifications created for application:', application.id);
        } catch (notificationError) {
          console.error('Failed to create notifications:', notificationError);
          // 알림 생성 실패해도 지원은 성공으로 처리
        }
      }
      
      return NextResponse.json({
        status: 'success',
        message: '지원이 완료되었습니다',
        data: {
          applicationId: application.id,
          status: application.status,
        }
      });
  } catch (error) {
    console.error('Simple apply route error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    // Handle specific duplicate key error
    if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
      return NextResponse.json({
        status: 'error',
        message: '이미 지원한 채용공고입니다'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    }
  }
);