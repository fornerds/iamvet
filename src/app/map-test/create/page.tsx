'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    naver: any;
    navermap_authFailure?: () => void;
  }
}

interface Location {
  id: string;
  name?: string;
  address: string;
  detailAddress?: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export default function MapCreatePage() {
  const [map, setMap] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [marker, setMarker] = useState<any>(null);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
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

    console.log('네이버 지도 초기화 시작');
    console.log('Service 사용 가능:', !!window.naver.maps.Service);

    const mapOptions = {
      center: new window.naver.maps.LatLng(37.5665, 126.9780),
      zoom: 13,
      mapTypeId: window.naver.maps.MapTypeId.NORMAL
    };

    const mapInstance = new window.naver.maps.Map('map', mapOptions);
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
  }, []);

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
        id: '',
        address: foundAddress,
        lat: lat,
        lng: lng,
        createdAt: ''
      });
      
      // 주소 및 경도/위도 input 자동 입력
      setAddress(foundAddress);
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
    });
  };

  const makeAddress = (item: any) => {
    if (!item) {
      return '';
    }

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
    // 이전 마커가 있으면 제거
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    // 새 마커 생성
    const newMarker = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(lat, lng),
      map: mapInstance
    });

    markerRef.current = newMarker;
    setMarker(newMarker);
    
    // 경도/위도 input 자동 입력
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
      
      // 네이버 지도 geocode API 결과는 이미 위경도 좌표계입니다
      // item.y = 위도(latitude), item.x = 경도(longitude)
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
        id: '',
        address: foundAddress,
        lat: lat,
        lng: lng,
        createdAt: ''
      });

      // 주소 및 경도/위도 input 자동 입력
      setAddress(foundAddress);
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));

      setSearchResults([]);
      setSearchKeyword('');
    });
  };

  const searchLocation = () => {
    if (!searchKeyword.trim()) {
      return;
    }
    searchAddressToCoordinate(searchKeyword);
  };


  const saveLocation = () => {
    if (!selectedLocation) {
      alert('위치를 선택해주세요.');
      return;
    }

    // input 필드의 값이 있으면 사용, 없으면 selectedLocation의 값 사용
    const lat = latitude ? parseFloat(latitude) : selectedLocation.lat;
    const lng = longitude ? parseFloat(longitude) : selectedLocation.lng;
    const savedAddress = address || selectedLocation.address;
    const savedDetailAddress = detailAddress.trim() || undefined;

    const newLocation: Location = {
      ...selectedLocation,
      id: Date.now().toString(),
      address: savedAddress,
      detailAddress: savedDetailAddress,
      lat: lat,
      lng: lng,
      createdAt: new Date().toISOString()
    };

    const savedLocations = localStorage.getItem('mapLocations');
    const locations: Location[] = savedLocations ? JSON.parse(savedLocations) : [];
    locations.push(newLocation);
    localStorage.setItem('mapLocations', JSON.stringify(locations));

    alert('위치가 저장되었습니다.');
    setSelectedLocation(null);
    setAddress('');
    setDetailAddress('');
    setLatitude('');
    setLongitude('');
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
      setMarker(null);
    }
  };

  useEffect(() => {
    if (isMapLoaded) {
      initializeMap();
    }
  }, [isMapLoaded, initializeMap]);

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
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`}
        onLoad={() => {
          console.log('네이버 지도 스크립트 로드 완료');
          console.log('naver 객체:', !!window.naver);
          console.log('naver.maps:', !!window.naver?.maps);
          console.log('naver.maps.Service:', !!window.naver?.maps?.Service);
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
      
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">지도 위치 저장하기</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">위치 검색</h2>
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

            {selectedLocation && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-3">선택된 위치</h2>
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
                  <button
                    onClick={saveLocation}
                    className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    위치 저장하기
                  </button>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">사용 방법:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>주소로 검색하거나 지도를 클릭하여 위치를 선택하세요</li>
                <li>자세한 위치는 직접 지도를 클릭해서 마커가 표시된 부근을 저장하시면 됩니다</li>
                <li>저장된 위치는 다른 페이지에서 확인할 수 있습니다</li>
              </ul>
            </div>
          </div>

          <div className="h-[600px] bg-gray-100 rounded-lg overflow-hidden">
            <div id="map" className="w-full h-full" />
          </div>
        </div>
      </div>
    </>
  );
}