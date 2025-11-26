"use client";

import React, { useState } from "react";
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
  Alert,
  Avatar,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  Search,
  Block,
  Person,
  Business,
  People,
  CheckCircle,
  Warning,
  LockOpen,
  Lock,
  VerifiedUser,
} from "@mui/icons-material";
import {
  useAdminUsers,
  useAdminUserAction,
  useAdminUserVerify,
} from "@/hooks/api/useAdminUsers";

interface User {
  id: string;
  name: string;
  email: string;
  userType: "VETERINARIAN" | "HOSPITAL" | "VETERINARY_STUDENT";
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  isActive: boolean;
  joinDate: string;
  lastLogin: string;
  verified: boolean;
  phone?: string;
  address?: string;
  veterinarianLicense?: {
    licenseNumber: string;
    licenseImage: string;
    issueDate: string;
    expiryDate: string;
  };
  hospitalInfo?: {
    businessNumber: string;
    businessRegistration: string;
    representativeName: string;
    establishedDate: string;
  };
}

export default function UsersManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<
    "verify" | "suspend" | "delete" | "reject" | "edit" | "view" | ""
  >("");
  const [actionReason, setActionReason] = useState("");

  // API hooks
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useAdminUsers({
    search: searchTerm,
    userType: filterType || undefined,
    status: filterStatus || undefined,
    page: currentPage,
    limit: 10,
  });

  const userActionMutation = useAdminUserAction();
  const userVerifyMutation = useAdminUserVerify();

  const users = usersData?.users || [];
  const pagination = usersData?.pagination;
  const stats = usersData?.stats;

  const handleAction = (
    user: User,
    action: "verify" | "suspend" | "delete" | "reject" | "edit" | "view"
  ) => {
    setSelectedUser(user);
    setActionType(action);
    if (action === "view") {
      // 상세 정보 보기 로직
      console.log("View user:", user);
    } else if (action === "edit") {
      // 편집 로직
      console.log("Edit user:", user);
    } else {
      setDialogOpen(true);
    }
  };

  const handleUserClick = (user: User) => {
    setDetailUser(user);
    setDetailModalOpen(true);
  };

  const executeAction = async () => {
    if (!selectedUser || !actionType) return;

    // Skip actions that don't require API calls
    if (actionType === "view" || actionType === "edit") return;

    console.log("Executing action:", {
      actionType,
      userId: selectedUser.id,
      reason: actionReason,
    });

    try {
      if (actionType === "verify" || actionType === "reject") {
        console.log("Using userVerifyMutation for:", actionType);
        const result = await userVerifyMutation.mutateAsync({
          userId: selectedUser.id,
          action: actionType === "verify" ? "approve" : "reject",
          reason: actionReason || undefined,
        });
        console.log("Verify mutation result:", result);
      } else if (actionType === "suspend" || actionType === "delete") {
        console.log("Using userActionMutation for:", actionType);
        const result = await userActionMutation.mutateAsync({
          userId: selectedUser.id,
          action: actionType,
          reason: actionReason || undefined,
        });
        console.log("Action mutation result:", result);
      }

      setDialogOpen(false);
      setSelectedUser(null);
      setActionType("");
      setActionReason("");
      refetch();
    } catch (error) {
      console.error("Action failed:", error);
      // UI에 에러 메시지 표시 (일단 alert로)
      alert(
        `작업 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case "VETERINARIAN":
        return <Person sx={{ color: "#698cfc" }} />;
      case "HOSPITAL":
        return <Business sx={{ color: "#ff8796" }} />;
      case "VETERINARY_STUDENT":
        return <People sx={{ color: "#85a1ff" }} />;
      default:
        return <Person sx={{ color: "#9098a4" }} />;
    }
  };

  const getStatusChip = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <Chip
          label="비활성"
          size="small"
          sx={{
            backgroundColor: "#ffd3d3",
            color: "#ff8796",
            fontSize: "11px",
            fontWeight: "600",
            borderRadius: "12px",
          }}
        />
      );
    }

    switch (status) {
      case "ACTIVE":
        return (
          <Chip
            label="활성"
            size="small"
            sx={{
              backgroundColor: "#f2f5ff",
              color: "#698cfc",
              fontSize: "11px",
              fontWeight: "600",
              borderRadius: "12px",
            }}
          />
        );
      case "PENDING":
        return (
          <Chip
            label="대기중"
            size="small"
            sx={{
              backgroundColor: "#ffe5e5",
              color: "#ffb7b8",
              fontSize: "11px",
              fontWeight: "600",
              borderRadius: "12px",
            }}
          />
        );
      case "INACTIVE":
        return (
          <Chip
            label="비활성"
            size="small"
            sx={{
              backgroundColor: "#ffd3d3",
              color: "#ff8796",
              fontSize: "11px",
              fontWeight: "600",
              borderRadius: "12px",
            }}
          />
        );
      default:
        return (
          <Chip
            label={status}
            size="small"
            sx={{
              backgroundColor: "#f6f6f6",
              color: "#9098a4",
              fontSize: "11px",
              fontWeight: "600",
              borderRadius: "12px",
            }}
          />
        );
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case "VETERINARIAN":
        return "수의사";
      case "HOSPITAL":
        return "병원";
      case "VETERINARY_STUDENT":
        return "수의학과 학생";
      default:
        return userType;
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || user.userType === filterType;
    const matchesStatus = !filterStatus || user.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          사용자 데이터를 불러오는데 실패했습니다: {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: "var(--Text)",
          mb: 2,
          fontSize: { xs: "1.75rem", md: "2rem" },
        }}
      >
        회원 관리
      </Typography>

      {/* 통계 카드 */}
      {stats && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 2,
            mb: 3,
          }}
        >
          <Card
            sx={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography
                variant="h6"
                sx={{ color: "#4f5866", mb: 1, fontSize: "14px" }}
              >
                전체 사용자
              </Typography>
              <Typography
                variant="h4"
                sx={{ color: "#ff8796", fontWeight: "bold", fontSize: "32px" }}
              >
                {stats.total.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card
            sx={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography
                variant="h6"
                sx={{ color: "#4f5866", mb: 1, fontSize: "14px" }}
              >
                활성 사용자
              </Typography>
              <Typography
                variant="h4"
                sx={{ color: "#698cfc", fontWeight: "bold", fontSize: "32px" }}
              >
                {stats.active.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card
            sx={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography
                variant="h6"
                sx={{ color: "#4f5866", mb: 1, fontSize: "14px" }}
              >
                수의사
              </Typography>
              <Typography
                variant="h4"
                sx={{ color: "#85a1ff", fontWeight: "bold", fontSize: "32px" }}
              >
                {stats.veterinarians.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card
            sx={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography
                variant="h6"
                sx={{ color: "#4f5866", mb: 1, fontSize: "14px" }}
              >
                병원
              </Typography>
              <Typography
                variant="h4"
                sx={{ color: "#ffb7b8", fontWeight: "bold", fontSize: "32px" }}
              >
                {stats.hospitals.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card
            sx={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography
                variant="h6"
                sx={{ color: "#4f5866", mb: 1, fontSize: "14px" }}
              >
                학생
              </Typography>
              <Typography
                variant="h4"
                sx={{ color: "#aabeff", fontWeight: "bold", fontSize: "32px" }}
              >
                {stats.students.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* 필터 및 검색 */}
      <Card
        sx={{
          mb: 3,
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              label="검색"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                minWidth: 200,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: "#f6f6f6",
                  "&:hover": {
                    backgroundColor: "#f0f0f0",
                  },
                  "&.Mui-focused": {
                    backgroundColor: "white",
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "#9098a4" }} />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl
              size="small"
              sx={{
                minWidth: 120,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: "#f6f6f6",
                },
              }}
            >
              <InputLabel sx={{ color: "#4f5866" }}>사용자 유형</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="사용자 유형"
                sx={{ color: "#3b394d" }}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="VETERINARIAN">수의사</MenuItem>
                <MenuItem value="HOSPITAL">병원</MenuItem>
                <MenuItem value="VETERINARY_STUDENT">수의학과 학생</MenuItem>
              </Select>
            </FormControl>

            <FormControl
              size="small"
              sx={{
                minWidth: 120,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: "#f6f6f6",
                },
              }}
            >
              <InputLabel sx={{ color: "#4f5866" }}>상태</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="상태"
                sx={{ color: "#3b394d" }}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="ACTIVE">활성</MenuItem>
                <MenuItem value="PENDING">대기중</MenuItem>
                <MenuItem value="INACTIVE">비활성</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* 사용자 테이블 */}
      <Card
        sx={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f6f6f6" }}>
                <TableCell
                  sx={{ color: "#4f5866", fontWeight: "600", fontSize: "14px" }}
                >
                  프로필
                </TableCell>
                <TableCell
                  sx={{ color: "#4f5866", fontWeight: "600", fontSize: "14px" }}
                >
                  이름
                </TableCell>
                <TableCell
                  sx={{ color: "#4f5866", fontWeight: "600", fontSize: "14px" }}
                >
                  이메일
                </TableCell>
                <TableCell
                  sx={{ color: "#4f5866", fontWeight: "600", fontSize: "14px" }}
                >
                  유형
                </TableCell>
                <TableCell
                  sx={{ color: "#4f5866", fontWeight: "600", fontSize: "14px" }}
                >
                  상태
                </TableCell>
                <TableCell
                  sx={{ color: "#4f5866", fontWeight: "600", fontSize: "14px" }}
                >
                  가입일
                </TableCell>
                <TableCell
                  sx={{ color: "#4f5866", fontWeight: "600", fontSize: "14px" }}
                >
                  최근 로그인
                </TableCell>
                <TableCell
                  sx={{ color: "#4f5866", fontWeight: "600", fontSize: "14px" }}
                >
                  작업
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  hover
                  onClick={() => handleUserClick(user)}
                  sx={{
                    "&:hover": {
                      backgroundColor: "#f9f9f9",
                      cursor: "pointer",
                    },
                    borderBottom: "1px solid #efeff0",
                  }}
                >
                  <TableCell>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor:
                          user.userType === "VETERINARIAN"
                            ? "#f2f5ff"
                            : user.userType === "HOSPITAL"
                            ? "#fff7f7"
                            : "#f2f5ff",
                      }}
                    >
                      {getUserTypeIcon(user.userType)}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="subtitle2"
                      fontWeight="600"
                      sx={{ color: "#3b394d", fontSize: "14px" }}
                    >
                      {user.name}
                    </Typography>
                    {user.phone && (
                      <Typography
                        variant="caption"
                        sx={{ color: "#9098a4", fontSize: "12px" }}
                      >
                        {user.phone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: "#4f5866", fontSize: "13px" }}>
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "inline-block",
                        px: 2,
                        py: 0.5,
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor:
                          user.userType === "VETERINARIAN"
                            ? "#f2f5ff"
                            : user.userType === "HOSPITAL"
                            ? "#fff7f7"
                            : "#f2f5ff",
                        color:
                          user.userType === "VETERINARIAN"
                            ? "#698cfc"
                            : user.userType === "HOSPITAL"
                            ? "#ff8796"
                            : "#698cfc",
                      }}
                    >
                      {getUserTypeLabel(user.userType)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(user.status, user.isActive)}
                  </TableCell>
                  <TableCell sx={{ color: "#4f5866", fontSize: "13px" }}>
                    {user.joinDate}
                  </TableCell>
                  <TableCell sx={{ color: "#9098a4", fontSize: "13px" }}>
                    {user.lastLogin || "없음"}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClick(user);
                        }}
                        sx={{
                          backgroundColor: "#9098a4",
                          color: "white",
                          borderRadius: "6px",
                          fontSize: "11px",
                          px: 1.5,
                          py: 0.5,
                          minWidth: "auto",
                          fontWeight: "600",
                          "&:hover": {
                            backgroundColor: "#7a8494",
                          },
                        }}
                      >
                        자세히
                      </Button>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(user, "suspend");
                        }}
                        sx={{
                          backgroundColor: user.isActive ? "#ff8796" : "#698cfc",
                          color: "white",
                          borderRadius: "6px",
                          fontSize: "11px",
                          px: 1.5,
                          py: 0.5,
                          minWidth: "auto",
                          fontWeight: "600",
                          "&:hover": {
                            backgroundColor: user.isActive ? "#ff6b7d" : "#5a7cfc",
                          },
                        }}
                      >
                        {user.isActive ? "비활성(정지)" : "활성(인증)"}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 페이지네이션 */}
        {pagination && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              p: 3,
              borderTop: "1px solid #efeff0",
            }}
          >
            <Pagination
              count={pagination.totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              sx={{
                "& .MuiPaginationItem-root": {
                  color: "#4f5866",
                  "&.Mui-selected": {
                    backgroundColor: "#698cfc",
                    color: "white",
                  },
                  "&:hover": {
                    backgroundColor: "#f2f5ff",
                  },
                },
              }}
            />
          </Box>
        )}
      </Card>

      {/* 작업 확인 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            padding: "8px",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "#3b394d",
            fontSize: "18px",
            fontWeight: "bold",
            pb: 2,
          }}
        >
          {actionType === "verify" && "사용자 인증 승인"}
          {actionType === "reject" && "사용자 인증 거부"}
          {actionType === "suspend" && "사용자 계정 정지/활성화"}
          {actionType === "delete" && "사용자 계정 삭제"}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography
                variant="body1"
                sx={{
                  mb: 3,
                  color: "#4f5866",
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: "#3b394d" }}>
                  {selectedUser.name}
                </strong>{" "}
                ({selectedUser.email})님의 계정을
                {actionType === "verify" && " 인증 승인"}
                {actionType === "reject" && " 인증 거부"}
                {actionType === "suspend" &&
                  (selectedUser.isActive ? " 정지" : " 활성화")}
                {actionType === "delete" && " 삭제"}
                하시겠습니까?
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="사유 (선택사항)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="작업 사유를 입력하세요..."
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#f6f6f6",
                  },
                  "& .MuiInputLabel-root": {
                    color: "#4f5866",
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{
              color: "#9098a4",
              backgroundColor: "#f6f6f6",
              borderRadius: "8px",
              px: 3,
              py: 1,
              "&:hover": {
                backgroundColor: "#efeff0",
              },
            }}
          >
            취소
          </Button>
          <Button
            onClick={executeAction}
            variant="contained"
            disabled={
              userActionMutation.isPending || userVerifyMutation.isPending
            }
            sx={{
              backgroundColor: actionType === "delete" ? "#ff8796" : "#698cfc",
              color: "white",
              borderRadius: "8px",
              px: 3,
              py: 1,
              "&:hover": {
                backgroundColor:
                  actionType === "delete" ? "#ff6b7d" : "#5a7cfc",
              },
              "&:disabled": {
                backgroundColor: "#caced6",
                color: "#9098a4",
              },
            }}
          >
            {userActionMutation.isPending || userVerifyMutation.isPending
              ? "처리중..."
              : "확인"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 사용자 상세 정보 모달 */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "#3b394d",
            fontSize: "20px",
            fontWeight: "bold",
            pb: 2,
            borderBottom: "1px solid #efeff0",
          }}
        >
          회원 상세 정보
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {detailUser && (
            <Box>
              {/* 기본 정보 섹션 */}
              <Box sx={{ p: 3, borderBottom: "1px solid #efeff0" }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}
                >
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      backgroundColor:
                        detailUser.userType === "VETERINARIAN"
                          ? "#f2f5ff"
                          : detailUser.userType === "HOSPITAL"
                          ? "#fff7f7"
                          : "#f2f5ff",
                    }}
                  >
                    {getUserTypeIcon(detailUser.userType)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{ color: "#3b394d", fontWeight: "bold", mb: 1 }}
                    >
                      {detailUser.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#4f5866", mb: 1 }}
                    >
                      {detailUser.email}
                    </Typography>
                    {detailUser.phone && (
                      <Typography variant="body2" sx={{ color: "#9098a4" }}>
                        {detailUser.phone}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      alignItems: "flex-end",
                    }}
                  >
                    <Box
                      sx={{
                        display: "inline-block",
                        px: 2,
                        py: 0.5,
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor:
                          detailUser.userType === "VETERINARIAN"
                            ? "#f2f5ff"
                            : detailUser.userType === "HOSPITAL"
                            ? "#fff7f7"
                            : "#f2f5ff",
                        color:
                          detailUser.userType === "VETERINARIAN"
                            ? "#698cfc"
                            : detailUser.userType === "HOSPITAL"
                            ? "#ff8796"
                            : "#698cfc",
                      }}
                    >
                      {getUserTypeLabel(detailUser.userType)}
                    </Box>
                    {getStatusChip(detailUser.status, detailUser.isActive)}
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#9098a4",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      가입일
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#4f5866" }}>
                      {detailUser.joinDate}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#9098a4",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      최근 로그인
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#4f5866" }}>
                      {detailUser.lastLogin || "없음"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* 주소 정보 */}
              {detailUser.address && (
                <Box sx={{ p: 3, borderBottom: "1px solid #efeff0" }}>
                  <Typography
                    variant="h6"
                    sx={{ color: "#3b394d", fontWeight: "bold", mb: 2 }}
                  >
                    주소 정보
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#4f5866" }}>
                    {detailUser.address}
                  </Typography>
                </Box>
              )}

              {/* 수의사 면허 정보 */}
              {detailUser.veterinarianLicense && (
                <Box sx={{ p: 3, borderBottom: "1px solid #efeff0" }}>
                  <Typography
                    variant="h6"
                    sx={{ color: "#3b394d", fontWeight: "bold", mb: 2 }}
                  >
                    수의사 면허 정보
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9098a4",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        면허번호
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#4f5866" }}>
                        {detailUser.veterinarianLicense.licenseNumber}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9098a4",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        발급일
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#4f5866" }}>
                        {detailUser.veterinarianLicense.issueDate}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9098a4",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        만료일
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#4f5866" }}>
                        {detailUser.veterinarianLicense.expiryDate}
                      </Typography>
                    </Box>
                  </Box>
                  {detailUser.veterinarianLicense.licenseImage && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9098a4",
                          fontSize: "12px",
                          fontWeight: "600",
                          mb: 1,
                          display: "block",
                        }}
                      >
                        면허증 이미지
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          window.open(
                            detailUser.veterinarianLicense!.licenseImage,
                            "_blank"
                          )
                        }
                        sx={{
                          color: "#698cfc",
                          borderColor: "#698cfc",
                          "&:hover": {
                            backgroundColor: "#f2f5ff",
                            borderColor: "#698cfc",
                          },
                        }}
                      >
                        면허증 보기
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {/* 병원 정보 */}
              {detailUser.hospitalInfo && (
                <Box sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{ color: "#3b394d", fontWeight: "bold", mb: 2 }}
                  >
                    병원 정보
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9098a4",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        사업자번호
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#4f5866" }}>
                        {detailUser.hospitalInfo.businessNumber}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9098a4",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        대표자명
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#4f5866" }}>
                        {detailUser.hospitalInfo.representativeName}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9098a4",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        설립일
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#4f5866" }}>
                        {detailUser.hospitalInfo.establishedDate}
                      </Typography>
                    </Box>
                  </Box>
                  {detailUser.hospitalInfo.businessRegistration && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9098a4",
                          fontSize: "12px",
                          fontWeight: "600",
                          mb: 1,
                          display: "block",
                        }}
                      >
                        사업자등록증
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          window.open(
                            detailUser.hospitalInfo!.businessRegistration,
                            "_blank"
                          )
                        }
                        sx={{
                          color: "#ff8796",
                          borderColor: "#ff8796",
                          "&:hover": {
                            backgroundColor: "#fff7f7",
                            borderColor: "#ff8796",
                          },
                        }}
                      >
                        사업자등록증 보기
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: "1px solid #efeff0" }}>
          <Button
            onClick={() => setDetailModalOpen(false)}
            sx={{
              color: "#9098a4",
              backgroundColor: "#f6f6f6",
              borderRadius: "8px",
              px: 3,
              py: 1,
              "&:hover": {
                backgroundColor: "#efeff0",
              },
            }}
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
