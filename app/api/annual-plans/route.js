import { createDataTypeRoute } from "@/app/api/_lib/data-route-factory";

const handlers = createDataTypeRoute("annual_plans");

export const GET = handlers.GET;
export const POST = handlers.POST;
