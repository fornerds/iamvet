'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/Button';

declare global {
  interface Window {
    naver: any;
    navermap_authFailure?: () => void;
  }
}

interface LocationData {
  address: string;
  detailAddress?: string;
  latitude: number;
  longitude: number;
}

interface MapLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: LocationData) => void;
  initialAddress?: string;
  initialDetailAddress?: string;
  initialLatitude?: number;
  initialLongitude?: number;
}

export const MapLocationModal: React.FC<MapLocationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialAddress = '',
  initialDetailAddress = '',
  initialLatitude,
  initialLongitude,
}) => {
  const [map, setMap] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [marker, setMarker] = useState<any>(null);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState(initialAddress);
  const [detailAddress, setDetailAddress] = useState(initialDetailAddress);
  const markerRef = useRef<any>(null);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  const initializeMap = useCallback(() => {
    if (!window.naver || !window.naver.maps) {
      console.error('네이버 지도가 로드되지 않았습니다.');
      return;
    }

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
      center: new window.naver.maps.LatLng(
        initialLatitude || 37.5665,
        initialLongitude || 126.9780
      ),
      zoom: 13,
      mapTypeId: window.naver.maps.MapTypeId.NORMAL
    };

    const mapInstance = new window.naver.maps.Map('map-modal', mapOptions);
    setMap(mapInstance);

    const infoWindowInstance = new window.naver.maps.InfoWindow({
      anchorSkew: true
    });
    setInfoWindow(infoWindowInstance);

    window.naver.maps.Event.addListener(mapInstance, 'click', (e: any) => {
      const latlng = e.coord;
      updateMarker(latlng.lat(), latlng.lng(), mapInstance);
      searchCoordinateToAddress(latlng, mapInstance, infoWindowInstance);
    });

    // 초기 위치가 있으면 마커 표시
    if (initialLatitude && initialLongitude) {
      updateMarker(initialLatitude, initialLongitude, mapInstance);
      setLatitude(initialLatitude.toFixed(6));
      setLongitude(initialLongitude.toFixed(6));
    }
  }, [initialLatitude, initialLongitude]);

  const searchCoordinateToAddress = (latlng: any, mapInstance: any, infoWindowInstance: any) => {
    infoWindowInstance.close();

    window.naver.maps.Service.reverseGeocode({
      coords: latlng,
      orders: [
        window.naver.maps.Service.OrderType.ADDR,
        window.naver.maps.Service.OrderType.ROAD_ADDR
      ].join(',')
    }, (status: any, response: any) => {
      if (status === window.naver.maps.Service.Status.ERROR) {
        alert('주소 검색 중 오류가 발생했습니다.');
        return;
      }

      const items = response.v2.results;
      const htmlAddresses: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const address = makeAddress(item) || '';
        const addrType = item.name === 'roadaddr' ? '[도로명 주소]' : '[지번 주소]';
        htmlAddresses.push(`${i + 1}. ${addrType} ${address}`);
      }

      infoWindowInstance.setContent([
        '<div style="padding:10px;min-width:200px;line-height:150%;">',
        '<h4 style="margin-top:5px;">검색 좌표</h4><br />',
        htmlAddresses.join('<br />'),
        '</div>'
      ].join('\n'));

      infoWindowInstance.open(mapInstance, latlng);

      const result = response.v2.address;
      const lat = latlng.lat();
      const lng = latlng.lng();
      const foundAddress = result.roadAddress || result.jibunAddress || '주소를 찾을 수 없습니다';
      
      setSelectedLocation({
        address: foundAddress,
        detailAddress: detailAddress || '',
        latitude: lat,
        longitude: lng,
      });
      
      setAddress(foundAddress);
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
    });
  };

  const makeAddress = (item: any) => {
    if (!item) return '';

    const name = item.name;
    const region = item.region;
    const land = item.land;
    const isRoadAddress = name === 'roadaddr';

    let sido = '', sigugun = '', dongmyun = '', ri = '', rest = '';

    if (hasArea(region.area1)) {
      sido = region.area1.name;
    }
    if (hasArea(region.area2)) {
      sigugun = region.area2.name;
    }
    if (hasArea(region.area3)) {
      dongmyun = region.area3.name;
    }
    if (hasArea(region.area4)) {
      ri = region.area4.name;
    }

    if (land) {
      if (hasData(land.number1)) {
        if (hasData(land.type) && land.type === '2') {
          rest += '산';
        }
        rest += land.number1;
        if (hasData(land.number2)) {
          rest += ('-' + land.number2);
        }
      }

      if (isRoadAddress === true) {
        if (checkLastString(dongmyun, '면')) {
          ri = land.name;
        } else {
          dongmyun = land.name;
          ri = '';
        }

        if (hasAddition(land.addition0)) {
          rest += ' ' + land.addition0.value;
        }
      }
    }

    return [sido, sigugun, dongmyun, ri, rest].join(' ');
  };

  const hasArea = (area: any) => {
    return !!(area && area.name && area.name !== '');
  };

  const hasData = (data: any) => {
    return !!(data && data !== '');
  };

  const checkLastString = (word: string, lastString: string) => {
    return new RegExp(lastString + '$').test(word);
  };

  const hasAddition = (addition: any) => {
    return !!(addition && addition.value);
  };

  const updateMarker = (lat: number, lng: number, mapInstance: any) => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    const newMarker = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(lat, lng),
      map: mapInstance
    });

    markerRef.current = newMarker;
    setMarker(newMarker);
    
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
  };

  const searchAddressToCoordinate = (address: string) => {
    if (!window.naver || !window.naver.maps || !window.naver.maps.Service) {
      console.error('네이버 지도 서비스가 로드되지 않았습니다.');
      return;
    }

    window.naver.maps.Service.geocode({
      query: address
    }, (status: any, response: any) => {
      if (status === window.naver.maps.Service.Status.ERROR) {
        alert('주소 검색에 실패했습니다.');
        return;
      }

      if (response.v2.meta.totalCount === 0) {
        alert('검색 결과가 없습니다. 더 구체적인 주소를 입력해주세요.');
        return;
      }

      const htmlAddresses: string[] = [];
      const item = response.v2.addresses[0];
      
      const lat = parseFloat(item.y);
      const lng = parseFloat(item.x);
      const latlng = new window.naver.maps.LatLng(lat, lng);

      if (item.roadAddress) {
        htmlAddresses.push('[도로명 주소] ' + item.roadAddress);
      }

      if (item.jibunAddress) {
        htmlAddresses.push('[지번 주소] ' + item.jibunAddress);
      }

      if (item.englishAddress) {
        htmlAddresses.push('[영문명 주소] ' + item.englishAddress);
      }

      if (infoWindow) {
        infoWindow.setContent([
          '<div style="padding:10px;min-width:200px;line-height:150%;">',
          '<h4 style="margin-top:5px;">검색 주소 : ' + address + '</h4><br />',
          htmlAddresses.join('<br />'),
          '</div>'
        ].join('\n'));

        map.setCenter(latlng);
        infoWindow.open(map, latlng);
      }

      const foundAddress = item.roadAddress || item.jibunAddress;
      
      updateMarker(lat, lng, map);
      setSelectedLocation({
        address: foundAddress,
        detailAddress: detailAddress || '',
        latitude: lat,
        longitude: lng,
      });

      setAddress(foundAddress);
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      setSearchKeyword('');
    });
  };

  const searchLocation = () => {
    if (!searchKeyword.trim()) {
      return;
    }
    searchAddressToCoordinate(searchKeyword);
  };

  const handleConfirm = () => {
    if (!selectedLocation && (!latitude || !longitude)) {
      alert('위치를 선택해주세요.');
      return;
    }

    const lat = latitude ? parseFloat(latitude) : selectedLocation?.latitude;
    const lng = longitude ? parseFloat(longitude) : selectedLocation?.longitude;
    const savedAddress = address || selectedLocation?.address || '';
    const savedDetailAddress = detailAddress.trim() || '';

    if (!lat || !lng) {
      alert('위치 좌표를 확인할 수 없습니다.');
      return;
    }

    onConfirm({
      address: savedAddress,
      detailAddress: savedDetailAddress,
      latitude: lat,
      longitude: lng,
    });
  };

  useEffect(() => {
    if (isMapLoaded && isOpen) {
      initializeMap();
    }
  }, [isMapLoaded, isOpen, initializeMap]);

  useEffect(() => {
    if (isOpen) {
      setAddress(initialAddress);
      setDetailAddress(initialDetailAddress);
      if (initialLatitude && initialLongitude) {
        setLatitude(initialLatitude.toFixed(6));
        setLongitude(initialLongitude.toFixed(6));
        setSelectedLocation({
          address: initialAddress,
          detailAddress: initialDetailAddress,
          latitude: initialLatitude,
          longitude: initialLongitude,
        });
      }
    }
  }, [isOpen, initialAddress, initialDetailAddress, initialLatitude, initialLongitude]);

  if (!isOpen) return null;

  if (!clientId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <p className="text-yellow-800">네이버 지도 API 키가 설정되지 않았습니다.</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="line" size="medium" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`}
        onLoad={() => {
          setIsMapLoaded(true);
        }}
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
      
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-[20px] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 모달 헤더 */}
          <div className="flex justify-between items-center p-6 border-b border-[#EFEFF0]">
            <h2 className="font-title text-[24px] title-medium text-primary">
              위치 선택
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="#3B394D"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* 모달 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 왼쪽: 입력 폼 */}
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-semibold mb-3">위치 검색</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                      placeholder="지번주소 및 도로명주소 검색"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={searchLocation}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      검색
                    </button>
                  </div>
                </div>

                {(selectedLocation || latitude || longitude) && (
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-3">선택된 위치</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="주소를 입력하거나 지도에서 선택하세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">상세주소</label>
                        <input
                          type="text"
                          value={detailAddress}
                          onChange={(e) => setDetailAddress(e.target.value)}
                          placeholder="예: 동/호수, 층수 등 (선택사항)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">위도</label>
                          <input
                            type="text"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            placeholder="위도"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">경도</label>
                          <input
                            type="text"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            placeholder="경도"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium mb-1">사용 방법:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>주소로 검색하거나 지도를 클릭하여 위치를 선택하세요</li>
                    <li>자세한 위치는 직접 지도를 클릭해서 마커가 표시된 부근을 저장하시면 됩니다</li>
                  </ul>
                </div>
              </div>

              {/* 오른쪽: 지도 */}
              <div className="h-[500px] bg-gray-100 rounded-lg overflow-hidden">
                <div id="map-modal" className="w-full h-full" />
              </div>
            </div>
          </div>

          {/* 모달 푸터 */}
          <div className="flex justify-end gap-3 p-6 border-t border-[#EFEFF0]">
            <Button variant="line" size="medium" onClick={onClose}>
              취소
            </Button>
            <Button variant="default" size="medium" onClick={handleConfirm}>
              확인
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

