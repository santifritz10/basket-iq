import { createDataTypeRoute } from "@/app/api/_lib/data-route-factory";

const handlers = createDataTypeRoute("plays");

export const GET = handlers.GET;
export const POST = handlers.POST;
