"use client";

import React, { useState, useRef } from "react";
import { 
  Box, 
  Button, 
  Typography, 
  IconButton, 
  Card, 
  CardMedia,
  LinearProgress,
  Alert
} from "@mui/material";
import { 
  CloudUpload, 
  Delete, 
  Image as ImageIcon 
} from "@mui/icons-material";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onChange,
  maxImages = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxFileSize = 10
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // 파일 개수 체크
    if (images.length + files.length > maxImages) {
      setError(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        // 파일 타입 체크
        if (!acceptedTypes.includes(file.type)) {
          throw new Error(`지원되지 않는 파일 형식입니다. (${acceptedTypes.join(', ')}만 지원)`);
        }

        // 파일 크기 체크
        if (file.size > maxFileSize * 1024 * 1024) {
          throw new Error(`파일 크기가 ${maxFileSize}MB를 초과합니다.`);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'announcement-images');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('업로드 실패');
        }

        const result = await response.json();
        return result.data.fileUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onChange([...images, ...uploadedUrls]);
    } catch (error) {
      setError(error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      // input value 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        첨부 이미지 ({images.length}/{maxImages})
      </Typography>

      {/* 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 이미지 업로드 버튼 */}
      <Button
        variant="outlined"
        onClick={handleFileSelect}
        disabled={uploading || images.length >= maxImages}
        startIcon={<CloudUpload />}
        sx={{ 
          mb: 2,
          borderColor: "var(--Keycolor1)",
          color: "var(--Keycolor1)",
          "&:hover": {
            borderColor: "var(--Keycolor1)",
            backgroundColor: "rgba(255, 135, 150, 0.04)"
          }
        }}
      >
        {uploading ? '업로드 중...' : '이미지 추가'}
      </Button>

      {/* 업로드 진행률 */}
      {uploading && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* 히든 파일 인풋 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* 업로드된 이미지 목록 */}
      {images.length > 0 && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 2 
        }}>
          {images.filter(img => img && img.trim() !== '').map((imageUrl, index) => (
            <Card key={index} sx={{ position: 'relative' }}>
              <CardMedia
                component="img"
                height={120}
                image={imageUrl}
                alt={`첨부 이미지 ${index + 1}`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                sx={{ objectFit: 'cover' }}
              />
              <IconButton
                size="small"
                onClick={() => handleRemoveImage(index)}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  }
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Card>
          ))}
        </Box>
      )}

      {/* 빈 상태 */}
      {images.length === 0 && !uploading && (
        <Box
          sx={{
            border: '2px dashed #e0e0e0',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
            backgroundColor: '#fafafa'
          }}
        >
          <ImageIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            추천 이미지 사이즈: 세로가 더 긴 사이즈의 이미지
          </Typography>
        </Box>
      )}
    </Box>
  );
};