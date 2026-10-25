import { handleFiles } from "@/server/rms/files";
export const GET = (request: Request) => handleFiles(request);
export const POST = GET;
