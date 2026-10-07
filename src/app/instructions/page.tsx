import type { Metadata } from "next";
import { InstructionsPage } from "@/screens/instructions";

export const metadata: Metadata = {
  title: "Инструкции — Личный кабинет магазина",
  description: "Инструкции по интернет-заказам, подсчету товаров, информации о товаре и приемке"
};

export default function Instructions() {
  return <InstructionsPage />;
}
