import type { NextConfig } from "next";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(path.resolve(process.cwd(), ".."));

if (
  (!process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID ||
    process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID === "your_line_login_channel_id_here") &&
  process.env.LINE_LOGIN_CHANNEL_ID
) {
  process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;
}

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
