import type { Metadata } from "next";
import { InstructionsPage } from "@/screens/instructions";

export const metadata: Metadata = {
  title: "Общие инструкции — Личный кабинет магазина",
  description: "Вход, выбор магазина и продавца, настройки, уведомления и навигация"
};

export default function GeneralInstructions() {
  return <InstructionsPage variant="general" />;
}
