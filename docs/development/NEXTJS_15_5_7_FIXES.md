# Next.js 15.5.7 업데이트 후 수정 사항

## 문제점

Next.js 15.3.3에서 15.5.7로 업데이트하면서 로그인 기능이 작동하지 않는 문제가 발생했습니다.

## 원인 분석

1. **Server Actions의 cookies() 사용 방식 변경**
   - Next.js 15.5.7에서 `cookies()` 함수의 동작 방식이 변경됨
   - 쿠키 설정이 실패할 수 있음

2. **Server Actions 응답 처리**
   - Server Actions의 응답이 제대로 전달되지 않을 수 있음
   - 타임아웃 문제 발생 가능

3. **CORS 및 Origin 설정**
   - Server Actions의 allowedOrigins 설정 필요

## 적용된 수정 사항

### 1. Server Actions 쿠키 설정 개선

`src/actions/auth.ts`의 `login` 함수:

```typescript
// Set HTTP-only cookie
// Next.js 15.5.7에서 cookies()는 동기적으로 호출해야 함
try {
  const cookieStore = await cookies();
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
} catch (cookieError) {
  console.error("[login] Cookie 설정 오류:", cookieError);
  // 쿠키 설정 실패해도 로그인은 계속 진행 (토큰은 응답에 포함됨)
}
```

### 2. Server Actions 타임아웃 및 Fallback 추가

`src/hooks/api/useAuth.ts`의 `useLogin` 훅:

- Server Action 호출에 15초 타임아웃 추가
- Server Action 실패 시 API Route로 자동 fallback
- API Route 응답을 Server Action 형식으로 변환

### 3. Next.js 설정 개선

`next.config.js`:

```javascript
serverActions: {
  bodySizeLimit: '50mb',
  // Next.js 15.5.7 호환성을 위한 설정
  allowedOrigins: process.env.NEXT_PUBLIC_SITE_URL 
    ? [process.env.NEXT_PUBLIC_SITE_URL, 'https://iam-vet.com', 'http://localhost:3000']
    : ['http://localhost:3000'],
},
```

## 테스트 방법

1. **로그인 테스트**
   - 수의사 로그인: `/login/veterinarian`
   - 병원 로그인: `/login/hospital`
   - 수의학생 로그인: `/login/veterinary-student`

2. **에러 확인**
   - 브라우저 콘솔에서 에러 메시지 확인
   - Network 탭에서 Server Action 요청 상태 확인
   - 서버 로그 확인

3. **Fallback 동작 확인**
   - Server Action이 실패하면 자동으로 API Route로 전환되는지 확인

## 추가 권장 사항

1. **환경 변수 확인**
   - `NEXT_PUBLIC_SITE_URL`이 올바르게 설정되어 있는지 확인
   - 프로덕션: `https://iam-vet.com`
   - 개발: `http://localhost:3000`

2. **서버 로그 모니터링**
   - Server Action 호출 시 로그 확인
   - 쿠키 설정 오류 로그 확인

3. **점진적 마이그레이션**
   - Server Action이 안정적으로 작동하면 유지
   - 문제가 지속되면 API Route로 완전 전환 고려

## 참고 자료

- [Next.js 15.5.7 Release Notes](https://github.com/vercel/next.js/releases)
- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

