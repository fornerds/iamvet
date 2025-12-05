"use client";

import { useEffect, useRef } from "react";

interface NaverMapProps {
  location?: string;
  latitude?: number;
  longitude?: number;
  width?: string;
  height?: string;
}

declare global {
  interface Window {
    naver: any;
    navermap_authFailure?: () => void;
  }
}

const NaverMap = ({
  location,
  latitude,
  longitude,
  width = "100%",
  height = "265px",
}: NaverMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 기본적으로 회색 배경 UI를 보여주기
    const showFallbackUI = () => {
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="
            width: 100%; 
            height: 100%; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            background-color: #f8f9fa; 
            border-radius: 8px;
            color: #6c757d;
            text-align: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              width: 48px; 
              height: 48px; 
              background-color: #dee2e6; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              margin-bottom: 12px;
            ">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#6c757d">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px; color: #495057;">위치 정보</div>
            <div style="font-size: 14px; color: #6c757d;">${location || '위치 정보 없음'}</div>
          </div>
        `;
      }
    };

    // API 키가 없는 경우를 대비해 기본 UI 표시
    if (
      !process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ||
      process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ===
        "your_naver_map_client_id_here"
    ) {
      showFallbackUI();
      return;
    }

    const initNaverMap = async () => {
      try {
        // 네이버 지도 API 로드
        if (!window.naver || !window.naver.maps) {
          const script = document.createElement("script");
          script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`;

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = (error) => {
              console.error("네이버 지도 API 스크립트 로드 실패:", error);
              console.error("Client ID:", process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID);
              console.error("현재 도메인:", window.location.hostname);
              reject(error);
            };
            document.head.appendChild(script);
          });
        }

        // 에러 핸들러 설정
        window.navermap_authFailure = () => {
          console.error("네이버 지도 인증 실패 (401 오류)");
          console.error("가능한 원인:");
          console.error("1. 네이버 클라우드 플랫폼에서 현재 도메인이 등록되지 않았습니다.");
          console.error("2. 현재 도메인:", window.location.hostname);
          console.error("3. 네이버 클라우드 플랫폼 > AI·NAVER API > Application > 도메인 설정을 확인하세요.");
          showFallbackUI();
        };

        // 좌표 설정: props로 받은 좌표 또는 기본 좌표
        const coords = (latitude && longitude) 
          ? { lat: latitude, lng: longitude }
          : { lat: 37.4675986079, lng: 126.9538284887057 }; // 기본값: 대한수의학회

        if (mapRef.current && window.naver && window.naver.maps) {
          const mapOptions = {
            center: new window.naver.maps.LatLng(coords.lat, coords.lng),
            zoom: 16,
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: window.naver.maps.MapTypeControlStyle.BUTTON,
              position: window.naver.maps.Position.TOP_RIGHT,
            },
            zoomControl: true,
            zoomControlOptions: {
              style: window.naver.maps.ZoomControlStyle.SMALL,
              position: window.naver.maps.Position.TOP_LEFT,
            },
          };

          const map = new window.naver.maps.Map(mapRef.current, mapOptions);

          // 마커 추가
          const marker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(coords.lat, coords.lng),
            map: map,
            title: location || "위치",
          });

          // 정보창 추가
          const infoWindow = new window.naver.maps.InfoWindow({
            content: `
              <div style="padding: 15px; font-size: 14px; max-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <strong style="color: #333; font-size: 16px;">${location || '위치 정보'}</strong>
              </div>
            `,
            maxWidth: 200,
            backgroundColor: "#fff",
            borderColor: "#ccc",
            borderWidth: 1,
            anchorSize: new window.naver.maps.Size(10, 10),
            anchorSkew: true,
            anchorColor: "#fff",
            pixelOffset: new window.naver.maps.Point(0, -10),
          });

          // 마커 클릭 시 정보창 표시
          window.naver.maps.Event.addListener(marker, "click", () => {
            if (infoWindow.getMap()) {
              infoWindow.close();
            } else {
              infoWindow.open(map, marker);
            }
          });

          // 지도 클릭 시 정보창 닫기
          window.naver.maps.Event.addListener(map, "click", () => {
            infoWindow.close();
          });

          // 기본적으로 정보창 열어두기
          infoWindow.open(map, marker);
        }
      } catch (error) {
        console.warn(
          "네이버 지도를 불러올 수 없어 기본 UI를 표시합니다:",
          error
        );
        showFallbackUI();
      }
    };

    initNaverMap();
  }, [location, latitude, longitude]);

  return (
    <div
      ref={mapRef}
      style={{
        width,
        height,
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #e0e0e0",
      }}
      className="mt-4"
    />
  );
};

export default NaverMap;
