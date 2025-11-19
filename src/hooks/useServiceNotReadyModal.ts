"use client";

import { useState } from "react";

interface ServiceNotReadyModalHandler {
  showModal: () => void;
  isModalOpen: boolean;
  closeModal: () => void;
}

export function useServiceNotReadyModal(): ServiceNotReadyModalHandler {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return {
    showModal,
    isModalOpen,
    closeModal,
  };
}

