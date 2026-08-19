import type { Metadata } from "next";
import { InstructionsPage } from "@/screens/instructions";

export const metadata: Metadata = {
  title: "Инструкции — Икорный: Сборка",
  description: "Инструкция по работе с сервисом сборки интернет-заказов"
};

export default function Instructions() {
  return <InstructionsPage />;
}
