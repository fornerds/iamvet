"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  ButtonGroup,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  Image,
  Link as LinkIcon,
  DateRange,
  TrendingUp,
  PlayArrow,
  Pause,
  Analytics,
  Upload,
} from "@mui/icons-material";
import { Tag } from "@/components/ui/Tag";
import { uploadImage, deleteImage } from "@/lib/s3";
import { isS3Url } from "@/lib/s3-client";

interface Advertisement {
  id: string;
  title: string;
  description: string;
  type:
    | "HERO_BANNER"
    | "GENERAL_BANNER"
    | "SIDE_AD"
    | "AD_CARD"
    | "DASHBOARD_BANNER";
  imageUrl?: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  targetAudience: "ALL" | "VETERINARIANS" | "HOSPITALS";
  // Type-specific fields
  buttonText?: string; // For HERO_BANNER
  variant?: "default" | "blue"; // For AD_CARD
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  clickCount?: number;
}

export default function AdvertiseManagement() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileUploading, setIsMobileUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [actionType, setActionType] = useState<
    "view" | "edit" | "create" | "delete"
  >("view");
  const [formData, setFormData] = useState<Partial<Advertisement>>({
    title: "",
    description: "",
    type: "GENERAL_BANNER",
    linkUrl: "",
    isActive: true,
    startDate: "",
    endDate: "",
    targetAudience: "ALL",
  });

  const itemsPerPage = 10;

  // 광고 목록 조회
  useEffect(() => {
    fetchAdvertisements();
  }, [currentPage, filterType, filterStatus, searchTerm]);

  const fetchAdvertisements = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (filterType !== "ALL") params.append("type", filterType);
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/advertisements?${params}`);
      const data = await response.json();

      if (data.success) {
        setAdvertisements(data.data);
        // 페이지네이션 정보 업데이트 필요 시 처리
      }
    } catch (error) {
      console.error("Failed to fetch advertisements:", error);
      alert("광고 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAds = advertisements.filter((ad) => {
    const matchesSearch =
      ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || ad.type === filterType;
    const matchesStatus =
      filterStatus === "ALL" ||
      (filterStatus === "ACTIVE" && ad.isActive) ||
      (filterStatus === "INACTIVE" && !ad.isActive) ||
      (filterStatus === "EXPIRED" && new Date(ad.endDate) < new Date()) ||
      (filterStatus === "SCHEDULED" && new Date(ad.startDate) > new Date());

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPages = Math.ceil(filteredAds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentAds = filteredAds.slice(startIndex, startIndex + itemsPerPage);

  const getStatusVariant = (ad: Advertisement) => {
    const now = new Date();
    const start = new Date(ad.startDate);
    const end = new Date(ad.endDate);

    if (!ad.isActive) return 4;
    if (now < start) return 3;
    if (now > end) return 1;
    return 2;
  };

  const getStatusText = (ad: Advertisement) => {
    const now = new Date();
    const start = new Date(ad.startDate);
    const end = new Date(ad.endDate);

    if (!ad.isActive) return "비활성";
    if (now < start) return "예약됨";
    if (now > end) return "만료됨";
    return "활성";
  };

  const handleAction = async (
    ad: Advertisement | null,
    action: typeof actionType
  ) => {
    setSelectedAd(ad);
    setActionType(action);

    if (action === "edit" && ad) {
      try {
        // 개별 광고 조회 API 호출하여 최신 데이터 가져오기
        const response = await fetch(`/api/advertisements/${ad.id}`);
        const data = await response.json();

        if (data.success && data.data) {
          const latestAd = data.data;
          setFormData({
            title: latestAd.title,
            description: latestAd.description,
            type: latestAd.type,
            imageUrl: latestAd.imageUrl,
            mobileImageUrl: latestAd.mobileImageUrl,
            linkUrl: latestAd.linkUrl,
            isActive: latestAd.isActive,
            startDate: latestAd.startDate
              ? new Date(latestAd.startDate).toISOString().split("T")[0]
              : "",
            endDate: latestAd.endDate
              ? new Date(latestAd.endDate).toISOString().split("T")[0]
              : "",
            targetAudience: latestAd.targetAudience,
            buttonText: latestAd.buttonText,
            variant: latestAd.variant,
          });
        } else {
          // API 호출 실패 시 기존 데이터 사용
          setFormData({
            title: ad.title,
            description: ad.description,
            type: ad.type,
            imageUrl: ad.imageUrl,
            linkUrl: ad.linkUrl,
            isActive: ad.isActive,
            startDate: ad.startDate
              ? new Date(ad.startDate).toISOString().split("T")[0]
              : "",
            endDate: ad.endDate
              ? new Date(ad.endDate).toISOString().split("T")[0]
              : "",
            targetAudience: ad.targetAudience,
            buttonText: ad.buttonText,
            variant: ad.variant,
          });
        }
      } catch (error) {
        console.error("Failed to fetch advertisement details:", error);
        // 오류 발생 시 기존 데이터 사용
        setFormData({
          title: ad.title,
          description: ad.description,
          type: ad.type,
          imageUrl: ad.imageUrl,
          linkUrl: ad.linkUrl,
          isActive: ad.isActive,
          startDate: ad.startDate
            ? new Date(ad.startDate).toISOString().split("T")[0]
            : "",
          endDate: ad.endDate
            ? new Date(ad.endDate).toISOString().split("T")[0]
            : "",
          targetAudience: ad.targetAudience,
          buttonText: ad.buttonText,
          variant: ad.variant,
        });
      }
    } else if (action === "create") {
      setFormData({
        title: "",
        description: "",
        type: "HERO_BANNER",
        linkUrl: "",
        isActive: true,
        startDate: "",
        endDate: "",
        targetAudience: "ALL",
        buttonText: "",
        variant: "default",
      });
    }
    setModalVisible(true);
  };

  const handleSaveAd = async () => {
    try {
      if (actionType === "create") {
        console.log("광고 생성 API 호출 시작");
        const response = await fetch("/api/advertisements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            type: formData.type,
            imageUrl: formData.imageUrl,
            mobileImageUrl: formData.mobileImageUrl,
            linkUrl: formData.linkUrl,
            isActive: formData.isActive,
            startDate: formData.startDate,
            endDate: formData.endDate,
            targetAudience: formData.targetAudience,
            buttonText: formData.buttonText,
            variant: formData.variant,
          }),
        });

        console.log("API 응답:", response.status);
        const data = await response.json();
        console.log("API 응답 데이터:", data);

        if (data.success) {
          await fetchAdvertisements();
          setModalVisible(false);
          setSelectedAd(null);
          alert("광고가 생성되었습니다.");
        } else {
          alert(data.message || "광고 생성에 실패했습니다.");
        }
      } else if (actionType === "edit" && selectedAd) {
        const response = await fetch(`/api/advertisements/${selectedAd.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            type: formData.type,
            imageUrl: formData.imageUrl,
            mobileImageUrl: formData.mobileImageUrl,
            linkUrl: formData.linkUrl,
            isActive: formData.isActive,
            startDate: formData.startDate,
            endDate: formData.endDate,
            targetAudience: formData.targetAudience,
            buttonText: formData.buttonText,
            variant: formData.variant,
          }),
        });

        const data = await response.json();
        if (data.success) {
          await fetchAdvertisements();
          setModalVisible(false);
          setSelectedAd(null);
          alert("광고가 수정되었습니다.");
        } else {
          alert(data.message || "광고 수정에 실패했습니다.");
        }
      }
    } catch (error) {
      console.error("Failed to save advertisement:", error);
      alert("광고 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAd = async () => {
    if (!selectedAd) return;

    try {
      const response = await fetch(`/api/advertisements/${selectedAd.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        await fetchAdvertisements();
        setModalVisible(false);
        setSelectedAd(null);
        alert("광고가 삭제되었습니다.");
      } else {
        alert(data.message || "광고 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to delete advertisement:", error);
      alert("광고 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleToggleActive = async (adId: string) => {
    try {
      const response = await fetch(`/api/advertisements/${adId}`, {
        method: "PATCH",
      });

      const data = await response.json();
      if (data.success) {
        await fetchAdvertisements();
      } else {
        alert(data.message || "광고 상태 변경에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to toggle advertisement:", error);
      alert("광고 상태 변경 중 오류가 발생했습니다.");
    }
  };

  const renderActionButtons = (ad: Advertisement) => (
    <ButtonGroup size="small">
      <Button variant="outlined" onClick={() => handleAction(ad, "view")}>
        <Visibility />
      </Button>
      <Button
        variant="outlined"
        color="primary"
        onClick={() => handleAction(ad, "edit")}
      >
        <Edit />
      </Button>
      <Button
        variant="outlined"
        color={ad.isActive ? "warning" : "success"}
        onClick={() => handleToggleActive(ad.id)}
      >
        {ad.isActive ? <Pause /> : <PlayArrow />}
      </Button>
      <Button
        variant="outlined"
        color="error"
        onClick={() => handleAction(ad, "delete")}
      >
        <Delete />
      </Button>
    </ButtonGroup>
  );

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "var(--Text)",
            mb: 1,
            fontSize: { xs: "1.75rem", md: "2rem" },
          }}
        >
          광고배너 관리
        </Typography>
        <Typography variant="body1" sx={{ color: "var(--Subtext)" }}>
          사이트 광고 배너를 효율적으로 관리하고 성과를 모니터링하세요.
        </Typography>
      </Box>

      {/* Stats Summary */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 4 }}>
        {[
          {
            label: "전체",
            count: advertisements.length,
            color: "var(--Keycolor1)",
          },
          {
            label: "활성",
            count: advertisements.filter((a) => a.isActive).length,
            color: "var(--Keycolor2)",
          },
          {
            label: "비활성",
            count: advertisements.filter((a) => !a.isActive).length,
            color: "var(--Subtext2)",
          },
          {
            label: "만료",
            count: advertisements.filter(
              (a) => new Date(a.endDate) < new Date()
            ).length,
            color: "var(--Keycolor1)",
          },
        ].map((stat, index) => (
          <Card
            key={index}
            sx={{
              flex: "1 1 200px",
              borderRadius: 4,
              border: "1px solid var(--Line)",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                bgcolor: stat.color,
              },
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 32px rgba(105, 140, 252, 0.15)",
              },
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              bgcolor: "white",
            }}
          >
            <CardContent sx={{ p: 3, textAlign: "center" }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: "var(--Text)", mb: 1 }}
              >
                {stat.count}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "var(--Subtext)", fontWeight: 500 }}
              >
                {stat.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Modern Filter Section */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          border: "1px solid var(--Line)",
          bgcolor: "var(--Box_Light)",
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
              alignItems: "center",
            }}
          >
            <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 41.66%" } }}>
              <TextField
                fullWidth
                placeholder="제목, 설명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "white",
                    borderRadius: 2,
                    border: "1px solid var(--Line)",
                    "&:hover": {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--Keycolor1)",
                      },
                    },
                    "&.Mui-focused": {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--Keycolor1)",
                        borderWidth: 2,
                      },
                    },
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search
                          sx={{ color: "var(--Guidetext)", fontSize: 20 }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 20.83%" } }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: "var(--Subtext)" }}>유형</InputLabel>
                <Select
                  value={filterType}
                  label="유형"
                  onChange={(e) => setFilterType(e.target.value)}
                  sx={{
                    bgcolor: "white",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Line)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                  }}
                >
                  <MenuItem value="ALL">모든 유형</MenuItem>
                  <MenuItem value="HERO_BANNER">히어로 배너</MenuItem>
                  <MenuItem value="GENERAL_BANNER">일반 배너</MenuItem>
                  <MenuItem value="SIDE_AD">사이드 광고</MenuItem>
                  <MenuItem value="AD_CARD">광고 카드</MenuItem>
                  <MenuItem value="DASHBOARD_BANNER">대시보드 배너</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 20.83%" } }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: "var(--Subtext)" }}>상태</InputLabel>
                <Select
                  value={filterStatus}
                  label="상태"
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{
                    bgcolor: "white",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Line)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                  }}
                >
                  <MenuItem value="ALL">모든 상태</MenuItem>
                  <MenuItem value="ACTIVE">활성</MenuItem>
                  <MenuItem value="INACTIVE">비활성</MenuItem>
                  <MenuItem value="SCHEDULED">예약됨</MenuItem>
                  <MenuItem value="EXPIRED">만료됨</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: { xs: "1 1 100%", md: "none" } }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleAction(null, "create")}
                sx={{
                  borderRadius: 2,
                  bgcolor: "var(--Keycolor1)",
                  boxShadow: "0 4px 12px rgba(255, 135, 150, 0.3)",
                  "&:hover": {
                    bgcolor: "var(--Keycolor1)",
                    boxShadow: "0 6px 20px rgba(255, 135, 150, 0.4)",
                  },
                }}
              >
                새 광고
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Advertisements Table */}
      <Card
        sx={{
          borderRadius: 4,
          border: "1px solid var(--Line)",
          boxShadow: "0 4px 20px rgba(105, 140, 252, 0.08)",
          mb: 4,
          bgcolor: "white",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table
              sx={{
                "& .MuiTableCell-root": {
                  borderBottom: "1px solid var(--Line)",
                  py: 2,
                },
              }}
            >
              <TableHead sx={{ bgcolor: "var(--Box_Light)" }}>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "var(--Subtext)",
                      fontSize: "0.875rem",
                    }}
                  >
                    광고 정보
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "var(--Subtext)",
                      fontSize: "0.875rem",
                    }}
                  >
                    유형
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "var(--Subtext)",
                      fontSize: "0.875rem",
                    }}
                  >
                    상태
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "var(--Subtext)",
                      fontSize: "0.875rem",
                    }}
                  >
                    기간
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "var(--Subtext)",
                      fontSize: "0.875rem",
                    }}
                  >
                    작업
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentAds.map((ad) => (
                  <TableRow
                    key={ad.id}
                    hover
                    sx={{ "&:hover": { bgcolor: "rgba(0, 0, 0, 0.02)" } }}
                  >
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                        }}
                      >
                        {/* 이미지 썸네일 */}
                        {ad.imageUrl ? (
                          <Box
                            component="img"
                            src={ad.imageUrl}
                            sx={{
                              width: 60,
                              height: 40,
                              objectFit: "cover",
                              borderRadius: 1,
                              border: "1px solid var(--Line)",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 60,
                              height: 40,
                              bgcolor: "var(--Box_Light)",
                              borderRadius: 1,
                              border: "1px solid var(--Line)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Image
                              sx={{ fontSize: 16, color: "var(--Guidetext)" }}
                            />
                          </Box>
                        )}

                        {/* 텍스트 정보 */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 600,
                              color: "var(--Text)",
                              mb: 0.5,
                            }}
                          >
                            {ad.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "var(--Subtext2)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              mb: 0.5,
                            }}
                          >
                            {ad.description}
                          </Typography>
                          {ad.linkUrl && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <LinkIcon
                                sx={{ fontSize: 14, color: "var(--Guidetext)" }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "var(--Guidetext)",
                                  textDecoration: "underline",
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  window.open(ad.linkUrl, "_blank")
                                }
                              >
                                {ad.linkUrl.length > 30
                                  ? `${ad.linkUrl.substring(0, 30)}...`
                                  : ad.linkUrl}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          ad.type === "HERO_BANNER"
                            ? "히어로 배너"
                            : ad.type === "GENERAL_BANNER"
                            ? "일반 배너"
                            : ad.type === "SIDE_AD"
                            ? "사이드 광고"
                            : ad.type === "AD_CARD"
                            ? "광고 카드"
                            : "대시보드 배너"
                        }
                        size="small"
                        sx={{
                          bgcolor: "var(--Box_Light)",
                          color: "var(--Text)",
                          fontWeight: 500,
                          borderRadius: 2,
                          width: "fit-content",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tag variant={getStatusVariant(ad)}>
                        {getStatusText(ad)}
                      </Tag>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "var(--Guidetext)",
                          display: "block",
                          mt: 0.5,
                        }}
                      >
                        {ad.targetAudience === "ALL"
                          ? "전체"
                          : ad.targetAudience === "VETERINARIANS"
                          ? "수의사"
                          : "병원"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "var(--Text)",
                            fontWeight: 500,
                            mb: 0.5,
                          }}
                        >
                          {ad.startDate}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "var(--Subtext2)" }}
                        >
                          ~ {ad.endDate}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{renderActionButtons(ad)}</TableCell>
                  </TableRow>
                ))}
                {currentAds.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 8 }}>
                      <Typography
                        variant="body1"
                        sx={{ color: "var(--Subtext2)" }}
                      >
                        검색 조건에 맞는 광고가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            size="large"
            sx={{
              "& .MuiPaginationItem-root": {
                borderRadius: 2,
                "&.Mui-selected": {
                  bgcolor: "var(--Keycolor1)",
                  color: "white",
                  "&:hover": {
                    bgcolor: "var(--Keycolor1)",
                  },
                },
                "&:hover": {
                  bgcolor: "rgba(255, 135, 150, 0.04)",
                },
              },
            }}
          />
        </Box>
      )}

      {/* Action Modal */}
      <Dialog
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: "var(--Text)" }}>
          {actionType === "view" && "광고 상세보기"}
          {actionType === "edit" && "광고 수정"}
          {actionType === "create" && "새 광고 등록"}
          {actionType === "delete" && "광고 삭제"}
        </DialogTitle>
        <DialogContent>
          {actionType === "view" && selectedAd ? (
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "var(--Text)", mb: 1 }}
                >
                  {selectedAd.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: "var(--Text)", mb: 2 }}
                >
                  {selectedAd.description}
                </Typography>
                {selectedAd.imageUrl && (
                  <Box
                    sx={{
                      width: "100%",
                      maxHeight: 300,
                      borderRadius: 2,
                      overflow: "hidden",
                      border: "1px solid var(--Line)",
                      mb: 2,
                    }}
                  >
                    <Box
                      component="img"
                      src={selectedAd.imageUrl}
                      sx={{
                        width: "100%",
                        height: "auto",
                        objectFit: "contain",
                        maxHeight: 300,
                      }}
                    />
                  </Box>
                )}
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, color: "var(--Subtext)", mb: 1 }}
                >
                  광고 정보
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ color: "var(--Text)" }}>
                    유형:{" "}
                    {selectedAd.type === "HERO_BANNER"
                      ? "히어로 배너"
                      : selectedAd.type === "GENERAL_BANNER"
                      ? "일반 배너"
                      : selectedAd.type === "SIDE_AD"
                      ? "사이드 광고"
                      : selectedAd.type === "AD_CARD"
                      ? "광고 카드"
                      : "대시보드 배너"}
                  </Typography>
                  {selectedAd.buttonText && (
                    <Typography variant="body2" sx={{ color: "var(--Text)" }}>
                      버튼 텍스트: {selectedAd.buttonText}
                    </Typography>
                  )}
                  {selectedAd.variant && (
                    <Typography variant="body2" sx={{ color: "var(--Text)" }}>
                      변형: {selectedAd.variant === "default" ? "기본" : "파란"}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ color: "var(--Text)" }}>
                    대상:{" "}
                    {selectedAd.targetAudience === "ALL"
                      ? "전체"
                      : selectedAd.targetAudience === "VETERINARIANS"
                      ? "수의사"
                      : "병원"}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          ) : actionType === "create" || actionType === "edit" ? (
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="광고 제목"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="설명"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                  },
                }}
              />

              <FormControl fullWidth>
                <InputLabel>광고 유형</InputLabel>
                <Select
                  value={formData.type}
                  label="광고 유형"
                  onChange={(e) => {
                    const newType = e.target.value as Advertisement["type"];
                    setFormData((prev) => ({
                      ...prev,
                      type: newType,
                      // Reset type-specific fields when type changes
                      buttonText:
                        newType === "HERO_BANNER" ? prev.buttonText : undefined,
                      variant: newType === "AD_CARD" ? prev.variant : undefined,
                    }));
                  }}
                >
                  <MenuItem value="HERO_BANNER">
                    히어로 배너 (메인페이지 상단)
                  </MenuItem>
                  <MenuItem value="GENERAL_BANNER">
                    일반 배너 (메인페이지 아래)
                  </MenuItem>
                  <MenuItem value="SIDE_AD">
                    사이드 광고 (채용공고 광고)
                  </MenuItem>
                  <MenuItem value="AD_CARD">광고 카드 (양도양수 광고)</MenuItem>
                  <MenuItem value="DASHBOARD_BANNER">
                    대시보드 배너 (대시보드 페이지)
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Dynamic fields based on ad type */}
              {formData.type === "HERO_BANNER" && (
                <TextField
                  fullWidth
                  label="버튼 텍스트"
                  value={formData.buttonText || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      buttonText: e.target.value,
                    }))
                  }
                  placeholder="예: '확인하러 가기'"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--Keycolor1)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--Keycolor1)",
                      },
                    },
                  }}
                />
              )}

              {formData.type === "AD_CARD" && (
                <FormControl fullWidth>
                  <InputLabel>카드 변형</InputLabel>
                  <Select
                    value={formData.variant || "default"}
                    label="카드 변형"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        variant: e.target.value as "default" | "blue",
                      }))
                    }
                  >
                    <MenuItem value="default">기본 (초록색)</MenuItem>
                    <MenuItem value="blue">파란색</MenuItem>
                  </Select>
                </FormControl>
              )}

              {/* Image Upload Section */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, color: "var(--Subtext)", mb: 1 }}
                >
                  광고 이미지
                  {formData.type && (
                    <Typography
                      variant="caption"
                      sx={{ color: "var(--Guidetext)", ml: 1 }}
                    >
                      (권장 크기:{" "}
                      {formData.type === "HERO_BANNER"
                        ? "1964 × 970"
                        : formData.type === "GENERAL_BANNER"
                        ? "2640 × 288"
                        : formData.type === "SIDE_AD"
                        ? "536 × 170"
                        : formData.type === "AD_CARD"
                        ? "840 × 792"
                        : formData.type === "DASHBOARD_BANNER"
                        ? "2190 × 240"
                        : ""}{" "}
                      픽셀)
                    </Typography>
                  )}
                </Typography>
                <Box
                  sx={{
                    border: "2px dashed var(--Line)",
                    borderRadius: 2,
                    p: 3,
                    textAlign: "center",
                    bgcolor: "var(--Box_Light)",
                    cursor: "pointer",
                    "&:hover": {
                      borderColor: "var(--Keycolor1)",
                      bgcolor: "rgba(255, 135, 150, 0.04)",
                    },
                  }}
                  onClick={() =>
                    !isUploading &&
                    document.getElementById("image-upload-input")?.click()
                  }
                >
                  <input
                    ref={fileInputRef}
                    id="image-upload-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // 파일 크기 제한 (10MB)
                        if (file.size > 10 * 1024 * 1024) {
                          alert("파일 크기는 10MB 이하로 선택해주세요.");
                          return;
                        }

                        // 파일 타입 제한
                        if (!file.type.startsWith("image/")) {
                          alert("이미지 파일만 선택 가능합니다.");
                          return;
                        }

                        setIsUploading(true);

                        try {
                          // 기존 S3 이미지가 있다면 먼저 삭제
                          if (formData.imageUrl && isS3Url(formData.imageUrl)) {
                            await deleteImage(formData.imageUrl);
                          }

                          // S3에 업로드
                          const result = await uploadImage(
                            file,
                            "advertisements"
                          );

                          if (result.success && result.url) {
                            setFormData((prev) => ({
                              ...prev,
                              imageUrl: result.url,
                            }));
                          } else {
                            alert(
                              result.error || "이미지 업로드에 실패했습니다."
                            );
                          }
                        } catch (error) {
                          console.error("Upload error:", error);
                          const errorMessage =
                            error instanceof Error
                              ? error.message
                              : "이미지 업로드 중 오류가 발생했습니다.";
                          alert(`업로드 오류: ${errorMessage}`);
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                  {formData.imageUrl ? (
                    <Box>
                      <Box
                        component="img"
                        src={formData.imageUrl}
                        sx={{
                          maxWidth: "100%",
                          maxHeight: 200,
                          objectFit: "contain",
                          mb: 2,
                          borderRadius: 1,
                        }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={async (e) => {
                          e.stopPropagation();

                          try {
                            // S3에서 이미지 삭제
                            if (
                              formData.imageUrl &&
                              isS3Url(formData.imageUrl)
                            ) {
                              await deleteImage(formData.imageUrl);
                            }

                            setFormData((prev) => ({
                              ...prev,
                              imageUrl: undefined,
                            }));
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          } catch (error) {
                            console.error("Delete error:", error);
                            const errorMessage =
                              error instanceof Error
                                ? error.message
                                : "이미지 삭제 중 오류가 발생했습니다.";
                            alert(`삭제 오류: ${errorMessage}`);
                          }
                        }}
                        sx={{
                          borderColor: "var(--Line)",
                          color: "var(--Subtext)",
                        }}
                      >
                        이미지 제거
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <Upload
                        sx={{ fontSize: 48, color: "var(--Guidetext)", mb: 1 }}
                      />
                      <Typography
                        variant="body1"
                        sx={{ color: "var(--Text)", mb: 0.5 }}
                      >
                        {isUploading
                          ? "업로드 중..."
                          : "클릭하여 이미지 업로드"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "var(--Guidetext)" }}
                      >
                        JPG, PNG, GIF (최대 10MB)
                      </Typography>
                      {formData.type && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "var(--Keycolor1)",
                            display: "block",
                            mt: 1,
                          }}
                        >
                          권장 크기:{" "}
                          {formData.type === "HERO_BANNER"
                            ? "1964 × 970"
                            : formData.type === "GENERAL_BANNER"
                            ? "2640 × 288"
                            : formData.type === "SIDE_AD"
                            ? "536 × 170"
                            : formData.type === "AD_CARD"
                            ? "840 × 792"
                            : formData.type === "DASHBOARD_BANNER"
                            ? "2190 × 240"
                            : ""}{" "}
                          픽셀
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* 모바일 이미지 업로드 (일반 배너만) */}
              {formData.type === "GENERAL_BANNER" && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "var(--Text)", mb: 1, fontWeight: 600 }}
                  >
                    모바일 이미지 (선택사항)
                  </Typography>
                  <Box
                    sx={{
                      border: "2px dashed var(--Line)",
                      borderRadius: 2,
                      p: 3,
                      textAlign: "center",
                      cursor: "pointer",
                      backgroundColor: "var(--Box)",
                      "&:hover": {
                        borderColor: "var(--Keycolor1)",
                        backgroundColor: "var(--Box-light)",
                      },
                    }}
                    onClick={() =>
                      !isMobileUploading &&
                      document.getElementById("mobile-image-upload-input")?.click()
                    }
                  >
                    <input
                      ref={mobileFileInputRef}
                      id="mobile-image-upload-input"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // 파일 크기 제한 (10MB)
                          if (file.size > 10 * 1024 * 1024) {
                            alert("파일 크기는 10MB 이하로 선택해주세요.");
                            return;
                          }

                          // 파일 타입 제한
                          if (!file.type.startsWith("image/")) {
                            alert("이미지 파일만 선택 가능합니다.");
                            return;
                          }

                          setIsMobileUploading(true);

                          try {
                            // 기존 S3 이미지가 있다면 먼저 삭제
                            if (formData.mobileImageUrl && isS3Url(formData.mobileImageUrl)) {
                              await deleteImage(formData.mobileImageUrl);
                            }

                            // S3에 업로드
                            const result = await uploadImage(
                              file,
                              "advertisements"
                            );

                            if (result.success && result.url) {
                              setFormData((prev) => ({
                                ...prev,
                                mobileImageUrl: result.url,
                              }));
                            } else {
                              alert(
                                result.error || "이미지 업로드에 실패했습니다."
                              );
                            }
                          } catch (error) {
                            console.error("Upload error:", error);
                            const errorMessage =
                              error instanceof Error
                                ? error.message
                                : "이미지 업로드 중 오류가 발생했습니다.";
                            alert(`업로드 오류: ${errorMessage}`);
                          } finally {
                            setIsMobileUploading(false);
                          }
                        }
                      }}
                    />
                    {formData.mobileImageUrl ? (
                      <Box>
                        <Box
                          component="img"
                          src={formData.mobileImageUrl}
                          sx={{
                            maxWidth: "100%",
                            maxHeight: 200,
                            objectFit: "contain",
                            mb: 2,
                            borderRadius: 1,
                          }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation();

                            try {
                              // S3에서 이미지 삭제
                              if (
                                formData.mobileImageUrl &&
                                isS3Url(formData.mobileImageUrl)
                              ) {
                                await deleteImage(formData.mobileImageUrl);
                              }

                              setFormData((prev) => ({
                                ...prev,
                                mobileImageUrl: undefined,
                              }));
                              if (mobileFileInputRef.current) {
                                mobileFileInputRef.current.value = "";
                              }
                            } catch (error) {
                              console.error("Delete error:", error);
                              const errorMessage =
                                error instanceof Error
                                  ? error.message
                                  : "이미지 삭제 중 오류가 발생했습니다.";
                              alert(`삭제 오류: ${errorMessage}`);
                            }
                          }}
                          sx={{
                            borderColor: "var(--Line)",
                            color: "var(--Subtext)",
                          }}
                        >
                          이미지 제거
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <Upload
                          sx={{ fontSize: 48, color: "var(--Guidetext)", mb: 1 }}
                        />
                        <Typography
                          variant="body1"
                          sx={{ color: "var(--Text)", mb: 0.5 }}
                        >
                          {isMobileUploading
                            ? "업로드 중..."
                            : "클릭하여 모바일 이미지 업로드"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "var(--Guidetext)" }}
                        >
                          JPG, PNG, GIF (최대 10MB)
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "var(--Keycolor1)",
                            display: "block",
                            mt: 1,
                          }}
                        >
                          권장 크기: 580 × 380 픽셀
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              <TextField
                fullWidth
                label="링크 URL"
                value={formData.linkUrl || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, linkUrl: e.target.value }))
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "var(--Keycolor1)",
                    },
                  },
                }}
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  sx={{ flex: 1 }}
                  type="date"
                  label="시작일"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <TextField
                  sx={{ flex: 1 }}
                  type="date"
                  label="종료일"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>대상</InputLabel>
                  <Select
                    value={formData.targetAudience}
                    label="대상"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        targetAudience: e.target
                          .value as Advertisement["targetAudience"],
                      }))
                    }
                  >
                    <MenuItem value="ALL">전체</MenuItem>
                    <MenuItem value="VETERINARIANS">수의사</MenuItem>
                    <MenuItem value="HOSPITALS">병원</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": {
                          color: "var(--Keycolor1)",
                        },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                          {
                            backgroundColor: "var(--Keycolor1)",
                          },
                      }}
                    />
                  }
                  label="활성"
                />
              </Box>
            </Stack>
          ) : actionType === "delete" ? (
            <Typography variant="body1" sx={{ color: "var(--Text)", mt: 2 }}>
              '{selectedAd?.title}' 광고를 삭제하시겠습니까? 이 작업은 되돌릴 수
              없습니다.
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setModalVisible(false)}
            sx={{
              color: "var(--Subtext2)",
              "&:hover": { bgcolor: "rgba(108, 116, 129, 0.04)" },
            }}
          >
            {actionType === "view" ? "닫기" : "취소"}
          </Button>
          {actionType !== "view" && (
            <Button
              onClick={actionType === "delete" ? handleDeleteAd : handleSaveAd}
              variant="contained"
              disabled={
                (actionType === "create" || actionType === "edit") &&
                (!formData.title ||
                  !formData.description ||
                  !formData.startDate ||
                  !formData.endDate)
              }
              sx={{
                bgcolor:
                  actionType === "delete"
                    ? "var(--Keycolor1)"
                    : "var(--Keycolor1)",
                "&:hover": {
                  bgcolor:
                    actionType === "delete"
                      ? "var(--Keycolor1)"
                      : "var(--Keycolor1)",
                },
              }}
            >
              {actionType === "create"
                ? "등록"
                : actionType === "edit"
                ? "수정"
                : "삭제"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
