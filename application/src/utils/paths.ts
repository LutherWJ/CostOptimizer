import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getRootDir = (): string => path.join(__dirname, "../../");
export const getDataPath = (): string => path.join(getRootDir(), "data");
export const getPublicPath = (): string => path.join(getRootDir(), "public");
export const getHTMXPath = (): string =>
  path.join(getPublicPath(), "htmx.min.js");
