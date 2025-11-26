import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/AuthService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      return createErrorPage("Kakao 로그인이 취소되었습니다", error);
    }

    if (!code || !state) {
      return createErrorPage("Kakao 로그인 실패", "인증 코드가 없습니다");
    }

    // Parse and validate state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch (e) {
      return createErrorPage("Kakao 로그인 실패", "유효하지 않은 상태값입니다");
    }

    const { userType } = stateData;

    // Exchange code for tokens
    const kakaoClientId = process.env.KAKAO_CLIENT_ID;
    const kakaoClientSecret = process.env.KAKAO_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/kakao/callback`;

    if (!kakaoClientId || !kakaoClientSecret) {
      return createErrorPage(
        "Kakao OAuth 설정 오류",
        "클라이언트 설정이 누락되었습니다"
      );
    }

    // Get access token from Kakao
    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: kakaoClientId,
        client_secret: kakaoClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      return createErrorPage(
        "Kakao 로그인 실패",
        tokenData.error_description || "토큰 교환 실패"
      );
    }

    // Get user info from Kakao
    const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    const kakaoUser = await userResponse.json();

    if (!userResponse.ok || kakaoUser.error) {
      return createErrorPage("Kakao 로그인 실패", "사용자 정보 조회 실패");
    }

    const profile = kakaoUser.kakao_account?.profile || {};
    const email = kakaoUser.kakao_account?.email;

    if (!email) {
      return createErrorPage("Kakao 로그인 실패", "이메일 정보가 필요합니다");
    }

    // Extract real name, phone, and birth date from Kakao user data
    const realName = kakaoUser.kakao_account?.name || undefined;
    const phone = kakaoUser.kakao_account?.phone_number || undefined;

    // Extract birth date from Kakao user data
    // Kakao provides birthday (MMDD) and birthyear (YYYY) separately
    let birthDate = undefined;
    const birthday = kakaoUser.kakao_account?.birthday; // MMDD format
    const birthyear = kakaoUser.kakao_account?.birthyear; // YYYY format

    if (birthday && birthyear) {
      // Combine year and birthday to create YYYY-MM-DD format
      const month = birthday.substring(0, 2);
      const day = birthday.substring(2, 4);
      birthDate = `${birthyear}-${month}-${day}`;
    }

    console.log("Kakao OAuth user data:", kakaoUser);
    console.log("Extracted realName:", realName);
    console.log("Extracted phone:", phone);
    console.log("Extracted birthDate:", birthDate);

    // Use AuthService to handle social authentication
    const authResult = await AuthService.handleSocialAuth({
      email: email,
      name: profile.nickname || email.split("@")[0],
      realName,
      phone,
      birthDate,
      profileImage: profile.profile_image_url,
      userType,
      provider: "KAKAO",
      providerId: kakaoUser.id.toString(),
      socialData: kakaoUser,
    });

    if (!authResult.success) {
      // Check if it's an existing account error
      if (authResult.error === "EXISTING_ACCOUNT" && authResult.data) {
        return createExistingAccountPage(authResult.data);
      }
      
      return createErrorPage(
        "Kakao 로그인 실패",
        authResult.message || "인증 처리 실패"
      );
    }
    
    if (!authResult.data) {
      return createErrorPage(
        "Kakao 로그인 실패",
        "인증 데이터 오류"
      );
    }

    const responseData = authResult.data;

    // Handle new user case - redirect to registration completion
    if (
      responseData.isNewUser &&
      !responseData.user &&
      responseData.socialData
    ) {
      const socialData = responseData.socialData;
      const registrationUrl = new URL(`/register/social-complete/${userType}`, request.url);
      registrationUrl.searchParams.set("email", socialData.email);
      registrationUrl.searchParams.set("name", socialData.name);
      if (socialData.profileImage) {
        registrationUrl.searchParams.set("profileImage", socialData.profileImage);
      }
      registrationUrl.searchParams.set("provider", socialData.provider);
      registrationUrl.searchParams.set("providerId", socialData.providerId);

      return NextResponse.redirect(registrationUrl);
    }

    // Return success page that posts message to parent window
    return createSuccessPage("Kakao 로그인 성공", responseData, request);
  } catch (error) {
    console.error("Kakao callback error:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });
    
    // More specific error message based on the error
    let errorMessage = "서버에서 인증 처리 중 오류가 발생했습니다";
    if (error instanceof Error) {
      if (error.message.includes('getUserBySocialProvider')) {
        errorMessage = "사용자 조회 중 오류가 발생했습니다";
      } else if (error.message.includes('generateTokens')) {
        errorMessage = "토큰 생성 중 오류가 발생했습니다";
      } else if (error.message.includes('updateLastLogin')) {
        errorMessage = "로그인 정보 업데이트 중 오류가 발생했습니다";
      }
    }
    
    return createErrorPage("Kakao 로그인 실패", errorMessage);
  }
}

function createSuccessPage(message: string, data: any, request?: NextRequest) {
  // Generate redirect URL using AuthService
  const userType = data.user?.userType || data.socialData?.userType;
  const relativeRedirectUrl = AuthService.generateRedirectUrl(
    data.isProfileComplete,
    userType,
    data.isProfileComplete
      ? undefined
      : data.user
      ? {
          email: data.user.email,
          name: data.user.name,
          profileImage: data.user.profileImage,
        }
      : data.socialData
  );

  // Convert relative URL to absolute URL
  // Use NEXT_PUBLIC_SITE_URL if available, otherwise use request origin
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
    (request ? new URL(request.url).origin : 'https://iam-vet.com');
  
  // If redirectUrl is already absolute, use it as is
  const redirectUrl = relativeRedirectUrl.startsWith('http') 
    ? relativeRedirectUrl 
    : `${baseUrl}${relativeRedirectUrl.startsWith('/') ? '' : '/'}${relativeRedirectUrl}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>로그인 성공</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: green; }
      </style>
    </head>
    <body>
      <h2 class="success">${message}</h2>
      <p>로그인이 완료되었습니다. 잠시 후 자동으로 닫힙니다.</p>
      <script>
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: 'SOCIAL_LOGIN_SUCCESS',
              data: ${JSON.stringify(data)}
            }, window.location.origin);
            
            setTimeout(function() {
              try {
                window.close();
              } catch (e) {
                // Ignore close errors
              }
            }, 100);
          } else {
            localStorage.setItem('accessToken', '${data.tokens.accessToken}');
            localStorage.setItem('refreshToken', '${data.tokens.refreshToken}');
            localStorage.setItem('user', JSON.stringify(${JSON.stringify(
              data.user
            )}));
            
            // 토큰을 쿠키로도 동기화
            const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            document.cookie = 'auth-token=${
              data.tokens.accessToken
            }; expires=' + expireDate.toUTCString() + '; path=/; secure; samesite=strict';
            
            window.location.href = '${redirectUrl}';
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          localStorage.setItem('accessToken', '${data.tokens.accessToken}');
          localStorage.setItem('refreshToken', '${data.tokens.refreshToken}');
          localStorage.setItem('user', JSON.stringify(${JSON.stringify(
            data.user
          )}));
          
          // 토큰을 쿠키로도 동기화
          const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          document.cookie = 'auth-token=${
            data.tokens.accessToken
          }; expires=' + expireDate.toUTCString() + '; path=/; secure; samesite=strict';
          
          window.location.href = '${redirectUrl}';
        }
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

