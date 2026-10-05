import type { Metadata } from "next";
import { InstructionsPage } from "@/screens/instructions";

export const metadata: Metadata = {
  title: "Общие инструкции — Икорный: Сборка",
  description: "Вход, выбор магазина и продавца, настройки, уведомления и навигация"
};

export default function GeneralInstructions() {
  return <InstructionsPage variant="general" />;
}
