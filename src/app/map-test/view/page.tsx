'use client';

import { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import Link from 'next/link';

declare global {
  interface Window {
    naver: any;
    navermap_authFailure?: () => void;
  }
}

interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export default function MapViewPage() {
  const [map, setMap] = useState<any>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [infoWindow, setInfoWindow] = useState<any>(null);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  const loadLocations = () => {
    const savedLocations = localStorage.getItem('mapLocations');
    if (savedLocations) {
      setLocations(JSON.parse(savedLocations));
    }
  };

  const initializeMap = useCallback(() => {
    if (!window.naver || !window.naver.maps) return;

    // 인증 실패 핸들러 설정
    window.navermap_authFailure = () => {
      console.error('네이버 지도 인증 실패 (401 오류)');
      console.error('가능한 원인:');
      console.error('1. 네이버 클라우드 플랫폼에서 현재 도메인이 등록되지 않았습니다.');
      console.error('2. 현재 도메인:', window.location.hostname);
      console.error('3. 네이버 클라우드 플랫폼 > AI·NAVER API > Application > 도메인 설정을 확인하세요.');
      alert('네이버 지도 인증에 실패했습니다. 도메인 설정을 확인해주세요.');
    };

    const mapOptions = {
      center: new window.naver.maps.LatLng(37.5665, 126.9780),
      zoom: 11,
      mapTypeId: window.naver.maps.MapTypeId.NORMAL
    };

    const mapInstance = new window.naver.maps.Map('map', mapOptions);
    setMap(mapInstance);

    const infoWindowInstance = new window.naver.maps.InfoWindow({
      content: '',
      maxWidth: 300,
      backgroundColor: "#fff",
      borderColor: "#ddd",
      borderWidth: 1,
      anchorSize: new window.naver.maps.Size(10, 10),
      anchorSkew: true,
      anchorColor: "#fff",
      pixelOffset: new window.naver.maps.Point(0, -10)
    });
    setInfoWindow(infoWindowInstance);
  }, []);

  const addMarkers = useCallback(() => {
    if (!map || !window.naver || locations.length === 0) return;

    markers.forEach(marker => marker.setMap(null));
    
    const newMarkers = locations.map((location, index) => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(location.lat, location.lng),
        map: map,
        title: location.name,
        animation: window.naver.maps.Animation.DROP,
        icon: {
          content: `<div style="background-color: #3B82F6; color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${index + 1}</div>`,
          anchor: new window.naver.maps.Point(20, 20)
        }
      });

      window.naver.maps.Event.addListener(marker, 'click', () => {
        selectLocation(location, marker);
      });

      return marker;
    });

    setMarkers(newMarkers);

    if (locations.length > 0) {
      const bounds = new window.naver.maps.LatLngBounds(
        new window.naver.maps.LatLng(locations[0].lat, locations[0].lng),
        new window.naver.maps.LatLng(locations[0].lat, locations[0].lng)
      );

      locations.forEach(location => {
        bounds.extend(new window.naver.maps.LatLng(location.lat, location.lng));
      });

      map.fitBounds(bounds);
    }
  }, [map, locations, markers]);

  const selectLocation = (location: Location, marker?: any) => {
    setSelectedLocation(location);
    
    if (map && marker) {
      map.setCenter(marker.getPosition());
      map.setZoom(16);

      if (infoWindow) {
        const content = `
          <div style="padding: 12px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${location.name}</h3>
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">${location.address}</p>
            <p style="margin: 0; font-size: 12px; color: #999;">등록일: ${new Date(location.createdAt).toLocaleDateString('ko-KR')}</p>
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      }
    }
  };

  const deleteLocation = (locationId: string) => {
    if (confirm('이 위치를 삭제하시겠습니까?')) {
      const updatedLocations = locations.filter(loc => loc.id !== locationId);
      localStorage.setItem('mapLocations', JSON.stringify(updatedLocations));
      setLocations(updatedLocations);
      setSelectedLocation(null);
      if (infoWindow) {
        infoWindow.close();
      }
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (isMapLoaded) {
      initializeMap();
    }
  }, [isMapLoaded, initializeMap]);

  useEffect(() => {
    addMarkers();
  }, [map, locations, addMarkers]);

  if (!clientId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="text-yellow-800">네이버 지도 API 키가 설정되지 않았습니다.</p>
          <p className="text-sm text-yellow-700 mt-2">.env.local 파일에 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID를 추가해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        onLoad={() => setIsMapLoaded(true)}
        onError={(error) => {
          console.error('네이버 지도 API 스크립트 로드 실패:', error);
          console.error('Client ID:', clientId);
          console.error('현재 도메인:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');
          console.error('가능한 원인:');
          console.error('1. 네이버 클라우드 플랫폼에서 현재 도메인이 등록되지 않았습니다.');
          console.error('2. API 키가 올바르지 않습니다.');
          console.error('3. 네이버 클라우드 플랫폼 > AI·NAVER API > Application > 도메인 설정을 확인하세요.');
          alert('네이버 지도를 불러올 수 없습니다. API 키와 도메인 설정을 확인해주세요.');
        }}
      />
      
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">저장된 위치 보기</h1>
          <Link
            href="/map-test/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            새 위치 추가
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold p-4 border-b">
                저장된 위치 ({locations.length}개)
              </h2>
              
              {locations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  저장된 위치가 없습니다.
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  {locations.map((location, index) => (
                    <div
                      key={location.id}
                      onClick={() => {
                        const marker = markers[index];
                        if (marker) {
                          selectLocation(location, marker);
                        }
                      }}
                      className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                        selectedLocation?.id === location.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{location.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(location.createdAt).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLocation(location.id);
                          }}
                          className="ml-2 text-red-500 hover:text-red-700"
                          title="삭제"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedLocation && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">선택된 위치 정보</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-600">이름</dt>
                    <dd className="text-gray-900">{selectedLocation.name}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">주소</dt>
                    <dd className="text-gray-900">{selectedLocation.address}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">좌표</dt>
                    <dd className="text-gray-900">
                      {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 h-[700px] bg-gray-100 rounded-lg overflow-hidden">
            <div id="map" className="w-full h-full" />
          </div>
        </div>
      </div>
    </>
  );
}