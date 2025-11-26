import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { query } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { nanoid } from "nanoid";

export const DELETE = withAdminVerification(
  async (request: NextRequest, context: any) => {
    try {
      const params = await context.params;
      const jobId = params.id;
      const user = (request as any).user;
    
      console.log('=== Cancel apply route called ===');
      console.log('Job ID:', jobId);
      console.log('User:', { userId: user.userId, userType: user.userType });
      
      // Check if application exists
      const existingApplication = await query(
        `SELECT id, status FROM applications 
         WHERE "jobId" = $1 AND "veterinarianId" = $2`,
        [jobId, user.userId]
      );
      
      if (!existingApplication || existingApplication.length === 0) {
        return NextResponse.json({
          status: 'error',
          message: '지원 내역을 찾을 수 없습니다'
        }, { status: 404 });
      }
      
      // Get job and hospital information for notification before deletion
      const jobInfo = await query(
        `SELECT j.title, j."hospitalId", h."hospitalName" as hospital_name 
         FROM jobs j 
         LEFT JOIN hospitals h ON j."hospitalId" = h."userId"
         WHERE j.id = $1`,
        [jobId]
      );

      // Delete the application
      await query(
        `DELETE FROM applications 
         WHERE "jobId" = $1 AND "veterinarianId" = $2`,
        [jobId, user.userId]
      );
      
      console.log('Application cancelled successfully');
      
      // Create notifications for cancellation
      if (jobInfo && jobInfo.length > 0) {
        const job = jobInfo[0];
        const hospitalName = job.hospital_name || '병원';
        
        try {
          // Create notification for the applicant (cancellation confirmation)
          await prisma.notifications.create({
            data: {
              id: nanoid(),
              type: NotificationType.APPLICATION_STATUS,
              recipientId: user.userId,
              recipientType: user.userType,
              senderId: job.hospitalId,
              title: '지원 취소',
              content: `${hospitalName}의 "${job.title}" 공고 지원을 취소했습니다.`,
              isRead: false,
              updatedAt: new Date(),
            }
          });
          
          // Create notification for the hospital (application cancellation alert)
          await prisma.notifications.create({
            data: {
              id: nanoid(),
              type: NotificationType.APPLICATION_STATUS,
              recipientId: job.hospitalId,
              recipientType: 'HOSPITAL',
              senderId: user.userId,
              title: '지원 취소됨',
              content: `"${job.title}" 공고의 지원자가 지원을 취소했습니다.`,
              isRead: false,
              updatedAt: new Date(),
            }
          });
          
          console.log('Cancellation notifications created');
        } catch (notificationError) {
          console.error('Failed to create cancellation notifications:', notificationError);
          // 알림 생성 실패해도 취소는 성공으로 처리
        }
      }
      
      return NextResponse.json({
        status: 'success',
        message: '지원이 취소되었습니다'
      });
    } catch (error) {
      console.error('Cancel apply route error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      
      return NextResponse.json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }
);