function createExistingAccountPage(data: any) {
  const providerNames = {
    GOOGLE: '구글',
    KAKAO: '카카오',
    NAVER: '네이버'
  };
  
  const attemptedProviderName = providerNames[data.attemptedProvider as keyof typeof providerNames] || data.attemptedProvider;
  
  let loginMethods = [];
  if (data.hasPassword) {
    loginMethods.push('일반 로그인(이메일/비밀번호)');
  }
  
  const socialProviders = (data.existingProviders || []).map((p: string) => 
    `${providerNames[p as keyof typeof providerNames] || p} 로그인`
  );
  loginMethods = [...loginMethods, ...socialProviders];
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>이미 가입된 계정</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          max-width: 500px;
          margin: 0 auto;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .warning { 
          color: #ff6b6b;
          font-size: 18px;
          margin-bottom: 20px;
        }
        .email {
          font-weight: bold;
          color: #333;
          margin: 10px 0;
        }
        .methods {
          background: #f8f9fa;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
          text-align: left;
        }
        .methods h4 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .methods ul {
          margin: 0;
          padding-left: 20px;
        }
        .methods li {
          margin: 5px 0;
          color: #666;
        }
        .button {
          background: #FF8796;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 20px;
        }
        .button:hover {
          background: #ff6b7d;
        }
        .info {
          color: #666;
          font-size: 14px;
          margin-top: 20px;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="warning">이미 가입된 계정입니다</h2>
        <p class="email">${data.email}</p>
        <p>${attemptedProviderName}로 로그인을 시도하셨지만,<br>해당 이메일로 이미 가입된 계정이 있습니다.</p>
        
        <div class="methods">
          <h4>기존 로그인 방법:</h4>
          <ul>
            ${loginMethods.map(method => `<li>${method}</li>`).join('')}
          </ul>
        </div>
        
        <p class="info">
          위의 방법으로 로그인해주세요.<br>
          비밀번호를 잊으셨다면 로그인 페이지에서<br>
          '비밀번호 찾기'를 이용해주세요.
        </p>
        
        <button class="button" onclick="closeAndRedirect()">로그인 페이지로 이동</button>
      </div>
      
      <script>
        function closeAndRedirect() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'SOCIAL_LOGIN_ERROR',
                error: 'EXISTING_ACCOUNT',
                data: ${JSON.stringify(data)}
              }, window.location.origin);
              
              setTimeout(function() {
                window.close();
              }, 100);
            } else {
              window.location.href = '/member-select';
            }
          } catch (error) {
            window.location.href = '/member-select';
          }
        }
        
        // 5초 후 자동으로 로그인 페이지로 이동
        setTimeout(closeAndRedirect, 5000);
      </script>
    </body>
    </html>
  `;
  
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

function createErrorPage(message: string, error: string) {
  // 에러 메시지를 더 사용자 친화적으로 변환
  const getUserFriendlyErrorMessage = (originalError: string) => {
    const errorMappings = {
      "인증 코드가 없습니다": {
        friendly: "카카오 로그인 과정에서 인증 정보를 받지 못했습니다.",
        solution: "다시 로그인을 시도해주세요.",
        technical: "Authorization code missing"
      },
      "유효하지 않은 상태값입니다": {
        friendly: "로그인 요청이 손상되었습니다.",
        solution: "새로고침 후 다시 로그인해주세요.",
        technical: "Invalid state parameter"
      },
      "토큰 교환 실패": {
        friendly: "카카오 서버와의 연결에 문제가 발생했습니다.",
        solution: "잠시 후 다시 시도하거나, 네트워크 연결을 확인해주세요.",
        technical: "Token exchange failed"
      },
      "사용자 정보 조회 실패": {
        friendly: "카카오에서 사용자 정보를 가져올 수 없습니다.",
        solution: "카카오 앱에서 권한 설정을 확인하고 다시 시도해주세요.",
        technical: "User info retrieval failed"
      },
      "이메일 정보가 필요합니다": {
        friendly: "로그인을 위해 이메일 정보가 필요합니다.",
        solution: "카카오 계정 설정에서 이메일 공개를 허용하고 다시 시도해주세요.",
        technical: "Email permission required"
      },
      "인증 처리 실패": {
        friendly: "서버에서 인증 처리 중 오류가 발생했습니다.",
        solution: "잠시 후 다시 시도해주세요. 계속 문제가 발생하면 고객센터에 문의해주세요.",
        technical: "Authentication processing failed"
      },
      "서버 오류가 발생했습니다": {
        friendly: "시스템에 일시적인 문제가 발생했습니다.",
        solution: "잠시 후 다시 시도해주세요. 계속 문제가 발생하면 고객센터에 문의해주세요.",
        technical: "Internal server error"
      },
      "이미 가입된 대학교 이메일입니다.": {
        friendly: "해당 대학교 이메일로 이미 가입된 계정이 있습니다.",
        solution: "기존 계정으로 로그인하거나, 다른 이메일로 가입해주세요.",
        technical: "University email already registered"
      }
    };

    // 정확히 일치하는 에러 메시지 찾기
    const exactMatch = errorMappings[originalError as keyof typeof errorMappings];
    if (exactMatch) return exactMatch;

    // 부분 일치하는 에러 메시지 찾기
    for (const [key, value] of Object.entries(errorMappings)) {
      if (originalError.includes(key) || key.includes(originalError)) {
        return value;
      }
    }

    // 기본 에러 메시지
    return {
      friendly: "로그인 중 알 수 없는 오류가 발생했습니다.",
      solution: "다시 시도해주세요. 계속 문제가 발생하면 고객센터에 문의해주세요.",
      technical: originalError
    };
  };

  const errorInfo = getUserFriendlyErrorMessage(error);
  const timestamp = new Date().toLocaleString('ko-KR');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>로그인 실패</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
          color: #333;
        }
        .container {
          max-width: 500px;
          margin: 50px auto;
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .error-icon {
          font-size: 48px;
          color: #ff6b6b;
          margin-bottom: 20px;
        }
        .error-title { 
          color: #ff6b6b;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 15px;
        }
        .error-message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
          color: #555;
        }
        .solution {
          background: #f8f9fa;
          border-left: 4px solid #FF8796;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .solution-title {
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
        .solution-text {
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }
        .buttons {
          display: flex;
          gap: 10px;
          margin-top: 25px;
          justify-content: center;
        }
        .button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .button-primary {
          background: #FF8796;
          color: white;
        }
        .button-primary:hover {
          background: #ff6b7d;
        }
        .button-secondary {
          background: #e9ecef;
          color: #495057;
        }
        .button-secondary:hover {
          background: #dee2e6;
        }
        .technical-details {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #888;
        }
        .technical-toggle {
          color: #FF8796;
          cursor: pointer;
          text-decoration: underline;
        }
        .technical-info {
          display: none;
          margin-top: 10px;
          font-family: monospace;
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          word-break: break-all;
        }
        .timestamp {
          font-size: 11px;
          color: #aaa;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="text-align: center;">
          <div class="error-icon">⚠️</div>
          <h2 class="error-title">${message}</h2>
        </div>
        
        <div class="error-message">${errorInfo.friendly}</div>
        
        <div class="solution">
          <div class="solution-title">해결 방법</div>
          <div class="solution-text">${errorInfo.solution}</div>
        </div>
        
        <div class="buttons">
          <button class="button button-primary" onclick="retryLogin()">다시 로그인</button>
          <button class="button button-secondary" onclick="closeWindow()">닫기</button>
        </div>
        
        <div class="technical-details">
          <div class="technical-toggle" onclick="toggleTechnical()">기술적 세부사항 보기</div>
          <div class="technical-info" id="technicalInfo">
            <div><strong>오류 코드:</strong> ${errorInfo.technical}</div>
            <div><strong>발생 시간:</strong> ${timestamp}</div>
            <div><strong>사용자 에이전트:</strong> ${error.includes('fetch') ? 'Network Error' : 'Authentication Error'}</div>
          </div>
          <div class="timestamp">Error ID: ERR_${Date.now()}</div>
        </div>
      </div>
      
      <script>
        function toggleTechnical() {
          const techInfo = document.getElementById('technicalInfo');
          techInfo.style.display = techInfo.style.display === 'none' || techInfo.style.display === '' ? 'block' : 'none';
        }
        
        function retryLogin() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'SOCIAL_LOGIN_RETRY',
                provider: 'kakao'
              }, window.location.origin);
              window.close();
            } else {
              window.location.href = '/login/veterinary-student';
            }
          } catch (error) {
            window.location.href = '/login/veterinary-student';
          }
        }
        
        function closeWindow() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'SOCIAL_LOGIN_ERROR',
                message: '${message}',
                error: '${error}',
                errorInfo: ${JSON.stringify(errorInfo)},
                timestamp: '${timestamp}'
              }, window.location.origin);
              
              setTimeout(function() {
                try {
                  window.close();
                } catch (e) {
                  console.log('Cannot close window automatically');
                }
              }, 500);
            } else {
              window.location.href = '/member-select';
            }
          } catch (error) {
            console.error('OAuth error callback error:', error);
            window.location.href = '/member-select';
          }
        }
        
        // 자동으로 10초 후에 닫기
        let countdown = 10;
        const countdownElement = document.createElement('div');
        countdownElement.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 4px; font-size: 12px;';
        document.body.appendChild(countdownElement);
        
        const timer = setInterval(() => {
          countdownElement.textContent = \`\${countdown}초 후 자동으로 닫힙니다\`;
          countdown--;
          
          if (countdown < 0) {
            clearInterval(timer);
            closeWindow();
          }
        }, 1000);
        
        // 즉시 카운트다운 표시
        countdownElement.textContent = \`\${countdown}초 후 자동으로 닫힙니다\`;
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
