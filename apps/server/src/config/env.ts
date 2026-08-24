export const PORT = Number(process.env.PORT ?? 3000);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const IS_DEV = NODE_ENV !== "production";
